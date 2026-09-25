const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN;
const THETVDB_API_KEY = process.env.THETVDB_API_KEY;
const THETVDB_PIN = process.env.THETVDB_PIN || '';
let theTvdbToken = null;
let theTvdbTokenExpiresAt = 0;

app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      // O HTML não pode ficar preso em cache, senão o usuário pode continuar
      // vendo uma versão antiga mesmo depois de um novo deploy.
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

app.get(/^\/api\/tmdb\/(.*)/, async (req, res) => {
  if (!TMDB_READ_TOKEN) {
    return res.status(500).json({ error: 'TMDB não configurado no servidor.' });
  }

  const tmdbPath = req.params[0] || '';
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (Array.isArray(value)) value.forEach(v => query.append(key, v));
    else if (value != null) query.append(key, value);
  }

  const url = 'https://api.themoviedb.org/3/' + tmdbPath + (query.toString() ? '?' + query.toString() : '');

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: 'Bearer ' + TMDB_READ_TOKEN,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });
    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');
    if (response.ok) res.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.send(body);
  } catch (error) {
    console.error('Erro ao acessar TMDB:', error);
    res.status(502).json({ error: 'Não foi possível acessar a TMDB.' });
  }
});

app.get(/^\/api\/tvmaze\/(.*)/, async (req, res) => {
  const tvmazePath = req.params[0] || '';
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(req.query)) {
    if (Array.isArray(value)) value.forEach(v => query.append(key, v));
    else if (value != null) query.append(key, value);
  }

  const url = 'https://api.tvmaze.com/' + tvmazePath +
    (query.toString() ? '?' + query.toString() : '');

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Bingeo/1.0'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });

    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');

    if (response.ok) {
      res.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    }

    res.send(body);
  } catch (error) {
    console.error('Erro ao acessar TVmaze:', error);
    res.status(502).json({ error: 'Não foi possível acessar a TVmaze.' });
  }
});

async function getTheTvdbToken(forceRefresh = false) {
  if (!THETVDB_API_KEY) {
    const error = new Error('TheTVDB não configurado no servidor.');
    error.statusCode = 500;
    throw error;
  }

  if (!forceRefresh && theTvdbToken && Date.now() < theTvdbTokenExpiresAt) {
    return theTvdbToken;
  }

  const payload = { apikey: THETVDB_API_KEY };
  if (THETVDB_PIN) payload.pin = THETVDB_PIN;

  const response = await fetch('https://api4.thetvdb.com/v4/login', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Bingeo/1.0'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000)
  });

  const body = await response.json().catch(() => null);
  const token = body && body.data && body.data.token;

  if (!response.ok || !token) {
    const error = new Error(
      (body && (body.message || body.error)) ||
      'Não foi possível autenticar na TheTVDB.'
    );
    error.statusCode = response.status || 502;
    throw error;
  }

  theTvdbToken = token;
  // TheTVDB documents a one-month token lifetime. Refresh a little earlier.
  theTvdbTokenExpiresAt = Date.now() + (27 * 24 * 60 * 60 * 1000);
  return theTvdbToken;
}

async function fetchTheTvdb(url, forceRefresh = false) {
  const token = await getTheTvdbToken(forceRefresh);
  return fetch(url, {
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      'User-Agent': 'Bingeo/1.0'
    },
    signal: AbortSignal.timeout(12000)
  });
}

app.get(/^\/api\/thetvdb\/(.*)/, async (req, res) => {
  if (!THETVDB_API_KEY) {
    return res.status(503).json({ error: 'TheTVDB não configurado no servidor.' });
  }

  const tvdbPath = req.params[0] || '';
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(req.query)) {
    if (Array.isArray(value)) value.forEach(v => query.append(key, v));
    else if (value != null) query.append(key, value);
  }

  const url = 'https://api4.thetvdb.com/v4/' + tvdbPath +
    (query.toString() ? '?' + query.toString() : '');

  try {
    let response = await fetchTheTvdb(url);

    // Token can be revoked/expired before our local cache expires.
    if (response.status === 401) {
      theTvdbToken = null;
      theTvdbTokenExpiresAt = 0;
      response = await fetchTheTvdb(url, true);
    }

    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');

    if (response.ok) {
      res.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    }

    res.send(body);
  } catch (error) {
    console.error('Erro ao acessar TheTVDB:', error);
    res.status(error.statusCode || 502).json({
      error: error.message || 'Não foi possível acessar a TheTVDB.'
    });
  }
});

app.get('/api/anilist/search', async (req, res) => {
  const search = String(req.query.q || '').trim();
  const year = Number(req.query.year || 0) || null;

  if (!search) {
    return res.status(400).json({ error: 'Título do anime é obrigatório.' });
  }

  const query = `
    query ($search: String, $year: Int) {
      Page(page: 1, perPage: 8) {
        media(
          search: $search,
          type: ANIME,
          seasonYear: $year,
          sort: SEARCH_MATCH
        ) {
          id
          idMal
          title {
            romaji
            english
            native
            userPreferred
          }
          seasonYear
          startDate {
            year
          }
          format
          countryOfOrigin
          coverImage {
            extraLarge
            large
            medium
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Bingeo/1.0'
      },
      body: JSON.stringify({
        query,
        variables: {
          search,
          year
        }
      }),
      signal: AbortSignal.timeout(12000)
    });

    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');

    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) res.set('Retry-After', retryAfter);

    if (response.ok) {
      res.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    }

    res.send(body);
  } catch (error) {
    console.error('Erro ao acessar AniList:', error);
    res.status(502).json({ error: 'Não foi possível acessar a AniList.' });
  }
});

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  tmdbConfigured: !!TMDB_READ_TOKEN,
  tvmazeConfigured: true,
  thetvdbConfigured: !!THETVDB_API_KEY,
  anilistConfigured: true
}));


app.listen(PORT, () => console.log('Bingeo rodando na porta ' + PORT));
