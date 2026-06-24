const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/db');
const {
  signToken,
  getCookieOptions,
  COOKIE_NAME,
  authenticate,
} = require('../middleware/auth');

// ---------------------------------------------------------------------------
// Constante de securitate
// ---------------------------------------------------------------------------

const MAX_LOGIN_ATTEMPTS = 5;                // încercări eșuate consecutive
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;    // 15 minute blocare
const BCRYPT_ROUNDS = 12;                    // cost factor bcrypt

// Cache temporar în memorie pentru protecția anti-bruteforce
// În producție se recomandă Redis; pentru un singur proces Node.js, Map e suficient
const loginAttempts = new Map();

// Curățare periodică a cache-ului (la fiecare 5 minute)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts) {
    if (now - entry.firstAttempt > LOCKOUT_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// Validatori
// ---------------------------------------------------------------------------

/**
 * Validează formatul de email.
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  // RFC 5322 simplificat – acoperă 99.9% din cazurile practice
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validează parola: minim 8 caractere, maxim 128 (pentru a preveni atacuri de
 * epuizare a memoriei prin bcrypt pe parole gigant).
 */
function isValidPassword(password) {
  if (typeof password !== 'string') return false;
  return password.length >= 8 && password.length <= 128;
}

// ---------------------------------------------------------------------------
// Protecție anti-bruteforce
// ---------------------------------------------------------------------------

/**
 * Verifică dacă o adresă IP sau email este blocată temporar.
 * Returnează `true` dacă este blocată.
 */
function isRateLimited(identifier) {
  const entry = loginAttempts.get(identifier);
  if (!entry) return false;

  const now = Date.now();

  // Dacă fereastra de blocare a expirat, resetăm
  if (now - entry.firstAttempt > LOCKOUT_WINDOW_MS) {
    loginAttempts.delete(identifier);
    return false;
  }

  return entry.count >= MAX_LOGIN_ATTEMPTS;
}

/**
 * Înregistrează o încercare eșuată pentru un identificator.
 */
function recordFailedAttempt(identifier) {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);

  if (!entry || now - entry.firstAttempt > LOCKOUT_WINDOW_MS) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
  }
}

/**
 * Resetează încercările eșuate după un login reușit.
 */
function resetAttempts(identifier) {
  loginAttempts.delete(identifier);
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

/**
 * Autentifică utilizatorul cu email și parolă.
 * 
 * Body JSON:
 *   { "email": "...", "password": "..." }
 * 
 * Răspuns (200 – OK):
 *   { "user": { "id": 1, "email": "..." }, "message": "Autentificare reușită." }
 *   + cookie HttpOnly `auth_token` cu JWT
 * 
 * Răspuns (400 – Bad Request): input invalid
 * Răspuns (401 – Unauthorized): credențiale incorecte
 * Răspuns (429 – Too Many Requests): prea multe încercări eșuate
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

    // --- Pas 1: Validare input ---
    const errors = [];

    if (!email || !isValidEmail(email)) {
      errors.push('Adresa de email este invalidă.');
    }

    if (!password || !isValidPassword(password)) {
      errors.push('Parola trebuie să aibă între 8 și 128 de caractere.');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Datele introduse nu sunt valide.',
        details: errors,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // --- Pas 2: Verificare limitare bruteforce (după IP) ---
    if (isRateLimited(clientIp)) {
      return res.status(429).json({
        error: 'TooManyRequests',
        message: 'Prea multe încercări de autentificare. Încearcă din nou peste 15 minute.',
      });
    }

    // --- Pas 3: Căutare utilizator în baza de date ---
    const user = db
      .prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
      .get(normalizedEmail);

    if (!user) {
      // Mesaj generic – nu dezvăluim dacă emailul există sau nu
      recordFailedAttempt(clientIp);

      return res.status(401).json({
        error: 'InvalidCredentials',
        message: 'Email sau parolă incorectă.',
      });
    }

    // --- Pas 4: Verificare parolă cu bcrypt (constant-time) ---
    const passwordMatch = bcrypt.compareSync(password, user.password_hash);

    if (!passwordMatch) {
      recordFailedAttempt(clientIp);

      return res.status(401).json({
        error: 'InvalidCredentials',
        message: 'Email sau parolă incorectă.',
      });
    }

    // --- Pas 5: Autentificare reușită ---
    resetAttempts(clientIp);

    // Construim payload-ul JWT
    const payload = { id: user.id, email: user.email };

    // Semnăm tokenul
    const token = signToken(payload);

    // Setăm cookie-ul HttpOnly
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    // Returnăm datele utilizatorului (fără hash evident)
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
      },
      message: 'Autentificare reușită.',
    });
  } catch (err) {
    console.error('[auth] POST /login error:', err.message);

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'A apărut o eroare internă. Încearcă din nou.',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/check
// ---------------------------------------------------------------------------

/**
 * Verifică dacă utilizatorul curent este autentificat.
 * 
 * Se bazează pe middleware-ul `authenticate` care extrage și validează
 * tokenul JWT din cookie.
 * 
 * Răspuns (200 – OK):
 *   { "authenticated": true, "user": { "id": 1, "email": "..." } }
 * 
 * Răspuns (200 – OK, fără token):
 *   { "authenticated": false }
 * 
 * Notă: Răspunsul 401 este trimis doar când tokenul este expirat sau
 * corupt, direct din middleware-ul `authenticate`.
 */
router.get('/check', authenticate, (req, res) => {
  try {
    // Dacă req.user există, tokenul a fost validat de middleware
    if (req.user) {
      return res.status(200).json({
        authenticated: true,
        user: {
          id: req.user.id,
          email: req.user.email,
        },
      });
    }

    // Niciun token prezent – utilizatorul nu este autentificat
    // (nu este o eroare, e doar o stare)
    return res.status(200).json({
      authenticated: false,
    });
  } catch (err) {
    console.error('[auth] GET /check error:', err.message);

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'A apărut o eroare internă.',
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------

/**
 * Deloghează utilizatorul: șterge cookie-ul de autentificare.
 * 
 * Nu necesită autentificare prealabilă – dacă nu există cookie,
 * răspunsul este oricum de succes (idempotent).
 */
router.post('/logout', (_req, res) => {
  try {
    res.clearCookie(COOKIE_NAME, getCookieOptions());

    return res.status(200).json({
      message: 'Deconectare reușită.',
    });
  } catch (err) {
    console.error('[auth] POST /logout error:', err.message);

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'A apărut o eroare internă.',
    });
  }
});

module.exports = router;