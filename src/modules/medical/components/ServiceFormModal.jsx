import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, Row, Col, Divider, message } from 'antd';
import dayjs from 'dayjs';
import { medicalService } from '../../../services/medicalService';

const { Option } = Select;
const { TextArea } = Input;

export default function ServiceFormModal({ visible, service, specialties, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!service;

  useEffect(() => {
    if (visible) {
      if (service) {
        form.setFieldsValue({
          specialtyId: service.specialtyId || undefined,
          code: service.code,
          name: service.name,
          category: service.category,
          description: service.description || '',
          durationMinutes: service.durationMinutes || 15,
          resultDurationHours: service.resultDurationHours || undefined,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          category: 'EXAMINATION',
          durationMinutes: 15,
          initialPrice: 150000,
          initialVat: 0,
        });
      }
    }
  }, [visible, service, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        specialtyId: values.specialtyId || null,
        name: values.name,
        category: values.category,
        description: values.description || null,
        durationMinutes: values.durationMinutes,
        resultDurationHours: values.resultDurationHours || null,
      };

      if (isEdit) {
        await medicalService.updateService(service.id, payload);
        message.success('Cập nhật dịch vụ y tế thành công');
      } else {
        const createPayload = {
          ...payload,
          code: values.code,
        };
        // Add initial price if specified on creation
        if (values.initialPrice !== undefined && values.initialPrice !== null) {
          createPayload.prices = [
            {
              priceType: 'LISTED',
              amount: values.initialPrice,
              vatRate: values.initialVat || 0,
              effectiveDate: dayjs().format('YYYY-MM-DD'),
            }
          ];
        }
        await medicalService.createService(createPayload);
        message.success('Tạo dịch vụ y tế mới thành công');
      }
      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu dịch vụ y tế');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa Dịch vụ y tế' : 'Thêm Dịch vụ y tế mới'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      destroyOnClose
      width={600}
      size="small"
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
        style={{ marginTop: 12 }}
      >
        <Row gutter={12}>
          <Col span={16}>
            <Form.Item
              label="Tên dịch vụ y tế"
              name="name"
              rules={[{ required: true, message: 'Vui lòng nhập tên dịch vụ' }]}
            >
              <Input placeholder="Ví dụ: Khám nội khoa, Siêu âm tim..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Mã dịch vụ"
              name="code"
              rules={[
                { required: true, message: 'Vui lòng điền mã DV' },
                { pattern: /^[A-Z0-9_]+$/, message: 'Chỉ chứa chữ in hoa, số' }
              ]}
            >
              <Input placeholder="Ví dụ: DV_KN_NOI" disabled={isEdit} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Phân loại dịch vụ"
              name="category"
              rules={[{ required: true, message: 'Vui lòng chọn loại' }]}
            >
              <Select>
                <Option value="EXAMINATION">Khám bệnh (EXAMINATION)</Option>
                <Option value="LAB_TEST">Xét nghiệm (LAB_TEST)</Option>
                <Option value="IMAGING">Cận lâm sàng (IMAGING)</Option>
                <Option value="PROCEDURE">Thủ thuật (PROCEDURE)</Option>
                <Option value="SURGERY">Phẫu thuật (SURGERY)</Option>
                <Option value="THERAPY">Trị liệu (THERAPY)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Chuyên khoa liên quan"
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
              label="Thời gian thực hiện (Phút)"
              name="durationMinutes"
              rules={[{ required: true, message: 'Nhập số phút' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Thời gian trả kết quả (Giờ)"
              name="resultDurationHours"
            >
              <InputNumber min={0} placeholder="Bỏ trống nếu có kết quả ngay" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Mô tả / Hướng dẫn thực hiện"
          name="description"
        >
          <TextArea rows={2} placeholder="Yêu cầu chuẩn bị trước khi khám, nhịn ăn xét nghiệm..." />
        </Form.Item>

        {!isEdit && (
          <>
            <Divider style={{ margin: '8px 0 16px 0' }}><span style={{ fontSize: 12, color: '#8c8c8c' }}>Thiết lập giá khởi điểm (Niêm yết)</span></Divider>
            <Row gutter={12}>
              <Col span={16}>
                <Form.Item
                  label="Mức giá niêm yết khởi điểm (VND)"
                  name="initialPrice"
                  rules={[{ required: true, message: 'Vui lòng nhập mức giá khởi điểm' }]}
                >
                  <InputNumber
                    min={0}
                    step={1000}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="Thuế suất VAT (%)"
                  name="initialVat"
                >
                  <InputNumber min={0} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
      </Form>
    </Modal>
  );
}
