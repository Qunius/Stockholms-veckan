const TICKETMASTER_KEY = process.env.TICKETMASTER_KEY;
// BANDSINTOWN_KEY is optional — if absent, Bandsintown is skipped and
// small-venue music is added manually via Sanity CMS instead.
const BANDSINTOWN_KEY = process.env.BANDSINTOWN_KEY;
const TIMEOUT_MS = 8000;

export const handler = async () => {
  const week = getISOWeekRange();
  const sources = [
    fetchWithTimeout(ticketmasterUrl(week), TIMEOUT_MS, 'ticketmaster'),
    fetchWithTimeout(visitStockholmUrl(week), TIMEOUT_MS, 'visitstockholm'),
    ...(BANDSINTOWN_KEY ? [fetchWithTimeout(bandsintownUrl(week), TIMEOUT_MS, 'bandsintown')] : []),
  ];
  const results = await Promise.allSettled(sources);
  const [tm, vs, bt] = results;

  // Check if all sources failed
  const allFailed = [tm, vs, ...(bt ? [bt] : [])].every(r => r?.status === 'rejected');
  if (allFailed) {
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'all upstream sources failed' }),
    };
  }

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

async function fetchWithTimeout(url, ms, source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json().then(d => extractEvents(source, d));
  } finally {
    clearTimeout(timer);
  }
}

function extractEvents(source, data) {
  if (source === 'ticketmaster') return data._embedded?.events ?? [];
  if (source === 'visitstockholm') return data.result ?? data.events ?? [];
  if (source === 'bandsintown') return Array.isArray(data) ? data : [];
  return [];
}

function ticketmasterUrl(week) {
  return `https://app.ticketmaster.com/discovery/v2/events.json`
    + `?apikey=${TICKETMASTER_KEY}`
    + `&city=Stockholm&countryCode=SE`
    + `&startDateTime=${week.start}Z&endDateTime=${week.end}Z`
    + `&size=50`;
}

function visitStockholmUrl(week) {
  return `https://www.visitstockholm.com/open-api/events/?start=${week.startDate}&end=${week.endDate}`;
}

function bandsintownUrl(week) {
  return `https://rest.bandsintown.com/v1.0/city/Stockholm/events`
    + `?app_id=${BANDSINTOWN_KEY}`
    + `&date=${week.startDate}%2C${week.endDate}`;
}

function getISOWeekRange() {
  const tz = 'Europe/Stockholm';
  // Get today's date in Stockholm timezone
  const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [y, m, d] = todayStr.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const pad = n => String(n).padStart(2, '0');

  const monDate = new Date(y, m - 1, d + diffToMon);
  const sunDate = new Date(y, m - 1, d + diffToMon + 6);
  const fmt = dt => `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
  const monStr = fmt(monDate);
  const sunStr = fmt(sunDate);

  // Convert Stockholm local time to true UTC for Ticketmaster ISO timestamps.
  // Stockholm uses UTC+1 (CET) or UTC+2 (CEST) — try both offsets.
  const toUTC = (dateStr, timeStr) => {
    const target = `${dateStr} ${timeStr}`;
    const [yr, mo, da] = dateStr.split('-').map(Number);
    const [hr, mn, sc] = timeStr.split(':').map(Number);
    for (const offsetH of [1, 2]) {
      const candidate = new Date(Date.UTC(yr, mo - 1, da, hr - offsetH, mn, sc));
      const check = candidate.toLocaleString('sv-SE', { timeZone: tz });
      if (check.startsWith(target)) return candidate.toISOString().slice(0, 19);
    }
    // Fallback: assume CET (+1)
    return new Date(Date.UTC(yr, mo - 1, da, hr - 1, mn, sc)).toISOString().slice(0, 19);
  };

  return {
    start: toUTC(monStr, '00:00:00'),
    end: toUTC(sunStr, '23:59:59'),
    startDate: monStr,
    endDate: sunStr,
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
    categoryLabel: { musik:'Musik', sport:'Sport', konst:'Konst', uteliv:'Uteliv' }[category] ?? 'Uteliv',
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
