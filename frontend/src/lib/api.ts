import { ApiResponse } from "@project3/shared";

export const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:3000";

/**
 * Generic fetch wrapper that handles the ApiResponse<T> shape.
 * It automatically unwraps 'data' if success is true, or throws 'message' if false.
 */
export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, options);
  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || `API Error: ${res.statusText}`);
  }

  return json.data;
}

export default API_URL;
