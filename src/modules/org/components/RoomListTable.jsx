import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Switch, Card, Select, Input, Tooltip, Spin, Row, Col, message } from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined, ClusterOutlined } from '@ant-design/icons';
import { roomService } from '../../../services/roomService';
import { orgService } from '../../../services/orgService';
import { medicalService } from '../../../services/medicalService';
import { resourceService } from '../../../services/resourceService';
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
  const [services, setServices] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  const [resourcesModalVisible, setResourcesModalVisible] = useState(false);
  const [selectedRoomForResources, setSelectedRoomForResources] = useState(null);

  useEffect(() => {
    initData();

    const handleBranchChanged = () => {
      const activeId = localStorage.getItem('activeBranchId');
      if (activeId) {
        setSelectedBranchId(activeId);
        fetchRooms(activeId);
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
      const [branchList, specialtyList, serviceList] = await Promise.all([
        orgService.getBranches(),
        medicalService.getSpecialties(),
        medicalService.getServices({ isActive: true }),
      ]);
      setBranches(branchList);
      setSpecialties(specialtyList);
      setServices(serviceList);

      const activeId = localStorage.getItem('activeBranchId');
      const storedExists = branchList.some(b => b.id === activeId);
      if (activeId && storedExists) {
        setSelectedBranchId(activeId);
        fetchRooms(activeId);
      } else if (branchList.length > 0) {
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

  const handleToggleOccupancy = async (resourceId, newOccupancy) => {
    try {
      await resourceService.toggleResourceOccupancy(resourceId, newOccupancy);
      message.success('Đã cập nhật trạng thái giường/ghế');
      fetchRooms(selectedBranchId);
    } catch (err) {
      console.error(err);
      message.error('Cập nhật trạng thái giường/ghế thất bại');
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
      key: 'serviceIds',
      title: 'Dịch vụ',
      width: '10%',
      render: (_, record) => {
        const count = (record.serviceIds || []).length;
        return count > 0 ? <Tag color="green">{count} DV</Tag> : <span style={{ color: '#bfbfbf' }}>-</span>;
      },
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

  // Group rooms by floor
  const roomsByFloor = filteredData.reduce((acc, room) => {
    const floor = room.floor || 'Tầng chưa xác định';
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {});

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
      styles={{ body: { padding: '12px' } }}
    >
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <Spin size="small" />
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#8c8c8c' }}>
          Không tìm thấy phòng nào
        </div>
      ) : (
        <div>
          {Object.entries(roomsByFloor).map(([floor, rooms]) => (
            <div key={floor} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: '8px', borderBottom: '1px solid #e8e8e8', paddingBottom: '4px' }}>
                <span style={{ borderLeft: '3px solid #52c41a', paddingLeft: '8px' }}>{floor}</span>
              </div>
              <Row gutter={[8, 8]}>
                {rooms.map((room) => {
                  const tag = TYPE_TAGS[room.type] || { color: 'default', label: room.type };
                  return (
                    <Col key={room.id} xs={24} sm={12} md={8} lg={6}>
                      <Card
                        size="small"
                        title={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</span>
                            <Tag color={tag.color} style={{ margin: 0, fontSize: '10px', height: '18px', lineHeight: '16px' }}>{tag.label}</Tag>
                          </div>
                        }
                        extra={
                          <Switch
                            size="small"
                            checked={room.isActive}
                            onChange={(checked) => handleToggleStatus(checked, room)}
                          />
                        }
                        actions={[
                          <Tooltip title="Sửa phòng" key="edit">
                            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(room)} />
                          </Tooltip>,
                          <Tooltip title="Thiết bị / Tài nguyên" key="resources">
                            <Button type="text" size="small" icon={<ClusterOutlined />} onClick={() => handleOpenResources(room)} style={{ color: '#13c2c2' }} />
                          </Tooltip>
                        ]}
                        style={{ border: '1px solid #f0f0f0', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
                        styles={{ body: { padding: '8px' } }}
                      >
                        <div style={{ fontSize: '11px', color: '#8c8c8c', marginBottom: '4px' }}>
                          Mã: <Tag color="geekblue" style={{ fontSize: '10px', margin: 0, height: '16px', lineHeight: '14px' }}>{room.code}</Tag>
                        </div>
                        <div style={{ fontSize: '11px', color: '#8c8c8c', marginBottom: '8px' }}>
                          Khoa: <span style={{ color: '#595959', fontWeight: 500 }}>{getSpecialtyName(room.specialtyId) || 'Dùng chung'}</span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#262626', marginBottom: '4px' }}>
                          Sơ đồ Giường / Ghế:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '32px' }}>
                          {(!room.resources || room.resources.length === 0) ? (
                            <span style={{ color: '#bfbfbf', fontSize: '11px' }}>Chưa cấu hình tài nguyên</span>
                          ) : (
                            room.resources.map((res) => {
                              const isOccupied = res.isOccupied;
                              const isActive = res.isActive;
                              const tooltipText = `${res.name} (${res.code}) - Trạng thái: ${isOccupied ? 'ĐANG BẬN' : 'TRỐNG'}. Click để đổi trạng thái.`;
                              
                              return (
                                <Tooltip key={res.id} title={tooltipText}>
                                  <Tag
                                    color={isOccupied ? 'error' : 'success'}
                                    style={{
                                      cursor: 'pointer',
                                      margin: 0,
                                      fontSize: '11px',
                                      userSelect: 'none',
                                      opacity: isActive ? 1 : 0.4
                                    }}
                                    onClick={() => handleToggleOccupancy(res.id, !isOccupied)}
                                  >
                                    {res.code}
                                  </Tag>
                                </Tooltip>
                              );
                            })
                          )}
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </div>
          ))}
        </div>
      )}
      <RoomFormModal
        visible={modalVisible}
        room={selectedRoom}
        branchId={selectedBranchId}
        specialties={specialties}
        services={services}
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
