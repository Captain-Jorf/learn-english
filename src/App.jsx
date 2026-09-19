import { useEffect, useMemo, useRef, useState } from 'react';
import { BrandMark, Icon } from './components/Icons';
import { goalOptions, paths, placementQuestions, words } from './data/lexicon';
import { createPlatformClient, PlatformApiError, resolvePlatformApiBaseUrl } from './services/platformClient';

const STORAGE_KEY = 'lexora-state-v1';

const defaultState = {
  onboarded: false,
  name: '',
  goal: 'work',
  dailyGoal: 15,
  level: 'B1',
  theme: 'light',
  largeText: false,
  reduceMotion: false,
  savedIds: ['nuance', 'articulate'],
  reviewQueue: ['nuance', 'resilient', 'align', 'clarify'],
  reviewedIds: [],
  xp: 1280,
  minutesToday: 8,
  totalWords: 28,
  streak: 6,
};

function readState() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
  } catch {
    return defaultState;
  }
}

function playWord(word) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word.word);
  utterance.lang = 'en-US';
  utterance.rate = 0.76;
  utterance.pitch = 0.98;
  window.speechSynthesis.speak(utterance);
}

function syncNativeTheme(theme) {
  const dark = theme === 'dark';
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', dark ? '#191D1A' : '#F6F3EB');
  try {
    if (window.LexoraNative && typeof window.LexoraNative.setDarkTheme === 'function') {
      window.LexoraNative.setDarkTheme(dark);
    }
  } catch {
    // The browser preview does not expose the Android bridge.
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getWord(id) {
  return words.find((word) => word.id === id) || words[0];
}

function Button({ children, variant = 'primary', size = 'md', icon, iconRight, className = '', ...props }) {
  return (
    <button className={`button button-${variant} button-${size} ${className}`} {...props}>
      {icon && <Icon name={icon} size={18} />}
      <span>{children}</span>
      {iconRight && <Icon name={iconRight} size={18} />}
    </button>
  );
}

function Pill({ children, tone = 'neutral', className = '' }) {
  return <span className={`pill pill-${tone} ${className}`}>{children}</span>;
}

function SectionHeader({ eyebrow, title, action, className = '' }) {
  return (
    <div className={`section-header ${className}`}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function ProgressRing({ value, size = 92, stroke = 8, label, detail, className = '' }) {
  const radius = 39;
  const circumference = 2 * Math.PI * radius;
  const bounded = Math.max(0, Math.min(100, value));
  const offset = circumference - (bounded / 100) * circumference;

  return (
    <div className={`progress-ring ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 96 96" width={size} height={size} aria-label={`${value}% complete`} role="img">
        <circle className="ring-track" cx="48" cy="48" r={radius} fill="none" strokeWidth={stroke} />
        <circle
          className="ring-value"
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
        />
      </svg>
      <div className="ring-copy">
        <strong>{label}</strong>
        {detail && <span>{detail}</span>}
      </div>
    </div>
  );
}

function AppMark({ compact = false }) {
  return (
    <div className={`app-mark ${compact ? 'app-mark-compact' : ''}`}>
      <BrandMark size={compact ? 32 : 38} />
      {!compact && (
        <div>
          <span className="wordmark">lexora</span>
          <span className="wordmark-sub">THINK IN ENGLISH</span>
        </div>
      )}
    </div>
  );
}

function ThemeToggle({ theme, onToggle }) {
  const dark = theme === 'dark';
  return (
    <button className="theme-toggle" onClick={onToggle} aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}>
      <Icon name={dark ? 'sun' : 'moon'} size={18} />
      <span>{dark ? 'Light' : 'Dark'}</span>
    </button>
  );
}

function Onboarding({ onComplete, theme, onToggleTheme }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('work');
  const [minutes, setMinutes] = useState(15);
  const [answers, setAnswers] = useState([]);
  const question = placementQuestions[answers.length];
  const progress = step === 0 ? 0 : step === 1 ? 20 : 20 + (answers.length / placementQuestions.length) * 80;

  const selectAnswer = (index) => {
    if (answers.length >= placementQuestions.length) return;
    setAnswers((current) => [...current, index]);
  };

  const finish = () => {
    const score = answers.reduce((total, answer, index) => total + (answer === placementQuestions[index].answer ? 1 : 0), 0);
    const level = score >= 4 ? 'B2' : score >= 2 ? 'B1' : 'A2';
    onComplete({ goal, dailyGoal: minutes, level });
  };

  return (
    <main className="onboarding-shell">
      <div className="onboarding-topbar">
        <AppMark />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <div className="onboarding-grid">
        <section className="onboarding-aside">
          <div className="orb orb-large" />
          <div className="aside-content">
            <Pill tone="accent">A focused English practice</Pill>
            <h1>Build a sharper English mind.</h1>
            <p>Lexora uses meaning, context, and active recall to help words become yours.</p>
            <div className="aside-points">
              <div><span className="point-index">01</span><span>Definitions written in English</span></div>
              <div><span className="point-index">02</span><span>Context before translation</span></div>
              <div><span className="point-index">03</span><span>A path that adapts with you</span></div>
            </div>
          </div>
          <div className="aside-quote">“The right word changes the thought.”</div>
        </section>

        <section className="onboarding-panel">
          <div className="onboarding-progress" aria-label={`${Math.round(progress)}% setup complete`}>
            <div className="progress-line"><span style={{ width: `${progress}%` }} /></div>
            <span>{step === 0 ? 'START' : step === 1 ? 'YOUR RHYTHM' : 'QUICK CHECK'}</span>
          </div>

          {step === 0 && (
            <div className="setup-view welcome-view">
              <div className="setup-overline">WELCOME TO LEXORA</div>
              <h2>Think in English, word by word.</h2>
              <p>We will shape a small, sustainable learning path around your goal and current level.</p>
              <div className="welcome-card">
                <Icon name="layers" size={24} />
                <div><strong>About three minutes</strong><span>A goal, a rhythm, and five adaptive questions.</span></div>
              </div>
              <Button onClick={() => setStep(1)} iconRight="arrowRight">Build my path</Button>
              <p className="tiny-note">You can change your pace and theme at any time.</p>
            </div>
          )}

          {step === 1 && (
            <div className="setup-view">
              <button className="back-text" onClick={() => setStep(0)}><Icon name="arrowLeft" size={16} /> Back</button>
              <div className="setup-overline">YOUR INTENTION</div>
              <h2>What would you like English to unlock?</h2>
              <div className="goal-list">
                {goalOptions.map((option) => (
                  <button key={option.id} className={`goal-card ${goal === option.id ? 'selected' : ''}`} onClick={() => setGoal(option.id)}>
                    <span className="choice-radio"><span /></span>
                    <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                    {goal === option.id && <Icon name="check" size={18} />}
                  </button>
                ))}
              </div>
              <div className="duration-block">
                <div><strong>A sustainable daily rhythm</strong><span>Choose a starting point, not a rule.</span></div>
                <div className="duration-options">
                  {[10, 15, 20].map((value) => <button key={value} onClick={() => setMinutes(value)} className={minutes === value ? 'selected' : ''}>{value}<small>min</small></button>)}
                </div>
              </div>
              <Button onClick={() => setStep(2)} iconRight="arrowRight">Continue</Button>
            </div>
          )}

          {step === 2 && question && (
            <div className="setup-view check-view">
              <button className="back-text" onClick={() => setStep(1)}><Icon name="arrowLeft" size={16} /> Back</button>
              <div className="question-count">QUESTION {answers.length + 1} OF {placementQuestions.length}</div>
              <h2>{question.prompt}</h2>
              <div className="answer-list">
                {question.options.map((option, index) => (
                  <button className="answer-option" onClick={() => selectAnswer(index)} key={option}>
                    <span className="answer-letter">{String.fromCharCode(65 + index)}</span>
                    <span>{option}</span>
                  </button>
                ))}
              </div>
              <p className="tiny-note">Choose the answer that sounds most natural to you.</p>
            </div>
          )}

          {step === 2 && !question && (
            <div className="setup-view result-view">
              <div className="result-orbit"><BrandMark size={58} /></div>
              <div className="setup-overline">YOUR STARTING POINT</div>
              <h2>A path with room to grow.</h2>
              <p>We will begin with precise, useful vocabulary and adjust each next step from your practice.</p>
              <div className="result-summary">
                <div><Icon name="trend" size={19} /><span>Your first level<strong>{answers.filter((answer, index) => answer === placementQuestions[index].answer).length >= 4 ? 'B2 · Independent' : answers.filter((answer, index) => answer === placementQuestions[index].answer).length >= 2 ? 'B1 · Developing' : 'A2 · Foundation'}</strong></span></div>
                <div><Icon name="clock" size={19} /><span>Daily focus<strong>{minutes} minutes</strong></span></div>
              </div>
              <Button onClick={finish} iconRight="arrowRight">Enter Lexora</Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Header({ state, onToggleTheme, label, caption }) {
  return (
    <header className="app-header">
      <div>
        <AppMark compact />
        {label && <div className="header-context"><span>{label}</span>{caption && <small>{caption}</small>}</div>}
      </div>
      <div className="header-actions">
        <button className="xp-chip" aria-label={`${state.xp} experience points`}><Icon name="bolt" size={15} /><span>{state.xp.toLocaleString()} XP</span></button>
        <ThemeToggle theme={state.theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}

function WordCard({ word, saved, onToggleSave, onOpen, compact = false }) {
  return (
    <article className={`word-card ${compact ? 'word-card-compact' : ''}`}>
      <div className="word-card-top">
        <div className="word-meta"><Pill tone="outline">{word.level}</Pill><span>{word.part}</span></div>
        <button className={`icon-button ${saved ? 'is-active' : ''}`} onClick={() => onToggleSave(word.id)} aria-label={`${saved ? 'Remove' : 'Save'} ${word.word}`}><Icon name={saved ? 'bookmarkFilled' : 'bookmark'} size={19} /></button>
      </div>
      <div className="word-card-main">
        <div className="word-heading"><button className="word-title-link" onClick={() => onOpen(word)}><h3>{word.word}</h3><span>{word.phonetic}</span></button><button className="pronounce-mini" onClick={() => playWord(word)} aria-label={`Hear ${word.word}`}><Icon name="sound" size={17} /></button></div>
        <button className="word-definition-link" onClick={() => onOpen(word)}><p>{word.definition}</p>{!compact && <blockquote>“{word.example}”</blockquote>}</button>
      </div>
      {!compact && <div className="word-card-footer"><span>{word.domain}</span><button onClick={() => onOpen(word)}>Explore word <Icon name="arrowRight" size={16} /></button></div>}
    </article>
  );
}

function TodayScreen({ state, setTab, onOpenWord, onToggleSave }) {
  const word = getWord('nuance');
  const dailyPercent = Math.min(100, Math.round((state.minutesToday / state.dailyGoal) * 100));
  const nextWord = getWord(state.reviewQueue[0] || 'articulate');
  const path = paths.find((item) => item.id === state.goal) || paths[1];

  return (
    <div className="screen-content today-screen">
      <div className="welcome-row">
        <div><p className="eyebrow">{getGreeting().toUpperCase()}</p><h1>Make the next word count.</h1></div>
        <div className="streak-chip"><Icon name="trend" size={16} /><span>{state.streak} day rhythm</span></div>
      </div>

      <section className="daily-focus-card surface-accent">
        <div className="focus-copy">
          <Pill tone="onAccent">TODAY’S FOCUS</Pill>
          <h2>Shape meaning through context.</h2>
          <p>One new word, three useful contexts, and a focused review.</p>
          <div className="focus-actions"><Button size="sm" variant="light" onClick={() => setTab('learn')} iconRight="arrowRight">Begin focus</Button><button className="text-button light-text" onClick={() => setTab('coach')}>Ask the guide</button></div>
        </div>
        <ProgressRing value={dailyPercent} label={`${state.minutesToday}`} detail={`/ ${state.dailyGoal} min`} />
      </section>

      <section>
        <SectionHeader eyebrow="WORD OF THE MOMENT" title="Study with precision" action={<button className="link-button" onClick={() => setTab('learn')}>See library <Icon name="arrowRight" size={16} /></button>} />
        <WordCard word={word} saved={state.savedIds.includes(word.id)} onToggleSave={onToggleSave} onOpen={onOpenWord} />
      </section>

      <section className="two-column-grid">
        <article className="review-brief card-surface">
          <div className="brief-icon"><Icon name="review" size={21} /></div>
          <div><p className="eyebrow">DUE FOR REVIEW</p><h3>{state.reviewQueue.length || 0} words want context</h3><p>Strengthen recall by choosing the word that fits the moment.</p></div>
          <Button size="sm" variant="secondary" onClick={() => setTab('review')} iconRight="arrowRight">Review</Button>
        </article>
        <article className="path-brief card-surface">
          <div className="path-brief-top"><div><p className="eyebrow">YOUR PATH</p><h3>{path.title}</h3></div><span>{path.progress}%</span></div>
          <div className="thin-progress"><span style={{ width: `${path.progress}%` }} /></div>
          <p>{path.count} words designed around your goal.</p>
          <button className="text-button" onClick={() => setTab('learn')}>Continue path <Icon name="arrowRight" size={16} /></button>
        </article>
      </section>

      <section className="insight-banner">
        <div className="insight-symbol"><Icon name="spark" size={21} /></div>
        <div><p className="eyebrow">A SMALL PRINCIPLE</p><p>When you learn a word inside a situation, you learn when to choose it.</p></div>
      </section>

      <section className="momentum-section">
        <SectionHeader eyebrow="YOUR MOMENTUM" title="A steady rhythm" />
        <div className="momentum-grid">
          <div className="metric-card"><span className="metric-label">Mastered</span><strong>{state.totalWords}</strong><span>words with active recall</span></div>
          <div className="metric-card"><span className="metric-label">Next review</span><strong>{nextWord.word}</strong><span>in context, when you are ready</span></div>
          <div className="metric-card metric-card-symbol"><Icon name="trophy" size={26} /><strong>Clear intent</strong><span>7 focused sessions unlocked</span></div>
        </div>
      </section>
    </div>
  );
}

function LearnScreen({ state, onOpenWord, onToggleSave }) {
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('All');
  const filtered = words.filter((word) => {
    const matchesSearch = `${word.word} ${word.definition} ${word.domain}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (domain === 'All' || word.domain === domain);
  });

  return (
    <div className="screen-content learn-screen">
      <div className="screen-hero"><p className="eyebrow">YOUR WORD LIBRARY</p><h1>Build meaning that stays.</h1><p>Every entry starts in English and opens through real usage.</p></div>
      <label className="search-field"><Icon name="search" size={20} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search words, meanings, or topics" /><span>{filtered.length}</span></label>
      <div className="filter-row" role="tablist" aria-label="Filter word library">
        {['All', 'Everyday', 'Work', 'Ideas'].map((item) => <button key={item} className={domain === item ? 'active' : ''} onClick={() => setDomain(item)} role="tab" aria-selected={domain === item}>{item}</button>)}
      </div>
      <div className="library-summary"><span>Showing <strong>{filtered.length} words</strong></span><button className="text-button"><Icon name="layers" size={16} /> By relevance <Icon name="chevronDown" size={14} /></button></div>
      <div className="word-library">
        {filtered.map((word, index) => (
          <article className="library-row" key={word.id}>
            <span className="word-index">{String(index + 1).padStart(2, '0')}</span>
            <button className="library-word" onClick={() => onOpenWord(word)}><strong>{word.word}</strong><span>{word.phonetic} · {word.part}</span></button>
            <p>{word.definition}</p>
            <Pill tone={word.domain === 'Ideas' ? 'lime' : word.domain === 'Work' ? 'blue' : 'sand'}>{word.domain}</Pill>
            <button className={`icon-button ${state.savedIds.includes(word.id) ? 'is-active' : ''}`} onClick={() => onToggleSave(word.id)} aria-label={`Save ${word.word}`}><Icon name={state.savedIds.includes(word.id) ? 'bookmarkFilled' : 'bookmark'} size={18} /></button>
          </article>
        ))}
      </div>
      <section className="path-stack">
        <SectionHeader eyebrow="LEARNING PATHS" title="Choose a direction" />
        <div className="path-cards">
          {paths.map((path) => <article className={`path-card path-${path.tone}`} key={path.id}><span className="path-number">0{paths.indexOf(path) + 1}</span><h3>{path.title}</h3><p>{path.subtitle}</p><div className="path-progress"><span style={{ width: `${path.progress}%` }} /></div><footer><span>{path.count} words</span><span>{path.progress}% explored</span></footer></article>)}
        </div>
      </section>
    </div>
  );
}

function SentenceWithBlank({ sentence }) {
  const [before, after] = sentence.split('____');
  return <p className="context-sentence">{before}<span className="blank-space">____</span>{after}</p>;
}

function ReviewScreen({ state, updateState, setTab }) {
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const currentId = state.reviewQueue[0];
  const word = currentId ? getWord(currentId) : null;
  const correct = selected === word?.word;

  useEffect(() => {
    setSelected(null);
    setChecked(false);
    setShowHint(false);
  }, [currentId]);

  const handleNext = () => {
    if (!word) return;
    updateState((current) => {
      const remaining = current.reviewQueue.slice(1);
      const reviewQueue = correct ? remaining : [...remaining, currentId];
      return {
        ...current,
        reviewQueue,
        reviewedIds: correct ? [...new Set([...current.reviewedIds, currentId])] : current.reviewedIds,
        xp: correct ? current.xp + 18 : current.xp + 4,
        minutesToday: Math.min(current.dailyGoal, current.minutesToday + 2),
        totalWords: correct ? current.totalWords + (current.reviewedIds.includes(currentId) ? 0 : 1) : current.totalWords,
      };
    });
  };

  const resetSession = () => updateState((current) => ({ ...current, reviewQueue: ['nuance', 'resilient', 'align', 'clarify'], reviewedIds: [] }));

  if (!word) {
    return (
      <div className="screen-content review-screen review-empty">
        <div className="empty-orbit"><Icon name="checkCircle" size={42} /></div>
        <p className="eyebrow">REVIEW COMPLETE</p><h1>You gave every word its moment.</h1>
        <p>Your next review will return with fresh context. For now, explore a word or rehearse the coach’s questions.</p>
        <div className="empty-actions"><Button onClick={() => setTab('learn')} iconRight="arrowRight">Explore words</Button><Button variant="secondary" onClick={resetSession} icon="refresh">Practice again</Button></div>
      </div>
    );
  }

  const complete = state.reviewedIds.length;
  const total = state.reviewQueue.length + complete;
  const overall = Math.round((complete / Math.max(total, 1)) * 100);

  return (
    <div className="screen-content review-screen">
      <div className="review-header"><div><p className="eyebrow">CONTEXT PRACTICE</p><h1>Choose the word that belongs.</h1></div><div className="review-count"><strong>{complete + 1}</strong><span>of {Math.max(total, 4)}</span></div></div>
      <div className="review-progress"><span style={{ width: `${Math.max(overall, 12)}%` }} /></div>
      <section className="practice-card">
        <div className="practice-card-top"><Pill tone="outline">{word.level}</Pill><span>Meaning in context</span><button onClick={() => playWord(word)} className="icon-button" aria-label={`Hear ${word.word}`}><Icon name="sound" size={20} /></button></div>
        <div className="sentence-block"><span className="sentence-label">COMPLETE THE IDEA</span><SentenceWithBlank sentence={word.context.sentence} /></div>
        <div className="option-grid">
          {word.context.options.map((option, index) => {
            let status = '';
            if (checked && option === word.word) status = 'correct';
            if (checked && option === selected && option !== word.word) status = 'incorrect';
            if (!checked && selected === option) status = 'selected';
            return <button disabled={checked} onClick={() => setSelected(option)} className={`practice-option ${status}`} key={option}><span>{String.fromCharCode(65 + index)}</span><strong>{option}</strong>{checked && option === word.word && <Icon name="check" size={18} />}</button>;
          })}
        </div>
        {!checked && <div className="practice-actions"><button className="hint-button" onClick={() => setShowHint(!showHint)}><Icon name="spark" size={17} /> {showHint ? 'Hide hint' : 'Show a hint'}</button><Button disabled={!selected} onClick={() => setChecked(true)} iconRight="arrowRight">Check answer</Button></div>}
        {showHint && !checked && <div className="hint-box"><Icon name="info" size={17} /><span>{word.context.hint}</span></div>}
        {checked && <div className={`feedback-box ${correct ? 'feedback-good' : 'feedback-try'}`}><div><Icon name={correct ? 'checkCircle' : 'spark'} size={22} /><div><strong>{correct ? 'Exactly right.' : 'Use the clue in the situation.'}</strong><p>{correct ? `“${word.word}” means ${word.definition}.` : `The answer is “${word.word}”: ${word.definition}.`}</p></div></div><Button onClick={handleNext} size="sm" variant={correct ? 'primary' : 'secondary'} iconRight="arrowRight">{correct ? 'Next context' : 'Try next'}</Button></div>}
      </section>
      <section className="review-principle"><Icon name="layers" size={20} /><p><strong>Why context first?</strong> It teaches you not only what a word means, but when it sounds right.</p></section>
    </div>
  );
}

function CoachScreen({ state, session, client, apiConfigured, onOpenAccount }) {
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [serviceError, setServiceError] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEnd = useRef(null);
  const authenticated = Boolean(session?.session?.accessToken);
  const canUseCoach = Boolean(authenticated && client);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: state.reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  }, [messages.length, state.reduceMotion]);

  const send = async (message = input) => {
    const trimmed = message.trim();
    if (!trimmed || !canUseCoach || sending) return;
    setServiceError(null);
    setMessages((current) => [...current, { role: 'learner', text: trimmed }]);
    setInput('');
    setSending(true);
    try {
      const result = await client.sendCoachMessage({ conversationId, message: trimmed });
      setConversationId(result.conversationId);
      setMessages((current) => [...current, { role: 'coach', text: result.assistantMessage.content }]);
    } catch (error) {
      const messageText = error instanceof PlatformApiError ? `${error.code}: ${error.message}` : 'The secure tutor could not complete this request.';
      setServiceError(messageText);
    } finally {
      setSending(false);
    }
  };

  const connectionCopy = !apiConfigured
    ? { title: 'No production service is configured in this build.', detail: 'Set a public API origin at build or runtime. Lexora will not simulate tutor feedback.' }
    : !authenticated
      ? { title: 'Sign in to use the secure tutor.', detail: 'A real Lexora account and short-lived server session are required before a message can reach the AI gateway.' }
      : null;

  return (
    <div className="screen-content coach-screen">
      <div className="coach-hero"><div className="coach-mark"><Icon name="coach" size={23} /></div><div><p className="eyebrow">SECURE AI TUTOR</p><h1>Find the word through the thought.</h1><p>English-to-English chat and writing feedback pass through Lexora’s moderated server gateway.</p></div></div>
      <div className="coach-workspace">
        <aside className="coach-sidebar">
          <div className="coach-sidebar-title"><span>GUIDE PRINCIPLES</span><Icon name="spark" size={17} /></div>
          <div className="principle-list"><div><span>01</span><p>Start from a situation.</p></div><div><span>02</span><p>Name the contrast.</p></div><div><span>03</span><p>Make one precise sentence.</p></div></div>
          <div className="coach-status"><Icon name="lock" size={17} /><span>Moderated server route</span></div>
        </aside>
        <section className="chat-panel">
          <div className="chat-panel-head"><div><strong>Lexora Tutor</strong><span><i className={canUseCoach ? 'online' : ''} /> {canUseCoach ? 'Authenticated session ready' : 'Connection required'}</span></div><button className="icon-button" aria-label="Coach information"><Icon name="info" size={19} /></button></div>
          {connectionCopy ? (
            <div className="coach-connection-panel"><div className="coach-connection-icon"><Icon name={apiConfigured ? 'lock' : 'cloud'} size={22} /></div><div><strong>{connectionCopy.title}</strong><p>{connectionCopy.detail}</p>{apiConfigured && <Button size="sm" onClick={onOpenAccount} iconRight="arrowRight">Open account</Button>}</div></div>
          ) : (
            <>
              <div className="message-list">
                {messages.length === 0 && <div className="coach-empty-state"><Icon name="spark" size={20} /><strong>Begin with a real situation.</strong><p>Describe the sentence you want to write or the distinction you want to make.</p></div>}
                {messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}><div className="message-avatar">{message.role === 'coach' ? <Icon name="spark" size={16} /> : <Icon name="user" size={16} />}</div><div className="message-bubble">{message.text}</div></div>)}
                <div ref={messagesEnd} />
              </div>
              {serviceError && <div className="coach-service-error"><Icon name="info" size={17} /><span>{serviceError}</span></div>}
              <div className="suggestion-row"><button onClick={() => setInput('Help me make this work sentence clearer.')}>Improve a work sentence</button><button onClick={() => setInput('Help me understand the nuance between two words.')}>Compare two words</button><button onClick={() => setInput('Ask me a question before you explain this word.')}>Use a Socratic prompt</button></div>
              <form className="chat-compose" onSubmit={(event) => { event.preventDefault(); send(); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Describe the idea you want to express" /><button aria-label="Send to tutor" disabled={!input.trim() || sending}>{sending ? <Icon name="clock" size={18} /> : <Icon name="arrowRight" size={19} />}</button></form>
            </>
          )}
        </section>
      </div>
      <div className="coach-note"><Icon name="cloud" size={18} /><p><strong>No simulated replies.</strong> A response appears only after the configured, moderated gateway returns it. Conversation retention follows the configured server policy; connected platform clients can use export and deletion-request endpoints.</p></div>
    </div>
  );
}

function ToggleRow({ label, detail, active, onToggle, icon }) {
  return <div className="toggle-row"><div className="toggle-detail">{icon && <span className="setting-icon"><Icon name={icon} size={19} /></span>}<div><strong>{label}</strong>{detail && <span>{detail}</span>}</div></div><button onClick={onToggle} className={`switch ${active ? 'on' : ''}`} aria-pressed={active} aria-label={`${active ? 'Disable' : 'Enable'} ${label}`}><span /></button></div>;
}

function AccountAccess({ client, apiConfigured, session, onSessionChange, suggestedName }) {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ displayName: suggestedName || '', email: '', password: '', ageBand: 'adult' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const authenticated = Boolean(session?.session?.accessToken);

  const submit = async (event) => {
    event.preventDefault();
    if (!client || busy) return;
    setError('');
    setBusy(true);
    try {
      const result = mode === 'create'
        ? await client.register({ email: form.email, password: form.password, displayName: form.displayName, ageBand: form.ageBand })
        : await client.login({ email: form.email, password: form.password });
      onSessionChange(result);
    } catch (requestError) {
      setError(requestError instanceof PlatformApiError ? `${requestError.code}: ${requestError.message}` : 'The account service could not complete this request.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setError('');
    try {
      await client?.logout(session?.session?.refreshToken);
    } catch (requestError) {
      // The in-memory client session should still be cleared when a network logout cannot complete.
      setError(requestError instanceof PlatformApiError ? `${requestError.code}: ${requestError.message}` : 'The server could not confirm sign-out.');
    } finally {
      onSessionChange(null);
      setBusy(false);
    }
  };

  if (!apiConfigured || !client) {
    return <section className="account-card account-unavailable"><div className="account-icon"><Icon name="cloud" size={21} /></div><div><p className="eyebrow">ACCOUNT CONNECTION</p><h3>Service connection is not configured.</h3><p>This production build needs a public Lexora API origin before account, sync, and tutor features can be enabled. No local account is fabricated.</p></div></section>;
  }

  if (authenticated) {
    return <section className="account-card account-connected"><div className="account-icon"><Icon name="checkCircle" size={21} /></div><div className="account-copy"><p className="eyebrow">ACCOUNT CONNECTION</p><h3>{session.user?.displayName || session.user?.email || 'Lexora account'}</h3><p>{session.user?.email} · {session.user?.role || 'learner'} access</p><small>Access and refresh tokens are held only in memory in this reference client; use native secure storage before a public mobile release.</small>{error && <span className="account-error">{error}</span>}</div><Button size="sm" variant="secondary" onClick={signOut} disabled={busy}>Sign out</Button></section>;
  }

  return (
    <section className="account-card account-form-card">
      <div className="account-form-intro"><div className="account-icon"><Icon name="lock" size={21} /></div><div><p className="eyebrow">ACCOUNT CONNECTION</p><h3>{mode === 'create' ? 'Create a pilot account' : 'Sign in to Lexora'}</h3><p>{mode === 'create' ? 'For verified 13+ pilot learners. Your password is sent only to the configured Lexora API; production deployments must use HTTPS.' : 'Use your real Lexora account to connect learning records and the secure tutor.'}</p></div></div>
      <div className="account-mode-tabs" role="tablist" aria-label="Account action"><button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); }} role="tab" aria-selected={mode === 'signin'}>Sign in</button><button className={mode === 'create' ? 'active' : ''} onClick={() => { setMode('create'); setError(''); }} role="tab" aria-selected={mode === 'create'}>Create account</button></div>
      <form className="account-form" onSubmit={submit}>
        {mode === 'create' && <label><span>Name</span><input value={form.displayName} onChange={updateField('displayName')} autoComplete="name" maxLength="80" placeholder="How should Lexora address you?" /></label>}
        <label><span>Email</span><input type="email" value={form.email} onChange={updateField('email')} autoComplete="email" required placeholder="you@example.com" /></label>
        <label><span>Password</span><input type="password" value={form.password} onChange={updateField('password')} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} minLength="12" required placeholder={mode === 'create' ? 'At least 12 characters' : 'Your password'} /></label>
        {mode === 'create' && <label><span>Age group</span><select value={form.ageBand} onChange={updateField('ageBand')}><option value="teen">13–17</option><option value="adult">18 or older</option></select><small>Under-13 accounts are unavailable until verified parental consent and child-safety controls are approved.</small></label>}
        {error && <div className="account-error"><Icon name="info" size={16} /><span>{error}</span></div>}
        <Button type="submit" size="sm" disabled={busy} iconRight="arrowRight">{busy ? 'Working…' : mode === 'create' ? 'Create secure account' : 'Sign in securely'}</Button>
      </form>
    </section>
  );
}

function YouScreen({ state, updateState, onToggleTheme, session, client, apiConfigured, onSessionChange }) {
  const savedWords = state.savedIds.map(getWord);
  const accountName = session?.user?.displayName || session?.user?.email || state.name || 'Guest learner';
  return (
    <div className="screen-content you-screen">
      <div className="profile-head"><div className="profile-avatar"><span>{accountName.charAt(0).toUpperCase()}</span></div><div><p className="eyebrow">YOUR SPACE</p><h1>{accountName}</h1><p>{session ? 'Your Lexora account is connected for this session.' : 'Building a more precise English, one context at a time.'}</p></div><button className="icon-button profile-settings" aria-label="Profile settings"><Icon name="settings" size={21} /></button></div>
      <AccountAccess client={client} apiConfigured={apiConfigured} session={session} onSessionChange={onSessionChange} suggestedName={state.name} />
      <section className="profile-stats"><div><strong>{state.totalWords}</strong><span>words explored</span></div><div><strong>{state.streak}</strong><span>day rhythm</span></div><div><strong>{state.xp.toLocaleString()}</strong><span>experience</span></div></section>
      <section className="profile-section"><SectionHeader eyebrow="YOUR LEARNING SHAPE" title="The path is adapting" /><div className="adapt-card"><div className="adapt-level"><span>Current level</span><strong>{state.level}</strong><small>{state.level === 'B2' ? 'Independent' : state.level === 'B1' ? 'Developing' : 'Foundation'}</small></div><div><div className="adapt-title"><strong>Context confidence</strong><span>68%</span></div><div className="thin-progress"><span style={{ width: '68%' }} /></div><p>Keep choosing words inside complete ideas to strengthen your recall.</p></div><button className="text-button">View learning insight <Icon name="arrowRight" size={16} /></button></div></section>
      <section className="profile-section"><SectionHeader eyebrow="SAVED FOR LATER" title="Your word shelf" action={<span className="count-label">{savedWords.length} saved</span>} /><div className="saved-words">{savedWords.map((word) => <div key={word.id}><span className="saved-word-initial">{word.word.charAt(0)}</span><div><strong>{word.word}</strong><small>{word.definition}</small></div><Icon name="chevronRight" size={18} /></div>)}</div></section>
      <section className="profile-section"><SectionHeader eyebrow="PREFERENCES" title="Designed around you" /><div className="settings-card"><ToggleRow icon={state.theme === 'dark' ? 'moon' : 'sun'} label={`${state.theme === 'dark' ? 'Charcoal' : 'Paper'} theme`} detail={state.theme === 'dark' ? 'Dark with lime signals' : 'Light with cobalt signals'} active={state.theme === 'dark'} onToggle={onToggleTheme} /><ToggleRow icon="layers" label="Large text" detail="Add more room to read and think" active={state.largeText} onToggle={() => updateState((current) => ({ ...current, largeText: !current.largeText }))} /><ToggleRow icon="spark" label="Reduce motion" detail="Keep visual movement subtle" active={state.reduceMotion} onToggle={() => updateState((current) => ({ ...current, reduceMotion: !current.reduceMotion }))} /></div></section>
      <section className="sync-card"><div className="sync-icon"><Icon name="cloud" size={21} /></div><div><p className="eyebrow">LEARNING RECORDS</p><h3>Use an account for server-backed learning.</h3><p>Local practice in this reference client stays on this device. Account review history and tutor conversations are stored by the configured Lexora platform.</p></div></section>
    </div>
  );
}

function WordSheet({ word, isSaved, onClose, onToggleSave }) {
  if (!word) return null;
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="word-sheet" role="dialog" aria-modal="true" aria-labelledby="word-sheet-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sheet-grabber" />
        <header className="sheet-header"><div className="word-meta"><Pill tone="outline">{word.level}</Pill><span>{word.domain}</span></div><button className="icon-button" aria-label="Close word details" onClick={onClose}><Icon name="close" size={20} /></button></header>
        <div className="sheet-word-title"><div><h2 id="word-sheet-title">{word.word}</h2><p>{word.phonetic} <span>·</span> {word.part}</p></div><button className="listen-button" onClick={() => playWord(word)}><Icon name="sound" size={20} /><span>Listen</span></button></div>
        <div className="definition-panel"><span>DEFINITION</span><p>{word.definition}</p></div>
        <div className="example-panel"><span>IN CONTEXT</span><blockquote>“{word.example}”</blockquote></div>
        <div className="word-detail-grid"><div><span>COLLOCATIONS</span>{word.collocations.map((item) => <p key={item}>{item}</p>)}</div><div><span>WORD FAMILY</span>{word.family.map((item) => <p key={item}>{item}</p>)}</div></div>
        <div className="sheet-actions"><Button variant="secondary" onClick={() => onToggleSave(word.id)} icon={isSaved ? 'bookmarkFilled' : 'bookmark'}>{isSaved ? 'Saved to shelf' : 'Save word'}</Button><Button onClick={onClose} iconRight="arrowRight">Use in review</Button></div>
      </section>
    </div>
  );
}

const navItems = [
  { id: 'today', label: 'Today', icon: 'home' },
  { id: 'learn', label: 'Learn', icon: 'learn' },
  { id: 'review', label: 'Review', icon: 'review' },
  { id: 'coach', label: 'Coach', icon: 'coach' },
  { id: 'you', label: 'You', icon: 'user' },
];

function BottomNav({ tab, setTab, dueCount }) {
  return <nav className="bottom-nav" aria-label="Main navigation">{navItems.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={tab === item.id ? 'active' : ''} aria-current={tab === item.id ? 'page' : undefined}><span className="nav-icon"><Icon name={item.icon} size={21} />{item.id === 'review' && dueCount > 0 && <i />}</span><span>{item.label}</span></button>)}</nav>;
}

export default function App() {
  const [state, setState] = useState(readState);
  const [tab, setTab] = useState('today');
  const [selectedWord, setSelectedWord] = useState(null);
  const [platformSession, setPlatformSession] = useState(null);
  const apiBaseUrl = resolvePlatformApiBaseUrl();
  const platformClient = useMemo(() => {
    if (!apiBaseUrl) return null;
    try {
      return createPlatformClient({
        baseUrl: apiBaseUrl,
        getAccessToken: () => platformSession?.session?.accessToken || null,
        onUnauthorized: () => setPlatformSession(null),
      });
    } catch {
      return null;
    }
  }, [apiBaseUrl, platformSession?.session?.accessToken]);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* local persistence is optional */ }
  }, [state]);

  useEffect(() => {
    syncNativeTheme(state.theme);
  }, [state.theme]);

  const updateState = (updater) => setState((current) => typeof updater === 'function' ? updater(current) : { ...current, ...updater });
  const toggleTheme = () => updateState((current) => ({ ...current, theme: current.theme === 'light' ? 'dark' : 'light' }));
  const toggleSave = (id) => updateState((current) => ({ ...current, savedIds: current.savedIds.includes(id) ? current.savedIds.filter((wordId) => wordId !== id) : [...current.savedIds, id] }));
  const finishOnboarding = (values) => updateState((current) => ({ ...current, ...values, onboarded: true }));

  const screen = useMemo(() => {
    const props = {
      state,
      setTab,
      onOpenWord: setSelectedWord,
      onToggleSave: toggleSave,
      updateState,
      session: platformSession,
      client: platformClient,
      apiConfigured: Boolean(apiBaseUrl),
    };
    if (tab === 'learn') return <LearnScreen {...props} />;
    if (tab === 'review') return <ReviewScreen {...props} />;
    if (tab === 'coach') return <CoachScreen {...props} onOpenAccount={() => setTab('you')} />;
    if (tab === 'you') return <YouScreen {...props} onToggleTheme={toggleTheme} onSessionChange={setPlatformSession} />;
    return <TodayScreen {...props} />;
  }, [state, tab, platformSession, platformClient, apiBaseUrl]);

  if (!state.onboarded) {
    return <div className={`app-root theme-${state.theme} ${state.largeText ? 'large-text' : ''} ${state.reduceMotion ? 'reduce-motion' : ''}`}><Onboarding onComplete={finishOnboarding} theme={state.theme} onToggleTheme={toggleTheme} /></div>;
  }

  return (
    <div className={`app-root theme-${state.theme} ${state.largeText ? 'large-text' : ''} ${state.reduceMotion ? 'reduce-motion' : ''}`}>
      <div className="app-shell">
        <Header state={state} onToggleTheme={toggleTheme} />
        <main className="app-main">{screen}</main>
        <BottomNav tab={tab} setTab={setTab} dueCount={state.reviewQueue.length} />
      </div>
      <WordSheet word={selectedWord} isSaved={selectedWord && state.savedIds.includes(selectedWord.id)} onClose={() => setSelectedWord(null)} onToggleSave={toggleSave} />
    </div>
  );
}
