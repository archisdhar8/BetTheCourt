export type UserLocationPrivacy = "hybrid_private" | "precise";

export type UserLocation = {
  lat: number;
  lng: number;
  updatedAt: string;
};

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  homeVenueId?: string;
  location?: UserLocation;
  locationPrivacy: UserLocationPrivacy;
  createdAt: string;
  updatedAt: string;
};

export type PublicUserProfile = Omit<UserProfile, "passwordHash">;

export class UserDomainError extends Error {
  readonly code: "not_found" | "invalid_payload" | "conflict";
  readonly httpStatus: number;

  constructor(input: { code: "not_found" | "invalid_payload" | "conflict"; message: string; httpStatus?: number }) {
    super(input.message);
    this.code = input.code;
    this.httpStatus = input.httpStatus ?? 400;
    this.name = "UserDomainError";
  }
}

export function toPublicProfile(user: UserProfile): PublicUserProfile {
  const { passwordHash: _, ...publicUser } = user;
  return publicUser;
}
