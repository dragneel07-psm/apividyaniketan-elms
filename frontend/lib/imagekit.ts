// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
/**
 * ImageKit CDN helpers.
 *
 * Backend media fields (school logo, notices, lesson materials, site content
 * images, project attachments — see backend/core/storage.py) already return
 * full absolute ImageKit URLs, so most call sites just render that URL as-is
 * (e.g. via next/image or a plain <img>). Reach for these helpers when you
 * additionally want ImageKit's on-the-fly transformations (resize, crop,
 * format conversion) or responsive srcset generation.
 *
 * Must match the backend's IMAGEKIT_URL_ENDPOINT.
 */
import { Image, ImageKitProvider, Video, buildSrc } from "@imagekit/next";
import type { Transformation } from "@imagekit/next";

export const IMAGEKIT_URL_ENDPOINT =
  process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "";

/**
 * Builds a transformed delivery URL from an absolute ImageKit URL or a
 * relative path (e.g. "/vidyaniketan/school_logo/abc-logo.png").
 *
 * Example: ikUrl(school.logo, [{ width: 200, height: 200 }])
 */
export function ikUrl(src: string, transformation?: Transformation[]): string {
  if (!src) return src;
  return buildSrc({
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
    src,
    transformation,
  });
}

// Re-exported so feature code can `import { Image, Video, ImageKitProvider } from "@/lib/imagekit"`
// instead of hardcoding the urlEndpoint in every component.
export { Image, Video, ImageKitProvider };
