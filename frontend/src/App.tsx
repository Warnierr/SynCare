import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type {
  Appointment,
  MatchResult,
  NotificationItem,
  Patient,
  Practitioner,
} from "./api";
import "./App.css";

// ============================================
// Types
// ============================================
type View = "dashboard" | "patients" | "practitioners" | "agenda" | "notifications";

interface Toast {
  id: number;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
}

// ============================================
// Helpers
// ============================================
const toIso = (value: string) => (value ? new Date(value).toISOString() : undefined);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "short" });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const formatDateTime = (iso: string) => `${formatDate(iso)} ${formatTime(iso)}`;

const getWeekDays = (baseDate: Date) => {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8h to 19h

// ============================================
// App Component
// ============================================
function App() {
  const [view, setView] = useState<View>("dashboard");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Calendar
  const [calendarDate, setCalendarDate] = useState(new Date());
  const weekDays = useMemo(() => getWeekDays(calendarDate), [calendarDate]);

  // Forms
  const [patientForm, setPatientForm] = useState({
    firstName: "",
    lastName: "",
    pathology: "",
    notes: "",
  });

  const [practitionerForm, setPractitionerForm] = useState({
    fullName: "",
    specialty: "",
  });

  const [availabilityForm, setAvailabilityForm] = useState({
    practitionerId: "",
    start: "",
    end: "",
  });

  const [appointmentForm, setAppointmentForm] = useState({
    patientId: "",
    practitionerId: "",
    start: "",
    end: "",
    pathology: "",
    notes: "",
  });

  const [matchForm, setMatchForm] = useState({
    patientId: "",
    practitionerId: "",
    durationMinutes: 30,
  });

  // ============================================
  // Toast system
  // ============================================
  const addToast = useCallback((type: Toast["type"], title: string, message?: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ============================================
  // Data loading
  // ============================================
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pats, practs, appts, notifs] = await Promise.all([
        api.listPatients(),
        api.listPractitioners(),
        api.listAppointments(),
        api.listNotifications(),
      ]);
      setPatients(pats);
      setPractitioners(practs);
      setAppointments(appts);
      setNotifications(notifs);
    } catch (e) {
      addToast("error", "Erreur de chargement", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // Search
  // ============================================
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await api.searchPatients(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // ============================================
  // Actions
  // ============================================
  const submitPatient = async () => {
    try {
      const created = await api.createPatient({ ...patientForm, dateOfBirth: undefined });
      setPatients((p) => [...p, created]);
      setPatientForm({ firstName: "", lastName: "", pathology: "", notes: "" });
      addToast("success", "Patient enregistré", `${created.lastName} ${created.firstName}`);
    } catch (e) {
      addToast("error", "Erreur", (e as Error).message);
    }
  };

  const submitPractitioner = async () => {
    try {
      const created = await api.createPractitioner(practitionerForm);
      setPractitioners((p) => [...p, created]);
      setPractitionerForm({ fullName: "", specialty: "" });
      addToast("success", "Praticien ajouté", created.fullName);
    } catch (e) {
      addToast("error", "Erreur", (e as Error).message);
    }
  };

  const submitAvailability = async () => {
    if (!availabilityForm.practitionerId) {
      addToast("warning", "Praticien requis");
      return;
    }
    try {
      await api.createAvailability({
        practitionerId: Number(availabilityForm.practitionerId),
        start: toIso(availabilityForm.start)!,
        end: toIso(availabilityForm.end)!,
      });
      setAvailabilityForm({ practitionerId: "", start: "", end: "" });
      addToast("success", "Disponibilité enregistrée");
    } catch (e) {
      addToast("error", "Erreur", (e as Error).message);
    }
  };

  const submitAppointment = async () => {
    if (!appointmentForm.patientId || !appointmentForm.practitionerId) {
      addToast("warning", "Patient et praticien requis");
      return;
    }
    try {
      const created = await api.createAppointment({
        patientId: Number(appointmentForm.patientId),
        practitionerId: Number(appointmentForm.practitionerId),
        pathology: appointmentForm.pathology || undefined,
        start: toIso(appointmentForm.start)!,
        end: toIso(appointmentForm.end)!,
        notes: appointmentForm.notes || undefined,
      });
      setAppointments((p) => [...p, created]);
      setAppointmentForm({
        patientId: "",
        practitionerId: "",
        start: "",
        end: "",
        pathology: "",
        notes: "",
      });
      addToast("success", "RDV confirmé");
      const notifs = await api.listNotifications();
      setNotifications(notifs);
    } catch (e) {
      addToast("error", "Conflit détecté", (e as Error).message);
    }
  };

  const submitMatch = async () => {
    if (!matchForm.patientId || !matchForm.practitionerId) {
      addToast("warning", "Patient et praticien requis");
      return;
    }
    try {
      const results = await api.matchSlots({
        patientId: Number(matchForm.patientId),
        practitionerId: Number(matchForm.practitionerId),
        durationMinutes: matchForm.durationMinutes,
        limit: 10,
      });
      setMatchResults(results);
      if (results.length === 0) {
        addToast("info", "Aucun créneau disponible");
      } else {
        addToast("success", `${results.length} créneaux trouvés`);
      }
    } catch (e) {
      addToast("error", "Erreur matching", (e as Error).message);
    }
  };

  const markNotificationRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      const notifs = await api.listNotifications();
      setNotifications(notifs);
    } catch (e) {
      addToast("error", "Erreur", (e as Error).message);
    }
  };

  // ============================================
  // Stats
  // ============================================
  const todayStr = new Date().toDateString();
  const todayAppointments = appointments.filter(
    (a) => new Date(a.start).toDateString() === todayStr
  );
  const unreadNotifications = notifications.filter((n) => !n.read);

  // ============================================
  // Calendar events
  // ============================================
  const getEventsForDay = (day: Date) => {
    const dayStr = day.toDateString();
    return appointments.filter((a) => new Date(a.start).toDateString() === dayStr);
  };

  const getEventStyle = (appt: Appointment) => {
    const start = new Date(appt.start);
    const end = new Date(appt.end);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = (startHour - 8) * 60;
    const height = (endHour - startHour) * 60;
    return { top: `${top}px`, height: `${Math.max(height, 24)}px` };
  };

  const getPractitionerColor = (id: number) => {
    const colors = ["practitioner-1", "practitioner-2", "practitioner-3"];
    return colors[id % colors.length];
  };

  // ============================================
  // Render
  // ============================================
  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">S</div>
            <span className="sidebar-logo-text">SynCare</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${view === "dashboard" ? "active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            <span className="nav-icon">📊</span>
            Dashboard
          </button>
          <button
            className={`nav-item ${view === "patients" ? "active" : ""}`}
            onClick={() => setView("patients")}
          >
            <span className="nav-icon">👥</span>
            Patients
          </button>
          <button
            className={`nav-item ${view === "practitioners" ? "active" : ""}`}
            onClick={() => setView("practitioners")}
          >
            <span className="nav-icon">🩺</span>
            Praticiens
          </button>
          <button
            className={`nav-item ${view === "agenda" ? "active" : ""}`}
            onClick={() => setView("agenda")}
          >
            <span className="nav-icon">📅</span>
            Agenda
          </button>
          <button
            className={`nav-item ${view === "notifications" ? "active" : ""}`}
            onClick={() => setView("notifications")}
          >
            <span className="nav-icon">🔔</span>
            Notifications
            {unreadNotifications.length > 0 && (
              <span className="badge badge-danger" style={{ marginLeft: "auto" }}>
                {unreadNotifications.length}
              </span>
            )}
          </button>
        </nav>
        <div className="sidebar-footer">SynCare v1.0 — Agenda intelligent</div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Header */}
        <header className="header">
          <h1 className="header-title">
            {view === "dashboard" && "Dashboard"}
            {view === "patients" && "Patients"}
            {view === "practitioners" && "Praticiens"}
            {view === "agenda" && "Agenda"}
            {view === "notifications" && "Notifications"}
          </h1>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Rechercher un patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            />
            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    className="search-result-item"
                    onClick={() => {
                      setSearchQuery(`${p.lastName} ${p.firstName}`);
                      setShowSearchResults(false);
                      setView("patients");
                    }}
                  >
                    <strong>
                      {p.lastName} {p.firstName}
                    </strong>
                    {p.pathology && (
                      <span style={{ marginLeft: 8, color: "var(--text-muted)" }}>
                        {p.pathology}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => setView("agenda")}>
              + Nouveau RDV
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="page-content">
          {loading ? (
            <div className="grid-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="stat-card">
                  <div className="skeleton skeleton-avatar"></div>
                  <div className="stat-content">
                    <div className="skeleton skeleton-title"></div>
                    <div className="skeleton skeleton-text" style={{ width: "40%" }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Dashboard View */}
              {view === "dashboard" && (
                <>
                  <div className="grid-4">
                    <div className="stat-card" style={{ animationDelay: "0ms" }}>
                      <div className="stat-icon green">📅</div>
                      <div className="stat-content">
                        <div className="stat-value">{todayAppointments.length}</div>
                        <div className="stat-label">RDV aujourd'hui</div>
                      </div>
                    </div>
                    <div className="stat-card" style={{ animationDelay: "50ms" }}>
                      <div className="stat-icon blue">👥</div>
                      <div className="stat-content">
                        <div className="stat-value">{patients.length}</div>
                        <div className="stat-label">Patients</div>
                      </div>
                    </div>
                    <div className="stat-card" style={{ animationDelay: "100ms" }}>
                      <div className="stat-icon amber">🩺</div>
                      <div className="stat-content">
                        <div className="stat-value">{practitioners.length}</div>
                        <div className="stat-label">Praticiens</div>
                      </div>
                    </div>
                    <div className="stat-card" style={{ animationDelay: "150ms" }}>
                      <div className="stat-icon red">🔔</div>
                      <div className="stat-content">
                        <div className="stat-value">{unreadNotifications.length}</div>
                        <div className="stat-label">Notifications</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid-2" style={{ marginTop: 24 }}>
                    {/* Quick add patient */}
                    <div className="card">
                      <div className="card-header">
                        <h3 className="card-title">
                          <span className="card-title-icon">👤</span>
                          Ajouter un patient
                        </h3>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Nom</label>
                          <input
                            type="text"
                            className="form-input"
                            value={patientForm.lastName}
                            onChange={(e) =>
                              setPatientForm({ ...patientForm, lastName: e.target.value })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Prénom</label>
                          <input
                            type="text"
                            className="form-input"
                            value={patientForm.firstName}
                            onChange={(e) =>
                              setPatientForm({ ...patientForm, firstName: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginTop: 12 }}>
                        <label className="form-label">Pathologie</label>
                        <input
                          type="text"
                          className="form-input"
                          value={patientForm.pathology}
                          onChange={(e) =>
                            setPatientForm({ ...patientForm, pathology: e.target.value })
                          }
                        />
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{ marginTop: 16 }}
                        onClick={submitPatient}
                      >
                        Enregistrer
                      </button>
                    </div>

                    {/* Matching rapide */}
                    <div className="card">
                      <div className="card-header">
                        <h3 className="card-title">
                          <span className="card-title-icon">⚡</span>
                          Matching rapide
                        </h3>
                        <button className="btn btn-secondary" onClick={submitMatch}>
                          Calculer
                        </button>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Patient</label>
                          <select
                            className="form-select"
                            value={matchForm.patientId}
                            onChange={(e) =>
                              setMatchForm({ ...matchForm, patientId: e.target.value })
                            }
                          >
                            <option value="">Choisir</option>
                            {patients.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.lastName} {p.firstName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Praticien</label>
                          <select
                            className="form-select"
                            value={matchForm.practitionerId}
                            onChange={(e) =>
                              setMatchForm({ ...matchForm, practitionerId: e.target.value })
                            }
                          >
                            <option value="">Choisir</option>
                            {practitioners.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.fullName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Durée (min)</label>
                          <input
                            type="number"
                            className="form-input"
                            min={5}
                            value={matchForm.durationMinutes}
                            onChange={(e) =>
                              setMatchForm({
                                ...matchForm,
                                durationMinutes: Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                      {matchResults.length > 0 && (
                        <div className="match-grid" style={{ marginTop: 16 }}>
                          {matchResults.slice(0, 6).map((slot, idx) => (
                            <div
                              key={idx}
                              className="match-slot"
                              onClick={() => {
                                // Pré-remplir le formulaire RDV (format datetime-local)
                                const formatForInput = (iso: string) => {
                                  const d = new Date(iso);
                                  return d.toISOString().slice(0, 16);
                                };
                                setAppointmentForm({
                                  patientId: matchForm.patientId,
                                  practitionerId: matchForm.practitionerId,
                                  start: formatForInput(slot.start),
                                  end: formatForInput(slot.end),
                                  pathology: "",
                                  notes: "",
                                });
                                // Aller à l'Agenda
                                setView("agenda");
                                addToast("info", "Créneau sélectionné", "Confirmez le RDV dans l'agenda");
                              }}
                            >
                              <div className="match-slot-time">
                                {formatDateTime(slot.start)}
                              </div>
                              <div className="match-slot-info">
                                → {formatTime(slot.end)} · Cliquer pour réserver
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Prochains RDV */}
                  <div className="card" style={{ marginTop: 24 }}>
                    <div className="card-header">
                      <h3 className="card-title">
                        <span className="card-title-icon">📅</span>
                        Prochains rendez-vous
                      </h3>
                    </div>
                    <div className="mini-list">
                      {appointments
                        .filter((a) => new Date(a.start) >= new Date())
                        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                        .slice(0, 5)
                        .map((a) => {
                          const patient = patients.find((p) => p.id === a.patientId);
                          const pract = practitioners.find((p) => p.id === a.practitionerId);
                          return (
                            <div key={a.id} className="mini-list-item">
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>
                                  {patient ? `${patient.lastName} ${patient.firstName}` : "Patient"}
                                </div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                  avec {pract?.fullName || "Praticien"} · {a.pathology || "Consultation"}
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontWeight: 500, color: "var(--accent-primary)" }}>
                                  {formatDate(a.start)}
                                </div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                  {formatTime(a.start)} - {formatTime(a.end)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      {appointments.filter((a) => new Date(a.start) >= new Date()).length === 0 && (
                        <div className="empty-state">
                          <div className="empty-state-text">Aucun RDV à venir</div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Patients View */}
              {view === "patients" && (
                <div className="grid-auto">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Nouveau patient</h3>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Nom</label>
                        <input
                          type="text"
                          className="form-input"
                          value={patientForm.lastName}
                          onChange={(e) =>
                            setPatientForm({ ...patientForm, lastName: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Prénom</label>
                        <input
                          type="text"
                          className="form-input"
                          value={patientForm.firstName}
                          onChange={(e) =>
                            setPatientForm({ ...patientForm, firstName: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginTop: 12 }}>
                      <label className="form-label">Pathologie</label>
                      <input
                        type="text"
                        className="form-input"
                        value={patientForm.pathology}
                        onChange={(e) =>
                          setPatientForm({ ...patientForm, pathology: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group" style={{ marginTop: 12 }}>
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-textarea"
                        value={patientForm.notes}
                        onChange={(e) =>
                          setPatientForm({ ...patientForm, notes: e.target.value })
                        }
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: 16 }}
                      onClick={submitPatient}
                    >
                      Enregistrer
                    </button>
                  </div>

                  <div className="card span-2">
                    <div className="card-header">
                      <h3 className="card-title">Liste des patients</h3>
                      <span className="badge badge-info">{patients.length}</span>
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Prénom</th>
                          <th>Pathologie</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.map((p) => (
                          <tr key={p.id}>
                            <td>{p.lastName}</td>
                            <td>{p.firstName}</td>
                            <td>
                              {p.pathology ? (
                                <span className="badge badge-warning">{p.pathology}</span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td style={{ color: "var(--text-muted)" }}>{p.notes || "—"}</td>
                          </tr>
                        ))}
                        {patients.length === 0 && (
                          <tr>
                            <td colSpan={4}>
                              <div className="empty-state">
                                <div className="empty-state-icon">👥</div>
                                <div className="empty-state-title">Aucun patient</div>
                                <div className="empty-state-text">
                                  Ajoutez votre premier patient
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Practitioners View */}
              {view === "practitioners" && (
                <div className="grid-auto">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Nouveau praticien</h3>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nom complet</label>
                      <input
                        type="text"
                        className="form-input"
                        value={practitionerForm.fullName}
                        onChange={(e) =>
                          setPractitionerForm({ ...practitionerForm, fullName: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group" style={{ marginTop: 12 }}>
                      <label className="form-label">Spécialité</label>
                      <input
                        type="text"
                        className="form-input"
                        value={practitionerForm.specialty}
                        onChange={(e) =>
                          setPractitionerForm({ ...practitionerForm, specialty: e.target.value })
                        }
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: 16 }}
                      onClick={submitPractitioner}
                    >
                      Ajouter
                    </button>

                    <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)", margin: "24px 0" }} />

                    <div className="card-header">
                      <h3 className="card-title">Disponibilités</h3>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Praticien</label>
                      <select
                        className="form-select"
                        value={availabilityForm.practitionerId}
                        onChange={(e) =>
                          setAvailabilityForm({ ...availabilityForm, practitionerId: e.target.value })
                        }
                      >
                        <option value="">Choisir</option>
                        {practitioners.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row" style={{ marginTop: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Début</label>
                        <input
                          type="datetime-local"
                          className="form-input"
                          value={availabilityForm.start}
                          onChange={(e) =>
                            setAvailabilityForm({ ...availabilityForm, start: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Fin</label>
                        <input
                          type="datetime-local"
                          className="form-input"
                          value={availabilityForm.end}
                          onChange={(e) =>
                            setAvailabilityForm({ ...availabilityForm, end: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ marginTop: 16 }}
                      onClick={submitAvailability}
                    >
                      Enregistrer disponibilité
                    </button>
                  </div>

                  <div className="card span-2">
                    <div className="card-header">
                      <h3 className="card-title">Praticiens</h3>
                      <span className="badge badge-info">{practitioners.length}</span>
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Spécialité</th>
                        </tr>
                      </thead>
                      <tbody>
                        {practitioners.map((p) => (
                          <tr key={p.id}>
                            <td>{p.fullName}</td>
                            <td>
                              {p.specialty ? (
                                <span className="badge badge-success">{p.specialty}</span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                        {practitioners.length === 0 && (
                          <tr>
                            <td colSpan={2}>
                              <div className="empty-state">
                                <div className="empty-state-icon">🩺</div>
                                <div className="empty-state-title">Aucun praticien</div>
                                <div className="empty-state-text">
                                  Ajoutez votre premier praticien
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Agenda View */}
              {view === "agenda" && (
                <>
                  <div className="grid-auto" style={{ marginBottom: 24 }}>
                    <div className="card span-full">
                      <div className="card-header">
                        <h3 className="card-title">Nouveau RDV</h3>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Patient</label>
                          <select
                            className="form-select"
                            value={appointmentForm.patientId}
                            onChange={(e) =>
                              setAppointmentForm({ ...appointmentForm, patientId: e.target.value })
                            }
                          >
                            <option value="">Choisir</option>
                            {patients.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.lastName} {p.firstName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Praticien</label>
                          <select
                            className="form-select"
                            value={appointmentForm.practitionerId}
                            onChange={(e) =>
                              setAppointmentForm({
                                ...appointmentForm,
                                practitionerId: e.target.value,
                              })
                            }
                          >
                            <option value="">Choisir</option>
                            {practitioners.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.fullName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Début</label>
                          <input
                            type="datetime-local"
                            className="form-input"
                            value={appointmentForm.start}
                            onChange={(e) =>
                              setAppointmentForm({ ...appointmentForm, start: e.target.value })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Fin</label>
                          <input
                            type="datetime-local"
                            className="form-input"
                            value={appointmentForm.end}
                            onChange={(e) =>
                              setAppointmentForm({ ...appointmentForm, end: e.target.value })
                            }
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Pathologie</label>
                          <input
                            type="text"
                            className="form-input"
                            value={appointmentForm.pathology}
                            onChange={(e) =>
                              setAppointmentForm({ ...appointmentForm, pathology: e.target.value })
                            }
                          />
                        </div>
                        <div className="form-group" style={{ alignSelf: "flex-end" }}>
                          <button className="btn btn-primary" onClick={submitAppointment}>
                            Créer RDV
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Calendar */}
                  <div className="calendar-container">
                    <div className="calendar-header">
                      <div className="calendar-nav">
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => {
                            const d = new Date(calendarDate);
                            d.setDate(d.getDate() - 7);
                            setCalendarDate(d);
                          }}
                        >
                          ←
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => {
                            const d = new Date(calendarDate);
                            d.setDate(d.getDate() + 7);
                            setCalendarDate(d);
                          }}
                        >
                          →
                        </button>
                      </div>
                      <h3 className="calendar-title">
                        Semaine du {formatDate(weekDays[0].toISOString())}
                      </h3>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setCalendarDate(new Date())}
                      >
                        Aujourd'hui
                      </button>
                    </div>
                    <div className="calendar-grid">
                      {/* Header row */}
                      <div className="calendar-day-header"></div>
                      {weekDays.map((day, idx) => {
                        const isToday = day.toDateString() === todayStr;
                        return (
                          <div
                            key={idx}
                            className={`calendar-day-header ${isToday ? "today" : ""}`}
                          >
                            {day.toLocaleDateString("fr-FR", { weekday: "short" }).toUpperCase()}
                            <br />
                            {day.getDate()}
                          </div>
                        );
                      })}

                      {/* Time slots */}
                      {HOURS.map((hour) => (
                        <div key={`row-${hour}`} style={{ display: "contents" }}>
                          <div className="calendar-time-slot">
                            {hour}:00
                          </div>
                          {weekDays.map((day, dayIdx) => {
                            const events = getEventsForDay(day);
                            return (
                              <div key={`${hour}-${dayIdx}`} className="calendar-day-column">
                                <div className="calendar-hour-slot">
                                  {hour === HOURS[0] &&
                                    events.map((appt) => {
                                      const patient = patients.find((p) => p.id === appt.patientId);
                                      return (
                                        <div
                                          key={appt.id}
                                          className={`calendar-event ${getPractitionerColor(appt.practitionerId)}`}
                                          style={getEventStyle(appt)}
                                        >
                                          <div className="calendar-event-title">
                                            {patient
                                              ? `${patient.lastName} ${patient.firstName}`
                                              : `Patient #${appt.patientId}`}
                                          </div>
                                          <div className="calendar-event-time">
                                            {formatTime(appt.start)} - {formatTime(appt.end)}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Notifications View */}
              {view === "notifications" && (
                <div className="grid-2">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Notifications</h3>
                      <span className="badge badge-info">{notifications.length}</span>
                    </div>
                    <div className="mini-list">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`notif-item ${!n.read ? "unread" : ""}`}
                        >
                          <div className="notif-item-message">{n.message}</div>
                          <div className="notif-item-meta">
                            <span className="badge badge-success">{n.kind}</span>
                            <span>{formatDateTime(n.createdAt)}</span>
                            {!n.read && (
                              <button
                                className="btn btn-ghost"
                                onClick={() => markNotificationRead(n.id)}
                                style={{ marginLeft: "auto" }}
                              >
                                Marquer lu
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <div className="empty-state">
                          <div className="empty-state-icon">🔔</div>
                          <div className="empty-state-title">Aucune notification</div>
                        </div>
                      )}
                    </div>
      </div>

      <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Derniers patients ajoutés</h3>
                      <button className="btn btn-ghost" onClick={loadData}>
                        Rafraîchir
                      </button>
                    </div>
                    <div className="mini-list">
                      {patients.slice(-8).reverse().map((p) => (
                        <div key={p.id} className="mini-list-item">
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>
                              {p.lastName} {p.firstName}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                              {p.pathology || "Aucune pathologie renseignée"}
                            </div>
                          </div>
                        </div>
                      ))}
                      {patients.length === 0 && (
                        <div className="empty-state">
                          <div className="empty-state-text">Aucun patient</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <div className="toast-icon">
              {toast.type === "success" && "✓"}
              {toast.type === "error" && "✕"}
              {toast.type === "warning" && "⚠"}
              {toast.type === "info" && "ℹ"}
            </div>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              {toast.message && <div className="toast-message">{toast.message}</div>}
            </div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              ✕
        </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
