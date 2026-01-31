"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmployeeSidebar } from "@/components/layout/EmployeeSidebar";
import api from "@/services/api";
import { getMe, getToken, saveMe } from "@/utils/auth";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar, 
  BadgeCheck,
  Building,
  CreditCard,
  Hash
} from "lucide-react";

type MePayload = {
  name?: string;
  employee?: {
    id?: number;
    full_name?: string | null;
    role?: string | null;
  } | null;
  role?: string | null;
};

type EmployeeDetail = {
  id: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  employee_code?: string;
  department?: string;
  position?: string;
  status?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  start_date?: string;
};

export default function EmployeeProfilePage() {
  const router = useRouter();
  const [me, setMeState] = useState<MePayload | null>(() => getMe<MePayload>());
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const employeeId = useMemo(() => me?.employee?.id ?? null, [me]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    const ensureMe = async () => {
      if (me?.employee?.id) return;
      try {
        const res = await api.get("/api/v1/me");
        const data = res.data?.data ?? res.data;
        setMeState(data);
        saveMe(data);
      } catch {
        router.push("/auth/login");
      }
    };

    ensureMe();
  }, [router, me?.employee?.id]);

  useEffect(() => {
    const loadEmployee = async () => {
      if (!employeeId) return;
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/api/v1/employees/${employeeId}`);
        const data = res.data?.data ?? res.data;
        setEmployee(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [employeeId]);

  const displayName = employee?.full_name || `${employee?.first_name ?? ""} ${employee?.last_name ?? ""}`.trim() || me?.employee?.full_name || me?.name || "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <EmployeeSidebar>
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-32 bg-linear-to-r from-blue-600 to-indigo-600"></div>
            <div className="px-8 pb-8">
                <div className="relative flex justify-between items-end -mt-12 mb-6">
                    <div className="flex items-end gap-6">
                        <div className="h-24 w-24 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-400 shadow-md aspect-square">
                            {initials}
                        </div>
                        <div className="mb-2">
                            <h1 className="text-2xl font-bold text-gray-900">{displayName || "Employee"}</h1>
                            <p className="text-gray-500 font-medium">{employee?.position || "Team Member"}</p>
                        </div>
                    </div>
                    <div className="mb-4 hidden sm:block">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                            employee?.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                            <BadgeCheck className="w-4 h-4" />
                            {employee?.status || "Unknown Status"}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <div className="bg-red-100 p-1 rounded-full">!</div>
            {error}
          </div>
        )}

        {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>
               <div className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>
           </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column */}
            <div className="space-y-6 lg:col-span-2">
                
                {/* Work Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                        <h2 className="font-semibold text-gray-900">Employment Details</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoItem icon={Hash} label="Employee Code" value={employee?.employee_code} />
                        <InfoItem icon={Building} label="Department" value={employee?.department} />
                        <InfoItem icon={Briefcase} label="Position" value={employee?.position} />
                        <InfoItem icon={Calendar} label="Date Joined" value={employee?.start_date} />
                    </div>
                </div>

                {/* Personal Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <User className="w-5 h-5 text-purple-600" />
                        <h2 className="font-semibold text-gray-900">Personal Information</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoItem icon={User} label="Full Name" value={employee?.full_name} />
                        <InfoItem icon={User} label="Gender" value={employee?.gender} />
                        <InfoItem icon={Calendar} label="Date of Birth" value={employee?.date_of_birth} />
                    </div>
                </div>

            </div>

             {/* Right Column */}
             <div className="space-y-6">
                
                {/* Contact Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <Phone className="w-5 h-5 text-green-600" />
                        <h2 className="font-semibold text-gray-900">Contact Details</h2>
                    </div>
                    <div className="p-6 space-y-5">
                       <InfoItem icon={Mail} label="Email Address" value={employee?.email} />
                       <InfoItem icon={Phone} label="Phone Number" value={employee?.phone} />
                       <InfoItem icon={MapPin} label="Address" value={employee?.address} fullWidth />
                    </div>
                </div>

             </div>
        </div>
        )}
      </div>
    </EmployeeSidebar>
  );
}

function InfoItem({ icon: Icon, label, value, fullWidth = false }: { icon: any, label: string, value?: string, fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "col-span-full" : ""}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gray-50 rounded-lg text-gray-500 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-sm font-medium text-gray-900 mt-0.5">{value || "—"}</p>
        </div>
      </div>
    </div>
  );
}
