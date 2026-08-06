/**
 * Performance-Modul: Ziele, Reviews, Kompetenzen, Stimmungsbild.
 *
 * Die drei Verknüpfungen, um die es fachlich geht:
 *   Reviews + Ziele        → Zielerreichung fließt in die Beurteilung ein
 *   Reviews + Stimmungsbild → Heatmap: Zufriedenheit nach Leistungsniveau
 *   Reviews + Kompetenzen  → Netzdiagramm: Ist gegen Soll, daraus Schulungsbedarf
 *
 * Sichtbarkeit (bewusst eng):
 *   Lernende      sehen ihre eigenen Ziele, Reviews und Kompetenzen.
 *   Führungskraft sieht ihren Standort - Ziele und Kompetenzen, keine
 *                 Einzelantworten aus dem Stimmungsbild.
 *   Admin         sieht alles, inklusive Auswertungen.
 *
 * Das Stimmungsbild wird nie einzeln ausgegeben, sondern nur als Aggregat ab
 * einer Mindestgruppengröße - sonst ist "anonym" ein leeres Versprechen.
 */

import { db } from './db.js'
import * as repo from './repo.js'
import { addDays, daysUntil, isPast, nowIso } from './util.js'
import { konfiguration } from './config.js'

/** Unter dieser Gruppengröße wird kein Stimmungsbild ausgewiesen. */
export const MINDESTGRUPPE = 4

/* -------------------------------------------------------------------- Ziele */

/** Fortschritt eines Ziels in Prozent - bei verknüpftem Kurs aus dem Kurs. */
export function zielFortschritt(ziel, user) {
  if (ziel.course_id && user) {
    const kurs = repo.kursById(ziel.course_id)
    if (kurs) {
      const st = repo.kursStatus(user, kurs, kurs.pflicht)
      return st.status === 'bestanden' || st.status === 'bald_faellig' ? 100 : st.prozent
    }
  }
  if (ziel.art === 'binaer') return ziel.istwert >= 1 ? 100 : 0
  const spanne = ziel.zielwert - ziel.startwert
  if (spanne === 0) return ziel.istwert >= ziel.zielwert ? 100 : 0
  return Math.max(0, Math.min(100, Math.round(((ziel.istwert - ziel.startwert) / spanne) * 100)))
}

function zielAnreichern(ziel, user) {
  const prozent = zielFortschritt(ziel, user)
  const tage = daysUntil(ziel.faellig_am)
  // Ein Ziel gilt als gefährdet, wenn weniger Zeit übrig ist als Fortschritt fehlt
  const gefaehrdet = ziel.status === 'laufend' && prozent < 100 && tage !== null && tage <= 14
  return {
    ...ziel,
    prozent,
    tage_bis_faellig: tage,
    ueberfaellig: ziel.status === 'laufend' && prozent < 100 && isPast(ziel.faellig_am),
    gefaehrdet,
    kurs: ziel.course_id ? repo.kursById(ziel.course_id)?.titel ?? null : null,
  }
}

export function zieleFuer(userId) {
  const user = repo.userById(userId)
  return db
    .prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY faellig_am')
    .all(userId)
    .map((z) => zielAnreichern(z, user))
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

export function zielAktualisieren(id, daten, vonUser) {
  const ziel = db.prepare('SELECT * FROM goals WHERE id = ?').get(id)
  if (!ziel) return null

  const felder = ['titel', 'beschreibung', 'art', 'einheit', 'startwert', 'zielwert', 'istwert', 'faellig_am', 'gewichtung', 'course_id', 'status'].filter(
    (f) => f in daten,
  )
  if (felder.length) {
    const satz = felder.map((f) => `${f} = ?`).join(', ')
    db.prepare(`UPDATE goals SET ${satz} WHERE id = ?`).run(...felder.map((f) => daten[f]), id)
  }

  // Jede Wertänderung wird protokolliert - Zielverschiebungen sollen sichtbar bleiben
  if ('istwert' in daten) {
    db.prepare('INSERT INTO goal_updates (goal_id, wert, kommentar, von_user, erstellt_am) VALUES (?,?,?,?,?)').run(
      id,
      Number(daten.istwert),
      daten.kommentar ?? null,
      vonUser,
      nowIso(),
    )
  }

  const neu = db.prepare('SELECT * FROM goals WHERE id = ?').get(id)
  // Automatischer Abschluss, sobald der Zielwert erreicht ist
  if (neu.status === 'laufend' && zielFortschritt(neu, repo.userById(neu.user_id)) >= 100) {
    db.prepare("UPDATE goals SET status = 'erreicht', abgeschlossen_am = ? WHERE id = ?").run(nowIso(), id)
  }
  return zielAnreichern(db.prepare('SELECT * FROM goals WHERE id = ?').get(id), repo.userById(neu.user_id))
}

export const zielLoeschen = (id) => db.prepare('DELETE FROM goals WHERE id = ?').run(id).changes > 0

export const zielVerlauf = (id) =>
  db.prepare('SELECT * FROM goal_updates WHERE goal_id = ? ORDER BY erstellt_am DESC').all(id)

/** Gewichtete Zielerreichung einer Person in Prozent. */
export function zielerreichung(userId) {
  const ziele = zieleFuer(userId).filter((z) => z.status !== 'abgebrochen')
  if (!ziele.length) return null
  const summe = ziele.reduce((s, z) => s + z.gewichtung, 0)
  return Math.round(ziele.reduce((s, z) => s + z.prozent * z.gewichtung, 0) / summe)
}

/* ------------------------------------------------------------------ Reviews */

export const reviewsFuer = (userId) =>
  db.prepare('SELECT * FROM reviews WHERE user_id = ? ORDER BY erstellt_am DESC').all(userId)

export function reviewAnlegen(daten) {
  const info = db
    .prepare(
      `INSERT INTO reviews (user_id, zeitraum, status, fuehrungskraft, gespraech_am, erstellt_am)
       VALUES (?,?,'offen',?,?,?)`,
    )
    .run(daten.user_id, daten.zeitraum, daten.fuehrungskraft ?? null, daten.gespraech_am ?? null, nowIso())
  return Number(info.lastInsertRowid)
}

export function reviewSpeichern(id, daten) {
  const felder = ['zeitraum', 'status', 'bewertung', 'staerken', 'entwicklung', 'selbst_text', 'gespraech_am', 'fuehrungskraft'].filter(
    (f) => f in daten,
  )
  if (!felder.length) return db.prepare('SELECT * FROM reviews WHERE id = ?').get(id)

  const satz = felder.map((f) => `${f} = ?`).join(', ')
  db.prepare(`UPDATE reviews SET ${satz} WHERE id = ?`).run(...felder.map((f) => daten[f]), id)

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id)
  if (daten.status === 'abgeschlossen') {
    // Zielerreichung zum Zeitpunkt des Abschlusses einfrieren - später
    // veränderte Ziele sollen die Beurteilung nicht rückwirkend verschieben
    db.prepare('UPDATE reviews SET zielerreichung = ?, abgeschlossen_am = ? WHERE id = ?').run(
      zielerreichung(review.user_id),
      nowIso(),
      id,
    )
  }
  return db.prepare('SELECT * FROM reviews WHERE id = ?').get(id)
}

export const reviewLoeschen = (id) => db.prepare('DELETE FROM reviews WHERE id = ?').run(id).changes > 0

/* -------------------------------------------------------------- Kompetenzen */

export const kompetenzen = () => db.prepare('SELECT * FROM competencies ORDER BY sortierung, name').all()

/** Ist- und Soll-Stufen einer Person, für das Netzdiagramm. */
export function kompetenzProfil(userId) {
  const alle = kompetenzen()
  return alle.map((k) => {
    const fk = db
      .prepare(
        `SELECT * FROM competency_ratings WHERE user_id = ? AND competency_id = ? AND quelle = 'fuehrungskraft'
          ORDER BY erstellt_am DESC LIMIT 1`,
      )
      .get(userId, k.id)
    const selbst = db
      .prepare(
        `SELECT * FROM competency_ratings WHERE user_id = ? AND competency_id = ? AND quelle = 'selbst'
          ORDER BY erstellt_am DESC LIMIT 1`,
      )
      .get(userId, k.id)
    return {
      id: k.id,
      name: k.name,
      kategorie: k.kategorie,
      beschreibung: k.beschreibung,
      ist: fk?.stufe ?? null,
      soll: fk?.soll_stufe ?? null,
      selbst: selbst?.stufe ?? null,
      luecke: fk && fk.soll_stufe != null ? Math.max(0, fk.soll_stufe - fk.stufe) : null,
    }
  })
}

export function kompetenzBewerten({ user_id, competency_id, stufe, soll_stufe, quelle = 'fuehrungskraft', review_id = null }) {
  db.prepare(
    `INSERT INTO competency_ratings (user_id, competency_id, review_id, stufe, soll_stufe, quelle, erstellt_am)
     VALUES (?,?,?,?,?,?,?)`,
  ).run(user_id, competency_id, review_id, stufe, soll_stufe ?? null, quelle, nowIso())
  return kompetenzProfil(user_id)
}

/**
 * Kompetenzlücken über eine Personengruppe - daraus leitet sich der
 * Schulungsbedarf ab. Liefert je Kompetenz die durchschnittliche Lücke und
 * die Zahl der Personen unter Soll.
 */
export function kompetenzLuecken(personen) {
  const alle = kompetenzen()
  return alle
    .map((k) => {
      const werte = personen
        .map((p) => kompetenzProfil(p.id).find((x) => x.id === k.id))
        .filter((x) => x && x.ist != null && x.soll != null)
      if (!werte.length) return { name: k.name, kategorie: k.kategorie, bewertet: 0, luecke: 0, unter_soll: 0 }
      const luecke = werte.reduce((s, w) => s + w.luecke, 0) / werte.length
      return {
        name: k.name,
        kategorie: k.kategorie,
        bewertet: werte.length,
        ist_schnitt: Math.round((werte.reduce((s, w) => s + w.ist, 0) / werte.length) * 10) / 10,
        soll_schnitt: Math.round((werte.reduce((s, w) => s + w.soll, 0) / werte.length) * 10) / 10,
        luecke: Math.round(luecke * 10) / 10,
        unter_soll: werte.filter((w) => w.luecke > 0).length,
      }
    })
    .sort((a, b) => b.luecke - a.luecke)
}

/* --------------------------------------------------------- Stimmungsbild */

export const FRAGEN = [
  'Ich weiß, was von mir erwartet wird.',
  'Ich bekomme regelmäßig hilfreiche Rückmeldung.',
  'Ich kann mich hier fachlich weiterentwickeln.',
  'Ich habe die Mittel, meine Arbeit gut zu machen.',
  'Ich würde dieses Unternehmen als Arbeitgeber weiterempfehlen.',
]

export function umfrageAntworten(userId, runde) {
  return db.prepare('SELECT frage, wert FROM survey_answers WHERE user_id = ? AND runde = ?').all(userId, runde)
}

export function umfrageSpeichern(userId, runde, antworten) {
  const jetzt = nowIso()
  for (const [frage, wert] of Object.entries(antworten)) {
    db.prepare(
      `INSERT INTO survey_answers (user_id, runde, frage, wert, erstellt_am) VALUES (?,?,?,?,?)
       ON CONFLICT(user_id, runde, frage) DO UPDATE SET wert = excluded.wert, erstellt_am = excluded.erstellt_am`,
    ).run(userId, runde, frage, Math.max(1, Math.min(5, Number(wert))), jetzt)
  }
  return umfrageAntworten(userId, runde)
}

/**
 * Heatmap: Stimmungsbild nach Leistungsniveau.
 *
 * Die Frage dahinter: verlieren wir gerade die Leistungsträger? Deshalb wird
 * die Zufriedenheit nicht global gemittelt, sondern nach Review-Bewertung
 * gruppiert. Zellen unterhalb der Mindestgruppengröße bleiben leer - sonst
 * ließe sich aus zwei Antworten auf eine Person zurückschließen.
 */
export function heatmap(runde) {
  const stufen = [
    { key: '5', label: 'Übertrifft deutlich', von: 5, bis: 5 },
    { key: '4', label: 'Übertrifft', von: 4, bis: 4 },
    { key: '3', label: 'Erfüllt', von: 3, bis: 3 },
    { key: '1-2', label: 'Unter Erwartung', von: 1, bis: 2 },
    { key: 'ohne', label: 'Ohne Review', von: null, bis: null },
  ]

  const personen = repo.alleUser().map((p) => {
    const review = db
      .prepare("SELECT bewertung FROM reviews WHERE user_id = ? AND status = 'abgeschlossen' ORDER BY abgeschlossen_am DESC LIMIT 1")
      .get(p.id)
    return { id: p.id, bewertung: review?.bewertung ?? null }
  })

  const zuStufe = (s) =>
    personen.filter((p) =>
      s.von === null ? p.bewertung == null : p.bewertung != null && p.bewertung >= s.von && p.bewertung <= s.bis,
    )

  /**
   * In kleinen Belegschaften erreicht keine einzelne Leistungsstufe die
   * Mindestgruppengröße - die Tabelle wäre komplett leer. Statt die Schwelle
   * aufzuweichen (das wäre ein gebrochenes Anonymitätsversprechen), werden
   * benachbarte Stufen von oben nach unten zusammengefasst, bis jede Zeile
   * groß genug ist. Der Rest wandert in die letzte Zeile.
   */
  const gruppen = []
  let puffer = []
  let labels = []
  for (const s of stufen) {
    puffer = puffer.concat(zuStufe(s))
    labels.push(s.label)
    if (puffer.length >= MINDESTGRUPPE) {
      gruppen.push({ label: labels.length > 1 ? `${labels.at(-1)} bis ${labels[0]}` : labels[0], mitglieder: puffer, zusammengefasst: labels.length > 1 })
      puffer = []
      labels = []
    }
  }
  if (puffer.length) {
    if (gruppen.length) {
      const letzte = gruppen.at(-1)
      letzte.mitglieder = letzte.mitglieder.concat(puffer)
      letzte.label = `${labels.at(-1) ?? letzte.label} bis ${letzte.label.split(' bis ').at(-1)}`
      letzte.zusammengefasst = true
    } else {
      gruppen.push({ label: 'Alle Personen', mitglieder: puffer, zusammengefasst: true })
    }
  }

  const zeilen = gruppen.map((g, i) => ({
    key: `g${i}`,
    label: g.label,
    zusammengefasst: g.zusammengefasst,
    personen: g.mitglieder.length,
    zellen: FRAGEN.map((frage) => {
      const werte = g.mitglieder
        .map((p) => db.prepare('SELECT wert FROM survey_answers WHERE user_id = ? AND runde = ? AND frage = ?').get(p.id, runde, frage))
        .filter(Boolean)
        .map((r) => r.wert)
      if (werte.length < MINDESTGRUPPE) return { frage, wert: null, n: werte.length }
      return { frage, wert: Math.round((werte.reduce((a, b) => a + b, 0) / werte.length) * 10) / 10, n: werte.length }
    }),
  }))

  return {
    runde,
    fragen: FRAGEN,
    zeilen,
    mindestgruppe: MINDESTGRUPPE,
    zusammengefasst: zeilen.some((z) => z.zusammengefasst),
  }
}

/* ----------------------------------------------------------- Gesamtsicht */

/** Übersicht für Führungskraft und Admin. */
export function uebersicht(user) {
  const personen = repo
    .alleUser()
    .filter((p) => p.rolle !== 'admin')
    .filter((p) => user.rolle === 'admin' || p.standort === user.standort)

  const zeilen = personen.map((p) => {
    const ziele = zieleFuer(p.id)
    const review = db
      .prepare('SELECT * FROM reviews WHERE user_id = ? ORDER BY erstellt_am DESC LIMIT 1')
      .get(p.id)
    return {
      id: p.id,
      name: p.name,
      abteilung: p.abteilung,
      standort: p.standort,
      initialen: p.name.split(/\s+/).map((t) => t[0]).join('').slice(0, 2).toUpperCase(),
      ziele_gesamt: ziele.length,
      ziele_erreicht: ziele.filter((z) => z.status === 'erreicht').length,
      ziele_gefaehrdet: ziele.filter((z) => z.gefaehrdet || z.ueberfaellig).length,
      zielerreichung: zielerreichung(p.id),
      review_status: review?.status ?? null,
      review_bewertung: review?.bewertung ?? null,
      review_zeitraum: review?.zeitraum ?? null,
    }
  })

  return {
    bereich: user.rolle === 'admin' ? konfiguration.organisation : user.standort,
    zeilen: zeilen.sort((a, b) => (b.ziele_gefaehrdet - a.ziele_gefaehrdet) || a.name.localeCompare(b.name)),
    luecken: kompetenzLuecken(personen),
    kennzahlen: {
      personen: zeilen.length,
      mit_zielen: zeilen.filter((z) => z.ziele_gesamt > 0).length,
      gefaehrdet: zeilen.filter((z) => z.ziele_gefaehrdet > 0).length,
      schnitt: zeilen.filter((z) => z.zielerreichung != null).length
        ? Math.round(
            zeilen.filter((z) => z.zielerreichung != null).reduce((s, z) => s + z.zielerreichung, 0) /
              zeilen.filter((z) => z.zielerreichung != null).length,
          )
        : null,
      reviews_offen: zeilen.filter((z) => z.review_status && z.review_status !== 'abgeschlossen').length,
    },
  }
}
