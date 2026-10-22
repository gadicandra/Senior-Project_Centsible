// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AiError, buildModelVersion, createDeadline } from ".";

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
