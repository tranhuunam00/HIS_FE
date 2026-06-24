import api from './api';

export const visitService = {
  getVisits: async (filters) => {
    const res = await api.get('/visits', { params: filters });
    return res.data;
  },

  getVisitById: async (id) => {
    const res = await api.get(`/visits/${id}`);
    return res.data;
  },

  checkIn: async (data) => {
    const res = await api.post('/visits/check-in', data);
    return res.data;
  },

  updateVitals: async (id, data) => {
    const res = await api.put(`/visits/${id}/vitals`, data);
    return res.data;
  },

  transferRoom: async (id, data) => {
    const res = await api.patch(`/visits/${id}/transfer`, data);
    return res.data;
  },

  confirmResultsWait: async (id) => {
    const res = await api.patch(`/visits/${id}/confirm-results-wait`);
    return res.data;
  },

  acceptPatient: async (id) => {
    const res = await api.patch(`/visits/${id}/accept`);
    return res.data;
  },

  completePatient: async (id) => {
    const res = await api.patch(`/visits/${id}/complete`);
    return res.data;
  },
};
