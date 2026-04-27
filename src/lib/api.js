// Use VITE_API_BASE_URL for both dev and prod. Fallback to empty string for same-origin if not set.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
