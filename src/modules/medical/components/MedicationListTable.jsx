import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Switch, Card, Input, message } from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { medicalService } from '../../../services/medicalService';
import MedicationFormModal from './MedicationFormModal';

const ROUTE_TAGS = {
  ORAL: { color: 'orange', label: 'Uống (ORAL)' },
  INJECTION: { color: 'red', label: 'Tiêm (INJECTION)' },
  TOPICAL: { color: 'green', label: 'Bôi/Ngoài da (TOPICAL)' },
  INHALATION: { color: 'blue', label: 'Hít/Xịt (INHALATION)' },
  OTHER: { color: 'default', label: 'Khác' },
};

export default function MedicationListTable() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [searchText, setSearchText] = useState('');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async (search = '') => {
    try {
      setLoading(true);
      const list = await medicalService.getMedications(search);
      setData(list);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách thuốc');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchText(val);
    fetchMedications(val);
  };

  const handleToggleStatus = async (checked, record) => {
    try {
      await medicalService.toggleMedicationStatus(record.id);
      message.success(`Đã thay đổi trạng thái của thuốc ${record.name}`);
      fetchMedications(searchText);
    } catch (err) {
      console.error(err);
      message.error('Thay đổi trạng thái thuốc thất bại');
    }
  };

  const handleEdit = (med) => {
    setSelectedMedication(med);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setSelectedMedication(null);
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'Mã thuốc',
      dataIndex: 'code',
      key: 'code',
      width: '10%',
      render: (text) => <Tag color="purple">{text}</Tag>,
    },
    {
      title: 'Mã quốc gia',
      dataIndex: 'nationalCode',
      key: 'nationalCode',
      width: '10%',
      render: (text) => text ? <Tag color="blue">{text}</Tag> : <span style={{ color: '#bfbfbf' }}>-</span>,
    },
    {
      title: 'Tên biệt dược / thuốc',
      dataIndex: 'name',
      key: 'name',
      width: '18%',
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Hoạt chất',
      dataIndex: 'activeIngredient',
      key: 'activeIngredient',
      width: '15%',
    },
    {
      title: 'Hàm lượng',
      dataIndex: 'concentration',
      key: 'concentration',
      width: '8%',
    },
    {
      title: 'Đơn vị / ĐV dùng',
      key: 'units',
      width: '10%',
      render: (_, record) => `${record.unit} / ${record.usageUnit || record.unit}`,
    },
    {
      title: 'Đường dùng',
      dataIndex: 'routeOfAdministration',
      key: 'routeOfAdministration',
      width: '10%',
      render: (route) => {
        const tag = ROUTE_TAGS[route] || { color: 'default', label: route };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Nhóm thuốc',
      dataIndex: 'groupName',
      key: 'groupName',
      width: '12%',
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>-</span>,
    },
    {
      title: 'Hoạt động',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Tìm kiếm thuốc:</span>
          <Input
            size="small"
            placeholder="Tìm theo tên, hoạt chất, mã thuốc..."
            value={searchText}
            onChange={handleSearch}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ width: 250 }}
            allowClear
          />
        </div>
      }
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          size="small"
        >
          Thêm thuốc mới
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
      <MedicationFormModal
        visible={modalVisible}
        medication={selectedMedication}
        onClose={() => setModalVisible(false)}
        onRefresh={() => fetchMedications(searchText)}
      />
    </Card>
  );
}
