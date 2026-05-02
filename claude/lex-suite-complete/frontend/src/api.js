const TOKEN_KEY = "lexsuite_token";

export function apiFetch(url, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Merge caller-supplied headers, letting them override defaults
  const mergedHeaders = { ...headers, ...(options.headers || {}) };

  return fetch(url, { ...options, headers: mergedHeaders }).then((res) => {
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
    }
    return res;
  });
}
