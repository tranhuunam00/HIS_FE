import React, { useEffect, useState } from 'react';
import { Modal, Select, Table, Checkbox, Button, Space, Popconfirm, message, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, GroupOutlined, CheckCircleOutlined } from '@ant-design/icons';
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

  const handleSelectAllForRow = async (record) => {
    try {
      const checkboxFields = [
        'canRegisterPatient', 'canUpdatePatient', 'canDeletePatient', 'canManageAppointment',
        'canCheckIn', 'canPerformExam', 'canOrderServices', 'canPrescribeMedicine',
        'canConcludeExam', 'canExecuteLaboratory', 'canApproveResult', 'canCollectPayment',
        'canRefundPayment', 'canViewFinancialReports', 'canViewClinicalReports', 'canManagePharmacyStock',
        'canDispenseMedicine', 'canManageSchedules', 'canManageHR', 'canConfigureCatalog',
        'canConfigureSystem'
      ];
      
      const payload = {
        branchId: record.branchId,
      };
      checkboxFields.forEach(f => {
        payload[f] = true;
      });

      // Update locally immediately for responsiveness
      setPermissions(prev => prev.map(item => {
        if (item.id === record.id) {
          const newItem = { ...item };
          checkboxFields.forEach(f => {
            newItem[f] = true;
          });
          return newItem;
        }
        return item;
      }));

      await authAdminService.saveRoleScopedPermission(selectedRoleId, payload);
      message.success('Đã cập nhật toàn bộ quyền cho nhóm tại chi nhánh này!');
      fetchRolePermissions(selectedRoleId);
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi cập nhật quyền');
      fetchRolePermissions(selectedRoleId);
    }
  };

  const permissionColumns = [
    {
      title: 'Cơ sở',
      dataIndex: 'branchName',
      key: 'branchName',
      width: 150,
      fixed: 'left',
      render: (text) => <span style={{ fontWeight: 500, color: '#434343' }}>{text}</span>,
    },
    {
      title: 'Đăng ký BN',
      dataIndex: 'canRegisterPatient',
      key: 'canRegisterPatient',
      width: 100,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canRegisterPatient', e.target.checked)} />,
    },
    {
      title: 'Sửa BN',
      dataIndex: 'canUpdatePatient',
      key: 'canUpdatePatient',
      width: 100,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canUpdatePatient', e.target.checked)} />,
    },
    {
      title: 'Xóa BN',
      dataIndex: 'canDeletePatient',
      key: 'canDeletePatient',
      width: 100,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canDeletePatient', e.target.checked)} />,
    },
    {
      title: 'Đặt lịch hẹn',
      dataIndex: 'canManageAppointment',
      key: 'canManageAppointment',
      width: 110,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canManageAppointment', e.target.checked)} />,
    },
    {
      title: 'Tiếp nhận',
      dataIndex: 'canCheckIn',
      key: 'canCheckIn',
      width: 100,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canCheckIn', e.target.checked)} />,
    },
    {
      title: 'Khám bệnh',
      dataIndex: 'canPerformExam',
      key: 'canPerformExam',
      width: 100,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canPerformExam', e.target.checked)} />,
    },
    {
      title: 'Chỉ định CLS',
      dataIndex: 'canOrderServices',
      key: 'canOrderServices',
      width: 110,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canOrderServices', e.target.checked)} />,
    },
    {
      title: 'Kê đơn thuốc',
      dataIndex: 'canPrescribeMedicine',
      key: 'canPrescribeMedicine',
      width: 110,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canPrescribeMedicine', e.target.checked)} />,
    },
    {
      title: 'Kết luận khám',
      dataIndex: 'canConcludeExam',
      key: 'canConcludeExam',
      width: 110,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canConcludeExam', e.target.checked)} />,
    },
    {
      title: 'Thực hiện CLS',
      dataIndex: 'canExecuteLaboratory',
      key: 'canExecuteLaboratory',
      width: 110,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canExecuteLaboratory', e.target.checked)} />,
    },
    {
      title: 'Duyệt kết quả',
      dataIndex: 'canApproveResult',
      key: 'canApproveResult',
      width: 110,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canApproveResult', e.target.checked)} />,
    },
    {
      title: 'Thu tiền',
      dataIndex: 'canCollectPayment',
      key: 'canCollectPayment',
      width: 100,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canCollectPayment', e.target.checked)} />,
    },
    {
      title: 'Hoàn tiền',
      dataIndex: 'canRefundPayment',
      key: 'canRefundPayment',
      width: 100,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canRefundPayment', e.target.checked)} />,
    },
    {
      title: 'BC Doanh thu',
      dataIndex: 'canViewFinancialReports',
      key: 'canViewFinancialReports',
      width: 120,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canViewFinancialReports', e.target.checked)} />,
    },
    {
      title: 'BC Chuyên môn',
      dataIndex: 'canViewClinicalReports',
      key: 'canViewClinicalReports',
      width: 120,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canViewClinicalReports', e.target.checked)} />,
    },
    {
      title: 'Tồn kho',
      dataIndex: 'canManagePharmacyStock',
      key: 'canManagePharmacyStock',
      width: 100,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canManagePharmacyStock', e.target.checked)} />,
    },
    {
      title: 'Cấp phát thuốc',
      dataIndex: 'canDispenseMedicine',
      key: 'canDispenseMedicine',
      width: 120,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canDispenseMedicine', e.target.checked)} />,
    },
    {
      title: 'Lịch trực',
      dataIndex: 'canManageSchedules',
      key: 'canManageSchedules',
      width: 100,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canManageSchedules', e.target.checked)} />,
    },
    {
      title: 'Nhân sự',
      dataIndex: 'canManageHR',
      key: 'canManageHR',
      width: 100,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canManageHR', e.target.checked)} />,
    },
    {
      title: 'Danh mục',
      dataIndex: 'canConfigureCatalog',
      key: 'canConfigureCatalog',
      width: 100,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canConfigureCatalog', e.target.checked)} />,
    },
    {
      title: 'Hệ thống',
      dataIndex: 'canConfigureSystem',
      key: 'canConfigureSystem',
      width: 100,
      render: (val, record) => <Checkbox checked={val} onChange={(e) => handleCheckboxChange(record, 'canConfigureSystem', e.target.checked)} />,
    },
    {
      title: '',
      key: 'action',
      width: '10%',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Tích chọn tất cả các quyền">
            <Button
              type="text"
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              onClick={() => handleSelectAllForRow(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Xác nhận xóa dòng quyền này của nhóm?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
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
        scroll={{ x: 2300, y: 350 }}
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
