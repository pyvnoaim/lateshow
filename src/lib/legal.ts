/**
 * Who runs Lateshow, for the Impressum and the privacy page. German law (§ 5 DDG) wants a real name, a postal
 * address a letter can reach and a fast way to get in touch. The address is a rented Impressum address (c/o line),
 * which the law allows as long as letters reach you there.
 */
export const OPERATOR = {
  // ponytail: a nickname, the owner's choice. § 5 DDG asks for the real first and last name, so this Impressum is
  // incomplete (risk of a warning letter or fine). Put the real name here to fix that.
  name: "pyvno",
  co: "c/o MDC#1250",
  street: "Welserstraße 3",
  city: "87463 Dietmannsried",
  country: "Germany",
  email: "pyvnovlr@gmail.com",
};

/** Where the site runs (IONOS VPS in Berlin) and how long the web server keeps access logs. */
export const HOSTING = {
  provider: "IONOS SE, Elgendorfer Str. 57, 56410 Montabaur, Germany",
  // Nginx Proxy Manager's logrotate: weekly, 4 old files kept, so up to 5 weeks. Change both together.
  logDays: "35",
};

/** The date the privacy page last changed. */
export const PRIVACY_UPDATED = "November 15, 2026";
