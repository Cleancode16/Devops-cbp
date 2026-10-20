import axios from 'axios';

// Always relative: Vite proxy (dev) or nginx (Docker/K8s) forwards /api to the server.
const api = axios.create({ baseURL: '/api', timeout: 10000 });

export function errorMessage(err) {
  return err?.response?.data?.error || err?.message || 'Something went wrong';
}

export default api;
