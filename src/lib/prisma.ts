import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/config/env";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  if (!env.server.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required before database-backed functionality can run.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.server.DATABASE_URL }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
