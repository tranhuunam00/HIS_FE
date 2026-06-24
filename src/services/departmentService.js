import api from './api';

export const departmentService = {
  getDepartments: async (branchId) => {
    const params = branchId && branchId !== 'ALL' ? { branchId } : {};
    const res = await api.get('/departments', { params });
    return res.data;
  },

  createDepartment: async (data) => {
    const res = await api.post('/departments', data);
    return res.data;
  },

  updateDepartment: async (id, data) => {
    const res = await api.put(`/departments/${id}`, data);
    return res.data;
  },

  toggleDepartmentStatus: async (id, isActive) => {
    const res = await api.patch(`/departments/${id}/status`, { isActive });
    return res.data;
  },
};
