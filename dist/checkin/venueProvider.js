/** In-memory registry; seed known test venue ids + any overrides. */
export class InMemoryVenueLocationProvider {
    locations = new Map();
    constructor(extra) {
        for (const [id, loc] of Object.entries(DEFAULT_VENUE_COORDINATES)) {
            this.locations.set(id, loc);
        }
        if (extra) {
            for (const [id, loc] of Object.entries(extra)) {
                this.locations.set(id, loc);
            }
        }
    }
    getLocation(venueId) {
        return this.locations.get(venueId) ?? null;
    }
    /** Test / admin: register a venue location at runtime. */
    setLocation(venueId, loc) {
        this.locations.set(venueId, loc);
    }
}
/** Fixed coordinates for deterministic tests (NYC, SF, London). */
export const DEFAULT_VENUE_COORDINATES = {
    venue_1: { lat: 40.758, lng: -73.9855 },
    venue_test: { lat: 37.7749, lng: -122.4194 },
    venue_x: { lat: 51.5074, lng: -0.1278 },
};
//# sourceMappingURL=venueProvider.js.map