/**
 * Hell/Dunkel-Umschaltung.
 *
 * Das Theme hängt als Attribut am <html>, alle Farben kommen aus den Tokens in
 * src/index.css. Die Wahl wird im Browser gespeichert; ohne gespeicherte Wahl
 * gilt Hell als Standard (auch dann, wenn das Betriebssystem dunkel eingestellt
 * ist - die Plattform wird überwiegend in hellen Werkhallen und Büros benutzt).
 */

const SCHLUESSEL = 'akademie-theme'
export const THEMES = ['hell', 'dunkel']

export function themeLesen() {
  try {
    const gespeichert = localStorage.getItem(SCHLUESSEL)
    if (THEMES.includes(gespeichert)) return gespeichert
  } catch {
    /* privater Modus o.ä. - dann eben der Standard */
  }
  return 'hell'
}

export function themeSetzen(theme) {
  const gewaehlt = THEMES.includes(theme) ? theme : 'hell'
  document.documentElement.setAttribute('data-theme', gewaehlt)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', gewaehlt === 'dunkel' ? '#1F2020' : '#F4F2EE')
  try {
    localStorage.setItem(SCHLUESSEL, gewaehlt)
  } catch {
    /* nicht kritisch */
  }
  return gewaehlt
}

/** Beim Start aufrufen, bevor gerendert wird - verhindert ein Aufblitzen. */
export function themeAnwenden() {
  return themeSetzen(themeLesen())
}
