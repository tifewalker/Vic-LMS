import assert from "node:assert/strict";
import { test } from "node:test";
import { normaliseMatric, parseIdentifier } from "./identifier.js";

test("emails are trimmed and lowercased", () => {
  assert.deepEqual(parseIdentifier("  Ada.Obi@Example.COM "), { kind: "email", value: "ada.obi@example.com" });
});

test("tutor IDs are recognised in any case", () => {
  assert.deepEqual(parseIdentifier("vec-tut-0007"), { kind: "tutor_id", value: "VEC-TUT-0007" });
  assert.deepEqual(parseIdentifier("VEC-TUT-12345"), { kind: "tutor_id", value: "VEC-TUT-12345" });
});

test("anything else is a matric number, uppercased with spaces removed", () => {
  assert.deepEqual(parseIdentifier(" csc/2024/ 015 "), { kind: "matric_no", value: "CSC/2024/015" });
  assert.deepEqual(parseIdentifier("VEC-TUT-1"), { kind: "matric_no", value: "VEC-TUT-1" });
});

test("empty input is rejected", () => {
  assert.equal(parseIdentifier("   "), null);
});

test("normaliseMatric", () => {
  assert.equal(normaliseMatric(" eng/21/0042\t"), "ENG/21/0042");
});
