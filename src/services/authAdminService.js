import api from './api';

export const authAdminService = {
  getCurrentUser: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  getUsers: async (params = {}) => {
    const res = await api.get('/users', { params });
    return res.data;
  },

  createUser: async (data) => {
    const res = await api.post('/users', data);
    return res.data;
  },

  updateUser: async (id, data) => {
    const res = await api.put(`/users/${id}`, data);
    return res.data;
  },

  lockUser: async (id, reason) => {
    const res = await api.patch(`/users/${id}/lock`, { reason });
    return res.data;
  },

  unlockUser: async (id) => {
    const res = await api.patch(`/users/${id}/unlock`);
    return res.data;
  },

  resetPassword: async (id, password) => {
    const res = await api.patch(`/users/${id}/reset-password`, { password });
    return res.data;
  },

  getRoles: async () => {
    const res = await api.get('/roles');
    return res.data;
  },

  getLoginTimeWindows: async () => {
    const res = await api.get('/login-time-windows');
    return res.data;
  },
};
