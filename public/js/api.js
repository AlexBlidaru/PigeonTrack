async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = "/login.html";
    throw new Error("Neautentificat");
  }
  const isJson = (res.headers.get("Content-Type") || "").includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new Error((data && data.error) || `Eroare ${res.status}`);
  }
  return data;
}

export const api = {
  // pigeons
  getPigeons: () => request("/api/pigeons"),
  getPigeon: (id) => request(`/api/pigeons/${id}`),
  createPigeon: (data) => request("/api/pigeons", { method: "POST", body: JSON.stringify(data) }),
  updatePigeon: (id, data) => request(`/api/pigeons/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePigeon: (id) => request(`/api/pigeons/${id}`, { method: "DELETE" }),

  // categories
  getCategories: () => request("/api/categories"),
  createCategory: (data) => request("/api/categories", { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: "DELETE" }),

  // events
  getEvents: () => request("/api/events"),
  getEvent: (id) => request(`/api/events/${id}`),
  createEvent: (data) => request("/api/events", { method: "POST", body: JSON.stringify(data) }),
  updateEvent: (id, data) => request(`/api/events/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteEvent: (id) => request(`/api/events/${id}`, { method: "DELETE" }),

  addParticipant: (eventId, data) => request(`/api/events/${eventId}/participants`, { method: "POST", body: JSON.stringify(data) }),
  updateParticipant: (eventId, pid, data) => request(`/api/events/${eventId}/participants/${pid}`, { method: "PUT", body: JSON.stringify(data) }),
  removeParticipant: (eventId, pid) => request(`/api/events/${eventId}/participants/${pid}`, { method: "DELETE" }),

  // photos
  uploadPhoto: (file) => {
    const form = new FormData();
    form.append("photo", file);
    return request("/api/photos/upload", { method: "POST", body: form });
  },

  // settings
  getSettings: () => request("/api/settings"),
  saveSettings: (data) => request("/api/settings", { method: "PUT", body: JSON.stringify(data) }),

  // reports
  getResults: () => request("/api/reports/results"),

  // auth
  authStatus: () => request("/api/auth/status"),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  changePassword: (data) => request("/api/auth/change-password", { method: "POST", body: JSON.stringify(data) }),
};

export function photoUrl(key) {
  return key ? `/api/photos/${key}` : null;
}
