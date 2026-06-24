import api from './api';

export const staffService = {
  getStaffList: async (params = {}) => {
    const res = await api.get('/staff', { params });
    return res.data;
  },

  /** Lấy bác sĩ được phân công cho phòng cụ thể (qua staff_assignments) */
  getDoctorsByRoom: async (branchId, roomId) => {
    const res = await api.get('/staff', { params: { branchId, roomId, title: 'DOCTOR', isActive: true } });
    return res.data;
  },

  /** Lấy bác sĩ theo chuyên khoa được phân công */
  getDoctorsBySpecialty: async (branchId, specialtyId) => {
    const res = await api.get('/staff', { params: { branchId, specialtyId, title: 'DOCTOR', isActive: true } });
    return res.data;
  },

  getStaff: async (id) => {
    const res = await api.get(`/staff/${id}`);
    return res.data;
  },

  createStaff: async (data) => {
    const res = await api.post('/staff', data);
    return res.data;
  },

  updateStaff: async (id, data) => {
    const res = await api.put(`/staff/${id}`, data);
    return res.data;
  },

  toggleStaffStatus: async (id, isActive) => {
    const res = await api.patch(`/staff/${id}/status`, { isActive });
    return res.data;
  },

  updateCertificate: async (id, data) => {
    const res = await api.put(`/staff/${id}/certificate`, data);
    return res.data;
  },

  assignStaff: async (id, data) => {
    const res = await api.post(`/staff/${id}/assignments`, data);
    return res.data;
  },
};
