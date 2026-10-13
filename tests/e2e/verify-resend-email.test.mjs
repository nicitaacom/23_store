import assert from "node:assert/strict"
import test from "node:test"

import { verifyResendEmail } from "../../scripts/e2e/verify-resend-email.mjs"

test("email delivery verification refuses recipients outside the current run account", async () => {
  await assert.rejects(verifyResendEmail({
    NEXT_RESEND_SECRET: "placeholder-not-used",
    E2E_TEST_EMAIL_DOMAIN: "example.test",
    E2E_RUN_ID: "monthly-123",
  }, {
    emailId: "re_test_message",
    to: "customer@example.test",
    subject: "E2E check",
  }), /exact current-run account/)
})

test("email delivery verification refuses a message without provider access", async () => {
  await assert.rejects(verifyResendEmail({
    E2E_TEST_EMAIL_DOMAIN: "example.test",
    E2E_RUN_ID: "monthly-123",
  }, {
    emailId: "re_test_message",
    to: "e2e-owner+monthly-123@example.test",
    subject: "E2E check",
  }), /provider access/)
})
