/**
 * Datenzugriff der Verwaltung (Kurse, Lektionen, Personen, Benachrichtigungen).
 *
 * Siehe server/repo-performance.js für die Begründung der Schichtung. Kurz:
 * admin.js kennt die Verwaltungsregeln, dieses Modul kennt die Tabellen. Beim
 * Wechsel auf die Datenstruktur des Unternehmens wird hier neu geschrieben,
 * nicht dort. Geprüft mit `npm run pruefen`.
 *
 * Die Funktionen liefern rohe Datensätze; Aufbereiten und Entscheiden bleibt in
 * admin.js.
 */

import { db } from './db.js'
import { nowIso } from './util.js'

/** Spalten, die über die Verwaltung beschreibbar sind. */
const KURS_SPALTEN = [
  'titel', 'untertitel', 'beschreibung', 'kategorie', 'anbieter', 'pflicht', 'turnus_monate',
  'vorwarn_tage', 'onboarding_frist_tage', 'strenge', 'akzent', 'cover_motiv', 'cover_bild',
  'demo', 'veroeffentlicht', 'entwurf', 'highlight', 'sortierung',
]

const PERSON_SPALTEN = ['name', 'email', 'rolle', 'standort', 'abteilung', 'position', 'eintrittsdatum', 'aktiv']

/** Wahrheitswerte kommen als Boolean aus dem JSON, SQLite will 0/1. */
const alsWert = (v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v)

/* ------------------------------------------------------------------- Kurse */

export const alleKurseRoh = () => db.prepare('SELECT * FROM courses ORDER BY sortierung, titel').all()

export const kursBySlugRoh = (slug) => db.prepare('SELECT * FROM courses WHERE slug = ?').get(slug)

export const slugVergeben = (slug) => !!db.prepare('SELECT 1 FROM courses WHERE slug = ?').get(slug)

export function kursAnlegen(slug, daten) {
  const jetzt = nowIso()
  const info = db
    .prepare(
      `INSERT INTO courses (slug, titel, untertitel, beschreibung, kategorie, anbieter, pflicht, turnus_monate,
                            vorwarn_tage, onboarding_frist_tage, strenge, dauer_min, akzent, cover_motiv, demo,
                            veroeffentlicht, entwurf, sortierung, highlight, erstellt_am, aktualisiert_am)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,0,1,?,0,?,?)`,
    )
    .run(
      slug,
      daten.titel,
      daten.untertitel,
      daten.beschreibung,
      daten.kategorie,
      daten.anbieter,
      daten.pflicht,
      daten.turnus_monate,
      daten.vorwarn_tage,
      daten.onboarding_frist_tage,
      daten.strenge,
      daten.akzent,
      daten.cover_motiv,
      daten.demo,
      daten.sortierung,
      jetzt,
      jetzt,
    )
  return Number(info.lastInsertRowid)
}

/** Schreibt die erlaubten Kursfelder. Gibt false zurück, wenn nichts dabei war. */
export function kursSchreiben(id, daten) {
  const felder = KURS_SPALTEN.filter((f) => f in daten)
  if (!felder.length) return false
  const satz = felder.map((f) => `${f} = ?`).join(', ')
  db.prepare(`UPDATE courses SET ${satz}, aktualisiert_am = ? WHERE id = ?`).run(
    ...felder.map((f) => alsWert(daten[f])),
    nowIso(),
    id,
  )
  return true
}

export const kursLoeschen = (id) => db.prepare('DELETE FROM courses WHERE id = ?').run(id).changes > 0

/** Gesamtdauer aus den Lektionen neu setzen - nach jeder Inhaltsänderung. */
export function dauerNeuBerechnen(courseId) {
  const summe = db.prepare('SELECT COALESCE(SUM(dauer_min),0) AS s FROM lessons WHERE course_id = ?').get(courseId).s
  db.prepare('UPDATE courses SET dauer_min = ?, aktualisiert_am = ? WHERE id = ?').run(summe, nowIso(), courseId)
}

/* -------------------------------------------------------------- Kennzahlen */

export const teilnehmerAnzahl = (courseId) =>
  db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM course_starts WHERE course_id = ?').get(courseId).n

export const abschlussAnzahl = (courseId) =>
  db
    .prepare('SELECT COUNT(DISTINCT user_id) AS n FROM completions WHERE course_id = ? AND storniert_am IS NULL')
    .get(courseId).n

/* --------------------------------------------------------------- Lektionen */

export const lektionenRoh = (courseId) =>
  db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY position').all(courseId)

export const lektionArten = (courseId) =>
  db.prepare('SELECT typ, sichtbar FROM lessons WHERE course_id = ?').all(courseId)

export const lektionIds = (courseId) =>
  db.prepare('SELECT id FROM lessons WHERE course_id = ?').all(courseId).map((l) => l.id)

/** Wie viele Personen die Lektion bearbeitet bzw. abgeschlossen haben. */
export const lektionFortschritt = (lessonId) =>
  db
    .prepare(
      `SELECT COUNT(*) AS gesamt, SUM(CASE WHEN status = 'abgeschlossen' THEN 1 ELSE 0 END) AS fertig
         FROM lesson_progress WHERE lesson_id = ?`,
    )
    .get(lessonId)

/** Feldreihenfolge von lektionSchreiben/lektionAnlegen - beide teilen sie sich. */
const LEKTION_SPALTEN = `position, titel, typ, dauer_min, video_datei, video_laenge_sek, text_inhalt, pdf_datei,
                         link_url, link_hinweis, link_nachweis, kapitel, unterkapitel, sichtbar, audio_datei,
                         youtube_id, scorm_paket`

export function lektionSchreiben(id, werte) {
  const satz = LEKTION_SPALTEN.split(',').map((s) => `${s.trim()} = ?`).join(', ')
  db.prepare(`UPDATE lessons SET ${satz} WHERE id = ?`).run(...werte, id)
}

export function lektionAnlegen(courseId, werte) {
  const info = db
    .prepare(`INSERT INTO lessons (course_id, ${LEKTION_SPALTEN}) VALUES (${new Array(werte.length + 1).fill('?').join(',')})`)
    .run(courseId, ...werte)
  return Number(info.lastInsertRowid)
}

export const lektionLoeschen = (id) => db.prepare('DELETE FROM lessons WHERE id = ?').run(id)

/* ------------------------------------------------------------ Zuweisungen */

export const zuweisungenRoh = (courseId) =>
  db.prepare('SELECT * FROM assignments WHERE course_id = ?').all(courseId)

export const zuweisungenLoeschen = (courseId) =>
  db.prepare('DELETE FROM assignments WHERE course_id = ?').run(courseId)

export function zuweisungAnlegen(courseId, zielTyp, zielWert, pflicht) {
  db.prepare('INSERT INTO assignments (course_id, ziel_typ, ziel_wert, pflicht, erstellt_am) VALUES (?,?,?,?,?)').run(
    courseId,
    zielTyp,
    zielWert ?? null,
    pflicht ? 1 : 0,
    nowIso(),
  )
}

/* ---------------------------------------------------------------- Klonen */

export const quizRoh = (id) => db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id)

export const fragenAnzahl = (quizId) =>
  db.prepare('SELECT COUNT(*) AS n FROM questions WHERE quiz_id = ?').get(quizId).n

/**
 * Kopiert alle Lektionen eines Kurses samt Quizzen, Fragen und Antworten.
 *
 * Steht bewusst als ein Vorgang hier statt als ein Dutzend Einzelabfragen in
 * admin.js: Es ist eine reine Datenoperation ohne Verwaltungsregel, und beim
 * späteren Wechsel der Datenquelle bleibt sie dadurch an einer Stelle.
 */
export function inhalteKopieren(quelleId, zielId) {
  for (const l of lektionenRoh(quelleId)) {
    let quizId = null

    if (l.quiz_id) {
      const q = quizRoh(l.quiz_id)
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
      zielId, l.position, l.titel, l.typ, l.dauer_min, l.video_datei, l.video_laenge_sek, l.text_inhalt,
      l.pdf_datei, l.link_url, l.link_hinweis, l.link_nachweis, quizId, l.kapitel, l.unterkapitel,
      l.sichtbar, l.audio_datei, l.youtube_id, l.scorm_paket,
    )
  }
}

/* ---------------------------------------------------------------- Personen */

export const allePersonenRoh = () => db.prepare('SELECT * FROM users ORDER BY name').all()

export function personSchreiben(id, daten) {
  const felder = PERSON_SPALTEN.filter((f) => f in daten)
  if (!felder.length) return false
  const satz = felder.map((f) => `${f} = ?`).join(', ')
  db.prepare(`UPDATE users SET ${satz} WHERE id = ?`).run(...felder.map((f) => alsWert(daten[f])), id)
  return true
}

export const auditVerlauf = (userId, grenze = 40) =>
  db.prepare('SELECT ts, aktion, objekt FROM audit_log WHERE user_id = ? ORDER BY ts DESC LIMIT ?').all(userId, grenze)

export const beendeteVersuche = (userId, grenze = 20) =>
  db
    .prepare(
      `SELECT a.beendet_am, a.prozent, a.bestanden, q.titel
         FROM quiz_attempts a JOIN quizzes q ON q.id = a.quiz_id
        WHERE a.user_id = ? AND a.beendet_am IS NOT NULL
        ORDER BY a.beendet_am DESC LIMIT ?`,
    )
    .all(userId, grenze)

/* ------------------------------------------------------- Benachrichtigungen */

export const benachrichtigungRoh = (userId) =>
  db.prepare('SELECT * FROM notification_settings WHERE user_id = ?').get(userId)

export function benachrichtigungSchreiben(userId, e) {
  db.prepare(
    `INSERT INTO notification_settings (user_id, email_aktiv, push_aktiv, inapp_aktiv, rhythmus, ereignisse, aktualisiert_am)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET email_aktiv = excluded.email_aktiv, push_aktiv = excluded.push_aktiv,
       inapp_aktiv = excluded.inapp_aktiv, rhythmus = excluded.rhythmus, ereignisse = excluded.ereignisse,
       aktualisiert_am = excluded.aktualisiert_am`,
  ).run(
    userId,
    e.email_aktiv ? 1 : 0,
    e.push_aktiv ? 1 : 0,
    e.inapp_aktiv ? 1 : 0,
    e.rhythmus,
    JSON.stringify(e.ereignisse),
    nowIso(),
  )
}
