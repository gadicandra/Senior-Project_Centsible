// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { generateWeeklySummaries } from "@/server/services/weekly";
import { GET } from "./route";

vi.mock("@/server/services/weekly", () => ({ generateWeeklySummaries: vi.fn(async () => ({ users: 2, created: 2, skipped: 0, ai: 1, failed: 0 })) }));
const SECRET = "s".repeat(32);
const get = (auth?: string) => GET(new Request("http://x/api/cron/weekly", { headers: auth ? { authorization: auth } : {} }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

test("tanpa / salah secret → 401, job tidak jalan", async () => {
  for (const h of [undefined, "Bearer salah", `Bearer ${SECRET}x`, SECRET]) expect((await get(h)).status).toBe(401);
  expect(generateWeeklySummaries).not.toHaveBeenCalled();
});

test("CRON_SECRET kosong/pendek → selalu 401 (tidak terbuka tanpa sengaja)", async () => {
  vi.stubEnv("CRON_SECRET", "");
  expect((await get("Bearer ")).status).toBe(401);
  vi.stubEnv("CRON_SECRET", "pendek");
  expect((await get("Bearer pendek")).status).toBe(401);
});

test("secret benar → jalankan job, kembalikan ringkasan hasil", async () => {
  const res = await get(`Bearer ${SECRET}`);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ users: 2, created: 2, skipped: 0, ai: 1, failed: 0 });
});
