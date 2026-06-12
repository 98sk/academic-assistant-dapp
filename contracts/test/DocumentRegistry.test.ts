import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

import { expectRevert } from "./_helpers.js";

describe("DocumentRegistry", async () => {
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

    const documentRegistry = await viem.deployContract("DocumentRegistry", [roleManager.address]);

    return { admin, professor, student, outsider, roleManager, documentRegistry };
  }

  it("registerDocument stores hashes correctly; verifyDocument(hash)", async () => {
    const { professor, documentRegistry } = await deployFixture();

    const contentHash = ("0x" + "33".repeat(32)) as `0x${string}`;
    const documentType = "syllabus";
    const targetGroup = "CS101-A";

    const beforeBlock = await publicClient.getBlock();
    await documentRegistry.write.registerDocument([contentHash, documentType, targetGroup], {
      account: professor.account,
    });
    const afterBlock = await publicClient.getBlock();

    assert.equal(await documentRegistry.read.verifyDocument([contentHash]), true);

    const [storedType, storedGroup, storedUploader, storedTimestamp] =
      await documentRegistry.read.getDocument([contentHash]);

    assert.equal(storedType, documentType);
    assert.equal(storedGroup, targetGroup);
    assert.equal(storedUploader, professor.account.address);
    assert.ok(storedTimestamp >= beforeBlock.timestamp);
    assert.ok(storedTimestamp <= afterBlock.timestamp);
  });

  it("Unauthorized registration reverts", async () => {
    const { outsider, documentRegistry } = await deployFixture();

    const contentHash = ("0x" + "44".repeat(32)) as `0x${string}`;
    await expectRevert(
      documentRegistry.write.registerDocument([contentHash, "notes", ""], { account: outsider.account }),
      "DocumentRegistry: unauthorized",
    );
  });

  it("DocumentRegistered event emission correctness", async () => {
    const { student, documentRegistry } = await deployFixture();

    const contentHash = ("0x" + "55".repeat(32)) as `0x${string}`;
    const documentType = "assignment";
    const targetGroup = "";

    const fromBlock = await publicClient.getBlockNumber();
    const txHash = await documentRegistry.write.registerDocument([contentHash, documentType, targetGroup], {
      account: student.account,
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    const events = await publicClient.getContractEvents({
      address: documentRegistry.address,
      abi: documentRegistry.abi,
      eventName: "DocumentRegistered",
      fromBlock,
      strict: true,
    });

    assert.equal(events.length, 1);
    const ev = events[0];

    assert.equal(ev.args.contentHash, contentHash);
    assert.equal(ev.args.uploader, student.account.address);
    assert.equal(ev.args.documentType, documentType);
    assert.equal(ev.args.targetGroup, targetGroup);

    const [, , , storedTimestamp] = await documentRegistry.read.getDocument([contentHash]);
    assert.equal(ev.args.timestamp, storedTimestamp);
  });
});

