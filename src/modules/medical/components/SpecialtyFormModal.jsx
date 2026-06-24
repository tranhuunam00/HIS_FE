import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Row, Col, Avatar, message } from 'antd';
import { PictureOutlined } from '@ant-design/icons';
import { medicalService } from '../../../services/medicalService';

const { TextArea } = Input;

export default function SpecialtyFormModal({ visible, specialty, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const isEdit = !!specialty;

  useEffect(() => {
    if (visible) {
      if (specialty) {
        form.setFieldsValue({
          code: specialty.code,
          name: specialty.name,
          description: specialty.description || '',
          iconUrl: specialty.iconUrl || '',
        });
        setPreviewUrl(specialty.iconUrl || '');
      } else {
        form.resetFields();
        setPreviewUrl('');
      }
    }
  }, [visible, specialty, form]);

  const handleIconUrlChange = (e) => {
    setPreviewUrl(e.target.value);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        name: values.name,
        description: values.description || null,
        iconUrl: values.iconUrl || null,
      };

      if (isEdit) {
        await medicalService.updateSpecialty(specialty.id, payload);
        message.success('Cập nhật chuyên khoa thành công');
      } else {
        const createPayload = {
          ...payload,
          code: values.code,
        };
        await medicalService.createSpecialty(createPayload);
        message.success('Thêm chuyên khoa mới thành công');
      }
      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu chuyên khoa');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa Chuyên khoa' : 'Thêm Chuyên khoa mới'}
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
          <Col span={16}>
            <Form.Item
              label="Tên chuyên khoa"
              name="name"
              rules={[{ required: true, message: 'Vui lòng nhập tên chuyên khoa' }]}
            >
              <Input placeholder="Ví dụ: Nội khoa, Nhi khoa..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Mã chuyên khoa"
              name="code"
              rules={[
                { required: true, message: 'Vui lòng nhập mã' },
                { pattern: /^[A-Z0-9_]+$/, message: 'Chỉ gồm chữ in hoa, số' }
              ]}
            >
              <Input placeholder="Ví dụ: NOI, NHI" disabled={isEdit} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Mô tả chuyên khoa"
          name="description"
        >
          <TextArea rows={2} placeholder="Ghi chú về chuyên môn phòng khám phụ trách..." />
        </Form.Item>

        <Row gutter={12} align="middle">
          <Col span={18}>
            <Form.Item
              label="Đường dẫn biểu tượng / ảnh (URL)"
              name="iconUrl"
            >
              <Input 
                placeholder="Nhập link hình ảnh (MinIO/Web)..." 
                onChange={handleIconUrlChange}
              />
            </Form.Item>
          </Col>
          <Col span={6} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 10 }}>
            <span style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>Xem trước</span>
            {previewUrl ? (
              <Avatar 
                src={previewUrl} 
                size={40} 
                shape="square" 
                style={{ border: '1px solid #d9d9d9', background: '#fff' }}
              />
            ) : (
              <Avatar 
                icon={<PictureOutlined />} 
                size={40} 
                shape="square" 
                style={{ backgroundColor: '#f5f5f5', color: '#bfbfbf', border: '1px solid #d9d9d9' }}
              />
            )}
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
