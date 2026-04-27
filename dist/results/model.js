export class ResultsDomainError extends Error {
    code;
    httpStatus;
    details;
    constructor(input) {
        super(input.message);
        this.code = input.code;
        this.httpStatus = input.httpStatus ?? 400;
        this.details = input.details;
        this.name = "ResultsDomainError";
    }
}
/** Stable JSON for deterministic equality (sorted keys, recursively). */
export function canonicalResultFingerprint(payload) {
    return stableStringify(payload);
}
function stableStringify(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((v) => stableStringify(v)).join(",")}]`;
    }
    const obj = value;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}
/** Stub for sport-specific rules (scores shape, required keys, etc.). */
export function assertSportResultPayload(sport, payload) {
    if (!sport || sport.length > 64) {
        throw new ResultsDomainError({ code: "invalid_payload", message: "Invalid sport", httpStatus: 400 });
    }
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
        throw new ResultsDomainError({ code: "invalid_payload", message: "Result must be a JSON object", httpStatus: 400 });
    }
}
//# sourceMappingURL=model.js.map