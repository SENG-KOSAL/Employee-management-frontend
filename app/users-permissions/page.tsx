"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield, Users, KeyRound, Info, Search, Plus } from "lucide-react";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { RoleGate } from "@/components/auth/RoleGate";
import { permissionsService, type Permission } from "@/services/permissions";

const roles = [
  { key: "admin", label: "Admin" },
  { key: "hr", label: "HR" },
  { key: "manager", label: "Manager" },
  { key: "employee", label: "Employee" },
] as const;

export default function UsersPermissionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<(typeof roles)[number]["key"]>("hr");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [roleSearch, setRoleSearch] = useState("");

  const filteredRoles = useMemo(() => {
    const term = roleSearch.trim().toLowerCase();
    if (!term) return roles;
    return roles.filter((r) => r.label.toLowerCase().includes(term) || r.key.toLowerCase().includes(term));
  }, [roleSearch]);

  const permissionMap = useMemo(() => {
    const map: Record<string, string> = {};
    permissions.forEach((p) => {
      map[p.key] = p.description || p.key;
    });
    return map;
  }, [permissions]);

  const isAdminRoleSelected = selectedRole === "admin";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const list = await permissionsService.list();
        if (cancelled) return;
        setPermissions(Array.isArray(list) ? list : []);
      } catch (err: unknown) {
        console.error(err);
        setError("Failed to load permissions");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadRole = async () => {
      if (isAdminRoleSelected) {
        setRolePermissions([]);
        return;
      }
      try {
        setRoleLoading(true);
        setError("");
        const list = await permissionsService.getRolePermissions(selectedRole);
        if (cancelled) return;
        setRolePermissions(Array.isArray(list) ? list : []);
      } catch (err: unknown) {
        console.error(err);
        if (cancelled) return;
        setError(`Failed to load permissions for role: ${selectedRole}`);
        setRolePermissions([]);
      } finally {
        setRoleLoading(false);
      }
    };
    loadRole();
    return () => {
      cancelled = true;
    };
  }, [selectedRole, isAdminRoleSelected]);

  const [createKey, setCreateKey] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreatePermission = async () => {
    const key = createKey.trim();
    const description = createDescription.trim();
    if (!key) return;
    try {
      setCreating(true);
      setError("");
      setSuccess("");
      await permissionsService.create({ key, description: description || undefined });
      const list = await permissionsService.list();
      setPermissions(Array.isArray(list) ? list : []);
      setCreateKey("");
      setCreateDescription("");
      setSuccess("Permission created");
      setTimeout(() => setSuccess(""), 1500);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to create permission");
    } finally {
      setCreating(false);
    }
  };

  const togglePermission = (permKey: string) => {
    setRolePermissions((prev) => (prev.includes(permKey) ? prev.filter((k) => k !== permKey) : [...prev, permKey]));
  };

  const handleSaveRolePermissions = async () => {
    if (isAdminRoleSelected) return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const next = await permissionsService.updateRolePermissions(selectedRole, rolePermissions);
      setRolePermissions(Array.isArray(next) ? next : rolePermissions);
      setSuccess("Saved");
      setTimeout(() => setSuccess(""), 1500);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to save role permissions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <HRMSSidebar>
      <RoleGate allowRoles={["admin", "super_admin", "developer"]}>
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
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-gray-500">Admin / Super Admin page</span>
            </div>
          </div>
        </div>

        {error ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        ) : null}
        {success ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>
        ) : null}

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Create Permission</p>
              <p className="text-xs text-gray-500">Example: <code>leave.approve</code>, <code>attendance.view_all</code></p>
            </div>
            <button
              type="button"
              onClick={handleCreatePermission}
              disabled={creating || !createKey.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> {creating ? "Creating..." : "Create"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Key</label>
              <input
                value={createKey}
                onChange={(e) => setCreateKey(e.target.value)}
                placeholder="leave.approve"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Approve/reject leave requests"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs uppercase text-gray-500 font-semibold">Roles</p>
                <p className="text-xl font-bold text-gray-900">{roles.length}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Create roles and attach permissions instead of granting directly to users.</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs uppercase text-gray-500 font-semibold">Permissions</p>
                <p className="text-xl font-bold text-gray-900">{permissions.length}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Use clear, action-based permissions (view, edit, approve, run).</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs uppercase text-gray-500 font-semibold">Assignments</p>
                <p className="text-xl font-bold text-gray-900">—</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Assign users to roles; avoid one-off custom permissions.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Roles</h2>
              <p className="text-xs text-gray-500">Select a role to assign permissions.</p>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  placeholder="Search roles"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredRoles.map((role) => {
                const active = role.key === selectedRole;
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setSelectedRole(role.key)}
                    className={`w-full text-left px-5 py-4 hover:bg-gray-50 ${active ? "bg-blue-50" : "bg-white"}`}
                  >
                    <p className={`text-sm font-semibold ${active ? "text-blue-700" : "text-gray-900"}`}>{role.label}</p>
                    <p className="text-xs text-gray-500">role: {role.key}</p>
                  </button>
                );
              })}

              {filteredRoles.length === 0 ? (
                <div className="px-5 py-6 text-sm text-gray-500">No roles match your search.</div>
              ) : null}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden lg:col-span-2">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Permissions for: {selectedRole}</h2>
                <p className="text-xs text-gray-500">
                  {isAdminRoleSelected
                    ? "Admin bypasses permission checks (can access everything)."
                    : "Toggle permissions and press Save."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveRolePermissions}
                disabled={saving || roleLoading || loading || isAdminRoleSelected}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-sm hover:shadow disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>

            {loading ? (
              <div className="p-5 text-sm text-gray-500">Loading permissions...</div>
            ) : (
              <div className="p-5">
                {permissions.length === 0 ? (
                  <div className="text-sm text-gray-500">No permissions found. Create your first permission above.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map((p) => {
                      const checked = isAdminRoleSelected ? true : rolePermissions.includes(p.key);
                      return (
                        <label
                          key={p.key}
                          className={`flex items-start gap-3 rounded-xl border border-gray-200 p-4 ${isAdminRoleSelected ? "opacity-75" : "hover:bg-gray-50"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isAdminRoleSelected || roleLoading}
                            onChange={() => togglePermission(p.key)}
                            className="mt-1"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{p.key}</div>
                            <div className="text-xs text-gray-500">{permissionMap[p.key] || p.key}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {roleLoading ? <div className="mt-4 text-xs text-gray-500">Loading role permissions...</div> : null}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 text-gray-800">
            <Info className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-sm font-semibold">How to wire this page</p>
              <p className="text-xs text-gray-500">This page uses your new permission APIs.</p>
            </div>
          </div>
          <div className="p-5 text-sm text-gray-700 space-y-3">
            <div>
              <p className="font-semibold text-gray-800">How to make this live</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><code>GET /api/v1/permissions</code> → load permission catalog</li>
                <li><code>POST /api/v1/permissions</code> → create permission</li>
                <li><code>GET /api/v1/roles/{`{role}`}/permissions</code> → load assigned permissions</li>
                <li><code>PUT /api/v1/roles/{`{role}`}/permissions</code> → save assigned permissions</li>
              </ul>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
              Tip: Keep permissions atomic (action + resource), e.g., <code>employees:read</code>, <code>leaves:approve</code>. Avoid broad wildcard roles.
            </div>
          </div>
        </div>
        </div>
      </RoleGate>
    </HRMSSidebar>
  );
}
