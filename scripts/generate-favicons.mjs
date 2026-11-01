import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");

const sizes = [
  { size: 16, name: "favicon-16x16.png" },
  { size: 32, name: "favicon-32x32.png" },
  { size: 180, name: "apple-touch-icon.png" },
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
];

const svgContent = fs.readFileSync(path.join(publicDir, "favicon.svg"), "utf-8");

for (const { size, name } of sizes) {
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${size}px; height: ${size}px; background: transparent; overflow: hidden; }
    svg { width: ${size}px; height: ${size}px; display: block; }
  </style>
</head>
<body>
${svgContent}
</body>
</html>`;

  const tmpHtml = path.join(publicDir, `_temp_${size}.html`);
  const outputPath = path.join(publicDir, name);

  fs.writeFileSync(tmpHtml, htmlContent);

  try {
    execSync(
      `google-chrome --headless --disable-gpu --hide-scrollbars --window-size=${size},${size} --screenshot="${outputPath}" "file://${tmpHtml}"`,
      { stdio: "ignore" }
    );
    console.log(`Generated ${name} (${size}x${size})`);
  } catch (err) {
    console.error(`Failed generating ${name}:`, err);
  } finally {
    if (fs.existsSync(tmpHtml)) {
      fs.unlinkSync(tmpHtml);
    }
  }
}

console.log("All favicon PNGs generated successfully.");
