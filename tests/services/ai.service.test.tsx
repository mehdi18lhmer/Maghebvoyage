import assert from "node:assert/strict";
import test from "node:test";

test("Groq requests use the Developer-plan default and allow an environment override", async (t) => {
  const originalApiKey = process.env.GROQ_API_KEY;
  const originalModel = process.env.GROQ_MODEL;
  process.env.GROQ_API_KEY = "test-key";
  delete process.env.GROQ_MODEL;

  let requestedModel: unknown;
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { model?: unknown };
      requestedModel = body.model;

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "A four-day trekking trip in Morocco.",
                  tags: ["maroc", "trekking", "atlas"],
                  complexity: 2,
                  destinationNormalized: "Maroc",
                  budgetLevel: "medium",
                  dominantTripType: "TREKKING",
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  );

  try {
    const { structureRequest } = await import("../../src/services/ai.service");
    const result = await structureRequest({ destination: "Morocco", durationDays: 4 });

    assert.equal(requestedModel, "openai/gpt-oss-120b");
    assert.equal(result?.dominantTripType, "TREKKING");

    process.env.GROQ_MODEL = "account-specific-model";
    await structureRequest({ destination: "Morocco", durationDays: 4 });
    assert.equal(requestedModel, "account-specific-model");
  } finally {
    if (originalApiKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalApiKey;

    if (originalModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = originalModel;
  }
});
