import React, { useEffect, useState } from 'react';
import {
  Modal, Form, Input, Select, InputNumber, Row, Col,
  message, Divider, Tag, Typography
} from 'antd';
import { MedicineBoxOutlined, UserOutlined } from '@ant-design/icons';
import { visitService } from '../../../services/visitService';

const { Option } = Select;

export default function CheckInModal({ visible, onCancel, onSuccess, appointment, patient, branchId }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      if (appointment) {
        form.setFieldsValue({
          patientId: appointment.patientId,
          reason: appointment.notes || '',
          priorityLevel: 'PRIORITY',
        });
      } else if (patient) {
        form.setFieldsValue({
          patientId: patient.id,
          priorityLevel: 'REGULAR',
        });
      }
    }
  }, [visible, appointment, patient, form]);

  const handlePrintTicket = (visitData, patientName) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.warning('Vui lòng cho phép popup để in phiếu tiếp nhận');
      return;
    }

    const now = new Date();
    const dateTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    const priorityLabel = visitData.priorityLevel === 'EMERGENCY' ? 'CẤP CỨU' : visitData.priorityLevel === 'PRIORITY' ? 'ƯU TIÊN' : 'THUỜNG';
    const numColor = visitData.priorityLevel === 'EMERGENCY' ? '#ef4444' : visitData.priorityLevel === 'PRIORITY' ? '#f59e0b' : '#10b981';

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Phieu Tiep Nhan</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body{font-family:'Inter',sans-serif;text-align:center;padding:20px;width:280px;margin:0 auto;color:#1f2937}
        .tc{border:1px dashed #9ca3af;padding:16px;border-radius:8px}
        h3{margin:0 0 4px;font-size:16px;font-weight:700;color:#059669}
        .num{font-size:56px;font-weight:700;margin:12px 0;color:${numColor}}
        .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:#fff;background-color:${numColor};margin-bottom:10px}
        p{margin:4px 0;font-size:12px;text-align:left}
        .ft{margin-top:16px;font-size:10px;color:#6b7280;border-top:1px dashed #d1d5db;padding-top:10px;text-align:center}
      </style></head><body>
      <div class="tc"><h3>DAO CARE CLINIC</h3><p style="text-align:center;margin-bottom:6px">Phieu Don Tiep &amp; Cap So</p>
        <span class="badge">${priorityLabel}</span>
        <div class="num">${visitData.queueCode || visitData.queueNumber}</div>
        <p><strong>Ma luot kham:</strong> ${visitData.visitCode}</p>
        <p><strong>Benh nhan:</strong> <span style="text-transform:uppercase">${patientName}</span></p>
        <p><strong>Huong dan:</strong> Den quay Dieu phoi/Phong sinh hieu de duoc huong dan phong kham.</p>
        <div class="ft">Ngay tiep nhan: ${dateTimeStr}<br>Vui long theo doi so thu tu tren man hinh</div>
      </div>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close()},300)}</script>
      </body></html>`);
    printWindow.document.close();
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const payload = {
        branchId,
        patientId: values.patientId,
        appointmentId: appointment?.id || undefined,
        reason: values.reason,
        priorityLevel: values.priorityLevel,
        pulse: values.pulse,
        bloodPressure: values.bloodPressure,
        temperature: values.temperature,
        weight: values.weight,
        height: values.height,
      };

      const result = await visitService.checkIn(payload);
      message.success('Tiếp nhận bệnh nhân thành công!');

      const pName = appointment?.patient?.fullName || patient?.fullName || 'Bệnh nhân';

      handlePrintTicket(result, pName);
      onSuccess(result);
      onCancel();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Tiếp nhận bệnh nhân thất bại');
    } finally {
      setLoading(false);
    }
  };

  const patientName = appointment?.patient?.fullName || patient?.fullName || '';
  const patientCode = appointment?.patient?.patientCode || patient?.patientCode || '';
  const patientPhone = appointment?.patient?.phone || patient?.phone || '';

  return (
    <Modal
      title={<span style={{ fontSize: 14, fontWeight: 600 }}><MedicineBoxOutlined style={{ color: '#059669', marginRight: 8 }} />Tiếp nhận &amp; Cấp số thứ tự hàng chờ</span>}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={500}
      okText="Xác nhận tiếp đón & In số"
      cancelText="Hủy bỏ"
      okButtonProps={{ style: { backgroundColor: '#059669', borderColor: '#059669' } }}
    >
      <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', border: '1px solid #bbf7d0' }}>
        <UserOutlined style={{ color: '#059669', marginRight: 6 }} />
        <strong>{patientName}</strong>
        {patientCode && <Tag color="green" style={{ marginLeft: 8, fontSize: 11 }}>{patientCode}</Tag>}
        {patientPhone && <span style={{ color: '#6b7280', marginLeft: 8 }}>SĐT: {patientPhone}</span>}
      </div>

      <Form form={form} layout="vertical" size="small">
        <Form.Item name="patientId" hidden><Input /></Form.Item>

        <Form.Item name="reason" label="Lý do đến khám" rules={[{ required: true, message: 'Vui lòng nhập lý do đến khám' }]}>
          <Input placeholder="Ví dụ: Đau dạ dày, sốt nhẹ, khám sức khỏe định kỳ..." />
        </Form.Item>

        <Form.Item
          name="priorityLevel"
          label={<span><strong>Cấp độ Tiếp nhận (Ưu tiên hàng đợi)</strong></span>}
          rules={[{ required: true, message: 'Vui lòng chọn cấp độ tiếp nhận' }]}
        >
          <Select placeholder="Chọn cấp độ ưu tiên...">
            <Option value="EMERGENCY">
              <span style={{ color: '#ef4444', fontWeight: 600 }}>🔴 Cấp cứu (Emergency) - Highlight Đỏ</span>
            </Option>
            <Option value="PRIORITY">
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>🟠 Ưu tiên (Priority) - Highlight Cam</span>
            </Option>
            <Option value="REGULAR">
              <span style={{ color: '#10b981', fontWeight: 600 }}>🟢 Thường (Regular) - Highlight Xanh lá</span>
            </Option>
          </Select>
        </Form.Item>

        <Divider style={{ margin: '10px 0', fontSize: 13 }}>Chỉ số Sinh hiệu ban đầu (Không bắt buộc)</Divider>

        <Row gutter={12}>
          <Col span={8}><Form.Item name="pulse" label="Mạch (bpm)"><InputNumber placeholder="80" style={{ width: '100%' }} min={30} max={250} /></Form.Item></Col>
          <Col span={8}><Form.Item name="bloodPressure" label="Huyết áp (mmHg)"><Input placeholder="120/80" /></Form.Item></Col>
          <Col span={8}><Form.Item name="temperature" label="Nhiệt độ (°C)"><InputNumber placeholder="36.5" style={{ width: '100%' }} min={34} max={43} step={0.1} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="weight" label="Cân nặng (kg)"><InputNumber placeholder="62.5" style={{ width: '100%' }} min={1} max={300} step={0.1} /></Form.Item></Col>
          <Col span={12}><Form.Item name="height" label="Chiều cao (cm)"><InputNumber placeholder="165" style={{ width: '100%' }} min={30} max={250} step={0.5} /></Form.Item></Col>
        </Row>
      </Form>
    </Modal>
  );
}
