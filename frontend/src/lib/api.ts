import { ApiResponse, isSuccessResponse } from "@project3/shared";

export const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:3000";

/**
 * Generic fetch wrapper that handles the ApiResponse<T> shape.
 * Automatically unwraps 'data' if success is true, or throws error if false.
 */
export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, options);
  
  // 1. Handle non-JSON responses (like 404s from the server that might be text)
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  const json: ApiResponse<T> = await res.json();

  // 2. Use the Type Guard 'isSuccessResponse' from shared types
  // This tells TypeScript that inside this block, 'json' is definitely the Success variant
  if (!isSuccessResponse(json)) {
    throw new Error(json.message || `API Error: ${res.statusText}`);
  }

  // 3. Return the data directly
  return json.data;
}

export default API_URL;