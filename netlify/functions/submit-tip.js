const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID;
const SANITY_DATASET = process.env.SANITY_DATASET ?? 'production';
const SANITY_TIP_TOKEN = process.env.SANITY_TIP_TOKEN;

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!SANITY_PROJECT_ID || !SANITY_TIP_TOKEN) {
    console.error('Missing required env vars: SANITY_PROJECT_ID, SANITY_TIP_TOKEN');
    return { statusCode: 500, body: JSON.stringify({ error: 'Serverkonfigurationsfel' }) };
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
    submitterName: (body.name ?? 'Anonym').trim(),
    title: body.title.trim(),
    category: body.category,
    date: body.date.trim(),
    time: body.time ?? null,
    address: body.address.trim(),
    description: (body.description ?? '').trim(),
    submittedAt: new Date().toISOString(),
  };

  const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2021-10-21/data/mutate/${SANITY_DATASET}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SANITY_TIP_TOKEN}`,
      },
      body: JSON.stringify({ mutations: [{ create: doc }] }),
    });
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: 'Kunde inte spara tipset' }) };
  }

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
