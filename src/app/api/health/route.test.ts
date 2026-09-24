// @vitest-environment node
import { expect, test } from "vitest";
import { GET } from "./route";

test("GET /api/health mengembalikan status ok", async () => {
  const res = GET();
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ status: "ok" });
});
