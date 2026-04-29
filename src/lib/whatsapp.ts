/** Digits only, suitable for `wa.me` URLs (include country code, no +). */
export function phoneDigitsForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function whatsAppChatUrl(phone: string, text?: string): string {
  const digits = phoneDigitsForWhatsApp(phone);
  if (!digits) return "";
  const base = `https://wa.me/${digits}`;
  if (!text?.trim()) return base;
  return `${base}?text=${encodeURIComponent(text.trim())}`;
}
