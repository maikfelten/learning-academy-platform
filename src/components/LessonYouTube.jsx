import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Info } from 'lucide-react'
import { api } from '../lib/api.js'
import { ProgressBar } from './ui.jsx'
import { youtubeEinbettung, youtubeIdAus, youtubeSeite } from '../../shared/youtube.js'

/**
 * YouTube-Lektion.
 *
 * Eingebettet über youtube-nocookie.com - das setzt keine Werbe-Cookies, solange
 * das Video nicht gestartet wird, und hält die Einbettung datenschutzfreundlich.
 *
 * Ehrlicher Hinweis zum Fortschritt: Wie weit jemand ein YouTube-Video gesehen
 * hat, lässt sich ohne die YouTube-IFrame-API (externes Skript) nicht messen.
 * Deshalb gilt hier die Regel „Anwesenheit plus Bestätigung": Die Lektion zählt
 * als angesehen, wenn die veranschlagte Dauer im Player verbracht wurde. Für
 * auditpflichtige Pflichtschulungen gehört das Video besser als eigene Datei in
 * die Plattform - dann greift die echte 95-Prozent-Messung.
 */

// Weiterhin von hier exportiert, damit der Kurs-Editor seinen Import behält -
// die Umsetzung liegt jetzt gemeinsam mit dem Server in shared/youtube.js.
export { youtubeIdAus }

export default function LessonYouTube({ lektion, onFortschritt }) {
  const sollSekunden = Math.max(60, (lektion.dauer_min || 5) * 60)
  const [gesehen, setGesehen] = useState(Math.round(((lektion.prozent ?? 0) / 100) * sollSekunden))
  const [laeuft, setLaeuft] = useState(false)
  const gesendet = useRef(0)

  const prozent = Math.min(100, Math.round((gesehen / sollSekunden) * 100))

  // Zeit läuft, solange der Tab sichtbar und die Lektion geöffnet ist.
  useEffect(() => {
    if (!laeuft) return
    const timer = setInterval(() => {
      if (document.hidden) return
      setGesehen((s) => Math.min(sollSekunden, s + 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [laeuft, sollSekunden])

  useEffect(() => {
    if (gesehen - gesendet.current >= 10) {
      gesendet.current = gesehen
      const p = Math.min(100, Math.round((gesehen / sollSekunden) * 100))
      api.fortschritt(lektion.id, { sekunden_gesehen: gesehen, max_position_sek: gesehen, prozent: p }).catch(() => {})
      onFortschritt?.(p)
    }
  }, [gesehen, sollSekunden, lektion.id, onFortschritt])

  if (!lektion.youtube_id)
    return <div className="panel-flat p-8 text-center text-sm text-faint">Für diese Lektion ist kein Video hinterlegt.</div>

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '16 / 9' }}>
        <iframe
          src={youtubeEinbettung(lektion.youtube_id)}
          title={lektion.titel}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full border-0"
          onLoad={() => setLaeuft(true)}
        />
      </div>

      <div className="space-y-2">
        <ProgressBar prozent={prozent} hoehe={6} />
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-faint">
          <span className="flex items-center gap-1.5">
            <Info size={11} />
            Angesetzte Länge {lektion.dauer_min} min · {prozent} % erfasst
          </span>
          <a
            href={youtubeSeite(lektion.youtube_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 transition hover:text-[var(--text-strong)]"
          >
            Auf YouTube öffnen
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-faint">
        Bei eingebetteten YouTube-Videos misst die Plattform die Verweildauer, nicht die tatsächliche Abspielposition —
        das gibt YouTube ohne eigenes Skript nicht her. Für Pflichtschulungen mit Nachweispflicht gehört das Video als
        Datei in die Plattform.
      </p>
    </div>
  )
}
