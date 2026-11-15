import test from "node:test";
import assert from "node:assert/strict";
import { toggleExpressionSign } from "./toggle-sign.ts";
import { evaluateExpression } from "./evaluator.ts";

test("sign toggles numbers, decimals, and scientific notation", () => {
  for (const value of ["5", "0.5", ".25", "1e-7"]) {
    assert.equal(toggleExpressionSign(value), `-${value}`);
    assert.equal(toggleExpressionSign(toggleExpressionSign(value)), value);
  }
  assert.equal(toggleExpressionSign(""), "-");
  assert.equal(toggleExpressionSign("-"), "");
});

test("sign negates the whole expression and preserves precedence", () => {
  for (const value of ["2 + 5", "2^2", "sin(30)", "-(2)+5", "sqrt(16)"]) {
    const negated = toggleExpressionSign(value);
    assert.equal(evaluateExpression(negated).value, -evaluateExpression(value).value);
    assert.equal(toggleExpressionSign(negated), value);
  }
});
