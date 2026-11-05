import { formatBytes } from "../format/file-size.ts";

export const MAX_PDF_FILE_SIZE = 50 * 1024 * 1024;

export function validatePdfFile(file: { name: string; size: number }): {
  valid: boolean;
  error?: string;
} {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return {
      valid: false,
      error: "Please choose a valid PDF file (.pdf extension).",
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: "Selected PDF file is empty (0 bytes).",
    };
  }

  if (file.size > MAX_PDF_FILE_SIZE) {
    return {
      valid: false,
      error: `PDF file exceeds the 50 MB limit (${formatBytes(file.size)}).`,
    };
  }

  return { valid: true };
}
