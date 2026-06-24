import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Space, Alert, Typography } from 'antd';

const { Text } = Typography;

export default function FormTemplateModal({ visible, onCancel, onSave, record, loading }) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (record) {
        form.setFieldsValue(record);
      } else {
        form.resetFields();
        form.setFieldsValue({
          type: 'PRINT_TEMPLATE',
          isActive: true,
        });
      }
    }
  }, [visible, record, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSave(values);
    } catch (err) {
      console.error('Validation failed:', err);
    }
  };

  return (
    <Modal
      title={record ? 'Chỉnh sửa Mẫu biểu mẫu' : 'Thêm Mẫu biểu mẫu Mới'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={1000}
      style={{ top: 20 }}
      size="small"
    >
      <Form form={form} layout="vertical" size="small">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            name="name"
            label="Tên mẫu biểu mẫu"
            rules={[{ required: true, message: 'Vui lòng nhập tên mẫu' }]}
          >
            <Input placeholder="Ví dụ: Mẫu hóa đơn thanh toán chi phí" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Mã mẫu (Duy nhất)"
            rules={[
              { required: true, message: 'Vui lòng nhập mã mẫu' },
              { pattern: /^[A-Z0-9_]+$/, message: 'Mã mẫu chỉ gồm chữ hoa, số và dấu gạch dưới' },
            ]}
          >
            <Input placeholder="Ví dụ: INVOICE_TEMPLATE" disabled={!!record} />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            name="type"
            label="Loại biểu mẫu"
            rules={[{ required: true, message: 'Vui lòng chọn loại biểu mẫu' }]}
          >
            <Select>
              <Select.Option value="PRINT_TEMPLATE">Mẫu in ra giấy (Print Template)</Select.Option>
              <Select.Option value="CLINICAL_TEMPLATE">Mẫu nhập liệu lâm sàng (Clinical Template)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="category"
            label="Nhóm nghiệp vụ"
            rules={[{ required: true, message: 'Vui lòng chọn nhóm nghiệp vụ' }]}
          >
            <Select>
              <Select.Option value="INVOICE">Hóa đơn & Thanh toán (Invoice)</Select.Option>
              <Select.Option value="PRESCRIPTION">Đơn thuốc (Prescription)</Select.Option>
              <Select.Option value="LAB_RESULT">Xét nghiệm (Lab Result)</Select.Option>
              <Select.Option value="ULTRASOUND_RESULT">Siêu âm (Ultrasound Result)</Select.Option>
            </Select>
          </Form.Item>
        </div>

        <Form.Item name="description" label="Mô tả mẫu">
          <Input placeholder="Mô tả chức năng hoặc mục đích sử dụng mẫu..." />
        </Form.Item>

        <Form.Item
          name="htmlContent"
          label="Nội dung mã nguồn HTML/CSS mẫu in"
          rules={[{ required: true, message: 'Vui lòng nhập nội dung HTML' }]}
        >
          <Input.TextArea
            rows={15}
            placeholder="<html>..."
            style={{ fontFamily: 'Courier New, Courier, monospace', fontSize: '12px' }}
          />
        </Form.Item>
      </Form>

      <Alert
        message={
          <div style={{ fontSize: '11px' }}>
            <span style={{ fontWeight: 'bold' }}>Danh sách các biến có thể sử dụng (Placeholders):</span>
            <div style={{ marginTop: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
              <div><Text code>{"{{organizationName}}"}</Text>: Tên tổ chức</div>
              <div><Text code>{"{{branchName}}"}</Text>: Tên chi nhánh</div>
              <div><Text code>{"{{branchAddress}}"}</Text>: Địa chỉ chi nhánh</div>
              <div><Text code>{"{{branchHotline}}"}</Text>: Hotline chi nhánh</div>
              <div><Text code>{"{{patientName}}"}</Text>: Tên bệnh nhân</div>
              <div><Text code>{"{{patientCode}}"}</Text>: Mã bệnh nhân</div>
              <div><Text code>{"{{patientDob}}"}</Text>: Ngày sinh/Tuổi</div>
              <div><Text code>{"{{patientGender}}"}</Text>: Giới tính</div>
              <div><Text code>{"{{patientPhone}}"}</Text>: Số điện thoại</div>
              <div><Text code>{"{{patientAddress}}"}</Text>: Địa chỉ</div>
              <div><Text code>{"{{dateTime}}"}</Text>: Ngày giờ in ấn</div>
              <div><Text code>{"{{doctorName}}"}</Text>: Bác sĩ chỉ định</div>
              <div><Text code>{"{{diagnosis}}"}</Text>: Chẩn đoán y khoa</div>
              <div><Text code>{"{{invoiceCode}}"}</Text>: Số hóa đơn</div>
              <div><Text code>{"{{totalAmount}}"}</Text>: Tổng tiền chưa giảm</div>
              <div><Text code>{"{{discountAmount}}"}</Text>: Số tiền giảm giá</div>
              <div><Text code>{"{{payableAmount}}"}</Text>: Thực thu</div>
              <div><Text code>{"{{amountInWords}}"}</Text>: Tiền bằng chữ</div>
              <div><Text code>{"{{serviceRows}}"}</Text>: Dòng bảng dịch vụ</div>
              <div><Text code>{"{{medicationRows}}"}</Text>: Dòng bảng thuốc</div>
              <div><Text code>{"{{labResultRows}}"}</Text>: Dòng kết quả xét nghiệm</div>
              <div><Text code>{"{{ultrasoundResult}}"}</Text>: Mô tả kết quả siêu âm</div>
              <div><Text code>{"{{ultrasoundConclusion}}"}</Text>: Kết luận siêu âm</div>
            </div>
          </div>
        }
        type="info"
        showIcon
        style={{ marginTop: '12px' }}
      />
    </Modal>
  );
}
