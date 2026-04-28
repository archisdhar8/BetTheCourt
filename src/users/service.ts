import { randomUUID, createHash } from "node:crypto";
import { toPublicProfile, UserDomainError, type PublicUserProfile, type UserProfile } from "./model.js";
import type { UsersRepository } from "./repository.js";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function seedUsers(now: string): UserProfile[] {
  const mk = (id: string, email: string, username: string, displayName: string, homeVenueId?: string): UserProfile => ({
    id,
    email,
    username,
    displayName,
    passwordHash: hashPassword("password123"),
    homeVenueId,
    locationPrivacy: "hybrid_private",
    createdAt: now,
    updatedAt: now,
  });
  return [
    mk("u_1", "alex@wagr.dev", "alex_smash", "Alex Rivera", "v_1"),
    mk("u_2", "kira@wagr.dev", "ko_phoenix", "Kira Okonkwo", "v_2"),
    mk("u_3", "marco@wagr.dev", "marco_ace", "Marco Diaz", "v_3"),
    mk("u_4", "lina@wagr.dev", "lina_cue", "Lina Park", "v_4"),
    mk("u_5", "tomo@wagr.dev", "tomo_spin", "Tomo Yagi", "v_2"),
    mk("u_6", "dee@wagr.dev", "dee_dart", "Dee Chen", "v_5"),
  ];
}

export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  static defaultSeed(): UserProfile[] {
    return seedUsers(new Date().toISOString());
  }

  async listPublicProfiles(): Promise<PublicUserProfile[]> {
    return (await this.repo.list()).map(toPublicProfile);
  }

  async getPublicProfile(userId: string): Promise<PublicUserProfile> {
    const user = await this.repo.getById(userId);
    if (!user) throw new UserDomainError({ code: "not_found", message: "User not found", httpStatus: 404 });
    return toPublicProfile(user);
  }

  async getByEmail(email: string): Promise<UserProfile | null> {
    return this.repo.getByEmail(email.toLowerCase());
  }

  async getById(userId: string): Promise<UserProfile | null> {
    return this.repo.getById(userId);
  }

  async createUser(input: {
    email: string;
    username: string;
    displayName: string;
    password: string;
  }): Promise<PublicUserProfile> {
    if (!input.email.includes("@") || input.password.length < 8) {
      throw new UserDomainError({ code: "invalid_payload", message: "Invalid email or password" });
    }
    const existing = await this.repo.getByEmail(input.email);
    if (existing) throw new UserDomainError({ code: "conflict", message: "Email already in use", httpStatus: 409 });
    const now = new Date().toISOString();
    const user: UserProfile = {
      id: `u_${randomUUID()}`,
      email: input.email.toLowerCase(),
      username: input.username,
      displayName: input.displayName,
      passwordHash: hashPassword(input.password),
      locationPrivacy: "hybrid_private",
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.create(user);
    return toPublicProfile(user);
  }

  verifyPassword(user: UserProfile, plainPassword: string): boolean {
    return user.passwordHash === hashPassword(plainPassword);
  }

  async updateLocation(input: {
    userId: string;
    lat: number;
    lng: number;
    locationPrivacy?: "hybrid_private" | "precise";
  }): Promise<PublicUserProfile> {
    if (input.lat < -90 || input.lat > 90 || input.lng < -180 || input.lng > 180) {
      throw new UserDomainError({ code: "invalid_payload", message: "Invalid coordinates" });
    }
    const user = await this.repo.getById(input.userId);
    if (!user) throw new UserDomainError({ code: "not_found", message: "User not found", httpStatus: 404 });
    user.location = { lat: input.lat, lng: input.lng, updatedAt: new Date().toISOString() };
    user.locationPrivacy = input.locationPrivacy ?? "hybrid_private";
    user.updatedAt = new Date().toISOString();
    await this.repo.save(user);
    return toPublicProfile(user);
  }
}
