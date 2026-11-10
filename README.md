# SABAQ AI

**Upload a lecture → get an easy explanation, an infographic, real YouTube videos and exam practice.**

SABAQ AI ("sabaq" = *lesson* in Kazakh) is a prototype web app for university students, focused on **Computer Science and ICT**. A student uploads lecture slides, notes, an audio recording or a video. The AI reads it and creates a study pack:

- **Overview** — a short explanation in simple words and the key terms
- **Explanation** — the full topic step by step, with analogies and code
- **Infographic** — one picture of the big idea (flow, cycle, layers, comparison or tree), downloadable as PNG/SVG
- **Videos** — real YouTube videos on the same topic (YouTube Data API, never invented links)
- **Exam prep** — worked examples, an interactive quiz and exam tips
- **Ask AI** — a chat that answers follow-up questions using the lecture

Lectures are filed automatically into **folders by topic** (Computer Networks, Algorithms, …). The design is a minimal green take on Claude's interface. The app works with **Claude or Gemini** — you switch with one setting.

![Home screen](docs/screenshots/home.png)

The AI never draws the picture itself. It fills a small JSON structure, and the app renders it in one of five layouts. Examples below are rendered from test data:

| Comparison | Cycle |
|---|---|
| ![Comparison infographic](docs/screenshots/infographic-comparison.png) | ![Cycle infographic](docs/screenshots/infographic-cycle.png) |
| **Flow** | **Hierarchy** |
| ![Flow infographic](docs/screenshots/infographic-flow.png) | ![Hierarchy infographic](docs/screenshots/infographic-hierarchy.png) |

---

## 1. Run it (5 minutes)

**Easiest way:**
1. Install **Node.js LTS** from [nodejs.org](https://nodejs.org). You only do this once.
2. Unzip the project (right-click → *Extract all*).
3. Double-click **`START.bat`** on Windows, or **`START-mac.command`** on Mac. The browser opens by itself. Keep the black window open while you use the app.

**Manual way:** you need **Node.js 20.9 or newer**. Check with `node -v`.

```bash
cd sabaq-ai
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
npm run dev
```

Open **http://localhost:3000**.

Without any keys the app runs in **demo mode**. Everything works, but the study pack is made by simple text rules instead of AI. To get real explanations, add a key (next section) and restart `npm run dev`.

> Try it immediately: click one of the **"Try a sample"** buttons under the upload box. There are three CS sample lectures: a PDF on networking, a PPTX on sorting and a transcript about the CPU.

## 2. Environment variables (`.env.local`)

| Variable | Needed for | Example |
|---|---|---|
| `AI_PROVIDER` | Which AI explains lectures: `claude`, `gemini` or `mock` (demo). If empty, the app picks Claude if its key is set, otherwise Gemini, otherwise demo. | `claude` |
| `ANTHROPIC_API_KEY` | Claude — explanations, chat, scanned PDFs | `sk-ant-…` |
| `CLAUDE_MODEL` | Claude model (optional) | `claude-sonnet-5-5` |
| `GEMINI_API_KEY` | Gemini — explanations and chat, plus **audio/video transcription** (always Gemini) | `AIza…` |
| `GEMINI_MODEL` | Gemini model (optional) | `gemini-3.8-flash` |
| `YOUTUBE_API_KEY` | Real video recommendations. Without it, YouTube search links are shown instead. | `AIza…` |
| `MAX_UPLOAD_MB` | Upload size limit (optional) | `100` |
| `RATE_LIMIT_PER_10MIN` | Analyses per IP per 10 min (optional) | `12` |

Keys are used **only on the server** (Next.js API routes). They are never sent to the browser.

### Where to get the keys

- **Claude**: [console.anthropic.com](https://console.anthropic.com) → *API Keys* → *Create key*. Needs a small amount of API credit.
- **Gemini**: [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → *Create API key*. There is a free tier.
- **YouTube**: [console.cloud.google.com](https://console.cloud.google.com) → create a project → *APIs & Services* → *Library* → enable **YouTube Data API v3** → *Credentials* → *Create credentials → API key*. Free quota: 10,000 units/day (one lecture uses ≤ 200).

## 3. Switching between Claude and Gemini

Edit `.env.local` and restart the server:

```bash
# Use Claude
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...

# …or use Gemini
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...
```

**Best setup:** set both keys and `AI_PROVIDER=claude`. Claude writes the explanations, and Gemini transcribes audio and video (Claude cannot listen to audio).

The current engine is shown at the bottom of the sidebar and in **Settings & privacy**.

Model names change over time. If a model is retired, put a current one in `CLAUDE_MODEL` / `GEMINI_MODEL` (see the providers' model lists).

## 4. What files can I upload?

| Type | Formats | How it's read |
|---|---|---|
| Slides | `.pdf`, `.pptx` | Text of every page/slide **and speaker notes**. Scanned PDFs (pictures only) are read with AI vision. |
| Notes | `.docx`, `.txt`, `.md` | Paragraph text |
| Transcript | `.vtt`, `.srt` | Timestamps and repeated caption lines are removed |
| Audio | `.mp3`, `.wav`, `.m4a`, `.aac`, `.ogg`, `.flac` | Transcribed by Gemini |
| Video | `.mp4`, `.webm`, `.mov`, `.mkv` | Transcribed by Gemini (also notes what is on screen) |

Very long lectures (more than ~120,000 characters, roughly a 2–3 hour transcript) are split into parts. Each part is summarised into notes, and the notes are combined into one study pack.

## 5. Tests

```bash
npm test           # 36 automated tests (vitest)
npm run typecheck  # TypeScript check
```

| Test file | Checks |
|---|---|
| `tests/extract.test.ts` | PDF (pages, scanned detection, damaged file), PPTX (slide order + notes), DOCX, VTT/SRT cleaning, file-type errors |
| `tests/chunk.test.ts` | Long-lecture splitting: size limits, no lost content, overlap |
| `tests/schema.test.ts` | zod validation of the AI JSON, auto-fixing broken quiz questions, JSON parsing, **retry with validation errors** |
| `tests/youtube.test.ts` | Real-API results ranking, duplicates, quota errors → search links, no key → search links |
| `tests/pipeline.test.ts` | End-to-end on the 3 sample lectures (demo AI), folder auto-sorting, upload deletion, map-reduce for long lectures |

Sample lectures are in `samples/` (regenerate with `python scripts/make_samples.py`).

## 6. Project structure

```
sabaq-ai/
├─ src/
│  ├─ app/                      Next.js pages + API routes
│  │  ├─ page.tsx               Home (upload)
│  │  ├─ lecture/[id]/          Lecture page (tabs)
│  │  ├─ folder/[id]/           Folder page
│  │  ├─ settings/              Settings & privacy
│  │  └─ api/                   status · folders · lectures · chat · data
│  ├─ components/               Sidebar, UploadComposer, LectureView, Infographic, PracticeQuiz, VideoGrid, ChatPanel…
│  └─ lib/
│     ├─ extract/               pdf.ts · pptx.ts · docx.ts · transcript.ts
│     ├─ ai/                    claude.ts · gemini.ts · mock.ts · prompts.ts · json.ts (validate + retry)
│     ├─ schemas.ts             zod schema of the study pack
│     ├─ analyze.ts             single pass or map-reduce
│     ├─ pipeline.ts            upload → extract → AI → folder → YouTube
│     ├─ youtube.ts             YouTube Data API v3
│     ├─ store.ts               folders "database" (data/db.json)
│     └─ chunk.ts · rateLimit.ts · errors.ts · config.ts
├─ samples/                     3 CS sample lectures (PDF, PPTX, VTT)
├─ tests/                       vitest tests + fixtures
├─ docs/                        architecture diagram, roadmap, screenshots
└─ .env.example
```

Architecture and data flow: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.
Limitations and roadmap: **[docs/LIMITATIONS_AND_ROADMAP.md](docs/LIMITATIONS_AND_ROADMAP.md)**.

## 7. Privacy

- Uploaded files are **deleted right after** their text is extracted or transcribed. Audio/video sent to Gemini is deleted from Google's servers afterwards.
- The app keeps only the extracted text, the study pack and the chat, in `data/` on your computer/server.
- Users can delete a lecture, a folder, or **everything** (Settings → *Delete everything*).
- Lecture text is sent to the chosen AI provider (Anthropic or Google) for processing. Do not upload confidential material.
- Every page reminds students that AI answers must be checked against course materials.

## 8. Troubleshooting

| Message | Fix |
|---|---|
| "AI_PROVIDER is 'claude' but ANTHROPIC_API_KEY is empty" | Add the key to `.env.local` or change `AI_PROVIDER`, then restart `npm run dev`. |
| "The API key for Claude/Gemini was rejected" | Copy the key again (no spaces or quotes). For Claude, check that the account has API credit. |
| "too many requests (rate limit)" | Wait a minute. Free tiers have low per-minute limits. |
| "Audio and video lectures are transcribed with Gemini…" | Add `GEMINI_API_KEY`, or upload slides or a transcript. |
| Videos tab shows only search links | Add `YOUTUBE_API_KEY` and enable *YouTube Data API v3* for it. The daily quota may also be used up. |
| Port 3000 busy | `npm run dev -- -p 3001` |

---

ICT project prototype. Built with Next.js, TypeScript, zod, the Anthropic and Google Gen AI SDKs and the YouTube Data API.
