import test from "node:test";
import assert from "node:assert/strict";
import { convertCurl, parseCurl, sampleCurlCommands } from "./curl.ts";

test("parses POST JSON curl command correctly", () => {
  const res = parseCurl(sampleCurlCommands.jsonPost);
  assert.ok(res.parsed);
  assert.equal(res.parsed.method, "POST");
  assert.equal(res.parsed.url, "https://api.example.com/v1/users");
  assert.equal(res.parsed.headers["Content-Type"], "application/json");
  assert.equal(res.parsed.headers["Authorization"], "Bearer sec_live_9948abc123");
  assert.equal(res.parsed.isJsonBody, true);
});

test("parses GET request with flags and query parameters", () => {
  const res = parseCurl(sampleCurlCommands.getWithQuery);
  assert.ok(res.parsed);
  assert.equal(res.parsed.method, "GET");
  assert.ok(res.parsed.url.includes("repos/aldomarcelino/al1-developer-tools"));
  assert.equal(res.parsed.followRedirects, true);
});

test("parses Basic Auth credentials correctly", () => {
  const res = parseCurl(sampleCurlCommands.basicAuthForm);
  assert.ok(res.parsed);
  assert.equal(res.parsed.basicAuth?.username, "api_key_sandbox");
  assert.equal(res.parsed.basicAuth?.password, "sec_pass_xyz890");
});

test("generates JavaScript Fetch code", () => {
  const res = convertCurl(sampleCurlCommands.jsonPost, "js-fetch");
  assert.equal(res.success, true);
  assert.ok(res.code.includes("fetch(url, options)"));
  assert.ok(res.code.includes('method: "POST"'));
  assert.ok(res.code.includes("JSON.stringify"));
});

test("generates JavaScript Axios code", () => {
  const res = convertCurl(sampleCurlCommands.jsonPost, "js-axios");
  assert.equal(res.success, true);
  assert.ok(res.code.includes('import axios from "axios";'));
  assert.ok(res.code.includes('method: "post"'));
});

test("generates Python Requests code", () => {
  const res = convertCurl(sampleCurlCommands.jsonPost, "python-requests");
  assert.equal(res.success, true);
  assert.ok(res.code.includes("import requests"));
  assert.ok(res.code.includes('method="POST"'));
  assert.ok(res.code.includes("payload ="));
});

test("generates PHP cURL code", () => {
  const res = convertCurl(sampleCurlCommands.jsonPost, "php-curl");
  assert.equal(res.success, true);
  assert.ok(res.code.includes("curl_init()"));
  assert.ok(res.code.includes('CURLOPT_CUSTOMREQUEST => "POST"'));
});

test("generates Go net/http code", () => {
  const res = convertCurl(sampleCurlCommands.jsonPost, "go-http");
  assert.equal(res.success, true);
  assert.ok(res.code.includes("package main"));
  assert.ok(res.code.includes('http.NewRequest("POST"'));
  assert.ok(res.code.includes("client.Do(req)"));
});

test("flags unsupported cURL options transparently", () => {
  const cmd = `curl https://api.test.com --proxy "http://127.0.0.1:8080" --limit-rate 50k`;
  const res = convertCurl(cmd, "js-fetch");
  assert.equal(res.success, true);
  assert.ok(res.warnings.length > 0);
  assert.ok(res.warnings[0].includes("--proxy"));
});

test("fails gracefully on invalid command without URL", () => {
  const res = convertCurl("curl -X POST -H 'Content-Type: application/json'");
  assert.equal(res.success, false);
  assert.ok(res.error?.includes("valid target URL"));
});
