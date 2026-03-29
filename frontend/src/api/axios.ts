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

// Interceptor para manejar Paginación de Django transparente y errores de sesión
api.interceptors.response.use(
  (response) => {
    // Si el backend devuelve un objeto paginado de Django Rest Framework
    if (
      response.data &&
      typeof response.data === 'object' &&
      Array.isArray(response.data.results) &&
      typeof response.data.count === 'number'
    ) {
      // Retornar los resultados como el array nativo para no romper componentes existentes
      // pero le incrustamos la metadata de paginación por si un componente avanzado la necesita
      const paginatedArray = response.data.results;
      paginatedArray.count = response.data.count;
      paginatedArray.next = response.data.next;
      paginatedArray.previous = response.data.previous;
      response.data = paginatedArray;
    }
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem('serkan_token');
      localStorage.removeItem('serkan_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
