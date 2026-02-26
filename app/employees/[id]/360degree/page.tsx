"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { getToken } from "@/utils/auth";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import { ArrowLeft, Mail, Phone, CalendarDays, Briefcase, Wallet, Clock3, FileText, UserCircle2 } from "lucide-react";

type AnyRecord = Record<string, unknown>;

type EmployeeProfile = {
  id: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  date_of_birth?: string;
  start_date?: string;
  join_date?: string;
  department?: string;
  position?: string;
  manager?: AnyRecord | null;
  manager_name?: string;
  salary?: number;
  photo_url?: string | null;
  avatar_url?: string | null;
  image_url?: string | null;
  photo?: string | null;
  documents?: AnyRecord | null;
  employee_benefits?: AnyRecord[];
  employee_deductions?: AnyRecord[];
  [key: string]: unknown;
};

const extractRows = (payload: unknown): AnyRecord[] => {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (!payload || typeof payload !== "object") return [];

  const root = payload as AnyRecord;
  const firstData = root.data;

  if (Array.isArray(firstData)) return firstData as AnyRecord[];
  if (firstData && typeof firstData === "object") {
    const secondData = (firstData as AnyRecord).data;
    if (Array.isArray(secondData)) return secondData as AnyRecord[];
  }

  return [];
};

const extractEntity = <T,>(payload: unknown): T | null => {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;
  const data = root.data;

  if (data && !Array.isArray(data) && typeof data === "object") {
    const nested = (data as AnyRecord).data;
    if (nested && !Array.isArray(nested) && typeof nested === "object") {
      return nested as T;
    }
    return data as T;
  }

  return payload as T;
};

const formatDate = (value?: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString();
};

const formatDateTime = (value?: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleString();
};

const formatMoney = (value?: unknown) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `$${n.toLocaleString()}`;
};

export default function Employee360DegreePage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params as AnyRecord)?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<AnyRecord[]>([]);
  const [leaveRows, setLeaveRows] = useState<AnyRecord[]>([]);
  const [overtimeRows, setOvertimeRows] = useState<AnyRecord[]>([]);
  const [benefitRows, setBenefitRows] = useState<AnyRecord[]>([]);
  const [deductionRows, setDeductionRows] = useState<AnyRecord[]>([]);
  const [payrollRows, setPayrollRows] = useState<AnyRecord[]>([]);
  const [trainingRows, setTrainingRows] = useState<AnyRecord[]>([]);
  const [projectRows, setProjectRows] = useState<AnyRecord[]>([]);
  const [noteRows, setNoteRows] = useState<AnyRecord[]>([]);
  const [otherApiUnavailable, setOtherApiUnavailable] = useState<string[]>([]);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

  const resolveFileUrl = (raw?: unknown): string | null => {
    const v = String(raw ?? "").trim();
    if (!v) return null;
    if (v.startsWith("data:") || v.startsWith("blob:")) return v;
    if (/^(https?:)?\/\//i.test(v)) return v;

    const base = apiBase.replace(/\/$/, "");
    if (!base) return v;
    if (v.startsWith("/")) return `${base}${v}`;
    return `${base}/${v}`;
  };

  const photoUrl = useMemo(() => {
    if (!employee) return null;
    return resolveFileUrl(
      employee.photo_url || employee.avatar_url || employee.image_url || employee.photo || null
    );
  }, [employee]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    if (!id) return;

    const loadAll = async () => {
      setLoading(true);
      setError("");

      const employeeId = String(id);
      const requests = await Promise.allSettled([
        api.get(`/api/v1/employees/${employeeId}`),
        api.get(`/api/v1/attendances?employee_id=${employeeId}&per_page=50`),
        api.get(`/api/v1/leave-requests?employee_id=${employeeId}&per_page=50`),
        api.get(`/api/v1/overtimes?employee_id=${employeeId}&per_page=50`),
        api.get(`/api/v1/employee-benefits?employee_id=${employeeId}`),
        api.get(`/api/v1/employee-deductions?employee_id=${employeeId}`),
        api.get(`/api/v1/payrolls?employee_id=${employeeId}&per_page=20`),
        api.get(`/api/v1/trainings?employee_id=${employeeId}&per_page=20`),
        api.get(`/api/v1/projects?employee_id=${employeeId}&per_page=20`),
        api.get(`/api/v1/notes?employee_id=${employeeId}&per_page=20`),
      ]);

      const unavailable: string[] = [];

      const employeeResult = requests[0];
      if (employeeResult.status === "fulfilled") {
        const parsed = extractEntity<EmployeeProfile>(employeeResult.value.data);
        setEmployee(parsed);
      } else {
        const message = (employeeResult.reason as AnyRecord)?.response as AnyRecord | undefined;
        const apiMessage = (message?.data as AnyRecord | undefined)?.message;
        setError(String(apiMessage || "Failed to load employee profile"));
      }

      const attendanceResult = requests[1];
      setAttendanceRows(attendanceResult.status === "fulfilled" ? extractRows(attendanceResult.value.data) : []);

      const leaveResult = requests[2];
      setLeaveRows(leaveResult.status === "fulfilled" ? extractRows(leaveResult.value.data) : []);

      const overtimeResult = requests[3];
      setOvertimeRows(overtimeResult.status === "fulfilled" ? extractRows(overtimeResult.value.data) : []);

      const benefitResult = requests[4];
      setBenefitRows(benefitResult.status === "fulfilled" ? extractRows(benefitResult.value.data) : []);

      const deductionResult = requests[5];
      setDeductionRows(deductionResult.status === "fulfilled" ? extractRows(deductionResult.value.data) : []);

      const payrollResult = requests[6];
      setPayrollRows(payrollResult.status === "fulfilled" ? extractRows(payrollResult.value.data) : []);

      const trainingResult = requests[7];
      if (trainingResult.status === "fulfilled") {
        setTrainingRows(extractRows(trainingResult.value.data));
      } else {
        setTrainingRows([]);
        unavailable.push("Training");
      }

      const projectResult = requests[8];
      if (projectResult.status === "fulfilled") {
        setProjectRows(extractRows(projectResult.value.data));
      } else {
        setProjectRows([]);
        unavailable.push("Projects");
      }

      const noteResult = requests[9];
      if (noteResult.status === "fulfilled") {
        setNoteRows(extractRows(noteResult.value.data));
      } else {
        setNoteRows([]);
        unavailable.push("Notes");
      }

      setOtherApiUnavailable(unavailable);
      setLoading(false);
    };

    loadAll();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">Loading 360° profile...</p>
        </div>
      </div>
    );
  }

  return (
    <HRMSSidebar>
      <style jsx global>{`
        /* 360 Degree Page Enhanced Styles */
        .employee-360-page {
            background-color: #F8F9FA;
            color: #333;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            min-height: 100vh;
        }

        .employee-container {
            max-width: 1200px;
            margin: 0 auto;
            padding-bottom: 40px;
        }

        /* Header / Top Section */
        .employee-360-header {
            background: linear-gradient(135deg, #E3F2FD 0%, #FFFFFF 100%);
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px; /* Added gap for mobile */
            box-shadow: 0 4px 15px rgba(33, 150, 243, 0.08);
            border: 1px solid rgba(227, 242, 253, 0.5);
            position: relative;
            overflow: hidden;
        }
        
        .employee-360-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, #2196F3, #64B5F6);
        }

        @media (min-width: 640px) {
            .employee-360-header {
                flex-direction: row;
                text-align: left;
                justify-content: flex-start;
                gap: 24px;
            }
        }

        /* Buttons */
        .btn-360degree {
            background-color: #2196F3;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            transition: all 0.2s ease;
            box-shadow: 0 2px 5px rgba(33, 150, 243, 0.3);
        }
        .btn-360degree:hover {
            background-color: #1976D2;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(33, 150, 243, 0.4);
        }

        /* Section Cards */
        .employee-section {
            background-color: #FFFFFF;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            transition: all 0.3s ease;
            height: 100%;
            border: 1px solid rgba(0,0,0,0.02);
        }
        .employee-section:hover {
            box-shadow: 0 8px 16px rgba(0,0,0,0.08);
            transform: translateY(-2px);
        }
        .employee-section h2 {
            color: #1565C0 !important;
            margin-bottom: 20px;
            font-size: 1.1rem;
            border-bottom: 1px solid #F0F4F8;
            padding-bottom: 12px;
        }

        /* Badges */
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            line-height: 1;
        }
        .badge-success { background-color: #E8F5E9; color: #2E7D32; }
        .badge-warning { background-color: #FFF3E0; color: #EF6C00; }
        .badge-info { background-color: #E3F2FD; color: #1565C0; }
        .badge-danger { background-color: #FFEBEE; color: #C62828; }

        /* Data Lists */
        .data-list-item {
            padding: 10px;
            border-radius: 8px;
            background-color: #F8F9FA;
            border: 1px solid #EEF2F6;
            margin-bottom: 8px;
            transition: background-color 0.2s;
        }
        .data-list-item:hover {
            background-color: #F0F4F8;
            border-color: #DEE4EA;
        }

        /* Scrollbars for overflow areas */
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1; 
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #ccc; 
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #bbb; 
        }
      `}</style>

      <div className="employee-360-page">
        <div className="employee-container py-8">
          <div className="flex items-center justify-between gap-3 mb-6">
            <Link href={`/employees/${id}`} className="btn-360degree inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Employee Detail
            </Link>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white text-blue-700 border border-blue-200 shadow-sm">
              360° View Mode
            </span>
          </div>

        {error ? (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700">{error}</div>
        ) : null}

        {employee ? (
          <>
            <div className="employee-360-header">
               <div className="w-24 h-24 shrink-0 rounded-full overflow-hidden border-4 border-white shadow-md bg-white flex items-center justify-center">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="Employee" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle2 className="w-12 h-12 text-gray-300" />
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {`${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() || String(employee.name || "-")}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                    <span className="badge badge-info">ID: {employee.id}</span>
                    {employee.department && <span className="badge badge-warning">{String(employee.department)}</span>}
                    <span className="text-sm text-gray-500 ml-1 font-medium">{String(employee.position || "Employee")}</span>
                  </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="employee-section space-y-3">
                <h2 className="text-xl font-semibold flex items-center gap-2"><Mail className="w-5 h-5" /> Personal Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                  <p><span className="text-gray-500 font-medium">Email:</span> {String(employee.email || "-")}</p>
                  <p><span className="text-gray-500 font-medium">Phone Number:</span> {String(employee.phone || employee.phone_number || "-")}</p>
                  <p><span className="text-gray-500 font-medium">Date of Birth:</span> {formatDate(employee.date_of_birth)}</p>
                  <p><span className="text-gray-500 font-medium">Join Date:</span> {formatDate(employee.join_date || employee.start_date)}</p>
                </div>
              </section>

              <section className="employee-section space-y-3">
                <h2 className="text-xl font-semibold flex items-center gap-2"><Briefcase className="w-5 h-5" /> Job Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                  <p><span className="text-gray-500 font-medium">Department:</span> {String(employee.department || "-")}</p>
                  <p><span className="text-gray-500 font-medium">Position:</span> {String(employee.position || "-")}</p>
                  <p className="sm:col-span-2"><span className="text-gray-500 font-medium">Manager:</span> {String((employee.manager as AnyRecord | undefined)?.name || employee.manager_name || "-")}</p>
                </div>
              </section>

              <section className="employee-section space-y-4 xl:col-span-2">
                <h2 className="text-xl font-semibold flex items-center gap-2"><Wallet className="w-5 h-5" /> Payroll Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex flex-col items-center justify-center text-center">
                    <span className="text-blue-600 font-medium mb-1">Base Salary</span>
                    <strong className="text-xl text-blue-900">{formatMoney(employee.salary)}</strong>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 border border-green-100 flex flex-col items-center justify-center text-center">
                    <span className="text-green-600 font-medium mb-1">Active Benefits</span>
                    <span className="badge badge-success px-3 py-1 text-sm">{benefitRows.length}</span>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 border border-red-100 flex flex-col items-center justify-center text-center">
                    <span className="text-red-600 font-medium mb-1">Active Deductions</span>
                    <span className="badge badge-danger px-3 py-1 text-sm">{deductionRows.length}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Benefits Breakdown</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {benefitRows.slice(0, 5).map((row, idx) => (
                        <li key={`benefit-${idx}`} className="flex justify-between items-center p-2 rounded bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                          <span className="font-medium text-gray-600">{String(row.benefit_name || row.name || "Benefit")}</span>
                          <span className="font-bold text-green-600">{formatMoney(row.amount)}</span>
                        </li>
                      ))}
                      {benefitRows.length === 0 ? <li className="text-gray-400 italic text-sm">No benefits found.</li> : null}
                      {benefitRows.length > 5 && <li className="text-xs text-center text-gray-400 mt-1">and {benefitRows.length - 5} more...</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Deductions Breakdown</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {deductionRows.slice(0, 5).map((row, idx) => (
                        <li key={`deduction-${idx}`} className="flex justify-between items-center p-2 rounded bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                          <span className="font-medium text-gray-600">{String(row.deduction_name || row.name || "Deduction")}</span>
                          <span className="font-bold text-red-600">{formatMoney(row.amount)}</span>
                        </li>
                      ))}
                      {deductionRows.length === 0 ? <li className="text-gray-400 italic text-sm">No deductions found.</li> : null}
                      {deductionRows.length > 5 && <li className="text-xs text-center text-gray-400 mt-1">and {deductionRows.length - 5} more...</li>}
                    </ul>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Recent Payroll History</p>
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                        <tr>
                          <th className="px-4 py-3">Period</th>
                          <th className="px-4 py-3">Gross</th>
                          <th className="px-4 py-3">Net</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {payrollRows.slice(0, 5).map((row, idx) => (
                          <tr key={`payroll-${idx}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{String(row.period || row.payroll_period || row.month || formatDate(row.created_at) || "-")}</td>
                            <td className="px-4 py-3 text-gray-600">{formatMoney(row.gross_salary || row.gross_pay)}</td>
                            <td className="px-4 py-3 font-bold text-green-700">{formatMoney(row.net_salary || row.net_pay)}</td>
                            <td className="px-4 py-3">
                                <span className="badge badge-info text-xs">{String(row.status || "Processed")}</span>
                            </td>
                          </tr>
                        ))}
                        {payrollRows.length === 0 ? (
                          <tr><td className="px-4 py-6 text-center text-gray-400 italic" colSpan={4}>No payroll records found.</td></tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="employee-section space-y-3 xl:col-span-2">
                <h2 className="text-xl font-semibold flex items-center gap-2"><Clock3 className="w-5 h-5" /> Attendance & Leave History</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-700">Recent Check-ins</p>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{attendanceRows.length} total</span>
                    </div>
                    <ul className="space-y-2 text-sm max-h-64 overflow-y-auto custom-scrollbar pr-2">
                      {attendanceRows.slice(0, 15).map((row, idx) => (
                        <li key={`att-${idx}`} className="data-list-item">
                          <div className="flex justify-between items-center mb-1">
                             <span className="font-semibold text-gray-800">{formatDate(row.date || row.work_date || row.created_at)}</span>
                             <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${row.check_out ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {row.check_out ? 'Present' : 'Active'}
                             </span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>In: <span className="font-medium text-gray-700">{String(row.check_in || "--:--")}</span></span>
                            <span>Out: <span className="font-medium text-gray-700">{String(row.check_out || "--:--")}</span></span>
                          </div>
                        </li>
                      ))}
                      {attendanceRows.length === 0 ? <li className="text-gray-400 italic text-sm text-center py-4">No attendance records found.</li> : null}
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-700">Leave Requests</p>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{leaveRows.length} total</span>
                    </div>
                    <ul className="space-y-2 text-sm max-h-64 overflow-y-auto custom-scrollbar pr-2">
                      {leaveRows.slice(0, 15).map((row, idx) => {
                         const status = String(row.status || "Pending");
                         let badgeClass = "badge-warning";
                         if(status.toLowerCase().includes('approved')) badgeClass = "badge-success";
                         if(status.toLowerCase().includes('reject')) badgeClass = "badge-danger";
                         
                         return (
                        <li key={`leave-${idx}`} className="data-list-item">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-gray-800 text-xs">{formatDate(row.start_date)} - {formatDate(row.end_date)}</span>
                            <span className={`badge ${badgeClass} text-[10px]`}>{status}</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{String(row.reason || row.leave_type || "Leave Request")}</p>
                        </li>
                      )})}
                      {leaveRows.length === 0 ? <li className="text-gray-400 italic text-sm text-center py-4">No leave requests found.</li> : null}
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-700">Recent Overtime</p>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{overtimeRows.length} total</span>
                    </div>
                    <ul className="space-y-2 text-sm max-h-64 overflow-y-auto custom-scrollbar pr-2">
                      {overtimeRows.slice(0, 15).map((row, idx) => (
                        <li key={`ot-${idx}`} className="data-list-item flex items-center justify-between">
                          <div>
                            <span className="block font-semibold text-gray-800">{formatDate(row.work_date || row.date || row.created_at)}</span>
                            <span className="text-xs text-gray-500">{String(row.reason || "Overtime")}</span>
                          </div>
                          <span className="badge badge-info text-sm">{String(row.hours || 0)}h</span>
                        </li>
                      ))}
                      {overtimeRows.length === 0 ? <li className="text-gray-400 italic text-sm text-center py-4">No overtime records found.</li> : null}
                    </ul>
                  </div>
                </div>
              </section>

              <section className="employee-section space-y-3 xl:col-span-2">
                <h2 className="text-xl font-semibold flex items-center gap-2"><FileText className="w-5 h-5" /> Uploaded Files / Photos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-gray-100 bg-gray-50">
                    <p className="text-sm font-semibold text-gray-800 mb-2">Profile Photo</p>
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl} alt="Employee profile" className="w-24 h-24 rounded-lg object-cover border border-gray-200" />
                    ) : (
                      <p className="text-sm text-gray-500">No photo uploaded.</p>
                    )}
                  </div>
                  <div className="p-4 rounded-lg border border-gray-100 bg-gray-50">
                    <p className="text-sm font-semibold text-gray-800 mb-2">Documents</p>
                    <ul className="space-y-1 text-sm">
                      {[
                        { label: "ID Card", value: (employee.documents as AnyRecord | null)?.id_card_file_path },
                        { label: "Contract", value: (employee.documents as AnyRecord | null)?.contract_file_path },
                        { label: "CV", value: (employee.documents as AnyRecord | null)?.cv_file_path },
                        { label: "Certificate", value: (employee.documents as AnyRecord | null)?.certificate_file_path },
                      ].map((doc) => {
                        const url = resolveFileUrl(doc.value);
                        return (
                          <li key={doc.label}>
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline">
                                {doc.label}
                              </a>
                            ) : (
                              <span className="text-gray-500">{doc.label}: Not uploaded</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </section>

              <section className="employee-section space-y-3 xl:col-span-2">
                <h2 className="text-xl font-semibold">Other Related Records</h2>
                {otherApiUnavailable.length > 0 ? (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-center gap-2">
                    <span className="font-bold">Notice:</span> Some modules are not available: {otherApiUnavailable.join(", ")}
                  </div>
                ) : null}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 text-center transition-transform hover:scale-105 duration-200">
                    <p className="text-sm font-semibold text-indigo-800 mb-1">Training Sessions</p>
                    <p className="text-3xl font-bold text-indigo-900">{trainingRows.length}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-teal-50 border border-teal-100 text-center transition-transform hover:scale-105 duration-200">
                    <p className="text-sm font-semibold text-teal-800 mb-1">Active Projects</p>
                    <p className="text-3xl font-bold text-teal-900">{projectRows.length}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-orange-50 border border-orange-100 text-center transition-transform hover:scale-105 duration-200">
                    <p className="text-sm font-semibold text-orange-800 mb-1">Notes & Remarks</p>
                    <p className="text-3xl font-bold text-orange-900">{noteRows.length}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3 text-sm">Recent Training</h3>
                    <ul className="space-y-2">
                      {trainingRows.slice(0, 5).map((row, idx) => (
                        <li key={`training-${idx}`} className="data-list-item flex flex-col gap-1">
                          <span className="font-semibold text-gray-800 text-sm">{String(row.title || row.name || row.training_name || "Training")}</span>
                          <span className="text-xs text-gray-500">{formatDate(row.date || row.created_at)}</span>
                        </li>
                      ))}
                      {trainingRows.length === 0 ? <li className="text-gray-400 italic text-sm text-center py-2">No records found</li> : null}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3 text-sm">Recent Projects</h3>
                    <ul className="space-y-2">
                      {projectRows.slice(0, 5).map((row, idx) => (
                        <li key={`project-${idx}`} className="data-list-item flex justify-between items-center">
                          <span className="font-semibold text-gray-800 text-sm truncate max-w-[120px]">{String(row.name || row.title || "Project")}</span>
                          <span className="badge badge-info text-[10px]">{String(row.status || "Active")}</span>
                        </li>
                      ))}
                      {projectRows.length === 0 ? <li className="text-gray-400 italic text-sm text-center py-2">No records found</li> : null}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3 text-sm">Recent Notes</h3>
                    <ul className="space-y-2">
                      {noteRows.slice(0, 5).map((row, idx) => (
                        <li key={`note-${idx}`} className="data-list-item">
                          <p className="text-sm text-gray-800 line-clamp-2">{String(row.note || row.content || row.title || "Note")}</p>
                          <p className="text-xs text-gray-400 mt-1 text-right">{formatDateTime(row.created_at)}</p>
                        </li>
                      ))}
                      {noteRows.length === 0 ? <li className="text-gray-400 italic text-sm text-center py-2">No records found</li> : null}
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          </>
        ) : null}
      </div>
      </div>
    </HRMSSidebar>
  );
}
