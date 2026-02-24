import axios from "axios";

const BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BROWSER_BASE = "/api/proxy";

const api = axios.create({
  // In the browser (including tenant subdomains), route through Next.js so requests are same-origin
  // and the backend consistently treats them as API (JSON) requests.
  baseURL: typeof window !== "undefined" ? BROWSER_BASE : BACKEND_BASE,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

const DEBUG_API = process.env.NEXT_PUBLIC_DEBUG_API === "1";

function setHeader(config, key, value) {
  if (!config.headers) config.headers = {};
  const h = config.headers;
  if (h && typeof h.set === "function") {
    h.set(key, value);
    return;
  }
  h[key] = value;
}

// Attach bearer token from localStorage if present
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Always request JSON responses (prevents Laravel from redirecting to web login).
    setHeader(config, "Accept", "application/json");
    setHeader(config, "X-Requested-With", "XMLHttpRequest");

    const token = localStorage.getItem("token");
    if (token) {
      setHeader(config, "Authorization", `Bearer ${token}`);
    }

    if (DEBUG_API) {
      // eslint-disable-next-line no-console
      console.debug(
        "[api]",
        (config.method || "GET").toUpperCase(),
        config.url,
        token ? "(auth)" : "(no-auth)"
      );
    }

    // -- SUPER ADMIN IMPERSONATION --
    const activeCompanyId = localStorage.getItem("active_company_id");
    if (activeCompanyId) {
       setHeader(config, "X-Active-Company", activeCompanyId);

       // Never block auth endpoints.
       const url = String(config.url || "");
       const isAuthEndpoint = url.includes("/login") || url.includes("/logout");
      const isContextExit = url.includes("/platform/context/exit");
      const isContextEnter = url.includes("/platform/context/enter");
      if (isAuthEndpoint || isContextExit || isContextEnter) return config;

      // Support Mode (super admin) can perform write operations.
    }
    // -------------------------------
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== "undefined") {
      // If the backend rejects the request as unauthenticated, force a clean re-login.
      const status = err?.response?.status;
      if (status === 401 || status === 419) {
        try {
          localStorage.removeItem("token");
          localStorage.removeItem("me");
        } catch {
          // ignore
        }
        window.location.assign("/auth/login");
      }

      // Common Laravel misconfiguration symptom when an API call is treated as a web request.
      const message = err?.response?.data?.message;
      if (typeof message === "string" && message.includes("Route [login] not defined")) {
        try {
          localStorage.removeItem("token");
          localStorage.removeItem("me");
        } catch {
          // ignore
        }
        // Best-effort: send user back to login.
        window.location.assign("/auth/login");
      }
    }
    return Promise.reject(err);
  }
);

export default api;
