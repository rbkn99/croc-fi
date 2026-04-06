import { createFromRoot } from "codama";
import { rootNodeFromAnchor } from "@codama/nodes-from-anchor";
import { renderVisitor } from "@codama/renderers-js";
import { readFileSync } from "fs";
import { join } from "path";

// --- proof_layer ---
const proofLayerIdl = JSON.parse(
  readFileSync(join(__dirname, "target/idl/proof_layer.json"), "utf-8")
);
const proofLayerCodama = createFromRoot(rootNodeFromAnchor(proofLayerIdl));
proofLayerCodama.accept(
  renderVisitor(join(__dirname, "clients/js/proof-layer"), {
    dependencyMap: {},
  })
);
console.log("✅ proof-layer client generated");

// --- proof_layer_hook ---
const hookIdl = JSON.parse(
  readFileSync(join(__dirname, "target/idl/proof_layer_hook.json"), "utf-8")
);
const hookCodama = createFromRoot(rootNodeFromAnchor(hookIdl));
hookCodama.accept(
  renderVisitor(join(__dirname, "clients/js/proof-layer-hook"), {
    dependencyMap: {},
  })
);
console.log("✅ proof-layer-hook client generated");
