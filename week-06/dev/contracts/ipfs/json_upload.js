import fs from "node:fs";
import path from "node:path";

import {
  IPFS_DIR,
  createPinataClient,
  parseCliArgs,
  readJson,
  uploadFileToPinata,
  writeJson,
  writeText,
} from "./pinata_common.js";

const DEFAULT_IMAGE_MANIFEST = path.join(IPFS_DIR, "out", "image_uris.json");
const DEFAULT_METADATA_JSON_DIR = path.join(IPFS_DIR, "out", "metadata_json");
const DEFAULT_METADATA_OUTPUT = path.join(IPFS_DIR, "out", "metadata_uris.json");
const DEFAULT_TEXT_OUTPUT = path.join(IPFS_DIR, "out", "metadata_uris.txt");

function buildMetadata(imageRecord, { collectionName, descriptionPrefix }) {
  return {
    name: `${collectionName} - ${imageRecord.display_name}`,
    description: `${descriptionPrefix} ${imageRecord.display_name}`,
    image: imageRecord.image_uri,
    attributes: [
      { trait_type: "Prize", value: imageRecord.display_name },
      { trait_type: "Source File", value: imageRecord.file_name },
    ],
  };
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const imageManifest = path.resolve(args["image-manifest"] || DEFAULT_IMAGE_MANIFEST);
  const metadataJsonDir = path.resolve(args["metadata-json-dir"] || DEFAULT_METADATA_JSON_DIR);
  const metadataOutput = path.resolve(args["metadata-output"] || DEFAULT_METADATA_OUTPUT);
  const textOutput = path.resolve(args["text-output"] || DEFAULT_TEXT_OUTPUT);
  const collectionName = args["collection-name"] || "Karma Micro Raffle Winner";
  const descriptionPrefix = args["description-prefix"] || "Winner NFT for";

  if (!fs.existsSync(imageManifest)) {
    throw new Error(`Image URI manifest not found: ${imageManifest}`);
  }

  fs.mkdirSync(metadataJsonDir, { recursive: true });

  const imageRecords = readJson(imageManifest);
  if (!Array.isArray(imageRecords) || imageRecords.length === 0) {
    throw new Error(`Image URI manifest is empty: ${imageManifest}`);
  }

  const pinata = createPinataClient();
  const metadataRecords = [];
  const textLines = [];

  for (const [index, imageRecord] of imageRecords.entries()) {
    const metadata = buildMetadata(imageRecord, { collectionName, descriptionPrefix });
    const localMetadataPath = path.join(metadataJsonDir, `${String(index + 1).padStart(3, "0")}.json`);

    fs.writeFileSync(localMetadataPath, JSON.stringify(metadata, null, 2), "utf-8");

    const upload = await uploadFileToPinata(localMetadataPath, { pinata });
    const record = {
      file_name: imageRecord.file_name,
      display_name: imageRecord.display_name,
      image_uri: imageRecord.image_uri,
      image_gateway_url: imageRecord.image_gateway_url,
      metadata_cid: upload.cid,
      metadata_uri: upload.ipfs_uri,
      metadata_gateway_url: upload.gateway_url,
      local_metadata_json: localMetadataPath,
    };

    metadataRecords.push(record);
    textLines.push(record.metadata_uri);
    console.log(`Uploaded metadata: ${record.display_name} -> ${record.metadata_uri}`);
  }

  writeJson(metadataOutput, metadataRecords);
  writeText(textOutput, `${textLines.join("\n")}\n`);

  console.log(`\nSaved metadata URI manifest to: ${metadataOutput}`);
  console.log(`Saved metadata URI text list to: ${textOutput}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
