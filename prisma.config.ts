import { defineConfig } from "prisma/config";
import fs from "node:fs";

// Load .env.local if present
if (fs.existsSync(".env.local") && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env.local");
}

// Prisma 7 config — connection URL and seed command
export default defineConfig({
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
