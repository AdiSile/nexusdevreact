const jwt = require('jsonwebtoken');

// ---------------------------------------------------------------------------
// Configurare JWT
// ---------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET || 'nexus-dev-studio-jwt-secret-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const COOKIE_NAME = 'auth_token';

// ---------------------------------------------------------------------------
// Helpers exportați pentru a fi folosiți și de ruta de auth (login / check)
// ---------------------------------------------------------------------------

/**
 * Semnează un token JWT.
 * @param {object} payload - datele de introdus în token (ex: { id, email })
 * @returns {string} token JWT
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Configurează opțiunile cookie-ului HttpOnly.
 * @returns {object} opțiuni cookie
 */
function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 ore (ms)
  };
}

// ---------------------------------------------------------------------------
// Middleware: extrage și verifică tokenul JWT din cookie
// ---------------------------------------------------------------------------

/**
 * Verifică tokenul JWT din cookie-ul HttpOnly.
 * Dacă este valid, atașează `req.user` cu payload-ul decodat.
 * Dacă nu există token sau este invalid, mergem mai departe fără eroare
 * (ruta decide dacă e necesară autentificarea).
 */
function authenticate(req, res, next) {
  // Extrage tokenul din cookie
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    // Fără token – nu blocăm aici, lăsăm ruta să decidă
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, iat, exp }
    return next();
  } catch (err) {
    // Token invalid / expirat – ștergem cookie-ul compromis
    res.clearCookie(COOKIE_NAME, getCookieOptions());
    req.user = null;

    // Dacă tokenul este expirat, dăm 401 direct; altfel lăsăm ruta să decidă
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TokenExpired',
        message: 'Sesiunea a expirat. Te rugăm să te autentifici din nou.',
      });
    }

    // Token corupt sau altă eroare
    return res.status(401).json({
      error: 'InvalidToken',
      message: 'Token invalid. Te rugăm să te autentifici din nou.',
    });
  }
}

// ---------------------------------------------------------------------------
// Middleware: protejează rutele care necesită autentificare
// ---------------------------------------------------------------------------

/**
 * Middleware care blochează accesul dacă utilizatorul nu este autentificat.
 * Se așteaptă ca `authenticate` să fi rulat deja (sau îl chemăm aici).
 */
function requireAuth(req, res, next) {
  // Dacă req.user există deja (authenticate a rulat global), folosim cache-ul
  if (req.user) {
    return next();
  }

  // Altfel verificăm manual tokenul
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({
      error: 'AuthenticationRequired',
      message: 'Trebuie să fii autentificat pentru a accesa această resursă.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    res.clearCookie(COOKIE_NAME, getCookieOptions());

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TokenExpired',
        message: 'Sesiunea a expirat. Te rugăm să te autentifici din nou.',
      });
    }

    return res.status(401).json({
      error: 'InvalidToken',
      message: 'Token invalid. Te rugăm să te autentifici din nou.',
    });
  }
}

// ---------------------------------------------------------------------------
// Middleware: protejează rutele de admin (necesită rol de admin)
// ---------------------------------------------------------------------------

/**
 * Middleware care blochează accesul dacă utilizatorul nu este admin.
 * În acest proiect, orice utilizator autentificat are rol de admin
 * (există un singur cont de admin în baza de date).
 *
 * Dacă ulterior se adaugă o coloană `role` în tabela `users`, se poate
 * verifica `req.user.role === 'admin'`.
 */
function requireAdmin(req, res, next) {
  // Ne asigurăm că utilizatorul este autentificat mai întâi
  if (!req.user) {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        error: 'AuthenticationRequired',
        message: 'Trebuie să fii autentificat ca admin pentru a accesa această resursă.',
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      res.clearCookie(COOKIE_NAME, getCookieOptions());
      return res.status(401).json({
        error: 'InvalidToken',
        message: 'Token invalid sau expirat. Te rugăm să te autentifici din nou.',
      });
    }
  }

  // În versiunea curentă, orice user autentificat = admin.
  // Dacă se implementează roluri, adaugă aici:
  // if (req.user.role !== 'admin') {
  //   return res.status(403).json({
  //     error: 'Forbidden',
  //     message: 'Nu ai permisiunile necesare pentru această resursă.',
  //   });
  // }

  return next();
}

// ---------------------------------------------------------------------------
// Exporturi
// ---------------------------------------------------------------------------

module.exports = {
  // Middleware-uri
  authenticate,
  requireAuth,
  requireAdmin,

  // Helpers (folosite de ruta auth)
  signToken,
  getCookieOptions,
  COOKIE_NAME,
  JWT_SECRET,
  JWT_EXPIRES_IN,
};