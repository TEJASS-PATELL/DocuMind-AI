import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, 
  headers: {
    "Content-Type": "application/json", 
  },
});

api.interceptors.request.use((config) => {
  const guestToken = sessionStorage.getItem("guestToken");
  if (guestToken) {
    config.headers.Authorization = `Bearer ${guestToken}`;
  }
  return config;
});

export default api;
