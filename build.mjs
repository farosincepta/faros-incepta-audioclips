// Copies src/index.html to public/index.html as a complete web page.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = readFileSync(new URL("./src/index.html", import.meta.url), "utf8");
const page =
  '<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
  src;
mkdirSync(new URL("./public/", import.meta.url), { recursive: true });
writeFileSync(new URL("./public/index.html", import.meta.url), page);
console.log("public/index.html written");
