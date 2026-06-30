import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Switch, Card, Select, Input, Tooltip, message } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  DeploymentUnitOutlined,
} from '@ant-design/icons';
import { staffService } from '../../../services/staffService';
import { orgService } from '../../../services/orgService';
import { roomService } from '../../../services/roomService';
import StaffFormModal from './StaffFormModal';
import StaffCertificateModal from './StaffCertificateModal';
import StaffAssignmentModal from './StaffAssignmentModal';

const { Option } = Select;

const TITLE_TAGS = {
  DOCTOR: { color: 'blue', label: 'Bác sĩ' },
  NURSE: { color: 'cyan', label: 'Điều dưỡng' },
  TECHNICIAN: { color: 'purple', label: 'Kỹ thuật viên' },
  RECEPTIONIST: { color: 'orange', label: 'Lễ tân' },
  ADMINISTRATOR: { color: 'red', label: 'Quản trị viên' },
  OTHER: { color: 'default', label: 'Khác' },
};

const GENDER_MAP = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
};

export default function StaffListTable() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Filters State
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');
  const [selectedTitle, setSelectedTitle] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchText, setSearchText] = useState('');

  // Modal States
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [certModalVisible, setCertModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);

  // Selected Record State
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    initData();

    const handleBranchChanged = () => {
      const activeId = localStorage.getItem('activeBranchId');
      if (activeId) {
        setSelectedBranchId(activeId);
        fetchStaffList({ branchId: activeId });
      }
    };
    window.addEventListener('branchChanged', handleBranchChanged);
    return () => {
      window.removeEventListener('branchChanged', handleBranchChanged);
    };
  }, []);

  const initData = async () => {
    try {
      setLoading(true);
      const [branchList, roomList] = await Promise.all([
        orgService.getBranches(),
        roomService.getRooms(),
      ]);
      setBranches(branchList);
      setRooms(roomList);

      const activeId = localStorage.getItem('activeBranchId');
      const storedExists = branchList.some(b => b.id === activeId);
      if (activeId && storedExists) {
        setSelectedBranchId(activeId);
        fetchStaffList({ branchId: activeId });
      } else {
        setSelectedBranchId('ALL');
        fetchStaffList();
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể tải thông tin khởi tạo');
      setLoading(false);
    }
  };

  const fetchStaffList = async (customParams = {}) => {
    try {
      setLoading(true);
      // Determine query params
      const branchParam = customParams.branchId !== undefined ? customParams.branchId : selectedBranchId;
      const titleParam = customParams.title !== undefined ? customParams.title : selectedTitle;
      const statusParam = customParams.isActive !== undefined ? customParams.isActive : selectedStatus;

      const params = {};
      if (branchParam && branchParam !== 'ALL') params.branchId = branchParam;
      if (titleParam && titleParam !== 'ALL') params.title = titleParam;
      if (statusParam && statusParam !== 'ALL') params.isActive = statusParam === 'ACTIVE';

      const list = await staffService.getStaffList(params);
      setData(list);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách nhân sự');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const changes = { [key]: value };
    if (key === 'branchId') {
      setSelectedBranchId(value);
    } else if (key === 'title') {
      setSelectedTitle(value);
    } else if (key === 'isActive') {
      setSelectedStatus(value);
    }
    fetchStaffList(changes);
  };

  const handleToggleStatus = async (checked, record) => {
    try {
      await staffService.toggleStaffStatus(record.id, checked);
      message.success(`Đã ${checked ? 'mở khóa' : 'khóa'} tài khoản/hồ sơ của ${record.fullName}`);
      fetchStaffList();
    } catch (err) {
      console.error(err);
      message.error('Thay đổi trạng thái nhân sự thất bại');
    }
  };

  const handleOpenProfileModal = (staff) => {
    setSelectedStaff(staff);
    setProfileModalVisible(true);
  };

  const handleOpenCertModal = (staff) => {
    setSelectedStaff(staff);
    setCertModalVisible(true);
  };

  const handleOpenAssignModal = (staff) => {
    setSelectedStaff(staff);
    setAssignModalVisible(true);
  };

  const handleAdd = () => {
    setSelectedStaff(null);
    setProfileModalVisible(true);
  };

  // Filter local search for name and code
  const filteredData = data.filter((staff) => {
    const term = searchText.toLowerCase();
    if (!term) return true;
    return (
      staff.fullName.toLowerCase().includes(term) ||
      staff.staffCode.toLowerCase().includes(term) ||
      (staff.phone && staff.phone.includes(term)) ||
      staff.email.toLowerCase().includes(term)
    );
  });


  const columns = [
    {
      title: 'Mã NV',
      dataIndex: 'staffCode',
      key: 'staffCode',
      width: '10%',
      render: (text) => <Tag color="purple">{text}</Tag>,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
      width: '15%',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{text} {record.nickname ? `(${record.nickname})` : ''}</div>
        </div>
      ),
    },
    {
      title: 'Chức danh',
      dataIndex: 'title',
      key: 'title',
      width: '10%',
      render: (title) => {
        const tag = TITLE_TAGS[title] || { color: 'default', label: title };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Giới tính',
      dataIndex: 'gender',
      key: 'gender',
      width: '6%',
      render: (gender) => GENDER_MAP[gender] || gender,
    },
    {
      title: 'Nơi công tác',
      key: 'workplace',
      width: '18%',
      render: (_, record) => {
        const assigns = record.assignments || [];
        if (assigns.length === 0) return <span style={{ color: '#bfbfbf', fontSize: '12px' }}>Chưa phân công</span>;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {assigns.map((a) => {
              const b = branches.find((item) => item.id === a.branchId);
              const r = rooms.find((item) => item.id === a.roomId);
              const bName = b ? b.name.split(' - ')[0] : 'CN';
              const rName = r ? r.name : 'Chờ phân phòng';
              return (
                <div key={a.id} style={{ display: 'inline-flex' }}>
                  <Tag 
                    color={a.isPrimary ? 'blue' : 'default'} 
                    style={{ 
                      fontSize: '11px', 
                      margin: 0, 
                      padding: '1px 6px', 
                      borderRadius: '4px',
                      fontWeight: a.isPrimary ? 600 : 'normal'
                    }}
                  >
                    {bName} - {rName} {a.isPrimary ? '★' : ''}
                  </Tag>
                </div>
              );
            })}
          </div>
        );
      }
    },
    {
      title: 'Thông tin liên hệ',
      key: 'contact',
      width: '14%',
      render: (_, record) => (
        <div style={{ fontSize: '13px' }}>
          <div>{record.phone}</div>
          <small style={{ color: '#8c8c8c' }}>{record.email}</small>
        </div>
      ),
    },
    {
      title: 'Ngày vào làm',
      dataIndex: 'joinDate',
      key: 'joinDate',
      width: '11%',
      render: (val) => new Date(val).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: '8%',
      render: (isActive, record) => (
        <Switch
          size="small"
          checked={isActive}
          onChange={(checked) => handleToggleStatus(checked, record)}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: '8%',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Sửa hồ sơ">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenProfileModal(record)}
              size="small"
            />
          </Tooltip>
          
          <Tooltip title="Chứng chỉ hành nghề">
            <Button
              type="text"
              icon={<SafetyCertificateOutlined />}
              onClick={() => handleOpenCertModal(record)}
              size="small"
              style={{ color: record.certificate ? '#52c41a' : '#8c8c8c' }}
            />
          </Tooltip>

          <Tooltip title="Phân công công tác">
            <Button
              type="text"
              icon={<DeploymentUnitOutlined />}
              onClick={() => handleOpenAssignModal(record)}
              size="small"
              style={{ color: record.assignments?.length > 0 ? '#1890ff' : '#8c8c8c' }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Chi nhánh:</span>
          <Select
            size="small"
            style={{ width: 160 }}
            value={selectedBranchId}
            onChange={(val) => handleFilterChange('branchId', val)}
          >
            <Option value="ALL">Tất cả chi nhánh</Option>
            {branches.map((b) => (
              <Option key={b.id} value={b.id}>{b.name}</Option>
            ))}
          </Select>

          <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 8 }}>Chức danh:</span>
          <Select
            size="small"
            style={{ width: 140 }}
            value={selectedTitle}
            onChange={(val) => handleFilterChange('title', val)}
          >
            <Option value="ALL">Tất cả chức danh</Option>
            <Option value="DOCTOR">Bác sĩ</Option>
            <Option value="NURSE">Điều dưỡng</Option>
            <Option value="TECHNICIAN">Kỹ thuật viên</Option>
            <Option value="RECEPTIONIST">Lễ tân</Option>
            <Option value="ADMINISTRATOR">Quản trị viên</Option>
            <Option value="OTHER">Khác</Option>
          </Select>

          <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 8 }}>Trạng thái:</span>
          <Select
            size="small"
            style={{ width: 120 }}
            value={selectedStatus}
            onChange={(val) => handleFilterChange('isActive', val)}
          >
            <Option value="ALL">Tất cả trạng thái</Option>
            <Option value="ACTIVE">Hoạt động</Option>
            <Option value="INACTIVE">Đang khóa</Option>
          </Select>

          <Space.Compact size="small" style={{ marginLeft: 8 }}>
            <Input
              placeholder="Tìm tên, mã, SĐT..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              style={{ width: 160 }}
            />
          </Space.Compact>
        </div>
      }
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          size="small"
        >
          Thêm nhân sự
        </Button>
      }
      styles={{ body: { padding: '0px' } }}
    >
      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{ pageSize: 10, size: 'small' }}
      />

      <StaffFormModal
        visible={profileModalVisible}
        staff={selectedStaff}
        onClose={() => setProfileModalVisible(false)}
        onRefresh={fetchStaffList}
      />

      <StaffCertificateModal
        visible={certModalVisible}
        staff={selectedStaff}
        onClose={() => setCertModalVisible(false)}
        onRefresh={fetchStaffList}
      />

      <StaffAssignmentModal
        visible={assignModalVisible}
        staff={selectedStaff}
        branches={branches}
        onClose={() => setAssignModalVisible(false)}
        onRefresh={fetchStaffList}
      />
    </Card>
  );
}
