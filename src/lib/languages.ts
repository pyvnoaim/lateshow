/** Languages for TMDB titles and descriptions (the site's own text stays English). Pure, safe in the browser. */
export const LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "de-DE", label: "Deutsch" },
  { code: "fr-FR", label: "Français" },
  { code: "es-ES", label: "Español" },
  { code: "it-IT", label: "Italiano" },
  { code: "pt-BR", label: "Português" },
  { code: "nl-NL", label: "Nederlands" },
  { code: "pl-PL", label: "Polski" },
  { code: "tr-TR", label: "Türkçe" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];
export const DEFAULT_LANGUAGE: Language = "en-US";
/** Cookie holding the choice from Settings. A preference the visitor set, nothing tracked. */
export const LANGUAGE_COOKIE = "lang";

const isLanguage = (v: string | undefined): v is Language => LANGUAGES.some((l) => l.code === v);

/** The chosen language (cookie) or the browser's first one we have (Accept-Language), else English. */
export function pickLanguage(cookie: string | undefined, acceptLanguage: string | null | undefined): Language {
  if (isLanguage(cookie)) return cookie;
  for (const part of (acceptLanguage ?? "").split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    if (!tag || tag === "*") continue;
    const hit =
      LANGUAGES.find((l) => l.code.toLowerCase() === tag) ??
      LANGUAGES.find((l) => l.code.slice(0, 2) === tag.slice(0, 2));
    if (hit) return hit.code;
  }
  return DEFAULT_LANGUAGE;
}
