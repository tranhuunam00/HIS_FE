import api from './api';

export const attendanceService = {
  checkIn: async (data) => {
    const res = await api.post('/schedules/attendance/check-in', data);
    return res.data;
  },

  checkOut: async (data) => {
    const res = await api.post('/schedules/attendance/check-out', data);
    return res.data;
  },

  getTodayStatus: async (staffId, date) => {
    const res = await api.get(`/schedules/attendance/today-status/${staffId}?date=${date}`);
    return res.data;
  },

  toggleAcceptingPatients: async (attendanceId, isAcceptingPatients) => {
    const res = await api.patch(`/schedules/attendance/${attendanceId}/accepting`, { isAcceptingPatients });
    return res.data;
  },
};
