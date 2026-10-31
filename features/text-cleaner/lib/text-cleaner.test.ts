import test from "node:test";
import assert from "node:assert/strict";
import { cleanText, defaultCleanOptions } from "./text-cleaner.ts";

test("cleanup handles mixed newlines, duplicates, whitespace and numeric sort", () => {
  assert.equal(
    cleanText(" item10\r\nitem2\r\n item2 \r\n \r\nhello\t world ", {
      ...defaultCleanOptions,
      collapse: true,
      empty: true,
      unique: true,
      sort: "asc",
    }),
    "hello world\nitem2\nitem10"
  );
  assert.equal(
    cleanText(" a \r\nb\r", { ...defaultCleanOptions, trim: false }),
    " a \nb\n"
  );
});

test("case conversion splits acronyms and camelCase while preserving Unicode words", () => {
  assert.equal(
    cleanText("HTTPResponse helloWorld café 你好", {
      ...defaultCleanOptions,
      caseStyle: "snake",
    }),
    "http_response_hello_world_café_你好"
  );
  assert.equal(
    cleanText("hello-world\nnew value", { ...defaultCleanOptions, caseStyle: "camel" }),
    "helloWorld\nnewValue"
  );
  assert.equal(
    cleanText("helloWorld", { ...defaultCleanOptions, caseStyle: "kebab" }),
    "hello-world"
  );
  assert.equal(
    cleanText("ÉCOLE hello", { ...defaultCleanOptions, caseStyle: "title" }),
    "École Hello"
  );
  assert.equal(cleanText("", defaultCleanOptions), "");
});
