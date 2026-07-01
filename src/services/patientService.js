import api from './api';

export const patientService = {
  getPatients: async (search) => {
    const params = search ? { search } : {};
    const res = await api.get('/patients', { params });
    return res.data;
  },

  getPatientById: async (id) => {
    const res = await api.get(`/patients/${id}`);
    return res.data;
  },

  createPatient: async (data) => {
    const res = await api.post('/patients', data);
    return res.data;
  },

  updatePatient: async (id, data) => {
    const res = await api.put(`/patients/${id}`, data);
    return res.data;
  },

  resetPassword: async (id, password) => {
    const res = await api.post(`/patients/${id}/reset-password`, { password });
    return res.data;
  },
};
