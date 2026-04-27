import { ChallengeDomainError } from "../../challenges/model.js";
import { FraudDomainError } from "../model.js";
import { evaluateFraudBodySchema } from "../contract.js";
function fraudErrorReply(reply, err) {
    if (err instanceof FraudDomainError) {
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
export function registerFraudRoutes(app, fraud) {
    app.get("/v1/challenges/:id/fraud", async (req, reply) => {
        const { id } = req.params;
        try {
            const latest = await fraud.getLatestEvaluation(id);
            return reply.send({ latest });
        }
        catch (err) {
            return fraudErrorReply(reply, err);
        }
    });
    app.post("/v1/challenges/:id/fraud/evaluate", async (req, reply) => {
        const { id } = req.params;
        const parsed = evaluateFraudBodySchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
        }
        try {
            const record = await fraud.evaluate({
                challengeId: id,
                context: parsed.data.context,
                emitPlaceholderSignals: parsed.data.emitPlaceholderSignals,
            });
            return reply.send(record);
        }
        catch (err) {
            return fraudErrorReply(reply, err);
        }
    });
}
//# sourceMappingURL=register.js.map