# Stockholm Den Här Veckan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Stockholm city guide web app showing weekly events with weather, filters, save/heart, and a tip-submission form backed by Sanity CMS and Netlify Functions.

**Architecture:** Multi-file vanilla HTML/CSS/JS served as a static site on Netlify. API keys stay server-side in two Netlify Functions (`/api/events` proxies Ticketmaster + Visit Stockholm; `/api/submit-tip` writes to Sanity). The browser fetches Open-Meteo and Sanity public events directly.

**Tech Stack:** HTML/CSS/JS (no framework), Jest (tests), Netlify Functions (Node 18), Sanity CMS (content + tip drafts), Open-Meteo API (weather), Ticketmaster Discovery API (events), Visit Stockholm Open Data (events).

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Page shell, static markup, script/style imports |
| `css/style.css` | All styles — design tokens, layout, components |
| `js/main.js` | App entry: orchestrates modules, skeleton loading, error states, tip modal |
| `js/render.js` | Pure function: event object → card HTML string |
| `js/weather.js` | Open-Meteo fetch, timezone conversion, icon mapping, weekly bar |
| `js/events.js` | Fetch `/api/events` + Sanity public events, merge, deduplicate, sort |
| `js/filters.js` | Filter tab click logic, show/hide cards, empty state |
| `js/save.js` | localStorage save/heart toggle, header count update |
| `netlify/functions/events.js` | Proxy Ticketmaster + Visit Stockholm in parallel, normalise, merge, cache |
| `netlify/functions/submit-tip.js` | Receive tip POST, set `status:pending`, write to Sanity |
| `assets/icons/*.svg` | Weather icons (sun, cloud, rain, snow, partly-cloudy, night) + category fallbacks |
| `netlify.toml` | Functions directory config, redirect rules |
| `package.json` | Jest + node-fetch dev dependencies |
| `tests/render.test.js` | Unit tests for render.js |
| `tests/weather.test.js` | Unit tests for weather.js (icon mapping, timezone, edge cases) |
| `tests/events.test.js` | Unit tests for events.js (merge, dedup, sort, week filter) |
| `tests/save.test.js` | Unit tests for save.js |
| `tests/functions/events.test.js` | Unit tests for Netlify events function (normalisation, merging) |
| `tests/functions/submit-tip.test.js` | Unit tests for submit-tip function |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `netlify.toml`
- Create: `jest.config.js`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Initialise npm**
```bash
cd /Users/pavel/VS-code
npm init -y
```

- [ ] **Step 2: Install dev dependencies**
```bash
npm install --save-dev jest @jest/globals jest-environment-jsdom node-fetch
```

- [ ] **Step 3: Write jest.config.js**
```js
// jest.config.js
export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
};
```

- [ ] **Step 4: Update package.json scripts**
```json
{
  "type": "module",
  "scripts": {
    "test": "TZ=Europe/Stockholm node --experimental-vm-modules node_modules/.bin/jest",
    "test:watch": "TZ=Europe/Stockholm node --experimental-vm-modules node_modules/.bin/jest --watch"
  }
}
```
> **Note:** `TZ=Europe/Stockholm` ensures date boundary tests behave identically on CI (UTC) and locally.

- [ ] **Step 5: Write netlify.toml**
```toml
[build]
  publish = "."
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

- [ ] **Step 6: Write .env.example**
```
TICKETMASTER_KEY=your_key_here
BANDSINTOWN_KEY=your_key_here
SANITY_PROJECT_ID=your_project_id
SANITY_DATASET=production
SANITY_PUBLIC_TOKEN=your_read_only_token
SANITY_TIP_TOKEN=your_create_only_token
```

- [ ] **Step 7: Write .gitignore**
```
node_modules/
.env
.env.local
.netlify/
```

- [ ] **Step 8: Create folder structure**
```bash
mkdir -p css js netlify/functions assets/icons tests/functions
```

- [ ] **Step 9: Commit**
```bash
git init
git add .
git commit -m "chore: project scaffold with jest and netlify config"
```

---

## Task 2: SVG Weather Icons + Category Fallbacks

**Files:**
- Create: `assets/icons/sun.svg`
- Create: `assets/icons/partly-cloudy.svg`
- Create: `assets/icons/cloud.svg`
- Create: `assets/icons/rain.svg`
- Create: `assets/icons/snow.svg`
- Create: `assets/icons/night.svg`
- Create: `assets/icons/music.svg`
- Create: `assets/icons/art.svg`
- Create: `assets/icons/food.svg`
- Create: `assets/icons/market.svg`
- Create: `assets/icons/sale.svg`
- Create: `assets/icons/sport.svg`
- Create: `assets/icons/nightlife.svg`

- [ ] **Step 1: Write sun.svg**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <circle cx="16" cy="16" r="6" fill="#F5A623"/>
  <line x1="16" y1="2" x2="16" y2="7" stroke="#F5A623" stroke-width="2" stroke-linecap="round"/>
  <line x1="16" y1="25" x2="16" y2="30" stroke="#F5A623" stroke-width="2" stroke-linecap="round"/>
  <line x1="2" y1="16" x2="7" y2="16" stroke="#F5A623" stroke-width="2" stroke-linecap="round"/>
  <line x1="25" y1="16" x2="30" y2="16" stroke="#F5A623" stroke-width="2" stroke-linecap="round"/>
  <line x1="5.8" y1="5.8" x2="9.2" y2="9.2" stroke="#F5A623" stroke-width="2" stroke-linecap="round"/>
  <line x1="22.8" y1="22.8" x2="26.2" y2="26.2" stroke="#F5A623" stroke-width="2" stroke-linecap="round"/>
  <line x1="26.2" y1="5.8" x2="22.8" y2="9.2" stroke="#F5A623" stroke-width="2" stroke-linecap="round"/>
  <line x1="9.2" y1="22.8" x2="5.8" y2="26.2" stroke="#F5A623" stroke-width="2" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 2: Write partly-cloudy.svg**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <circle cx="12" cy="12" r="5" fill="#F5A623"/>
  <line x1="12" y1="3" x2="12" y2="6" stroke="#F5A623" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="3" y1="12" x2="6" y2="12" stroke="#F5A623" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="5.8" y1="5.8" x2="8.1" y2="8.1" stroke="#F5A623" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="18.2" y1="8.1" x2="20.5" y2="5.8" stroke="#F5A623" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M23 20C23 20 22.5 15 17.5 15C13.5 15 12 18.5 12 18.5C12 18.5 9.5 18.5 8.5 20.5C7.5 22.5 9 25 12 25H23C25.5 25 27 23.2 27 21.5C27 19.2 25 18 23 20Z" fill="#B8CEDF" stroke="#9ABDD0" stroke-width="0.5"/>
</svg>
```

- [ ] **Step 3: Write cloud.svg**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <path d="M7 20C4.8 20 3 18.2 3 16C3 14 4.5 12.3 6.5 12C6.5 11.7 6.5 11.3 6.5 11C6.5 8 9 5.5 12 5.5C14.3 5.5 16.3 6.9 17.2 9C17.6 8.8 18.1 8.8 18.5 8.8C22 8.8 25 11.8 25 15.3C25 15.3 25 15.4 25 15.5C26.8 16 28 17.7 28 19.5C28 21.9 26.1 24 23.5 24H7C4.8 24 3 22.2 3 20Z" fill="#B0BEC5" stroke="#90A4AE" stroke-width="0.5"/>
</svg>
```

- [ ] **Step 4: Write rain.svg**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <path d="M24 14C24 14 23.5 8.5 18 8.5C13.5 8.5 12 12 12 12C12 12 9 12 8 14.5C7 17 9 20 12 20H24C26.5 20 28 18 28 16C28 13.8 26 12.5 24 14Z" fill="#90A8C3" stroke="#7A96B5" stroke-width="0.5"/>
  <line x1="11" y1="23" x2="9" y2="27" stroke="#5B8FB9" stroke-width="2" stroke-linecap="round"/>
  <line x1="17" y1="23" x2="15" y2="27" stroke="#5B8FB9" stroke-width="2" stroke-linecap="round"/>
  <line x1="23" y1="23" x2="21" y2="27" stroke="#5B8FB9" stroke-width="2" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 5: Write snow.svg**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <path d="M7 17C4.8 17 3 15.4 3 13.2C3 11.4 4.3 9.8 6 9.5C6 9.2 6 9 6 8.7C6 5.8 8.2 3.5 11 3.5C13.2 3.5 15 4.9 15.8 6.8C16.2 6.7 16.6 6.7 17 6.7C20.5 6.7 23 9.3 23 12.8C24.7 13.2 26 14.9 26 16.8C26 19 24.2 21 21.5 21H7C4.8 21 3 19.2 3 17Z" fill="#CFD8DC" stroke="#B0BEC5" stroke-width="0.5"/>
  <circle cx="10" cy="25" r="1.5" fill="#90CAF9"/>
  <circle cx="16" cy="27" r="1.5" fill="#90CAF9"/>
  <circle cx="22" cy="25" r="1.5" fill="#90CAF9"/>
  <circle cx="13" cy="23" r="1.5" fill="#90CAF9"/>
  <circle cx="19" cy="23" r="1.5" fill="#90CAF9"/>
</svg>
```

- [ ] **Step 6: Write night.svg**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <path d="M26 17.5C24.5 20.5 21.5 22.5 18 22.5C13 22.5 9 18.5 9 13.5C9 10 11 7 14 5.5C9.5 6.5 6 10.5 6 15.5C6 21.5 11 26.5 17 26.5C21.5 26.5 25.5 23.5 27 19.5L26 17.5Z" fill="#A78BFA"/>
</svg>
```

- [ ] **Step 7: Write category fallback icons** (one per category using simple geometric SVG shapes)
```svg
<!-- music.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" fill="none">
  <rect width="80" height="60" fill="#EEE9FF"/>
  <text x="40" y="38" font-size="24" text-anchor="middle" fill="#5B3FE8">♪</text>
</svg>
```
Repeat for art (🎨→#FFE9E4), food (🍴→#E4FFE9), market (🛍→#FFF9E4), sale (🏷→#FFE4E4), sport (⚽→#E4F0FF), nightlife (✦→#1A1035).

- [ ] **Step 8: Commit**
```bash
git add assets/
git commit -m "feat: add SVG weather icons and category fallback illustrations"
```

---

## Task 3: CSS Design System

**Files:**
- Create: `css/style.css`

- [ ] **Step 1: Write design tokens and reset**
```css
/* css/style.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:      #F8F7F4;
  --surface: #FFFFFF;
  --border:  #E2DED8;
  --text:    #111111;
  --muted:   #777777;
  --accent:  #5B3FE8;
  --coral:   #F0522A;
  --amber:   #F5A623;
  --green:   #00B37D;
  --font-serif: 'Georgia', serif;
  --font-sans:  -apple-system, 'Helvetica Neue', Arial, sans-serif;
}

body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}
```

- [ ] **Step 2: Write header styles**
```css
/* Header */
.site-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0 32px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
}
.logo { font-family: var(--font-serif); font-size: 20px; letter-spacing: -0.5px; }
.logo small { display: block; font-family: var(--font-sans); font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--muted); margin-top: 1px; }
.header-right { display: flex; align-items: center; gap: 16px; }
.saved-count { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 5px; }
.saved-count svg { width: 14px; height: 14px; }
.tipsa-btn { background: var(--accent); color: #fff; border: none; border-radius: 3px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
.tipsa-btn:hover { background: #4a30d4; }
```

- [ ] **Step 3: Write hero, weather bar, filters**
```css
/* Hero */
.hero { padding: 48px 32px 36px; border-bottom: 1px solid var(--border); background: var(--surface); }
.hero-eyebrow { font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--accent); font-weight: 600; margin-bottom: 10px; }
.hero h1 { font-family: var(--font-serif); font-size: 52px; font-weight: 400; line-height: 1.0; letter-spacing: -2px; margin-bottom: 12px; }
.hero h1 em { font-style: italic; color: var(--coral); }
.hero-sub { font-size: 15px; color: #555; line-height: 1.6; max-width: 500px; }

/* Weekly weather bar */
.weather-bar { background: var(--accent); padding: 10px 32px; display: flex; align-items: center; gap: 24px; overflow-x: auto; }
.weather-bar-label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,0.6); white-space: nowrap; }
.weather-day { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 52px; }
.weather-day-name { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.6); }
.weather-day img { width: 22px; height: 22px; filter: brightness(0) invert(1); }
.weather-day-temp { font-size: 13px; font-weight: 700; color: #fff; }

/* Filters */
.filters { padding: 12px 32px; display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid var(--border); background: var(--bg); position: sticky; top: 60px; z-index: 99; }
.filter-tab { font-size: 12px; padding: 6px 16px; border: 1.5px solid var(--border); border-radius: 20px; cursor: pointer; background: transparent; color: #555; transition: all .15s; }
.filter-tab.active { background: var(--accent); border-color: var(--accent); color: #fff; }
```

- [ ] **Step 4: Write event card styles**
```css
/* Event list */
.event-list { max-width: 880px; margin: 0 auto; padding: 0 32px 80px; }

.event-item { padding: 32px 0; border-bottom: 1px solid var(--border); display: grid; grid-template-columns: 190px 1fr 72px; gap: 24px; align-items: start; }
.event-item.featured { background: var(--surface); border-radius: 6px; margin: 28px -20px 0; padding: 28px; border: none; border-top: 3px solid var(--accent); box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
.event-item[hidden] { display: none; }

.event-image-wrap { position: relative; }
.event-image { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 2px; display: block; }
.event-image-fallback { width: 100%; aspect-ratio: 4/3; display: flex; align-items: center; justify-content: center; border-radius: 2px; background: #EEE9FF; }
.event-image-fallback img { width: 48px; height: 48px; }

.event-meta { font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.event-category { color: var(--accent); font-weight: 600; }

.badge { font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; padding: 3px 8px; border-radius: 3px; }
.badge-popup  { background: #FFF3CD; color: #7A5700; }
.badge-deal   { background: #FFE8E4; color: #B8280A; }
.badge-today  { background: var(--accent); color: #fff; }
.badge-free   { background: #D6F5EB; color: #0A6B45; }
.badge-new    { background: #EEE9FF; color: var(--accent); }
.badge-night  { background: #1A1035; color: #A98EFF; }

.event-title { font-family: var(--font-serif); font-size: 24px; font-weight: 400; letter-spacing: -0.3px; line-height: 1.2; margin-bottom: 8px; }
.event-desc  { font-size: 15px; color: #444; line-height: 1.7; margin-bottom: 12px; }
.event-location a { font-size: 13px; color: var(--muted); text-decoration: none; border-bottom: 1px solid transparent; transition: color .15s, border-color .15s; }
.event-location a::before { content: "↗ "; font-size: 11px; opacity: 0.5; }
.event-location a:hover { color: var(--coral); border-bottom-color: var(--coral); }

/* Actions column */
.event-actions { display: flex; flex-direction: column; align-items: center; gap: 16px; padding-top: 4px; }
.weather-block { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.weather-block img { width: 30px; height: 30px; }
.weather-temp { font-size: 14px; font-weight: 700; letter-spacing: -0.3px; }
.weather-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.8px; text-align: center; }
.actions-divider { width: 28px; height: 1px; background: var(--border); }
.heart-btn { background: none; border: none; cursor: pointer; padding: 4px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.heart-btn svg { width: 22px; height: 22px; }
.heart-label { font-size: 9px; letter-spacing: 0.8px; color: #AAA; text-transform: uppercase; }
.heart-btn.saved svg path { fill: var(--coral); stroke: var(--coral); }
.heart-btn.saved .heart-label { color: var(--coral); }
```

- [ ] **Step 5: Write skeleton, empty state, error banner, modal**
```css
/* Skeleton loading */
.skeleton { background: linear-gradient(90deg, #ece9e3 25%, #f5f3ef 50%, #ece9e3 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 3px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.skeleton-card { padding: 32px 0; border-bottom: 1px solid var(--border); display: grid; grid-template-columns: 190px 1fr 72px; gap: 24px; }
.skeleton-image { aspect-ratio: 4/3; border-radius: 2px; }
.skeleton-line { height: 14px; margin-bottom: 10px; }
.skeleton-line.short { width: 40%; }
.skeleton-line.medium { width: 70%; }
.skeleton-line.long { width: 90%; }
.skeleton-title { height: 28px; width: 80%; margin-bottom: 12px; }

/* Empty state */
.empty-state { text-align: center; padding: 64px 32px; }
.empty-state h3 { font-family: var(--font-serif); font-size: 22px; font-weight: 400; margin-bottom: 8px; }
.empty-state p { font-size: 14px; color: var(--muted); line-height: 1.6; }

/* Error banner */
.error-banner { background: #FFF3CD; border-bottom: 1px solid #F0D050; padding: 12px 32px; font-size: 13px; color: #7A5700; display: none; }
.error-banner.visible { display: block; }

/* Tip modal */
.modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; align-items: center; justify-content: center; }
.modal-overlay.open { display: flex; }
.modal { background: var(--surface); border-radius: 6px; padding: 36px; width: 100%; max-width: 480px; margin: 16px; }
.modal h2 { font-family: var(--font-serif); font-size: 28px; font-weight: 400; letter-spacing: -0.5px; margin-bottom: 6px; }
.modal-sub { font-size: 14px; color: var(--muted); margin-bottom: 24px; line-height: 1.5; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; font-weight: 600; }
.form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 3px; font-size: 14px; font-family: var(--font-sans); background: var(--bg); color: var(--text); }
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: none; border-color: var(--accent); }
.form-group textarea { height: 80px; resize: vertical; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
.btn-cancel { background: none; border: 1.5px solid var(--border); border-radius: 3px; padding: 9px 18px; font-size: 13px; cursor: pointer; color: var(--muted); }
.btn-submit { background: var(--accent); color: #fff; border: none; border-radius: 3px; padding: 9px 20px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-submit:hover { background: #4a30d4; }
.btn-submit:disabled { background: #aaa; cursor: not-allowed; }
```

- [ ] **Step 6: Commit**
```bash
git add css/style.css
git commit -m "feat: add complete CSS design system with design tokens"
```

---

## Task 4: save.js — Heart / Save Module

**Files:**
- Create: `js/save.js`
- Create: `tests/save.test.js`

- [ ] **Step 1: Write failing tests**
```js
// tests/save.test.js
import { getSavedIds, toggleSave, isSaved } from '../js/save.js';

beforeEach(() => {
  // Simulate localStorage
  global.localStorage = (() => {
    let store = {};
    return {
      getItem: k => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      clear: () => { store = {}; },
    };
  })();
});

test('getSavedIds returns empty array when nothing saved', () => {
  expect(getSavedIds()).toEqual([]);
});

test('toggleSave adds id when not saved', () => {
  toggleSave('evt-1');
  expect(getSavedIds()).toContain('evt-1');
});

test('toggleSave removes id when already saved', () => {
  toggleSave('evt-1');
  toggleSave('evt-1');
  expect(getSavedIds()).not.toContain('evt-1');
});

test('isSaved returns true for saved id', () => {
  toggleSave('evt-2');
  expect(isSaved('evt-2')).toBe(true);
});

test('isSaved returns false for unsaved id', () => {
  expect(isSaved('evt-999')).toBe(false);
});
```

- [ ] **Step 2: Run — verify it fails**
```bash
npm test -- tests/save.test.js
```
Expected: FAIL — `Cannot find module '../js/save.js'`

- [ ] **Step 3: Implement save.js**
```js
// js/save.js
const STORAGE_KEY = 'stockholm_saved_events';

export function getSavedIds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function isSaved(id) {
  return getSavedIds().includes(id);
}

export function toggleSave(id) {
  const saved = getSavedIds();
  const updated = saved.includes(id)
    ? saved.filter(s => s !== id)
    : [...saved, id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated.includes(id);
}

export function initSavedUI() {
  // Restore heart state on all rendered cards
  getSavedIds().forEach(id => {
    const btn = document.querySelector(`[data-event-id="${id}"] .heart-btn`);
    if (btn) applyHeartState(btn, true);
  });
  updateSavedCount();
}

export function applyHeartState(btn, saved) {
  btn.classList.toggle('saved', saved);
  btn.querySelector('.heart-label').textContent = saved ? 'Sparat' : 'Spara';
}

export function updateSavedCount() {
  const count = getSavedIds().length;
  const el = document.getElementById('savedCount');
  if (!el) return;
  el.querySelector('span').textContent =
    count === 0 ? 'Inga sparade' : `${count} spara${count === 1 ? 't' : 'de'}`;
}
```

- [ ] **Step 4: Run — verify it passes**
```bash
npm test -- tests/save.test.js
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**
```bash
git add js/save.js tests/save.test.js
git commit -m "feat: add save/heart module with localStorage persistence"
```

---

## Task 5: weather.js — Weather Module

**Files:**
- Create: `js/weather.js`
- Create: `tests/weather.test.js`

- [ ] **Step 1: Write failing tests**
```js
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
```

- [ ] **Step 2: Run — verify it fails**
```bash
npm test -- tests/weather.test.js
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement weather.js**
```js
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
  return diffMs >= 0 && diffMs <= 7 * 24 * 60 * 60 * 1000;
}

// Fetch weekly forecast for Stockholm (lat 59.33, lon 18.07)
export async function fetchWeeklyForecast() {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=59.33&longitude=18.07'
    + '&hourly=temperature_2m,weather_code'
    + '&daily=weather_code,temperature_2m_max'
    + '&timezone=Europe%2FStockholm'
    + '&forecast_days=7';
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
```

- [ ] **Step 4: Run — verify it passes**
```bash
npm test -- tests/weather.test.js
```
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**
```bash
git add js/weather.js tests/weather.test.js
git commit -m "feat: add weather module with Open-Meteo integration and icon mapping"
```

---

## Task 6: render.js — Event Card Builder

**Files:**
- Create: `js/render.js`
- Create: `tests/render.test.js`

- [ ] **Step 1: Write failing tests**
```js
// tests/render.test.js
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
  expect(html).toContain('maps.google.com/?q=Kungsgatan+63%2C+Stockholm');
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
```

- [ ] **Step 2: Run — verify it fails**
```bash
npm test -- tests/render.test.js
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement render.js**
```js
// js/render.js

// Prevent XSS — escape all user-visible strings before inserting into HTML
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function renderEventCard(event, weather) {
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(event.address)}`;
  const featuredClass = event.featured ? ' featured' : '';
  const imageHtml = event.imageUrl
    ? `<img class="event-image" src="${esc(event.imageUrl)}" alt="${esc(event.title)}" loading="lazy">`
    : `<div class="event-image-fallback">
         <img src="/assets/icons/${esc(event.category)}.svg" alt="${esc(event.categoryLabel)}">
       </div>`;

  const badgesHtml = (event.badges || [])
    .map(b => `<span class="badge badge-${esc(b.type)}">${esc(b.label)}</span>`)
    .join('');

  const weatherHtml = weather
    ? `<div class="weather-block">
         <img src="/assets/icons/${esc(weather.icon)}.svg" alt="${esc(weather.label)}" width="30" height="30">
         <span class="weather-temp">${esc(weather.temp)}°C</span>
         <span class="weather-label">${esc(weather.label)}</span>
       </div>
       <div class="actions-divider"></div>`
    : '';

  return `
    <div class="event-item${featuredClass}" data-event-id="${esc(event.id)}" data-category="${esc(event.category)}">
      <div class="event-image-wrap">${imageHtml}</div>
      <div class="event-body">
        <div class="event-meta">
          <span class="event-category">${esc(event.categoryLabel)}</span>
          <span>${esc(event.timeLabel)}</span>
          ${badgesHtml}
        </div>
        <h2 class="event-title">${esc(event.title)}</h2>
        <p class="event-desc">${esc(event.description)}</p>
        <div class="event-location">
          <a href="${mapsUrl}" target="_blank" rel="noopener">${esc(event.address)}</a>
        </div>
      </div>
      <div class="event-actions">
        ${weatherHtml}
        <button class="heart-btn" aria-label="Spara evenemang">
          <svg viewBox="0 0 24 24" fill="none" stroke="#C8C2B8" stroke-width="1.5">
            <path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 12 21 12 21Z"/>
          </svg>
          <span class="heart-label">Spara</span>
        </button>
      </div>
    </div>`;
}

export function renderSkeleton() {
  return Array.from({ length: 4 }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-image"></div>
      <div style="display:flex;flex-direction:column;gap:10px;padding-top:8px;">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-line long"></div>
        <div class="skeleton skeleton-line medium"></div>
      </div>
      <div></div>
    </div>`).join('');
}
```

- [ ] **Step 4: Run — verify passes**
```bash
npm test -- tests/render.test.js
```
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**
```bash
git add js/render.js tests/render.test.js
git commit -m "feat: add event card renderer with skeleton loading"
```

---

## Task 7: filters.js — Filter Tab Logic

**Files:**
- Create: `js/filters.js`

- [ ] **Step 1: Implement filters.js** (DOM-dependent, tested manually in browser)
```js
// js/filters.js
export function initFilters() {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      applyFilter(filter);
    });
  });
}

export function applyFilter(category) {
  const items = document.querySelectorAll('.event-item');
  let visible = 0;
  items.forEach(item => {
    const show = category === 'allt' || item.dataset.category === category;
    item.hidden = !show;
    if (show) visible++;
  });
  const emptyState = document.getElementById('emptyState');
  if (emptyState) emptyState.hidden = visible > 0;
}
```

- [ ] **Step 2: Commit**
```bash
git add js/filters.js
git commit -m "feat: add client-side filter module"
```

---

## Task 8: events.js (client) — Fetch + Merge Events

**Files:**
- Create: `js/events.js`
- Create: `tests/events.test.js`

- [ ] **Step 1: Write failing tests**
```js
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
```

- [ ] **Step 2: Run — verify fails**
```bash
npm test -- tests/events.test.js
```

- [ ] **Step 3: Implement events.js**
```js
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
```

- [ ] **Step 4: Create js/config.js** (reads from meta tags injected by Netlify or hardcoded public values)
```js
// js/config.js
// These are PUBLIC values only — no secrets here.
// Guard against Node/Jest environments where `document` does not exist.
function getMeta(name) {
  if (typeof document === 'undefined') return '';
  return document.querySelector(`meta[name="${name}"]`)?.content ?? '';
}
export const SANITY_PROJECT_ID   = getMeta('sanity-project-id');
export const SANITY_DATASET      = 'production';
export const SANITY_PUBLIC_TOKEN = getMeta('sanity-public-token');
```

- [ ] **Step 5: Run — verify tests pass**
```bash
npm test -- tests/events.test.js
```
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**
```bash
git add js/events.js js/config.js tests/events.test.js
git commit -m "feat: add client events module with merge, dedup, week filter, sort"
```

---

## Task 9: Netlify Function — events.js

**Files:**
- Create: `netlify/functions/events.js`
- Create: `tests/functions/events.test.js`

- [ ] **Step 1: Write failing tests**
```js
// tests/functions/events.test.js
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
```

- [ ] **Step 2: Run — verify fails**
```bash
npm test -- tests/functions/events.test.js
```

- [ ] **Step 3: Implement netlify/functions/events.js**
```js
// netlify/functions/events.js
const TICKETMASTER_KEY = process.env.TICKETMASTER_KEY;
// BANDSINTOWN_KEY is optional — if absent, Bandsintown is skipped and
// small-venue music is added manually via Sanity CMS instead.
const BANDSINTOWN_KEY = process.env.BANDSINTOWN_KEY;
const TIMEOUT_MS = 8000;

export const handler = async () => {
  const sources = [
    fetchWithTimeout(ticketmasterUrl(), TIMEOUT_MS),
    fetchWithTimeout(visitStockholmUrl(), TIMEOUT_MS),
    ...(BANDSINTOWN_KEY ? [fetchWithTimeout(bandsintownUrl(), TIMEOUT_MS)] : []),
  ];
  const [tm, vs, bt] = await Promise.allSettled(sources);

  const events = [
    ...(tm?.status === 'fulfilled' ? tm.value.map(normaliseTicketmaster) : []),
    ...(vs?.status === 'fulfilled' ? vs.value.map(normaliseVisitStockholm) : []),
    ...(bt?.status === 'fulfilled' ? bt.value.map(normaliseBandsintown) : []),
  ];

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=900',
    },
    body: JSON.stringify(events),
  };
};

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json().then(d => extractEvents(url, d));
  } finally {
    clearTimeout(timer);
  }
}

function extractEvents(url, data) {
  if (url.includes('ticketmaster')) return data._embedded?.events ?? [];
  if (url.includes('visitstockholm')) return data.result ?? data.events ?? [];
  if (url.includes('bandsintown')) return Array.isArray(data) ? data : [];
  return [];
}

function ticketmasterUrl() {
  const week = getISOWeekRange();
  return `https://app.ticketmaster.com/discovery/v2/events.json`
    + `?apikey=${TICKETMASTER_KEY}`
    + `&city=Stockholm&countryCode=SE`
    + `&startDateTime=${week.start}Z&endDateTime=${week.end}Z`
    + `&size=50`;
}

function visitStockholmUrl() {
  const week = getISOWeekRange();
  return `https://www.visitstockholm.com/open-api/events/?start=${week.startDate}&end=${week.endDate}`;
}

function bandsintownUrl() {
  const week = getISOWeekRange();
  // Bandsintown city search — returns events in Stockholm within the week
  return `https://rest.bandsintown.com/v1.0/city/Stockholm/events`
    + `?app_id=${BANDSINTOWN_KEY}`
    + `&date=${week.startDate}%2C${week.endDate}`;
}

function getISOWeekRange() {
  // Compute week boundaries in Europe/Stockholm, not UTC, so the Monday
  // reset is correct regardless of where the Netlify function runs.
  const nowStockholm = new Date(
    new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })
  );
  const day = nowStockholm.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(nowStockholm);
  mon.setDate(nowStockholm.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 0);
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return {
    start: mon.toISOString().slice(0, 19),
    end: sun.toISOString().slice(0, 19),
    startDate: fmt(mon),
    endDate: fmt(sun),
  };
}

export function normaliseTicketmaster(e) {
  const venue = e._embedded?.venues?.[0];
  const address = [venue?.address?.line1, venue?.city?.name].filter(Boolean).join(', ');
  const segment = e.classifications?.[0]?.segment?.name?.toLowerCase() ?? '';
  const category = segment.includes('music') ? 'musik'
    : segment.includes('sport') ? 'sport'
    : segment.includes('art') ? 'konst' : 'uteliv';
  const image = e.images?.find(i => i.ratio === '16_9' && i.width >= 640)?.url ?? null;
  return {
    id: `tm-${e.id}`,
    title: e.name,
    description: '',
    category,
    categoryLabel: { musik:'Musik', sport:'Sport', konst:'Konst', uteliv:'Uteliv' }[category],
    date: e.dates?.start?.localDate ?? '',
    time: e.dates?.start?.localTime?.slice(0,5) ?? null,
    timeLabel: '',
    address: address || 'Stockholm',
    imageUrl: image,
    featured: false,
    badges: [],
    source: 'ticketmaster',
  };
}

export function normaliseVisitStockholm(e) {
  const catMap = { culture:'konst', food:'mat', sport:'sport', nightlife:'uteliv', market:'pop-up' };
  const category = catMap[e.category] ?? 'konst';
  return {
    id: `vs-${e.id}`,
    title: e.name,
    description: e.description ?? '',
    category,
    categoryLabel: { konst:'Konst', mat:'Mat & dryck', sport:'Sport', uteliv:'Uteliv', 'pop-up':'Pop-up & marknad' }[category] ?? 'Konst',
    date: e.startDate ?? '',
    time: null,
    timeLabel: '',
    address: [e.location?.streetAddress, e.location?.addressLocality].filter(Boolean).join(', ') || 'Stockholm',
    imageUrl: e.image ?? null,
    featured: false,
    badges: [],
    source: 'visitstockholm',
  };
}

export function normaliseBandsintown(e) {
  // Bandsintown event — covers smaller venues and club gigs
  const dateTime = e.datetime ?? '';
  const [datePart, timePart] = dateTime.split('T');
  return {
    id: `bt-${e.id}`,
    title: e.title ?? e.artist?.name ?? 'Okänt evenemang',
    description: e.description ?? '',
    category: 'musik',
    categoryLabel: 'Musik',
    date: datePart ?? '',
    time: timePart ? timePart.slice(0, 5) : null,
    timeLabel: '',
    address: [e.venue?.name, e.venue?.city].filter(Boolean).join(', ') || 'Stockholm',
    imageUrl: e.artist?.image_url ?? null,
    featured: false,
    badges: [],
    source: 'bandsintown',
  };
}
```

- [ ] **Step 4: Run — verify passes**
```bash
npm test -- tests/functions/events.test.js
```
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**
```bash
git add netlify/functions/events.js tests/functions/events.test.js
git commit -m "feat: add events Netlify Function with Ticketmaster + Visit Stockholm"
```

---

## Task 10: Netlify Function — submit-tip.js

**Files:**
- Create: `netlify/functions/submit-tip.js`
- Create: `tests/functions/submit-tip.test.js`

- [ ] **Step 1: Write failing test**
```js
// tests/functions/submit-tip.test.js
import { validateTipBody } from '../../netlify/functions/submit-tip.js';

test('validateTipBody: returns error if title missing', () => {
  const result = validateTipBody({ name: 'Anna', category: 'musik', date: '2026-03-25', address: 'Stockholm' });
  expect(result.valid).toBe(false);
  expect(result.error).toMatch(/titel/i);
});

test('validateTipBody: returns error if date missing', () => {
  const result = validateTipBody({ name: 'Anna', title: 'Test', category: 'musik', address: 'Stockholm' });
  expect(result.valid).toBe(false);
  expect(result.error).toMatch(/datum/i);
});

test('validateTipBody: returns valid for complete body', () => {
  const result = validateTipBody({ name: 'Anna', title: 'Pop-up', category: 'pop-up', date: '2026-03-28', address: 'Hornstull' });
  expect(result.valid).toBe(true);
});
```

- [ ] **Step 2: Run — verify fails**
```bash
npm test -- tests/functions/submit-tip.test.js
```

- [ ] **Step 3: Implement submit-tip.js**
```js
// netlify/functions/submit-tip.js
const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID;
const SANITY_DATASET = process.env.SANITY_DATASET ?? 'production';
const SANITY_TIP_TOKEN = process.env.SANITY_TIP_TOKEN;

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  // Note: Netlify rate-limits Functions at 125k requests/month on the free tier.
  // Since all tips require owner approval in Sanity before publishing,
  // spam submissions are harmless — no additional IP-based rate limiting is added.
  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Ogiltig JSON' }) }; }

  const validation = validateTipBody(body);
  if (!validation.valid) {
    return { statusCode: 400, body: JSON.stringify({ error: validation.error }) };
  }

  const doc = {
    _type: 'tip',
    status: 'pending',           // Always pending — never published by this endpoint
    submitterName: body.name ?? 'Anonym',
    title: body.title,
    category: body.category,
    date: body.date,
    time: body.time ?? null,
    address: body.address,
    description: body.description ?? '',
    submittedAt: new Date().toISOString(),
  };

  const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2021-10-21/data/mutate/${SANITY_DATASET}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SANITY_TIP_TOKEN}`,
    },
    body: JSON.stringify({ mutations: [{ create: doc }] }),
  });

  if (!res.ok) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Kunde inte spara tipset' }) };
  }
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};

export function validateTipBody(body) {
  if (!body.title?.trim()) return { valid: false, error: 'Titel saknas' };
  if (!body.date?.trim())  return { valid: false, error: 'Datum saknas' };
  if (!body.address?.trim()) return { valid: false, error: 'Adress saknas' };
  return { valid: true };
}
```

- [ ] **Step 4: Run — verify passes**
```bash
npm test -- tests/functions/submit-tip.test.js
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**
```bash
git add netlify/functions/submit-tip.js tests/functions/submit-tip.test.js
git commit -m "feat: add submit-tip Netlify Function with Sanity write"
```

---

## Task 11: index.html + main.js — Wire Everything Together

**Files:**
- Create: `index.html`
- Create: `js/main.js`

- [ ] **Step 1: Write index.html**
```html
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stockholm Den Här Veckan</title>
  <!-- Public Sanity config (read-only, safe to expose) -->
  <meta name="sanity-project-id" content="YOUR_PROJECT_ID">
  <meta name="sanity-public-token" content="YOUR_PUBLIC_READ_TOKEN">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>

<!-- HEADER -->
<header class="site-header">
  <div class="logo">Stockholm <small>Den här veckan</small></div>
  <div class="header-right">
    <div class="saved-count" id="savedCount">
      <svg viewBox="0 0 24 24" fill="#F0522A" stroke="#F0522A" stroke-width="1.5">
        <path d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.08C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 12 21 12 21Z"/>
      </svg>
      <span>Inga sparade</span>
    </div>
    <button class="tipsa-btn" id="tipsaBtn">+ Tipsa oss</button>
  </div>
</header>

<!-- ERROR BANNER -->
<div class="error-banner" id="errorBanner">
  Kunde inte ladda evenemang. Försök igen senare.
</div>

<!-- HERO -->
<section class="hero">
  <div class="hero-eyebrow" id="heroEyebrow">Laddar vecka...</div>
  <h1>Vad händer<br>i <em>Stockholm</em></h1>
  <p class="hero-sub">Evenemang, pop-ups, fynd och upplevelser den här veckan.</p>
</section>

<!-- WEEKLY WEATHER BAR -->
<div class="weather-bar" id="weatherBar">
  <span class="weather-bar-label">Vädret denna vecka</span>
  <!-- Injected by main.js -->
</div>

<!-- FILTERS -->
<div class="filters" role="tablist">
  <button class="filter-tab active" data-filter="allt" role="tab">Allt</button>
  <button class="filter-tab" data-filter="musik" role="tab">Musik</button>
  <button class="filter-tab" data-filter="konst" role="tab">Konst</button>
  <button class="filter-tab" data-filter="mat" role="tab">Mat & dryck</button>
  <button class="filter-tab" data-filter="pop-up" role="tab">Pop-up & marknad</button>
  <button class="filter-tab" data-filter="fynd" role="tab">Fynd & rea</button>
  <button class="filter-tab" data-filter="uteliv" role="tab">Uteliv</button>
  <button class="filter-tab" data-filter="sport" role="tab">Sport</button>
</div>

<!-- EVENT LIST -->
<main class="event-list" id="eventList" aria-live="polite">
  <!-- Injected by main.js -->
</main>

<!-- EMPTY STATE -->
<div class="empty-state" id="emptyState" hidden>
  <h3>Inga evenemang här</h3>
  <p>Prova en annan kategori — eller tipsa oss om något vi missat.</p>
</div>

<!-- TIP MODAL -->
<div class="modal-overlay" id="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
  <div class="modal">
    <h2 id="modalTitle">Tipsa oss</h2>
    <p class="modal-sub">Vet du om något vi missat? Vi granskar tipset och publicerar om det passar.</p>
    <div class="form-row">
      <div class="form-group">
        <label for="tipName">Ditt namn</label>
        <input id="tipName" type="text" placeholder="Anna Svensson">
      </div>
      <div class="form-group">
        <label for="tipCategory">Kategori</label>
        <select id="tipCategory">
          <option value="pop-up">Pop-up & marknad</option>
          <option value="musik">Musik</option>
          <option value="konst">Konst</option>
          <option value="mat">Mat & dryck</option>
          <option value="fynd">Fynd & rea</option>
          <option value="sport">Sport</option>
          <option value="uteliv">Uteliv</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="tipTitle">Evenemang <span style="color:var(--coral)">*</span></label>
      <input id="tipTitle" type="text" placeholder="Vad heter det?">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="tipDate">Datum <span style="color:var(--coral)">*</span></label>
        <input id="tipDate" type="date">
      </div>
      <div class="form-group">
        <label for="tipTime">Tid (valfritt)</label>
        <input id="tipTime" type="time">
      </div>
    </div>
    <div class="form-group">
      <label for="tipAddress">Plats/adress <span style="color:var(--coral)">*</span></label>
      <input id="tipAddress" type="text" placeholder="Adress eller område">
    </div>
    <div class="form-group">
      <label for="tipDesc">Beskriv det kort</label>
      <textarea id="tipDesc" placeholder="Vad är det? Varför ska folk gå dit?"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" id="modalClose">Avbryt</button>
      <button class="btn-submit" id="tipSubmit">Skicka tips</button>
    </div>
  </div>
</div>

<script type="module" src="/js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write js/main.js**
```js
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
    errorBanner.classList.add('visible');
    return;
  }

  // An empty result is valid (week just reset, no events yet) — render normally
  if (!events || events.length === 0) {
    eventList.innerHTML = '<p class="empty-state">Inga evenemang den här veckan — tipsa oss om något vi missat!</p>';
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
  const year = now.getFullYear();
  // ISO week number
  const jan4 = new Date(year, 0, 4);
  const weekNum = Math.ceil(((now - jan4) / 86400000 + jan4.getDay() + 1) / 7);
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
document.getElementById('tipsaBtn').addEventListener('click', () => {
  document.getElementById('modalOverlay').classList.add('open');
});
document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('modalOverlay').classList.remove('open');
});
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});
document.getElementById('tipSubmit').addEventListener('click', submitTip);

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
    if (!res.ok) throw new Error(data.error);
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
```

- [ ] **Step 3: Run all tests — full suite should pass**
```bash
npm test
```
Expected: All tests PASS

- [ ] **Step 4: Open index.html locally via Netlify Dev and verify visually**
```bash
npx netlify dev
```
Open http://localhost:8888 — confirm skeleton loads, events render, filters work, hearts save, tip modal opens.

- [ ] **Step 5: Commit**
```bash
git add index.html js/main.js js/config.js
git commit -m "feat: wire all modules into index.html — app fully functional locally"
```

---

## Task 12: Sanity CMS Setup

**Files:** (created in Sanity Studio, not in this repo)

- [ ] **Step 1: Create Sanity project**
```bash
npm create sanity@latest -- --project-name "stockholm-app" --dataset production --template clean
```
Follow prompts. Note the `projectId`.

- [ ] **Step 2: Define event schema** in the Sanity Studio project:
```js
// schemas/event.js
export default {
  name: 'event', title: 'Evenemang', type: 'document',
  fields: [
    { name: 'title',       title: 'Titel',       type: 'string',   validation: Rule => Rule.required() },
    { name: 'description', title: 'Beskrivning', type: 'text' },
    { name: 'category',    title: 'Kategori',    type: 'string',
      options: { list: ['musik','konst','mat','pop-up','fynd','uteliv','sport'] }, validation: Rule => Rule.required() },
    { name: 'date',        title: 'Datum',        type: 'date',     validation: Rule => Rule.required() },
    { name: 'time',        title: 'Tid',          type: 'string',   description: 'Format: HH:MM (valfritt)' },
    { name: 'address',     title: 'Adress',       type: 'string',   validation: Rule => Rule.required() },
    { name: 'image',       title: 'Bild',         type: 'image',    options: { hotspot: true } },
    { name: 'featured',    title: 'Lyft fram',    type: 'boolean',  initialValue: false },
    { name: 'status',      title: 'Status',       type: 'string',
      options: { list: ['published','draft'] }, initialValue: 'published' },
    { name: 'badges',      title: 'Märken',       type: 'array',
      of: [{ type: 'object', fields: [
        { name: 'type',  type: 'string', options: { list: ['popup','deal','today','free','new','night'] } },
        { name: 'label', type: 'string' },
      ]}]},
  ],
  preview: { select: { title: 'title', subtitle: 'date' } },
};
```

- [ ] **Step 3: Define tip schema:**
```js
// schemas/tip.js
export default {
  name: 'tip', title: 'Tips från läsare', type: 'document',
  fields: [
    { name: 'status',        title: 'Status',      type: 'string', options: { list: ['pending','published','rejected'] }, initialValue: 'pending' },
    { name: 'submitterName', title: 'Från',        type: 'string' },
    { name: 'title',         title: 'Titel',       type: 'string' },
    { name: 'category',      title: 'Kategori',    type: 'string' },
    { name: 'date',          title: 'Datum',       type: 'date' },
    { name: 'time',          title: 'Tid',         type: 'string' },
    { name: 'address',       title: 'Adress',      type: 'string' },
    { name: 'description',   title: 'Beskrivning', type: 'text' },
    { name: 'submittedAt',   title: 'Skickat',     type: 'datetime', readOnly: true },
  ],
};
```

- [ ] **Step 4: Create two API tokens in Sanity dashboard:**
  - **Public read token:** Viewer role, dataset: production → copy to `SANITY_PUBLIC_TOKEN`
  - **Tip write token:** Custom role, `create` permission on `tip` document only → copy to `SANITY_TIP_TOKEN`

- [ ] **Step 5: Update index.html meta tags with real project ID and public token**

- [ ] **Step 6: Commit**
```bash
git add index.html
git commit -m "chore: add Sanity project ID and public token to meta tags"
```

---

## Task 13: Deploy to Netlify

- [ ] **Step 1: Push repo to GitHub**
```bash
git remote add origin https://github.com/YOUR_USERNAME/stockholm-app.git
git push -u origin main
```

- [ ] **Step 2: Connect to Netlify**
  - Go to app.netlify.com → Add new site → Import from GitHub
  - Select the repo
  - Build command: *(leave empty — no build step)*
  - Publish directory: `.`
  - Click Deploy

- [ ] **Step 3: Set environment variables in Netlify dashboard**
  - `TICKETMASTER_KEY`
  - `BANDSINTOWN_KEY` *(skip if Bandsintown API access was unavailable — Sanity handles small-venue music instead)*
  - `SANITY_PROJECT_ID`
  - `SANITY_DATASET` = `production`
  - `SANITY_TIP_TOKEN`
  > **Note on `SANITY_PUBLIC_TOKEN`:** This is a read-only public token embedded directly in `index.html` as a `<meta>` tag (set in Task 12 Step 5). It ends up in source control — this is an accepted trade-off since it has no write permissions and can only read already-published events. Do not store it as a Netlify env var; it is intentionally public.

- [ ] **Step 4: Verify deployment**
  - Open the Netlify URL
  - Confirm events load from all sources
  - Confirm weather icons appear
  - Confirm filters work
  - Confirm heart saves persist on refresh
  - Submit a test tip and verify it appears in Sanity Studio as `pending`

- [ ] **Step 5: Final commit**
```bash
git commit --allow-empty -m "chore: deployed to Netlify"
```

---

## Running All Tests

```bash
npm test
```

Expected output:
```
PASS tests/save.test.js (5 tests)
PASS tests/weather.test.js (9 tests)
PASS tests/render.test.js (7 tests)
PASS tests/events.test.js (8 tests)
PASS tests/functions/events.test.js (3 tests)
PASS tests/functions/submit-tip.test.js (3 tests)

Test Suites: 6 passed
Tests:       35 passed
```
