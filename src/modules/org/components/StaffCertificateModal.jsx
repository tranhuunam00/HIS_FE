import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, DatePicker, Row, Col, Alert, message } from 'antd';
import dayjs from 'dayjs';
import { staffService } from '../../../services/staffService';

const { TextArea } = Input;

export default function StaffCertificateModal({ visible, staff, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (staff && staff.certificate) {
        form.setFieldsValue({
          certificateNumber: staff.certificate.certificateNumber,
          issuedDate: staff.certificate.issuedDate ? dayjs(staff.certificate.issuedDate) : null,
          expiryDate: staff.certificate.expiryDate ? dayjs(staff.certificate.expiryDate) : null,
          issuedBy: staff.certificate.issuedBy,
          scopeOfPractice: staff.certificate.scopeOfPractice,
          signatureScanUrl: staff.certificate.signatureScanUrl || '',
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, staff, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        certificateNumber: values.certificateNumber,
        issuedDate: values.issuedDate ? values.issuedDate.format('YYYY-MM-DD') : null,
        expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : null,
        issuedBy: values.issuedBy,
        scopeOfPractice: values.scopeOfPractice,
        signatureScanUrl: values.signatureScanUrl || null,
      };

      await staffService.updateCertificate(staff.id, payload);
      message.success('Cập nhật chứng chỉ hành nghề thành công');
      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu chứng chỉ hành nghề');
    } finally {
      setSubmitting(false);
    }
  };

  if (!staff) return null;

  return (
    <Modal
      title={`Chứng chỉ hành nghề: ${staff.fullName}`}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      destroyOnClose
      width={550}
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
              label="Số chứng chỉ"
              name="certificateNumber"
              rules={[{ required: true, message: 'Vui lòng điền số chứng chỉ y khoa' }]}
            >
              <Input placeholder="Ví dụ: 12345/BYT-CCHN" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Cơ quan cấp chứng chỉ"
              name="issuedBy"
              rules={[{ required: true, message: 'Nhập cơ quan cấp (Bộ Y Tế / Sở Y Tế)' }]}
            >
              <Input placeholder="Ví dụ: Bộ Y Tế" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Ngày cấp chứng chỉ"
              name="issuedDate"
              rules={[{ required: true, message: 'Chọn ngày cấp' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Ngày hết hạn"
              name="expiryDate"
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Bỏ trống nếu vô thời hạn" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Phạm vi hoạt động chuyên môn"
          name="scopeOfPractice"
          rules={[{ required: true, message: 'Vui lòng ghi rõ phạm vi chuyên môn' }]}
        >
          <TextArea rows={3} placeholder="Ví dụ: Khám bệnh, chữa bệnh chuyên khoa Nội tổng quát" />
        </Form.Item>

        <Form.Item
          label="Đường dẫn quét chữ ký mẫu (URL)"
          name="signatureScanUrl"
        >
          <Input placeholder="Ví dụ: http://minio/signatures/cchn_name.png" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
