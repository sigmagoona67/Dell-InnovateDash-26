# CareBridge AI — Pitch Deck Notes

Deck file: `carebridge-deck.html` (open in any browser; reveal.js via CDN, no build step).
Navigate with arrow keys or space. Press `F` for fullscreen, `S` for speaker view, `Esc` for the slide overview.

---

## Per-slide speaker notes

1. **Title — "AI Supports Overnight, Humans Lead the Care."**
   Open with the tagline. We're a dual-portal platform built for Singapore Children's Society: warm after-hours AI for youth, operational insight for youth workers.

2. **Problem Statement (HMW)**
   Read the How-Might-We aloud once, slowly. Frame both sides — workers managing many youths, youths needing empathetic after-hours support — so workers can follow up in a timely, personal way.

3. **The Problem**
   Three real frictions: workers juggle large caseloads; signals are scattered across notes/chats/check-ins; after-hours distress is seen too late, only the next working day. The cost is youth feeling unheard and workers starting each day blind.

4. **Why It Matters (evidence)**
   Hit the figures as bold facts, not a lecture: 30.6% of SG youth (15–35) in severe distress (IMH 2024); only 31.8% sought help and 84.8% undiagnosed, 49% silent fearing they'd burden others (CARE SG × Milieu 2024); 1 in 4 have self-harmed, and distress peaks at night. The need is real and largely silent.

5. **Vision**
   The one line that anchors everything: AI is never the therapist — it holds the night with calm presence, then hands a human-ready summary to the worker who leads the real care.

6. **What Is CareBridge AI (dual portal)**
   One platform, two portals. Youth Portal = warm companion + mood check-in. Staff Portal = caseload dashboard with summaries, risk alerts, insights, matching. The "bridge" is the AI summarizing and routing overnight chats to the right worker.

7. **Experience Flow**
   Walk the six steps: questionnaire → compatibility matching → after-hours check-in/chat → AI analysis (summary + risk screen) → staff triage dashboard → personalized human follow-up. Teal steps are youth-facing, sky steps are staff-facing.

8. **Who Uses It**
   Contrast the two experiences side by side — youth get a calm, private companion matched to a trusted worker; staff get a prioritized caseload, AI summaries, risk alerts, and compatibility matching.

9. **Prototype Features**
   What's built and demo-ready: Smart Matching, after-hours AI chat + mood, AI summaries & risk alerts (High/Medium/Low read by weight + shape + label), and caseload triage. Tie each back to a step from the flow slide.

10. **How Risk Is Read (responsible design)**
    Reassure on tone: HIGH risk = solid fill + accent bar, surfaced first; MEDIUM/LOW = soft chips; operational status (Unassigned/Onboarding/Offline/Incomplete) lives in a separate violet family so it never collides with risk amber. Calm, never alarming — built for vulnerable youth.

11. **Impact & Future Direction**
    Value for youth (someone to turn to after hours), workers (less context-rebuilding, more follow-up), and the org (a scalable bridge that extends reach without replacing the relationship). Future: deeper matching, trend insights, worker-in-the-loop escalation, outcome tracking with SCS. Stay factual — no invented metrics.

12. **Thank You / Contact**
    Close on the tagline again and invite the conversation. Clean contact placeholder (Team CareBridge AI · hello@carebridge.ai · Dell InnovateDash 2026). No Slidesgo attribution, no freepik email.

---

## How to port this to Google Slides

Recreate the look natively in Slides — the deck is intentionally simple so it maps cleanly.

### Fonts
- **Headings / display:** **Sora** (weights 600, 700). Add via *More fonts* in Slides if not listed.
- **Body / UI:** **Lato** (weights 400, 500, 700).
- Remove any leftover DM Sans / template fonts.
- Type roles: Hero/display ~40pt Sora 700; H1 ~30pt Sora 700; H2 ~22pt Sora 600; H3 ~18pt Sora 600; body ~15pt Lato 400; labels ~13pt Lato 500 (uppercase, letter-spaced); captions ~12pt Lato 500 in slate-500.

### Color palette (hex — set these as theme/custom colors)
**Ink (title slides, headings)**
- ink-900 `#0c343d` · ink-800 `#134f5c`

**Slate (text + surfaces)**
- slate-800 `#243240` (body) · slate-600 `#4a5d6b` (secondary) · slate-500 `#6b7c89` (captions)
- slate-400 `#9aa8b2` (decorative only) · slate-200 `#d8e0e5` (borders) · slate-100 `#eaeef1` · slate-50 `#f5f7f9` (bg tint)

**Sky — staff / operational / info**
- sky-600 `#2f6f8a` · sky-500 `#3d8ba8` · sky-100 `#dceef7` · sky-50 `#f0f8fc`

**Teal — youth / companion / care (AI chat)**
- teal-600 `#3a7d72` · teal-500 `#4a9d8f` · teal-100 `#d4f0eb` · teal-50 `#eef8f6`

**Mist (chart/illustration bridge tone)**
- mist-200 `#88ada5`

**Risk & status**
- danger (HIGH): 700 `#8f2f3a` · 600 `#b4434f` · 100 `#f7e4e6`
- warning (MEDIUM only): 500 `#c98a3c` · 100 `#f6ecda`
- success (LOW / complete): 600 `#3f8f6f` · 100 `#dcefe6`
- status-violet (operational status only): 500 `#6d6aa8` · 100 `#e8e7f2`

### Semantic rules to preserve in Slides
- **Teal = youth/warm, Sky = staff/operational.** Keep portal accents consistent.
- **Risk reads by weight + shape + label, never color or emoji alone.** HIGH = solid danger fill with an accent bar; MEDIUM/LOW = soft chips.
- **Operational status uses violet, never amber** — this is what stops "Medium risk" colliding with "Offline".
- **success = emerald-ish only; sky = info only.** Don't reuse one for the other.
- Tone stays calm, warm, low-arousal — not clinical, not alarming.

### Geometry / styling to mimic
- **Title slides:** solid ink-900 `#0c343d` (slide 1, 4, 11) or ink-800 `#134f5c` (slide 5, 12) backgrounds, white Sora headings.
- **Content slides:** white or slate-50 `#f5f7f9` background.
- **Cards:** white fill, 1px slate-200 `#d8e0e5` border, ~20px corner radius, soft shadow (approx `0 4px 20px -8px rgba(18,79,92,0.12)`). Tinted cards use teal-50 or sky-50 fills.
- **Chips/pills:** fully rounded; HIGH = solid `#b4434f` fill + white text; MEDIUM = `#f6ecda` bg / `#c98a3c` text; LOW = `#dcefe6` / `#3f8f6f`; operational = `#e8e7f2` / `#6d6aa8`.
- Logo mark = a heart on a teal→sky gradient square.

### Which slides changed vs the old Slidesgo template, and why
- **Removed entirely:** the Slidesgo attribution/credits slide and the `youremail@freepik.com` placeholder — replaced by a clean Team CareBridge AI contact block (slide 12).
- **Removed:** empty stock mockup slides and generic agency filler — replaced with product-true content (dual portal, experience flow, prototype features).
- **Rebranded:** all stock fonts/colors swapped to the unified Sora/Lato + teal/sky/ink system above, so nothing falls through to a generic template palette.
- **Re-sequenced to a pitch arc:** Title → Problem statement → Problem → Evidence → Vision → What it is → Flow → Who uses it → Features → Responsible risk design → Impact/future → Thank you.
- **Kept factual:** only the cited evidence stats (IMH 2024; CARE SG × Milieu 2024) are used as figures — no invented metrics.
