/**
 * Zertifikat als PDF (A4 quer).
 *
 * Schrift: Helvetica aus dem PDF-Standardsatz - so bleibt das Projekt ohne
 * Schriftdatei lauffähig. Eigene Hausschrift als TTF/OTF unter media/fonts/
 * ablegen und hier mit @pdf-lib/fontkit einbinden.
 *
 * Logo: liegt public/brand/logo.png vor, wird es eingebettet - sonst steht dort
 * der Name der Organisation als Text.
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import { ROOT } from './db.js'
import { konfiguration } from './config.js'

const ANTHRAZIT = rgb(0x53 / 255, 0x53 / 255, 0x53 / 255)
const GRUEN = rgb(0x38 / 255, 0xa4 / 255, 0x46 / 255)
const HELLGRAU = rgb(0xf2 / 255, 0xf2 / 255, 0xf2 / 255)
const SCHWARZ = rgb(0.1, 0.1, 0.1)

/**
 * Farbe in Richtung Weiß aufhellen.
 *
 * Bewusst als echte Farbe statt über Deckkraft: pdf-lib setzt `borderOpacity`
 * bei drawSvgPath nicht in einen Transparenzzustand um (im erzeugten PDF steht
 * dann weder ExtGState noch /CA) - die Form käme in voller Farbe heraus. Auf
 * weißem Grund ist eine vorab verrechnete Volltonfarbe ohnehin die robustere
 * Wahl: kein Transparenzobjekt, das ein Drucker oder ein alter Betrachter
 * unterschiedlich auflöst.
 */
const aufgehellt = (farbe, anteil) =>
  rgb(
    1 - anteil * (1 - farbe.red),
    1 - anteil * (1 - farbe.green),
    1 - anteil * (1 - farbe.blue),
  )

const datumDe = (iso) =>
  iso ? new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : '—'

export async function zertifikatPdf({ abschluss, user }) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Schulungsnachweis ${abschluss.zertifikat_nr}`)
  pdf.setAuthor(konfiguration.organisation)
  pdf.setSubject(abschluss.titel)

  const seite = pdf.addPage([842, 595]) // A4 quer
  const { width, height } = seite.getSize()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  // Rahmen und Akzent
  seite.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) })
  seite.drawRectangle({ x: 0, y: height - 10, width, height: 10, color: GRUEN })
  seite.drawRectangle({ x: 40, y: 40, width: width - 80, height: height - 100, borderColor: HELLGRAU, borderWidth: 1 })

  /* Winkelmotiv rechts - dieselbe Formensprache wie in der Oberfläche (siehe
     src/components/Motiv.jsx), damit Zertifikat und Plattform erkennbar
     zusammengehören.
     Bewusst sehr blass: Das hier ist ein Nachweis, den Leute abheften und
     ausdrucken. Er soll Charakter haben, aber weder vom Text ablenken noch
     unnötig Toner kosten. Wird als Erstes gezeichnet, alles Weitere liegt darüber. */
  const WINKEL = 'M 0 0 L 60 60 L 0 120'
  for (const [i, x] of [520, 580, 640].entries()) {
    seite.drawSvgPath(WINKEL, { x, y: 420, scale: 2, borderColor: aufgehellt(GRUEN, 0.13 - i * 0.035), borderWidth: 15 })
  }

  // Logo
  const logoPfad = join(ROOT, 'public', 'brand', 'logo.png')
  if (existsSync(logoPfad)) {
    const bild = await pdf.embedPng(readFileSync(logoPfad))
    const breite = 150
    const hoehe = (bild.height / bild.width) * breite
    seite.drawImage(bild, { x: 70, y: height - 70 - hoehe, width: breite, height: hoehe })
  } else {
    seite.drawText(konfiguration.organisation.toUpperCase(), { x: 70, y: height - 100, size: 20, font: bold, color: ANTHRAZIT })
  }

  let y = height - 190

  seite.drawText('Schulungsnachweis', { x: 70, y, size: 30, font: bold, color: ANTHRAZIT })
  y -= 18
  seite.drawRectangle({ x: 70, y: y - 4, width: 90, height: 3, color: GRUEN })

  y -= 50
  seite.drawText('Hiermit wird bestätigt, dass', { x: 70, y, size: 11, font: regular, color: ANTHRAZIT })

  y -= 34
  seite.drawText(user.name, { x: 70, y, size: 24, font: bold, color: SCHWARZ })

  y -= 26
  seite.drawText(`${user.abteilung} · Standort ${user.standort}`, { x: 70, y, size: 11, font: regular, color: ANTHRAZIT })

  y -= 34
  seite.drawText('die folgende Schulung erfolgreich abgeschlossen hat:', {
    x: 70,
    y,
    size: 11,
    font: regular,
    color: ANTHRAZIT,
  })

  y -= 32
  const titel = abschluss.titel.length > 62 ? abschluss.titel.slice(0, 60) + '…' : abschluss.titel
  seite.drawText(titel, { x: 70, y, size: 18, font: bold, color: GRUEN })

  // Datenblock unten
  const zeilen = [
    ['Abgeschlossen am', datumDe(abschluss.abgeschlossen_am)],
    ['Gültig bis', abschluss.gueltig_bis ? datumDe(abschluss.gueltig_bis) : 'unbefristet'],
    ['Ergebnis', abschluss.prozent != null ? `${abschluss.prozent} % im Abschlussquiz` : 'ohne Quiz'],
    ['Nachweisart', { plattform: `${konfiguration.plattform} (online)`, praesenz: 'Präsenzunterweisung', extern: 'externer Anbieter', import: 'Datenübernahme' }[abschluss.quelle] ?? abschluss.quelle],
    ['Anbieter', abschluss.anbieter || konfiguration.plattform],
    ['Nachweisnummer', abschluss.zertifikat_nr],
  ]

  let by = 190
  for (const [label, wert] of zeilen) {
    seite.drawText(label, { x: 70, y: by, size: 9, font: regular, color: rgb(0.55, 0.55, 0.55) })
    seite.drawText(String(wert), { x: 230, y: by, size: 10, font: bold, color: SCHWARZ })
    by -= 22
  }

  // Fußzeile
  seite.drawText(`${konfiguration.organisation} · Interne Schulungsplattform (${konfiguration.plattform})`, {
    x: 70,
    y: 62,
    size: 8,
    font: regular,
    color: rgb(0.6, 0.6, 0.6),
  })
  if (konfiguration.claim) {
    seite.drawText(konfiguration.claim, {
      x: width - 70 - regular.widthOfTextAtSize(konfiguration.claim, 8),
      y: 62,
      size: 8,
      font: regular,
      color: rgb(0.6, 0.6, 0.6),
    })
  }

  // Demo-Kennzeichnung: solange der Kursinhalt Demo-Inhalt ist, darf dieses
  // Zertifikat nicht als echter Nachweis verwendet werden.
  if (abschluss.demo) {
    const text = 'DEMO — fachlich nicht freigegeben'
    seite.drawRectangle({
      x: width - 70 - 250,
      y: height - 132,
      width: 250,
      height: 26,
      color: rgb(1, 0.96, 0.85),
      borderColor: rgb(1, 0.77, 0.23),
      borderWidth: 1,
    })
    seite.drawText(text, {
      x: width - 70 - 250 + 14,
      y: height - 124,
      size: 10,
      font: bold,
      color: rgb(0.6, 0.42, 0),
    })
    seite.drawText(text, {
      x: 210,
      y: 320,
      size: 42,
      font: bold,
      color: rgb(0.95, 0.9, 0.78),
      rotate: degrees(20),
      opacity: 0.55,
    })
  }

  return Buffer.from(await pdf.save())
}
