/**
 * Safe, robust mathematical expression evaluator for the Scientific Calculator.
 * Supports tokenization, operator precedence, angle modes (DEG/RAD), trigonometry,
 * logarithms, powers, factorials, percentages, implicit multiplication, and error handling.
 */

export type AngleUnit = "deg" | "rad";

export interface EvaluationOptions {
  angleUnit?: AngleUnit;
  ans?: number;
}

export interface EvaluationResult {
  value: number;
  formatted: string;
}

export type TokenType =
  "number" | "ident" | "op" | "lparen" | "rparen" | "factorial" | "percent";

export interface Token {
  type: TokenType;
  value: string;
}

export const VALID_MATH_IDENTIFIERS = [
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "sinh",
  "cosh",
  "tanh",
  "ln",
  "log",
  "log2",
  "sqrt",
  "cbrt",
  "abs",
  "exp",
  "floor",
  "ceil",
  "round",
  "pi",
  "e",
  "ans",
  "mod",
] as const;

export const VALID_MATH_PREFIXES = new Set<string>();
for (const id of VALID_MATH_IDENTIFIERS) {
  for (let len = 1; len <= id.length; len++) {
    VALID_MATH_PREFIXES.add(id.slice(0, len).toLowerCase());
  }
}

/**
 * Returns true if the input contains only valid math symbols, numbers,
 * and words that are valid math functions or prefixes of valid math functions.
 */
export function isValidMathInput(input: string): boolean {
  if (!input) return true;

  // Reject any character that is not a recognized math symbol, digit, or letter
  if (/[^0-9.+\-*/^%! ()×÷−–πa-zA-Z]/.test(input)) {
    return false;
  }

  // Check every alphabetical word sequence
  const words = input.match(/[a-zA-Z]+/g);
  if (words) {
    for (const word of words) {
      if (!VALID_MATH_PREFIXES.has(word.toLowerCase())) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Sanitizes a raw pasted or typed input string by converting unicode operators
 * and filtering out characters or words not recognized by mathematical processing.
 */
export function sanitizeMathInput(input: string): string {
  if (!input) return "";

  // Normalize common unicode math symbols
  let normalized = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/[−–]/g, "-");

  // Remove any characters that are never allowed in math
  normalized = normalized.replace(/[^0-9.+\-*/^%! ()πa-zA-Z]/g, "");

  // Verify that all words are valid prefixes or identifiers
  const words = normalized.match(/[a-zA-Z]+/g);
  if (words) {
    for (const word of words) {
      if (!VALID_MATH_PREFIXES.has(word.toLowerCase())) {
        return "";
      }
    }
  }

  return normalized;
}

/**
 * Tokenize a math expression string into structured tokens.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.trim();

  while (i < s.length) {
    const ch = s[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Number (including decimals, scientific notation like 1e5 or 2.5e-3)
    if (/\d/.test(ch) || (ch === "." && i + 1 < s.length && /\d/.test(s[i + 1]))) {
      let numStr = "";
      while (i < s.length && /[\d.]/.test(s[i])) {
        numStr += s[i];
        i++;
      }
      if (i < s.length && (s[i] === "e" || s[i] === "E")) {
        const next = s[i + 1];
        if (next === "+" || next === "-" || (next && /\d/.test(next))) {
          numStr += s[i];
          i++;
          if (s[i] === "+" || s[i] === "-") {
            numStr += s[i];
            i++;
          }
          while (i < s.length && /\d/.test(s[i])) {
            numStr += s[i];
            i++;
          }
        }
      }
      tokens.push({ type: "number", value: numStr });
      continue;
    }

    // Identifiers (functions, constants, mod)
    if (/[a-zA-Zπ]/.test(ch)) {
      let ident = "";
      while (i < s.length && /[a-zA-Zπ]/.test(s[i])) {
        ident += s[i];
        i++;
      }
      if (ident.toLowerCase() === "log" && i < s.length && s[i] === "2") {
        ident += "2";
        i++;
      }
      const lower = ident.toLowerCase();
      if (lower === "mod") {
        tokens.push({ type: "op", value: "mod" });
      } else {
        tokens.push({ type: "ident", value: lower });
      }
      continue;
    }

    // Symbols and Operators
    if (ch === "(") {
      tokens.push({ type: "lparen", value: "(" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen", value: ")" });
      i++;
      continue;
    }
    if (ch === "!") {
      tokens.push({ type: "factorial", value: "!" });
      i++;
      continue;
    }
    if (ch === "%") {
      tokens.push({ type: "percent", value: "%" });
      i++;
      continue;
    }
    if (
      ch === "+" ||
      ch === "-" ||
      ch === "*" ||
      ch === "/" ||
      ch === "^" ||
      ch === "×" ||
      ch === "÷" ||
      ch === "−" ||
      ch === "–"
    ) {
      const norm =
        ch === "×" ? "*" : ch === "÷" ? "/" : ch === "−" || ch === "–" ? "-" : ch;
      tokens.push({ type: "op", value: norm });
      i++;
      continue;
    }

    throw new Error(`Unexpected character: "${ch}"`);
  }

  // Insert implicit multiplication tokens where applicable:
  // e.g. 2pi -> 2 * pi, 2(3) -> 2 * (3), (2)(3) -> (2) * (3), 5! 2 -> 5! * 2
  const expanded: Token[] = [];
  for (let k = 0; k < tokens.length; k++) {
    const curr = tokens[k];
    expanded.push(curr);
    if (k + 1 < tokens.length) {
      const next = tokens[k + 1];
      const isCurrPrimaryEnd =
        curr.type === "number" ||
        curr.type === "rparen" ||
        curr.type === "factorial" ||
        curr.type === "percent" ||
        (curr.type === "ident" &&
          (curr.value === "pi" ||
            curr.value === "π" ||
            curr.value === "e" ||
            curr.value === "ans"));

      const isNextPrimaryStart =
        next.type === "number" || next.type === "lparen" || next.type === "ident";

      if (isCurrPrimaryEnd && isNextPrimaryStart) {
        expanded.push({ type: "op", value: "*" });
      }
    }
  }

  return expanded;
}

/**
 * Computes factorial of a non-negative integer n <= 170.
 */
export function factorial(n: number): number {
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new Error("Factorial requires a non-negative integer.");
  }
  if (n > 170) {
    throw new Error("Factorial overflow (maximum input is 170).");
  }
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

/**
 * Recursive-descent parser and evaluator.
 */
export class MathParser {
  private tokens: Token[];
  private pos = 0;
  private angleUnit: AngleUnit;
  private ans: number;

  constructor(tokens: Token[], options: EvaluationOptions = {}) {
    this.tokens = tokens;
    this.angleUnit = options.angleUnit ?? "deg";
    this.ans = options.ans ?? 0;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  public parse(): number {
    if (this.tokens.length === 0) {
      throw new Error("Empty expression.");
    }
    const val = this.parseExpression();
    if (this.pos < this.tokens.length) {
      const unexpected = this.tokens[this.pos];
      throw new Error(`Unexpected token "${unexpected.value}".`);
    }
    return val;
  }

  // Expression: Term (('+' | '-') Term)*
  private parseExpression(): number {
    let left = this.parseTerm();
    while (
      this.peek()?.type === "op" &&
      (this.peek()?.value === "+" || this.peek()?.value === "-")
    ) {
      const op = this.consume().value;
      const right = this.parseTerm();
      if (op === "+") left += right;
      else left -= right;
    }
    return left;
  }

  // Term: Exponent (('*' | '/' | 'mod') Exponent)*
  private parseTerm(): number {
    let left = this.parseExponent();
    while (
      this.peek()?.type === "op" &&
      (this.peek()?.value === "*" ||
        this.peek()?.value === "/" ||
        this.peek()?.value === "mod")
    ) {
      const op = this.consume().value;
      const right = this.parseExponent();
      if (op === "*") {
        left *= right;
      } else if (op === "/") {
        if (right === 0) {
          throw new Error("Cannot divide by zero.");
        }
        left /= right;
      } else if (op === "mod") {
        if (right === 0) {
          throw new Error("Cannot modulo by zero.");
        }
        left = ((left % right) + right) % right;
      }
    }
    return left;
  }

  // Exponent: Prefix ('^' Exponent)?  (right-associative)
  private parseExponent(): number {
    const base = this.parsePrefix();
    if (this.peek()?.type === "op" && this.peek()?.value === "^") {
      this.consume();
      const exp = this.parseExponent();
      if (base === 0 && exp < 0) {
        throw new Error("Cannot divide by zero (0 to negative power).");
      }
      return Math.pow(base, exp);
    }
    return base;
  }

  // Prefix: ('+' | '-') Exponent | Postfix
  private parsePrefix(): number {
    if (
      this.peek()?.type === "op" &&
      (this.peek()?.value === "+" || this.peek()?.value === "-")
    ) {
      const op = this.consume().value;
      const val = this.parseExponent();
      return op === "-" ? -val : val;
    }
    return this.parsePostfix();
  }

  // Postfix: Primary ('!' | '%')*
  private parsePostfix(): number {
    let val = this.parsePrimary();
    while (this.peek()?.type === "factorial" || this.peek()?.type === "percent") {
      const op = this.consume().type;
      if (op === "factorial") {
        val = factorial(val);
      } else if (op === "percent") {
        val = val / 100;
      }
    }
    return val;
  }

  // Primary: number | ident (func or const) | '(' expr ')'
  private parsePrimary(): number {
    const token = this.peek();
    if (!token) {
      throw new Error("Unexpected end of expression.");
    }

    if (token.type === "number") {
      this.consume();
      const num = parseFloat(token.value);
      if (isNaN(num)) throw new Error(`Invalid number: "${token.value}".`);
      return num;
    }

    if (token.type === "lparen") {
      this.consume();
      const val = this.parseExpression();
      if (this.peek()?.type === "rparen") {
        this.consume();
      }
      // Auto-close missing closing parentheses
      return val;
    }

    if (token.type === "ident") {
      const name = this.consume().value;

      // Constants
      if (name === "pi" || name === "π") return Math.PI;
      if (name === "e") return Math.E;
      if (name === "ans") return this.ans;

      // Functions: support function with '(' or direct argument
      let arg: number;
      if (this.peek()?.type === "lparen") {
        this.consume();
        arg = this.parseExpression();
        if (this.peek()?.type === "rparen") {
          this.consume();
        }
      } else {
        arg = this.parsePrimary();
      }

      return this.applyFunction(name, arg);
    }

    throw new Error(`Unexpected token "${token.value}".`);
  }

  private applyFunction(name: string, arg: number): number {
    const isDeg = this.angleUnit === "deg";

    switch (name) {
      case "sin": {
        if (isDeg) {
          const deg = arg % 360;
          if (deg === 0 || deg === 180 || deg === -180) return 0;
          if (deg === 90 || deg === -270) return 1;
          if (deg === 270 || deg === -90) return -1;
          if (deg === 30 || deg === 150) return 0.5;
          if (deg === -30 || deg === -150) return -0.5;
          return Math.sin((arg * Math.PI) / 180);
        }
        return Math.sin(arg);
      }
      case "cos": {
        if (isDeg) {
          const deg = arg % 360;
          if (deg === 90 || deg === 270 || deg === -90 || deg === -270) return 0;
          if (deg === 0) return 1;
          if (deg === 180 || deg === -180) return -1;
          if (deg === 60 || deg === -60 || deg === 300 || deg === -300) return 0.5;
          return Math.cos((arg * Math.PI) / 180);
        }
        return Math.cos(arg);
      }
      case "tan": {
        if (isDeg) {
          const deg = ((arg % 180) + 180) % 180;
          if (deg === 90) throw new Error("Undefined (tangent of 90°).");
          if (deg === 0) return 0;
          if (deg === 45) return 1;
          if (deg === 135) return -1;
          return Math.tan((arg * Math.PI) / 180);
        }
        return Math.tan(arg);
      }
      case "asin":
      case "arcsin": {
        if (arg < -1 || arg > 1) {
          throw new Error("Invalid domain for asin [-1, 1].");
        }
        const rad = Math.asin(arg);
        return isDeg ? (rad * 180) / Math.PI : rad;
      }
      case "acos":
      case "arccos": {
        if (arg < -1 || arg > 1) {
          throw new Error("Invalid domain for acos [-1, 1].");
        }
        const rad = Math.acos(arg);
        return isDeg ? (rad * 180) / Math.PI : rad;
      }
      case "atan":
      case "arctan": {
        const rad = Math.atan(arg);
        return isDeg ? (rad * 180) / Math.PI : rad;
      }
      case "sinh":
        return Math.sinh(arg);
      case "cosh":
        return Math.cosh(arg);
      case "tanh":
        return Math.tanh(arg);
      case "ln": {
        if (arg <= 0) throw new Error("ln requires a positive number.");
        return Math.log(arg);
      }
      case "log": {
        if (arg <= 0) throw new Error("log requires a positive number.");
        return Math.log10(arg);
      }
      case "log2": {
        if (arg <= 0) throw new Error("log2 requires a positive number.");
        return Math.log2(arg);
      }
      case "sqrt": {
        if (arg < 0) {
          throw new Error("Cannot calculate square root of a negative number.");
        }
        return Math.sqrt(arg);
      }
      case "cbrt":
        return Math.cbrt(arg);
      case "abs":
        return Math.abs(arg);
      case "exp":
        return Math.exp(arg);
      case "floor":
        return Math.floor(arg);
      case "ceil":
        return Math.ceil(arg);
      case "round":
        return Math.round(arg);
      default:
        throw new Error(`Unknown function "${name}".`);
    }
  }
}

/**
 * Format calculation result cleanly for display, eliminating binary floating-point dust
 * (e.g. 0.1 + 0.2 -> 0.3) while preserving scientific precision.
 */
export function formatResult(val: number): string {
  if (!Number.isFinite(val)) {
    return isNaN(val) ? "Error" : val > 0 ? "Infinity" : "-Infinity";
  }
  if (Math.abs(val) < 1e-15) return "0";
  const num = parseFloat(val.toPrecision(12));
  if (Math.abs(num) >= 1e12 || (Math.abs(num) < 1e-6 && num !== 0)) {
    return num.toExponential().replace(/\.?0+e/, "e");
  }
  return num.toString();
}

/**
 * Evaluates a mathematical expression string and returns the raw number and clean formatted string.
 */
export function evaluateExpression(
  expression: string,
  options: EvaluationOptions = {}
): EvaluationResult {
  const tokens = tokenize(expression);
  const parser = new MathParser(tokens, options);
  const value = parser.parse();
  return {
    value,
    formatted: formatResult(value),
  };
}

/**
 * Attempt to evaluate a partially typed expression for real-time live preview.
 * Returns formatted string if valid, or null if incomplete.
 */
export function safeLivePreview(
  expression: string,
  options: EvaluationOptions = {}
): string | null {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  // Don't preview standalone single numbers or plain operators
  if (/^[+\-*/^%mod]+$/.test(trimmed)) return null;

  try {
    const result = evaluateExpression(trimmed, options);
    return result.formatted;
  } catch {
    // If it fails, try stripping trailing operator or incomplete function
    const cleaned = trimmed
      .replace(/[+\-*/^%]+$/, "")
      .replace(/\b(sin|cos|tan|asin|acos|atan|ln|log|sqrt|cbrt|abs|exp)\($/, "")
      .trim();

    if (!cleaned) return null;

    try {
      const fallbackResult = evaluateExpression(cleaned, options);
      return fallbackResult.formatted;
    } catch {
      return null;
    }
  }
}
