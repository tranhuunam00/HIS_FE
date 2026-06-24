import api from './api';

export const billingService = {
  getOrders: async (filters) => {
    const res = await api.get('/orders', { params: filters });
    return res.data;
  },

  getOrderByVisit: async (visitId) => {
    const res = await api.get(`/orders/by-visit/${visitId}`);
    return res.data;
  },

  addOrderItem: async (orderId, itemData) => {
    const res = await api.post(`/orders/${orderId}/items`, itemData);
    return res.data;
  },

  updateOrderItem: async (orderId, itemId, itemData) => {
    const res = await api.patch(`/orders/${orderId}/items/${itemId}`, itemData);
    return res.data;
  },

  deleteOrderItem: async (orderId, itemId) => {
    const res = await api.delete(`/orders/${orderId}/items/${itemId}`);
    return res.data;
  },

  createPayment: async (paymentData) => {
    const res = await api.post('/payments', paymentData);
    return res.data;
  },

  getPaymentsByOrder: async (orderId) => {
    const res = await api.get(`/payments/by-order/${orderId}`);
    return res.data;
  },
};
