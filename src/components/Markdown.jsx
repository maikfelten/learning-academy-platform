/**
 * Kleiner Markdown-Darsteller für Lektionstexte.
 * Bewusst nur der Umfang, den die Inhalte brauchen: Überschriften, Listen,
 * Tabellen, Zitate, fett und Inline-Code. Keine Fremdbibliothek, kein HTML aus
 * dem Text (Sicherheitsgrund: Inhalte werden nie als HTML interpretiert).
 */

function Inline({ text }) {
  const teile = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let letzter = 0
  let m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > letzter) teile.push(text.slice(letzter, m.index))
    const t = m[0]
    if (t.startsWith('**')) teile.push(<strong key={m.index} className="font-semibold text-[var(--text-strong)]">{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`'))
      teile.push(
        <code
          key={m.index}
          className="rounded px-1.5 py-0.5 text-[0.9em]"
          style={{ background: 'var(--tint-3)' }}
        >
          {t.slice(1, -1)}
        </code>,
      )
    else teile.push(<em key={m.index}>{t.slice(1, -1)}</em>)
    letzter = m.index + t.length
  }
  if (letzter < text.length) teile.push(text.slice(letzter))
  return <>{teile}</>
}

export default function Markdown({ text }) {
  if (!text) return null
  const zeilen = text.split('\n')
  const bloecke = []
  let i = 0

  const key = () => `b${bloecke.length}`

  while (i < zeilen.length) {
    const zeile = zeilen[i]

    if (!zeile.trim()) {
      i++
      continue
    }

    // Tabelle
    if (zeile.trim().startsWith('|') && zeilen[i + 1]?.includes('---')) {
      const kopf = zeile.split('|').slice(1, -1).map((z) => z.trim())
      i += 2
      const reihen = []
      while (i < zeilen.length && zeilen[i].trim().startsWith('|')) {
        reihen.push(zeilen[i].split('|').slice(1, -1).map((z) => z.trim()))
        i++
      }
      bloecke.push(
        <div key={key()} className="my-4 overflow-x-auto scroll-slim">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr>
                {kopf.map((z, k) => (
                  <th
                    key={k}
                    className="border-b px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-faint"
                    style={{ borderColor: 'var(--border-soft)' }}
                  >
                    {z}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reihen.map((r, ri) => (
                <tr key={ri}>
                  {r.map((z, zi) => (
                    <td
                      key={zi}
                      className="border-b px-3 py-2 align-top text-muted"
                      style={{ borderColor: 'var(--tint-2)' }}
                    >
                      <Inline text={z} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // Überschriften
    if (zeile.startsWith('### ')) {
      bloecke.push(
        <h4 key={key()} className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wider text-faint">
          {zeile.slice(4)}
        </h4>,
      )
      i++
      continue
    }
    if (zeile.startsWith('## ')) {
      bloecke.push(
        <h3 key={key()} className="mt-6 mb-2.5 text-xl font-semibold tracking-tight text-[var(--text-strong)]">
          {zeile.slice(3)}
        </h3>,
      )
      i++
      continue
    }

    // Zitat / Merksatz
    if (zeile.startsWith('> ')) {
      const inhalt = []
      while (i < zeilen.length && zeilen[i].startsWith('> ')) {
        inhalt.push(zeilen[i].slice(2))
        i++
      }
      // Merksatz als ruhige Fläche mit größerer Schrift statt farbigem
      // Seitenbalken - der Balken ist ein Aufmerksamkeitsschrei, den der Text
      // hier nicht braucht, und ein abgenutztes Muster obendrein.
      bloecke.push(
        <blockquote
          key={key()}
          className="my-5 rounded-xl px-5 py-4 text-[15px] leading-relaxed"
          style={{
            background: 'var(--tint-2)',
            border: '1px solid var(--border-soft)',
          }}
        >
          {inhalt.map((z, k) => (
            <p key={k} className={k ? 'mt-2' : ''}>
              <Inline text={z} />
            </p>
          ))}
        </blockquote>,
      )
      continue
    }

    // Nummerierte Liste
    if (/^\d+\.\s/.test(zeile)) {
      const punkte = []
      while (i < zeilen.length && /^\d+\.\s/.test(zeilen[i])) {
        punkte.push(zeilen[i].replace(/^\d+\.\s/, ''))
        i++
      }
      bloecke.push(
        <ol key={key()} className="my-3 space-y-2">
          {punkte.map((p, k) => (
            <li key={k} className="flex gap-3 text-sm leading-relaxed text-muted">
              <span
                className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold"
                style={{ background: 'color-mix(in srgb, var(--color-mis-gruen) 20%, transparent)', color: 'var(--color-mis-gruen-light)' }}
              >
                {k + 1}
              </span>
              <span>
                <Inline text={p} />
              </span>
            </li>
          ))}
        </ol>,
      )
      continue
    }

    // Aufzählung
    if (/^[-*]\s/.test(zeile)) {
      const punkte = []
      while (i < zeilen.length && /^[-*]\s/.test(zeilen[i])) {
        punkte.push(zeilen[i].slice(2))
        i++
      }
      bloecke.push(
        <ul key={key()} className="my-3 space-y-1.5">
          {punkte.map((p, k) => (
            <li key={k} className="flex gap-3 text-sm leading-relaxed text-muted">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-mis-gruen)' }} />
              <span>
                <Inline text={p} />
              </span>
            </li>
          ))}
        </ul>,
      )
      continue
    }

    // Absatz
    const absatz = []
    while (i < zeilen.length && zeilen[i].trim() && !/^(#{2,3}\s|[-*]\s|\d+\.\s|>\s|\|)/.test(zeilen[i])) {
      absatz.push(zeilen[i])
      i++
    }
    bloecke.push(
      <p key={key()} className="my-3 text-sm leading-relaxed text-muted">
        <Inline text={absatz.join(' ')} />
      </p>,
    )
  }

  return <div className="max-w-[68ch]">{bloecke}</div>
}
