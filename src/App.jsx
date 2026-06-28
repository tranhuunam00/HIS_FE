import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Space, Button, Select, ConfigProvider, Modal, Form, Input, Divider, Typography, message } from 'antd';
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
  DollarOutlined,
  ShoppingCartOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import LoginPage from './modules/auth/pages/LoginPage';
import OrgManagementPage from './modules/org/pages/OrgManagementPage';
import MedicalCatalogPage from './modules/medical/pages/MedicalCatalogPage';
import UserManagementPage from './modules/auth/pages/UserManagementPage';
import ScheduleManagementPage from './modules/engine/pages/ScheduleManagementPage';
import DoctorAttendancePage from './modules/engine/pages/DoctorAttendancePage';
import FormManagementPage from './modules/forms/pages/FormManagementPage';
import PatientManagementPage from './modules/reception/pages/PatientManagementPage';
import AppointmentManagementPage from './modules/reception/pages/AppointmentManagementPage';
import QueueDashboardPage from './modules/reception/pages/QueueDashboardPage';
import OrderManagementPage from './modules/billing/pages/OrderManagementPage';
import CashierPage from './modules/billing/pages/CashierPage';
import { orgService } from './services/orgService';
import { authAdminService } from './services/authAdminService';
import './App.css';

const { Header, Sider, Content } = Layout;

function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState(localStorage.getItem('activeBranchId') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileForm] = Form.useForm();
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchBranchesAndUser = async () => {
      try {
        const [list, user] = await Promise.all([
          orgService.getBranches(),
          authAdminService.getCurrentUser()
        ]);
        setBranches(list);
        setCurrentUser(user);

        if (list.length > 0) {
          const currentStored = localStorage.getItem('activeBranchId');
          const exists = list.some(b => b.id === currentStored);
          if (!exists) {
            localStorage.setItem('activeBranchId', list[0].id);
            setActiveBranchId(list[0].id);
            window.dispatchEvent(new Event('branchChanged'));
          } else if (!currentStored) {
            localStorage.setItem('activeBranchId', list[0].id);
            setActiveBranchId(list[0].id);
            window.dispatchEvent(new Event('branchChanged'));
          }
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu Header:', err);
      }
    };
    fetchBranchesAndUser();
  }, []);

  const handleBranchChange = (value) => {
    localStorage.setItem('activeBranchId', value);
    setActiveBranchId(value);
    window.dispatchEvent(new Event('branchChanged'));
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('activeBranchId');
    navigate('/login');
  };

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      handleLogout();
    } else if (key === 'profile') {
      setProfileModalVisible(true);
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Hồ sơ cá nhân',
      icon: <UserOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];

  const hasRole = (roles) => {
    return currentUser && roles.includes(currentUser.roleName);
  };

  const hasBranchPermission = (permissionField) => {
    if (!currentUser) return false;
    if (currentUser.roleName === 'SUPER_ADMIN' || currentUser.username === 'admin' || currentUser.email === 'admin@hisdaocare.com') return true;
    
    const activeBranchId = localStorage.getItem('activeBranchId');
    if (!activeBranchId) return false;
    
    const branchPerm = currentUser.scopedPermissions?.find(p => p.branchId === activeBranchId);
    return branchPerm ? !!branchPerm[permissionField] : false;
  };

  const menuItems = [
    {
      key: '/admin/org',
      icon: <SettingOutlined />,
      label: <Link to="/admin/org">Cấu hình Tổ chức</Link>,
      permissionField: 'canConfigureSystem',
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: <Link to="/admin/users">Tài khoản & Quyền</Link>,
      permissionField: 'canConfigureSystem',
    },
    {
      key: '/admin/medical',
      icon: <MedicineBoxOutlined />,
      label: <Link to="/admin/medical">Danh mục Y tế</Link>,
      permissionField: 'canConfigureCatalog',
    },
    {
      key: '/admin/schedules',
      icon: <CalendarOutlined />,
      label: <Link to="/admin/schedules">Lịch làm việc & Ca trực</Link>,
      permissionField: 'canManageSchedules',
    },
    {
      key: '/admin/schedules/attendance',
      icon: <ClockCircleOutlined />,
      label: <Link to="/admin/schedules/attendance">Điểm danh Ca trực</Link>,
      roles: ['DOCTOR', 'NURSE', 'TECHNICIAN', 'ADMIN'],
    },
    {
      key: '/admin/forms',
      icon: <FileTextOutlined />,
      label: <Link to="/admin/forms">Tùy biến biểu mẫu</Link>,
      permissionField: 'canConfigureSystem',
    },
    {
      key: '/admin/patients',
      icon: <UserOutlined />,
      label: <Link to="/admin/patients">Hồ sơ Bệnh nhân</Link>,
      permissionField: 'canRegisterPatient',
    },
    {
      key: '/admin/appointments',
      icon: <CalendarOutlined />,
      label: <Link to="/admin/appointments">Quản lý Lịch hẹn</Link>,
      permissionField: 'canManageAppointment',
    },
    {
      key: '/admin/queue',
      icon: <BuildOutlined />,
      label: <Link to="/admin/queue">Điều phối & Hàng đợi</Link>,
      permissionField: 'canCheckIn',
    },
    {
      key: '/admin/billing/orders',
      icon: <ShoppingCartOutlined />,
      label: <Link to="/admin/billing/orders">Worklist & Chỉ định</Link>,
      permissionField: 'canPerformExam',
    },
    {
      key: '/admin/billing/cashier',
      icon: <DollarOutlined />,
      label: <Link to="/admin/billing/cashier">Thu ngân & Thanh toán</Link>,
      permissionField: 'canCollectPayment',
    },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (currentUser?.roleName === 'ADMIN') return true;
    if (item.permissionField) {
      return hasBranchPermission(item.permissionField);
    }
    return !item.roles || (currentUser && item.roles.includes(currentUser.roleName));
  });

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
          items={filteredMenuItems}
          size="small"
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 16px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, boxShadow: '0 1px 4px rgba(0,21,41,.08)' }}>
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 32, height: 32 }}
            />
            {branches.length > 0 && (
              <Select
                size="small"
                style={{ width: 220, marginLeft: 8 }}
                placeholder="Chọn chi nhánh làm việc"
                value={activeBranchId}
                onChange={handleBranchChange}
              >
                {branches.map(b => (
                  <Select.Option key={b.id} value={b.id}>
                    {b.name}
                  </Select.Option>
                ))}
              </Select>
            )}
          </Space>
          <Dropdown menu={{ items: userMenuItems, onClick: handleMenuClick }} placement="bottomRight" trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#52c41a' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#262626' }}>
                {currentUser?.staffName || currentUser?.username || 'Đang tải...'}
              </span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 0, minHeight: 280, display: 'flex', flexDirection: 'column' }}>
          {currentUser && (
            <Routes>
              <Route path="org" element={hasBranchPermission('canConfigureSystem') ? <OrgManagementPage /> : <Navigate to={hasBranchPermission('canCheckIn') ? '/admin/queue' : '/admin/schedules/attendance'} replace />} />
              <Route path="users" element={hasBranchPermission('canConfigureSystem') ? <UserManagementPage /> : <Navigate to="/admin/org" replace />} />
              <Route path="medical" element={hasBranchPermission('canConfigureCatalog') ? <MedicalCatalogPage /> : <Navigate to="/admin/org" replace />} />
              <Route path="schedules" element={hasBranchPermission('canManageSchedules') ? <ScheduleManagementPage /> : <Navigate to="/admin/org" replace />} />
              <Route path="schedules/attendance" element={hasRole(['DOCTOR', 'NURSE', 'TECHNICIAN', 'ADMIN']) ? <DoctorAttendancePage /> : <Navigate to="/admin/org" replace />} />
              <Route path="forms" element={hasBranchPermission('canConfigureSystem') ? <FormManagementPage /> : <Navigate to="/admin/org" replace />} />
              <Route path="patients" element={hasBranchPermission('canRegisterPatient') ? <PatientManagementPage /> : <Navigate to="/admin/org" replace />} />
              <Route path="appointments" element={hasBranchPermission('canManageAppointment') ? <AppointmentManagementPage /> : <Navigate to="/admin/org" replace />} />
              <Route path="queue" element={hasBranchPermission('canCheckIn') ? <QueueDashboardPage /> : <Navigate to="/admin/org" replace />} />
              <Route path="billing/orders" element={hasBranchPermission('canPerformExam') ? <OrderManagementPage /> : <Navigate to="/admin/org" replace />} />
              <Route path="billing/cashier" element={hasBranchPermission('canCollectPayment') ? <CashierPage /> : <Navigate to="/admin/org" replace />} />
              <Route path="*" element={<Navigate to="org" replace />} />
            </Routes>
          )}
        </Content>
      </Layout>

      <Modal
        title="Hồ sơ cá nhân & Đổi mật khẩu"
        open={profileModalVisible}
        onCancel={() => {
          setProfileModalVisible(false);
          profileForm.resetFields();
        }}
        footer={null}
        width={400}
        size="small"
      >
        {currentUser && (
          <Form
            form={profileForm}
            layout="vertical"
            size="small"
            onFinish={async (values) => {
              if (values.newPassword !== values.confirmPassword) {
                message.error('Mật khẩu xác nhận không khớp');
                return;
              }
              try {
                setProfileSubmitting(true);
                await authAdminService.resetPassword(currentUser.id, values.newPassword);
                message.success('Đổi mật khẩu thành công!');
                setProfileModalVisible(false);
                profileForm.resetFields();
              } catch (err) {
                console.error(err);
                message.error(err.response?.data?.message || 'Đổi mật khẩu thất bại');
              } finally {
                setProfileSubmitting(false);
              }
            }}
          >
            <Form.Item label="Tên nhân sự">
              <Input value={currentUser.staffName || 'N/A'} disabled />
            </Form.Item>
            <Form.Item label="Tài khoản (Username)">
              <Input value={currentUser.username} disabled />
            </Form.Item>
            <Form.Item label="Email">
              <Input value={currentUser.email} disabled />
            </Form.Item>
            <Form.Item label="Vai trò">
              <Input value={currentUser.roleName || 'N/A'} disabled />
            </Form.Item>

            <Divider style={{ margin: '12px 0' }} />
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
              Nhập mật khẩu mới bên dưới nếu muốn thay đổi mật khẩu:
            </Typography.Text>

            <Form.Item
              name="newPassword"
              label="Mật khẩu mới"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                { min: 6, message: 'Mật khẩu phải từ 6 ký tự trở lên' }
              ]}
            >
              <Input.Password placeholder="Nhập mật khẩu mới" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Xác nhận mật khẩu mới"
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu mới' }
              ]}
            >
              <Input.Password placeholder="Xác nhận mật khẩu mới" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setProfileModalVisible(false);
                  profileForm.resetFields();
                }}>
                  Hủy
                </Button>
                <Button type="primary" htmlType="submit" loading={profileSubmitting}>
                  Lưu thay đổi
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
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
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#52c41a', // Màu xanh lá cây nhẹ chỉ đạo
        },
      }}
    >
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
    </ConfigProvider>
  );
}
