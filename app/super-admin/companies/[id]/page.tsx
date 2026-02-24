"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { fetchMe } from "@/lib/meCache";

type Company = {
  id: number;
  name: string;
  slug?: string | null;
  status: string;
  settings?: unknown;
  modules_enabled?: unknown;
  suspended_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ModuleItem = {
  name: string;
  enabled: boolean;
  meta?: Record<string, unknown>;
};

const DEFAULT_MODULES: ModuleItem[] = [
  { name: "employees", enabled: true },
  { name: "attendance", enabled: true },
  { name: "overtime", enabled: true },
  { name: "leave", enabled: true },
  { name: "payroll", enabled: true },
];

const isPlatformSuperRole = (me: { role?: string | null; employee?: { role?: string | null } | null } | null) => {
  const role = String(me?.role ?? me?.employee?.role ?? "").toLowerCase();
  return role === "super_admin" || role === "super-admin" || role === "superadmin" || role === "developer";
};

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const companyId = params?.id;

  const [company, setCompany] = useState<Company | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>(DEFAULT_MODULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const statusOptions = useMemo(() => ["active", "suspended"], []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetchMe();
      if (!isPlatformSuperRole(me)) {
        router.push("/dashboard");
        return;
      }

      const [companyRes, modulesRes] = await Promise.all([
        // Direct backend call: GET /api/v1/platform/companies/:id
        api.get(`/api/v1/platform/companies/${companyId}`),
        api.get(`/api/v1/platform/companies/${companyId}/modules`).catch(() => null),
      ]);

      const companyPayload: unknown = companyRes?.data?.data ?? companyRes?.data;
      setCompany(companyPayload as Company);

      const modulesRaw: unknown = (modulesRes as { data?: unknown } | null)?.data;
      const modulesPayload: unknown =
        modulesRaw && typeof modulesRaw === "object" && (modulesRaw as Record<string, unknown>).data
          ? (modulesRaw as Record<string, unknown>).data
          : modulesRaw;

      const list =
        modulesPayload && typeof modulesPayload === "object"
          ? (modulesPayload as Record<string, unknown>).modules
          : null;

      if (Array.isArray(list) && list.length) setModules(list as ModuleItem[]);
      else setModules(DEFAULT_MODULES);
    } catch (e: unknown) {
      if (e && typeof e === "object") {
        const rec = e as Record<string, unknown>;
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
      setError("Failed to load company");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!companyId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const updateField = (key: keyof Company, value: unknown) => {
    setCompany((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const toggleModule = (name: string) => {
    setModules((prev) => prev.map((m) => (m.name === name ? { ...m, enabled: !m.enabled } : m)));
  };

  const save = async () => {
    if (!company) return;
    setSaving(true);
    setError(null);
    try {
      const me = await fetchMe();
      if (!isPlatformSuperRole(me)) {
        setError("Only super admin can update companies.");
        router.push("/dashboard");
        return;
      }

      // Direct backend call: PUT /api/v1/platform/companies/:id
      await api.put(`/api/v1/platform/companies/${company.id}`, {
        name: company.name,
        slug: company.slug,
        status: company.status,
      });

      await api.put(`/api/v1/platform/companies/${company.id}/modules`, {
        modules,
      });

      await load();
      alert("Saved");
    } catch (e: unknown) {
      if (e && typeof e === "object") {
        const rec = e as Record<string, unknown>;
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
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const deleteVerificationToken = String(company?.slug || "").trim();

  const deleteCompany = async () => {
    if (!company) return;
    setError(null);

    if (!deleteVerificationToken) {
      setError("Company slug is required for verified delete. Please set/save slug first.");
      return;
    }

    if (deleteConfirmText.trim() !== deleteVerificationToken) {
      setError(`Delete verification failed. Type exactly: ${deleteVerificationToken}`);
      return;
    }

    if (!deletePassword.trim()) {
      setError("Current password is required for verified delete.");
      return;
    }

    setDeleting(true);
    try {
      const me = await fetchMe();
      if (!isPlatformSuperRole(me)) {
        setError("Only super admin can delete companies.");
        router.push("/dashboard");
        return;
      }

      // Direct backend call: DELETE /api/v1/platform/companies/:id
      // Backend requires: current_password + confirm_slug (+ optional confirm_text)
      await api.delete(`/api/v1/platform/companies/${company.id}`, {
        data: {
          current_password: deletePassword,
          confirm_slug: deleteVerificationToken,
          confirm_text: "DELETE",
        },
      });
      router.push("/super-admin");
    } catch (e: unknown) {
      if (e && typeof e === "object") {
        const rec = e as Record<string, unknown>;
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
      setError("Failed to delete company");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-3xl mx-auto text-slate-500">Loading…</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-slate-900 font-semibold">Company not found.</div>
          <button
            onClick={() => router.push("/super-admin")}
            className="mt-4 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
            <p className="text-slate-500 mt-1">Manage company settings and enabled modules.</p>
          </div>
          <button
            onClick={() => router.push("/super-admin")}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
          >
            Back
          </button>
        </div>

        {error && <div className="p-3 text-sm text-red-700 bg-red-50 rounded">{error}</div>}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
            <input
              value={company.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
            <input
              value={company.slug ?? ""}
              onChange={(e) => updateField("slug", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={String(company.status ?? "active").toLowerCase()}
              onChange={(e) => updateField("status", e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Modules</h2>
          <div className="space-y-3">
            {modules.map((m, idx) => (
              <label
                key={`${String(m?.name ?? "module")}:${idx}`}
                className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
              >
                <div>
                  <div className="font-medium text-slate-900">{m.name}</div>
                  <div className="text-xs text-slate-500">Enable/disable module for this company</div>
                </div>
                <input
                  type="checkbox"
                  checked={!!m.enabled}
                  onChange={() => toggleModule(m.name)}
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving || deleting}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            onClick={() => load()}
            disabled={saving || deleting}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
          >
            Reload
          </button>
        </div>

        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-red-700">Danger Zone</h2>
            <p className="text-sm text-slate-600 mt-1">
              Delete this company permanently. This action cannot be undone.
            </p>
          </div>

          <div className="text-sm text-slate-700">
            Type company slug <span className="font-semibold">{deleteVerificationToken || "(missing slug)"}</span> to confirm delete.
          </div>

          <input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={deleteVerificationToken || "Set company slug first"}
            className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            disabled={saving || deleting}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password (super admin)</label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your current password"
              className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              disabled={saving || deleting}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={deleteCompany}
              disabled={
                saving ||
                deleting ||
                !deleteVerificationToken ||
                deleteConfirmText.trim() !== deleteVerificationToken ||
                !deletePassword.trim()
              }
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete Company"}
            </button>
            <span className="text-xs text-slate-500">Only `super_admin` can perform this action.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
