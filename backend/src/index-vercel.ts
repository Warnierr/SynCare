import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { sql, initDB } from "./db-neon";
import { addMinutes, parseISO } from "date-fns";

const app = express();

// CORS configuration for Vercel
const corsOptions = {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize database on first request
let dbInitialized = false;
app.use(async (_req, _res, next) => {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
  next();
});

// Audit logging
app.use(async (req, _res, next) => {
  await sql`INSERT INTO audit_logs (method, path) VALUES (${req.method}, ${req.path})`;
  next();
});

// Helper function for notifications
async function notify(message: string, kind: string = "info") {
  await sql`INSERT INTO notifications (message, kind) VALUES (${message}, ${kind})`;
}

// Zod schemas
const PatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  pathology: z.string().optional(),
  notes: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

const PractitionerSchema = z.object({
  fullName: z.string().min(1),
  specialty: z.string().optional(),
});

const ResourceSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
});

const AvailabilitySchema = z.object({
  practitionerId: z.number().int().positive(),
  start: z.string(),
  end: z.string(),
});

const AppointmentSchema = z.object({
  patientId: z.number().int().positive(),
  practitionerId: z.number().int().positive(),
  resourceId: z.number().int().positive().optional(),
  pathology: z.string().optional(),
  start: z.string(),
  end: z.string(),
  notes: z.string().optional(),
});

const MatchSchema = z.object({
  patientId: z.number().int().positive(),
  practitionerId: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
  limit: z.number().int().positive().optional(),
});

// Root endpoint
app.get("/", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0", name: "SynCare API" });
});

// Patients
app.get("/patients", async (_req, res) => {
  const rows = await sql`SELECT * FROM patients ORDER BY "lastName", "firstName"`;
  res.json(rows);
});

app.get("/patients/search", async (req, res) => {
  const q = String(req.query.q ?? "").toLowerCase();
  const rows = await sql`
    SELECT * FROM patients 
    WHERE LOWER("firstName") LIKE ${"%" + q + "%"} 
       OR LOWER("lastName") LIKE ${"%" + q + "%"}
    ORDER BY "lastName", "firstName"
  `;
  res.json(rows);
});

app.post("/patients", async (req, res) => {
  const parsed = PatientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  
  const data = parsed.data;
  const result = await sql`
    INSERT INTO patients ("firstName", "lastName", pathology, notes, "dateOfBirth")
    VALUES (${data.firstName}, ${data.lastName}, ${data.pathology ?? null}, ${data.notes ?? null}, ${data.dateOfBirth ?? null})
    RETURNING *
  `;
  res.status(201).json(result[0]);
});

// Practitioners
app.get("/practitioners", async (_req, res) => {
  const rows = await sql`SELECT * FROM practitioners ORDER BY "fullName"`;
  res.json(rows);
});

app.post("/practitioners", async (req, res) => {
  const parsed = PractitionerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  
  const data = parsed.data;
  const result = await sql`
    INSERT INTO practitioners ("fullName", specialty)
    VALUES (${data.fullName}, ${data.specialty ?? null})
    RETURNING *
  `;
  res.status(201).json(result[0]);
});

// Resources
app.get("/resources", async (_req, res) => {
  const rows = await sql`SELECT * FROM resources ORDER BY name`;
  res.json(rows);
});

app.post("/resources", async (req, res) => {
  const parsed = ResourceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  
  const data = parsed.data;
  const result = await sql`
    INSERT INTO resources (name, type)
    VALUES (${data.name}, ${data.type ?? null})
    RETURNING *
  `;
  res.status(201).json(result[0]);
});

// Availabilities
app.get("/availabilities", async (req, res) => {
  const practitionerId = req.query.practitionerId ? Number(req.query.practitionerId) : null;
  
  const rows = practitionerId
    ? await sql`SELECT * FROM availabilities WHERE "practitionerId" = ${practitionerId} ORDER BY start`
    : await sql`SELECT * FROM availabilities ORDER BY start`;
  
  res.json(rows);
});

app.post("/availabilities", async (req, res) => {
  const parsed = AvailabilitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  
  const data = parsed.data;
  const result = await sql`
    INSERT INTO availabilities ("practitionerId", start, "end")
    VALUES (${data.practitionerId}, ${data.start}, ${data.end})
    RETURNING *
  `;
  res.status(201).json(result[0]);
});

// Appointments
app.get("/appointments", async (req, res) => {
  const practitionerId = req.query.practitionerId ? Number(req.query.practitionerId) : null;
  
  const rows = practitionerId
    ? await sql`SELECT * FROM appointments WHERE "practitionerId" = ${practitionerId} ORDER BY start`
    : await sql`SELECT * FROM appointments ORDER BY start`;
  
  res.json(rows);
});

async function hasConflict(practitionerId: number, start: string, end: string): Promise<boolean> {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  
  const appointments = await sql`
    SELECT start, "end" FROM appointments 
    WHERE "practitionerId" = ${practitionerId}
  `;
  
  for (const apt of appointments) {
    const aptStart = new Date(apt.start);
    const aptEnd = new Date(apt.end);
    
    // Check for overlap
    if (startDate < aptEnd && endDate > aptStart) {
      return true;
    }
  }
  return false;
}

app.post("/appointments", async (req, res) => {
  const parsed = AppointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  
  const data = parsed.data;
  
  // Check for conflicts
  if (await hasConflict(data.practitionerId, data.start, data.end)) {
    return res.status(409).json({ error: "Conflit horaire détecté" });
  }
  
  const result = await sql`
    INSERT INTO appointments ("patientId", "practitionerId", "resourceId", pathology, start, "end", notes)
    VALUES (${data.patientId}, ${data.practitionerId}, ${data.resourceId ?? null}, ${data.pathology ?? null}, ${data.start}, ${data.end}, ${data.notes ?? null})
    RETURNING *
  `;
  
  await notify(`RDV confirmé patient #${data.patientId} avec praticien #${data.practitionerId}`, "booking");
  
  res.status(201).json(result[0]);
});

// Match endpoint
app.post("/match", async (req, res) => {
  const parsed = MatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  
  const { practitionerId, durationMinutes, windowStart, windowEnd, limit = 10 } = parsed.data;
  
  // Get availabilities
  const availabilities = await sql`
    SELECT start, "end" FROM availabilities 
    WHERE "practitionerId" = ${practitionerId}
    ORDER BY start
  `;
  
  // Get existing appointments
  const appointments = await sql`
    SELECT start, "end" FROM appointments 
    WHERE "practitionerId" = ${practitionerId}
  `;
  
  const candidates: { start: string; end: string; practitionerId: number }[] = [];
  
  for (const avail of availabilities) {
    let slotStart = new Date(avail.start);
    const availEnd = new Date(avail.end);
    
    while (slotStart < availEnd) {
      const slotEnd = addMinutes(slotStart, durationMinutes);
      
      if (slotEnd > availEnd) break;
      
      // Check if slot overlaps with any appointment
      let hasOverlap = false;
      for (const apt of appointments) {
        const aptStart = new Date(apt.start);
        const aptEnd = new Date(apt.end);
        
        if (slotStart < aptEnd && slotEnd > aptStart) {
          hasOverlap = true;
          break;
        }
      }
      
      if (!hasOverlap) {
        // Check window constraints
        let inWindow = true;
        if (windowStart && slotStart < parseISO(windowStart)) inWindow = false;
        if (windowEnd && slotEnd > parseISO(windowEnd)) inWindow = false;
        
        if (inWindow) {
          candidates.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            practitionerId,
          });
        }
      }
      
      slotStart = addMinutes(slotStart, 30); // 30-minute increments
      
      if (candidates.length >= limit) break;
    }
    
    if (candidates.length >= limit) break;
  }
  
  res.json(candidates);
});

// Notifications
app.get("/notifications", async (_req, res) => {
  const rows = await sql`SELECT * FROM notifications ORDER BY "createdAt" DESC LIMIT 50`;
  res.json(rows);
});

app.post("/notifications/:id/read", async (req, res) => {
  const id = Number(req.params.id);
  await sql`UPDATE notifications SET read = TRUE WHERE id = ${id}`;
  res.json({ ok: true });
});

// Audit logs
app.get("/audit", async (_req, res) => {
  const rows = await sql`SELECT * FROM audit_logs ORDER BY "createdAt" DESC LIMIT 100`;
  res.json(rows);
});

// ============================================
// DELETE Endpoints
// ============================================

// Delete patient
app.delete("/patients/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await sql`DELETE FROM patients WHERE id = ${id}`;
    await notify(`Patient #${id} supprimé`, "delete");
    res.json({ ok: true, message: "Patient supprimé" });
  } catch (e) {
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

// Delete practitioner
app.delete("/practitioners/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    // Check if practitioner has appointments
    const appointments = await sql`SELECT COUNT(*) as count FROM appointments WHERE "practitionerId" = ${id}`;
    if (Number(appointments[0].count) > 0) {
      return res.status(400).json({ error: "Impossible de supprimer un praticien avec des RDV" });
    }
    await sql`DELETE FROM practitioners WHERE id = ${id}`;
    await notify(`Praticien #${id} supprimé`, "delete");
    res.json({ ok: true, message: "Praticien supprimé" });
  } catch (e) {
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

// Delete/Cancel appointment
app.delete("/appointments/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const apt = await sql`SELECT * FROM appointments WHERE id = ${id}`;
    if (apt.length === 0) {
      return res.status(404).json({ error: "RDV non trouvé" });
    }
    await sql`DELETE FROM appointments WHERE id = ${id}`;
    await notify(`RDV #${id} annulé`, "cancel");
    res.json({ ok: true, message: "RDV annulé" });
  } catch (e) {
    res.status(500).json({ error: "Erreur lors de l'annulation" });
  }
});

// Update appointment status (for cancellation without deletion)
app.patch("/appointments/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await sql`UPDATE appointments SET status = 'cancelled' WHERE id = ${id}`;
    await notify(`RDV #${id} annulé`, "cancel");
    res.json({ ok: true, message: "RDV annulé" });
  } catch (e) {
    res.status(500).json({ error: "Erreur lors de l'annulation" });
  }
});

// For local development
const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 SynCare API running on http://localhost:${PORT}`);
  });
}

export default app;

