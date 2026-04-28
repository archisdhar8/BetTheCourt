import { describe, expect, it } from "vitest";
import { buildApiServer } from "../src/http/server.js";

describe("Auth + Users HTTP", () => {
  it("supports login, me, and location update", async () => {
    const app = buildApiServer();
    await app.ready();

    const login = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: "alex@wagr.dev", password: "password123" },
    });
    expect(login.statusCode).toBe(200);
    const token = (JSON.parse(login.body) as { token: string }).token;
    expect(token).toMatch(/^sess_/);

    const me = await app.inject({
      method: "GET",
      url: "/v1/auth/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.statusCode).toBe(200);

    const patch = await app.inject({
      method: "PATCH",
      url: "/v1/users/u_1/location",
      payload: { lat: 37.7749, lng: -122.4194, locationPrivacy: "hybrid_private" },
    });
    expect(patch.statusCode).toBe(200);
    const patched = JSON.parse(patch.body) as { user: { location: { lat: number; lng: number } } };
    expect(patched.user.location.lat).toBe(37.7749);

    await app.close();
  });
});
