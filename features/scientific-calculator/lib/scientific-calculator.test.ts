import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateExpression,
  formatResult,
  safeLivePreview,
  factorial,
  isValidMathInput,
  sanitizeMathInput,
} from "./evaluator.ts";
import toolsData from "../../../config/tools.json" with { type: "json" };
import { toolIcons } from "../../../components/cummon/tool-icons.ts";
import { toolSeo } from "../../../lib/seo/tool-metadata.ts";

test("evaluates basic arithmetic and operator precedence", () => {
  assert.equal(evaluateExpression("1 + 2 * 3").value, 7);
  assert.equal(evaluateExpression("(1 + 2) * 3").value, 9);
  assert.equal(evaluateExpression("10 - 2 + 5").value, 13);
  assert.equal(evaluateExpression("100 / 4 / 5").value, 5);
  assert.equal(evaluateExpression("10 mod 3").value, 1);
});

test("evaluates exponents and powers correctly", () => {
  assert.equal(evaluateExpression("2^3").value, 8);
  assert.equal(evaluateExpression("2^3^2").value, 512); // right-associative: 2^(3^2)
  assert.equal(evaluateExpression("-2^2").value, -4);
  assert.equal(evaluateExpression("(-2)^2").value, 4);
  assert.equal(evaluateExpression("4^0.5").value, 2);
});

test("handles implicit multiplication seamlessly", () => {
  assert.equal(evaluateExpression("2(3 + 4)").value, 14);
  assert.equal(evaluateExpression("(2)(5)").value, 10);
  assert.equal(evaluateExpression("2pi").value, 2 * Math.PI);
  assert.equal(evaluateExpression("3e").value, 3 * Math.E);
});

test("evaluates factorial and percentage", () => {
  assert.equal(factorial(0), 1);
  assert.equal(factorial(1), 1);
  assert.equal(factorial(5), 120);
  assert.equal(evaluateExpression("5!").value, 120);
  assert.equal(evaluateExpression("5! * 2").value, 240);
  assert.equal(evaluateExpression("2 * 3!").value, 12);
  assert.equal(evaluateExpression("50%").value, 0.5);
  assert.equal(evaluateExpression("50% + 50%").value, 1);
  assert.equal(evaluateExpression("100 * 25%").value, 25);
  assert.throws(() => factorial(-1), /non-negative integer/);
  assert.throws(() => factorial(2.5), /non-negative integer/);
  assert.throws(() => factorial(171), /overflow/);
});

test("cleans up floating-point artifacts", () => {
  assert.equal(formatResult(0.1 + 0.2), "0.3");
  assert.equal(formatResult(0.3 - 0.2), "0.1");
  assert.equal(formatResult(6.123233995736766e-17), "0");
  assert.equal(evaluateExpression("0.1 + 0.2").formatted, "0.3");
});

test("evaluates trigonometry in DEG and RAD mode", () => {
  // DEG mode
  assert.equal(evaluateExpression("sin(90)", { angleUnit: "deg" }).value, 1);
  assert.equal(evaluateExpression("cos(90)", { angleUnit: "deg" }).value, 0);
  assert.equal(evaluateExpression("cos(0)", { angleUnit: "deg" }).value, 1);
  assert.equal(evaluateExpression("tan(45)", { angleUnit: "deg" }).value, 1);
  assert.equal(evaluateExpression("asin(1)", { angleUnit: "deg" }).value, 90);
  assert.equal(evaluateExpression("atan(1)", { angleUnit: "deg" }).value, 45);

  // RAD mode
  assert.equal(evaluateExpression("sin(pi / 2)", { angleUnit: "rad" }).formatted, "1");
  assert.equal(evaluateExpression("cos(0)", { angleUnit: "rad" }).value, 1);
  assert.equal(evaluateExpression("tan(pi / 4)", { angleUnit: "rad" }).formatted, "1");
});

test("evaluates logarithms, roots, and constants", () => {
  assert.equal(evaluateExpression("log(100)").value, 2);
  assert.equal(evaluateExpression("log2(8)").value, 3);
  assert.equal(evaluateExpression("ln(e)").value, 1);
  assert.equal(evaluateExpression("sqrt(16)").value, 4);
  assert.equal(evaluateExpression("cbrt(27)").value, 3);
  assert.equal(evaluateExpression("abs(-15.5)").value, 15.5);
  assert.equal(evaluateExpression("ans + 5", { ans: 10 }).value, 15);
});

test("provides informative error messages for domain violations", () => {
  assert.throws(() => evaluateExpression("5 / 0"), /Cannot divide by zero/);
  assert.throws(() => evaluateExpression("sqrt(-4)"), /square root of a negative/);
  assert.throws(() => evaluateExpression("log(-5)"), /positive number/);
  assert.throws(() => evaluateExpression("ln(0)"), /positive number/);
  assert.throws(() => evaluateExpression("asin(2)"), /domain for asin/);
});

test("auto-closes open parentheses on incomplete expressions", () => {
  assert.equal(evaluateExpression("sin(30", { angleUnit: "deg" }).value, 0.5);
  assert.equal(evaluateExpression("((2 + 3) * 4").value, 20);
});

test("safeLivePreview safely generates previews or null without throwing", () => {
  assert.equal(safeLivePreview("2 + 3"), "5");
  assert.equal(safeLivePreview("2 + 3 *"), "5");
  assert.equal(safeLivePreview("sin(90", { angleUnit: "deg" }), "1");
  assert.equal(safeLivePreview("   "), null);
  assert.equal(safeLivePreview("+++"), null);
});

test("guards mathematical input and rejects characters not matching math operations", () => {
  // Valid mathematical inputs and typing prefixes
  assert.ok(isValidMathInput("123 + 456"));
  assert.ok(isValidMathInput("sin(90)"));
  assert.ok(isValidMathInput("s")); // valid prefix for sin/sqrt/sinh
  assert.ok(isValidMathInput("si"));
  assert.ok(isValidMathInput("sin"));
  assert.ok(isValidMathInput("sqrt(16)"));
  assert.ok(isValidMathInput("cbrt(27)"));
  assert.ok(isValidMathInput("2pi"));
  assert.ok(isValidMathInput("e^2"));
  assert.ok(isValidMathInput("ans + 5"));
  assert.ok(isValidMathInput("10 mod 3"));
  assert.ok(isValidMathInput("5!"));
  assert.ok(isValidMathInput("50%"));
  assert.ok(isValidMathInput("2.5 * (3 - 1)"));

  // Rejected non-math characters and invalid words
  assert.equal(isValidMathInput("z"), false);
  assert.equal(isValidMathInput("k"), false);
  assert.equal(isValidMathInput("hello"), false);
  assert.equal(isValidMathInput("halo"), false);
  assert.equal(isValidMathInput("test"), false);
  assert.equal(isValidMathInput("abc"), false);
  assert.equal(isValidMathInput("1 + #"), false);
  assert.equal(isValidMathInput("10 @ 2"), false);
  assert.equal(isValidMathInput("sina"), false);
  assert.equal(isValidMathInput("cose"), false);

  // Sanitization of pasted input
  assert.equal(sanitizeMathInput("5 × 3 ÷ 2 − 1"), "5 * 3 / 2 - 1");
  assert.equal(sanitizeMathInput("hello 123"), "");
});

test("scientific-calculator is properly registered in tools catalog, icons, and SEO without em-dash", () => {
  const tool = toolsData.find((t) => t.slug === "scientific-calculator");
  assert.ok(tool, "scientific-calculator must exist in tools.json");
  assert.equal(tool.category, "Utilities");
  assert.equal(tool.icon, "calculator");
  assert.equal(tool.status, "available");

  // Icon registration check
  assert.ok(tool.icon in toolIcons, `Icon ${tool.icon} must be registered in toolIcons`);

  // SEO metadata check
  const seo = toolSeo["scientific-calculator"];
  assert.ok(seo, "SEO metadata must exist for scientific-calculator");
  assert.ok(!seo.title.includes("—"), "SEO title must not contain em-dash");
  assert.ok(!seo.description.includes("—"), "SEO description must not contain em-dash");
  assert.ok(!seo.note.includes("—"), "SEO note must not contain em-dash");
});
