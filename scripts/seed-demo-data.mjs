/**
 * Seeds local demo data and prints auth sessions for browser screenshot injection.
 * Usage: node scripts/seed-demo-data.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
// When copied under contracts/scripts/, go up one more level
const root =
  path.basename(path.resolve(__dirname, "..")) === "contracts"
    ? path.resolve(__dirname, "..", "..")
    : repoRoot;
const API = process.env.API_BASE_URL ?? "http://localhost:4000";
const PDF_PATH = path.join(root, "docs", "fixtures", "sample-syllabus.pdf");

const PROFESSOR_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const STUDENT_KEY =
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

function buildAuthMessage({ domain, address, uri, chainId, nonce, issuedAt }) {
  const lines = [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to the academic assistant backend.",
    "",
    `URI: ${uri}`,
    "Version: 1",
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ];
  return lines.join("\n");
}

async function login(privateKey) {
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    transport: http("http://127.0.0.1:8545"),
  });

  const nonceRes = await fetch(`${API}/api/auth/nonce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: account.address }),
  });
  if (!nonceRes.ok) throw new Error(`nonce failed: ${await nonceRes.text()}`);
  const noncePayload = await nonceRes.json();

  const message = buildAuthMessage({
    domain: noncePayload.domain,
    address: account.address,
    uri: noncePayload.uri,
    chainId: noncePayload.chainId,
    nonce: noncePayload.nonce,
    issuedAt: noncePayload.issuedAt,
  });

  const signature = await walletClient.signMessage({ message });
  const verifyRes = await fetch(`${API}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: account.address,
      signature,
      message,
      nonce: noncePayload.nonce,
      issuedAt: noncePayload.issuedAt,
      chainId: noncePayload.chainId,
    }),
  });
  if (!verifyRes.ok) throw new Error(`verify failed: ${await verifyRes.text()}`);
  const verify = await verifyRes.json();
  const session = {
    token: verify.token,
    address: verify.address,
    chainId: verify.chainId,
    roles: verify.roles,
    group: verify.group,
    expiresAtMs: Date.now() + verify.expiresInSeconds * 1000,
  };
  return { account: account.address, session, token: verify.token };
}

function zustandPersist(session) {
  return JSON.stringify({
    state: { status: "authenticated", session },
    version: 0,
  });
}

async function uploadDocument(token) {
  const form = new FormData();
  const base = readFileSync(PDF_PATH);
  const stamp = Buffer.from(`\n% seed ${Date.now()}\n`);
  const bytes = Buffer.concat([base, stamp]);
  form.append(
    "file",
    new Blob([bytes], { type: "application/pdf" }),
    `sample-syllabus-${Date.now()}.pdf`,
  );
  form.append("documentType", "syllabus");
  form.append("targetGroup", "cohort-a");

  const res = await fetch(`${API}/api/documents/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`upload failed: ${await res.text()}`);
  return res.json();
}

async function publishAnnouncement(token) {
  const res = await fetch(`${API}/api/announcements/publish`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Devoir blockchain — remise 15 juin",
      category: "assignment",
      targetGroup: "cohort-a",
      body: "Merci de déposer votre rapport sur la plateforme DAA avant le 15 juin 2026 à 23h59. Le hash du PDF sera enregistré on-chain.",
      mode: "relay",
    }),
  });
  if (!res.ok) throw new Error(`announcement failed: ${await res.text()}`);
  return res.json();
}

async function acknowledgeAnnouncement(token, announcementId) {
  const res = await fetch(`${API}/api/acknowledge`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ announcementId, mode: "relay" }),
  });
  if (!res.ok) throw new Error(`ack failed: ${await res.text()}`);
  return res.json();
}

async function askAssistant(token, question) {
  const res = await fetch(`${API}/api/assistant/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`chat failed: ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log("Logging in professor…");
  const professor = await login(PROFESSOR_KEY);
  console.log("Logging in student…");
  const student = await login(STUDENT_KEY);

  console.log("Uploading sample PDF…");
  const doc = await uploadDocument(professor.token);
  console.log("Publishing announcement…");
  const ann = await publishAnnouncement(professor.token);
  const announcementId = ann.announcementId ?? ann.id;
  if (!announcementId) throw new Error(`publish missing announcementId: ${JSON.stringify(ann)}`);
  let ack = null;
  try {
    console.log("Student acknowledge (backend relay)…");
    ack = await acknowledgeAnnouncement(student.token, announcementId);
  } catch (e) {
    console.warn("Ack skipped:", e.message);
  }

  let assistantAnswer;
  try {
    assistantAnswer = await askAssistant(student.token, "Quelle est la date limite du devoir ?");
  } catch (e) {
    console.warn("Assistant chat skipped:", e.message);
  }

  const out = {
    professor: {
      address: professor.account,
      localStorage: zustandPersist(professor.session),
      documentId: doc.id,
      announcementId,
    },
    student: {
      address: student.account,
      localStorage: zustandPersist(student.session),
      ackTxHash: ack?.transactionHash ?? ack?.txHash ?? null,
    },
    routes: {
      settings: "/settings",
      documents: "/documents",
      documentDetail: `/documents/${doc.id}`,
      announcements: "/announcements",
      announcementDetail: `/announcements/${announcementId}`,
      analytics: "/analytics",
      assistant: "/assistant",
      dashboard: "/",
    },
    assistantAnswer,
  };

  const outPath = path.join(root, "docs", "screenshots", "demo-session.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
