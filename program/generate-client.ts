import { createFromRoot } from "codama";
import { rootNodeFromAnchor } from "@codama/nodes-from-anchor";
import { renderVisitor } from "@codama/renderers-js";
import path from "path";
import { readFileSync } from "fs";

const idlPath = path.join(__dirname, "target", "idl", "proof_layer.json");
const idl = JSON.parse(readFileSync(idlPath, "utf-8"));

const codama = createFromRoot(rootNodeFromAnchor(idl));

const outputDir = path.join(
  __dirname,
  "..",
  "frontend",
  "src",
  "lib",
  "solana",
  "generated"
);

codama.accept(renderVisitor(outputDir));

console.log(`Client generated at ${outputDir}`);
