const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN;
const THETVDB_API_KEY = process.env.THETVDB_API_KEY;
const THETVDB_PIN = process.env.THETVDB_PIN || '';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bazujvpppbxxiymxweiq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_y6uiZr53J-ZtPCWDRNEvjw_x-ZGU-mi';
let theTvdbToken = null;
let theTvdbTokenExpiresAt = 0;

app.disable('x-powered-by');
app.set('trust proxy', 1);

const securityHeaders = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' https://cdn.jsdelivr.net",
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://bazujvpppbxxiymxweiq.supabase.co wss://bazujvpppbxxiymxweiq.supabase.co",
      'upgrade-insecure-requests'
    ].join('; ')
  );
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
};
app.use(securityHeaders);

const rateBuckets = new Map();
const RATE_BUCKET_MAX_KEYS = 10000;
function fixedWindowRateLimit({windowMs, max, prefix}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = prefix + ':' + (req.ip || req.socket.remoteAddress || 'unknown');
    let bucket = rateBuckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = {count:0, resetAt:now + windowMs};
      rateBuckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({error:'Muitas requisições. Tente novamente em instantes.'});
    }
    if (rateBuckets.size > RATE_BUCKET_MAX_KEYS) {
      for (const [k, v] of rateBuckets) {
        if (now >= v.resetAt) rateBuckets.delete(k);
        if (rateBuckets.size <= RATE_BUCKET_MAX_KEYS) break;
      }
    }
    next();
  };
}
app.use('/api', fixedWindowRateLimit({windowMs:60 * 1000, max:180, prefix:'api'}));

const verifiedApiTokens = new Map();
const API_TOKEN_CACHE_MAX = 5000;
async function requireAuthenticatedApiUser(req, res, next) {
  if (req.path === '/health') return next();

  const token = String(req.get('x-bingeo-session') || '');
  if (token.length < 20 || token.length > 4096 || /\s/.test(token)) {
    return res.status(401).json({error:'Autenticação necessária.'});
  }
  const cacheKey = crypto.createHash('sha256').update(token).digest('hex');
  const now = Date.now();
  const cachedUntil = verifiedApiTokens.get(cacheKey) || 0;
  if (cachedUntil > now) return next();

  try {
    const response = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: 'Bearer ' + token,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!response.ok) {
      return res.status(401).json({error:'Sessão inválida ou expirada.'});
    }

    verifiedApiTokens.set(cacheKey, now + 60000);
    if (verifiedApiTokens.size > API_TOKEN_CACHE_MAX) {
      for (const [key, expiresAt] of verifiedApiTokens) {
        if (expiresAt <= now) verifiedApiTokens.delete(key);
        if (verifiedApiTokens.size <= API_TOKEN_CACHE_MAX) break;
      }
    }
    return next();
  } catch (error) {
    console.error('Falha ao validar sessão da API:', error && error.message ? error.message : 'erro desconhecido');
    return res.status(503).json({error:'Não foi possível validar a sessão agora.'});
  }
}
app.use('/api', requireAuthenticatedApiUser);

function safeProxyPath(raw) {
  const value = String(raw || '');
  if (!value || value.length > 240) return null;
  if (value.includes('..') || value.includes('\\') || value.includes('?') || value.includes('#')) return null;
  if (!/^[A-Za-z0-9._/-]+$/.test(value)) return null;
  return value.replace(/^\/+/, '');
}
function safeProxyQuery(queryObject) {
  const entries = Object.entries(queryObject || {});
  if (entries.length > 24) return null;
  const query = new URLSearchParams();
  for (const [key, raw] of entries) {
    if (!/^[A-Za-z0-9_.-]{1,80}$/.test(key)) return null;
    const values = Array.isArray(raw) ? raw : [raw];
    if (values.length > 12) return null;
    for (const value of values) {
      if (value == null) continue;
      const text = String(value);
      if (text.length > 500) return null;
      query.append(key, text);
    }
  }
  return query.toString().length <= 2200 ? query : null;
}


const APP_MODULE_FILES = [
  'js/modules/00-auth.js',
  'js/modules/10-catalog.js',
  'js/modules/20-state-data.js',
  'js/modules/30-integrations.js',
  'js/modules/40-ui-components.js',
  'js/modules/50-discover-library.js',
  'js/modules/60-lists.js',
  'js/modules/65-pro-features.js',
  'js/modules/67-review-system.js',
  'js/modules/70-profile.js',
  'js/modules/80-evaluations-modal.js',
  'js/modules/90-render-uploads.js',
  'js/modules/95-events.js',
  'js/modules/99-boot.js'
];

function buildAppBundle() {
  const parts = APP_MODULE_FILES.map((relativePath) => {
    const absolutePath = path.join(__dirname, 'public', relativePath);
    const source = fs.readFileSync(absolutePath, 'utf8');
    return '\n/* ===== ' + relativePath + ' ===== */\n' + source;
  });
  return '(function(){\n' + parts.join('\n') + '\n})();\n';
}

const APP_BUNDLE = buildAppBundle();

app.get('/js/app.bundle.js', (_req, res) => {
  res.type('application/javascript');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(APP_BUNDLE);
});
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  setHeaders(res, filePath) {
    if (/\.(?:html|css|js)$/i.test(filePath)) {
      // HTML, CSS e JS precisam permanecer sincronizados entre deploys.
      // Revalidação evita que markup novo seja combinado com estilos/scripts antigos.
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

  const tmdbPath = safeProxyPath(req.params[0]);
  const query = safeProxyQuery(req.query);
  if (!tmdbPath || query === null) {
    return res.status(400).json({error:'Requisição TMDB inválida.'});
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
    if (response.ok) res.set('Cache-Control', 'private, max-age=300');
    res.send(body);
  } catch (error) {
    console.error('Erro ao acessar TMDB:', error);
    res.status(502).json({ error: 'Não foi possível acessar a TMDB.' });
  }
});

app.get(/^\/api\/tvmaze\/(.*)/, async (req, res) => {
  const tvmazePath = safeProxyPath(req.params[0]);
  const query = safeProxyQuery(req.query);
  if (!tvmazePath || query === null) {
    return res.status(400).json({error:'Requisição TVmaze inválida.'});
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
      res.set('Cache-Control', 'private, max-age=3600');
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

  const tvdbPath = safeProxyPath(req.params[0]);
  const query = safeProxyQuery(req.query);
  if (!tvdbPath || query === null) {
    return res.status(400).json({error:'Requisição TheTVDB inválida.'});
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
      res.set('Cache-Control', 'private, max-age=3600');
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

  if (!search || search.length > 120) {
    return res.status(400).json({ error: 'Título do anime é obrigatório.' });
  }

  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(
          search: $search,
          type: ANIME,
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
          synonyms
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
        variables: { search }
      }),
      signal: AbortSignal.timeout(12000)
    });

    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');

    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) res.set('Retry-After', retryAfter);

    if (response.ok) {
      res.set('Cache-Control', 'private, max-age=86400');
    }

    res.send(body);
  } catch (error) {
    console.error('Erro ao acessar AniList:', error);
    res.status(502).json({ error: 'Não foi possível acessar a AniList.' });
  }
});

app.get('/api/anilist/characters/search', async (req, res) => {
  const search = String(req.query.q || '').trim();
  if (!search || search.length > 120) return res.status(400).json({ error: 'Nome do personagem inválido.' });

  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        characters(search: $search, sort: SEARCH_MATCH) {
          id
          name { full native alternative alternativeSpoiler }
          image { large medium }
          favourites
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'Bingeo/1.0' },
      body: JSON.stringify({ query, variables: { search } }),
      signal: AbortSignal.timeout(12000)
    });
    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) res.set('Retry-After', retryAfter);
    if (response.ok) res.set('Cache-Control', 'private, max-age=86400');
    res.send(body);
  } catch (error) {
    console.error('Erro ao acessar personagens da AniList:', error);
    res.status(502).json({ error: 'Não foi possível acessar os personagens da AniList.' });
  }
});

app.get('/api/jikan/characters/search', async (req, res) => {
  const search = String(req.query.q || '').trim();
  if (!search || search.length > 120) return res.status(400).json({ error: 'Nome do personagem inválido.' });

  const params = new URLSearchParams({ q: search, limit: '10', order_by: 'favorites', sort: 'desc' });
  try {
    const response = await fetch('https://api.jikan.moe/v4/characters?' + params.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'Bingeo/1.0' },
      signal: AbortSignal.timeout(12000)
    });
    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) res.set('Retry-After', retryAfter);
    if (response.ok) res.set('Cache-Control', 'private, max-age=86400');
    res.send(body);
  } catch (error) {
    console.error('Erro ao pesquisar personagem na Jikan:', error);
    res.status(502).json({ error: 'Não foi possível acessar a Jikan.' });
  }
});

app.get('/api/jikan/characters/:malId/pictures', async (req, res) => {
  const malId = String(req.params.malId || '').trim();
  if (!/^\d+$/.test(malId)) return res.status(400).json({ error: 'ID de personagem inválido.' });

  try {
    const response = await fetch('https://api.jikan.moe/v4/characters/' + encodeURIComponent(malId) + '/pictures', {
      headers: { Accept: 'application/json', 'User-Agent': 'Bingeo/1.0' },
      signal: AbortSignal.timeout(12000)
    });
    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) res.set('Retry-After', retryAfter);
    if (response.ok) res.set('Cache-Control', 'private, max-age=86400');
    res.send(body);
  } catch (error) {
    console.error('Erro ao buscar imagens do personagem na Jikan:', error);
    res.status(502).json({ error: 'Não foi possível acessar as imagens da Jikan.' });
  }
});

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  tmdbConfigured: !!TMDB_READ_TOKEN,
  tvmazeConfigured: true,
  thetvdbConfigured: !!THETVDB_API_KEY,
  anilistConfigured: true,
  jikanConfigured: true
}));


app.listen(PORT, () => console.log('Bingeo rodando na porta ' + PORT));
