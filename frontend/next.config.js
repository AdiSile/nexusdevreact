/** @type {import('next').NextConfig} */
const nextConfig = {
  // ---------------------------------------------------------------------------
  // Static export pentru producție
  //   Express (backend/server.js) servește fișierele din frontend/out/
  // ---------------------------------------------------------------------------
  output: 'export',
  distDir: 'out',

  // ---------------------------------------------------------------------------
  // Rewrites: proxy API către backend în development
  //   În dev, Next.js (port 3000) proxy-uiește /api/* către Express (port 4000)
  //   În producție, Express servește direct; rewrites sunt ignorate la export.
  // ---------------------------------------------------------------------------
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
    ];
  },

  // ---------------------------------------------------------------------------
  // Optimizări imagine
  //   unoptimized:true este obligatoriu cu output:'export' (nu există server
  //   Node care să proceseze imaginile la runtime).
  //   deviceSizes / imageSizes oferă dimensiunile pentru srcset când se face
  //   optimizare (util dacă ulterior se migrează la SSR).
  // ---------------------------------------------------------------------------
  images: {
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ---------------------------------------------------------------------------
  // Securitate & performanță
  // ---------------------------------------------------------------------------
  poweredByHeader: false,       // elimină header-ul X-Powered-By: Next.js
  reactStrictMode: true,        // dublă randare în dev pentru evidențiere bug-uri
  compress: true,               // compresie gzip/brotli (dev mode only)

  // ---------------------------------------------------------------------------
  // Trailing slash consistent
  //   Ajută la servirea fișierelor statice fără confuzii de rutare
  // ---------------------------------------------------------------------------
  trailingSlash: true,

  // ---------------------------------------------------------------------------
  // Variabile de mediu expuse către client
  //   NEXT_PUBLIC_API_URL: baza URL pentru API (implicit localhost:4000)
  // ---------------------------------------------------------------------------
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
};

module.exports = nextConfig;