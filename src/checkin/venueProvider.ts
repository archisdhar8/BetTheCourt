/**
 * Resolves venue coordinates for proximity checks.
 * Production: Postgres join on `venues` or geocoding service.
 */
export interface VenueLocationProvider {
  getLocation(venueId: string): { lat: number; lng: number } | null;
}

/** In-memory registry; seed known test venue ids + any overrides. */
export class InMemoryVenueLocationProvider implements VenueLocationProvider {
  private readonly locations = new Map<string, { lat: number; lng: number }>();

  constructor(extra?: Record<string, { lat: number; lng: number }>) {
    for (const [id, loc] of Object.entries(DEFAULT_VENUE_COORDINATES)) {
      this.locations.set(id, loc);
    }
    if (extra) {
      for (const [id, loc] of Object.entries(extra)) {
        this.locations.set(id, loc);
      }
    }
  }

  getLocation(venueId: string): { lat: number; lng: number } | null {
    return this.locations.get(venueId) ?? null;
  }

  /** Test / admin: register a venue location at runtime. */
  setLocation(venueId: string, loc: { lat: number; lng: number }): void {
    this.locations.set(venueId, loc);
  }
}

/** Fixed coordinates for deterministic tests (NYC, SF, London). */
export const DEFAULT_VENUE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  venue_1: { lat: 40.758, lng: -73.9855 },
  venue_test: { lat: 37.7749, lng: -122.4194 },
  venue_x: { lat: 51.5074, lng: -0.1278 },
};
