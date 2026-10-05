import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSearch } from './hooks/useSearch';
import './styles/global.css';

// ─── User ID (persisted) ────────────────────────────────────
const USER_ID = (() => {
  let id = localStorage.getItem('es_uid');
  if (!id) { id = uuidv4(); localStorage.setItem('es_uid', id); }
  return id;
})();

const INTENT_META = {
  Learn:   { color: '#1a73e8', bg: '#e8f0fe', icon: '📖' },
  Compare: { color: '#9334e6', bg: '#f3e8ff', icon: '⚖️' },
  Code:    { color: '#f29900', bg: '#fef9e7', icon: '💻' },
  Verify:  { color: '#0f9d58', bg: '#e6f4ea', icon: '✓'  },
  News:    { color: '#d93025', bg: '#fce8e6', icon: '📰' },
  Search:  { color: '#5f6368', bg: '#f1f3f4', icon: '🔍' },
};
const SKILL_META = {
  Beginner:     { color: '#0f9d58', label: 'Beginner'     },
  Intermediate: { color: '#1a73e8', label: 'Intermediate' },
  Advanced:     { color: '#9334e6', label: 'Advanced'     },
  Expert:       { color: '#f29900', label: 'Expert'       },
};

// ─── Tiny helpers ───────────────────────────────────────────
const pill = (text, color, bg) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'0.72rem',
    padding:'2px 9px', borderRadius:20, background:bg, color, fontWeight:600, lineHeight:1.5 }}>
    {text}
  </span>
);

function Favicon({ domain }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <span style={{ fontSize:13 }}>🌐</span>;
  return (
    <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
      alt="" width={16} height={16} style={{ borderRadius:2 }}
      onError={() => setOk(false)} />
  );
}

// ─── Search Timer display ───────────────────────────────────
function SearchTimer({ ms, resultCount }) {
  if (!ms) return null;
  return (
    <p style={{ fontSize:'0.8rem', color:'#70757a', margin:'4px 0 14px' }}>
      About {resultCount} results ({(ms / 1000).toFixed(2)} seconds)
    </p>
  );
}

// ─── Skeleton loader ────────────────────────────────────────
function SkeletonResults() {
  return (
    <div style={{ maxWidth:652, marginTop:12 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ marginBottom:28 }}>
          <div className="skeleton" style={{ height:14, width:200, marginBottom:6 }} />
          <div className="skeleton" style={{ height:20, width:420, marginBottom:8 }} />
          <div className="skeleton" style={{ height:13, width:'100%', marginBottom:4 }} />
          <div className="skeleton" style={{ height:13, width:'85%' }} />
        </div>
      ))}
    </div>
  );
}

// ─── Live search timer while loading ────────────────────────
function LiveTimer({ start }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - start), 50);
    return () => clearInterval(t);
  }, [start]);
  return (
    <span style={{ fontSize:'0.78rem', color:'#70757a' }}>
      {(elapsed / 1000).toFixed(2)}s
    </span>
  );
}

// ─── Header ─────────────────────────────────────────────────
function Header({ onLogoClick, query, onSearch, loading, startTime }) {
  const [val, setVal] = useState(query || '');
  const [focused, setFocused] = useState(false);
  const ref = useRef();

  useEffect(() => { setVal(query || ''); }, [query]);

  const submit = () => { if (val.trim() && !loading) onSearch(val.trim()); };

  return (
    <header style={{
      position:'sticky', top:0, zIndex:200,
      background:'#fff', borderBottom:'1px solid #e8eaed',
      padding:'10px 24px', display:'flex', alignItems:'center', gap:20
    }}>
      {/* Logo */}
      <button onClick={onLogoClick} style={{
        background:'none', border:'none', cursor:'pointer',
        fontSize:'1.35rem', fontWeight:800, letterSpacing:-1,
        color:'#1a73e8', fontFamily:'Product Sans, Arial, sans-serif',
        flexShrink:0, padding:'4px 0'
      }}>
        <span style={{ color:'#4285f4' }}>E</span>
        <span style={{ color:'#ea4335' }}>v</span>
        <span style={{ color:'#fbbc04' }}>o</span>
        <span style={{ color:'#4285f4' }}>l</span>
        <span style={{ color:'#34a853' }}>v</span>
        <span style={{ color:'#ea4335' }}>e</span>
      </button>

      {/* Search bar */}
      <div style={{
        flex:1, maxWidth:584,
        display:'flex', alignItems:'center',
        border:`1px solid ${focused ? '#1a73e8' : '#dfe1e5'}`,
        borderRadius:24, padding:'8px 16px 8px 20px',
        boxShadow: focused ? '0 1px 6px rgba(32,33,36,.28)' : '0 1px 3px rgba(0,0,0,.08)',
        transition:'box-shadow .15s, border-color .15s', background:'#fff', gap:10
      }}>
        <span style={{ color:'#9aa0a6', fontSize:18, flexShrink:0 }}>🔍</span>
        <input
          ref={ref} value={val}
          onChange={e => setVal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Search or ask anything..."
          style={{
            flex:1, border:'none', outline:'none', fontSize:'1rem',
            color:'#202124', background:'transparent', fontFamily:'inherit'
          }}
        />
        {loading && startTime && <LiveTimer start={startTime} />}
        {val && (
          <button onClick={() => { setVal(''); ref.current?.focus(); }}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#70757a', fontSize:18, lineHeight:1 }}>
            ×
          </button>
        )}
        <div style={{ width:1, height:24, background:'#dfe1e5', flexShrink:0 }} />
        <button onClick={submit} disabled={loading || !val.trim()}
          style={{
            background:'none', border:'none', cursor:loading ? 'default' : 'pointer',
            color:'#1a73e8', fontSize:'0.88rem', fontWeight:600, whiteSpace:'nowrap',
            opacity: loading || !val.trim() ? 0.5 : 1, padding:'0 4px'
          }}>
          Search
        </button>
      </div>
    </header>
  );
}

// ─── Intent tab bar ─────────────────────────────────────────
function IntentBar({ intent }) {
  if (!intent) return null;
  const tabs = ['All', 'Web', 'Images', 'News', 'Videos'];
  const m = INTENT_META[intent];
  return (
    <div style={{ borderBottom:'1px solid #e8eaed', display:'flex', alignItems:'center', gap:24, padding:'0 24px', marginTop:0 }}>
      {tabs.map(t => (
        <button key={t} style={{
          background:'none', border:'none', cursor:'pointer',
          padding:'12px 0', fontSize:'0.88rem',
          color: t === 'All' ? '#1a73e8' : '#5f6368',
          borderBottom: t === 'All' ? '3px solid #1a73e8' : '3px solid transparent',
          fontWeight: t === 'All' ? 600 : 400, transition:'color .15s'
        }}>{t}</button>
      ))}
      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, paddingBottom:8 }}>
        {pill(`${m.icon} ${intent}`, m.color, m.bg)}
      </div>
    </div>
  );
}

// ─── AI Answer Box ──────────────────────────────────────────
function AIAnswer({ answer, intent, aiPowered, onFeedback }) {
  const [fb, setFb] = useState(null);
  const m = INTENT_META[intent] || INTENT_META.Search;

  return (
    <div className="fade-in" style={{
      border:`1px solid ${m.color}30`, borderRadius:12,
      background:`linear-gradient(135deg, ${m.bg}60, #fff)`,
      padding:'18px 20px', marginBottom:20, maxWidth:652
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <span style={{ fontSize:16 }}>{m.icon}</span>
        <span style={{ fontSize:'0.82rem', fontWeight:700, color:m.color, letterSpacing:.3 }}>
          AI OVERVIEW
        </span>
        {!aiPowered && (
          <span style={{
            fontSize:'0.68rem', padding:'1px 7px', borderRadius:20,
            background:'#fef9e7', color:'#f29900', border:'1px solid #fbbc0450', marginLeft:4
          }}>demo mode</span>
        )}
      </div>
      <div className="md">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:14, paddingTop:12, borderTop:'1px solid #e8eaed' }}>
        <span style={{ fontSize:'0.75rem', color:'#9aa0a6' }}>Was this helpful?</span>
        {['👍','👎'].map((emoji, i) => (
          <button key={emoji} onClick={() => { setFb(i===0?'up':'down'); onFeedback(i===0?5:1); }}
            style={{
              background: fb === (i===0?'up':'down') ? '#e8f0fe' : '#f1f3f4',
              border:'none', borderRadius:20, padding:'3px 10px', cursor:'pointer',
              fontSize:'0.85rem', transition:'background .15s'
            }}>{emoji}</button>
        ))}
        {fb && <span style={{ fontSize:'0.75rem', color:'#0f9d58' }}>Thanks for your feedback!</span>}
      </div>
    </div>
  );
}

// ─── Single result card ─────────────────────────────────────
function ResultCard({ result, index }) {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (result.url) window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fade-in" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        marginBottom:26, maxWidth:652, cursor: result.url ? 'pointer' : 'default',
        animationDelay:`${index * 40}ms`
      }}
      onClick={handleClick}
    >
      {/* Source line */}
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
        <Favicon domain={result.domain} />
        <span style={{ fontSize:'0.82rem', color:'#202124' }}>{result.domain}</span>
        {result.source === 'demo' && (
          <span style={{ fontSize:'0.68rem', color:'#9aa0a6', marginLeft:2 }}>· demo</span>
        )}
      </div>

      {/* Title */}
      <div style={{
        fontSize:'1.08rem', color: hovered ? '#1558d6' : '#1a0dab',
        fontWeight:400, lineHeight:1.3, marginBottom:4,
        textDecoration: hovered ? 'underline' : 'none'
      }}>
        {result.title}
      </div>

      {/* Snippet */}
      <div style={{
        fontSize:'0.88rem', color:'#4d5156', lineHeight:1.6,
        display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden'
      }}>
        {result.snippet}
      </div>
    </div>
  );
}

// ─── Profile modal ──────────────────────────────────────────
function ProfileModal({ uep, health, onClose }) {
  if (!uep) return null;
  const sm = SKILL_META[uep.skillLevel] || SKILL_META.Intermediate;
  const topDomains = Object.entries(uep.domains || {}).sort((a,b) => b[1]-a[1]).slice(0,5);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:500,
      background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center'
    }} onClick={onClose}>
      <div style={{
        background:'#fff', borderRadius:16, padding:28, width:420, maxWidth:'90vw',
        boxShadow:'0 12px 48px rgba(0,0,0,0.2)', maxHeight:'85vh', overflowY:'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ fontSize:'1rem', fontWeight:700, color:'#202124' }}>Your Search Profile</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#5f6368' }}>×</button>
        </div>

        {/* Skill level */}
        <div style={{ background:'#f8f9fa', borderRadius:10, padding:16, marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:'0.82rem', color:'#5f6368' }}>Skill Level</span>
            <span style={{ fontSize:'0.85rem', fontWeight:700, color:sm.color }}>{sm.label}</span>
          </div>
          <div style={{ height:6, background:'#e8eaed', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', background:sm.color, borderRadius:3, width:`${uep.skillScore || 50}%`, transition:'width .5s ease' }} />
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            { label:'Searches', value: uep.queryCount || 0 },
            { label:'Learn Speed', value:`${Math.round((uep.learningVelocity||0)*100)}%` },
            { label:'Accuracy', value:`${Math.round((uep.historicalAccuracyScore||0.8)*100)}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background:'#f8f9fa', borderRadius:8, padding:12, textAlign:'center' }}>
              <div style={{ fontSize:'1.1rem', fontWeight:700, color:'#1a73e8' }}>{value}</div>
              <div style={{ fontSize:'0.72rem', color:'#9aa0a6', marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Domain expertise */}
        {topDomains.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:'0.8rem', color:'#5f6368', fontWeight:600, marginBottom:10 }}>Domain Expertise</div>
            {topDomains.map(([domain, score]) => (
              <div key={domain} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ fontSize:'0.78rem', color:'#5f6368', width:130, textTransform:'capitalize', flexShrink:0 }}>{domain}</span>
                <div style={{ flex:1, height:5, background:'#e8eaed', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', background:'#1a73e8', borderRadius:3, width:`${Math.round(score*100)}%` }} />
                </div>
                <span style={{ fontSize:'0.72rem', color:'#9aa0a6', width:32, textAlign:'right' }}>{Math.round(score*100)}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Preferred formats */}
        {uep.preferredFormats?.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:'0.8rem', color:'#5f6368', fontWeight:600, marginBottom:8 }}>Preferred Formats</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {uep.preferredFormats.map(f => (
                <span key={f} style={{
                  fontSize:'0.75rem', padding:'3px 10px', borderRadius:20,
                  background:'#e8f0fe', color:'#1a73e8', fontWeight:500
                }}>{f}</span>
              ))}
            </div>
          </div>
        )}

        {/* System info */}
        {health && (
          <div style={{ borderTop:'1px solid #e8eaed', paddingTop:14, marginTop:4 }}>
            <div style={{ fontSize:'0.8rem', color:'#5f6368', fontWeight:600, marginBottom:8 }}>System Info</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {Object.entries(health.providers || {}).map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem' }}>
                  <span style={{ color:'#9aa0a6', textTransform:'capitalize' }}>{k}</span>
                  <span style={{
                    color: v.includes('demo')||v.includes('local')||v.includes('memory') ? '#f29900' : '#0f9d58',
                    fontWeight:500
                  }}>{v}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem' }}>
                <span style={{ color:'#9aa0a6' }}>Vector index</span>
                <span style={{ color:'#1a73e8', fontWeight:500 }}>{health.vectorIndexSize || 0} docs</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── History sidebar ─────────────────────────────────────────
function HistorySidebar({ history, onRerun }) {
  if (history.length === 0) return null;
  return (
    <div style={{ width:220, flexShrink:0, paddingLeft:32 }}>
      <div style={{ fontSize:'0.75rem', color:'#9aa0a6', fontWeight:600, letterSpacing:.5, marginBottom:12, textTransform:'uppercase' }}>
        Recent Searches
      </div>
      {history.slice(-8).reverse().map((item, i) => {
        const m = INTENT_META[item.intent] || INTENT_META.Search;
        return (
          <div key={i} onClick={() => onRerun(item.query)}
            style={{
              display:'flex', alignItems:'center', gap:8, padding:'6px 8px',
              borderRadius:6, cursor:'pointer', marginBottom:2, transition:'background .12s'
            }}
            onMouseOver={e => e.currentTarget.style.background='#f1f3f4'}
            onMouseOut={e => e.currentTarget.style.background='transparent'}
          >
            <span style={{ fontSize:12 }}>{m.icon}</span>
            <span style={{
              fontSize:'0.82rem', color:'#5f6368',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1
            }}>{item.query}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Welcome / Home screen ───────────────────────────────────
function HomeScreen({ onSearch }) {
  const [val, setVal] = useState('');
  const [focused, setFocused] = useState(false);

  const submit = () => { if (val.trim()) onSearch(val.trim()); };

  const suggestions = [
    { text:'Compare React vs Vue vs Angular', intent:'Compare' },
    { text:'What is machine learning?', intent:'Learn' },
    { text:'Implement binary search in Python', intent:'Code' },
    { text:'Full form of WWW', intent:'Learn' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:100 }}>
      {/* Logo */}
      <div style={{ fontSize:'3.2rem', fontWeight:800, letterSpacing:-2, marginBottom:28,
        fontFamily:'Product Sans, Arial, sans-serif' }}>
        <span style={{ color:'#4285f4' }}>E</span>
        <span style={{ color:'#ea4335' }}>v</span>
        <span style={{ color:'#fbbc04' }}>o</span>
        <span style={{ color:'#4285f4' }}>l</span>
        <span style={{ color:'#34a853' }}>v</span>
        <span style={{ color:'#ea4335' }}>e</span>
      </div>

      {/* Search bar */}
      <div style={{
        display:'flex', alignItems:'center',
        width:'100%', maxWidth:584,
        border:`1px solid ${focused ? '#1a73e8' : '#dfe1e5'}`,
        borderRadius:24, padding:'12px 20px',
        boxShadow: focused ? '0 2px 8px rgba(32,33,36,.28)' : '0 2px 6px rgba(0,0,0,.1)',
        transition:'box-shadow .15s, border-color .15s',
        background:'#fff', gap:12, marginBottom:24
      }}>
        <span style={{ color:'#9aa0a6', fontSize:20 }}>🔍</span>
        <input
          value={val} onChange={e => setVal(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Search anything..."
          autoFocus
          style={{
            flex:1, border:'none', outline:'none', fontSize:'1rem',
            color:'#202124', background:'transparent', fontFamily:'inherit'
          }}
        />
        {val && (
          <button onClick={() => setVal('')}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#70757a', fontSize:20 }}>×</button>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display:'flex', gap:12, marginBottom:48 }}>
        <button onClick={submit}
          style={{
            background:'#f8f9fa', border:'1px solid #f8f9fa', borderRadius:4,
            padding:'10px 20px', cursor:'pointer', fontSize:'0.88rem', color:'#3c4043',
            fontFamily:'inherit', fontWeight:500,
            boxShadow:'0 1px 1px rgba(0,0,0,.1)'
          }}
          onMouseOver={e => { e.target.style.boxShadow='0 2px 4px rgba(0,0,0,.2)'; e.target.style.borderColor='#dadce0'; }}
          onMouseOut={e => { e.target.style.boxShadow='0 1px 1px rgba(0,0,0,.1)'; e.target.style.borderColor='#f8f9fa'; }}
        >Evolve Search</button>
        <button onClick={() => val.trim() && onSearch(val.trim())}
          style={{
            background:'#f8f9fa', border:'1px solid #f8f9fa', borderRadius:4,
            padding:'10px 20px', cursor:'pointer', fontSize:'0.88rem', color:'#3c4043',
            fontFamily:'inherit', fontWeight:500,
            boxShadow:'0 1px 1px rgba(0,0,0,.1)'
          }}
          onMouseOver={e => { e.target.style.boxShadow='0 2px 4px rgba(0,0,0,.2)'; e.target.style.borderColor='#dadce0'; }}
          onMouseOut={e => { e.target.style.boxShadow='0 1px 1px rgba(0,0,0,.1)'; e.target.style.borderColor='#f8f9fa'; }}
        >I'm Feeling Lucky</button>
      </div>

      {/* Suggestion chips */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', maxWidth:560 }}>
        {suggestions.map(({ text, intent }) => {
          const m = INTENT_META[intent];
          return (
            <button key={text} onClick={() => onSearch(text)}
              style={{
                background:'#fff', border:'1px solid #dfe1e5', borderRadius:20,
                padding:'7px 16px', cursor:'pointer', fontSize:'0.83rem', color:'#5f6368',
                fontFamily:'inherit', transition:'all .15s', display:'flex', alignItems:'center', gap:6
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor='#1a73e8'; e.currentTarget.style.color='#1a73e8'; e.currentTarget.style.background='#e8f0fe'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor='#dfe1e5'; e.currentTarget.style.color='#5f6368'; e.currentTarget.style.background='#fff'; }}
            >
              <span>{m.icon}</span> {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────
export default function App() {
  const [query, setQuery] = useState('');
  const [sessionHistory, setSessionHistory] = useState([]);
  const [uep, setUep] = useState(null);
  const [health, setHealth] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [startTime, setStartTime] = useState(null);

  const { search, sendFeedback, checkHealth, loading, result, error } = useSearch(USER_ID, sessionHistory);

  useEffect(() => { checkHealth().then(setHealth); }, []);

  const handleSearch = useCallback(async (q) => {
    setQuery(q);
    setStartTime(Date.now());
    const data = await search(q);
    if (data) {
      setUep(data.uep);
      setSessionHistory(prev => [...prev, { query: q, intent: data.intent }].slice(-20));
    }
  }, [search]);

  const isHome = !query && !loading;

  return (
    <div style={{ minHeight:'100vh', background:'#fff' }}>
      {/* Header (only when searching) */}
      {!isHome && (
        <Header
          query={query} onSearch={handleSearch} loading={loading}
          onLogoClick={() => { setQuery(''); }}
          startTime={startTime}
        />
      )}

      {/* Intent tab bar */}
      {result && !loading && <IntentBar intent={result.intent} />}

      {/* Main content */}
      <main style={{ padding: isHome ? 0 : '20px 24px 40px', maxWidth: isHome ? '100%' : 1200, margin:'0 auto' }}>

        {isHome && <HomeScreen onSearch={handleSearch} />}

        {!isHome && (
          <div style={{ display:'flex', alignItems:'flex-start' }}>
            {/* Results column */}
            <div style={{ flex:1, minWidth:0, maxWidth:652 }}>

              {loading && <SkeletonResults />}

              {error && !loading && (
                <div style={{ padding:'20px 0' }}>
                  <div style={{ fontSize:'1rem', color:'#d93025', marginBottom:8 }}>⚠ {error}</div>
                  <div style={{ fontSize:'0.85rem', color:'#5f6368' }}>
                    Make sure the backend is running: <code style={{ background:'#f1f3f4', padding:'1px 6px', borderRadius:3 }}>cd backend && node server.js</code>
                  </div>
                </div>
              )}

              {result && !loading && (
                <div className="fade-in">
                  <SearchTimer ms={result.metadata?.latencyMs} resultCount={result.results?.length} />

                  {result.answer && (
                    <AIAnswer
                      answer={result.answer} intent={result.intent}
                      aiPowered={result.metadata?.aiPowered}
                      onFeedback={(rating) => sendFeedback(rating)}
                    />
                  )}

                  {result.results?.map((r, i) => (
                    <ResultCard key={r.id || i} result={r} index={i} />
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <HistorySidebar history={sessionHistory} onRerun={handleSearch} />

              {/* Profile button */}
              {uep && (
                <button onClick={() => setShowProfile(true)}
                  style={{
                    marginLeft: sessionHistory.length > 0 ? 32 : 0,
                    display:'flex', alignItems:'center', gap:8,
                    background:'#f8f9fa', border:'1px solid #dfe1e5',
                    borderRadius:20, padding:'7px 16px',
                    cursor:'pointer', fontSize:'0.83rem', color:'#5f6368',
                    fontFamily:'inherit', transition:'all .15s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background='#e8f0fe'; e.currentTarget.style.borderColor='#1a73e8'; e.currentTarget.style.color='#1a73e8'; }}
                  onMouseOut={e => { e.currentTarget.style.background='#f8f9fa'; e.currentTarget.style.borderColor='#dfe1e5'; e.currentTarget.style.color='#5f6368'; }}
                >
                  <span style={{ width:8, height:8, borderRadius:'50%', background: SKILL_META[uep.skillLevel]?.color || '#1a73e8', display:'inline-block' }} />
                  {uep.skillLevel} · {uep.queryCount} searches
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal uep={uep} health={health} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
