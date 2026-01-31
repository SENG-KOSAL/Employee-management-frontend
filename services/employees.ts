import api from "@/services/api"

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
