import axios from "axios";

/**
 * adminApi
 * Calls Next.js API routes under /api/admin/* (same origin), which then proxy to the backend.
 * This avoids CORS issues and keeps platform admin routes centralized.
 */
const adminApi = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

// Attach bearer token from localStorage if present
adminApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default adminApi;
