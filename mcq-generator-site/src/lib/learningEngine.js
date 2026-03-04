/**
 * Learning Analytics Engine
 * Tracks question performance, identifies weak areas, manages spaced repetition.
 * All data in localStorage, keyed by student name.
 */

const STORAGE_KEY = 'mcq-learning-data';

// Spaced repetition intervals (in hours)
const SR_INTERVALS = [0, 24, 72, 168, 336]; // immediate, 1d, 3d, 7d, 14d

function getStorageKey(studentName) {
  return `${STORAGE_KEY}-${(studentName || 'default').toLowerCase().trim()}`;
}

export function loadLearningData(studentName) {
  if (typeof window === 'undefined') return getDefaultData();
  try {
    const raw = localStorage.getItem(getStorageKey(studentName));
    if (!raw) return getDefaultData();
    const data = JSON.parse(raw);
    // Migrate if needed
    if (!data.version || data.version < 2) {
      return { ...getDefaultData(), ...data, version: 2 };
    }
    return data;
  } catch {
    return getDefaultData();
  }
}

export function saveLearningData(studentName, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(studentName), JSON.stringify({ ...data, version: 2 }));
  } catch {}
}

function getDefaultData() {
  return {
    version: 2,
    // Per-LO tracking: { [loKey]: { lecture, lo, correct, incorrect, lastSeen, srLevel, srNextReview } }
    loStats: {},
    // Session history: [{ date, totalCorrect, totalIncorrect, losReviewed }]
    sessions: [],
    // Settings
    settings: {
      dashboardEnabled: true,
      spacedRepEnabled: true,
    },
  };
}

/**
 * Record results from a completed question set
 */
export function recordSession(data, questions, answers) {
  const now = Date.now();
  let sessionCorrect = 0;
  let sessionIncorrect = 0;
  const losReviewed = [];

  questions.forEach((q, i) => {
    const isCorrect = answers[i] === q.correct_answer;
    const loKey = makeLoKey(q);

    if (isCorrect) sessionCorrect++;
    else sessionIncorrect++;

    losReviewed.push(loKey);

    // Update LO stats
    if (!data.loStats[loKey]) {
      data.loStats[loKey] = {
        lecture: q.lecture || 'Unknown',
        lo: q.mapped_lo || loKey,
        correct: 0,
        incorrect: 0,
        lastSeen: now,
        srLevel: 0,
        srNextReview: now,
      };
    }

    const stat = data.loStats[loKey];
    stat.lastSeen = now;

    if (isCorrect) {
      stat.correct++;
      // Advance SR level (max out at last interval)
      stat.srLevel = Math.min(stat.srLevel + 1, SR_INTERVALS.length - 1);
      stat.srNextReview = now + SR_INTERVALS[stat.srLevel] * 60 * 60 * 1000;
    } else {
      stat.incorrect++;
      // Reset SR level to 0 (review soon)
      stat.srLevel = 0;
      stat.srNextReview = now + SR_INTERVALS[0] * 60 * 60 * 1000;
    }
  });

  // Record session
  data.sessions.push({
    date: new Date(now).toISOString(),
    totalCorrect: sessionCorrect,
    totalIncorrect: sessionIncorrect,
    losReviewed,
  });

  // Keep last 50 sessions
  if (data.sessions.length > 50) {
    data.sessions = data.sessions.slice(-50);
  }

  return data;
}

/**
 * Get weak areas sorted by weakness (lowest accuracy first)
 */
export function getWeakAreas(data) {
  const entries = Object.values(data.loStats)
    .filter((s) => s.correct + s.incorrect >= 1) // at least 1 attempt
    .map((s) => ({
      ...s,
      total: s.correct + s.incorrect,
      accuracy: Math.round((s.correct / (s.correct + s.incorrect)) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  return entries;
}

/**
 * Get LOs that are due for spaced repetition review
 */
export function getDueReviewLOs(data) {
  const now = Date.now();
  return Object.values(data.loStats)
    .filter((s) => {
      // Must have been answered incorrectly at least once
      if (s.incorrect === 0) return false;
      // Must be due for review
      return s.srNextReview <= now;
    })
    .sort((a, b) => a.srNextReview - b.srNextReview)
    .slice(0, 10); // Cap at 10 review items
}

/**
 * Build a review prompt from due LOs.
 * Returns { reviewPrompt, reviewCount } so the caller can adjust new question count.
 */
export function buildReviewPrompt(dueLOs, totalRequested) {
  if (!dueLOs.length) return { reviewPrompt: '', reviewCount: 0 };

  // Cap review questions: at most half the total, at most the number of due LOs
  const reviewCount = Math.min(dueLOs.length, Math.ceil(totalRequested / 2));

  const reviewPrompt = `

=== MANDATORY REVIEW QUESTIONS ===
You MUST generate exactly ${reviewCount} question(s) from the following previously-missed learning objectives BEFORE generating questions from the new content below. These review questions are required regardless of what new content is provided. Use the lecture name and LO text provided here as your source material for these questions. Mark each review question with "is_review": true in the JSON output.

REVIEW LOs:
${dueLOs.slice(0, reviewCount).map((lo, i) => `${i + 1}. [Lecture: ${lo.lecture}] ${lo.lo}`).join('\n')}

=== NEW CONTENT QUESTIONS ===
Generate the remaining ${totalRequested - reviewCount} question(s) from the new content below. Mark these with "is_review": false.
`;

  return { reviewPrompt, reviewCount };
}

/**
 * Get summary stats for the dashboard
 */
export function getDashboardStats(data) {
  const allLOs = Object.values(data.loStats);
  const totalQuestions = allLOs.reduce((sum, s) => sum + s.correct + s.incorrect, 0);
  const totalCorrect = allLOs.reduce((sum, s) => sum + s.correct, 0);
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const byLecture = {};
  allLOs.forEach((s) => {
    if (!byLecture[s.lecture]) {
      byLecture[s.lecture] = { lecture: s.lecture, correct: 0, incorrect: 0, los: [] };
    }
    byLecture[s.lecture].correct += s.correct;
    byLecture[s.lecture].incorrect += s.incorrect;
    byLecture[s.lecture].los.push(s);
  });

  const lectureStats = Object.values(byLecture)
    .map((l) => ({
      ...l,
      total: l.correct + l.incorrect,
      accuracy: Math.round((l.correct / (l.correct + l.incorrect)) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  return {
    totalQuestions,
    totalCorrect,
    overallAccuracy,
    totalLOs: allLOs.length,
    lectureStats,
    sessionCount: data.sessions.length,
  };
}

function makeLoKey(q) {
  // Create a stable key from lecture + LO text
  const lecture = (q.lecture || '').trim().toLowerCase();
  const lo = (q.mapped_lo || '').trim().toLowerCase().substring(0, 100);
  return `${lecture}::${lo}`;
}

/**
 * Reset spaced repetition only - clears SR levels and review schedules
 * but keeps all performance stats and session history intact.
 */
export function resetSpacedRepetition(data) {
  const now = Date.now();
  const updated = { ...data, loStats: { ...data.loStats } };
  Object.keys(updated.loStats).forEach((key) => {
    updated.loStats[key] = {
      ...updated.loStats[key],
      srLevel: 0,
      srNextReview: now + 999999 * 60 * 60 * 1000, // far future = won't trigger
      incorrect: 0, // reset incorrect count so they don't immediately re-queue
    };
  });
  return updated;
}

/**
 * Reset all learning data - returns a clean slate.
 */
export function resetAllData() {
  return {
    version: 2,
    loStats: {},
    sessions: [],
    settings: {
      dashboardEnabled: true,
      spacedRepEnabled: true,
    },
  };
}
