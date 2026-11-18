import { printParseErrorCode, visit } from "jsonc-parser";
import type { JsonErrorInfo } from "./json";

const messages: Record<string, string> = {
  InvalidSymbol:
    "Unexpected token. Use a JSON string, number, object, array, true, false, or null.",
  InvalidNumberFormat: "Invalid number format.",
  PropertyNameExpected:
    "Expected a property name in double quotes. Remove any trailing comma.",
  ValueExpected: "Expected a JSON value. Check for a missing value or trailing comma.",
  ColonExpected: "Expected ':' after the property name.",
  CommaExpected: "Expected ',' between properties or array items.",
  CloseBraceExpected: "Expected '}' to close the object.",
  CloseBracketExpected: "Expected ']' to close the array.",
  EndOfFileExpected: "Unexpected content after the JSON value.",
  InvalidCommentToken: "Comments are not allowed in JSON.",
  UnexpectedEndOfComment: "Unterminated comment. Comments are not allowed in JSON.",
  UnexpectedEndOfString: "Unterminated string. Add a closing double quote.",
  UnexpectedEndOfNumber: "Incomplete number. Add the missing digits.",
  InvalidUnicode: "Invalid Unicode escape. Use four hexadecimal digits after \\u.",
  InvalidEscapeCharacter: "Invalid escape sequence in string.",
  InvalidCharacter:
    "Invalid character in string. Escape control characters such as newlines.",
};

/** Collect recoverable syntax errors against the text displayed in the input editor. */
export function collectJsonErrors(input: string): JsonErrorInfo[] {
  if (!input.trim()) {
    return [{ message: "Add some JSON to get started.", line: null, column: null }];
  }

  const errors: JsonErrorInfo[] = [];
  const seen = new Set<string>();
  const locations = new Set<number>();
  try {
    visit(
      input,
      {
        onError(code, offset, _length, startLine, startCharacter) {
          const key = `${offset}:${code}`;
          const name = printParseErrorCode(code);
          // Recovery can report a second generic error for the same broken token.
          // Keep distinct missing closing delimiters at EOF.
          if (
            seen.has(key) ||
            (locations.has(offset) &&
              name !== "CloseBraceExpected" &&
              name !== "CloseBracketExpected")
          )
            return;
          seen.add(key);
          locations.add(offset);
          errors.push({
            message: messages[name] ?? "Invalid JSON syntax.",
            line: startLine + 1,
            column: startCharacter + 1,
          });
        },
      },
      { disallowComments: true, allowTrailingComma: false, allowEmptyContent: false }
    );
  } catch {
    errors.push({
      message:
        "JSON nesting is too deep to validate. Reduce the number of nested objects or arrays.",
      line: null,
      column: null,
    });
  }
  return errors.sort(
    (a, b) =>
      (a.line ?? Infinity) - (b.line ?? Infinity) || (a.column ?? 0) - (b.column ?? 0)
  );
}
