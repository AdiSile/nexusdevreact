// ─────────────────────────────────────────────────────────
// Nexus Dev Studio — API Helper Functions
// Fetch de la /api/settings (și alte endpoint-uri) cu
// fallback automat, timeout, retry și gestionare erori.
// ─────────────────────────────────────────────────────────

import type { ApiResponse, ContactFormInput, ContactMessage } from './types';
import { fallbackSettings } from './fallback';
import type { NexusSettings } from './fallback';

// ═══════════════════════════════════════════════
// Constante de configurare
// ═══════════════════════════════════════════════

/** URL-ul de bază al API-ului. În development se folosește localhost:4000,
 *  în producție e același origin (backend-ul servește și frontend-ul). */
const API_BASE_URL: string =
  typeof window === 'undefined'
    ? process.env.API_BASE_URL || 'http://localhost:4000'
    : '/api';

/** Timeout implicit pentru cereri (ms) */
const DEFAULT_TIMEOUT_MS = 8_000;

/** Numărul maxim de reîncercări pentru cereri eșuate */
const DEFAULT_MAX_RETRIES = 2;

/** Delay-ul inițial între reîncercări (ms) — crește exponențial */
const RETRY_BASE_DELAY_MS = 500;

// ═══════════════════════════════════════════════
// Tipuri interne
// ═══════════════════════════════════════════════

/** Opțiuni extinse pentru fetchApi */
interface FetchApiOptions extends Omit<RequestInit, 'signal'> {
  /** Timeout personalizat (ms). Default: 8_000 */
  timeoutMs?: number;
  /** Număr maxim de reîncercări. Default: 2 */
  maxRetries?: number;
  /** Delay de bază pentru backoff exponențial. Default: 500ms */
  retryBaseDelay?: number;
}

/** Eroare personalizată pentru timeout */
class FetchTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Cererea către ${url} a depășit timeout-ul de ${timeoutMs}ms.`);
    this.name = 'FetchTimeoutError';
  }
}

/** Eroare personalizată pentru răspuns non-OK */
class FetchHttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;

  constructor(url: string, status: number, statusText: string, body: unknown) {
    super(`Cererea către ${url} a eșuat: ${status} ${statusText}`);
    this.name = 'FetchHttpError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

// ═══════════════════════════════════════════════
// Helpers private
// ═══════════════════════════════════════════════

/**
 * Construiește URL-ul complet pentru un endpoint.
 * În client-side folosește calea relativă /api/...,
 * în server-side folosește API_BASE_URL absolut.
 */
function buildUrl(path: string): string {
  // Dacă path-ul începe cu http(s)://, e deja absolut
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // Normalizează path-ul (asigură un singur / între base și path)
  const base = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Așteaptă un număr de milisecunde (promise-based).
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verifică dacă o eroare este retryable (rețea, timeout, server error).
 * Erorile de client (4xx) NU sunt retryable (cu excepția 408 și 429).
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof FetchTimeoutError) return true;
  if (error instanceof TypeError) return true; // rețea, CORS, etc.
  if (error instanceof FetchHttpError) {
    // 408 Request Timeout, 429 Too Many Requests, 5xx Server Errors
    return (
      error.status === 408 ||
      error.status === 429 ||
      error.status >= 500
    );
  }
  return false;
}

// ═══════════════════════════════════════════════
// Funcția principală: fetchApi<T>
// ═══════════════════════════════════════════════

/**
 * Efectuează o cerere HTTP către API-ul Nexus Dev Studio.
 *
 * Caracteristici:
 * - Timeout automat (default 8s)
 * - Retry automat pentru erori de rețea și server (5xx)
 * - Parsare automată JSON
 * - Tipizare generică — returnează `ApiResponse<T>`
 *
 * @param path   - Calea relativă la API (ex: '/settings') sau URL absolut
 * @param init   - Opțiuni fetch standard (method, headers, body, etc.)
 * @param options - Opțiuni extinse (timeout, retry)
 * @returns Promise<ApiResponse<T>> — răspunsul standardizat
 *
 * @example
 * const res = await fetchApi<NexusSettings>('/settings');
 * if (res.success) {
 *   console.log(res.data.studio.name);
 * }
 */
async function fetchApi<T = unknown>(
  path: string,
  init?: RequestInit,
  options?: FetchApiOptions,
): Promise<ApiResponse<T>> {
  const url = buildUrl(path);
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryBaseDelay = options?.retryBaseDelay ?? RETRY_BASE_DELAY_MS;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Dacă nu e prima încercare, așteaptă cu backoff exponențial
    if (attempt > 0) {
      const waitMs = retryBaseDelay * Math.pow(2, attempt - 1);
      await delay(waitMs);
      console.warn(`[api] Reîncercare ${attempt}/${maxRetries} pentru ${path}`);
    }

    try {
      // Timeout via AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...init?.headers,
        },
      });

      clearTimeout(timeoutId);

      // Parsează corpul (poate fi JSON sau nu)
      let body: unknown;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          body = await response.json();
        } catch {
          // JSON invalid — citește ca text
          body = await response.text();
        }
      } else {
        body = await response.text();
      }

      // Dacă răspunsul nu e OK, aruncă eroare (va fi prinsă și retried dacă e cazul)
      if (!response.ok) {
        throw new FetchHttpError(url, response.status, response.statusText, body);
      }

      // Succes — dacă body-ul deja arată ca un ApiResponse, returnează-l direct
      if (isApiResponseLike<T>(body)) {
        return body;
      }

      // Altfel, încapsulează datele într-un ApiResponse
      return {
        success: true,
        data: body as T,
        statusCode: response.status,
      };
    } catch (error: unknown) {
      lastError = error;

      // Dacă a fost anulat de AbortController (timeout), înlocuiește eroarea
      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new FetchTimeoutError(url, timeoutMs);
      }

      // Dacă eroarea nu e retryable sau e ultima încercare, nu reîncerca
      if (!isRetryableError(lastError) || attempt >= maxRetries) {
        break;
      }
    }
  }

  // Toate încercările au eșuat — returnează un ApiResponse de eroare
  const message =
    lastError instanceof Error ? lastError.message : 'Eroare necunoscută la cererea API.';

  console.error(`[api] Eroare la ${path}:`, message);

  return {
    success: false,
    error: lastError instanceof FetchHttpError ? lastError.statusText : 'NetworkError',
    message,
    statusCode:
      lastError instanceof FetchHttpError
        ? lastError.status
        : lastError instanceof FetchTimeoutError
          ? 408
          : 0,
  };
}

// ═══════════════════════════════════════════════
// Type guard pentru ApiResponse-like objects
// ═══════════════════════════════════════════════

function isApiResponseLike<T>(value: unknown): value is ApiResponse<T> {
  if (value === null || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.success === 'boolean';
}

// ═══════════════════════════════════════════════
// Funcția principală: fetchSettings (cu fallback)
// ═══════════════════════════════════════════════

/**
 * Obține setările complete ale sitului de la GET /api/settings.
 *
 * **Fallback automat**: dacă API-ul nu răspunde (eroare de rețea, timeout,
 * 404, 500 etc.), returnează automat datele de fallback din `fallback.ts`,
 * care sunt identice cu seed-ul bazei de date.
 *
 * @returns Promise<NexusSettings> — setările (din API sau fallback)
 *
 * @example
 * const settings = await fetchSettings();
 * console.log(settings.studio.name); // "Nexus Dev Studio"
 * console.log(settings.services.length); // 21
 */
export async function fetchSettings(): Promise<NexusSettings> {
  try {
    const response = await fetchApi<NexusSettings>('/settings', undefined, {
      timeoutMs: 6_000, // timeout mai scurt pentru settings (e ruta principală)
      maxRetries: 1,    // o singură reîncercare — vrem fallback rapid
      retryBaseDelay: 300,
    });

    if (response.success && response.data) {
      return response.data;
    }

    // API-ul a răspuns, dar fără date (caz rar)
    console.warn(
      '[api] API-ul /settings a răspuns, dar fără date. Se folosește fallback-ul.',
      response.error,
    );
    return fallbackSettings;
  } catch (error: unknown) {
    // Orice eroare neprevăzută — fallback
    console.warn(
      '[api] Eroare neprevăzută la fetchSettings. Se folosește fallback-ul.',
      error instanceof Error ? error.message : error,
    );
    return fallbackSettings;
  }
}

// ═══════════════════════════════════════════════
// Funcție generică fetchWithFallback<T>
// ═══════════════════════════════════════════════

/**
 * Efectuează o cerere API și, în caz de eșec, returnează o valoare de fallback.
 *
 * @param path     - Calea API (ex: '/settings')
 * @param fallback - Valoarea de rezervă în caz de eșec
 * @param init     - Opțiuni fetch (POST body etc.)
 * @param options  - Opțiuni extinse (timeout, retry)
 * @returns T — datele din API sau fallback
 *
 * @example
 * const data = await fetchWithFallback('/services', []);
 */
export async function fetchWithFallback<T>(
  path: string,
  fallback: T,
  init?: RequestInit,
  options?: FetchApiOptions,
): Promise<T> {
  try {
    const response = await fetchApi<T>(path, init, options);
    if (response.success && response.data !== undefined) {
      return response.data;
    }
    console.warn(`[api] fetchWithFallback: ${path} a eșuat — se folosește fallback.`);
    return fallback;
  } catch {
    console.warn(`[api] fetchWithFallback: ${path} a aruncat excepție — se folosește fallback.`);
    return fallback;
  }
}

// ═══════════════════════════════════════════════
// Funcții pentru endpoint-uri specifice
// ═══════════════════════════════════════════════

/**
 * Trimite un mesaj de contact prin formularul public.
 * POST /api/contact
 */
export async function submitContactForm(
  input: ContactFormInput,
): Promise<ApiResponse<ContactMessage>> {
  return fetchApi<ContactMessage>('/contact', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Obține setările fără fallback (aruncă eroare dacă API-ul e jos).
 * Util pentru dashboard-ul de admin unde vrei să știi dacă API-ul pică.
 */
export async function fetchSettingsRaw(): Promise<ApiResponse<NexusSettings>> {
  return fetchApi<NexusSettings>('/settings', undefined, {
    timeoutMs: 10_000,
    maxRetries: 3,
  });
}

/**
 * Verifică dacă API-ul este disponibil (health check).
 * GET /api/health
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetchApi<{ status: string }>('/health', undefined, {
      timeoutMs: 3_000,
      maxRetries: 0,
    });
    return response.success;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════
// Re-exportări
// ═══════════════════════════════════════════════

export { fetchApi, FetchTimeoutError, FetchHttpError };
export type { FetchApiOptions };