const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  googleLogin: (id_token) => request('/auth/google', { method: 'POST', body: { id_token }, auth: false }),
  forgotPassword: (email, turnstile_token) => request('/auth/forgot-password', { method: 'POST', body: { email, turnstile_token }, auth: false }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload, auth: false }),
  getProfile: () => request('/auth/me'),
  updateProfile: (payload) => request('/auth/me', { method: 'PUT', body: payload }),
  changePassword: (payload) => request('/auth/me/password', { method: 'PUT', body: payload }),

  getMotorcycles: () => request('/motorcycles'),
  getAvailability: (motorcycleId) => request(`/motorcycles/${motorcycleId}/availability`),
  addMotorcycle: (payload) => request('/motorcycles', { method: 'POST', body: payload }),
  updateMotorcycle: (id, payload) => request(`/motorcycles/${id}`, { method: 'PUT', body: payload }),
  deleteMotorcycle: (id) => request(`/motorcycles/${id}`, { method: 'DELETE' }),

  createRental: (payload) => request('/rentals', { method: 'POST', body: payload }), // { motorcycle_id, start_at, end_at }
  approveRental: (id) => request(`/rentals/${id}/approve`, { method: 'PUT' }),
  rejectRental: (id) => request(`/rentals/${id}/reject`, { method: 'PUT' }),
  extendRental: (id) => request(`/rentals/${id}/extend`, { method: 'PUT' }),
  returnRental: (id) => request(`/rentals/${id}/return`, { method: 'PUT' }),
  myRentals: () => request('/rentals/mine'),
  allRentals: () => request('/rentals'),

  myNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),

  myPoints: () => request('/points/me'),
  leaderboard: () => request('/points/leaderboard'),
  rewards: () => request('/points/rewards'),
  redeem: (rewardId) => request(`/points/redeem/${rewardId}`, { method: 'POST' }),
};
