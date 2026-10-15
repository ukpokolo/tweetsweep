import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/env";

// Reuse one client across hot reloads in dev to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Created on first use, not at import time, so building the app (or importing
 * a route in tests) doesn't require DATABASE_URL to be set.
 */
export function getDb(): PrismaClient {
  globalForPrisma.prisma ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: getEnv().DATABASE_URL }),
  });
  return globalForPrisma.prisma;
}
