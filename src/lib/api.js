/** Thin wrapper around fetch. The interface knows these functions and nothing else. */

async function call(pfad, { method = 'GET', body } = {}) {
  const res = await fetch(pfad, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const typ = res.headers.get('content-type') ?? ''
  const daten = typ.includes('json') ? await res.json() : null
  if (!res.ok) {
    const fehler = new Error(daten?.fehler ?? `Fehler ${res.status}`)
    fehler.status = res.status
    fehler.daten = daten
    throw fehler
  }
  return daten
}

export const api = {
  login: (email, passwort) => call('/api/login', { method: 'POST', body: { email, passwort } }),
  logout: () => call('/api/logout', { method: 'POST' }),
  me: () => call('/api/me'),
  passwortAendern: (alt, neu) => call('/api/passwort', { method: 'POST', body: { alt, neu } }),

  bibliothek: () => call('/api/bibliothek'),
  kurs: (slug) => call(`/api/kurse/${slug}`),
  kursStarten: (slug) => call(`/api/kurse/${slug}/starten`, { method: 'POST' }),
  speichern: (slug) => call(`/api/kurse/${slug}/speichern`, { method: 'POST' }),

  fortschritt: (lektionId, daten) => call(`/api/lektionen/${lektionId}/fortschritt`, { method: 'POST', body: daten }),
  lektionAbschliessen: (lektionId, bestaetigt = true) =>
    call(`/api/lektionen/${lektionId}/abschliessen`, { method: 'POST', body: { bestaetigt } }),
  externBestaetigen: (lektionId, daten) => call(`/api/lektionen/${lektionId}/extern`, { method: 'POST', body: daten }),

  quizStarten: (lektionId) => call(`/api/lektionen/${lektionId}/quiz/start`, { method: 'POST' }),
  versuch: (id) => call(`/api/versuche/${id}`),
  versuchAbgeben: (id, antworten) => call(`/api/versuche/${id}/abgeben`, { method: 'POST', body: { antworten } }),

  profil: () => call('/api/profil'),
  bereich: () => call('/api/bereich'),
}
