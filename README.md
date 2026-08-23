# Orbit AI Engineer Lab

The first incremental prototype for a private, adaptive path from beginner to AI engineer.

## Run locally

Open index.html in a modern browser. There is no build step or package installation required for this prototype.

## Run the tests

    node --test tests/python-lite.test.cjs

Covers the exercise checker in `python-lite.js`. Node 18 or newer; no dependencies.

## Included in this first slice

- Responsive learner dashboard and navigation
- Module 0 roadmap with IIT-aligned next modules, and a browsable module list
- Adaptive learner-model panel
- Interactive Python exercise with paste/drop prevention
- Hidden tests that actually run the submitted code against real cases, via a
  small Python-subset interpreter (`python-lite.js`) rather than pattern matching
- A theory checkpoint that shuffles its options and gates the coding test
- Local progress persistence through localStorage, with a streak counter
- Portfolio milestone tracking and an expandable project brief
- AI Pulse section for source-backed research and practice updates, with filters
- Light/dark theme toggle, applied before first paint

## Accessibility

The lesson modal is a labelled dialog with a focus trap and an inert
background, decorative glyphs are hidden from assistive tech, there is a skip
link, and text meets WCAG AA contrast in both themes. `prefers-reduced-motion`
is respected.

This is intentionally a front-end prototype. Cloud accounts, real sandboxed code execution, AI feedback, PPT ingestion, hosted persistence, and production proctoring will be added incrementally after the foundation experience is validated.
