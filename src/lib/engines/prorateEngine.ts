/**
 * prorateEngine — day-accurate proration for client fees and resource salaries.
 *
 * Conventions:
 *  - periodMonth is 1-12.
 *  - A "31 Dec 2026" sentinel endDate/terminatedDate is treated as null
 *    (legacy data used it to mean "open ended").
 */
import {
  getDaysInMonth,
  isSameDay,
  startOfDay,
} from "date-fns";
import type { BillingType } from "./types";

const LEGACY_SENTINEL = startOfDay(new Date(2026, 11, 31)); // 31 Dec 2026

function normaliseEnd(end: Date | null): Date | null {
  if (!end) return null;
  if (isSameDay(startOfDay(end), LEGACY_SENTINEL)) return null;
  return end;
}

/** First and last calendar day (at 00:00) of the given period. */
function periodBounds(year: number, month: number): { first: Date; last: Date; days: number } {
  const first = new Date(year, month - 1, 1);
  const days = getDaysInMonth(first);
  const last = new Date(year, month - 1, days);
  return { first, last, days };
}

/**
 * Number of days within [periodFirst, periodLast] that the entity is active,
 * given its start and (optional) end date.
 */
function activeDaysInPeriod(
  start: Date,
  end: Date | null,
  year: number,
  month: number
): { activeDays: number; daysInMonth: number } {
  const { first, last, days } = periodBounds(year, month);
  const s = startOfDay(start);
  const e = end ? startOfDay(end) : null;

  // Entirely outside the period.
  if (s > last) return { activeDays: 0, daysInMonth: days };
  if (e && e < first) return { activeDays: 0, daysInMonth: days };

  const effectiveStart = s > first ? s : first;
  const effectiveEnd = e && e < last ? e : last;

  const msPerDay = 24 * 60 * 60 * 1000;
  const activeDays =
    Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / msPerDay) + 1;

  return { activeDays: Math.max(0, activeDays), daysInMonth: days };
}

/**
 * Prorate a client's monthly fee for the given period.
 * Day-accurate proration of first/last partial months for ALL billing types —
 * a full month yields the full fee (activeDays == daysInMonth). The billingType
 * param is retained for signature stability but no longer changes proration.
 */
export function prorateClientFee(params: {
  monthlyFee: number;
  billingType: BillingType;
  startDate: Date;
  endDate: Date | null;
  periodYear: number;
  periodMonth: number;
}): number {
  const end = normaliseEnd(params.endDate);
  const { activeDays, daysInMonth } = activeDaysInPeriod(
    params.startDate,
    end,
    params.periodYear,
    params.periodMonth
  );

  if (activeDays <= 0) return 0;
  return (params.monthlyFee * activeDays) / daysInMonth;
}

/**
 * Prorate a client's monthly fee for the period, day-accurate, while honouring
 * mid-month fee revisions. Each day contributes (applicableRevision.fee /
 * daysInMonth) for every day the client is active in the period.
 *
 * Example: revisions [$200 from Jan 1, $300 from May 15], period May 2026 (31d):
 *   May 1–14  (14d) @ $200 -> 200 × 14/31 = 90.32
 *   May 15–31 (17d) @ $300 -> 300 × 17/31 = 164.52
 *   total = $254.84
 */
export function prorateClientFeeWithRevisions(params: {
  revisions: Array<{ monthlyFeeUsd: number; effectiveFrom: Date }>;
  startDate: Date;
  endDate: Date | null;
  periodYear: number;
  periodMonth: number;
  billingType: BillingType;
}): number {
  const { revisions, startDate, periodYear, periodMonth } = params;
  if (revisions.length === 0) return 0;

  const end = normaliseEnd(params.endDate);
  const { days } = periodBounds(periodYear, periodMonth);
  const sorted = [...revisions].sort(
    (a, b) => startOfDay(a.effectiveFrom).getTime() - startOfDay(b.effectiveFrom).getTime()
  );
  const start = startOfDay(startDate);
  const e = end ? startOfDay(end) : null;

  let total = 0;
  for (let d = 1; d <= days; d++) {
    const day = new Date(periodYear, periodMonth - 1, d);
    if (day < start) continue;
    if (e && day > e) continue;

    let applicable: { monthlyFeeUsd: number; effectiveFrom: Date } | null = null;
    for (const rev of sorted) {
      if (startOfDay(rev.effectiveFrom) <= day) applicable = rev;
      else break;
    }
    if (!applicable) continue;
    total += applicable.monthlyFeeUsd / days;
  }
  return total;
}

/**
 * Prorate a resource's monthly base salary for the period, day-accurate, and
 * handling mid-month salary revisions. Each revision's baseSalary is a monthly
 * figure; a day contributes (applicableRevision.baseSalary / daysInMonth).
 */
export function prorateResourceSalary(params: {
  revisions: Array<{ effectiveFrom: Date; baseSalary: number }>;
  joinedDate: Date;
  terminatedDate: Date | null;
  periodYear: number;
  periodMonth: number;
}): number {
  const { revisions, joinedDate, periodYear, periodMonth } = params;
  const termed = normaliseEnd(params.terminatedDate);
  const { first, days } = periodBounds(periodYear, periodMonth);

  if (revisions.length === 0) return 0;

  const sorted = [...revisions].sort(
    (a, b) => startOfDay(a.effectiveFrom).getTime() - startOfDay(b.effectiveFrom).getTime()
  );

  const joined = startOfDay(joinedDate);
  const term = termed ? startOfDay(termed) : null;

  let total = 0;
  for (let d = 1; d <= days; d++) {
    const day = new Date(periodYear, periodMonth - 1, d);
    // Employed on this day?
    if (day < joined) continue;
    if (term && day > term) continue;

    // Applicable revision = latest with effectiveFrom <= day.
    let applicable: { effectiveFrom: Date; baseSalary: number } | null = null;
    for (const rev of sorted) {
      if (startOfDay(rev.effectiveFrom) <= day) applicable = rev;
      else break;
    }
    if (!applicable) continue; // no revision in effect yet

    total += applicable.baseSalary / days;
  }

  // Reference `first` to keep the period anchored (avoids unused warning).
  void first;
  return total;
}
