"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { getToken } from "@/utils/auth";

export default function PayrollCreatePage() {
  const router = useRouter();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }
    try {
      setLoading(true);
      const [yearStr, monthStr] = month.split("-");
      const payload: Record<string, any> = { month: Number(monthStr), year: Number(yearStr) };
      if (notes.trim()) payload.notes = notes.trim();
      const res = await api.post("/api/v1/payroll-runs", payload);
      const created = res.data?.data ?? res.data;
      setSuccess("Payroll run generated successfully.");
      setTimeout(() => setSuccess(""), 3000);
      // If backend returns id, go to payroll page; otherwise just navigate back.
      if (created?.id) {
        router.push(`/payroll/${created.id}`);
      } else {
        router.push("/payroll");
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || "Failed to create payroll run";
      setError(message);
      console.error("Create payroll error", err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-blue-600 font-semibold">Admin Only</p>
            <h1 className="text-2xl font-bold text-gray-900">Generate Payroll</h1>
            <p className="text-sm text-gray-500">Create a payroll run for a specific month (all active employees are included).</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-700">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Note (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any extra info for this payroll run"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-black bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "Generate Payroll"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/payroll")}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </HRMSSidebar>
  );
}
