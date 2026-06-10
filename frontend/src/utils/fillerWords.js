/**
 * Heuristic filler / hedge detection for interview transcripts (Whisper, browser STT, etc.).
 * Whisper often spells hesitations as stretched tokens ("uhhh", "aaa", "ummm") or spaced
 * repeats ("uh uh"); we normalize punctuation/glue characters first, then match broadly.
 */

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeTranscript(text) {
  let s = text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")

  // ASR artifacts: brackets, asterisks
  s = s.replace(/[\u005b\u005d(){}*]/g, ' ')

  // Glue characters that attach fillers to real words ("like,uhhh" → "like uhhh")
  s = s.replace(/[,;:!?…]/g, ' ')
  // Hyphens between hesitation syllables only (keep "uh-huh" intact via dedicated rules)
  s = s.replace(/\s*-\s*/g, ' ')

  s = s.replace(/\s+/g, ' ').trim()
  return s
}

/**
 * Each rule: stable label + regex. Rules are independent; totals sum counts.
 * Order: longer / more specific phrases before loose vowel runs where it matters.
 */
const RULES = [
  { key: 'you know', re: /\byou\s+know\b/gi },
  { key: 'i mean', re: /\bi\s+mean\b/gi },
  { key: 'kind of', re: /\bkind\s+of\b/gi },
  { key: 'sort of', re: /\bsort\s+of\b/gi },
  { key: 'sorta', re: /\bsorta\b/gi },
  { key: 'kinda', re: /\bkinda\b/gi },

  // Hyphenated / reduplicated
  { key: 'uh-huh', re: /\buh[\s-]*huh+\b/gi },
  { key: 'uh-uh', re: /\buh[\s-]*uh+\b/gi },

  // Stretched vowel / open-mouth sounds (aaa, uhhh, ohhh — Whisper writes these often)
  { key: 'aaa', re: /\ba{3,}\b/gi },
  { key: 'eee', re: /\be{3,}\b/gi },
  { key: 'ooo', re: /\bo{3,}\b/gi },
  { key: 'aah', re: /\ba{2,}h+\b/gi },
  { key: 'ooh', re: /\bo{2,}h+\b/gi },
  { key: 'eek', re: /\be{2,}k+\b/gi },

  // Vocal hesitations — repeated letters (ummmm, uhhh, errr)
  { key: 'um', re: /\bum+\b/gi },
  { key: 'uh', re: /\buh+\b/gi },
  { key: 'ah', re: /\bah+\b/gi },
  { key: 'oh', re: /\boh+\b/gi },
  { key: 'er', re: /\ber+\b/gi },
  { key: 'hmm', re: /\bhmm+\b|\bhm+\b/gi },
  { key: 'mmm', re: /\bm{3,}\b/gi },
  { key: 'mhm', re: /\bmhmm+\b|\bmhm+\b/gi },
  { key: 'huh', re: /\bhuh+\b/gi },
  { key: 'uhm', re: /\buhm+\b/gi },
  { key: 'erm', re: /\berm+\b/gi },
  { key: 'aww', re: /\baw{2,}\b/gi },

  // Spaced repeats ("uh uh") common in Whisper / browser captions
  { key: 'uh (spaced)', re: /\b(?:uh+\s+)+uh+\b/gi },
  { key: 'um (spaced)', re: /\b(?:um+\s+)+um+\b/gi },
  { key: 'ah (spaced)', re: /\b(?:ah+\s+)+ah+\b/gi },

  // Spaced repeats Whisper may emit ("uh uh uh") — each token still matched by uh+/um+ above

  // Hedges
  { key: 'basically', re: /\bbasically\b/gi },
  { key: 'literally', re: /\bliterally\b/gi },
  { key: 'actually', re: /\bactually\b/gi },
  { key: 'honestly', re: /\bhonestly\b/gi },
  { key: 'like', re: /\blike\b/gi },

  // Hindi (often Romanized in transcripts)
  { key: 'acha', re: /\bach+a+\b/gi },
  { key: 'accha', re: /\bacch+a+\b/gi },
  { key: 'haan', re: /\bhaa+n+\b/gi },
]

/**
 * @param {string} text
 * @returns {{ total: number, items: { key: string, count: number }[] }}
 */
export function analyzeFillerWords(text) {
  if (!text || typeof text !== 'string') {
    return { total: 0, items: [] }
  }
  const normalized = normalizeTranscript(text)
  if (!normalized) {
    return { total: 0, items: [] }
  }

  const items = []
  for (const { key, re } of RULES) {
    const matches = normalized.match(re)
    const count = matches ? matches.length : 0
    if (count > 0) items.push({ key, count })
  }

  items.sort((a, b) => b.count - a.count)
  const total = items.reduce((sum, i) => sum + i.count, 0)
  return { total, items }
}
