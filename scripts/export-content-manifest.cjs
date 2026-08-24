#!/usr/bin/env node

// Export the shared curriculum declarations into the authoring manifest. The
// browser can keep using app.js during migration; the manifest is the stable
// content contract for lessons, concepts, drills, builds, and labs.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
const existingPath = path.join(root, "content", "manifest.json");
const existing = fs.existsSync(existingPath) ? JSON.parse(fs.readFileSync(existingPath, "utf8")) : null;
const existingTopics = new Map((existing?.sections || []).flatMap((section) => (section.topics || []).map((topic) => [topic.id, topic])));
const end = source.indexOf("const theoryGuides =");
if (end < 0) throw new Error("Could not find curriculum data boundary in app.js");

const sandbox = { module: { exports: {} }, console, localStorage: { getItem: () => null, setItem: () => {} } };
vm.runInNewContext(source.slice(0, end) + "\nmodule.exports = { foundationsCurriculum, topicLabs };", sandbox, { filename: "app.js" });
const { foundationsCurriculum, topicLabs } = sandbox.module.exports;
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const sections = foundationsCurriculum.map((section) => ({
  id: section.id,
  part: section.part || "PART I · FOUNDATIONS",
  number: section.number,
  title: section.title,
  summary: section.summary,
  competencies: section.competencies,
  traps: section.traps,
  exercises: section.exercises,
  materials: section.materials,
  topics: section.topics.map((title, index) => {
    const lab = topicLabs.find((candidate) => candidate.section === section.id && candidate.title === title);
    const id = `${section.id}-${slug(title)}`;
    const previous = existingTopics.get(id);
    return {
      id,
      sectionId: section.id,
      part: section.part || "PART I · FOUNDATIONS",
      number: `${section.number}.${String(index + 1).padStart(2, "0")}`,
      title,
      summary: section.summary,
      concepts: previous?.concepts || [],
      lessons: previous?.lessons || [],
      drills: previous?.drills || [],
      build: previous?.build || null,
      traps: previous?.traps || [],
      lab: lab ? {
        id: lab.id,
        theory: lab.theory,
        instructions: lab.lab,
        deliverable: lab.deliverable,
        minimumEvidenceCharacters: lab.minimum
      } : null,
      status: previous?.status || "scaffold"
    };
  })
}));

const manifest = {
  schemaVersion: "0.1",
  status: existing?.status || "scaffold",
  parts: Array.from(new Set(sections.map((section) => section.part))),
  sectionCount: sections.length,
  topicCount: sections.reduce((count, section) => count + section.topics.length, 0),
  sections,
  extraction: existing?.extraction || null,
  authoring: {
    conceptsIndexed: sections.reduce((count, section) => count + section.topics.reduce((topicCount, topic) => topicCount + topic.concepts.length, 0), 0),
    lessonsAuthored: sections.reduce((count, section) => count + section.topics.reduce((topicCount, topic) => topicCount + topic.lessons.length, 0), 0),
    drillsAuthored: sections.reduce((count, section) => count + section.topics.reduce((topicCount, topic) => topicCount + topic.drills.length, 0), 0),
    buildsAuthored: sections.reduce((count, section) => count + section.topics.filter((topic) => topic.build).length, 0)
  }
};

const outputPath = path.join(root, "content", "manifest.json");
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${manifest.sectionCount} sections and ${manifest.topicCount} topics to ${path.relative(root, outputPath)}`);
