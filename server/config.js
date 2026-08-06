/**
 * Central configuration.
 *
 * Everything that differs from one organisation to the next lives here in one
 * place: platform name, company name, support address, certificate numbering.
 * Every value can be overridden with an environment variable (see .env.example),
 * so adopting this project never requires touching a source file.
 */

export const konfiguration = {
  /** Platform name - shown in the page title, on the login screen and while loading. */
  plattform: process.env.PLATTFORM_NAME ?? 'Learning Academy',

  /** Organisation name - shown on the certificate and in the department overview. */
  organisation: process.env.ORGANISATION ?? 'Beispiel GmbH',

  /** Contact address for password resets and questions. */
  support_email: process.env.SUPPORT_EMAIL ?? 'schulung@example.com',

  /** Email domain used for the placeholder in the sign-in form. */
  email_domain: process.env.EMAIL_DOMAIN ?? 'example.com',

  /** Optional tagline in the certificate footer. Leave empty to omit it. */
  claim: process.env.CLAIM ?? '',

  /** Certificate number prefix, e.g. ZERT-2026-000123. */
  zertifikat_praefix: process.env.ZERTIFIKAT_PRAEFIX ?? 'ZERT',

  /** Port the local server listens on. */
  port: Number(process.env.PORT ?? 5180),
}

/** The subset the frontend may read - available without signing in. */
export const oeffentlicheKonfiguration = () => ({
  plattform: konfiguration.plattform,
  organisation: konfiguration.organisation,
  support_email: konfiguration.support_email,
  email_domain: konfiguration.email_domain,
})

export default konfiguration
