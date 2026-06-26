import React, { useEffect, useState } from 'react';
import { Modal, Form, InputNumber, DatePicker, Button, Table, Tag, Popconfirm, Space, Divider, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { medicalService } from '../../../services/medicalService';

export default function ServicePriceModal({ visible, service, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [localPrices, setLocalPrices] = useState([]);

  useEffect(() => {
    if (visible && service) {
      const listedPrices = (service.prices || []).filter((p) => p.priceType === 'LISTED');
      setLocalPrices(listedPrices);
      form.resetFields();
      form.setFieldsValue({
        amount: undefined,
        vatRate: 0,
      });
    }
  }, [visible, service, form]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getActivePriceId = (prices) => {
    if (!prices || prices.length === 0) return null;
    const listedPrices = prices.filter(p => p.priceType === 'LISTED');
    if (listedPrices.length === 0) return null;
    
    const today = dayjs().startOf('day');
    const eligiblePrices = listedPrices.filter(p => !dayjs(p.effectiveDate).isAfter(today));
    
    if (eligiblePrices.length === 0) {
      const sorted = [...listedPrices].sort((a, b) => dayjs(a.effectiveDate).diff(dayjs(b.effectiveDate)));
      return sorted[0]?.id || sorted[0]?.key;
    }
    
    const sorted = eligiblePrices.sort((a, b) => dayjs(b.effectiveDate).diff(dayjs(a.effectiveDate)));
    return sorted[0]?.id || sorted[0]?.key;
  };

  const activePriceId = getActivePriceId(localPrices);

  const isPriceActionable = (record) => {
    // Nếu là giá tạm thời mới thêm chưa lưu, cho phép sửa đổi/xóa
    if (record.key && record.key.startsWith('temp-')) {
      return true;
    }
    // Nếu đã lưu trong DB, chỉ cho phép sửa đổi/xóa nếu ngày hiệu lực ở tương lai (chờ áp dụng)
    return dayjs(record.effectiveDate).isAfter(dayjs(), 'day');
  };

  const handleAddPrice = async () => {
    try {
      const values = await form.validateFields();
      const newEffDate = dayjs().format('YYYY-MM-DD');

      const existingIndex = localPrices.findIndex(
        (p) => dayjs(p.effectiveDate).format('YYYY-MM-DD') === newEffDate
      );

      let updatedPrices = [...localPrices];
      if (existingIndex >= 0) {
        const existingPrice = localPrices[existingIndex];
        if (!isPriceActionable(existingPrice)) {
          message.error('Đơn giá hôm nay đã được lưu trong lịch sử và không thể sửa đổi');
          return;
        }
        updatedPrices[existingIndex] = {
          ...updatedPrices[existingIndex],
          amount: values.amount,
          vatRate: values.vatRate || 0,
        };
        message.info(`Đã cập nhật đơn giá áp dụng cho ngày hôm nay`);
      } else {
        const newKey = `temp-${Date.now()}`;
        updatedPrices.push({
          key: newKey,
          priceType: 'LISTED',
          amount: values.amount,
          vatRate: values.vatRate || 0,
          effectiveDate: newEffDate,
        });
        message.success('Đơn giá mới sẽ được áp dụng ngay sau khi lưu');
      }

      updatedPrices.sort((a, b) => dayjs(a.effectiveDate).diff(dayjs(b.effectiveDate)));
      setLocalPrices(updatedPrices);

      form.setFieldsValue({
        amount: undefined,
      });
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (localPrices.length === 0) {
      message.error('Dịch vụ phải có ít nhất 1 mức giá hiệu lực');
      return;
    }

    try {
      setSubmitting(true);
      const mappedPricesPayload = localPrices.map((p) => ({
        priceType: 'LISTED',
        amount: p.amount,
        vatRate: p.vatRate,
        effectiveDate: dayjs(p.effectiveDate).format('YYYY-MM-DD'),
      }));

      await medicalService.upsertServicePrices(service.id, { prices: mappedPricesPayload });
      message.success('Lưu lịch sử đơn giá dịch vụ thành công');
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu bảng giá');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Ngày hiệu lực',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      width: '28%',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'amount',
      key: 'amount',
      width: '32%',
      render: (amount) => <strong style={{ color: '#1890ff' }}>{formatCurrency(amount)}</strong>,
    },
    {
      title: 'Thuế VAT',
      dataIndex: 'vatRate',
      key: 'vatRate',
      width: '15%',
      render: (vat) => `${vat || 0}%`,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: '20%',
      render: (_, record) => {
        const recordId = record.id || record.key;
        const isCurrent = recordId === activePriceId;
        if (isCurrent) {
          return <Tag color="green">Đang áp dụng</Tag>;
        }
        return dayjs(record.effectiveDate).isAfter(dayjs(), 'day') ? (
          <Tag color="orange">Chờ áp dụng</Tag>
        ) : (
          <Tag color="default">Hết hiệu lực</Tag>
        );
      },
    },
  ];

  if (!service) return null;

  return (
    <Modal
      title={`Lịch sử đơn giá dịch vụ: ${service.name}`}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      destroyOnClose
      width={600}
      size="small"
      okText="Lưu lại lịch sử"
      cancelText="Hủy"
    >
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 12 }}>
        Cập nhật đơn giá mới cho dịch vụ. Đơn giá mới sẽ được áp dụng ngay lập tức kể từ hôm nay. Không cho phép sửa đổi hoặc xóa các đơn giá cũ đã áp dụng để đảm bảo tính nhất quán dữ liệu hóa đơn.
      </div>

      <Form
        form={form}
        layout="inline"
        size="small"
        style={{ marginBottom: 16, background: '#fafafa', padding: '12px 8px', borderRadius: 6, border: '1px dashed #d9d9d9' }}
      >
        <Space direction="horizontal" style={{ width: '100%', justifyContent: 'space-between' }} align="start">
          <div style={{ paddingTop: 4, fontWeight: 500, color: '#595959' }}>
            Ngày áp dụng: <strong style={{ color: '#1890ff' }}>{dayjs().format('DD/MM/YYYY')}</strong>
            <span style={{ fontSize: 11, color: '#8c8c8c', marginLeft: 6 }}>(Hôm nay)</span>
          </div>

          <Form.Item
            label="Đơn giá"
            name="amount"
            rules={[{ required: true, message: 'Nhập giá' }]}
            style={{ margin: 0 }}
          >
            <InputNumber
              min={0}
              step={5000}
              placeholder="Đơn giá (VND)"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              style={{ width: 140 }}
            />
          </Form.Item>

          <Form.Item
            label="VAT (%)"
            name="vatRate"
            style={{ margin: 0 }}
          >
            <InputNumber min={0} max={100} style={{ width: 65 }} />
          </Form.Item>

          <Button
            type="primary"
            onClick={handleAddPrice}
            icon={<PlusOutlined />}
            size="small"
            style={{ marginTop: 2 }}
          >
            Thêm/Cập nhật
          </Button>
        </Space>
      </Form>

      <Divider style={{ margin: '12px 0' }} />

      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#595959' }}>Lịch sử thay đổi đơn giá:</div>
      <Table
        dataSource={localPrices}
        columns={columns}
        rowKey={(record) => record.id || record.key}
        size="small"
        pagination={false}
        scroll={{ y: 220 }}
      />
    </Modal>
  );
}
