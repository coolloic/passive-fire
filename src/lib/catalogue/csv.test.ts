import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvRecords } from "./csv";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps commas and newlines inside quoted fields", () => {
    expect(parseCsv('name,substrate\nx,"FR plasterboard, wall\n(1 layer)"')).toEqual([
      ["name", "substrate"],
      ["x", "FR plasterboard, wall\n(1 layer)"],
    ]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseCsv('a\n"say ""hi"""')).toEqual([["a"], ['say "hi"']]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("strips a leading byte-order mark", () => {
    expect(parseCsv("﻿Internal Code\n0334")).toEqual([["Internal Code"], ["0334"]]);
  });

  it("keeps empty fields, including a trailing one", () => {
    expect(parseCsv("a,b,c\n1,,")).toEqual([
      ["a", "b", "c"],
      ["1", "", ""],
    ]);
  });

  it("returns no rows for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("rejects an unterminated quoted field", () => {
    expect(() => parseCsv('a\n"open')).toThrowError(/unterminated/);
  });
});

describe("parseCsvRecords", () => {
  it("maps rows to records keyed by trimmed header names", () => {
    expect(parseCsvRecords(" Code ,Size\n0334,Ø50mm\n")).toEqual([{ Code: "0334", Size: "Ø50mm" }]);
  });

  it("skips blank lines", () => {
    expect(parseCsvRecords("a\n1\n\n2\n")).toEqual([{ a: "1" }, { a: "2" }]);
  });

  it("returns nothing for empty input", () => {
    expect(parseCsvRecords("")).toEqual([]);
  });

  it("rejects rows with the wrong number of fields, naming the line", () => {
    expect(() => parseCsvRecords("a,b\n1,2\n3\n")).toThrowError(/row 3 has 1 fields, expected 2/);
  });
});
