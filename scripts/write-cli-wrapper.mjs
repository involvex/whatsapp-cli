import { writeFileSync } from "node:fs";
import { chmodSync } from "node:fs";

const wrapper = `#!/usr/bin/env node
import "./cli.js";
`;

writeFileSync("dist/cli-wrapper.js", wrapper, "utf8");

try {
  chmodSync("dist/cli-wrapper.js", 0o755);
} catch {
  // chmod is best-effort on Windows
}
