import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, TimePicker, message } from 'antd';
import dayjs from 'dayjs';
import { authAdminService } from '../../../services/authAdminService';

export default function LoginTimeWindowModal({ visible, windowData, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!windowData;

  useEffect(() => {
    if (visible) {
      if (windowData) {
        form.setFieldsValue({
          name: windowData.name,
          startTime: windowData.startTime ? dayjs(windowData.startTime, 'HH:mm') : null,
          endTime: windowData.endTime ? dayjs(windowData.endTime, 'HH:mm') : null,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          startTime: dayjs('08:00', 'HH:mm'),
          endTime: dayjs('18:00', 'HH:mm'),
        });
      }
    }
  }, [visible, windowData, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        name: values.name,
        startTime: values.startTime ? values.startTime.format('HH:mm') : '08:00',
        endTime: values.endTime ? values.endTime.format('HH:mm') : '18:00',
      };

      if (isEdit) {
        await authAdminService.updateLoginTimeWindow(windowData.id, payload);
        message.success('Cập nhật khung giờ thành công');
      } else {
        await authAdminService.createLoginTimeWindow(payload);
        message.success('Tạo khung giờ mới thành công');
      }

      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu khung giờ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Cập nhật khung giờ' : 'Thêm khung giờ đăng nhập'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      destroyOnClose
      width={400}
      size="small"
      okText="Lưu"
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical" size="small" style={{ paddingTop: 12 }}>
        <Form.Item
          label="Tên khung giờ"
          name="name"
          rules={[{ required: true, message: 'Vui lòng nhập tên khung giờ' }]}
        >
          <Input placeholder="eg .Giờ hành chính, Ca tối..." />
        </Form.Item>

        <Form.Item
          label="Giờ bắt đầu"
          name="startTime"
          rules={[{ required: true, message: 'Vui lòng chọn giờ bắt đầu' }]}
        >
          <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="Chọn giờ bắt đầu" />
        </Form.Item>

        <Form.Item
          label="Giờ kết thúc"
          name="endTime"
          rules={[{ required: true, message: 'Vui lòng chọn giờ kết thúc' }]}
        >
          <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="Chọn giờ kết thúc" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
