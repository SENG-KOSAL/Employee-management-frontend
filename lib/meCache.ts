import api from "@/services/api";

export type MePayload = {
  id?: number | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  employee?: {
    full_name?: string | null;
    id?: number | null;
    role?: string | null;
  } | null;
  role?: string | null;
  status?: string | null;
  company_id?: number | null;
  company?: {
    id?: number | null;
    name?: string | null;
    slug?: string | null;
    status?: string | null;
  } | null;
};

let cachedMe: MePayload | null = null;
let pending: Promise<MePayload | null> | null = null;

const STORAGE_KEY = "hrms.me.v1";

type StoredMe = {
  ts: number;
  value: MePayload | null;
};

const readStored = (): StoredMe | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const rec = parsed as Record<string, unknown>;
    if (typeof rec.ts !== "number") return null;
    return { ts: rec.ts, value: (rec.value ?? null) as MePayload | null };
  } catch {
    return null;
  }
};

const writeStored = (value: MePayload | null) => {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredMe = { ts: Date.now(), value };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
};

const clearStored = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

const isFresh = (ts: number, ttlMs: number) => Date.now() - ts < ttlMs;

const normalizeMe = (data: unknown): MePayload | null => {
  if (!data || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  const employee = rec.employee;
  const employeeObj = employee && typeof employee === "object" ? (employee as Record<string, unknown>) : null;
  const company = rec.company;
  const companyObj = company && typeof company === "object" ? (company as Record<string, unknown>) : null;

  return {
    id: typeof rec.id === "number" ? rec.id : null,
    name: typeof rec.name === "string" ? rec.name : null,
    username: typeof rec.username === "string" ? rec.username : null,
    email: typeof rec.email === "string" ? rec.email : null,
    role: typeof rec.role === "string" ? rec.role : null,
    status: typeof rec.status === "string" ? rec.status : null,
    company_id: typeof rec.company_id === "number" ? rec.company_id : null,
    company: companyObj
      ? {
          id: typeof companyObj.id === "number" ? companyObj.id : null,
          name: typeof companyObj.name === "string" ? companyObj.name : null,
          slug: typeof companyObj.slug === "string" ? companyObj.slug : null,
          status: typeof companyObj.status === "string" ? companyObj.status : null,
        }
      : null,
    employee: employeeObj
      ? {
          full_name: typeof employeeObj.full_name === "string" ? employeeObj.full_name : null,
          id: typeof employeeObj.id === "number" ? employeeObj.id : null,
          role: typeof employeeObj.role === "string" ? employeeObj.role : null,
        }
      : null,
  };
};

/**
 * Fetches current user with caching (memory + localStorage).
 * - Defaults to returning cached value if fresh
 * - Supports both `/me` and `/api/v1/me` backends
 */
export async function fetchMe(
  force = false,
  opts?: {
    ttlMs?: number;
  }
): Promise<MePayload | null> {
  const ttlMs = opts?.ttlMs ?? 5 * 60 * 1000;

  if (!force && cachedMe) return cachedMe;

  if (!force) {
    const stored = readStored();
    if (stored && isFresh(stored.ts, ttlMs)) {
      cachedMe = stored.value;
      return cachedMe;
    }
  }

  if (!force && pending) return pending;

  pending = (async () => {
    try {
      let res: unknown;
      try {
        res = await api.get("/me");
      } catch {
        res = await api.get("/api/v1/me");
      }

      const responseData = (res as { data?: unknown } | null)?.data;
      const payload = (() => {
        if (!responseData || typeof responseData !== "object") return null;
        const top = responseData as Record<string, unknown>;
        const maybeData = top.data;
        if (maybeData && typeof maybeData === "object") return maybeData;
        return top;
      })();

      cachedMe = normalizeMe(payload);
      writeStored(cachedMe);
      return cachedMe;
    } catch {
      // Fallback: use legacy localStorage key written by login page (`utils/auth.saveMe`).
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem("me");
          if (raw) {
            const parsed = JSON.parse(raw) as unknown;
            const payload = (() => {
              if (!parsed || typeof parsed !== "object") return null;
              const top = parsed as Record<string, unknown>;
              // Some backends return { user: {...} } in login responses.
              const maybeUser = top.user;
              if (maybeUser && typeof maybeUser === "object") return maybeUser;
              const maybeData = top.data;
              if (maybeData && typeof maybeData === "object") return maybeData;
              return top;
            })();

            cachedMe = normalizeMe(payload);
            writeStored(cachedMe);
            return cachedMe;
          }
        } catch {
          // ignore
        }
      }
      return null;
    } finally {
      pending = null;
    }
  })();

  return pending;
}

export function getCachedMe(): MePayload | null {
  return cachedMe;
}

export function clearMeCache() {
  cachedMe = null;
  pending = null;
  clearStored();
}
