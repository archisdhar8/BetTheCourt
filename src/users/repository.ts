import type { UserProfile } from "./model.js";

export interface UsersRepository {
  getById(id: string): Promise<UserProfile | null>;
  getByEmail(email: string): Promise<UserProfile | null>;
  list(): Promise<UserProfile[]>;
  create(user: UserProfile): Promise<void>;
  save(user: UserProfile): Promise<void>;
}

export class InMemoryUsersRepository implements UsersRepository {
  private readonly users = new Map<string, UserProfile>();
  private readonly emailToId = new Map<string, string>();

  constructor(seed: UserProfile[] = []) {
    for (const user of seed) {
      this.users.set(user.id, { ...user });
      this.emailToId.set(user.email.toLowerCase(), user.id);
    }
  }

  async getById(id: string): Promise<UserProfile | null> {
    return this.users.get(id) ?? null;
  }

  async getByEmail(email: string): Promise<UserProfile | null> {
    const id = this.emailToId.get(email.toLowerCase());
    if (!id) return null;
    return this.users.get(id) ?? null;
  }

  async list(): Promise<UserProfile[]> {
    return [...this.users.values()];
  }

  async create(user: UserProfile): Promise<void> {
    this.users.set(user.id, { ...user });
    this.emailToId.set(user.email.toLowerCase(), user.id);
  }

  async save(user: UserProfile): Promise<void> {
    this.users.set(user.id, { ...user });
    this.emailToId.set(user.email.toLowerCase(), user.id);
  }
}
