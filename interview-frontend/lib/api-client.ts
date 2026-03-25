export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
  finalizeSession: (id: number) => `/scoring/finalize/${id}`,
};
