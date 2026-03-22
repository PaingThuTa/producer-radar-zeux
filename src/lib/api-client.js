const makeEntityClient = (path) => ({
  list: (sort, limit) => {
    const params = new URLSearchParams();
    if (sort) params.set('sort', sort);
    if (limit) params.set('limit', String(limit));
    return fetch(`/api/${path}?${params}`).then(r => r.json());
  },
  get: (id) => fetch(`/api/${path}/${id}`).then(r => r.json()),
  create: (data) => fetch(`/api/${path}`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  }).then(r => r.json()),
  update: (id, data) => fetch(`/api/${path}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  }).then(r => r.json()),
  delete: (id) => fetch(`/api/${path}/${id}`, {
    method: 'DELETE',
  }).then(r => r.json()),
});

export const api = {
  entities: {
    YouTubeProducer: makeEntityClient('youtube-producers'),
    PlacementProducer: makeEntityClient('placement-producers'),
    DiscoveryLog: makeEntityClient('discovery-logs'),
  },
};
