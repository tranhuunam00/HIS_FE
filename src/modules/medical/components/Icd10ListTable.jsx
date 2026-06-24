import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Card, Input, message } from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { medicalService } from '../../../services/medicalService';
import Icd10FormModal from './Icd10FormModal';

export default function Icd10ListTable() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [specialties, setSpecialties] = useState([]);

  // Pagination & Search state
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIcd10, setSelectedIcd10] = useState(null);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      const specList = await medicalService.getSpecialties();
      setSpecialties(specList);
      fetchIcd10List(1, pageSize, searchText);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải chuyên khoa');
    }
  };

  const fetchIcd10List = async (page = 1, limit = 10, search = '') => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
      };
      if (search) {
        params.search = search;
      }
      const response = await medicalService.getIcd10List(params);
      setData(response.data || []);
      setTotal(response.total || 0);
      setCurrentPage(response.page || page);
      setPageSize(response.limit || limit);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách ICD-10');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pagination) => {
    fetchIcd10List(pagination.current, pagination.pageSize, searchText);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchText(val);
    // Fetch immediately for search with page resets to 1
    fetchIcd10List(1, pageSize, val);
  };

  const handleEdit = (icd) => {
    setSelectedIcd10(icd);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setSelectedIcd10(null);
    setModalVisible(true);
  };

  const getSpecialtyName = (id) => {
    const spec = specialties.find((s) => s.id === id);
    return spec ? spec.name : '-';
  };

  const columns = [
    {
      title: 'Mã ICD-10',
      dataIndex: 'code',
      key: 'code',
      width: '15%',
      render: (text) => <Tag color="blue" style={{ fontWeight: 500 }}>{text}</Tag>,
    },
    {
      title: 'Tên bệnh (Tiếng Việt)',
      dataIndex: 'name',
      key: 'name',
      width: '35%',
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Tên tiếng Anh (English)',
      dataIndex: 'nameEn',
      key: 'nameEn',
      width: '25%',
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>-</span>,
    },
    {
      title: 'Chuyên khoa liên quan',
      dataIndex: 'specialtyId',
      key: 'specialtyId',
      width: '18%',
      render: (id) => getSpecialtyName(id),
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
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Tìm kiếm mã bệnh:</span>
          <Input
            size="small"
            placeholder="Nhập mã ICD-10 hoặc tên bệnh..."
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
          Thêm mã bệnh
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
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          size: 'small',
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
        }}
        onChange={handleTableChange}
      />
      <Icd10FormModal
        visible={modalVisible}
        icd10={selectedIcd10}
        specialties={specialties}
        onClose={() => setModalVisible(false)}
        onRefresh={() => fetchIcd10List(currentPage, pageSize, searchText)}
      />
    </Card>
  );
}
