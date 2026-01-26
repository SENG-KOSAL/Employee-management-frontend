import api from "@/services/api";

export type MePayload = {
  name?: string | null;
  employee?: {
    full_name?: string | null;
    id?: number | null;
    role?: string | null;
  } | null;
  role?: string | null;
};

let cachedMe: MePayload | null = null;
let pending: Promise<MePayload | null> | null = null;

/**
 * Fetches /api/v1/me with simple in-memory caching to avoid repeated role lookups.
 */
export async function fetchMe(force = false): Promise<MePayload | null> {
  if (!force && cachedMe) return cachedMe;
  if (!force && pending) return pending;

  pending = api
    .get("/api/v1/me")
    .then((res) => {
      const data: any = res.data?.data ?? res.data ?? null;
      cachedMe = data;
      pending = null;
      return cachedMe;
    })
    .catch((err) => {
      pending = null;
      cachedMe = null;
      throw err;
    });

  return pending;
}

export function getCachedMe(): MePayload | null {
  return cachedMe;
}

export function clearMeCache() {
  cachedMe = null;
  pending = null;
}
