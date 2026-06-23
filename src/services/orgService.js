import api from './api';

export const orgService = {
  getOrganization: async () => {
    const res = await api.get('/org');
    return res.data;
  },

  updateOrganization: async (data) => {
    const res = await api.put('/org', data);
    return res.data;
  },

  getBranches: async () => {
    const res = await api.get('/branches');
    return res.data;
  },

  getBranch: async (id) => {
    const res = await api.get(`/branches/${id}`);
    return res.data;
  },

  createBranch: async (data) => {
    const res = await api.post('/branches', data);
    return res.data;
  },

  updateBranch: async (id, data) => {
    const res = await api.put(`/branches/${id}`, data);
    return res.data;
  },

  toggleBranchStatus: async (id, isActive) => {
    const res = await api.patch(`/branches/${id}/status`, { isActive });
    return res.data;
  },
};
