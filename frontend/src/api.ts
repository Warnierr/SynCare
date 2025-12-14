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
  // Patients
  listPatients: () => request<Patient[]>("/patients"),
  searchPatients: (q: string) => request<Patient[]>(`/patients/search?q=${encodeURIComponent(q)}`),
  createPatient: (payload: Omit<Patient, "id">) =>
    request<Patient>("/patients", { method: "POST", body: JSON.stringify(payload) }),
  deletePatient: (id: number) =>
    request<{ ok: boolean }>(`/patients/${id}`, { method: "DELETE" }),

  // Practitioners
  listPractitioners: () => request<Practitioner[]>("/practitioners"),
  createPractitioner: (payload: Omit<Practitioner, "id">) =>
    request<Practitioner>("/practitioners", { method: "POST", body: JSON.stringify(payload) }),
  deletePractitioner: (id: number) =>
    request<{ ok: boolean }>(`/practitioners/${id}`, { method: "DELETE" }),

  // Availabilities
  listAvailabilities: (practitionerId?: number) =>
    request<Availability[]>(`/availabilities${practitionerId ? `?practitionerId=${practitionerId}` : ""}`),
  createAvailability: (payload: { practitionerId: number; start: string; end: string }) =>
    request<Availability>("/availabilities", { method: "POST", body: JSON.stringify(payload) }),

  // Resources
  listResources: () => request<Resource[]>("/resources"),
  createResource: (payload: { name: string; type?: string }) =>
    request<Resource>("/resources", { method: "POST", body: JSON.stringify(payload) }),

  // Appointments
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
  deleteAppointment: (id: number) =>
    request<{ ok: boolean }>(`/appointments/${id}`, { method: "DELETE" }),
  cancelAppointment: (id: number) =>
    request<{ ok: boolean }>(`/appointments/${id}/cancel`, { method: "PATCH" }),

  // Matching
  matchSlots: (payload: {
    patientId: number;
    practitionerId: number;
    durationMinutes: number;
    windowStart?: string;
    windowEnd?: string;
    limit?: number;
  }) => request<MatchResult[]>("/match", { method: "POST", body: JSON.stringify(payload) }),

  // Notifications
  listNotifications: () => request<NotificationItem[]>("/notifications"),
  markNotificationRead: (id: number) =>
    request<{ ok: boolean }>(`/notifications/${id}/read`, { method: "POST" }),

  // Audit
  listAudit: () => request<AuditEntry[]>("/audit"),
};

