import api from './api';

export const roomService = {
  getRooms: async (branchId) => {
    const params = branchId ? { branchId } : {};
    const res = await api.get('/rooms', { params });
    return res.data;
  },

  getRoom: async (id) => {
    const res = await api.get(`/rooms/${id}`);
    return res.data;
  },

  createRoom: async (data) => {
    const res = await api.post('/rooms', data);
    return res.data;
  },

  updateRoom: async (id, data) => {
    const res = await api.put(`/rooms/${id}`, data);
    return res.data;
  },

  toggleRoomStatus: async (id, isActive) => {
    const res = await api.patch(`/rooms/${id}/status`, { isActive });
    return res.data;
  },
};
