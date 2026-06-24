import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, message } from 'antd';
import { medicalService } from '../../../services/medicalService';

const { Option } = Select;

export default function Icd10FormModal({ visible, icd10, specialties, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!icd10;

  useEffect(() => {
    if (visible) {
      if (icd10) {
        form.setFieldsValue({
          code: icd10.code,
          name: icd10.name,
          nameEn: icd10.nameEn || '',
          specialtyId: icd10.specialtyId || undefined,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, icd10, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        name: values.name,
        nameEn: values.nameEn || null,
        specialtyId: values.specialtyId || null,
      };

      if (isEdit) {
        await medicalService.updateIcd10(icd10.id, payload);
        message.success('Cập nhật mã bệnh ICD-10 thành công');
      } else {
        const createPayload = {
          ...payload,
          code: values.code,
        };
        await medicalService.createIcd10(createPayload);
        message.success('Thêm mã bệnh ICD-10 mới thành công');
      }
      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu mã bệnh');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa mã bệnh ICD-10' : 'Thêm mã bệnh ICD-10 mới'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      destroyOnClose
      width={500}
      size="small"
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
        style={{ marginTop: 12 }}
      >
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              label="Mã ICD-10"
              name="code"
              rules={[
                { required: true, message: 'Nhập mã ICD-10' },
                { pattern: /^[A-Z][0-9][0-9].*$/, message: 'Định dạng mã không hợp lệ (Ví dụ: I10, J06)' }
              ]}
            >
              <Input placeholder="Ví dụ: I10" disabled={isEdit} />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              label="Tên chuyên khoa liên quan"
              name="specialtyId"
            >
              <Select placeholder="Chọn chuyên khoa (nếu có)" allowClear>
                {specialties.map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Tên bệnh (Tiếng Việt)"
          name="name"
          rules={[{ required: true, message: 'Vui lòng nhập tên tiếng Việt' }]}
        >
          <Input placeholder="Ví dụ: Tăng huyết áp nguyên phát" />
        </Form.Item>

        <Form.Item
          label="Tên bệnh (Tiếng Anh)"
          name="nameEn"
        >
          <Input placeholder="Ví dụ: Essential hypertension" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
