import { test, expect } from '@jest/globals';
import { renderEventCard, renderSkeleton } from '../js/render.js';

const mockEvent = {
  id: 'evt-1',
  title: 'Jazz på Fasching',
  description: 'En kväll med jazz.',
  category: 'musik',
  categoryLabel: 'Musik',
  date: '2026-03-24',
  timeLabel: 'Måndag 24 mars · 21:00',
  address: 'Kungsgatan 63, Stockholm',
  imageUrl: 'https://example.com/img.jpg',
  featured: false,
  badges: [],
};

test('renderEventCard includes event title', () => {
  const html = renderEventCard(mockEvent, null);
  expect(html).toContain('Jazz på Fasching');
});

test('renderEventCard includes google maps link', () => {
  const html = renderEventCard(mockEvent, null);
  expect(html).toContain('maps.google.com/?q=Kungsgatan%2063%2C%20Stockholm');
});

test('renderEventCard includes data-event-id', () => {
  const html = renderEventCard(mockEvent, null);
  expect(html).toContain('data-event-id="evt-1"');
});

test('renderEventCard adds featured class when featured=true', () => {
  const html = renderEventCard({ ...mockEvent, featured: true }, null);
  expect(html).toContain('class="event-item featured"');
});

test('renderEventCard shows weather block when weather provided', () => {
  const html = renderEventCard(mockEvent, { icon: 'sun', temp: 5, label: 'Soligt' });
  expect(html).toContain('weather-block');
  expect(html).toContain('5°C');
});

test('renderEventCard hides weather block when weather is null', () => {
  const html = renderEventCard(mockEvent, null);
  expect(html).not.toContain('weather-block');
});

test('renderSkeleton returns 4 skeleton cards', () => {
  const html = renderSkeleton();
  expect((html.match(/skeleton-card/g) || []).length).toBe(4);
});
