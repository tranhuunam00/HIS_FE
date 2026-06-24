import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, TimePicker, message } from 'antd';
import dayjs from 'dayjs';
import { scheduleService } from '../../../services/scheduleService';

export default function ShiftFormModal({ visible, shift, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!shift;

  useEffect(() => {
    if (visible) {
      if (shift) {
        form.setFieldsValue({
          name: shift.name,
          startTime: shift.startTime ? dayjs(shift.startTime, 'HH:mm') : null,
          endTime: shift.endTime ? dayjs(shift.endTime, 'HH:mm') : null,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, shift, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        name: values.name,
        startTime: values.startTime ? values.startTime.format('HH:mm') : '',
        endTime: values.endTime ? values.endTime.format('HH:mm') : '',
      };

      if (payload.startTime >= payload.endTime) {
        message.error('Giờ bắt đầu phải nhỏ hơn giờ kết thúc');
        setSubmitting(false);
        return;
      }

      if (isEdit) {
        await scheduleService.updateShift(shift.id, payload);
        message.success('Cập nhật ca trực thành công');
      } else {
        await scheduleService.createShift(payload);
        message.success('Thêm ca trực mới thành công');
      }

      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu ca trực');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Cập nhật ca trực' : 'Thêm ca trực mới'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      destroyOnClose
      width={400}
      okText="Lưu"
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical" size="small" style={{ paddingTop: 12 }}>
        <Form.Item
          label="Tên ca trực"
          name="name"
          rules={[{ required: true, message: 'Vui lòng nhập tên ca trực' }]}
        >
          <Input placeholder="e.g. Ca sáng, Ca chiều, Ca gãy..." />
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
