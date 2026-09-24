import "server-only";

export type HealthStatus = { status: "ok"; time: string };

export function getHealth(): HealthStatus {
  return { status: "ok", time: new Date().toISOString() };
}
