// Typed API client with mock + real adapters.
// Live mode expects BetTheCourt Fastify API (`/v1/...`).
import type {
  Challenge,
  ChallengeState,
  Venue,
  VenueRanking,
  MatchCandidate,
  Wallet,
  AppNotification,
  LeaderboardRow,
  ScheduleProposal,
  ResultRound,
  FraudEvaluation,
  CheckInStatus,
  User,
  Sport,
  Mode,
} from "./types";
import {
  mockChallenges,
  mockUsers,
  mockVenues,
  mockWallets,
  mockNotifications,
  mockLeaderboard,
  mockProposals,
  mockRounds,
  mockFraud,
  mockCheckIn,
} from "./mock-data";

const ENV_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
const BASE_URL = ENV_BASE_URL ? ENV_BASE_URL.replace(/\/$/, "") : undefined;
export const API_MODE: "mock" | "live" = BASE_URL ? "live" : "mock";
const AUTH_TOKEN_KEY = "wagr_auth_token";
let authToken: string | null = typeof window !== "undefined" ? window.localStorage.getItem(AUTH_TOKEN_KEY) : null;

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms + Math.random() * 200));
const idem = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

class Store {
  users = [...mockUsers];
  venues = [...mockVenues];
  wallets = [...mockWallets];
  challenges = [...mockChallenges];
  notifications = [...mockNotifications];
  leaderboard = [...mockLeaderboard];
  proposals = { ...mockProposals };
  rounds = { ...mockRounds };
  fraud = { ...mockFraud };
  checkins = { ...mockCheckIn };
}
const store = new Store();

const roundChallengeIndex = new Map<string, string>();
const notifUserIndex = new Map<string, string>();

type ApiError = { code?: string; error?: string; message?: string; details?: unknown };

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) throw new Error("VITE_API_BASE_URL is not set");
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "content-type": "application/json",
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    let parsed: ApiError | null = null;
    try {
      parsed = (await res.json()) as ApiError;
    } catch {
      parsed = null;
    }
    const code = parsed?.error ?? parsed?.code ?? "API_ERROR";
    const message = parsed?.message ?? res.statusText;
    throw { code, status: res.status, message, details: parsed?.details };
  }
  return res.json() as Promise<T>;
}

function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  else window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

function userLocation(userId: string): { lat: number; lng: number } {
  const u = store.users.find((x) => x.id === userId);
  return u?.location ? { lat: u.location.lat, lng: u.location.lng } : { lat: 40.74, lng: -73.98 };
}

function midpoint(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

type BackendChallenge = {
  id: string;
  sport: string;
  mode: "1v1" | "team";
  creatorPartyId: string;
  opponentPartyId: string;
  stakeMinor: number;
  currency: string;
  state: ChallengeState;
  creatorFundsLocked?: boolean;
  opponentFundsLocked?: boolean;
  venueId?: string;
  scheduleProposal?: { startAt: string; endAt: string; note?: string };
  completedByPartyId?: string;
  createdAt: string;
  updatedAt: string;
  transitions: Array<{
    id: string;
    at: string;
    action: string;
    actor?: { kind: string; partyId?: string; adminId?: string };
    reason?: string;
  }>;
};

type BackendScheduleView = {
  challengeId: string;
  activePendingProposal?: {
    id: string;
    proposedByPartyId: string;
    expiresAt: string;
    status: "pending" | "confirmed" | "expired" | "superseded" | "cancelled";
    slots: Array<{ id: string; startAt: string; endAt: string }>;
    confirmations: Record<string, string>;
  };
  confirmedSlot?: { id: string; startAt: string; endAt: string };
};

type BackendResultsView = {
  challengeId: string;
  activeRound?: {
    id: string;
    fingerprint: string;
    submittedByPartyId: string;
    submittedAt: string;
    payload: Record<string, unknown>;
    status: "pending" | "confirmed" | "disputed";
    decisions: Record<string, { type: "confirm" | "dispute"; reason?: string }>;
  };
};

function toUiMode(mode: "1v1" | "team"): Mode {
  return mode;
}

function mapChallenge(ch: BackendChallenge): Challenge {
  const activeRoundId = ["completed", "confirmed", "disputed"].includes(ch.state) ? ch.id : undefined;
  return {
    id: ch.id,
    sport: (ch.sport as Sport) ?? "tennis",
    mode: toUiMode(ch.mode),
    stake: ch.stakeMinor,
    currency: (ch.currency as Challenge["currency"]) ?? "USD",
    creatorId: ch.creatorPartyId,
    opponentId: ch.opponentPartyId,
    venueId: ch.venueId,
    state: ch.state,
    createdAt: ch.createdAt,
    updatedAt: ch.updatedAt,
    funding: {
      creatorLocked: Boolean(ch.creatorFundsLocked),
      opponentLocked: Boolean(ch.opponentFundsLocked),
      amount: ch.stakeMinor,
      currency: (ch.currency as Challenge["currency"]) ?? "USD",
    },
    scheduleProposalId: ch.scheduleProposal ? ch.id : undefined,
    activeRoundId,
    timeline: (ch.transitions ?? []).map((t) => ({
      id: t.id,
      at: t.at,
      type: t.action,
      by: t.actor?.partyId ?? t.actor?.adminId ?? t.actor?.kind,
      message: t.reason ? `${t.action}: ${t.reason}` : t.action,
    })),
  };
}

function mapSchedule(view: BackendScheduleView): ScheduleProposal | undefined {
  const pending = view.activePendingProposal;
  if (pending) {
    return {
      id: pending.id,
      proposedBy: pending.proposedByPartyId,
      expiresAt: pending.expiresAt,
      state: pending.status,
      confirmedSlotId: undefined,
      slots: pending.slots.map((s) => ({
        id: s.id,
        startsAt: s.startAt,
        endsAt: s.endAt,
        confirmedBy: Object.entries(pending.confirmations)
          .filter(([, sid]) => sid === s.id)
          .map(([pid]) => pid),
      })),
    };
  }
  if (view.confirmedSlot) {
    return {
      id: `confirmed_${view.challengeId}`,
      proposedBy: "system",
      expiresAt: view.confirmedSlot.endAt,
      state: "confirmed",
      confirmedSlotId: view.confirmedSlot.id,
      slots: [
        {
          id: view.confirmedSlot.id,
          startsAt: view.confirmedSlot.startAt,
          endsAt: view.confirmedSlot.endAt,
          confirmedBy: [],
        },
      ],
    };
  }
  return undefined;
}

function mapRound(view: BackendResultsView): ResultRound | undefined {
  const r = view.activeRound;
  if (!r) return undefined;
  return {
    id: r.id,
    fingerprint: r.fingerprint,
    submittedBy: r.submittedByPartyId,
    submittedAt: r.submittedAt,
    payload: r.payload,
    state: r.status,
    decisions: Object.entries(r.decisions ?? {}).map(([userId, d]) => ({
      userId,
      decision: d.type,
      reason: d.reason,
    })),
  };
}

function mapWallet(input: {
  userId: string;
  currency: string;
  availableMinor: number;
  lockedMinor: number;
}): Wallet {
  return {
    id: `w_${input.userId}`,
    userId: input.userId,
    currency: (input.currency as Wallet["currency"]) ?? "USD",
    available: input.availableMinor,
    locked: input.lockedMinor,
    createdAt: new Date().toISOString(),
  };
}

// --- Public API ----------------------------------------------------
export const api = {
  async register(input: {
    email: string;
    username: string;
    displayName: string;
    password: string;
  }): Promise<User> {
    if (API_MODE === "live") {
      const out = await http<{ token: string; user: any }>(`/v1/auth/register`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      setAuthToken(out.token);
      const mapped: User = {
        id: out.user.id,
        email: out.user.email,
        username: out.user.username,
        displayName: out.user.displayName,
        elo: 1500,
        homeVenueId: out.user.homeVenueId,
        location: out.user.location,
        locationPrivacy: out.user.locationPrivacy,
      };
      const i = store.users.findIndex((u) => u.id === mapped.id);
      if (i >= 0) store.users[i] = mapped;
      else store.users.push(mapped);
      return mapped;
    }
    await delay();
    return store.users[0]!;
  },
  async login(email: string, password: string): Promise<User> {
    if (API_MODE === "live") {
      const out = await http<{ token: string; user: any }>(`/v1/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(out.token);
      const mapped: User = {
        id: out.user.id,
        email: out.user.email,
        username: out.user.username,
        displayName: out.user.displayName,
        elo: store.users.find((u) => u.id === out.user.id)?.elo ?? 1500,
        homeVenueId: out.user.homeVenueId,
        location: out.user.location,
        locationPrivacy: out.user.locationPrivacy,
      };
      const i = store.users.findIndex((u) => u.id === mapped.id);
      if (i >= 0) store.users[i] = mapped;
      else store.users.push(mapped);
      return mapped;
    }
    await delay();
    return store.users.find((u) => u.email === email) ?? store.users[0]!;
  },
  async me(): Promise<User | null> {
    if (API_MODE === "live") {
      try {
        const out = await http<{ user: any }>(`/v1/auth/me`);
        const known = store.users.find((u) => u.id === out.user.id);
        return {
          id: out.user.id,
          email: out.user.email,
          username: out.user.username,
          displayName: out.user.displayName,
          elo: known?.elo ?? 1500,
          homeVenueId: out.user.homeVenueId,
          location: out.user.location,
          locationPrivacy: out.user.locationPrivacy,
        };
      } catch (e: any) {
        if (e?.status === 401) return null;
        throw e;
      }
    }
    await delay(20);
    return store.users[0] ?? null;
  },
  async logout(): Promise<void> {
    if (API_MODE === "live") {
      await http(`/v1/auth/logout`, { method: "POST", body: JSON.stringify({}) });
      setAuthToken(null);
      return;
    }
    await delay(20);
  },
  // Users (backend has no dedicated users endpoint yet; keep deterministic fixture source)
  async listUsers(): Promise<User[]> {
    if (API_MODE === "live") {
      const out = await http<{ users: any[] }>(`/v1/users`);
      return out.users.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        elo: store.users.find((x) => x.id === u.id)?.elo ?? 1500,
        homeVenueId: u.homeVenueId,
        location: u.location,
        locationPrivacy: u.locationPrivacy,
      }));
    }
    await delay(20);
    return store.users;
  },
  async getUser(id: string): Promise<User | undefined> {
    if (API_MODE === "live") {
      try {
        const out = await http<{ user: any }>(`/v1/users/${id}/profile`);
        return {
          id: out.user.id,
          email: out.user.email,
          username: out.user.username,
          displayName: out.user.displayName,
          elo: store.users.find((x) => x.id === id)?.elo ?? 1500,
          homeVenueId: out.user.homeVenueId,
          location: out.user.location,
          locationPrivacy: out.user.locationPrivacy,
        };
      } catch (e: any) {
        if (e?.status === 404) return undefined;
        throw e;
      }
    }
    await delay(20);
    return store.users.find((u) => u.id === id);
  },
  async updateMyLocation(
    userId: string,
    input: { lat: number; lng: number; locationPrivacy?: "hybrid_private" | "precise" },
  ): Promise<User> {
    if (API_MODE === "live") {
      const out = await http<{ user: any }>(`/v1/users/${userId}/location`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      const mapped: User = {
        id: out.user.id,
        email: out.user.email,
        username: out.user.username,
        displayName: out.user.displayName,
        elo: store.users.find((x) => x.id === userId)?.elo ?? 1500,
        homeVenueId: out.user.homeVenueId,
        location: out.user.location,
        locationPrivacy: out.user.locationPrivacy,
      };
      const i = store.users.findIndex((u) => u.id === mapped.id);
      if (i >= 0) store.users[i] = mapped;
      else store.users.push(mapped);
      return mapped;
    }
    await delay(20);
    const user = store.users.find((u) => u.id === userId) ?? store.users[0]!;
    user.location = { lat: input.lat, lng: input.lng, updatedAt: new Date().toISOString() };
    user.locationPrivacy = input.locationPrivacy ?? "hybrid_private";
    return user;
  },

  // Wallet
  async getWallet(userId: string): Promise<Wallet | undefined> {
    if (API_MODE === "live") {
      try {
        const b = await http<{ userId: string; currency: string; availableMinor: number; lockedMinor: number }>(
          `/v1/wallets/${userId}`,
        );
        return mapWallet(b);
      } catch (e: any) {
        if (e?.status === 404) return undefined;
        throw e;
      }
    }
    await delay();
    return store.wallets.find((w) => w.userId === userId);
  },
  async createWallet(userId: string): Promise<Wallet> {
    if (API_MODE === "live") {
      const created = await http<{ userId: string; currency: string; createdAt: string }>(`/v1/wallets`, {
        method: "POST",
        body: JSON.stringify({ userId, currency: "USD" }),
      });
      return {
        id: `w_${created.userId}`,
        userId: created.userId,
        currency: created.currency as Wallet["currency"],
        available: 0,
        locked: 0,
        createdAt: created.createdAt,
      };
    }
    await delay();
    const w: Wallet = {
      id: `w_${userId}`,
      userId,
      currency: "USD",
      available: 0,
      locked: 0,
      createdAt: new Date().toISOString(),
    };
    store.wallets.push(w);
    return w;
  },
  async creditWallet(userId: string, amount: number): Promise<Wallet> {
    if (API_MODE === "live") {
      const cur = (await this.getWallet(userId))?.currency ?? "USD";
      const out = await http<{ wallet: { userId: string; currency: string; availableMinor: number; lockedMinor: number } }>(
        `/v1/wallets/${userId}/credit`,
        {
          method: "POST",
          body: JSON.stringify({
            amountMinor: amount,
            currency: cur,
            idempotencyKey: idem(`credit-${userId}`),
          }),
        },
      );
      return mapWallet(out.wallet);
    }
    await delay();
    const w = store.wallets.find((x) => x.userId === userId)!;
    w.available += amount;
    return { ...w };
  },
  async debitWallet(userId: string, amount: number): Promise<Wallet> {
    if (API_MODE === "live") {
      const cur = (await this.getWallet(userId))?.currency ?? "USD";
      const out = await http<{ wallet: { userId: string; currency: string; availableMinor: number; lockedMinor: number } }>(
        `/v1/wallets/${userId}/debit`,
        {
          method: "POST",
          body: JSON.stringify({
            amountMinor: amount,
            currency: cur,
            idempotencyKey: idem(`debit-${userId}`),
          }),
        },
      );
      return mapWallet(out.wallet);
    }
    await delay();
    const w = store.wallets.find((x) => x.userId === userId)!;
    w.available = Math.max(0, w.available - amount);
    return { ...w };
  },

  // Challenges
  async listChallenges(): Promise<Challenge[]> {
    if (API_MODE === "live") {
      const rows = await http<BackendChallenge[]>(`/v1/challenges`);
      return rows.map(mapChallenge);
    }
    await delay();
    return store.challenges.slice().sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  },
  async getChallenge(id: string): Promise<Challenge | undefined> {
    if (API_MODE === "live") {
      try {
        const ch = await http<BackendChallenge>(`/v1/challenges/${id}`);
        return mapChallenge(ch);
      } catch (e: any) {
        if (e?.status === 404) return undefined;
        throw e;
      }
    }
    await delay();
    return store.challenges.find((c) => c.id === id);
  },
  async createChallenge(
    input: Omit<Challenge, "id" | "state" | "createdAt" | "updatedAt" | "funding" | "timeline">,
  ): Promise<Challenge> {
    if (API_MODE === "live") {
      const created = await http<BackendChallenge>(`/v1/challenges`, {
        method: "POST",
        body: JSON.stringify({
          sport: input.sport,
          mode: input.mode === "team" ? "team" : "1v1",
          creatorPartyId: input.creatorId,
          opponentPartyId: input.opponentId,
          stakeMinor: input.stake,
          currency: input.currency,
          initialState: "pending",
        }),
      });
      if (input.venueId) {
        const patched = await http<BackendChallenge>(`/v1/challenges/${created.id}/venue`, {
          method: "PATCH",
          body: JSON.stringify({
            actor: { kind: "party", partyId: input.creatorId },
            venueId: input.venueId,
          }),
        });
        return mapChallenge(patched);
      }
      return mapChallenge(created);
    }
    await delay();
    const c: Challenge = {
      ...input,
      id: `c_${Math.random().toString(36).slice(2, 7)}`,
      state: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      funding: { creatorLocked: false, opponentLocked: false, amount: input.stake, currency: input.currency },
      timeline: [{ id: "t_1", at: new Date().toISOString(), type: "submitted", by: input.creatorId, message: "Challenge submitted" }],
    };
    store.challenges.unshift(c);
    return c;
  },
  async transitionChallenge(id: string, action: string, by?: string): Promise<Challenge> {
    if (API_MODE === "live") {
      const ch = await this.getChallenge(id);
      if (!ch) throw { code: "not_found", status: 404, message: "Challenge not found" };
      const actor = { kind: "party", partyId: by ?? ch.creatorId } as const;
      if (action === "accept") return mapChallenge(await http(`/v1/challenges/${id}/accept`, { method: "POST", body: JSON.stringify({ actor }) }));
      if (action === "decline") return mapChallenge(await http(`/v1/challenges/${id}/decline`, { method: "POST", body: JSON.stringify({ actor }) }));
      if (action === "cancel") return mapChallenge(await http(`/v1/challenges/${id}/cancel`, { method: "POST", body: JSON.stringify({ actor }) }));
      if (action === "lock_creator") {
        await http(`/v1/challenges/${id}/escrow/lock`, {
          method: "POST",
          body: JSON.stringify({ userId: ch.creatorId, idempotencyKey: idem(`lock-${id}-creator`) }),
        });
        const after = await this.getChallenge(id);
        if (!after) throw { code: "not_found", status: 404, message: "Challenge not found" };
        return after;
      }
      if (action === "lock_opponent") {
        await http(`/v1/challenges/${id}/escrow/lock`, {
          method: "POST",
          body: JSON.stringify({ userId: ch.opponentId, idempotencyKey: idem(`lock-${id}-opponent`) }),
        });
        const after = await this.getChallenge(id);
        if (!after) throw { code: "not_found", status: 404, message: "Challenge not found" };
        return after;
      }
      if (action === "confirm") {
        await http(`/v1/challenges/${id}/results/confirm`, {
          method: "POST",
          body: JSON.stringify({ actor }),
        });
        const after = await this.getChallenge(id);
        if (!after) throw { code: "not_found", status: 404, message: "Challenge not found" };
        return after;
      }
      if (action === "dispute") {
        await http(`/v1/challenges/${id}/results/dispute`, {
          method: "POST",
          body: JSON.stringify({ actor, reason: "Disputed from challenge detail" }),
        });
        const after = await this.getChallenge(id);
        if (!after) throw { code: "not_found", status: 404, message: "Challenge not found" };
        return after;
      }
      if (action === "payout") {
        await http(`/v1/challenges/${id}/escrow/payout`, {
          method: "POST",
          body: JSON.stringify({
            winnerUserId: ch.creatorId,
            idempotencyKey: idem(`payout-${id}`),
          }),
        });
        const after = await this.getChallenge(id);
        if (!after) throw { code: "not_found", status: 404, message: "Challenge not found" };
        return after;
      }
      if (action === "refund") {
        await http(`/v1/challenges/${id}/resolve-dispute`, {
          method: "POST",
          body: JSON.stringify({
            actor: { kind: "admin", adminId: "ui_admin" },
            resolution: "refund",
          }),
        });
        const after = await this.getChallenge(id);
        if (!after) throw { code: "not_found", status: 404, message: "Challenge not found" };
        return after;
      }
      throw { code: "unsupported_action", status: 400, message: `Unsupported action: ${action}` };
    }
    await delay();
    const c = store.challenges.find((x) => x.id === id);
    if (!c) throw { code: "NOT_FOUND", status: 404, message: "Challenge not found" };
    const next: Record<string, ChallengeState | undefined> = {
      accept: "accepted",
      decline: "cancelled",
      cancel: "cancelled",
      lock_creator: c.state,
      lock_opponent: c.state,
      schedule: "scheduled",
      submit_result: "completed",
      confirm: "confirmed",
      dispute: "disputed",
      payout: "paid_out",
      refund: "refunded",
    };
    if (action === "lock_creator") c.funding.creatorLocked = true;
    if (action === "lock_opponent") c.funding.opponentLocked = true;
    if (c.funding.creatorLocked && c.funding.opponentLocked && c.state === "accepted") c.state = "funded";
    const n = next[action];
    if (n) c.state = n;
    c.updatedAt = new Date().toISOString();
    c.timeline.push({ id: `t_${c.timeline.length + 1}`, at: c.updatedAt, type: action, by, message: `Action: ${action}` });
    return { ...c };
  },

  // Matchmaking
  async findMatches(input: {
    sport: Sport;
    userId: string;
    maxKm?: number;
    stakeMin?: number;
    stakeMax?: number;
  }): Promise<MatchCandidate[]> {
    if (API_MODE === "live") {
      const seeker = store.users.find((u) => u.id === input.userId);
      if (!seeker) return [];
      const seekerLoc = userLocation(seeker.id);
      const candidates = store.users
        .filter((u) => u.id !== input.userId)
        .map((u) => ({
          party: "user",
          userId: u.id,
          sport: input.sport,
          location: userLocation(u.id),
          skillRating: u.elo,
          wins: 10,
          losses: 5,
          preferredStake: {
            currency: "USD",
            minMinor: input.stakeMin ?? 1000,
            maxMinor: input.stakeMax ?? 20000,
          },
          preferredFormats: ["1v1"],
          availabilityUtc: [{ weekday: 1, startMinute: 1080, endMinute: 1260 }],
          trustScore: 80,
          verificationScore: 80,
          lastActiveAt: new Date().toISOString(),
        }));
      const out = await http<{
        recommendations: Array<{
          opponent: { userId?: string };
          matchQualityScore?: number;
          matchQuality?: number;
          fairnessConfidence: number;
          acceptanceLikelihood: number;
          distanceKm?: number;
          featureBreakdown?: { distanceKm?: number };
          explanation: string | string[];
        }>;
      }>(`/v1/matchmaking/recommend`, {
        method: "POST",
        body: JSON.stringify({
          seeker: {
            kind: "user",
            userId: seeker.id,
            pastOpponentIds: [],
            sport: input.sport,
            location: seekerLoc,
            maxTravelDistanceKm: input.maxKm ?? 15,
            skillRating: seeker.elo,
            wins: 10,
            losses: 5,
            preferredStake: {
              currency: "USD",
              minMinor: input.stakeMin ?? 1000,
              maxMinor: input.stakeMax ?? 20000,
            },
            preferredFormats: ["1v1"],
            availabilityUtc: [{ weekday: 1, startMinute: 1080, endMinute: 1260 }],
            trustScore: 80,
            verificationScore: 80,
            lastActiveAt: new Date().toISOString(),
            rivalryModeEnabled: false,
          },
          candidates,
        }),
      });
      return out.recommendations.map((r) => {
        const user = store.users.find((u) => u.id === r.opponent.userId) ?? store.users[0]!;
        return {
          user,
          matchQuality: r.matchQualityScore ?? r.matchQuality ?? 0,
          fairnessConfidence: r.fairnessConfidence,
          acceptanceLikelihood: r.acceptanceLikelihood,
          distanceKm: r.featureBreakdown?.distanceKm ?? r.distanceKm ?? 0,
          explanation: Array.isArray(r.explanation) ? r.explanation : [r.explanation],
        };
      });
    }
    await delay();
    return store.users
      .filter((u) => u.id !== input.userId)
      .map((u, i) => ({
        user: u,
        matchQuality: 0.95 - i * 0.07,
        fairnessConfidence: 0.9 - i * 0.05,
        acceptanceLikelihood: 0.85 - i * 0.06,
        distanceKm: 2.4 + i * 1.7,
        explanation: [
          `ELO delta ${Math.abs(1820 - u.elo)}`,
          i === 0 ? "Same home venue" : `${(2.4 + i * 1.7).toFixed(1)} km away`,
          i % 2 === 0 ? "Overlapping availability windows" : "Recent activity in last 7 days",
        ],
      }))
      .sort((a, b) => b.matchQuality - a.matchQuality);
  },

  // Venues
  async rankVenues(input: { participants: string[]; sport: Sport }): Promise<VenueRanking[]> {
    if (API_MODE === "live") {
      const [a, b] = input.participants.map((p) => userLocation(p));
      const center = a && b ? midpoint(a, b) : userLocation(input.participants[0] ?? "u_1");
      const out = await http<{
        venues?: Array<{
          venueId: string;
          name?: string;
          suitabilityScore: number;
          centralityScore: number;
          travels?: Array<{ partyId: string; distanceKm: number }>;
          homeCourtForPartyId?: string;
          explanation: string;
        }>;
        rankings?: Array<{
          venue?: { id?: string };
          venueId?: string;
          name?: string;
          suitabilityScore: number;
          centralityScore: number;
          travelKmByPartyId?: Record<string, number>;
          travels?: Array<{ partyId: string; distanceKm: number }>;
          homeCourtForPartyId?: string;
          explanation: string;
        }>;
      }>(`/v1/venue-discovery/rank`, {
        method: "POST",
        body: JSON.stringify({
          sport: input.sport,
          participants: input.participants.map((p) => ({
            partyId: p,
            location: userLocation(p),
            maxTravelDistanceKm: 20,
            homeVenueIds: store.users.filter((u) => u.id === p).map((u) => u.homeVenueId).filter(Boolean),
          })),
          venues: store.venues.map((v) => ({
            id: v.id,
            name: v.name,
            location: { lat: v.lat, lng: v.lng },
            sports: v.sports,
            venueType: "facility",
            isPublic: true,
            qualityScore: v.qualityScore,
          })),
          preferences: {
            preferredRadiusKm: 10,
            preferredVenueTypes: ["facility", "court"],
            publicPrivate: "either",
            priceSensitivity: "any",
            parkingImportance: 0.4,
            lightingImportance: 0.5,
            indoorOutdoor: "either",
          },
        }),
      });
      const rows = out.venues ?? out.rankings ?? [];
      return rows.map((r) => {
        const venueId = r.venueId ?? r.venue?.id;
        const travelKmByParty = r.travelKmByPartyId
          ? r.travelKmByPartyId
          : Object.fromEntries((r.travels ?? []).map((t) => [t.partyId, t.distanceKm]));
        return {
          venue: store.venues.find((v) => v.id === venueId) ?? {
            id: venueId ?? "unknown",
            name: r.name ?? venueId ?? "Unknown venue",
            city: "Unknown",
            lat: 0,
            lng: 0,
            qualityScore: 0.5,
            sports: [input.sport],
          },
          suitabilityScore: r.suitabilityScore ?? 0,
          centrality: r.centralityScore ?? 0,
          travelKmByParty,
          homeCourtFor: r.homeCourtForPartyId,
          rationale: [r.explanation ?? "No explanation available"],
        };
      }).sort((x, y) => {
        const dx = Math.hypot(x.venue.lat - center.lat, x.venue.lng - center.lng);
        const dy = Math.hypot(y.venue.lat - center.lat, y.venue.lng - center.lng);
        if (Math.abs(dx - dy) > 0.01) return dx - dy;
        return y.suitabilityScore - x.suitabilityScore;
      });
    }
    await delay();
    return store.venues
      .filter((v) => v.sports.includes(input.sport))
      .map((v, i) => ({
        venue: v,
        suitabilityScore: 0.96 - i * 0.08,
        centrality: 0.9 - i * 0.06,
        travelKmByParty: Object.fromEntries(input.participants.map((p, j) => [p, 1.2 + j * 1.8 + i * 0.7])),
        homeCourtFor: store.users.find((u) => u.homeVenueId === v.id && input.participants.includes(u.id))?.id,
        rationale: [
          `Quality score ${v.qualityScore.toFixed(2)}`,
          `Centrality ${(0.9 - i * 0.06).toFixed(2)}`,
          i === 0 ? "Minimizes travel for both parties" : "Balanced travel split",
        ],
      }))
      .sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  },

  // Schedule
  async getProposal(id: string): Promise<ScheduleProposal | undefined> {
    if (API_MODE === "live") {
      const view = await http<BackendScheduleView>(`/v1/challenges/${id}/schedule`);
      return mapSchedule(view);
    }
    await delay();
    return store.proposals[id];
  },
  async proposeSchedule(
    challengeId: string,
    by: string,
    slots: { startsAt: string; endsAt: string; venueId?: string }[],
    expiresAt: string,
  ): Promise<ScheduleProposal> {
    if (API_MODE === "live") {
      const view = await http<BackendScheduleView>(`/v1/challenges/${challengeId}/schedule/propose`, {
        method: "POST",
        body: JSON.stringify({
          actor: { kind: "party", partyId: by },
          slots: slots.map((s) => ({ startAt: s.startsAt, endAt: s.endsAt })),
          expiresAt,
        }),
      });
      const mapped = mapSchedule(view);
      if (!mapped) throw new Error("No schedule proposal returned");
      return mapped;
    }
    await delay();
    const id = `sp_${Math.random().toString(36).slice(2, 6)}`;
    const proposal: ScheduleProposal = {
      id,
      proposedBy: by,
      expiresAt,
      state: "pending",
      slots: slots.map((s, i) => ({ id: `slot_${i}`, ...s, confirmedBy: [by] })),
    };
    store.proposals[id] = proposal;
    const c = store.challenges.find((x) => x.id === challengeId);
    if (c) {
      c.scheduleProposalId = id;
      c.updatedAt = new Date().toISOString();
    }
    return proposal;
  },
  async confirmSlot(proposalId: string, slotId: string, by: string): Promise<ScheduleProposal> {
    if (API_MODE === "live") {
      const challengeId = proposalId;
      const view = await http<BackendScheduleView>(`/v1/challenges/${challengeId}/schedule/confirm`, {
        method: "POST",
        body: JSON.stringify({ actor: { kind: "party", partyId: by }, slotId }),
      });
      const mapped = mapSchedule(view);
      if (!mapped) throw new Error("No schedule proposal returned");
      return mapped;
    }
    await delay();
    const p = store.proposals[proposalId];
    const slot = p.slots.find((s) => s.id === slotId)!;
    if (!slot.confirmedBy.includes(by)) slot.confirmedBy.push(by);
    if (slot.confirmedBy.length >= 2) {
      p.state = "confirmed";
      p.confirmedSlotId = slotId;
    }
    return { ...p };
  },

  // Check-in
  async getCheckIn(challengeId: string): Promise<CheckInStatus> {
    if (API_MODE === "live") {
      const s = await http<{
        bothCheckedInValid: boolean;
        policy: { maxDistanceMeters: number; windowBeforeStartMinutes: number; windowAfterStartMinutes: number };
        creator: null | { partyId: string; submittedAt: string; coordinates: { lat: number; lng: number }; valid: boolean; invalidReasons: string[] };
        opponent: null | { partyId: string; submittedAt: string; coordinates: { lat: number; lng: number }; valid: boolean; invalidReasons: string[] };
      }>(`/v1/challenges/${challengeId}/checkin`);
      const records = [s.creator, s.opponent]
        .filter(Boolean)
        .map((r) => ({
          userId: r!.partyId,
          at: r!.submittedAt,
          lat: r!.coordinates.lat,
          lng: r!.coordinates.lng,
          valid: r!.valid,
          reason: r!.invalidReasons[0] ?? "ok",
        }));
      return {
        bothCheckedInValid: s.bothCheckedInValid,
        policyRadiusM: s.policy.maxDistanceMeters,
        windowMinutes: s.policy.windowBeforeStartMinutes + s.policy.windowAfterStartMinutes,
        records,
      };
    }
    await delay();
    return (
      store.checkins[challengeId] ?? {
        bothCheckedInValid: false,
        policyRadiusM: 150,
        windowMinutes: 20,
        records: [],
      }
    );
  },
  async submitCheckIn(challengeId: string, userId: string, lat: number, lng: number): Promise<CheckInStatus> {
    if (API_MODE === "live") {
      await http(`/v1/challenges/${challengeId}/checkin`, {
        method: "POST",
        body: JSON.stringify({ actor: { kind: "party", partyId: userId }, lat, lng }),
      });
      return this.getCheckIn(challengeId);
    }
    await delay();
    const status = store.checkins[challengeId] ?? {
      bothCheckedInValid: false,
      policyRadiusM: 150,
      windowMinutes: 20,
      records: [],
    };
    const valid = Math.random() > 0.2;
    status.records.push({ userId, at: new Date().toISOString(), lat, lng, valid, reason: valid ? "ok" : "outside_radius" });
    status.bothCheckedInValid = status.records.filter((r) => r.valid).length >= 2;
    store.checkins[challengeId] = status;
    return { ...status };
  },

  // Results
  async getRound(id: string): Promise<ResultRound | undefined> {
    if (API_MODE === "live") {
      const challengeId = roundChallengeIndex.get(id) ?? id;
      const out = await http<BackendResultsView>(`/v1/challenges/${challengeId}/results`);
      const mapped = mapRound(out);
      if (mapped) roundChallengeIndex.set(mapped.id, challengeId);
      return mapped;
    }
    await delay();
    return store.rounds[id];
  },
  async submitResult(challengeId: string, by: string, payload: Record<string, unknown>): Promise<ResultRound> {
    if (API_MODE === "live") {
      const out = await http<BackendResultsView>(`/v1/challenges/${challengeId}/results/submit`, {
        method: "POST",
        body: JSON.stringify({ actor: { kind: "party", partyId: by }, payload }),
      });
      const mapped = mapRound(out);
      if (!mapped) throw new Error("No active round");
      roundChallengeIndex.set(mapped.id, challengeId);
      return mapped;
    }
    await delay();
    const id = `r_${Math.random().toString(36).slice(2, 6)}`;
    const round: ResultRound = {
      id,
      fingerprint: `fp_${Math.random().toString(36).slice(2, 8)}`,
      submittedBy: by,
      submittedAt: new Date().toISOString(),
      payload,
      decisions: [{ userId: by, decision: "confirm" }],
      state: "pending",
    };
    store.rounds[id] = round;
    const c = store.challenges.find((x) => x.id === challengeId);
    if (c) {
      c.activeRoundId = id;
      c.state = "completed";
      c.updatedAt = new Date().toISOString();
    }
    return round;
  },
  async confirmResult(roundId: string, by: string, ackFingerprint?: string): Promise<ResultRound> {
    if (API_MODE === "live") {
      const challengeId = roundChallengeIndex.get(roundId) ?? roundId;
      const out = await http<BackendResultsView>(`/v1/challenges/${challengeId}/results/confirm`, {
        method: "POST",
        body: JSON.stringify({ actor: { kind: "party", partyId: by }, ackFingerprint }),
      });
      const mapped = mapRound(out);
      if (!mapped) throw new Error("No active round");
      roundChallengeIndex.set(mapped.id, challengeId);
      return mapped;
    }
    await delay();
    const r = store.rounds[roundId];
    r.decisions.push({ userId: by, decision: "confirm", ackFingerprint });
    r.state = "confirmed";
    return { ...r };
  },
  async disputeResult(
    roundId: string,
    by: string,
    reason: string,
    counterPayload?: Record<string, unknown>,
  ): Promise<ResultRound> {
    if (API_MODE === "live") {
      const challengeId = roundChallengeIndex.get(roundId) ?? roundId;
      const out = await http<BackendResultsView>(`/v1/challenges/${challengeId}/results/dispute`, {
        method: "POST",
        body: JSON.stringify({ actor: { kind: "party", partyId: by }, reason, counterPayload }),
      });
      const mapped = mapRound(out);
      if (!mapped) throw new Error("No active round");
      roundChallengeIndex.set(mapped.id, challengeId);
      return mapped;
    }
    await delay();
    const r = store.rounds[roundId];
    r.decisions.push({ userId: by, decision: "dispute", reason });
    r.state = "disputed";
    return { ...r };
  },

  // Fraud
  async getFraud(challengeId: string): Promise<FraudEvaluation[]> {
    if (API_MODE === "live") {
      const out = await http<{ latest: any | null }>(`/v1/challenges/${challengeId}/fraud`);
      if (!out.latest) return [];
      const ev: FraudEvaluation = {
        id: `${challengeId}-latest`,
        challengeId,
        version: out.latest.version,
        score: out.latest.fraudScore,
        recommendedAction:
          out.latest.recommendedAction === "hold_payout"
            ? "block"
            : out.latest.recommendedAction === "manual_review"
              ? "review"
              : "allow",
        payoutEligible: out.latest.payoutEligible,
        signals: (out.latest.signals ?? []).map((s: any) => ({
          code: s.id,
          weight: s.weight,
          description: s.detail ?? s.id,
        })),
        evaluatedAt: out.latest.evaluatedAt,
      };
      return [ev];
    }
    await delay();
    return store.fraud[challengeId] ?? [];
  },
  async evaluateFraud(challengeId: string): Promise<FraudEvaluation> {
    if (API_MODE === "live") {
      const out = await http<any>(`/v1/challenges/${challengeId}/fraud/evaluate`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      return {
        id: `${challengeId}-v${out.version}`,
        challengeId,
        version: out.version,
        score: out.fraudScore,
        recommendedAction:
          out.recommendedAction === "hold_payout"
            ? "block"
            : out.recommendedAction === "manual_review"
              ? "review"
              : "allow",
        payoutEligible: out.payoutEligible,
        signals: (out.signals ?? []).map((s: any) => ({
          code: s.id,
          weight: s.weight,
          description: s.detail ?? s.id,
        })),
        evaluatedAt: out.evaluatedAt,
      };
    }
    await delay();
    const list = store.fraud[challengeId] ?? [];
    const ev: FraudEvaluation = {
      id: `fe_${list.length + 1}`,
      challengeId,
      version: list.length + 1,
      score: Math.random() * 0.5 + 0.1,
      recommendedAction: "allow",
      payoutEligible: true,
      signals: [{ code: "BASELINE_OK", weight: 0.05, description: "No anomalies detected" }],
      evaluatedAt: new Date().toISOString(),
    };
    store.fraud[challengeId] = [...list, ev];
    return ev;
  },

  // Leaderboard
  async leaderboard(_sport?: Sport, _window: "all_time" | "weekly" = "all_time"): Promise<LeaderboardRow[]> {
    if (API_MODE === "live") {
      const sport = _sport ?? "tennis";
      const out = await http<{ entries: any[] }>(`/v1/leaderboards/${sport}?window=${_window}`);
      return out.entries.map((e) => ({
        rank: e.rank,
        userId: e.userId,
        username: store.users.find((u) => u.id === e.userId)?.displayName ?? e.userId,
        elo: e.elo,
        ratingType: e.ratingType ?? (_sport === "chess" ? "elo" : "performance"),
        displayScore: e.displayScore ?? e.elo,
        wins: e.wins,
        losses: e.losses,
        streak: e.winStreak > 0 ? e.winStreak : -Math.max(e.lossStreak ?? 0, 0),
        windowWins: e.windowWins,
      }));
    }
    await delay();
    return store.leaderboard;
  },

  // Notifications
  async listNotifications(userId: string): Promise<AppNotification[]> {
    if (API_MODE === "live") {
      const out = await http<{ notifications: any[] }>(`/v1/users/${userId}/notifications`);
      const mapped = out.notifications.map((n) => {
        notifUserIndex.set(n.id, n.userId);
        return {
          id: n.id,
          userId: n.userId,
          type: n.type,
          title: n.title,
          body: n.body,
          read: n.readAt !== null,
          createdAt: n.createdAt,
          metadata: (n.metadata ?? {}) as { challengeId?: string; [k: string]: unknown },
        } satisfies AppNotification;
      });
      return mapped.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
    await delay();
    return store.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },
  async markRead(id: string): Promise<void> {
    if (API_MODE === "live") {
      const userId = notifUserIndex.get(id);
      if (!userId) throw { code: "notification_user_missing", status: 400, message: "Load notifications before marking read" };
      await http(`/v1/users/${userId}/notifications/${id}/read`, { method: "POST" });
      return;
    }
    await delay(50);
    const n = store.notifications.find((x) => x.id === id);
    if (n) n.read = true;
  },
  async markAllRead(userId: string): Promise<void> {
    if (API_MODE === "live") {
      await http(`/v1/users/${userId}/notifications/read-all`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      return;
    }
    await delay();
    store.notifications.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
  },
};

export type Api = typeof api;
