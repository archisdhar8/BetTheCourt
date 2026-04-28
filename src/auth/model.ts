export type SessionRecord = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export class AuthDomainError extends Error {
  readonly code: "invalid_credentials" | "not_authenticated" | "invalid_payload";
  readonly httpStatus: number;

  constructor(input: { code: "invalid_credentials" | "not_authenticated" | "invalid_payload"; message: string; httpStatus?: number }) {
    super(input.message);
    this.code = input.code;
    this.httpStatus = input.httpStatus ?? 401;
    this.name = "AuthDomainError";
  }
}
