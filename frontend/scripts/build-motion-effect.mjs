import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const [template, font, logo, fontLicense, effectLicense] = await Promise.all([
  readFile(new URL("src/experience/effect.template.html", root), "utf8"),
  readFile(new URL("public/fonts/ibm-plex-sans-latin-wght-normal.woff2", root)),
  readFile(new URL("public/brand/uzhi-logo.webp", root)),
  readFile(new URL("public/fonts/IBM-Plex-Sans-LICENSE.txt", root), "utf8"),
  readFile(new URL("public/licenses/motion-effects.txt", root), "utf8"),
]);
const html = template.replace("__FONT__", font.toString("base64")).replace("__LOGO__", logo.toString("base64"));
const notices = `\n<!--\nMotion recipe license:\n${effectLicense}\nEmbedded IBM Plex Sans license:\n${fontLicense}\n-->\n`;
await writeFile(new URL("public/effect.html", root), html + notices);
