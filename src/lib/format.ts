export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

export function formatStatus(value?: string) {
  if (!value) return "Pending";
  const labels: Record<string, string> = {
    pending: "Menunggu",
    pending_payment: "Menunggu bayar",
    paid: "Lunas",
    confirmed: "Terkonfirmasi",
    failed: "Gagal",
    expired: "Kedaluwarsa",
    cancelled: "Dibatalkan",
    completed: "Selesai",
    refunded: "Refund"
  };
  return labels[value.toLowerCase()] || value.replaceAll("_", " ");
}
