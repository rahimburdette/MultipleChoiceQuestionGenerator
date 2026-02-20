# MCQ Generator — USMLE-Style Practice Questions

A web app that generates NBME-aligned, USMLE-style multiple-choice questions from learning objectives. Built for medical students at UVA.

## Features

- **AI-Generated MCQs** — Paste learning objectives, get clinical vignette-based questions following NBME item-writing principles
- **Quality Check Pass** — Every question set goes through an automatic review that catches stem giveaways and option length violations
- **Per-Distractor Analysis** — Each wrong answer gets its own explanation
- **LO-Cited Explanations** — Every explanation references the specific lecture and learning objective
- **Study + Exam Modes** — Instant feedback or timed exam with scoring
- **Question Bank** — Save and revisit generated question sets
- **Flag Button** — Report bad questions for TA review
- **Image-Based Questions** — Clinical image descriptions for visual recognition LOs
- **Regenerate** — Replace weak individual questions with one click
- **Export** — Download teacher (with answers) and student (without) versions

## How It Works

The app calls the Claude API (Sonnet 4) with a comprehensive system prompt encoding:
- All 5 NBME core item-writing rules
- 14 technical flaws to avoid (from NBME + UVA workshop)
- Hard limits on option length (≤8 words, uniform)
- Zero-tolerance stem giveaway detection
- UpToDate-referenced clinical accuracy
- 1st/2nd/3rd order question complexity

## Deploy to Vercel (Free)

### Prerequisites
- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account (free tier works)
- An Anthropic API key (from [console.anthropic.com](https://console.anthropic.com))

### Steps

1. **Push to GitHub**
   ```bash
   cd mcq-site
   git init
   git add .
   git commit -m "Initial commit"
   ```
   Then create a new repository on [github.com/new](https://github.com/new) and follow the instructions to push.

2. **Deploy on Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import" next to your GitHub repository
   - **Before clicking Deploy**, expand "Environment Variables"
   - Add this variable:
     - **Name:** `ANTHROPIC_API_KEY`
     - **Value:** your API key (the `sk-ant-...` string from Anthropic console)
   - Click **Deploy**

3. **Done!** Your site is live at `your-project.vercel.app`. Share this URL with students.

### Managing Your API Key on Vercel

- **To pause the service:** Go to Vercel → your project → Settings → Environment Variables → delete `ANTHROPIC_API_KEY`. Redeploy. The site stays up but shows "service paused."
- **To resume:** Add the key back and redeploy.
- **To rotate the key:** Delete the old key in Anthropic console, create a new one, update it in Vercel, redeploy.

### Security

- The API key is stored as a server-side environment variable — students never see it
- All API calls go through a server-side proxy (`/api/generate`)
- Built-in rate limiting: 5 question sets per student per hour
- Friendly error messages if credits run out or service is paused

## Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

Create a `.env.local` file with your API key for local testing:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

## Project Structure

```
mcq-site/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── generate/
│   │   │       └── route.js    # Server-side API proxy (hides your key)
│   │   ├── globals.css         # Tailwind + custom styles
│   │   ├── layout.js           # Root layout + metadata
│   │   └── page.js             # Main app (all logic)
│   ├── components/
│   │   ├── Icons.js            # SVG icon components
│   │   ├── OnboardingGuide.js  # How-to-use collapsible
│   │   ├── QuestionCard.js     # Individual question with flag
│   │   └── ScoreSummary.js     # Post-exam score display
│   └── lib/
│       └── prompts.js          # System prompt + API helpers
├── package.json
├── tailwind.config.js
├── next.config.js
└── vercel.json
```

## Cost Estimate

Using Claude Sonnet 4:
- ~$0.02–0.05 per question set (5 questions)
- ~$0.04–0.10 per question set (10 questions)
- A class of 160 students generating 1 set/week ≈ $6–16/week
