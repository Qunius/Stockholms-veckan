# Stockholm Den Här Veckan — Design Spec
**Date:** 2026-03-23
**Phase:** 1 of 2 (Events Guide)
**Status:** Approved

---

## Overview

A Stockholm city guide web app targeting 18–35 year olds who find Stockholm boring and need a weekly curated feed of things to do. The app shows events, pop-ups, sales, markets, and local happenings in Swedish, with real-time weather per event, category filters, and a save/heart feature.

Phase 2 (community layer with karma, in-app sharing, user profiles) is scoped at the end but not built in this phase.

---

## Target User

- Age 18–35, lives in or visits Stockholm
- Has time and money but feels Stockholm is boring
- Wants discovery, not a tourist guide — pop-ups, lagertömningar, loppisar, concerts, galleries
- Swedish-speaking primary audience

---

## Design

**Style:** Scandinavian editorial. Off-white background (`#F8F7F4`), Georgia serif for headings, system sans-serif for body. Generous whitespace. Bold indigo (`#5B3FE8`) as primary accent, coral (`#F0522A`) for saved/hearts, amber for weather icons.

**Language:** Swedish throughout (UI, labels, copy, dates).

**Layout:** Sticky header → hero section → weekly weather bar → sticky filter tabs → event list.

---

## Features — Phase 1

### Event List
- Each event card: photo, category + date/time badges, title, description, clickable address (opens maps), weather icon + temperature, heart/save button
- Featured event at top with left border accent — determined by a `featured: true` flag set in Sanity CMS by the owner
- Events from APIs sorted chronologically; past events from the current week are hidden
- **Week definition:** ISO week (Monday 00:00 Europe/Stockholm → Sunday 23:59). Page shows events for the current ISO week only. On Monday, the week resets automatically.

### Weather Per Event
- SVG icons: sun, partly cloudy, cloud, rain, snow, night-clear
- Placed in right column alongside save button; weekly bar in header shows Mon–Sun
- **Data source:** Open-Meteo hourly forecast API (free, no key)
- **Matching logic:**
  - Single-day events: use the event's listed start hour. If no time listed, use 12:00.
  - Multi-day events: use the first day at 12:00
  - Events beyond 7 days: weather icon hidden (Open-Meteo limit)
  - **Timezone:** All times treated as Europe/Stockholm (UTC+1 winter, UTC+2 summer). Converted to UTC before querying Open-Meteo.

### Filters
- Sticky tab bar: Allt, Musik, Konst, Mat & dryck, Pop-up & marknad, Fynd & rea, Uteliv, Sport
- Instant client-side filtering
- Empty state ("Inga evenemang här — tipsa oss om något vi missat") shown if no events match

### Save / Heart
- Heart button per event, toggles saved state
- Label switches between "Spara" / "Sparat"
- Saved count shown in header
- Persisted to `localStorage`
- **Empty saved state:** If user has 0 saves and views the saved section: "Du har inte sparat något än. Klicka på hjärtat på ett evenemang för att spara det."

### Tipsa Oss
- "+ Tipsa oss" button in header opens a modal
- Form fields: name (text), category (select), event title (text), date (date picker), time (time picker, optional), location/address (text), description (textarea)
- **Submission flow:** Form data POSTed to a Netlify Function (`/api/submit-tip`) which sets `status: "pending"` server-side before writing to Sanity. The restricted Sanity token lives only in the Netlify Function environment — never in client JS.
- Owner notified via Sanity webhook email → reviews in Sanity Studio → publishes
- Nothing goes live without approval

### Addresses / Maps
- Every event address uses a universal Google Maps URL: `https://maps.google.com/?q=<encoded address>`
- Works on all platforms (iOS, Android, desktop). On iOS, Safari will offer to open in Apple Maps via its own prompt.

### Photos
- Ticketmaster and Sanity events supply image URLs directly
- Visit Stockholm images used when available
- **Fallback:** Per-category SVG illustration (music note, palette, fork, shopping bag etc.) used when no image is available. No broken image states.

### Error States
- If an API fetch fails: that source's events are silently omitted; other sources still render
- If Open-Meteo fails: weather icons hidden for all events, no error shown to user
- If Sanity fetch fails: curated events omitted, featured slot falls back to first chronological event
- A global error banner is shown only if ALL sources fail simultaneously: "Kunde inte ladda evenemang. Försök igen senare."

---

## Data Sources

| Source | What it provides | Key required | Fetched via |
|--------|-----------------|-------------|-------------|
| Ticketmaster Discovery API | Concerts, theatre, sports | Yes | Netlify Function |
| Bandsintown API | Live music, gigs, smaller venues | Yes | Netlify Function |
| Visit Stockholm Open Data | City events, culture, festivals | No | Netlify Function (CORS safety) |
| Open-Meteo | Hourly weather forecast | No | Direct browser fetch |
| Sanity CMS | Curated local events (pop-ups, loppisar, lagertömningar, Fynd & rea) + approved user tips | Yes | Direct browser fetch (read-only public token) |

**Note on music APIs:** Songkick is excluded — their public API is closed to new applicants. Bandsintown's API has also been restricted; confirm a valid key is obtainable before development begins. If Bandsintown is unavailable, small-venue live music is added manually via Sanity CMS instead — Ticketmaster covers major concerts regardless.

**Fynd & rea category** is populated exclusively from Sanity CMS (owner-curated sales, lagertömningar). It will sometimes be empty if the owner has not added entries that week.

---

## Architecture

**Type:** Multi-file vanilla HTML/CSS/JS. No build tool, no framework.

```
/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js         # App entry, orchestrates modules
│   ├── weather.js      # Open-Meteo fetch + icon mapper + timezone handling
│   ├── events.js       # Fetches /api/events (Netlify Function), merges + deduplicates
│   ├── render.js       # Builds event card HTML
│   ├── filters.js      # Filter tab logic
│   └── save.js         # localStorage save/heart logic
├── netlify/
│   └── functions/
│       ├── events.js   # Proxies Ticketmaster + Bandsintown + Visit Stockholm, merges results
│       └── submit-tip.js # Receives tip form, sets status:pending, writes to Sanity
└── assets/
    └── icons/          # SVG weather icons + category fallback illustrations
```

**Data flow:**
1. Page loads → `main.js` calls `/api/events` (Netlify Function) and Open-Meteo in parallel
2. Skeleton placeholders shown while loading
3. Events render as data arrives; saved state restored from `localStorage`
4. Weather icons matched to each event after render
5. Tip submissions POST to `/api/submit-tip`

**API keys** live only in Netlify environment variables — never in client-side JS.

---

## Deployment

- **Host:** Netlify (free tier)
- **Netlify Functions:** Handle API proxying and tip submission
- **Auto-deploy:** Push to `main` → live in ~30 seconds
- **Environment variables set in Netlify dashboard:**
  - `TICKETMASTER_KEY` — Ticketmaster Discovery API key (server-only)
  - `BANDSINTOWN_KEY` — Bandsintown API key (server-only)
  - `SANITY_TIP_TOKEN` — Sanity token used **only** in `submit-tip.js` to create tip documents. Minimum permission: custom role restricted to `create` on the `tip` document type only. Never used client-side.
  - `SANITY_PUBLIC_TOKEN` — Read-only public Sanity token used in browser JS to fetch published events. No write permissions.

### Caching
- `/api/events` Netlify Function caches merged API results for **15 minutes** using `Cache-Control: s-maxage=900` response headers, served by Netlify's CDN edge cache
- This means ~4 upstream API calls per hour per region regardless of visitor count, staying well within free-tier quotas
- Open-Meteo is called directly from the browser and is rate-limit-free

### Function Timeout Handling
- `/api/events` sets a 8-second per-source timeout (within Netlify's 10s limit)
- Each upstream (Ticketmaster, Bandsintown, Visit Stockholm) is fetched in parallel with `Promise.allSettled` — a slow or failed source is omitted, not waited on
- If the function itself returns a non-200, the client falls back to Sanity-only events and shows a subtle notice: "Visar bara redaktionella evenemang just nu"

---

## Out of Scope — Phase 1

- User accounts / login
- Community feed, karma, in-app sharing, profiles
- Photo uploads by users
- Push notifications
- Mobile app (native)

---

## Phase 2 — Social Layer (Future)

Not built in Phase 1. High-level scope for reference:

- **User accounts:** Email or Google login via Clerk or Supabase Auth
- **Community feed:** Users share events with a comment; others upvote/downvote
- **Karma system:** Earned by approved tip submissions (+100 per tip), shares receiving upvotes (+5 per upvote), follower growth
- **User profiles:** Karma score + breakdown, tips submitted, shares, followers/following
- **Feed tabs:** Senaste, Populärt, Följer
- **Additional tech required:** Auth provider, Supabase database (posts, votes, follows), image storage for user uploads

---

## API Keys Needed (Phase 1)

| Service | Where to register | Cost |
|---------|------------------|------|
| Ticketmaster Discovery | developer.ticketmaster.com | Free |
| Bandsintown | artists.bandsintown.com/api | Free |
| Sanity | sanity.io | Free tier |
| Open-Meteo | open-meteo.com | No key needed |
| Visit Stockholm | visitstockholm.com/open-api | Free |
