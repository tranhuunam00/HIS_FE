import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Button, Table, Tag, Switch, Space, Divider, message } from 'antd';
import { SaveOutlined, EditOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { resourceService } from '../../../services/resourceService';

const { Option } = Select;

const TYPE_TAGS = {
  CHAIR: { color: 'blue', label: 'Ghế' },
  BED: { color: 'green', label: 'Giường' },
  EQUIPMENT: { color: 'orange', label: 'Thiết bị y tế' },
};

export default function RoomResourcesModal({ visible, room, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resources, setResources] = useState([]);
  const [editingResource, setEditingResource] = useState(null);

  useEffect(() => {
    if (visible && room) {
      fetchResources();
      form.resetFields();
      setEditingResource(null);
    }
  }, [visible, room]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const list = await resourceService.getResources(room.id);
      setResources(list);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách tài nguyên phòng');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (resource) => {
    setEditingResource(resource);
    form.setFieldsValue({
      code: resource.code,
      name: resource.name,
      type: resource.type,
    });
  };

  const handleCancelEdit = () => {
    setEditingResource(null);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        name: values.name,
        type: values.type,
      };

      if (editingResource) {
        await resourceService.updateResource(editingResource.id, payload);
        message.success('Cập nhật tài nguyên thành công');
      } else {
        const createPayload = {
          ...payload,
          roomId: room.id,
          code: values.code,
        };
        await resourceService.createResource(createPayload);
        message.success('Thêm tài nguyên mới thành công');
      }
      form.resetFields();
      setEditingResource(null);
      fetchResources();
      if (onRefresh) onRefresh(); // refresh RoomListTable to update counts
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu tài nguyên');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (checked, record) => {
    try {
      await resourceService.toggleResourceStatus(record.id, checked);
      message.success(`Đã ${checked ? 'hoạt động' : 'ngừng hoạt động'} tài nguyên ${record.name}`);
      fetchResources();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      message.error('Thay đổi trạng thái tài nguyên thất bại');
    }
  };

  const columns = [
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: '18%',
      render: (text) => <Tag color="purple">{text}</Tag>,
    },
    {
      title: 'Tên tài nguyên / thiết bị',
      dataIndex: 'name',
      key: 'name',
      width: '35%',
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: '20%',
      render: (type) => {
        const tag = TYPE_TAGS[type] || { color: 'default', label: type };
        return <Tag color={tag.color}>{tag.label}</Tag>;
      },
    },
    {
      title: 'Hoạt động',
      dataIndex: 'isActive',
      key: 'isActive',
      width: '15%',
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
      width: '12%',
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

  if (!room) return null;

  return (
    <Modal
      title={`Quản lý Thiết bị & Tài nguyên: ${room.name}`}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" size="small" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      destroyOnClose
      width={600}
      size="small"
    >
      <Form
        form={form}
        layout="inline"
        size="small"
        style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: '8px' }}
        onFinish={handleSave}
      >
        <Form.Item
          name="code"
          rules={[
            { required: !editingResource, message: 'Mã' },
            { pattern: /^[A-Z0-9_]+$/, message: 'In hoa, số' }
          ]}
          style={{ width: '110px', margin: 0 }}
        >
          <Input placeholder="Mã (GNK01)" disabled={!!editingResource} />
        </Form.Item>

        <Form.Item
          name="name"
          rules={[{ required: true, message: 'Tên' }]}
          style={{ flex: 1, minWidth: '150px', margin: 0 }}
        >
          <Input placeholder="Tên (Ví dụ: Ghế nha khoa số 1)" />
        </Form.Item>

        <Form.Item
          name="type"
          rules={[{ required: true, message: 'Loại' }]}
          initialValue="CHAIR"
          style={{ width: '130px', margin: 0 }}
        >
          <Select placeholder="Loại tài nguyên">
            <Option value="CHAIR">Ghế (CHAIR)</Option>
            <Option value="BED">Giường (BED)</Option>
            <Option value="EQUIPMENT">Thiết bị (EQUIPMENT)</Option>
          </Select>
        </Form.Item>

        <Form.Item style={{ margin: 0 }}>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={editingResource ? <SaveOutlined /> : <PlusOutlined />}
              loading={submitting}
              size="small"
            >
              {editingResource ? 'Lưu' : 'Thêm'}
            </Button>
            {editingResource && (
              <Button
                icon={<CloseOutlined />}
                onClick={handleCancelEdit}
                size="small"
              />
            )}
          </Space>
        </Form.Item>
      </Form>

      <Divider style={{ margin: '8px 0 12px 0' }} />

      <Table
        dataSource={resources}
        columns={columns}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{ pageSize: 5, size: 'small' }}
        locale={{ emptyText: 'Chưa có thiết bị, giường hoặc ghế nào' }}
      />
    </Modal>
  );
}
