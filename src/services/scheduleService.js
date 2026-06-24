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
    const query = new URLSearchParams();
    if (params.staffIds) {
      const ids = Array.isArray(params.staffIds) ? params.staffIds : [params.staffIds];
      ids.forEach((id) => query.append('staffIds', id));
    }
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const res = await api.get(`/schedules?${query.toString()}`);
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
