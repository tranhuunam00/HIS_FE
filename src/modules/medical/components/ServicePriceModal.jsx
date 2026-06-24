import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, InputNumber, DatePicker, Button, Space, Row, Col, Divider, message } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { medicalService } from '../../../services/medicalService';

const { Option } = Select;

export default function ServicePriceModal({ visible, service, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && service) {
      if (service.prices && service.prices.length > 0) {
        // Map current prices to form structure
        const mappedPrices = service.prices.map((p) => ({
          priceType: p.priceType,
          amount: p.amount,
          vatRate: p.vatRate,
          effectiveDate: p.effectiveDate ? dayjs(p.effectiveDate) : dayjs(),
        }));
        form.setFieldsValue({ prices: mappedPrices });
      } else {
        // Default with at least one Listed price row
        form.setFieldsValue({
          prices: [
            {
              priceType: 'LISTED',
              amount: 150000,
              vatRate: 0,
              effectiveDate: dayjs(),
            },
          ],
        });
      }
    }
  }, [visible, service, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const mappedPricesPayload = (values.prices || []).map((p) => ({
        priceType: p.priceType,
        amount: p.amount,
        vatRate: p.vatRate !== undefined && p.vatRate !== null ? p.vatRate : 0,
        effectiveDate: p.effectiveDate ? p.effectiveDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      }));

      await medicalService.upsertServicePrices(service.id, { prices: mappedPricesPayload });
      message.success('Cập nhật bảng giá dịch vụ thành công');
      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật bảng giá');
    } finally {
      setSubmitting(false);
    }
  };

  if (!service) return null;

  return (
    <Modal
      title={`Cấu hình bảng giá: ${service.name}`}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      destroyOnClose
      width={650}
      size="small"
    >
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 12 }}>
        Bảng giá hỗ trợ cấu hình nhiều mức giá đồng thời. Việc lưu bảng giá mới sẽ cập nhật/ghi đè các mức giá hiện tại của dịch vụ y tế này.
      </div>

      <Form
        form={form}
        layout="vertical"
        size="small"
        style={{ marginTop: 12 }}
      >
        <Form.List name="prices">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Row key={key} gutter={8} align="middle" style={{ marginBottom: 4 }}>
                  <Col span={6}>
                    <Form.Item
                      {...restField}
                      name={[name, 'priceType']}
                      rules={[{ required: true, message: 'Chọn loại giá' }]}
                      style={{ margin: 0 }}
                    >
                      <Select placeholder="Loại giá">
                        <Option value="LISTED">Giá niêm yết</Option>
                        <Option value="INSURANCE">Giá BHYT</Option>
                        <Option value="VIP">Giá VIP</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      {...restField}
                      name={[name, 'amount']}
                      rules={[{ required: true, message: 'Nhập số tiền' }]}
                      style={{ margin: 0 }}
                    >
                      <InputNumber
                        min={0}
                        step={5000}
                        placeholder="Số tiền (VND)"
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      {...restField}
                      name={[name, 'vatRate']}
                      style={{ margin: 0 }}
                    >
                      <InputNumber min={0} max={100} placeholder="VAT (%)" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={5}>
                    <Form.Item
                      {...restField}
                      name={[name, 'effectiveDate']}
                      rules={[{ required: true, message: 'Chọn ngày' }]}
                      style={{ margin: 0 }}
                    >
                      <DatePicker format="DD/MM/YYYY" placeholder="Hiệu lực" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={1}>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                      disabled={fields.length === 1}
                      size="small"
                    />
                  </Col>
                </Row>
              ))}

              <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
                <Button
                  type="dashed"
                  onClick={() => add({ priceType: 'LISTED', amount: 0, vatRate: 0, effectiveDate: dayjs() })}
                  block
                  icon={<PlusOutlined />}
                  size="small"
                >
                  Thêm loại giá mới
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
