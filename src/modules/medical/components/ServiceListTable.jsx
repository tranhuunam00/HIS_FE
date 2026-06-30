import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Switch, Card, Select, Input, Tooltip, message } from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined, DollarOutlined } from '@ant-design/icons';
import { medicalService } from '../../../services/medicalService';
import ServiceFormModal from './ServiceFormModal';
import ServicePriceModal from './ServicePriceModal';

const { Option } = Select;

const CATEGORY_TAGS = {
  EXAMINATION: { color: 'blue', label: 'Khám bệnh' },
  LAB_TEST: { color: 'orange', label: 'Xét nghiệm' },
  IMAGING: { color: 'magenta', label: 'Chẩn đoán hình ảnh' },
  PROCEDURE: { color: 'purple', label: 'Thủ thuật' },
  SURGERY: { color: 'red', label: 'Phẫu thuật' },
  THERAPY: { color: 'cyan', label: 'Trị liệu' },
};

const PRICE_TYPE_LABELS = {
  LISTED: { label: 'Niêm yết', color: 'green' },
  INSURANCE: { label: 'BHYT', color: 'blue' },
  VIP: { label: 'VIP', color: 'purple' },
};

const getActivePriceObjectAtDate = (prices, targetDate) => {
  if (!prices || prices.length === 0) return null;
  const listedPrices = prices.filter(p => p.priceType === 'LISTED');
  if (listedPrices.length === 0) {
    return prices[0] || null;
  }
  
  const targetTime = new Date(targetDate).setHours(0, 0, 0, 0);
  
  const eligiblePrices = listedPrices.filter(p => {
    const effTime = new Date(p.effectiveDate).setHours(0, 0, 0, 0);
    return effTime <= targetTime;
  });
  
  if (eligiblePrices.length === 0) {
    const sorted = [...listedPrices].sort((a, b) => 
      new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    );
    return sorted[0];
  }
  
  const sorted = eligiblePrices.sort((a, b) => 
    new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );
  return sorted[0];
};

export default function ServiceListTable() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [specialties, setSpecialties] = useState([]);

  // Filters State
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchText, setSearchText] = useState('');

  // Modal States
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      setLoading(true);
      const specList = await medicalService.getSpecialties();
      setSpecialties(specList);
      fetchServices();
    } catch (err) {
      console.error(err);
      message.error('Không thể khởi tạo danh sách chuyên khoa');
      setLoading(false);
    }
  };

  const fetchServices = async (customParams = {}) => {
    try {
      setLoading(true);
      const specParam = customParams.specialtyId !== undefined ? customParams.specialtyId : selectedSpecialtyId;
      const catParam = customParams.category !== undefined ? customParams.category : selectedCategory;

      const params = {};
      if (specParam && specParam !== 'ALL') params.specialtyId = specParam;
      if (catParam && catParam !== 'ALL') params.category = catParam;

      const list = await medicalService.getServices(params);
      setData(list);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách dịch vụ y tế');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const changes = { [key]: value };
    if (key === 'specialtyId') {
      setSelectedSpecialtyId(value);
    } else if (key === 'category') {
      setSelectedCategory(value);
    }
    fetchServices(changes);
  };

  const handleToggleStatus = async (checked, record) => {
    try {
      await medicalService.toggleServiceStatus(record.id);
      message.success(`Đã thay đổi trạng thái của dịch vụ ${record.name}`);
      fetchServices();
    } catch (err) {
      console.error(err);
      message.error('Thay đổi trạng thái dịch vụ thất bại');
    }
  };

  const handleEditService = (service) => {
    setSelectedService(service);
    setServiceModalVisible(true);
  };

  const handleEditPrice = (service) => {
    setSelectedService(service);
    setPriceModalVisible(true);
  };

  const handleAdd = () => {
    setSelectedService(null);
    setServiceModalVisible(true);
  };

  const getSpecialtyName = (id) => {
    const spec = specialties.find((s) => s.id === id);
    return spec ? spec.name : '-';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Local client search for quick filter
  const filteredData = data.filter((item) => {
    const term = searchText.toLowerCase();
    if (!term) return true;
    return (
      item.name.toLowerCase().includes(term) ||
      item.code.toLowerCase().includes(term)
    );
  });

  const columns = [
    {
      title: 'Mã DV',
      dataIndex: 'code',
      key: 'code',
      width: '10%',
      render: (text) => <Tag color="cyan">{text}</Tag>,
    },
    {
      title: 'Tên dịch vụ y tế',
      dataIndex: 'name',
      key: 'name',
      width: '22%',
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Phân loại',
      dataIndex: 'category',
      key: 'category',
      width: '12%',
      render: (cat) => {
        const tag = CATEGORY_TAGS[cat] || { color: 'default', label: cat };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Chuyên khoa',
      dataIndex: 'specialtyId',
      key: 'specialtyId',
      width: '14%',
      render: (id) => getSpecialtyName(id),
    },
    {
      title: 'Thời lượng',
      dataIndex: 'durationMinutes',
      key: 'durationMinutes',
      width: '10%',
      render: (val) => `${val} phút`,
    },
    {
      title: 'Đơn giá (VND)',
      dataIndex: 'prices',
      key: 'prices',
      width: '18%',
      render: (prices) => {
        const activePrice = getActivePriceObjectAtDate(prices, new Date());
        if (!activePrice) {
          return <span style={{ color: '#bfbfbf', fontSize: 11 }}>Chưa cấu hình giá</span>;
        }
        return <span style={{ fontWeight: 600 }}>{formatCurrency(activePrice.amount)}</span>;
      },
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
      width: '8%',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Sửa dịch vụ">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditService(record)}
              size="small"
            />
          </Tooltip>

          <Tooltip title="Điều chỉnh giá">
            <Button
              type="text"
              icon={<DollarOutlined />}
              onClick={() => handleEditPrice(record)}
              size="small"
              style={{ color: '#52c41a' }}
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
          <span style={{ fontSize: 13, fontWeight: 600 }}>Chuyên khoa:</span>
          <Select
            size="small"
            style={{ width: 160 }}
            value={selectedSpecialtyId}
            onChange={(val) => handleFilterChange('specialtyId', val)}
          >
            <Option value="ALL">Tất cả chuyên khoa</Option>
            {specialties.map((s) => (
              <Option key={s.id} value={s.id}>{s.name}</Option>
            ))}
          </Select>

          <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 8 }}>Phân loại:</span>
          <Select
            size="small"
            style={{ width: 160 }}
            value={selectedCategory}
            onChange={(val) => handleFilterChange('category', val)}
          >
            <Option value="ALL">Tất cả phân loại</Option>
            <Option value="EXAMINATION">Khám bệnh</Option>
            <Option value="LAB_TEST">Xét nghiệm</Option>
            <Option value="IMAGING">Chẩn đoán hình ảnh</Option>
            <Option value="PROCEDURE">Thủ thuật</Option>
            <Option value="SURGERY">Phẫu thuật</Option>
            <Option value="THERAPY">Trị liệu</Option>
          </Select>

          <Space.Compact size="small" style={{ marginLeft: 8 }}>
            <Input
              placeholder="Tìm tên, mã dịch vụ..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              style={{ width: 180 }}
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
          Thêm dịch vụ
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

      <ServiceFormModal
        visible={serviceModalVisible}
        service={selectedService}
        specialties={specialties}
        onClose={() => setServiceModalVisible(false)}
        onRefresh={fetchServices}
      />

      <ServicePriceModal
        visible={priceModalVisible}
        service={selectedService}
        onClose={() => setPriceModalVisible(false)}
        onRefresh={fetchServices}
      />
    </Card>
  );
}
