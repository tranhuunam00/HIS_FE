import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Table,
  Button,
  Tag,
  Switch,
  Card,
  Select,
  Input,
  Space,
  Modal,
  Form,
  Popconfirm,
  message,
  Row,
  Col,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  KeyOutlined,
  LockOutlined,
  UnlockOutlined,
  SearchOutlined,
  SaveOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined,
  BuildOutlined,
} from '@ant-design/icons';
import { authAdminService } from '../../../services/authAdminService';
import { orgService } from '../../../services/orgService';
import { staffService } from '../../../services/staffService';
import UserFormModal from '../components/UserFormModal';
import LoginTimeWindowModal from '../components/LoginTimeWindowModal';
import { EXCLUDE_ROLES_FILTER } from '../constants';

const { Option } = Select;

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);

  // Lists needed across tabs
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loginTimeWindows, setLoginTimeWindows] = useState([]);

  // User tab search & filters
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal control states
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [timeWindowModalVisible, setTimeWindowModalVisible] = useState(false);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(null);

  const [resetPwdVisible, setResetPwdVisible] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [resetForm] = Form.useForm();

  const [lockVisible, setLockVisible] = useState(false);
  const [lockUser, setLockUser] = useState(null);
  const [lockForm] = Form.useForm();

  // Tab 3: Branch Allowed IPs states
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [allowedIps, setAllowedIps] = useState([]);
  const [ipLoading, setIpLoading] = useState(false);

  // Fetch initial configuration data (roles, branches, staff, time windows)
  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [roleData, branchData, staffData, windowData] = await Promise.all([
        authAdminService.getRoles(),
        orgService.getBranches(),
        staffService.getStaffList(),
        authAdminService.getLoginTimeWindows(),
      ]);
      setRoles(roleData);
      setBranches(branchData);
      setStaffList(staffData);
      setLoginTimeWindows(windowData);

      if (branchData.length > 0) {
        setSelectedBranchId(branchData[0].id);
        fetchBranchAllowedIps(branchData[0].id);
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể tải siêu dữ liệu hệ thống');
    }
  };

  // Tab 1: User list functions
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        excludeRoles: EXCLUDE_ROLES_FILTER,
      };
      if (filterRole !== 'ALL') params.roleId = filterRole;
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (searchText) params.search = searchText;

      const data = await authAdminService.getUsers(params);
      setUsers(data);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, filterRole, filterStatus, searchText]);

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserModalVisible(true);
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setUserModalVisible(true);
  };

  const handleOpenResetPwd = (user) => {
    setResetUser(user);
    resetForm.resetFields();
    setResetPwdVisible(true);
  };

  const handleResetPasswordSubmit = async () => {
    try {
      const values = await resetForm.validateFields();
      await authAdminService.resetPassword(resetUser.id, values.password);
      message.success(`Đã reset mật khẩu cho tài khoản ${resetUser.username}`);
      setResetPwdVisible(false);
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Reset mật khẩu thất bại');
    }
  };

  const handleToggleUserStatus = (checked, user) => {
    if (!checked) {
      // Locking user requires a reason
      setLockUser(user);
      lockForm.resetFields();
      setLockVisible(true);
    } else {
      // Unlocking user
      Modal.confirm({
        title: 'Xác nhận mở khóa tài khoản',
        content: `Bạn có chắc muốn mở khóa cho tài khoản ${user.username}?`,
        size: 'small',
        okText: 'Mở khóa',
        cancelText: 'Hủy',
        onOk: async () => {
          try {
            await authAdminService.unlockUser(user.id);
            message.success(`Đã mở khóa tài khoản ${user.username}`);
            fetchUsers();
          } catch (err) {
            console.error(err);
            message.error(err.response?.data?.message || 'Mở khóa thất bại');
          }
        },
      });
    }
  };

  const handleLockSubmit = async () => {
    try {
      const values = await lockForm.validateFields();
      await authAdminService.lockUser(lockUser.id, values.reason);
      message.success(`Đã khóa tài khoản ${lockUser.username}`);
      setLockVisible(false);
      fetchUsers();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Khóa tài khoản thất bại');
    }
  };

  // Tab 2: Login time window functions
  const fetchTimeWindows = async () => {
    try {
      setLoading(true);
      const data = await authAdminService.getLoginTimeWindows();
      setLoginTimeWindows(data);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách khung giờ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'timewindows') {
      fetchTimeWindows();
    }
  }, [activeTab]);

  const handleEditTimeWindow = (windowItem) => {
    setSelectedTimeWindow(windowItem);
    setTimeWindowModalVisible(true);
  };

  const handleAddTimeWindow = () => {
    setSelectedTimeWindow(null);
    setTimeWindowModalVisible(true);
  };

  const handleToggleTimeWindow = async (checked, record) => {
    try {
      await authAdminService.toggleLoginTimeWindowStatus(record.id, checked);
      message.success(`Đã ${checked ? 'bật' : 'tắt'} khung giờ ${record.name}`);
      fetchTimeWindows();
    } catch (err) {
      console.error(err);
      message.error('Thay đổi trạng thái khung giờ thất bại');
    }
  };

  // Tab 3: Branch Allowed IPs functions
  const fetchBranchAllowedIps = async (branchId) => {
    if (!branchId) return;
    try {
      setIpLoading(true);
      const data = await authAdminService.getBranchAllowedIps(branchId);
      setAllowedIps(data.map((item, idx) => ({
        id: item.id,
        branchId: item.branchId,
        ip_address: item.ipAddress || '',
        description: item.description || '',
        is_active: item.isActive !== false,
        key: item.id || `temp-${idx}`
      })));
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách IP của chi nhánh');
    } finally {
      setIpLoading(false);
    }
  };

  const handleBranchChange = (value) => {
    setSelectedBranchId(value);
    fetchBranchAllowedIps(value);
  };

  const handleAddIpRow = () => {
    const newRow = {
      key: `new-${Date.now()}`,
      ip_address: '',
      description: '',
      is_active: true,
      isNew: true,
    };
    setAllowedIps([...allowedIps, newRow]);
  };

  const handleRemoveIpRow = (key) => {
    setAllowedIps(allowedIps.filter((item) => item.key !== key));
  };

  const handleIpRowChange = (key, field, value) => {
    setAllowedIps(
      allowedIps.map((item) => {
        if (item.key === key) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleSaveAllowedIps = async () => {
    if (!selectedBranchId) return;

    // Validate IPs
    const invalidRows = allowedIps.filter((item) => !item.ip_address.trim());
    if (invalidRows.length > 0) {
      message.error('Vui lòng điền đầy đủ địa chỉ IP');
      return;
    }

    try {
      setIpLoading(true);
      const payload = allowedIps.map((item) => ({
        ipAddress: item.ip_address,
        description: item.description,
        isActive: item.is_active,
      }));

      await authAdminService.updateBranchAllowedIps(selectedBranchId, payload);
      message.success('Cập nhật địa chỉ IP thành công');
      fetchBranchAllowedIps(selectedBranchId);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lưu cấu hình IP thất bại');
      setIpLoading(false);
    }
  };

  // Helper selectors
  const getBranchName = (id) => {
    const b = branches.find((item) => item.id === id);
    return b ? b.name : '-';
  };

  const getRoleName = (id) => {
    const r = roles.find((item) => item.id === id);
    return r ? r.name : '-';
  };

  const getStaffName = (id) => {
    const s = staffList.find((item) => item.id === id);
    return s ? `${s.staffCode} - ${s.fullName}` : '-';
  };

  const getTimeWindowName = (id) => {
    const w = loginTimeWindows.find((item) => item.id === id);
    return w ? w.name : '-';
  };

  // Tab definitions
  const userColumns = [
    {
      title: 'Tên đăng nhập',
      dataIndex: 'username',
      key: 'username',
      width: '10%',
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Nhân viên',
      dataIndex: 'staffId',
      key: 'staffId',
      width: '15%',
      render: (staffId) => getStaffName(staffId),
    },
    {
      title: 'Số CCCD',
      dataIndex: 'staffIdentityNumber',
      key: 'staffIdentityNumber',
      width: '10%',
      render: (text) => text || '-',
    },
    {
      title: 'Nhóm quyền',
      dataIndex: 'roleId',
      key: 'roleId',
      width: '10%',
      render: (roleId) => <Tag color="blue">{getRoleName(roleId)}</Tag>,
    },
    {
      title: 'Chi nhánh mặc định',
      dataIndex: 'defaultBranchId',
      key: 'defaultBranchId',
      width: '13%',
      render: (branchId) => getBranchName(branchId),
    },
    {
      title: 'Phạm vi chi nhánh',
      dataIndex: 'branchScopeMode',
      key: 'branchScopeMode',
      width: '11%',
      render: (mode, record) => {
        if (mode === 'ALL') {
          return <Tag color="cyan">Tất cả</Tag>;
        }
        const count = record.branchScopeIds?.length || 0;
        return <Tag color="geekblue">{count} chi nhánh</Tag>;
      },
    },
    {
      title: 'Khung giờ',
      dataIndex: 'loginTimeWindowId',
      key: 'loginTimeWindowId',
      width: '11%',
      render: (windowId) => {
        if (!windowId) return <span style={{ color: '#8c8c8c' }}>24/7 (Không giới hạn)</span>;
        return <Tag color="purple">{getTimeWindowName(windowId)}</Tag>;
      },
    },
    {
      title: 'Xác thực IP',
      dataIndex: 'bypassIpRestriction',
      key: 'bypassIpRestriction',
      width: '10%',
      render: (bypass) => (
        <Tag color={bypass ? 'green' : 'red'}>{bypass ? 'Bypass IP' : 'Strict IP'}</Tag>
      ),
    },
    {
      title: 'Hoạt động',
      dataIndex: 'lockedAt',
      key: 'status',
      width: '5%',
      render: (lockedAt, record) => (
        <Switch
          size="small"
          checked={!lockedAt}
          onChange={(checked) => handleToggleUserStatus(checked, record)}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: '5%',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditUser(record)}
            title="Sửa thông tin"
          />
          <Button
            type="text"
            icon={<KeyOutlined />}
            size="small"
            onClick={() => handleOpenResetPwd(record)}
            title="Reset mật khẩu"
          />
        </Space>
      ),
    },
  ];

  const timeWindowColumns = [
    {
      title: 'Tên khung giờ',
      dataIndex: 'name',
      key: 'name',
      width: '40%',
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Giờ bắt đầu',
      dataIndex: 'startTime',
      key: 'startTime',
      width: '20%',
    },
    {
      title: 'Giờ kết thúc',
      dataIndex: 'endTime',
      key: 'endTime',
      width: '20%',
    },
    {
      title: 'Trạng thái hoạt động',
      dataIndex: 'isActive',
      key: 'isActive',
      width: '10%',
      render: (isActive, record) => (
        <Switch
          size="small"
          checked={isActive}
          onChange={(checked) => handleToggleTimeWindow(checked, record)}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: '10%',
      render: (_, record) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          size="small"
          onClick={() => handleEditTimeWindow(record)}
        />
      ),
    },
  ];

  const ipColumns = [
    {
      title: 'Địa chỉ IP Wifi / Mạng',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: '40%',
      render: (text, record) => (
        <Input
          size="small"
          placeholder="e.g. 192.168.1.100"
          value={text}
          onChange={(e) => handleIpRowChange(record.key, 'ip_address', e.target.value)}
        />
      ),
    },
    {
      title: 'Mô tả (Tên thiết bị/Phòng máy)',
      dataIndex: 'description',
      key: 'description',
      width: '40%',
      render: (text, record) => (
        <Input
          size="small"
          placeholder="e.g. Wifi Tầng 1"
          value={text}
          onChange={(e) => handleIpRowChange(record.key, 'description', e.target.value)}
        />
      ),
    },
    {
      title: 'Kích hoạt',
      dataIndex: 'is_active',
      key: 'is_active',
      width: '10%',
      render: (checked, record) => (
        <Switch
          size="small"
          checked={checked}
          onChange={(val) => handleIpRowChange(record.key, 'is_active', val)}
        />
      ),
    },
    {
      title: 'Xóa',
      key: 'delete',
      width: '10%',
      render: (_, record) => (
        <Popconfirm
          title="Xác nhận xóa dòng này?"
          onConfirm={() => handleRemoveIpRow(record.key)}
          okText="Xóa"
          cancelText="Hủy"
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'users',
      label: (
        <span>
          <UserOutlined />
          Danh sách tài khoản
        </span>
      ),
      children: (
        <Card
          size="small"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Input
                placeholder="Tìm theo username, tên..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                style={{ width: 220 }}
                size="small"
              />
              <span style={{ fontSize: 12, marginLeft: 8 }}>Nhóm:</span>
              <Select
                size="small"
                style={{ width: 140 }}
                value={filterRole}
                onChange={setFilterRole}
              >
                <Option value="ALL">Tất cả nhóm</Option>
                {roles.filter((r) => r.name !== 'PATIENT').map((r) => (
                  <Option key={r.id} value={r.id}>
                    {r.name}
                  </Option>
                ))}
              </Select>
              <span style={{ fontSize: 12, marginLeft: 8 }}>Trạng thái:</span>
              <Select
                size="small"
                style={{ width: 140 }}
                value={filterStatus}
                onChange={setFilterStatus}
              >
                <Option value="ALL">Tất cả trạng thái</Option>
                <Option value="ACTIVE">Đang hoạt động</Option>
                <Option value="LOCKED">Đã khóa</Option>
              </Select>
            </div>
          }
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddUser}
              size="small"
            >
              Thêm tài khoản
            </Button>
          }
          styles={{ body: { padding: '0px' } }}
        >
          <Table
            dataSource={users}
            columns={userColumns}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={{ pageSize: 10, size: 'small' }}
          />
        </Card>
      ),
    },
    {
      key: 'timewindows',
      label: (
        <span>
          <CalendarOutlined />
          Khung giờ đăng nhập
        </span>
      ),
      children: (
        <Card
          size="small"
          title={<span style={{ fontWeight: 600 }}>Cấu hình khung giờ đăng nhập hệ thống</span>}
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddTimeWindow}
              size="small"
            >
              Thêm khung giờ
            </Button>
          }
          styles={{ body: { padding: '0px' } }}
        >
          <Table
            dataSource={loginTimeWindows}
            columns={timeWindowColumns}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={{ pageSize: 10, size: 'small' }}
          />
        </Card>
      ),
    },
    {
      key: 'allowedips',
      label: (
        <span>
          <BuildOutlined />
          Giới hạn IP chi nhánh
        </span>
      ),
      children: (
        <Card
          size="small"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Chọn chi nhánh cấu hình IP Wifi:</span>
              <Select
                size="small"
                style={{ width: 220 }}
                value={selectedBranchId}
                onChange={handleBranchChange}
              >
                {branches.map((b) => (
                  <Option key={b.id} value={b.id}>
                    {b.name}
                  </Option>
                ))}
              </Select>
            </div>
          }
          extra={
            <Space size="small">
              <Button icon={<PlusOutlined />} size="small" onClick={handleAddIpRow}>
                Thêm dòng IP
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                size="small"
                onClick={handleSaveAllowedIps}
                loading={ipLoading}
              >
                Lưu cấu hình
              </Button>
            </Space>
          }
          styles={{ body: { padding: '0px' } }}
        >
          <div style={{ padding: '8px 12px', background: '#fafafa', borderBottom: '1px solid #f0f0f0', fontSize: 12, color: '#595959' }}>
            Thiết lập danh sách IP wifi văn phòng chi nhánh. Nhân viên không được bypass xác thực IP sẽ chỉ đăng nhập được khi kết nối mạng từ các IP dưới đây.
          </div>
          <Table
            dataSource={allowedIps}
            columns={ipColumns}
            rowKey="key"
            size="small"
            loading={ipLoading}
            pagination={false}
          />
        </Card>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '16px', maxWidth: 1200, margin: '0 auto 16px auto' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Tài khoản & Phân quyền</Typography.Title>
        <Typography.Paragraph style={{ margin: 0, color: '#8c8c8c', fontSize: '12px' }}>
          Quản lý tài khoản nhân viên đăng nhập, thiết lập giới hạn thời gian hoạt động, IP Wifi chi nhánh làm việc, và vai trò bảo mật.
        </Typography.Paragraph>
      </div>

      <Card size="small" style={{ maxWidth: 1200, margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="small" />
      </Card>

      {/* User Form Modal */}
      <UserFormModal
        visible={userModalVisible}
        user={selectedUser}
        roles={roles}
        staffList={staffList}
        branches={branches}
        loginTimeWindows={loginTimeWindows}
        onClose={() => setUserModalVisible(false)}
        onRefresh={fetchUsers}
      />

      {/* Time Window Modal */}
      <LoginTimeWindowModal
        visible={timeWindowModalVisible}
        windowData={selectedTimeWindow}
        onClose={() => setTimeWindowModalVisible(false)}
        onRefresh={() => {
          fetchTimeWindows();
          fetchMetadata(); // reload windows list for metadata
        }}
      />

      {/* Reset Password Modal */}
      <Modal
        title="Reset Mật Khẩu"
        open={resetPwdVisible}
        onCancel={() => setResetPwdVisible(false)}
        onOk={handleResetPasswordSubmit}
        destroyOnClose
        width={360}
        okText="Reset"
        cancelText="Hủy"
      >
        <Form form={resetForm} layout="vertical" size="small" style={{ paddingTop: 12 }}>
          <Form.Item
            label="Mật khẩu mới (Tối thiểu 6 ký tự)"
            name="password"
            rules={[
              { required: true, message: 'Nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu phải dài tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Lock User Modal */}
      <Modal
        title="Khóa Tài Khoản"
        open={lockVisible}
        onCancel={() => setLockVisible(false)}
        onOk={handleLockSubmit}
        destroyOnClose
        width={400}
        okText="Khóa tài khoản"
        okButtonProps={{ danger: true }}
        cancelText="Hủy"
      >
        <Form form={lockForm} layout="vertical" size="small" style={{ paddingTop: 12 }}>
          <div style={{ marginBottom: 12, color: '#f5222d', fontSize: 13 }}>
            <LockOutlined style={{ marginRight: 6 }} />
            Khóa tài khoản sẽ dừng phiên làm việc ngay lập tức.
          </div>
          <Form.Item
            label="Lý do khóa tài khoản"
            name="reason"
            rules={[{ required: true, message: 'Vui lòng cung cấp lý do khóa' }]}
          >
            <Input.TextArea rows={3} placeholder="Lý do nghỉ việc, tạm đình chỉ công tác, lý do bảo mật..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
