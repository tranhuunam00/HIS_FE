import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Switch, Button, Table, Tag, Divider, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { staffService } from '../../../services/staffService';
import { roomService } from '../../../services/roomService';
import { medicalService } from '../../../services/medicalService';

const { Option } = Select;

export default function StaffAssignmentModal({ visible, staff, branches, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, staff]);

  const loadData = async () => {
    try {
      const [specList, roomList] = await Promise.all([
        medicalService.getSpecialties(),
        roomService.getRooms(), // fetch all rooms to map names
      ]);
      setSpecialties(specList);
      setAllRooms(roomList);

      // Pre-select first branch if available
      if (branches && branches.length > 0) {
        const defaultBranchId = branches[0].id;
        setSelectedBranchId(defaultBranchId);
        filterRoomsForBranch(defaultBranchId, roomList);

        // Check if staff has an assignment for this default branch
        const existing = staff?.assignments?.find((a) => a.branchId === defaultBranchId);
        if (existing) {
          form.setFieldsValue({
            branchId: defaultBranchId,
            specialtyId: existing.specialtyId || undefined,
            roomId: existing.roomId || undefined,
            isPrimary: existing.isPrimary,
          });
        } else {
          form.setFieldsValue({
            branchId: defaultBranchId,
            specialtyId: undefined,
            roomId: undefined,
            isPrimary: false,
          });
        }
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách chuyên khoa hoặc phòng khám');
    }
  };

  const filterRoomsForBranch = (branchId, roomsList) => {
    const list = roomsList || allRooms;
    const filtered = list.filter((r) => r.branchId === branchId && r.isActive);
    setFilteredRooms(filtered);
  };

  const handleBranchChange = (value) => {
    setSelectedBranchId(value);
    filterRoomsForBranch(value);

    // Reset selected room in form
    form.setFieldsValue({ roomId: undefined });

    // Look up if staff already assigned to this branch
    const existing = staff?.assignments?.find((a) => a.branchId === value);
    if (existing) {
      form.setFieldsValue({
        specialtyId: existing.specialtyId || undefined,
        roomId: existing.roomId || undefined,
        isPrimary: existing.isPrimary,
      });
    } else {
      form.setFieldsValue({
        specialtyId: undefined,
        roomId: undefined,
        isPrimary: false,
      });
    }
  };

  const handleSaveAssignment = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        branchId: values.branchId,
        specialtyId: values.specialtyId || null,
        roomId: values.roomId || null,
        isPrimary: values.isPrimary || false,
      };

      await staffService.assignStaff(staff.id, payload);
      message.success('Cập nhật phân công công tác thành công');
      onRefresh();
      
      // We need to refresh the current staff modal state as well
      // Fetch latest staff detail
      const updatedStaff = await staffService.getStaff(staff.id);
      // Update local state or just close/refresh
      onRefresh();
      
      // Reload this modal data as well to reflect changes in table
      staff.assignments = updatedStaff.assignments;
      loadData();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu phân công');
    } finally {
      setSubmitting(false);
    }
  };

  const getBranchName = (id) => {
    const b = branches.find((item) => item.id === id);
    return b ? b.name : id;
  };

  const getSpecialtyName = (id) => {
    if (!id) return '-';
    const s = specialties.find((item) => item.id === id);
    return s ? s.name : '-';
  };

  const getRoomName = (id) => {
    if (!id) return '-';
    const r = allRooms.find((item) => item.id === id);
    return r ? r.name : '-';
  };

  const columns = [
    {
      title: 'Chi nhánh / Cơ sở',
      dataIndex: 'branchId',
      key: 'branchId',
      render: (id) => getBranchName(id),
    },
    {
      title: 'Chuyên khoa',
      dataIndex: 'specialtyId',
      key: 'specialtyId',
      render: (id) => getSpecialtyName(id),
    },
    {
      title: 'Phòng làm việc',
      dataIndex: 'roomId',
      key: 'roomId',
      render: (id) => getRoomName(id),
    },
    {
      title: 'Phân công chính',
      dataIndex: 'isPrimary',
      key: 'isPrimary',
      render: (isPrimary) => (
        isPrimary ? <Tag color="green">Chính</Tag> : <Tag color="default">Phụ</Tag>
      ),
    },
  ];

  if (!staff) return null;

  return (
    <Modal
      title={`Phân công công tác: ${staff.fullName}`}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" size="small" onClick={onClose}>
          Đóng
        </Button>
      ]}
      destroyOnClose
      width={650}
      size="small"
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
        style={{ marginTop: 12 }}
      >
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Chọn chi nhánh phân công"
              name="branchId"
              rules={[{ required: true, message: 'Vui lòng chọn chi nhánh' }]}
            >
              <Select placeholder="Chọn chi nhánh" onChange={handleBranchChange}>
                {branches.map((b) => (
                  <Option key={b.id} value={b.id}>
                    {b.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Chuyên khoa công tác"
              name="specialtyId"
            >
              <Select placeholder="Chọn chuyên khoa (nếu có)" allowClear>
                {specialties.map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Phòng khám / Phòng làm việc"
              name="roomId"
            >
              <Select placeholder="Chọn phòng (lọc theo chi nhánh)" allowClear>
                {filteredRooms.map((r) => (
                  <Option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Cơ sở làm việc chính"
              name="isPrimary"
              valuePropName="checked"
            >
              <Switch checkedChildren="Có" unCheckedChildren="Không" />
            </Form.Item>
          </Col>
          <Col span={6} style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 24 }}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveAssignment}
              loading={submitting}
              style={{ width: '100%' }}
            >
              Lưu phân công
            </Button>
          </Col>
        </Row>
      </Form>

      <Divider style={{ margin: '16px 0 8px 0' }}>Danh sách phân công hiện tại</Divider>

      <Table
        dataSource={staff.assignments || []}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        locale={{ emptyText: 'Chưa có phân công công tác nào' }}
      />
    </Modal>
  );
}
