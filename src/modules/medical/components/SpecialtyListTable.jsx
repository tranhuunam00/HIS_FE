import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Switch, Avatar, Card, message } from 'antd';
import { PlusOutlined, EditOutlined, PictureOutlined } from '@ant-design/icons';
import { medicalService } from '../../../services/medicalService';
import SpecialtyFormModal from './SpecialtyFormModal';

export default function SpecialtyListTable() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const fetchSpecialties = async () => {
    try {
      setLoading(true);
      const list = await medicalService.getSpecialties();
      setData(list);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách chuyên khoa');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (checked, record) => {
    try {
      // Specialty toggle status in backend takes no body, just toggles (reverts)
      await medicalService.toggleSpecialtyStatus(record.id);
      message.success(`Đã thay đổi trạng thái hoạt động của chuyên khoa ${record.name}`);
      fetchSpecialties();
    } catch (err) {
      console.error(err);
      message.error('Thay đổi trạng thái chuyên khoa thất bại');
    }
  };

  const handleEdit = (specialty) => {
    setSelectedSpecialty(specialty);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setSelectedSpecialty(null);
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'Biểu tượng',
      dataIndex: 'iconUrl',
      key: 'iconUrl',
      width: '10%',
      render: (iconUrl, record) => (
        iconUrl ? (
          <Avatar 
            src={iconUrl} 
            size="small" 
            shape="square" 
            style={{ border: '1px solid #f0f0f0', background: '#fff' }}
          />
        ) : (
          <Avatar 
            icon={<PictureOutlined />} 
            size="small" 
            shape="square" 
            style={{ backgroundColor: '#f5f5f5', color: '#bfbfbf', border: '1px solid #f0f0f0' }}
          />
        )
      ),
    },
    {
      title: 'Mã chuyên khoa',
      dataIndex: 'code',
      key: 'code',
      width: '18%',
      render: (text) => <Tag color="green">{text}</Tag>,
    },
    {
      title: 'Tên chuyên khoa',
      dataIndex: 'name',
      key: 'name',
      width: '25%',
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Mô tả chi tiết',
      dataIndex: 'description',
      key: 'description',
      width: '30%',
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>-</span>,
    },
    {
      title: 'Hoạt động',
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
      width: '7%',
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
      title="Danh mục Chuyên khoa Lâm sàng"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          size="small"
        >
          Thêm chuyên khoa
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
      <SpecialtyFormModal
        visible={modalVisible}
        specialty={selectedSpecialty}
        onClose={() => setModalVisible(false)}
        onRefresh={fetchSpecialties}
      />
    </Card>
  );
}
