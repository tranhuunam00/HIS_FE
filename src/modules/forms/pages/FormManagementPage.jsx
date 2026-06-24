import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Tag, Space, Switch, Select, Typography, message, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, PrinterOutlined } from '@ant-design/icons';
import { formService } from '../../../services/formService';
import FormTemplateModal from '../components/FormTemplateModal';
import PrintPreviewModal from '../components/PrintPreviewModal';

const { Title, Paragraph } = Typography;

const CATEGORY_MAP = {
  INVOICE: { color: 'green', label: 'Hóa đơn & Thanh toán' },
  PRESCRIPTION: { color: 'blue', label: 'Đơn thuốc' },
  LAB_RESULT: { color: 'purple', label: 'Kết quả xét nghiệm' },
  ULTRASOUND_RESULT: { color: 'orange', label: 'Kết quả siêu âm' },
};

const TYPE_MAP = {
  PRINT_TEMPLATE: { color: 'geekblue', label: 'Mẫu in ra giấy' },
  CLINICAL_TEMPLATE: { color: 'gold', label: 'Mẫu nhập liệu lâm sàng' },
};

export default function FormManagementPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filterType, setFilterType] = useState(undefined);
  const [filterCategory, setFilterCategory] = useState(undefined);

  // Modals state
  const [editorVisible, setEditorVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchForms();
  }, [filterType, filterCategory]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const list = await formService.getForms(filterType, filterCategory);
      setData(list);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách mẫu biểu mẫu');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (checked, record) => {
    try {
      await formService.toggleFormStatus(record.id, checked);
      message.success(`Đã ${checked ? 'bật' : 'tắt'} hoạt động mẫu ${record.name}`);
      fetchForms();
    } catch (err) {
      console.error(err);
      message.error('Cập nhật trạng thái thất bại');
    }
  };

  const handleEdit = (record) => {
    setSelectedForm(record);
    setEditorVisible(true);
  };

  const handleAdd = () => {
    setSelectedForm(null);
    setEditorVisible(true);
  };

  const handlePrintPreview = (record) => {
    setSelectedForm(record);
    setPreviewVisible(true);
  };

  const handleSave = async (values) => {
    try {
      setSaving(true);
      if (selectedForm) {
        // Update
        await formService.updateForm(selectedForm.id, values);
        message.success('Cập nhật mẫu biểu mẫu thành công!');
      } else {
        // Create
        await formService.createForm(values);
        message.success('Tạo mẫu biểu mẫu thành công!');
      }
      setEditorVisible(false);
      fetchForms();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lưu mẫu biểu mẫu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Tên mẫu biểu mẫu',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <span style={{ fontWeight: 600, color: '#262626' }}>{text}</span>
          {record.description && (
            <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '2px' }}>{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Mã biểu mẫu',
      dataIndex: 'code',
      key: 'code',
      render: (code) => <Tag color="cyan">{code}</Tag>,
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const item = TYPE_MAP[type] || { color: 'default', label: type };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: 'Nhóm nghiệp vụ',
      dataIndex: 'category',
      key: 'category',
      render: (category) => {
        const item = CATEGORY_MAP[category] || { color: 'default', label: category };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          size="small"
          onChange={(checked) => handleToggleStatus(checked, record)}
        />
      ),
    },
    {
      title: 'Cập nhật cuối',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date) => {
        if (!date) return '-';
        const d = new Date(date);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa HTML/CSS">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          {record.type === 'PRINT_TEMPLATE' && (
            <Tooltip title="In thử nghiệm">
              <Button
                type="text"
                icon={<PrinterOutlined style={{ color: '#059669' }} />}
                onClick={() => handlePrintPreview(record)}
                size="small"
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px', background: '#f5f5f5', minHeight: 'calc(100vh - 48px)' }}>
      <div style={{ marginBottom: '16px', maxWidth: 1200, margin: '0 auto 16px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Cấu hình mẫu in & biểu mẫu</Title>
          <Paragraph style={{ margin: 0, color: '#8c8c8c', fontSize: '12px' }}>
            Thiết kế mẫu in hóa đơn thanh toán, đơn thuốc điện tử, mẫu kết quả xét nghiệm và kết quả siêu âm lâm sàng.
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          size="small"
          style={{ backgroundColor: '#059669', borderColor: '#059669' }}
        >
          Thêm biểu mẫu
        </Button>
      </div>

      <Card size="small" style={{ maxWidth: 1200, margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Space style={{ marginBottom: 16 }} size="small">
          <span>Loại:</span>
          <Select
            allowClear
            placeholder="Tất cả loại"
            style={{ width: 180 }}
            value={filterType}
            onChange={setFilterType}
            size="small"
          >
            <Select.Option value="PRINT_TEMPLATE">Mẫu in ra giấy (Print Template)</Select.Option>
            <Select.Option value="CLINICAL_TEMPLATE">Mẫu nhập liệu lâm sàng (Clinical Template)</Select.Option>
          </Select>

          <span>Nhóm nghiệp vụ:</span>
          <Select
            allowClear
            placeholder="Tất cả nhóm"
            style={{ width: 180 }}
            value={filterCategory}
            onChange={setFilterCategory}
            size="small"
          >
            <Select.Option value="INVOICE">Hóa đơn & Thanh toán</Select.Option>
            <Select.Option value="PRESCRIPTION">Đơn thuốc</Select.Option>
            <Select.Option value="LAB_RESULT">Kết quả xét nghiệm</Select.Option>
            <Select.Option value="ULTRASOUND_RESULT">Kết quả siêu âm</Select.Option>
          </Select>
        </Space>

        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 10, size: 'small' }}
        />
      </Card>

      <FormTemplateModal
        visible={editorVisible}
        onCancel={() => setEditorVisible(false)}
        onSave={handleSave}
        record={selectedForm}
        loading={saving}
      />

      <PrintPreviewModal
        visible={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        record={selectedForm}
      />
    </div>
  );
}
