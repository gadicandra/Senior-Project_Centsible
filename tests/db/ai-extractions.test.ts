import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { todayIn } from "@/lib/dates";
import {
  AiError,
  buildModelVersion,
  getTextParser,
  resetTextParserForTests,
  type ParsedTransaction,
  type TextParser,
} from "@/server/ai";
import type { VerifiedDraft } from "@/server/ai/draft-token";
import { prisma } from "@/server/db/client";
import { pgCode } from "@/server/db/errors";
import { withRls } from "@/server/db/with-rls";
import { parseTransactionText } from "@/server/services/ai-parse";
import { listCategories } from "@/server/services/categories";
import { TransactionError, createTransactionFromAi } from "@/server/services/transactions";
import { listWallets } from "@/server/services/wallets";
import { createTestUser, deleteTestUser } from "./helpers";

// Uji integrasi #27 (design §14.3): kedua insert atomik, RLS, ID dari klien dicek ulang,
// kuota lewat consume_ai_quota, dan P1 (/api/ai/parse tidak menulis transaksi) di level DB.

// Hanya getTextParser yang diganti; AiError, createDeadline, buildModelVersion tetap asli (§14.2).
vi.mock("@/server/ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/ai")>()),
  getTextParser: vi.fn(),
}));

type TestUser = Awaited<ReturnType<typeof createTestUser>>;
let a: TestUser;
let b: TestUser;
let today: string;
let wallet: { id: string; name: string };
let makan: { id: string; name: string };
let transport: { id: string; name: string };
let walletB: string;
let categoryB: string;

beforeAll(async () => {
  [a, b] = await Promise.all([createTestUser("ai-a"), createTestUser("ai-b")]);
  today = todayIn("Asia/Jakarta");
  const w = (await listWallets(a.claims)).find((x) => x.isDefault)!;
  wallet = { id: w.id, name: w.name };
  const cats = await listCategories(a.claims);
  makan = cats.find((c) => c.name === "Makan")!;
  transport = cats.find((c) => c.name === "Transport")!;
  walletB = (await listWallets(b.claims)).find((x) => x.isDefault)!.id;
  categoryB = (await listCategories(b.claims)).find((c) => c.name === "Makan")!.id;
});
afterAll(async () => {
  await Promise.allSettled([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
  await prisma.$disconnect();
});

function draftFor(user: TestUser, overrides: Partial<VerifiedDraft> = {}): VerifiedDraft {
  return {
    v: 1,
    sub: user.id,
    iat: Math.floor(Date.now() / 1000),
    mode: "text",
    raw: "makan nasi padang 20rb",
    parsed: {
      amount: 20_000,
      type: "expense",
      category: makan.name,
      wallet: wallet.name,
      description: "makan nasi padang",
      occurred_at: today,
      confidence: 0.9,
    },
    ids: { categoryId: makan.id, walletId: wallet.id },
    mv: "anthropic:claude-haiku-4-5@p1",
    lat: 850,
    conf: 0.9,
    ...overrides,
  };
}

const input = (overrides: Partial<Parameters<typeof createTransactionFromAi>[1]> = {}) => ({
  type: "expense" as const,
  amount: 20_000,
  categoryId: makan.id,
  walletId: wallet.id,
  description: "makan nasi padang",
  occurredAt: today,
  ...overrides,
});

const counts = (user: TestUser) =>
  withRls(user.claims, async (tx) => ({
    transactions: await tx.transaction.count(),
    extractions: await tx.aiExtraction.count(),
  }));

const parseCount = async (user: TestUser) =>
  (await withRls(user.claims, (tx) => tx.aiUsageDaily.aggregate({ _sum: { parseCount: true } })))._sum.parseCount ?? 0;

async function pgCodeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    return pgCode(e);
  }
  return "no error";
}

describe("createTransactionFromAi (design §10.3)", () => {
  test("satu baris transactions (source=text) dan satu ai_extractions dengan koreksi yang tepat", async () => {
    const before = await counts(a);
    const id = await createTransactionFromAi(
      a.claims,
      input({ amount: 25_000, categoryId: transport.id, description: "  makan nasi padang " }),
      draftFor(a),
    );
    expect(await counts(a)).toEqual({ transactions: before.transactions + 1, extractions: before.extractions + 1 });

    const row = await withRls(a.claims, (tx) =>
      tx.transaction.findUniqueOrThrow({ where: { id }, include: { aiExtraction: true } }),
    );
    expect(row.source).toBe("text");
    expect(row.aiExtraction).toMatchObject({
      userId: a.id,
      inputMode: "text",
      rawInput: "makan nasi padang 20rb",
      modelVersion: "anthropic:claude-haiku-4-5@p1",
      latencyMs: 850,
      userCorrections: {
        amount: { from: 20_000, to: 25_000 },
        category: { from: makan.name, to: transport.name },
      },
    });
    expect(row.aiExtraction!.confidence).toBeCloseTo(0.9, 5);
    expect(row.aiExtraction!.parsedResult).toEqual(draftFor(a).parsed);
  });

  test("tanpa perubahan → user_corrections = {}", async () => {
    const id = await createTransactionFromAi(a.claims, input(), draftFor(a));
    const ext = await withRls(a.claims, (tx) => tx.aiExtraction.findUniqueOrThrow({ where: { transactionId: id } }));
    expect(ext.userCorrections).toEqual({});
  });

  test("atomik: confidence 2 melanggar CHECK → tidak ada baris transaksi tersisa", async () => {
    const before = await counts(a);
    await expect(createTransactionFromAi(a.claims, input(), draftFor(a, { conf: 2 }))).rejects.toThrow();
    expect(await counts(a)).toEqual(before);
  });

  test("RLS: B tidak melihat ai_extractions A; A tidak boleh update/delete", async () => {
    const id = await createTransactionFromAi(a.claims, input(), draftFor(a));
    const seenByB = await withRls(b.claims, (tx) => tx.aiExtraction.findUnique({ where: { transactionId: id } }));
    expect(seenByB).toBeNull();
    expect(
      await pgCodeOf(
        withRls(a.claims, (tx) => tx.aiExtraction.updateMany({ where: { transactionId: id }, data: { latencyMs: 1 } })),
      ),
    ).toBe("42501");
    expect(
      await pgCodeOf(withRls(a.claims, (tx) => tx.aiExtraction.deleteMany({ where: { transactionId: id } }))),
    ).toBe("42501");
  });

  test("dompet milik B → TransactionError, tidak ada yang ditulis", async () => {
    const before = await counts(a);
    await expect(createTransactionFromAi(a.claims, input({ walletId: walletB }), draftFor(a))).rejects.toMatchObject({
      field: "walletId",
    });
    expect(await counts(a)).toEqual(before);
  });

  test("kategori milik B → TransactionError categoryId, tidak ada yang ditulis", async () => {
    const before = await counts(a);
    const call = createTransactionFromAi(a.claims, input({ categoryId: categoryB }), draftFor(a));
    await expect(call).rejects.toBeInstanceOf(TransactionError);
    await expect(call).rejects.toMatchObject({ field: "categoryId" });
    expect(await counts(a)).toEqual(before);
  });

  test("model_version 120 karakter dan hasil buildModelVersion untuk model 100 karakter lolos CHECK", async () => {
    await createTransactionFromAi(a.claims, input(), draftFor(a, { mv: "m".repeat(120) }));
    const mv = buildModelVersion("openai-compatible", "x".repeat(100));
    expect(mv.length).toBeLessThanOrEqual(120);
    const id = await createTransactionFromAi(a.claims, input(), draftFor(a, { mv }));
    const ext = await withRls(a.claims, (tx) => tx.aiExtraction.findUniqueOrThrow({ where: { transactionId: id } }));
    expect(ext.modelVersion).toBe(mv);
  });
});

describe("kuota dan P1 (design §9.3, §14.3)", () => {
  const AI_DATA = (): ParsedTransaction => ({
    amount: 20_000,
    type: "expense",
    category: makan.name,
    wallet: null,
    description: "makan nasi padang",
    occurred_at: today,
    confidence: 0.9,
  });
  function stubParser(parse: TextParser["parse"]) {
    vi.mocked(getTextParser).mockReturnValue({ provider: "anthropic", model: "claude-haiku-4-5", parse });
  }

  beforeEach(() => {
    vi.stubEnv("AI_DRAFT_SECRET", "s".repeat(40));
    vi.stubEnv("AI_PARSE_DAILY_LIMIT", "100");
    resetTextParserForTests();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("consume_ai_quota('parse', 0) → SQLSTATE 53400 lewat Prisma", async () => {
    const code = await pgCodeOf(
      withRls(a.claims, (tx) => tx.$queryRaw`select public.consume_ai_quota('parse', ${0}::int) as remaining`),
    );
    expect(code).toBe("53400");
  });

  test("kuota tetap terpakai walau langkah berikutnya (AI) gagal", async () => {
    stubParser(async () => {
      throw new AiError("timeout");
    });
    const before = await parseCount(a);
    const result = await parseTransactionText(a.claims, "makan nasi padang 20rb", new AbortController().signal);
    expect(result.status).toBe(504);
    expect(await parseCount(a)).toBe(before + 1);
  });

  test("P1: parse sukses tidak menulis transactions/ai_extractions, kuota naik tepat 1", async () => {
    stubParser(async () => ({ data: AI_DATA(), servedModel: "claude-haiku-4-5", attempts: 1 }));
    const before = { ...(await counts(a)), parse: await parseCount(a) };
    const result = await parseTransactionText(a.claims, "makan nasi padang 20rb", new AbortController().signal);
    expect(result.status).toBe(200);
    expect(await counts(a)).toEqual({ transactions: before.transactions, extractions: before.extractions });
    expect(await parseCount(a)).toBe(before.parse + 1);
  });
});
