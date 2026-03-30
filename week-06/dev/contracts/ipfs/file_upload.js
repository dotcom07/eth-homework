import fs from "node:fs";
import path from "node:path";

import {
  IPFS_DIR,
  createPinataClient,
  parseCliArgs,
  uploadFileToPinata,
  writeJson,
} from "./pinata_common.js";

const DEFAULT_IMAGE_DIR = path.join(IPFS_DIR, "img");
const DEFAULT_OUTPUT = path.join(IPFS_DIR, "out", "image_uris.json");
const ALLOWED_SUFFIXES = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function getImageFiles(imageDir) {
  return fs
    .readdirSync(imageDir)
    .map((name) => path.join(imageDir, name))
    .filter((filePath) => fs.statSync(filePath).isFile())
    .filter((filePath) => ALLOWED_SUFFIXES.has(path.extname(filePath).toLowerCase()))
    .sort((left, right) => left.localeCompare(right, "ko"));
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const imageDir = path.resolve(args["image-dir"] || DEFAULT_IMAGE_DIR);
  const outputPath = path.resolve(args.output || DEFAULT_OUTPUT);

  if (!fs.existsSync(imageDir)) {
    throw new Error(`Image directory does not exist: ${imageDir}`);
  }

  const imageFiles = getImageFiles(imageDir);
  if (imageFiles.length === 0) {
    throw new Error(`No image files found in: ${imageDir}`);
  }

  const pinata = createPinataClient();
  const records = [];

  for (const filePath of imageFiles) {
    const upload = await uploadFileToPinata(filePath, { pinata });
    const fileName = path.basename(filePath);

    const record = {
      file_name: fileName,
      display_name: path.parse(fileName).name,
      cid: upload.cid,
      image_uri: upload.ipfs_uri,
      image_gateway_url: upload.gateway_url,
    };

    records.push(record);
    console.log(`Uploaded image: ${record.file_name} -> ${record.image_uri}`);
  }

  writeJson(outputPath, records);
  console.log(`\nSaved image URI list to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
