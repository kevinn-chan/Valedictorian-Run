// Self-check for recompile-safe card re-tagging. Run: `node src/lib/ingest.check.ts`
import assert from "node:assert";
import { pickTopicSlug } from "./ingest.ts";

const topics = [
  { slug: "abc-intro", pages: [1, 2, 3, 4, 5] }, // broad
  { slug: "abc-loops", pages: [3, 4] }, // overlaps intro on p.3-4, but narrower
  { slug: "abc-frames", pages: [10] },
];

// Page in exactly one topic → that topic.
assert.equal(pickTopicSlug(10, topics), "abc-frames");
// Page 1 only in the broad topic.
assert.equal(pickTopicSlug(1, topics), "abc-intro");
// Page 3 in both intro and loops → most specific (fewest pages) wins.
assert.equal(pickTopicSlug(3, topics), "abc-loops");
// No topic covers the page → leave the card where it is.
assert.equal(pickTopicSlug(99, topics), null);
// Missing page (older cards) → no remap.
assert.equal(pickTopicSlug(null, topics), null);
assert.equal(pickTopicSlug(undefined, topics), null);

console.log("ingest.check: all assertions passed");
