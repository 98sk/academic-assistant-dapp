import type { Abi, Hash, PublicClient, TransactionReceipt } from 'viem';
import { decodeEventLog, getAddress, parseEventLogs } from 'viem';

export function assertReceiptSucceeded(receipt: TransactionReceipt): void {
  if (receipt.status === 'reverted') {
    throw new Error(
      'Transaction reverted on-chain. Check PROFESSOR_ROLE, contract addresses in backend/.env, and Hardhat node (chainId 31337).',
    );
  }
}

/** Parse AnnouncementPublished id from a publish transaction receipt. */
export async function extractAnnouncementPublishedId(opts: {
  receipt: TransactionReceipt;
  contractAddress: `0x${string}`;
  abi: Abi;
  publicClient?: PublicClient;
  transactionHash?: Hash;
}): Promise<string | undefined> {
  const contract = getAddress(opts.contractAddress);
  const relevantLogs = opts.receipt.logs.filter((log) => getAddress(log.address) === contract);

  const parsed = parseEventLogs({
    abi: opts.abi,
    logs: relevantLogs,
    eventName: 'AnnouncementPublished',
  });
  if (parsed.length > 0) {
    const id = (parsed[0]!.args as { id: bigint }).id;
    return id.toString();
  }

  for (const log of relevantLogs) {
    try {
      const decoded = decodeEventLog({
        abi: opts.abi,
        eventName: 'AnnouncementPublished',
        data: log.data,
        topics: log.topics,
      });
      return (decoded.args as { id: bigint }).id.toString();
    } catch {
      // not AnnouncementPublished
    }
  }

  if (opts.publicClient && opts.transactionHash) {
    const events = await opts.publicClient.getContractEvents({
      address: contract,
      abi: opts.abi,
      eventName: 'AnnouncementPublished',
      fromBlock: opts.receipt.blockNumber,
      toBlock: opts.receipt.blockNumber,
    });
    const match = events.find((e) => e.transactionHash === opts.transactionHash);
    const id = (match?.args as { id?: bigint } | undefined)?.id;
    if (id !== undefined) return id.toString();
  }

  return undefined;
}
