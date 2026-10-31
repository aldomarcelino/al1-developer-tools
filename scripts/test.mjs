import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
async function discover(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const nested = await Promise.all(
    entries.map((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory()
        ? discover(file)
        : /\.test\.(ts|mjs)$/.test(entry.name)
          ? [file]
          : [];
    })
  );
  return nested.flat();
}
const files = (
  await Promise.all(
    ["config", "features", "lib", "tests"].map((folder) =>
      discover(path.join(root, folder))
    )
  )
)
  .flat()
  .sort();
if (!files.length) throw new Error("No unit tests found.");
const result = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--test", ...process.argv.slice(2), ...files],
  { cwd: root, stdio: "inherit" }
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
