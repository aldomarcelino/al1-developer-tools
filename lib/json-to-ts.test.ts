import test from "node:test";
import assert from "node:assert/strict";
import { jsonToTypeScript, toPascalCase } from "./json-to-ts.ts";

test("toPascalCase converts names cleanly and safely guards TS identifiers", () => {
  assert.equal(toPascalCase("user_profile"), "UserProfile");
  assert.equal(toPascalCase("api-response"), "ApiResponse");
  // Cannot start with a digit in TS
  assert.equal(toPascalCase("123-numbers"), "Type123Numbers");
  // TS reserved keywords collision safety
  assert.equal(toPascalCase("interface"), "TypeInterface");
  assert.equal(toPascalCase("string"), "TypeString");
  // Injection / unsafe characters stripped
  assert.equal(toPascalCase("<script>alert(1)</script>"), "ScriptAlert1Script");
});

test("converts simple JSON object to interface", () => {
  const json = JSON.stringify({ id: 1, name: "Alice", active: true });
  const res = jsonToTypeScript(json, { rootName: "User" });
  assert.equal(res.success, true);
  assert.ok(res.code.includes("export interface User {"));
  assert.ok(res.code.includes("id: number;"));
  assert.ok(res.code.includes("name: string;"));
  assert.ok(res.code.includes("active: boolean;"));
});

test("supports type alias declaration instead of interface", () => {
  const json = JSON.stringify({ status: "ok" });
  const res = jsonToTypeScript(json, { rootName: "ApiResponse", useInterface: false });
  assert.equal(res.success, true);
  assert.ok(res.code.includes("export type ApiResponse = {"));
});

test("extracts nested objects into separate clean interfaces", () => {
  const json = JSON.stringify({
    id: 1,
    address: { street: "Main St", city: "Tokyo" },
  });
  const res = jsonToTypeScript(json, { rootName: "Person" });
  assert.equal(res.success, true);
  assert.equal(res.typeCount, 2);
  assert.ok(res.code.includes("address: Address;"));
  assert.ok(res.code.includes("export interface Address {"));
  assert.ok(res.code.includes("city: string;"));
});

test("handles arrays of objects and merges schemas", () => {
  const json = JSON.stringify([
    { id: 1, title: "First" },
    { id: 2, title: "Second", extra: true },
  ]);
  const res = jsonToTypeScript(json, { rootName: "Posts" });
  assert.equal(res.success, true);
  assert.ok(res.code.includes("export type Posts = PostsItem[];"));
  assert.ok(res.code.includes("export interface PostsItem {"));
  assert.ok(res.code.includes("extra: boolean;"));
});

test("supports optional and readonly modifier flags", () => {
  const json = JSON.stringify({ id: 1, tag: "tech" });
  const res = jsonToTypeScript(json, {
    rootName: "Article",
    readonlyProps: true,
    optionalProps: true,
  });
  assert.equal(res.success, true);
  assert.ok(res.code.includes("readonly id?: number;"));
  assert.ok(res.code.includes("readonly tag?: string;"));
});

test("handles malformed JSON gracefully with error message", () => {
  const invalidJson = "{ id: 1, name: unquoted }";
  const res = jsonToTypeScript(invalidJson);
  assert.equal(res.success, false);
  assert.ok(res.error?.includes("JSON Parse Error"));
});
