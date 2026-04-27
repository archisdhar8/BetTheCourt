import { ChallengeDomainError } from "../../challenges/model.js";
import { CheckinDomainError } from "../model.js";
import { submitCheckinBodySchema } from "../contract.js";
function checkinErrorReply(reply, err) {
    if (err instanceof CheckinDomainError) {
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
export function registerCheckinRoutes(app, checkin) {
    app.get("/v1/challenges/:id/checkin", async (req, reply) => {
        const { id } = req.params;
        try {
            return reply.send(await checkin.getCheckInStatus(id));
        }
        catch (err) {
            return checkinErrorReply(reply, err);
        }
    });
    app.post("/v1/challenges/:id/checkin", async (req, reply) => {
        const { id } = req.params;
        const parsed = submitCheckinBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
        }
        try {
            return reply.send(await checkin.submitCheckIn({
                challengeId: id,
                actor: parsed.data.actor,
                lat: parsed.data.lat,
                lng: parsed.data.lng,
            }));
        }
        catch (err) {
            return checkinErrorReply(reply, err);
        }
    });
}
//# sourceMappingURL=register.js.map