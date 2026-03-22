import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(packageRoot, ".env");

if (existsSync(envPath)) {
  config({ path: envPath });
}
