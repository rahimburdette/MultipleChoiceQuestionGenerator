'use client';

import { useState } from 'react';
import { Icons } from './Icons';

const ORDER_COLORS = {
  '1st': { bg: '#f0fdf4', border: '#bbf7d0', badge: '#059669', badgeBg: '#d1fae5' },
  '2nd': { bg: '#fffbeb', border: '#fde68a', badge: '#d97706', badgeBg: '#fef3c7' },
  '3rd': { bg: '#fff1f2', border: '#fecdd3', badge: '#e11d48', badgeBg: '#ffe4e6' },
};

const FLAG_REASONS = [
  'Stem gives away the answer',
  'Answer choices too long or uneven',
  'Medically inaccurate content',
  'Unclear or confusing vignette',
  'Other issue',
];

export default function QuestionCard({
  q, index, mode, selectedAnswer, onSelectAnswer,
  showResult, onToggleExplanation, showExplanation,
  onRegenerate, regenerating, onFlag,
}) {
  const [showFlagMenu, setShowFlagMenu] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const c = ORDER_COLORS[q.order] || ORDER_COLORS['1st'];
  const isCorrect = selectedAnswer === q.correct_answer;

  const handleFlag = (reason) => {
    setFlagged(true);
    setShowFlagMenu(false);
    if (onFlag) onFlag(index, reason, q);
  };

  return (
    <div
      className="animate-slide-up"
      style={{ borderRadius: 12, border: `2px solid ${c.border}`, background: c.bg, overflow: 'hidden', animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      <div style={{ padding: '20px 24px' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-full bg-gray-900 text-white text-[13px] font-bold">
              {index + 1}
            </span>
            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: c.badge, background: c.badgeBg }}>
              {q.order} Order
            </span>
            {q.image_description && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-indigo-600 bg-indigo-50">
                <Icons.Image /> Image
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Flag button */}
            <div className="relative">
              <button
                onClick={() => flagged ? null : setShowFlagMenu(!showFlagMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors"
                style={{
                  borderColor: flagged ? '#fbbf24' : '#d1d5db',
                  background: flagged ? '#fef3c7' : '#fff',
                  color: flagged ? '#92400e' : '#6b7280',
                  cursor: flagged ? 'default' : 'pointer',
                }}
              >
                <Icons.Flag /> {flagged ? 'Flagged' : 'Flag'}
              </button>
              {showFlagMenu && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-lg bg-white shadow-xl border border-gray-200 z-50 overflow-hidden animate-fade-in">
                  <p className="px-3 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide bg-gray-50">What's wrong?</p>
                  {FLAG_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => handleFlag(reason)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Regenerate */}
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(index)}
                disabled={regenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold transition-colors"
                style={{ color: regenerating ? '#9ca3af' : '#374151', cursor: regenerating ? 'wait' : 'pointer' }}
              >
                <Icons.Refresh /> {regenerating ? '...' : 'Regenerate'}
              </button>
            )}
          </div>
        </div>

        {/* LO + Lecture */}
        <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #e5e7eb' }}>
          <div className="flex gap-1.5 mb-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lecture:</span>
            <span className="text-xs text-gray-700 font-medium">{q.lecture || '—'}</span>
          </div>
          <div className="flex gap-1.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">LO:</span>
            <span className="text-xs text-gray-700">{q.mapped_lo}</span>
          </div>
        </div>

        {/* Image placeholder */}
        {q.image_description && (
          <div className="mb-4 p-4 rounded-lg bg-indigo-50 flex items-start gap-3" style={{ border: '1px dashed #a5b4fc' }}>
            <Icons.Image />
            <div>
              <p className="text-[11px] font-bold text-indigo-600 mb-1">Clinical Image</p>
              <p className="text-[13px] text-gray-700 leading-relaxed italic">{q.image_description}</p>
            </div>
          </div>
        )}

        {/* Vignette + Lead-in */}
        <p className="text-gray-800 leading-relaxed mb-3.5 text-[15px]">{q.vignette}</p>
        <p className="font-bold text-gray-900 mb-4 text-[15px]">{q.lead_in}</p>

        {/* Options */}
        <div className="flex flex-col gap-2 mb-4">
          {Object.entries(q.options).map(([letter, text]) => {
            const isKey = letter === q.correct_answer;
            const isSelected = selectedAnswer === letter;
            let borderColor = '#e5e7eb', bg = 'rgba(255,255,255,0.8)', ring = {};
            if (showResult) {
              if (isKey) { borderColor = '#22c55e'; bg = '#f0fdf4'; ring = { boxShadow: '0 0 0 2px #86efac' }; }
              else if (isSelected && !isKey) { borderColor = '#ef4444'; bg = '#fef2f2'; ring = { boxShadow: '0 0 0 2px #fca5a5' }; }
            } else if (isSelected) { borderColor = '#3b82f6'; bg = '#eff6ff'; ring = { boxShadow: '0 0 0 2px #93c5fd' }; }
            const clickable = mode === 'study' ? !showResult : selectedAnswer === undefined;

            return (
              <button
                key={letter}
                onClick={() => clickable && onSelectAnswer(index, letter)}
                disabled={!clickable}
                className="flex items-center gap-3 p-2.5 rounded-lg text-left transition-all"
                style={{ border: `1.5px solid ${borderColor}`, background: bg, cursor: clickable ? 'pointer' : 'default', ...ring }}
              >
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: showResult && isKey ? '#22c55e' : showResult && isSelected && !isKey ? '#ef4444' : isSelected ? '#3b82f6' : '#e5e7eb',
                    color: (showResult && (isKey || isSelected)) || isSelected ? '#fff' : '#4b5563',
                  }}
                >
                  {showResult && isKey ? <Icons.Check /> : showResult && isSelected && !isKey ? <Icons.X /> : letter}
                </span>
                <span className="text-[14px] text-gray-800">{text}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {showResult && (
          <>
            {mode === 'study' && (
              <div className="mb-3 px-3.5 py-2 rounded-lg" style={{ background: isCorrect ? '#f0fdf4' : '#fef2f2', border: `1px solid ${isCorrect ? '#bbf7d0' : '#fecdd3'}` }}>
                <span className="text-sm font-bold" style={{ color: isCorrect ? '#15803d' : '#be123c' }}>
                  {isCorrect ? '✓ Correct!' : `✗ Incorrect — the answer is ${q.correct_answer}`}
                </span>
              </div>
            )}
            <button
              onClick={() => onToggleExplanation(index)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-[13px] font-semibold"
              style={{ cursor: 'pointer', border: 'none' }}
            >
              <Icons.Book /> {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
            </button>
          </>
        )}

        {/* Explanation panel */}
        {showExplanation && showResult && (
          <div className="mt-3.5 p-4 rounded-lg bg-white animate-fade-in" style={{ border: '1px solid #e5e7eb' }}>
            <p className="text-[13px] font-bold text-emerald-600 mb-2">✓ {q.correct_answer}: Why it's correct</p>
            <p className="text-[13px] text-gray-700 leading-relaxed mb-4">{q.explanation}</p>

            {q.distractor_explanations && (
              <>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Why each distractor is wrong</p>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(q.distractor_explanations).map(([letter, text]) => (
                    <div key={letter} className="flex gap-2 text-[13px] text-gray-600 leading-relaxed">
                      <span className="font-bold text-gray-400 flex-shrink-0">{letter}.</span>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-3.5 px-3 py-2 rounded-lg bg-gray-50" style={{ border: '1px solid #f3f4f6' }}>
              <span className="text-[11px] font-semibold text-gray-400">REVIEW LO: </span>
              <span className="text-xs text-gray-500">{q.lecture} → {q.mapped_lo}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
