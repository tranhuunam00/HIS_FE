import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Row, Col, message, Spin } from 'antd';
import { SaveOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { orgService } from '../../../services/orgService';

export default function OrgSettingsForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrg();
  }, []);

  const fetchOrg = async () => {
    try {
      setLoading(true);
      const data = await orgService.getOrganization();
      form.setFieldsValue(data);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải cấu hình tổ chức');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    try {
      setSubmitting(true);
      await orgService.updateOrganization(values);
      message.success('Cập nhật cấu hình tổ chức thành công');
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Cập nhật cấu hình thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" tip="Đang tải dữ liệu..." />
      </div>
    );
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      size="small"
      style={{ maxWidth: 800, margin: '0 auto' }}
    >
      <Row gutter={[12, 12]}>
        {/* Basic & Legal Info */}
        <Col span={24}>
          <Card
            title={<span><InfoCircleOutlined /> Thông tin pháp lý & Liên hệ</span>}
            size="small"
            styles={{ body: { padding: '12px' } }}
          >
            <Row gutter={12}>
              <Col span={16}>
                <Form.Item
                  label="Tên tổ chức"
                  name="name"
                  rules={[{ required: true, message: 'Vui lòng điền tên tổ chức' }]}
                >
                  <Input placeholder="Tên đầy đủ của tổ chức" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Tên viết tắt" name="shortName">
                  <Input placeholder="Ví dụ: DAO CARE" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={8}>
                <Form.Item label="Mã số thuế" name="taxCode">
                  <Input placeholder="Mã số thuế doanh nghiệp" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Giấy phép hoạt động" name="operatingLicense">
                  <Input placeholder="Số giấy phép Bộ/Sở Y Tế cấp" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Người đại diện pháp luật" name="legalRepresentative">
                  <Input placeholder="Họ và tên người đại diện" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={6}>
                <Form.Item label="Hotline" name="hotline">
                  <Input placeholder="Tổng đài chăm sóc khách hàng" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Email" name="email">
                  <Input placeholder="Email liên hệ chính thức" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Website" name="website">
                  <Input placeholder="https://..." />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Địa chỉ trụ sở" name="address">
                  <Input placeholder="Địa chỉ đăng ký kinh doanh" />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Submit */}
        <Col span={24} style={{ textAlign: 'right', marginTop: '12px' }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={submitting}
            style={{ minWidth: 120 }}
          >
            Lưu cấu hình
          </Button>
        </Col>
      </Row>
    </Form>
  );
}
