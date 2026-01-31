"use client";

import Link from "next/link";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";

export default function ManagerPortalPage() {
  return (
    <HRMSSidebar>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manager Portal</h1>
          <p className="text-sm text-gray-500">Quick access to manage your team.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/manager/team"
            className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:bg-gray-50"
          >
            <div className="text-sm font-semibold text-gray-900">Team Employees</div>
            <div className="text-sm text-gray-500 mt-1">View employees list (team).</div>
          </Link>

          <Link
            href="/manager/attendance"
            className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:bg-gray-50"
          >
            <div className="text-sm font-semibold text-gray-900">Team Attendance</div>
            <div className="text-sm text-gray-500 mt-1">Review attendance for your team.</div>
          </Link>

          <Link
            href="/manager/leave-approvals"
            className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:bg-gray-50"
          >
            <div className="text-sm font-semibold text-gray-900">Leave Approvals</div>
            <div className="text-sm text-gray-500 mt-1">Approve/reject leave requests.</div>
          </Link>
        </div>
      </div>
    </HRMSSidebar>
  );
}
