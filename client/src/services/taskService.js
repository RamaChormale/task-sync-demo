const BASE = '/api/tasks';

const request = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
};

export const taskService = {
  getAll: () => request(BASE),
  create: (data) => request(BASE, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id) => request(`${BASE}/${id}`, { method: 'DELETE' }),
};
