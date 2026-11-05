const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("../../frontend/node_modules/esbuild");

const root = path.resolve(__dirname, "../..");
const jsxFiles = [
  "frontend/src/pages/Dashboard/DashboardPage.jsx",
  "frontend/src/pages/Dashboard/components/DetalhesChamadoModal.jsx",
  "frontend/src/pages/Dashboard/components/RelatoResolucaoModal.jsx",
  "frontend/src/pages/Dashboard/components/ChamadoCard.jsx",
];

async function main() {
  for (const relativePath of jsxFiles) {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    await esbuild.transform(source, { loader: "jsx", sourcefile: relativePath });
    console.log(`JSX OK: ${relativePath}`);
  }

  const cssPath = "frontend/src/pages/Dashboard/DashboardPage.css";
  const css = fs.readFileSync(path.join(root, cssPath), "utf8");
  await esbuild.transform(css, { loader: "css", sourcefile: cssPath });
  console.log(`CSS OK: ${cssPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
