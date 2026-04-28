import type { SessionRecord } from "./model.js";

export interface AuthRepository {
  saveSession(session: SessionRecord): Promise<void>;
  getSession(token: string): Promise<SessionRecord | null>;
  deleteSession(token: string): Promise<void>;
}

export class InMemoryAuthRepository implements AuthRepository {
  private readonly sessions = new Map<string, SessionRecord>();

  async saveSession(session: SessionRecord): Promise<void> {
    this.sessions.set(session.token, { ...session });
  }

  async getSession(token: string): Promise<SessionRecord | null> {
    return this.sessions.get(token) ?? null;
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }
}
