import "server-only";
import { Prisma } from "@/generated/prisma/client";

/** Kode SQLSTATE PostgreSQL dari error Prisma (lewat adapter pg), bila ada. */
export function pgCode(error: unknown): string | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "23505";
    if (error.code === "P2003") return "23503";
    const meta = error.meta as { code?: string; driverAdapterError?: { cause?: { originalCode?: string } } } | undefined;
    return meta?.driverAdapterError?.cause?.originalCode ?? meta?.code;
  }
  const code = (error as { code?: unknown })?.code;
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? code : undefined;
}

export const isUniqueViolation = (e: unknown) => pgCode(e) === "23505";
export const isForeignKeyViolation = (e: unknown) => pgCode(e) === "23503";
