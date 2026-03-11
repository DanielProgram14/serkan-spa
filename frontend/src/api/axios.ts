import axios from 'axios';

const api = axios.create({
  // Asegúrate de que tu backend esté corriendo en este puerto
  baseURL: 'http://127.0.0.1:8000/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para enviar el token automáticamente en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('serkan_token');
  if (token && config.headers) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export default api;
