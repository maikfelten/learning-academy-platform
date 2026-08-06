/**
 * Repository layer: the only place in the project that knows SQL.
 * The interface talks to these functions through server/api.js and nothing else.
 * Moving to another database later means replacing this file - and only this file.
 */

import { db } from './db.js'
import { addDays, addHours, addMonths, daysUntil, isPast, nowIso, shuffle, uuid, zertifikatNummer } from './util.js'

/* -------------------------------------------------------------------- People */

export const userByEmail = (email) =>
  db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(String(email || '').trim())

export const userById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id)

export const alleUser = () =>
  db.prepare('SELECT * FROM users WHERE aktiv = 1 ORDER BY standort, abteilung, name').all()

export function createUser(u) {
  const id = u.id || uuid()
  db.prepare(
    `INSERT INTO users (id, email, name, rolle, standort, abteilung, position, eintrittsdatum,
                        passwort_hash, passwort_salt, passwort_wechsel, ms_upn, aktiv, erstellt_am)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?)`,
  ).run(
    id,
    u.email,
    u.name,
    u.rolle,
    u.standort,
    u.abteilung,
    u.position ?? null,
    u.eintrittsdatum,
    u.passwort_hash ?? null,
    u.passwort_salt ?? null,
    u.passwort_wechsel ? 1 : 0,
    u.ms_upn ?? null,
    nowIso(),
  )
  return userById(id)
}

export function setPassword(userId, hash, salt, wechselNoetig = 0) {
  db.prepare(
    'UPDATE users SET passwort_hash = ?, passwort_salt = ?, passwort_wechsel = ?, fehlversuche = 0, gesperrt_bis = NULL WHERE id = ?',
  ).run(hash, salt, wechselNoetig ? 1 : 0, userId)
}

export function loginErfolg(userId) {
  db.prepare('UPDATE users SET letzter_login = ?, fehlversuche = 0, gesperrt_bis = NULL WHERE id = ?').run(nowIso(), userId)
}

export function loginFehler(userId) {
  const u = userById(userId)
  const versuche = (u?.fehlversuche ?? 0) + 1
  // After 5 failed attempts: 15 minutes of lockout - slows down guessing.
  const gesperrt = versuche >= 5 ? addHours(nowIso(), 0.25) : null
  db.prepare('UPDATE users SET fehlversuche = ?, gesperrt_bis = ? WHERE id = ?').run(versuche, gesperrt, userId)
  return { versuche, gesperrt_bis: gesperrt }
}

/* ------------------------------------------------------------------ Sessions */

export function createSession(userId, tage = 14) {
  const t = uuid() + uuid().replaceAll('-', '')
  db.prepare('INSERT INTO sessions (token, user_id, erstellt_am, laeuft_ab) VALUES (?,?,?,?)').run(
    t,
    userId,
    nowIso(),
    addDays(nowIso(), tage),
  )
  return t
}

export function sessionUser(token) {
  if (!token) return null
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.laeuft_ab > ? AND u.aktiv = 1`,
    )
    .get(token, nowIso())
  return row || null
}

export const deleteSession = (token) => db.prepare('DELETE FROM sessions WHERE token = ?').run(token)

export const audit = (userId, aktion, objekt = null, details = null) =>
  db
    .prepare('INSERT INTO audit_log (ts, user_id, aktion, objekt, details) VALUES (?,?,?,?,?)')
    .run(nowIso(), userId, aktion, objekt, details ? JSON.stringify(details) : null)

/* ------------------------------------------------------------------- Courses */

const COURSE_COLS = `id, slug, titel, untertitel, beschreibung, kategorie, anbieter, pflicht,
  turnus_monate, vorwarn_tage, onboarding_frist_tage, strenge, dauer_min, akzent, cover_bild,
  cover_motiv, demo, highlight, sortierung`

export const alleKurse = () =>
  db.prepare(`SELECT ${COURSE_COLS} FROM courses WHERE veroeffentlicht = 1 ORDER BY sortierung, titel`).all()

export const kursBySlug = (slug) =>
  db.prepare(`SELECT ${COURSE_COLS} FROM courses WHERE slug = ? AND veroeffentlicht = 1`).get(slug)

export const kursById = (id) => db.prepare(`SELECT ${COURSE_COLS} FROM courses WHERE id = ?`).get(id)

export const lektionen = (courseId) =>
  db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY position').all(courseId)

export const lektion = (id) => db.prepare('SELECT * FROM lessons WHERE id = ?').get(id)

export const quizById = (id) => db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id)

export const fragenFuerQuiz = (quizId) =>
  db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY position').all(quizId)

export const antwortenFuerFrage = (questionId) =>
  db.prepare('SELECT * FROM answers WHERE question_id = ? ORDER BY position').all(questionId)

/* --------------------------------------------------------------- Assignments */

/** Resolves all assignment rules down to one concrete person. */
export function zuweisungenFuer(user) {
  const rows = db
    .prepare(
      `SELECT a.course_id, a.pflicht, a.ziel_typ, a.ziel_wert
         FROM assignments a
        WHERE a.course_id IS NOT NULL
          AND (a.ziel_typ = 'alle'
            OR (a.ziel_typ = 'standort'  AND a.ziel_wert = ?)
            OR (a.ziel_typ = 'abteilung' AND a.ziel_wert = ?)
            OR (a.ziel_typ = 'user'      AND a.ziel_wert = ?))`,
    )
    .all(user.standort, user.abteilung, user.id)

  const map = new Map()
  for (const r of rows) {
    const vorher = map.get(r.course_id)
    // Mandatory beats optional when a person is assigned through several rules.
    if (!vorher || (!vorher.pflicht && r.pflicht)) map.set(r.course_id, r)
  }
  return map
}

/* ----------------------------------------------------------- Progress/status */

export const letzterAbschluss = (userId, courseId) =>
  db
    .prepare(
      `SELECT * FROM completions
        WHERE user_id = ? AND course_id = ? AND storniert_am IS NULL
        ORDER BY abgeschlossen_am DESC LIMIT 1`,
    )
    .get(userId, courseId)

export const abschluesse = (userId) =>
  db
    .prepare(
      `SELECT c.*, k.titel, k.slug, k.kategorie, k.akzent, k.turnus_monate, k.demo
         FROM completions c JOIN courses k ON k.id = c.course_id
        WHERE c.user_id = ? AND c.storniert_am IS NULL
        ORDER BY c.abgeschlossen_am DESC`,
    )
    .all(userId)

export const abschlussById = (id) =>
  db
    .prepare(
      `SELECT c.*, k.titel, k.slug, k.kategorie, k.demo, k.anbieter
         FROM completions c JOIN courses k ON k.id = c.course_id
        WHERE c.id = ?`,
    )
    .get(id)

const lektionsFortschritt = (userId, courseId) =>
  db
    .prepare(
      `SELECT p.* FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id
        WHERE p.user_id = ? AND l.course_id = ?`,
    )
    .all(userId, courseId)

/**
 * Progress of the *current* cycle.
 * Anything completed before the last completion stops counting once that
 * completion expires. That way a refresher cycle can start without deleting old
 * records - the history stays immutable.
 */
export function fortschritt(userId, courseId, zyklusStart = null) {
  const alle = lektionen(courseId)
  const progress = lektionsFortschritt(userId, courseId)
  const relevant = new Map()
  for (const p of progress) {
    if (p.status === 'abgeschlossen' && zyklusStart && p.abgeschlossen_am && p.abgeschlossen_am <= zyklusStart) continue
    relevant.set(p.lesson_id, p)
  }
  const erledigt = alle.filter((l) => relevant.get(l.id)?.status === 'abgeschlossen')
  const prozent = alle.length ? Math.round((erledigt.length / alle.length) * 100) : 0
  return { lektionen_gesamt: alle.length, lektionen_erledigt: erledigt.length, prozent, detail: relevant }
}

/**
 * Status of one course for one person.
 * bestanden (passed) | bald_faellig (due soon) | ueberfaellig (overdue) |
 * laufend (in progress) | offen (not started)
 */
export function kursStatus(user, kurs, pflicht = kurs.pflicht) {
  const letzter = letzterAbschluss(user.id, kurs.id)
  const zyklusStart = letzter && letzter.gueltig_bis && isPast(letzter.gueltig_bis) ? letzter.abgeschlossen_am : null
  const fs = fortschritt(user.id, kurs.id, zyklusStart)
  const gestartet = db
    .prepare('SELECT * FROM course_starts WHERE user_id = ? AND course_id = ?')
    .get(user.id, kurs.id)

  let faellig_am = null
  if (pflicht) {
    if (letzter?.gueltig_bis) faellig_am = letzter.gueltig_bis
    else if (!letzter && kurs.onboarding_frist_tage) faellig_am = addDays(user.eintrittsdatum, kurs.onboarding_frist_tage)
  }

  const tage = faellig_am ? daysUntil(faellig_am) : null
  const gueltig = letzter ? !letzter.gueltig_bis || !isPast(letzter.gueltig_bis) : false

  let status
  if (gueltig) {
    status = tage !== null && tage <= (kurs.vorwarn_tage ?? 30) ? 'bald_faellig' : 'bestanden'
  } else if (faellig_am && isPast(faellig_am)) {
    status = 'ueberfaellig'
  } else if (fs.prozent > 0 || (gestartet && !letzter)) {
    status = 'laufend'
  } else if (faellig_am && tage <= (kurs.vorwarn_tage ?? 30)) {
    status = 'bald_faellig'
  } else {
    status = 'offen'
  }

  return {
    status,
    pflicht: !!pflicht,
    laufend: fs.prozent > 0 && fs.prozent < 100,
    prozent: fs.prozent,
    lektionen_gesamt: fs.lektionen_gesamt,
    lektionen_erledigt: fs.lektionen_erledigt,
    faellig_am,
    tage_bis_faellig: tage,
    gueltig_bis: letzter?.gueltig_bis ?? null,
    letzter_abschluss: letzter?.abgeschlossen_am ?? null,
    wiederholung: !!letzter,
    zyklus_start: zyklusStart,
    zuletzt_aktiv: gestartet?.zuletzt_am ?? null,
  }
}

export const gespeicherteKurse = (userId) =>
  db.prepare('SELECT course_id FROM saved_courses WHERE user_id = ?').all(userId).map((r) => r.course_id)

export function speichernUmschalten(userId, courseId) {
  const vorhanden = db.prepare('SELECT 1 FROM saved_courses WHERE user_id = ? AND course_id = ?').get(userId, courseId)
  if (vorhanden) {
    db.prepare('DELETE FROM saved_courses WHERE user_id = ? AND course_id = ?').run(userId, courseId)
    return false
  }
  db.prepare('INSERT INTO saved_courses (user_id, course_id, erstellt_am) VALUES (?,?,?)').run(userId, courseId, nowIso())
  return true
}

export function kursGestartet(userId, courseId) {
  const jetzt = nowIso()
  db.prepare(
    `INSERT INTO course_starts (user_id, course_id, gestartet_am, zuletzt_am) VALUES (?,?,?,?)
     ON CONFLICT(user_id, course_id) DO UPDATE SET zuletzt_am = excluded.zuletzt_am`,
  ).run(userId, courseId, jetzt, jetzt)
}

/* -------------------------------------------------------- Lesson progress */

export function fortschrittSpeichern(userId, lessonId, { sekunden_gesehen, max_position_sek, prozent }) {
  const jetzt = nowIso()
  const vorher = db.prepare('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(userId, lessonId)
  const neuMax = Math.max(vorher?.max_position_sek ?? 0, Math.round(max_position_sek ?? 0))
  const neuSek = Math.max(vorher?.sekunden_gesehen ?? 0, Math.round(sekunden_gesehen ?? 0))
  const neuProzent = Math.max(vorher?.prozent ?? 0, Math.round(prozent ?? 0))
  if (vorher) {
    db.prepare(
      `UPDATE lesson_progress SET sekunden_gesehen = ?, max_position_sek = ?, prozent = ?, aktualisiert_am = ?
        WHERE user_id = ? AND lesson_id = ?`,
    ).run(neuSek, neuMax, neuProzent, jetzt, userId, lessonId)
  } else {
    db.prepare(
      `INSERT INTO lesson_progress (user_id, lesson_id, status, sekunden_gesehen, max_position_sek, prozent, aktualisiert_am)
       VALUES (?,?,'laufend',?,?,?,?)`,
    ).run(userId, lessonId, neuSek, neuMax, neuProzent, jetzt)
  }
  return db.prepare('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(userId, lessonId)
}

export function lektionAbschliessen(userId, lessonId, { bestaetigt = 1, prozent = 100 } = {}) {
  const jetzt = nowIso()
  const vorher = db.prepare('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(userId, lessonId)
  if (vorher) {
    db.prepare(
      `UPDATE lesson_progress SET status = 'abgeschlossen', bestaetigt = ?, prozent = ?,
              abgeschlossen_am = ?, aktualisiert_am = ? WHERE user_id = ? AND lesson_id = ?`,
    ).run(bestaetigt ? 1 : 0, Math.max(vorher.prozent, prozent), jetzt, jetzt, userId, lessonId)
  } else {
    db.prepare(
      `INSERT INTO lesson_progress (user_id, lesson_id, status, prozent, bestaetigt, aktualisiert_am, abgeschlossen_am)
       VALUES (?,?,'abgeschlossen',?,?,?,?)`,
    ).run(userId, lessonId, prozent, bestaetigt ? 1 : 0, jetzt, jetzt)
  }
}

/**
 * Checks after every finished lesson whether the whole course is complete.
 * If so it writes an immutable completion record including its expiry date.
 */
export function kursAbschlussPruefen(user, kurs) {
  const st = kursStatus(user, kurs)
  if (st.lektionen_gesamt === 0 || st.lektionen_erledigt < st.lektionen_gesamt) return null

  const letzter = letzterAbschluss(user.id, kurs.id)
  if (letzter && (!letzter.gueltig_bis || !isPast(letzter.gueltig_bis))) return letzter // schon gültig abgeschlossen

  // Best quiz result of the current cycle becomes the score of the completion
  const quizLektionen = lektionen(kurs.id).filter((l) => l.typ === 'quiz' && l.quiz_id)
  let prozent = null
  if (quizLektionen.length) {
    const werte = quizLektionen
      .map((l) => besterVersuch(user.id, l.quiz_id, st.zyklus_start)?.prozent)
      .filter((v) => typeof v === 'number')
    if (werte.length) prozent = Math.round(werte.reduce((a, b) => a + b, 0) / werte.length)
  }

  const jetzt = nowIso()
  const seq = (db.prepare('SELECT COUNT(*) AS n FROM completions').get().n ?? 0) + 1
  const gueltigBis = kurs.turnus_monate ? addMonths(jetzt, kurs.turnus_monate) : null
  const info = db
    .prepare(
      `INSERT INTO completions (user_id, course_id, abgeschlossen_am, gueltig_bis, prozent, quelle, zertifikat_nr, erstellt_am)
       VALUES (?,?,?,?,?,'plattform',?,?)`,
    )
    .run(user.id, kurs.id, jetzt, gueltigBis, prozent, zertifikatNummer(seq), jetzt)
  audit(user.id, 'kurs.abgeschlossen', kurs.slug, { prozent, gueltig_bis: gueltigBis })
  return db.prepare('SELECT * FROM completions WHERE id = ?').get(Number(info.lastInsertRowid))
}

/* ---------------------------------------------------------------- Quiz logic */

export const versuche = (userId, quizId) =>
  db.prepare('SELECT * FROM quiz_attempts WHERE user_id = ? AND quiz_id = ? ORDER BY gestartet_am DESC').all(userId, quizId)

export function besterVersuch(userId, quizId, zyklusStart = null) {
  const alle = versuche(userId, quizId).filter((v) => v.beendet_am && (!zyklusStart || v.beendet_am > zyklusStart))
  if (!alle.length) return null
  return alle.reduce((a, b) => ((b.prozent ?? -1) > (a.prozent ?? -1) ? b : a))
}

export const versuchById = (id) => db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(id)

const offeneFreischaltung = (userId, quizId) =>
  db
    .prepare('SELECT * FROM quiz_unlocks WHERE user_id = ? AND quiz_id = ? AND verbraucht = 0 ORDER BY erteilt_am DESC LIMIT 1')
    .get(userId, quizId)

/**
 * Applies the per-quiz attempt rules:
 * cooldown between attempts, maximum attempts per period, hard cap.
 */
export function quizStatus(user, quiz, zyklusStart = null) {
  const alle = versuche(user.id, quiz.id)
  const beendet = alle.filter((v) => v.beendet_am)
  const imZyklus = beendet.filter((v) => !zyklusStart || v.beendet_am > zyklusStart)
  const bestanden = imZyklus.some((v) => v.bestanden === 1)
  const offen = alle.find((v) => !v.beendet_am)
  const freischaltung = offeneFreischaltung(user.id, quiz.id)

  const result = {
    versuche_gesamt: beendet.length,
    versuche_zyklus: imZyklus.length,
    bestanden,
    bester_prozent: imZyklus.reduce((m, v) => Math.max(m, v.prozent ?? 0), 0),
    laufender_versuch: offen?.id ?? null,
    darf_starten: true,
    grund: null,
    frei_ab: null,
    freischaltung: !!freischaltung,
    bewertung_offen: imZyklus.some((v) => v.bewertung_offen === 1 && v.bestanden !== 1),
  }

  if (bestanden) {
    result.darf_starten = false
    result.grund = 'bestanden'
    return result
  }
  if (offen) return result // laufender Versuch darf fortgesetzt werden

  if (result.bewertung_offen) {
    result.darf_starten = false
    result.grund = 'bewertung_offen'
    return result
  }

  const letzter = beendet[0]

  // 1) Cooldown between two attempts
  if (letzter && quiz.sperrzeit_stunden > 0) {
    const frei = addHours(letzter.beendet_am, quiz.sperrzeit_stunden)
    if (!isPast(frei)) {
      result.darf_starten = false
      result.grund = 'sperrzeit'
      result.frei_ab = frei
    }
  }

  // 2) Maximum attempts per period
  if (result.darf_starten && quiz.max_versuche_zeitraum) {
    const grenze = addDays(nowIso(), -(quiz.zeitraum_tage ?? 7))
    const imZeitraum = beendet.filter((v) => v.beendet_am > grenze)
    if (imZeitraum.length >= quiz.max_versuche_zeitraum) {
      const aeltester = imZeitraum[imZeitraum.length - 1]
      result.darf_starten = false
      result.grund = 'kontingent'
      result.frei_ab = addDays(aeltester.beendet_am, quiz.zeitraum_tage ?? 7)
      result.kontingent = { genutzt: imZeitraum.length, von: quiz.max_versuche_zeitraum, tage: quiz.zeitraum_tage }
    }
  }

  // 3) Hard cap - only an admin can unlock further attempts
  if (result.darf_starten && quiz.harte_obergrenze && imZyklus.length >= quiz.harte_obergrenze) {
    result.darf_starten = false
    result.grund = 'obergrenze'
    result.frei_ab = null
  }

  // An unused admin unlock overrides cooldown, quota and hard cap
  if (!result.darf_starten && freischaltung && result.grund !== 'bestanden') {
    result.darf_starten = true
    result.grund = 'freigeschaltet'
    result.frei_ab = null
  }

  return result
}

/** Draws the questions for an attempt (pool + shuffle) and records the attempt. */
export function versuchStarten(user, quiz, lesson) {
  const laufend = versuche(user.id, quiz.id).find((v) => !v.beendet_am)
  if (laufend) return laufend

  let fragen = fragenFuerQuiz(quiz.id)
  if (quiz.pool_aktiv && quiz.fragen_anzahl && quiz.fragen_anzahl < fragen.length) {
    fragen = shuffle(fragen).slice(0, quiz.fragen_anzahl)
  }
  const gezogen = fragen.map((f) => {
    let optionen = antwortenFuerFrage(f.id).map((a) => ({ id: a.id, text: a.text }))
    if (quiz.antworten_mischen && f.typ !== 'truefalse') optionen = shuffle(optionen)
    return { question_id: f.id, typ: f.typ, optionen: optionen.map((o) => o.id) }
  })

  const info = db
    .prepare(
      `INSERT INTO quiz_attempts (user_id, quiz_id, course_id, lesson_id, gestartet_am, fragen_json)
       VALUES (?,?,?,?,?,?)`,
    )
    .run(user.id, quiz.id, lesson?.course_id ?? null, lesson?.id ?? null, nowIso(), JSON.stringify(gezogen))

  const freischaltung = offeneFreischaltung(user.id, quiz.id)
  if (freischaltung) db.prepare('UPDATE quiz_unlocks SET verbraucht = 1 WHERE id = ?').run(freischaltung.id)

  audit(user.id, 'quiz.gestartet', String(quiz.id), { fragen: gezogen.length })
  return db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(Number(info.lastInsertRowid))
}

/** Builds the questions of a running attempt for the interface - without answers. */
export function versuchFragen(versuch) {
  const gezogen = JSON.parse(versuch.fragen_json)
  return gezogen.map((g, i) => {
    const f = db.prepare('SELECT * FROM questions WHERE id = ?').get(g.question_id)
    const alle = antwortenFuerFrage(f.id)
    const reihenfolge = g.optionen
      .map((id) => alle.find((a) => a.id === id))
      .filter(Boolean)
      .map((a) => ({ id: a.id, text: a.text }))
    return {
      nummer: i + 1,
      question_id: f.id,
      typ: f.typ,
      frage: f.frage,
      thema: f.thema,
      punkte: f.punkte,
      optionen: f.typ === 'freitext' ? [] : reihenfolge,
    }
  })
}

/** Grades an attempt. Free-text answers stay open for a human reviewer. */
export function versuchAbgeben(user, versuch, quiz, antworten) {
  const gezogen = JSON.parse(versuch.fragen_json)
  let punkte = 0
  let moeglich = 0
  let freitextOffen = false
  const falscheThemen = new Set()
  const detail = []

  for (const g of gezogen) {
    const f = db.prepare('SELECT * FROM questions WHERE id = ?').get(g.question_id)
    const richtige = antwortenFuerFrage(f.id).filter((a) => a.korrekt).map((a) => a.id)
    const gegeben = antworten[String(f.id)]
    moeglich += f.punkte

    if (f.typ === 'freitext') {
      freitextOffen = true
      detail.push({ question_id: f.id, typ: f.typ, text: String(gegeben ?? ''), bewertung: 'offen' })
      continue
    }

    const gewaehlt = Array.isArray(gegeben) ? gegeben.map(Number) : gegeben != null ? [Number(gegeben)] : []
    const korrekt =
      gewaehlt.length === richtige.length && gewaehlt.every((id) => richtige.includes(id))
    if (korrekt) punkte += f.punkte
    else falscheThemen.add(f.thema)
    detail.push({ question_id: f.id, typ: f.typ, gewaehlt, korrekt })
  }

  const prozent = moeglich > 0 ? Math.round((punkte / moeglich) * 100) : 0
  const bestanden = !freitextOffen && prozent >= quiz.bestehensgrenze
  const jetzt = nowIso()

  db.prepare(
    `UPDATE quiz_attempts SET beendet_am = ?, antworten_json = ?, prozent = ?, punkte = ?,
            punkte_moeglich = ?, bestanden = ?, bewertung_offen = ?, themen_falsch = ?
      WHERE id = ?`,
  ).run(
    jetzt,
    JSON.stringify(detail),
    prozent,
    punkte,
    moeglich,
    bestanden ? 1 : 0,
    freitextOffen ? 1 : 0,
    JSON.stringify([...falscheThemen]),
    versuch.id,
  )

  audit(user.id, 'quiz.abgegeben', String(quiz.id), { prozent, bestanden, freitext_offen: freitextOffen })
  return { prozent, punkte, moeglich, bestanden, freitextOffen, themen: [...falscheThemen] }
}

/** Full breakdown of correct answers - only after the quiz has been passed. */
export function aufloesung(versuch) {
  const gezogen = JSON.parse(versuch.fragen_json)
  const gegeben = versuch.antworten_json ? JSON.parse(versuch.antworten_json) : []
  return gezogen.map((g) => {
    const f = db.prepare('SELECT * FROM questions WHERE id = ?').get(g.question_id)
    const alle = antwortenFuerFrage(f.id)
    const meine = gegeben.find((d) => d.question_id === f.id)
    return {
      frage: f.frage,
      thema: f.thema,
      typ: f.typ,
      erklaerung: f.erklaerung,
      musterloesung: f.musterloesung,
      optionen: alle.map((a) => ({
        text: a.text,
        korrekt: !!a.korrekt,
        gewaehlt: (meine?.gewaehlt ?? []).includes(a.id),
      })),
      freitext: meine?.text ?? null,
      korrekt: meine?.korrekt ?? null,
    }
  })
}

/* ------------------------------ External proofs (third-party providers) */

export function externenNachweisSpeichern(userId, lesson, { datei_name = null, datei_pfad = null }) {
  const jetzt = nowIso()
  const info = db
    .prepare(
      `INSERT INTO external_proofs (user_id, lesson_id, course_id, bestaetigt_am, datei_name, datei_pfad, status)
       VALUES (?,?,?,?,?,?, 'offen')`,
    )
    .run(userId, lesson.id, lesson.course_id, jetzt, datei_name, datei_pfad)
  audit(userId, 'extern.bestaetigt', String(lesson.id), { datei: datei_name })
  return db.prepare('SELECT * FROM external_proofs WHERE id = ?').get(Number(info.lastInsertRowid))
}

export const externeNachweise = (userId, courseId = null) =>
  courseId
    ? db.prepare('SELECT * FROM external_proofs WHERE user_id = ? AND course_id = ? ORDER BY bestaetigt_am DESC').all(userId, courseId)
    : db.prepare('SELECT * FROM external_proofs WHERE user_id = ? ORDER BY bestaetigt_am DESC').all(userId)

/* ----------------------------------------------------------------- Curricula */

export const alleCurricula = () => db.prepare('SELECT * FROM curricula ORDER BY id').all()

export const curriculumKurse = (curriculumId) =>
  db
    .prepare(
      `SELECT k.*, cc.position FROM curriculum_courses cc JOIN courses k ON k.id = cc.course_id
        WHERE cc.curriculum_id = ? ORDER BY cc.position`,
    )
    .all(curriculumId)
