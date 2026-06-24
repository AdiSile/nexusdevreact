const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Configurare dotenv (opțional, nu crapă dacă lipsește .env)
// ---------------------------------------------------------------------------
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (_) {
  // dotenv este opțional; ignorăm eroarea silențios
}

// ---------------------------------------------------------------------------
// Inițializare Express
// ---------------------------------------------------------------------------
const app = express();

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// Trust proxy (necesar pentru rate limiting corect în spatele unui reverse proxy)
// ---------------------------------------------------------------------------
if (isProduction) {
  app.set('trust proxy', 1);
}

// ---------------------------------------------------------------------------
// Securitate cu Helmet
// ---------------------------------------------------------------------------
app.use(
  helmet({
    // CSP dezactivat pentru flexibilitate (conform specificației proiectului)
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// ---------------------------------------------------------------------------
// CORS restrictiv
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : [
      'http://localhost:3000',
      'http://localhost:4000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4000',
    ];

app.use(
  cors({
    origin(origin, callback) {
      // Permite cereri fără origin (Postman, curl, server-to-server)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`[CORS] Origin respins: ${origin}`);
      return callback(null, false);
    },
    credentials: true, // necesar pentru cookie-uri
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 ore cache preflight
  })
);

// ---------------------------------------------------------------------------
// Parsare body & cookie-uri
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Logging HTTP (doar în development)
// ---------------------------------------------------------------------------
if (!isProduction) {
  app.use(morgan('dev'));
}

// ---------------------------------------------------------------------------
// Rate limiting global
// ---------------------------------------------------------------------------
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minut
  max: 300,                // maxim 300 cereri pe minut per IP
  standardHeaders: true,   // RateLimit-* headers
  legacyHeaders: false,    // fără X-RateLimit-*
  message: {
    error: 'TooManyRequests',
    message: 'Prea multe cereri. Încearcă din nou peste un minut.',
  },
});

app.use('/api/', globalLimiter);

// ---------------------------------------------------------------------------
// Rate limiting strict pentru autentificare (anti-bruteforce HTTP)
// ---------------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minut
  max: 20,                 // maxim 20 încercări pe minut per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    error: 'TooManyRequests',
    message: 'Prea multe încercări de autentificare. Încearcă din nou peste un minut.',
  },
});

// ---------------------------------------------------------------------------
// Rute API
// ---------------------------------------------------------------------------

// Importă rutele
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');

// Montează rutele (auth are rate limiting suplimentar)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/settings', settingsRoutes);

// Ruta contact va fi adăugată când fișierul există
try {
  const contactRoutes = require('./routes/contact');
  app.use('/api/contact', contactRoutes);
} catch (_) {
  console.log('[Server] Ruta /api/contact nu este încă disponibilă.');
}

// ---------------------------------------------------------------------------
// Health-check
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
  });
});

// ---------------------------------------------------------------------------
// Servire frontend static (Next.js export) în producție
// ---------------------------------------------------------------------------
if (isProduction) {
  const frontendBuild = path.join(__dirname, '..', 'frontend', 'out');

  if (fs.existsSync(frontendBuild)) {
    // Servește asset-urile statice (JS, CSS, imagini, fonts etc.)
    app.use(
      express.static(frontendBuild, {
        maxAge: '7d',
        etag: true,
        // Nu servi fișiere .html din static pentru a lăsa catch-all-ul
        // să gestioneze clean URLs corect
        extensions: [],
      })
    );

    // -----------------------------------------------------------------------
    // Catch-all pentru Next.js static export
    // Rezolvă clean URLs specific Next.js (fără .html în URL)
    // -----------------------------------------------------------------------
    app.get('*', (req, res, next) => {
      // Nu intercepta cererile API — sunt deja montate înaintea acestui handler
      if (req.path.startsWith('/api/')) {
        return next();
      }

      const reqPath = req.path === '/' ? '/index' : req.path.replace(/\/$/, '');

      // 1) Încearcă fișierul .html corespunzător (ex: /about → /about.html)
      const htmlFile = path.join(frontendBuild, `${reqPath}.html`);
      if (fs.existsSync(htmlFile)) {
        return res.sendFile(htmlFile);
      }

      // 2) Încearcă index.html în directorul corespunzător (ex: /blog → /blog/index.html)
      const indexFile = path.join(frontendBuild, reqPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        return res.sendFile(indexFile);
      }

      // 3) Fallback 404 — pagina de eroare Next.js, dacă există
      const notFoundFile = path.join(frontendBuild, '404.html');
      if (fs.existsSync(notFoundFile)) {
        return res.status(404).sendFile(notFoundFile);
      }

      // 4) Ultimul fallback: index.html (SPA / aplicații care nu au 404.html)
      const spaIndex = path.join(frontendBuild, 'index.html');
      if (fs.existsSync(spaIndex)) {
        return res.sendFile(spaIndex);
      }

      // 5) Nimic găsit — pasăm mai departe
      next();
    });

    console.log(`[Server] Se servesc fișierele statice (Next.js) din: ${frontendBuild}`);
  } else {
    console.warn(
      `[Server] Directorul frontend/out (${frontendBuild}) nu există. Rulează 'npm run build' mai întâi.`
    );
  }
}

// ---------------------------------------------------------------------------
// Error handling 404
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  if (res.headersSent) return;
  res.status(404).json({
    error: 'NotFound',
    message: 'Resursa solicitată nu există.',
  });
});

// ---------------------------------------------------------------------------
// Error handling global
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error('[Server] Eroare globală:', err);

  if (res.headersSent) return;

  const status = err.status || err.statusCode || 500;
  const message = isProduction
    ? 'A apărut o eroare internă.'
    : err.message || 'A apărut o eroare internă.';

  res.status(status).json({
    error: err.name || 'InternalServerError',
    message,
  });
});

// ---------------------------------------------------------------------------
// Pornire server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n🚀 Nexus Dev Studio Backend`);
  console.log(`   Mediu:      ${NODE_ENV}`);
  console.log(`   Port:       ${PORT}`);
  console.log(`   URL:        http://localhost:${PORT}`);
  console.log(`   API:        http://localhost:${PORT}/api`);
  console.log(`   Health:     http://localhost:${PORT}/api/health\n`);
});

module.exports = app;