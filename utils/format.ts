export const currency = (value: string | number) => {
  const num = typeof value === "string" ? parseFloat(value || "0") : value || 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

export const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

export const capitalize = (val?: string) => {
  if (!val) return "-";
  return val.charAt(0).toUpperCase() + val.slice(1);
};
