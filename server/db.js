/**
 * Datenhaltung.
 *
 * Bewusst über das in Node eingebaute `node:sqlite` - keine native Abhängigkeit,
 * kein Compiler nötig, eine einzige Datei unter data/schulungsplattform.db.
 * Sämtliche Zugriffe laufen ausschließlich über server/repo.js, damit der
 * Umzug auf Postgres nur diese eine
 * Schicht betrifft und nicht die Oberfläche.
 */

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(here, '..')
export const DATA_DIR = join(ROOT, 'data')
export const UPLOAD_DIR = join(DATA_DIR, 'uploads')
export const MEDIA_DIR = join(ROOT, 'media')

mkdirSync(DATA_DIR, { recursive: true })
mkdirSync(UPLOAD_DIR, { recursive: true })
mkdirSync(MEDIA_DIR, { recursive: true })

export const db = new DatabaseSync(join(DATA_DIR, 'schulungsplattform.db'))

db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

db.exec(`
-- ---------------------------------------------------------------------------
-- Personen und Zugang
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,
  email                 TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  rolle                 TEXT NOT NULL CHECK (rolle IN ('admin','fuehrungskraft','lernender')),
  standort              TEXT NOT NULL,
  abteilung             TEXT NOT NULL,
  position              TEXT,
  eintrittsdatum        TEXT NOT NULL,
  passwort_hash         TEXT,
  passwort_salt         TEXT,
  passwort_wechsel      INTEGER NOT NULL DEFAULT 0,   -- Erst-Login erzwingt Wechsel
  -- Vorbereitung für einen späteren SSO-Anbieter (z.B. Microsoft Entra ID)
  ms_object_id          TEXT,
  ms_upn                TEXT,
  aktiv                 INTEGER NOT NULL DEFAULT 1,
  gesperrt_bis          TEXT,
  fehlversuche          INTEGER NOT NULL DEFAULT 0,
  letzter_login         TEXT,
  erstellt_am           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  erstellt_am TEXT NOT NULL,
  laeuft_ab   TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Inhalte
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  slug                TEXT NOT NULL UNIQUE,
  titel               TEXT NOT NULL,
  untertitel          TEXT,
  beschreibung        TEXT,
  kategorie           TEXT NOT NULL,          -- Pflicht | KI & Digitales | Technik | Sicherheit | Qualität | Zusammenarbeit
  anbieter            TEXT,                   -- z.B. "Interne Akademie" oder ein externer Anbieter
  pflicht             INTEGER NOT NULL DEFAULT 0,
  turnus_monate       INTEGER,                -- NULL = einmalig, sonst wiederkehrend
  vorwarn_tage        INTEGER NOT NULL DEFAULT 30,
  onboarding_frist_tage INTEGER,              -- Frist ab Eintrittsdatum für neue MA
  strenge             TEXT NOT NULL DEFAULT 'frei' CHECK (strenge IN ('streng','frei')),
  dauer_min           INTEGER NOT NULL DEFAULT 0,
  akzent              TEXT NOT NULL DEFAULT 'anthrazit',  -- anthrazit | gruen | blau | rot
  cover_bild          TEXT,                   -- optionaler Upload, sonst typografisches Cover
  cover_motiv         TEXT NOT NULL DEFAULT 'raute',
  demo                INTEGER NOT NULL DEFAULT 1,
  veroeffentlicht     INTEGER NOT NULL DEFAULT 1,
  sortierung          INTEGER NOT NULL DEFAULT 0,
  highlight           INTEGER NOT NULL DEFAULT 0,
  erstellt_am         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quizzes (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  titel                     TEXT NOT NULL,
  bestehensgrenze           INTEGER NOT NULL DEFAULT 80,     -- Prozent
  pool_aktiv                INTEGER NOT NULL DEFAULT 1,
  fragen_anzahl             INTEGER NOT NULL DEFAULT 8,      -- gezogene Fragen bei aktivem Pool
  antworten_mischen         INTEGER NOT NULL DEFAULT 1,
  sperrzeit_stunden         REAL NOT NULL DEFAULT 2,
  max_versuche_zeitraum     INTEGER,                         -- NULL = unbegrenzt
  zeitraum_tage             INTEGER NOT NULL DEFAULT 7,
  harte_obergrenze          INTEGER,                         -- NULL = keine
  aufloesung_nichtbestanden TEXT NOT NULL DEFAULT 'themen'
                            CHECK (aufloesung_nichtbestanden IN ('keine','themen','voll')),
  zeitlimit_min             INTEGER,
  erstellt_am               TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id         INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position          INTEGER NOT NULL,
  titel             TEXT NOT NULL,
  typ               TEXT NOT NULL CHECK (typ IN ('video','text','pdf','link','quiz')),
  dauer_min         INTEGER NOT NULL DEFAULT 0,
  video_datei       TEXT,                     -- Pfad unter /media
  video_laenge_sek  INTEGER,
  text_inhalt       TEXT,                     -- leichtes Markdown
  pdf_datei         TEXT,
  link_url          TEXT,
  link_hinweis      TEXT,
  link_nachweis     INTEGER NOT NULL DEFAULT 0,  -- Zertifikats-Upload verlangt
  quiz_id           INTEGER REFERENCES quizzes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id     INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  typ         TEXT NOT NULL CHECK (typ IN ('single','multi','truefalse','freitext')),
  frage       TEXT NOT NULL,
  thema       TEXT NOT NULL,
  punkte      INTEGER NOT NULL DEFAULT 1,
  erklaerung  TEXT,
  musterloesung TEXT
);

CREATE TABLE IF NOT EXISTS answers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  text        TEXT NOT NULL,
  korrekt     INTEGER NOT NULL DEFAULT 0
);

-- Curriculum: fasst mehrere Kurse zu einem Lernpfad zusammen
CREATE TABLE IF NOT EXISTS curricula (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT NOT NULL UNIQUE,
  titel         TEXT NOT NULL,
  beschreibung  TEXT,
  reihenfolge_erzwungen INTEGER NOT NULL DEFAULT 1,
  akzent        TEXT NOT NULL DEFAULT 'gruen',
  demo          INTEGER NOT NULL DEFAULT 1,
  erstellt_am   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_courses (
  curriculum_id INTEGER NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  course_id     INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  PRIMARY KEY (curriculum_id, course_id)
);

-- ---------------------------------------------------------------------------
-- Zuweisung: an alle, an einen Standort, an eine Abteilung oder an eine Person
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id     INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  curriculum_id INTEGER REFERENCES curricula(id) ON DELETE CASCADE,
  ziel_typ      TEXT NOT NULL CHECK (ziel_typ IN ('alle','standort','abteilung','user')),
  ziel_wert     TEXT,
  pflicht       INTEGER NOT NULL DEFAULT 1,
  erstellt_am   TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Fortschritt, Abschlüsse, Nachweise
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id         INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'laufend' CHECK (status IN ('laufend','abgeschlossen')),
  sekunden_gesehen  INTEGER NOT NULL DEFAULT 0,
  max_position_sek  INTEGER NOT NULL DEFAULT 0,
  prozent           INTEGER NOT NULL DEFAULT 0,
  bestaetigt        INTEGER NOT NULL DEFAULT 0,
  aktualisiert_am   TEXT NOT NULL,
  abgeschlossen_am  TEXT,
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS course_starts (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  gestartet_am TEXT NOT NULL,
  zuletzt_am   TEXT NOT NULL,
  PRIMARY KEY (user_id, course_id)
);

-- Unveränderliche Abschlusshistorie: Korrektur nur als Storno mit Begründung
CREATE TABLE IF NOT EXISTS completions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id         INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  abgeschlossen_am  TEXT NOT NULL,
  gueltig_bis       TEXT,
  prozent           INTEGER,
  quelle            TEXT NOT NULL DEFAULT 'plattform'
                    CHECK (quelle IN ('plattform','praesenz','extern','import')),
  zertifikat_nr     TEXT NOT NULL,
  storniert_am      TEXT,
  storno_grund      TEXT,
  storniert_von     TEXT,
  erstellt_am       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id         INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  course_id       INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  lesson_id       INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  gestartet_am    TEXT NOT NULL,
  beendet_am      TEXT,
  fragen_json     TEXT NOT NULL,     -- gezogene Fragen inkl. Reihenfolge
  antworten_json  TEXT,
  prozent         INTEGER,
  punkte          REAL,
  punkte_moeglich REAL,
  bestanden       INTEGER,
  bewertung_offen INTEGER NOT NULL DEFAULT 0,   -- Freitext wartet auf Admin
  themen_falsch   TEXT
);

CREATE TABLE IF NOT EXISTS quiz_unlocks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id     INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  erteilt_am  TEXT NOT NULL,
  erteilt_von TEXT NOT NULL,
  verbraucht  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS saved_courses (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  erstellt_am TEXT NOT NULL,
  PRIMARY KEY (user_id, course_id)
);

-- Externe Schulungen bei Fremdanbietern: Selbstbestätigung + optionaler Nachweis
CREATE TABLE IF NOT EXISTS external_proofs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id     INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id     INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  bestaetigt_am TEXT NOT NULL,
  datei_name    TEXT,
  datei_pfad    TEXT,
  status        TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen','freigegeben','abgelehnt')),
  geprueft_am   TEXT,
  geprueft_von  TEXT,
  bemerkung     TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        TEXT NOT NULL,
  user_id   TEXT,
  aktion    TEXT NOT NULL,
  objekt    TEXT,
  details   TEXT
);

-- Benachrichtigungseinstellungen je Person und Kanal
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_aktiv   INTEGER NOT NULL DEFAULT 1,
  push_aktiv    INTEGER NOT NULL DEFAULT 0,
  inapp_aktiv   INTEGER NOT NULL DEFAULT 1,
  -- sofort | taeglich | woechentlich: Sammelmail statt Einzelmails
  rhythmus      TEXT NOT NULL DEFAULT 'woechentlich'
                CHECK (rhythmus IN ('sofort','taeglich','woechentlich')),
  ereignisse    TEXT NOT NULL DEFAULT '["frist","zuweisung","ergebnis"]',
  aktualisiert_am TEXT NOT NULL
);

-- Zugestellte bzw. anstehende Benachrichtigungen (In-App-Posteingang)
CREATE TABLE IF NOT EXISTS notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ereignis    TEXT NOT NULL,
  titel       TEXT NOT NULL,
  text        TEXT,
  ziel        TEXT,
  erstellt_am TEXT NOT NULL,
  gelesen_am  TEXT
);

-- ---------------------------------------------------------------------------
-- Performance: Ziele, Reviews, Kompetenzen, Stimmungsbild
--
-- Bewusst eigene Tabellen statt Anbau an die Schulungen: Zielerreichung und
-- Beurteilung sind arbeitsrechtlich etwas anderes als ein Schulungsnachweis
-- und brauchen eigene Fristen, eigene Sichtbarkeit und eigene Historie.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS goals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titel         TEXT NOT NULL,
  beschreibung  TEXT,
  -- messbar | binaer: Zahlenziel oder erledigt/nicht erledigt
  art           TEXT NOT NULL DEFAULT 'messbar' CHECK (art IN ('messbar','binaer')),
  einheit       TEXT,
  startwert     REAL NOT NULL DEFAULT 0,
  zielwert      REAL NOT NULL DEFAULT 100,
  istwert       REAL NOT NULL DEFAULT 0,
  faellig_am    TEXT NOT NULL,
  gewichtung    INTEGER NOT NULL DEFAULT 1,
  -- Verknüpfung zu einer Schulung: Fortschritt zählt dann automatisch mit
  course_id     INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'laufend'
                CHECK (status IN ('laufend','erreicht','verfehlt','abgebrochen')),
  erstellt_von  TEXT NOT NULL,
  erstellt_am   TEXT NOT NULL,
  abgeschlossen_am TEXT
);

CREATE TABLE IF NOT EXISTS goal_updates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id     INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  wert        REAL NOT NULL,
  kommentar   TEXT,
  von_user    TEXT NOT NULL,
  erstellt_am TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS competencies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  beschreibung TEXT,
  kategorie   TEXT,
  sortierung  INTEGER NOT NULL DEFAULT 0
);

-- Reviews stehen vor competency_ratings, weil die Bewertungen darauf verweisen
CREATE TABLE IF NOT EXISTS reviews (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zeitraum        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'offen'
                  CHECK (status IN ('offen','selbst_eingereicht','abgeschlossen')),
  -- 1 bis 5, zahlt auf die Heatmap ein
  bewertung       INTEGER CHECK (bewertung BETWEEN 1 AND 5),
  zielerreichung  INTEGER,
  staerken        TEXT,
  entwicklung     TEXT,
  selbst_text     TEXT,
  gespraech_am    TEXT,
  fuehrungskraft  TEXT,
  erstellt_am     TEXT NOT NULL,
  abgeschlossen_am TEXT
);

-- Bewertung einer Kompetenz: 0 bis 4, je Person und Runde
CREATE TABLE IF NOT EXISTS competency_ratings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competency_id INTEGER NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  review_id     INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
  stufe         INTEGER NOT NULL CHECK (stufe BETWEEN 0 AND 4),
  soll_stufe    INTEGER CHECK (soll_stufe BETWEEN 0 AND 4),
  quelle        TEXT NOT NULL DEFAULT 'fuehrungskraft'
                CHECK (quelle IN ('fuehrungskraft','selbst')),
  erstellt_am   TEXT NOT NULL
);

-- Stimmungsbild: anonym auswertbar, aber je Person nur einmal pro Runde
CREATE TABLE IF NOT EXISTS survey_answers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  runde       TEXT NOT NULL,
  frage       TEXT NOT NULL,
  wert        INTEGER NOT NULL CHECK (wert BETWEEN 1 AND 5),
  erstellt_am TEXT NOT NULL,
  UNIQUE (user_id, runde, frage)
);

CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id, position);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, gelesen_am);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON competency_ratings(user_id, competency_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_user ON completions(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON quiz_attempts(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
`)

/* ---------------------------------------------------------------------------
   Nachträgliche Spalten.
   `CREATE TABLE IF NOT EXISTS` lässt bestehende Tabellen unangetastet - neue
   Felder müssen deshalb einzeln ergänzt werden. Das hier läuft bei jedem Start
   und ist absichtlich idempotent, damit bestehende Datenbanken (mit echten
   Fortschritten) nicht neu aufgebaut werden müssen.
--------------------------------------------------------------------------- */
function spalteErgaenzen(tabelle, spalte, definition) {
  const vorhanden = db.prepare(`PRAGMA table_info(${tabelle})`).all().some((s) => s.name === spalte)
  if (!vorhanden) db.exec(`ALTER TABLE ${tabelle} ADD COLUMN ${spalte} ${definition}`)
}

// Gliederung des Kurses: Kapitel und Unterkapitel gruppieren die Lektionen
spalteErgaenzen('lessons', 'kapitel', "TEXT NOT NULL DEFAULT ''")
spalteErgaenzen('lessons', 'unterkapitel', 'TEXT')
// Sichtbarkeit je Lektion: Inhalte lassen sich einzeln zurückhalten
spalteErgaenzen('lessons', 'sichtbar', 'INTEGER NOT NULL DEFAULT 1')
// Weitere Inhaltstypen
spalteErgaenzen('lessons', 'audio_datei', 'TEXT')
spalteErgaenzen('lessons', 'youtube_id', 'TEXT')
spalteErgaenzen('lessons', 'scorm_paket', 'TEXT')
// Entwurf vs. veröffentlicht auf Kursebene
spalteErgaenzen('courses', 'entwurf', 'INTEGER NOT NULL DEFAULT 0')
spalteErgaenzen('courses', 'aktualisiert_am', 'TEXT')

/**
 * Die CHECK-Bedingung auf lessons.typ lässt sich in SQLite nicht ändern - dafür
 * muss die Tabelle neu gebaut werden. Passiert nur einmal.
 *
 * Erkennung bewusst über den Wert in Anführungszeichen: die Spalte heißt
 * `youtube_id`, ein Test auf das blanke Wort "youtube" würde also immer
 * anschlagen und die Migration nie ausführen.
 */
const lessonsSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='lessons'").get()?.sql ?? ''
if (!lessonsSql.includes("'youtube'")) {
  const spalten = db
    .prepare('PRAGMA table_info(lessons)')
    .all()
    .map((s) => s.name)
    .join(', ')

  db.exec('PRAGMA foreign_keys = OFF')
  db.exec(`
    CREATE TABLE lessons_neu (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id         INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      position          INTEGER NOT NULL,
      titel             TEXT NOT NULL,
      typ               TEXT NOT NULL CHECK (typ IN ('video','audio','text','pdf','link','quiz','youtube','scorm')),
      dauer_min         INTEGER NOT NULL DEFAULT 0,
      video_datei       TEXT,
      video_laenge_sek  INTEGER,
      text_inhalt       TEXT,
      pdf_datei         TEXT,
      link_url          TEXT,
      link_hinweis      TEXT,
      link_nachweis     INTEGER NOT NULL DEFAULT 0,
      quiz_id           INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
      kapitel           TEXT NOT NULL DEFAULT '',
      unterkapitel      TEXT,
      sichtbar          INTEGER NOT NULL DEFAULT 1,
      audio_datei       TEXT,
      youtube_id        TEXT,
      scorm_paket       TEXT
    );
    INSERT INTO lessons_neu (${spalten}) SELECT ${spalten} FROM lessons;
    DROP TABLE lessons;
    ALTER TABLE lessons_neu RENAME TO lessons;
    CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id, position);
  `)
  db.exec('PRAGMA foreign_keys = ON')
  console.log('Datenbank: Lektionstypen um Audio, YouTube und SCORM erweitert.')
}

export default db
