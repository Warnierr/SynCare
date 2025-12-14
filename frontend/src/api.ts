const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? res.statusText);
  }
  return res.json();
}

export interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  pathology?: string;
  notes?: string;
  dateOfBirth?: string;
}

export interface Practitioner {
  id: number;
  fullName: string;
  specialty?: string;
}

export interface Availability {
  id: number;
  practitionerId: number;
  start: string;
  end: string;
}

export interface Resource {
  id: number;
  name: string;
  type?: string;
}

export interface Appointment {
  id: number;
  patientId: number;
  practitionerId: number;
  resourceId?: number;
  pathology?: string;
  start: string;
  end: string;
  status: string;
  notes?: string;
}

export interface MatchResult {
  start: string;
  end: string;
  practitionerId: number;
  resourceId?: number;
}

export interface NotificationItem {
  id: number;
  message: string;
  kind: string;
  read: number;
  createdAt: string;
}

export interface AuditEntry {
  id: number;
  method: string;
  path: string;
  createdAt: string;
}

export const api = {
  listPatients: () => request<Patient[]>("/patients"),
  searchPatients: (q: string) => request<Patient[]>(`/patients/search?q=${encodeURIComponent(q)}`),
  createPatient: (payload: Omit<Patient, "id">) =>
    request<Patient>("/patients", { method: "POST", body: JSON.stringify(payload) }),

  listPractitioners: () => request<Practitioner[]>("/practitioners"),
  createPractitioner: (payload: Omit<Practitioner, "id">) =>
    request<Practitioner>("/practitioners", { method: "POST", body: JSON.stringify(payload) }),

  listAvailabilities: (practitionerId?: number) =>
    request<Availability[]>(`/availabilities${practitionerId ? `?practitionerId=${practitionerId}` : ""}`),
  createAvailability: (payload: { practitionerId: number; start: string; end: string }) =>
    request<Availability>("/availabilities", { method: "POST", body: JSON.stringify(payload) }),

  listResources: () => request<Resource[]>("/resources"),
  createResource: (payload: { name: string; type?: string }) =>
    request<Resource>("/resources", { method: "POST", body: JSON.stringify(payload) }),

  listAppointments: (practitionerId?: number) =>
    request<Appointment[]>(`/appointments${practitionerId ? `?practitionerId=${practitionerId}` : ""}`),
  createAppointment: (payload: {
    patientId: number;
    practitionerId: number;
    resourceId?: number;
    pathology?: string;
    start: string;
    end: string;
    notes?: string;
  }) => request<Appointment>("/appointments", { method: "POST", body: JSON.stringify(payload) }),

  matchSlots: (payload: {
    patientId: number;
    practitionerId: number;
    durationMinutes: number;
    windowStart?: string;
    windowEnd?: string;
    limit?: number;
  }) => request<MatchResult[]>("/match", { method: "POST", body: JSON.stringify(payload) }),

  listNotifications: () => request<NotificationItem[]>("/notifications"),
  markNotificationRead: (id: number) =>
    request<{ ok: boolean }>(`/notifications/${id}/read`, { method: "POST" }),

  listAudit: () => request<AuditEntry[]>("/audit"),
};

