/**
 * Datenzugriff des Performance-Moduls (Ziele, Reviews, Kompetenzen, Stimmungsbild).
 *
 * Rollenteilung im Server
 * -----------------------
 *   repo*.js         kennt die Datenbank, kennt keine Fachregeln
 *   performance.js   kennt die Fachregeln, kennt die Datenbank nicht
 *   api.js           kennt HTTP, kennt weder das eine noch das andere
 *
 * Der Grund für diese Trennung ist der geplante Wechsel auf die Datenstruktur
 * des Unternehmens: Steht aller Datenzugriff in den Repository-Modulen, ist der
 * Umzug ein Neuschreiben dieser Module - alles darüber bleibt unangetastet.
 * Verteiltes SQL macht daraus dagegen eine Suche durch die halbe Anwendung.
 *
 * Geprüft wird das automatisch: `npm run pruefen`.
 *
 * Die Funktionen hier liefern rohe Datensätze. Anreichern, Rechnen und
 * Entscheiden ist Sache von performance.js.
 */

import { db } from './db.js'
import { nowIso } from './util.js'

/**
 * Beschreibbare Spalten.
 *
 * Die Liste steht hier, weil sie das Schema abbildet - welche davon eine
 * bestimmte Person ändern darf, entscheidet dagegen die API. Die Trennung
 * verhindert, dass ein Aufrufer beliebige Spaltennamen in ein UPDATE schiebt.
 */
const ZIEL_SPALTEN = [
  'titel',
  'beschreibung',
  'art',
  'einheit',
  'startwert',
  'zielwert',
  'istwert',
  'faellig_am',
  'gewichtung',
  'course_id',
  'status',
]

const REVIEW_SPALTEN = [
  'zeitraum',
  'status',
  'bewertung',
  'staerken',
  'entwicklung',
  'selbst_text',
  'gespraech_am',
  'fuehrungskraft',
]

/** Baut ein UPDATE aus den erlaubten Spalten. Gibt false zurück, wenn nichts übrig bleibt. */
function schreibe(tabelle, erlaubteSpalten, id, daten) {
  const felder = erlaubteSpalten.filter((f) => f in daten)
  if (!felder.length) return false
  const satz = felder.map((f) => `${f} = ?`).join(', ')
  db.prepare(`UPDATE ${tabelle} SET ${satz} WHERE id = ?`).run(...felder.map((f) => daten[f]), Number(id))
  return true
}

/* -------------------------------------------------------------------- Ziele */

/** Einzelnes Ziel - für Besitz- und Rechteprüfungen vor einer Änderung. */
export function ziel(id) {
  return db.prepare('SELECT * FROM goals WHERE id = ?').get(Number(id))
}

export function zieleVon(userId) {
  return db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY faellig_am').all(userId)
}

export function zielAnlegen(daten, erstellerId) {
  const info = db
    .prepare(
      `INSERT INTO goals (user_id, titel, beschreibung, art, einheit, startwert, zielwert, istwert,
                          faellig_am, gewichtung, course_id, erstellt_von, erstellt_am)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      daten.user_id,
      daten.titel,
      daten.beschreibung ?? null,
      daten.art ?? 'messbar',
      daten.einheit ?? null,
      Number(daten.startwert) || 0,
      Number(daten.zielwert) || 100,
      Number(daten.istwert) || 0,
      daten.faellig_am,
      Number(daten.gewichtung) || 1,
      daten.course_id ?? null,
      erstellerId,
      nowIso(),
    )
  return Number(info.lastInsertRowid)
}

export const zielSchreiben = (id, daten) => schreibe('goals', ZIEL_SPALTEN, id, daten)

/** Setzt ein Ziel auf "erreicht". Der Auslöser dafür ist eine Fachregel und liegt oben. */
export function zielAlsErreichtMarkieren(id) {
  db.prepare("UPDATE goals SET status = 'erreicht', abgeschlossen_am = ? WHERE id = ?").run(nowIso(), Number(id))
}

export const zielLoeschen = (id) => db.prepare('DELETE FROM goals WHERE id = ?').run(Number(id)).changes > 0

export const zielVerlauf = (id) =>
  db.prepare('SELECT * FROM goal_updates WHERE goal_id = ? ORDER BY erstellt_am DESC').all(Number(id))

/** Protokolliert eine Wertänderung - Zielverschiebungen sollen nachvollziehbar bleiben. */
export function zielVerlaufAnlegen(goalId, wert, kommentar, vonUser) {
  db.prepare('INSERT INTO goal_updates (goal_id, wert, kommentar, von_user, erstellt_am) VALUES (?,?,?,?,?)').run(
    Number(goalId),
    Number(wert),
    kommentar ?? null,
    vonUser,
    nowIso(),
  )
}

/* ------------------------------------------------------------------ Reviews */

/** Einzelnes Review - für Besitz- und Rechteprüfungen vor einer Änderung. */
export function review(id) {
  return db.prepare('SELECT * FROM reviews WHERE id = ?').get(Number(id))
}

export const reviewsVon = (userId) =>
  db.prepare('SELECT * FROM reviews WHERE user_id = ? ORDER BY erstellt_am DESC').all(userId)

/** Jüngstes Review einer Person, unabhängig vom Status. */
export const letztesReview = (userId) =>
  db.prepare('SELECT * FROM reviews WHERE user_id = ? ORDER BY erstellt_am DESC LIMIT 1').get(userId)

/** Jüngstes abgeschlossenes Review - Grundlage der Leistungsstufe in der Heatmap. */
export const letztesAbgeschlossenesReview = (userId) =>
  db
    .prepare(
      "SELECT bewertung FROM reviews WHERE user_id = ? AND status = 'abgeschlossen' ORDER BY abgeschlossen_am DESC LIMIT 1",
    )
    .get(userId)

export function reviewAnlegen(daten) {
  const info = db
    .prepare(
      `INSERT INTO reviews (user_id, zeitraum, status, fuehrungskraft, gespraech_am, erstellt_am)
       VALUES (?,?,'offen',?,?,?)`,
    )
    .run(daten.user_id, daten.zeitraum, daten.fuehrungskraft ?? null, daten.gespraech_am ?? null, nowIso())
  return Number(info.lastInsertRowid)
}

export const reviewSchreiben = (id, daten) => schreibe('reviews', REVIEW_SPALTEN, id, daten)

/** Friert die Zielerreichung beim Abschluss ein. Den Wert berechnet die Fachschicht. */
export function reviewAbschlussSchreiben(id, zielerreichung) {
  db.prepare('UPDATE reviews SET zielerreichung = ?, abgeschlossen_am = ? WHERE id = ?').run(
    zielerreichung,
    nowIso(),
    Number(id),
  )
}

export const reviewLoeschen = (id) => db.prepare('DELETE FROM reviews WHERE id = ?').run(Number(id)).changes > 0

/* -------------------------------------------------------------- Kompetenzen */

export const kompetenzen = () => db.prepare('SELECT * FROM competencies ORDER BY sortierung, name').all()

/** Jüngste Bewertung einer Kompetenz aus einer bestimmten Quelle (selbst/fuehrungskraft). */
export const letzteBewertung = (userId, competencyId, quelle) =>
  db
    .prepare(
      `SELECT * FROM competency_ratings WHERE user_id = ? AND competency_id = ? AND quelle = ?
        ORDER BY erstellt_am DESC LIMIT 1`,
    )
    .get(userId, competencyId, quelle)

export function bewertungAnlegen({ user_id, competency_id, review_id = null, stufe, soll_stufe = null, quelle }) {
  db.prepare(
    `INSERT INTO competency_ratings (user_id, competency_id, review_id, stufe, soll_stufe, quelle, erstellt_am)
     VALUES (?,?,?,?,?,?,?)`,
  ).run(user_id, competency_id, review_id, stufe, soll_stufe, quelle, nowIso())
}

/* ------------------------------------------------------------ Stimmungsbild */

export const umfrageAntworten = (userId, runde) =>
  db.prepare('SELECT frage, wert FROM survey_answers WHERE user_id = ? AND runde = ?').all(userId, runde)

/** Einzelantwort - wird für die Heatmap je Person und Frage gelesen. */
export const umfrageWert = (userId, runde, frage) =>
  db.prepare('SELECT wert FROM survey_answers WHERE user_id = ? AND runde = ? AND frage = ?').get(userId, runde, frage)

export function umfrageAntwortSchreiben(userId, runde, frage, wert) {
  db.prepare(
    `INSERT INTO survey_answers (user_id, runde, frage, wert, erstellt_am) VALUES (?,?,?,?,?)
     ON CONFLICT(user_id, runde, frage) DO UPDATE SET wert = excluded.wert, erstellt_am = excluded.erstellt_am`,
  ).run(userId, runde, frage, wert, nowIso())
}
