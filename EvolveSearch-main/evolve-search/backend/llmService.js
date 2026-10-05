// llmService.js - AI Reasoning Engine with multiple provider support
const axios = require('axios');

// ============================================================
// Anthropic Claude (Primary)
// ============================================================
async function anthropicReason(systemPrompt, userPrompt) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Anthropic not configured');

  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      timeout: 30000
    }
  );

  return response.data.content[0].text;
}

// ============================================================
// OpenAI GPT-4 (Secondary)
// ============================================================
async function openAIReason(systemPrompt, userPrompt) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OpenAI not configured');

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  return response.data.choices[0].message.content;
}

// ============================================================
// Local Fallback Reasoning (no API needed)
// ============================================================
function localReason(intent, results, depth, skillLevel) {
  const topResults = results.slice(0, 5);
  const sources = topResults.map(r => `• ${r.title}: ${r.snippet}`).join('\n');
  
  if (intent === 'Compare') {
    return `**Comparison Analysis**\n\nBased on retrieved sources:\n\n${sources}\n\n**Key Differences:**\nThe sources present multiple perspectives on this topic. A thorough comparison reveals distinct approaches in methodology, application, and theoretical grounding.`;
  }
  if (intent === 'Learn') {
    return `**Learning Summary**\n\nHere is what the sources tell us:\n\n${sources}\n\n**Key Takeaways:**\n1. This topic involves multiple interconnected concepts\n2. Practical applications span several domains\n3. Further reading is recommended for deeper understanding`;
  }
  if (intent === 'Code') {
    return `**Code & Technical Summary**\n\nRelevant technical resources found:\n\n${sources}\n\n**Implementation Notes:**\nReview the linked resources for working code examples and documentation.`;
  }
  return `**Search Summary**\n\nTop results for your query:\n\n${sources}\n\n*Note: Connect an LLM API (Anthropic/OpenAI) in .env for AI-synthesized answers.*`;
}

// ============================================================
// Main Reasoning Function
// ============================================================
async function synthesizeAnswer({ query, intent, results, depth, skillLevel, contextHistory }) {
  const topResults = results.slice(0, 8);
  const sourceSummaries = topResults
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\nContent: ${r.snippet}`)
    .join('\n\n');

  const systemPrompt = `You are EVOLVE-SEARCH's AI Reasoning Engine. You synthesize search results into clear, structured answers.

User Profile:
- Skill Level: ${skillLevel}
- Intent: ${intent}
- Reasoning Depth: ${depth}

Guidelines:
- For Beginners: Use simple language, analogies, avoid jargon
- For Intermediate: Balanced technical detail with examples  
- For Advanced/Expert: Technical depth, precise terminology, research references
- For "Learn" intent: Create step-by-step explanations
- For "Compare" intent: Build comparison tables or structured contrasts
- For "Verify" intent: Cross-check facts and highlight conflicts
- For "Code" intent: Provide working code snippets
- Always cite sources by their [number]
- Be concise but comprehensive
- Flag if sources contradict each other`;

  const userPrompt = `Query: "${query}"
Recent Context: ${contextHistory.slice(-3).map(h => h.query).join(' → ') || 'None'}

Retrieved Sources:
${sourceSummaries}

Please synthesize a ${depth} response appropriate for a ${skillLevel} user with intent: ${intent}.`;

  // Try providers in order
  const providers = [
    { name: 'Anthropic', fn: () => anthropicReason(systemPrompt, userPrompt) },
    { name: 'OpenAI', fn: () => openAIReason(systemPrompt, userPrompt) },
  ];

  for (const provider of providers) {
    try {
      console.log(`[LLM] Trying ${provider.name}...`);
      const answer = await provider.fn();
      console.log(`[LLM] ${provider.name} succeeded`);
      return { answer, provider: provider.name, aiPowered: true };
    } catch (e) {
      console.log(`[LLM] ${provider.name} failed: ${e.message}`);
    }
  }

  // Fallback
  console.log('[LLM] Using local reasoning fallback');
  return {
    answer: localReason(intent, results, depth, skillLevel),
    provider: 'local',
    aiPowered: false
  };
}

// ============================================================
// Claim Extractor (for trust/fact-checking pipeline)
// ============================================================
function extractClaims(text) {
  // Simple sentence-based claim extraction
  return text
    .split(/[.!?]/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.length < 300)
    .slice(0, 5);
}

// ============================================================
// Conflict Resolver
// ============================================================
function resolveConflicts(factSets) {
  const allFacts = factSets.flatMap(f => f.claims.map(c => ({ claim: c, trust: f.trust })));
  // Sort by trust score - higher trust claims win
  return allFacts.sort((a, b) => b.trust - a.trust).map(f => f.claim);
}

module.exports = { synthesizeAnswer, extractClaims, resolveConflicts };
