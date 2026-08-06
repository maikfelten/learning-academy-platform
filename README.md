# Learning Academy Platform

**Self-hosted training platform for mandatory workplace training — recurring due dates, configurable
quizzes and PDF certificates. Runs locally from a single Node process. No cloud, no licence fees, no
database server to install.**

Built for companies that have to run yearly instruction on data protection, fire safety, first aid
and the like, and that need to prove it to customers, auditors and insurers — and that currently
maintain spreadsheets for exactly that.

> **Language note:** the user interface and the sample course content are **German**. Code, comments
> and documentation are English. See [Localisation](#localisation).

```bash
npm install && npm run build && npm start
# → http://localhost:5180, sign in with admin@example.com / Admin2026demo
```

---

## Contents

- [What it does](#what-it-does)
- [Quick start](#quick-start)
- [Sample accounts](#sample-accounts)
- [How it is built](#how-it-is-built)
- [Adding your own content](#adding-your-own-content)
- [Configuration](#configuration)
- [What it deliberately does not do](#what-it-deliberately-does-not-do)
- [Before going live](#before-going-live)
- [Localisation](#localisation)
- [Licence](#licence)

---

## What it does

### For learners

| | |
|---|---|
| **Shelf-style home** | Courses as typographic covers, a continue-learning list with progress, recommendations, search and categories |
| **Mandatory training up front** | Its own section with traffic-light status, deadlines and renewal intervals — overdue items sort to the top |
| **Four content types** | Video, text/image, PDF and external training at third-party providers |
| **Quizzes with real rules** | Four question types, question pools, pass marks, cooldowns, attempt quotas |
| **Certificates in the profile** | A PDF per completion, expiry date, full history |
| **Works on phones** | Usable on shared devices on the shop floor |

### For training managers

- **Roles:** admin (full control), manager/HR (read-only, **without** individual scores), learner
- **Department overview:** compliance rate per site, list of people with overdue training
- **Qualification matrix as CSV:** name, course, status, score, completion and expiry date —
  admin only
- **Group assignment:** to everyone, to a site, to a department or to individuals

### Due-date logic

Due dates roll **from each person's own completion date** — the logic auditors expect ("last
instructed on …, valid until …", verifiable per person):

- Renewal interval in months per course (data protection every 12, first aid every 24, …)
- Advance warning in days — a course turns "due soon" early enough to act
- Onboarding deadline counted from the joining date: new starters get X days
- Expired certificates automatically start a new cycle; the history stays intact

### Quiz engine

Every rule is configurable **per quiz** — from a relaxed knowledge check to a strict exam:

| Setting | Example |
|---|---|
| Question types | single choice, multiple choice, true/false, free text |
| Question pool | draw 8 questions out of 12, shuffle the answer options |
| Pass mark | 80 % — points per question are configurable |
| Time limit | 15 minutes, then automatic submission |
| Cooldown | 2 hours between failed attempts |
| Attempt quota | at most 3 attempts within 7 days |
| Hard cap | after 5 attempts only a training manager can unlock further tries |
| Feedback | after failing only the **topics** of the wrong answers — the full breakdown appears once the quiz is passed |

The three sample quizzes show the range: unlimited retries without cooldown, a question pool with a
weekly quota, and an exam with a free-text question and a hard cap.

### Strictness

Configurable per course, because mandatory and optional training need different rules:

- **`streng`** (mandatory): lessons in order, video watched to 95 %, no seeking on the first run,
  quiz last
- **`frei`** (optional): free navigation, nothing blocks

---

## Quick start

**Requirement:** Node.js 22 or newer. Nothing else — no database, no Docker, no compiler.

```bash
git clone https://github.com/maikfelten/learning-academy-platform.git
cd learning-academy-platform
npm install
npm run build
npm start
```

The platform runs on **http://localhost:5180**. On first start it creates the database and fills it
with sample content.

On Windows, double-click **`start-windows.cmd`** (installs, builds and starts). On macOS and Linux
run `./start.sh`.

### Commands

| Command | Effect |
|---|---|
| `npm run dev` | Development mode with hot reload (UI on 5173, API on 5180) |
| `npm run build` | Build the interface |
| `npm start` | Start the server (serves the built interface **and** the API on one port) |
| `npm run seed` | Rebuild the sample data — **wipes all progress** |

---

## Sample accounts

Available behind "Beispielzugänge" on the sign-in screen — one click fills the form.
All people are fictitious.

| Role | Email | Password | Shows |
|---|---|---|---|
| Admin | `admin@example.com` | `Admin2026demo` | The full picture: valid certificates, one due soon, one overdue and already started |
| Manager | `lena.brandt@example.com` | `Demo2026start` | Department overview without individual scores |
| Learner (new) | `tobias.krayer@example.com` | `Demo2026start` | Recently joined, onboarding deadlines running |
| First sign-in | `pawel.nowak@example.com` | `Willkommen2026` | Forced password change |
| Laggard | `jens.ohlendorf@example.com` | `Demo2026start` | Several overdue refreshers |

---

## How it is built

```
server/
  index.js        HTTP server (node:http), static files, range support for video
  api.js          endpoints and role checks
  repo.js         the only layer that contains SQL — the place to swap in Postgres
  db.js           schema (node:sqlite, a single file under data/)
  auth.js         password hashing (scrypt), password rules
  config.js       platform name, organisation, support address, certificate prefix
  certificate.js  PDF certificate (pdf-lib)
  seed.js         sample people, courses, quizzes and a plausible learning history
src/
  App.jsx         routing and auth state
  components/     AppShell, CourseCover, CourseCard, LessonVideo, QuizRunner, Markdown, ui
  pages/          login, password change, library, course, profile, certificates, department, settings
  index.css       design tokens — the place to change the colour scheme
data/             SQLite file and uploaded proofs (not in the repository)
media/            course videos and PDFs (not in the repository)
public/brand/     logo, brand mark, favicon — replace with your own
```

**Frontend:** React 19, Vite, Tailwind 4.
**Backend:** Node built-ins only (`node:http`, `node:sqlite`, `node:crypto`) plus `pdf-lib` for the
certificate. No native dependencies, no toolchain zoo.

Two decisions explain the rest:

1. **All SQL lives in `server/repo.js`.** The interface knows no tables. Moving to Postgres means
   replacing one file.
2. **Colours run through semantic variables** (`--surface-*`, `--text-*`). A light mode can be added
   without rebuilding the interface.

---

## Adding your own content

Until there is an admin interface (see
[what it does not do](#what-it-deliberately-does-not-do)), courses and quizzes live as data
structures in **`server/seed.js`** — the `KURSE` and `CURRICULA` lists. A course looks like this:

```js
{
  slug: 'datenschutz-dsgvo',
  titel: 'Datenschutz & DSGVO',
  untertitel: 'Personenbezogene Daten im Arbeitsalltag',
  beschreibung: '…',
  kategorie: 'Pflichtschulungen',
  anbieter: 'Interne Akademie',
  pflicht: 1,
  turnus_monate: 12,          // null = one-off
  vorwarn_tage: 30,           // advance warning in days
  onboarding_frist_tage: 14,  // deadline from the joining date
  strenge: 'streng',          // 'streng' | 'frei'
  akzent: 'anthrazit',        // anthrazit | gruen | blau | rot
  cover_motiv: 'raster',      // raute | raster | linien | welle
  lektionen: [
    { titel: 'Grundlagen', typ: 'video', dauer_min: 10,
      video_datei: 'datenschutz/grundlagen.mp4', video_laenge_sek: 600 },
    { titel: 'Die sechs Grundsätze', typ: 'text', dauer_min: 7, text_inhalt: '## …' },
    { titel: 'Merkblatt', typ: 'pdf', dauer_min: 5, pdf_datei: 'datenschutz/merkblatt.pdf' },
    { titel: 'Abschlussquiz', typ: 'quiz', dauer_min: 15, quiz: QUIZ_DATENSCHUTZ },
  ],
}
```

Then run:

```bash
npm run seed
```

> **Careful:** `npm run seed` rebuilds the database from scratch and wipes all progress. It is not
> meant for a running installation.

**Videos and PDFs** belong under `media/`; the path in a lesson is relative to it
(`media/datenschutz/grundlagen.mp4` → `video_datei: 'datenschutz/grundlagen.mp4'`).
If no video file exists, the platform shows a placeholder player with a real timeline — the
95 percent rule and the seek lock behave exactly as they would with a real file.

**Lesson texts** understand a small markdown subset: headings, lists, tables, quotes, bold, code.
HTML is deliberately not interpreted.

---

## Configuration

Everything that differs between organisations lives in `server/config.js` and can be overridden with
environment variables — template: **`.env.example`**.

| Variable | Default | Effect |
|---|---|---|
| `PLATTFORM_NAME` | `Learning Academy` | Page title, login screen, loading state |
| `ORGANISATION` | `Beispiel GmbH` | Certificate, login text, department overview |
| `SUPPORT_EMAIL` | `schulung@example.com` | "Forgot password" hint |
| `EMAIL_DOMAIN` | `example.com` | Placeholder in the sign-in form |
| `CLAIM` | empty | Optional tagline in the certificate footer |
| `ZERTIFIKAT_PRAEFIX` | `ZERT` | Number range, e.g. `ZERT-2026-000123` |
| `PORT` | `5180` | Server port |

**Changing the look:**

- **Colours and typeface:** `src/index.css`, the `@theme` block — swap base tone, accent and
  secondary colour, everything else follows
- **Logo, brand mark, favicon:** replace the files in `public/brand/` (`logo.svg`, `mark.svg`,
  `favicon.svg`); a `logo.png` placed there is also embedded into the certificate
- **Course covers:** four motifs ship with the project; add your own shapes in
  `src/components/CourseCover.jsx`, function `Motiv`

---

## What it deliberately does not do

Honesty before feature lists — this is **not** included:

- **Admin interface.** Courses, quizzes, curricula and people are maintained in `server/seed.js`.
  The editor is the next big step.
- **Email reminders.** Not possible locally without a mail server. Reminders happen in the app, via
  the bell and the overdue list.
- **Single sign-on.** Authentication is email and password. The data model holds fields for an
  external identity, but nothing is wired up.
- **Approval of external proofs.** After self-declaration (plus upload) an external course counts as
  completed immediately; the proof stays visible as "awaiting approval". Review by a training
  manager is missing — for an audit this is the gap to close.
- **Grading of free-text answers.** An attempt containing free text goes to "under review" and
  blocks further attempts until someone grades it — the interface for that is missing.
- **SCORM.** Purchased course packages cannot be played. External training works through a link plus
  proof upload.
- **Multi-language interface.** See below.

---

## Before going live

These points are not optional:

1. **Data protection and worker representation.** Training records and quiz results are personal
   performance data. Legal basis, purpose limitation, a deletion concept and — depending on country
   and company size — involvement of the data protection officer and the works council belong
   settled **before** real people are entered. In Germany this is a works council matter under
   § 87 BetrVG.
2. **Remove the sample data.** Replace `server/seed.js` with your own content and set `demo: 0`
   (otherwise the sample notice and the certificate watermark remain). Delete the `DEMO_ZUGAENGE`
   block in `src/pages/LoginPage.jsx`.
3. **Have the content approved.** The shipped texts and quiz questions are samples and do not
   replace real instruction.
4. **Harden the deployment.** The server binds to `127.0.0.1` and is meant for local use. Running it
   on a network needs HTTPS, a backup of the file under `data/` and a concept for passwords and
   roles.

---

## Localisation

The interface strings and the sample course content are German, with informal address ("du"). Code,
comments and documentation are English.

There is no i18n layer yet. Translating the interface means editing the strings in `src/pages/` and
`src/components/`; translating the content means editing `server/seed.js`. Pull requests that
introduce a proper i18n layer are welcome.

---

## Technical overview

| | |
|---|---|
| Node | ≥ 22 (uses `node:sqlite`) |
| Frontend | React 19, Vite 6, Tailwind 4, lucide-react |
| Backend | node:http, node:sqlite, node:crypto, pdf-lib |
| Database | SQLite, one file under `data/` |
| Dependencies | 85 packages, no native compilation |

---

## Licence

[MIT](LICENSE) — free to use, including commercially. Without warranty; the shipped training content
is sample material and has not been reviewed by subject matter experts.
