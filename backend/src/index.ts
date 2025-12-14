import cors from "cors";
import express from "express";
import { z } from "zod";
import db from "./db";
import { computeMatches } from "./scheduling";
import {
  AppointmentInput,
  AvailabilityInput,
  MatchRequest,
  PatientInput,
  PractitionerInput,
} from "./types";

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.API_KEY;

app.use((req, res, next) => {
  if (apiKey && req.headers["x-api-key"] !== apiKey) {
    return res.status(401).json({ error: "Clé API requise" });
  }
  next();
});

app.use((req, _res, next) => {
  db.prepare("INSERT INTO audit_logs (method, path) VALUES (?, ?)").run(
    req.method,
    req.path
  );
  next();
});

function notify(message: string, kind: string = "info") {
  db.prepare("INSERT INTO notifications (message, kind) VALUES (?, ?)").run(
    message,
    kind
  );
}

const patientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  pathology: z.string().optional(),
  notes: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

const practitionerSchema = z.object({
  fullName: z.string().min(1),
  specialty: z.string().optional(),
});

const availabilitySchema = z.object({
  practitionerId: z.number(),
  start: z.string(),
  end: z.string(),
});

const appointmentSchema = z.object({
  patientId: z.number(),
  practitionerId: z.number(),
  resourceId: z.number().optional(),
  pathology: z.string().optional(),
  start: z.string(),
  end: z.string(),
  notes: z.string().optional(),
});

const matchSchema = z.object({
  patientId: z.number(),
  practitionerId: z.number(),
  durationMinutes: z.number().min(5),
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
  limit: z.number().optional(),
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Patients
app.post("/patients", (req, res) => {
  const parsed = patientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const data: PatientInput = parsed.data;
  const stmt = db.prepare(
    `INSERT INTO patients (firstName, lastName, pathology, notes, dateOfBirth)
     VALUES (?, ?, ?, ?, ?)`
  );
  const info = stmt.run(
    data.firstName,
    data.lastName,
    data.pathology ?? null,
    data.notes ?? null,
    data.dateOfBirth ?? null
  );
  const patient = db.prepare("SELECT * FROM patients WHERE id = ?").get(info.lastInsertRowid) as unknown;
  return res.status(201).json(patient);
});

app.get("/patients", (_req, res) => {
  const patients = db.prepare("SELECT * FROM patients ORDER BY lastName, firstName").all();
  res.json(patients);
});

app.get("/patients/search", (req, res) => {
  const q = ((req.query.q as string) || "").trim();
  if (!q) return res.json([]);
  const like = `%${q}%`;
  const rows = db
    .prepare(
      "SELECT * FROM patients WHERE lastName LIKE ? OR firstName LIKE ? ORDER BY lastName, firstName LIMIT 20"
    )
    .all(like, like);
  res.json(rows);
});

// Practitioners
app.post("/practitioners", (req, res) => {
  const parsed = practitionerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const data: PractitionerInput = parsed.data;
  const stmt = db.prepare(
    `INSERT INTO practitioners (fullName, specialty) VALUES (?, ?)`
  );
  const info = stmt.run(data.fullName, data.specialty ?? null);
  const practitioner = db
    .prepare("SELECT * FROM practitioners WHERE id = ?")
    .get(info.lastInsertRowid);
  res.status(201).json(practitioner);
});

app.get("/practitioners", (_req, res) => {
  const practitioners = db
    .prepare("SELECT * FROM practitioners ORDER BY fullName")
    .all();
  res.json(practitioners);
});

// Resources (rooms/equipment)
app.post("/resources", (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    type: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const info = db
    .prepare("INSERT INTO resources (name, type) VALUES (?, ?)")
    .run(parsed.data.name, parsed.data.type);
  const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(resource);
});

app.get("/resources", (_req, res) => {
  const resources = db.prepare("SELECT * FROM resources ORDER BY name").all();
  res.json(resources);
});

// Availabilities
app.post("/availabilities", (req, res) => {
  const parsed = availabilitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const data: AvailabilityInput = parsed.data;
  const stmt = db.prepare(
    `INSERT INTO availabilities (practitionerId, start, end) VALUES (?, ?, ?)`
  );
  const info = stmt.run(data.practitionerId, data.start, data.end);
  const availability = db
    .prepare("SELECT * FROM availabilities WHERE id = ?")
    .get(info.lastInsertRowid);
  res.status(201).json(availability);
});

app.get("/availabilities", (req, res) => {
  const practitionerId = req.query.practitionerId
    ? Number(req.query.practitionerId)
    : undefined;
  let rows;
  if (practitionerId) {
    rows = db
      .prepare(
        "SELECT * FROM availabilities WHERE practitionerId = ? ORDER BY start"
      )
      .all(practitionerId);
  } else {
    rows = db.prepare("SELECT * FROM availabilities ORDER BY start").all();
  }
  res.json(rows);
});

// Appointments
function hasConflict(input: AppointmentInput): boolean {
  const conflict = db
    .prepare(
      `SELECT 1 FROM appointments 
       WHERE status != 'cancelled'
         AND start < @end 
         AND end > @start
         AND (practitionerId = @practitionerId OR (resourceId IS NOT NULL AND resourceId = @resourceId))
       LIMIT 1`
    )
    .get({
      start: input.start,
      end: input.end,
      practitionerId: input.practitionerId,
      resourceId: input.resourceId ?? null,
    });
  return !!conflict;
}

app.post("/appointments", (req, res) => {
  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const data: AppointmentInput = parsed.data;
  if (hasConflict(data)) {
    return res.status(409).json({ error: "Conflit: doublon/praticien ou ressource occupée" });
  }
  const stmt = db.prepare(
    `INSERT INTO appointments (patientId, practitionerId, resourceId, pathology, start, end, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const info = stmt.run(
    data.patientId,
    data.practitionerId,
    data.resourceId ?? null,
    data.pathology ?? null,
    data.start,
    data.end,
    data.notes ?? null
  );
  const appointment = db
    .prepare("SELECT * FROM appointments WHERE id = ?")
    .get(info.lastInsertRowid);
  notify(
    `RDV confirmé patient #${data.patientId} avec praticien #${data.practitionerId}`,
    "booking"
  );
  res.status(201).json(appointment);
});

app.get("/appointments", (req, res) => {
  const practitionerId = req.query.practitionerId
    ? Number(req.query.practitionerId)
    : undefined;
  const patientId = req.query.patientId ? Number(req.query.patientId) : undefined;
  const clauses = [];
  const params: (string | number)[] = [];
  if (practitionerId) {
    clauses.push("practitionerId = ?");
    params.push(practitionerId);
  }
  if (patientId) {
    clauses.push("patientId = ?");
    params.push(patientId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(`SELECT * FROM appointments ${where} ORDER BY start`)
    .all(...params);
  res.json(rows);
});

// Matching
app.post("/match", (req, res) => {
  const parsed = matchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);
  const data: MatchRequest = parsed.data;
  const results = computeMatches(data);
  res.json(results);
});

// Notifications & audit
app.get("/notifications", (_req, res) => {
  const rows = db
    .prepare(
      "SELECT * FROM notifications ORDER BY createdAt DESC, id DESC LIMIT 50"
    )
    .all();
  res.json(rows);
});

app.post("/notifications/:id/read", (req, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.get("/audit", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM audit_logs ORDER BY createdAt DESC LIMIT 50")
    .all();
  res.json(rows);
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`SynCare backend listening on http://localhost:${port}`);
});

