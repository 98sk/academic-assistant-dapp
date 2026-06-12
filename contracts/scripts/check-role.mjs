import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const account = privateKeyToAccount(key);
const dep = JSON.parse(readFileSync("deployments/localhost.json", "utf8"));
const roleAbi = JSON.parse(
  readFileSync("artifacts/contracts/core/RoleManager.sol/RoleManager.json", "utf8"),
).abi;
const docAbi = JSON.parse(
  readFileSync("artifacts/contracts/core/DocumentRegistry.sol/DocumentRegistry.json", "utf8"),
).abi;

const client = createPublicClient({ transport: http("http://127.0.0.1:8545") });
const wallet = createWalletClient({
  account,
  transport: http("http://127.0.0.1:8545"),
});

const prof = await client.readContract({
  address: dep.contracts.RoleManager,
  abi: roleAbi,
  functionName: "PROFESSOR_ROLE",
});
const has = await client.readContract({
  address: dep.contracts.RoleManager,
  abi: roleAbi,
  functionName: "hasRole",
  args: [prof, account.address],
});
console.log("wallet", account.address, "professor", has);

const hash =
  "0x1111111111111111111111111111111111111111111111111111111111111111";
try {
  const tx = await wallet.writeContract({
    address: dep.contracts.DocumentRegistry,
    abi: docAbi,
    functionName: "registerDocument",
    args: [hash, "syllabus", "cohort-a"],
  });
  console.log("register tx", tx);
} catch (e) {
  console.error("register failed", e.shortMessage ?? e.message);
}
