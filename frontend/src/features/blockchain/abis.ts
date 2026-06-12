/** Minimal ABIs for wallet writeContract / readContract (full artifacts stay on backend). */
export const announcementAbi = [
  {
    type: "function",
    name: "publishAnnouncement",
    stateMutability: "nonpayable",
    inputs: [
      { name: "contentHash", type: "bytes32" },
      { name: "category", type: "string" },
      { name: "targetGroup", type: "string" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "event",
    name: "AnnouncementPublished",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "contentHash", type: "bytes32", indexed: true },
      { name: "publisher", type: "address", indexed: true },
      { name: "category", type: "string", indexed: false },
      { name: "targetGroup", type: "string", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export const acknowledgmentAbi = [
  {
    type: "function",
    name: "acknowledge",
    stateMutability: "nonpayable",
    inputs: [{ name: "announcementId", type: "uint256" }],
    outputs: [],
  },
] as const;

export const documentRegistryAbi = [
  {
    type: "function",
    name: "verifyDocument",
    stateMutability: "view",
    inputs: [{ name: "contentHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
