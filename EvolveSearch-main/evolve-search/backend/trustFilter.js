// trustFilter.js - Trust scoring and bias detection

// ============================================================
// Domain Authority Database (simplified)
// ============================================================
const HIGH_TRUST_DOMAINS = new Set([
  'wikipedia.org', 'britannica.com', 'nature.com', 'science.org',
  'pubmed.ncbi.nlm.nih.gov', 'arxiv.org', 'ieee.org', 'acm.org',
  'github.com', 'stackoverflow.com', 'mdn.mozilla.org', 'docs.python.org',
  'developer.mozilla.org', 'w3.org', 'ietf.org', 'nist.gov',
  'harvard.edu', 'mit.edu', 'stanford.edu', 'oxford.ac.uk',
  'docs.microsoft.com', 'cloud.google.com', 'aws.amazon.com',
  'pytorch.org', 'tensorflow.org', 'huggingface.co', 'openai.com',
  'anthropic.com', 'research.google.com', 'deepmind.com'
]);

const MEDIUM_TRUST_DOMAINS = new Set([
  'medium.com', 'towardsdatascience.com', 'dev.to', 'hashnode.com',
  'techcrunch.com', 'wired.com', 'theverge.com', 'arstechnica.com',
  'zdnet.com', 'infoworld.com', 'dzone.com', 'baeldung.com',
  'geeksforgeeks.org', 'javatpoint.com', 'tutorialspoint.com',
  'freecodecamp.org', 'css-tricks.com', 'smashingmagazine.com'
]);

const LOW_TRUST_INDICATORS = [
  'spam', 'free-download', 'crack', 'torrent', 'pirate',
  'fake', 'scam', 'clickbait', 'viral', 'shocking'
];

const BIAS_INDICATORS = {
  political: ['always', 'never', 'everyone knows', 'obvious', 'radical', 'extreme'],
  sensational: ['shocking', 'unbelievable', 'mind-blowing', 'secret', 'hidden truth'],
  misinformation: ['proven false', 'debunked', 'conspiracy', 'hoax']
};

// ============================================================
// Trust Score Computation
// ============================================================
function computeTrustScore(result) {
  let score = 0.5; // Default

  const domain = result.domain?.toLowerCase() || '';
  
  // Domain authority
  if (HIGH_TRUST_DOMAINS.has(domain)) score += 0.35;
  else if (MEDIUM_TRUST_DOMAINS.has(domain)) score += 0.15;
  
  // Low trust signals
  if (LOW_TRUST_INDICATORS.some(indicator => domain.includes(indicator))) score -= 0.3;
  
  // URL quality signals
  const url = result.url?.toLowerCase() || '';
  if (url.includes('https')) score += 0.05;
  if (/\d{4}\/\d{2}\/\d{2}/.test(url)) score += 0.05; // Has date = news article
  
  // Content quality signals
  const snippet = result.snippet?.toLowerCase() || '';
  if (snippet.length > 100) score += 0.05;
  if (/\b(study|research|published|journal|doi)\b/.test(snippet)) score += 0.1;
  
  // Title quality
  const title = result.title?.toLowerCase() || '';
  if (title.length > 10 && title.length < 100) score += 0.05;
  
  return Math.max(0, Math.min(1, score));
}

// ============================================================
// Bias Detection
// ============================================================
function detectBias(result) {
  const text = `${result.title} ${result.snippet}`.toLowerCase();
  let biasScore = 0;

  for (const [type, indicators] of Object.entries(BIAS_INDICATORS)) {
    const hits = indicators.filter(i => text.includes(i)).length;
    biasScore += hits * 0.15;
  }

  // Extreme language detection
  const exclamationCount = (result.title?.match(/!/g) || []).length;
  biasScore += exclamationCount * 0.1;

  // ALL CAPS words (sensationalism)
  const capsWords = (result.title?.match(/\b[A-Z]{3,}\b/g) || []).length;
  biasScore += capsWords * 0.05;

  return Math.min(biasScore, 1.0);
}

// ============================================================
// Main Filter Function
// ============================================================
function filterAndRankResults(results, topK = 10) {
  const scored = results.map(result => {
    const trust = computeTrustScore(result);
    const bias = detectBias(result);
    return { ...result, trust, bias, trustFiltered: trust <= 0.3 || bias >= 0.6 };
  });

  // Separate filtered and accepted
  const accepted = scored
    .filter(r => r.trust > 0.3 && r.bias < 0.6)
    .sort((a, b) => (b.trust - b.bias * 0.5) - (a.trust - a.bias * 0.5));

  const filtered = scored.filter(r => r.trustFiltered);

  console.log(`[Trust] Accepted: ${accepted.length}, Filtered: ${filtered.length} of ${results.length}`);

  return {
    results: accepted.slice(0, topK),
    filteredCount: filtered.length,
    stats: {
      avgTrust: accepted.reduce((s, r) => s + r.trust, 0) / (accepted.length || 1),
      avgBias: accepted.reduce((s, r) => s + r.bias, 0) / (accepted.length || 1)
    }
  };
}

// ============================================================
// Reciprocal Rank Fusion
// ============================================================
function reciprocalRankFusion(rankingLists, k = 60) {
  const scores = {};
  
  rankingLists.forEach(list => {
    list.forEach((item, rank) => {
      const id = item.id || item.url;
      if (!scores[id]) scores[id] = { item, score: 0 };
      scores[id].score += 1 / (k + rank + 1);
    });
  });

  return Object.values(scores)
    .sort((a, b) => b.score - a.score)
    .map(({ item, score }) => ({ ...item, fusionScore: score }));
}

module.exports = { filterAndRankResults, reciprocalRankFusion, computeTrustScore };
