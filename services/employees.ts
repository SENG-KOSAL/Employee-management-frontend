import api from "@/services/api"

export type ExportEmployeesFilters = {
  department?: string
  status?: string
}

const sanitizeFilenamePart = (value?: string | null) => {
  const normalized = String(value || "").trim()
  if (!normalized) return "current-company"
  return normalized.replace(/[^a-zA-Z0-9-_]+/g, "-")
}

export const getEmployeeExportTimestamp = () => {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

export const buildEmployeeExportFilename = (companyId?: string | number | null) => {
  return `employees-${sanitizeFilenamePart(companyId ? String(companyId) : null)}-${getEmployeeExportTimestamp()}.xlsx`
}

export async function exportEmployees(filters: ExportEmployeesFilters = {}) {
  const params = new URLSearchParams()

  if (filters.department) params.set("department", filters.department)
  if (filters.status) params.set("status", filters.status)

  const query = params.toString()
  const url = query ? `/api/v1/admin/employees/export?${query}` : "/api/v1/admin/employees/export"

  return api.get(url, {
    responseType: "blob",
  })
}

export function downloadBlobFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function uploadEmployeePhoto(employeeId: number | string, file: File) {
  const formData = new FormData()
  // Backend endpoint expects: POST /api/v1/employees/{employee}/photo
  // Most Laravel-style backends expect the file field to be named "photo".
  formData.append("photo", file)

  return api.post(`/api/v1/employees/${employeeId}/photo`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
}

export type EmployeeDocumentsUpload = {
  id_card?: File | null
  contract?: File | null
  cv?: File | null
  certificate?: File | null
}

export async function uploadEmployeeDocuments(
  employeeId: number | string,
  docs: EmployeeDocumentsUpload,
  method: "post" | "put" | "patch" = "post"
) {
  const formData = new FormData()
  if (docs.id_card) formData.append("id_card", docs.id_card)
  if (docs.contract) formData.append("contract", docs.contract)
  if (docs.cv) formData.append("cv", docs.cv)
  if (docs.certificate) formData.append("certificate", docs.certificate)

  const url = `/api/v1/employees/${employeeId}/documents`
  return api.request({
    url,
    method,
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
}
