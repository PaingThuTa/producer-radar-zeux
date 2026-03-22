const checkOk = async (r) => {
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
};

const makeEntityClient = (path) => ({
  list: (sort, limit) => {
    const params = new URLSearchParams();
    if (sort) params.set('sort', sort);
    if (limit) params.set('limit', String(limit));
    return fetch(`/api/${path}?${params}`).then(checkOk);
  },
  get: (id) => fetch(`/api/${path}/${id}`).then(checkOk),
  create: (data) => fetch(`/api/${path}`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  }).then(checkOk),
  update: (id, data) => fetch(`/api/${path}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  }).then(checkOk),
  delete: (id) => fetch(`/api/${path}/${id}`, {
    method: 'DELETE',
  }).then(checkOk),
  deleteAll: () => fetch(`/api/${path}`, {
    method: 'DELETE',
  }).then(checkOk),
});

export const api = {
  entities: {
    YouTubeProducer: makeEntityClient('youtube-producers'),
    PlacementProducer: makeEntityClient('placement-producers'),
    DiscoveryLog: makeEntityClient('discovery-logs'),
  },
};
