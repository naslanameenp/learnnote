import { useEffect, useMemo, useState } from "react";
import {
  Search, ChevronDown, ChevronRight, CheckCircle2, Circle, Plus, MoreHorizontal,
  Calculator, Target, Trophy, SlidersHorizontal, X, Trash2, Pencil, Check, Cloud,
  CloudOff, PanelLeftClose, PanelLeftOpen, Command, Sparkles, ArrowUpRight
} from "lucide-react";
import { starterCurriculum } from "./curriculum.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const LOCAL_KEY = "arithmetic-mastery-local-v1";

function readLocal() {
  try {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? JSON.parse(saved) : starterCurriculum;
  } catch { return starterCurriculum; }
}
function progressOf(sections) {
  const topics = sections.flatMap(s => s.topics || []);
  const done = topics.filter(t => t.completed).length;
  return { done, total: topics.length, percent: topics.length ? Math.round(done / topics.length * 100) : 0 };
}
function IconButton({ title, onClick, children, className = "" }) {
  return <button className={`icon-button ${className}`} title={title} aria-label={title} onClick={onClick}>{children}</button>;
}

export default function App() {
  const [sections, setSections] = useState(readLocal);
  const [openSections, setOpenSections] = useState({ "local-section-0": true });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [addTarget, setAddTarget] = useState(null);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [apiConnected, setApiConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("Curriculum");
  const [menuFor, setMenuFor] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`${API}/sections`)
      .then(r => { if (!r.ok) throw new Error("API unavailable"); return r.json(); })
      .then(data => {
        if (!alive || !Array.isArray(data) || !data.length) return;
        setSections(data);
        setApiConnected(true);
        setOpenSections(p => ({ ...p, [data[0]._id]: true }));
        localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
      })
      .catch(() => { if (alive) setApiConnected(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(sections));
  }, [sections]);

  const progress = useMemo(() => progressOf(sections), [sections]);
  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sections.map(section => ({
      ...section,
      topics: (section.topics || []).filter(topic => {
        const matchesSearch = !q || topic.title.toLowerCase().includes(q) || section.title.toLowerCase().includes(q);
        const matchesFilter = filter === "all" || (filter === "completed" ? topic.completed : !topic.completed);
        return matchesSearch && matchesFilter;
      })
    })).filter(section => section.topics.length > 0 || (!q && filter === "all" && section.topics.length === 0));
  }, [sections, search, filter]);

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    if (!response.ok) throw new Error("Could not save to the server.");
    return response.status === 204 ? null : response.json();
  }

  async function toggleTopic(sectionId, topicId, completed) {
    setSections(prev => prev.map(s => s._id === sectionId ? {
      ...s, topics: s.topics.map(t => t._id === topicId ? { ...t, completed } : t)
    } : s));
    if (apiConnected && !String(topicId).startsWith("local-topic-")) {
      try { await request(`/topics/${topicId}`, { method: "PATCH", body: JSON.stringify({ completed }) }); }
      catch { setApiConnected(false); setNotice("Saved locally. Server connection was lost."); }
    }
  }

  async function addSection() {
    const title = draft.trim();
    if (!title) return;
    const localSection = { _id: `custom-section-${Date.now()}`, title, custom: true, topics: [], order: sections.length };
    setSections(prev => [...prev, localSection]);
    setOpenSections(prev => ({ ...prev, [localSection._id]: true }));
    setDraft(""); setAddTarget(null); setNotice("Section added.");
    if (apiConnected) {
      try {
        const saved = await request("/sections", { method: "POST", body: JSON.stringify({ title }) });
        setSections(prev => prev.map(s => s._id === localSection._id ? saved : s));
        setOpenSections(prev => ({ ...prev, [saved._id]: true }));
      } catch { setApiConnected(false); }
    }
  }

  async function addTopic(sectionId) {
    const title = draft.trim();
    if (!title) return;
    const localTopic = { _id: `custom-topic-${Date.now()}`, title, completed: false, custom: true, order: 999 };
    setSections(prev => prev.map(s => s._id === sectionId ? { ...s, topics: [...s.topics, localTopic] } : s));
    setDraft(""); setAddTarget(null); setNotice("Topic added.");
    if (apiConnected && !String(sectionId).startsWith("local-section-") && !String(sectionId).startsWith("custom-section-")) {
      try {
        const saved = await request(`/sections/${sectionId}/topics`, { method: "POST", body: JSON.stringify({ title }) });
        setSections(prev => prev.map(s => s._id === sectionId ? saved : s));
      } catch { setApiConnected(false); }
    }
  }

  async function deleteTopic(sectionId, topicId) {
    setSections(prev => prev.map(s => s._id === sectionId ? { ...s, topics: s.topics.filter(t => t._id !== topicId) } : s));
    setMenuFor(null);
    if (apiConnected && !String(topicId).startsWith("local-topic-") && !String(topicId).startsWith("custom-topic-")) {
      try { await request(`/topics/${topicId}`, { method: "DELETE" }); } catch { setApiConnected(false); }
    }
  }

  async function deleteSection(sectionId) {
    setSections(prev => prev.filter(s => s._id !== sectionId));
    setMenuFor(null);
    if (apiConnected && !String(sectionId).startsWith("local-section-") && !String(sectionId).startsWith("custom-section-")) {
      try { await request(`/sections/${sectionId}`, { method: "DELETE" }); } catch { setApiConnected(false); }
    }
  }

  async function saveRename(sectionId) {
    const title = renameDraft.trim();
    if (!title) return;
    setSections(prev => prev.map(s => s._id === sectionId ? { ...s, title } : s));
    setRenaming(null); setMenuFor(null);
    if (apiConnected && !String(sectionId).startsWith("local-section-") && !String(sectionId).startsWith("custom-section-")) {
      try { await request(`/sections/${sectionId}`, { method: "PATCH", body: JSON.stringify({ title }) }); } catch { setApiConnected(false); }
    }
  }

  function openAll() {
    setOpenSections(Object.fromEntries(sections.map(s => [s._id, true])));
  }
  function closeAll() { setOpenSections({}); }

  return (
    <div className="app-shell">
      {sidebarOpen && <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark"><Calculator size={19}/></div>
          <div className="brand-copy"><strong>Arithmetic</strong><span>MASTERY WORKSPACE</span></div>
          <IconButton title="Close sidebar" onClick={() => setSidebarOpen(false)}><PanelLeftClose size={16}/></IconButton>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">A</div>
          <div className="workspace-name"><strong>My workspace</strong><span>Personal learning</span></div>
          <MoreHorizontal size={17} className="muted"/>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="nav-list">
          <button className={`nav-item ${activeNav === "Overview" ? "active" : ""}`} onClick={() => setActiveNav("Overview")}><Target size={17}/> Overview</button>
          <button className={`nav-item ${activeNav === "Curriculum" ? "active" : ""}`} onClick={() => setActiveNav("Curriculum")}><CheckCircle2 size={17}/> Curriculum <span className="nav-count">{progress.done}</span></button>
          <button className={`nav-item ${activeNav === "Achievements" ? "active" : ""}`} onClick={() => setActiveNav("Achievements")}><Trophy size={17}/> Achievements</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-progress">
            <div className="progress-heading"><span>Your progress</span><strong>{progress.percent}%</strong></div>
            <div className="progress-track"><div className="progress-fill" style={{width:`${progress.percent}%`}}/></div>
            <span className="small-muted">{progress.done} of {progress.total} topics completed</span>
          </div>
          <div className="connection"><span className={`status-dot ${apiConnected ? "online" : ""}`}/>{apiConnected ? "Synced with MongoDB" : "Local mode"} <span className="connection-right">{apiConnected ? <Cloud size={14}/> : <CloudOff size={14}/>}</span></div>
        </div>
      </aside>}

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            {!sidebarOpen && <IconButton title="Open sidebar" onClick={() => setSidebarOpen(true)}><PanelLeftOpen size={17}/></IconButton>}
            <span className="crumb-muted">Workspace</span><span className="crumb-slash">/</span><strong>{activeNav}</strong>
          </div>
          <div className="topbar-actions">
            <div className="save-state"><span className={`status-dot ${apiConnected ? "online" : ""}`}/>{apiConnected ? "All changes synced" : "Saved on this device"}</div>
            <div className="user-dot">N</div>
          </div>
        </header>

        <div className="content-wrap">
          {activeNav === "Overview" ? (
            <Overview sections={sections} progress={progress} onGo={() => setActiveNav("Curriculum")}/>
          ) : activeNav === "Achievements" ? (
            <Achievements progress={progress}/>
          ) : (
            <>
              <div className="page-eyebrow"><span className="eyebrow-dot"/> YOUR PERSONAL LEARNING PLAN</div>
              <div className="page-title-row">
                <div><h1>Arithmetic mastery</h1><p className="page-subtitle">Build number sense. Think faster. Calculate with confidence.</p></div>
                <button className="primary-button" onClick={() => {setAddTarget({type:"section"});setDraft("");}}><Plus size={16}/> Add section</button>
              </div>

              <section className="stats-grid">
                <StatCard icon={<CheckCircle2 size={17}/>} label="TOPICS MASTERED" value={`${progress.done} / ${progress.total}`} note={`${progress.percent}% of your roadmap`} />
                <StatCard icon={<Target size={17}/>} label="REMAINING TOPICS" value={progress.total-progress.done} note="One step at a time" />
                <StatCard icon={<Sparkles size={17}/>} label="CURRICULUM SECTIONS" value={sections.length} note="Your learning roadmap" />
              </section>

              <div className="curriculum-toolbar">
                <div className="toolbar-title"><h2>Curriculum</h2><span className="section-pill">{sections.length} sections</span></div>
                <div className="toolbar-controls">
                  <div className="search-box"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search topics..." aria-label="Search topics"/>{search && <IconButton title="Clear search" onClick={()=>setSearch("")}><X size={13}/></IconButton>}<kbd>⌘ K</kbd></div>
                  <div className="filter-select"><SlidersHorizontal size={14}/><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter topics"><option value="all">All topics</option><option value="incomplete">To learn</option><option value="completed">Completed</option></select></div>
                </div>
              </div>

              <div className="list-actions"><span>{search ? `Results for “${search}”` : "YOUR LEARNING PATH"}</span><div><button onClick={openAll}>Expand all</button><span>·</span><button onClick={closeAll}>Collapse all</button></div></div>

              <div className="section-list">
                {filteredSections.map((section) => {
                  const original = sections.find(s => s._id === section._id) || section;
                  const total = original.topics?.length || 0;
                  const done = original.topics?.filter(t=>t.completed).length || 0;
                  const isOpen = !!openSections[section._id] || !!search;
                  const allDone = total > 0 && done === total;
                  return <article className={`section-card ${isOpen ? "is-open" : ""}`} key={section._id}>
                    <div className="section-header">
                      <button className="section-main" onClick={()=>setOpenSections(p=>({...p,[section._id]:!p[section._id]}))}>
                        <span className="expand-icon">{isOpen ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</span>
                        <span className={`section-status ${allDone ? "complete" : ""}`}>{allDone ? <Check size={13}/> : <span/>}</span>
                        <span className="section-heading">
                          {renaming === section._id ? <input autoFocus value={renameDraft} onClick={e=>e.stopPropagation()} onChange={e=>setRenameDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveRename(section._id);if(e.key==="Escape")setRenaming(null)}}/> : <strong>{section.title}</strong>}
                          <span className="section-meta">{done} of {total} completed</span>
                        </span>
                      </button>
                      <div className="section-right">
                        <div className="mini-progress"><div style={{width:`${total ? done/total*100 : 0}%`}}/></div>
                        <span className="section-percent">{total ? Math.round(done/total*100) : 0}%</span>
                        {renaming === section._id ? <IconButton title="Save name" onClick={()=>saveRename(section._id)}><Check size={15}/></IconButton> : <div className="menu-wrap">
                          <IconButton title="Section options" onClick={()=>setMenuFor(menuFor===section._id?null:section._id)}><MoreHorizontal size={17}/></IconButton>
                          {menuFor===section._id && <div className="pop-menu">
                            <button onClick={()=>{setRenaming(section._id);setRenameDraft(section.title);setMenuFor(null)}}><Pencil size={14}/> Rename section</button>
                            <button className="danger-text" onClick={()=>deleteSection(section._id)}><Trash2 size={14}/> Delete section</button>
                          </div>}
                        </div>}
                      </div>
                    </div>
                    {isOpen && <div className="topic-list">
                      {section.topics.map(topic => <div className={`topic-row ${topic.completed ? "topic-complete" : ""}`} key={topic._id}>
                        <label className="topic-label">
                          <input type="checkbox" checked={!!topic.completed} onChange={e=>toggleTopic(section._id,topic._id,e.target.checked)}/>
                          <span className="custom-check"><Check size={12}/></span>
                          <span>{topic.title}</span>
                        </label>
                        <div className="topic-end">
                          {topic.custom && <span className="custom-tag">CUSTOM</span>}
                          <IconButton title="Delete topic" className="topic-delete" onClick={()=>deleteTopic(section._id,topic._id)}><Trash2 size={14}/></IconButton>
                        </div>
                      </div>)}
                      {section.topics.length===0 && <div className="empty-topics">No topics here yet. Add the first one.</div>}
                      {addTarget?.type==="topic" && addTarget.sectionId===section._id ? (
                        <form className="inline-add" onSubmit={e=>{e.preventDefault();addTopic(section._id)}}>
                          <Plus size={15}/><input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Name your topic..." onKeyDown={e=>{if(e.key==="Escape")setAddTarget(null)}}/>
                          <button className="save-small" type="submit" disabled={!draft.trim()}>Add topic</button><IconButton title="Cancel" onClick={()=>setAddTarget(null)}><X size={14}/></IconButton>
                        </form>
                      ) : <button className="add-topic" onClick={()=>{setAddTarget({type:"topic",sectionId:section._id});setDraft("");setOpenSections(p=>({...p,[section._id]:true}));}}><Plus size={14}/> Add topic</button>}
                    </div>}
                  </article>;
                })}
                {filteredSections.length===0 && <div className="empty-state"><Search size={24}/><strong>No topics found</strong><span>Try another search or change the filter.</span><button onClick={()=>{setSearch("");setFilter("all")}}>Clear filters</button></div>}
              </div>

              <div className="bottom-add">
                {addTarget?.type==="section" ? <form className="new-section-form" onSubmit={e=>{e.preventDefault();addSection()}}><Plus size={16}/><input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} placeholder="New section name..." onKeyDown={e=>{if(e.key==="Escape")setAddTarget(null)}}/><button className="primary-button" type="submit" disabled={!draft.trim()}>Create section</button><IconButton title="Cancel" onClick={()=>setAddTarget(null)}><X size={15}/></IconButton></form> : <button className="add-section-ghost" onClick={()=>{setAddTarget({type:"section"});setDraft("");}}><Plus size={16}/> Add another section</button>}
              </div>
              <footer className="page-footer"><span>Small steps. Strong fundamentals.</span><span><Command size={12}/> Arithmetic Mastery</span></footer>
            </>
          )}
        </div>
      </main>
      {notice && <div className="toast"><CheckCircle2 size={16}/>{notice}<button onClick={()=>setNotice("")}><X size={14}/></button></div>}
      {menuFor && <button className="dismiss-layer" aria-label="Close menu" onClick={()=>setMenuFor(null)}/>}
    </div>
  );
}

function StatCard({icon,label,value,note}) {
  return <div className="stat-card"><div className="stat-top"><span className="stat-icon">{icon}</span><span>{label}</span></div><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></div>;
}
function Overview({sections,progress,onGo}) {
  const next = sections.flatMap(s=>(s.topics||[]).filter(t=>!t.completed).map(t=>({section:s.title,title:t.title}))).slice(0,5);
  return <div className="overview-page"><div className="page-eyebrow"><span className="eyebrow-dot"/> YOUR PROGRESS AT A GLANCE</div><h1>Welcome back.</h1><p className="page-subtitle">Consistency beats intensity. Keep moving forward.</p><div className="overview-hero"><div><span className="hero-label">TOTAL MASTERY</span><div className="hero-number">{progress.percent}<small>%</small></div><p>{progress.done} topics completed out of {progress.total}</p><div className="progress-track hero-track"><div className="progress-fill" style={{width:`${progress.percent}%`}}/></div></div><div className="hero-symbol"><Calculator size={58}/></div></div><div className="overview-section-head"><h2>Pick up where you left off</h2><button onClick={onGo}>View curriculum <ArrowUpRight size={14}/></button></div><div className="next-list">{next.map((t,i)=><div className="next-item" key={t.title}><span className="next-index">{String(i+1).padStart(2,"0")}</span><div><strong>{t.title}</strong><span>{t.section}</span></div><ArrowUpRight size={15}/></div>)}</div><button className="primary-button overview-cta" onClick={onGo}>Continue learning <ArrowUpRight size={15}/></button></div>;
}
function Achievements({progress}) {
  const badges = [{title:"First Step",desc:"Complete your first topic",unlocked:progress.done>=1,icon:"01"},{title:"Getting Consistent",desc:"Master 10 topics",unlocked:progress.done>=10,icon:"10"},{title:"Quarter Way",desc:"Reach 25% completion",unlocked:progress.percent>=25,icon:"25"},{title:"Halfway There",desc:"Reach 50% completion",unlocked:progress.percent>=50,icon:"50"},{title:"Arithmetic Pro",desc:"Master 100 topics",unlocked:progress.done>=100,icon:"100"},{title:"Roadmap Complete",desc:"Complete every topic",unlocked:progress.total>0&&progress.done===progress.total,icon:"✓"}];
  return <div className="achievements-page"><div className="page-eyebrow"><span className="eyebrow-dot"/> MILESTONES</div><h1>Achievements</h1><p className="page-subtitle">Every completed topic is proof of progress.</p><div className="achievement-grid">{badges.map(b=><div className={`achievement-card ${b.unlocked?"unlocked":""}`} key={b.title}><div className="achievement-icon">{b.unlocked?<Trophy size={21}/>:<span>{b.icon}</span>}</div><strong>{b.title}</strong><p>{b.desc}</p><span className="achievement-status">{b.unlocked?"UNLOCKED":"LOCKED"}</span></div>)}</div><div className="achievement-foot"><Trophy size={18}/><span>{progress.done} topics down. Keep going.</span></div></div>;
}
