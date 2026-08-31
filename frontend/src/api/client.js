const BASE = "/api";

// The admin session token (JWT) issued by POST /api/auth/login. Kept in
// memory plus sessionStorage (not localStorage) so a logged-in organizer
// survives a page refresh but the session still clears when the tab/
// browser closes -- a reasonable middle ground for a shared kiosk-style
// registration desk.
const STORAGE_KEY = "hackteam_admin_token";
let authToken = "";
try {
  authToken = sessionStorage.getItem(STORAGE_KEY) || "";
} catch (_) {
  /* sessionStorage unavailable (e.g. private mode) -- fall back to memory only */
}

export function setAuthToken(token) {
  authToken = token || "";
  try {
    if (authToken) sessionStorage.setItem(STORAGE_KEY, authToken);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {
    /* ignore */
  }
}
export function getAuthToken() {
  return authToken;
}

function buildQuery(params = {}) {
  const usable = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (usable.length === 0) return "";
  return "?" + new URLSearchParams(usable).toString();
}

function authHeaders(extra = {}) {
  return {
    ...extra,
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
}

async function parseErrorDetail(res) {
  let detail = "Request failed";
  try {
    const body = await res.json();
    detail = body?.error?.detail || body?.detail || detail;
    if (Array.isArray(detail)) {
      detail = detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
    }
  } catch (_) {
    /* ignore */
  }
  return detail;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders({ "Content-Type": "application/json", ...(options.headers || {}) }),
    ...options,
  });
  if (!res.ok) {
    let detail = await parseErrorDetail(res);
    if (res.status === 401) detail = "Admin login required or session expired. " + detail;
    if (res.status === 403) detail = "Your admin account doesn't have permission for this. " + detail;
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function requestForm(path, formData, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
    ...options,
  });
  if (!res.ok) throw new Error(await parseErrorDetail(res));
  return res.json();
}

async function downloadFile(path, filename) {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  // --- Participants ---
  listParticipants: (filters = {}) => request(`/participants${buildQuery(filters)}`),
  createParticipant: (payload) =>
    request("/participants", { method: "POST", body: JSON.stringify(payload) }),
  updateParticipant: (id, payload) =>
    request(`/participants/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteParticipant: (id) => request(`/participants/${id}`, { method: "DELETE" }),
  exportParticipantsCsv: () => downloadFile("/participants/export.csv", "participants.csv"),
  importParticipantsCsv: (file) => {
    const form = new FormData();
    form.append("file", file);
    return requestForm("/admin/participants/import-csv", form);
  },

  // --- Teams ---
  generateTeams: (teamSize) =>
    request("/teams/generate", {
      method: "POST",
      body: JSON.stringify({ team_size: teamSize }),
    }),
  listTeams: () => request("/teams"),
  exportTeamsCsv: () => downloadFile("/teams/export.csv", "teams.csv"),
  renameTeam: (id, name) =>
    request(`/teams/${id}/rename${buildQuery({ name })}`, { method: "PATCH" }),
  resetTeams: () => request("/admin/teams/reset", { method: "POST" }),

  findTeammates: (participantId, topN = 5) =>
    request(`/find-teammates/${participantId}?top_n=${topN}`),

  health: () => request("/health"),

  // --- Auth ---
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  me: () => request("/auth/me"),
  changePassword: (current_password, new_password) =>
    request("/auth/change-password", { method: "POST", body: JSON.stringify({ current_password, new_password }) }),
  listAdmins: () => request("/auth/admins"),
  createAdmin: (payload) => request("/auth/admins", { method: "POST", body: JSON.stringify(payload) }),
  updateAdmin: (id, payload) => request(`/auth/admins/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAdmin: (id) => request(`/auth/admins/${id}`, { method: "DELETE" }),

  // --- Admin dashboard ---
  getStats: () => request("/admin/stats"),
  getAuditLog: (limit = 100) => request(`/admin/audit-log${buildQuery({ limit })}`),
};
