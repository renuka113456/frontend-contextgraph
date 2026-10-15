
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8081/api"
).replace(/\/+$/, "");

const TOKEN_KEY = "contextgraph_token";
const USER_KEY = "contextgraph_user";

// Store and retrieve authentication details
export const authStore = {
  token() {
    return localStorage.getItem(TOKEN_KEY);
  },

  user() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  },

  save(token, user) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }

    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// Common API request handler
async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = authStore.token();
  const isForm = options.body instanceof FormData;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (
    options.body &&
    !isForm &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`,
      {
        ...options,
        headers,
      }
    );
  } catch {
    throw new Error(
      `Cannot connect to the backend at ${API_BASE}. ` +
      "Make sure the backend is running and CORS allows " +
      "http://localhost:5173."
    );
  }

  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "string"
        ? data
        : data?.message ||
          data?.error ||
          data?.detail ||
          `Request failed (${response.status})`;

    if (response.status === 401) {
      authStore.clear();
      window.dispatchEvent(
        new Event("contextgraph:unauthorized")
      );
    }

    throw new Error(message);
  }

  return data;
}

// Helper functions
const json = (value) => JSON.stringify(value);

const unwrapList = (value) =>
  Array.isArray(value)
    ? value
    : value?.content ||
      value?.items ||
      value?.data ||
      value?.results ||
      [];

// ContextGraph API methods
export const api = {
  baseUrl: API_BASE,

  // Authentication
  async login(email, password) {
    const data = await request("/auth/login", {
      method: "POST",
      body: json({ email, password }),
    });

    const token =
      data?.token ||
      data?.accessToken ||
      data?.jwt ||
      data?.data?.token;

    if (!token) {
      throw new Error(
        "Login response did not contain a JWT token. " +
        "Check the backend login endpoint and response format."
      );
    }

    const user =
      data?.user ||
      data?.profile ||
      {
        name: data?.name,
        email: data?.email || email,
      };

    authStore.save(token, user);

    return { token, user };
  },

  register(name, email, password) {
    return request("/auth/register", {
      method: "POST",
      body: json({ name, email, password }),
    });
  },

  me() {
    return request("/auth/me");
  },

  // Dashboard
  dashboard() {
    return request("/dashboard/stats");
  },

  // Documents
  async documents() {
    return unwrapList(await request("/documents"));
  },

  upload(file) {
    const form = new FormData();
    form.append("file", file);

    return request("/documents/upload", {
      method: "POST",
      body: form,
    });
  },

  document(id) {
    return request(`/documents/${encodeURIComponent(id)}`);
  },

  deleteDocument(id) {
    return request(`/documents/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // Search
  async search(query) {
    return unwrapList(
      await request(`/search?q=${encodeURIComponent(query)}`)
    );
  },

  async searchHistory() {
    return unwrapList(await request("/search/history"));
  },

  // Knowledge graph and timeline
  graph() {
    return request("/graph");
  },

  async timeline() {
    return unwrapList(await request("/timeline"));
  },

  // Collections
  async collections() {
    return unwrapList(await request("/collections"));
  },

  createCollection(payload) {
    return request("/collections", {
      method: "POST",
      body: json(payload),
    });
  },

  updateCollection(id, payload) {
    return request(
      `/collections/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: json(payload),
      }
    );
  },

  deleteCollection(id) {
    return request(
      `/collections/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
  },

  // User profile
  profile() {
    return request("/profile");
  },

  updateProfile(payload) {
    return request("/profile", {
      method: "PATCH",
      body: json(payload),
    });
  },
};
