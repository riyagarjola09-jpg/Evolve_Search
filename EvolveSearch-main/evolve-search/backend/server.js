// server.js - EVOLVE-SEARCH Backend API
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');

const { vectorStore, embeddingService } = require('./vectorStore');
const { webSearch } = require('./searchService');
const { synthesizeAnswer, extractClaims, resolveConflicts } = require('./llmService');
const { filterAndRankResults, reciprocalRankFusion } = require('./trustFilter');
const {
  getProfile, updateProfile, updateFeedback,
  classifyIntent, mapIntentToDepth, getOrCreateContextGraph
} = require('./userProfile');

const app = express();
const cache = new NodeCache({ stdTTL: 300 }); // 5-min cache

// ============================================================
// Middleware
// ============================================================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

// ============================================================
// POST /api/search - Main Search Pipeline
// ============================================================
app.post('/api/search', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query, userId = 'anonymous', sessionHistory = [] } = req.body;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query too short' });
    }

    console.log(`\n[EVOLVE-SEARCH] Query: "${query}" | User: ${userId}`);

    // === STEP 1: Context-Aware Query Intake ===
    const contextGraph = getOrCreateContextGraph(userId);
    const sessionContext = contextGraph.detectIntentContinuity();
    const sessionKeywords = contextGraph.extractSessionKeywords();
    const enrichedQuery = sessionKeywords.length > 0
      ? `${query} ${sessionKeywords.slice(0, 3).join(' ')}`
      : query;
    console.log(`[Step 1] Enriched: "${enrichedQuery}"`);

    // === STEP 2: User Experience Profile Update ===
    const uep = updateProfile(userId, query, sessionHistory);
    console.log(`[Step 2] UEP: ${uep.skillLevel} | Domains: ${Object.keys(uep.domains).join(', ')}`);

    // === STEP 3: Intent + Depth Analysis ===
    const intent = classifyIntent(query);
    const depth = mapIntentToDepth(intent, uep.skillLevel);
    console.log(`[Step 3] Intent: ${intent} | Depth: ${depth}`);

    // === STEP 4: Hybrid Retrieval (keyword + vector) ===
    // Check cache first
    const cacheKey = `search:${enrichedQuery}`;
    let searchData = cache.get(cacheKey);
    if (!searchData) {
      searchData = await webSearch(enrichedQuery);
      cache.set(cacheKey, searchData);
    }
    const { results: rawResults, provider: searchProvider, live } = searchData;
    console.log(`[Step 4] Got ${rawResults.length} results from ${searchProvider}`);

    // Vector search (semantic)
    const queryEmbedding = await embeddingService.embed(query);
    const vectorResults = vectorStore.search(queryEmbedding, 5);
    console.log(`[Step 4] Vector: ${vectorResults.length} semantic matches`);

    // Hybrid fusion
    const fusedResults = reciprocalRankFusion([rawResults, vectorResults]);

    // === STEP 5: Multimodal Aggregation ===
    const textResults = fusedResults.filter(r => r.type !== 'IMAGE' && r.type !== 'CODE');
    const imageResults = fusedResults.filter(r => r.type === 'IMAGE');
    const codeResults = fusedResults.filter(r => r.type === 'CODE');
    // Combined multimodal ranked list
    const aggregated = [...textResults.slice(0, 7), ...imageResults.slice(0, 2), ...codeResults.slice(0, 1)];

    // === STEP 5: Trust & Bias Filtering ===
    const { results: trustedResults, filteredCount, stats: trustStats } = filterAndRankResults(aggregated, 10);
    console.log(`[Step 5] Trusted: ${trustedResults.length} | Filtered out: ${filteredCount}`);

    // Index trusted results in vector store for future queries
    for (const result of trustedResults.slice(0, 5)) {
      try {
        const emb = await embeddingService.embed(`${result.title} ${result.snippet}`);
        vectorStore.upsert(result.id || result.url, emb, {
          title: result.title,
          snippet: result.snippet,
          url: result.url,
          domain: result.domain,
          type: result.type || 'TEXT',
          score: result.trust
        });
      } catch {}
    }

    // === STEP 6: AI Reasoning & Synthesis ===
    const factSets = trustedResults.map(r => ({
      claims: extractClaims(r.snippet),
      trust: r.trust
    }));
    const resolvedFacts = resolveConflicts(factSets);
    
    const { answer, provider: llmProvider, aiPowered } = await synthesizeAnswer({
      query,
      intent,
      results: trustedResults,
      depth,
      skillLevel: uep.skillLevel,
      contextHistory: sessionHistory
    });
    console.log(`[Step 6] Answer from: ${llmProvider} | AI: ${aiPowered}`);

    // === STEP 7: Structured Output ===
    const structuredSections = {};
    if (intent === 'Compare') {
      structuredSections.type = 'comparison';
    } else if (intent === 'Learn') {
      structuredSections.type = 'tutorial';
    } else if (intent === 'Code') {
      structuredSections.type = 'code';
    } else {
      structuredSections.type = 'general';
    }

    // Update context graph
    contextGraph.addQuery(query, trustedResults);

    const latency = Date.now() - startTime;
    console.log(`[DONE] Latency: ${latency}ms`);

    // === Response ===
    res.json({
      query,
      enrichedQuery,
      intent,
      depth,
      answer,
      results: trustedResults.slice(0, 8),
      metadata: {
        searchProvider,
        llmProvider,
        aiPowered,
        live,
        latencyMs: latency,
        filteredCount,
        vectorIndexSize: vectorStore.count(),
        trustStats,
        sessionContext,
        sections: structuredSections
      },
      uep: {
        skillLevel: uep.skillLevel,
        skillScore: Math.round(uep.skillScore * 100),
        domains: uep.domains,
        learningVelocity: uep.learningVelocity,
        preferredFormats: uep.preferredFormats,
        queryCount: uep.queryCount
      }
    });

  } catch (err) {
    console.error('[ERROR]', err);
    res.status(500).json({ error: 'Search failed', detail: err.message });
  }
});

// ============================================================
// POST /api/feedback
// ============================================================
app.post('/api/feedback', (req, res) => {
  const { userId = 'anonymous', rating, resultId, helpful } = req.body;
  const uep = updateFeedback(userId, { rating, helpful });
  res.json({ success: true, uep: { skillLevel: uep.skillLevel, historicalAccuracyScore: uep.historicalAccuracyScore } });
});

// ============================================================
// GET /api/profile/:userId
// ============================================================
app.get('/api/profile/:userId', (req, res) => {
  const uep = getProfile(req.params.userId);
  res.json(uep);
});

// ============================================================
// GET /api/health
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    vectorIndexSize: vectorStore.count(),
    providers: {
      search: process.env.SERPAPI_KEY ? 'serpapi' : process.env.GOOGLE_SEARCH_API_KEY ? 'google' : 'mock',
      llm: process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.OPENAI_API_KEY ? 'openai' : 'local',
      embeddings: process.env.OPENAI_API_KEY ? 'openai' : process.env.HUGGINGFACE_API_KEY ? 'huggingface' : 'local',
      vectorDb: 'in-memory'
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// POST /api/index - Manually index documents
// ============================================================
app.post('/api/index', async (req, res) => {
  const { documents } = req.body;
  if (!Array.isArray(documents)) return res.status(400).json({ error: 'documents must be array' });
  
  let indexed = 0;
  for (const doc of documents) {
    try {
      const emb = await embeddingService.embed(`${doc.title} ${doc.content}`);
      vectorStore.upsert(doc.id || uuidv4(), emb, doc);
      indexed++;
    } catch {}
  }
  res.json({ indexed, total: vectorStore.count() });
});

// ============================================================
// Start Server
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   EVOLVE-SEARCH Backend v1.0.0       ║
║   Running on http://localhost:${PORT}   ║
╠══════════════════════════════════════╣
║ Search:     ${process.env.SERPAPI_KEY ? '✅ SerpAPI' : process.env.GOOGLE_SEARCH_API_KEY ? '✅ Google' : '⚠️  Mock (demo mode)'}
║ LLM:        ${process.env.ANTHROPIC_API_KEY ? '✅ Anthropic' : process.env.OPENAI_API_KEY ? '✅ OpenAI' : '⚠️  Local fallback'}
║ Embeddings: ${process.env.OPENAI_API_KEY ? '✅ OpenAI' : process.env.HUGGINGFACE_API_KEY ? '✅ HuggingFace' : '⚠️  Local TF-IDF'}
║ Vector DB:  ⚡ In-Memory (FAISS-like)
╚══════════════════════════════════════╝
  `);
});
