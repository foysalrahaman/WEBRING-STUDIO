// ═══════════════════════════════════════════════════════════════
// WEBRING — Firestore data layer
// ═══════════════════════════════════════════════════════════════
// Every function mirrors one Sanity GROQ query (sanity/lib/queries.ts)
// and returns the SAME TypeScript shapes from lib/types.ts, so no
// component needs to change when the data source flips to Firestore.
//
// Firestore layout (written by scripts/migrate-sanity-to-firestore.mjs):
//   content/homePage        (single doc)  — hero, marquee, stats, CTA
//   content/siteSettings    (single doc)  — company info, logos, socials
//   content/availableDates  (single doc)  — booking dates + time slots
//   portfolio/{id}          — slug stored as a plain string,
//                             images stored as direct URL strings
//   services/{id}  pricing/{id}  testimonials/{id}  team/{id}
//   bookings/{id}  contacts/{id}         — form submissions (write-only)
//
// Images: Firestore stores plain download URLs. The adapter wraps a
// URL into the SanityImage shape with `_url` set; urlFor() in
// sanity/lib/image.ts detects `_url` and returns it directly, and the
// parent item's `fallbackUrl` is set to the same URL as a second net.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDb, getFirebaseStorage } from './config';
import type {
  SiteSettings,
  HomePage,
  PortfolioItem,
  TeamMember,
  Service,
  Testimonial,
  PricingTier,
  AvailableDates,
  SanityImage,
  Booking,
  ContactForm,
} from '@/lib/types';

// ── helpers ────────────────────────────────────────────────────

/** Wrap a direct image URL into the shape components already expect. */
function img(url?: string | null): SanityImage | undefined {
  if (!url) return undefined;
  return {
    _type: 'image',
    // Truthy placeholder so components that check `image?.asset`
    // take the urlFor() path; urlFor() returns `_url` for these.
    asset: { _ref: 'firestore-url', _type: 'reference' },
    _url: url,
  } as SanityImage;
}

function withId<T extends DocumentData>(id: string, data: T): T & { _id: string } {
  return { _id: id, ...data };
}

async function getSingleton<T>(docId: string): Promise<T | null> {
  const db = getDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, 'content', docId));
  return snap.exists() ? (snap.data() as T) : null;
}

async function getCollection<T extends DocumentData>(
  name: string,
  orderField?: string,
): Promise<Array<T & { _id: string }>> {
  const db = getDb();
  if (!db) return [];
  const col = collection(db, name);
  const snap = orderField
    ? await getDocs(query(col, orderBy(orderField, 'asc')))
    : await getDocs(col);
  return snap.docs.map((d) => withId(d.id, d.data() as T));
}

// ── raw Firestore document shapes ──────────────────────────────

interface FsSiteSettings extends Omit<SiteSettings, 'logo' | 'logoDark' | 'ogImage' | 'clientBrands'> {
  logoUrl?: string;
  logoDarkUrl?: string;
  ogImageUrl?: string;
  clientBrands?: Array<{ name: string; logoUrl?: string }>;
}

interface FsHomePage extends Omit<HomePage, 'heroMainImage' | 'heroImages' | 'stats'> {
  heroImageUrls?: string[];
  stats?: Array<{ value: number; label: string; suffix: string }>;
}

interface FsPortfolio extends Omit<PortfolioItem, '_id' | 'slug' | 'coverImage' | 'projectImages'> {
  slug: string;
  coverImageUrl?: string;
  projectImages?: Array<{
    imageUrl?: string;
    caption?: string;
    isBeforeImage?: boolean;
    isAfterImage?: boolean;
  }>;
}

interface FsService extends Omit<Service, '_id' | 'slug' | 'image'> {
  slug: string;
  imageUrl?: string;
}

interface FsTeamMember extends Omit<TeamMember, '_id' | 'photo'> {
  photoUrl?: string;
}

interface FsTestimonial extends Omit<Testimonial, '_id' | 'avatar'> {
  avatarUrl?: string;
}

// ── adapters: Firestore doc → existing app types ───────────────

function adaptSiteSettings(raw: FsSiteSettings): SiteSettings {
  const { logoUrl, logoDarkUrl, ogImageUrl, clientBrands, ...rest } = raw;
  return {
    ...rest,
    logo: img(logoUrl),
    logoDark: img(logoDarkUrl),
    ogImage: img(ogImageUrl),
    clientBrands: (clientBrands || []).map((b, i) => ({
      _key: `brand-${i}`,
      name: b.name,
      logo: img(b.logoUrl) as SanityImage,
    })),
  };
}

function adaptHomePage(raw: FsHomePage): HomePage {
  const { heroImageUrls, stats, ...rest } = raw;
  const images = (heroImageUrls || []).map((u) => img(u)).filter(Boolean) as SanityImage[];
  return {
    ...rest,
    heroMainImage: images[0],
    heroImages: images,
    stats: (stats || []).map((s, i) => ({ _key: `stat-${i}`, ...s })),
  };
}

function adaptPortfolio(id: string, raw: FsPortfolio): PortfolioItem {
  const { slug, coverImageUrl, projectImages, ...rest } = raw;
  return {
    ...rest,
    _id: id,
    slug: { current: slug },
    coverImage: img(coverImageUrl) as SanityImage,
    fallbackUrl: coverImageUrl,
    projectImages: (projectImages || []).map((p) => ({
      image: img(p.imageUrl) as SanityImage,
      caption: p.caption,
      isBeforeImage: p.isBeforeImage,
      isAfterImage: p.isAfterImage,
    })),
  };
}

function adaptService(id: string, raw: FsService): Service {
  const { slug, imageUrl, ...rest } = raw;
  return {
    ...rest,
    _id: id,
    slug: { current: slug },
    image: img(imageUrl),
    fallbackUrl: imageUrl,
  };
}

function adaptTeamMember(id: string, raw: FsTeamMember): TeamMember {
  const { photoUrl, ...rest } = raw;
  return { ...rest, _id: id, photo: img(photoUrl), fallbackUrl: photoUrl };
}

function adaptTestimonial(id: string, raw: FsTestimonial): Testimonial {
  const { avatarUrl, ...rest } = raw;
  return { ...rest, _id: id, avatar: img(avatarUrl) };
}

// ── reads (one per Sanity query) ───────────────────────────────

export async function getSiteSettingsFs(): Promise<SiteSettings | null> {
  const raw = await getSingleton<FsSiteSettings>('siteSettings');
  return raw ? adaptSiteSettings(raw) : null;
}

export async function getHomePageFs(): Promise<HomePage | null> {
  const raw = await getSingleton<FsHomePage>('homePage');
  return raw ? adaptHomePage(raw) : null;
}

export async function getAvailableDatesFs(): Promise<AvailableDates | null> {
  return getSingleton<AvailableDates>('availableDates');
}

export async function getAllPortfolioFs(): Promise<PortfolioItem[]> {
  const docs = await getCollection<FsPortfolio>('portfolio', 'order');
  return docs.map((d) => adaptPortfolio(d._id, d));
}

export async function getFeaturedPortfolioFs(): Promise<PortfolioItem[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(
    query(
      collection(db, 'portfolio'),
      where('featured', '==', true),
      orderBy('order', 'asc'),
      limit(6),
    ),
  );
  return snap.docs.map((d) => adaptPortfolio(d.id, d.data() as FsPortfolio));
}

export async function getPortfolioBySlugFs(slug: string): Promise<PortfolioItem | null> {
  const db = getDb();
  if (!db) return null;
  const snap = await getDocs(
    query(collection(db, 'portfolio'), where('slug', '==', slug), limit(1)),
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return adaptPortfolio(d.id, d.data() as FsPortfolio);
}

export async function getRelatedPortfolioFs(
  category: string,
  slug: string,
): Promise<PortfolioItem[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(
    query(
      collection(db, 'portfolio'),
      where('category', '==', category),
      orderBy('order', 'asc'),
      limit(4),
    ),
  );
  return snap.docs
    .map((d) => adaptPortfolio(d.id, d.data() as FsPortfolio))
    .filter((p) => p.slug.current !== slug)
    .slice(0, 3);
}

export async function getPortfolioSlugsFs(): Promise<string[]> {
  const docs = await getCollection<FsPortfolio>('portfolio');
  return docs.map((d) => d.slug).filter(Boolean);
}

export async function getTeamMembersFs(): Promise<TeamMember[]> {
  const docs = await getCollection<FsTeamMember>('team', 'order');
  return docs.map((d) => adaptTeamMember(d._id, d));
}

export async function getServicesFs(): Promise<Service[]> {
  const docs = await getCollection<FsService>('services', 'order');
  return docs.map((d) => adaptService(d._id, d));
}

export async function getTestimonialsFs(featuredOnly = true): Promise<Testimonial[]> {
  const db = getDb();
  if (!db) return [];
  const col = collection(db, 'testimonials');
  const snap = featuredOnly
    ? await getDocs(query(col, where('featured', '==', true)))
    : await getDocs(col);
  return snap.docs.map((d) => adaptTestimonial(d.id, d.data() as FsTestimonial));
}

export async function getPricingFs(): Promise<PricingTier[]> {
  const docs = await getCollection<Omit<PricingTier, '_id'>>('pricing', 'order');
  return docs as PricingTier[];
}

// ── writes (form submissions) ──────────────────────────────────

export async function createBookingFs(
  data: Omit<Booking, '_id' | 'status' | 'createdAt'>,
): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const ref = await addDoc(collection(db, 'bookings'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createContactFs(
  data: ContactForm & { phone?: string },
): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const ref = await addDoc(collection(db, 'contacts'), {
    ...data,
    status: 'new',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ── storage (product / portfolio image uploads) ────────────────

/** Upload an image to Firebase Storage and return its download URL. */
export async function uploadImageFs(file: File | Blob, path: string): Promise<string | null> {
  const storage = getFirebaseStorage();
  if (!storage) return null;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
