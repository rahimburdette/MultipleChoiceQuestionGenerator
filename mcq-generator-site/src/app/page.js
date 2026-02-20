'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Icons } from '@/components/Icons';
import QuestionCard from '@/components/QuestionCard';
import ScoreSummary from '@/components/ScoreSummary';
import OnboardingGuide from '@/components/OnboardingGuide';
import {
  SYSTEM_PROMPT, QUALITY_CHECK_PROMPT, DIFFICULTY_OPTIONS,
  buildGeneratePrompt, buildRegenPrompt, callClaude, parseQuestions,
} from '@/lib/prompts';

function formatTime(s) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

// ─── Local Storage Helpers ──────────────────────────────────
function loadFromStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

function saveToStorage(key, value) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── Main Page ──────────────────────────────────────────────
export default function Home() {
  // Input
  const [los, setLos] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('mixed');

  // Generation
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState('');

  // Interaction
  const [mode, setMode] = useState('study');
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState({});
  const [showExplanations, setShowExplanations] = useState({});
  const [examGraded, setExamGraded] = useState(false);

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef(null);

  // Question Bank
  const [savedSets, setSavedSets] = useState([]);
  const [showBank, setShowBank] = useState(false);

  // Flags
  const [flaggedQuestions, setFlaggedQuestions] = useState([]);

  // Regenerate
  const [regeneratingIdx, setRegeneratingIdx] = useState(null);

  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);

  // Load saved data
  useEffect(() => {
    setSavedSets(loadFromStorage('mcq-bank', []));
    setFlaggedQuestions(loadFromStorage('mcq-flags', []));
  }, []);

  // Timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  // ─── Handlers ─────────────────────────────────────────────

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setLos((p) => p ? p + '\n\n' + ev.target.result : ev.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const generateQuestions = useCallback(async () => {
    if (!los.trim()) { setError('Please paste or upload learning objectives first.'); return; }

    setLoading(true);
    setError('');
    setQuestions([]);
    setSelectedAnswers({});
    setShowResults({});
    setShowExplanations({});
    setExamGraded(false);
    setTimerSeconds(0);
    setTimerRunning(false);

    try {
      // Step 1: Generate
      setLoadingStage('Generating questions...');
      const genText = await callClaude([
        { role: 'user', content: buildGeneratePrompt(los, numQuestions, difficulty) },
      ]);
      let generated = parseQuestions(genText);

      // Step 2: Quality check
      setLoadingStage('Running quality review...');
      try {
        const checkText = await callClaude([
          { role: 'user', content: `Review and fix these questions:\n\n${JSON.stringify({ questions: generated })}` },
        ], 8000, QUALITY_CHECK_PROMPT);
        const checked = parseQuestions(checkText);
        if (checked.length === generated.length) {
          generated = checked;
        }
      } catch (qcErr) {
        // Quality check failed — use original questions
        console.warn('Quality check pass failed, using original:', qcErr);
      }

      setQuestions(generated);
      if (mode === 'exam') setTimerRunning(true);
      setLoadingStage('');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);

    } catch (err) {
      console.error(err);
      setError(
        err instanceof SyntaxError
          ? 'Failed to parse the AI response. Please try again.'
          : (err.message || 'Something went wrong. Please try again.')
      );
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  }, [los, numQuestions, difficulty, mode]);

  const handleSelectAnswer = useCallback((i, letter) => {
    setSelectedAnswers((p) => ({ ...p, [i]: letter }));
    if (mode === 'study') setShowResults((p) => ({ ...p, [i]: true }));
  }, [mode]);

  const gradeExam = useCallback(() => {
    setTimerRunning(false);
    setExamGraded(true);
    const r = {};
    questions.forEach((_, i) => { r[i] = true; });
    setShowResults(r);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [questions]);

  const toggleExplanation = useCallback((i) => {
    setShowExplanations((p) => ({ ...p, [i]: !p[i] }));
  }, []);

  const regenerateQuestion = useCallback(async (idx) => {
    setRegeneratingIdx(idx);
    try {
      const text = await callClaude([
        { role: 'user', content: buildRegenPrompt(questions[idx], los) },
      ], 2000);
      const newQ = parseQuestions(text);
      if (newQ[0]) {
        setQuestions((p) => { const n = [...p]; n[idx] = newQ[0]; return n; });
        setSelectedAnswers((p) => { const n = { ...p }; delete n[idx]; return n; });
        setShowResults((p) => { const n = { ...p }; delete n[idx]; return n; });
        setShowExplanations((p) => { const n = { ...p }; delete n[idx]; return n; });
      }
    } catch (e) { console.error('Regen failed:', e); }
    finally { setRegeneratingIdx(null); }
  }, [questions, los]);

  const handleFlag = useCallback((idx, reason, q) => {
    const flag = {
      date: new Date().toISOString(),
      reason,
      question: q.vignette?.substring(0, 80) + '...',
      lo: q.mapped_lo,
      lecture: q.lecture,
      order: q.order,
    };
    const updated = [...flaggedQuestions, flag];
    setFlaggedQuestions(updated);
    saveToStorage('mcq-flags', updated);
  }, [flaggedQuestions]);

  // Bank
  const saveToBank = useCallback(() => {
    const s = {
      id: Date.now().toString(),
      name: `${questions.length} Questions — ${new Date().toLocaleDateString()}`,
      date: new Date().toISOString(),
      questions,
      difficulty,
    };
    const updated = [s, ...savedSets];
    setSavedSets(updated);
    saveToStorage('mcq-bank', updated);
  }, [questions, difficulty, savedSets]);

  const loadFromBank = useCallback((set) => {
    setQuestions(set.questions);
    setSelectedAnswers({});
    setShowResults({});
    setShowExplanations({});
    setExamGraded(false);
    setTimerSeconds(0);
    setTimerRunning(false);
    setShowBank(false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
  }, []);

  const deleteFromBank = useCallback((id) => {
    const updated = savedSets.filter((s) => s.id !== id);
    setSavedSets(updated);
    saveToStorage('mcq-bank', updated);
  }, [savedSets]);

  const exportQuestions = useCallback(async () => {
    if (!questions.length) return;
    const { exportToDocx } = await import('@/lib/exportDocx');
    await exportToDocx(questions);
  }, [questions]);

  const allAnswered = questions.length > 0 && questions.every((_, i) => selectedAnswers[i] !== undefined);

  // ─── Render ─────────────────────────────────────────────
  return (
    <main
      className="min-h-screen"
      style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)' }}
    >
      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 max-w-[860px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
            NBME-Aligned · UpToDate Referenced
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white font-serif" style={{ letterSpacing: '-0.02em' }}>
            MCQ Generator
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto mt-2">
            Paste learning objectives. Get USMLE-style questions with per-distractor analysis.
          </p>

          {/* Bank button */}
          {savedSets.length > 0 && (
            <button
              onClick={() => setShowBank(!showBank)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db', cursor: 'pointer' }}
            >
              <Icons.Folder /> Question Bank ({savedSets.length})
            </button>
          )}
        </header>

        {/* Onboarding */}
        <OnboardingGuide />

        {/* Bank panel */}
        {showBank && (
          <div className="rounded-2xl p-5 mb-6 animate-fade-in" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="text-base font-bold text-white mb-3">Saved Question Sets</h3>
            <div className="flex flex-col gap-2">
              {savedSets.map((set) => (
                <div key={set.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <p className="text-sm font-semibold text-gray-200">{set.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{set.questions.length} questions · {new Date(set.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => loadFromBank(set)} className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold" style={{ border: 'none', cursor: 'pointer' }}>Load</button>
                    <button onClick={() => deleteFromBank(set.id)} className="px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center" style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}><Icons.Trash /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Panel */}
        <div className="rounded-2xl overflow-hidden mb-7" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="p-5 sm:p-6">
            <label className="block mb-2">
              <span className="text-[13px] font-bold text-gray-300 tracking-wide">Learning Objectives & Content</span>
            </label>
            <textarea
              value={los}
              onChange={(e) => setLos(e.target.value)}
              placeholder="Paste your learning objectives, lecture notes, or content here...&#10;&#10;Include lecture names for proper tagging."
              rows={8}
              className="w-full rounded-xl p-4 text-sm leading-relaxed resize-y outline-none transition-all text-gray-200"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />

            <div className="mt-2.5 flex items-center gap-3">
              <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] transition-colors" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer' }}>
                <Icons.Upload /> Upload .txt
              </button>
              <span className="text-xs text-gray-600">or paste directly above</span>
              <input ref={fileInputRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFileUpload} />
            </div>

            {/* Settings grid */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-bold text-gray-300 mb-2">Questions</label>
                <div className="flex gap-1.5">
                  {[5, 10, 15, 20].map((n) => (
                    <button key={n} onClick={() => setNumQuestions(n)}
                      className="flex-1 py-2 rounded-lg text-[13px] font-bold transition-all"
                      style={{ border: `1.5px solid ${numQuestions === n ? '#059669' : 'rgba(255,255,255,0.1)'}`, background: numQuestions === n ? '#059669' : 'rgba(255,255,255,0.04)', color: numQuestions === n ? '#fff' : '#9ca3af', cursor: 'pointer' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-300 mb-2">Difficulty</label>
                <div className="flex gap-1.5">
                  {Object.keys(DIFFICULTY_OPTIONS).map((k) => (
                    <button key={k} onClick={() => setDifficulty(k)}
                      className="flex-1 py-2 rounded-lg text-[13px] font-bold capitalize transition-all"
                      style={{ border: `1.5px solid ${difficulty === k ? '#059669' : 'rgba(255,255,255,0.1)'}`, background: difficulty === k ? '#059669' : 'rgba(255,255,255,0.04)', color: difficulty === k ? '#fff' : '#9ca3af', cursor: 'pointer' }}>
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mode */}
            <div className="mt-4">
              <label className="block text-[13px] font-bold text-gray-300 mb-2">Practice Mode</label>
              <div className="flex gap-1.5">
                {[
                  { key: 'study', label: 'Study Mode', desc: 'Instant feedback' },
                  { key: 'exam', label: 'Exam Mode', desc: 'Timed + grade at end' },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => setMode(key)}
                    className="flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all"
                    style={{ border: `1.5px solid ${mode === key ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`, background: mode === key ? '#1e3a5f' : 'rgba(255,255,255,0.04)', color: mode === key ? '#93c5fd' : '#9ca3af', cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate */}
            <button
              onClick={generateQuestions}
              disabled={loading}
              className="mt-5 w-full py-3.5 rounded-xl text-[15px] font-extrabold tracking-wide transition-all"
              style={{ border: 'none', cursor: loading ? 'wait' : 'pointer', background: loading ? '#374151' : '#059669', color: loading ? '#9ca3af' : '#fff' }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {loadingStage || 'Generating...'}
                </span>
              ) : (
                `Generate ${numQuestions} Questions`
              )}
            </button>

            {error && (
              <div className="mt-4 p-3.5 rounded-xl text-[13px]" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {questions.length > 0 && (
          <div ref={resultsRef}>
            {/* Exam timer bar */}
            {mode === 'exam' && !examGraded && (
              <div className="flex items-center justify-between p-3 px-5 rounded-xl mb-5 flex-wrap gap-2" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <div className="flex items-center gap-2 text-sm font-bold" style={{ color: '#93c5fd' }}>
                  <Icons.Clock /> {formatTime(timerSeconds)}
                </div>
                <span className="text-[13px]" style={{ color: '#93c5fd' }}>
                  {Object.keys(selectedAnswers).length} / {questions.length} answered
                </span>
                <button onClick={gradeExam} disabled={!allAnswered}
                  className="px-5 py-2 rounded-lg text-[13px] font-bold"
                  style={{ background: allAnswered ? '#3b82f6' : '#374151', color: allAnswered ? '#fff' : '#6b7280', border: 'none', cursor: allAnswered ? 'pointer' : 'not-allowed' }}>
                  Submit Exam
                </button>
              </div>
            )}

            {/* Score */}
            {mode === 'exam' && examGraded && (
              <ScoreSummary questions={questions} answers={selectedAnswers} />
            )}

            {/* Quality check badge */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {questions.length} Questions
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[13px] text-gray-500">
                    {questions.filter((q) => q.order === '1st').length} first ·{' '}
                    {questions.filter((q) => q.order === '2nd').length} second ·{' '}
                    {questions.filter((q) => q.order === '3rd').length} third order
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/30">
                    <Icons.Shield size={10} /> Quality Checked
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveToBank} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db', cursor: 'pointer' }}>
                  <Icons.Save /> Save
                </button>
                <button onClick={exportQuestions} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db', cursor: 'pointer' }}>
                  <Icons.Download /> Export
                </button>
              </div>
            </div>

            {/* Question cards */}
            <div className="flex flex-col gap-5">
              {questions.map((q, i) => (
                <QuestionCard
                  key={`${i}-${q.number}`}
                  q={q}
                  index={i}
                  mode={mode}
                  selectedAnswer={selectedAnswers[i]}
                  onSelectAnswer={handleSelectAnswer}
                  showResult={!!showResults[i]}
                  onToggleExplanation={toggleExplanation}
                  showExplanation={!!showExplanations[i]}
                  onRegenerate={!examGraded || mode === 'study' ? regenerateQuestion : null}
                  regenerating={regeneratingIdx === i}
                  onFlag={handleFlag}
                />
              ))}
            </div>

            {/* Exam submit at bottom */}
            {mode === 'exam' && !examGraded && (
              <div className="text-center mt-6">
                <button onClick={gradeExam} disabled={!allAnswered}
                  className="px-8 py-3 rounded-xl text-[15px] font-extrabold"
                  style={{ background: allAnswered ? '#3b82f6' : '#374151', color: allAnswered ? '#fff' : '#6b7280', border: 'none', cursor: allAnswered ? 'pointer' : 'not-allowed' }}>
                  {allAnswered ? 'Submit Exam' : `Answer all (${Object.keys(selectedAnswers).length}/${questions.length})`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-[11px] text-gray-600 pb-8">
          Built on NBME Item-Writing Principles · Clinical accuracy referenced to UpToDate · Powered by Claude
        </footer>
      </div>
    </main>
  );
}
