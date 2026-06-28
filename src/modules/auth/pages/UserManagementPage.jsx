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
  Tooltip,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  KeyOutlined,
  LockOutlined,
  UnlockOutlined,
  SearchOutlined,
  UserOutlined,
  GroupOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { authAdminService } from '../../../services/authAdminService';
import { orgService } from '../../../services/orgService';
import { staffService } from '../../../services/staffService';
import UserFormModal from '../components/UserFormModal';
import ScopedPermissionFormModal from '../components/ScopedPermissionFormModal';
import RolePermissionMatrixModal from '../components/RolePermissionMatrixModal';
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

  // User tab search & filters
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal control states
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [resetPwdVisible, setResetPwdVisible] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [resetForm] = Form.useForm();

  const [lockVisible, setLockVisible] = useState(false);
  const [lockUser, setLockUser] = useState(null);
  const [lockForm] = Form.useForm();

  // Scoped Permissions states
  const [scopedPermissions, setScopedPermissions] = useState([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permSearchText, setPermSearchText] = useState('');
  const [permBranchFilter, setPermBranchFilter] = useState('ALL');
  const [addPermModalVisible, setAddPermModalVisible] = useState(false);
  const [roleMatrixVisible, setRoleMatrixVisible] = useState(false);

  // Fetch initial configuration data (roles, branches, staff)
  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [roleData, branchData, staffData] = await Promise.all([
        authAdminService.getRoles(),
        orgService.getBranches(),
        staffService.getStaffList(),
      ]);
      setRoles(roleData);
      setBranches(branchData);
      setStaffList(staffData);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải siêu dữ liệu hệ thống');
    }
  };

  const fetchScopedPermissions = async () => {
    try {
      setPermLoading(true);
      const data = await authAdminService.getScopedPermissions();
      setScopedPermissions(data);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải ma trận phân quyền');
    } finally {
      setPermLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'permissions') {
      fetchScopedPermissions();
    }
  }, [activeTab]);

  const renderPermissionCheckbox = (val, record, fieldName, userId) => {
    const isInherited = record[`${fieldName}Inherited`];
    
    return (
      <Tooltip title={isInherited ? `Kế thừa từ nhóm ${record.roleName || ''}` : "Quyền tùy biến riêng"}>
        <Checkbox
          checked={val}
          disabled={isInherited}
          style={{
            transform: 'scale(1.05)',
          }}
          onChange={async (e) => {
            try {
              const checked = e.target.checked;
              const payload = {
                branchId: record.branchId,
                [fieldName]: checked,
              };
              await authAdminService.saveUserCustomPermission(userId, payload);
              message.success('Cập nhật quyền tùy biến thành công!');
              fetchScopedPermissions();
            } catch (err) {
              console.error(err);
              message.error('Lỗi khi cập nhật quyền');
            }
          }}
        />
      </Tooltip>
    );
  };

  const handleDeleteUserScopeRow = async (record) => {
    try {
      await authAdminService.deleteScopedPermission(record.id);
      message.success('Xóa dòng quyền tùy biến thành công!');
      fetchScopedPermissions();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi xóa dòng cấu hình quyền');
    }
  };

  const expandedRowRender = (userRecord) => {
    const rawPerms = userRecord.permissions || [];
    const filteredPerms = permBranchFilter === 'ALL'
      ? rawPerms
      : rawPerms.filter(p => p.branchId === permBranchFilter);

    const subColumns = [
      {
        title: 'Cơ sở',
        dataIndex: 'branchName',
        key: 'branchName',
        width: 150,
        fixed: 'left',
        render: (text) => <span style={{ fontWeight: 500, color: '#434343' }}>{text}</span>,
      },
      { title: 'Đăng ký BN', dataIndex: 'canRegisterPatient', key: 'canRegisterPatient', width: 100, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canRegisterPatient', userRecord.userId) },
      { title: 'Sửa BN', dataIndex: 'canUpdatePatient', key: 'canUpdatePatient', width: 100, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canUpdatePatient', userRecord.userId) },
      { title: 'Xóa BN', dataIndex: 'canDeletePatient', key: 'canDeletePatient', width: 100, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canDeletePatient', userRecord.userId) },
      { title: 'Đặt lịch hẹn', dataIndex: 'canManageAppointment', key: 'canManageAppointment', width: 110, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canManageAppointment', userRecord.userId) },
      { title: 'Tiếp nhận', dataIndex: 'canCheckIn', key: 'canCheckIn', width: 100, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canCheckIn', userRecord.userId) },
      { title: 'Khám bệnh', dataIndex: 'canPerformExam', key: 'canPerformExam', width: 100, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canPerformExam', userRecord.userId) },
      { title: 'Chỉ định CLS', dataIndex: 'canOrderServices', key: 'canOrderServices', width: 110, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canOrderServices', userRecord.userId) },
      { title: 'Kê đơn thuốc', dataIndex: 'canPrescribeMedicine', key: 'canPrescribeMedicine', width: 110, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canPrescribeMedicine', userRecord.userId) },
      { title: 'Kết luận khám', dataIndex: 'canConcludeExam', key: 'canConcludeExam', width: 110, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canConcludeExam', userRecord.userId) },
      { title: 'Thực hiện CLS', dataIndex: 'canExecuteLaboratory', key: 'canExecuteLaboratory', width: 110, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canExecuteLaboratory', userRecord.userId) },
      { title: 'Duyệt kết quả', dataIndex: 'canApproveResult', key: 'canApproveResult', width: 110, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canApproveResult', userRecord.userId) },
      { title: 'Thu tiền', dataIndex: 'canCollectPayment', key: 'canCollectPayment', width: 100, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canCollectPayment', userRecord.userId) },
      { title: 'Hoàn tiền', dataIndex: 'canRefundPayment', key: 'canRefundPayment', width: 100, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canRefundPayment', userRecord.userId) },
      { title: 'BC Doanh thu', dataIndex: 'canViewFinancialReports', key: 'canViewFinancialReports', width: 120, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canViewFinancialReports', userRecord.userId) },
      { title: 'BC Chuyên môn', dataIndex: 'canViewClinicalReports', key: 'canViewClinicalReports', width: 120, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canViewClinicalReports', userRecord.userId) },
      { title: 'Tồn kho', dataIndex: 'canManagePharmacyStock', key: 'canManagePharmacyStock', width: 100, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canManagePharmacyStock', userRecord.userId) },
      { title: 'Cấp phát thuốc', dataIndex: 'canDispenseMedicine', key: 'canDispenseMedicine', width: 120, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canDispenseMedicine', userRecord.userId) },
      { title: 'Lịch trực', dataIndex: 'canManageSchedules', key: 'canManageSchedules', width: 100, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canManageSchedules', userRecord.userId) },
      { title: 'Nhân sự', dataIndex: 'canManageHR', key: 'canManageHR', width: 100, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canManageHR', userRecord.userId) },
      { title: 'Danh mục', dataIndex: 'canConfigureCatalog', key: 'canConfigureCatalog', width: 100, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canConfigureCatalog', userRecord.userId) },
      { title: 'Hệ thống', dataIndex: 'canConfigureSystem', key: 'canConfigureSystem', width: 100, align: 'center', render: (val, record) => renderPermissionCheckbox(val, record, 'canConfigureSystem', userRecord.userId) },
      {
        title: '',
        key: 'action',
        width: 60,
        fixed: 'right',
        align: 'center',
        render: (_, record) => {
          const isRoleInherited = !record.isCustomOnly;
          if (isRoleInherited) {
            return (
              <Tooltip title="Dòng quyền kế thừa từ Nhóm quyền. Không thể xóa ở đây.">
                <Button type="text" disabled icon={<DeleteOutlined />} size="small" />
              </Tooltip>
            );
          }
          return (
            <Popconfirm
              title="Xác nhận xóa dòng cấu hình quyền custom này?"
              onConfirm={() => handleDeleteUserScopeRow(record)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          );
        }
      }
    ];

    return (
      <Table
        columns={subColumns}
        dataSource={filteredPerms}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={{ x: 2300 }}
        style={{ margin: '8px 0', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}
      />
    );
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

  // Tab definitions
  const userColumns = [
    {
      title: 'Tên đăng nhập',
      dataIndex: 'username',
      key: 'username',
      width: '15%',
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Nhân viên',
      dataIndex: 'staffId',
      key: 'staffId',
      width: '20%',
      render: (staffId) => getStaffName(staffId),
    },
    {
      title: 'Số CCCD',
      dataIndex: 'staffIdentityNumber',
      key: 'staffIdentityNumber',
      width: '15%',
      render: (text) => text || '-',
    },
    {
      title: 'Nhóm quyền',
      dataIndex: 'roleId',
      key: 'roleId',
      width: '15%',
      render: (roleId) => <Tag color="blue">{getRoleName(roleId)}</Tag>,
    },
    {
      title: 'Chi nhánh mặc định',
      dataIndex: 'defaultBranchId',
      key: 'defaultBranchId',
      width: '18%',
      render: (branchId) => getBranchName(branchId),
    },
    {
      title: 'Phạm vi chi nhánh',
      dataIndex: 'branchScopeMode',
      key: 'branchScopeMode',
      width: '12%',
      render: (mode, record) => {
        if (mode === 'ALL') {
          return <Tag color="cyan">Tất cả</Tag>;
        }
        const count = record.branchScopeIds?.length || 0;
        return <Tag color="geekblue">{count} chi nhánh</Tag>;
      },
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
      key: 'permissions',
      label: (
        <span>
          <GroupOutlined />
          Ma trận phân quyền
        </span>
      ),
      children: (
        <Card
          size="small"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Input
                placeholder="Tìm tài khoản theo tên, email..."
                value={permSearchText}
                onChange={(e) => setPermSearchText(e.target.value)}
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                style={{ width: 220 }}
                size="small"
              />
              <span style={{ fontSize: 12, marginLeft: 8 }}>Cơ sở:</span>
              <Select
                size="small"
                style={{ width: 220 }}
                value={permBranchFilter}
                onChange={setPermBranchFilter}
              >
                <Option value="ALL">Tất cả cơ sở</Option>
                {branches.map((b) => (
                  <Option key={b.id} value={b.id}>
                    {b.name}
                  </Option>
                ))}
              </Select>
            </div>
          }
          extra={
            <Space>
              <Button
                type="default"
                icon={<GroupOutlined />}
                onClick={() => setRoleMatrixVisible(true)}
                size="small"
              >
                Phân quyền theo nhóm
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddPermModalVisible(true)}
                size="small"
              >
                Thêm dòng quyền
              </Button>
            </Space>
          }
          styles={{ body: { padding: '0px' } }}
        >
          <Table
            dataSource={scopedPermissions.filter(item => {
              const term = permSearchText.toLowerCase();
              if (!term) return true;
              return (
                item.username?.toLowerCase().includes(term) ||
                item.email?.toLowerCase().includes(term)
              );
            })}
            columns={[
              {
                title: 'Tên tài khoản',
                dataIndex: 'username',
                key: 'username',
                width: '30%',
                render: (text) => <strong style={{ color: '#1890ff' }}>{text}</strong>,
              },
              {
                title: 'Email',
                dataIndex: 'email',
                key: 'email',
                width: '40%',
              },
              {
                title: 'Nhóm quyền',
                dataIndex: 'roleName',
                key: 'roleName',
                width: '30%',
                render: (text) => <Tag color="blue">{text}</Tag>,
              },
            ]}
            rowKey="userId"
            size="small"
            loading={permLoading}
            expandable={{
              expandedRowRender,
              rowExpandable: () => true,
            }}
            pagination={{ pageSize: 10, size: 'small' }}
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
          Quản lý tài khoản nhân viên đăng nhập và vai trò bảo mật.
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
        onClose={() => setUserModalVisible(false)}
        onRefresh={fetchUsers}
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

      {/* Scoped Permission Row Form Modal */}
      <ScopedPermissionFormModal
        visible={addPermModalVisible}
        users={scopedPermissions}
        roles={roles}
        branches={branches}
        onClose={() => setAddPermModalVisible(false)}
        onRefresh={fetchScopedPermissions}
      />

      {/* Role Scoped Permission Matrix Modal */}
      <RolePermissionMatrixModal
        visible={roleMatrixVisible}
        roles={roles}
        branches={branches}
        onClose={() => setRoleMatrixVisible(false)}
        onRefreshParent={fetchScopedPermissions}
      />
    </div>
  );
}
