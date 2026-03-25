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
