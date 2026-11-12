import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function copyStandaloneAssets({
  projectRoot = process.cwd(),
  distDir = process.env.NEXT_DIST_DIR || ".next",
} = {}) {
  // Traced workspace mode handles asset layouts independently in CLI build
  if (process.env.NEXT_TRACING_ROOT_MODE === "workspace") {
    return;
  }

  const standaloneDir = path.join(projectRoot, distDir, "standalone");
  if (!fs.existsSync(standaloneDir)) {
    return;
  }

  const publicSrc = path.join(projectRoot, "public");
  const publicDest = path.join(standaloneDir, "public");
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true });
    console.log(`[postbuild] Copied public/ to ${path.relative(projectRoot, publicDest)}`);
  }

  const staticSrc = path.join(projectRoot, distDir, "static");
  const staticDest = path.join(standaloneDir, distDir, "static");
  if (fs.existsSync(staticSrc)) {
    fs.cpSync(staticSrc, staticDest, { recursive: true });
    console.log(`[postbuild] Copied ${distDir}/static/ to ${path.relative(projectRoot, staticDest)}`);
  }

  const customServerSrc = path.join(projectRoot, "custom-server.js");
  const customServerDest = path.join(standaloneDir, "custom-server.js");
  if (fs.existsSync(customServerSrc)) {
    fs.copyFileSync(customServerSrc, customServerDest);
    console.log(`[postbuild] Copied custom-server.js to ${path.relative(projectRoot, customServerDest)}`);
  }
}

// Execute when run directly as CLI/npm script
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  copyStandaloneAssets();
}
