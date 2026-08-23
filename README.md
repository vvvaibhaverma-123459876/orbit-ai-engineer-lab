# Orbit AI Engineer Lab

An end-to-end, browser-first learning path from beginner Python through applied AI engineering.

## Run locally

Open index.html in a modern browser. There is no build step or package installation required.

## Run the tests

    node --test tests/python-lite.test.cjs

Covers the exercise checker in `python-lite.js`. Node 18 or newer; no dependencies.

## Included

- Responsive learner dashboard and navigation
- Six sequential modules and 16 gated lessons covering foundations, GenAI/LLMs, RAG, alignment, agents, deployment and safety
- Adaptive progress, remediation nudges, module unlocks and a final release checkpoint
- Interactive Python exercise with paste/drop prevention
- Hidden tests that actually run the submitted code against real cases, via a
  small Python-subset interpreter (`python-lite.js`) rather than pattern matching
- A theory checkpoint that shuffles its options and gates the coding test
- Local progress persistence through localStorage, with a streak counter
- Portfolio milestone tracking, a business case brief and an expandable defence checklist
- AI Pulse section for research and practice notes, with working filters
- Light/dark theme toggle, applied before first paint

## Accessibility

The lesson modal is a labelled dialog with a focus trap and an inert
background, decorative glyphs are hidden from assistive tech, there is a skip
link, and text meets WCAG AA contrast in both themes. `prefers-reduced-motion`
is respected.

The hosted build is deliberately browser-first: progress is stored in `localStorage`, and the Python checker is a constrained interpreter designed for safe educational exercises. A production deployment still needs a backend for accounts, cross-device sync, server-side sandboxing, live research ingestion, course-file ingestion, AI-generated feedback, and identity/proctoring controls. Those integrations are kept outside the static path so the complete curriculum remains usable without API keys.
