#!/usr/bin/env node

// Structural curriculum linter. It evaluates only the data declarations in
// app.js, never the browser boot code, so it can run in CI without a DOM.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appPath = path.join(__dirname, "..", "app.js");
const source = fs.readFileSync(appPath, "utf8");
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

console.log(`Parts: ${expectedParts.length}`);
console.log(`Sections: ${foundationsCurriculum.length}`);
console.log(`Topics: ${topicKeys.size}`);
console.log(`Topic labs: ${topicLabs.length}`);
if (errors.length) {
  console.error("\nCurriculum errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log("Curriculum structure and lab links are valid.");
}
