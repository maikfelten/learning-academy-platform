/**
 * Platform name, organisation name and support address.
 *
 * The values come from server/config.js (configurable via environment variables)
 * and are fetched once at startup - see src/main.jsx. That is why any component
 * can read them directly instead of having them passed down as props.
 */

export const branding = {
  plattform: 'Learning Academy',
  organisation: 'Beispiel GmbH',
  support_email: 'schulung@example.com',
  email_domain: 'example.com',
}

export async function brandingLaden() {
  try {
    const res = await fetch('/api/info')
    if (res.ok) Object.assign(branding, await res.json())
  } catch {
    /* Keep the defaults - the platform works without this call */
  }
  document.title = `${branding.plattform} — Interne Schulungsplattform`
  return branding
}
