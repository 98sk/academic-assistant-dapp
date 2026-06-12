import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Abi } from 'viem';
import { getContract } from 'viem';

import { env } from '../../config/env.js';
import { publicClient, walletClient } from './client.js';

type Artifact = { abi: Abi };

function backendRootDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', '..', '..');
}

function defaultArtifactsDir() {
  // repoRoot/contracts/artifacts/contracts/core/*
  return path.resolve(backendRootDir(), '..', 'contracts', 'artifacts', 'contracts', 'core');
}

async function loadAbiFromArtifact(contractName: string): Promise<Abi> {
  const artifactsDir = env.CONTRACTS_ARTIFACTS_DIR
    ? path.resolve(backendRootDir(), env.CONTRACTS_ARTIFACTS_DIR)
    : defaultArtifactsDir();

  const artifactPath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);
  const raw = await readFile(artifactPath, 'utf8');
  const parsed = JSON.parse(raw) as Artifact;
  return parsed.abi;
}

let cached: null | {
  announcementAbi: Abi;
  roleManagerAbi: Abi;
  documentRegistryAbi: Abi;
  acknowledgmentAbi: Abi;
} = null;

export async function getAbis() {
  if (cached) return cached;
  const [announcementAbi, roleManagerAbi, documentRegistryAbi, acknowledgmentAbi] = await Promise.all([
    loadAbiFromArtifact('AnnouncementLog'),
    loadAbiFromArtifact('RoleManager'),
    loadAbiFromArtifact('DocumentRegistry'),
    loadAbiFromArtifact('AcknowledgmentLog'),
  ]);
  cached = { announcementAbi, roleManagerAbi, documentRegistryAbi, acknowledgmentAbi };
  return cached;
}

export async function getContracts() {
  const { announcementAbi, roleManagerAbi, documentRegistryAbi, acknowledgmentAbi } = await getAbis();

  const roleManager = getContract({
    abi: roleManagerAbi,
    address: env.ROLE_MANAGER_ADDRESS,
    client: { public: publicClient, wallet: walletClient },
  });

  const announcementLog = getContract({
    abi: announcementAbi,
    address: env.ANNOUNCEMENT_LOG_ADDRESS,
    client: { public: publicClient, wallet: walletClient },
  });

  const documentRegistry = getContract({
    abi: documentRegistryAbi,
    address: env.DOCUMENT_REGISTRY_ADDRESS,
    client: { public: publicClient, wallet: walletClient },
  });

  const acknowledgmentLog = getContract({
    abi: acknowledgmentAbi,
    address: env.ACK_LOG_ADDRESS,
    client: { public: publicClient, wallet: walletClient },
  });

  return { roleManager, announcementLog, documentRegistry, acknowledgmentLog };
}

