import { addMinutes, isBefore, max, min } from "date-fns";
import db from "./db";
import { MatchRequest, SlotCandidate } from "./types";

interface Interval {
  start: Date;
  end: Date;
}

const toDate = (iso: string) => new Date(iso);

function intersect(a: Interval, b: Interval): Interval | null {
  const start = max([a.start, b.start]);
  const end = min([a.end, b.end]);
  if (!isBefore(start, end)) return null;
  return { start, end };
}

function subtractBusy(availability: Interval, busies: Interval[]): Interval[] {
  if (!busies.length) return [availability];
  // sort busy intervals
  const sorted = [...busies].sort((x, y) => x.start.getTime() - y.start.getTime());
  const free: Interval[] = [];
  let cursor = availability.start;

  for (const busy of sorted) {
    if (busy.end <= cursor) continue;
    const overlap = intersect(availability, busy);
    if (!overlap) continue;
    if (isBefore(cursor, overlap.start)) {
      free.push({ start: cursor, end: overlap.start });
    }
    cursor = overlap.end > cursor ? overlap.end : cursor;
    if (!isBefore(cursor, availability.end)) break;
  }

  if (isBefore(cursor, availability.end)) {
    free.push({ start: cursor, end: availability.end });
  }

  return free;
}

export function computeMatches(req: MatchRequest): SlotCandidate[] {
  const limit = req.limit ?? 5;
  const windowStart = req.windowStart ? toDate(req.windowStart) : new Date();
  const windowEnd =
    req.windowEnd ?? addMinutes(windowStart, 14 * 24 * 60).toISOString();

  const durationMinutes = req.durationMinutes;
  const practitionerId = req.practitionerId;

  const availStmt = db.prepare(
    `SELECT start, end FROM availabilities 
     WHERE practitionerId = ? AND end >= ? AND start <= ?`
  );
  const availabilityRows = availStmt.all(
    practitionerId,
    windowStart.toISOString(),
    windowEnd
  ) as { start: string; end: string }[];

  const apptStmt = db.prepare(
    `SELECT start, end, resourceId FROM appointments 
     WHERE practitionerId = ? AND end >= ? AND start <= ? AND status != 'cancelled'`
  );
  const appointmentRows = apptStmt.all(
    practitionerId,
    windowStart.toISOString(),
    windowEnd
  ) as { start: string; end: string; resourceId: number | null }[];

  const busyIntervals: Interval[] = appointmentRows.map((row) => ({
    start: toDate(row.start),
    end: toDate(row.end),
  }));

  const candidates: SlotCandidate[] = [];

  for (const avail of availabilityRows) {
    const availInterval: Interval = {
      start: toDate(avail.start),
      end: toDate(avail.end),
    };
    const freeIntervals = subtractBusy(availInterval, busyIntervals);

    for (const free of freeIntervals) {
      let cursor = free.start;
      while (isBefore(addMinutes(cursor, durationMinutes), free.end)) {
        const slotEnd = addMinutes(cursor, durationMinutes);
        if (isBefore(slotEnd, windowStart)) {
          cursor = addMinutes(cursor, durationMinutes);
          continue;
        }
        candidates.push({
          start: cursor.toISOString(),
          end: slotEnd.toISOString(),
          practitionerId,
        });
        if (candidates.length >= limit) {
          return candidates;
        }
        cursor = addMinutes(cursor, durationMinutes);
      }
    }
  }

  return candidates;
}

