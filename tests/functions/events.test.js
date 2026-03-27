import { normaliseTicketmaster, normaliseVisitStockholm, normaliseBandsintown } from '../../netlify/functions/events.js';

test('normaliseTicketmaster maps name to title', () => {
  const raw = {
    id: 'tm-1',
    name: 'Robyn Live',
    dates: { start: { localDate: '2026-03-25', localTime: '20:00:00' } },
    _embedded: { venues: [{ name: 'Avicii Arena', address: { line1: 'Arenavägen 69' }, city: { name: 'Stockholm' } }] },
    images: [{ ratio: '16_9', url: 'https://img.example.com/a.jpg', width: 1024 }],
    classifications: [{ segment: { name: 'Music' } }],
  };
  const result = normaliseTicketmaster(raw);
  expect(result.title).toBe('Robyn Live');
  expect(result.date).toBe('2026-03-25');
  expect(result.category).toBe('musik');
  expect(result.source).toBe('ticketmaster');
});

test('normaliseVisitStockholm maps name to title', () => {
  const raw = {
    id: 'vs-1',
    name: 'Kulturnatt Stockholm',
    startDate: '2026-03-28',
    location: { streetAddress: 'Drottninggatan 1', addressLocality: 'Stockholm' },
    image: 'https://img.example.com/b.jpg',
    category: 'culture',
  };
  const result = normaliseVisitStockholm(raw);
  expect(result.title).toBe('Kulturnatt Stockholm');
  expect(result.category).toBe('konst');
  expect(result.source).toBe('visitstockholm');
});

test('normaliseBandsintown maps datetime to date + time', () => {
  const raw = {
    id: 'bt-99',
    title: 'Club Night',
    datetime: '2026-03-27T22:00:00',
    venue: { name: 'Fasching', city: 'Stockholm' },
    artist: { name: 'DJ Test', image_url: 'https://img.example.com/c.jpg' },
  };
  const result = normaliseBandsintown(raw);
  expect(result.date).toBe('2026-03-27');
  expect(result.time).toBe('22:00');
  expect(result.category).toBe('musik');
  expect(result.source).toBe('bandsintown');
  expect(result.address).toBe('Fasching, Stockholm');
});
