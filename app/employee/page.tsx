"use client";

import Link from "next/link";
import { EmployeeSidebar } from "@/components/layout/EmployeeSidebar";

export default function EmployeePortalPage() {
  return (
    <EmployeeSidebar>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Portal</h1>
          <p className="text-sm text-gray-500">Quick access to your personal pages.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/employee/profile"
            className="block p-5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            <div className="text-sm font-semibold text-gray-900">My Profile</div>
            <div className="text-xs text-gray-500 mt-1">View your personal information</div>
          </Link>

          <Link
            href="/employee/attendance"
            className="block p-5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            <div className="text-sm font-semibold text-gray-900">My Attendance</div>
            <div className="text-xs text-gray-500 mt-1">Clock in/out and history</div>
          </Link>

          <Link
            href="/employee/leave"
            className="block p-5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            <div className="text-sm font-semibold text-gray-900">Request Leave</div>
            <div className="text-xs text-gray-500 mt-1">Submit leave requests</div>
          </Link>
        </div>
      </div>
    </EmployeeSidebar>
  );
}
