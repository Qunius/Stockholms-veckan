// tests/weather.test.js
import { getWeatherIcon, getEventWeatherHour, isWithin7Days } from '../js/weather.js';

test('getWeatherIcon: clear day returns sun', () => {
  expect(getWeatherIcon(0)).toBe('sun');   // WMO code 0 = clear sky
});

test('getWeatherIcon: code 61 returns rain', () => {
  expect(getWeatherIcon(61)).toBe('rain');
});

test('getWeatherIcon: code 71 returns snow', () => {
  expect(getWeatherIcon(71)).toBe('snow');
});

test('getWeatherIcon: code 2 returns partly-cloudy', () => {
  expect(getWeatherIcon(2)).toBe('partly-cloudy');
});

test('getWeatherIcon: code 3 returns cloud', () => {
  expect(getWeatherIcon(3)).toBe('cloud');
});

test('getEventWeatherHour: event with time returns that hour', () => {
  expect(getEventWeatherHour('2026-03-25', '20:00')).toBe(20);
});

test('getEventWeatherHour: event with no time returns 12', () => {
  expect(getEventWeatherHour('2026-03-25', null)).toBe(12);
});

test('isWithin7Days: today is within 7 days', () => {
  const today = new Date().toISOString().split('T')[0];
  expect(isWithin7Days(today)).toBe(true);
});

test('isWithin7Days: date 10 days from now is not within 7', () => {
  const future = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];
  expect(isWithin7Days(future)).toBe(false);
});
