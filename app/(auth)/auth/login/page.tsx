"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removeMe, saveMe, saveToken } from "@/utils/auth";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import axios, { isAxiosError } from "axios";
import { clearMeCache, fetchMe } from "@/lib/meCache";
import { isPlatformAdminRole, normalizeRole } from "@/lib/roles";
export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const getRoleFromMe = (me: unknown) => {
    if (!me || typeof me !== "object") return "";
    const rec = me as Record<string, unknown>;
    const employee = rec.employee;
    const employeeRole = (() => {
      if (!employee || typeof employee !== "object") return null;
      const e = employee as Record<string, unknown>;
      return typeof e.role === "string" ? e.role : null;
    })();
    const role = typeof rec.role === "string" ? rec.role : null;
    return normalizeRole(employeeRole ?? role ?? "");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      // Use same-origin login proxy to avoid CORS / subdomain issues.
      const res = await axios.post("/api/auth/login", { username, password });

      // Support multiple common backend shapes:
      // - { token: "..." }
      // - { data: { token: "..." } }
      const token = res?.data?.token ?? res?.data?.data?.token ?? res?.data?.access_token;
      const loginUser = res?.data?.user ?? res?.data?.data?.user;

      if (token) {
        // Ensure we start fresh (avoid stale role + stale support-mode state)
        localStorage.removeItem("active_company_id");
        localStorage.removeItem("active_company_name");
        removeMe();
        clearMeCache();

        saveToken(token);
        setMessage("Login successful! Redirecting...");
        try {
          // Prefer backend login response user object (some backends don't support /me).
          const me = (loginUser && typeof loginUser === "object") ? loginUser : await fetchMe(true);
          if (me) saveMe(me);
          const role = getRoleFromMe(me);
          const target =
            isPlatformAdminRole(role)
              ? "/super-admin/dashboard"
              : role === "employee"
                ? "/employee"
                : role === "manager"
                  ? "/manager"
                  : "/dashboard";
          setTimeout(() => router.push(target), 300);
        } catch {
          const fallbackRole = getRoleFromMe(loginUser);
          const fallbackTarget = isPlatformAdminRole(fallbackRole)
            ? "/super-admin/dashboard"
            : "/dashboard";
          setTimeout(() => router.push(fallbackTarget), 300);
        }
      }
      //not working yet
      // if(res.data.token){
      //   saveToken(res.data.token);
      //   setMessage("Login successful! Redirecting...");
      //   <Link href="/dashboard"></Link>
      // }
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const data = err.response?.data as unknown;
        const fallback = "Wrong username or password.";
        const proxyFallback = "Login request failed. Check frontend API proxy/backend URL.";

        const status = err.response?.status;
        const looksLikeInvalidCredentials = (msg: string) => {
          const m = msg.toLowerCase();
          return (
            m.includes("invalid credentials") ||
            m.includes("unauthorized") ||
            m.includes("wrong password") ||
            m.includes("incorrect")
          );
        };

        if (typeof data === "string") {
          const trimmed = data.trim().toLowerCase();
          if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
            setMessage(proxyFallback);
            return;
          }
        }

        if (data && typeof data === "object") {
          const rec = data as Record<string, unknown>;
          const msg = typeof rec.message === "string" ? rec.message : null;
          const errors = rec.errors;
          if (errors && typeof errors === "object") {
            const errRec = errors as Record<string, unknown>;
            const firstKey = Object.keys(errRec)[0];
            const firstVal = firstKey ? errRec[firstKey] : null;
            if (Array.isArray(firstVal) && typeof firstVal[0] === "string") {
              setMessage(firstVal[0]);
              return;
            }
          }

          // Common backend pattern: 401/422 with a generic message.
          if ((status === 401 || status === 422) && msg && looksLikeInvalidCredentials(msg)) {
            setMessage(fallback);
            return;
          }

          if (status && status >= 500) {
            setMessage(msg ?? proxyFallback);
            return;
          }

          setMessage(msg ?? fallback);
        } else {
          setMessage(status && status >= 500 ? proxyFallback : fallback);
        }
      } else {
        setMessage("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Lock className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold">Welcome Back</h1>
            <p className="text-blue-100 mt-2">Sign in to your account</p>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Login Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200"
                    placeholder="Enter username"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200"
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Message Display */}
            {message && (
              <div
                className={`mt-6 p-4 rounded-lg flex items-start space-x-3 ${
                  message.toLowerCase().includes("success")
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                <AlertCircle
                  className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                    message.toLowerCase().includes("success") ? "text-green-500" : "text-red-500"
                  }`}
                />
                <p className="text-sm font-medium">{message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>© {new Date().getFullYear()} Employee Management System</p>
        </div>
      </div>
    </div>
  );
}
