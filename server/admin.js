/**
 * Verwaltungsfunktionen (nur Rolle admin).
 *
 * Bewusst getrennt von server/api.js, damit die Lernendensicht klein bleibt und
 * man auf einen Blick sieht, was überhaupt schreibend auf Inhalte zugreift.
 * SQL steht auch hier nicht - alles geht über server/repo.js bzw. die wenigen
 * Schreibfunktionen unten, die eng an das Schema gebunden sind.
 */

import { mkdirSync, writeFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { db, MEDIA_DIR } from './db.js'
import * as repo from './repo.js'
import { hashPassword } from './auth.js'
import { nowIso, safeFileName, token, uuid } from './util.js'
import { konfiguration } from './config.js'
import { levelBerechnen } from './level.js'

/* ------------------------------------------------------------------- Kurse */

const KURS_FELDER = [
  'titel', 'untertitel', 'beschreibung', 'kategorie', 'anbieter', 'pflicht', 'turnus_monate',
  'vorwarn_tage', 'onboarding_frist_tage', 'strenge', 'akzent', 'cover_motiv', 'cover_bild',
  'demo', 'veroeffentlicht', 'entwurf', 'highlight', 'sortierung',
]

export function kurseFuerVerwaltung() {
  const kurse = db
    .prepare('SELECT * FROM courses ORDER BY sortierung, titel')
    .all()
  return kurse.map((k) => {
    const lektionen = db.prepare('SELECT typ, sichtbar FROM lessons WHERE course_id = ?').all(k.id)
    const teilnehmer = db
      .prepare('SELECT COUNT(DISTINCT user_id) AS n FROM course_starts WHERE course_id = ?')
      .get(k.id).n
    const abgeschlossen = db
      .prepare('SELECT COUNT(DISTINCT user_id) AS n FROM completions WHERE course_id = ? AND storniert_am IS NULL')
      .get(k.id).n
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
  const kurs = db.prepare('SELECT * FROM courses WHERE slug = ?').get(slug)
  if (!kurs) return null

  const lektionen = db
    .prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY position')
    .all(kurs.id)
    .map((l) => {
      // Fortschritt direkt im Editor sichtbar - kein Wechsel in eine andere Ansicht
      const stat = db
        .prepare(
          `SELECT COUNT(*) AS gesamt, SUM(CASE WHEN status = 'abgeschlossen' THEN 1 ELSE 0 END) AS fertig
             FROM lesson_progress WHERE lesson_id = ?`,
        )
        .get(l.id)
      const quiz = l.quiz_id ? db.prepare('SELECT * FROM quizzes WHERE id = ?').get(l.quiz_id) : null
      return {
        ...l,
        video_vorhanden: !!(l.video_datei && existsSync(join(MEDIA_DIR, l.video_datei))),
        bearbeiter: stat.gesamt ?? 0,
        abgeschlossen: stat.fertig ?? 0,
        quiz: quiz
          ? { ...quiz, fragen_gesamt: db.prepare('SELECT COUNT(*) AS n FROM questions WHERE quiz_id = ?').get(quiz.id).n }
          : null,
      }
    })

  const zuweisungen = db.prepare('SELECT * FROM assignments WHERE course_id = ?').all(kurs.id)

  return { ...kurs, lektionen, zuweisungen }
}

export function kursAnlegen(daten) {
  const jetzt = nowIso()
  const basis = (daten.titel || 'neuer-kurs')
    .toLowerCase()
    .replace(/[äöü]/g, (z) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[z])
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  let slug = basis || 'kurs'
  let n = 2
  while (db.prepare('SELECT 1 FROM courses WHERE slug = ?').get(slug)) slug = `${basis}-${n++}`

  const info = db
    .prepare(
      `INSERT INTO courses (slug, titel, untertitel, beschreibung, kategorie, anbieter, pflicht, turnus_monate,
                            vorwarn_tage, onboarding_frist_tage, strenge, dauer_min, akzent, cover_motiv, demo,
                            veroeffentlicht, entwurf, sortierung, highlight, erstellt_am, aktualisiert_am)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,0,1,?,0,?,?)`,
    )
    .run(
      slug,
      daten.titel ?? 'Neuer Kurs',
      daten.untertitel ?? null,
      daten.beschreibung ?? null,
      daten.kategorie ?? 'KI & Digitales',
      daten.anbieter ?? konfiguration.plattform,
      daten.pflicht ? 1 : 0,
      daten.turnus_monate ?? null,
      daten.vorwarn_tage ?? 30,
      daten.onboarding_frist_tage ?? null,
      daten.strenge ?? 'frei',
      daten.akzent ?? 'anthrazit',
      daten.cover_motiv ?? 'raute',
      daten.demo ? 1 : 0,
      daten.sortierung ?? 99,
      jetzt,
      jetzt,
    )

  db.prepare('INSERT INTO assignments (course_id, ziel_typ, ziel_wert, pflicht, erstellt_am) VALUES (?,?,?,?,?)').run(
    Number(info.lastInsertRowid),
    'alle',
    null,
    daten.pflicht ? 1 : 0,
    jetzt,
  )
  return slug
}

export function kursSpeichern(slug, daten) {
  const kurs = db.prepare('SELECT * FROM courses WHERE slug = ?').get(slug)
  if (!kurs) return null

  const felder = KURS_FELDER.filter((f) => f in daten)
  if (felder.length) {
    const satz = felder.map((f) => `${f} = ?`).join(', ')
    const werte = felder.map((f) => {
      const v = daten[f]
      return typeof v === 'boolean' ? (v ? 1 : 0) : v
    })
    db.prepare(`UPDATE courses SET ${satz}, aktualisiert_am = ? WHERE id = ?`).run(...werte, nowIso(), kurs.id)
  }

  if (Array.isArray(daten.zuweisungen)) {
    db.prepare('DELETE FROM assignments WHERE course_id = ?').run(kurs.id)
    for (const z of daten.zuweisungen) {
      db.prepare('INSERT INTO assignments (course_id, ziel_typ, ziel_wert, pflicht, erstellt_am) VALUES (?,?,?,?,?)').run(
        kurs.id,
        z.ziel_typ,
        z.ziel_wert ?? null,
        daten.pflicht ?? kurs.pflicht ? 1 : 0,
        nowIso(),
      )
    }
  }

  dauerNeuBerechnen(kurs.id)
  return kursFuerVerwaltung(slug)
}

/** Reihenfolge, Kapitelzuordnung und Inhalte der Lektionen in einem Rutsch. */
export function lektionenSpeichern(slug, lektionen) {
  const kurs = db.prepare('SELECT * FROM courses WHERE slug = ?').get(slug)
  if (!kurs) return null

  const bestehende = db.prepare('SELECT id FROM lessons WHERE course_id = ?').all(kurs.id).map((l) => l.id)
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
      db.prepare(
        `UPDATE lessons SET position = ?, titel = ?, typ = ?, dauer_min = ?, video_datei = ?, video_laenge_sek = ?,
                text_inhalt = ?, pdf_datei = ?, link_url = ?, link_hinweis = ?, link_nachweis = ?, kapitel = ?,
                unterkapitel = ?, sichtbar = ?, audio_datei = ?, youtube_id = ?, scorm_paket = ?
          WHERE id = ?`,
      ).run(...werte, Number(l.id))
      behalten.add(Number(l.id))
    } else {
      const info = db
        .prepare(
          `INSERT INTO lessons (course_id, position, titel, typ, dauer_min, video_datei, video_laenge_sek,
                                text_inhalt, pdf_datei, link_url, link_hinweis, link_nachweis, kapitel,
                                unterkapitel, sichtbar, audio_datei, youtube_id, scorm_paket)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(kurs.id, ...werte)
      behalten.add(Number(info.lastInsertRowid))
    }
  })

  // Entfernte Lektionen löschen - Fortschritt dazu verschwindet mit (FK-Kaskade)
  for (const id of bestehende) if (!behalten.has(id)) db.prepare('DELETE FROM lessons WHERE id = ?').run(id)

  dauerNeuBerechnen(kurs.id)
  return kursFuerVerwaltung(slug)
}

function dauerNeuBerechnen(courseId) {
  const summe = db.prepare('SELECT COALESCE(SUM(dauer_min),0) AS s FROM lessons WHERE course_id = ?').get(courseId).s
  db.prepare('UPDATE courses SET dauer_min = ?, aktualisiert_am = ? WHERE id = ?').run(summe, nowIso(), courseId)
}

/** Kurs als Vorlage klonen - inklusive Lektionen und Quizzen. */
export function kursKlonen(slug) {
  const quelle = db.prepare('SELECT * FROM courses WHERE slug = ?').get(slug)
  if (!quelle) return null

  const neuerSlug = kursAnlegen({
    ...quelle,
    titel: `${quelle.titel} (Kopie)`,
    pflicht: !!quelle.pflicht,
    demo: !!quelle.demo,
  })
  const ziel = db.prepare('SELECT * FROM courses WHERE slug = ?').get(neuerSlug)

  for (const l of db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY position').all(quelle.id)) {
    let quizId = null
    if (l.quiz_id) {
      const q = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(l.quiz_id)
      const qi = db
        .prepare(
          `INSERT INTO quizzes (titel, bestehensgrenze, pool_aktiv, fragen_anzahl, antworten_mischen, sperrzeit_stunden,
                                max_versuche_zeitraum, zeitraum_tage, harte_obergrenze, aufloesung_nichtbestanden,
                                zeitlimit_min, erstellt_am)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          q.titel, q.bestehensgrenze, q.pool_aktiv, q.fragen_anzahl, q.antworten_mischen, q.sperrzeit_stunden,
          q.max_versuche_zeitraum, q.zeitraum_tage, q.harte_obergrenze, q.aufloesung_nichtbestanden,
          q.zeitlimit_min, nowIso(),
        )
      quizId = Number(qi.lastInsertRowid)

      for (const f of db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY position').all(q.id)) {
        const fi = db
          .prepare(
            'INSERT INTO questions (quiz_id, position, typ, frage, thema, punkte, erklaerung, musterloesung) VALUES (?,?,?,?,?,?,?,?)',
          )
          .run(quizId, f.position, f.typ, f.frage, f.thema, f.punkte, f.erklaerung, f.musterloesung)
        for (const a of db.prepare('SELECT * FROM answers WHERE question_id = ? ORDER BY position').all(f.id)) {
          db.prepare('INSERT INTO answers (question_id, position, text, korrekt) VALUES (?,?,?,?)').run(
            Number(fi.lastInsertRowid), a.position, a.text, a.korrekt,
          )
        }
      }
    }

    db.prepare(
      `INSERT INTO lessons (course_id, position, titel, typ, dauer_min, video_datei, video_laenge_sek, text_inhalt,
                            pdf_datei, link_url, link_hinweis, link_nachweis, quiz_id, kapitel, unterkapitel,
                            sichtbar, audio_datei, youtube_id, scorm_paket)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      ziel.id, l.position, l.titel, l.typ, l.dauer_min, l.video_datei, l.video_laenge_sek, l.text_inhalt,
      l.pdf_datei, l.link_url, l.link_hinweis, l.link_nachweis, quizId, l.kapitel, l.unterkapitel,
      l.sichtbar, l.audio_datei, l.youtube_id, l.scorm_paket,
    )
  }

  dauerNeuBerechnen(ziel.id)
  return neuerSlug
}

export function kursLoeschen(slug) {
  const kurs = db.prepare('SELECT * FROM courses WHERE slug = ?').get(slug)
  if (!kurs) return false
  db.prepare('DELETE FROM courses WHERE id = ?').run(kurs.id)
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
  const alle = db.prepare('SELECT * FROM users ORDER BY name').all()
  const q = suche.trim().toLowerCase()

  return alle
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

  const verlauf = db
    .prepare('SELECT ts, aktion, objekt FROM audit_log WHERE user_id = ? ORDER BY ts DESC LIMIT 40')
    .all(p.id)

  const versuche = db
    .prepare(
      `SELECT a.beendet_am, a.prozent, a.bestanden, q.titel
         FROM quiz_attempts a JOIN quizzes q ON q.id = a.quiz_id
        WHERE a.user_id = ? AND a.beendet_am IS NOT NULL
        ORDER BY a.beendet_am DESC LIMIT 20`,
    )
    .all(p.id)

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
    versuche,
    verlauf,
  }
}

const PERSON_FELDER = ['name', 'email', 'rolle', 'standort', 'abteilung', 'position', 'eintrittsdatum', 'aktiv']

export function personSpeichern(id, daten) {
  const p = repo.userById(id)
  if (!p) return null
  const felder = PERSON_FELDER.filter((f) => f in daten)
  if (felder.length) {
    const satz = felder.map((f) => `${f} = ?`).join(', ')
    const werte = felder.map((f) => (typeof daten[f] === 'boolean' ? (daten[f] ? 1 : 0) : daten[f]))
    db.prepare(`UPDATE users SET ${satz} WHERE id = ?`).run(...werte, id)
  }
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
    standort: daten.standort ?? 'Werk Nord',
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
        standort: satz.standort || 'Werk Nord',
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
  const row = db.prepare('SELECT * FROM notification_settings WHERE user_id = ?').get(userId)
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
  const alt = benachrichtigungenLesen(userId)
  const neu = { ...alt, ...daten }
  db.prepare(
    `INSERT INTO notification_settings (user_id, email_aktiv, push_aktiv, inapp_aktiv, rhythmus, ereignisse, aktualisiert_am)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET email_aktiv = excluded.email_aktiv, push_aktiv = excluded.push_aktiv,
       inapp_aktiv = excluded.inapp_aktiv, rhythmus = excluded.rhythmus, ereignisse = excluded.ereignisse,
       aktualisiert_am = excluded.aktualisiert_am`,
  ).run(
    userId,
    neu.email_aktiv ? 1 : 0,
    neu.push_aktiv ? 1 : 0,
    neu.inapp_aktiv ? 1 : 0,
    neu.rhythmus,
    JSON.stringify(neu.ereignisse),
    nowIso(),
  )
  return benachrichtigungenLesen(userId)
}
