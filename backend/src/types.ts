export type ISODateTime = string;

export interface PatientInput {
  firstName: string;
  lastName: string;
  pathology?: string;
  notes?: string;
  dateOfBirth?: string;
}

export interface PractitionerInput {
  fullName: string;
  specialty?: string;
}

export interface AvailabilityInput {
  practitionerId: number;
  start: ISODateTime;
  end: ISODateTime;
}

export interface AppointmentInput {
  patientId: number;
  practitionerId: number;
  resourceId?: number;
  pathology?: string;
  start: ISODateTime;
  end: ISODateTime;
  notes?: string;
}

export interface MatchRequest {
  patientId: number;
  practitionerId: number;
  durationMinutes: number;
  windowStart?: ISODateTime;
  windowEnd?: ISODateTime;
  limit?: number;
}

export interface SlotCandidate {
  start: ISODateTime;
  end: ISODateTime;
  practitionerId: number;
  resourceId?: number;
}

