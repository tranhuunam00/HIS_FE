import api from './api';

export const appointmentService = {
  getAppointments: async (filters) => {
    const res = await api.get('/appointments', { params: filters });
    return res.data;
  },

  getAppointmentById: async (id) => {
    const res = await api.get(`/appointments/${id}`);
    return res.data;
  },

  createAppointment: async (data) => {
    const res = await api.post('/appointments', data);
    return res.data;
  },

  updateAppointment: async (id, data) => {
    const res = await api.put(`/appointments/${id}`, data);
    return res.data;
  },
};
