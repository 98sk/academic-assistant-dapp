/** Block explorer URLs by chain ID (Etherscan family + local placeholder). */
export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const hash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  switch (chainId) {
    case 1:
      return `https://etherscan.io/tx/${hash}`;
    case 11155111:
      return `https://sepolia.etherscan.io/tx/${hash}`;
    case 31337:
      return `http://127.0.0.1:8545/tx/${hash}`;
    default:
      return `https://etherscan.io/tx/${hash}`;
  }
}

export function getExplorerAddressUrl(chainId: number, address: string): string {
  const addr = address.startsWith("0x") ? address : `0x${address}`;
  switch (chainId) {
    case 1:
      return `https://etherscan.io/address/${addr}`;
    case 11155111:
      return `https://sepolia.etherscan.io/address/${addr}`;
    case 31337:
      return `http://127.0.0.1:8545/address/${addr}`;
    default:
      return `https://etherscan.io/address/${addr}`;
  }
}
