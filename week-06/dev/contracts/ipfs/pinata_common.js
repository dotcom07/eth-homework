import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { PinataSDK } from "pinata";

export const IPFS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(IPFS_DIR, "..");
export const ENV_PATH = path.join(PROJECT_ROOT, ".env");
export const DEFAULT_GATEWAY = "chocolate-elegant-otter-530.mypinata.cloud";

dotenv.config({ path: ENV_PATH });

export function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getGatewayDomain() {
  return process.env.PINATA_GATEWAY || DEFAULT_GATEWAY;
}

export function createPinataClient() {
  const pinataJwt = getRequiredEnv("PINATA_JWT");
  const pinataGateway = getGatewayDomain();

  return new PinataSDK({
    pinataJwt,
    pinataGateway,
  });
}

export function toIpfsUri(cid) {
  return `ipfs://${cid}`;
}

export function toGatewayUrl(cid) {
  return `https://${getGatewayDomain()}/ipfs/${cid}`;
}

export function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeJson(filePath, value) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

export function writeText(filePath, value) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, value, "utf-8");
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function parseCliArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

export function getMimeType(fileName) {
  const extension = path.extname(fileName).toLowerCase();

  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

export async function uploadFileToPinata(filePath, { pinata = createPinataClient(), fileName } = {}) {
  const resolvedPath = path.resolve(filePath);
  const buffer = fs.readFileSync(resolvedPath);
  const name = fileName || path.basename(resolvedPath);
  const file = new File([buffer], name, { type: getMimeType(name) });

  const upload = await pinata.upload.public.file(file);

  return {
    id: upload.id,
    cid: upload.cid,
    name: upload.name || name,
    ipfs_uri: toIpfsUri(upload.cid),
    gateway_url: toGatewayUrl(upload.cid),
  };
}
