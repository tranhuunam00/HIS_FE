import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Paragraph } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (values) => {
    try {
      setLoading(true);
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const res = await axios.post(`${backendUrl}/auth/login`, {
        email: values.email,
        password: values.password,
      });

      const { accessToken, refreshToken } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      message.success('Đăng nhập thành công!');
      navigate('/admin/org');
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Email hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    }}>
      <Card
        style={{
          width: 360,
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(10px)',
        }}
        size="small"
        styles={{ body: { padding: '24px 20px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Title level={3} style={{ color: '#f8fafc', margin: 0, fontWeight: 'bold' }}>HIS-DAO-CARE</Title>
          <Paragraph style={{ color: '#94a3b8', fontSize: 12, margin: '4px 0 0 0' }}>
            Hệ thống Quản lý Phòng khám chuyên nghiệp
          </Paragraph>
        </div>

        <Form
          name="login_form"
          layout="vertical"
          onFinish={handleLogin}
          size="small"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Vui lòng điền Email!' },
              { type: 'email', message: 'Email không hợp lệ!' }
            ]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: '#94a3b8' }} />} 
              placeholder="Email (admin@hisdaocare.com)" 
              style={{ background: '#334155', border: '1px solid #475569', color: '#f8fafc' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng điền Mật khẩu!' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Mật khẩu (Admin@HIS2026!)"
              style={{ background: '#334155', border: '1px solid #475569', color: '#f8fafc' }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block
              style={{ height: 32, fontWeight: 'bold' }}
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
