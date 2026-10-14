import { describe, expect, it } from "vitest"

import { OpenAIRequestFailure, describeOpenAIRequestFailure, openAIRequestHeaders } from "./openaiRequest"

describe("OpenAI user-facing provider errors", () => {
  it("explains an exhausted API credit balance without returning the provider's raw message", () => {
    const providerError = {
      status: 429,
      code: "insufficient_quota",
      message: "You exceeded your current quota; internal billing metadata must not be shown.",
      request_id: "req_credit_limit",
    }

    const failure = describeOpenAIRequestFailure(
      new OpenAIRequestFailure(providerError, 1, ["req_credit_limit"]),
      "translate this product description",
      "The saved description is unchanged.",
    )

    expect(failure.status).toBe(503)
    expect(failure.code).toBe("OPENAI_INSUFFICIENT_CREDITS")
    expect(failure.message).toContain("no API credits")
    expect(failure.message).toContain("saved description is unchanged")
    expect(failure.message).toContain("Contact the store owner")
    expect(failure.message).not.toContain("internal billing metadata")
    expect(failure.requestIds).toEqual(["req_credit_limit"])
  })

  it("distinguishes rate limits from exhausted credits after its automatic retry", () => {
    const failure = describeOpenAIRequestFailure(
      new OpenAIRequestFailure({
        status: 429,
        code: "rate_limit_exceeded",
        message: "Requests per minute exceeded",
      }, 2, ["req_first", "req_second"]),
      "suggest a category",
    )

    expect(failure.status).toBe(429)
    expect(failure.code).toBe("OPENAI_RATE_LIMITED")
    expect(failure.message).toContain("after an automatic retry")
    expect(failure.message).not.toContain("Requests per minute")
    expect(failure.requestIds).toEqual(["req_first", "req_second"])
  })

  it("returns safe provider attempt evidence as response headers", () => {
    expect(openAIRequestHeaders({ attemptCount: 2, requestIds: ["req_first", "req_second"] })).toEqual({
      "x-openai-attempt-count": "2",
      "x-openai-request-id": "req_first",
      "x-openai-request-ids": '["req_first","req_second"]',
    })
  })
})
