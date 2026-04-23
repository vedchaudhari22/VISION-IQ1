// In production, API calls should be relative to the current domain
// In development, use the configured API base URL or default to localhost
export const API_BASE_URL = import.meta.env.PROD
  ? ""  // Relative URLs for production (same domain)
  : (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
