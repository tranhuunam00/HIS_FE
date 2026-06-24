import api from './api';

export const formService = {
  getForms: async (type, category) => {
    const params = {};
    if (type) params.type = type;
    if (category) params.category = category;
    const res = await api.get('/forms', { params });
    return res.data;
  },

  getFormById: async (id) => {
    const res = await api.get(`/forms/${id}`);
    return res.data;
  },

  createForm: async (data) => {
    const res = await api.post('/forms', data);
    return res.data;
  },

  updateForm: async (id, data) => {
    const res = await api.put(`/forms/${id}`, data);
    return res.data;
  },

  toggleFormStatus: async (id, isActive) => {
    const res = await api.patch(`/forms/${id}/status`, { isActive });
    return res.data;
  },
};
