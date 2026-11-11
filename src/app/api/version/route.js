import pkg from "../../../../package.json" with { type: "json" };

export async function GET() {
  return Response.json({
    version: pkg.version,
    currentVersion: pkg.version,
  });
}
