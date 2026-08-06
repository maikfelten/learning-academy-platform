/**
 * API der Plattform. Kennt kein SQL - alles läuft über server/repo.js.
 * Rollen: admin (alles), fuehrungskraft (lesend, eigener Bereich), lernender.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import * as repo from './repo.js'
import { hashPassword, passwortRegelnPruefen, verifyPassword } from './auth.js'
import { MEDIA_DIR, UPLOAD_DIR, db } from './db.js'
import { isPast, nowIso, safeFileName } from './util.js'
import { zertifikatPdf } from './certificate.js'
import { levelBerechnen } from './level.js'
import { konfiguration, oeffentlicheKonfiguration } from './config.js'
import * as admin from './admin.js'
import * as performance from './performance.js'
import { streamTokenErzeugen } from './stream.js'

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

const KATEGORIEN = ['Pflichtschulungen', 'KI & Digitales', 'Technik', 'Sicherheit & Qualität', 'Zusammenarbeit']

/* --------------------------------------------------------------- Aufbereitung */

function kursKarte(user, kurs, pflicht, gespeichert) {
  const st = repo.kursStatus(user, kurs, pflicht)
  return {
    slug: kurs.slug,
    titel: kurs.titel,
    untertitel: kurs.untertitel,
    beschreibung: kurs.beschreibung,
    kategorie: kurs.kategorie,
    anbieter: kurs.anbieter,
    dauer_min: kurs.dauer_min,
    akzent: kurs.akzent,
    cover_bild: kurs.cover_bild,
    cover_motiv: kurs.cover_motiv,
    demo: !!kurs.demo,
    turnus_monate: kurs.turnus_monate,
    strenge: kurs.strenge,
    highlight: !!kurs.highlight,
    gespeichert: gespeichert.includes(kurs.id),
    ...st,
  }
}

function bibliothek(user) {
  const zuweisungen = repo.zuweisungenFuer(user)
  const gespeichert = repo.gespeicherteKurse(user.id)
  const karten = repo
    .alleKurse()
    .filter((k) => zuweisungen.has(k.id))
    .map((k) => kursKarte(user, k, zuweisungen.get(k.id).pflicht, gespeichert))

  const pflicht = karten.filter((k) => k.pflicht)
  const freiwillig = karten.filter((k) => !k.pflicht)

  const rang = { ueberfaellig: 0, bald_faellig: 1, laufend: 2, offen: 3, bestanden: 4 }
  pflicht.sort((a, b) => rang[a.status] - rang[b.status] || (a.tage_bis_faellig ?? 9e9) - (b.tage_bis_faellig ?? 9e9))

  const weiterlernen = karten
    .filter((k) => k.prozent > 0 && k.prozent < 100)
    .sort((a, b) => String(b.zuletzt_aktiv).localeCompare(String(a.zuletzt_aktiv)))

  const hero =
    freiwillig.find((k) => k.highlight && k.status !== 'bestanden') ??
    freiwillig.find((k) => k.highlight) ??
    freiwillig[0] ??
    karten[0] ??
    null

  const curricula = repo.alleCurricula().map((c) => {
    const kurse = repo.curriculumKurse(c.id).filter((k) => zuweisungen.has(k.id))
    const stati = kurse.map((k) => repo.kursStatus(user, k, zuweisungen.get(k.id)?.pflicht))
    const fertig = stati.filter((s) => s.status === 'bestanden' || s.status === 'bald_faellig').length
    return {
      slug: c.slug,
      titel: c.titel,
      beschreibung: c.beschreibung,
      akzent: c.akzent,
      demo: !!c.demo,
      kurse: kurse.map((k) => ({ slug: k.slug, titel: k.titel })),
      erledigt: fertig,
      gesamt: kurse.length,
      prozent: kurse.length ? Math.round((fertig / kurse.length) * 100) : 0,
    }
  })

  return {
    kategorien: KATEGORIEN,
    hero,
    neu: [...karten].sort((a, b) => (b.highlight ? 1 : 0) - (a.highlight ? 1 : 0)).slice(0, 6),
    weiterlernen,
    pflicht,
    empfehlungen: freiwillig.filter((k) => k.slug !== hero?.slug),
    alle: karten,
    curricula: curricula.filter((c) => c.gesamt > 0),
    hinweise: {
      ueberfaellig: pflicht.filter((k) => k.status === 'ueberfaellig').length,
      bald_faellig: pflicht.filter((k) => k.status === 'bald_faellig').length,
      offen: pflicht.filter((k) => k.status === 'offen' || k.status === 'laufend').length,
    },
  }
}

function oeffentlicherUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    rolle: u.rolle,
    standort: u.standort,
    abteilung: u.abteilung,
    position: u.position,
    eintrittsdatum: u.eintrittsdatum,
    passwort_wechsel: !!u.passwort_wechsel,
    level: levelBerechnen(repo.abschlussAnzahl(u.id)),
    initialen: u.name
      .split(/\s+/)
      .map((t) => t[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  }
}

function kursDetail(user, kurs, pflicht) {
  const st = repo.kursStatus(user, kurs, pflicht)
  // Zurückgehaltene Lektionen sieht nur der Admin - für alle anderen existieren
  // sie schlicht nicht, auch nicht in der Zählung des Fortschritts.
  const alle = repo.lektionen(kurs.id, user.rolle !== 'admin')
  const fs = repo.fortschritt(user.id, kurs.id, st.zyklus_start)

  let ersteOffene = null
  const lektionen = alle.map((l, i) => {
    const p = fs.detail.get(l.id)
    const erledigt = p?.status === 'abgeschlossen'
    if (!erledigt && ersteOffene === null) ersteOffene = i
    // Strenge Kurse: Lektion n ist erst frei, wenn n-1 erledigt ist.
    const vorherErledigt = i === 0 || fs.detail.get(alle[i - 1].id)?.status === 'abgeschlossen'
    const frei = kurs.strenge === 'frei' || erledigt || vorherErledigt

    const quiz = l.typ === 'quiz' && l.quiz_id ? repo.quizById(l.quiz_id) : null
    return {
      id: l.id,
      position: l.position,
      titel: l.titel,
      typ: l.typ,
      dauer_min: l.dauer_min,
      erledigt,
      frei,
      prozent: p?.prozent ?? 0,
      max_position_sek: p?.max_position_sek ?? 0,
      kapitel: l.kapitel || '',
      unterkapitel: l.unterkapitel || null,
      sichtbar: l.sichtbar !== 0,
      video_datei: l.video_datei,
      video_vorhanden: !!(l.video_datei && existsSync(join(MEDIA_DIR, l.video_datei))),
      video_laenge_sek: l.video_laenge_sek,
      audio_datei: l.audio_datei,
      audio_vorhanden: !!(l.audio_datei && existsSync(join(MEDIA_DIR, l.audio_datei))),
      youtube_id: l.youtube_id,
      scorm_paket: l.scorm_paket,
      text_inhalt: l.text_inhalt,
      pdf_datei: l.pdf_datei,
      pdf_vorhanden: !!(l.pdf_datei && existsSync(join(MEDIA_DIR, l.pdf_datei))),
      link_url: l.link_url,
      link_hinweis: l.link_hinweis,
      link_nachweis: !!l.link_nachweis,
      quiz: quiz
        ? {
            id: quiz.id,
            titel: quiz.titel,
            bestehensgrenze: quiz.bestehensgrenze,
            fragen_anzahl: quiz.pool_aktiv ? quiz.fragen_anzahl : repo.fragenFuerQuiz(quiz.id).length,
            pool_gesamt: repo.fragenFuerQuiz(quiz.id).length,
            pool_aktiv: !!quiz.pool_aktiv,
            sperrzeit_stunden: quiz.sperrzeit_stunden,
            max_versuche_zeitraum: quiz.max_versuche_zeitraum,
            zeitraum_tage: quiz.zeitraum_tage,
            harte_obergrenze: quiz.harte_obergrenze,
            zeitlimit_min: quiz.zeitlimit_min,
            status: repo.quizStatus(user, quiz, st.zyklus_start),
          }
        : null,
      nachweis: l.typ === 'link' ? repo.externeNachweise(user.id, kurs.id).find((n) => n.lesson_id === l.id) ?? null : null,
    }
  })

  return {
    ...kursKarte(user, kurs, pflicht, repo.gespeicherteKurse(user.id)),
    // Beim Erstdurchlauf strenger Kurse ist Vorspulen gesperrt, bei Wiederholungen nicht.
    vorspulen_erlaubt: kurs.strenge === 'frei' || st.wiederholung,
    lektionen,
    aktive_lektion: ersteOffene === null ? 0 : ersteOffene,
  }
}

/* ------------------------------------------------------------------- Routen */

const routes = []
const route = (method, pfad, handler, { oeffentlich = false, rollen = null } = {}) =>
  routes.push({ method, pfad, handler, oeffentlich, rollen, regex: pfadRegex(pfad) })

function pfadRegex(pfad) {
  const namen = []
  const quelle = pfad
    .split('/')
    .map((teil) => {
      if (teil.startsWith(':')) {
        namen.push(teil.slice(1))
        return '([^/]+)'
      }
      return teil.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')
  return { regex: new RegExp(`^${quelle}$`), namen }
}

export function findRoute(method, pfad) {
  for (const r of routes) {
    if (r.method !== method) continue
    const m = r.regex.regex.exec(pfad)
    if (!m) continue
    const params = {}
    r.regex.namen.forEach((n, i) => (params[n] = decodeURIComponent(m[i + 1])))
    return { ...r, params }
  }
  return null
}

/* ------------------------------------------------------------------- Zugang */

// Name der Plattform, Organisation und Support-Adresse - schon vor der Anmeldung
// gebraucht (Login), enthält deshalb bewusst nichts Internes.
route('GET', '/api/info', () => oeffentlicheKonfiguration(), { oeffentlich: true })

route(
  'POST',
  '/api/login',
  ({ body, setCookie }) => {
    const user = repo.userByEmail(body.email)
    if (!user) throw new HttpError(401, 'E-Mail oder Passwort ist falsch.')
    if (user.gesperrt_bis && !isPast(user.gesperrt_bis))
      throw new HttpError(423, 'Konto ist nach mehreren Fehlversuchen kurz gesperrt. Bitte in 15 Minuten erneut versuchen.')
    if (!verifyPassword(String(body.passwort ?? ''), user.passwort_hash, user.passwort_salt)) {
      repo.loginFehler(user.id)
      repo.audit(user.id, 'login.fehlgeschlagen')
      throw new HttpError(401, 'E-Mail oder Passwort ist falsch.')
    }
    repo.loginErfolg(user.id)
    repo.audit(user.id, 'login.erfolg')
    setCookie(repo.createSession(user.id))
    return { user: oeffentlicherUser(user) }
  },
  { oeffentlich: true },
)

route(
  'POST',
  '/api/logout',
  ({ cookie, clearCookie }) => {
    if (cookie) repo.deleteSession(cookie)
    clearCookie()
    return { ok: true }
  },
  { oeffentlich: true },
)

route('GET', '/api/me', ({ user }) => ({ user: oeffentlicherUser(user) }))

route('POST', '/api/passwort', ({ user, body }) => {
  if (!verifyPassword(String(body.alt ?? ''), user.passwort_hash, user.passwort_salt))
    throw new HttpError(400, 'Das aktuelle Passwort ist nicht korrekt.')
  const fehler = passwortRegelnPruefen(body.neu)
  if (fehler) throw new HttpError(400, fehler)
  const { hash, salt } = hashPassword(body.neu)
  repo.setPassword(user.id, hash, salt, 0)
  repo.audit(user.id, 'passwort.geaendert')
  return { ok: true }
})

/* --------------------------------------------------------------- Bibliothek */

route('GET', '/api/bibliothek', ({ user }) => ({ user: oeffentlicherUser(user), ...bibliothek(user) }))

route('GET', '/api/kurse/:slug', ({ user, params }) => {
  // Der Admin darf Entwürfe zur Kontrolle öffnen, alle anderen nicht
  const kurs = repo.kursBySlug(params.slug, user.rolle === 'admin')
  if (!kurs) throw new HttpError(404, 'Diese Schulung gibt es nicht.')
  const zuweisungen = repo.zuweisungenFuer(user)
  if (!zuweisungen.has(kurs.id)) throw new HttpError(403, 'Diese Schulung ist dir nicht zugewiesen.')
  return kursDetail(user, kurs, zuweisungen.get(kurs.id).pflicht)
})

route('POST', '/api/kurse/:slug/starten', ({ user, params }) => {
  const kurs = repo.kursBySlug(params.slug)
  if (!kurs) throw new HttpError(404, 'Diese Schulung gibt es nicht.')
  repo.kursGestartet(user.id, kurs.id)
  return { ok: true }
})

route('POST', '/api/kurse/:slug/speichern', ({ user, params }) => {
  const kurs = repo.kursBySlug(params.slug)
  if (!kurs) throw new HttpError(404, 'Diese Schulung gibt es nicht.')
  const gespeichert = repo.speichernUmschalten(user.id, kurs.id)
  return { gespeichert }
})

/* ------------------------------------------------------------- Lektionslauf */

function lektionKontext(user, lessonId) {
  const l = repo.lektion(Number(lessonId))
  if (!l) throw new HttpError(404, 'Lektion nicht gefunden.')
  const kurs = repo.kursById(l.course_id)
  const zuweisungen = repo.zuweisungenFuer(user)
  if (!zuweisungen.has(kurs.id)) throw new HttpError(403, 'Diese Schulung ist dir nicht zugewiesen.')
  return { lektion: l, kurs, pflicht: zuweisungen.get(kurs.id).pflicht }
}

/**
 * Kurzlebiges Token für die geschützte Videoauslieferung. Der Player holt es
 * sich unmittelbar vor der Wiedergabe; eine kopierte Stream-URL ist damit nach
 * eineinhalb Minuten wertlos und in einer fremden Session sofort.
 */
route('GET', '/api/lektionen/:id/stream-token', ({ user, params }) => {
  const { lektion } = lektionKontext(user, params.id)
  if (!['video', 'audio'].includes(lektion.typ)) throw new HttpError(400, 'Diese Lektion hat kein Medium.')
  const datei = lektion.typ === 'video' ? lektion.video_datei : lektion.audio_datei
  if (!datei) throw new HttpError(404, 'Für diese Lektion ist keine Datei hinterlegt.')
  return {
    url: `/api/stream/${lektion.id}?t=${streamTokenErzeugen(user.id, lektion.id)}`,
    gueltig_sek: 90,
  }
})

route('POST', '/api/lektionen/:id/fortschritt', ({ user, params, body }) => {
  const { lektion, kurs } = lektionKontext(user, params.id)
  repo.kursGestartet(user.id, kurs.id)
  const p = repo.fortschrittSpeichern(user.id, lektion.id, body)
  return { prozent: p.prozent, max_position_sek: p.max_position_sek }
})

route('POST', '/api/lektionen/:id/abschliessen', ({ user, params, body }) => {
  const { lektion, kurs, pflicht } = lektionKontext(user, params.id)

  if (['video', 'youtube'].includes(lektion.typ) && kurs.strenge === 'streng') {
    const p = db.prepare('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(user.id, lektion.id)
    const st = repo.kursStatus(user, kurs, pflicht)
    // 95-Prozent-Regel gilt nur beim Erstdurchlauf strenger Kurse
    if (!st.wiederholung && (p?.prozent ?? 0) < 95)
      throw new HttpError(400, 'Das Video muss zu mindestens 95 % angesehen sein.')
  }
  if (lektion.typ === 'quiz') throw new HttpError(400, 'Quiz-Lektionen werden über das Quiz abgeschlossen.')
  if (lektion.typ === 'link') throw new HttpError(400, 'Externe Schulungen brauchen eine Bestätigung.')

  repo.lektionAbschliessen(user.id, lektion.id, { bestaetigt: body?.bestaetigt ? 1 : 0 })
  repo.kursGestartet(user.id, kurs.id)
  const abschluss = repo.kursAbschlussPruefen(user, kurs)
  return { ok: true, kurs_abgeschlossen: !!abschluss, zertifikat_id: abschluss?.id ?? null }
})

route('POST', '/api/lektionen/:id/extern', ({ user, params, body }) => {
  const { lektion, kurs } = lektionKontext(user, params.id)
  if (lektion.typ !== 'link') throw new HttpError(400, 'Diese Lektion ist keine externe Schulung.')
  if (!body?.bestaetigt) throw new HttpError(400, 'Bitte bestätige zuerst, dass du die Schulung abgeschlossen hast.')

  let dateiName = null
  let dateiPfad = null
  if (body.datei_base64) {
    const erlaubt = ['pdf', 'png', 'jpg', 'jpeg']
    const name = safeFileName(body.datei_name)
    const endung = name.split('.').pop()?.toLowerCase()
    if (!erlaubt.includes(endung)) throw new HttpError(400, 'Erlaubt sind PDF, PNG und JPG.')
    const daten = Buffer.from(String(body.datei_base64).split(',').pop(), 'base64')
    if (daten.length > 8 * 1024 * 1024) throw new HttpError(413, 'Die Datei darf maximal 8 MB groß sein.')
    const ordner = join(UPLOAD_DIR, user.id)
    mkdirSync(ordner, { recursive: true })
    dateiName = name
    const rel = join(user.id, `${Date.now()}-${name}`)
    writeFileSync(join(UPLOAD_DIR, rel), daten)
    dateiPfad = rel.replaceAll('\\', '/')
  } else if (lektion.link_nachweis) {
    throw new HttpError(400, 'Für diese Schulung ist ein Nachweis (Zertifikat) erforderlich.')
  }

  repo.externenNachweisSpeichern(user.id, lektion, { datei_name: dateiName, datei_pfad: dateiPfad })
  repo.lektionAbschliessen(user.id, lektion.id, { bestaetigt: 1 })
  repo.kursGestartet(user.id, kurs.id)
  const abschluss = repo.kursAbschlussPruefen(user, kurs)
  return { ok: true, kurs_abgeschlossen: !!abschluss, zertifikat_id: abschluss?.id ?? null }
})

/* -------------------------------------------------------------------- Quizze */

route('POST', '/api/lektionen/:id/quiz/start', ({ user, params }) => {
  const { lektion, kurs, pflicht } = lektionKontext(user, params.id)
  if (lektion.typ !== 'quiz' || !lektion.quiz_id) throw new HttpError(400, 'Diese Lektion ist kein Quiz.')
  const quiz = repo.quizById(lektion.quiz_id)
  const st = repo.kursStatus(user, kurs, pflicht)

  if (kurs.strenge === 'streng') {
    const alle = repo.lektionen(kurs.id)
    const davor = alle.filter((l) => l.position < lektion.position)
    const fs = repo.fortschritt(user.id, kurs.id, st.zyklus_start)
    const offen = davor.filter((l) => fs.detail.get(l.id)?.status !== 'abgeschlossen')
    if (offen.length) throw new HttpError(400, 'Bitte arbeite zuerst alle Lektionen davor durch.')
  }

  const status = repo.quizStatus(user, quiz, st.zyklus_start)
  if (!status.darf_starten && !status.laufender_versuch) throw new HttpError(429, sperrText(status, quiz), { status })

  const versuch = repo.versuchStarten(user, quiz, lektion)
  return {
    versuch_id: versuch.id,
    gestartet_am: versuch.gestartet_am,
    zeitlimit_min: quiz.zeitlimit_min,
    titel: quiz.titel,
    bestehensgrenze: quiz.bestehensgrenze,
    fragen: repo.versuchFragen(versuch),
  }
})

function sperrText(status, quiz) {
  if (status.grund === 'bestanden') return 'Dieses Quiz hast du bereits bestanden.'
  if (status.grund === 'bewertung_offen') return 'Dein letzter Versuch enthält Freitextfragen und wird noch bewertet.'
  if (status.grund === 'sperrzeit')
    return `Nach einem nicht bestandenen Versuch gilt eine Sperrzeit von ${quiz.sperrzeit_stunden} Stunden.`
  if (status.grund === 'kontingent')
    return `Maximal ${quiz.max_versuche_zeitraum} Versuche in ${quiz.zeitraum_tage} Tagen. Nächster Versuch später möglich.`
  if (status.grund === 'obergrenze')
    return `Die maximale Anzahl von ${quiz.harte_obergrenze} Versuchen ist erreicht. Bitte wende dich an die Schulungsleitung.`
  return 'Das Quiz ist derzeit gesperrt.'
}

route('GET', '/api/versuche/:id', ({ user, params }) => {
  const versuch = repo.versuchById(Number(params.id))
  if (!versuch || versuch.user_id !== user.id) throw new HttpError(404, 'Versuch nicht gefunden.')
  const quiz = repo.quizById(versuch.quiz_id)
  return {
    versuch_id: versuch.id,
    gestartet_am: versuch.gestartet_am,
    beendet_am: versuch.beendet_am,
    zeitlimit_min: quiz.zeitlimit_min,
    titel: quiz.titel,
    bestehensgrenze: quiz.bestehensgrenze,
    fragen: repo.versuchFragen(versuch),
  }
})

route('POST', '/api/versuche/:id/abgeben', ({ user, params, body }) => {
  const versuch = repo.versuchById(Number(params.id))
  if (!versuch || versuch.user_id !== user.id) throw new HttpError(404, 'Versuch nicht gefunden.')
  if (versuch.beendet_am) throw new HttpError(400, 'Dieser Versuch ist schon abgegeben.')
  const quiz = repo.quizById(versuch.quiz_id)
  const kurs = versuch.course_id ? repo.kursById(versuch.course_id) : null

  const ergebnis = repo.versuchAbgeben(user, versuch, quiz, body?.antworten ?? {})

  let abschluss = null
  if (ergebnis.bestanden && versuch.lesson_id) {
    repo.lektionAbschliessen(user.id, versuch.lesson_id, { bestaetigt: 1, prozent: ergebnis.prozent })
    if (kurs) abschluss = repo.kursAbschlussPruefen(user, kurs)
  }

  const aktualisiert = repo.versuchById(versuch.id)
  return {
    prozent: ergebnis.prozent,
    punkte: ergebnis.punkte,
    punkte_moeglich: ergebnis.moeglich,
    bestanden: ergebnis.bestanden,
    bestehensgrenze: quiz.bestehensgrenze,
    bewertung_offen: ergebnis.freitextOffen,
    themen_falsch: quiz.aufloesung_nichtbestanden === 'keine' ? [] : ergebnis.themen,
    aufloesung:
      ergebnis.bestanden || quiz.aufloesung_nichtbestanden === 'voll' ? repo.aufloesung(aktualisiert) : null,
    sperrzeit_stunden: quiz.sperrzeit_stunden,
    kurs_abgeschlossen: !!abschluss,
    zertifikat_id: abschluss?.id ?? null,
    kurs_slug: kurs?.slug ?? null,
  }
})

/* ------------------------------------------------------------------- Profil */

route('GET', '/api/profil', ({ user }) => {
  const lib = bibliothek(user)
  const nachweise = repo.abschluesse(user.id).map((a) => ({
    id: a.id,
    titel: a.titel,
    slug: a.slug,
    kategorie: a.kategorie,
    abgeschlossen_am: a.abgeschlossen_am,
    gueltig_bis: a.gueltig_bis,
    prozent: a.prozent,
    quelle: a.quelle,
    zertifikat_nr: a.zertifikat_nr,
    demo: !!a.demo,
    abgelaufen: !!a.gueltig_bis && isPast(a.gueltig_bis),
  }))
  return {
    user: oeffentlicherUser(user),
    nachweise,
    laufend: lib.weiterlernen,
    pflicht: lib.pflicht,
    gespeichert: lib.alle.filter((k) => k.gespeichert),
    externe_nachweise: repo.externeNachweise(user.id).map((n) => ({
      id: n.id,
      status: n.status,
      datei_name: n.datei_name,
      bestaetigt_am: n.bestaetigt_am,
      kurs: repo.kursById(n.course_id)?.titel ?? null,
    })),
    statistik: {
      abgeschlossen: nachweise.filter((n) => !n.abgelaufen).length,
      pflicht_erfuellt: lib.pflicht.filter((k) => k.status === 'bestanden' || k.status === 'bald_faellig').length,
      pflicht_gesamt: lib.pflicht.length,
      lernminuten: lib.alle
        .filter((k) => k.status === 'bestanden' || k.status === 'bald_faellig')
        .reduce((s, k) => s + (k.dauer_min ?? 0), 0),
    },
  }
})

/* ---------------------------------------------------------------- Rangliste */

// Sichtbar für alle: Level, Anzahl Schulungen und wann zuletzt etwas
// abgeschlossen wurde. Bewusst OHNE Quizergebnisse und ohne Angabe, welche
// Pflichtschulung jemandem fehlt - eine Rangliste darf nicht zum Pranger werden.
route('GET', '/api/rangliste', ({ user }) => {
  const zeilen = repo
    .alleUser()
    .filter((p) => p.rolle !== 'admin' || p.id === user.id)
    .map((p) => {
      const anzahl = repo.abschlussAnzahl(p.id)
      const letzter = repo.letzterAbschlussGesamt(p.id)
      return {
        id: p.id,
        name: p.name,
        abteilung: p.abteilung,
        standort: p.standort,
        initialen: p.name.split(/\s+/).map((t) => t[0]).join('').slice(0, 2).toUpperCase(),
        level: levelBerechnen(anzahl),
        letzter_abschluss: letzter?.abgeschlossen_am ?? null,
        letzte_schulung: letzter?.titel ?? null,
        ich: p.id === user.id,
      }
    })
    .sort(
      (a, b) =>
        b.level.abschluesse - a.level.abschluesse ||
        String(b.letzter_abschluss).localeCompare(String(a.letzter_abschluss)) ||
        a.name.localeCompare(b.name),
    )
    .map((z, i) => ({ ...z, platz: i + 1 }))

  return {
    zeilen,
    eigener_platz: zeilen.find((z) => z.ich)?.platz ?? null,
    teilnehmer: zeilen.length,
  }
})

/* ------------------------------------------------- Bereichsübersicht (lesend) */

route(
  'GET',
  '/api/bereich',
  ({ user }) => {
    const personen = repo
      .alleUser()
      .filter((p) => (user.rolle === 'admin' ? true : p.standort === user.standort))
      .filter((p) => p.rolle !== 'admin')

    const zeilen = personen.map((p) => {
      const zuweisungen = repo.zuweisungenFuer(p)
      const pflichtKurse = repo.alleKurse().filter((k) => zuweisungen.get(k.id)?.pflicht)
      const stati = pflichtKurse.map((k) => repo.kursStatus(p, k, true))
      return {
        name: p.name,
        standort: p.standort,
        abteilung: p.abteilung,
        eintrittsdatum: p.eintrittsdatum,
        pflicht_gesamt: stati.length,
        // Bewusst nur Status, keine Punktzahlen - die sieht ausschließlich der Admin.
        erfuellt: stati.filter((s) => s.status === 'bestanden').length,
        bald_faellig: stati.filter((s) => s.status === 'bald_faellig').length,
        ueberfaellig: stati.filter((s) => s.status === 'ueberfaellig').length,
        offen: stati.filter((s) => s.status === 'offen' || s.status === 'laufend').length,
      }
    })

    const gesamt = zeilen.reduce((s, z) => s + z.pflicht_gesamt, 0)
    const erfuellt = zeilen.reduce((s, z) => s + z.erfuellt, 0)
    return {
      bereich: user.rolle === 'admin' ? konfiguration.organisation : user.standort,
      quote: gesamt ? Math.round((erfuellt / gesamt) * 100) : 0,
      ueberfaellige_personen: zeilen.filter((z) => z.ueberfaellig > 0).length,
      zeilen: zeilen.sort((a, b) => b.ueberfaellig - a.ueberfaellig || a.name.localeCompare(b.name)),
    }
  },
  { rollen: ['admin', 'fuehrungskraft'] },
)

/* --------------------------------------------------------------- Zertifikate */

route('GET', '/api/nachweise/:id/pdf', async ({ user, params }) => {
  const abschluss = repo.abschlussById(Number(params.id))
  if (!abschluss || abschluss.user_id !== user.id) throw new HttpError(404, 'Nachweis nicht gefunden.')
  if (abschluss.storniert_am) throw new HttpError(410, 'Dieser Nachweis wurde storniert.')
  const pdf = await zertifikatPdf({ abschluss, user })
  return {
    __raw: {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `inline; filename="Nachweis-${abschluss.zertifikat_nr}.pdf"`,
      },
      body: pdf,
    },
  }
})

/* ------------------------------------------------------ Admin-Hilfsfunktionen */

route(
  'GET',
  '/api/admin/export.csv',
  ({ user }) => {
    const personen = repo.alleUser().filter((p) => p.rolle !== 'admin')
    const kurse = repo.alleKurse()
    const kopf = ['Name', 'Standort', 'Abteilung', 'Eintritt', 'Schulung', 'Pflicht', 'Status', 'Prozent', 'Abschluss', 'Gueltig bis']
    const zeilen = [kopf.join(';')]
    for (const p of personen) {
      const zuweisungen = repo.zuweisungenFuer(p)
      for (const k of kurse) {
        if (!zuweisungen.has(k.id)) continue
        const st = repo.kursStatus(p, k, zuweisungen.get(k.id).pflicht)
        const letzter = repo.letzterAbschluss(p.id, k.id)
        zeilen.push(
          [
            p.name,
            p.standort,
            p.abteilung,
            p.eintrittsdatum.slice(0, 10),
            k.titel,
            st.pflicht ? 'ja' : 'nein',
            st.status,
            letzter?.prozent ?? '',
            letzter?.abgeschlossen_am?.slice(0, 10) ?? '',
            st.gueltig_bis?.slice(0, 10) ?? '',
          ]
            .map((v) => String(v).replaceAll(';', ','))
            .join(';'),
        )
      }
    }
    repo.audit(user.id, 'export.qualifikationsmatrix')
    return {
      __raw: {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="Qualifikationsmatrix-${nowIso().slice(0, 10)}.csv"`,
        },
        // BOM, damit Excel die Umlaute richtig liest
        body: Buffer.from('﻿' + zeilen.join('\r\n'), 'utf8'),
      },
    }
  },
  { rollen: ['admin'] },
)

/* ==========================================================================
   Verwaltung (Rolle admin)
   ========================================================================== */

const nurAdmin = { rollen: ['admin'] }

route('GET', '/api/admin/kurse', () => ({ kurse: admin.kurseFuerVerwaltung() }), nurAdmin)

route('POST', '/api/admin/kurse', ({ user, body }) => {
  const slug = admin.kursAnlegen(body ?? {})
  repo.audit(user.id, 'admin.kurs.angelegt', slug)
  return { slug }
}, nurAdmin)

route('GET', '/api/admin/kurse/:slug', ({ params }) => {
  const kurs = admin.kursFuerVerwaltung(params.slug)
  if (!kurs) throw new HttpError(404, 'Kurs nicht gefunden.')
  return kurs
}, nurAdmin)

route('PUT', '/api/admin/kurse/:slug', ({ user, params, body }) => {
  const kurs = admin.kursSpeichern(params.slug, body ?? {})
  if (!kurs) throw new HttpError(404, 'Kurs nicht gefunden.')
  repo.audit(user.id, 'admin.kurs.geaendert', params.slug)
  return kurs
}, nurAdmin)

route('DELETE', '/api/admin/kurse/:slug', ({ user, params }) => {
  if (!admin.kursLoeschen(params.slug)) throw new HttpError(404, 'Kurs nicht gefunden.')
  repo.audit(user.id, 'admin.kurs.geloescht', params.slug)
  return { ok: true }
}, nurAdmin)

route('POST', '/api/admin/kurse/:slug/klonen', ({ user, params }) => {
  const slug = admin.kursKlonen(params.slug)
  if (!slug) throw new HttpError(404, 'Kurs nicht gefunden.')
  repo.audit(user.id, 'admin.kurs.geklont', slug)
  return { slug }
}, nurAdmin)

route('PUT', '/api/admin/kurse/:slug/lektionen', ({ user, params, body }) => {
  const kurs = admin.lektionenSpeichern(params.slug, body?.lektionen ?? [])
  if (!kurs) throw new HttpError(404, 'Kurs nicht gefunden.')
  repo.audit(user.id, 'admin.lektionen.geaendert', params.slug, { anzahl: body?.lektionen?.length })
  return kurs
}, nurAdmin)

route('POST', '/api/admin/medien', ({ user, body }) => {
  try {
    const ergebnis = admin.medienUpload(body ?? {})
    repo.audit(user.id, 'admin.medien.hochgeladen', ergebnis.pfad, { groesse: ergebnis.groesse })
    return ergebnis
  } catch (f) {
    throw new HttpError(400, f.message)
  }
}, nurAdmin)

route('GET', '/api/admin/personen', ({ url }) => ({
  personen: admin.personenListe(Object.fromEntries(url.searchParams)),
  standorte: [...new Set(repo.alleUser().map((p) => p.standort))].sort(),
  abteilungen: [...new Set(repo.alleUser().map((p) => p.abteilung))].sort(),
}), nurAdmin)

route('POST', '/api/admin/personen', ({ user, body }) => {
  try {
    const ergebnis = admin.personAnlegen(body ?? {})
    repo.audit(user.id, 'admin.person.angelegt', ergebnis.id)
    return ergebnis
  } catch (f) {
    throw new HttpError(400, f.message)
  }
}, nurAdmin)

route('GET', '/api/admin/personen/:id', ({ params }) => {
  const detail = admin.personDetail(params.id)
  if (!detail) throw new HttpError(404, 'Person nicht gefunden.')
  return detail
}, nurAdmin)

route('PUT', '/api/admin/personen/:id', ({ user, params, body }) => {
  const detail = admin.personSpeichern(params.id, body ?? {})
  if (!detail) throw new HttpError(404, 'Person nicht gefunden.')
  repo.audit(user.id, 'admin.person.geaendert', params.id)
  return detail
}, nurAdmin)

route('POST', '/api/admin/personen/:id/passwort-reset', ({ user, params }) => {
  const ergebnis = admin.passwortZuruecksetzen(params.id)
  if (!ergebnis) throw new HttpError(404, 'Person nicht gefunden.')
  repo.audit(user.id, 'admin.passwort.zurueckgesetzt', params.id)
  return ergebnis
}, nurAdmin)

route('POST', '/api/admin/personen/import', ({ user, body }) => {
  try {
    const ergebnis = admin.csvImport(body?.csv ?? '')
    repo.audit(user.id, 'admin.csv.import', null, { angelegt: ergebnis.angelegt.length })
    return ergebnis
  } catch (f) {
    throw new HttpError(400, f.message)
  }
}, nurAdmin)

/* ==========================================================================
   Performance: Ziele, Reviews, Kompetenzen, Stimmungsbild
   ========================================================================== */

const fuehrung = { rollen: ['admin', 'fuehrungskraft'] }

/** Darf `user` die Performance-Daten von `zielId` sehen bzw. ändern? */
function performanceZugriff(user, zielUserId, schreibend = false) {
  if (user.rolle === 'admin') return true
  if (user.id === zielUserId) return !schreibend // eigene Daten: lesen ja, setzen nein
  if (user.rolle === 'fuehrungskraft') {
    const ziel = repo.userById(zielUserId)
    return !!ziel && ziel.standort === user.standort
  }
  return false
}

route('GET', '/api/performance/ich', ({ user }) => ({
  ziele: performance.zieleFuer(user.id),
  zielerreichung: performance.zielerreichung(user.id),
  reviews: performance.reviewsFuer(user.id),
  kompetenzen: performance.kompetenzProfil(user.id),
  umfrage: { fragen: performance.FRAGEN, antworten: performance.umfrageAntworten(user.id, aktuelleRunde()) },
  runde: aktuelleRunde(),
}))

/** Quartalsrunde, z.B. "2026-Q3" - hält das Stimmungsbild vergleichbar. */
function aktuelleRunde() {
  const d = new Date()
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`
}

route('PUT', '/api/performance/umfrage', ({ user, body }) => ({
  antworten: performance.umfrageSpeichern(user.id, aktuelleRunde(), body?.antworten ?? {}),
}))

route('GET', '/api/performance/person/:id', ({ user, params }) => {
  if (!performanceZugriff(user, params.id)) throw new HttpError(403, 'Kein Zugriff auf diese Person.')
  const person = repo.userById(params.id)
  if (!person) throw new HttpError(404, 'Person nicht gefunden.')
  return {
    person: { id: person.id, name: person.name, abteilung: person.abteilung, standort: person.standort },
    ziele: performance.zieleFuer(person.id),
    zielerreichung: performance.zielerreichung(person.id),
    reviews: performance.reviewsFuer(person.id),
    kompetenzen: performance.kompetenzProfil(person.id),
  }
})

route('GET', '/api/performance/uebersicht', ({ user }) => performance.uebersicht(user), fuehrung)

route('GET', '/api/performance/heatmap', ({ user }) => performance.heatmap(aktuelleRunde()), fuehrung)

route('GET', '/api/performance/kompetenzen', () => ({ kompetenzen: performance.kompetenzen() }), fuehrung)

route(
  'POST',
  '/api/performance/ziele',
  ({ user, body }) => {
    if (!performanceZugriff(user, body?.user_id, true)) throw new HttpError(403, 'Kein Zugriff auf diese Person.')
    if (!body?.titel || !body?.faellig_am) throw new HttpError(400, 'Titel und Frist sind erforderlich.')
    const id = performance.zielAnlegen(body, user.id)
    repo.audit(user.id, 'ziel.angelegt', String(id), { fuer: body.user_id })
    return { id, ziele: performance.zieleFuer(body.user_id) }
  },
  fuehrung,
)

route('PUT', '/api/performance/ziele/:id', ({ user, params, body }) => {
  const ziel = db.prepare('SELECT * FROM goals WHERE id = ?').get(Number(params.id))
  if (!ziel) throw new HttpError(404, 'Ziel nicht gefunden.')
  // Den Istwert darf die Person selbst pflegen, alles andere nur die Führung
  const nurIstwert = Object.keys(body ?? {}).every((k) => ['istwert', 'kommentar'].includes(k))
  const erlaubt = nurIstwert ? user.id === ziel.user_id || performanceZugriff(user, ziel.user_id, true) : performanceZugriff(user, ziel.user_id, true)
  if (!erlaubt) throw new HttpError(403, 'Kein Zugriff auf dieses Ziel.')

  const neu = performance.zielAktualisieren(Number(params.id), body ?? {}, user.id)
  repo.audit(user.id, 'ziel.geaendert', params.id)
  return { ziel: neu, verlauf: performance.zielVerlauf(Number(params.id)) }
})

route(
  'DELETE',
  '/api/performance/ziele/:id',
  ({ user, params }) => {
    const ziel = db.prepare('SELECT * FROM goals WHERE id = ?').get(Number(params.id))
    if (!ziel) throw new HttpError(404, 'Ziel nicht gefunden.')
    if (!performanceZugriff(user, ziel.user_id, true)) throw new HttpError(403, 'Kein Zugriff auf dieses Ziel.')
    performance.zielLoeschen(Number(params.id))
    repo.audit(user.id, 'ziel.geloescht', params.id)
    return { ok: true }
  },
  fuehrung,
)

route(
  'POST',
  '/api/performance/reviews',
  ({ user, body }) => {
    if (!performanceZugriff(user, body?.user_id, true)) throw new HttpError(403, 'Kein Zugriff auf diese Person.')
    const id = performance.reviewAnlegen({ ...body, fuehrungskraft: body.fuehrungskraft ?? user.name })
    repo.audit(user.id, 'review.angelegt', String(id), { fuer: body.user_id })
    return { id }
  },
  fuehrung,
)

route('PUT', '/api/performance/reviews/:id', ({ user, params, body }) => {
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(Number(params.id))
  if (!review) throw new HttpError(404, 'Review nicht gefunden.')
  // Die eigene Selbsteinschätzung darf man schreiben, die Bewertung nicht
  const nurSelbst = Object.keys(body ?? {}).every((k) => ['selbst_text', 'status'].includes(k)) && body.status !== 'abgeschlossen'
  const erlaubt = nurSelbst ? user.id === review.user_id || performanceZugriff(user, review.user_id, true) : performanceZugriff(user, review.user_id, true)
  if (!erlaubt) throw new HttpError(403, 'Kein Zugriff auf dieses Review.')

  const neu = performance.reviewSpeichern(Number(params.id), body ?? {})
  repo.audit(user.id, 'review.geaendert', params.id, { status: neu.status })
  return neu
})

route(
  'POST',
  '/api/performance/kompetenzen/bewerten',
  ({ user, body }) => {
    if (!performanceZugriff(user, body?.user_id, true)) throw new HttpError(403, 'Kein Zugriff auf diese Person.')
    const profil = performance.kompetenzBewerten(body)
    repo.audit(user.id, 'kompetenz.bewertet', String(body.competency_id), { fuer: body.user_id })
    return { kompetenzen: profil }
  },
  fuehrung,
)

/* ------------------------------------------------------- Benachrichtigungen */

route('GET', '/api/benachrichtigungen', ({ user }) => admin.benachrichtigungenLesen(user.id))

route('PUT', '/api/benachrichtigungen', ({ user, body }) => admin.benachrichtigungenSpeichern(user.id, body ?? {}))

export { routes }
