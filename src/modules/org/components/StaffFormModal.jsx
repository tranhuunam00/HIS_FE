import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col, Switch, message } from 'antd';
import dayjs from 'dayjs';
import { staffService } from '../../../services/staffService';

const { Option } = Select;

export default function StaffFormModal({ visible, staff, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!staff;

  useEffect(() => {
    if (visible) {
      if (staff) {
        form.setFieldsValue({
          fullName: staff.fullName,
          dateOfBirth: staff.dateOfBirth ? dayjs(staff.dateOfBirth) : null,
          gender: staff.gender,
          identityNumber: staff.identityNumber,
          phone: staff.phone,
          email: staff.email,
          address: staff.address || '',
          staffCode: staff.staffCode,
          joinDate: staff.joinDate ? dayjs(staff.joinDate) : null,
          title: staff.title,
          isClinical: staff.isClinical,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          gender: 'MALE',
          title: 'DOCTOR',
          isClinical: true,
          joinDate: dayjs(),
        });
      }
    }
  }, [visible, staff, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        fullName: values.fullName,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
        gender: values.gender,
        identityNumber: values.identityNumber,
        phone: values.phone,
        email: values.email,
        address: values.address || null,
        joinDate: values.joinDate ? values.joinDate.format('YYYY-MM-DD') : null,
        title: values.title,
        isClinical: values.isClinical,
      };

      if (isEdit) {
        await staffService.updateStaff(staff.id, payload);
        message.success('Cập nhật hồ sơ nhân sự thành công');
      } else {
        const createPayload = {
          ...payload,
          staffCode: values.staffCode,
        };
        await staffService.createStaff(createPayload);
        message.success('Tạo hồ sơ nhân sự mới thành công');
      }
      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu hồ sơ nhân sự');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa hồ sơ nhân sự' : 'Tạo hồ sơ nhân sự mới'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      destroyOnClose
      width={650}
      size="small"
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
        style={{ marginTop: 12 }}
      >
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Họ và tên nhân sự"
              name="fullName"
              rules={[{ required: true, message: 'Vui lòng điền họ tên nhân sự' }]}
            >
              <Input placeholder="Ví dụ: BS. Nguyễn Văn A" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Mã nhân viên"
              name="staffCode"
              rules={[
                { required: true, message: 'Vui lòng điền mã NV' },
                { pattern: /^[A-Z0-9_]+$/, message: 'Mã chỉ gồm chữ in hoa, số' }
              ]}
            >
              <Input placeholder="Ví dụ: NV0001" disabled={isEdit} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Chức danh"
              name="title"
              rules={[{ required: true, message: 'Chọn chức danh' }]}
            >
              <Select>
                <Option value="DOCTOR">Bác sĩ (DOCTOR)</Option>
                <Option value="NURSE">Điều dưỡng (NURSE)</Option>
                <Option value="TECHNICIAN">Kỹ thuật viên (TECHNICIAN)</Option>
                <Option value="RECEPTIONIST">Lễ tân (RECEPTIONIST)</Option>
                <Option value="ADMINISTRATOR">Quản trị viên (ADMINISTRATOR)</Option>
                <Option value="OTHER">Khác (OTHER)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={6}>
            <Form.Item
              label="Ngày sinh"
              name="dateOfBirth"
              rules={[{ required: true, message: 'Chọn ngày sinh' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Giới tính"
              name="gender"
              rules={[{ required: true, message: 'Chọn giới tính' }]}
            >
              <Select>
                <Option value="MALE">Nam</Option>
                <Option value="FEMALE">Nữ</Option>
                <Option value="OTHER">Khác</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Số CCCD / CMND"
              name="identityNumber"
              rules={[
                { required: true, message: 'Vui lòng điền số định danh' },
                { pattern: /^[0-9]+$/, message: 'Số CCCD chỉ chứa chữ số' }
              ]}
            >
              <Input placeholder="Số CCCD 12 số" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Số điện thoại"
              name="phone"
              rules={[
                { required: true, message: 'Vui lòng điền số điện thoại' },
                { pattern: /^[0-9+]+$/, message: 'Số điện thoại không hợp lệ' }
              ]}
            >
              <Input placeholder="Số điện thoại liên hệ" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Địa chỉ Email"
              name="email"
              rules={[
                { required: true, message: 'Vui lòng điền Email' },
                { type: 'email', message: 'Email không hợp lệ' }
              ]}
            >
              <Input placeholder="Email liên hệ/đăng nhập" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Địa chỉ liên hệ"
          name="address"
        >
          <Input placeholder="Ví dụ: Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội" />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Ngày vào làm"
              name="joinDate"
              rules={[{ required: true, message: 'Chọn ngày vào làm' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Là nhân viên lâm sàng (Tham gia khám chữa bệnh)"
              name="isClinical"
              valuePropName="checked"
              style={{ marginTop: 24 }}
            >
              <Switch checkedChildren="Có" unCheckedChildren="Không" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
