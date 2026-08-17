/**
 * Verwaltungsfunktionen (nur Rolle admin).
 *
 * Bewusst getrennt von server/api.js, damit die Lernendensicht klein bleibt und
 * man auf einen Blick sieht, was überhaupt schreibend auf Inhalte zugreift.
 *
 * SQL steht hier nicht: Lesen und Schreiben laufen über server/repo.js (Sicht
 * der Lernenden) und server/repo-admin.js (Verwaltung). Dieses Modul kennt nur
 * die Verwaltungsregeln - Vorgabewerte, Slug-Bildung, Zusammenstellung der
 * Editoransicht. Der Grund für die Trennung ist der geplante Wechsel auf die
 * Datenstruktur des Unternehmens; geprüft wird sie mit `npm run pruefen`.
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { MEDIA_DIR } from './db.js'
import * as repo from './repo.js'
import * as speicher from './repo-admin.js'
import { hashPassword } from './auth.js'
import { nowIso, safeFileName, token } from './util.js'
import { levelBerechnen } from './level.js'
import { konfiguration } from './config.js'

/* ------------------------------------------------------------------- Kurse */

export function kurseFuerVerwaltung() {
  return speicher.alleKurseRoh().map((k) => {
    const lektionen = speicher.lektionArten(k.id)
    const teilnehmer = speicher.teilnehmerAnzahl(k.id)
    const abgeschlossen = speicher.abschlussAnzahl(k.id)
    return {
      ...k,
      lektionen_anzahl: lektionen.length,
      lektionen_versteckt: lektionen.filter((l) => !l.sichtbar).length,
      teilnehmer,
      abgeschlossen,
      quote: teilnehmer ? Math.round((abgeschlossen / teilnehmer) * 100) : 0,
    }
  })
}

export function kursFuerVerwaltung(slug) {
  const kurs = speicher.kursBySlugRoh(slug)
  if (!kurs) return null

  const lektionen = speicher.lektionenRoh(kurs.id).map((l) => {
    // Fortschritt direkt im Editor sichtbar - kein Wechsel in eine andere Ansicht
    const stat = speicher.lektionFortschritt(l.id)
    const quiz = l.quiz_id ? speicher.quizRoh(l.quiz_id) : null
    return {
      ...l,
      video_vorhanden: !!(l.video_datei && existsSync(join(MEDIA_DIR, l.video_datei))),
      bearbeiter: stat.gesamt ?? 0,
      abgeschlossen: stat.fertig ?? 0,
      quiz: quiz ? { ...quiz, fragen_gesamt: speicher.fragenAnzahl(quiz.id) } : null,
    }
  })

  return { ...kurs, lektionen, zuweisungen: speicher.zuweisungenRoh(kurs.id) }
}

export function kursAnlegen(daten) {
  const basis = (daten.titel || 'neuer-kurs')
    .toLowerCase()
    .replace(/[äöü]/g, (z) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[z])
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  let slug = basis || 'kurs'
  let n = 2
  while (speicher.slugVergeben(slug)) slug = `${basis}-${n++}`

  const id = speicher.kursAnlegen(slug, {
    titel: daten.titel ?? 'Neuer Kurs',
    untertitel: daten.untertitel ?? null,
    beschreibung: daten.beschreibung ?? null,
    kategorie: daten.kategorie ?? 'KI & Digitales',
    anbieter: daten.anbieter ?? konfiguration.plattform,
    pflicht: daten.pflicht ? 1 : 0,
    turnus_monate: daten.turnus_monate ?? null,
    vorwarn_tage: daten.vorwarn_tage ?? 30,
    onboarding_frist_tage: daten.onboarding_frist_tage ?? null,
    strenge: daten.strenge ?? 'frei',
    akzent: daten.akzent ?? 'anthrazit',
    cover_motiv: daten.cover_motiv ?? 'raute',
    demo: daten.demo ? 1 : 0,
    sortierung: daten.sortierung ?? 99,
  })

  // Ohne Zuweisung sieht die Schulung niemand - deshalb erst einmal für alle
  speicher.zuweisungAnlegen(id, 'alle', null, daten.pflicht)
  return slug
}

export function kursSpeichern(slug, daten) {
  const kurs = speicher.kursBySlugRoh(slug)
  if (!kurs) return null

  speicher.kursSchreiben(kurs.id, daten)

  if (Array.isArray(daten.zuweisungen)) {
    speicher.zuweisungenLoeschen(kurs.id)
    const pflicht = daten.pflicht ?? kurs.pflicht
    for (const z of daten.zuweisungen) speicher.zuweisungAnlegen(kurs.id, z.ziel_typ, z.ziel_wert, pflicht)
  }

  speicher.dauerNeuBerechnen(kurs.id)
  return kursFuerVerwaltung(slug)
}

/** Reihenfolge, Kapitelzuordnung und Inhalte der Lektionen in einem Rutsch. */
export function lektionenSpeichern(slug, lektionen) {
  const kurs = speicher.kursBySlugRoh(slug)
  if (!kurs) return null

  const bestehende = speicher.lektionIds(kurs.id)
  const behalten = new Set()

  lektionen.forEach((l, i) => {
    const werte = [
      i + 1,
      l.titel || 'Ohne Titel',
      l.typ || 'text',
      Number(l.dauer_min) || 0,
      l.video_datei || null,
      l.video_laenge_sek ?? null,
      l.text_inhalt || null,
      l.pdf_datei || null,
      l.link_url || null,
      l.link_hinweis || null,
      l.link_nachweis ? 1 : 0,
      l.kapitel || '',
      l.unterkapitel || null,
      l.sichtbar === false ? 0 : 1,
      l.audio_datei || null,
      l.youtube_id || null,
      l.scorm_paket || null,
    ]

    if (l.id && bestehende.includes(Number(l.id))) {
      speicher.lektionSchreiben(Number(l.id), werte)
      behalten.add(Number(l.id))
    } else {
      behalten.add(speicher.lektionAnlegen(kurs.id, werte))
    }
  })

  // Entfernte Lektionen löschen - Fortschritt dazu verschwindet mit (FK-Kaskade)
  for (const id of bestehende) if (!behalten.has(id)) speicher.lektionLoeschen(id)

  speicher.dauerNeuBerechnen(kurs.id)
  return kursFuerVerwaltung(slug)
}

/** Kurs als Vorlage klonen - inklusive Lektionen und Quizzen. */
export function kursKlonen(slug) {
  const quelle = speicher.kursBySlugRoh(slug)
  if (!quelle) return null

  const neuerSlug = kursAnlegen({
    ...quelle,
    titel: `${quelle.titel} (Kopie)`,
    pflicht: !!quelle.pflicht,
    demo: !!quelle.demo,
  })
  const ziel = speicher.kursBySlugRoh(neuerSlug)

  speicher.inhalteKopieren(quelle.id, ziel.id)
  speicher.dauerNeuBerechnen(ziel.id)
  return neuerSlug
}

export function kursLoeschen(slug) {
  const kurs = speicher.kursBySlugRoh(slug)
  if (!kurs) return false
  speicher.kursLoeschen(kurs.id)
  return true
}

/* ------------------------------------------------------------------ Medien */

const MEDIEN_TYPEN = {
  mp4: 'video', webm: 'video', m4v: 'video',
  mp3: 'audio', m4a: 'audio', wav: 'audio',
  pdf: 'pdf',
  png: 'bild', jpg: 'bild', jpeg: 'bild', webp: 'bild',
  zip: 'scorm',
}

/** Nimmt eine Datei als base64 entgegen und legt sie unter media/ ab. */
export function medienUpload({ datei_name, datei_base64, ordner = 'kurse' }) {
  const name = safeFileName(datei_name)
  const endung = name.split('.').pop()?.toLowerCase()
  const art = MEDIEN_TYPEN[endung]
  if (!art) throw new Error(`Dateityp .${endung} wird nicht unterstützt.`)

  const daten = Buffer.from(String(datei_base64).split(',').pop(), 'base64')
  if (daten.length > 600 * 1024 * 1024) throw new Error('Die Datei darf maximal 600 MB groß sein.')

  const unterordner = safeFileName(ordner)
  mkdirSync(join(MEDIA_DIR, unterordner), { recursive: true })
  const rel = `${unterordner}/${Date.now()}-${name}`
  writeFileSync(join(MEDIA_DIR, rel), daten)

  return { pfad: rel, art, groesse: daten.length }
}

/* ---------------------------------------------------------------- Personen */

export function personenListe({ suche = '', standort = '', abteilung = '', rolle = '', status = '' } = {}) {
  const q = suche.trim().toLowerCase()

  return speicher
    .allePersonenRoh()
    .filter((p) => (!q || `${p.name} ${p.email} ${p.position ?? ''}`.toLowerCase().includes(q)))
    .filter((p) => !standort || p.standort === standort)
    .filter((p) => !abteilung || p.abteilung === abteilung)
    .filter((p) => !rolle || p.rolle === rolle)
    .filter((p) => !status || (status === 'aktiv' ? p.aktiv : !p.aktiv))
    .map((p) => {
      const zuweisungen = repo.zuweisungenFuer(p)
      const pflicht = repo.alleKurse().filter((k) => zuweisungen.get(k.id)?.pflicht)
      const stati = pflicht.map((k) => repo.kursStatus(p, k, true))
      const anzahl = repo.abschlussAnzahl(p.id)
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        rolle: p.rolle,
        standort: p.standort,
        abteilung: p.abteilung,
        position: p.position,
        eintrittsdatum: p.eintrittsdatum,
        aktiv: !!p.aktiv,
        letzter_login: p.letzter_login,
        passwort_wechsel: !!p.passwort_wechsel,
        level: levelBerechnen(anzahl),
        pflicht_gesamt: stati.length,
        pflicht_erfuellt: stati.filter((s) => s.status === 'bestanden' || s.status === 'bald_faellig').length,
        ueberfaellig: stati.filter((s) => s.status === 'ueberfaellig').length,
      }
    })
}

export function personDetail(id) {
  const p = repo.userById(id)
  if (!p) return null

  const zuweisungen = repo.zuweisungenFuer(p)
  const kurse = repo
    .alleKurse()
    .filter((k) => zuweisungen.has(k.id))
    .map((k) => ({
      slug: k.slug,
      titel: k.titel,
      pflicht: !!zuweisungen.get(k.id).pflicht,
      ...repo.kursStatus(p, k, zuweisungen.get(k.id).pflicht),
    }))

  return {
    person: {
      id: p.id, name: p.name, email: p.email, rolle: p.rolle, standort: p.standort,
      abteilung: p.abteilung, position: p.position, eintrittsdatum: p.eintrittsdatum,
      aktiv: !!p.aktiv, letzter_login: p.letzter_login, erstellt_am: p.erstellt_am,
      passwort_wechsel: !!p.passwort_wechsel, fehlversuche: p.fehlversuche,
      level: levelBerechnen(repo.abschlussAnzahl(p.id)),
    },
    kurse,
    nachweise: repo.abschluesse(p.id),
    versuche: speicher.beendeteVersuche(p.id),
    verlauf: speicher.auditVerlauf(p.id),
  }
}

export function personSpeichern(id, daten) {
  if (!repo.userById(id)) return null
  speicher.personSchreiben(id, daten)
  return personDetail(id)
}

export function personAnlegen(daten) {
  if (!daten.email || !daten.name) throw new Error('Name und E-Mail sind erforderlich.')
  if (repo.userByEmail(daten.email)) throw new Error('Diese E-Mail-Adresse ist bereits vergeben.')

  const startpasswort = daten.passwort || `Start-${token(4)}`
  const { hash, salt } = hashPassword(startpasswort)
  const user = repo.createUser({
    email: daten.email,
    name: daten.name,
    rolle: daten.rolle ?? 'lernender',
    standort: daten.standort ?? 'Standort A',
    abteilung: daten.abteilung ?? 'Verwaltung',
    position: daten.position ?? null,
    eintrittsdatum: daten.eintrittsdatum ?? nowIso(),
    passwort_hash: hash,
    passwort_salt: salt,
    passwort_wechsel: 1,
  })
  return { id: user.id, startpasswort }
}

export function passwortZuruecksetzen(id) {
  const p = repo.userById(id)
  if (!p) return null
  const neu = `Start-${token(4)}`
  const { hash, salt } = hashPassword(neu)
  repo.setPassword(p.id, hash, salt, 1)
  repo.audit(p.id, 'passwort.zurueckgesetzt')
  return { startpasswort: neu }
}

/**
 * CSV-Import. Erwartet eine Kopfzeile mit den Spalten
 * name;email;rolle;standort;abteilung;position;eintrittsdatum
 * Trennzeichen Semikolon oder Komma, Reihenfolge egal.
 */
export function csvImport(csv) {
  const zeilen = String(csv).split(/\r?\n/).filter((z) => z.trim())
  if (!zeilen.length) throw new Error('Die Datei enthält keine Zeilen.')

  const trenner = zeilen[0].includes(';') ? ';' : ','
  const kopf = zeilen[0].split(trenner).map((s) => s.trim().toLowerCase().replace(/^﻿/, ''))
  const pflicht = ['name', 'email']
  const fehlend = pflicht.filter((f) => !kopf.includes(f))
  if (fehlend.length) throw new Error(`In der Kopfzeile fehlt: ${fehlend.join(', ')}`)

  const ergebnis = { angelegt: [], uebersprungen: [], fehler: [] }

  for (const zeile of zeilen.slice(1)) {
    const werte = zeile.split(trenner).map((s) => s.trim())
    const satz = Object.fromEntries(kopf.map((k, i) => [k, werte[i] ?? '']))
    if (!satz.email) continue

    try {
      if (repo.userByEmail(satz.email)) {
        ergebnis.uebersprungen.push(satz.email)
        continue
      }
      const { startpasswort } = personAnlegen({
        name: satz.name,
        email: satz.email,
        rolle: ['admin', 'fuehrungskraft', 'lernender'].includes(satz.rolle) ? satz.rolle : 'lernender',
        standort: satz.standort || 'Standort A',
        abteilung: satz.abteilung || 'Verwaltung',
        position: satz.position || null,
        eintrittsdatum: satz.eintrittsdatum ? `${satz.eintrittsdatum}T08:00:00.000Z` : nowIso(),
      })
      ergebnis.angelegt.push({ email: satz.email, name: satz.name, startpasswort })
    } catch (f) {
      ergebnis.fehler.push({ email: satz.email, grund: f.message })
    }
  }
  return ergebnis
}

/* ------------------------------------------------------- Benachrichtigungen */

const STANDARD_EINSTELLUNG = {
  email_aktiv: 1,
  push_aktiv: 0,
  inapp_aktiv: 1,
  rhythmus: 'woechentlich',
  ereignisse: ['frist', 'zuweisung', 'ergebnis'],
}

export function benachrichtigungenLesen(userId) {
  const row = speicher.benachrichtigungRoh(userId)
  if (!row) return { ...STANDARD_EINSTELLUNG }
  return {
    email_aktiv: !!row.email_aktiv,
    push_aktiv: !!row.push_aktiv,
    inapp_aktiv: !!row.inapp_aktiv,
    rhythmus: row.rhythmus,
    ereignisse: JSON.parse(row.ereignisse),
  }
}

export function benachrichtigungenSpeichern(userId, daten) {
  const neu = { ...benachrichtigungenLesen(userId), ...daten }
  speicher.benachrichtigungSchreiben(userId, neu)
  return benachrichtigungenLesen(userId)
}
