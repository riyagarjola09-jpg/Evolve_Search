# ⚡ EVOLVE-SEARCH
### Next-Generation Hybrid Search Engine

A full-stack implementation of the EVOLVE-SEARCH research paper — combining semantic vector search, AI reasoning, adaptive user modeling, trust filtering, and multimodal retrieval.

---

## 🏗️ Architecture

```
User Query
    │
    ▼
┌─────────────────────────────────────────────┐
│  Step 1: Context-Aware Query Enrichment     │  ← Session context graph
│  Step 2: User Experience Profile (UEP)      │  ← Skill level detection
│  Step 3: Intent & Depth Analysis            │  ← Learn/Compare/Code/Verify
│  Step 4: Hybrid Retrieval                   │  ← Keyword + Vector fusion
│  Step 5: Trust & Bias Filtering             │  ← Domain authority scoring
│  Step 6: AI Reasoning & Synthesis           │  ← Claude/GPT-4/local fallback
│  Step 7: Adaptive Output Rendering          │  ← Skill-level-aware responses
└─────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
evolve-search/
├── backend/
│   ├── server.js          # Express API server (main pipeline)
│   ├── vectorStore.js     # In-memory vector store + embedding service
│   ├── searchService.js   # SerpAPI / Google / Bing / Mock search
│   ├── llmService.js      # Anthropic Claude / OpenAI / local reasoning
│   ├── trustFilter.js     # Trust scoring, bias detection, RRF fusion
│   ├── userProfile.js     # UEP management, intent classification
│   ├── .env.example       # Environment template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React application
│   │   ├── index.js       # Entry point
│   │   ├── hooks/
│   │   │   └── useSearch.js   # API hook
│   │   └── styles/
│   │       └── global.css     # Global styles
│   ├── public/
│   │   └── index.html
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

## 🚀 Quick Start (Demo Mode — No API Keys Needed)

### Prerequisites
- Node.js 18+ 
- npm 9+

### 1. Install Backend
```bash
cd backend
npm install
cp .env.example .env
npm start
```

### 2. Install Frontend (new terminal)
```bash
cd frontend
npm install
cp .env.example .env
npm start
```

### 3. Open Browser
```
http://localhost:3000
```

The app runs fully in **demo/mock mode** without any API keys. You'll get:
- Simulated search results
- Local TF-IDF vector embeddings
- Rule-based reasoning fallback
- Full UEP tracking and UI

---

## 🔑 Adding Real API Keys (Production Mode)

Edit `backend/.env` with your keys:

### 🔍 Live Web Search (pick one)

**Option A — SerpAPI** (recommended, 100 free searches/month)
```
SERPAPI_KEY=your_key_from_serpapi.com
```

**Option B — Google Custom Search** (100 free/day)
```
GOOGLE_SEARCH_API_KEY=your_key
GOOGLE_SEARCH_ENGINE_ID=your_cx_id
```

**Option C — Bing Search API**
```
BING_SEARCH_KEY=your_key
```

---

### 🤖 AI Reasoning / LLM (pick one)

**Option A — Anthropic Claude** (recommended)
```
ANTHROPIC_API_KEY=your_key_from_anthropic.com
```

**Option B — OpenAI GPT-4**
```
OPENAI_API_KEY=your_key
```

---

### 🧮 Vector Embeddings (optional upgrade)

**Option A — OpenAI text-embedding-ada-002**
```
OPENAI_API_KEY=your_key  # same key as LLM
```

**Option B — HuggingFace Inference API** (free tier)
```
HUGGINGFACE_API_KEY=your_token_from_huggingface.co
```

---

### 🗄️ Vector Database (optional upgrade)

The default uses in-memory storage (resets on restart). For persistent vector storage:

**Option A — Pinecone** (free tier available)
```
PINECONE_API_KEY=your_key
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX=evolve-search
```
Then in `vectorStore.js`, replace `InMemoryVectorStore` with `PineconeStore`.

**Option B — Weaviate**
```
WEAVIATE_URL=your_cluster_url
WEAVIATE_API_KEY=your_key
```

---

## 🔌 API Reference

### `POST /api/search`
Main search pipeline.

**Request:**
```json
{
  "query": "How does backpropagation work?",
  "userId": "user-uuid",
  "sessionHistory": []
}
```

**Response:**
```json
{
  "query": "...",
  "intent": "Learn",
  "depth": "moderate",
  "answer": "AI-synthesized markdown answer",
  "results": [...],
  "metadata": {
    "searchProvider": "serpapi",
    "llmProvider": "anthropic",
    "aiPowered": true,
    "latencyMs": 450,
    "filteredCount": 2
  },
  "uep": {
    "skillLevel": "Intermediate",
    "skillScore": 65,
    "domains": { "machine learning": 0.4 },
    "queryCount": 7
  }
}
```

### `POST /api/feedback`
Submit user feedback to update UEP.
```json
{ "userId": "...", "rating": 4 }
```

### `GET /api/profile/:userId`
Get a user's current UEP.

### `GET /api/health`
System status and active providers.

### `POST /api/index`
Manually index documents into vector store.
```json
{ "documents": [{ "id": "1", "title": "...", "content": "..." }] }
```

---

## 📊 Features Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Context-Aware Query Enrichment | ✅ | Session graph with keyword injection |
| User Experience Profile (UEP) | ✅ | Skill level, domains, learning velocity |
| Intent Classification | ✅ | Learn/Compare/Code/Verify/News |
| Hybrid Retrieval (BM25 + Vector) | ✅ | Reciprocal Rank Fusion |
| Vector Embeddings | ✅ | Local TF-IDF / HuggingFace / OpenAI |
| Vector Database | ✅ | In-memory (FAISS-like) / Pinecone ready |
| Multimodal Aggregation | ✅ | TEXT/IMAGE/CODE type routing |
| Trust & Bias Filtering | ✅ | Domain authority + bias scoring |
| AI Reasoning Engine | ✅ | Anthropic/OpenAI/local fallback |
| Claim Extraction | ✅ | NLP-based fact parsing |
| Conflict Resolution | ✅ | Trust-weighted fact ordering |
| Adaptive Output Rendering | ✅ | Skill-level-aware markdown |
| Feedback Loop | ✅ | Rating → UEP refinement |
| Long-Term Evolution | ✅ | Learning velocity tracking |
| Response Caching | ✅ | 5-minute NodeCache |

---

## 🏃 Performance (Demo Mode)
- Latency: ~50-150ms (mock search + local embeddings)
- With live APIs: ~300-600ms
- Vector index: Grows automatically with each search

---

## 🔒 Privacy & Ethics
- User profiles stored in-memory (no persistence by default)
- No personal data sent to APIs (only queries)
- Trust filter blocks low-quality/biased sources
- Add `differential-privacy` npm package for production UEP storage

---

## 🛣️ Roadmap / Future Work
- [ ] Weaviate/Pinecone vector DB integration (uncomment in `vectorStore.js`)
- [ ] CLIP multimodal image embeddings
- [ ] Audio/video retrieval
- [ ] Redis-backed UEP persistence
- [ ] Federated learning for privacy-preserving UEP
- [ ] A/B testing framework
- [ ] FAISS HNSW quantization for scale

---

## 📚 References
Based on the EVOLVE-SEARCH research paper. Key citations:
- Hybrid Search: Azure AI Search (RRF fusion)  
- User Modeling: Brusilovsky (2001) adaptive hypermedia
- Vector Search: FAISS (Johnson et al.), Pinecone
- Multimodal: CLIP (Radford et al.)
- RAG: Lewis et al. (2020)
