import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, message } from 'antd';
import { medicalService } from '../../../services/medicalService';

const { Option } = Select;

export default function MedicationFormModal({ visible, medication, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!medication;

  useEffect(() => {
    if (visible) {
      if (medication) {
        form.setFieldsValue({
          code: medication.code,
          nationalCode: medication.nationalCode || '',
          name: medication.name,
          activeIngredient: medication.activeIngredient,
          concentration: medication.concentration,
          unit: medication.unit,
          usageUnit: medication.usageUnit || '',
          routeOfAdministration: medication.routeOfAdministration,
          maxDosePerDay: medication.maxDosePerDay || '',
          groupName: medication.groupName || '',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          routeOfAdministration: 'ORAL',
          unit: 'Viên',
        });
      }
    }
  }, [visible, medication, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        nationalCode: values.nationalCode || null,
        name: values.name,
        activeIngredient: values.activeIngredient,
        concentration: values.concentration,
        unit: values.unit,
        usageUnit: values.usageUnit || null,
        routeOfAdministration: values.routeOfAdministration,
        maxDosePerDay: values.maxDosePerDay || null,
        groupName: values.groupName || null,
      };

      if (isEdit) {
        await medicalService.updateMedication(medication.id, payload);
        message.success('Cập nhật thông tin thuốc thành công');
      } else {
        const createPayload = {
          ...payload,
          code: values.code,
        };
        await medicalService.createMedication(createPayload);
        message.success('Thêm thuốc mới vào danh mục thành công');
      }
      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin thuốc');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa thông tin thuốc' : 'Thêm thuốc mới vào danh mục'}
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
              label="Tên biệt dược / tên thuốc"
              name="name"
              rules={[{ required: true, message: 'Vui lòng điền tên thuốc' }]}
            >
              <Input placeholder="Ví dụ: Paracetamol 500mg, Amoxicillin 500mg..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Mã thuốc nội bộ"
              name="code"
              rules={[
                { required: true, message: 'Nhập mã thuốc' },
                { pattern: /^[A-Z0-9_]+$/, message: 'Chỉ chứa chữ in hoa, số' }
              ]}
            >
              <Input placeholder="Ví dụ: TH_PARACET_500" disabled={isEdit} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Hoạt chất chính"
              name="activeIngredient"
              rules={[{ required: true, message: 'Vui lòng điền hoạt chất chính' }]}
            >
              <Input placeholder="Ví dụ: Paracetamol, Amoxicillin..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Mã liên thông quốc gia"
              name="nationalCode"
            >
              <Input placeholder="Ví dụ: VD-12345-12" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={6}>
            <Form.Item
              label="Hàm lượng"
              name="concentration"
              rules={[{ required: true, message: 'Nhập hàm lượng' }]}
            >
              <Input placeholder="Ví dụ: 500mg, 20mg..." />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Đơn vị tính"
              name="unit"
              rules={[{ required: true, message: 'Nhập đơn vị' }]}
            >
              <Input placeholder="Viên, Chai, Ống..." />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Đơn vị sử dụng"
              name="usageUnit"
            >
              <Input placeholder="mg, ml, viên..." />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Đường dùng"
              name="routeOfAdministration"
              rules={[{ required: true, message: 'Chọn đường dùng' }]}
            >
              <Select>
                <Option value="ORAL">Uống (ORAL)</Option>
                <Option value="INJECTION">Tiêm (INJECTION)</Option>
                <Option value="TOPICAL">Bôi ngoài da (TOPICAL)</Option>
                <Option value="INHALATION">Hít/Xịt (INHALATION)</Option>
                <Option value="OTHER">Khác (OTHER)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Liều dùng tối đa / ngày"
              name="maxDosePerDay"
            >
              <Input placeholder="Ví dụ: 4000mg/ngày" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Nhóm danh mục thuốc"
              name="groupName"
            >
              <Input placeholder="Ví dụ: Giảm đau - Hạ sốt, Kháng sinh..." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
