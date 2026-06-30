import React, { useEffect, useState } from 'react';
import { Modal, Table, Input, Tag, Button, Space, message, Spin } from 'antd';
import { SearchOutlined, SaveOutlined } from '@ant-design/icons';
import { staffService } from '../../../services/staffService';
import { roomService } from '../../../services/roomService';

const TITLE_TAGS = {
  DOCTOR: { color: 'blue', label: 'Bác sĩ' },
  NURSE: { color: 'cyan', label: 'Điều dưỡng' },
  TECHNICIAN: { color: 'purple', label: 'Kỹ thuật viên' },
  RECEPTIONIST: { color: 'orange', label: 'Lễ tân' },
  ADMINISTRATOR: { color: 'red', label: 'Quản trị viên' },
  OTHER: { color: 'default', label: 'Khác' },
};

export default function RoomStaffAssignmentModal({ visible, room, branchId, onClose, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (visible && room && branchId) {
      loadRooms();
      loadStaff();
      setSearchText('');
    }
  }, [visible, room, branchId]);

  const loadRooms = async () => {
    try {
      const list = await roomService.getRooms(branchId);
      setRooms(list);
    } catch (err) {
      console.error('Không thể tải danh sách phòng:', err);
    }
  };

  const loadStaff = async () => {
    try {
      setLoading(true);
      // Fetch all active staff in the branch
      const list = await staffService.getStaffList({ branchId, isActive: true });
      
      // Filter clinical staff or display all staff. Let's filter to display DOCTOR, TECHNICIAN, and NURSE
      const clinicalStaff = list.filter(
        (s) => s.title === 'DOCTOR' || s.title === 'TECHNICIAN' || s.title === 'NURSE'
      );
      
      setStaffList(clinicalStaff);
      setFilteredStaff(clinicalStaff);

      // Determine initially assigned staff for this room
      const initialSelected = clinicalStaff
        .filter((s) => (s.assignments || []).some((a) => a.roomId === room.id))
        .map((s) => s.id);
      
      setSelectedRowKeys(initialSelected);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchText(value);
    if (!value) {
      setFilteredStaff(staffList);
      return;
    }
    const lower = value.toLowerCase();
    const filtered = staffList.filter(
      (s) =>
        s.fullName.toLowerCase().includes(lower) ||
        s.staffCode.toLowerCase().includes(lower) ||
        s.email.toLowerCase().includes(lower)
    );
    setFilteredStaff(filtered);
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      await roomService.assignStaffs(room.id, selectedRowKeys);
      message.success('Cập nhật phân công bác sĩ thành công');
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu phân công');
    } finally {
      setSubmitting(false);
    }
  };

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const getAssignedRooms = (record) => {
    const branchAssigns = (record.assignments || []).filter((a) => a.branchId === branchId && a.roomId);
    if (branchAssigns.length === 0) return null;

    const currentAssign = branchAssigns.find(a => a.roomId === room.id);
    const otherAssigns = branchAssigns.filter(a => a.roomId !== room.id);

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {currentAssign && (
          <Tag color="success" style={{ fontWeight: 600 }}>Phòng hiện tại</Tag>
        )}
        {otherAssigns.map(a => {
          const r = rooms.find(item => item.id === a.roomId);
          return (
            <Tag color="orange" key={a.id} style={{ fontWeight: 500 }}>
              {r ? r.name : 'Phòng khác'}
            </Tag>
          );
        })}
      </div>
    );
  };

  const columns = [
    {
      title: 'Mã NV',
      dataIndex: 'staffCode',
      key: 'staffCode',
      width: '15%',
      render: (text) => <Tag color="geekblue">{text}</Tag>,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
      width: '35%',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Chức danh',
      dataIndex: 'title',
      key: 'title',
      width: '20%',
      render: (title) => {
        const tag = TITLE_TAGS[title] || { color: 'default', label: title };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Trạng thái phân công',
      key: 'status',
      width: '30%',
      render: (_, record) => getAssignedRooms(record) || <span style={{ color: '#bfbfbf' }}>Chưa gán</span>,
    },
  ];

  return (
    <Modal
      title={
        <div style={{ paddingBottom: '4px' }}>
          <div>Phân công bác sĩ / nhân sự làm việc</div>
          <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#8c8c8c', marginTop: '4px' }}>
            Phòng: <span style={{ fontWeight: 600, color: '#262626' }}>{room?.name}</span> ({room?.code})
          </div>
        </div>
      }
      open={visible}
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={submitting}
      destroyOnClose
      width={600}
      size="small"
    >
      <div style={{ marginTop: '12px', marginBottom: '12px' }}>
        <Input
          placeholder="Tìm bác sĩ theo tên, mã nhân viên..."
          value={searchText}
          onChange={handleSearch}
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          size="small"
        />
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Spin size="small" />
        </div>
      ) : (
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredStaff}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ y: 320 }}
          locale={{ emptyText: 'Không tìm thấy bác sĩ / KTV nào phù hợp' }}
        />
      )}
    </Modal>
  );
}
