import { HARD_MAX_BYTES } from "./image-compress";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateImageFile(file: File): ValidationResult {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, error: "Unsupported file type. Use PNG, JPG, GIF, or WebP." };
  }
  if (file.size > HARD_MAX_BYTES) {
    return { ok: false, error: "File too large. Max 50MB." };
  }
  return { ok: true };
}
