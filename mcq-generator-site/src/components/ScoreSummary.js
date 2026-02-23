'use client';

export default function ScoreSummary({ questions, answers }) {
  const total = questions.length;
  const correct = questions.filter((q, i) => answers[i] === q.correct_answer).length;
  const pct = Math.round((correct / total) * 100);
  const barColor = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

  const missed = [...new Set(
    questions
      .filter((q, i) => answers[i] !== q.correct_answer)
      .map((q) => `${q.lecture}: ${q.mapped_lo}`)
  )];

  return (
    <div className="rounded-xl bg-white border-2 border-gray-200 p-6 mb-6 animate-fade-in">
      <div className="text-center mb-5">
        <p className="text-5xl font-extrabold text-gray-900 font-serif">{pct}%</p>
        <p className="text-base text-gray-500 mt-1">{correct} of {total} correct</p>
        <div className="mt-3 h-2 rounded-full bg-gray-100 max-w-[300px] mx-auto">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ background: barColor, width: `${pct}%` }}
          />
        </div>
      </div>

      {missed.length > 0 && (
        <div>
          <p className="text-sm font-bold text-gray-700 mb-2">Learning objectives to review:</p>
          <div className="flex flex-col gap-1.5">
            {missed.map((lo, i) => (
              <div
                key={i}
                className="text-[13px] text-gray-600 px-3 py-2 rounded-md bg-red-50"
                style={{ border: '1px solid #fecdd3' }}
              >
                {lo}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
