import assert from "node:assert/strict";
import test from "node:test";
import {
  PROTECTED_GENERATION_FAILURE_MESSAGE,
  generateSaveAndConsumeCredit,
  protectedGenerationErrorPayload,
} from "../lib/generationProtection.js";

function validBrief() {
  return {
    projectTitle: "CRM Implementation",
    clientName: "Acme",
    projectSummary: "Build a CRM implementation plan for Acme.",
    executiveSummary: "Acme needs a usable CRM delivery report.",
    objectives: ["Define CRM scope"],
    scopeIncluded: ["Discovery", "Implementation plan"],
    deliverables: [{ name: "Project report", description: "Full generated report" }],
    paymentTerms: { estimatedBudget: "Not Specified" },
  };
}

function createFakeSupabase({ failInsert = false, failCredit = false } = {}) {
  const state = {
    briefs: [],
    creditsDeducted: 0,
    insertAttempts: 0,
    deleteAttempts: 0,
  };

  const client = {
    from(table) {
      assert.equal(table, "briefs");

      return {
        insert(payload) {
          state.insertAttempts += 1;

          return {
            select() {
              return {
                async single() {
                  if (failInsert) {
                    return { data: null, error: new Error("database unavailable") };
                  }

                  const row = {
                    ...payload,
                    id: `brief-${state.briefs.length + 1}`,
                  };
                  state.briefs.push(row);
                  return { data: { id: row.id, share_token: row.share_token }, error: null };
                },
              };
            },
          };
        },
        delete() {
          state.deleteAttempts += 1;

          const filters = {};
          const query = {
            eq(column, value) {
              filters[column] = value;

              if (filters.id && filters.user_id) {
                state.briefs = state.briefs.filter(
                  (brief) => brief.id !== filters.id || brief.user_id !== filters.user_id,
                );
              }

              return query;
            },
          };

          return query;
        },
      };
    },
    async rpc(name) {
      assert.equal(name, "decrement_credit");

      if (failCredit) {
        return { error: new Error("credit deduction failed") };
      }

      state.creditsDeducted += 1;
      return { error: null };
    },
  };

  return { client, state };
}

async function expectProtectedFailure(promise) {
  await assert.rejects(promise);

  try {
    await promise;
  } catch (error) {
    const payload = protectedGenerationErrorPayload(error);
    assert.equal(payload.status, 503);
    assert.equal(payload.body.error, PROTECTED_GENERATION_FAILURE_MESSAGE);
  }
}

test("Gemini 503 does not save a report or deduct credit", async () => {
  const { client, state } = createFakeSupabase();

  await expectProtectedFailure(
    generateSaveAndConsumeCredit({
      rawInput: "Build a CRM for our sales team with onboarding and reporting.",
      dbUserId: "user-1",
      generateBrief: async () => {
        throw new Error("PROVIDER_UNAVAILABLE");
      },
      sb: client,
      createShareToken: () => "share-1",
    }),
  );

  assert.equal(state.insertAttempts, 0);
  assert.equal(state.briefs.length, 0);
  assert.equal(state.creditsDeducted, 0);
});

test("Gemini timeout does not save a report or deduct credit", async () => {
  const { client, state } = createFakeSupabase();

  await expectProtectedFailure(
    generateSaveAndConsumeCredit({
      rawInput: "Build a CRM for our sales team with onboarding and reporting.",
      dbUserId: "user-1",
      generateBrief: async () => {
        throw new Error("PROVIDER_TIMEOUT");
      },
      sb: client,
      createShareToken: () => "share-1",
    }),
  );

  assert.equal(state.insertAttempts, 0);
  assert.equal(state.briefs.length, 0);
  assert.equal(state.creditsDeducted, 0);
});

test("database save failure does not deduct credit or leave a partial report", async () => {
  const { client, state } = createFakeSupabase({ failInsert: true });

  await expectProtectedFailure(
    generateSaveAndConsumeCredit({
      rawInput: "Build a CRM for our sales team with onboarding and reporting.",
      dbUserId: "user-1",
      generateBrief: async () => validBrief(),
      sb: client,
      createShareToken: () => "share-1",
    }),
  );

  assert.equal(state.insertAttempts, 1);
  assert.equal(state.briefs.length, 0);
  assert.equal(state.creditsDeducted, 0);
});

test("successful generation saves the report before deducting one credit", async () => {
  const { client, state } = createFakeSupabase();

  const result = await generateSaveAndConsumeCredit({
    rawInput: "Build a CRM for our sales team with onboarding and reporting.",
    dbUserId: "user-1",
    generateBrief: async () => validBrief(),
    sb: client,
    createShareToken: () => "share-1",
  });

  assert.equal(state.briefs.length, 1);
  assert.equal(state.creditsDeducted, 1);
  assert.equal(result.briefId, "brief-1");
  assert.equal(result.shareToken, "share-1");
  assert.deepEqual(result.brief, validBrief());
});
