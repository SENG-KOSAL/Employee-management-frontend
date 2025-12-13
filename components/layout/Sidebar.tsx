"use client";

import Link from "next/link";
import { Home, Users, Settings } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-gray-800 text-white flex flex-col p-4">
      <h1 className="text-xl font-bold mb-6">Dashboard</h1>
      <nav className="flex flex-col space-y-2">
        <Link href="/dashboard" className="flex items-center space-x-2 hover:bg-gray-700 p-2 rounded">
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>

        <Link href="/dashboard/users" className="flex items-center space-x-2 hover:bg-gray-700 p-2 rounded">
          <Users className="w-5 h-5" />
          <span>Users</span>
        </Link>

        <Link href="/dashboard/settings" className="flex items-center space-x-2 hover:bg-gray-700 p-2 rounded">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
}
