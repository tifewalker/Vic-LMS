import assert from "node:assert/strict";
import { test } from "node:test";
import { validateRows } from "./rows.js";

test("valid rows are normalised", () => {
  const { valid, errors } = validateRows([{ matric_no: " csc/24/001 ", full_name: "  Ada   Obi ", email: "ADA@Example.com" }]);
  assert.equal(errors.length, 0);
  assert.deepEqual(valid[0], { row: 1, matric_no: "CSC/24/001", full_name: "Ada Obi", email: "ada@example.com" });
});

test("missing fields and bad emails are flagged per row", () => {
  const { valid, errors } = validateRows([
    { matric_no: "", full_name: "A", email: "a@example.com" },
    { matric_no: "X1", full_name: "", email: "not-an-email" },
  ]);
  assert.equal(valid.length, 0);
  assert.deepEqual(errors[0], { row: 1, messages: ["Matric number is missing."] });
  assert.deepEqual(errors[1], { row: 2, messages: ["Full name is missing.", "Email is not valid."] });
});

test("duplicates inside the file are flagged on the later row", () => {
  const { valid, errors } = validateRows([
    { matric_no: "X1", full_name: "A", email: "a@example.com" },
    { matric_no: "x1", full_name: "B", email: "b@example.com" },
    { matric_no: "X3", full_name: "C", email: "A@example.com" },
  ]);
  assert.equal(valid.length, 1);
  assert.deepEqual(errors, [
    { row: 2, messages: ["Same matric number as row 1."] },
    { row: 3, messages: ["Same email as row 1."] },
  ]);
});

test("garbage input does not throw", () => {
  const { valid, errors } = validateRows([null, 42, "x"]);
  assert.equal(valid.length, 0);
  assert.equal(errors.length, 3);
});
