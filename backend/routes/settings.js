const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// GET /api/settings — public, returnează obiectul JSON complet din baza de date
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    const row = db.prepare('SELECT data FROM settings WHERE key = ?').get('app');

    if (!row) {
      return res.status(404).json({
        error: 'SettingsNotFound',
        message: 'Setările nu au fost încă inițializate.',
      });
    }

    const settings = JSON.parse(row.data);
    return res.json(settings);
  } catch (err) {
    console.error('[settings] GET error:', err.message);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'A apărut o eroare internă.',
    });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/settings — admin only, face merge parțial (deep merge) și salvează
// ---------------------------------------------------------------------------
router.put('/', requireAdmin, (req, res) => {
  try {
    const incoming = req.body;

    // Validare input strictă: trebuie să fie un obiect JSON, nu array, nu null
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return res.status(400).json({
        error: 'InvalidBody',
        message: 'Corpul cererii trebuie să fie un obiect JSON.',
      });
    }

    // Blochează chei necunoscute / prea mari
    const allowedKeys = Object.keys(incoming);
    if (allowedKeys.length === 0) {
      return res.status(400).json({
        error: 'EmptyBody',
        message: 'Trebuie să trimiți cel puțin o cheie pentru actualizare.',
      });
    }

    // Previne payload-uri exagerat de mari (limită 500 KB)
    const bodySize = Buffer.byteLength(JSON.stringify(incoming), 'utf8');
    if (bodySize > 500_000) {
      return res.status(413).json({
        error: 'PayloadTooLarge',
        message: 'Dimensiunea maximă admisă este de 500 KB.',
      });
    }

    const row = db.prepare('SELECT data FROM settings WHERE key = ?').get('app');

    if (!row) {
      return res.status(404).json({
        error: 'SettingsNotFound',
        message: 'Setările nu au fost încă inițializate.',
      });
    }

    const current = JSON.parse(row.data);

    // Deep merge parțial
    const merged = deepMerge(current, incoming);

    // Salvează în baza de date
    db.prepare('UPDATE settings SET data = ? WHERE key = ?').run(
      JSON.stringify(merged),
      'app'
    );

    return res.json(merged);
  } catch (err) {
    console.error('[settings] PUT error:', err.message);

    // JSON corupt în bază (nu ar trebui să se întâmple, dar tratăm elegant)
    if (err instanceof SyntaxError) {
      return res.status(500).json({
        error: 'CorruptData',
        message: 'Datele din baza de date sunt corupte.',
      });
    }

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'A apărut o eroare internă.',
    });
  }
});

// ---------------------------------------------------------------------------
// Deep merge recursiv
// - obiectele simple se îmbină recursiv
// - array-urile sunt înlocuite complet (sursele suprascriu destinația)
// - primitivele sunt suprascrise
// ---------------------------------------------------------------------------
function deepMerge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      result[key] = deepMerge(targetVal, sourceVal);
    } else {
      result[key] = sourceVal;
    }
  }

  return result;
}

function isPlainObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

module.exports = router;