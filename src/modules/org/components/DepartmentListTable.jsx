import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Switch, Card, Select, Input, Space, message } from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { departmentService } from '../../../services/departmentService';
import { orgService } from '../../../services/orgService';
import DepartmentFormModal from './DepartmentFormModal';

const { Option } = Select;

export default function DepartmentListTable() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);

  useEffect(() => {
    initData();

    const handleBranchChanged = () => {
      const activeId = localStorage.getItem('activeBranchId');
      if (activeId) {
        setSelectedBranchId(activeId);
        fetchDepartments(activeId);
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
      const branchList = await orgService.getBranches();
      setBranches(branchList);

      const activeId = localStorage.getItem('activeBranchId');
      const storedExists = branchList.some(b => b.id === activeId);
      if (activeId && storedExists) {
        setSelectedBranchId(activeId);
        fetchDepartments(activeId);
      } else {
        setSelectedBranchId('ALL');
        fetchDepartments('ALL');
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể tải thông tin chi nhánh');
      setLoading(false);
    }
  };

  const fetchDepartments = async (branchId) => {
    try {
      setLoading(true);
      const targetBranchId = branchId !== undefined ? branchId : selectedBranchId;
      const list = await departmentService.getDepartments(targetBranchId);
      setData(list);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách bộ phận');
    } finally {
      setLoading(false);
    }
  };

  const handleBranchChange = (value) => {
    setSelectedBranchId(value);
    fetchDepartments(value);
  };

  const handleToggleStatus = async (checked, record) => {
    try {
      await departmentService.toggleDepartmentStatus(record.id, checked);
      message.success(`Đã ${checked ? 'hoạt động' : 'ngừng hoạt động'} bộ phận ${record.name}`);
      fetchDepartments();
    } catch (err) {
      console.error(err);
      message.error('Thay đổi trạng thái thất bại');
    }
  };

  const handleEdit = (dept) => {
    setSelectedDept(dept);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setSelectedDept(null);
    setModalVisible(true);
  };

  const getBranchName = (id) => {
    if (!id) return 'Hệ thống (Dùng chung)';
    const b = branches.find((item) => item.id === id);
    return b ? b.name : 'Chi nhánh không xác định';
  };

  const filteredData = data.filter((item) => {
    const term = searchText.toLowerCase();
    if (!term) return true;
    return (
      item.name.toLowerCase().includes(term) ||
      item.code.toLowerCase().includes(term) ||
      (item.description && item.description.toLowerCase().includes(term))
    );
  });

  const columns = [
    {
      title: 'Mã bộ phận',
      dataIndex: 'code',
      key: 'code',
      width: '15%',
      render: (text) => <Tag color="orange">{text}</Tag>,
    },
    {
      title: 'Tên bộ phận/phòng ban',
      dataIndex: 'name',
      key: 'name',
      width: '25%',
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Chi nhánh trực thuộc',
      dataIndex: 'branchId',
      key: 'branchId',
      width: '25%',
      render: (branchId) => getBranchName(branchId),
    },
    {
      title: 'Mô tả nhiệm vụ',
      dataIndex: 'description',
      key: 'description',
      width: '20%',
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>-</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: '10%',
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
      width: '5%',
      render: (_, record) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
          size="small"
        />
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
            style={{ width: 180 }}
            value={selectedBranchId}
            onChange={handleBranchChange}
          >
            <Option value="ALL">Tất cả chi nhánh</Option>
            {branches.map((b) => (
              <Option key={b.id} value={b.id}>
                {b.name}
              </Option>
            ))}
          </Select>
          <Space.Compact size="small" style={{ marginLeft: 8 }}>
            <Input
              placeholder="Tìm theo tên, mã..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              style={{ width: 200 }}
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
          Thêm bộ phận
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
      <DepartmentFormModal
        visible={modalVisible}
        department={selectedDept}
        onClose={() => setModalVisible(false)}
        onRefresh={fetchDepartments}
      />
    </Card>
  );
}
