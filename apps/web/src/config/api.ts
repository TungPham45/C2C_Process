const rawApiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '/api';

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '') || '/api';
export const AUTH_API_URL = `${API_BASE_URL}/auth`;
export const PRODUCT_API_URL = `${API_BASE_URL}/products`;
export const ORDER_API_URL = `${API_BASE_URL}/orders`;
export const CART_API_URL = `${API_BASE_URL}/cart`;
export const WALLET_API_URL = `${AUTH_API_URL}/wallet`;
export const ADMIN_API_URL = `${API_BASE_URL}/admin`;

const LOCAL_ASSET_HOSTS = new Set(['localhost', '127.0.0.1']);

export const resolveAssetUrl = (url?: string | null) => {
  if (!url || typeof window === 'undefined') return url ?? '';
  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/')) return url;

  try {
    const parsedUrl = new URL(url);
    if (!LOCAL_ASSET_HOSTS.has(parsedUrl.hostname)) return url;
    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return url;
  }
};

export const normalizeProductAssetUrls = <T extends Record<string, any>>(product: T): T =>
  ({
    ...product,
    thumbnail_url: resolveAssetUrl(product.thumbnail_url),
    images: Array.isArray(product.images)
      ? product.images.map((image: any) => {
          if (typeof image === 'string') return resolveAssetUrl(image);
          if (image && typeof image === 'object' && 'image_url' in image) {
            return { ...image, image_url: resolveAssetUrl(image.image_url) };
          }
          return image;
        })
      : product.images,
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant: any) =>
          variant && typeof variant === 'object'
            ? { ...variant, image_url: resolveAssetUrl(variant.image_url) }
            : variant
        )
      : product.variants,
  }) as T;
