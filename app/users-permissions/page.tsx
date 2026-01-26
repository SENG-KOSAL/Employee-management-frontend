"use client";

import { useMemo, useState } from "react";
import { Shield, Users, KeyRound, CheckCircle2, Info, Search, Plus, Filter } from "lucide-react";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";

const sampleRoles = [
  {
    name: "Admin",
    users: 4,
    permissions: ["employees:read", "employees:write", "payroll:write", "leaves:approve", "settings:write"],
  },
  {
    name: "Manager",
    users: 12,
    permissions: ["employees:read", "leaves:approve", "attendance:read"],
  },
  {
    name: "Employee",
    users: 128,
    permissions: ["self:profile", "self:leave", "self:payslip"],
  },
];

const permissionCatalog = [
  { key: "employees:read", label: "View employees" },
  { key: "employees:write", label: "Edit employees" },
  { key: "leaves:approve", label: "Approve leave" },
  { key: "attendance:read", label: "View attendance" },
  { key: "payroll:write", label: "Run payroll" },
  { key: "settings:write", label: "Change settings" },
  { key: "self:profile", label: "Update own profile" },
  { key: "self:leave", label: "Submit leave" },
  { key: "self:payslip", label: "View payslip" },
];

export default function UsersPermissionsPage() {
  const catalogMap = useMemo(() => {
    const map: Record<string, string> = {};
    permissionCatalog.forEach((p) => (map[p.key] = p.label));
    return map;
  }, []);

  const [roleSearch, setRoleSearch] = useState("");
  const filteredRoles = useMemo(() => {
    const term = roleSearch.trim().toLowerCase();
    if (!term) return sampleRoles;
    return sampleRoles.filter((r) => r.name.toLowerCase().includes(term));
  }, [roleSearch]);

  return (
    <HRMSSidebar>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-blue-600 font-semibold">System</p>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" /> Users & Permissions
            </h1>
            <p className="text-sm text-gray-600">Define roles, review access, and keep least-privilege in place.</p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">
              <Plus className="w-4 h-4" /> Add role
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
              <Users className="w-4 h-4" /> Invite user
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs uppercase text-gray-500 font-semibold">Roles</p>
                <p className="text-xl font-bold text-gray-900">{sampleRoles.length}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Create roles and attach permissions instead of granting directly to users.</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs uppercase text-gray-500 font-semibold">Permissions</p>
                <p className="text-xl font-bold text-gray-900">{permissionCatalog.length}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Use clear, action-based permissions (view, edit, approve, run).</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs uppercase text-gray-500 font-semibold">Assignments</p>
                <p className="text-xl font-bold text-gray-900">{sampleRoles.reduce((sum, r) => sum + r.users, 0)}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Assign users to roles; avoid one-off custom permissions.</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Roles overview</h2>
              <p className="text-xs text-gray-500">Sample data — wire this to your roles API.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  placeholder="Search roles"
                  className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                <Filter className="w-4 h-4" /> Filter
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredRoles.map((role) => (
              <div key={role.name} className="px-5 py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{role.name}</p>
                  <p className="text-xs text-gray-500">{role.users} users</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {role.permissions.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-700">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      {catalogMap[p] || p}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 text-xs text-blue-600 font-semibold">
                  <button className="hover:text-blue-700">Edit</button>
                  <span className="text-gray-300">·</span>
                  <button className="hover:text-blue-700">Assign users</button>
                </div>
              </div>
            ))}
            {filteredRoles.length === 0 && (
              <div className="px-5 py-6 text-sm text-gray-500">No roles match your search.</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 text-gray-800">
            <Info className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-sm font-semibold">How to wire this page</p>
              <p className="text-xs text-gray-500">Replace sample data with your API calls for roles, permissions, and user assignments.</p>
            </div>
          </div>
          <div className="p-5 text-sm text-gray-700 space-y-3">
            <div>
              <p className="font-semibold text-gray-800">How to make this live</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><code>GET /api/v1/roles</code> → replace <code>sampleRoles</code></li>
                <li><code>GET /api/v1/permissions</code> → replace <code>permissionCatalog</code></li>
                <li><code>POST /api/v1/roles</code> to create; <code>PATCH /api/v1/roles/:id</code> to edit</li>
                <li><code>POST /api/v1/role-assignments</code> to assign users</li>
              </ul>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
              Tip: Keep permissions atomic (action + resource), e.g., <code>employees:read</code>, <code>leaves:approve</code>. Avoid broad wildcard roles.
            </div>
          </div>
        </div>
      </div>
    </HRMSSidebar>
  );
}
