// userProfile.js - User Experience Profile (UEP) management
// In production, replace Map with a database (PostgreSQL, MongoDB, Redis)

const profiles = new Map(); // In-memory store - replace with DB in production

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const DEFAULT_UEP = {
  skillLevel: 'Intermediate',
  skillScore: 0.5,
  domains: {},
  learningVelocity: 0.5,
  preferredFormats: ['text'],
  reasoningDepthTolerance: 'moderate',
  historicalAccuracyScore: 0.8,
  queryCount: 0,
  satisfactionScores: [],
  lastActive: null
};

// ============================================================
// Skill Scoring
// ============================================================
function measureQueryComplexity(query) {
  const words = query.split(' ');
  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / words.length;
  const hasQuestionWords = /\b(how|why|what|when|where|which|explain|compare|analyze|evaluate)\b/i.test(query);
  const hasSpecialTerms = /[A-Z]{2,}|[a-z]+\([^)]+\)|->|=>|\b\d+\b/.test(query);
  
  let score = 0;
  if (avgWordLen > 6) score += 0.3;
  if (words.length > 8) score += 0.2;
  if (hasQuestionWords) score += 0.2;
  if (hasSpecialTerms) score += 0.3;
  return Math.min(score, 1.0);
}

function analyzeTechnicalVocabulary(query) {
  const techTerms = [
    'algorithm', 'neural', 'vector', 'embedding', 'gradient', 'recursive',
    'asynchronous', 'polymorphism', 'API', 'database', 'matrix', 'tensor',
    'quantum', 'polynomial', 'differential', 'eigenvector', 'stochastic',
    'hyperparameter', 'regression', 'inference', 'latency', 'throughput',
    'distributed', 'microservice', 'kubernetes', 'terraform', 'entropy'
  ];
  const queryLower = query.toLowerCase();
  const found = techTerms.filter(t => queryLower.includes(t));
  return Math.min(found.length * 0.2, 1.0);
}

function detectDomains(query) {
  const domainMap = {
    'machine learning': ['ml', 'neural', 'deep learning', 'model', 'training', 'ai', 'artificial intelligence'],
    'web development': ['html', 'css', 'javascript', 'react', 'api', 'frontend', 'backend'],
    'data science': ['data', 'statistics', 'analysis', 'visualization', 'pandas', 'numpy', 'dataset'],
    'mathematics': ['equation', 'theorem', 'proof', 'calculus', 'algebra', 'matrix', 'integral'],
    'computer science': ['algorithm', 'complexity', 'programming', 'code', 'function', 'class'],
    'physics': ['quantum', 'relativity', 'particle', 'energy', 'force', 'wave'],
    'biology': ['cell', 'dna', 'protein', 'gene', 'organism', 'evolution'],
    'general': []
  };

  const queryLower = query.toLowerCase();
  const detected = [];
  for (const [domain, keywords] of Object.entries(domainMap)) {
    if (keywords.some(k => queryLower.includes(k))) {
      detected.push(domain);
    }
  }
  return detected.length > 0 ? detected : ['general'];
}

function updateSkillLevel(currentLevel, newScore) {
  const idx = SKILL_LEVELS.indexOf(currentLevel);
  const threshold = 0.7;
  
  if (newScore >= threshold && idx < SKILL_LEVELS.length - 1) {
    return SKILL_LEVELS[idx + 1];
  }
  if (newScore < 0.3 && idx > 0) {
    return SKILL_LEVELS[idx - 1];
  }
  return currentLevel;
}

// ============================================================
// Context Graph
// ============================================================
class ContextGraph {
  constructor(maxNodes = 20) {
    this.nodes = [];
    this.maxNodes = maxNodes;
  }

  addQuery(query, results = []) {
    const node = {
      query,
      timestamp: Date.now(),
      results: results.slice(0, 3).map(r => ({ title: r.title, url: r.url })),
      clickMetrics: 0
    };
    this.nodes.push(node);
    if (this.nodes.length > this.maxNodes) {
      this.nodes.shift();
    }
  }

  getLastN(n = 10) {
    return this.nodes.slice(-n);
  }

  extractSessionKeywords() {
    const allWords = this.nodes
      .flatMap(n => n.query.toLowerCase().split(/\W+/))
      .filter(w => w.length > 3);
    
    const freq = {};
    allWords.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  detectIntentContinuity() {
    if (this.nodes.length < 2) return 'new';
    const recent = this.nodes.slice(-3).map(n => n.query.toLowerCase());
    const hasOverlap = recent.some((q, i) => {
      if (i === 0) return false;
      const words1 = new Set(recent[i - 1].split(/\W+/));
      const words2 = new Set(q.split(/\W+/));
      const intersection = [...words1].filter(w => words2.has(w) && w.length > 3);
      return intersection.length >= 2;
    });
    return hasOverlap ? 'continuing' : 'new';
  }
}

// In-memory context graphs per user
const contextGraphs = new Map();

// ============================================================
// UEP CRUD
// ============================================================
function getProfile(userId) {
  if (!profiles.has(userId)) {
    profiles.set(userId, { ...DEFAULT_UEP, userId, createdAt: Date.now() });
  }
  return profiles.get(userId);
}

function updateProfile(userId, query, interactions = []) {
  const uep = getProfile(userId);
  
  const complexityScore = measureQueryComplexity(query);
  const vocabScore = analyzeTechnicalVocabulary(query);
  const engagementScore = Math.min(interactions.length * 0.1, 1.0);
  
  const skillScore = (complexityScore * 0.4 + vocabScore * 0.4 + engagementScore * 0.2);
  
  // Smoothly update skill score (exponential moving average)
  uep.skillScore = uep.skillScore * 0.7 + skillScore * 0.3;
  uep.skillLevel = updateSkillLevel(uep.skillLevel, uep.skillScore);
  
  const domains = detectDomains(query);
  domains.forEach(domain => {
    uep.domains[domain] = Math.min((uep.domains[domain] || 0) + 0.1, 1.0);
  });
  
  uep.queryCount += 1;
  uep.learningVelocity = Math.min(uep.queryCount / 100, 1.0);
  uep.lastActive = Date.now();
  
  // Update preferred formats based on query type
  if (/code|implement|function|class|program/i.test(query)) {
    if (!uep.preferredFormats.includes('code')) uep.preferredFormats.push('code');
  }
  if (/compare|versus|vs\.|difference/i.test(query)) {
    if (!uep.preferredFormats.includes('table')) uep.preferredFormats.push('table');
  }
  if (/explain|how|diagram|visualize/i.test(query)) {
    if (!uep.preferredFormats.includes('chart')) uep.preferredFormats.push('chart');
  }
  
  profiles.set(userId, uep);
  return uep;
}

function updateFeedback(userId, feedback) {
  const uep = getProfile(userId);
  if (feedback.rating) {
    uep.satisfactionScores.push(feedback.rating);
    if (uep.satisfactionScores.length > 50) uep.satisfactionScores.shift();
    uep.historicalAccuracyScore = uep.satisfactionScores.reduce((a, b) => a + b, 0) / uep.satisfactionScores.length / 5;
  }
  profiles.set(userId, uep);
  return uep;
}

// ============================================================
// Intent Classification
// ============================================================
function classifyIntent(query) {
  const q = query.toLowerCase();
  if (/compare|versus|vs\.|difference|better|which is|pros and cons/i.test(q)) return 'Compare';
  if (/how to|tutorial|learn|explain|step by step|guide|understand|what is/i.test(q)) return 'Learn';
  if (/code|implement|function|class|program|syntax|example|snippet/i.test(q)) return 'Code';
  if (/is it true|fact check|verify|confirm|accurate|correct/i.test(q)) return 'Verify';
  if (/news|latest|recent|update|today|current/i.test(q)) return 'News';
  return 'Search';
}

function mapIntentToDepth(intent, skillLevel) {
  const depthMap = {
    'Learn': { Beginner: 'shallow', Intermediate: 'moderate', Advanced: 'deep', Expert: 'deep' },
    'Compare': { Beginner: 'moderate', Intermediate: 'moderate', Advanced: 'deep', Expert: 'deep' },
    'Code': { Beginner: 'moderate', Intermediate: 'deep', Advanced: 'deep', Expert: 'deep' },
    'Verify': { Beginner: 'shallow', Intermediate: 'moderate', Advanced: 'deep', Expert: 'deep' },
    'News': { Beginner: 'shallow', Intermediate: 'shallow', Advanced: 'moderate', Expert: 'moderate' },
    'Search': { Beginner: 'shallow', Intermediate: 'moderate', Advanced: 'moderate', Expert: 'deep' }
  };
  return depthMap[intent]?.[skillLevel] || 'moderate';
}

function getOrCreateContextGraph(userId) {
  if (!contextGraphs.has(userId)) {
    contextGraphs.set(userId, new ContextGraph());
  }
  return contextGraphs.get(userId);
}

module.exports = {
  getProfile,
  updateProfile,
  updateFeedback,
  classifyIntent,
  mapIntentToDepth,
  getOrCreateContextGraph,
  detectDomains
};
