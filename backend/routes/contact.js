const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// Constante
// ---------------------------------------------------------------------------

const MAX_NAME_LENGTH = 128;
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 256;
const MAX_MESSAGE_LENGTH = 5000;

// ---------------------------------------------------------------------------
// Validatori
// ---------------------------------------------------------------------------

/**
 * Validează formatul de email.
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Sanitizează un string: elimină tag-uri HTML simple și whitespace excesiv.
 */
function sanitize(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')     // elimină tag-uri HTML
    .replace(/ {2,}/g, ' ')      // colapsează spații multiple
    .trim();
}

// ---------------------------------------------------------------------------
// POST /api/contact — salvează un mesaj de contact (public)
// ---------------------------------------------------------------------------

/**
 * Endpoint public pentru trimiterea unui mesaj de contact.
 *
 * Body JSON:
 *   { "name": "...", "email": "...", "subject": "...", "message": "..." }
 *
 * Răspuns (201 – Created):
 *   { "id": 1, "message": "Mesajul a fost trimis cu succes." }
 *
 * Răspuns (400 – Bad Request): input invalid
 * Răspuns (429 – Too Many Requests): dacă se aplică rate limiting global
 */
router.post('/', (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};

    // --- Validare input ---
    const errors = [];

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Numele este obligatoriu.');
    } else if (name.trim().length > MAX_NAME_LENGTH) {
      errors.push(`Numele nu poate depăși ${MAX_NAME_LENGTH} de caractere.`);
    }

    if (!email || !isValidEmail(email)) {
      errors.push('Adresa de email este invalidă.');
    } else if (email.trim().length > MAX_EMAIL_LENGTH) {
      errors.push(`Adresa de email nu poate depăși ${MAX_EMAIL_LENGTH} de caractere.`);
    }

    const safeSubject = subject ? sanitize(subject) : '';
    if (safeSubject.length > MAX_SUBJECT_LENGTH) {
      errors.push(`Subiectul nu poate depăși ${MAX_SUBJECT_LENGTH} de caractere.`);
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      errors.push('Mesajul este obligatoriu.');
    } else if (message.trim().length > MAX_MESSAGE_LENGTH) {
      errors.push(`Mesajul nu poate depăși ${MAX_MESSAGE_LENGTH} de caractere.`);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Datele introduse nu sunt valide.',
        details: errors,
      });
    }

    // --- Sanitizare & normalizare ---
    const safeName = sanitize(name);
    const safeEmail = email.trim().toLowerCase();
    const safeMessage = sanitize(message);

    // --- Inserare în baza de date ---
    const stmt = db.prepare(
      'INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)'
    );

    const result = stmt.run(safeName, safeEmail, safeSubject, safeMessage);

    return res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Mesajul a fost trimis cu succes. Vă vom răspunde în cel mai scurt timp.',
    });
  } catch (err) {
    console.error('[contact] POST / error:', err.message);

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'A apărut o eroare internă. Încearcă din nou.',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/contact — returnează toate mesajele (admin only)
// ---------------------------------------------------------------------------

/**
 * Endpoint protejat pentru admin: returnează lista completă de mesaje.
 *
 * Query params opționale:
 *   ?unread=1        – doar mesajele necitite
 *   ?limit=50        – numărul maxim de rezultate (default 100)
 *   ?offset=0        – offset pentru paginare (default 0)
 *
 * Răspuns (200 – OK):
 *   { "messages": [...], "total": 42, "limit": 50, "offset": 0 }
 *
 * Răspuns (401 – Unauthorized): necesită autentificare admin
 */
router.get('/', requireAdmin, (req, res) => {
  try {
    const unreadOnly = req.query.unread === '1';
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    // Construim query-ul dinamic
    let whereClause = '';
    const params = [];

    if (unreadOnly) {
      whereClause = 'WHERE read = 0';
    }

    // Număr total (pentru paginare frontend)
    const countRow = db
      .prepare(`SELECT COUNT(*) AS total FROM messages ${whereClause}`)
      .get(...params);

    const total = countRow.total;

    // Selectare mesaje
    const messages = db
      .prepare(
        `SELECT id, name, email, subject, message, created_at, read
         FROM messages
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return res.status(200).json({
      messages,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error('[contact] GET / error:', err.message);

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'A apărut o eroare internă.',
    });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/contact/:id/read — marchează un mesaj ca citit/necitit (admin)
// ---------------------------------------------------------------------------

/**
 * Endpoint protejat: marchează un mesaj ca citit sau necitit.
 *
 * Body JSON (opțional):
 *   { "read": true }   // true = citit, false = necitit (default: true)
 *
 * Răspuns (200 – OK):
 *   { "id": 1, "read": 1, "message": "Mesajul a fost actualizat." }
 */
router.patch('/:id/read', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const readStatus = req.body?.read !== false ? 1 : 0; // default: true (citit)

    const message = db.prepare('SELECT id FROM messages WHERE id = ?').get(id);

    if (!message) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Mesajul nu a fost găsit.',
      });
    }

    db.prepare('UPDATE messages SET read = ? WHERE id = ?').run(readStatus, id);

    return res.status(200).json({
      id: parseInt(id, 10),
      read: readStatus,
      message: readStatus === 1
        ? 'Mesajul a fost marcat ca citit.'
        : 'Mesajul a fost marcat ca necitit.',
    });
  } catch (err) {
    console.error('[contact] PATCH /:id/read error:', err.message);

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'A apărut o eroare internă.',
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/contact/:id — șterge un mesaj (admin only)
// ---------------------------------------------------------------------------

/**
 * Endpoint protejat: șterge un mesaj din baza de date.
 *
 * Răspuns (200 – OK):
 *   { "id": 1, "message": "Mesajul a fost șters." }
 */
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;

    const message = db.prepare('SELECT id FROM messages WHERE id = ?').get(id);

    if (!message) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Mesajul nu a fost găsit.',
      });
    }

    db.prepare('DELETE FROM messages WHERE id = ?').run(id);

    return res.status(200).json({
      id: parseInt(id, 10),
      message: 'Mesajul a fost șters.',
    });
  } catch (err) {
    console.error('[contact] DELETE /:id error:', err.message);

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'A apărut o eroare internă.',
    });
  }
});

module.exports = router;