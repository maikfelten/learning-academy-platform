/** Schmale Hülle um fetch. Die Oberfläche kennt nur diese Funktionen. */

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

  streamToken: (lektionId) => call(`/api/lektionen/${lektionId}/stream-token`),
  fortschritt: (lektionId, daten) => call(`/api/lektionen/${lektionId}/fortschritt`, { method: 'POST', body: daten }),
  lektionAbschliessen: (lektionId, bestaetigt = true) =>
    call(`/api/lektionen/${lektionId}/abschliessen`, { method: 'POST', body: { bestaetigt } }),
  externBestaetigen: (lektionId, daten) => call(`/api/lektionen/${lektionId}/extern`, { method: 'POST', body: daten }),

  quizStarten: (lektionId) => call(`/api/lektionen/${lektionId}/quiz/start`, { method: 'POST' }),
  versuch: (id) => call(`/api/versuche/${id}`),
  versuchAbgeben: (id, antworten) => call(`/api/versuche/${id}/abgeben`, { method: 'POST', body: { antworten } }),

  profil: () => call('/api/profil'),
  bereich: () => call('/api/bereich'),
  rangliste: () => call('/api/rangliste'),

  /* ------------------------------------------------------------ Verwaltung */
  adminKurse: () => call('/api/admin/kurse'),
  adminKurs: (slug) => call(`/api/admin/kurse/${slug}`),
  adminKursSpeichern: (slug, daten) => call(`/api/admin/kurse/${slug}`, { method: 'PUT', body: daten }),
  adminKursAnlegen: (daten) => call('/api/admin/kurse', { method: 'POST', body: daten }),
  adminKursKlonen: (slug) => call(`/api/admin/kurse/${slug}/klonen`, { method: 'POST' }),
  adminKursLoeschen: (slug) => call(`/api/admin/kurse/${slug}`, { method: 'DELETE' }),
  adminLektionenSpeichern: (slug, lektionen) =>
    call(`/api/admin/kurse/${slug}/lektionen`, { method: 'PUT', body: { lektionen } }),
  adminVideoUpload: (daten) => call('/api/admin/medien', { method: 'POST', body: daten }),

  adminPersonen: (filter = {}) => call('/api/admin/personen' + toQuery(filter)),
  adminPerson: (id) => call(`/api/admin/personen/${id}`),
  adminPersonSpeichern: (id, daten) => call(`/api/admin/personen/${id}`, { method: 'PUT', body: daten }),
  adminPersonAnlegen: (daten) => call('/api/admin/personen', { method: 'POST', body: daten }),
  adminPasswortReset: (id) => call(`/api/admin/personen/${id}/passwort-reset`, { method: 'POST' }),
  adminCsvImport: (csv) => call('/api/admin/personen/import', { method: 'POST', body: { csv } }),

  /* ----------------------------------------------------------- Performance */
  performanceIch: () => call('/api/performance/ich'),
  performancePerson: (id) => call(`/api/performance/person/${id}`),
  performanceUebersicht: () => call('/api/performance/uebersicht'),
  performanceHeatmap: () => call('/api/performance/heatmap'),
  zielAnlegen: (daten) => call('/api/performance/ziele', { method: 'POST', body: daten }),
  zielWert: (id, istwert, kommentar) =>
    call(`/api/performance/ziele/${id}`, { method: 'PUT', body: { istwert, kommentar } }),
  zielSpeichern: (id, daten) => call(`/api/performance/ziele/${id}`, { method: 'PUT', body: daten }),
  zielLoeschen: (id) => call(`/api/performance/ziele/${id}`, { method: 'DELETE' }),
  reviewAnlegen: (daten) => call('/api/performance/reviews', { method: 'POST', body: daten }),
  reviewSpeichern: (id, daten) => call(`/api/performance/reviews/${id}`, { method: 'PUT', body: daten }),
  kompetenzBewerten: (daten) => call('/api/performance/kompetenzen/bewerten', { method: 'POST', body: daten }),
  umfrageSpeichern: (antworten) => call('/api/performance/umfrage', { method: 'PUT', body: { antworten } }),

  benachrichtigungen: () => call('/api/benachrichtigungen'),
  benachrichtigungenSpeichern: (daten) => call('/api/benachrichtigungen', { method: 'PUT', body: daten }),
}

function toQuery(obj) {
  const teile = Object.entries(obj).filter(([, v]) => v !== '' && v != null)
  return teile.length ? '?' + new URLSearchParams(teile).toString() : ''
}
