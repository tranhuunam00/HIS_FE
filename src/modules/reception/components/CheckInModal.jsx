import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, Row, Col, Space, Button, message, Divider } from 'antd';
import { visitService } from '../../../services/visitService';
import { roomService } from '../../../services/roomService';
import { staffService } from '../../../services/staffService';
import { PrinterOutlined } from '@ant-design/icons';

const { Option } = Select;

export default function CheckInModal({ visible, onCancel, onSuccess, appointment, patient, branchId }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    if (visible) {
      fetchRoomsAndDoctors();
      
      // Auto populate form
      form.resetFields();
      if (appointment) {
        form.setFieldsValue({
          patientId: appointment.patientId,
          reason: appointment.notes || '',
          currentRoomId: appointment.roomId || undefined,
          currentDoctorId: appointment.doctorId || undefined,
        });
      } else if (patient) {
        form.setFieldsValue({
          patientId: patient.id,
        });
      }
    }
  }, [visible, appointment, patient, form]);

  const fetchRoomsAndDoctors = async () => {
    try {
      if (!branchId) return;
      const [roomList, staffList] = await Promise.all([
        roomService.getRooms(branchId),
        staffService.getStaffList({ branchId, title: 'DOCTOR' }),
      ]);
      // Filter clinic rooms
      setRooms(roomList.filter((r) => r.type === 'CLINIC' && r.isActive));
      setDoctors(staffList.filter((s) => s.isActive));
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách phòng khám & bác sĩ');
    }
  };

  const handlePrintTicket = (visitData, patientName, roomName, doctorName) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.warning('Vui lòng cho phép popup để in phiếu tiếp nhận');
      return;
    }

    const now = new Date();
    const dateTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Phiếu Tiếp Nhận</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Inter', sans-serif;
              text-align: center;
              padding: 20px;
              width: 280px;
              margin: 0 auto;
              color: #1f2937;
            }
            .ticket-container {
              border: 1px dashed #9ca3af;
              padding: 16px;
              border-radius: 8px;
            }
            h3 { margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: #059669; }
            .number { font-size: 56px; font-weight: 700; margin: 12px 0; color: #111827; }
            p { margin: 4px 0; font-size: 12px; }
            .footer { margin-top: 16px; font-size: 10px; color: #6b7280; border-top: 1px dashed #d1d5db; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            <h3>DAO CARE CLINIC</h3>
            <p>Phiếu Đón Tiếp & Phân Phòng</p>
            <div class="number">${visitData.queueNumber}</div>
            <p><strong>Mã lượt khám:</strong> ${visitData.visitCode}</p>
            <p><strong>Bệnh nhân:</strong> <span style="text-transform: uppercase;">${patientName}</span></p>
            <p><strong>Nơi khám:</strong> ${roomName || 'Chờ điều phối'}</p>
            <p><strong>Bác sĩ:</strong> ${doctorName || 'Chờ điều phối'}</p>
            <div class="footer">
              Ngày tiếp nhận: ${dateTimeStr}<br>
              Vui lòng theo dõi số thứ tự trên màn hình
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
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
        currentRoomId: values.currentRoomId,
        currentDoctorId: values.currentDoctorId,
        reason: values.reason,
        pulse: values.pulse,
        bloodPressure: values.bloodPressure,
        temperature: values.temperature,
        weight: values.weight,
        height: values.height,
      };

      const result = await visitService.checkIn(payload);
      message.success('Tiếp nhận bệnh nhân thành công!');

      // Resolve labels for print ticket
      const selectedRoom = rooms.find((r) => r.id === values.currentRoomId);
      const selectedDoc = doctors.find((d) => d.id === values.currentDoctorId);
      const pName = appointment?.patient?.fullName || patient?.fullName || 'Bệnh nhân';

      // Auto print ticket
      handlePrintTicket(result, pName, selectedRoom?.name, selectedDoc?.fullName);

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
      title={`Tiếp nhận & Đo sinh hiệu Bệnh nhân`}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
      okText="Xác nhận tiếp đón"
      cancelText="Hủy bỏ"
      size="small"
    >
      <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '4px', marginBottom: '16px', fontSize: '12px' }}>
        <strong>Thông tin bệnh nhân:</strong> {patientName} ({patientCode}) - SĐT: {patientPhone}
      </div>

      <Form form={form} layout="vertical" size="small">
        <Form.Item name="patientId" hidden><Input /></Form.Item>

        <Form.Item
          name="reason"
          label="Lý do đến khám"
          rules={[{ required: true, message: 'Vui lòng nhập lý do đến khám' }]}
        >
          <Input placeholder="Ví dụ: Đau dạ dày, sốt nhẹ, khám sức khỏe định kỳ..." />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="currentRoomId"
              label="Phòng khám chỉ định"
              rules={[{ required: true, message: 'Vui lòng chọn phòng khám' }]}
            >
              <Select placeholder="Chọn phòng khám">
                {rooms.map((r) => (
                  <Option key={r.id} value={r.id}>{r.name} - {r.floor}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="currentDoctorId"
              label="Bác sĩ khám"
            >
              <Select placeholder="Chọn bác sĩ phụ trách (Không bắt buộc)" allowClear>
                {doctors.map((d) => (
                  <Option key={d.id} value={d.id}>{d.fullName} ({d.nickname || 'Không có biệt danh'})</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '12px 0' }}>Chỉ số Sinh hiệu (Vitals)</Divider>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              name="pulse"
              label="Mạch (bpm)"
            >
              <InputNumber placeholder="Ví dụ: 80" style={{ width: '100%' }} min={30} max={250} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="bloodPressure"
              label="Huyết áp (mmHg)"
            >
              <Input placeholder="Ví dụ: 120/80" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="temperature"
              label="Nhiệt độ (°C)"
            >
              <InputNumber placeholder="Ví dụ: 36.5" style={{ width: '100%' }} min={34} max={43} step={0.1} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="weight"
              label="Cân nặng (kg)"
            >
              <InputNumber placeholder="Ví dụ: 62.5" style={{ width: '100%' }} min={1} max={300} step={0.1} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="height"
              label="Chiều cao (cm)"
            >
              <InputNumber placeholder="Ví dụ: 165" style={{ width: '100%' }} min={30} max={250} step={0.5} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
