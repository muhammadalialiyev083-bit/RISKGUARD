import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const [effectTemplate, backgroundTemplate, tokens, font, logo, fontLicense, effectLicense] = await Promise.all([
  readFile(new URL("src/experience/effect.template.html", root), "utf8"),
  readFile(new URL("src/experience/motion-background.template.html", root), "utf8"),
  readFile(new URL("src/styles/tokens.css", root), "utf8"),
  readFile(new URL("public/fonts/montserrat-medium.woff2", root)),
  readFile(new URL("public/brand/uzhi-logo.svg", root)),
  readFile(new URL("public/fonts/Montserrat-OFL.txt", root), "utf8"),
  readFile(new URL("public/licenses/motion-effects.txt", root), "utf8"),
]);
const fontData = font.toString("base64");
const logoData = logo.toString("base64");
const fontNotice = `\n<!--\nEmbedded Montserrat Medium license:\n${fontLicense.replace(/[ \t]+$/gm, "")}\n-->\n`;
const effectNotice = `\n<!--\nMotion recipe license:\n${effectLicense}\n-->\n`;

function embedAssets(template) {
  return template
    .replace("__TOKENS__", () => tokens)
    .replace("__FONT__", fontData)
    .replace("__LOGO__", logoData);
}

await Promise.all([
  writeFile(new URL("public/effect.html", root), embedAssets(effectTemplate) + effectNotice + fontNotice),
  writeFile(new URL("public/motion-background-preview.html", root), embedAssets(backgroundTemplate) + fontNotice),
]);
