import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const sql = neon(DATABASE_URL);

// Initialize database schema
export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      "firstName" TEXT NOT NULL,
      "lastName" TEXT NOT NULL,
      pathology TEXT,
      notes TEXT,
      "dateOfBirth" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS practitioners (
      id SERIAL PRIMARY KEY,
      "fullName" TEXT NOT NULL,
      specialty TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS resources (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS availabilities (
      id SERIAL PRIMARY KEY,
      "practitionerId" INTEGER NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
      start TIMESTAMP NOT NULL,
      "end" TIMESTAMP NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      "patientId" INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      "practitionerId" INTEGER NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
      "resourceId" INTEGER REFERENCES resources(id) ON DELETE SET NULL,
      pathology TEXT,
      start TIMESTAMP NOT NULL,
      "end" TIMESTAMP NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      notes TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      message TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'info',
      read BOOLEAN NOT NULL DEFAULT FALSE,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  // Create indexes if not exist
  await sql`CREATE INDEX IF NOT EXISTS idx_patients_name ON patients("lastName", "firstName")`;
  await sql`CREATE INDEX IF NOT EXISTS idx_appointments_practitioner ON appointments("practitionerId", start, "end")`;
  await sql`CREATE INDEX IF NOT EXISTS idx_appointments_resource ON appointments("resourceId", start, "end")`;
  await sql`CREATE INDEX IF NOT EXISTS idx_availability_practitioner ON availabilities("practitionerId", start, "end")`;

  console.log("✅ Database initialized");
}

