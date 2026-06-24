import api from './api';

export const resourceService = {
  getResources: async (roomId) => {
    const params = roomId ? { roomId } : {};
    const res = await api.get('/resources', { params });
    return res.data;
  },

  createResource: async (data) => {
    const res = await api.post('/resources', data);
    return res.data;
  },

  updateResource: async (id, data) => {
    const res = await api.put(`/resources/${id}`, data);
    return res.data;
  },

  toggleResourceStatus: async (id, isActive) => {
    const res = await api.patch(`/resources/${id}/status`, { isActive });
    return res.data;
  },
};
