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
  // filter: 'all' | 'open' | 'closed'
  getAll: (filter = 'all') => request(`${BASE}${filter !== 'all' ? `?filter=${filter}` : ''}`),
  create: (data) => request(BASE, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  // Closes the task — preserves the record, closes GitHub issue
  close: (id) => request(`${BASE}/${id}/close`, { method: 'PATCH' }),
  resolveConflict: (id, resolution) =>
    request(`${BASE}/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolution }) }),
};
