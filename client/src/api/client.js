import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
api.interceptors.response.use((response) => response.data.data, (error) => {
  const friendly = new Error(error.response?.data?.error?.message || 'The server could not be reached.');
  friendly.status = error.response?.status;
  return Promise.reject(friendly);
});
export default api;
