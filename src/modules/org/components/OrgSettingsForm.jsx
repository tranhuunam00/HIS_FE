import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Row, Col, Select, InputNumber, Divider, message, Spin } from 'antd';
import { SaveOutlined, GlobalOutlined, InfoCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { orgService } from '../../../services/orgService';

const { Option } = Select;

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
      style={{ maxWidth: 1000, margin: '0 auto' }}
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

        {/* Localization & Formatting */}
        <Col span={12}>
          <Card
            title={<span><GlobalOutlined /> Địa phương hóa & Định dạng</span>}
            size="small"
            styles={{ body: { padding: '12px' } }}
            style={{ height: '100%' }}
          >
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="Ngôn ngữ chính" name="language">
                  <Select>
                    <Option value="vi">Tiếng Việt (vi)</Option>
                    <Option value="en">English (en)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Múi giờ" name="timezone">
                  <Select>
                    <Option value="Asia/Ho_Chi_Minh">Việt Nam (GMT+7)</Option>
                    <Option value="UTC">Giờ Quốc Tế (UTC)</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="Quốc gia" name="country">
                  <Input readOnly disabled defaultValue="VN" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Tiền tệ mặc định" name="defaultCurrency">
                  <Select>
                    <Option value="VND">Việt Nam Đồng (đ)</Option>
                    <Option value="USD">Đô la Mỹ ($)</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="Định dạng ngày" name="dateFormat">
                  <Select>
                    <Option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</Option>
                    <Option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Định dạng giờ" name="timeFormat">
                  <Select>
                    <Option value="HH:mm:ss">24h (HH:mm:ss)</Option>
                    <Option value="hh:mm a">12h (hh:mm am/pm)</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="Thời gian OTP (giây)" name="otpExpirationTime">
                  <InputNumber style={{ width: '100%' }} min={60} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Giới hạn hủy lịch (giờ)" name="appointmentCancellationLimit">
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Identity Formats */}
        <Col span={12}>
          <Card
            title={<span><SettingOutlined /> Định dạng mã định danh</span>}
            size="small"
            styles={{ body: { padding: '12px' } }}
            style={{ height: '100%' }}
          >
            <Form.Item
              label="Mã hồ sơ bệnh án (MRN Format)"
              name="mrnFormat"
              help="Các từ khóa khả dụng: {YY} (năm), {MM} (tháng), {DD} (ngày), {SEQ} (số tự tăng)"
            >
              <Input placeholder="Ví dụ: MRN-{YY}{MM}{DD}-{SEQ}" />
            </Form.Item>

            <Form.Item
              label="Mã khách hàng (Patient Format)"
              name="patientCodeFormat"
              help="Các từ khóa khả dụng: {YY} (năm), {MM} (tháng), {SEQ} (số tự tăng)"
            >
              <Input placeholder="Ví dụ: PT-{YY}{MM}-{SEQ}" />
            </Form.Item>

            <Form.Item
              label="Mã lượt khám (Visit Format)"
              name="visitCodeFormat"
              help="Các từ khóa khả dụng: {YY} (năm), {MM} (tháng), {DD} (ngày), {SEQ} (số tự tăng)"
            >
              <Input placeholder="Ví dụ: VS-{YY}{MM}{DD}-{SEQ}" />
            </Form.Item>
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
