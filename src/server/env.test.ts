// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getAiConfig, getAiDailyLimit, getDraftSecret, resetAiConfigForTests } from "./env";

const SECRET = "s".repeat(32);
const ANTHROPIC_KEY = "sk-ant-test-key-0123456789";
const GATEWAY_KEY = "gw-key-abc";
const AI_VARS = [
  "AI_TEXT_PROVIDER",
  "AI_TEXT_MODEL",
  "ANTHROPIC_API_KEY",
  "AI_TEXT_BASE_URL",
  "AI_TEXT_API_KEY",
  "AI_PARSE_DAILY_LIMIT",
  "AI_DRAFT_SECRET",
];

function stubAnthropic() {
  vi.stubEnv("AI_TEXT_PROVIDER", "anthropic");
  vi.stubEnv("AI_TEXT_MODEL", "claude-haiku-4-5");
  vi.stubEnv("ANTHROPIC_API_KEY", ANTHROPIC_KEY);
  vi.stubEnv("AI_DRAFT_SECRET", SECRET);
}

function stubGateway(baseURL = "https://gateway.example.com/v1") {
  vi.stubEnv("AI_TEXT_PROVIDER", "openai-compatible");
  vi.stubEnv("AI_TEXT_MODEL", "gemini-2.5-flash");
  vi.stubEnv("AI_TEXT_BASE_URL", baseURL);
  vi.stubEnv("AI_TEXT_API_KEY", GATEWAY_KEY);
  vi.stubEnv("AI_DRAFT_SECRET", SECRET);
}

/** Semua argumen console yang tercatat, digabung untuk dicari. */
function logged(...spies: { mock: { calls: unknown[][] } }[]) {
  return spies.flatMap((s) => s.mock.calls.flat()).map(String).join("\n");
}

let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  for (const name of AI_VARS) vi.stubEnv(name, undefined);
  resetAiConfigForTests();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getAiConfig", () => {
  test("provider tidak di-set → null tanpa log", () => {
    expect(getAiConfig()).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('AI_TEXT_PROVIDER="" → null tanpa log (sama dengan tidak di-set)', () => {
    vi.stubEnv("AI_TEXT_PROVIDER", "");
    expect(getAiConfig()).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test("provider spasi saja → null dengan log error (tidak valid, bukan kosong)", () => {
    vi.stubEnv("AI_TEXT_PROVIDER", "  ");
    expect(getAiConfig()).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(errorSpy.mock.calls[0][0] as string)).toEqual({
      evt: "ai_config",
      code: "invalid_env",
      var: "AI_TEXT_PROVIDER",
    });
  });

  test("provider tidak dikenal → null + log nama, bukan nilai", () => {
    vi.stubEnv("AI_TEXT_PROVIDER", "evil-provider");
    expect(getAiConfig()).toBeNull();
    expect(logged(errorSpy)).toContain("AI_TEXT_PROVIDER");
    expect(logged(errorSpy)).not.toContain("evil-provider");
  });

  test("anthropic valid → config lengkap", () => {
    stubAnthropic();
    expect(getAiConfig()).toEqual({
      provider: "anthropic",
      model: "claude-haiku-4-5",
      apiKey: ANTHROPIC_KEY,
      dailyLimit: 100,
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test("hasil di-memo sampai resetAiConfigForTests()", () => {
    stubAnthropic();
    const first = getAiConfig();
    vi.stubEnv("AI_TEXT_PROVIDER", undefined);
    expect(getAiConfig()).toBe(first);
    resetAiConfigForTests();
    expect(getAiConfig()).toBeNull();
  });

  test("anthropic tanpa key → null + log ANTHROPIC_API_KEY", () => {
    stubAnthropic();
    vi.stubEnv("ANTHROPIC_API_KEY", undefined);
    expect(getAiConfig()).toBeNull();
    expect(logged(errorSpy)).toContain("ANTHROPIC_API_KEY");
  });

  test('ANTHROPIC_API_KEY="" → null + satu log yang menyebut ANTHROPIC_API_KEY', () => {
    stubAnthropic();
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(getAiConfig()).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(logged(errorSpy)).toContain("ANTHROPIC_API_KEY");
  });

  test("ANTHROPIC_API_KEY < 20 karakter ditolak tanpa mencatat nilainya", () => {
    stubAnthropic();
    vi.stubEnv("ANTHROPIC_API_KEY", "short-secret-key");
    expect(getAiConfig()).toBeNull();
    expect(logged(errorSpy)).toContain("ANTHROPIC_API_KEY");
    expect(logged(errorSpy)).not.toContain("short-secret-key");
  });

  test("var kosong milik provider lain diabaikan", () => {
    stubAnthropic();
    vi.stubEnv("AI_TEXT_BASE_URL", "");
    vi.stubEnv("AI_TEXT_API_KEY", "");
    expect(getAiConfig()?.provider).toBe("anthropic");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test("model tidak valid → null + log AI_TEXT_MODEL", () => {
    stubAnthropic();
    vi.stubEnv("AI_TEXT_MODEL", "model dengan spasi");
    expect(getAiConfig()).toBeNull();
    expect(logged(errorSpy)).toContain("AI_TEXT_MODEL");
    vi.stubEnv("AI_TEXT_MODEL", "m".repeat(101));
    resetAiConfigForTests();
    expect(getAiConfig()).toBeNull();
  });

  test("openai-compatible https valid", () => {
    stubGateway();
    expect(getAiConfig()).toEqual({
      provider: "openai-compatible",
      model: "gemini-2.5-flash",
      apiKey: GATEWAY_KEY,
      baseURL: "https://gateway.example.com/v1",
      dailyLimit: 100,
    });
  });

  test.each(["http://localhost:20128/v1", "http://127.0.0.1:20128/v1"])("http lokal diizinkan: %s", (url) => {
    stubGateway(url);
    expect(getAiConfig()?.baseURL).toBe(url);
  });

  test.each(["http://gateway.example.com/v1", "http://192.168.1.10:20128/v1", "ftp://localhost/v1", "bukan url"])(
    "base URL ditolak: %s",
    (url) => {
      stubGateway(url);
      expect(getAiConfig()).toBeNull();
      expect(logged(errorSpy)).toContain("AI_TEXT_BASE_URL");
      expect(logged(errorSpy)).not.toContain(url);
    },
  );

  test("openai-compatible tanpa AI_TEXT_API_KEY → null + log nama", () => {
    stubGateway();
    vi.stubEnv("AI_TEXT_API_KEY", "");
    expect(getAiConfig()).toBeNull();
    expect(logged(errorSpy)).toContain("AI_TEXT_API_KEY");
    expect(logged(errorSpy)).not.toContain(GATEWAY_KEY);
  });

  test("provider di-set tetapi AI_DRAFT_SECRET kurang → null + log AI_DRAFT_SECRET", () => {
    stubAnthropic();
    vi.stubEnv("AI_DRAFT_SECRET", "x".repeat(31));
    expect(getAiConfig()).toBeNull();
    expect(logged(errorSpy)).toContain("AI_DRAFT_SECRET");
    expect(logged(errorSpy)).not.toContain("x".repeat(31));
  });

  test("log tidak pernah memuat nilai rahasia", () => {
    stubAnthropic();
    vi.stubEnv("AI_TEXT_MODEL", "bad model");
    vi.stubEnv("AI_DRAFT_SECRET", "short");
    getAiConfig();
    const out = logged(errorSpy, warnSpy);
    expect(out).not.toContain(ANTHROPIC_KEY);
    expect(out).not.toContain("bad model");
    expect(out).not.toContain("short");
  });

  test("dailyLimit diambil dari AI_PARSE_DAILY_LIMIT", () => {
    stubAnthropic();
    vi.stubEnv("AI_PARSE_DAILY_LIMIT", "7");
    expect(getAiConfig()!.dailyLimit).toBe(7);
  });
});

describe("getDraftSecret", () => {
  test("tidak di-set / kosong / 31 karakter → null", () => {
    expect(getDraftSecret()).toBeNull();
    vi.stubEnv("AI_DRAFT_SECRET", "");
    expect(getDraftSecret()).toBeNull();
    vi.stubEnv("AI_DRAFT_SECRET", "a".repeat(31));
    expect(getDraftSecret()).toBeNull();
  });

  test("32 karakter → nilainya, tanpa bergantung pada AI_TEXT_PROVIDER", () => {
    vi.stubEnv("AI_DRAFT_SECRET", SECRET);
    expect(getDraftSecret()).toBe(SECRET);
    vi.stubEnv("AI_TEXT_PROVIDER", "anthropic");
    expect(getDraftSecret()).toBe(SECRET);
  });
});

describe("getAiDailyLimit", () => {
  test("tidak di-set dan kosong → 100 tanpa warn", () => {
    expect(getAiDailyLimit()).toBe(100);
    vi.stubEnv("AI_PARSE_DAILY_LIMIT", "");
    expect(getAiDailyLimit()).toBe(100);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test.each([
    ["7", 7],
    ["10000", 10000],
  ])("%s → %d", (raw, expected) => {
    vi.stubEnv("AI_PARSE_DAILY_LIMIT", raw);
    expect(getAiDailyLimit()).toBe(expected);
  });

  test("'7' juga berlaku dengan config anthropic lengkap", () => {
    stubAnthropic();
    vi.stubEnv("AI_PARSE_DAILY_LIMIT", "7");
    expect(getAiDailyLimit()).toBe(7);
  });

  test.each(["0", "abc", "7.5", " 7 ", "1e3", "10001"])("%j tidak valid → 100", (raw) => {
    vi.stubEnv("AI_PARSE_DAILY_LIMIT", raw);
    expect(getAiDailyLimit()).toBe(100);
  });

  test("warn hanya sekali per proses, menyebut nama tanpa nilai; muncul lagi setelah reset", () => {
    vi.stubEnv("AI_PARSE_DAILY_LIMIT", "1e3");
    getAiDailyLimit();
    getAiDailyLimit();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const line = warnSpy.mock.calls[0][0] as string;
    expect(JSON.parse(line)).toEqual({ evt: "ai_config", code: "invalid_env", var: "AI_PARSE_DAILY_LIMIT" });
    expect(line).not.toContain("1e3");
    resetAiConfigForTests();
    getAiDailyLimit();
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});
