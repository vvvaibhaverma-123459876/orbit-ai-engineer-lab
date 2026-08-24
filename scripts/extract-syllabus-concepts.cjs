#!/usr/bin/env node

// First-pass concept extraction from the supplied syllabus markdown. It is
// intentionally conservative: terms are machine-extracted and marked for
// human review, never presented as the final ~6,000-concept inventory.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.join(__dirname, "..");
const manifestPath = path.join(root, "content", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const files = process.argv.slice(2).filter((value) => !value.startsWith("--"));
if (!files.length) {
  console.error("Usage: node scripts/extract-syllabus-concepts.cjs <syllabus.md> [...]");
  process.exit(2);
}

const normalise = (value) => value
  .toLowerCase()
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim()
  .replace(/\s+/g, " ");

function hash(value) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function parseTopics(markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const headings = [];
  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,2})\s+(.+?)\s*$/);
    if (match) headings.push({ level: match[1].length, text: match[2].trim(), line: index });
  });
  const topSections = headings.filter((heading) => heading.level === 1 && /^\d+\s*[·.]\s*/.test(heading.text));
  const topics = [];
  for (const sectionHeading of topSections) {
    const sectionNumber = (sectionHeading.text.match(/^(\d+)/) || [])[1];
    if (!sectionNumber) continue;
    const nextTop = headings.find((heading) => heading.level === 1 && heading.line > sectionHeading.line);
    const end = nextTop ? nextTop.line : lines.length;
    const children = headings.filter((heading) => heading.level === 2 && heading.line > sectionHeading.line && heading.line < end && /^\d+\.\d+\s+/.test(heading.text));
    if (children.length) {
      children.forEach((heading) => {
        const topicMatch = heading.text.match(/^(\d+\.\d+)\s+(.+)$/);
        const next = headings.find((candidate) => candidate.line > heading.line && (candidate.level <= 2));
        topics.push({ number: topicMatch[1], title: topicMatch[2].trim(), body: lines.slice(heading.line + 1, next ? next.line : end).join("\n") });
      });
    } else {
      topics.push({ number: sectionNumber, title: sectionHeading.text.replace(/^\d+\s*[·.]\s*/, "").trim(), body: lines.slice(sectionHeading.line + 1, end).join("\n") });
    }
  }
  return topics;
}

function coverBody(body) {
  const coverStart = body.search(/^\*\*Cover\*\*\s*$/m);
  if (coverStart < 0) return body;
  const afterCover = body.slice(coverStart + body.slice(coverStart).search(/\n/) + 1);
  const endMatch = afterCover.search(/^\*\*(Traps|Exercises|Materials)/m);
  return (endMatch >= 0 ? afterCover.slice(0, endMatch) : afterCover).trim();
}

function extractConcepts(body) {
  const cover = coverBody(body);
  const values = [];
  const add = (value) => {
    const cleaned = value.replace(/\s+/g, " ").replace(/^[-·\s]+|[-·\s]+$/g, "").trim();
    if (!cleaned || cleaned.length < 2 || cleaned.length > 120) return;
    if (/^(competencies|cover|traps|exercises|materials)$/i.test(cleaned)) return;
    if (!values.some((candidate) => normalise(candidate) === normalise(cleaned))) values.push(cleaned);
  };
  for (const match of cover.matchAll(/`([^`]+)`/g)) add(match[1]);
  for (const match of cover.matchAll(/\*\*([^*]+)\*\*/g)) add(match[1]);
  for (const line of cover.split("\n")) {
    const label = line.match(/^\*([^*]+)\.\*\s*/);
    if (label) add(label[1]);
  }
  return values;
}

const extracted = [];
for (const file of files) {
  const markdown = fs.readFileSync(file, "utf8");
  for (const topic of parseTopics(markdown)) {
    const rootNumber = Number(topic.number.split(".")[0]);
    const index = topic.number.includes(".") ? Number(topic.number.split(".")[1]) - 1 : 0;
    const section = manifest.sections.find((candidate) => Number(candidate.number) === rootNumber && candidate.topics[index]);
    if (!section) continue;
    const target = section.topics[index];
    const concepts = extractConcepts(topic.body).map((name) => ({
      id: `${target.number}.c${hash(`${target.id}:${normalise(name)}`)}`,
      name,
      source: path.basename(file),
      review: "machine-extracted"
    }));
    const trapLines = (topic.body.match(/^\s*-\s+.+$/gm) || [])
      .map((line) => line.replace(/^\s*-\s+/, "").trim())
      .filter((line) => line.length > 8)
      .map((name) => ({ id: `${target.number}.t${hash(`${target.id}:${normalise(name)}`)}`, name, concepts: [], review: "machine-extracted" }));
    extracted.push({ topicId: target.id, topicNumber: target.number, concepts, traps: trapLines, source: path.basename(file) });
  }
}

const byTopic = new Map(extracted.map((entry) => [entry.topicId, entry]));
for (const section of manifest.sections) {
  for (const topic of section.topics) {
    const entry = byTopic.get(topic.id);
    if (!entry) continue;
    topic.concepts = entry.concepts;
    topic.traps = entry.traps;
    topic.status = "in-progress";
  }
}
manifest.status = "in-progress";
manifest.authoring.conceptsIndexed = manifest.sections.reduce((count, section) => count + section.topics.reduce((topicCount, topic) => topicCount + topic.concepts.length, 0), 0);
manifest.extraction = {
  status: "machine-extracted-review-needed",
  sourceFiles: files.map((file) => path.basename(file)),
  topicsMatched: extracted.length,
  topicsUnmatched: manifest.topicCount - extracted.length
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
fs.writeFileSync(path.join(root, "content", "concepts.json"), JSON.stringify(extracted, null, 2) + "\n");
console.log(`Matched ${extracted.length} topics; indexed ${manifest.authoring.conceptsIndexed} machine-extracted concepts.`);
console.log(`Remaining topics without source coverage: ${manifest.extraction.topicsUnmatched}`);
