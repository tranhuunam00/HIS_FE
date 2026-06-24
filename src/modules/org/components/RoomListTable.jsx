import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Switch, Card, Select, Input, Tooltip, message } from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined, ClusterOutlined } from '@ant-design/icons';
import { roomService } from '../../../services/roomService';
import { orgService } from '../../../services/orgService';
import { medicalService } from '../../../services/medicalService';
import RoomFormModal from './RoomFormModal';
import RoomResourcesModal from './RoomResourcesModal';

const { Option } = Select;

const TYPE_TAGS = {
  CLINIC: { color: 'green', label: 'Phòng khám' },
  TREATMENT: { color: 'blue', label: 'Phòng điều trị' },
  PROCEDURE: { color: 'purple', label: 'Phòng thủ thuật' },
  LABORATORY: { color: 'orange', label: 'Phòng xét nghiệm' },
  IMAGING: { color: 'magenta', label: 'Chẩn đoán hình ảnh' },
};

export default function RoomListTable() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  const [resourcesModalVisible, setResourcesModalVisible] = useState(false);
  const [selectedRoomForResources, setSelectedRoomForResources] = useState(null);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      setLoading(true);
      const [branchList, specialtyList] = await Promise.all([
        orgService.getBranches(),
        medicalService.getSpecialties(),
      ]);
      setBranches(branchList);
      setSpecialties(specialtyList);

      if (branchList.length > 0) {
        setSelectedBranchId(branchList[0].id);
        fetchRooms(branchList[0].id);
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể khởi tạo dữ liệu phòng ban');
      setLoading(false);
    }
  };

  const fetchRooms = async (branchId) => {
    if (!branchId) return;
    try {
      setLoading(true);
      const list = await roomService.getRooms(branchId);
      setData(list);
      applyFilter(list, searchText);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách phòng khám');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (roomsList, searchVal) => {
    if (!searchVal) {
      setFilteredData(roomsList);
      return;
    }
    const lower = searchVal.toLowerCase();
    const filtered = roomsList.filter(
      (room) =>
        room.name.toLowerCase().includes(lower) ||
        room.code.toLowerCase().includes(lower) ||
        (room.floor && room.floor.toLowerCase().includes(lower))
    );
    setFilteredData(filtered);
  };

  const handleBranchChange = (value) => {
    setSelectedBranchId(value);
    fetchRooms(value);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchText(val);
    applyFilter(data, val);
  };

  const handleToggleStatus = async (checked, record) => {
    try {
      await roomService.toggleRoomStatus(record.id, checked);
      message.success(`Đã ${checked ? 'hoạt động' : 'ngưng hoạt động'} phòng ${record.name}`);
      fetchRooms(selectedBranchId);
    } catch (err) {
      console.error(err);
      message.error('Thay đổi trạng thái phòng thất bại');
    }
  };

  const handleEdit = (room) => {
    setSelectedRoom(room);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setSelectedRoom(null);
    setModalVisible(true);
  };

  const handleOpenResources = (room) => {
    setSelectedRoomForResources(room);
    setResourcesModalVisible(true);
  };

  const getSpecialtyName = (id) => {
    if (!id) return null;
    const spec = specialties.find((s) => s.id === id);
    return spec ? spec.name : null;
  };

  const columns = [
    {
      title: 'Mã phòng',
      dataIndex: 'code',
      key: 'code',
      width: '12%',
      render: (text) => <Tag color="geekblue">{text}</Tag>,
    },
    {
      title: 'Tên phòng khám / buồng bệnh',
      dataIndex: 'name',
      key: 'name',
      width: '25%',
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Phân loại',
      dataIndex: 'type',
      key: 'type',
      width: '15%',
      render: (type) => {
        const tag = TYPE_TAGS[type] || { color: 'default', label: type };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Chuyên khoa phụ trách',
      dataIndex: 'specialtyId',
      key: 'specialtyId',
      width: '15%',
      render: (id) => getSpecialtyName(id) || <span style={{ color: '#bfbfbf' }}>Phòng dùng chung</span>,
    },
    {
      title: 'Thiết bị & Ghế & Giường',
      key: 'resources',
      width: '15%',
      render: (_, record) => {
        const count = (record.resources || []).length;
        return count > 0 ? (
          <Tag color="cyan">{count} tài nguyên</Tag>
        ) : (
          <span style={{ color: '#bfbfbf' }}>Trống</span>
        );
      },
    },
    {
      title: 'Vị trí',
      dataIndex: 'floor',
      key: 'floor',
      width: '10%',
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>-</span>,
    },
    {
      title: 'Sức chứa (Lượt)',
      dataIndex: 'capacity',
      key: 'capacity',
      width: '10%',
      render: (val) => `${val} ghế/giường`,
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
      width: '10%',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Sửa phòng">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Thiết bị / Tài nguyên">
            <Button
              type="text"
              icon={<ClusterOutlined />}
              onClick={() => handleOpenResources(record)}
              size="small"
              style={{ color: '#13c2c2' }}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Chi nhánh:</span>
          <Select
            size="small"
            style={{ width: 220 }}
            value={selectedBranchId}
            onChange={handleBranchChange}
            placeholder="Chọn chi nhánh"
            loading={branches.length === 0}
          >
            {branches.map((b) => (
              <Option key={b.id} value={b.id}>
                {b.name}
              </Option>
            ))}
          </Select>
          <Space.Compact size="small">
            <Input
              placeholder="Tìm theo mã, tên, vị trí..."
              value={searchText}
              onChange={handleSearch}
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              style={{ width: 220 }}
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
          disabled={!selectedBranchId}
        >
          Thêm phòng mới
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
      <RoomFormModal
        visible={modalVisible}
        room={selectedRoom}
        branchId={selectedBranchId}
        specialties={specialties}
        branches={branches}
        onClose={() => setModalVisible(false)}
        onRefresh={() => fetchRooms(selectedBranchId)}
      />
      <RoomResourcesModal
        visible={resourcesModalVisible}
        room={selectedRoomForResources}
        onClose={() => setResourcesModalVisible(false)}
        onRefresh={() => fetchRooms(selectedBranchId)}
      />
    </Card>
  );
}
