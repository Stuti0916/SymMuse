import { setupDatabase } from "./setup-database.js"

async function runSetup() {
  try {
    console.log("[v0] Starting database setup...")
    await setupDatabase()
    console.log("[v0] Database setup completed successfully!")
  } catch (error) {
    console.error("[v0] Database setup failed:", error)
    process.exit(1)
  }
}

runSetup()
