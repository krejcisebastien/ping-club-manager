import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Licence du club expirée ou absente (402) en cours de session : on renvoie
// vers la page Licence, qui recharge le statut.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 402 && error.response.data?.code === "LICENSE_REQUIRED" && window.location.pathname !== "/license") {
      window.location.assign("/license");
    }
    return Promise.reject(error);
  }
);
