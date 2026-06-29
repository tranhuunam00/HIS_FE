import api from './api';

export const auditLogService = {
  getAuditLogs: async (filters) => {
    const res = await api.get('/auth/audit-logs', { params: filters });
    return res.data;
  },
};
