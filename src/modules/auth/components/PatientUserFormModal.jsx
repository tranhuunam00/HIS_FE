import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { authAdminService } from '../../../services/authAdminService';

export default function PatientUserFormModal({
  visible,
  user,
  onClose,
  onRefresh,
}) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;

    if (user) {
      form.setFieldsValue({
        username: user.username || '',
        email: user.email || '',
        password: '',
      });
    } else {
      form.resetFields();
    }
  }, [visible, user, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        username: values.username,
        email: values.email,
        roleId: user.roleId,
      };

      // Update user details
      await authAdminService.updateUser(user.id, payload);

      // Reset password if provided
      if (values.password) {
        await authAdminService.resetPassword(user.id, values.password);
      }

      message.success('Cập nhật tài khoản bệnh nhân thành công');
      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể lưu tài khoản bệnh nhân');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Thông tin tài khoản bệnh nhân"
      open={visible}
      onCancel={onClose}
      destroyOnClose
      width={400}
      footer={[
        <Button key="cancel" size="small" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          size="small"
          loading={submitting}
          onClick={handleSubmit}
        >
          Lưu lại
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" size="small">
        <Form.Item
          label="Tên đăng nhập (Username)"
          name="username"
          rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}
        >
          <Input placeholder="eg .0977112233" autoComplete="off" />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Nhập email liên hệ' },
            { type: 'email', message: 'Email không hợp lệ' },
          ]}
        >
          <Input placeholder="eg .example@gmail.com" autoComplete="off" />
        </Form.Item>

        <Form.Item
          label="Đổi mật khẩu (Để trống nếu không đổi)"
          name="password"
          rules={[{ min: 6, message: 'Mật khẩu phải dài tối thiểu 6 ký tự' }]}
        >
          <Input.Password
            placeholder="Nhập mật khẩu mới"
            autoComplete="new-password"
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
