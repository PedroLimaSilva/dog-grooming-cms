import type { OwnerPrimaryLanguage } from "../types";

const DEFAULT_LANG: OwnerPrimaryLanguage = "en";

export function normalizeOwnerPrimaryLanguage(
  lang: OwnerPrimaryLanguage | undefined,
): OwnerPrimaryLanguage {
  if (lang === "en" || lang === "es" || lang === "pt") return lang;
  return DEFAULT_LANG;
}

/** Short prefilled line when opening WhatsApp with an owner. */
export function ownerDetailWhatsAppGreeting(
  ownerName: string,
  lang: OwnerPrimaryLanguage | undefined,
): string {
  const l = normalizeOwnerPrimaryLanguage(lang);
  const name = ownerName.trim();
  switch (l) {
    case "es":
      return `Hola${name ? `, ${name}` : ""}, `;
    case "pt":
      return `Oi${name ? `, ${name}` : ""}, `;
    default:
      return `Hi ${name || "there"}, `;
  }
}

/** Prefilled line from the dog record when messaging the primary owner. */
export function dogOwnerWhatsAppGreeting(
  dogName: string,
  lang: OwnerPrimaryLanguage | undefined,
): string {
  const l = normalizeOwnerPrimaryLanguage(lang);
  const trimmed = dogName.trim();
  switch (l) {
    case "es":
      return trimmed
        ? `Hola, esto es sobre ${trimmed}. `
        : "Hola, esto es sobre su perro. ";
    case "pt":
      return trimmed
        ? `Oi, é sobre o ${trimmed}. `
        : "Oi, é sobre o seu cão. ";
    default:
      return `Hi, this is regarding ${trimmed || "my dog"}. `;
  }
}
