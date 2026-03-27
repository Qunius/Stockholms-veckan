// js/weather.js

// WMO Weather interpretation codes → icon name
export function getWeatherIcon(code) {
  if (code === 0) return 'sun';
  if (code <= 2) return 'partly-cloudy';
  if (code <= 48) return 'cloud';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rain';
  if (code <= 86) return 'snow';
  return 'cloud';
}

export function getEventWeatherHour(dateStr, timeStr) {
  if (!timeStr) return 12;
  const [h] = timeStr.split(':').map(Number);
  return h;
}

export function isWithin7Days(dateStr) {
  // Compare dates as Stockholm local strings to avoid UTC offset issues at day boundaries.
  // Open-Meteo's 7-day window is relative to today in Stockholm time.
  const todayStockholm = new Date()
    .toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })
    .slice(0, 10); // 'YYYY-MM-DD'
  const eventDate = new Date(dateStr + 'T12:00:00');
  const todayDate = new Date(todayStockholm + 'T12:00:00');
  const diffMs = eventDate - todayDate;
  return diffMs >= -6 * 24 * 60 * 60 * 1000 && diffMs <= 7 * 24 * 60 * 60 * 1000;
}

// Fetch weekly forecast for Stockholm (lat 59.33, lon 18.07)
export async function fetchWeeklyForecast() {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=59.33&longitude=18.07'
    + '&hourly=temperature_2m,weather_code'
    + '&daily=weather_code,temperature_2m_max'
    + '&timezone=Europe%2FStockholm'
    + '&forecast_days=7'
    + '&past_days=6';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    return await res.json();
  } catch {
    return null; // caller handles null = hide weather UI
  }
}

// Given a forecast payload, return { icon, temp, label } for a specific date+hour
export function getWeatherForEvent(forecast, dateStr, timeStr) {
  if (!forecast || !isWithin7Days(dateStr)) return null;
  const hour = getEventWeatherHour(dateStr, timeStr);
  const idx = forecast.hourly.time.findIndex(t =>
    t.startsWith(dateStr) && parseInt(t.split('T')[1]) === hour
  );
  if (idx === -1) return null;
  const code = forecast.hourly.weather_code[idx] ?? 0;
  const temp = Math.round(forecast.hourly.temperature_2m[idx] ?? 0);
  return { icon: getWeatherIcon(code), temp, label: weatherLabel(code) };
}

function weatherLabel(code) {
  if (code === 0) return 'Soligt';
  if (code <= 2) return 'Halvklart';
  if (code <= 48) return 'Mulet';
  if (code <= 67) return 'Regn';
  if (code <= 77) return 'Snö';
  return 'Växlande';
}

// Build the 7-day weather bar data from daily forecast
export function getWeeklyBarData(forecast) {
  if (!forecast) return [];
  const days = ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];
  return forecast.daily.time.map((date, i) => ({
    date,
    name: days[new Date(date + 'T12:00:00').getDay() === 0 ? 6 : new Date(date + 'T12:00:00').getDay() - 1],
    icon: getWeatherIcon(forecast.daily.weather_code[i]),
    temp: Math.round(forecast.daily.temperature_2m_max[i]),
  }));
}
