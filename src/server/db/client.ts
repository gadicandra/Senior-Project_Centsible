import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Satu instance per proses. Di dev, hot reload membuat modul dievaluasi ulang,
// jadi instance disimpan di globalThis agar koneksi pool tidak menumpuk.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  // DATABASE_URL = pooler Supavisor mode transaction (port 6543).
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
