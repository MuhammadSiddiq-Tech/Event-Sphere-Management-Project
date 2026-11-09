/**
 * @fileoverview Calendar (.ics) export utility.
 * T-6.10. (P2) "Add to calendar" .ics export.
 * Generates an iCalendar (.ics) format file for sessions and triggers client download.
 */

/**
 * Format a Date object to iCalendar UTC timestamp format (YYYYMMDDTHHMMSSZ).
 */
function toIcsTimestamp(dateOrIso) {
  const d = new Date(dateOrIso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape text for iCalendar fields.
 */
function escapeIcsText(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate iCalendar format string for a session.
 * @param {Object} session
 * @param {Object} [expo]
 * @returns {string} .ics content
 */
export function generateIcsForSession(session, expo) {
  const now = new Date();
  const dtStamp = toIcsTimestamp(now);
  const dtStart = toIcsTimestamp(session.startTime);
  const dtEnd = toIcsTimestamp(session.endTime);
  const uid = `session-${session.id || session._id}-${Date.now()}@eventsphere.com`;
  const summary = escapeIcsText(session.title);

  let desc = session.description ? `${session.description}\n\n` : '';
  if (session.speakers?.length) {
    desc += `Speakers: ${session.speakers.map((s) => s.name).join(', ')}\n`;
  }
  if (expo?.title) {
    desc += `Event: ${expo.title}\n`;
  }
  const description = escapeIcsText(desc);

  const location = escapeIcsText(
    [session.room, expo?.venue?.name, expo?.venue?.city].filter(Boolean).join(', ')
  );

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventSphere//Schedule Session//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/**
 * Trigger client-side download of a generated .ics string.
 * @param {string} filename
 * @param {string} icsContent
 */
export function downloadIcsFile(filename, icsContent) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
