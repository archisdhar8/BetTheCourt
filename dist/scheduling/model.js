export class SchedulingDomainError extends Error {
    code;
    httpStatus;
    details;
    constructor(input) {
        super(input.message);
        this.code = input.code;
        this.httpStatus = input.httpStatus ?? 400;
        this.details = input.details;
        this.name = "SchedulingDomainError";
    }
}
//# sourceMappingURL=model.js.map