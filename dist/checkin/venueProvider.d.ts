/**
 * Resolves venue coordinates for proximity checks.
 * Production: Postgres join on `venues` or geocoding service.
 */
export interface VenueLocationProvider {
    getLocation(venueId: string): {
        lat: number;
        lng: number;
    } | null;
}
/** In-memory registry; seed known test venue ids + any overrides. */
export declare class InMemoryVenueLocationProvider implements VenueLocationProvider {
    private readonly locations;
    constructor(extra?: Record<string, {
        lat: number;
        lng: number;
    }>);
    getLocation(venueId: string): {
        lat: number;
        lng: number;
    } | null;
    /** Test / admin: register a venue location at runtime. */
    setLocation(venueId: string, loc: {
        lat: number;
        lng: number;
    }): void;
}
/** Fixed coordinates for deterministic tests (NYC, SF, London). */
export declare const DEFAULT_VENUE_COORDINATES: Record<string, {
    lat: number;
    lng: number;
}>;
//# sourceMappingURL=venueProvider.d.ts.map