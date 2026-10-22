// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ParseFailure, ParseSuccess } from "@/lib/ai/types";
import { getClaims } from "@/server/auth/session";
import { parseFailure, parseTransactionText } from "@/server/services/ai-parse";
import { POST, maxDuration } from "./route";

vi.mock("@/server/auth/session", () => ({ getClaims: vi.fn(), requireClaims: vi.fn() }));
vi.mock("@/server/services/ai-parse", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/services/ai-parse")>()),
  parseTransactionText: vi.fn(),
}));

const URL_ = "http://localhost:3000/api/ai/parse";
const CLAIMS = { sub: "11111111-1111-4111-8111-111111111111" };
const SAME_ORIGIN = { origin: "http://localhost:3000", host: "localhost:3000" };
const JSON_HEADERS = { ...SAME_ORIGIN, "content-type": "application/json" };

const SUCCESS: ParseSuccess = {
  ok: true,
  proposal: {
    amount: 20000,
    type: "expense",
    categoryId: "22222222-2222-4222-8222-222222222222",
    walletId: "33333333-3333-4333-8333-333333333333",
    description: "makan",
    occurredAt: "2026-09-22",
    confidence: 0.9,
  },
  flags: {},
  walletInferred: true,
  draft: "payload.sig",
};

function post(body: BodyInit | null, headers: Record<string, string> = JSON_HEADERS) {
  return new Request(URL_, { method: "POST", headers, body, ...(body instanceof ReadableStream ? { duplex: "half" } : {}) });
}
const postJson = (value: unknown, headers?: Record<string, string>) => post(JSON.stringify(value), headers);

async function call(request: Request) {
  const res = await POST(request);
  // Setiap respons, sukses maupun gagal, tidak boleh di-cache.
  expect(res.headers.get("cache-control")).toBe("no-store");
  return { status: res.status, body: (await res.json()) as ParseSuccess | ParseFailure };
}
const codeOf = (body: ParseSuccess | ParseFailure) => (body as ParseFailure).error?.code;

beforeEach(() => {
  vi.mocked(getClaims).mockReset().mockResolvedValue(CLAIMS);
  vi.mocked(parseTransactionText).mockReset().mockResolvedValue({ status: 200, body: SUCCESS });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

test("maxDuration 15 detik", () => {
  expect(maxDuration).toBe(15);
});

describe("POST /api/ai/parse: gerbang", () => {
  test.each([
    ["Origin lain", { ...JSON_HEADERS, origin: "https://evil.com" }],
    ["tanpa Origin", { host: "localhost:3000", "content-type": "application/json" }],
    ["Sec-Fetch-Site cross-site", { ...JSON_HEADERS, "sec-fetch-site": "cross-site" }],
  ])("403 untuk %s, sebelum sesi diperiksa", async (_label, headers) => {
    const { status, body } = await call(postJson({ text: "makan 20rb" }, headers));
    expect(status).toBe(403);
    expect(codeOf(body)).toBe("forbidden_origin");
    expect(getClaims).not.toHaveBeenCalled();
    expect(parseTransactionText).not.toHaveBeenCalled();
  });

  test("401 tanpa sesi", async () => {
    vi.mocked(getClaims).mockResolvedValue(null);
    const { status, body } = await call(postJson({ text: "makan 20rb" }));
    expect(status).toBe(401);
    expect(body).toEqual({ ok: false, error: { code: "unauthorized", message: "Sesi berakhir. Silakan masuk lagi." } });
    expect(parseTransactionText).not.toHaveBeenCalled();
  });

  test.each(["text/plain", "application/x-www-form-urlencoded", ""])("415 untuk content-type %j", async (type) => {
    const { status, body } = await call(postJson({ text: "makan" }, { ...SAME_ORIGIN, "content-type": type }));
    expect(status).toBe(415);
    expect(codeOf(body)).toBe("unsupported_media_type");
  });

  test("application/json dengan charset diterima", async () => {
    const { status } = await call(
      postJson({ text: "makan 20rb" }, { ...SAME_ORIGIN, "content-type": "application/json; charset=utf-8" }),
    );
    expect(status).toBe(200);
  });

  test("413 dari Content-Length", async () => {
    const { status, body } = await call(
      post(JSON.stringify({ text: "a" }), { ...JSON_HEADERS, "content-length": "5000" }),
    );
    expect(status).toBe(413);
    expect(codeOf(body)).toBe("payload_too_large");
  });

  test("413 untuk stream chunked 5000 byte tanpa Content-Length; reader dibatalkan", async () => {
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= 5000) return controller.close();
        controller.enqueue(new Uint8Array(1000).fill(0x61));
        sent += 1000;
      },
    });
    const request = post(stream);
    expect(request.headers.get("content-length")).toBeNull();
    // Pantau reader yang dipakai handler (Request membungkus stream asli).
    const body = request.body!;
    const getReader = body.getReader.bind(body);
    const cancel = vi.fn();
    vi.spyOn(body, "getReader").mockImplementation((() => {
      const reader = getReader();
      const original = reader.cancel.bind(reader);
      reader.cancel = (reason?: unknown) => {
        cancel();
        return original(reason);
      };
      return reader;
    }) as typeof body.getReader);

    const res = await call(request);
    expect(res.status).toBe(413);
    expect(codeOf(res.body)).toBe("payload_too_large");
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(parseTransactionText).not.toHaveBeenCalled();
  });

  test("UTF-8 rusak → 400", async () => {
    const { status, body } = await call(post(new Uint8Array([0x7b, 0xff, 0xfe, 0x7d])));
    expect(status).toBe(400);
    expect(codeOf(body)).toBe("invalid_body");
  });

  test.each([
    ["JSON rusak", "{text:", "Permintaan tidak valid."],
    ["objek kosong", "{}", "Permintaan tidak valid."],
    ["text kosong", JSON.stringify({ text: "" }), "Tulis transaksinya dulu."],
    ["hanya spasi", JSON.stringify({ text: "   \n\t " }), "Tulis transaksinya dulu."],
    ["501 karakter", JSON.stringify({ text: "a".repeat(501) }), "Kalimat terlalu panjang (maks 500 karakter)."],
    ["key tambahan", JSON.stringify({ text: "a", extra: 1 }), "Permintaan tidak valid."],
    ["text bukan string", JSON.stringify({ text: 5 }), "Permintaan tidak valid."],
  ])("400 untuk %s", async (_label, raw, message) => {
    const { status, body } = await call(post(raw));
    expect(status).toBe(400);
    expect(body).toEqual({ ok: false, error: { code: "invalid_body", message } });
    expect(parseTransactionText).not.toHaveBeenCalled();
  });

  test("500 karakter diterima", async () => {
    const { status } = await call(postJson({ text: "a".repeat(500) }));
    expect(status).toBe(200);
  });
});

describe("POST /api/ai/parse: layanan", () => {
  test("200 dengan draft; teks dinormalisasi dan request.signal diteruskan", async () => {
    const request = postJson({ text: "  makan\t20rb  " });
    const { status, body } = await call(request);
    expect(status).toBe(200);
    expect(body).toEqual(SUCCESS);
    expect(parseTransactionText).toHaveBeenCalledWith(CLAIMS, "makan 20rb", request.signal);
  });

  test("200 untuk request LAN (192.168.1.10:3000)", async () => {
    const lan = { origin: "http://192.168.1.10:3000", host: "192.168.1.10:3000", "content-type": "application/json" };
    const { status } = await call(postJson({ text: "makan 20rb" }, lan));
    expect(status).toBe(200);
  });

  test("429 quota_exceeded dengan pesan Indonesia dan prefill", async () => {
    vi.mocked(parseTransactionText).mockResolvedValue({
      status: 429,
      body: parseFailure("quota_exceeded", { description: "makan 20rb", amount: 20000 }),
    });
    const { status, body } = await call(postJson({ text: "makan 20rb" }));
    expect(status).toBe(429);
    const failure = body as ParseFailure;
    expect(failure.error.code).toBe("quota_exceeded");
    expect(failure.error.message).toMatch(/Kuota AI harian kamu sudah habis/);
    expect(failure.prefill?.description).toBe("makan 20rb");
  });

  test.each([
    [503, "ai_unavailable"],
    [503, "ai_busy"],
    [504, "ai_timeout"],
    [502, "ai_invalid_output"],
    [422, "ai_not_understood"],
  ] as const)("%d %s diteruskan apa adanya", async (code, errorCode) => {
    vi.mocked(parseTransactionText).mockResolvedValue({
      status: code,
      body: parseFailure(errorCode, { description: "makan" }),
    });
    const { status, body } = await call(postJson({ text: "makan" }));
    expect(status).toBe(code);
    expect(codeOf(body)).toBe(errorCode);
    expect((body as ParseFailure).prefill).toEqual({ description: "makan" });
  });

  test("pesan error provider/layanan tidak pernah masuk respons atau log", async () => {
    vi.mocked(parseTransactionText).mockRejectedValue(new Error("FAKE-PROVIDER-MESSAGE sk-ant-secret"));
    const res = await POST(postJson({ text: "makan nasi padang" }));
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(text)).toEqual({
      ok: false,
      error: { code: "internal", message: "Terjadi kesalahan. Silakan isi form manual." },
    });
    expect(text).not.toContain("FAKE-PROVIDER-MESSAGE");
    const logged = vi
      .mocked(console.error)
      .mock.calls.flat()
      .map(String)
      .join("\n");
    expect(logged).not.toContain("FAKE-PROVIDER-MESSAGE");
    expect(logged).not.toContain("nasi padang");
  });

  test("getClaims melempar → 500 no-store", async () => {
    vi.mocked(getClaims).mockRejectedValue(new Error("supabase down"));
    const { status, body } = await call(postJson({ text: "makan" }));
    expect(status).toBe(500);
    expect(codeOf(body)).toBe("internal");
  });
});
