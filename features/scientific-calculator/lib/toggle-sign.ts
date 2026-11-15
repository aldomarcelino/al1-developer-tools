/** Negate the whole expression without changing its operator precedence. */
export function toggleExpressionSign(expression: string): string {
  const value = expression.trim();
  if (!value) return "-";
  if (value === "-") return "";
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) {
    return value.startsWith("-") ? value.slice(1) : `-${value}`;
  }
  if (value.startsWith("-(") && value.endsWith(")")) {
    let depth = 0;
    for (let i = 1; i < value.length; i++) {
      if (value[i] === "(") depth++;
      if (value[i] === ")") depth--;
      if (depth === 0) {
        if (i === value.length - 1) return value.slice(2, -1);
        break;
      }
    }
  }
  return `-(${value})`;
}
