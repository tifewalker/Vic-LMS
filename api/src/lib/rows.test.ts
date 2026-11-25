import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLevel, parsePhone, parseSex, validateRows } from "./rows.js";

test("valid rows are normalised", () => {
  const { valid, errors } = validateRows([{ matric_no: " csc/24/001 ", full_name: "  Ada   Obi ", email: "ADA@Example.com" }]);
  assert.equal(errors.length, 0);
  assert.deepEqual(valid[0], { row: 1, matric_no: "CSC/24/001", full_name: "Ada Obi", email: "ada@example.com", department: null, level: null, phone: null, sex: null });
});

test("missing fields and bad emails are flagged per row", () => {
  const { valid, errors } = validateRows([
    { matric_no: "", full_name: "A", email: "a@example.com" },
    { matric_no: "CSC/24/001", full_name: "", email: "not-an-email" },
  ]);
  assert.equal(valid.length, 0);
  assert.deepEqual(errors[0], { row: 1, messages: ["Matric or registration number is missing."] });
  assert.deepEqual(errors[1], { row: 2, messages: ["Full name is missing.", "Email is not valid."] });
});

test("duplicates inside the file are flagged on the later row", () => {
  const { valid, errors } = validateRows([
    { matric_no: "CSC/24/001", full_name: "A", email: "a@example.com" },
    { matric_no: "csc/24/001", full_name: "B", email: "b@example.com" },
    { matric_no: "CSC/24/003", full_name: "C", email: "A@example.com" },
  ]);
  assert.equal(valid.length, 1);
  assert.deepEqual(errors, [
    { row: 2, messages: ["Same matric or registration number as row 1."] },
    { row: 3, messages: ["Same email as row 1."] },
  ]);
});

test("garbage input does not throw", () => {
  const { valid, errors } = validateRows([null, 42, "x"]);
  assert.equal(valid.length, 0);
  assert.equal(errors.length, 3);
});

test("matric numbers shorter than 6 characters are flagged, since they are the first password", () => {
  const { valid, errors } = validateRows([{ matric_no: "A12", full_name: "A", email: "a@example.com" }]);
  assert.equal(valid.length, 0);
  assert.deepEqual(errors[0], { row: 1, messages: ["Matric or registration number is too short to use as a password (at least 6 characters)."] });
});

test("department and level are optional, and level accepts 300, 300L or 300 Level", () => {
  assert.equal(parseLevel(""), null);
  assert.equal(parseLevel(300), 300);
  assert.equal(parseLevel("300L"), 300);
  assert.equal(parseLevel(" 400 level "), 400);
  assert.ok(Number.isNaN(parseLevel("600")));
  assert.ok(Number.isNaN(parseLevel("final year")));
  const { valid, errors } = validateRows([
    { matric_no: "CSC/24/001", full_name: "Ada Obi", email: "ada@example.com", department: "  Computer   Science ", level: "200L" },
    { matric_no: "CSC/24/002", full_name: "Bayo Ade", email: "bayo@example.com", level: "700" },
  ]);
  assert.equal(valid[0].department, "Computer Science");
  assert.equal(valid[0].level, 200);
  assert.deepEqual(errors, [{ row: 2, messages: ["Level must be 100, 200, 300, 400 or 500."] }]);
});

test("phone and sex are optional on import and checked when given", () => {
  assert.equal(parsePhone(""), null);
  assert.equal(parsePhone("0803 123 4567"), "+2348031234567");
  assert.equal(parsePhone("+234 803-123-4567"), "+2348031234567");
  assert.equal(parsePhone("2348031234567"), "+2348031234567");
  assert.equal(parsePhone("call me"), "invalid");
  assert.equal(parseSex("F"), "female");
  assert.equal(parseSex(" Male "), "male");
  assert.equal(parseSex(""), null);
  assert.equal(parseSex("x"), "invalid");
  const { valid, errors } = validateRows([
    { matric_no: "REG/25/0001", full_name: "Ada Obi", email: "ada@example.com", phone: "08031234567", sex: "female" },
    { matric_no: "REG/25/0002", full_name: "Bayo Ade", email: "bayo@example.com", phone: "12", sex: "other" },
  ]);
  assert.equal(valid[0].phone, "+2348031234567");
  assert.equal(valid[0].sex, "female");
  assert.deepEqual(errors, [{ row: 2, messages: ["Phone number is not valid.", "Sex must be male or female."] }]);
});
