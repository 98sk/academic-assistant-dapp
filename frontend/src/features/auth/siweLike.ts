export type AuthMessageFields = {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: "1";
  chainId: number;
  nonce: string;
  issuedAt: string;
};

export function buildAuthMessage(fields: AuthMessageFields) {
  const { domain, address, statement, uri, version, chainId, nonce, issuedAt } = fields;
  const header = `${domain} wants you to sign in with your Ethereum account:`;
  const lines: string[] = [header, address, "", statement ?? "Sign in to the academic assistant backend.", ""];
  lines.push(`URI: ${uri}`);
  lines.push(`Version: ${version}`);
  lines.push(`Chain ID: ${chainId}`);
  lines.push(`Nonce: ${nonce}`);
  lines.push(`Issued At: ${issuedAt}`);
  return lines.join("\n");
}

