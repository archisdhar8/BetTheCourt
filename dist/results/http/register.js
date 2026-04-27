import { ChallengeDomainError } from "../../challenges/model.js";
import { ResultsDomainError } from "../model.js";
import { confirmResultBodySchema, disputeResultBodySchema, submitResultBodySchema } from "../contract.js";
function resultsErrorReply(reply, err) {
    if (err instanceof ResultsDomainError) {
        return reply.status(err.httpStatus).send({
            error: err.code,
            message: err.message,
            details: err.details,
        });
    }
    if (err instanceof ChallengeDomainError) {
        return reply.status(err.httpStatus).send({
            error: err.code,
            message: err.message,
            details: err.details,
        });
    }
    throw err;
}
export function registerResultsRoutes(app, results) {
    app.get("/v1/challenges/:id/results", async (req, reply) => {
        const { id } = req.params;
        try {
            return reply.send(await results.getResultsView(id));
        }
        catch (err) {
            return resultsErrorReply(reply, err);
        }
    });
    app.post("/v1/challenges/:id/results/submit", async (req, reply) => {
        const { id } = req.params;
        const parsed = submitResultBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
        }
        try {
            return reply.send(await results.submitResult({
                challengeId: id,
                actor: parsed.data.actor,
                payload: parsed.data.payload,
            }));
        }
        catch (err) {
            return resultsErrorReply(reply, err);
        }
    });
    app.post("/v1/challenges/:id/results/confirm", async (req, reply) => {
        const { id } = req.params;
        const parsed = confirmResultBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
        }
        try {
            return reply.send(await results.confirmResult({
                challengeId: id,
                actor: parsed.data.actor,
                note: parsed.data.note,
                ackFingerprint: parsed.data.ackFingerprint,
            }));
        }
        catch (err) {
            return resultsErrorReply(reply, err);
        }
    });
    app.post("/v1/challenges/:id/results/dispute", async (req, reply) => {
        const { id } = req.params;
        const parsed = disputeResultBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
        }
        try {
            return reply.send(await results.disputeResult({
                challengeId: id,
                actor: parsed.data.actor,
                reason: parsed.data.reason,
                counterPayload: parsed.data.counterPayload,
            }));
        }
        catch (err) {
            return resultsErrorReply(reply, err);
        }
    });
}
//# sourceMappingURL=register.js.map