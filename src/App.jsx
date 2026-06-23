import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Space, Button, theme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BuildOutlined,
  UserOutlined,
  SettingOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  FileTextOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import LoginPage from './modules/auth/pages/LoginPage';
import OrgManagementPage from './modules/org/pages/OrgManagementPage';
import './App.css';

const { Header, Sider, Content } = Layout;

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  const userMenu = (
    <Menu size="small">
      <Menu.Item key="profile" icon={<UserOutlined />}>
        Hồ sơ cá nhân
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout} danger>
        Đăng xuất
      </Menu.Item>
    </Menu>
  );

  const menuItems = [
    {
      key: '/admin/org',
      icon: <SettingOutlined />,
      label: <Link to="/admin/org">Cấu hình Tổ chức</Link>,
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: 'Tài khoản & Quyền',
      disabled: true,
    },
    {
      key: '/admin/medical',
      icon: <MedicineBoxOutlined />,
      label: 'Danh mục Y tế',
      disabled: true,
    },
    {
      key: '/admin/schedules',
      icon: <CalendarOutlined />,
      label: 'Lịch hẹn & Ca trực',
      disabled: true,
    },
    {
      key: '/admin/forms',
      icon: <FileTextOutlined />,
      label: 'Tùy biến biểu mẫu',
      disabled: true,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} width={220} theme="dark" style={{ boxShadow: '2px 0 6px rgba(0,21,41,.15)' }}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#002140', color: '#fff', fontSize: collapsed ? 14 : 16, fontWeight: 'bold', transition: 'all 0.2s' }}>
          {collapsed ? 'DC' : 'DAO CARE'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          size="small"
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 16px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, boxShadow: '0 1px 4px rgba(0,21,41,.08)' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 32, height: 32 }}
          />
          <Dropdown overlay={userMenu} placement="bottomRight" trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#262626' }}>BS. Trần Hữu Nam</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 0, minHeight: 280, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="org" element={<OrgManagementPage />} />
            <Route path="*" element={<Navigate to="org" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

// Protected Route Guard
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/admin/org" replace />} />
      </Routes>
    </Router>
  );
}
