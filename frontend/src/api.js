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

  getMotorcycles: () => request('/motorcycles'),
  addMotorcycle: (payload) => request('/motorcycles', { method: 'POST', body: payload }),
  updateMotorcycle: (id, payload) => request(`/motorcycles/${id}`, { method: 'PUT', body: payload }),
  deleteMotorcycle: (id) => request(`/motorcycles/${id}`, { method: 'DELETE' }),

  createRental: (payload) => request('/rentals', { method: 'POST', body: payload }),
  returnRental: (id) => request(`/rentals/${id}/return`, { method: 'PUT' }),
  myRentals: () => request('/rentals/mine'),
  allRentals: () => request('/rentals'),

  myPoints: () => request('/points/me'),
  leaderboard: () => request('/points/leaderboard'),
  rewards: () => request('/points/rewards'),
  redeem: (rewardId) => request(`/points/redeem/${rewardId}`, { method: 'POST' }),
};
