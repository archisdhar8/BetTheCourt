import { ChallengeDomainError } from "../../challenges/model.js";
import { SchedulingDomainError } from "../model.js";
import { cancelScheduleProposalBodySchema, confirmScheduleSlotBodySchema, expireScheduleBodySchema, proposeScheduleSlotsBodySchema, } from "../contract.js";
function schedulingErrorReply(reply, err) {
    if (err instanceof SchedulingDomainError) {
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
export function registerSchedulingRoutes(app, scheduling) {
    app.get("/v1/challenges/:id/schedule", async (req, reply) => {
        const { id } = req.params;
        try {
            return reply.send(await scheduling.getScheduleView(id));
        }
        catch (err) {
            return schedulingErrorReply(reply, err);
        }
    });
    app.post("/v1/challenges/:id/schedule/propose", async (req, reply) => {
        const { id } = req.params;
        const parsed = proposeScheduleSlotsBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
        }
        const b = parsed.data;
        try {
            return reply.send(await scheduling.proposeSlots({
                challengeId: id,
                actor: b.actor,
                slots: b.slots,
                expiresAt: b.expiresAt,
                travelBufferMinutes: b.travelBufferMinutes,
                venue: b.venue,
                creatorLocation: b.creatorLocation,
                opponentLocation: b.opponentLocation,
            }));
        }
        catch (err) {
            return schedulingErrorReply(reply, err);
        }
    });
    app.post("/v1/challenges/:id/schedule/counter", async (req, reply) => {
        const { id } = req.params;
        const parsed = proposeScheduleSlotsBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
        }
        const b = parsed.data;
        try {
            return reply.send(await scheduling.counterProposeSlots({
                challengeId: id,
                actor: b.actor,
                slots: b.slots,
                expiresAt: b.expiresAt,
                travelBufferMinutes: b.travelBufferMinutes,
                venue: b.venue,
                creatorLocation: b.creatorLocation,
                opponentLocation: b.opponentLocation,
            }));
        }
        catch (err) {
            return schedulingErrorReply(reply, err);
        }
    });
    app.post("/v1/challenges/:id/schedule/confirm", async (req, reply) => {
        const { id } = req.params;
        const parsed = confirmScheduleSlotBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
        }
        try {
            return reply.send(await scheduling.confirmSlot({
                challengeId: id,
                actor: parsed.data.actor,
                slotId: parsed.data.slotId,
            }));
        }
        catch (err) {
            return schedulingErrorReply(reply, err);
        }
    });
    app.post("/v1/challenges/:id/schedule/cancel", async (req, reply) => {
        const { id } = req.params;
        const parsed = cancelScheduleProposalBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
        }
        try {
            return reply.send(await scheduling.cancelPendingProposal({
                challengeId: id,
                actor: parsed.data.actor,
            }));
        }
        catch (err) {
            return schedulingErrorReply(reply, err);
        }
    });
    app.post("/v1/challenges/:id/schedule/expire", async (req, reply) => {
        const { id } = req.params;
        const parsed = expireScheduleBodySchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
        }
        try {
            return reply.send(await scheduling.expireStaleProposals({
                challengeId: id,
                asOf: parsed.data.asOf,
            }));
        }
        catch (err) {
            return schedulingErrorReply(reply, err);
        }
    });
}
//# sourceMappingURL=register.js.map