import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Switch, Card, message } from 'antd';
import { PlusOutlined, EditOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { orgService } from '../../../services/orgService';
import BranchFormModal from './BranchFormModal';

const TYPE_TAGS = {
  CLINIC: { color: 'blue', label: 'Phòng khám' },
  HOSPITAL: { color: 'purple', label: 'Bệnh viện' },
  LAB: { color: 'orange', label: 'Xét nghiệm' },
};

const DAY_MAP = {
  Monday: 'T2',
  Tuesday: 'T3',
  Wednesday: 'T4',
  Thursday: 'T5',
  Friday: 'T6',
  Saturday: 'T7',
  Sunday: 'CN',
};

export default function BranchListTable() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const list = await orgService.getBranches();
      setData(list);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách chi nhánh');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (checked, record) => {
    try {
      await orgService.toggleBranchStatus(record.id, checked);
      message.success(`Đã ${checked ? 'hoạt động' : 'ngưng hoạt động'} chi nhánh ${record.name}`);
      fetchBranches();
    } catch (err) {
      console.error(err);
      message.error('Thay đổi trạng thái thất bại');
    }
  };

  const handleEdit = (branch) => {
    setSelectedBranch(branch);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setSelectedBranch(null);
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'Tên cơ sở',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <small style={{ color: '#8c8c8c' }}>
            <EnvironmentOutlined /> {record.addressDetail ? `${record.addressDetail}, ` : ''}{record.district ? `${record.district}, ` : ''}{record.province || ''}
          </small>
        </div>
      ),
    },
    {
      title: 'Mã cơ sở',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <Tag color="cyan">{text}</Tag>,
    },
    {
      title: 'Loại hình',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const tag = TYPE_TAGS[type] || { color: 'default', label: type };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Phụ trách chuyên môn',
      dataIndex: 'technicalDirector',
      key: 'technicalDirector',
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>Chưa thiết lập</span>,
    },
    {
      title: 'Hotline / Email',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div>{record.hotline || '-'}</div>
          <small style={{ color: '#8c8c8c' }}>{record.email || '-'}</small>
        </div>
      ),
    },
    {
      title: 'Giờ làm việc',
      key: 'workingHours',
      render: (_, record) => {
        const days = record.workingDays
          ? record.workingDays.map((d) => DAY_MAP[d] || d).join(', ')
          : '';
        return (
          <div>
            <div>{record.openTime} - {record.closeTime}</div>
            <small style={{ color: '#8c8c8c' }}>{days}</small>
          </div>
        );
      },
    },
    {
      title: 'Hoạt động',
      dataIndex: 'isActive',
      key: 'isActive',
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
      title="Danh sách Chi nhánh & Cơ sở khám chữa bệnh"
      size="small"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          size="small"
        >
          Thêm chi nhánh
        </Button>
      }
      styles={{ body: { padding: '0px' } }}
    >
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{ pageSize: 10, size: 'small' }}
      />
      <BranchFormModal
        visible={modalVisible}
        branch={selectedBranch}
        onClose={() => setModalVisible(false)}
        onRefresh={fetchBranches}
      />
    </Card>
  );
}
