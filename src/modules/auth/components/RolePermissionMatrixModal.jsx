import React, { useEffect, useState } from 'react';
import { Modal, Select, Table, Checkbox, Button, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined, GroupOutlined } from '@ant-design/icons';
import { authAdminService } from '../../../services/authAdminService';
import ScopedPermissionFormModal from './ScopedPermissionFormModal';

const { Option } = Select;

export default function RolePermissionMatrixModal({
  visible,
  roles,
  branches,
  onClose,
  onRefreshParent,
}) {
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  useEffect(() => {
    if (visible && roles.length > 0) {
      const staffRoles = roles.filter(r => r.name !== 'PATIENT');
      if (staffRoles.length > 0) {
        setSelectedRoleId(staffRoles[0].id);
        fetchRolePermissions(staffRoles[0].id);
      }
    }
  }, [visible, roles]);

  const fetchRolePermissions = async (roleId) => {
    if (!roleId) return;
    try {
      setLoading(true);
      const rolePerms = await authAdminService.getRoleScopedPermissions(roleId);
      setPermissions(rolePerms);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải phân quyền của nhóm');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (roleId) => {
    setSelectedRoleId(roleId);
    fetchRolePermissions(roleId);
  };

  const handleCheckboxChange = async (record, fieldName, checked) => {
    try {
      const payload = {
        branchId: record.branchId,
        [fieldName]: checked,
      };
      
      // Update locally immediately for responsiveness
      setPermissions(prev => prev.map(item => item.id === record.id ? { ...item, [fieldName]: checked } : item));

      await authAdminService.saveRoleScopedPermission(selectedRoleId, payload);
      message.success('Cập nhật quyền của nhóm thành công!');
      fetchRolePermissions(selectedRoleId);
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi cập nhật quyền của nhóm');
      fetchRolePermissions(selectedRoleId); // Rollback on error
    }
  };

  const handleDelete = async (id) => {
    try {
      await authAdminService.deleteScopedPermission(id);
      message.success('Đã xóa dòng cấu hình quyền của nhóm');
      fetchRolePermissions(selectedRoleId);
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi xóa dòng cấu hình');
    }
  };

  const permissionColumns = [
    {
      title: 'Cơ sở',
      dataIndex: 'branchName',
      key: 'branchName',
      width: '30%',
      render: (text) => <span style={{ fontWeight: 500, color: '#434343' }}>{text}</span>,
    },
    {
      title: 'Xem',
      dataIndex: 'canView',
      key: 'canView',
      width: '5%',
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canView', e.target.checked)} />,
    },
    {
      title: 'Đọc',
      dataIndex: 'canRead',
      key: 'canRead',
      width: '5%',
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canRead', e.target.checked)} />,
    },
    {
      title: 'Duyệt',
      dataIndex: 'canApprove',
      key: 'canApprove',
      width: '5%',
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canApprove', e.target.checked)} />,
    },
    {
      title: 'H.Chẩn',
      dataIndex: 'canConsult',
      key: 'canConsult',
      width: '5%',
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canConsult', e.target.checked)} />,
    },
    {
      title: 'Hủy HC',
      dataIndex: 'canCancelConsult',
      key: 'canCancelConsult',
      width: '5%',
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canCancelConsult', e.target.checked)} />,
    },
    {
      title: 'Sửa',
      dataIndex: 'canEdit',
      key: 'canEdit',
      width: '5%',
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canEdit', e.target.checked)} />,
    },
    {
      title: 'Xóa',
      dataIndex: 'canDelete',
      key: 'canDelete',
      width: '5%',
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canDelete', e.target.checked)} />,
    },
    {
      title: 'HIS',
      dataIndex: 'canUpdateHis',
      key: 'canUpdateHis',
      width: '5%',
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canUpdateHis', e.target.checked)} />,
    },
    {
      title: 'C.Sẻ',
      dataIndex: 'canShare',
      key: 'canShare',
      width: '5%',
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canShare', e.target.checked)} />,
    },
    {
      title: 'T.Kê',
      dataIndex: 'canStats',
      key: 'canStats',
      width: '5%',
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canStats', e.target.checked)} />,
    },
    {
      title: 'Hủy D.',
      dataIndex: 'canCancelApprove',
      key: 'canCancelApprove',
      width: '5%',
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canCancelApprove', e.target.checked)} />,
    },
    {
      title: 'Xóa S.',
      dataIndex: 'canDeleteSeries',
      key: 'canDeleteSeries',
      width: '5%',
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canDeleteSeries', e.target.checked)} />,
    },
    {
      title: 'L.Sử',
      dataIndex: 'canViewHistory',
      key: 'canViewHistory',
      width: '5%',
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canViewHistory', e.target.checked)} />,
    },
    {
      title: '',
      key: 'action',
      width: '5%',
      render: (_, record) => (
        <Popconfirm
          title="Xác nhận xóa dòng quyền này của nhóm?"
          onConfirm={() => handleDelete(record.id)}
          okText="Xóa"
          cancelText="Hủy"
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GroupOutlined style={{ color: '#1890ff' }} />
          <span>Cấu hình Phân quyền theo Nhóm (Role matrix)</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" size="small" type="primary" onClick={onClose}>
          Đóng lại
        </Button>,
      ]}
      destroyOnClose
      width={1200}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, background: '#fafafa', padding: '12px 16px', borderRadius: 8, border: '1px solid #f0f0f0' }}>
        <Space size="middle">
          <span style={{ fontWeight: 500, color: '#595959' }}>Chọn Nhóm Quyền:</span>
          <Select
            style={{ width: 220 }}
            value={selectedRoleId}
            onChange={handleRoleChange}
            size="small"
          >
            {roles.filter(r => r.name !== 'PATIENT').map(r => (
              <Option key={r.id} value={r.id}>
                {r.name}
              </Option>
            ))}
          </Select>
        </Space>
        
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={() => setAddModalVisible(true)}
        >
          Thêm dòng quyền mới
        </Button>
      </div>

      <Table
        dataSource={permissions}
        columns={permissionColumns}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={false}
        scroll={{ y: 350 }}
        style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}
      />

      <ScopedPermissionFormModal
        visible={addModalVisible}
        roleId={selectedRoleId}
        branches={branches}
        onClose={() => setAddModalVisible(false)}
        onRefresh={() => fetchRolePermissions(selectedRoleId)}
      />
    </Modal>
  );
}
