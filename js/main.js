// js/main.js
import { fetchAllEvents } from './events.js';
import { fetchWeeklyForecast, getWeatherForEvent, getWeeklyBarData } from './weather.js';
import { renderEventCard, renderSkeleton } from './render.js';
import { initFilters } from './filters.js';
import { initSavedUI, toggleSave, applyHeartState, updateSavedCount, isSaved } from './save.js';

const eventList   = document.getElementById('eventList');
const weatherBar  = document.getElementById('weatherBar');
const errorBanner = document.getElementById('errorBanner');
const heroEyebrow = document.getElementById('heroEyebrow');

async function init() {
  setWeekLabel();
  if (!eventList) {
    console.error('Required element #eventList not found');
    return;
  }
  eventList.innerHTML = renderSkeleton();

  let events, forecast;
  try {
    [events, forecast] = await Promise.all([
      fetchAllEvents(),
      fetchWeeklyForecast(),
    ]);
  } catch {
    // All sources failed — show global error banner
    eventList.innerHTML = '';
    errorBanner.removeAttribute('hidden');
    errorBanner.classList.add('visible');
    return;
  }

  // An empty result is valid (week just reset, no events yet) — render normally
  if (!events || events.length === 0) {
    eventList.innerHTML = '';
    document.getElementById('emptyState').removeAttribute('hidden');
    initSavedUI();
    initFilters();
    return;
  }

  renderWeatherBar(forecast);

  const cardsHtml = events
    .map(event => {
      const weather = getWeatherForEvent(forecast, event.date, event.time);
      return renderEventCard(event, weather);
    })
    .join('');

  eventList.innerHTML = cardsHtml;

  // Wire heart buttons
  eventList.querySelectorAll('.heart-btn').forEach((btn, i) => {
    const eventId = btn.closest('[data-event-id]').dataset.eventId;
    if (isSaved(eventId)) applyHeartState(btn, true);
    btn.addEventListener('click', () => {
      const saved = toggleSave(eventId);
      applyHeartState(btn, saved);
      updateSavedCount();
    });
  });

  initSavedUI();
  initFilters();
}

function setWeekLabel() {
  const now = new Date();
  // Correct ISO 8601 week number algorithm
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1, Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday of same week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  heroEyebrow.textContent = `Vecka ${weekNum} i Stockholm`;
}

function renderWeatherBar(forecast) {
  if (!forecast) return;
  const days = getWeeklyBarData(forecast);
  const html = days.map(d => `
    <div class="weather-day">
      <span class="weather-day-name">${d.name}</span>
      <img src="/assets/icons/${d.icon}.svg" alt="${d.icon}" width="22" height="22">
      <span class="weather-day-temp">${d.temp}°C</span>
    </div>`).join('');
  weatherBar.insertAdjacentHTML('beforeend', html);
}

// Tip modal
document.getElementById('tipsaBtn')?.addEventListener('click', () => {
  const overlay = document.getElementById('modalOverlay');
  overlay?.classList.add('open');
  // Move focus to first input in modal
  setTimeout(() => overlay?.querySelector('input, select, textarea, button')?.focus(), 50);
});
document.getElementById('modalClose')?.addEventListener('click', () => {
  document.getElementById('modalOverlay')?.classList.remove('open');
});
document.getElementById('modalOverlay')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});
document.getElementById('tipSubmit')?.addEventListener('click', submitTip);

// Escape key closes modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('modalOverlay')?.classList.remove('open');
  }
});

async function submitTip() {
  const btn = document.getElementById('tipSubmit');
  const body = {
    name:        document.getElementById('tipName').value,
    category:    document.getElementById('tipCategory').value,
    title:       document.getElementById('tipTitle').value,
    date:        document.getElementById('tipDate').value,
    time:        document.getElementById('tipTime').value || null,
    address:     document.getElementById('tipAddress').value,
    description: document.getElementById('tipDesc').value,
  };
  btn.disabled = true;
  btn.textContent = 'Skickar...';
  try {
    const res = await fetch('/api/submit-tip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(String(data.error || 'Okänt fel'));
    document.getElementById('modalOverlay').classList.remove('open');
    alert('Tack för tipset! Vi publicerar det om det passar.');
  } catch (err) {
    alert(`Något gick fel: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Skicka tips';
  }
}

init();
