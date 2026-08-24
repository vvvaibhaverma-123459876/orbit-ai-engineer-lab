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

The `scripts/curriculum-lint.cjs` check already validates the structural
contract: eight parts, 35 sections, 197 topics, unique IDs, and one lab link
per topic. Concept coverage will be added as the named concepts are extracted
from the supplied syllabus prose; until then, the report deliberately does not
claim that the target ~6,000-concept inventory exists.
