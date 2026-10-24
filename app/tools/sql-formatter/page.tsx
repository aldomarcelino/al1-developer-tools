import type { Metadata } from "next";
import { SqlWorkspace } from "@/components/sql-workspace";

export const metadata: Metadata = {
  title: "SQL Formatter",
  description:
    "Format, beautify, and minify SQL queries across PostgreSQL, MySQL, SQLite, and Standard SQL with clean indentation and keyword casing.",
};

export default function SqlFormatterPage() {
  return <SqlWorkspace />;
}
