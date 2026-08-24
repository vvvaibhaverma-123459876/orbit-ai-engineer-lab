# Orbit content workspace

The live curriculum is currently rendered from the shared declarations in
`app.js`. This directory is the migration point for the syllabus-fidelity
content model described in the master build plan.

Each authored topic will move toward this shape:

```text
content/part-01/section-01-python/topic-01-language-core/
  topic.yaml
  concepts.yaml
  lesson-01.mdx
  drills.yaml
  build.yaml
  lab.yaml
```

The `scripts/curriculum-lint.cjs` check validates the structural contract:
eight parts, 35 sections, 197 topics, unique IDs, and one lab link per topic.
The first extraction pass in `content/concepts.json` covers the 100 topics
present in the supplied Part I–V syllabus documents. Those 806 terms are now
marked `human-approved` per the learner's review; the remaining new topics are
intentionally left in the authoring queue rather than presented as finished
syllabus coverage.
