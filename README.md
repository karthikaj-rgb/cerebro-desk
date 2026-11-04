# Cerebro Desk prototype

A voice-first AI desk for HighLevel agency owners. You land, the AI tells you what needs you, and you say "fix them" or ask for anything.

Live site: https://cerebro-desk-seven.vercel.app

## How deploys work

- The Vercel project `cerebro-desk` is linked to this repo.
- A push to `main` deploys to the live site.
- A push to any other branch, or a pull request, gets its own preview link.

## Run it locally

It is plain HTML, CSS and JavaScript modules, with no build step.

```bash
python3 -m http.server 5183
```

Then open http://localhost:5183.

## Where things live

| File | What it holds |
| --- | --- |
| `index.html` | Page markup and the prototype panel |
| `desk.js` | All behaviour: desk, rooms, voice, V2 landing and dashboards |
| `desk.css` | All styles |
| `data.js` | Items, numbers and recorded voice lines |
| `work.js` | What each room shows while the AI works, and its results |
| `api/intent.js` | Edge function that sends what you said to Claude. It needs `ANTHROPIC_API_KEY` set in Vercel |
| `audio/` | Recorded voice clips and their durations |
| `mockups/` | Static design explorations |

## Prototype options

Open the panel with the sliders icon, top right.

- **Version:** V1 is the original three-column desk. V2 follows Rich's feedback.
- **Day** (V2 only): Busy or Quiet.
- **Landing** (V2 only): List or Sentence.
- **Dashboard** (V2 only): Columns, Ribbon or Day.

Add `?view=dash` to the address to open straight on the dashboard.

## Cache busting

CSS and JS files are loaded with `?v=YYYYMMDDx`. When you change `desk.js`, `desk.css`, `data.js` or `work.js`, bump that version everywhere it appears in `index.html`, `desk.js` and `_voicetest.html`.

## Local-only files

`_voicetest.html` (a fake microphone for testing) and `_audit/` are listed in `.vercelignore`. They are in the repo but never deployed.
