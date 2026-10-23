#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// WEBRING — Sanity → Firestore migration
// ═══════════════════════════════════════════════════════════════
// Copies every public content document from Sanity into Firestore
// in the layout that lib/firebase/queries.ts expects:
//   Sanity images (asset refs) → Sanity CDN URL strings
//   Sanity slug objects        → plain slug strings
//
// Usage:
//   node scripts/migrate-sanity-to-firestore.mjs --dry-run   (preview only)
//   node scripts/migrate-sanity-to-firestore.mjs             (real write)
//
// Requirements:
//   - .env.local contains the NEXT_PUBLIC_FIREBASE_* keys
//   - Firestore rules still allow writes (run this BEFORE you
//     publish the locked-down firestore.rules — e.g. while the
//     database is in test mode), or sign in an admin user.
// Form submissions (bookings/contacts) are NOT migrated — those
// are operational records, and new submissions already dual-write
// to Firestore from the API routes once the keys are present.
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// ── tiny .env.local loader (no dotenv dependency) ──────────────
function loadEnvLocal() {
  try {
    const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    console.warn('⚠  .env.local not found — relying on shell environment');
  }
}
loadEnvLocal();

const DRY_RUN = process.argv.includes('--dry-run');

const SANITY_PROJECT = 'rifht9hi';
const SANITY_DATASET = 'production';
const SANITY_API = `https://${SANITY_PROJECT}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}`;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!DRY_RUN && (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId)) {
  console.error('✗ Firebase keys missing in .env.local — fill NEXT_PUBLIC_FIREBASE_* first.');
  process.exit(1);
}

// ── Sanity helpers ─────────────────────────────────────────────
async function sanityFetch(query) {
  const url = `${SANITY_API}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${await res.text()}`);
  return (await res.json()).result;
}

/** Sanity image object → CDN URL string (undefined stays undefined). */
function imageUrl(image) {
  const ref = image?.asset?._ref;
  if (!ref) return undefined;
  // ref format: image-<id>-<width>x<height>-<ext>
  const m = ref.match(/^image-(.+)-(\d+x\d+)-(\w+)$/);
  if (!m) return undefined;
  return `https://cdn.sanity.io/images/${SANITY_PROJECT}/${SANITY_DATASET}/${m[1]}-${m[2]}.${m[3]}`;
}

const clean = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

// ── transforms (must match lib/firebase/queries.ts) ────────────
const transforms = {
  siteSettings: (d) => clean({
    companyName: d.companyName,
    maintenanceMode: d.maintenanceMode ?? false,
    tagline: d.tagline,
    email: d.email,
    whatsapp: d.whatsapp,
    location: d.location,
    logoUrl: imageUrl(d.logo),
    logoDarkUrl: imageUrl(d.logoDark),
    ogImageUrl: imageUrl(d.ogImage),
    instagramUrl: d.instagramUrl,
    facebookUrl: d.facebookUrl,
    linkedinUrl: d.linkedinUrl,
    behanceUrl: d.behanceUrl,
    clientBrands: (d.clientBrands || []).map((b) => clean({ name: b.name, logoUrl: imageUrl(b.logo) })),
  }),
  homePage: (d) => clean({
    heroLine1: d.heroLine1,
    heroLine2: d.heroLine2,
    heroSubtitle: d.heroSubtitle,
    socialProof: d.socialProof,
    cta1Text: d.cta1Text,
    cta2Text: d.cta2Text,
    heroImageUrls: (d.heroImages || []).map(imageUrl).filter(Boolean),
    marqueeText: d.marqueeText,
    stats: (d.stats || []).map((s) => ({ value: s.value, label: s.label, suffix: s.suffix })),
    ctaBannerHeading: d.ctaBannerHeading,
    ctaBannerSubtext: d.ctaBannerSubtext,
  }),
  availableDates: (d) => ({ dates: d.dates || [], timeSlots: d.timeSlots || [] }),
  portfolio: (d) => clean({
    title: d.title,
    slug: d.slug?.current,
    category: d.category,
    clientIndustry: d.clientIndustry,
    projectDate: d.projectDate,
    featured: d.featured ?? false,
    coverImageUrl: imageUrl(d.coverImage),
    projectImages: (d.projectImages || []).map((p) => clean({
      imageUrl: imageUrl(p.image),
      caption: p.caption,
      isBeforeImage: p.isBeforeImage,
      isAfterImage: p.isAfterImage,
    })),
    shortDescription: d.shortDescription,
    fullDescription: d.fullDescription,
    tools: d.tools,
    tags: d.tags,
    results: d.results,
    order: d.order ?? 0,
  }),
  service: (d) => clean({
    title: d.title,
    slug: d.slug?.current,
    subtitle: d.subtitle,
    description: d.description,
    features: d.features,
    imageUrl: imageUrl(d.image),
    icon: d.icon,
    startingPrice: d.startingPrice,
    order: d.order ?? 0,
  }),
  pricing: (d) => clean({
    tierName: d.tierName,
    price: d.price,
    period: d.period,
    highlighted: d.highlighted ?? false,
    features: d.features,
    ctaText: d.ctaText,
    order: d.order ?? 0,
  }),
  testimonial: (d) => clean({
    clientName: d.clientName,
    company: d.company,
    quote: d.quote,
    rating: d.rating,
    avatarUrl: imageUrl(d.avatar),
    service: d.service,
    featured: d.featured ?? false,
  }),
  teamMember: (d) => clean({
    name: d.name,
    role: d.role,
    responsibilities: d.responsibilities,
    bio: d.bio,
    photoUrl: imageUrl(d.photo),
    instagramUrl: d.instagramUrl,
    linkedinUrl: d.linkedinUrl,
    order: d.order ?? 0,
  }),
};

// ── main ───────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — nothing will be written\n' : '🚀 Migrating Sanity → Firestore\n');

  const app = DRY_RUN ? null : initializeApp(firebaseConfig);
  const db = DRY_RUN ? null : getFirestore(app);
  let written = 0;

  async function put(collectionName, docId, data) {
    console.log(`  ${collectionName}/${docId}`);
    if (!DRY_RUN) await setDoc(doc(db, collectionName, docId), data);
    written++;
  }

  // Singletons → content/{name}
  for (const type of ['siteSettings', 'homePage', 'availableDates']) {
    const docData = await sanityFetch(`*[_type == "${type}"][0]`);
    if (docData) await put('content', type, transforms[type](docData));
    else console.log(`  (skip content/${type} — not in Sanity)`);
  }

  // Collections — doc id = slug when there is one, else the Sanity _id
  const collections = [
    ['portfolio', 'portfolio'],
    ['service', 'services'],
    ['pricing', 'pricing'],
    ['testimonial', 'testimonials'],
    ['teamMember', 'team'],
  ];
  for (const [type, collectionName] of collections) {
    const docs = await sanityFetch(`*[_type == "${type}"]`);
    console.log(`${collectionName}: ${docs.length} docs`);
    for (const d of docs) {
      const id = d.slug?.current || d._id;
      await put(collectionName, id, transforms[type](d));
    }
  }

  console.log(`\n✓ ${written} documents ${DRY_RUN ? 'would be written' : 'written to Firestore'}.`);
  if (!DRY_RUN) {
    console.log('Next: check the data in Firebase Console → Firestore Database,');
    console.log('publish firestore.rules, then set NEXT_PUBLIC_USE_FIRESTORE=true');
    console.log('in .env.local (and in Vercel) and redeploy.');
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('✗ Migration failed:', err);
  process.exit(1);
});
