"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HRMSSidebar } from "@/components/layout/HRMSSidebar";
import api from "@/services/api";
import { overtimesService } from "@/services/overtimes";
import { getToken } from "@/utils/auth";
import { Calendar, Clock, User, FileText, CheckCircle2, AlertCircle, Plus, Search } from "lucide-react";

type EmployeeOption = {
	id: number;
	first_name?: string;
	last_name?: string;
	employee_code?: string;
};

type OvertimeRow = {
	id?: number;
	employee_id: number;
	work_date?: string;
	date?: string;
	hours: number;
	rate?: number;
	reason?: string | null;
};

export default function OverTimeRequestPage() {
	const router = useRouter();
	const [employees, setEmployees] = useState<EmployeeOption[]>([]);
	const [employeesLoading, setEmployeesLoading] = useState(false);
	const [employeesError, setEmployeesError] = useState("");

	const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
	const [overtimes, setOvertimes] = useState<OvertimeRow[]>([]);
	const [overtimeLoading, setOvertimeLoading] = useState(false);
	const [overtimeError, setOvertimeError] = useState("");
	const [overtimeSuccess, setOvertimeSuccess] = useState("");

	const [otDate, setOtDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [otHours, setOtHours] = useState<string>("");
	const [otRate, setOtRate] = useState<string>("");
	const [otReason, setOtReason] = useState<string>("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const token = getToken();
		if (!token) {
			router.push("/auth/login");
			return;
		}
		loadEmployees();
	}, []);

	useEffect(() => {
		if (!selectedEmployeeId) {
			setOvertimes([]);
			return;
		}
		loadOvertimes(Number(selectedEmployeeId));
	}, [selectedEmployeeId]);

	const loadEmployees = async () => {
		try {
			setEmployeesLoading(true);
			setEmployeesError("");
			const params = new URLSearchParams({ per_page: "300" });
			const res = await api.get(`/api/v1/employees?${params.toString()}`);
			const raw = res.data?.data ?? res.data ?? [];
			const rows = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [];
			const normalized = rows.map((e: any) => ({
				id: e.id,
				first_name: e.first_name,
				last_name: e.last_name,
				employee_code: e.employee_code,
			}));
			setEmployees(normalized);
		} catch (err) {
			console.error(err);
			setEmployeesError("Failed to load employees");
			setEmployees([]);
		} finally {
			setEmployeesLoading(false);
		}
	};

	const loadOvertimes = async (empId: number) => {
		try {
			setOvertimeLoading(true);
			setOvertimeError("");
			const res = await overtimesService.listByEmployee(empId);
			const list = (res as any)?.data?.data ?? (res as any)?.data ?? [];
			setOvertimes(Array.isArray(list) ? list : []);
		} catch (err) {
			console.error(err);
			setOvertimeError("Failed to load overtime records");
			setOvertimes([]);
		} finally {
			setOvertimeLoading(false);
		}
	};

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedEmployeeId) {
			setOvertimeError("Select an employee first");
			return;
		}
		if (!otDate || !otHours) {
			setOvertimeError("Date and hours are required");
			return;
		}
		try {
			setSaving(true);
			setOvertimeError("");
			setOvertimeSuccess("");
			const payload = {
				employee_id: Number(selectedEmployeeId),
				work_date: otDate,
				hours: Number(otHours),
				rate: otRate ? Number(otRate) : undefined,
				reason: otReason || undefined,
			};
			const res = await overtimesService.create(payload as any);
			const created = (res as any)?.data?.data ?? (res as any)?.data ?? payload;
			setOvertimes((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
			setOtHours("");
			setOtReason("");
			setOtRate("");
			setOvertimeSuccess("Overtime added");
			setTimeout(() => setOvertimeSuccess(""), 1500);
		} catch (err: any) {
			console.error(err);
			setOvertimeError(err?.response?.data?.message || "Failed to add overtime");
		} finally {
			setSaving(false);
		}
	};

	const renderOvertimeList = () => {
		if (!selectedEmployeeId) {
			return (
				<div className="flex flex-col items-center justify-center h-[400px] text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
					<div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
						<User className="w-8 h-8 text-gray-300" />
					</div>
					<p className="font-medium">Select an employee to view records</p>
					<p className="text-sm mt-1 text-gray-400">Overtime history will appear here</p>
				</div>
			);
		}
		if (overtimeLoading) {
			return (
				<div className="flex flex-col items-center justify-center h-64 text-gray-500">
					<div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
					<p>Loading records...</p>
				</div>
			);
		}
		if (!overtimes || overtimes.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center h-64 text-gray-400 border border-gray-100 rounded-xl bg-gray-50/30">
					<Clock className="w-12 h-12 mb-3 opacity-20" />
					<p>No overtime records found</p>
				</div>
			);
		}
		return (
			<div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
				<table className="w-full text-left text-sm">
					<thead className="bg-gray-50 border-b border-gray-200">
						<tr>
							<th className="px-5 py-3 font-semibold text-gray-600">Date</th>
							<th className="px-5 py-3 font-semibold text-gray-600">Duration</th>
							<th className="px-5 py-3 font-semibold text-gray-600">Reason</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100">
						{overtimes.map((ot, idx) => (
							<tr key={ot.id ?? idx} className="hover:bg-blue-50/30 transition-colors">
								<td className="px-5 py-3.5 text-gray-900 font-medium">
									<div className="flex items-center gap-2">
										<Calendar className="w-4 h-4 text-gray-400" />
										{ot.work_date || ot.date}
									</div>
								</td>
								<td className="px-5 py-3.5">
									<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
										<Clock className="w-3 h-3" />
										{ot.hours} hrs
									</span>
								</td>
								<td className="px-5 py-3.5 text-gray-600 max-w-xs truncate">
									{ot.reason || <span className="text-gray-400 italic">No reason provided</span>}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	};

	return (
		<HRMSSidebar>
			<div className="max-w-6xl mx-auto space-y-8 p-2">
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
						Overtime Requests
					</h1>
					<p className="text-gray-500">Manage and record overtime hours for your team members.</p>
				</div>

				<div className="grid lg:grid-cols-12 gap-8 items-start">
					{/* Left Column: Input Form */}
					<div className="lg:col-span-4 space-y-6">
						<div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden sticky top-6">
							<div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center gap-3">
								<div className="bg-white/20 p-2 rounded-lg text-white backdrop-blur-sm">
									<Plus className="w-5 h-5" />
								</div>
								<h2 className="font-semibold text-white">New Entry</h2>
							</div>

							<form onSubmit={handleCreate} className="p-6 space-y-5">
								<div className="space-y-1.5">
									<label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">Employee</label>
									<div className="relative group">
										<User className="absolute left-3 top-3 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
										<select
											className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none"
											value={selectedEmployeeId}
											onChange={(e) => setSelectedEmployeeId(e.target.value)}
											disabled={employeesLoading}
										>
											<option value="">Select employee</option>
											{employees.map((emp) => (
												<option key={emp.id} value={emp.id}>
													{emp.first_name} {emp.last_name} {emp.employee_code ? `• ${emp.employee_code}` : ""}
												</option>
											))}
										</select>
									</div>
									{employeesError && <p className="text-xs text-red-600 ml-1">{employeesError}</p>}
								</div>

								<div className="grid grid-cols-3 gap-4">
									<div className="space-y-1.5">
										<label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">Date</label>
										<div className="relative group">
											<Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
											<input
												type="date"
												className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none"
												value={otDate}
												onChange={(e) => setOtDate(e.target.value)}
											/>
										</div>
									</div>
									<div className="space-y-1.5">
										<label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">Hours</label>
										<div className="relative group">
											<Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
											<input
												type="number"
												min="0"
												step="0.25"
												className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none"
												value={otHours}
												onChange={(e) => setOtHours(e.target.value)}
												placeholder="e.g. 2.5"
											/>
										</div>
									</div>
									<div className="space-y-1.5">
										<label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">Rate</label>
										<div className="relative group">
											<Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
											<input
												type="number"
												min="0"
												step="0.01"
												className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none"
												value={otRate}
												onChange={(e) => setOtRate(e.target.value)}
												placeholder="e.g. 12.50"
											/>
										</div>
									</div>
								</div>

								<div className="space-y-1.5">
									<label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">Reason</label>
									<div className="relative group">
										<FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
										<input
											type="text"
											className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all outline-none"
											value={otReason}
											onChange={(e) => setOtReason(e.target.value)}
											placeholder="Optional description..."
										/>
									</div>
								</div>

								<div className="pt-2">
									<button
										type="submit"
										disabled={saving || !selectedEmployeeId || !otDate || !otHours}
										className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
									>
										{saving ? "Saving..." : "Add Record"}
									</button>
								</div>

								{overtimeSuccess && (
									<div className="flex items-start gap-3 p-3 bg-green-50 text-green-700 text-sm rounded-xl border border-green-100 animate-in fade-in slide-in-from-top-2">
										<CheckCircle2 className="w-5 h-5 shrink-0" />
										<span>{overtimeSuccess}</span>
									</div>
								)}

								{overtimeError && (
									<div className="flex items-start gap-3 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2">
										<AlertCircle className="w-5 h-5 shrink-0" />
										<span>{overtimeError}</span>
									</div>
								)}
							</form>
						</div>
					</div>

					{/* Right Column: History List */}
					<div className="lg:col-span-8 space-y-6">
						<div className="bg-white border border-gray-200 rounded-2xl shadow-sm min-h-[500px] flex flex-col">
							<div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
								<h2 className="font-bold text-gray-900 flex items-center gap-2">
									<Clock className="w-5 h-5 text-gray-500" />
									History & Records
								</h2>
								{selectedEmployeeId && (
									<span className="flex items-center gap-1.5 pl-3 pr-4 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-200 text-gray-600 shadow-sm">
										<span className="w-2 h-2 rounded-full bg-green-500"></span>
										Employee #{selectedEmployeeId}
									</span>
								)}
							</div>
							
							<div className="p-6 flex-1 bg-gray-50/50">
								{renderOvertimeList()}
							</div>
						</div>
					</div>
				</div>
			</div>
		</HRMSSidebar>
	);
}
