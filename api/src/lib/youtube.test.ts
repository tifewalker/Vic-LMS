import assert from "node:assert/strict";
import { test } from "node:test";
import { youtubeId } from "./youtube.js";

const ID = "dQw4w9WgXcQ";

test("accepts every common YouTube link shape", () => {
  for (const link of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/watch?feature=share&v=${ID}&t=42s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc123`,
    `https://www.youtube.com/live/${ID}?si=xyz`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}?rel=0`,
    `https://www.youtube.com/shorts/${ID}`,
    `youtube.com/watch?v=${ID}`,
    `  ${ID}  `,
  ]) {
    assert.equal(youtubeId(link), ID, link);
  }
});

test("rejects other sites and malformed IDs", () => {
  for (const link of ["", "https://vimeo.com/123456789", `https://example.com/watch?v=${ID}`, "https://www.youtube.com/watch?v=short", "https://www.youtube.com/channel/UCabc", "not a link"]) {
    assert.equal(youtubeId(link), null, link);
  }
});
