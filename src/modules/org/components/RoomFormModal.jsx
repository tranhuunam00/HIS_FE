import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, message } from 'antd';
import { roomService } from '../../../services/roomService';

const { Option } = Select;

export default function RoomFormModal({ visible, room, branchId, specialties, services = [], branches, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!room;

  useEffect(() => {
    if (visible) {
      if (room) {
        form.setFieldsValue({
          branchId: room.branchId,
          code: room.code,
          name: room.name,
          type: room.type,
          specialtyId: room.specialtyId || undefined,
          floor: room.floor || '',
          serviceIds: room.serviceIds || [],
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          branchId: branchId,
          type: 'CLINIC',
        });
      }
    }
  }, [visible, room, branchId, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
  
      const payload = {
        name: values.name,
        type: values.type,
        specialtyId: values.specialtyId || null,
        floor: values.floor || null,
        serviceIds: values.serviceIds || [],
      };

      if (isEdit) {
        await roomService.updateRoom(room.id, payload);
        message.success('Cập nhật thông tin phòng thành công');
      } else {
        const createPayload = {
          ...payload,
          branchId: values.branchId,
          code: values.code,
        };
        await roomService.createRoom(createPayload);
        message.success('Thêm phòng mới thành công');
      }
      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu phòng khám');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa phòng khám' : 'Thêm phòng mới'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      destroyOnClose
      width={550}
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
              label="Chi nhánh"
              name="branchId"
              rules={[{ required: true, message: 'Vui lòng chọn chi nhánh' }]}
            >
              <Select placeholder="Chọn chi nhánh" disabled={isEdit}>
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
              label="Phân loại phòng"
              name="type"
              rules={[{ required: true, message: 'Vui lòng chọn loại phòng' }]}
            >
              <Select placeholder="Chọn loại phòng">
                <Option value="CLINIC">Phòng khám (CLINIC)</Option>
                <Option value="TREATMENT">Phòng điều trị (TREATMENT)</Option>
                <Option value="PROCEDURE">Phòng thủ thuật (PROCEDURE)</Option>
                <Option value="LABORATORY">Phòng xét nghiệm (LABORATORY)</Option>
                <Option value="IMAGING">Chẩn đoán hình ảnh (IMAGING)</Option>
                <Option value="RECEPTION">Lễ tân & Điều phối (RECEPTION)</Option>
                <Option value="ACCOUNTING">Kế toán & Thu ngân (ACCOUNTING)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              label="Mã phòng"
              name="code"
              rules={[
                { required: true, message: 'Vui lòng điền mã phòng' },
                { pattern: /^[A-Z0-9_]+$/, message: 'Mã chỉ được chứa ký tự hoa, số, gạch dưới' }
              ]}
            >
              <Input placeholder="Ví dụ: PK101" disabled={isEdit} />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              label="Tên phòng khám / buồng bệnh"
              name="name"
              rules={[{ required: true, message: 'Vui lòng điền tên phòng' }]}
            >
              <Input placeholder="Ví dụ: Phòng khám Nội 101" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Chuyên khoa phụ trách"
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
          <Col span={12}>
            <Form.Item
              label="Vị trí (Tầng)"
              name="floor"
            >
              <Input placeholder="Ví dụ: Tầng 1" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Dịch vụ phòng được thực hiện"
          name="serviceIds"
        >
          <Select
            mode="multiple"
            allowClear
            showSearch
            placeholder="Chọn danh sách dịch vụ phòng này được thực hiện"
            optionFilterProp="children"
          >
            {services.map((service) => (
              <Option key={service.id} value={service.id}>
                {service.name} ({service.code})
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
