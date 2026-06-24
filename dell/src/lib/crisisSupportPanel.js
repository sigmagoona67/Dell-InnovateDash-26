export const CRISIS_SUPPORT_PANEL = {
  intro:
    'If you would like additional support, confidential help is available 24 hours a day. If you feel unsafe or believe you may be at risk of harming yourself or someone else, please contact a crisis service immediately.',
  title: '24-Hour Support Resources (Singapore)',
  resources: [
    'National Mindline: 1771',
    'SOS (Samaritans of Singapore): 1-767',
    'IMH Mental Health Helpline: 6389 2222',
  ],
  closing: 'You do not have to face this alone.',
}

export function shouldShowCrisisSupportPanel(result = {}) {
  return Boolean(result.crisisDetected || result.escalationNeeded || result.riskLevel === 'high')
}
