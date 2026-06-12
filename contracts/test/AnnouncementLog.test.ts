import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

import { expectRevert } from "./_helpers.js";

describe("AnnouncementLog", async () => {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();

  async function deployFixture() {
    const [admin, professor, student] = await viem.getWalletClients();

    const roleManager = await viem.deployContract("RoleManager", [admin.account.address]);
    const PROFESSOR_ROLE = await roleManager.read.PROFESSOR_ROLE();
    await roleManager.write.grantRole([PROFESSOR_ROLE, professor.account.address], {
      account: admin.account,
    });

    const announcementLog = await viem.deployContract("AnnouncementLog", [roleManager.address]);

    return { admin, professor, student, roleManager, announcementLog };
  }

  it("Professor can publish; students cannot publish", async () => {
    const { professor, student, announcementLog } = await deployFixture();

    const hash = ("0x" + "11".repeat(32)) as `0x${string}`;

    await announcementLog.write.publishAnnouncement([hash, "exam", ""], { account: professor.account });

    await expectRevert(
      announcementLog.write.publishAnnouncement([hash, "exam", ""], { account: student.account }),
      "AnnouncementLog: professor only",
    );
  });

  it("Storage correctness and AnnouncementPublished event fields", async () => {
    const { professor, announcementLog } = await deployFixture();

    const contentHash = ("0x" + "22".repeat(32)) as `0x${string}`;
    const category = "lecture";
    const targetGroup = "CS101-A";

    const deploymentBlock = await publicClient.getBlockNumber();
    const beforeBlock = await publicClient.getBlock();

    const txHash = await announcementLog.write.publishAnnouncement(
      [contentHash, category, targetGroup],
      { account: professor.account },
    );
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const afterBlock = await publicClient.getBlock({ blockNumber: receipt.blockNumber });

    // First announcement ID should be 1 (contract starts _nextId at 1)
    const [storedHash, storedCategory, storedTargetGroup, storedTimestamp, storedPublisher] =
      await announcementLog.read.getAnnouncement([1n]);

    assert.equal(storedHash, contentHash);
    assert.equal(storedCategory, category);
    assert.equal(storedTargetGroup, targetGroup);
    assert.equal(storedPublisher, professor.account.address);

    // Timestamp is block.timestamp, which is safely bounded by "before" and "after" block times.
    assert.ok(storedTimestamp >= beforeBlock.timestamp, "timestamp should be >= before block timestamp");
    assert.ok(storedTimestamp <= afterBlock.timestamp, "timestamp should be <= tx block timestamp");

    const events = await publicClient.getContractEvents({
      address: announcementLog.address,
      abi: announcementLog.abi,
      eventName: "AnnouncementPublished",
      fromBlock: deploymentBlock,
      strict: true,
    });

    assert.equal(events.length, 1);
    const ev = events[0];

    assert.equal(ev.args.id, 1n);
    assert.equal(ev.args.contentHash, contentHash);
    assert.equal(ev.args.publisher, professor.account.address);
    assert.equal(ev.args.category, category);
    assert.equal(ev.args.targetGroup, targetGroup);
    assert.equal(ev.args.timestamp, storedTimestamp);
  });
});

