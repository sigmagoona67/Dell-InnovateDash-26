/** CareBridge AI - At a Glance Generation System — locked final user spec (2026-06-10).
 *  Single source of truth. Copy to youth-ai-chat.ts + staff-ai-assist.ts when changed. */

export const AT_A_GLANCE_PROMPT_VERSION = 'carebridge-at-a-glance-generation-system-final'

export const AT_A_GLANCE_PROMPT = `Generate overall_summary as the At a Glance section. Follow CareBridge AI - At a Glance Generation System exactly.

## Purpose

At a Glance provides a concise and continuously evolving overview of the youth.

It should help a youth worker quickly understand:
- Who this young person is
- What they have been going through
- What ongoing circumstances appear to affect them
- What emotional or behavioural patterns have emerged over time
- What currently appears to have the greatest impact on their wellbeing

At a Glance should read like a professional case overview rather than a conversation summary or questionnaire summary.

It should feel as though an experienced youth worker has written a short observational paragraph after understanding the youth over time.

## Information Sources

At a Glance should synthesise information from (context payload fields in parentheses):
- AI Conversations (youthSpeechSample)
- Offline Counselling Transcripts (offlineTranscriptSample)
- Mood Check-ins (moodHistory)
- Existing At a Glance (existingOverallSummary — for understanding only, never copy wording)
- Existing Current Care Insights (careInsights)
- Existing Session Summaries (sessionSummaries)
- Existing Dynamic Profile (dynamicProfile)
- Any stored case information in the payload

These sources form the PRIMARY basis of At a Glance because they contain context, experiences and behavioural patterns.

Fairly review and integrate ALL sources. Do NOT prioritise any single stage, source, or time period. Apply one fair whole-case check-and-integration pass.

## Questionnaire Usage

The Youth Questionnaire (questionnaireBackground) should NOT be treated as a primary information source.

Questionnaire responses are isolated self-reported labels and often lack context or causal relationships.

NEVER generate At a Glance by simply combining questionnaire fields such as Interests, Personality, Family Situation, Current Challenges, or Coping Methods into one paragraph.

Questionnaire information is OPTIONAL background only. Reference it ONLY IF:
- it has been reinforced by subsequent interactions
- it helps explain recurring behavioural patterns
- it provides meaningful background context for understanding the youth's overall situation

Questionnaire information must NEVER dominate the paragraph.

If meaningful contextual relationships cannot be reasonably established, integrate available facts into a smooth and natural paragraph.

Acceptable factual overview example: "The youth enjoys music, tends to be introverted, lives with one parent and is currently experiencing academic stress."

NEVER invent unsupported causal relationships, such as assuming that living with one parent caused academic stress or emotional difficulties, unless such relationships are reasonably supported by accumulated interactions or explicit statements from the youth.

When uncertainty exists, factual description is always preferred over speculation.

## Writing Philosophy

At a Glance should describe the youth's STORY rather than the youth's LABELS.

Synthesise information instead of listing facts.

Whenever possible, naturally connect experiences, emotions, behaviours, coping patterns, and life circumstances into one coherent understanding.

The paragraph should maintain strong logical continuity and read as one natural case portrait rather than multiple disconnected observations.

## Causal Relationships

Prioritise meaningful relationships between events, emotions and behaviours whenever sufficient evidence exists.

If available information reasonably suggests that one experience appears to influence another, describe this relationship cautiously.

NEVER invent or assume causal relationships that are not supported by available information.

If causal relationships cannot be reasonably inferred, describe observed facts together naturally without speculating about how they are connected.

Describing facts is always preferable to inventing explanations.

## Update Trigger

Whenever ANY information source changes, At a Glance should be completely regenerated.

Do NOT append sentences. Do NOT preserve previous wording.

Always regenerate the paragraph using the AI's latest understanding of the youth.

The newest version should replace the previous version entirely.

This applies equally to Assigned Youth and Unassigned Youth. Both should always display the AI's latest overall understanding.

New AI chat, new transcript upload, or questionnaire update triggers full regeneration — this does NOT mean prioritising any stage; fairly go through the whole check-and-integration process.

## Writing Style

The paragraph should:
- be written as one coherent paragraph
- maintain overall continuity and logical flow
- be professional but human-centred
- be neutral and observational
- avoid diagnosis
- avoid exaggerated conclusions
- avoid repetitive wording
- avoid sounding like AI-generated text
- avoid sounding like a report template

There is no strict word limit. While ensuring all meaningful characteristics are represented, keep the paragraph as concise as possible. Every sentence should contribute meaningful understanding.

## Avoid

Do NOT write chronological summaries, conversation summaries, transcript summaries, questionnaire summaries, bullet points, or label lists.

Do NOT use: "The youth discussed...", "The latest AI chat...", "The latest counselling session...", "Recently...", "According to the questionnaire..."

Do not mention where the information came from. Integrate all accumulated understanding naturally.

## Continuous Evolution

At a Glance is a living case portrait.

Whenever the AI's understanding of long-term circumstances, recurring emotional patterns, behavioural tendencies, meaningful life events, important coping styles, ongoing challenges, or overall wellbeing changes, the entire At a Glance paragraph should be regenerated.

The latest version should always represent the AI's best current understanding of the youth.

## Final Principle

At a Glance should answer: "If a new youth worker takes over this case today and only has 20 seconds to read one paragraph, what is the most meaningful understanding they should gain about this young person?"

Always prioritise: understanding over extraction, synthesis over summarisation, coherent narrative over isolated labels, evidence over speculation, and factual description over unsupported causal inference.

Return ONLY valid JSON: { "overall_summary": "one paragraph" }`
