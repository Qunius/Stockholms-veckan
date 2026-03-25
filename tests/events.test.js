// tests/events.test.js
import { normaliseWeek, deduplicateEvents, sortEvents, fetchAllEvents } from '../js/events.js';

const monday = '2026-03-23'; // Known Monday
const saturday = '2026-03-28';
const nextMonday = '2026-03-30';

test('normaliseWeek: filters out events before this week', () => {
  const events = [
    { id: '1', date: '2026-03-22' }, // Sunday before — outside this ISO week
    { id: '2', date: monday },        // Monday 23rd — in week, future relative to Monday 00:00
    { id: '3', date: saturday },      // Saturday 28th — in week, future
  ];
  // Use Monday midnight (local-time) to avoid conflating past-event filtering with week-boundary filtering
  const result = normaliseWeek(events, new Date('2026-03-23T00:00:00'));
  expect(result.map(e => e.id)).toEqual(['2', '3']);
});

test('normaliseWeek: filters out events next week', () => {
  const events = [
    { id: '1', date: monday },       // this week
    { id: '2', date: nextMonday },   // next week
  ];
  const result = normaliseWeek(events, new Date('2026-03-23T00:00:00'));
  expect(result.map(e => e.id)).toEqual(['1']);
});

test('normaliseWeek: hides past events from earlier this week', () => {
  // Wednesday 25 Mar 14:00. Monday and Tuesday events already passed.
  const now = new Date('2026-03-25T14:00:00');
  const events = [
    { id: '1', date: '2026-03-23', time: '10:00' }, // Monday 10:00 — past
    { id: '2', date: '2026-03-24', time: '20:00' }, // Tuesday 20:00 — past
    { id: '3', date: '2026-03-25', time: '18:00' }, // Wednesday 18:00 — future
    { id: '4', date: '2026-03-28', time: undefined }, // Saturday — future
  ];
  const result = normaliseWeek(events, now);
  expect(result.map(e => e.id)).toEqual(['3', '4']);
});

test('deduplicateEvents: removes duplicate by title+date', () => {
  const events = [
    { id: '1', title: 'Jazz på Fasching', date: '2026-03-24' },
    { id: '2', title: 'jazz på fasching', date: '2026-03-24' }, // duplicate
    { id: '3', title: 'Jazz på Fasching', date: '2026-03-25' }, // different date = not dup
  ];
  expect(deduplicateEvents(events)).toHaveLength(2);
});

test('sortEvents: featured events come first', () => {
  const events = [
    { id: '1', date: '2026-03-24', time: '10:00', featured: false },
    { id: '2', date: '2026-03-23', time: '18:00', featured: true },
    { id: '3', date: '2026-03-23', time: '12:00', featured: false },
  ];
  const sorted = sortEvents(events);
  expect(sorted[0].id).toBe('2');
});

test('sortEvents: non-featured sorted chronologically', () => {
  const events = [
    { id: '1', date: '2026-03-25', time: '20:00', featured: false },
    { id: '2', date: '2026-03-24', time: '10:00', featured: false },
  ];
  const sorted = sortEvents(events);
  expect(sorted[0].id).toBe('2');
});

test('fetchAllEvents: promotes first event to featured when Sanity fails', async () => {
  // Use a far-future date so normaliseWeek never filters the event out
  const farFuture = '2099-06-15';
  const nowInWeek = new Date('2099-06-15T10:00:00'); // same Monday as event, 10 hours before it starts
  const mockFetch = (url) => {
    if (url.includes('sanity')) return Promise.reject(new Error('Sanity down'));
    return Promise.resolve({ ok: true, json: () => Promise.resolve([
      { id: 'api-1', title: 'Robyn Live', date: farFuture, time: '20:00',
        category: 'musik', categoryLabel: 'Musik', description: '', address: 'Avicii Arena',
        imageUrl: null, featured: false, badges: [] }
    ]) });
  };
  const orig = global.fetch;
  global.fetch = mockFetch;
  const events = await fetchAllEvents(nowInWeek);
  global.fetch = orig;
  expect(events.length).toBeGreaterThan(0);
  expect(events[0].featured).toBe(true);
});
