const STORAGE_KEY = 'nr_nexus_marketing_attribution'

const CAMPAIGN_FIELDS = [
  'source',
  'medium',
  'campaign',
  'content',
  'term',
]

export function captureMarketingAttribution() {
  try {
    const params = new URLSearchParams(window.location.search)
    const current = {}

    for (const field of CAMPAIGN_FIELDS) {
      const value = params.get(`utm_${field}`)?.trim().slice(0, 100)
      if (value) current[field] = value
    }

    // Keep the first campaign touch for this browser session.
    if (Object.keys(current).length && !sessionStorage.getItem(STORAGE_KEY)) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    }
  } catch {
    // Attribution must never prevent the app from loading.
  }
}

export function getMarketingAttribution() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}
