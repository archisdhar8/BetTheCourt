/** All monetary amounts are integer minor units (e.g. cents). */
export const PLATFORM_WALLET_USER_ID = "__platform__";
export const LEDGER_ENTRY_TYPES = [
    "credit",
    "debit_available",
    "escrow_lock",
    "escrow_refund",
    "escrow_payout_release",
    "escrow_payout_credit",
    "platform_fee_credit",
];
export class WalletDomainError extends Error {
    code;
    httpStatus;
    details;
    constructor(input) {
        super(input.message);
        this.code = input.code;
        this.httpStatus = input.httpStatus ?? 400;
        this.details = input.details;
        this.name = "WalletDomainError";
    }
}
//# sourceMappingURL=model.js.map