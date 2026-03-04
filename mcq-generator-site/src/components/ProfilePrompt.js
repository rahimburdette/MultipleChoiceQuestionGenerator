'use client';

import { useState } from 'react';

export default function ProfilePrompt({ onSetName }) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) onSetName(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm mx-4 rounded-2xl p-6 animate-fade-in" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 className="text-xl font-extrabold text-white mb-2">Welcome!</h2>
        <p className="text-sm text-gray-400 mb-5">
          Enter your name to track your progress across sessions. Your data stays on this device.
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Your name"
          autoFocus
          className="w-full rounded-lg px-4 py-3 text-sm text-gray-200 outline-none mb-4"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="w-full py-3 rounded-lg text-sm font-bold transition-all"
          style={{ background: name.trim() ? '#059669' : '#374151', color: name.trim() ? '#fff' : '#6b7280', border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed' }}
        >
          Get Started
        </button>
        <button
          onClick={() => onSetName('Student')}
          className="w-full mt-2 py-2 text-[12px] text-gray-500 hover:text-gray-400 transition-colors"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
