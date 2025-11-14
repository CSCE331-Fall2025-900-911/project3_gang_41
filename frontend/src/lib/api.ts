export const API_URL =
  (import.meta.env.VITE_API_URL as string) ||
  (import.meta.env.VITE_BACKEND_URL as string) ||
  "http://localhost:3000";

export default API_URL;
