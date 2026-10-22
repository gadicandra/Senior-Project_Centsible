// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { proxy } from "./proxy";
import { updateSession } from "@/server/supabase/proxy";

vi.mock("@/server/supabase/proxy", () => ({ updateSession: vi.fn() }));

function session(claims: Record<string, unknown> | null) {
  const response = NextResponse.next();
  response.cookies.set("sb-access-token", "refreshed-token", { httpOnly: true, path: "/" });
  vi.mocked(updateSession).mockResolvedValue({ response, claims } as Awaited<ReturnType<typeof updateSession>>);
  return response;
}

const request = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(new URL(path, "http://localhost:3000"), init);

beforeEach(() => {
  vi.mocked(updateSession).mockReset();
});

describe("proxy", () => {
  test("/api/ai/parse tanpa sesi → JSON 401 dengan cookie segar", async () => {
    session(null);
    const res = await proxy(request("/api/ai/parse", { method: "POST" }));
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("location")).toBeNull();
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: { code: "unauthorized", message: "Sesi berakhir. Silakan masuk lagi." } });
    expect(res.cookies.get("sb-access-token")?.value).toBe("refreshed-token");
  });

  test("/api/health tanpa sesi → diteruskan", async () => {
    const passthrough = session(null);
    const res = await proxy(request("/api/health"));
    expect(res).toBe(passthrough);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  test("/transaksi tanpa sesi → 307 ke /login?next=", async () => {
    session(null);
    const res = await proxy(request("/transaksi"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Ftransaksi");
    expect(res.cookies.get("sb-access-token")?.value).toBe("refreshed-token");
  });

  test("/api/ai/parse dengan sesi → diteruskan", async () => {
    const passthrough = session({ sub: "11111111-1111-4111-8111-111111111111" });
    const res = await proxy(request("/api/ai/parse", { method: "POST" }));
    expect(res).toBe(passthrough);
  });
});
