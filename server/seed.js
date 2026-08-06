/**
 * Sample data.
 *
 * Fills an empty database with people, courses, quizzes and a plausible learning
 * history, so the platform is not blank on first start.
 *
 * WARNING: all course content and quiz questions here are SAMPLES. They are not
 * reviewed by any subject matter expert and do not replace real training. Replace
 * them with your own approved content before going live and set `demo: 0` - that
 * removes every sample notice including the watermark on the certificate.
 *
 * All people are fictitious, every address is on example.com.
 *
 * To add your own content: edit the KURSE and CURRICULA lists, then run
 * `npm run seed` (careful: rebuilds the database and wipes existing progress).
 *
 * Content is written in German because the interface is German - see README.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { db, MEDIA_DIR } from './db.js'
import { hashPassword } from './auth.js'
import { addDays, addMonths, nowIso, uuid, zertifikatNummer } from './util.js'
import { konfiguration } from './config.js'

const JETZT = nowIso()
const heuteMinus = (tage) => addDays(JETZT, -tage)

/* ============================================================ Sample people */

const PERSONEN = [
  {
    email: 'admin@example.com',
    name: 'Alex Beispiel',
    rolle: 'admin',
    standort: 'Werk Nord',
    abteilung: 'IT',
    position: 'Schulungsleitung',
    eintritt: '2023-09-01',
    passwort: 'Admin2026demo',
  },
  {
    email: 'lena.brandt@example.com',
    name: 'Lena Brandt',
    rolle: 'fuehrungskraft',
    standort: 'Werk Nord',
    abteilung: 'Montage',
    position: 'Teamleitung Montage',
    eintritt: '2021-04-12',
    passwort: 'Demo2026start',
  },
  {
    email: 'sofia.reinke@example.com',
    name: 'Sofia Reinke',
    rolle: 'fuehrungskraft',
    standort: 'Werk Süd',
    abteilung: 'Qualität',
    position: 'Leitung QS',
    eintritt: '2020-02-03',
    passwort: 'Demo2026start',
  },
  {
    email: 'tobias.krayer@example.com',
    name: 'Tobias Krayer',
    rolle: 'lernender',
    standort: 'Werk Nord',
    abteilung: 'Montage',
    position: 'Industriemechaniker',
    eintritt: heuteMinus(16).slice(0, 10),
    passwort: 'Demo2026start',
  },
  {
    email: 'pawel.nowak@example.com',
    name: 'Pawel Nowak',
    rolle: 'lernender',
    standort: 'Werk Nord',
    abteilung: 'Montage',
    position: 'Monteur',
    eintritt: heuteMinus(3).slice(0, 10),
    passwort: 'Willkommen2026',
    wechsel: 1,
  },
  {
    email: 'miriam.sander@example.com',
    name: 'Miriam Sander',
    rolle: 'lernender',
    standort: 'Werk Süd',
    abteilung: 'Qualität',
    position: 'Prüftechnikerin',
    eintritt: '2024-03-01',
    passwort: 'Demo2026start',
  },
  {
    email: 'jens.ohlendorf@example.com',
    name: 'Jens Ohlendorf',
    rolle: 'lernender',
    standort: 'Werk Süd',
    abteilung: 'Werkstatt',
    position: 'Schweißfachmann',
    eintritt: '2019-05-02',
    passwort: 'Demo2026start',
  },
  {
    email: 'aylin.deveci@example.com',
    name: 'Aylin Deveci',
    rolle: 'lernender',
    standort: 'Werk Nord',
    abteilung: 'Verwaltung',
    position: 'Auftragsabwicklung',
    eintritt: '2025-11-10',
    passwort: 'Demo2026start',
  },
  {
    email: 'dennis huebner@example.com'.replace(' ', '.'),
    name: 'Dennis Hübner',
    rolle: 'lernender',
    standort: 'Werk Nord',
    abteilung: 'Konstruktion',
    position: 'Technischer Zeichner',
    eintritt: '2022-08-15',
    passwort: 'Demo2026start',
  },
  {
    email: 'kerstin.maas@example.com',
    name: 'Kerstin Maas',
    rolle: 'lernender',
    standort: 'Werk Süd',
    abteilung: 'Werkstatt',
    position: 'Fertigungsplanung',
    eintritt: '2023-01-09',
    passwort: 'Demo2026start',
  },
]

/* ========================================================= Quiz definitions */

const q = (typ, frage, thema, antworten, erklaerung = null, punkte = 1) => ({
  typ,
  frage,
  thema,
  punkte,
  erklaerung,
  antworten,
})

const QUIZ_DATENSCHUTZ = {
  titel: 'Abschlussquiz Datenschutz & DSGVO',
  bestehensgrenze: 80,
  pool_aktiv: 1,
  fragen_anzahl: 8,
  antworten_mischen: 1,
  sperrzeit_stunden: 2,
  max_versuche_zeitraum: 3,
  zeitraum_tage: 7,
  harte_obergrenze: null,
  aufloesung_nichtbestanden: 'themen',
  zeitlimit_min: 15,
  fragen: [
    q('single', 'Was sind personenbezogene Daten?', 'Grundbegriffe', [
      ['Alle Informationen, die sich auf eine identifizierbare natürliche Person beziehen', 1],
      ['Nur Name und Adresse', 0],
      ['Nur Daten, die in einer Datenbank gespeichert sind', 0],
      ['Nur Daten von Kunden, nicht von Beschäftigten', 0],
    ]),
    q('multi', 'Welche Angaben gehören zu den besonders geschützten Datenkategorien?', 'Grundbegriffe', [
      ['Gesundheitsdaten', 1],
      ['Religionszugehörigkeit', 1],
      ['Firmen-Telefonnummer', 0],
      ['Gewerkschaftszugehörigkeit', 1],
    ]),
    q('truefalse', 'Eine E-Mail mit Kundendaten an den falschen Empfänger ist eine meldepflichtige Datenschutzverletzung.', 'Datenschutzvorfälle', [
      ['Richtig', 1],
      ['Falsch', 0],
    ], 'Jede unbeabsichtigte Offenlegung ist ein Vorfall und muss intern gemeldet werden - die Bewertung der Meldepflicht übernimmt der Datenschutzbeauftragte.'),
    q('single', 'Wie schnell muss ein Datenschutzvorfall intern gemeldet werden?', 'Datenschutzvorfälle', [
      ['Sofort, ohne Umwege über Dritte', 1],
      ['Innerhalb von 30 Tagen', 0],
      ['Nur, wenn ein Schaden entstanden ist', 0],
      ['Am Monatsende gesammelt', 0],
    ], 'Die Frist gegenüber der Aufsichtsbehörde beträgt 72 Stunden - intern muss die Meldung deshalb sofort erfolgen.'),
    q('single', 'Was bedeutet Datenminimierung im Arbeitsalltag?', 'Grundsätze', [
      ['Nur die Daten erheben und speichern, die für den Zweck nötig sind', 1],
      ['Möglichst viele Daten sammeln, um vorbereitet zu sein', 0],
      ['Daten nur in der Cloud speichern', 0],
      ['Daten alle drei Jahre neu erheben', 0],
    ]),
    q('multi', 'Welche Maßnahmen schützen Daten am Arbeitsplatz?', 'Technische Maßnahmen', [
      ['Bildschirm sperren beim Verlassen des Platzes', 1],
      ['Unterlagen mit Personendaten nicht offen liegen lassen', 1],
      ['Passwörter im Team teilen, damit alle arbeiten können', 0],
      ['Datenträger verschlüsseln', 1],
    ]),
    q('truefalse', 'Fotos von Kolleginnen und Kollegen dürfen ohne Rückfrage auf Social Media veröffentlicht werden.', 'Grundsätze', [
      ['Richtig', 0],
      ['Falsch', 1],
    ], 'Ein Foto ist ein personenbezogenes Datum. Ohne Einwilligung oder andere Rechtsgrundlage ist die Veröffentlichung nicht zulässig.'),
    q('single', 'Wie lange dürfen personenbezogene Daten gespeichert werden?', 'Grundsätze', [
      ['So lange, wie es für den Zweck oder wegen gesetzlicher Fristen erforderlich ist', 1],
      ['Unbegrenzt, solange sie nicht veröffentlicht werden', 0],
      ['Maximal ein Jahr', 0],
      ['Bis die Festplatte voll ist', 0],
    ]),
    q('single', 'Ein Kunde möchte wissen, welche Daten das Unternehmen über ihn gespeichert hat. Was gilt?', 'Betroffenenrechte', [
      ['Er hat ein Auskunftsrecht; die Anfrage geht sofort an den Datenschutzbeauftragten', 1],
      ['Auskunft wird nur gegen Gebühr erteilt', 0],
      ['Die Anfrage kann ignoriert werden, wenn kein Vertrag besteht', 0],
      ['Nur Behörden dürfen Auskunft verlangen', 0],
    ]),
    q('multi', 'Was ist beim Versand personenbezogener Daten per E-Mail zu beachten?', 'Technische Maßnahmen', [
      ['Empfänger genau prüfen', 1],
      ['Anhänge mit sensiblen Daten verschlüsseln', 1],
      ['Immer alle Kollegen auf CC setzen', 0],
      ['Beim Serienversand BCC statt CC verwenden', 1],
    ]),
    q('truefalse', 'Auch dienstliche Daten auf dem privaten Handy unterliegen dem Datenschutz.', 'Technische Maßnahmen', [
      ['Richtig', 1],
      ['Falsch', 0],
    ]),
    q('single', 'Wer ist im Unternehmen für die Einhaltung des Datenschutzes verantwortlich?', 'Grundbegriffe', [
      ['Alle Beschäftigten im eigenen Arbeitsbereich, unterstützt durch den Datenschutzbeauftragten', 1],
      ['Ausschließlich die IT-Abteilung', 0],
      ['Ausschließlich die Geschäftsführung', 0],
      ['Der Datenschutzbeauftragte allein', 0],
    ]),
  ],
}

const QUIZ_FOD = {
  titel: 'Abschlussquiz Fremdkörper-Prävention',
  bestehensgrenze: 85,
  pool_aktiv: 0,
  fragen_anzahl: 8,
  antworten_mischen: 1,
  sperrzeit_stunden: 0,
  max_versuche_zeitraum: null,
  zeitraum_tage: 7,
  harte_obergrenze: null,
  aufloesung_nichtbestanden: 'themen',
  zeitlimit_min: null,
  fragen: [
    q('single', 'Wofür steht die Abkürzung FOD?', 'Grundlagen', [
      ['Foreign Object Damage - Schaden durch Fremdkörper', 1],
      ['Final Operational Documentation', 0],
      ['Fixed Order Delivery', 0],
      ['Flight Operations Department', 0],
    ]),
    q('multi', 'Was ist ein typischer Fremdkörper (FO) in der Luftfahrtfertigung?', 'Grundlagen', [
      ['Abgebrochener Bohrerspitzenrest', 1],
      ['Kabelbinderreste', 1],
      ['Eine vergessene Ratsche im Strukturbauteil', 1],
      ['Ein sauber verstautes Werkzeug im Schaumeinsatz', 0],
    ]),
    q('truefalse', 'FOD-Schäden können sicherheitskritische Folgen für das Luftfahrzeug haben.', 'Grundlagen', [
      ['Richtig', 1],
      ['Falsch', 0],
    ]),
    q('single', 'Was ist unmittelbar zu tun, wenn ein Werkzeug fehlt?', 'Verhalten', [
      ['Arbeit unterbrechen, Vorgesetzten informieren, gezielt suchen und dokumentieren', 1],
      ['Weiterarbeiten und am Ende der Schicht melden', 0],
      ['Ersatzwerkzeug nehmen und nichts sagen', 0],
      ['Nur melden, wenn das Bauteil danach auffällt', 0],
    ]),
    q('multi', 'Welche Maßnahmen gehören zur FOD-Prävention am Arbeitsplatz?', 'Prävention', [
      ['Werkzeugkontrolle vor und nach der Tätigkeit (Schattenbretter, Zählen)', 1],
      ['Clean-as-you-go: laufend aufräumen statt am Ende', 1],
      ['Taschen von Arbeitskleidung mit Kleinteilen füllen', 0],
      ['Abdecken offener Bauteilöffnungen', 1],
    ]),
    q('single', 'Was bedeutet die Regel "Clean as you go"?', 'Prävention', [
      ['Verunreinigungen und Reste sofort während der Arbeit entfernen', 1],
      ['Einmal pro Woche gründlich reinigen', 0],
      ['Reinigung ist Aufgabe des Reinigungsdienstes', 0],
      ['Erst nach Abschluss der Endmontage reinigen', 0],
    ]),
    q('truefalse', 'Persönliche Gegenstände wie Schmuck oder loses Kleingeld sind in FOD-Bereichen unkritisch.', 'Verhalten', [
      ['Richtig', 0],
      ['Falsch', 1],
    ], 'Auch persönliche Gegenstände sind Fremdkörper. In FOD-kritischen Bereichen gelten dafür klare Vorgaben.'),
    q('single', 'Wer ist für FOD-Prävention verantwortlich?', 'Verhalten', [
      ['Jede Person im Bereich, unabhängig von Funktion und Firma', 1],
      ['Nur die Qualitätssicherung', 0],
      ['Nur der Auftraggeber', 0],
      ['Nur die Schichtleitung', 0],
    ]),
    q('multi', 'Was gehört zu einer FOD-Meldung?', 'Meldewesen', [
      ['Fundort und Fundzeit', 1],
      ['Art des Fremdkörpers', 1],
      ['Betroffenes Bauteil bzw. Zone', 1],
      ['Schuldzuweisung an eine Person', 0],
    ]),
    q('single', 'Eine FOD-Meldung führt in erster Linie zu …', 'Meldewesen', [
      ['einer Ursachenanalyse und Verbesserung der Abläufe', 1],
      ['einer Abmahnung des Melders', 0],
      ['einem Produktionsstopp für vier Wochen', 0],
      ['keiner weiteren Maßnahme', 0],
    ], 'Eine offene Meldekultur ist Voraussetzung für FOD-Prävention - Meldungen dürfen nie sanktioniert werden.'),
  ],
}

const QUIZ_ITSEC = {
  titel: 'Abschlussquiz IT-Security & Phishing',
  bestehensgrenze: 80,
  pool_aktiv: 1,
  fragen_anzahl: 8,
  antworten_mischen: 1,
  sperrzeit_stunden: 2,
  max_versuche_zeitraum: null,
  zeitraum_tage: 7,
  harte_obergrenze: 5,
  aufloesung_nichtbestanden: 'themen',
  zeitlimit_min: 12,
  fragen: [
    q('multi', 'Welche Merkmale deuten auf eine Phishing-Mail hin?', 'Phishing erkennen', [
      ['Dringlichkeit und Drohung mit Konsequenzen', 1],
      ['Absenderadresse weicht minimal vom Original ab', 1],
      ['Aufforderung, Zugangsdaten über einen Link einzugeben', 1],
      ['Die Mail kommt von einem bekannten internen Verteiler mit erwartetem Inhalt', 0],
    ]),
    q('single', 'Du hast auf einen Link in einer verdächtigen Mail geklickt. Was ist der erste Schritt?', 'Verhalten im Vorfall', [
      ['Sofort die IT informieren, Gerät nicht weiterverwenden', 1],
      ['Abwarten, ob etwas passiert', 0],
      ['Den Papierkorb leeren und weiterarbeiten', 0],
      ['Das Passwort erst beim nächsten Wechsel ändern', 0],
    ]),
    q('single', 'Wie sieht ein gutes Passwort aus?', 'Passwörter', [
      ['Lang, einmalig pro Dienst, im Passwortmanager verwaltet', 1],
      ['Kurz, aber mit Sonderzeichen', 0],
      ['Ein Wort mit angehängter Jahreszahl', 0],
      ['Für alle Dienste gleich, damit man es nicht vergisst', 0],
    ]),
    q('truefalse', 'Mehr-Faktor-Authentifizierung schützt auch dann noch, wenn das Passwort gestohlen wurde.', 'Passwörter', [
      ['Richtig', 1],
      ['Falsch', 0],
    ]),
    q('multi', 'Was ist beim Umgang mit USB-Sticks zu beachten?', 'Geräte', [
      ['Gefundene Sticks nie anschließen', 1],
      ['Firmendaten nur auf freigegebenen, verschlüsselten Medien', 1],
      ['Fremde Sticks zuerst am Privatrechner testen', 0],
      ['Datenträger nach Nutzung sicher aufbewahren', 1],
    ]),
    q('truefalse', 'Auch ein Anruf kann ein Angriff sein (Social Engineering).', 'Phishing erkennen', [
      ['Richtig', 1],
      ['Falsch', 0],
    ], 'Angreifer geben sich am Telefon als IT, Kunde oder Vorgesetzter aus. Rückruf über bekannte Nummern ist der wirksamste Schutz.'),
    q('single', 'Eine Mail vom "Chef" fordert eine sofortige Überweisung, Rückfragen seien nicht möglich. Was tun?', 'Verhalten im Vorfall', [
      ['Nicht handeln, über einen bekannten Kanal persönlich verifizieren', 1],
      ['Überweisen, um die Frist zu halten', 0],
      ['Die Mail an alle Kollegen weiterleiten', 0],
      ['Auf die Mail antworten und um Bestätigung bitten', 0],
    ]),
    q('multi', 'Was gehört zu einem sicheren Homeoffice-Arbeitsplatz?', 'Geräte', [
      ['VPN nutzen', 1],
      ['Bildschirm vor Mitlesen schützen', 1],
      ['Firmenlaptop von Familienmitgliedern mitbenutzen lassen', 0],
      ['Updates zeitnah installieren', 1],
    ]),
    q(
      'freitext',
      'Beschreibe in zwei bis drei Sätzen, woran du eine Phishing-Mail zuletzt erkannt hättest und was du konkret tun würdest.',
      'Phishing erkennen',
      [],
      null,
      2,
    ),
  ],
}

const QUIZ_BRANDSCHUTZ = {
  titel: 'Abschlussquiz Brandschutz',
  bestehensgrenze: 80,
  pool_aktiv: 0,
  fragen_anzahl: 6,
  antworten_mischen: 1,
  sperrzeit_stunden: 1,
  max_versuche_zeitraum: null,
  zeitraum_tage: 7,
  harte_obergrenze: null,
  aufloesung_nichtbestanden: 'themen',
  zeitlimit_min: null,
  fragen: [
    q('single', 'Was ist im Brandfall die erste Maßnahme?', 'Verhalten im Brandfall', [
      ['Alarmieren und gefährdete Personen warnen', 1],
      ['Selbst löschen, egal wie groß das Feuer ist', 0],
      ['Erst die Arbeit sichern, dann reagieren', 0],
      ['Fenster öffnen, damit der Rauch abzieht', 0],
    ]),
    q('single', 'Welche Nummer ist die Feuerwehr?', 'Verhalten im Brandfall', [
      ['112', 1],
      ['110', 0],
      ['116 117', 0],
      ['0800 112', 0],
    ]),
    q('multi', 'Was ist bei der Benutzung eines Feuerlöschers richtig?', 'Löschmittel', [
      ['Immer in Fluchtrichtung stehen', 1],
      ['Brand von unten und von vorn angehen', 1],
      ['Mit dem Rücken zur Wand arbeiten', 0],
      ['Nach dem Einsatz den Löscher nicht zurückhängen, sondern zur Prüfung geben', 1],
    ]),
    q('truefalse', 'Ein Fettbrand darf mit Wasser gelöscht werden.', 'Löschmittel', [
      ['Richtig', 0],
      ['Falsch', 1],
    ], 'Wasser führt bei Fettbränden zur Fettexplosion. Es sind Löschmittel der Brandklasse F zu verwenden.'),
    q('multi', 'Was muss dauerhaft freigehalten werden?', 'Vorbeugender Brandschutz', [
      ['Flucht- und Rettungswege', 1],
      ['Feuerlöscher und Wandhydranten', 1],
      ['Zugang zu Elektroverteilungen', 1],
      ['Der Parkplatz vor dem Bürogebäude', 0],
    ]),
    q('single', 'Wo sammeln sich alle Personen nach der Evakuierung?', 'Verhalten im Brandfall', [
      ['Am ausgewiesenen Sammelplatz, bis die Freigabe erfolgt', 1],
      ['Auf dem Weg nach Hause', 0],
      ['Am Eingang des Gebäudes', 0],
      ['Jeder entscheidet selbst', 0],
    ]),
  ],
}

const QUIZ_ERSTEHILFE = {
  titel: 'Abschlussquiz Erste Hilfe',
  bestehensgrenze: 80,
  pool_aktiv: 0,
  fragen_anzahl: 6,
  antworten_mischen: 1,
  sperrzeit_stunden: 1,
  max_versuche_zeitraum: null,
  zeitraum_tage: 7,
  harte_obergrenze: null,
  aufloesung_nichtbestanden: 'themen',
  zeitlimit_min: null,
  fragen: [
    q('single', 'Was ist die richtige Reihenfolge bei einem Notfall?', 'Rettungskette', [
      ['Eigenschutz - Notruf - lebensrettende Maßnahmen', 1],
      ['Sofort ins Auto und ins Krankenhaus fahren', 0],
      ['Erst Vorgesetzten informieren, dann helfen', 0],
      ['Abwarten, bis Fachpersonal kommt', 0],
    ]),
    q('multi', 'Welche Angaben gehören in einen Notruf?', 'Rettungskette', [
      ['Wo ist es passiert', 1],
      ['Was ist passiert', 1],
      ['Wie viele Betroffene', 1],
      ['Wer trägt die Schuld', 0],
    ]),
    q('single', 'Wie ist die Herzdruckmassage bei Erwachsenen durchzuführen?', 'Reanimation', [
      ['30 Kompressionen, 2 Beatmungen, etwa 100-120 Kompressionen pro Minute', 1],
      ['15 Kompressionen, 5 Beatmungen', 0],
      ['Nur Beatmung, keine Kompression', 0],
      ['So langsam wie möglich', 0],
    ]),
    q('truefalse', 'Auch ohne Beatmung ist eine Herzdruckmassage besser als nichts zu tun.', 'Reanimation', [
      ['Richtig', 1],
      ['Falsch', 0],
    ]),
    q('single', 'Wie wird eine stark blutende Wunde am Arm versorgt?', 'Wundversorgung', [
      ['Keimfreie Wundauflage, Druckverband, Arm hochhalten', 1],
      ['Wunde auswaschen und offen lassen', 0],
      ['Mit Desinfektionsmittel ausspülen und abwarten', 0],
      ['Abbinden mit einem Kabelbinder', 0],
    ]),
    q('single', 'Wo findest du den Verbandkasten und den Ersthelfer deines Bereichs?', 'Organisation', [
      ['Auf dem Aushang "Erste Hilfe" im Bereich', 1],
      ['Nur im Intranet', 0],
      ['Beim Betriebsarzt in der Zentrale', 0],
      ['Das ist nicht dokumentiert', 0],
    ]),
  ],
}

const QUIZ_ETHIK = {
  titel: 'Abschlussquiz Ethik & Compliance',
  bestehensgrenze: 75,
  pool_aktiv: 0,
  fragen_anzahl: 6,
  antworten_mischen: 1,
  sperrzeit_stunden: 2,
  max_versuche_zeitraum: null,
  zeitraum_tage: 7,
  harte_obergrenze: null,
  aufloesung_nichtbestanden: 'themen',
  zeitlimit_min: null,
  fragen: [
    q('single', 'Ein Lieferant bietet dir Eintrittskarten für ein Spiel an. Wie gehst du damit um?', 'Geschenke & Zuwendungen', [
      ['Ablehnen oder vor Annahme transparent melden und genehmigen lassen', 1],
      ['Annehmen, solange niemand davon erfährt', 0],
      ['Annehmen und privat weiterverkaufen', 0],
      ['Annehmen, wenn der Wert unter 500 Euro liegt', 0],
    ]),
    q('multi', 'Was gehört zu einem Interessenkonflikt?', 'Interessenkonflikte', [
      ['Auftragsvergabe an ein Unternehmen von Angehörigen', 1],
      ['Nebentätigkeit bei einem Wettbewerber', 1],
      ['Teilnahme an einer internen Schulung', 0],
      ['Beteiligung an einem Lieferanten', 1],
    ]),
    q('truefalse', 'Preisabsprachen mit Wettbewerbern sind zulässig, wenn sie nicht schriftlich erfolgen.', 'Wettbewerb', [
      ['Richtig', 0],
      ['Falsch', 1],
    ]),
    q('single', 'Wohin wendest du dich bei einem Compliance-Verdacht?', 'Meldewege', [
      ['An Vorgesetzte oder die benannte Compliance-Stelle - Hinweise werden geschützt behandelt', 1],
      ['An die Presse', 0],
      ['An Kollegen im Pausenraum', 0],
      ['Nirgendwohin, das ist nicht meine Aufgabe', 0],
    ]),
    q('multi', 'Was zeichnet einen respektvollen Umgang im Team aus?', 'Zusammenarbeit', [
      ['Sachliche Kritik statt persönlicher Angriffe', 1],
      ['Keine Diskriminierung, keine Belästigung', 1],
      ['Fehler vertuschen, um das Team zu schützen', 0],
      ['Zuhören, auch bei anderer Meinung', 1],
    ]),
    q(
      'freitext',
      'Nenne eine Situation aus deinem Arbeitsalltag, in der du unsicher wärst, ob sie compliance-konform ist - und wie du sie klären würdest.',
      'Meldewege',
      [],
      null,
      2,
    ),
  ],
}

const QUIZ_KI = {
  titel: 'Wissenscheck KI im Arbeitsalltag',
  bestehensgrenze: 70,
  pool_aktiv: 1,
  fragen_anzahl: 6,
  antworten_mischen: 1,
  sperrzeit_stunden: 0,
  max_versuche_zeitraum: null,
  zeitraum_tage: 7,
  harte_obergrenze: null,
  aufloesung_nichtbestanden: 'voll',
  zeitlimit_min: null,
  fragen: [
    q('single', 'Welche Daten dürfen nicht in ein öffentliches KI-Werkzeug eingegeben werden?', 'Regeln', [
      ['Kundendaten, Personaldaten und vertrauliche Konstruktionsdaten', 1],
      ['Gar keine Daten, KI ist grundsätzlich verboten', 0],
      ['Alle Daten, solange man den Verlauf löscht', 0],
      ['Nur Daten mit Passwortschutz', 0],
    ]),
    q('truefalse', 'Ein Sprachmodell kann Inhalte erfinden, die überzeugend klingen, aber falsch sind.', 'Grenzen', [
      ['Richtig', 1],
      ['Falsch', 0],
    ], 'Das nennt man Halluzination. Deshalb gilt: keine Ausgabe ohne fachliche Prüfung übernehmen.'),
    q('multi', 'Wofür eignet sich KI im Arbeitsalltag gut?', 'Einsatzfelder', [
      ['Entwürfe für Texte und Zusammenfassungen', 1],
      ['Strukturieren von Notizen und Protokollen', 1],
      ['Verbindliche Rechtsauskünfte', 0],
      ['Ideen sammeln und Varianten durchspielen', 1],
    ]),
    q('single', 'Was macht einen guten Arbeitsauftrag an ein Sprachmodell aus?', 'Prompting', [
      ['Rolle, Ziel, Kontext und gewünschtes Format sind klar benannt', 1],
      ['Möglichst kurz, das Modell weiß schon, was gemeint ist', 0],
      ['So viele Fragen wie möglich auf einmal', 0],
      ['Immer auf Englisch, sonst funktioniert es nicht', 0],
    ]),
    q('truefalse', 'Bei KI-Unterstützung bleibt die fachliche Verantwortung für das Ergebnis beim Menschen.', 'Regeln', [
      ['Richtig', 1],
      ['Falsch', 0],
    ]),
    q('multi', 'Was tun, wenn eine KI-Ausgabe fachlich falsch ist?', 'Grenzen', [
      ['Nicht verwenden und korrigieren', 1],
      ['Den Fall intern teilen, damit andere daraus lernen', 1],
      ['Trotzdem verwenden, wenn es Zeit spart', 0],
      ['Den Auftrag präzisieren und erneut prüfen', 1],
    ]),
    q('single', 'Wer entscheidet, welche KI-Werkzeuge im Unternehmen eingesetzt werden dürfen?', 'Regeln', [
      ['Die Freigabe erfolgt zentral - eigenmächtige Tool-Einführung ist nicht zulässig', 1],
      ['Jedes Team für sich', 0],
      ['Wer zuerst ein Konto anlegt', 0],
      ['Das ist nicht geregelt', 0],
    ]),
  ],
}

/* ================================================================ Courses */

const demoHinweis =
  '\n\n> **Beispielinhalt.** Dieser Text ist ein Platzhalter zum Ausprobieren und fachlich nicht geprüft. Vor dem Produktivbetrieb durch die eigene, geprüfte Unterweisung ersetzen.'

const KURSE = [
  /* ------------------------------------------------------ Mandatory courses */
  {
    slug: 'fremdkoerper-fod',
    titel: 'Fremdkörper-Prävention (FOD)',
    untertitel: 'Fremdkörper erkennen, vermeiden, melden',
    beschreibung:
      'Foreign Object Damage ist in sicherheitskritischer Fertigung ein Thema erster Ordnung. Die Unterweisung zeigt, wie Fremdkörper entstehen, wie sie verhindert werden und was im Fundfall zu tun ist.',
    kategorie: 'Pflichtschulungen',
    anbieter: 'Interne Akademie',
    pflicht: 1,
    turnus_monate: 12,
    vorwarn_tage: 30,
    onboarding_frist_tage: 14,
    strenge: 'streng',
    akzent: 'rot',
    cover_motiv: 'raute',
    highlight: 0,
    // Example of a group assignment: production departments only
    zuweisungen: ['Montage', 'Werkstatt', 'Qualität', 'Konstruktion', 'IT'].map((a) => ({
      ziel_typ: 'abteilung',
      ziel_wert: a,
    })),
    lektionen: [
      {
        titel: 'Was FOD bedeutet',
        typ: 'video',
        dauer_min: 8,
        video_datei: 'demo/fod-einfuehrung.mp4',
        video_laenge_sek: 480,
      },
      {
        titel: 'Fremdkörperquellen im Arbeitsbereich',
        typ: 'text',
        dauer_min: 6,
        text_inhalt: `## Woher Fremdkörper kommen

FOD entsteht selten durch groß angelegte Fehler, sondern durch Kleinigkeiten im Ablauf:

- **Werkzeug** – abgelegte Ratschen, Bohrerreste, Einsätze, die nicht ins Schattenbrett zurückgehen
- **Verbrauchsmaterial** – Kabelbinderreste, Nieten, Späne, Schutzfolien, Klebebandschnipsel
- **Persönliche Gegenstände** – Schmuck, Kleingeld, Stifte, Kappen aus Brusttaschen
- **Prozessreste** – Dichtmasse, Bohrstaub, Reinigungstücher

### Die drei Grundregeln

1. **Clean as you go** – aufräumen während der Arbeit, nicht danach.
2. **Werkzeugkontrolle** – vollständig rein, vollständig raus. Zählen oder Schattenbrett.
3. **Öffnungen abdecken** – jede offene Struktur, in die etwas fallen kann, wird geschützt.${demoHinweis}`,
      },
      {
        titel: 'Melden und Ursachen abstellen',
        typ: 'text',
        dauer_min: 5,
        text_inhalt: `## Wenn etwas fehlt oder gefunden wird

Ein fehlendes Werkzeug ist ein Vorfall – kein Versehen, das man am Schichtende erwähnt.

1. **Arbeit unterbrechen.** Kein Weiterarbeiten am betroffenen Bauteil.
2. **Sofort melden.** Schichtleitung informieren, Bereich sichern.
3. **Gezielt suchen.** Letzte Arbeitsschritte rückwärts nachvollziehen.
4. **Dokumentieren.** Fundort, Zeit, Art, betroffene Zone.

### Meldekultur

Eine FOD-Meldung führt zur Ursachenanalyse, nicht zur Schuldzuweisung. Wer meldet, verhindert einen Schaden – das ist ausdrücklich gewollt.${demoHinweis}`,
      },
      { titel: 'Abschlussquiz', typ: 'quiz', dauer_min: 6, quiz: QUIZ_FOD },
    ],
  },
  {
    slug: 'datenschutz-dsgvo',
    titel: 'Datenschutz & DSGVO',
    untertitel: 'Personenbezogene Daten im Arbeitsalltag',
    beschreibung:
      'Jährliche Pflichtunterweisung: Was personenbezogene Daten sind, welche Grundsätze gelten, wie ein Datenschutzvorfall gemeldet wird und was am Arbeitsplatz konkret zu tun ist.',
    kategorie: 'Pflichtschulungen',
    anbieter: 'Interne Akademie',
    pflicht: 1,
    turnus_monate: 12,
    vorwarn_tage: 30,
    onboarding_frist_tage: 14,
    strenge: 'streng',
    akzent: 'anthrazit',
    cover_motiv: 'raster',
    highlight: 0,
    lektionen: [
      {
        titel: 'Grundlagen und Begriffe',
        typ: 'video',
        dauer_min: 10,
        video_datei: 'demo/datenschutz-grundlagen.mp4',
        video_laenge_sek: 600,
      },
      {
        titel: 'Die sechs Grundsätze',
        typ: 'text',
        dauer_min: 7,
        text_inhalt: `## Grundsätze der Verarbeitung

| Grundsatz | Bedeutung im Alltag |
|---|---|
| Rechtmäßigkeit | Für jede Verarbeitung braucht es eine Rechtsgrundlage |
| Zweckbindung | Daten nur für den Zweck nutzen, für den sie erhoben wurden |
| Datenminimierung | Nur erheben, was gebraucht wird |
| Richtigkeit | Falsche Daten korrigieren |
| Speicherbegrenzung | Löschen, wenn Zweck und Fristen erfüllt sind |
| Integrität | Daten gegen Verlust und Zugriff schützen |

### Am Arbeitsplatz heißt das

- Bildschirm sperren, wenn du den Platz verlässt
- Unterlagen mit Personendaten nicht offen liegen lassen
- Empfänger vor dem Senden prüfen, bei Serienmails BCC
- Keine Firmendaten auf privaten Speichern${demoHinweis}`,
      },
      {
        titel: 'Datenschutzvorfall: was zu tun ist',
        typ: 'pdf',
        dauer_min: 5,
        pdf_datei: 'demo/datenschutz-vorfall-merkblatt.pdf',
        pdf_titel: 'Merkblatt Datenschutzvorfall',
      },
      { titel: 'Abschlussquiz', typ: 'quiz', dauer_min: 15, quiz: QUIZ_DATENSCHUTZ },
    ],
  },
  {
    slug: 'externe-online-schulung',
    titel: 'Externe Online-Schulung (Beispiel)',
    untertitel: 'Online-Schulung beim externen Anbieter',
    beschreibung:
      'Beispiel für eine Schulung, die bei einem externen Anbieter läuft. Nach Abschluss bestätigst du die Teilnahme hier und lädst dein Zertifikat hoch – der Nachweis wird geprüft und freigegeben.',
    kategorie: 'Pflichtschulungen',
    anbieter: 'Beispiel-Akademie',
    pflicht: 1,
    turnus_monate: 24,
    vorwarn_tage: 45,
    onboarding_frist_tage: 30,
    strenge: 'frei',
    akzent: 'blau',
    cover_motiv: 'linien',
    highlight: 0,
    zuweisungen: ['Montage', 'Werkstatt', 'Qualität', 'Konstruktion', 'IT'].map((a) => ({
      ziel_typ: 'abteilung',
      ziel_wert: a,
    })),
    lektionen: [
      {
        titel: 'Was dich erwartet',
        typ: 'text',
        dauer_min: 3,
        text_inhalt: `## Ablauf

1. Du öffnest die Plattform des Anbieters über den Link in der nächsten Lektion.
2. Du absolvierst die Schulung dort vollständig.
3. Du lädst das Abschlusszertifikat als PDF hier hoch.
4. Die Schulungsleitung prüft den Nachweis und gibt ihn frei.

**Wichtig:** Der Fortschritt beim externen Anbieter ist hier nicht sichtbar. Ohne hochgeladenen Nachweis bleibt die Pflichtschulung offen.${demoHinweis}`,
      },
      {
        titel: 'Zur Plattform des Anbieters',
        typ: 'link',
        dauer_min: 45,
        link_url: 'https://example.com/schulung',
        link_hinweis:
          'Melde dich mit den Zugangsdaten des Anbieters an. Falls du noch keine hast, wende dich an die Schulungsleitung.',
        link_nachweis: 1,
      },
    ],
  },
  {
    slug: 'ethik-compliance',
    titel: 'Ethik & Compliance',
    untertitel: 'Regeln, die Vertrauen sichern',
    beschreibung:
      'Umgang mit Geschenken und Zuwendungen, Interessenkonflikte, Wettbewerbsrecht und die Meldewege bei Verdacht. Pflichtunterweisung alle 24 Monate.',
    kategorie: 'Pflichtschulungen',
    anbieter: 'Interne Akademie',
    pflicht: 1,
    turnus_monate: 24,
    vorwarn_tage: 45,
    onboarding_frist_tage: 30,
    strenge: 'streng',
    akzent: 'anthrazit',
    cover_motiv: 'raster',
    highlight: 0,
    lektionen: [
      {
        titel: 'Worum es geht',
        typ: 'text',
        dauer_min: 6,
        text_inhalt: `## Compliance ist kein Papier

Compliance heißt: Wir halten Regeln ein, auch wenn niemand zusieht – weil Kunden und Auditoren genau das prüfen und weil Vertrauen die Eintrittskarte in anspruchsvolle Aufträge ist.

### Vier Bereiche

- **Geschenke und Zuwendungen** – transparent machen, im Zweifel ablehnen
- **Interessenkonflikte** – offenlegen, bevor sie zum Problem werden
- **Wettbewerb** – keine Absprachen über Preise, Märkte oder Kunden
- **Respekt im Team** – keine Diskriminierung, keine Belästigung${demoHinweis}`,
      },
      {
        titel: 'Grenzfälle aus dem Alltag',
        typ: 'video',
        dauer_min: 9,
        video_datei: 'demo/compliance-grenzfaelle.mp4',
        video_laenge_sek: 540,
      },
      { titel: 'Abschlussquiz', typ: 'quiz', dauer_min: 8, quiz: QUIZ_ETHIK },
    ],
  },
  {
    slug: 'it-security-phishing',
    titel: 'IT-Security & Phishing-Awareness',
    untertitel: 'Angriffe erkennen, bevor sie wirken',
    beschreibung:
      'Phishing, Social Engineering, Passwörter, Mehr-Faktor-Authentifizierung und der richtige Umgang mit Geräten. Jährliche Pflichtunterweisung mit Praxisbeispielen.',
    kategorie: 'Pflichtschulungen',
    anbieter: 'Interne Akademie',
    pflicht: 1,
    turnus_monate: 12,
    vorwarn_tage: 30,
    onboarding_frist_tage: 14,
    strenge: 'streng',
    akzent: 'anthrazit',
    cover_motiv: 'linien',
    highlight: 0,
    lektionen: [
      {
        titel: 'Wie ein Angriff abläuft',
        typ: 'video',
        dauer_min: 11,
        video_datei: 'demo/it-security-angriff.mp4',
        video_laenge_sek: 660,
      },
      {
        titel: 'Sechs Merkmale einer Phishing-Mail',
        typ: 'text',
        dauer_min: 6,
        text_inhalt: `## Woran du Phishing erkennst

1. **Druck und Dringlichkeit** – "innerhalb von 24 Stunden", "letzte Mahnung"
2. **Absender fast richtig** – ein Buchstabe getauscht, andere Domain
3. **Ungewöhnliche Bitte** – Zugangsdaten, Überweisung, Weiterleitung
4. **Links, die woandershin führen** – Ziel vor dem Klick prüfen
5. **Unerwarteter Anhang** – besonders Office-Dateien mit Makros
6. **Bauchgefühl** – irgendetwas passt nicht zum üblichen Ton

### Wenn du unsicher bist

Nicht klicken, nicht antworten, nicht weiterleiten. Mail an die IT melden und dort nachfragen. Eine Fehlmeldung kostet zwei Minuten, ein erfolgreicher Angriff kostet Wochen.${demoHinweis}`,
      },
      {
        titel: 'Passwörter und MFA',
        typ: 'pdf',
        dauer_min: 4,
        pdf_datei: 'demo/it-security-passwoerter.pdf',
        pdf_titel: 'Kurzanleitung Passwörter & Mehr-Faktor-Authentifizierung',
      },
      { titel: 'Abschlussquiz', typ: 'quiz', dauer_min: 12, quiz: QUIZ_ITSEC },
    ],
  },
  {
    slug: 'brandschutz',
    titel: 'Brandschutz-Unterweisung',
    untertitel: 'Alarmieren, retten, löschen',
    beschreibung:
      'Verhalten im Brandfall, Flucht- und Rettungswege, Löschmittel und vorbeugender Brandschutz. Jährliche Pflichtunterweisung.',
    kategorie: 'Pflichtschulungen',
    anbieter: 'Interne Akademie',
    pflicht: 1,
    turnus_monate: 12,
    vorwarn_tage: 30,
    onboarding_frist_tage: 30,
    strenge: 'streng',
    akzent: 'rot',
    cover_motiv: 'raute',
    highlight: 0,
    lektionen: [
      {
        titel: 'Verhalten im Brandfall',
        typ: 'text',
        dauer_min: 6,
        text_inhalt: `## Ruhe bewahren, Reihenfolge einhalten

1. **Alarmieren** – Handmelder, dann Notruf 112
2. **Retten** – gefährdete Personen aus dem Bereich bringen
3. **Löschen** – nur, wenn es ohne Eigengefährdung möglich ist

### Beim Löschen

- In Fluchtrichtung stehen, nie mit dem Rücken zur Gefahr
- Brand von unten und von vorn angehen
- Genügend Löscher gleichzeitig einsetzen, nicht nacheinander
- Nach dem Einsatz: Löscher zur Prüfung geben, nicht zurückhängen

### Was immer freibleibt

Flucht- und Rettungswege, Feuerlöscher, Wandhydranten, Elektroverteilungen.${demoHinweis}`,
      },
      {
        titel: 'Sammelplatz und Evakuierung',
        typ: 'pdf',
        dauer_min: 4,
        pdf_datei: 'demo/brandschutz-evakuierung.pdf',
        pdf_titel: 'Aushang Evakuierung & Sammelplätze',
      },
      { titel: 'Abschlussquiz', typ: 'quiz', dauer_min: 6, quiz: QUIZ_BRANDSCHUTZ },
    ],
  },
  {
    slug: 'erste-hilfe',
    titel: 'Erste-Hilfe-Unterweisung',
    untertitel: 'Die ersten Minuten zählen',
    beschreibung:
      'Rettungskette, Notruf, Reanimation und Wundversorgung – kompakt für den betrieblichen Alltag. Auffrischung alle 24 Monate.',
    kategorie: 'Pflichtschulungen',
    anbieter: 'Interne Akademie',
    pflicht: 1,
    turnus_monate: 24,
    vorwarn_tage: 45,
    onboarding_frist_tage: 60,
    strenge: 'frei',
    akzent: 'rot',
    cover_motiv: 'raute',
    highlight: 0,
    lektionen: [
      {
        titel: 'Rettungskette und Notruf',
        typ: 'video',
        dauer_min: 7,
        video_datei: 'demo/erste-hilfe-rettungskette.mp4',
        video_laenge_sek: 420,
      },
      {
        titel: 'Reanimation und Wundversorgung',
        typ: 'text',
        dauer_min: 6,
        text_inhalt: `## Wiederbelebung

- Person reagiert nicht und atmet nicht normal → Notruf, dann sofort drücken
- **30 Kompressionen, 2 Beatmungen**, Frequenz 100–120 pro Minute
- Drucktiefe etwa 5–6 cm, Brustkorb vollständig entlasten
- Keine Beatmung möglich oder gewollt? **Nur drücken ist deutlich besser als nichts.**
- AED holen lassen und einschalten – die Ansagen führen dich durch

## Starke Blutung

1. Keimfreie Wundauflage aufdrücken
2. Druckverband anlegen
3. Körperteil hochhalten, Betroffenen hinlegen
4. Auf Schockanzeichen achten, Wärme erhalten${demoHinweis}`,
      },
      { titel: 'Abschlussquiz', typ: 'quiz', dauer_min: 6, quiz: QUIZ_ERSTEHILFE },
    ],
  },

  /* -------------------------------------------------------- Optional courses */
  {
    slug: 'ki-im-arbeitsalltag',
    titel: 'Künstliche Intelligenz im Arbeitsalltag',
    untertitel: 'Was heute schon geht – und wo Schluss ist',
    beschreibung:
      'Vom ersten Prompt bis zur belastbaren Arbeitshilfe: Wie KI-Werkzeuge in Technik, Verwaltung und Vertrieb sinnvoll eingesetzt werden, welche Daten nie hineingehören und warum die fachliche Verantwortung beim Menschen bleibt.',
    kategorie: 'KI & Digitales',
    anbieter: 'Interne Akademie',
    pflicht: 0,
    turnus_monate: null,
    vorwarn_tage: 30,
    onboarding_frist_tage: null,
    strenge: 'frei',
    akzent: 'gruen',
    cover_motiv: 'welle',
    highlight: 1,
    lektionen: [
      {
        titel: 'Was ein Sprachmodell wirklich tut',
        typ: 'video',
        dauer_min: 12,
        video_datei: 'demo/ki-grundlagen.mp4',
        video_laenge_sek: 720,
      },
      {
        titel: 'Vier Aufgaben, bei denen KI heute überzeugt',
        typ: 'text',
        dauer_min: 8,
        text_inhalt: `## Wo der Nutzen sofort spürbar ist

**1. Entwürfe statt weißes Blatt.** Angebotstext, Mail an den Kunden, Protokollnotiz – der erste Entwurf entsteht in Sekunden, du bringst ihn auf das nötige Niveau.

**2. Zusammenfassen.** Aus 14 Seiten Besprechungsnotizen werden fünf Punkte mit Verantwortlichen.

**3. Struktur geben.** Loses Gedankenchaos wird zu einer Gliederung, einer Checkliste, einer Tabelle.

**4. Varianten durchspielen.** Drei Formulierungen, drei Lösungswege, drei Argumentationen – du wählst.

## Wo es aufhört

- Verbindliche Rechts-, Normen- oder Sicherheitsauskünfte
- Rechnen mit belastbaren Toleranzen ohne Prüfung
- Alles, was ohne Gegenlesen nach außen geht

> Regel: **Die KI liefert Rohmaterial, du lieferst das Ergebnis.**${demoHinweis}`,
      },
      {
        titel: 'Ein guter Auftrag in vier Teilen',
        typ: 'text',
        dauer_min: 7,
        text_inhalt: `## Rolle, Ziel, Kontext, Format

Ein schwacher Auftrag: *"Schreib was zu unserer Instandhaltung."*

Ein starker Auftrag:

> **Rolle:** Du bist technischer Redakteur in einem Industriedienstleistungsunternehmen.
> **Ziel:** Formuliere einen Absatz für ein Kundenangebot zur vorbeugenden Instandhaltung.
> **Kontext:** Industriekunde, Fokus auf Ausfallsicherheit, wir arbeiten nach den Vorgaben des Auftraggebers.
> **Format:** Maximal 90 Wörter, sachlich, keine Werbefloskeln, Sie-Anrede.

### Nachschärfen statt neu anfangen

Selten sitzt der erste Versuch. "Kürzer", "konkreter", "ohne Adjektive", "mit Zahlenbeispiel" – jede Rückmeldung bringt dich näher ans Ziel.${demoHinweis}`,
      },
      { titel: 'Wissenscheck', typ: 'quiz', dauer_min: 6, quiz: QUIZ_KI },
    ],
  },
  {
    slug: 'ki-regeln-betrieb',
    titel: 'KI-Unterweisung: Regeln für den sicheren Einsatz',
    untertitel: 'Welche Daten dürfen rein – und welche nie',
    beschreibung:
      'Die verbindlichen Leitlinien für den Umgang mit KI-Werkzeugen im Betrieb: freigegebene Tools, Umgang mit Kunden- und Personaldaten, Kennzeichnung von KI-Unterstützung, Meldung von Fehlausgaben.',
    kategorie: 'KI & Digitales',
    anbieter: 'Interne Akademie',
    pflicht: 0,
    turnus_monate: 12,
    vorwarn_tage: 30,
    onboarding_frist_tage: null,
    strenge: 'streng',
    akzent: 'gruen',
    cover_motiv: 'welle',
    highlight: 0,
    lektionen: [
      {
        titel: 'Die fünf Leitlinien',
        typ: 'text',
        dauer_min: 8,
        text_inhalt: `## Verbindliche Leitlinien

1. **Nur freigegebene Werkzeuge.** Eigenmächtige Tool-Einführung ist nicht zulässig – auch nicht "nur zum Testen".
2. **Keine vertraulichen Daten in öffentliche Dienste.** Kundendaten, Personaldaten, Konstruktionsdaten, Preise, Verträge.
3. **Prüfen vor Verwenden.** Jede Ausgabe wird fachlich gegengelesen. Die Verantwortung bleibt bei dir.
4. **Transparenz, wo sie zählt.** Wenn KI substanziell an einem Ergebnis mitgewirkt hat, wird das intern benannt.
5. **Fehler melden.** Falsche Ausgaben sind Lernmaterial für alle – bitte weitergeben.${demoHinweis}`,
      },
      {
        titel: 'Fallbeispiele: erlaubt oder nicht?',
        typ: 'video',
        dauer_min: 9,
        video_datei: 'demo/ki-faelle.mp4',
        video_laenge_sek: 540,
      },
    ],
  },
  {
    slug: 'prompting-technik-verwaltung',
    titel: 'Prompting für Technik und Verwaltung',
    untertitel: 'Bessere Ergebnisse in weniger Anläufen',
    beschreibung:
      'Praxiswerkstatt: konkrete Vorlagen für Angebote, Prüfberichte, Mails, Protokolle und Stellenanzeigen – jeweils mit Vorher-Nachher-Beispiel.',
    kategorie: 'KI & Digitales',
    anbieter: 'Interne Akademie',
    pflicht: 0,
    turnus_monate: null,
    vorwarn_tage: 30,
    onboarding_frist_tage: null,
    strenge: 'frei',
    akzent: 'gruen',
    cover_motiv: 'raster',
    highlight: 0,
    lektionen: [
      {
        titel: 'Fünf Vorlagen für den Alltag',
        typ: 'text',
        dauer_min: 10,
        text_inhalt: `## Vorlagen zum Kopieren

**Mail an Kunden nachschärfen**
> Formuliere diese Mail sachlicher und kürzer, Sie-Anrede, maximal 120 Wörter, keine Superlative. Behalte alle Fakten und Termine bei.

**Prüfbericht zusammenfassen**
> Fasse diesen Prüfbericht in fünf Punkten zusammen: Befund, Ursache, Maßnahme, Verantwortlicher, Frist. Keine Interpretation über den Text hinaus.

**Besprechung protokollieren**
> Erzeuge aus diesen Notizen ein Protokoll mit Tabelle: Thema, Entscheidung, Verantwortlich, Termin. Offene Punkte separat.

**Stellenanzeige entschwurbeln**
> Streiche jede Floskel ohne Aussage. Ersetze Adjektive durch konkrete Angaben. Du-Anrede, industrienah, keine Werbesprache.

**Fachtext für Laien**
> Erkläre diesen Zusammenhang einer Person ohne technische Vorbildung in maximal sechs Sätzen, ohne Fachbegriffe zu verlieren.${demoHinweis}`,
      },
      {
        titel: 'Werkstatt: gemeinsam nachschärfen',
        typ: 'video',
        dauer_min: 14,
        video_datei: 'demo/prompting-werkstatt.mp4',
        video_laenge_sek: 840,
      },
    ],
  },
  {
    slug: 'mechanik-grundlagen',
    titel: 'Mechanik-Grundlagen',
    untertitel: 'Toleranzen, Passungen, Drehmoment',
    beschreibung:
      'Warum eine H7/g6-Passung nicht dasselbe ist wie "passt schon": Grundlagen für Montage und Werkstatt, mit Rechenbeispielen und typischen Fehlerbildern.',
    kategorie: 'Technik',
    anbieter: 'Interne Akademie',
    pflicht: 0,
    turnus_monate: null,
    vorwarn_tage: 30,
    onboarding_frist_tage: null,
    strenge: 'frei',
    akzent: 'blau',
    cover_motiv: 'linien',
    highlight: 1,
    lektionen: [
      {
        titel: 'Toleranzen und Passungen',
        typ: 'text',
        dauer_min: 9,
        text_inhalt: `## Warum Toleranzen existieren

Kein Bauteil ist exakt. Die Frage ist nicht, *ob* es abweicht, sondern *wie viel* Abweichung die Funktion noch trägt.

### Drei Passungsarten

| Art | Verhalten | Typischer Einsatz |
|---|---|---|
| Spielpassung | Welle immer kleiner als Bohrung | Gleitlager, Führungen |
| Übergangspassung | Spiel oder Presssitz möglich | Zentrierungen |
| Presspassung | Welle immer größer als Bohrung | Kraftschlüssige Verbindungen |

### Lesen einer Angabe

**⌀40 H7/g6** – Bohrung H7, Welle g6, damit eine Spielpassung. Großbuchstabe = Bohrung, Kleinbuchstabe = Welle. Die Zahl ist die Toleranzklasse: kleiner = enger.${demoHinweis}`,
      },
      {
        titel: 'Drehmoment richtig aufbringen',
        typ: 'video',
        dauer_min: 10,
        video_datei: 'demo/drehmoment.mp4',
        video_laenge_sek: 600,
      },
      {
        titel: 'Typische Fehlerbilder',
        typ: 'text',
        dauer_min: 6,
        text_inhalt: `## Was in der Praxis schiefgeht

- **Nachziehen "auf Gefühl"** – ein Drehmomentschlüssel ist kein Vorschlag
- **Falsche Reihenfolge** – bei Flanschen kreuzweise und in Stufen anziehen
- **Verschmutzte Gewinde** – Reibung verfälscht das Drehmoment erheblich
- **Wiederverwendete Sicherungselemente** – selbstsichernde Muttern sind Einwegteile
- **Messen am warmen Bauteil** – Temperatur verändert das Maß messbar${demoHinweis}`,
      },
    ],
  },
  {
    slug: 'elektrotechnik-basics',
    titel: 'Elektrotechnik-Basics',
    untertitel: 'Messen, prüfen, absichern',
    beschreibung:
      'Grundlagen für alle, die elektrische Anlagen bedienen oder in ihrem Umfeld arbeiten: Spannung, Strom, Schutzmaßnahmen und die fünf Sicherheitsregeln.',
    kategorie: 'Technik',
    anbieter: 'Interne Akademie',
    pflicht: 0,
    turnus_monate: null,
    vorwarn_tage: 30,
    onboarding_frist_tage: null,
    strenge: 'frei',
    akzent: 'blau',
    cover_motiv: 'raster',
    highlight: 0,
    lektionen: [
      {
        titel: 'Die fünf Sicherheitsregeln',
        typ: 'text',
        dauer_min: 7,
        text_inhalt: `## Immer in dieser Reihenfolge

1. **Freischalten**
2. **Gegen Wiedereinschalten sichern**
3. **Spannungsfreiheit feststellen**
4. **Erden und kurzschließen**
5. **Benachbarte, unter Spannung stehende Teile abdecken**

Diese Reihenfolge ist keine Empfehlung. Sie ist der Unterschied zwischen Routine und Unfall.

### Wer darf was

Arbeiten an elektrischen Anlagen führen ausschließlich Elektrofachkräfte oder elektrotechnisch unterwiesene Personen im festgelegten Rahmen aus. Wer unsicher ist, ist nicht befugt.${demoHinweis}`,
      },
      {
        titel: 'Messen ohne Fehlschluss',
        typ: 'video',
        dauer_min: 11,
        video_datei: 'demo/elektro-messen.mp4',
        video_laenge_sek: 660,
      },
    ],
  },
  {
    slug: 'pneumatik-hydraulik',
    titel: 'Pneumatik & Hydraulik verstehen',
    untertitel: 'Druck, Volumenstrom, Fehlersuche',
    beschreibung:
      'Wie Druckluft- und Hydrauliksysteme aufgebaut sind, was Schaltpläne aussagen und wie man Störungen systematisch statt durch Ausprobieren findet.',
    kategorie: 'Technik',
    anbieter: 'Interne Akademie',
    pflicht: 0,
    turnus_monate: null,
    vorwarn_tage: 30,
    onboarding_frist_tage: null,
    strenge: 'frei',
    akzent: 'blau',
    cover_motiv: 'welle',
    highlight: 0,
    lektionen: [
      {
        titel: 'Aufbau und Schaltzeichen',
        typ: 'video',
        dauer_min: 13,
        video_datei: 'demo/pneumatik-aufbau.mp4',
        video_laenge_sek: 780,
      },
      {
        titel: 'Fehlersuche mit System',
        typ: 'text',
        dauer_min: 8,
        text_inhalt: `## Vom Symptom zur Ursache

1. **Symptom beschreiben** – nicht "geht nicht", sondern "Zylinder fährt langsam aus, zieht nicht durch"
2. **Versorgung prüfen** – Druck am Eingang, Filter, Wartungseinheit
3. **Signalweg prüfen** – kommt das Schaltsignal am Ventil an?
4. **Verbraucher prüfen** – Dichtungen, Leckage, Verschleiß
5. **Ursache abstellen, nicht das Symptom** – ein höherer Druck ersetzt keine Dichtung

### Häufigste Ursachen

Leckage an Verschraubungen, verschmutzter Filter, falsch eingestellte Drosseln, Kondensat in der Leitung.${demoHinweis}`,
      },
    ],
  },
  {
    slug: 'messtechnik-qualitaet',
    titel: 'Messtechnik & Prüfmittel',
    untertitel: 'Messen, das belastbar ist',
    beschreibung:
      'Messmittelwahl, Kalibrierung, typische Messfehler und Dokumentation – die Grundlage jeder Qualitätsaussage gegenüber dem Kunden.',
    kategorie: 'Sicherheit & Qualität',
    anbieter: 'Interne Akademie',
    pflicht: 0,
    turnus_monate: null,
    vorwarn_tage: 30,
    onboarding_frist_tage: null,
    strenge: 'frei',
    akzent: 'anthrazit',
    cover_motiv: 'raster',
    highlight: 0,
    lektionen: [
      {
        titel: 'Das richtige Messmittel',
        typ: 'text',
        dauer_min: 7,
        text_inhalt: `## Auflösung ist nicht Genauigkeit

Ein digitaler Messschieber zeigt 0,01 mm an – messen kann er das nicht. Als Faustregel gilt: Das Messmittel sollte etwa **ein Zehntel der Toleranz** auflösen können.

| Toleranz | Sinnvolles Messmittel |
|---|---|
| ± 0,5 mm | Messschieber |
| ± 0,05 mm | Bügelmessschraube |
| ± 0,01 mm | Messuhr mit Aufnahme, Messmaschine |

### Prüfmittelüberwachung

Jedes Messmittel hat eine Kennzeichnung und ein Kalibrierdatum. Ohne gültige Kalibrierung ist ein Messwert kein Nachweis.${demoHinweis}`,
      },
      {
        titel: 'Messfehler, die jeder macht',
        typ: 'video',
        dauer_min: 9,
        video_datei: 'demo/messfehler.mp4',
        video_laenge_sek: 540,
      },
    ],
  },
  {
    slug: 'luftfahrt-grundlagen',
    titel: 'Luftfahrt-Grundlagen',
    untertitel: 'Wie ein Flugzeug entsteht',
    beschreibung:
      'Überblick über Strukturbau, Ausrüstung, Endmontage und die Rolle von Zulieferern – hilfreich für alle, die in der Luftfahrtzulieferung arbeiten und den Zusammenhang sehen wollen.',
    kategorie: 'Technik',
    anbieter: 'Interne Akademie',
    pflicht: 0,
    turnus_monate: null,
    vorwarn_tage: 30,
    onboarding_frist_tage: null,
    strenge: 'frei',
    akzent: 'blau',
    cover_motiv: 'welle',
    highlight: 1,
    lektionen: [
      {
        titel: 'Von der Sektion zum Flugzeug',
        typ: 'video',
        dauer_min: 15,
        video_datei: 'demo/luftfahrt-ueberblick.mp4',
        video_laenge_sek: 900,
      },
      {
        titel: 'Warum Dokumentation alles ist',
        typ: 'text',
        dauer_min: 6,
        text_inhalt: `## Rückverfolgbarkeit

In der Luftfahrt zählt nicht nur, dass etwas richtig gemacht wurde – sondern dass es **nachweisbar** richtig gemacht wurde. Jede Tätigkeit ist einem Bauteil, einer Person und einem Zeitpunkt zuordenbar.

Das erklärt vieles, was im Alltag zunächst nach Bürokratie aussieht:

- Stempel und Freigaben
- Werkzeug- und Materialrückverfolgung
- FOD-Kontrollen
- Schulungsnachweise – genau der Zweck dieser Plattform${demoHinweis}`,
      },
    ],
  },
  {
    slug: 'm365-zusammenarbeit',
    titel: 'Microsoft 365 im Arbeitsalltag',
    untertitel: 'Teams, SharePoint, Outlook ohne Chaos',
    beschreibung:
      'Dateien dort ablegen, wo sie wiedergefunden werden, Besprechungen, die kurz bleiben, und ein Postfach, das nicht überläuft.',
    kategorie: 'Zusammenarbeit',
    anbieter: 'Interne Akademie',
    pflicht: 0,
    turnus_monate: null,
    vorwarn_tage: 30,
    onboarding_frist_tage: null,
    strenge: 'frei',
    akzent: 'anthrazit',
    cover_motiv: 'raster',
    highlight: 0,
    lektionen: [
      {
        titel: 'Ablegen statt suchen',
        typ: 'text',
        dauer_min: 7,
        text_inhalt: `## Drei Regeln für Dateien

1. **Kein Anhang, wo ein Link genügt.** Anhänge erzeugen Versionen, Links nicht.
2. **Team-Ablage statt persönlicher Ordner.** Was das Team braucht, gehört nicht in OneDrive.
3. **Sprechende Namen.** \`2026-08-05_Angebot_Kunde_Rev02.docx\` statt \`final_final.docx\`.

## Besprechungen

- Agenda in der Einladung, sonst keine Einladung
- 25 oder 50 Minuten statt 30 oder 60
- Entscheidungen direkt im Chat der Besprechung festhalten${demoHinweis}`,
      },
      {
        titel: 'Postfach im Griff',
        typ: 'video',
        dauer_min: 8,
        video_datei: 'demo/outlook-postfach.mp4',
        video_laenge_sek: 480,
      },
    ],
  },
  {
    slug: 'souveraen-beim-kunden',
    titel: 'Souverän beim Kunden auftreten',
    untertitel: 'Vor Ort ist jeder Visitenkarte',
    beschreibung:
      'Kommunikation im Kundenwerk, Umgang mit Reklamationen, Grenzen der eigenen Zuständigkeit und wie man Probleme meldet, ohne Vertrauen zu verlieren.',
    kategorie: 'Zusammenarbeit',
    anbieter: 'Interne Akademie',
    pflicht: 0,
    turnus_monate: null,
    vorwarn_tage: 30,
    onboarding_frist_tage: null,
    strenge: 'frei',
    akzent: 'anthrazit',
    cover_motiv: 'linien',
    highlight: 0,
    lektionen: [
      {
        titel: 'Die ersten fünf Minuten',
        typ: 'text',
        dauer_min: 6,
        text_inhalt: `## Beim Kunden bist du das Unternehmen

- **Pünktlich und angemeldet.** Zugang, Ausweis, PSA vorher klären.
- **Zuständigkeit kennen.** Was du zusagen darfst und was nicht.
- **Zusagen dokumentieren.** Was mündlich vereinbart wurde, kurz schriftlich bestätigen.
- **Probleme früh melden.** Ein früh gemeldetes Problem ist eine Information, ein spät gemeldetes ist ein Vorfall.

### Bei Reklamationen

Zuhören, verstehen, zusammenfassen, Zeitpunkt für Rückmeldung nennen. Keine Schuldfrage vor Ort, keine Bewertung eigener Kollegen gegenüber dem Kunden.${demoHinweis}`,
      },
      {
        titel: 'Gesprächssituationen',
        typ: 'video',
        dauer_min: 10,
        video_datei: 'demo/kundengespraech.mp4',
        video_laenge_sek: 600,
      },
    ],
  },
  {
    slug: '5s-ordnung',
    titel: '5S: Ordnung, die Zeit spart',
    untertitel: 'Sortieren, systematisieren, säubern, standardisieren, sichern',
    beschreibung:
      'Die 5S-Methode praktisch angewendet auf Werkstatt, Montageplatz und Lager – mit direktem Bezug zur FOD-Prävention.',
    kategorie: 'Sicherheit & Qualität',
    anbieter: 'Interne Akademie',
    pflicht: 0,
    turnus_monate: null,
    vorwarn_tage: 30,
    onboarding_frist_tage: null,
    strenge: 'frei',
    akzent: 'gruen',
    cover_motiv: 'raute',
    highlight: 0,
    lektionen: [
      {
        titel: 'Die fünf Schritte',
        typ: 'text',
        dauer_min: 7,
        text_inhalt: `## 5S in der Praxis

1. **Sortieren** – alles weg, was hier nicht gebraucht wird
2. **Systematisieren** – jedes Teil hat einen festen, gekennzeichneten Platz
3. **Säubern** – Reinigen ist Prüfen: dabei fallen Leckagen und Schäden auf
4. **Standardisieren** – der beste gefundene Weg wird der Standard
5. **Selbstdisziplin** – täglich fünf Minuten statt vierteljährlich vier Stunden

### Der Bezug zu FOD

Ein Arbeitsplatz nach 5S macht fehlende Werkzeuge sofort sichtbar. Das ist die wirksamste FOD-Prävention, die es gibt – siehe **Fremdkörper-Prävention (FOD)**.${demoHinweis}`,
      },
      {
        titel: 'Vorher/Nachher aus der Werkstatt',
        typ: 'video',
        dauer_min: 8,
        video_datei: 'demo/5s-werkstatt.mp4',
        video_laenge_sek: 480,
      },
    ],
  },
]

const CURRICULA = [
  {
    slug: 'onboarding-30-tage',
    titel: 'Onboarding: die ersten 30 Tage',
    beschreibung:
      'Alle Pflichtschulungen, die zum Start erledigt sein müssen – in der Reihenfolge, in der sie sinnvoll aufeinander aufbauen.',
    akzent: 'gruen',
    kurse: [
      'datenschutz-dsgvo',
      'it-security-phishing',
      'fremdkoerper-fod',
      'externe-online-schulung',
      'brandschutz',
      'erste-hilfe',
      'ethik-compliance',
    ],
  },
  {
    slug: 'ki-kompetenz',
    titel: 'KI-Kompetenz im Betrieb',
    beschreibung: 'Von den Grundlagen über die verbindlichen Regeln bis zur Praxiswerkstatt.',
    akzent: 'gruen',
    kurse: ['ki-im-arbeitsalltag', 'ki-regeln-betrieb', 'prompting-technik-verwaltung'],
  },
  {
    slug: 'technik-basics-montage',
    titel: 'Technik-Grundlagen für die Fertigung',
    beschreibung: 'Mechanik, Elektrotechnik und Fluidtechnik als gemeinsames Grundverständnis.',
    akzent: 'blau',
    kurse: ['mechanik-grundlagen', 'elektrotechnik-basics', 'pneumatik-hydraulik', 'messtechnik-qualitaet'],
  },
]

/* ======================================================== Sample PDF writer */

async function demoPdfErzeugen(pfad, titel, abschnitte) {
  const pdf = await PDFDocument.create()
  const seite = pdf.addPage([595, 842])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = seite.getSize()

  seite.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: rgb(0x38 / 255, 0xa4 / 255, 0x46 / 255) })
  seite.drawText(konfiguration.organisation, { x: 50, y: height - 55, size: 12, font: bold, color: rgb(0.33, 0.33, 0.33) })
  seite.drawText(titel, { x: 50, y: height - 95, size: 20, font: bold, color: rgb(0.15, 0.15, 0.15) })
  seite.drawRectangle({ x: 50, y: height - 110, width: 70, height: 3, color: rgb(0x38 / 255, 0xa4 / 255, 0x46 / 255) })

  let y = height - 150
  const zeilenUmbruch = (text, size, maxBreite) => {
    const worte = text.split(' ')
    const zeilen = []
    let aktuell = ''
    for (const wort of worte) {
      const test = aktuell ? `${aktuell} ${wort}` : wort
      if (regular.widthOfTextAtSize(test, size) > maxBreite) {
        zeilen.push(aktuell)
        aktuell = wort
      } else aktuell = test
    }
    if (aktuell) zeilen.push(aktuell)
    return zeilen
  }

  for (const [kopf, text] of abschnitte) {
    seite.drawText(kopf, { x: 50, y, size: 12, font: bold, color: rgb(0x38 / 255, 0xa4 / 255, 0x46 / 255) })
    y -= 20
    for (const zeile of zeilenUmbruch(text, 10, width - 100)) {
      seite.drawText(zeile, { x: 50, y, size: 10, font: regular, color: rgb(0.2, 0.2, 0.2) })
      y -= 15
    }
    y -= 14
  }

  seite.drawRectangle({
    x: 50,
    y: 70,
    width: width - 100,
    height: 40,
    color: rgb(1, 0.96, 0.85),
    borderColor: rgb(1, 0.77, 0.23),
    borderWidth: 1,
  })
  seite.drawText('DEMO-INHALT — fachlich nicht freigegeben.', {
    x: 64,
    y: 94,
    size: 10,
    font: bold,
    color: rgb(0.6, 0.42, 0),
  })
  seite.drawText('Platzhalter zum Ausprobieren der Schulungsplattform.', {
    x: 64,
    y: 80,
    size: 9,
    font: regular,
    color: rgb(0.5, 0.4, 0.1),
  })

  writeFileSync(pfad, Buffer.from(await pdf.save()))
}

async function demoPdfsSchreiben() {
  const ordner = join(MEDIA_DIR, 'demo')
  mkdirSync(ordner, { recursive: true })

  const dateien = [
    [
      'datenschutz-vorfall-merkblatt.pdf',
      'Merkblatt: Datenschutzvorfall',
      [
        ['Was ist ein Vorfall?', 'Jede unbeabsichtigte Offenlegung, Veränderung oder Vernichtung personenbezogener Daten - vom Fehlversand einer E-Mail über den verlorenen USB-Stick bis zum Einbruch in ein IT-System.'],
        ['Sofortmaßnahmen', '1. Weiterverbreitung stoppen. 2. Vorgesetzte und Datenschutzbeauftragten sofort informieren. 3. Sachverhalt notieren: was, wann, welche Daten, wie viele Personen betroffen. 4. Keine eigenmaechtige Kommunikation nach aussen.'],
        ['Fristen', 'Gegenueber der Aufsichtsbehoerde gilt eine Frist von 72 Stunden. Intern muss die Meldung deshalb unverzueglich erfolgen - nicht am Monatsende.'],
        ['Kein Nachteil fuer Meldende', 'Wer einen Vorfall meldet, handelt richtig. Meldungen dienen der Schadensbegrenzung und der Verbesserung von Abläufen, nicht der Sanktion.'],
      ],
    ],
    [
      'it-security-passwoerter.pdf',
      'Kurzanleitung: Passwörter & MFA',
      [
        ['Gute Passwoerter', 'Lang statt kompliziert: vier zufaellige Woerter sind sicherer als "Sommer2026!". Pro Dienst ein eigenes Passwort. Verwaltung ausschliesslich im freigegebenen Passwortmanager.'],
        ['Mehr-Faktor-Authentifizierung', 'MFA schuetzt auch dann, wenn das Passwort gestohlen wurde. Bestaetigungsanfragen, die du nicht ausgeloest hast, immer ablehnen und der IT melden.'],
        ['Was nie passiert', 'Die IT fragt niemals per Mail oder Telefon nach deinem Passwort. Jede solche Anfrage ist ein Angriff.'],
        ['Im Verdachtsfall', 'Gerät nicht weiterverwenden, Netzwerkverbindung trennen, IT informieren. Lieber einmal zu oft melden.'],
      ],
    ],
    [
      'brandschutz-evakuierung.pdf',
      'Aushang: Evakuierung & Sammelplätze',
      [
        ['Alarm', 'Bei Alarmsignal Arbeit sofort einstellen, Maschinen in sicheren Zustand bringen, Gebäude auf dem gekennzeichneten Fluchtweg verlassen. Keine Aufzuege benutzen.'],
        ['Sammelplatz', 'Sammelplatz ist der gekennzeichnete Bereich auf dem Hof. Vollständigkeit wird dort geprüft - niemand verlässt den Sammelplatz ohne Freigabe.'],
        ['Verantwortung', 'Evakuierungshelfer tragen Warnwesten und haben Weisungsbefugnis. Besucher und Fremdfirmen werden von ihren Ansprechpartnern begleitet.'],
        ['Nach der Freigabe', 'Rückkehr ins Gebäude erst nach ausdrücklicher Freigabe durch Feuerwehr oder Einsatzleitung.'],
      ],
    ],
  ]

  for (const [name, titel, abschnitte] of dateien) {
    const pfad = join(ordner, name)
    if (!existsSync(pfad)) await demoPdfErzeugen(pfad, titel, abschnitte)
  }
}

/* ==================================================================== Insert */

function quizEinfuegen(vorlage) {
  const info = db
    .prepare(
      `INSERT INTO quizzes (titel, bestehensgrenze, pool_aktiv, fragen_anzahl, antworten_mischen,
                            sperrzeit_stunden, max_versuche_zeitraum, zeitraum_tage, harte_obergrenze,
                            aufloesung_nichtbestanden, zeitlimit_min, erstellt_am)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      vorlage.titel,
      vorlage.bestehensgrenze,
      vorlage.pool_aktiv,
      vorlage.fragen_anzahl,
      vorlage.antworten_mischen,
      vorlage.sperrzeit_stunden,
      vorlage.max_versuche_zeitraum,
      vorlage.zeitraum_tage,
      vorlage.harte_obergrenze,
      vorlage.aufloesung_nichtbestanden,
      vorlage.zeitlimit_min,
      JETZT,
    )
  const quizId = Number(info.lastInsertRowid)

  vorlage.fragen.forEach((f, i) => {
    const fi = db
      .prepare(
        'INSERT INTO questions (quiz_id, position, typ, frage, thema, punkte, erklaerung, musterloesung) VALUES (?,?,?,?,?,?,?,?)',
      )
      .run(quizId, i + 1, f.typ, f.frage, f.thema, f.punkte, f.erklaerung, f.musterloesung ?? null)
    const qid = Number(fi.lastInsertRowid)
    f.antworten.forEach(([text, korrekt], j) => {
      db.prepare('INSERT INTO answers (question_id, position, text, korrekt) VALUES (?,?,?,?)').run(
        qid,
        j + 1,
        text,
        korrekt ? 1 : 0,
      )
    })
  })
  return quizId
}

function kursEinfuegen(k, sortierung) {
  const dauer = k.lektionen.reduce((s, l) => s + (l.dauer_min ?? 0), 0)
  const info = db
    .prepare(
      `INSERT INTO courses (slug, titel, untertitel, beschreibung, kategorie, anbieter, pflicht,
                            turnus_monate, vorwarn_tage, onboarding_frist_tage, strenge, dauer_min,
                            akzent, cover_motiv, demo, veroeffentlicht, sortierung, highlight, erstellt_am)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,1,?,?,?)`,
    )
    .run(
      k.slug,
      k.titel,
      k.untertitel,
      k.beschreibung,
      k.kategorie,
      k.anbieter,
      k.pflicht,
      k.turnus_monate,
      k.vorwarn_tage,
      k.onboarding_frist_tage,
      k.strenge,
      dauer,
      k.akzent,
      k.cover_motiv,
      sortierung,
      k.highlight,
      JETZT,
    )
  const courseId = Number(info.lastInsertRowid)

  k.lektionen.forEach((l, i) => {
    const quizId = l.quiz ? quizEinfuegen(l.quiz) : null
    db.prepare(
      `INSERT INTO lessons (course_id, position, titel, typ, dauer_min, video_datei, video_laenge_sek,
                            text_inhalt, pdf_datei, link_url, link_hinweis, link_nachweis, quiz_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      courseId,
      i + 1,
      l.titel,
      l.typ,
      l.dauer_min ?? 0,
      l.video_datei ?? null,
      l.video_laenge_sek ?? null,
      l.text_inhalt ?? null,
      l.pdf_datei ?? null,
      l.link_url ?? null,
      l.link_hinweis ?? null,
      l.link_nachweis ? 1 : 0,
      quizId,
    )
  })

  // Assignment: to everyone by default. Courses carrying `zuweisungen` go only
  // to the listed departments - this demonstrates group assignment (production
  // specific training does not concern the back office).
  const ziele = k.zuweisungen ?? [{ ziel_typ: 'alle', ziel_wert: null }]
  for (const z of ziele) {
    db.prepare('INSERT INTO assignments (course_id, ziel_typ, ziel_wert, pflicht, erstellt_am) VALUES (?,?,?,?,?)').run(
      courseId,
      z.ziel_typ,
      z.ziel_wert,
      k.pflicht ? 1 : 0,
      JETZT,
    )
  }
  return courseId
}

/* ------------------------------------------------ Sample learning history */

const kursId = (slug) => db.prepare('SELECT id, turnus_monate FROM courses WHERE slug = ?').get(slug)
const userId = (email) => db.prepare('SELECT id FROM users WHERE email = ?').get(email)?.id

function abschlussSetzen(email, slug, vorTagen, prozent = 92, quelle = 'plattform') {
  const uid = userId(email)
  const kurs = kursId(slug)
  if (!uid || !kurs) return
  const am = heuteMinus(vorTagen)
  const seq = (db.prepare('SELECT COUNT(*) AS n FROM completions').get().n ?? 0) + 1
  db.prepare(
    `INSERT INTO completions (user_id, course_id, abgeschlossen_am, gueltig_bis, prozent, quelle, zertifikat_nr, erstellt_am)
     VALUES (?,?,?,?,?,?,?,?)`,
  ).run(
    uid,
    kurs.id,
    am,
    kurs.turnus_monate ? addMonths(am, kurs.turnus_monate) : null,
    prozent,
    quelle,
    zertifikatNummer(seq),
    am,
  )
  // Mark all lessons of that cycle as completed
  for (const l of db.prepare('SELECT id FROM lessons WHERE course_id = ?').all(kurs.id)) {
    db.prepare(
      `INSERT OR REPLACE INTO lesson_progress (user_id, lesson_id, status, sekunden_gesehen, max_position_sek,
                                               prozent, bestaetigt, aktualisiert_am, abgeschlossen_am)
       VALUES (?,?,'abgeschlossen',0,0,100,1,?,?)`,
    ).run(uid, l.id, am, am)
  }
  db.prepare(
    `INSERT OR REPLACE INTO course_starts (user_id, course_id, gestartet_am, zuletzt_am) VALUES (?,?,?,?)`,
  ).run(uid, kurs.id, am, am)
}

function teilfortschritt(email, slug, anzahlErledigt, letzteLektionProzent = 45, vorTagen = 2) {
  const uid = userId(email)
  const kurs = kursId(slug)
  if (!uid || !kurs) return
  const lektionen = db.prepare('SELECT id, typ, video_laenge_sek FROM lessons WHERE course_id = ? ORDER BY position').all(kurs.id)
  const am = heuteMinus(vorTagen)
  lektionen.slice(0, anzahlErledigt).forEach((l) => {
    db.prepare(
      `INSERT OR REPLACE INTO lesson_progress (user_id, lesson_id, status, sekunden_gesehen, max_position_sek,
                                               prozent, bestaetigt, aktualisiert_am, abgeschlossen_am)
       VALUES (?,?,'abgeschlossen',?,?,100,1,?,?)`,
    ).run(uid, l.id, l.video_laenge_sek ?? 0, l.video_laenge_sek ?? 0, am, am)
  })
  const naechste = lektionen[anzahlErledigt]
  if (naechste && letzteLektionProzent > 0) {
    const sek = Math.round(((naechste.video_laenge_sek ?? 300) * letzteLektionProzent) / 100)
    db.prepare(
      `INSERT OR REPLACE INTO lesson_progress (user_id, lesson_id, status, sekunden_gesehen, max_position_sek,
                                               prozent, bestaetigt, aktualisiert_am, abgeschlossen_am)
       VALUES (?,?,'laufend',?,?,?,0,?,NULL)`,
    ).run(uid, naechste.id, sek, sek, letzteLektionProzent, am)
  }
  db.prepare(
    `INSERT OR REPLACE INTO course_starts (user_id, course_id, gestartet_am, zuletzt_am) VALUES (?,?,?,?)`,
  ).run(uid, kurs.id, heuteMinus(vorTagen + 5), am)
}

function speichern(email, ...slugs) {
  const uid = userId(email)
  for (const slug of slugs) {
    const kurs = kursId(slug)
    if (uid && kurs)
      db.prepare('INSERT OR IGNORE INTO saved_courses (user_id, course_id, erstellt_am) VALUES (?,?,?)').run(
        uid,
        kurs.id,
        JETZT,
      )
  }
}

function demoVerlauf() {
  // The admin account shows the full picture: several valid certificates, one
  // due soon, one overdue and already started.
  abschlussSetzen('admin@example.com', 'it-security-phishing', 40, 95)
  abschlussSetzen('admin@example.com', 'brandschutz', 60, 90)
  abschlussSetzen('admin@example.com', 'ethik-compliance', 200, 88)
  abschlussSetzen('admin@example.com', 'erste-hilfe', 250, 85)
  abschlussSetzen('admin@example.com', 'externe-online-schulung', 400, null, 'extern')
  abschlussSetzen('admin@example.com', 'datenschutz-dsgvo', 340, 92) // in ca. 25 Tagen fällig
  abschlussSetzen('admin@example.com', 'fremdkoerper-fod', 395, 87) // Wiederholung seit ~30 Tagen überfällig
  teilfortschritt('admin@example.com', 'ki-im-arbeitsalltag', 2, 62, 1)
  teilfortschritt('admin@example.com', 'mechanik-grundlagen', 1, 35, 4)
  teilfortschritt('admin@example.com', 'fremdkoerper-fod', 1, 20, 6)
  speichern('admin@example.com', 'luftfahrt-grundlagen', 'prompting-technik-verwaltung', '5s-ordnung')

  // Recently joined: deadlines running, first course done
  abschlussSetzen('tobias.krayer@example.com', 'datenschutz-dsgvo', 5, 85)
  teilfortschritt('tobias.krayer@example.com', 'fremdkoerper-fod', 2, 70, 1)
  speichern('tobias.krayer@example.com', 'mechanik-grundlagen')

  // Experienced colleague: almost everything in order
  for (const [slug, tage] of [
    ['datenschutz-dsgvo', 60],
    ['it-security-phishing', 90],
    ['fremdkoerper-fod', 120],
    ['brandschutz', 150],
    ['ethik-compliance', 400],
    ['erste-hilfe', 300],
  ])
    abschlussSetzen('miriam.sander@example.com', slug, tage, 90)
  abschlussSetzen('miriam.sander@example.com', 'externe-online-schulung', 500, null, 'extern')
  teilfortschritt('miriam.sander@example.com', 'messtechnik-qualitaet', 1, 55, 3)

  // The problem case: two overdue refreshers despite long tenure
  abschlussSetzen('jens.ohlendorf@example.com', 'datenschutz-dsgvo', 425, 82) // überfällig
  abschlussSetzen('jens.ohlendorf@example.com', 'brandschutz', 400, 85) // überfällig
  abschlussSetzen('jens.ohlendorf@example.com', 'it-security-phishing', 120, 84)
  abschlussSetzen('jens.ohlendorf@example.com', 'fremdkoerper-fod', 200, 88)
  abschlussSetzen('jens.ohlendorf@example.com', 'ethik-compliance', 300, 79)
  abschlussSetzen('jens.ohlendorf@example.com', 'erste-hilfe', 500, 80)
  abschlussSetzen('jens.ohlendorf@example.com', 'externe-online-schulung', 600, null, 'extern')

  // Back office: without the production specific courses, one still open
  abschlussSetzen('aylin.deveci@example.com', 'datenschutz-dsgvo', 30, 96)
  abschlussSetzen('aylin.deveci@example.com', 'brandschutz', 90, 91)
  abschlussSetzen('aylin.deveci@example.com', 'ethik-compliance', 180, 86)
  abschlussSetzen('aylin.deveci@example.com', 'erste-hilfe', 200, 88)
  teilfortschritt('aylin.deveci@example.com', 'it-security-phishing', 2, 40, 1)
  teilfortschritt('aylin.deveci@example.com', 'ki-im-arbeitsalltag', 3, 80, 2)
  speichern('aylin.deveci@example.com', 'm365-zusammenarbeit')

  // Engineering: everything valid except the external course
  abschlussSetzen('dennis.huebner@example.com', 'datenschutz-dsgvo', 100, 90)
  abschlussSetzen('dennis.huebner@example.com', 'it-security-phishing', 100, 85)
  abschlussSetzen('dennis.huebner@example.com', 'brandschutz', 150, 88)
  abschlussSetzen('dennis.huebner@example.com', 'ethik-compliance', 300, 82)
  abschlussSetzen('dennis.huebner@example.com', 'erste-hilfe', 400, 84)
  abschlussSetzen('dennis.huebner@example.com', 'fremdkoerper-fod', 60, 93)
  teilfortschritt('dennis.huebner@example.com', 'mechanik-grundlagen', 2, 50, 8)

  // Everything valid, data protection expires in a few days
  abschlussSetzen('kerstin.maas@example.com', 'datenschutz-dsgvo', 350, 88) // bald fällig
  abschlussSetzen('kerstin.maas@example.com', 'brandschutz', 20, 92)
  abschlussSetzen('kerstin.maas@example.com', 'it-security-phishing', 120, 90)
  abschlussSetzen('kerstin.maas@example.com', 'ethik-compliance', 200, 87)
  abschlussSetzen('kerstin.maas@example.com', 'erste-hilfe', 300, 85)
  abschlussSetzen('kerstin.maas@example.com', 'fremdkoerper-fod', 150, 91)
  abschlussSetzen('kerstin.maas@example.com', 'externe-online-schulung', 500, null, 'extern')
  teilfortschritt('kerstin.maas@example.com', '5s-ordnung', 1, 30, 12)

  // Managers: fully compliant - the picture that should be the norm
  for (const email of ['lena.brandt@example.com', 'sofia.reinke@example.com']) {
    abschlussSetzen(email, 'datenschutz-dsgvo', 45, 94)
    abschlussSetzen(email, 'it-security-phishing', 70, 91)
    abschlussSetzen(email, 'ethik-compliance', 120, 89)
    abschlussSetzen(email, 'brandschutz', 80, 90)
    abschlussSetzen(email, 'erste-hilfe', 220, 92)
    abschlussSetzen(email, 'fremdkoerper-fod', 100, 95)
    abschlussSetzen(email, 'externe-online-schulung', 450, null, 'extern')
  }
}

/* -------------------------------------------- Performance: Beispieldaten */

const KOMPETENZEN = [
  ['Fachliche Ausführung', 'Handwerk', 'Arbeitet normgerecht, sauber und reproduzierbar'],
  ['Qualitätsbewusstsein', 'Handwerk', 'Erkennt Abweichungen früh und meldet sie'],
  ['Arbeitssicherheit', 'Handwerk', 'Hält Vorgaben auch unter Zeitdruck ein'],
  ['Dokumentation', 'Prozess', 'Führt Nachweise vollständig und nachvollziehbar'],
  ['Selbstständigkeit', 'Prozess', 'Trifft im eigenen Rahmen tragfähige Entscheidungen'],
  ['Zusammenarbeit', 'Verhalten', 'Teilt Wissen, hilft aus, nimmt Kritik an'],
  ['Kundenumgang', 'Verhalten', 'Tritt beim Kunden sicher und verbindlich auf'],
  ['Digitale Werkzeuge', 'Zukunft', 'Nutzt die freigegebenen Systeme sicher'],
]

/**
 * Legt Kompetenzen, Ziele, Reviews und ein Stimmungsbild an.
 * Die Werte sind so gestreut, dass Heatmap und Netzdiagramm etwas zeigen -
 * inklusive der unangenehmen Erkenntnis, dass die Leistungsträger unzufriedener
 * sind als der Durchschnitt. Genau dafür ist die Auswertung da.
 */
function performanceDemo() {
  KOMPETENZEN.forEach(([name, kategorie, beschreibung], i) => {
    db.prepare('INSERT INTO competencies (name, beschreibung, kategorie, sortierung) VALUES (?,?,?,?)').run(
      name,
      beschreibung,
      kategorie,
      i,
    )
  })
  const komp = db.prepare('SELECT * FROM competencies ORDER BY sortierung').all()

  const ziel = (email, titel, opt = {}) => {
    const uid = userId(email)
    if (!uid) return
    db.prepare(
      `INSERT INTO goals (user_id, titel, beschreibung, art, einheit, startwert, zielwert, istwert,
                          faellig_am, gewichtung, course_id, status, erstellt_von, erstellt_am, abgeschlossen_am)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      uid,
      titel,
      opt.beschreibung ?? null,
      opt.art ?? 'messbar',
      opt.einheit ?? null,
      opt.startwert ?? 0,
      opt.zielwert ?? 100,
      opt.istwert ?? 0,
      opt.faellig_am ?? addDays(JETZT, 90),
      opt.gewichtung ?? 1,
      opt.course_id ?? null,
      opt.status ?? 'laufend',
      userId('admin@example.com'),
      JETZT,
      opt.status === 'erreicht' ? (opt.abgeschlossen_am ?? opt.faellig_am ?? JETZT) : null,
    )
  }

  const kursId2 = (slug) => kursId(slug)?.id ?? null

  // Admin: gemischtes Bild für die Vorführung
  ziel('admin@example.com', 'Alle Pflichtschulungen aktuell halten', {
    beschreibung: 'Kein Nachweis läuft ab, ohne dass die Wiederholung terminiert ist.',
    art: 'binaer', istwert: 0, faellig_am: addDays(JETZT, 21), gewichtung: 3,
  })
  ziel('admin@example.com', 'KI-Grundlagen abschließen', {
    beschreibung: 'Verknüpft mit der Schulung - der Fortschritt zählt automatisch.',
    course_id: kursId2('ki-im-arbeitsalltag'), faellig_am: addDays(JETZT, 45), gewichtung: 2,
  })
  ziel('admin@example.com', 'Schulungsplattform bei der GF vorstellen', {
    art: 'binaer', istwert: 1, status: 'erreicht', faellig_am: addDays(JETZT, -10), gewichtung: 2,
  })

  ziel('tobias.krayer@example.com', 'Onboarding vollständig abschließen', {
    beschreibung: 'Alle Pflichtschulungen innerhalb der Frist.',
    einheit: 'Schulungen', startwert: 0, zielwert: 7, istwert: 1,
    faellig_am: addDays(JETZT, 14), gewichtung: 3,
  })
  ziel('tobias.krayer@example.com', 'Selbstständig an Baugruppe B arbeiten', {
    art: 'binaer', istwert: 0, faellig_am: addDays(JETZT, 120),
  })

  ziel('miriam.sander@example.com', 'Prüfmittelüberwachung digitalisieren', {
    einheit: '% erfasst', zielwert: 100, istwert: 72, faellig_am: addDays(JETZT, 60), gewichtung: 2,
  })
  ziel('miriam.sander@example.com', 'Zwei Kollegen in Messtechnik einarbeiten', {
    einheit: 'Personen', zielwert: 2, istwert: 2, status: 'erreicht', faellig_am: addDays(JETZT, -20),
  })

  ziel('jens.ohlendorf@example.com', 'Überfällige Unterweisungen nachholen', {
    einheit: 'Schulungen', zielwert: 2, istwert: 0, faellig_am: addDays(JETZT, -5), gewichtung: 3,
  })
  ziel('aylin.deveci@example.com', 'Auftragsdurchlauf um zwei Tage verkürzen', {
    einheit: 'Tage', startwert: 9, zielwert: 7, istwert: 8, faellig_am: addDays(JETZT, 75), gewichtung: 2,
  })
  ziel('dennis.huebner@example.com', 'Zeichnungsnormen auf aktuellen Stand bringen', {
    einheit: '% geprüft', zielwert: 100, istwert: 40, faellig_am: addDays(JETZT, 30), gewichtung: 2,
  })
  ziel('kerstin.maas@example.com', 'Rüstzeiten dokumentieren', {
    einheit: '% erfasst', zielwert: 100, istwert: 95, faellig_am: addDays(JETZT, 40),
  })

  // Reviews: abgeschlossene Runde mit gestreuten Bewertungen
  const review = (email, bewertung, staerken, entwicklung) => {
    const uid = userId(email)
    if (!uid) return
    const info = db
      .prepare(
        `INSERT INTO reviews (user_id, zeitraum, status, bewertung, zielerreichung, staerken, entwicklung,
                              gespraech_am, fuehrungskraft, erstellt_am, abgeschlossen_am)
         VALUES (?,?, 'abgeschlossen', ?,?,?,?,?,?,?,?)`,
      )
      .run(uid, '2026 H1', bewertung, null, staerken, entwicklung, heuteMinus(40), 'Lena Brandt', heuteMinus(50), heuteMinus(40))
    return Number(info.lastInsertRowid)
  }

  const reviews = {
    'miriam.sander@example.com': review('miriam.sander@example.com', 5, 'Sehr genau, denkt Prozesse zu Ende.', 'Mehr Wissen aktiv weitergeben.'),
    'kerstin.maas@example.com': review('kerstin.maas@example.com', 4, 'Zuverlässig, gute Planung.', 'Digitale Werkzeuge stärker nutzen.'),
    'dennis.huebner@example.com': review('dennis.huebner@example.com', 4, 'Saubere Zeichnungen.', 'Normenkenntnis vertiefen.'),
    'aylin.deveci@example.com': review('aylin.deveci@example.com', 3, 'Behält den Überblick.', 'Rückfragen früher stellen.'),
    'tobias.krayer@example.com': review('tobias.krayer@example.com', 3, 'Lernt schnell.', 'Noch Sicherheit in der Ausführung gewinnen.'),
    'jens.ohlendorf@example.com': review('jens.ohlendorf@example.com', 2, 'Große Erfahrung am Bauteil.', 'Nachweise und Fristen konsequent führen.'),
    'admin@example.com': review('admin@example.com', 4, 'Treibt Digitalisierung voran.', 'Themen früher abstimmen.'),
  }

  // Kompetenzbewertungen: Ist und Soll je Person
  const profile = {
    'miriam.sander@example.com': [4, 4, 4, 4, 3, 3, 3, 2],
    'kerstin.maas@example.com': [3, 3, 3, 4, 3, 3, 2, 2],
    'dennis.huebner@example.com': [4, 3, 2, 3, 3, 3, 2, 3],
    'aylin.deveci@example.com': [2, 3, 2, 4, 3, 4, 3, 3],
    'tobias.krayer@example.com': [2, 2, 2, 2, 2, 3, 2, 3],
    'jens.ohlendorf@example.com': [4, 3, 2, 1, 3, 2, 2, 1],
    'lena.brandt@example.com': [3, 4, 4, 3, 4, 4, 4, 3],
    'sofia.reinke@example.com': [4, 4, 4, 4, 4, 4, 3, 3],
    'admin@example.com': [2, 3, 3, 4, 4, 4, 3, 4],
  }
  const soll = [3, 4, 4, 3, 3, 3, 3, 3]

  for (const [email, stufen] of Object.entries(profile)) {
    const uid = userId(email)
    if (!uid) continue
    stufen.forEach((stufe, i) => {
      db.prepare(
        `INSERT INTO competency_ratings (user_id, competency_id, review_id, stufe, soll_stufe, quelle, erstellt_am)
         VALUES (?,?,?,?,?,'fuehrungskraft',?)`,
      ).run(uid, komp[i].id, reviews[email] ?? null, stufe, soll[i], heuteMinus(40))
      // Selbsteinschätzung leicht abweichend - das macht das Netzdiagramm interessant
      db.prepare(
        `INSERT INTO competency_ratings (user_id, competency_id, stufe, soll_stufe, quelle, erstellt_am)
         VALUES (?,?,?,?, 'selbst',?)`,
      ).run(uid, komp[i].id, Math.min(4, stufe + (i % 3 === 0 ? 1 : 0)), soll[i], heuteMinus(42))
    })
  }

  // Stimmungsbild der laufenden Runde
  const d = new Date(JETZT)
  const runde = `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`
  const FRAGEN = [
    'Ich weiß, was von mir erwartet wird.',
    'Ich bekomme regelmäßig hilfreiche Rückmeldung.',
    'Ich kann mich hier fachlich weiterentwickeln.',
    'Ich habe die Mittel, meine Arbeit gut zu machen.',
    'Ich würde dieses Unternehmen als Arbeitgeber weiterempfehlen.',
  ]
  // Leistungsträger antworten bewusst schlechter bei Rückmeldung und Entwicklung
  const antworten = {
    'miriam.sander@example.com': [4, 2, 2, 4, 3],
    'kerstin.maas@example.com': [4, 3, 3, 4, 4],
    'dennis.huebner@example.com': [4, 2, 3, 3, 4],
    'aylin.deveci@example.com': [4, 4, 4, 4, 4],
    'tobias.krayer@example.com': [3, 4, 5, 4, 5],
    'jens.ohlendorf@example.com': [3, 3, 2, 3, 3],
    'lena.brandt@example.com': [5, 4, 4, 4, 4],
    'sofia.reinke@example.com': [4, 3, 3, 4, 4],
    'pawel.nowak@example.com': [3, 4, 4, 3, 4],
    'admin@example.com': [4, 3, 4, 3, 4],
  }
  for (const [email, werte] of Object.entries(antworten)) {
    const uid = userId(email)
    if (!uid) continue
    werte.forEach((wert, i) => {
      db.prepare('INSERT INTO survey_answers (user_id, runde, frage, wert, erstellt_am) VALUES (?,?,?,?,?)').run(
        uid, runde, FRAGEN[i], wert, heuteMinus(7),
      )
    })
  }
}

/* -------------------------------------------------------------- Entry point */

export async function seed({ force = false } = {}) {
  const vorhanden = db.prepare('SELECT COUNT(*) AS n FROM courses').get().n
  if (vorhanden > 0 && !force) return false

  if (force) {
    for (const t of [
      'survey_answers',
      'competency_ratings',
      'reviews',
      'goal_updates',
      'goals',
      'competencies',
      'notifications',
      'notification_settings',
      'audit_log',
      'external_proofs',
      'saved_courses',
      'quiz_unlocks',
      'quiz_attempts',
      'completions',
      'course_starts',
      'lesson_progress',
      'assignments',
      'curriculum_courses',
      'curricula',
      'answers',
      'questions',
      'lessons',
      'quizzes',
      'courses',
      'sessions',
      'users',
    ])
      db.exec(`DELETE FROM ${t}`)
  }

  for (const p of PERSONEN) {
    const { hash, salt } = hashPassword(p.passwort)
    db.prepare(
      `INSERT INTO users (id, email, name, rolle, standort, abteilung, position, eintrittsdatum,
                          passwort_hash, passwort_salt, passwort_wechsel, aktiv, erstellt_am)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?)`,
    ).run(
      uuid(),
      p.email,
      p.name,
      p.rolle,
      p.standort,
      p.abteilung,
      p.position,
      `${p.eintritt}T08:00:00.000Z`,
      hash,
      salt,
      p.wechsel ? 1 : 0,
      JETZT,
    )
  }

  KURSE.forEach((k, i) => kursEinfuegen(k, i))

  for (const c of CURRICULA) {
    const info = db
      .prepare('INSERT INTO curricula (slug, titel, beschreibung, reihenfolge_erzwungen, akzent, demo, erstellt_am) VALUES (?,?,?,1,?,1,?)')
      .run(c.slug, c.titel, c.beschreibung, c.akzent, JETZT)
    const cid = Number(info.lastInsertRowid)
    c.kurse.forEach((slug, i) => {
      const kurs = kursId(slug)
      if (kurs)
        db.prepare('INSERT INTO curriculum_courses (curriculum_id, course_id, position) VALUES (?,?,?)').run(cid, kurs.id, i + 1)
    })
  }

  demoVerlauf()
  performanceDemo()
  await demoPdfsSchreiben()

  console.log(
    `Sample data created: ${PERSONEN.length} people, ${KURSE.length} courses, ${CURRICULA.length} learning paths.`,
  )
  return true
}

export function seedWennLeer() {
  const vorhanden = db.prepare('SELECT COUNT(*) AS n FROM courses').get().n
  if (vorhanden === 0) {
    console.log('Database is empty - creating sample data …')
    return seed()
  }
  return Promise.resolve(false)
}

if (process.argv.includes('--force')) {
  await seed({ force: true })
  console.log('Sample data rebuilt.')
}
