import assert from "node:assert/strict"
import test from "node:test"

import { buildAsyncCoverage, buildCoverage, filterEvidenceForRun, getFinalStatus, redactEvidence } from "../../scripts/e2e/build-report.mjs"

test("coverage only passes with a real identifier and an independent verification reference", () => {
  const inventory = { operations: [
    { operationId: "verified", mappingStatus: "mapped", required: true },
    { operationId: "missing-verification", mappingStatus: "mapped", required: true },
    { operationId: "unmapped", mappingStatus: "unmapped", required: true },
  ] }
  const evidence = [
    { operationId: "verified", status: "passed", requestId: "req_123", verificationReference: "db-row:123" },
    { operationId: "missing-verification", status: "passed", requestId: "req_456" },
  ]
  const coverage = buildCoverage(inventory, evidence)

  assert.deepEqual(coverage.map(operation => operation.status), ["passed", "not_exercised", "not_exercised"])
  assert.equal(getFinalStatus({}, coverage, { failed: 0, mapped: 2 }, evidence), "INCOMPLETE")
})

test("a runtime error remains FAIL even when the run also has missing coverage", () => {
  const coverage = [{ operationId: "route", status: "failed", mappingStatus: "mapped", required: true }]
  assert.equal(getFinalStatus({}, coverage, { failed: 1, mapped: 1 }, [{ status: "failed" }]), "FAIL")
})

test("unexercised awaited work prevents a full PASS", () => {
  const inventory = { asyncExpressions: [
    { operationId: "awaited-provider-call", sourcePath: "app/api/example/route.ts", mappingStatus: "mapped", required: true },
  ] }
  const asyncCoverage = buildAsyncCoverage(inventory, [])
  const coverage = [{ operationId: "route", status: "passed", mappingStatus: "mapped", required: true }]
  const evidence = [{ operationId: "route", status: "passed", requestId: "req_123", verificationReference: "db-row:123" }]

  assert.equal(asyncCoverage[0]?.status, "not_exercised")
  assert.equal(getFinalStatus({}, coverage, { failed: 0, mapped: 1 }, evidence, asyncCoverage), "INCOMPLETE")
})

test("configuration-blocked async work stays incomplete rather than becoming a pass", () => {
  const inventory = { asyncExpressions: [
    { operationId: "provider-call", sourcePath: "app/api/example/route.ts", mappingStatus: "mapped", required: true },
  ] }
  const asyncCoverage = buildAsyncCoverage(inventory, [
    { operationId: "provider-call", status: "blocked_by_configuration", message: "Provider access is unavailable" },
  ])
  const coverage = [{ operationId: "route", status: "passed", mappingStatus: "mapped", required: true }]
  const evidence = [{ operationId: "route", status: "passed", requestId: "req_123", verificationReference: "db-row:123" }]

  assert.equal(asyncCoverage[0]?.status, "blocked_by_configuration")
  assert.equal(getFinalStatus({}, coverage, { failed: 0, mapped: 1 }, evidence, asyncCoverage), "INCOMPLETE")
})

test("reports redact credential fields and bearer tokens", () => {
  assert.deepEqual(redactEvidence({ password: "private", message: "Authorization: Bearer secret-value" }), {
    password: "[REDACTED]",
    message: "Authorization: Bearer [REDACTED]",
  })
})

test("reports remove credentials from signed upload URLs", () => {
  assert.deepEqual(redactEvidence({
    upload: "https://storage.example/object?X-Amz-Credential=private&X-Amz-Signature=signature-value",
  }), { upload: "[SIGNED_URL_REDACTED]" })
})

test("coverage evidence is limited to the current run", () => {
  const currentEvidence = { operationId: "route", runId: "monthly-2", status: "passed" }
  const priorEvidence = { operationId: "route", runId: "monthly-1", status: "passed" }
  const unscopedEvidence = { operationId: "route", status: "passed" }

  assert.deepEqual(filterEvidenceForRun([priorEvidence, unscopedEvidence, currentEvidence], "monthly-2"), [currentEvidence])
  assert.deepEqual(filterEvidenceForRun([currentEvidence], null), [])
})
