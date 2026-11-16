// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getClaims } from "@/server/auth/session";
import { withRls } from "@/server/db/with-rls";
import { sttConfig, transcribe } from "@/server/ai/transcribe";
import { POST } from "./route";

vi.mock("@/server/auth/session", () => ({ getClaims: vi.fn() }));
vi.mock("@/server/db/with-rls", () => ({ withRls: vi.fn(async () => [{ remaining: 99 }]) }));
vi.mock("@/server/ai/transcribe", () => ({ sttConfig: vi.fn(() => ({})), transcribe: vi.fn(async () => "beli bensin gocap") }));

const SAME = { origin: "http://localhost:3000", host: "localhost:3000" };
function post(audio: Blob | null, headers: Record<string, string> = SAME) {
  const body = new FormData();
  if (audio) body.append("audio", audio, "r.webm");
  return POST(new Request("http://localhost:3000/api/ai/transcribe", { method: "POST", headers, body }));
}
const webm = (bytes = 100) => new Blob([new Uint8Array(bytes)], { type: "audio/webm" });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getClaims).mockResolvedValue({ sub: "u1" });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("POST /api/ai/transcribe", () => {
  test("berhasil: kuota 'transcribe' dipakai lalu teks dikembalikan", async () => {
    const res = await post(webm());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, text: "beli bensin gocap" });
    expect(withRls).toHaveBeenCalledTimes(1);
    expect(transcribe).toHaveBeenCalledTimes(1);
  });

  test("gerbang: origin, sesi, fitur mati", async () => {
    expect((await post(webm(), { ...SAME, origin: "https://jahat.example" })).status).toBe(403);
    vi.mocked(getClaims).mockResolvedValueOnce(null);
    expect((await post(webm())).status).toBe(401);
    vi.mocked(sttConfig).mockReturnValueOnce(null);
    expect((await post(webm())).status).toBe(503);
    expect(transcribe).not.toHaveBeenCalled();
  });

  test("validasi berkas sebelum kuota dipakai", async () => {
    expect((await post(null)).status).toBe(400);
    expect((await post(new Blob(["x"], { type: "text/plain" }))).status).toBe(415);
    expect((await post(webm(2 * 1024 * 1024 + 1))).status).toBe(413);
    expect(withRls).not.toHaveBeenCalled();
  });

  test("kuota habis → 429; Whisper gagal / hening → 503 / 422", async () => {
    vi.mocked(withRls).mockRejectedValueOnce({ code: "53400" });
    expect((await post(webm())).status).toBe(429);
    vi.mocked(transcribe).mockRejectedValueOnce(new Error("down"));
    expect((await post(webm())).status).toBe(503);
    vi.mocked(transcribe).mockResolvedValueOnce("");
    expect((await post(webm())).status).toBe(422);
  });

  test("teks dipotong ke batas input UI", async () => {
    vi.mocked(transcribe).mockResolvedValueOnce("a".repeat(400));
    expect(((await (await post(webm())).json()) as { text: string }).text).toHaveLength(300);
  });
});
