/**
 * Small markdown renderer for lesson texts.
 * Deliberately limited to what the content needs: headings, lists, tables,
 * quotes, bold and inline code. No third-party library, and no HTML from the
 * text itself - lesson content is never interpreted as HTML.
 */

function Inline({ text }) {
  const teile = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let letzter = 0
  let m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > letzter) teile.push(text.slice(letzter, m.index))
    const t = m[0]
    if (t.startsWith('**')) teile.push(<strong key={m.index} className="font-semibold text-white">{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`'))
      teile.push(
        <code
          key={m.index}
          className="rounded px-1.5 py-0.5 text-[0.9em]"
          style={{ background: 'color-mix(in srgb, #fff 8%, transparent)' }}
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

    // Table
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
                      style={{ borderColor: 'color-mix(in srgb, #fff 5%, transparent)' }}
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

    // Headings
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
        <h3 key={key()} className="mt-6 mb-2.5 text-xl font-semibold tracking-tight text-white">
          {zeile.slice(3)}
        </h3>,
      )
      i++
      continue
    }

    // Quote / key takeaway
    if (zeile.startsWith('> ')) {
      const inhalt = []
      while (i < zeilen.length && zeilen[i].startsWith('> ')) {
        inhalt.push(zeilen[i].slice(2))
        i++
      }
      bloecke.push(
        <blockquote
          key={key()}
          className="my-4 rounded-r-xl border-l-2 py-3 pl-4 pr-4 text-sm leading-relaxed"
          style={{
            borderColor: 'var(--color-akzent)',
            background: 'color-mix(in srgb, var(--color-akzent) 8%, transparent)',
          }}
        >
          {inhalt.map((z, k) => (
            <p key={k} className={k ? 'mt-1.5' : ''}>
              <Inline text={z} />
            </p>
          ))}
        </blockquote>,
      )
      continue
    }

    // Ordered list
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
                style={{ background: 'color-mix(in srgb, var(--color-akzent) 20%, transparent)', color: 'var(--color-akzent-light)' }}
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

    // Bullet list
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
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--color-akzent)' }} />
              <span>
                <Inline text={p} />
              </span>
            </li>
          ))}
        </ul>,
      )
      continue
    }

    // Paragraph
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
