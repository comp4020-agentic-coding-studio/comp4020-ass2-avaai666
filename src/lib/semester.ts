import type { CollectionEntry } from "astro:content";
import { getPublishedCollection } from "astro-course-university/content";

export const SEMESTER_WEEKS = Array.from({ length: 12 }, (_, i) => i + 1);

export interface SemesterData {
  sessionByWeek: Map<number, CollectionEntry<"sessions">>;
  lectureByWeek: Map<number, CollectionEntry<"lectures">>;
  assessmentsByWeek: Map<number, CollectionEntry<"assessments">[]>;
  /** A break is a fact about the bench dates, not a week number typed by
   *  hand: if the bench date of week N+1 is more than 7 days after week
   *  N's, a break falls between them. */
  breaksBefore: (week: number) => boolean;
}

export async function loadSemester(): Promise<SemesterData> {
  const sessions = await getPublishedCollection("sessions");
  const lectures = await getPublishedCollection("lectures");
  const assessments = await getPublishedCollection("assessments");

  const sessionByWeek = new Map(sessions.map((session) => [session.data.week, session]));
  const lectureByWeek = new Map(lectures.map((lecture) => [lecture.data.week, lecture]));

  const assessmentsByWeek = new Map(
    SEMESTER_WEEKS.map((week) => [
      week,
      assessments
        .filter((assessment) => assessment.data.week === week)
        .sort((a, b) => a.data.due.getTime() - b.data.due.getTime()),
    ]),
  );

  function breaksBefore(week: number): boolean {
    const previous = sessionByWeek.get(week - 1);
    const current = sessionByWeek.get(week);
    if (!previous || !current) return false;
    const gapDays = (current.data.date.getTime() - previous.data.date.getTime()) / 86_400_000;
    return gapDays > 7;
  }

  return { sessionByWeek, lectureByWeek, assessmentsByWeek, breaksBefore };
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
