import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, InputNumber, TimePicker, Divider, message } from 'antd';
import dayjs from 'dayjs';
import { orgService } from '../../../services/orgService';

const { Option } = Select;

const DAY_OPTIONS = [
  { label: 'Thứ 2', value: 'Monday' },
  { label: 'Thứ 3', value: 'Tuesday' },
  { label: 'Thứ 4', value: 'Wednesday' },
  { label: 'Thứ 5', value: 'Thursday' },
  { label: 'Thứ 6', value: 'Friday' },
  { label: 'Thứ 7', value: 'Saturday' },
  { label: 'Chủ Nhật', value: 'Sunday' },
];

export default function BranchFormModal({ visible, branch, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!branch;

  useEffect(() => {
    if (visible) {
      if (branch) {
        // Map data from branch model to form fields
        form.setFieldsValue({
          ...branch,
          // Convert string times '08:00' to dayjs object for TimePicker
          times: [
            branch.openTime ? dayjs(branch.openTime, 'HH:mm') : null,
            branch.closeTime ? dayjs(branch.closeTime, 'HH:mm') : null,
          ],
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          type: 'CLINIC',
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          times: [dayjs('08:00', 'HH:mm'), dayjs('20:00', 'HH:mm')],
        });
      }
    }
  }, [visible, branch, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        ...values,
        openTime: values.times?.[0] ? values.times[0].format('HH:mm') : '08:00',
        closeTime: values.times?.[1] ? values.times[1].format('HH:mm') : '20:00',
      };
      delete payload.times;

      if (isEdit) {
        await orgService.updateBranch(branch.id, payload);
        message.success('Cập nhật chi nhánh thành công');
      } else {
        await orgService.createBranch(payload);
        message.success('Thêm chi nhánh mới thành công');
      }
      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu chi nhánh');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa Chi nhánh' : 'Thêm Chi nhánh mới'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      destroyOnClose
      width={700}
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
              label="Tên chi nhánh/cơ sở"
              name="name"
              rules={[{ required: true, message: 'Vui lòng điền tên chi nhánh' }]}
            >
              <Input placeholder="Ví dụ: Cơ sở Hai Bà Trưng" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Mã chi nhánh"
              name="code"
              rules={[{ required: true, message: 'Vui lòng điền mã chi nhánh' }]}
            >
              <Input placeholder="Ví dụ: CN_HBT" disabled={isEdit} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Loại hình" name="type" rules={[{ required: true }]}>
              <Select>
                <Option value="CLINIC">Phòng khám (CLINIC)</Option>
                <Option value="HOSPITAL">Bệnh viện (HOSPITAL)</Option>
                <Option value="LAB">Xét nghiệm (LAB)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Chịu trách nhiệm chuyên môn kỹ thuật" name="technicalDirector">
              <Input placeholder="Họ tên Bác sĩ phụ trách chính" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Hotline chi nhánh" name="hotline">
              <Input placeholder="Số điện thoại liên hệ" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Email chi nhánh" name="email">
              <Input placeholder="Email liên hệ chi nhánh" />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0 16px 0' }}>Địa chỉ & GPS</Divider>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="Tỉnh/Thành phố" name="province">
              <Input placeholder="Ví dụ: Hà Nội" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Quận/Huyện" name="district">
              <Input placeholder="Ví dụ: Hai Bà Trưng" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Địa chỉ chi tiết" name="addressDetail">
              <Input placeholder="Số nhà, tên đường..." />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Vĩ độ GPS (Latitude)" name="latitude">
              <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="Ví dụ: 21.006326" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Kinh độ GPS (Longitude)" name="longitude">
              <InputNumber style={{ width: '100%' }} step={0.000001} placeholder="Ví dụ: 105.843132" />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0 16px 0' }}>Thông tin Thanh toán VietQR</Divider>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="Ngân hàng nhận" name="bankName">
              <Select placeholder="Chọn ngân hàng">
                <Option value="Vietcombank">Vietcombank</Option>
                <Option value="Techcombank">Techcombank</Option>
                <Option value="BIDV">BIDV</Option>
                <Option value="VietinBank">VietinBank</Option>
                <Option value="MBBank">MB Bank</Option>
                <Option value="ACB">ACB</Option>
                <Option value="VPBank">VPBank</Option>
                <Option value="TPBank">TPBank</Option>
                <Option value="Agribank">Agribank</Option>
                <Option value="Sacombank">Sacombank</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Số tài khoản" name="bankAccountNo">
              <Input placeholder="Ví dụ: 1903..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Tên chủ tài khoản" name="bankAccountName">
              <Input placeholder="Ví dụ: NGUYEN VAN A" style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0 16px 0' }}>Lịch hoạt động</Divider>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Ngày làm việc trong tuần" name="workingDays" rules={[{ required: true }]}>
              <Select mode="multiple" style={{ width: '100%' }} placeholder="Chọn ngày hoạt động">
                {DAY_OPTIONS.map((day) => (
                  <Option key={day.value} value={day.value}>{day.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Khung giờ hoạt động" name="times" rules={[{ required: true }]}>
              <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
