import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

import { expectRevert } from "./_helpers.js";

describe("RoleManager", async () => {
  const { viem } = await network.create();

  it("ADMIN_ROLE: admin can grant and revoke; unauthorized reverts", async () => {
    const [admin, outsider] = await viem.getWalletClients();

    const roleManager = await viem.deployContract("RoleManager", [admin.account.address]);

    const ADMIN_ROLE = await roleManager.read.ADMIN_ROLE();

    // initial admin has ADMIN_ROLE
    assert.equal(await roleManager.read.hasRole([ADMIN_ROLE, admin.account.address]), true);

    // unauthorized grant should revert (OZ AccessControl uses custom errors in v5)
    await expectRevert(
      roleManager.write.grantRole([ADMIN_ROLE, outsider.account.address], {
        account: outsider.account,
      }),
    );

    // admin grants role
    await roleManager.write.grantRole([ADMIN_ROLE, outsider.account.address], {
      account: admin.account,
    });
    assert.equal(await roleManager.read.hasRole([ADMIN_ROLE, outsider.account.address]), true);

    // admin revokes role
    await roleManager.write.revokeRole([ADMIN_ROLE, outsider.account.address], {
      account: admin.account,
    });
    assert.equal(await roleManager.read.hasRole([ADMIN_ROLE, outsider.account.address]), false);
  });

  it("PROFESSOR_ROLE: admin can grant and revoke; unauthorized reverts", async () => {
    const [admin, professor, outsider] = await viem.getWalletClients();
    const roleManager = await viem.deployContract("RoleManager", [admin.account.address]);

    const PROFESSOR_ROLE = await roleManager.read.PROFESSOR_ROLE();

    await expectRevert(
      roleManager.write.grantRole([PROFESSOR_ROLE, professor.account.address], {
        account: outsider.account,
      }),
    );

    await roleManager.write.grantRole([PROFESSOR_ROLE, professor.account.address], {
      account: admin.account,
    });
    assert.equal(await roleManager.read.hasRole([PROFESSOR_ROLE, professor.account.address]), true);

    await roleManager.write.revokeRole([PROFESSOR_ROLE, professor.account.address], {
      account: admin.account,
    });
    assert.equal(await roleManager.read.hasRole([PROFESSOR_ROLE, professor.account.address]), false);
  });

  it("STUDENT_ROLE: admin can grant and revoke; unauthorized reverts", async () => {
    const [admin, student, outsider] = await viem.getWalletClients();
    const roleManager = await viem.deployContract("RoleManager", [admin.account.address]);

    const STUDENT_ROLE = await roleManager.read.STUDENT_ROLE();

    await expectRevert(
      roleManager.write.grantRole([STUDENT_ROLE, student.account.address], {
        account: outsider.account,
      }),
    );

    await roleManager.write.grantRole([STUDENT_ROLE, student.account.address], {
      account: admin.account,
    });
    assert.equal(await roleManager.read.hasRole([STUDENT_ROLE, student.account.address]), true);

    await roleManager.write.revokeRole([STUDENT_ROLE, student.account.address], {
      account: admin.account,
    });
    assert.equal(await roleManager.read.hasRole([STUDENT_ROLE, student.account.address]), false);
  });

  it("Groups: assignGroup/getGroup/revokeGroup and unauthorized access reverts", async () => {
    const [admin, student, outsider] = await viem.getWalletClients();
    const roleManager = await viem.deployContract("RoleManager", [admin.account.address]);

    await expectRevert(
      roleManager.write.assignGroup([student.account.address, "G1"], { account: outsider.account }),
    );

    await roleManager.write.assignGroup([student.account.address, "G1"], { account: admin.account });
    assert.equal(await roleManager.read.getGroup([student.account.address]), "G1");

    await expectRevert(
      roleManager.write.revokeGroup([student.account.address], { account: outsider.account }),
    );

    await roleManager.write.revokeGroup([student.account.address], { account: admin.account });
    assert.equal(await roleManager.read.getGroup([student.account.address]), "");
  });
});

