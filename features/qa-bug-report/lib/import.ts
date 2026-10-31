import { bytes, limits } from "./model.ts";
import { importHar } from "./har.ts";
import { validatePackage } from "./validate.ts";
export function importEvidence(text: string) {
  if (bytes(text) > limits.importBytes)
    throw new Error("File exceeds 12 MiB. Export a smaller session.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      "Invalid JSON. Choose a Ramupod evidence JSON package or HAR 1.2 file."
    );
  }
  if (value && typeof value === "object" && "log" in value)
    return validatePackage(importHar(value));
  return validatePackage(value);
}
