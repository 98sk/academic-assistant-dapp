import assert from "node:assert/strict";

export function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const anyErr = err as any;
    if (typeof anyErr.shortMessage === "string") return anyErr.shortMessage;
    if (typeof anyErr.message === "string") return anyErr.message;
  }
  return String(err);
}

export async function expectRevert(
  promise: Promise<unknown>,
  messageIncludes?: string,
): Promise<void> {
  try {
    await promise;
    assert.fail("Expected transaction to revert, but it succeeded");
  } catch (err) {
    if (messageIncludes) {
      const msg = getErrorMessage(err);
      assert.ok(
        msg.includes(messageIncludes),
        `Expected revert message to include "${messageIncludes}", got: ${msg}`,
      );
    }
  }
}

