import { defineConfig } from "hardhat/config";
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import hardhatViem from "@nomicfoundation/hardhat-viem";

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL;
const sepoliaPrivateKey = process.env.SEPOLIA_PRIVATE_KEY;
const HARDHAT_MNEMONIC =
  "test test test test test test test test test test test junk";

// Use env vars when provided; otherwise fall back to a local URL for convenience.
// This keeps `hardhat compile` working even without Sepolia env vars.
const sepoliaAccounts = sepoliaPrivateKey ? [sepoliaPrivateKey] : [];
const localFallbackRpcUrl = "http://127.0.0.1:8545";

export default defineConfig({
  plugins: [hardhatNodeTestRunner, hardhatViem],
  paths: {
    // Hardhat project root is `repoRoot/contracts`, so `contracts` maps to `repoRoot/contracts/contracts/**`.
    sources: "contracts",
    tests: {
      nodejs: "test",
    },
    cache: "cache",
    artifacts: "artifacts",
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
    },
    localhost: {
      type: "http",
      url: localFallbackRpcUrl,
      accounts: sepoliaAccounts.length > 0 ? sepoliaAccounts : { mnemonic: HARDHAT_MNEMONIC, count: 10 },
    },
    sepolia: {
      type: "http",
      url: sepoliaRpcUrl ?? localFallbackRpcUrl,
      accounts: sepoliaAccounts,
    },
  },
});
