import type {
  Challenge, Venue, User, Wallet, AppNotification, LeaderboardRow,
  ScheduleProposal, ResultRound, FraudEvaluation, CheckInStatus,
} from "./types";

const now = Date.now();
const iso = (offsetMin = 0) => new Date(now + offsetMin * 60_000).toISOString();

export const mockUsers: User[] = [
  { id: "u_1", username: "alex_smash", displayName: "Alex Rivera", elo: 1820, homeVenueId: "v_1" },
  { id: "u_2", username: "ko_phoenix", displayName: "Kira Okonkwo", elo: 1755, homeVenueId: "v_2" },
  { id: "u_3", username: "marco_ace", displayName: "Marco Diaz", elo: 1690, homeVenueId: "v_3" },
  { id: "u_4", username: "lina_cue", displayName: "Lina Park", elo: 1602, homeVenueId: "v_4" },
  { id: "u_5", username: "tomo_spin", displayName: "Tomo Yagi", elo: 1875, homeVenueId: "v_2" },
  { id: "u_6", username: "dee_dart", displayName: "Dee Chen", elo: 1540, homeVenueId: "v_5" },
];

export const mockVenues: Venue[] = [
  { id: "v_1", name: "Riverside Courts", city: "Brooklyn, NY", lat: 40.7, lng: -73.99, qualityScore: 0.92, sports: ["basketball", "tennis", "padel"] },
  { id: "v_2", name: "Eastside Sports Club", city: "Queens, NY", lat: 40.74, lng: -73.87, qualityScore: 0.88, sports: ["basketball", "tennis", "ping_pong", "padel"] },
  { id: "v_3", name: "Downtown Pool Hall", city: "Manhattan, NY", lat: 40.72, lng: -74.0, qualityScore: 0.81, sports: ["pool", "darts"] },
  { id: "v_4", name: "Harbor Rec Center", city: "Jersey City, NJ", lat: 40.72, lng: -74.04, qualityScore: 0.76, sports: ["pool", "ping_pong", "chess"] },
  { id: "v_5", name: "North Star Pub", city: "Hoboken, NJ", lat: 40.74, lng: -74.03, qualityScore: 0.7, sports: ["darts", "pool"] },
  { id: "v_6", name: "Grand Chess Hall", city: "Manhattan, NY", lat: 40.76, lng: -73.97, qualityScore: 0.95, sports: ["chess"] },
];

export const mockWallets: Wallet[] = mockUsers.map((u, i) => ({
  id: `w_${u.id}`,
  userId: u.id,
  currency: "USD",
  available: 250 + i * 75,
  locked: i === 0 ? 50 : i === 1 ? 25 : 0,
  createdAt: iso(-60 * 24 * 30),
}));

const baseChallenge = (over: Partial<Challenge>): Challenge => ({
  id: over.id ?? "c_x",
  sport: "tennis",
  mode: "singles",
  stake: 50,
  currency: "USD",
  creatorId: "u_1",
  opponentId: "u_2",
  venueId: "v_1",
  state: "pending",
  createdAt: iso(-120),
  updatedAt: iso(-30),
  funding: { creatorLocked: false, opponentLocked: false, amount: 50, currency: "USD" },
  timeline: [{ id: "t_1", at: iso(-120), type: "submitted", by: "u_1", message: "Challenge submitted" }],
  ...over,
});

export const mockChallenges: Challenge[] = [
  baseChallenge({ id: "c_1", state: "pending", stake: 50 }),
  baseChallenge({
    id: "c_2", state: "funded", stake: 100, opponentId: "u_3", venueId: "v_2",
    funding: { creatorLocked: true, opponentLocked: true, amount: 100, currency: "USD" },
    timeline: [
      { id: "t1", at: iso(-300), type: "submitted", by: "u_1", message: "Challenge submitted" },
      { id: "t2", at: iso(-260), type: "accepted", by: "u_3", message: "Opponent accepted" },
      { id: "t3", at: iso(-220), type: "funds_locked", by: "u_1", message: "Creator locked stake" },
      { id: "t4", at: iso(-200), type: "funds_locked", by: "u_3", message: "Opponent locked stake" },
    ],
  }),
  baseChallenge({
    id: "c_3", state: "scheduled", stake: 75, opponentId: "u_5", venueId: "v_2",
    funding: { creatorLocked: true, opponentLocked: true, amount: 75, currency: "USD" },
    scheduleProposalId: "sp_3",
    timeline: [
      { id: "t1", at: iso(-1000), type: "submitted", message: "Challenge submitted" },
      { id: "t2", at: iso(-900), type: "accepted", message: "Accepted" },
      { id: "t3", at: iso(-800), type: "funded", message: "Both sides funded" },
      { id: "t4", at: iso(-400), type: "scheduled", message: "Slot confirmed" },
    ],
  }),
  baseChallenge({
    id: "c_4", state: "completed", stake: 40, opponentId: "u_4", sport: "pool", venueId: "v_3",
    funding: { creatorLocked: true, opponentLocked: true, amount: 40, currency: "USD" },
    activeRoundId: "r_4",
    timeline: [
      { id: "t1", at: iso(-2000), type: "submitted", message: "Challenge submitted" },
      { id: "t2", at: iso(-1800), type: "scheduled", message: "Slot confirmed" },
      { id: "t3", at: iso(-200), type: "result_submitted", by: "u_1", message: "Result submitted" },
    ],
  }),
  baseChallenge({
    id: "c_5", state: "confirmed", stake: 60, opponentId: "u_6", sport: "darts", venueId: "v_5",
    funding: { creatorLocked: true, opponentLocked: true, amount: 60, currency: "USD" },
    timeline: [
      { id: "t1", at: iso(-5000), type: "submitted", message: "Challenge submitted" },
      { id: "t2", at: iso(-4500), type: "result_confirmed", message: "Result confirmed" },
    ],
  }),
  baseChallenge({
    id: "c_6", state: "disputed", stake: 80, opponentId: "u_3", sport: "chess", venueId: "v_6",
    funding: { creatorLocked: true, opponentLocked: true, amount: 80, currency: "USD" },
    activeRoundId: "r_6",
    timeline: [
      { id: "t1", at: iso(-3000), type: "submitted", message: "Challenge submitted" },
      { id: "t2", at: iso(-1500), type: "result_submitted", message: "Result submitted" },
      { id: "t3", at: iso(-1400), type: "result_disputed", message: "Opponent disputed" },
    ],
  }),
  baseChallenge({
    id: "c_7", state: "paid_out", stake: 120, opponentId: "u_2", sport: "padel", venueId: "v_1",
    funding: { creatorLocked: false, opponentLocked: false, amount: 120, currency: "USD" },
    timeline: [
      { id: "t1", at: iso(-9000), type: "submitted", message: "Challenge submitted" },
      { id: "t2", at: iso(-8500), type: "result_confirmed", message: "Confirmed" },
      { id: "t3", at: iso(-8400), type: "paid_out", message: "Payout released to winner" },
    ],
  }),
];

export const mockProposals: Record<string, ScheduleProposal> = {
  sp_3: {
    id: "sp_3",
    proposedBy: "u_1",
    expiresAt: iso(60 * 12),
    state: "confirmed",
    confirmedSlotId: "slot_b",
    slots: [
      { id: "slot_a", startsAt: iso(60 * 24), endsAt: iso(60 * 25), venueId: "v_2", confirmedBy: ["u_1"] },
      { id: "slot_b", startsAt: iso(60 * 48), endsAt: iso(60 * 49), venueId: "v_2", confirmedBy: ["u_1", "u_5"] },
    ],
  },
};

export const mockRounds: Record<string, ResultRound> = {
  r_4: {
    id: "r_4",
    fingerprint: "fp_4af2c1",
    submittedBy: "u_1",
    submittedAt: iso(-200),
    payload: { winner: "u_1", scores: [[8, 5], [8, 7]] },
    decisions: [{ userId: "u_1", decision: "confirm", ackFingerprint: "fp_4af2c1" }],
    state: "pending",
  },
  r_6: {
    id: "r_6",
    fingerprint: "fp_8de10b",
    submittedBy: "u_1",
    submittedAt: iso(-1500),
    payload: { winner: "u_1", scores: [["1-0"]] },
    decisions: [
      { userId: "u_1", decision: "confirm" },
      { userId: "u_3", decision: "dispute", reason: "Wrong winner recorded" },
    ],
    state: "disputed",
  },
};

export const mockFraud: Record<string, FraudEvaluation[]> = {
  c_6: [
    {
      id: "fe_1", challengeId: "c_6", version: 1, score: 0.74,
      recommendedAction: "review", payoutEligible: false,
      signals: [
        { code: "RAPID_RESUBMIT", weight: 0.3, description: "Result resubmitted within 60s" },
        { code: "SCORE_PATTERN_ANOMALY", weight: 0.25, description: "Unusual score progression" },
        { code: "OFF_VENUE_CHECKIN", weight: 0.19, description: "Check-in 180m outside policy radius" },
      ],
      evaluatedAt: iso(-1300),
    },
  ],
};

export const mockCheckIn: Record<string, CheckInStatus> = {
  c_3: {
    bothCheckedInValid: false,
    policyRadiusM: 150,
    windowMinutes: 20,
    records: [
      { userId: "u_1", at: iso(-5), lat: 40.74, lng: -73.87, valid: true, reason: "ok" },
    ],
  },
};

export const mockLeaderboard: LeaderboardRow[] = mockUsers
  .slice()
  .sort((a, b) => b.elo - a.elo)
  .map((u, i) => ({
    rank: i + 1, userId: u.id, username: u.displayName, elo: u.elo,
    wins: 30 - i * 3, losses: 8 + i * 2, streak: i === 0 ? 5 : -1 + i, windowWins: 6 - i,
  }));

export const mockNotifications: AppNotification[] = [
  { id: "n_1", userId: "u_1", type: "challenge_received", title: "New challenge", body: "Marco Diaz challenged you to pool · $40", read: false, createdAt: iso(-15), metadata: { challengeId: "c_4" } },
  { id: "n_2", userId: "u_1", type: "funds_locked", title: "Funds locked", body: "Both parties have locked stakes for #c_2", read: false, createdAt: iso(-90), metadata: { challengeId: "c_2" } },
  { id: "n_3", userId: "u_1", type: "schedule_confirmed", title: "Schedule confirmed", body: "Match scheduled in 48h at Eastside Sports Club", read: false, createdAt: iso(-200), metadata: { challengeId: "c_3" } },
  { id: "n_4", userId: "u_1", type: "result_disputed", title: "Result disputed", body: "Opponent disputed result on #c_6", read: false, createdAt: iso(-1400), metadata: { challengeId: "c_6" } },
  { id: "n_5", userId: "u_1", type: "payout_released", title: "Payout released", body: "$240 paid out for #c_7", read: true, createdAt: iso(-8400), metadata: { challengeId: "c_7" } },
  { id: "n_6", userId: "u_1", type: "fraud_flagged", title: "Review needed", body: "Fraud signal raised for #c_6", read: false, createdAt: iso(-1290), metadata: { challengeId: "c_6" } },
];
