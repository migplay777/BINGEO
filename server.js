const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN;

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

app.get('/api/health', (_req, res) => res.json({ ok: true }));


app.listen(PORT, () => console.log('Bingeo rodando na porta ' + PORT));
