import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createHash } from "node:crypto";

const env = Object.fromEntries(
  readFileSync("../backend/.env", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const account = privateKeyToAccount(env.BACKEND_PRIVATE_KEY);
const docAbi = JSON.parse(
  readFileSync("artifacts/contracts/core/DocumentRegistry.sol/DocumentRegistry.json", "utf8"),
).abi;

const publicClient = createPublicClient({ transport: http(env.RPC_URL) });
const walletClient = createWalletClient({
  account,
  chain: undefined,
  transport: http(env.RPC_URL),
});

const pdf = readFileSync("../docs/fixtures/sample-syllabus.pdf");
const sha = createHash("sha256").update(pdf).digest("hex");
const contentHash = `0x${sha}`;

console.log("backend wallet", account.address);
console.log("registry", env.DOCUMENT_REGISTRY_ADDRESS);
console.log("hash", contentHash);

try {
  const tx = await walletClient.writeContract({
    address: env.DOCUMENT_REGISTRY_ADDRESS,
    abi: docAbi,
    chain: null,
    functionName: "registerDocument",
    args: [contentHash, "syllabus", "cohort-a"],
  });
  console.log("ok", tx);
} catch (e) {
  console.error("fail", e.shortMessage ?? e.message, e.cause?.shortMessage);
}
