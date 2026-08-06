/**
 * Persistence.
 *
 * Deliberately built on Node's built-in `node:sqlite`: no native dependency, no
 * compiler, a single file under data/schulungsplattform.db.
 * Every query lives in server/repo.js, so moving to Postgres later touches that
 * one layer and never the user interface.
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
-- People and access
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
  passwort_wechsel      INTEGER NOT NULL DEFAULT 0,   -- first sign-in forces a change
  -- Prepared for a later move to an SSO identity provider (e.g. Microsoft Entra ID)
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
-- Content
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  slug                TEXT NOT NULL UNIQUE,
  titel               TEXT NOT NULL,
  untertitel          TEXT,
  beschreibung        TEXT,
  kategorie           TEXT NOT NULL,          -- see KATEGORIEN in server/api.js
  anbieter            TEXT,                   -- e.g. "Interne Akademie" or an external provider
  pflicht             INTEGER NOT NULL DEFAULT 0,
  turnus_monate       INTEGER,                -- NULL = one-off, otherwise recurring
  vorwarn_tage        INTEGER NOT NULL DEFAULT 30,
  onboarding_frist_tage INTEGER,              -- deadline counted from the joining date
  strenge             TEXT NOT NULL DEFAULT 'frei' CHECK (strenge IN ('streng','frei')),
  dauer_min           INTEGER NOT NULL DEFAULT 0,
  akzent              TEXT NOT NULL DEFAULT 'anthrazit',  -- anthrazit | gruen | blau | rot
  cover_bild          TEXT,                   -- optional upload, otherwise a typographic cover
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
  bestehensgrenze           INTEGER NOT NULL DEFAULT 80,     -- percent
  pool_aktiv                INTEGER NOT NULL DEFAULT 1,
  fragen_anzahl             INTEGER NOT NULL DEFAULT 8,      -- questions drawn when the pool is on
  antworten_mischen         INTEGER NOT NULL DEFAULT 1,
  sperrzeit_stunden         REAL NOT NULL DEFAULT 2,
  max_versuche_zeitraum     INTEGER,                         -- NULL = unlimited
  zeitraum_tage             INTEGER NOT NULL DEFAULT 7,
  harte_obergrenze          INTEGER,                         -- NULL = none
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
  video_datei       TEXT,                     -- path below /media
  video_laenge_sek  INTEGER,
  text_inhalt       TEXT,                     -- lightweight markdown
  pdf_datei         TEXT,
  link_url          TEXT,
  link_hinweis      TEXT,
  link_nachweis     INTEGER NOT NULL DEFAULT 0,  -- requires a certificate upload
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

-- Curriculum: groups several courses into one learning path
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
-- Assignment: to everyone, to a site, to a department or to a single person
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
-- Progress, completions, certificates
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

-- Immutable completion history: corrections only as a cancellation with a reason
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
  fragen_json     TEXT NOT NULL,     -- drawn questions including their order
  antworten_json  TEXT,
  prozent         INTEGER,
  punkte          REAL,
  punkte_moeglich REAL,
  bestanden       INTEGER,
  bewertung_offen INTEGER NOT NULL DEFAULT 0,   -- free text is awaiting review
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

-- External training at third-party providers: self-declaration + optional proof
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

CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id, position);
CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_user ON completions(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON quiz_attempts(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
`)

export default db
