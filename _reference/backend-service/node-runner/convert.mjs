// Office/image → PDF via @nutrient-sdk/node, invoked by main.py as a subprocess:
//   node convert.mjs <inputPath> <outputPath>
import { readFileSync, writeFileSync } from "node:fs";
import { load } from "@nutrient-sdk/node";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error("usage: node convert.mjs <inputPath> <outputPath>");
  process.exit(2);
}

const instance = await load({
  document: readFileSync(inputPath),
  ...(process.env.NUTRIENT_LICENSE_KEY ? { license: { key: process.env.NUTRIENT_LICENSE_KEY } } : {}),
});
const pdf = await instance.exportPDF();
await instance.close();
writeFileSync(outputPath, Buffer.from(pdf));
