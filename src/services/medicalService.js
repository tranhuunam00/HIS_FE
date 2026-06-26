import api from './api';

export const medicalService = {
  // === SPECIALTIES ===
  getSpecialties: async () => {
    const res = await api.get('/specialties');
    return res.data;
  },

  getSpecialty: async (id) => {
    const res = await api.get(`/specialties/${id}`);
    return res.data;
  },

  createSpecialty: async (data) => {
    const res = await api.post('/specialties', data);
    return res.data;
  },

  updateSpecialty: async (id, data) => {
    const res = await api.put(`/specialties/${id}`, data);
    return res.data;
  },

  toggleSpecialtyStatus: async (id) => {
    const res = await api.patch(`/specialties/${id}/status`);
    return res.data;
  },

  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  // === SERVICES & PRICES ===
  getServices: async (params = {}) => {
    const res = await api.get('/services', { params });
    return res.data;
  },

  getService: async (id) => {
    const res = await api.get(`/services/${id}`);
    return res.data;
  },

  createService: async (data) => {
    const res = await api.post('/services', data);
    return res.data;
  },

  updateService: async (id, data) => {
    const res = await api.put(`/services/${id}`, data);
    return res.data;
  },

  toggleServiceStatus: async (id) => {
    const res = await api.patch(`/services/${id}/status`);
    return res.data;
  },

  upsertServicePrices: async (id, pricesData) => {
    const res = await api.put(`/services/${id}/prices`, pricesData);
    return res.data;
  },

  // === ICD-10 ===
  getIcd10List: async (params = {}) => {
    const res = await api.get('/icd10', { params });
    return res.data;
  },

  getIcd10: async (id) => {
    const res = await api.get(`/icd10/${id}`);
    return res.data;
  },

  createIcd10: async (data) => {
    const res = await api.post('/icd10', data);
    return res.data;
  },

  updateIcd10: async (id, data) => {
    const res = await api.put(`/icd10/${id}`, data);
    return res.data;
  },

  // === MEDICATIONS ===
  getMedications: async (search) => {
    const params = search ? { search } : {};
    const res = await api.get('/medications', { params });
    return res.data;
  },

  getMedication: async (id) => {
    const res = await api.get(`/medications/${id}`);
    return res.data;
  },

  createMedication: async (data) => {
    const res = await api.post('/medications', data);
    return res.data;
  },

  updateMedication: async (id, data) => {
    const res = await api.put(`/medications/${id}`, data);
    return res.data;
  },

  toggleMedicationStatus: async (id) => {
    const res = await api.patch(`/medications/${id}/status`);
    return res.data;
  },
};
