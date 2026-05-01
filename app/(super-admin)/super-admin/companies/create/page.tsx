"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { fetchMe } from "@/lib/meCache";

const isPlatformSuperRole = (me: { role?: string | null; employee?: { role?: string | null } | null } | null) => {
  const role = String(me?.role ?? me?.employee?.role ?? "").toLowerCase();
  return role === "super_admin" || role === "super-admin" || role === "superadmin" || role === "developer";
};

export default function CreateCompanyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirmation, setAdminPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCompanyId, setCreatedCompanyId] = useState<number | string | null>(null);

  useEffect(() => {
    (async () => {
      const me = await fetchMe();
      if (!isPlatformSuperRole(me)) router.push("/dashboard");
    })();
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (adminPassword !== adminPasswordConfirmation) {
      setError("Company admin password confirmation does not match.");
      return;
    }

    setLoading(true);
    setError(null);
    setCreatedCompanyId(null);
    try {
      // Direct backend call: POST /api/v1/platform/companies
      const res = await api.post("/api/v1/platform/companies", {
        name,
        slug: slug || undefined,
        // Include admin payload for backends that support create-company-with-admin in one request.
        admin: {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          password_confirmation: adminPasswordConfirmation,
          role: "company_admin",
        },
        // Compatibility aliases for different backend request contracts.
        company_admin: {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          password_confirmation: adminPasswordConfirmation,
          role: "company_admin",
        },
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
        admin_password_confirmation: adminPasswordConfirmation,
      });

      const created = res?.data?.data ?? res?.data;
      const id = created?.id;

      // If company is created but admin wasn't created by the main endpoint,
      // try common platform admin-create endpoints as fallback.
      if (id) {
        const adminCreatedFlag = Boolean(
          created?.admin ||
            created?.company_admin ||
            created?.admin_user ||
            created?.owner ||
            created?.companyAdmin
        );

        if (!adminCreatedFlag) {
          const adminPayload = {
            name: adminName,
            email: adminEmail,
            password: adminPassword,
            password_confirmation: adminPasswordConfirmation,
            role: "company_admin",
          };

          let fallbackOk = false;
          const endpoints = [
            `/api/v1/platform/companies/${id}/admins`,
            `/api/v1/platform/companies/${id}/users`,
            `/api/v1/platform/company-admins`,
          ];

          for (const endpoint of endpoints) {
            try {
              const payload = endpoint.includes("company-admins")
                ? { company_id: id, ...adminPayload }
                : adminPayload;
              await api.post(endpoint, payload);
              fallbackOk = true;
              break;
            } catch {
              // try next endpoint
            }
          }

          if (!fallbackOk) {
            setCreatedCompanyId(id);
            setError(
              "Company created, but company admin could not be created automatically. Please open company detail and create the admin there (or verify backend admin-create endpoint)."
            );
            return;
          }
        }

        router.push(`/super-admin/companies/${id}`);
        return;
      }

      router.push("/super-admin");
    } catch (err: any) {
      const fallback = "Failed to create company";
      if (err && typeof err === "object") {
        const rec = err as Record<string, unknown>;
        const response = rec.response;
        if (response && typeof response === "object") {
          const r = response as Record<string, unknown>;
          const data = r.data;
          if (data && typeof data === "object") {
            const d = data as Record<string, unknown>;
            if (typeof d.message === "string") {
              setError(d.message);
              return;
            }
          }
        }
        if (typeof rec.message === "string") {
          setError(rec.message);
          return;
        }
      }
      setError(fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create Company</h1>
            <p className="text-slate-500 mt-1">Adds a new tenant to the platform.</p>
          </div>
          <button
            onClick={() => router.push("/super-admin")}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
          >
            Back
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          {error && <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 rounded">{error}</div>}
          {createdCompanyId && (
            <div className="mb-4 p-3 text-sm text-amber-800 bg-amber-50 rounded flex items-center justify-between gap-3">
              <span>Company was created successfully. Continue to company detail to finish admin setup.</span>
              <button
                type="button"
                onClick={() => router.push(`/super-admin/companies/${createdCompanyId}`)}
                className="px-3 py-1.5 rounded border border-amber-300 bg-white hover:bg-amber-100 text-amber-900"
              >
                Open Company
              </button>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="Acme Corp"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slug (optional)</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="acme"
              />
              <div className="text-xs text-slate-500 mt-1">Used for URLs/identifiers. Leave blank to auto-generate.</div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <h2 className="text-base font-semibold text-slate-900">Company Admin Account</h2>
              <p className="text-xs text-slate-500 mt-1">This user will be created as the initial admin for the company.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin Full Name</label>
              <input
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin Email</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="admin@acme.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={adminPasswordConfirmation}
                  onChange={(e) => setAdminPasswordConfirmation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium disabled:opacity-50 shadow-sm hover:shadow"
              >
                {loading ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/super-admin")}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
