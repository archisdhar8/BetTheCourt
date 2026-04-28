import { randomUUID } from "node:crypto";
import type { UsersService } from "../users/service.js";
import type { PublicUserProfile } from "../users/model.js";
import { AuthDomainError, type SessionRecord } from "./model.js";
import type { AuthRepository } from "./repository.js";

const SESSION_MS = 1000 * 60 * 60 * 24 * 7;

export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly users: UsersService,
  ) {}

  async register(input: {
    email: string;
    username: string;
    displayName: string;
    password: string;
  }): Promise<{ token: string; user: PublicUserProfile }> {
    const user = await this.users.createUser(input);
    const token = await this.createSession(user.id);
    return { token, user };
  }

  async login(input: { email: string; password: string }): Promise<{ token: string; user: PublicUserProfile }> {
    const user = await this.users.getByEmail(input.email);
    if (!user || !this.users.verifyPassword(user, input.password)) {
      throw new AuthDomainError({ code: "invalid_credentials", message: "Invalid email or password", httpStatus: 401 });
    }
    const token = await this.createSession(user.id);
    return { token, user: await this.users.getPublicProfile(user.id) };
  }

  async me(token: string | undefined): Promise<PublicUserProfile> {
    if (!token) throw new AuthDomainError({ code: "not_authenticated", message: "Missing auth token", httpStatus: 401 });
    const session = await this.repo.getSession(token);
    if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
      throw new AuthDomainError({ code: "not_authenticated", message: "Session expired", httpStatus: 401 });
    }
    return this.users.getPublicProfile(session.userId);
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.repo.deleteSession(token);
  }

  private async createSession(userId: string): Promise<string> {
    const now = new Date();
    const session: SessionRecord = {
      token: `sess_${randomUUID()}`,
      userId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_MS).toISOString(),
    };
    await this.repo.saveSession(session);
    return session.token;
  }
}
