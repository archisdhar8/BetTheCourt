export function counterpartyPartyId(ch, partyId) {
    if (partyId === ch.creatorPartyId)
        return ch.opponentPartyId;
    if (partyId === ch.opponentPartyId)
        return ch.creatorPartyId;
    return null;
}
//# sourceMappingURL=model.js.map