import { describe, expect, it, beforeEach } from "vitest";
import { ChallengeService } from "../src/challenges/service.js";
import { InMemoryChallengeRepository } from "../src/challenges/repository.js";
import { InMemorySchedulingRepository } from "../src/scheduling/repository.js";
import { SchedulingService } from "../src/scheduling/service.js";
import { PLATFORM_WALLET_USER_ID, WalletDomainError } from "../src/wallet/model.js";
import { InMemoryWalletRepository } from "../src/wallet/repository.js";
import { WalletService } from "../src/wallet/service.js";
import { InMemoryResultsRepository } from "../src/results/repository.js";
import { ResultsService } from "../src/results/service.js";

const creatorId = "p_creator";
const opponentId = "p_opponent";
const admin = { kind: "admin" as const, adminId: "adm1" };
const system = { kind: "system" as const };

describe("WalletService", () => {
  let chRepo: InMemoryChallengeRepository;
  let wRepo: InMemoryWalletRepository;
  let challenges: ChallengeService;
  let wallet: WalletService;
  let scheduling: SchedulingService;
  let results: ResultsService;

  beforeEach(() => {
    chRepo = new InMemoryChallengeRepository();
    wRepo = new InMemoryWalletRepository();
    challenges = new ChallengeService(chRepo);
    results = new ResultsService(new InMemoryResultsRepository(), challenges);
    wallet = new WalletService(wRepo, challenges);
    scheduling = new SchedulingService(new InMemorySchedulingRepository(), challenges);
  });

  async function seedWalletsAndAcceptedChallenge(stakeMinor = 1000) {
    await wallet.createWallet({ userId: creatorId, currency: "USD" });
    await wallet.createWallet({ userId: opponentId, currency: "USD" });
    await wallet.creditWallet({
      userId: creatorId,
      amountMinor: stakeMinor * 5,
      currency: "USD",
      idempotencyKey: `credit-c-${stakeMinor}`,
    });
    await wallet.creditWallet({
      userId: opponentId,
      amountMinor: stakeMinor * 5,
      currency: "USD",
      idempotencyKey: `credit-o-${stakeMinor}`,
    });
    const ch = await challenges.createChallenge({
      sport: "tennis",
      mode: "1v1",
      creatorPartyId: creatorId,
      opponentPartyId: opponentId,
      stakeMinor,
      currency: "USD",
    });
    await challenges.accept(ch.id, { kind: "party", partyId: opponentId });
    return (await challenges.getChallenge(ch.id))!;
  }

  it("creates wallet and returns balances with zero ledger", async () => {
    await wallet.createWallet({ userId: "u1", currency: "USD" });
    const b = await wallet.getWalletBalances("u1");
    expect(b).toMatchObject({ userId: "u1", currency: "USD", availableMinor: 0, lockedMinor: 0 });
    expect(b.lockedByChallengeMinor).toEqual({});
  });

  it("credits available balance and rejects currency mismatch", async () => {
    await wallet.createWallet({ userId: "u1", currency: "USD" });
    const r = await wallet.creditWallet({
      userId: "u1",
      amountMinor: 500,
      currency: "USD",
      idempotencyKey: "idem-1",
    });
    expect(r.wallet.availableMinor).toBe(500);
    await expect(
      wallet.creditWallet({
        userId: "u1",
        amountMinor: 1,
        currency: "EUR",
        idempotencyKey: "idem-2",
      }),
    ).rejects.toMatchObject({ code: "currency_mismatch" });
  });

  it("replays credit idempotently without duplicating ledger rows", async () => {
    await wallet.createWallet({ userId: "u1", currency: "USD" });
    const a = await wallet.creditWallet({
      userId: "u1",
      amountMinor: 100,
      currency: "USD",
      idempotencyKey: "same",
    });
    const b = await wallet.creditWallet({
      userId: "u1",
      amountMinor: 100,
      currency: "USD",
      idempotencyKey: "same",
    });
    expect(b).toEqual(a);
    const all = await wRepo.listAllLedger();
    expect(all.filter((e) => e.walletUserId === "u1")).toHaveLength(1);
  });

  it("rejects reusing idempotency key for a different command", async () => {
    await wallet.createWallet({ userId: "u1", currency: "USD" });
    await wallet.creditWallet({
      userId: "u1",
      amountMinor: 200,
      currency: "USD",
      idempotencyKey: "shared-key",
    });
    await expect(
      wallet.debitWallet({
        userId: "u1",
        amountMinor: 50,
        currency: "USD",
        idempotencyKey: "shared-key",
      }),
    ).rejects.toMatchObject({ code: "duplicate_idempotency_key" });
  });

  it("debits available and rejects insufficient funds", async () => {
    await wallet.createWallet({ userId: "u1", currency: "USD" });
    await wallet.creditWallet({
      userId: "u1",
      amountMinor: 100,
      currency: "USD",
      idempotencyKey: "c1",
    });
    const d = await wallet.debitWallet({
      userId: "u1",
      amountMinor: 40,
      currency: "USD",
      idempotencyKey: "d1",
    });
    expect(d.wallet.availableMinor).toBe(60);
    await expect(
      wallet.debitWallet({
        userId: "u1",
        amountMinor: 100,
        currency: "USD",
        idempotencyKey: "d2",
      }),
    ).rejects.toMatchObject({ code: "insufficient_funds" });
  });

  it("rejects lock when insufficient available", async () => {
    const ch = await seedWalletsAndAcceptedChallenge(5000);
    await wallet.debitWallet({
      userId: creatorId,
      amountMinor: ch.stakeMinor * 5 - ch.stakeMinor + 1,
      currency: "USD",
      idempotencyKey: "strip-creator",
    });
    await expect(
      wallet.lockChallengeStake({
        challengeId: ch.id,
        userId: creatorId,
        idempotencyKey: "lock-fail",
      }),
    ).rejects.toMatchObject({ code: "insufficient_funds" });
  });

  it("locks escrow per participant, funds challenge when both locked, and isChallengeFullyEscrowed", async () => {
    const ch = await seedWalletsAndAcceptedChallenge();
    expect(await wallet.isChallengeFullyEscrowed(ch.id)).toBe(false);

    const l1 = await wallet.lockChallengeStake({
      challengeId: ch.id,
      userId: creatorId,
      idempotencyKey: "lock-c",
    });
    expect(l1.challenge.state).toBe("accepted");
    expect(l1.wallet.lockedMinor).toBe(ch.stakeMinor);

    const l2 = await wallet.lockChallengeStake({
      challengeId: ch.id,
      userId: opponentId,
      idempotencyKey: "lock-o",
    });
    expect(l2.challenge.state).toBe("funded");
    expect(await wallet.isChallengeFullyEscrowed(ch.id)).toBe(true);

    const cBal = await wallet.getWalletBalances(creatorId);
    const oBal = await wallet.getWalletBalances(opponentId);
    expect(cBal.availableMinor).toBe(ch.stakeMinor * 5 - ch.stakeMinor);
    expect(cBal.lockedMinor).toBe(ch.stakeMinor);
    expect(oBal.lockedMinor).toBe(ch.stakeMinor);
  });

  it("rejects second lock for same user with different idempotency key", async () => {
    const ch = await seedWalletsAndAcceptedChallenge();
    await wallet.lockChallengeStake({ challengeId: ch.id, userId: creatorId, idempotencyKey: "a" });
    await expect(
      wallet.lockChallengeStake({ challengeId: ch.id, userId: creatorId, idempotencyKey: "b" }),
    ).rejects.toMatchObject({ code: "stake_already_locked" });
  });

  it("replays lock idempotently for the same key", async () => {
    const ch = await seedWalletsAndAcceptedChallenge();
    const a = await wallet.lockChallengeStake({
      challengeId: ch.id,
      userId: creatorId,
      idempotencyKey: "idem-lock",
    });
    const b = await wallet.lockChallengeStake({
      challengeId: ch.id,
      userId: creatorId,
      idempotencyKey: "idem-lock",
    });
    expect(b).toEqual(a);
  });

  it("refunds escrow after challenge refunded and is idempotent", async () => {
    const ch = await seedWalletsAndAcceptedChallenge();
    await wallet.lockChallengeStake({ challengeId: ch.id, userId: creatorId, idempotencyKey: "lc" });
    await wallet.lockChallengeStake({ challengeId: ch.id, userId: opponentId, idempotencyKey: "lo" });
    await challenges.cancel(ch.id, { kind: "admin", adminId: "adm" });

    const r1 = await wallet.refundChallengeEscrow({ challengeId: ch.id, idempotencyKey: "ref1" });
    expect(r1.ledgerEntryIds).toHaveLength(2);
    const c = await wallet.getWalletBalances(creatorId);
    expect(c.lockedMinor).toBe(0);
    expect(c.availableMinor).toBe(ch.stakeMinor * 5);

    const r2 = await wallet.refundChallengeEscrow({ challengeId: ch.id, idempotencyKey: "ref1" });
    expect(r2).toEqual(r1);
  });

  async function driveToConfirmed(chId: string) {
    const exp = new Date(Date.now() + 7 * 86400000).toISOString();
    await challenges.patchVenue(chId, admin, "venue_test");
    const view = await scheduling.proposeSlots({
      challengeId: chId,
      actor: { kind: "party", partyId: creatorId },
      slots: [{ startAt: "2026-05-01T18:00:00.000Z", endAt: "2026-05-01T20:00:00.000Z" }],
      expiresAt: exp,
    });
    const slotId = view.activePendingProposal!.slots[0]!.id;
    await scheduling.confirmSlot({ challengeId: chId, actor: { kind: "party", partyId: creatorId }, slotId });
    await scheduling.confirmSlot({ challengeId: chId, actor: { kind: "party", partyId: opponentId }, slotId });
    await results.submitResult({
      challengeId: chId,
      actor: { kind: "party", partyId: creatorId },
      payload: { s: 1 },
    });
    await results.confirmResult({ challengeId: chId, actor: { kind: "party", partyId: opponentId } });
    return challenges.getChallenge(chId);
  }

  it("pays out to winner with platform fee and prevents double payout", async () => {
    const ch = await seedWalletsAndAcceptedChallenge(1000);
    await wallet.lockChallengeStake({ challengeId: ch.id, userId: creatorId, idempotencyKey: "lc" });
    await wallet.lockChallengeStake({ challengeId: ch.id, userId: opponentId, idempotencyKey: "lo" });
    const confirmed = await driveToConfirmed(ch.id);
    expect(confirmed.state).toBe("confirmed");

    const fee = 100;
    const out = await wallet.payoutChallengeEscrow({
      challengeId: ch.id,
      winnerUserId: creatorId,
      platformFeeMinor: fee,
      idempotencyKey: "pay1",
    });
    expect(out.challenge.state).toBe("paid_out");
    const winnerBal = out.wallets.find((w) => w.userId === creatorId)!;
    expect(winnerBal.availableMinor).toBe(ch.stakeMinor * 5 - ch.stakeMinor + (ch.stakeMinor * 2 - fee));
    const platformBal = await wallet.getWalletBalances(PLATFORM_WALLET_USER_ID);
    expect(platformBal.availableMinor).toBe(fee);

    const replay = await wallet.payoutChallengeEscrow({
      challengeId: ch.id,
      winnerUserId: creatorId,
      platformFeeMinor: fee,
      idempotencyKey: "pay1",
    });
    expect(replay.challenge.state).toBe("paid_out");

    await expect(
      wallet.payoutChallengeEscrow({
        challengeId: ch.id,
        winnerUserId: creatorId,
        platformFeeMinor: 0,
        idempotencyKey: "pay2",
      }),
    ).rejects.toMatchObject({ code: "already_paid_out" });
  });

  it("rejects payout from non-confirmed state", async () => {
    const ch = await seedWalletsAndAcceptedChallenge();
    await wallet.lockChallengeStake({ challengeId: ch.id, userId: creatorId, idempotencyKey: "lc" });
    await wallet.lockChallengeStake({ challengeId: ch.id, userId: opponentId, idempotencyKey: "lo" });
    await expect(
      wallet.payoutChallengeEscrow({
        challengeId: ch.id,
        winnerUserId: creatorId,
        idempotencyKey: "too-early",
      }),
    ).rejects.toMatchObject({ code: "invalid_payout" });
  });

  it("refunds escrow on cancelled challenge before funding", async () => {
    const ch = await seedWalletsAndAcceptedChallenge();
    await challenges.cancel(ch.id, { kind: "party", partyId: creatorId });
    const r = await wallet.refundChallengeEscrow({ challengeId: ch.id, idempotencyKey: "r0" });
    expect(r.ledgerEntryIds).toHaveLength(0);
    expect(r.wallets).toHaveLength(0);
  });
});

describe("WalletDomainError", () => {
  it("exposes httpStatus for API mapping", () => {
    const err = new WalletDomainError({
      code: "not_found",
      message: "missing",
      httpStatus: 404,
    });
    expect(err).toBeInstanceOf(WalletDomainError);
    expect(err.httpStatus).toBe(404);
  });
});
