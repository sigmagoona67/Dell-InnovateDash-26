import { useMemo } from 'react'
import { buildMoodYear, GRADE_COLORS } from '../../lib/moodHeatmap'

const CELL = 13 // px
const GAP = 3 // px
const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

/**
 * "Year in moods" heatmap — a GitHub-contribution-style grid graded by mood +
 * AI sentiment. Calm diverging scale (warm = heavier days, teal = brighter),
 * grey = no check-in. Reads the drift at a glance.
 */
export default function MoodHeatmap({
  entriesByDate = {},
  now,
  title = 'Your year in check-ins',
  subtitle = 'Each square is a day — warmer means a heavier day, teal means a brighter one.',
}) {
  const data = useMemo(() => buildMoodYear(entriesByDate, { now }), [entriesByDate, now])

  // Month labels: show a label the first time each month appears across columns.
  const monthMarkers = []
  let lastMonth = -1
  for (const m of data.monthLabels) {
    if (m.month !== lastMonth) {
      monthMarkers.push({ col: m.col, label: m.label })
      lastMonth = m.month
    }
  }

  return (
    <section className="rounded-card border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[18px] font-semibold text-ink-800">{title}</h3>
          <p className="mt-1 text-[13px] text-slate-600">{subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-pill bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-500 ring-1 ring-slate-200">
          {data.counts.graded} check-ins
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-block">
          {/* Month labels */}
          <div className="relative ml-9 h-4" style={{ width: data.weeks.length * (CELL + GAP) }}>
            {monthMarkers.map((m) => (
              <span
                key={m.col}
                className="absolute top-0 text-[11px] font-medium text-slate-500"
                style={{ left: m.col * (CELL + GAP) }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex">
            {/* Weekday labels */}
            <div className="mr-1.5 flex w-7 flex-col" style={{ gap: GAP }}>
              {WEEKDAYS.map((d, i) => (
                <span
                  key={i}
                  className="text-right text-[10px] leading-none text-slate-400"
                  style={{ height: CELL, lineHeight: `${CELL}px` }}
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Week columns */}
            <div className="flex" style={{ gap: GAP }}>
              {data.weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map((cell, di) =>
                    cell ? (
                      <div
                        key={cell.key}
                        title={cell.label}
                        className="rounded-[3px]"
                        style={{ width: CELL, height: CELL, backgroundColor: GRADE_COLORS[cell.grade] }}
                      />
                    ) : (
                      <div key={`e-${wi}-${di}`} style={{ width: CELL, height: CELL }} />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-slate-500">
        <span>Heavier</span>
        {[1, 2, 3, 4, 5].map((g) => (
          <span
            key={g}
            className="rounded-[3px]"
            style={{ width: CELL, height: CELL, backgroundColor: GRADE_COLORS[g] }}
          />
        ))}
        <span>Brighter</span>
        <span className="ml-3 inline-flex items-center gap-1.5">
          <span className="rounded-[3px]" style={{ width: CELL, height: CELL, backgroundColor: GRADE_COLORS[0] }} />
          No check-in
        </span>
      </div>
    </section>
  )
}
