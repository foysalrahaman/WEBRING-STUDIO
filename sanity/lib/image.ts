import imageUrlBuilder from '@sanity/image-url';
import { client } from './client';
import type { SanityImage } from '@/lib/types';

const builder = imageUrlBuilder(client);

type UrlChain = {
  width: (n: number) => UrlChain;
  height: (n: number) => UrlChain;
  url: () => string;
};

/**
 * Works for both backends:
 * - Sanity images (asset _ref) → Sanity CDN URL via the builder
 * - URL-backed images (Firestore/Storage, marked with `_url`) →
 *   the direct URL is returned as-is; width/height are no-ops
 *   because Firebase Storage serves the original file.
 */
export function urlFor(source: SanityImage) {
  if (source && typeof source._url === 'string') {
    const directUrl = source._url;
    const chain: UrlChain = {
      width: () => chain,
      height: () => chain,
      url: () => directUrl,
    };
    return chain as unknown as ReturnType<typeof builder.image>;
  }
  return builder.image(source);
}
