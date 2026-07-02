import { PRODUCT_API_URL, resolveAssetUrl } from '../config/api';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

type UploadErrorPayload = {
  message?: string | string[];
  error?: string;
};

export function validateProductImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return `${file.name}: only JPG, JPEG, and PNG images are allowed.`;
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `${file.name}: image size must be 5MB or smaller.`;
  }

  return null;
}

export async function uploadProductImage(file: File, token: string | null): Promise<string> {
  const validationError = validateProductImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  if (!token) {
    throw new Error('Your session is missing. Please log in again.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${PRODUCT_API_URL}/seller/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readUploadError(response, file.name));
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error(`${file.name}: upload succeeded without a file URL.`);
  }

  return resolveAssetUrl(data.url);
}

async function readUploadError(response: Response, fileName: string): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = (await response.json().catch(() => null)) as UploadErrorPayload | null;
    const message = Array.isArray(payload?.message)
      ? payload?.message.join(', ')
      : payload?.message || payload?.error;

    if (message) {
      if (message.includes('Missing x-user-id header')) {
        return `${fileName}: your session is invalid or expired. Please log in again.`;
      }
      return `${fileName}: ${message}`;
    }
  }

  const text = (await response.text().catch(() => '')).trim();
  if (text) {
    return `${fileName}: ${text}`;
  }

  return `${fileName}: upload failed with status ${response.status}.`;
}
