'use client';

import { useState, useMemo } from 'react';
import { Icons } from './Icons';

export default function WeakAreasDashboard({ learningData, onToggleDashboard, onToggleSR, dueLOs, onResetSR, onResetAll }) {
  const [expandedLecture, setExpandedLecture] = useState(null);
  const [confirmReset, setConfirmReset] = useState(null); // 'sr' or 'all'
  const { settings } = learningData;

  const stats = useMemo(() => {
    const allLOs = Object.values(learningData.loStats);
    const totalQ = allLOs.reduce((s, l) => s + l.correct + l.incorrect, 0);
    const totalC = allLOs.reduce((s, l) => s + l.correct, 0);

    const byLecture = {};
    allLOs.forEach((lo) => {
      if (!byLecture[lo.lecture]) byLecture[lo.lecture] = { lecture: lo.lecture, correct: 0, incorrect: 0, los: [] };
      byLecture[lo.lecture].correct += lo.correct;
      byLecture[lo.lecture].incorrect += lo.incorrect;
      byLecture[lo.lecture].los.push(lo);
    });

    const lectures = Object.values(byLecture)
      .map((l) => ({ ...l, total: l.correct + l.incorrect, accuracy: Math.round((l.correct / (l.correct + l.incorrect)) * 100) }))
      .sort((a, b) => a.accuracy - b.accuracy);

    const weakLOs = allLOs
      .filter((l) => l.correct + l.incorrect >= 2)
      .map((l) => ({ ...l, total: l.correct + l.incorrect, accuracy: Math.round((l.correct / (l.correct + l.incorrect)) * 100) }))
      .filter((l) => l.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 8);

    return {
      totalQ, totalC,
      accuracy: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0,
      totalLOs: allLOs.length,
      lectures, weakLOs,
      sessions: learningData.sessions.length,
    };
  }, [learningData]);

  if (stats.totalQ === 0) return null;

  const accuracyColor = (pct) => pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="rounded-2xl overflow-hidden mb-7 animate-fade-in" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="p-5 sm:p-6">
        {/* Header with toggles */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Icons.Book size={18} />
            <h3 className="text-base font-bold text-white">Your Learning Dashboard</h3>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] text-gray-400 font-semibold">Dashboard</span>
              <button
                onClick={onToggleDashboard}
                className="relative w-9 h-5 rounded-full transition-colors"
                style={{ background: settings.dashboardEnabled ? '#059669' : '#374151' }}
              >
                <span className="absolute top-0.5 transition-all w-4 h-4 rounded-full bg-white shadow" style={{ left: settings.dashboardEnabled ? '18px' : '2px' }} />
              </button>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] text-gray-400 font-semibold">Spaced Rep</span>
              <button
                onClick={onToggleSR}
                className="relative w-9 h-5 rounded-full transition-colors"
                style={{ background: settings.spacedRepEnabled ? '#3b82f6' : '#374151' }}
              >
                <span className="absolute top-0.5 transition-all w-4 h-4 rounded-full bg-white shadow" style={{ left: settings.spacedRepEnabled ? '18px' : '2px' }} />
              </button>
            </label>
          </div>
        </div>

        {settings.dashboardEnabled && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Questions', value: stats.totalQ, color: '#d1d5db' },
                { label: 'Accuracy', value: `${stats.accuracy}%`, color: accuracyColor(stats.accuracy) },
                { label: 'LOs Seen', value: stats.totalLOs, color: '#d1d5db' },
                { label: 'Sessions', value: stats.sessions, color: '#d1d5db' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-xl font-extrabold" style={{ color }}>{value}</p>
                  <p className="text-[11px] text-gray-500 font-semibold mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Spaced rep banner */}
            {settings.spacedRepEnabled && dueLOs.length > 0 && (
              <div className="mb-5 p-3.5 rounded-lg flex items-center gap-3" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <Icons.Clock size={16} />
                <div>
                  <p className="text-[13px] font-bold text-blue-300">
                    {dueLOs.length} LO{dueLOs.length > 1 ? 's' : ''} due for review
                  </p>
                  <p className="text-[11px] text-blue-400/70 mt-0.5">
                    These will be included in your next generation when spaced repetition is on.
                  </p>
                </div>
              </div>
            )}

            {/* Weak LOs */}
            {stats.weakLOs.length > 0 && (
              <div className="mb-5">
                <p className="text-[13px] font-bold text-red-400 mb-2.5">Weakest Learning Objectives</p>
                <div className="flex flex-col gap-1.5">
                  {stats.weakLOs.map((lo, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-gray-300 truncate">{lo.lo}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{lo.lecture} · {lo.correct}/{lo.total} correct</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-gray-700">
                          <div className="h-full rounded-full" style={{ width: `${lo.accuracy}%`, background: accuracyColor(lo.accuracy) }} />
                        </div>
                        <span className="text-[12px] font-bold w-8 text-right" style={{ color: accuracyColor(lo.accuracy) }}>{lo.accuracy}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By lecture */}
            {stats.lectures.length > 0 && (
              <div>
                <p className="text-[13px] font-bold text-gray-300 mb-2.5">Performance by Lecture</p>
                <div className="flex flex-col gap-1.5">
                  {stats.lectures.map((lec) => (
                    <div key={lec.lecture}>
                      <button
                        onClick={() => setExpandedLecture(expandedLecture === lec.lecture ? null : lec.lecture)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-200 font-semibold truncate">{lec.lecture}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{lec.total} questions · {lec.los.length} LOs</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-20 h-1.5 rounded-full bg-gray-700">
                            <div className="h-full rounded-full transition-all" style={{ width: `${lec.accuracy}%`, background: accuracyColor(lec.accuracy) }} />
                          </div>
                          <span className="text-[13px] font-bold w-10 text-right" style={{ color: accuracyColor(lec.accuracy) }}>{lec.accuracy}%</span>
                          <span style={{ transform: expandedLecture === lec.lecture ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', color: '#6b7280' }}>
                            <Icons.ChevronDown size={12} />
                          </span>
                        </div>
                      </button>

                      {expandedLecture === lec.lecture && (
                        <div className="ml-4 mt-1 flex flex-col gap-1 animate-fade-in">
                          {lec.los
                            .map((lo) => ({ ...lo, total: lo.correct + lo.incorrect, accuracy: lo.correct + lo.incorrect > 0 ? Math.round((lo.correct / (lo.correct + lo.incorrect)) * 100) : 0 }))
                            .sort((a, b) => a.accuracy - b.accuracy)
                            .map((lo, j) => (
                              <div key={j} className="flex items-center gap-2 p-2 rounded" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <p className="flex-1 text-[11px] text-gray-400 truncate">{lo.lo}</p>
                                <span className="text-[11px] text-gray-500">{lo.correct}/{lo.total}</span>
                                <span className="text-[11px] font-bold w-8 text-right" style={{ color: accuracyColor(lo.accuracy) }}>{lo.accuracy}%</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reset options */}
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {confirmReset ? (
                <div className="p-3.5 rounded-lg animate-fade-in" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <p className="text-[13px] font-bold text-red-400 mb-1">
                    {confirmReset === 'sr' ? 'Reset Spaced Repetition?' : 'Reset All Dashboard Data?'}
                  </p>
                  <p className="text-[11px] text-gray-400 mb-3">
                    {confirmReset === 'sr'
                      ? 'This will clear all review queues and schedules. Your dashboard stats and performance history will be kept.'
                      : 'This will clear all performance data, session history, and spaced repetition data. This cannot be undone.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { confirmReset === 'sr' ? onResetSR() : onResetAll(); setConfirmReset(null); }}
                      className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold"
                      style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}
                    >
                      {confirmReset === 'sr' ? 'Reset Spaced Repetition' : 'Reset Everything'}
                    </button>
                    <button
                      onClick={() => setConfirmReset(null)}
                      className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmReset('sr')}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280', cursor: 'pointer' }}
                  >
                    Reset Spaced Repetition
                  </button>
                  <button
                    onClick={() => setConfirmReset('all')}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280', cursor: 'pointer' }}
                  >
                    Reset All Data
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
