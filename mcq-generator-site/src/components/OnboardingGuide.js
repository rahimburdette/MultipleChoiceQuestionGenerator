'use client';

import { useState } from 'react';
import { Icons } from './Icons';

const tips = [
  {
    title: "What is this?",
    content: "This tool generates USMLE-style multiple-choice questions from your learning objectives. Every question follows NBME item-writing principles and is checked for common flaws like stem giveaways and uneven option lengths."
  },
  {
    title: "Question Orders",
    content: "1st order = identify a concept from a scenario. 2nd order = one reasoning step beyond identification (e.g., identify diagnosis → pick treatment). 3rd order = multi-step reasoning (e.g., identify infection → identify drug → identify mechanism). Higher orders test deeper understanding."
  },
  {
    title: "Study vs. Exam Mode",
    content: "Study Mode gives instant feedback after each answer — great for learning. Exam Mode hides all feedback, tracks your time, and scores you at the end — use this to simulate test conditions."
  },
  {
    title: "Tips for best results",
    content: "Paste detailed learning objectives with supporting content (not just bullet-point LO titles). The more context you give, the better the clinical vignettes. Include lecture names so questions get properly tagged."
  },
  {
    title: "Quality Check",
    content: "After generation, questions go through an automatic quality review pass that catches stem giveaways and option length violations. You can also flag individual questions if something looks off — your TA reviews flagged items."
  },
];

export default function OnboardingGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#93c5fd',
          cursor: 'pointer',
        }}
      >
        <Icons.Info size={16} />
        How to Use This Tool
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          <Icons.ChevronDown size={14} />
        </span>
      </button>

      {isOpen && (
        <div
          className="mt-3 rounded-xl overflow-hidden animate-fade-in"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="p-5 space-y-4">
            {tips.map((tip, i) => (
              <div key={i}>
                <h4 className="text-sm font-bold text-emerald-400 mb-1">{tip.title}</h4>
                <p className="text-sm text-gray-400 leading-relaxed">{tip.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
