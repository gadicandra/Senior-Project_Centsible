// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { sttConfig } from "./transcribe";

afterEach(() => vi.unstubAllEnvs());

test("mati kecuali AI_STT_ENABLED=true dan env valid (FR 7: input teks tetap jalan)", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  expect(sttConfig()).toBeNull();
  vi.stubEnv("AI_STT_ENABLED", "true");
  vi.stubEnv("AI_STT_BASE_URL", "bukan-url");
  vi.stubEnv("AI_STT_MODEL", "Systran/faster-whisper-small");
  expect(sttConfig()).toBeNull();
  vi.stubEnv("AI_STT_BASE_URL", "http://localhost:8000/v1");
  expect(sttConfig()).toEqual({ AI_STT_BASE_URL: "http://localhost:8000/v1", AI_STT_MODEL: "Systran/faster-whisper-small", AI_STT_API_KEY: "none" });
});
