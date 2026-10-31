"use client";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";
import type { SqlDialect, KeywordCase } from "../lib/sql";
const dialectOptions: SelectOption[] = [
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "standard", label: "Standard SQL" },
];

const caseOptions: SelectOption[] = [
  { value: "upper", label: "UPPERCASE" },
  { value: "lower", label: "lowercase" },
  { value: "preserve", label: "Preserve" },
];

const indentOptions: SelectOption[] = [
  { value: "2", label: "2 Spaces" },
  { value: "4", label: "4 Spaces" },
  { value: "tab", label: "Tabs" },
];

export function SqlOptions({
  dialect,
  keywordCase,
  indent,
  setDialect,
  setKeywordCase,
  setIndent,
}: {
  dialect: SqlDialect;
  keywordCase: KeywordCase;
  indent: string;
  setDialect: (value: SqlDialect) => void;
  setKeywordCase: (value: KeywordCase) => void;
  setIndent: (value: string) => void;
}) {
  return (
    <div className="toolbar-group" style={{ alignItems: "center", flexWrap: "wrap" }}>
      <CustomSelect
        label="Dialect"
        value={dialect}
        onChange={(val) => setDialect(val as SqlDialect)}
        options={dialectOptions}
        ariaLabel="SQL Dialect"
      />

      <CustomSelect
        label="Casing"
        value={keywordCase}
        onChange={(val) => setKeywordCase(val as KeywordCase)}
        options={caseOptions}
        ariaLabel="Keyword Casing"
      />

      <CustomSelect
        label="Indent"
        value={indent}
        onChange={(val) => setIndent(val)}
        options={indentOptions}
        ariaLabel="Indentation Size"
      />
    </div>
  );
}
