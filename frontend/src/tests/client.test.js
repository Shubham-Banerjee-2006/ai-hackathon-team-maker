import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, setAuthToken, getAuthToken } from "../api/client";

describe("api client", () => {
  beforeEach(() => {
    setAuthToken("");
    global.fetch = vi.fn();
  });

  it("stores and returns the admin session token", () => {
    setAuthToken("jwt-secret-token");
    expect(getAuthToken()).toBe("jwt-secret-token");
  });

  it("sends the Authorization bearer header when a token is set", async () => {
    setAuthToken("jwt-secret-token");
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([]),
    });
    await api.listParticipants();
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer jwt-secret-token");
  });

  it("omits the Authorization header when no token is set", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([]),
    });
    await api.listParticipants();
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("builds query strings from provided filters, skipping empty values", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([]),
    });
    await api.listParticipants({ search: "ada", skill: undefined, unassigned_only: false });
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain("search=ada");
    expect(url).not.toContain("skill=");
  });

  it("throws a readable error message on a failed request", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { detail: "A participant with this email already exists." } }),
    });
    await expect(api.createParticipant({})).rejects.toThrow(/already exists/);
  });

  it("calls the login endpoint with credentials", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "abc", token_type: "bearer", expires_in: 3600, admin: { username: "admin" } }),
    });
    await api.login("admin", "hunter2");
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain("/auth/login");
    expect(JSON.parse(options.body)).toEqual({ username: "admin", password: "hunter2" });
  });
});
