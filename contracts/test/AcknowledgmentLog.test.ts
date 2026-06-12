import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

import { expectRevert } from "./_helpers.js";

describe("AcknowledgmentLog", async () => {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();

  async function deployFixture() {
    const [admin, professor, student, outsider] = await viem.getWalletClients();

    const roleManager = await viem.deployContract("RoleManager", [admin.account.address]);
    const PROFESSOR_ROLE = await roleManager.read.PROFESSOR_ROLE();
    const STUDENT_ROLE = await roleManager.read.STUDENT_ROLE();

    await roleManager.write.grantRole([PROFESSOR_ROLE, professor.account.address], {
      account: admin.account,
    });
    await roleManager.write.grantRole([STUDENT_ROLE, student.account.address], {
      account: admin.account,
    });

    // Group assignment used for group-targeted announcements
    await roleManager.write.assignGroup([student.account.address, "CS101-A"], { account: admin.account });

    const announcementLog = await viem.deployContract("AnnouncementLog", [roleManager.address]);
    const acknowledgmentLog = await viem.deployContract("AcknowledgmentLog", [
      roleManager.address,
      announcementLog.address,
    ]);

    return { admin, professor, student, outsider, roleManager, announcementLog, acknowledgmentLog };
  }

  async function publishAnnouncement(
    announcementLog: any,
    professor: any,
    contentHash: `0x${string}`,
    category: string,
    targetGroup: string,
  ): Promise<1n | bigint> {
    await announcementLog.write.publishAnnouncement([contentHash, category, targetGroup], {
      account: professor.account,
    });
    // The first published ID in a fresh fixture is 1.
    return 1n;
  }

  it("Students can acknowledge announcements; Acknowledged event emission", async () => {
    const { professor, student, announcementLog, acknowledgmentLog } = await deployFixture();

    const fromBlock = await publicClient.getBlockNumber();
    const announcementId = await publishAnnouncement(
      announcementLog,
      professor,
      ("0x" + "66".repeat(32)) as `0x${string}`,
      "general",
      "",
    );

    const beforeBlock = await publicClient.getBlock();
    const txHash = await acknowledgmentLog.write.acknowledge([announcementId], { account: student.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const afterBlock = await publicClient.getBlock({ blockNumber: receipt.blockNumber });

    assert.equal(await acknowledgmentLog.read.hasAcknowledged([announcementId, student.account.address]), true);
    const ts = await acknowledgmentLog.read.getAcknowledgmentTimestamp([
      announcementId,
      student.account.address,
    ]);

    assert.ok(ts >= beforeBlock.timestamp);
    assert.ok(ts <= afterBlock.timestamp);

    const events = await publicClient.getContractEvents({
      address: acknowledgmentLog.address,
      abi: acknowledgmentLog.abi,
      eventName: "Acknowledged",
      fromBlock,
      strict: true,
    });

    // One Acknowledged event emitted
    assert.equal(events.length, 1);
    const ev = events[0];
    assert.equal(ev.args.student, student.account.address);
    assert.equal(ev.args.announcementId, announcementId);
    assert.equal(ev.args.timestamp, ts);
  });

  it("Duplicate acknowledgments are prevented", async () => {
    const { professor, student, announcementLog, acknowledgmentLog } = await deployFixture();

    const announcementId = await publishAnnouncement(
      announcementLog,
      professor,
      ("0x" + "77".repeat(32)) as `0x${string}`,
      "general",
      "",
    );

    await acknowledgmentLog.write.acknowledge([announcementId], { account: student.account });

    await expectRevert(
      acknowledgmentLog.write.acknowledge([announcementId], { account: student.account }),
      "AcknowledgmentLog: already acknowledged",
    );
  });

  it("Unauthorized acknowledgments revert (student role required)", async () => {
    const { professor, outsider, announcementLog, acknowledgmentLog } = await deployFixture();

    const announcementId = await publishAnnouncement(
      announcementLog,
      professor,
      ("0x" + "88".repeat(32)) as `0x${string}`,
      "general",
      "",
    );

    await expectRevert(
      acknowledgmentLog.write.acknowledge([announcementId], { account: outsider.account }),
      "AcknowledgmentLog: student only",
    );
  });

  it("Group-targeted announcements can only be acknowledged by matching group", async () => {
    const { admin, professor, student, outsider, roleManager, announcementLog, acknowledgmentLog } =
      await deployFixture();

    // Give outsider a student role but no / wrong group
    const STUDENT_ROLE = await roleManager.read.STUDENT_ROLE();
    await roleManager.write.grantRole([STUDENT_ROLE, outsider.account.address], { account: admin.account });
    await roleManager.write.assignGroup([outsider.account.address, "CS101-B"], { account: admin.account });

    const announcementId = await publishAnnouncement(
      announcementLog,
      professor,
      ("0x" + "99".repeat(32)) as `0x${string}`,
      "general",
      "CS101-A",
    );

    // correct group succeeds
    await acknowledgmentLog.write.acknowledge([announcementId], { account: student.account });
    assert.equal(await acknowledgmentLog.read.hasAcknowledged([announcementId, student.account.address]), true);

    // wrong group reverts
    await expectRevert(
      acknowledgmentLog.write.acknowledge([announcementId], { account: outsider.account }),
      "AcknowledgmentLog: wrong group",
    );
  });
});

