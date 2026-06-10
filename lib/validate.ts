const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateImageFile(file: File): ValidationResult {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, error: "Unsupported file type. Use PNG, JPG, GIF, or WebP." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File too large. Max 10MB." };
  }
  return { ok: true };
}
