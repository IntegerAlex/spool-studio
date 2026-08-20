import { loadEnvConfig } from "@next/env"
import type { Config } from "drizzle-kit"

loadEnvConfig(process.cwd())

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is required")

export default {
  schema: "./src/db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
  tablesFilter: ["!_migrations"],
} satisfies Config
