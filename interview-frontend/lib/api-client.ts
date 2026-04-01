export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  // High-Security Auth Token Detection
  let authHeaders: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.access_token) {
          authHeaders['Authorization'] = `Bearer ${user.access_token}`;
        }
      } catch (e) {
        console.warn("Auth token mismatch in localStorage");
      }
    }
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API Request failed: ${response.status}`);
  }

  return response.json();
}

export const endpoints = {
  health: '/',
  uploadAudio: '/upload-audio',
  setupSession: '/session/setup',
  getSessionScoring: (id: number) => `/scoring/session/${id}`,
  submitAnswer: '/scoring/submit-answer',
  updateEyeContact: '/scoring/eye-contact',
  finalizeSession: (id: number) => `/scoring/finalize/${id}`,
};
