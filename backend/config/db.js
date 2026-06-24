const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'nexus.db');

// Asigură existența directorului data
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Performanță și siguranță
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// ----------------------------------------
// Creare tabele
// ----------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    data  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    email        TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    subject     TEXT NOT NULL DEFAULT '',
    message     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    read        INTEGER NOT NULL DEFAULT 0
  );
`);

// ----------------------------------------
// Seed settings (dacă tabelul este gol)
// ----------------------------------------
const row = db.prepare('SELECT COUNT(*) AS cnt FROM settings').get();

if (row.cnt === 0) {
  const defaultSettings = {
    // ---- Identitate freelancer / studio ----
    studio: {
      name: 'Nexus Dev Studio',
      tagline: 'Transformăm idei în realitate digitală.',
      description:
        'Nexus Dev Studio este un partener tehnic complet — proiectăm și construim aplicații web moderne, scalabile și imersive, cu un stack de ultimă generație. Fiecare proiect beneficiază de atenție meticuloasă la detalii, arhitectură curată și performanță excepțională.',
      email: 'contact@nexusdevstudio.ro',
      phone: '+40 723 456 789',
      address: 'București, România — disponibil remote global.',
      founded: 2023,
      heroVideoUrl: '/video/hero-bg.mp4',
      heroPosterUrl: '/images/hero-poster.jpg',
      cvUrl: '/files/cv.pdf',
      social: {
        github: 'https://github.com/nexusdevstudio',
        linkedin: 'https://linkedin.com/in/nexusdevstudio',
        twitter: 'https://twitter.com/nexusdevstudio',
        instagram: 'https://instagram.com/nexusdevstudio',
      },
    },

    // ---- 21 de servicii cu prețuri și reduceri ----
    services: [
      {
        id: 1,
        name: 'Web Development Full-Stack',
        category: 'complex',
        description:
          'Aplicații web complete: React / Next.js frontend, Node.js / Express backend, baze de date SQL/NoSQL, autentificare, API-uri RESTful, deploy.',
        price: 2499,
        discountedPrice: 1999,
        discountPercent: 20,
        label: 'Complex',
        features: [
          'Arhitectură full-stack modernă',
          'Autentificare & autorizare',
          'API RESTful robust',
          'Deploy & CI/CD inclus',
        ],
        icon: 'fa-code',
      },
      {
        id: 2,
        name: 'E-Commerce Platform',
        category: 'complex',
        description:
          'Magazine online personalizate cu coș de cumpărături, plăți integrate (Stripe/PayPal), dashboard admin și management produse.',
        price: 2999,
        discountedPrice: 2399,
        discountPercent: 20,
        label: 'Complex',
        features: [
          'Coș & checkout securizat',
          'Integrare plăți Stripe/PayPal',
          'Dashboard admin complet',
          'Optimizare SEO e-commerce',
        ],
        icon: 'fa-shopping-cart',
      },
      {
        id: 3,
        name: 'Mobile App Development',
        category: 'complex',
        description:
          'Aplicații mobile hibride React Native sau PWA performante, publicate în App Store și Google Play.',
        price: 3499,
        discountedPrice: 2799,
        discountPercent: 20,
        label: 'Complex',
        features: [
          'React Native / PWA',
          'Publicare App Store & Google Play',
          'Notificări push',
          'Sincronizare în timp real',
        ],
        icon: 'fa-mobile-alt',
      },
      {
        id: 4,
        name: 'Custom CMS Development',
        category: 'complex',
        description:
          'Sisteme de management al conținutului construite pe măsură, cu interfață administrativă intuitivă și roluri de utilizator.',
        price: 1999,
        discountedPrice: 1599,
        discountPercent: 20,
        label: 'Complex',
        features: [
          'Interfață admin custom',
          'Roluri & permisiuni',
          'Editor WYSIWYG integrat',
          'API headless opțional',
        ],
        icon: 'fa-file-alt',
      },
      {
        id: 5,
        name: 'SaaS Platform Development',
        category: 'complex',
        description:
          'Platforme Software-as-a-Service complete: facturare, abonamente, multi-tenancy, dashboard analytics.',
        price: 4999,
        discountedPrice: 3999,
        discountPercent: 20,
        label: 'Complex',
        features: [
          'Arhitectură multi-tenant',
          'Sistem abonamente & facturare',
          'Dashboard analytics',
          'Scalare cloud automată',
        ],
        icon: 'fa-cloud',
      },
      {
        id: 6,
        name: 'API Development & Integration',
        category: 'complex',
        description:
          'Proiectare și implementare API-uri RESTful / GraphQL, documentație OpenAPI/Swagger, integrare servicii terțe.',
        price: 1799,
        discountedPrice: 1439,
        discountPercent: 20,
        label: 'Complex',
        features: [
          'RESTful / GraphQL',
          'Documentație OpenAPI',
          'Rate limiting & securitate',
          'Integrare servicii terțe',
        ],
        icon: 'fa-plug',
      },
      {
        id: 7,
        name: 'Progressive Web App (PWA)',
        category: 'complex',
        description:
          'Aplicații web progresive cu funcționalitate offline, notificări push și instalare pe dispozitiv.',
        price: 2299,
        discountedPrice: 1839,
        discountPercent: 20,
        label: 'Complex',
        features: [
          'Funcționalitate offline',
          'Instalare pe ecran principal',
          'Notificări push',
          'Sincronizare background',
        ],
        icon: 'fa-mobile-screen',
      },
      {
        id: 8,
        name: 'Enterprise Dashboard',
        category: 'complex',
        description:
          'Dashboard-uri enterprise interactive cu vizualizări de date, grafice, rapoarte exportabile și permisiuni granulare.',
        price: 2799,
        discountedPrice: 2239,
        discountPercent: 20,
        label: 'Complex',
        features: [
          'Vizualizări grafice interactive',
          'Export CSV/PDF',
          'Filtre & permisiuni avansate',
          'Actualizare în timp real',
        ],
        icon: 'fa-chart-line',
      },
      {
        id: 9,
        name: 'Real-time Application',
        category: 'complex',
        description:
          'Aplicații cu comunicare în timp real: chat, colaborare live, notificări instant, folosind WebSockets.',
        price: 3299,
        discountedPrice: 2639,
        discountPercent: 20,
        label: 'Complex',
        features: [
          'WebSockets / Socket.io',
          'Chat & colaborare live',
          'Sincronizare multi-utilizator',
          'Fallback polling',
        ],
        icon: 'fa-bolt',
      },
      {
        id: 10,
        name: 'Microservices Architecture',
        category: 'complex',
        description:
          'Proiectare și implementare arhitectură microservicii cu API Gateway, service discovery și comunicare inter-servicii.',
        price: 3999,
        discountedPrice: 3199,
        discountPercent: 20,
        label: 'Complex',
        features: [
          'API Gateway dedicat',
          'Service discovery',
          'Comunicare asincronă (message broker)',
          'Containerizare Docker',
        ],
        icon: 'fa-cubes',
      },
      {
        id: 11,
        name: 'Database Design & Optimization',
        category: 'complex',
        description:
          'Proiectare baze de date relaționale și non-relaționale, optimizare interogări, migrare, backup și replicare.',
        price: 899,
        discountedPrice: 719,
        discountPercent: 20,
        label: 'Complex',
        features: [
          'Modelare entitate-relație',
          'Optimizare interogări',
          'Migrare date',
          'Strategii backup & recovery',
        ],
        icon: 'fa-database',
      },
      {
        id: 12,
        name: 'Landing Page Development',
        category: 'simple',
        description:
          'Pagini de aterizare optimizate pentru conversie, cu design imersiv, copywriting persuasiv și performanță maximă.',
        price: 599,
        discountedPrice: 359,
        discountPercent: 40,
        label: 'Simplu',
        features: [
          'Design personalizat premium',
          'Optimizare conversie',
          'Mobile-first responsive',
          'SEO on-page',
        ],
        icon: 'fa-window-maximize',
      },
      {
        id: 13,
        name: 'Website Redesign',
        category: 'simple',
        description:
          'Redesign complet al site-ului existent cu tehnologii moderne, păstrând SEO și îmbunătățind experiența utilizatorului.',
        price: 799,
        discountedPrice: 479,
        discountPercent: 40,
        label: 'Simplu',
        features: [
          'Audit UX/UI existent',
          'Design modern & responsive',
          'Păstrare SEO existent',
          'Îmbunătățire performanță',
        ],
        icon: 'fa-paint-brush',
      },
      {
        id: 14,
        name: 'UI/UX Design',
        category: 'simple',
        description:
          'Design de interfețe și experiență utilizator: wireframes, prototipuri interactive, design systems și testare cu utilizatori.',
        price: 699,
        discountedPrice: 419,
        discountPercent: 40,
        label: 'Simplu',
        features: [
          'Wireframes & prototipuri',
          'Design system modular',
          'Testare utilizatori',
          'Iterații & feedback continuu',
        ],
        icon: 'fa-pen-ruler',
      },
      {
        id: 15,
        name: 'SEO Optimization',
        category: 'simple',
        description:
          'Optimizare SEO on-page și tehnică: audit, cercetare cuvinte cheie, optimizare viteză, markup structurat.',
        price: 499,
        discountedPrice: 299,
        discountPercent: 40,
        label: 'Simplu',
        features: [
          'Audit SEO complet',
          'Cercetare cuvinte cheie',
          'Optimizare viteză & Core Web Vitals',
          'Markup structurat Schema.org',
        ],
        icon: 'fa-magnifying-glass',
      },
      {
        id: 16,
        name: 'Performance Optimization',
        category: 'simple',
        description:
          'Optimizare avansată a performanței: lazy loading, code splitting, optimizare imagini, caching și CDN.',
        price: 449,
        discountedPrice: 269,
        discountPercent: 40,
        label: 'Simplu',
        features: [
          'Audit performanță Lighthouse',
          'Code splitting & lazy loading',
          'Optimizare imagini & fonturi',
          'Strategii caching & CDN',
        ],
        icon: 'fa-gauge-high',
      },
      {
        id: 17,
        name: 'Website Maintenance',
        category: 'simple',
        description:
          'Pachet lunar de mentenanță: actualizări de securitate, backup-uri, monitorizare uptime, suport tehnic.',
        price: 349,
        discountedPrice: 209,
        discountPercent: 40,
        label: 'Simplu',
        features: [
          'Actualizări securitate',
          'Backup-uri automate',
          'Monitorizare 24/7',
          'Suport tehnic prioritar',
        ],
        icon: 'fa-screwdriver-wrench',
      },
      {
        id: 18,
        name: 'Brand Identity Design',
        category: 'simple',
        description:
          'Identitate vizuală completă: logo, paletă cromatică, tipografie, ghid de brand, materiale de marketing.',
        price: 599,
        discountedPrice: 359,
        discountPercent: 40,
        label: 'Simplu',
        features: [
          'Logo & variațiuni',
          'Paletă cromatică & tipografie',
          'Ghid de brand complet',
          'Materiale marketing',
        ],
        icon: 'fa-fill-drip',
      },
      {
        id: 19,
        name: 'WordPress Customization',
        category: 'simple',
        description:
          'Teme și plugin-uri WordPress personalizate, optimizare WooCommerce, securizare și migrare.',
        price: 449,
        discountedPrice: 269,
        discountPercent: 40,
        label: 'Simplu',
        features: [
          'Teme personalizate',
          'Dezvoltare plugin-uri',
          'Optimizare WooCommerce',
          'Securizare & migrare',
        ],
        icon: 'fa-wordpress',
      },
      {
        id: 20,
        name: 'Email Template Design',
        category: 'simple',
        description:
          'Șabloane de email responsive, testate pe toți clienții de email, compatibile cu platformele populare de email marketing.',
        price: 249,
        discountedPrice: 149,
        discountPercent: 40,
        label: 'Simplu',
        features: [
          'Design responsive email',
          'Testare multi-client',
          'Compatibil Mailchimp/SendGrid',
          'Dark mode support',
        ],
        icon: 'fa-envelope',
      },
      {
        id: 21,
        name: 'Technical Consultation',
        category: 'simple',
        description:
          'Consultanță tehnică pentru alegerea stack-ului, arhitectură, audit de cod și planificare proiect.',
        price: 199,
        discountedPrice: 119,
        discountPercent: 40,
        label: 'Simplu',
        features: [
          'Evaluare stack tehnologic',
          'Audit de cod & arhitectură',
          'Planificare proiect',
          'Raport detaliat & recomandări',
        ],
        icon: 'fa-comments',
      },
    ],

    // ---- Proces (Cum lucrăm) ----
    process: [
      {
        step: 1,
        title: 'Descoperire & Strategie',
        description:
          'Analizăm obiectivele tale, publicul țintă și competiția. Definim strategia digitală optimă și planul de proiect detaliat.',
        icon: 'fa-compass',
      },
      {
        step: 2,
        title: 'Design & Prototipare',
        description:
          'Creăm wireframe-uri și prototipuri interactive. Rafinăm designul împreună cu tine până când fiecare pixel reflectă viziunea ta.',
        icon: 'fa-pencil',
      },
      {
        step: 3,
        title: 'Dezvoltare & Implementare',
        description:
          'Scriem cod curat, modular și scalabil. Folosim metodologii Agile, code review și integrare continuă pentru calitate maximă.',
        icon: 'fa-code',
      },
      {
        step: 4,
        title: 'Testare & Optimizare',
        description:
          'Testăm riguros pe multiple dispozitive și browsere. Optimizăm performanța, accesibilitatea și SEO-ul înainte de lansare.',
        icon: 'fa-vial',
      },
      {
        step: 5,
        title: 'Lansare & Suport Continuu',
        description:
          'Lansăm proiectul în producție și oferim suport post-lansare. Monitorizăm performanța și iterăm pe baza feedback-ului real.',
        icon: 'fa-rocket',
      },
    ],

    // ---- FAQ ----
    faq: [
      {
        question: 'Cât durează un proiect tipic?',
        answer:
          'Depinde de complexitate: o landing page se livrează în 3-5 zile, un site de prezentare în 1-2 săptămâni, iar o platformă complexă (SaaS, e-commerce) poate dura 4-8 săptămâni. Oferim estimări precise după sesiunea de descoperire.',
      },
      {
        question: 'Ce stack tehnologic folosești?',
        answer:
          'Frontend: React, Next.js, TypeScript, Tailwind CSS. Backend: Node.js, Express, Python/FastAPI. Baze de date: PostgreSQL, SQLite, MongoDB. DevOps: Docker, AWS, Vercel. Alegem stack-ul optim în funcție de necesitățile proiectului tău.',
      },
      {
        question: 'Oferi garanție după livrare?',
        answer:
          'Da. Toate proiectele includ o perioadă de garanție de 30 de zile pentru remedierea oricăror bug-uri descoperite post-lansare, fără costuri suplimentare.',
      },
      {
        question: 'Cum funcționează plata?',
        answer:
          'Lucrăm cu un sistem de plată în etape: 30% avans la semnarea contractului, 40% la jumătatea proiectului și 30% la livrarea finală. Acceptăm transfer bancar, card și PayPal.',
      },
      {
        question: 'Poți prelua un proiect început de altcineva?',
        answer:
          'Absolut. Am salvat și dus la bun sfârșit multe proiecte abandonate. Începem cu un audit complet al codului existent și propunem un plan de redresare.',
      },
      {
        question: 'Oferi mentenanță continuă după lansare?',
        answer:
          'Da, oferim pachete lunare de mentenanță care includ actualizări de securitate, backup-uri, monitorizare și suport tehnic prioritar. Prețurile pornesc de la 209 EUR/lună.',
      },
    ],

    // ---- Portofoliu ----
    portfolio: [
      {
        id: 1,
        title: 'FinDash Analytics',
        description:
          'Dashboard financiar enterprise cu vizualizări interactive, exporturi multiple și actualizare în timp real.',
        image: '/images/portfolio-1.jpg',
        tags: ['React', 'Node.js', 'PostgreSQL', 'WebSocket'],
        link: '#',
      },
      {
        id: 2,
        title: 'GreenEats Mobile',
        description:
          'Aplicație mobilă PWA pentru livrări de mâncare sustenabilă, cu tracking live și plăți integrate.',
        image: '/images/portfolio-2.jpg',
        tags: ['Next.js', 'PWA', 'Stripe', 'Mapbox'],
        link: '#',
      },
      {
        id: 3,
        title: 'Artisan Brand Identity',
        description:
          'Rebranding complet pentru o rețea de brutării artizanale: logo, ambalaje, site și materiale marketing.',
        image: '/images/portfolio-3.jpg',
        tags: ['Branding', 'Figma', 'WordPress', 'SEO'],
        link: '#',
      },
      {
        id: 4,
        title: 'EduPlatform LMS',
        description:
          'Platformă de learning management cu cursuri video, quiz-uri interactive, certificări și marketplace.',
        image: '/images/portfolio-1.jpg',
        tags: ['Next.js', 'Node.js', 'MongoDB', 'AWS'],
        link: '#',
      },
      {
        id: 5,
        title: 'ShopFlow E-Commerce',
        description:
          'Magazin online cu peste 5000 de produse, filtru avansat, wishlist și sistem de recomandări AI.',
        image: '/images/portfolio-2.jpg',
        tags: ['React', 'Express', 'PostgreSQL', 'Redis'],
        link: '#',
      },
      {
        id: 6,
        title: 'MediConnect Platform',
        description:
          'Platformă de telemedicină cu programări online, video call integrat și dosar medical electronic.',
        image: '/images/portfolio-3.jpg',
        tags: ['Next.js', 'WebRTC', 'FHIR', 'Docker'],
        link: '#',
      },
    ],

    // ---- Contact ----
    contact: {
      email: 'contact@nexusdevstudio.ro',
      phone: '+40 723 456 789',
      address: 'București, România',
      workingHours: 'Luni – Vineri, 09:00 – 18:00 (EET)',
    },

    // ---- SEO ----
    seo: {
      title: 'Nexus Dev Studio | Dezvoltare Web Modernă & Aplicații Scalabile',
      description:
        'Nexus Dev Studio construiește aplicații web imersive, platforme SaaS și experiențe digitale de top. Stack modern, design premium, performanță maximă.',
      keywords:
        'dezvoltare web, next.js, react, aplicații web, full-stack, node.js, tailwind, glassmorphism, SaaS, e-commerce, PWA',
      ogImage: '/images/og-image.jpg',
      siteUrl: 'https://nexusdevstudio.ro',
      language: 'ro',
      twitterHandle: '@nexusdevstudio',
    },

    // ---- Footer ----
    footer: {
      copyright: '{year} Nexus Dev Studio. Toate drepturile rezervate.',
      columns: [
        {
          title: 'Servicii',
          links: [
            { label: 'Dezvoltare Web', href: '#services' },
            { label: 'Aplicații Mobile', href: '#services' },
            { label: 'E-Commerce', href: '#services' },
            { label: 'Design UI/UX', href: '#services' },
          ],
        },
        {
          title: 'Companie',
          links: [
            { label: 'Despre noi', href: '#hero' },
            { label: 'Portofoliu', href: '#portfolio' },
            { label: 'Proces', href: '#process' },
            { label: 'FAQ', href: '#faq' },
          ],
        },
        {
          title: 'Legal',
          links: [
            { label: 'Termeni & Condiții', href: '#' },
            { label: 'Politica de Confidențialitate', href: '#' },
            { label: 'Cookies', href: '#' },
          ],
        },
      ],
    },

    // ---- Promoție globală ----
    globalPromo: {
      active: true,
      discountPercent: 0,
      label: 'Reduceri de lansare disponibile!',
      startDate: '2025-01-01',
      endDate: '2026-12-31',
    },
  };

  const insertSetting = db.prepare(
    'INSERT INTO settings (key, data) VALUES (?, ?)'
  );

  insertSetting.run('app', JSON.stringify(defaultSettings));

  console.log('[DB] Setări implicite inserate cu succes.');
}

// ----------------------------------------
// Seed user admin (dacă tabelul users este gol)
// ----------------------------------------
const userCount = db.prepare('SELECT COUNT(*) AS cnt FROM users').get();

if (userCount.cnt === 0) {
  const email = 'nexusdevstudio@admin.ro';
  const plainPassword = '.salataverde123!';
  const saltRounds = 12;
  const passwordHash = bcrypt.hashSync(plainPassword, saltRounds);

  const insertUser = db.prepare(
    'INSERT INTO users (email, password_hash) VALUES (?, ?)'
  );

  insertUser.run(email, passwordHash);

  console.log('[DB] Utilizator admin creat cu succes.');
}

module.exports = db;