import { useCallback, useEffect, useRef, useState } from 'react'
import { FastForward, Film, Lock, Pause, Play, RotateCcw } from 'lucide-react'
import { api } from '../lib/api.js'
import { sekundenZeit } from '../lib/format.js'
import { ProgressBar } from './ui.jsx'

/**
 * Video lesson with progress tracking.
 *
 * Two modes:
 *  1. A video file exists under /media - a real <video> player is used.
 *  2. No file is present - a simulated playback with a real timeline runs
 *     instead. The 95 percent rule, the seek lock and progress persistence
 *     behave identically in both cases.
 *
 * Seeking is locked on the first run of strict courses (vorspulenErlaubt=false):
 * the viewer can only jump back to the furthest position already watched.
 */
export default function LessonVideo({ lektion, vorspulenErlaubt, onFortschritt }) {
  const laenge = lektion.video_laenge_sek ?? 300
  const [position, setPosition] = useState(Math.min(lektion.max_position_sek ?? 0, laenge))
  const [maxPosition, setMaxPosition] = useState(lektion.max_position_sek ?? 0)
  const [laeuft, setLaeuft] = useState(false)
  const [hinweis, setHinweis] = useState(null)
  const videoRef = useRef(null)
  const gesendet = useRef(0)

  const prozent = Math.min(100, Math.round((maxPosition / laenge) * 100))

  const speichern = useCallback(
    async (pos, max) => {
      const p = Math.min(100, Math.round((max / laenge) * 100))
      try {
        await api.fortschritt(lektion.id, { sekunden_gesehen: max, max_position_sek: max, prozent: p })
        onFortschritt?.(p)
      } catch {
        /* Progress will be retried on the next tick */
      }
    },
    [laenge, lektion.id, onFortschritt],
  )

  // Persist progress every 10 seconds and again when leaving the lesson
  useEffect(() => {
    if (maxPosition - gesendet.current >= 10) {
      gesendet.current = maxPosition
      speichern(position, maxPosition)
    }
  }, [maxPosition, position, speichern])

  useEffect(() => () => speichern(position, maxPosition), []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------------------------------------------- simulated playback */
  useEffect(() => {
    if (!laeuft || lektion.video_vorhanden) return
    const timer = setInterval(() => {
      setPosition((p) => {
        const neu = Math.min(laenge, p + 1)
        setMaxPosition((m) => Math.max(m, neu))
        if (neu >= laenge) setLaeuft(false)
        return neu
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [laeuft, laenge, lektion.video_vorhanden])

  /* ---------------------------------------------------------- real player */
  function beiZeit(e) {
    const v = e.currentTarget
    const t = v.currentTime
    if (!vorspulenErlaubt && t > maxPosition + 2.5) {
      v.currentTime = maxPosition
      setHinweis('Beim ersten Durchlauf kann nicht vorgespult werden.')
      return
    }
    setPosition(t)
    setMaxPosition((m) => Math.max(m, t))
  }

  function springen(ziel) {
    const z = Math.max(0, Math.min(laenge, ziel))
    if (!vorspulenErlaubt && z > maxPosition) {
      setHinweis('Beim ersten Durchlauf kann nicht vorgespult werden.')
      return
    }
    setPosition(z)
    if (videoRef.current) videoRef.current.currentTime = z
  }

  return (
    <div className="space-y-3">
      {lektion.video_vorhanden ? (
        <video
          ref={videoRef}
          src={`/media/${lektion.video_datei}`}
          controls
          controlsList={vorspulenErlaubt ? undefined : 'nodownload noplaybackrate'}
          onTimeUpdate={beiZeit}
          onSeeking={beiZeit}
          onPlay={() => setLaeuft(true)}
          onPause={() => {
            setLaeuft(false)
            speichern(position, maxPosition)
          }}
          className="w-full rounded-2xl bg-black"
          style={{ aspectRatio: '16 / 9' }}
        />
      ) : (
        /* ---------------------------------------------- placeholder player */
        <div
          className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl"
          style={{
            aspectRatio: '16 / 9',
            background: 'radial-gradient(110% 110% at 20% 0%, #333535 0%, #1c1d1d 55%, #0e0f0f 100%)',
            border: '1px solid var(--border-soft)',
          }}
        >
          <img
            src="/brand/mark.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-[10%] bottom-[-25%] w-[55%] opacity-[0.05]"
          />
          <div className="relative flex flex-col items-center gap-4 px-6 text-center">
            <span
              className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: 'color-mix(in srgb, #FFC53A 16%, transparent)', color: '#FFC53A' }}
            >
              Platzhalter · simulierte Wiedergabe
            </span>
            <button
              className="grid h-16 w-16 place-items-center rounded-full transition hover:scale-105"
              style={{ background: 'var(--color-akzent)' }}
              onClick={() => setLaeuft((l) => !l)}
              aria-label={laeuft ? 'Pause' : 'Wiedergabe starten'}
            >
              {laeuft ? <Pause size={24} fill="#fff" /> : <Play size={24} fill="#fff" className="ml-1" />}
            </button>
            <div>
              <div className="text-sm font-semibold">{lektion.titel}</div>
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-faint">
                <Film size={11} />
                Für diese Lektion ist keine Videodatei hinterlegt. Die Zeitachse läuft echt mit.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2">
        <div className="relative">
          <ProgressBar prozent={(position / laenge) * 100} hoehe={6} />
          <div
            className="absolute top-0 h-1.5 rounded-full opacity-30"
            style={{ width: `${(maxPosition / laenge) * 100}%`, background: 'var(--color-akzent)' }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-faint">
          <span className="font-mono">
            {sekundenZeit(position)} / {sekundenZeit(laenge)}
          </span>
          <div className="flex items-center gap-2">
            <button className="btn-icon h-8 w-8" onClick={() => springen(position - 15)} aria-label="15 Sekunden zurück">
              <RotateCcw size={13} />
            </button>
            {!lektion.video_vorhanden && (
              <button
                className="btn btn-ghost h-8 px-3 text-[11px]"
                onClick={() => {
                  const neu = Math.min(laenge, maxPosition + 60)
                  setPosition(neu)
                  setMaxPosition(neu)
                }}
                title="Springt eine Minute weiter - nur für Demonstrationen ohne hinterlegte Videodatei."
              >
                <FastForward size={13} />
                Vorspulen: 1 Minute
              </button>
            )}
            <span className="font-semibold" style={{ color: prozent >= 95 ? 'var(--color-akzent)' : undefined }}>
              {prozent} % gesehen
            </span>
          </div>
        </div>
      </div>

      {!vorspulenErlaubt && (
        <p className="flex items-center gap-1.5 text-[11px] text-faint">
          <Lock size={11} />
          Pflichtschulung im Erstdurchlauf: Vorspulen ist gesperrt, mindestens 95 % müssen angesehen werden.
        </p>
      )}
      {hinweis && <p className="text-[11px]" style={{ color: 'var(--color-status-soon)' }}>{hinweis}</p>}
    </div>
  )
}
