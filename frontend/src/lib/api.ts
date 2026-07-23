import axios from "axios";

function getApiUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return "/api/v1";
  }
  const trimmed = envUrl.replace(/\/+$/, "");
  if (!trimmed.endsWith("/api/v1")) {
    return `${trimmed}/api/v1`;
  }
  return trimmed;
}

const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
