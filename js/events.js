// js/events.js
import { SANITY_PROJECT_ID, SANITY_DATASET, SANITY_PUBLIC_TOKEN } from './config.js';

export function normaliseWeek(events, now = new Date()) {
  // All comparisons use Stockholm date/time strings to avoid browser-timezone issues.
  // Intl.DateTimeFormat with timeZone:'Europe/Stockholm' is available in all modern browsers and Node 18.
  const tz = 'Europe/Stockholm';
  const fmtDate = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const fmtTime = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);

  // Build Monday–Sunday date strings for the ISO week containing `now` (Stockholm)
  const [y, m, d] = fmtDate.split('-').map(Number);
  const todayLocal = new Date(y, m - 1, d);          // local Date purely for getDay()
  const day = todayLocal.getDay();                    // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monLocal = new Date(y, m - 1, d + diffToMon);
  const sunLocal = new Date(y, m - 1, d + diffToMon + 6);
  const pad = n => String(n).padStart(2, '0');
  const toDateStr = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const weekStartStr = toDateStr(monLocal);           // e.g. '2026-03-23'
  const weekEndStr   = toDateStr(sunLocal);           // e.g. '2026-03-29'
  const nowStr = fmtDate + 'T' + fmtTime;            // e.g. '2026-03-25T14:30' (Stockholm)

  return events.filter(e => {
    // Must be within the ISO week (string comparison is safe for YYYY-MM-DD)
    if (e.date < weekStartStr || e.date > weekEndStr) return false;
    // Hide events whose Stockholm start time has already passed
    const eventTime = e.time ?? '12:00';
    const eventStartStr = e.date + 'T' + eventTime;  // e.g. '2026-03-25T18:00'
    return eventStartStr >= nowStr;
  });
}

export function deduplicateEvents(events) {
  const seen = new Set();
  return events.filter(e => {
    const key = `${e.title.toLowerCase().trim()}|${e.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sortEvents(events) {
  return [...events].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    const dateA = new Date(`${a.date}T${a.time || '12:00'}:00`);
    const dateB = new Date(`${b.date}T${b.time || '12:00'}:00`);
    return dateA - dateB;
  });
}

export async function fetchAllEvents(now = new Date()) {
  const [apiEvents, sanityEvents] = await Promise.allSettled([
    fetchApiEvents(),
    fetchSanityEvents(),
  ]);

  // Throw only when both sources actually failed — empty results are valid
  if (apiEvents.status === 'rejected' && sanityEvents.status === 'rejected') {
    throw new Error('All event sources failed');
  }

  const api = apiEvents.status === 'fulfilled' ? apiEvents.value : [];
  const sanity = sanityEvents.status === 'fulfilled' ? sanityEvents.value : [];

  const merged = deduplicateEvents([...sanity, ...api]);
  const weekEvents = normaliseWeek(merged, now);

  // Spec: if Sanity fails, promote the first chronological API event to featured
  const sanityFailed = sanityEvents.status === 'rejected';
  const hasFeatured = weekEvents.some(e => e.featured);
  if (sanityFailed && !hasFeatured && weekEvents.length > 0) {
    weekEvents[0] = { ...weekEvents[0], featured: true };
  }

  return sortEvents(weekEvents);
}

async function fetchApiEvents() {
  const res = await fetch('/api/events');
  if (!res.ok) throw new Error(`/api/events ${res.status}`);
  return res.json();
}

async function fetchSanityEvents() {
  const query = encodeURIComponent(
    `*[_type == "event" && status == "published" && defined(date)]{
      _id, title, description, category, date, time, address, featured,
      "imageUrl": image.asset->url, badges
    }`
  );
  const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${SANITY_DATASET}?query=${query}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SANITY_PUBLIC_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Sanity ${res.status}`);
  const data = await res.json();
  return (data.result || []).map(normaliseSanityEvent);
}

function normaliseSanityEvent(e) {
  return {
    id: e._id,
    title: e.title,
    description: e.description,
    category: e.category,
    categoryLabel: categoryLabels[e.category] ?? e.category,
    date: e.date,
    time: e.time ?? null,
    timeLabel: formatTimeLabel(e.date, e.time),
    address: e.address,
    imageUrl: e.imageUrl ?? null,
    featured: e.featured ?? false,
    badges: e.badges ?? [],
    source: 'sanity',
  };
}

const categoryLabels = {
  musik: 'Musik', konst: 'Konst', mat: 'Mat & dryck',
  'pop-up': 'Pop-up & marknad', fynd: 'Fynd & rea',
  uteliv: 'Uteliv', sport: 'Sport',
};

function formatTimeLabel(date, time) {
  const d = new Date(date + 'T12:00:00');
  const days = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'];
  const months = ['jan','feb','mars','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
  const label = `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  return time ? `${label} · ${time}` : label;
}
