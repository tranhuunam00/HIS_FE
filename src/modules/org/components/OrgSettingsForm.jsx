import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Row, Col, message, Spin, Divider, Badge } from 'antd';
import { 
  SaveOutlined, 
  InfoCircleOutlined, 
  MedicineBoxOutlined, 
  PhoneOutlined, 
  MailOutlined, 
  GlobalOutlined, 
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  TrademarkOutlined
} from '@ant-design/icons';
import { orgService } from '../../../services/orgService';

export default function OrgSettingsForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orgData, setOrgData] = useState({});

  useEffect(() => {
    fetchOrg();
  }, []);

  const fetchOrg = async () => {
    try {
      setLoading(true);
      const data = await orgService.getOrganization();
      setOrgData(data);
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
      setOrgData(values);
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
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" tip="Đang tải dữ liệu cấu hình..." />
      </div>
    );
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      size="middle"
      onValuesChange={(_, allValues) => {
        setOrgData(prev => ({ ...prev, ...allValues }));
      }}
    >
      <Row gutter={[20, 20]}>
        {/* Left Column: Branding & Summary Card */}
        <Col xs={24} lg={8}>
          <Card
            bordered={false}
            style={{
              height: '100%',
              background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
              borderRadius: '12px',
              textAlign: 'center',
              padding: '10px 0'
            }}
          >
            <div style={{ padding: '20px 0' }}>
              <div 
                style={{ 
                  width: 90, 
                  height: 90, 
                  borderRadius: '24px', 
                  background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(24,144,255,0.3)',
                  marginBottom: 16
                }}
              >
                <MedicineBoxOutlined style={{ fontSize: 42, color: '#fff' }} />
              </div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600, color: '#262626' }}>
                {orgData.shortName || orgData.name || 'DAO CARE'}
              </h2>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#8c8c8c' }}>
                Hệ thống Quản lý Phòng khám Thông minh
              </p>
              
              <div style={{ display: 'inline-block', marginBottom: 24 }}>
                <Badge 
                  status={orgData.taxCode ? "success" : "default"} 
                  text={orgData.taxCode ? `MST: ${orgData.taxCode}` : 'Chưa có MST'} 
                  style={{ fontSize: '12px', color: '#595959', fontWeight: 500 }}
                />
              </div>

              <Divider style={{ margin: '12px 0' }} />

              <div style={{ textAlign: 'left', padding: '0 16px' }}>
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                  <PhoneOutlined style={{ color: '#1890ff', marginRight: 10, fontSize: 16 }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#bfbfbf', lineHeight: 1 }}>Hotline hỗ trợ</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#595959' }}>{orgData.hotline || '-'}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                  <MailOutlined style={{ color: '#1890ff', marginRight: 10, fontSize: 16 }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#bfbfbf', lineHeight: 1 }}>Email chính thức</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#595959', wordBreak: 'break-all' }}>{orgData.email || '-'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <GlobalOutlined style={{ color: '#1890ff', marginRight: 10, fontSize: 16 }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#bfbfbf', lineHeight: 1 }}>Trang web</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#595959' }}>{orgData.website || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* Right Column: Settings Details Form */}
        <Col xs={24} lg={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Legal Information Section */}
            <Card
              bordered={false}
              title={
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#262626' }}>
                  <SafetyCertificateOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                  Thông tin pháp lý doanh nghiệp
                </span>
              }
              style={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={16}>
                  <Form.Item
                    label={<span style={{ fontWeight: 500 }}>Tên tổ chức / Công ty</span>}
                    name="name"
                    rules={[{ required: true, message: 'Vui lòng điền tên tổ chức' }]}
                  >
                    <Input prefix={<TrademarkOutlined style={{ color: '#bfbfbf' }} />} placeholder="Tên đầy đủ của tổ chức trên giấy phép" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 500 }}>Tên viết tắt</span>} name="shortName">
                    <Input placeholder="Ví dụ: DAO CARE" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 500 }}>Mã số thuế</span>} name="taxCode">
                    <Input placeholder="Mã số thuế kinh doanh" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 500 }}>Giấy phép hoạt động</span>} name="operatingLicense">
                    <Input placeholder="Số giấy phép Bộ/Sở Y Tế cấp" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 500 }}>Người đại diện pháp luật</span>} name="legalRepresentative">
                    <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="Họ và tên người đại diện" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Contact & Location Section */}
            <Card
              bordered={false}
              title={
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#262626' }}>
                  <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                  Thông tin liên hệ & Địa chỉ
                </span>
              }
              style={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 500 }}>Hotline tổng đài</span>} name="hotline">
                    <Input prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />} placeholder="Ví dụ: 19001234" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 500 }}>Email liên hệ</span>} name="email">
                    <Input prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} placeholder="contact@domain.vn" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item label={<span style={{ fontWeight: 500 }}>Website chính thức</span>} name="website">
                    <Input prefix={<GlobalOutlined style={{ color: '#bfbfbf' }} />} placeholder="https://..." />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label={<span style={{ fontWeight: 500 }}>Địa chỉ trụ sở chính</span>} name="address">
                <Input prefix={<EnvironmentOutlined style={{ color: '#bfbfbf' }} />} placeholder="Địa chỉ đăng ký doanh nghiệp / Trụ sở chính" />
              </Form.Item>
            </Card>

            {/* Form Actions */}
            <div style={{ textAlign: 'right', marginTop: '4px' }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={submitting}
                size="large"
                style={{
                  minWidth: 150,
                  borderRadius: '8px',
                  boxShadow: '0 4px 10px rgba(24,144,255,0.3)',
                  fontWeight: 500,
                  background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                  border: 'none',
                  height: '40px'
                }}
              >
                Lưu cấu hình
              </Button>
            </div>

          </div>
        </Col>
      </Row>
    </Form>
  );
}
