import api from './api';

export const scheduleService = {
  getShifts: async () => {
    const res = await api.get('/shifts');
    return res.data;
  },

  createShift: async (data) => {
    const res = await api.post('/shifts', data);
    return res.data;
  },

  updateShift: async (id, data) => {
    const res = await api.put(`/shifts/${id}`, data);
    return res.data;
  },

  toggleShiftStatus: async (id, isActive) => {
    const res = await api.patch(`/shifts/${id}/status`, { isActive });
    return res.data;
  },

  getSchedules: async (params) => {
    // Translate array parameters to format supported by backend (staffIds[]=uuid-1&staffIds[]=uuid-2)
    // We can use URLSearchParams or pass it as is to axios (which handles array query params)
    const res = await api.get('/schedules', { params });
    return res.data;
  },

  saveScheduleTemplate: async (data) => {
    const res = await api.post('/schedules/template', data);
    return res.data;
  },

  createScheduleOverride: async (data) => {
    const res = await api.post('/schedules/override', data);
    return res.data;
  },

  deleteScheduleOverride: async (id) => {
    const res = await api.delete(`/schedules/override/${id}`);
    return res.data;
  },
};
