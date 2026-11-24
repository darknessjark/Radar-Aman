// Lets plain Node run the Next.js lib files: adds ".js" to extensionless imports and maps "@/".
import { register } from "node:module";
import { pathToFileURL } from "node:url";
const root = pathToFileURL(process.cwd() + "/").href;
register("data:text/javascript," + encodeURIComponent(`
import { existsSync } from "node:fs"; import { fileURLToPath } from "node:url";
export async function resolve(spec, ctx, next) {
  if (spec.startsWith("@/")) spec = ${JSON.stringify(root)} + spec.slice(2);
  if ((spec.startsWith(".") || spec.startsWith("file:")) && !/\\.(m?js|json)$/.test(spec)) {
    const u = new URL(spec, ctx.parentURL); if (existsSync(fileURLToPath(u) + ".js")) return next(u.href + ".js", ctx);
  }
  return next(spec, ctx);
}`));
