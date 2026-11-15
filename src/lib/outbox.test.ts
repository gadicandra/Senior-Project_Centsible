import { beforeEach, expect, test, vi } from "vitest";
import { OUTBOX_EVENT, enqueue, readOutbox, removeFromOutbox } from "./outbox";

beforeEach(() => localStorage.clear());

test("antrean per pengguna, urut, dan hapus berdasarkan clientId", () => {
  const changed = vi.fn();
  window.addEventListener(OUTBOX_EVENT, changed);
  const a = enqueue("u1", { amount: "25.000" });
  const b = enqueue("u1", { amount: "10.000" });
  enqueue("u2", { amount: "1" });

  expect(readOutbox("u1").map((i) => i.clientId)).toEqual([a.clientId, b.clientId]);
  expect(a.clientId).toMatch(/^[0-9a-f-]{36}$/);
  expect(readOutbox("u2")).toHaveLength(1);

  removeFromOutbox("u1", [a.clientId]);
  expect(readOutbox("u1").map((i) => i.values.amount)).toEqual(["10.000"]);
  removeFromOutbox("u1", [b.clientId]);
  expect(localStorage.getItem("centsible:outbox:u1")).toBeNull();
  expect(changed).toHaveBeenCalledTimes(5);
  window.removeEventListener(OUTBOX_EVENT, changed);
});

test("isi rusak dianggap kosong", () => {
  localStorage.setItem("centsible:outbox:u1", "{bukan json");
  expect(readOutbox("u1")).toEqual([]);
  localStorage.setItem("centsible:outbox:u1", '{"a":1}');
  expect(readOutbox("u1")).toEqual([]);
});
