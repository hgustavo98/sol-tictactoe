/**
 * Downloads chess models + sounds and prepares them for production.
 * Models: https://github.com/joshwrn/3d-chess — buffers extracted to .bin
 * (embedded base64 GLTF exceeds browser data-URI limits and breaks GLTFLoader).
 * Sounds: https://github.com/AngelLunas/CHESS-3D
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const modelsDir = path.join(root, "apps/web/public/models/chess");
const soundsDir = path.join(root, "apps/web/src/assets/chess/sounds");
const MODEL_BASE =
  "https://raw.githubusercontent.com/joshwrn/3d-chess/master/public";
const SOUND_BASE =
  "https://raw.githubusercontent.com/AngelLunas/CHESS-3D/main/public";

const MODELS = ["pawn", "rook", "knight", "bishop", "queen", "king"];

const SOUNDS = [
  "move-chess.wav",
  "kill-chess.wav",
  "win-chess.mp3",
  "chess-checkmate.wav",
  "game-over.mp3",
];

function readGltf(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isValidSound(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() && stat.size > 500;
  } catch {
    return false;
  }
}

function stripGltfForCustomMaterials(gltf) {
  delete gltf.images;
  delete gltf.textures;
  delete gltf.samplers;
  delete gltf.materials;

  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      delete primitive.material;
    }
  }

  return gltf;
}

function isValidSplitModel(name) {
  const gltfPath = path.join(modelsDir, `${name}.gltf`);
  const binPath = path.join(modelsDir, `${name}.bin`);
  try {
    const gltfStat = fs.statSync(gltfPath);
    const binStat = fs.statSync(binPath);
    if (!gltfStat.isFile() || gltfStat.size > 200_000) return false;
    if (!binStat.isFile() || binStat.size < 10_000) return false;
    const gltf = readGltf(gltfPath);
    if (gltf.images?.length || gltf.textures?.length || gltf.materials?.length) {
      return false;
    }
    const buffer = gltf.buffers?.[0];
    if (!buffer?.uri || buffer.uri.startsWith("data:")) return false;
    if (buffer.uri !== `${name}.bin`) return false;
  } catch {
    return false;
  }
  return true;
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function extractEmbeddedBuffer(gltf) {
  const buffer = gltf.buffers?.[0];
  if (!buffer?.uri?.startsWith("data:")) {
    throw new Error("Expected single embedded data-URI buffer");
  }

  const base64 = buffer.uri.split(",")[1];
  if (!base64) {
    throw new Error("Malformed data URI in GLTF buffer");
  }

  const bin = Buffer.from(base64, "base64");
  if (bin.length !== buffer.byteLength) {
    throw new Error(
      `Buffer size mismatch (${bin.length} decoded vs ${buffer.byteLength} declared)`,
    );
  }

  return bin;
}

async function ensureModel(name) {
  if (isValidSplitModel(name)) return;

  fs.mkdirSync(modelsDir, { recursive: true });

  const gltfPath = path.join(modelsDir, `${name}.gltf`);
  const binPath = path.join(modelsDir, `${name}.bin`);

  process.stdout.write(`[fetch-damas-models] ${name}… `);
  const embedded = await download(`${MODEL_BASE}/${name}.gltf`);
  const gltf = JSON.parse(embedded.toString("utf8"));
  const bin = extractEmbeddedBuffer(gltf);
  gltf.buffers[0].uri = `${name}.bin`;
  stripGltfForCustomMaterials(gltf);

  fs.writeFileSync(binPath, bin);
  fs.writeFileSync(gltfPath, JSON.stringify(gltf));
  process.stdout.write(
    `gltf ${(fs.statSync(gltfPath).size / 1024).toFixed(1)} KB + bin ${(bin.length / 1_048_576).toFixed(1)} MB\n`,
  );

  if (!isValidSplitModel(name)) {
    throw new Error(`Model not valid after prepare: ${name}`);
  }
}

async function main() {
  fs.mkdirSync(soundsDir, { recursive: true });

  for (const name of MODELS) {
    await ensureModel(name);
  }

  for (const name of SOUNDS) {
    const filePath = path.join(soundsDir, name);
    if (isValidSound(filePath)) continue;

    process.stdout.write(`[fetch-damas-models] sounds/${name}… `);
    const data = await download(`${SOUND_BASE}/${name}`);
    fs.writeFileSync(filePath, data);
    process.stdout.write(`${(data.length / 1024).toFixed(1)} KB\n`);
  }

  const missingModels = MODELS.filter((name) => !isValidSplitModel(name));
  if (missingModels.length > 0) {
    console.error(
      `[fetch-damas-models] Missing models: ${missingModels.join(", ")}`,
    );
    process.exit(1);
  }

  const missingSounds = SOUNDS.filter(
    (name) => !isValidSound(path.join(soundsDir, name)),
  );
  if (missingSounds.length > 0) {
    console.error(
      `[fetch-damas-models] Missing sounds: ${missingSounds.join(", ")}`,
    );
    process.exit(1);
  }

  console.log(`[fetch-damas-models] OK → ${modelsDir}`);
}

main().catch((err) => {
  console.error("[fetch-damas-models] Failed:", err);
  process.exit(1);
});
