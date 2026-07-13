// Use relative paths in production (when served by Node.js) and localhost:5000 in development
export const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';
export const UPLOAD_BASE_URL = import.meta.env.DEV ? 'http://localhost:5000/uploads' : '/uploads';

export const apiFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('kamuchiToken');
    
    const headers = { ...options.headers };

    // Don't set Content-Type for FormData as fetch will do it with the correct boundary
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('kamuchiToken');
        localStorage.removeItem('kamuchiUser');
        // Avoid infinite reload if already on login screen
        if (!window.location.pathname.includes('login')) {
            window.location.reload(); 
        }
    }

    return response;
};

export const apiUpload = async (endpoint, formData) => {
    const token = localStorage.getItem('kamuchiToken');
    
    const headers = {
        ...formData.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData
    });

    if (response.status === 401) {
        localStorage.removeItem('kamuchiToken');
        localStorage.removeItem('kamuchiUser');
        window.location.reload();
    }

    return response;
};
