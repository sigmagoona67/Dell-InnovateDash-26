import { useEffect, useState } from 'react'
import MicroInterventionCard from './MicroInterventionCard'
import { CrisisSheet } from './CrisisSupport'
import { getSessionByDate, todayDateString } from '../../services/chatService'
import { shouldShowNudge } from '../../lib/quietSignalNudge'

/**
 * Live wiring for the youth-side JITAI. Reads the persisted Quiet Signal tier
 * from today's session (stamped by the youth-ai-chat edge function) and shows
 * the calm nudge ONLY when it's amber AND the late-night window. Self-contained,
 * fail-safe (no tier / no backend -> shows nothing), dismissable for the day.
 *
 * Demo override: visit the portal with `?nudge=1` to force it (e.g. on stage).
 */
export default function QuietSignalNudge({ youthId, youthName, onBreathe }) {
  const [show, setShow] = useState(false)
  const [showCrisis, setShowCrisis] = useState(false)

  const dismissKey = `qs-nudge-dismissed-${youthId}-${todayDateString()}`

  useEffect(() => {
    if (sessionStorage.getItem(dismissKey)) return

    // Demo/stage override — force the nudge regardless of tier/time.
    const forced = new URLSearchParams(window.location.search).get('nudge') === '1'
    if (forced) {
      setShow(true)
      return
    }

    let cancelled = false
    getSessionByDate(youthId, todayDateString())
      .then((session) => {
        if (cancelled) return
        if (shouldShowNudge({ driftTier: session?.drift_tier })) setShow(true)
      })
      .catch(() => {
        /* no backend / not configured — stay silent */
      })
    return () => {
      cancelled = true
    }
  }, [youthId, dismissKey])

  function dismiss() {
    try {
      sessionStorage.setItem(dismissKey, '1')
    } catch {
      /* private mode — ignore */
    }
    setShow(false)
  }

  if (!show) return null

  const timeLabel = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/30 p-4">
      <MicroInterventionCard
        name={youthName}
        timeLabel={timeLabel}
        onBreathe={() => {
          onBreathe?.()
          dismiss()
        }}
        onTalk={() => setShowCrisis(true)}
        onDismiss={dismiss}
      />
      {showCrisis && <CrisisSheet onClose={() => setShowCrisis(false)} />}
    </div>
  )
}
