/**
 * Gemeinsam genutzte YouTube-Hilfen.
 *
 * Liegt bewusst außerhalb von server/ und src/: Sowohl der Kurs-Editor in der
 * Oberfläche als auch die Seed-Daten auf dem Server müssen aus einer beliebigen
 * YouTube-Adresse dieselbe Video-ID ziehen. Zwei Kopien derselben Regex würden
 * über die Zeit auseinanderlaufen - dann erkennt der Editor eine Adressform, die
 * der Server verwirft, und niemand versteht warum.
 *
 * Enthält deshalb nichts, was nur im Browser oder nur in Node existiert.
 */

/**
 * Zieht die Video-ID aus jeder gängigen YouTube-Adresse.
 *
 * Erkannt werden: die volle watch-Adresse, youtu.be-Kurzlinks, /embed/,
 * /shorts/, /live/ sowie eine schon nackte ID. Zusätzliche Parameter wie
 * ?t=90 oder &list=… stören nicht.
 *
 * @returns {string|null} die 11-stellige ID oder null, wenn nichts passt
 */
export function youtubeIdAus(eingabe = '') {
  const text = String(eingabe).trim()
  if (/^[\w-]{11}$/.test(text)) return text

  const muster = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ]
  for (const m of muster) {
    const treffer = text.match(m)
    if (treffer) return treffer[1]
  }
  return null
}

/** Datenschutzfreundliche Einbettungsadresse (setzt ohne Wiedergabe keine Werbe-Cookies). */
export const youtubeEinbettung = (id) =>
  `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`

/** Adresse zum Öffnen bei YouTube selbst. */
export const youtubeSeite = (id) => `https://www.youtube.com/watch?v=${id}`
