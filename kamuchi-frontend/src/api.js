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

export const apiFetchJson = async (endpoint, options = {}, fallback = null) => {
    try {
        const res = await apiFetch(endpoint, options);
        if (!res.ok) return fallback;
        return await res.json();
    } catch {
        return fallback;
    }
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

export const apiUploadWithProgress = (endpoint, formData, onProgress) => {
    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('kamuchiToken');
        const xhr = new XMLHttpRequest();
        
        xhr.open('POST', `${API_BASE_URL}${endpoint}`, true);
        
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                onProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 401) {
                localStorage.removeItem('kamuchiToken');
                localStorage.removeItem('kamuchiUser');
                window.location.reload();
            }
            
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve({ ok: true, status: xhr.status, response: xhr.responseText });
            } else {
                resolve({ ok: false, status: xhr.status, response: xhr.responseText });
            }
        };

        xhr.onerror = () => reject(new Error('Network Error'));

        xhr.send(formData);
    });
};
