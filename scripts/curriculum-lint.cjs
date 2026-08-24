#!/usr/bin/env node

// Structural curriculum linter. It evaluates only the data declarations in
// app.js, never the browser boot code, so it can run in CI without a DOM.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appPath = path.join(__dirname, "..", "app.js");
const source = fs.readFileSync(appPath, "utf8");
const manifestPath = path.join(__dirname, "..", "content", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const end = source.indexOf("const theoryGuides =");
if (end < 0) throw new Error("Could not find the curriculum data boundary in app.js");

const sandbox = { module: { exports: {} }, console, localStorage: { getItem: () => null, setItem: () => {} } };
vm.runInNewContext(source.slice(0, end) + "\nmodule.exports = { foundationsCurriculum, topicLabs };", sandbox, { filename: appPath });
const { foundationsCurriculum, topicLabs } = sandbox.module.exports;

const expectedParts = [
  "PART 0 · CLASSICAL AI",
  "PART I · FOUNDATIONS",
  "PART II · MACHINE LEARNING",
  "PART III · TRANSFORMERS & LLMs",
  "PART IV · AI ENGINEERING",
  "PART V · PRODUCTION",
  "PART VI · OPTIONAL DEPTH",
  "PART VII · STAYING CURRENT"
];
const expectedTopics = 197;
const errors = [];
const sectionIds = new Set();
const topicKeys = new Set();

for (const section of foundationsCurriculum) {
  if (sectionIds.has(section.id)) errors.push(`duplicate section id: ${section.id}`);
  sectionIds.add(section.id);
  if (!Array.isArray(section.topics) || section.topics.length === 0) errors.push(`section has no topics: ${section.id}`);
  for (const title of section.topics) {
    const key = `${section.id}::${title}`;
    if (topicKeys.has(key)) errors.push(`duplicate topic: ${key}`);
    topicKeys.add(key);
    if (!topicLabs.some((lab) => lab.section === section.id && lab.title === title)) errors.push(`topic has no lab: ${key}`);
  }
}

for (const part of expectedParts) {
  if (!foundationsCurriculum.some((section) => (section.part || "PART I · FOUNDATIONS") === part)) errors.push(`missing part: ${part}`);
}

if (foundationsCurriculum.length !== 35) errors.push(`expected 35 sections, found ${foundationsCurriculum.length}`);
if (topicKeys.size !== expectedTopics) errors.push(`expected ${expectedTopics} topics, found ${topicKeys.size}`);
if (manifest.sectionCount !== foundationsCurriculum.length) errors.push(`manifest section count mismatch: ${manifest.sectionCount}`);
if (manifest.topicCount !== topicKeys.size) errors.push(`manifest topic count mismatch: ${manifest.topicCount}`);
const manifestTopics = manifest.sections.flatMap((section) => section.topics || []);
if (manifestTopics.length !== topicKeys.size) errors.push(`manifest topic records mismatch: ${manifestTopics.length}`);
const manifestIds = new Set(manifestTopics.map((topic) => topic.id));
if (manifestIds.size !== manifestTopics.length) errors.push("manifest contains duplicate topic IDs");

const strict = process.argv.includes("--strict");
const approvedConcepts = manifestTopics.flatMap((topic) => topic.concepts || []).filter((concept) => concept.review === "human-approved");
const conceptGaps = manifestTopics.filter((topic) => !topic.concepts.length);
const lessonGaps = manifestTopics.filter((topic) => !topic.lessons.length);
const drillGaps = manifestTopics.filter((topic) => !topic.drills.length);
const buildGaps = manifestTopics.filter((topic) => !topic.build);
const incompleteTopics = manifestTopics.filter((topic) => !topic.concepts.length || !topic.lessons.length || !topic.drills.length || !topic.build);
if (strict && incompleteTopics.length) errors.push(`strict authoring check: ${incompleteTopics.length} topics still need concepts, lessons, drills, or builds`);

console.log(`Parts: ${expectedParts.length}`);
console.log(`Sections: ${foundationsCurriculum.length}`);
console.log(`Topics: ${topicKeys.size}`);
console.log(`Topic labs: ${topicLabs.length}`);
console.log(`Concepts indexed: ${manifest.authoring.conceptsIndexed}`);
console.log(`Human-approved concepts: ${approvedConcepts.length}`);
console.log(`Lessons authored: ${manifest.authoring.lessonsAuthored}`);
console.log(`Drills authored: ${manifest.authoring.drillsAuthored}`);
console.log(`Builds authored: ${manifest.authoring.buildsAuthored}`);
if (incompleteTopics.length) {
  console.log(`Authoring queue: ${incompleteTopics.length} topics are incomplete.`);
  console.log(`  Concept gaps: ${conceptGaps.length} · lesson gaps: ${lessonGaps.length} · drill gaps: ${drillGaps.length} · build gaps: ${buildGaps.length}`);
}
if (errors.length) {
  console.error("\nCurriculum errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log("Curriculum structure and lab links are valid.");
}
