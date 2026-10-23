// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AiError, buildModelVersion, createDeadline, getTextParser, resetTextParserForTests } from ".";

const MV_RE = /^[\w.:\/@-]{1,120}$/;

describe("createDeadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("abort setelah ms dengan AiError('timeout') sebagai reason", () => {
    const d = createDeadline(8000);
    vi.advanceTimersByTime(7999);
    expect(d.signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(d.signal.aborted).toBe(true);
    expect(d.signal.reason).toBeInstanceOf(AiError);
    expect((d.signal.reason as AiError).code).toBe("timeout");
    d.dispose();
  });

  test("langsung abort bila sinyal klien sudah abort", () => {
    const client = new AbortController();
    client.abort();
    const d = createDeadline(8000, client.signal);
    expect(d.signal.aborted).toBe(true);
    expect((d.signal.reason as AiError).code).toBe("timeout");
    d.dispose();
  });

  test("abort ketika sinyal klien abort belakangan", () => {
    const client = new AbortController();
    const d = createDeadline(8000, client.signal);
    expect(d.signal.aborted).toBe(false);
    client.abort();
    expect(d.signal.aborted).toBe(true);
    expect((d.signal.reason as AiError).code).toBe("timeout");
    d.dispose();
  });

  test("remainingMs mengikuti jam yang disuntik dan tidak pernah < 0", () => {
    let t = 1000;
    const d = createDeadline(8000, undefined, () => t);
    expect(d.remainingMs()).toBe(8000);
    t += 2500;
    expect(d.remainingMs()).toBe(5500);
    t += 10_000;
    expect(d.remainingMs()).toBe(0);
    d.dispose();
  });

  test("dispose membersihkan timer dan listener klien", () => {
    const client = new AbortController();
    const d = createDeadline(8000, client.signal);
    d.dispose();
    vi.advanceTimersByTime(10_000);
    client.abort();
    expect(d.signal.aborted).toBe(false);
  });
});

describe("buildModelVersion", () => {
  test("format provider:model@prompt", () => {
    expect(buildModelVersion("anthropic", "claude-haiku-4-5")).toBe("anthropic:claude-haiku-4-5@p1");
  });

  test("model panjang dipotong sehingga ≤ 120", () => {
    const mv = buildModelVersion("openai-compatible", "x".repeat(100));
    expect(mv.length).toBeLessThanOrEqual(120);
    expect(mv.startsWith("openai-compatible:")).toBe(true);
    expect(mv.endsWith("@p1")).toBe(true);
    expect(mv).toMatch(MV_RE);
    const huge = buildModelVersion("openai-compatible", "y".repeat(500));
    expect(huge.length).toBe(120);
    expect(huge).toMatch(MV_RE);
  });

  test("selalu cocok dengan regex mv draft", () => {
    for (const model of ["claude-haiku-4-5", "openai/gpt-4o-mini", "org/model:free", "a.b_c-1"]) {
      expect(buildModelVersion("anthropic", model)).toMatch(MV_RE);
      expect(buildModelVersion("openai-compatible", model)).toMatch(MV_RE);
    }
  });
});

describe("getTextParser", () => {
  const SECRET = "s".repeat(32);
  const AI_VARS = [
    "AI_TEXT_PROVIDER",
    "AI_TEXT_MODEL",
    "ANTHROPIC_API_KEY",
    "AI_TEXT_BASE_URL",
    "AI_TEXT_API_KEY",
    "AI_PARSE_DAILY_LIMIT",
    "AI_DRAFT_SECRET",
  ];
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    for (const name of AI_VARS) vi.stubEnv(name, undefined);
    resetTextParserForTests();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function codeOf(fn: () => unknown) {
    try {
      fn();
    } catch (e) {
      expect(e).toBeInstanceOf(AiError);
      return (e as AiError).code;
    }
    throw new Error("tidak melempar");
  }

  const stubAnthropic = () => {
    vi.stubEnv("AI_TEXT_PROVIDER", "anthropic");
    vi.stubEnv("AI_TEXT_MODEL", "claude-haiku-4-5");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key-0123456789");
    vi.stubEnv("AI_DRAFT_SECRET", SECRET);
  };
  const stubGateway = (provider: "openai-compatible" | "azure") => {
    vi.stubEnv("AI_TEXT_PROVIDER", provider);
    vi.stubEnv("AI_TEXT_MODEL", "gemini-2.5-flash");
    vi.stubEnv("AI_TEXT_BASE_URL", "http://localhost:20128/v1");
    vi.stubEnv("AI_TEXT_API_KEY", "gw-key");
    vi.stubEnv("AI_DRAFT_SECRET", SECRET);
  };

  test("provider tidak di-set → not_configured", () => {
    expect(codeOf(getTextParser)).toBe("not_configured");
  });

  test("anthropic tanpa key → not_configured", () => {
    stubAnthropic();
    vi.stubEnv("ANTHROPIC_API_KEY", undefined);
    expect(codeOf(getTextParser)).toBe("not_configured");
  });

  test("azure → not_configured, warn azure_not_implemented sekali", () => {
    stubGateway("azure");
    expect(codeOf(getTextParser)).toBe("not_configured");
    expect(codeOf(getTextParser)).toBe("not_configured");
    const lines = warnSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .filter((l: string) => l.includes("azure_not_implemented"));
    expect(lines).toHaveLength(1);
  });

  test("anthropic valid → provider anthropic dan di-memo", () => {
    stubAnthropic();
    const parser = getTextParser();
    expect(parser.provider).toBe("anthropic");
    expect(parser.model).toBe("claude-haiku-4-5");
    vi.stubEnv("AI_TEXT_PROVIDER", undefined);
    expect(getTextParser()).toBe(parser);
    resetTextParserForTests();
    expect(codeOf(getTextParser)).toBe("not_configured");
  });

  test("openai-compatible valid → provider openai-compatible", () => {
    stubGateway("openai-compatible");
    expect(getTextParser().provider).toBe("openai-compatible");
  });
});
