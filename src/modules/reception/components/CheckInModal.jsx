import React, { useEffect, useState } from 'react';
import {
  Modal, Form, Input, Select, InputNumber, Row, Col,
  message, Divider, Table, Tag, Typography, Alert, Spin
} from 'antd';
import { MedicineBoxOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { visitService } from '../../../services/visitService';
import { roomService } from '../../../services/roomService';
import { staffService } from '../../../services/staffService';
import { medicalService } from '../../../services/medicalService';
import { scheduleService } from '../../../services/scheduleService';

const { Option } = Select;
const { Text } = Typography;

const getDayOfWeek = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};

const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function CheckInModal({ visible, onCancel, onSuccess, appointment, patient, branchId }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const [specialties, setSpecialties] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);

  useEffect(() => {
    if (visible) {
      loadMasterData();
      form.resetFields();
      setSelectedSpecialtyId(null);
      setSelectedRoomId(null);
      setServices([]);
      setDoctors([]);
      setFilteredRooms([]);
      setSelectedServiceIds([]);
      setSelectedServices([]);

      if (appointment) {
        form.setFieldsValue({
          patientId: appointment.patientId,
          reason: appointment.notes || '',
        });
      } else if (patient) {
        form.setFieldsValue({ patientId: patient.id });
      }
    }
  }, [visible, appointment, patient, form]);

  const loadMasterData = async () => {
    try {
      if (!branchId) return;
      const [specialtyList, roomList] = await Promise.all([
        medicalService.getSpecialties(),
        roomService.getRooms(branchId),
      ]);
      setSpecialties(specialtyList.filter(s => s.isActive !== false));
      const clinicRooms = roomList.filter(r => r.type === 'CLINIC' && r.isActive);
      setAllRooms(clinicRooms);
      setFilteredRooms(clinicRooms);
    } catch (err) {
      console.error(err);
      message.error('Khong the tai danh muc du lieu');
    }
  };

  const handleSpecialtyChange = async (specialtyId) => {
    setSelectedSpecialtyId(specialtyId);
    setSelectedRoomId(null);
    setDoctors([]);
    setServices([]);
    setSelectedServiceIds([]);
    setSelectedServices([]);
    form.setFieldsValue({ currentRoomId: undefined, currentDoctorId: undefined, serviceId: undefined });

    if (!specialtyId) {
      setFilteredRooms(allRooms);
      return;
    }

    // Filter rooms: show rooms that match the specialty OR have no specialty (general rooms)
    const matchingRooms = allRooms.filter(r => !r.specialtyId || r.specialtyId === specialtyId);
    setFilteredRooms(matchingRooms.length > 0 ? matchingRooms : allRooms);

    setLoadingServices(true);
    try {
      const svcList = await medicalService.getServices({ specialtyId, isActive: true });
      setServices(svcList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingServices(false);
    }
  };


  const handleRoomChange = async (roomId) => {
    setSelectedRoomId(roomId);
    setDoctors([]);
    form.setFieldsValue({ currentDoctorId: undefined });

    if (!roomId || !branchId) return;

    setLoadingDoctors(true);
    try {
      const assignedDoctors = await staffService.getDoctorsByRoom(branchId, roomId);

      if (assignedDoctors.length === 0) {
        message.warning('Chua co bac si nao duoc phan cong cho phong nay. Co the them bac si bang phan quan ly nhan su.');
        setDoctors([]);
        setLoadingDoctors(false);
        return;
      }

      const today = getTodayStr();
      const todayDOW = getDayOfWeek();
      const doctorIds = assignedDoctors.map(d => d.id);

      let schedules = [];
      try {
        schedules = await scheduleService.getSchedules({
          staffIds: doctorIds,
          startDate: today,
          endDate: today,
        });
      } catch (err) {
        console.warn('Could not fetch schedules:', err);
        setDoctors(assignedDoctors.map(d => ({ ...d, hasScheduleToday: false, scheduleWarning: true })));
        setLoadingDoctors(false);
        return;
      }

      const scheduledDoctorIds = new Set(
        schedules
          .filter(s => s.dayOfWeek === todayDOW || s.date === today)
          .map(s => s.staffId)
      );

      const enrichedDoctors = assignedDoctors.map(d => ({
        ...d,
        hasScheduleToday: scheduledDoctorIds.has(d.id),
      }));

      enrichedDoctors.sort((a, b) => (b.hasScheduleToday ? 1 : 0) - (a.hasScheduleToday ? 1 : 0));
      setDoctors(enrichedDoctors);
    } catch (err) {
      console.error(err);
      message.error('Khong the tai danh sach bac si cho phong nay');
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handlePrintTicket = (visitData, patientName, roomName, doctorName, specialtyName, servicesList = []) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { message.warning('Vui long cho phep popup de in phieu tiep nhan'); return; }

    const now = new Date();
    const dateTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    const totalAmt = servicesList.reduce((s, svc) => s + Number(svc.prices?.[0]?.amount ?? svc.price ?? 0), 0);
    const servicesHtml = servicesList.length > 0
      ? `<div style="border-top:1px dashed #d1d5db;margin:8px 0;padding-top:6px">
          <p style="font-weight:600;margin-bottom:4px">Dich vu dang ky:</p>
          ${servicesList.map(svc => {
            const price = svc.prices?.[0]?.amount ?? svc.price ?? null;
            return `<p style="display:flex;justify-content:space-between">
              <span>${svc.name}</span>
              <span style="color:#059669;font-weight:600">${price != null ? Number(price).toLocaleString('vi-VN') + 'd' : 'Lien he'}</span>
            </p>`;
          }).join('')}
          ${totalAmt > 0 ? `<p style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid #e5e7eb;margin-top:4px;padding-top:4px"><span>Tong tien:</span><span style="color:#059669">${totalAmt.toLocaleString('vi-VN')}d</span></p>` : ''}
        </div>`
      : '';

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Phieu Tiep Nhan</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body{font-family:'Inter',sans-serif;text-align:center;padding:20px;width:280px;margin:0 auto;color:#1f2937}
        .tc{border:1px dashed #9ca3af;padding:16px;border-radius:8px}
        h3{margin:0 0 4px;font-size:16px;font-weight:700;color:#059669}
        .num{font-size:56px;font-weight:700;margin:12px 0;color:#111827}
        p{margin:4px 0;font-size:12px;text-align:left}
        .ft{margin-top:16px;font-size:10px;color:#6b7280;border-top:1px dashed #d1d5db;padding-top:10px;text-align:center}
      </style></head><body>
      <div class="tc"><h3>DAO CARE CLINIC</h3><p style="text-align:center">Phieu Don Tiep &amp; Phan Phong</p>
        <div class="num">${visitData.queueNumber}</div>
        <p><strong>Ma luot kham:</strong> ${visitData.visitCode}</p>
        <p><strong>Benh nhan:</strong> <span style="text-transform:uppercase">${patientName}</span></p>
        ${specialtyName ? `<p><strong>Chuyen khoa:</strong> ${specialtyName}</p>` : ''}
        <p><strong>Noi kham:</strong> ${roomName || 'Cho dieu phoi'}</p>
        <p><strong>Bac si:</strong> ${doctorName || 'Cho dieu phoi'}</p>
        ${servicesHtml}
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
      message.success('Tiep nhan benh nhan thanh cong!');

      const selectedRoom = allRooms.find(r => r.id === values.currentRoomId);
      const selectedDoc = doctors.find(d => d.id === values.currentDoctorId);
      const selectedSpec = specialties.find(s => s.id === selectedSpecialtyId);
      const pName = appointment?.patient?.fullName || patient?.fullName || 'Benh nhan';

      handlePrintTicket(result, pName, selectedRoom?.name, selectedDoc?.fullName, selectedSpec?.name, selectedServices);
      onSuccess(result);
      onCancel();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Tiep nhan benh nhan that bai');
    } finally {
      setLoading(false);
    }
  };

  const patientName = appointment?.patient?.fullName || patient?.fullName || '';
  const patientCode = appointment?.patient?.patientCode || patient?.patientCode || '';
  const patientPhone = appointment?.patient?.phone || patient?.phone || '';

  const serviceColumns = [
    {
      title: 'Tên dịch vụ',
      dataIndex: 'name',
      key: 'name',
      render: (t, r) => (
        <div>
          <Text strong style={{ fontSize: 12 }}>{t}</Text>
          {r.durationMinutes ? <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>~{r.durationMinutes} phút</Text> : null}
        </div>
      ),
    },
    { title: 'Loại', dataIndex: 'category', key: 'category', width: 80, render: t => <Tag color="blue" style={{ fontSize: 11 }}>{t || 'Khám'}</Tag> },
    {
      title: 'Đơn giá',
      key: 'price',
      width: 110,
      align: 'right',
      render: (_, r) => {
        const price = r.prices?.[0]?.amount ?? r.price ?? null;
        return price != null
          ? <Text type="success" style={{ fontSize: 12, fontWeight: 700 }}>{Number(price).toLocaleString('vi-VN')}đ</Text>
          : <Text type="secondary" style={{ fontSize: 12 }}>Liên hệ</Text>;
      },
    },
  ];

  const serviceRowSelection = {
    selectedRowKeys: selectedServiceIds,
    onChange: (keys, rows) => {
      setSelectedServiceIds(keys);
      setSelectedServices(rows);
    },
    getCheckboxProps: (record) => ({ name: record.name }),
  };

  const totalPrice = selectedServices.reduce((sum, s) => {
    const price = s.prices?.[0]?.amount ?? s.price ?? 0;
    return sum + Number(price);
  }, 0);

  return (
    <Modal
      title={<span style={{ fontSize: 14, fontWeight: 600 }}><MedicineBoxOutlined style={{ color: '#059669', marginRight: 8 }} />Tiep nhan &amp; Do sinh hieu Benh nhan</span>}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={700}
      okText="Xac nhan tiep don & In phieu"
      cancelText="Huy bo"
      okButtonProps={{ style: { backgroundColor: '#059669', borderColor: '#059669' } }}
    >
      <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', border: '1px solid #bbf7d0' }}>
        <UserOutlined style={{ color: '#059669', marginRight: 6 }} />
        <strong>{patientName}</strong>
        {patientCode && <Tag color="green" style={{ marginLeft: 8, fontSize: 11 }}>{patientCode}</Tag>}
        {patientPhone && <span style={{ color: '#6b7280', marginLeft: 8 }}>SDT: {patientPhone}</span>}
      </div>

      <Form form={form} layout="vertical" size="small">
        <Form.Item name="patientId" hidden><Input /></Form.Item>

        <Form.Item name="reason" label="Ly do den kham" rules={[{ required: true, message: 'Vui long nhap ly do den kham' }]}>
          <Input placeholder="Vi du: Dau da day, sot nhe, kham suc khoe dinh ky..." />
        </Form.Item>

        <Divider style={{ margin: '10px 0', fontSize: 13 }}>Chuyen khoa &amp; Phong kham</Divider>

        {/* Step 1: Specialty */}
        <Form.Item
          name="specialtyId"
          label={<span><strong style={{ color: '#059669' }}>Buoc 1:</strong> Chon Chuyen khoa <Text type="secondary" style={{ fontSize: 11 }}>(loc dich vu + gia)</Text></span>}
          rules={[{ required: true, message: 'Vui long chon chuyen khoa' }]}
        >
          <Select placeholder="Chon chuyen khoa kham..." onChange={handleSpecialtyChange} showSearch optionFilterProp="children">
            {specialties.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
          </Select>
        </Form.Item>

        {/* Services table - selectable */}
        {selectedSpecialtyId && (
          <div style={{ marginBottom: 14, padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Dịch vụ &amp; giá theo chuyên khoa <Text type="secondary" style={{ fontWeight: 400 }}>(tích chọn dịch vụ muốn đăng ký)</Text></Text>
              {selectedServiceIds.length > 0 && (
                <Text type="success" style={{ fontSize: 12, fontWeight: 700 }}>
                  Đã chọn {selectedServiceIds.length} dịch vụ · Tổng: {totalPrice.toLocaleString('vi-VN')}đ
                </Text>
              )}
            </div>
            {loadingServices ? (
              <div style={{ textAlign: 'center', padding: '8px 0' }}><Spin size="small" /></div>
            ) : services.length > 0 ? (
              <Table
                dataSource={services}
                columns={serviceColumns}
                rowKey="id"
                size="small"
                pagination={false}
                rowSelection={serviceRowSelection}
                onRow={(record) => ({
                  onClick: () => {
                    const newKeys = selectedServiceIds.includes(record.id)
                      ? selectedServiceIds.filter(k => k !== record.id)
                      : [...selectedServiceIds, record.id];
                    const newRows = services.filter(s => newKeys.includes(s.id));
                    setSelectedServiceIds(newKeys);
                    setSelectedServices(newRows);
                  },
                  style: {
                    cursor: 'pointer',
                    background: selectedServiceIds.includes(record.id) ? '#f0fdf4' : undefined,
                  },
                })}
                style={{ marginTop: 0 }}
                scroll={{ y: 130 }}
              />
            ) : (
              <Alert message="Chưa có dịch vụ nào cho chuyên khoa này" type="info" showIcon style={{ fontSize: 12 }} />
            )}
          </div>
        )}

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="currentRoomId"
              label={<span><strong style={{ color: '#059669' }}>Buoc 2:</strong> Phong kham chi dinh</span>}
              rules={[{ required: true, message: 'Vui long chon phong kham' }]}
            >
              <Select placeholder={!selectedSpecialtyId ? 'Chon chuyen khoa truoc...' : 'Chon phong kham...'} onChange={handleRoomChange} disabled={!selectedSpecialtyId}>
                {filteredRooms.map(r => <Option key={r.id} value={r.id}>{r.name}{r.floor ? ` - ${r.floor}` : ''}</Option>)}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="currentDoctorId"
              label={
                <span>
                  <strong style={{ color: '#059669' }}>Buoc 3:</strong> Bac si kham
                  {selectedRoomId && <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}><ClockCircleOutlined /> loc theo lich hom nay</Text>}
                </span>
              }
            >
              <Select
                placeholder={!selectedRoomId ? 'Chon phong truoc...' : loadingDoctors ? 'Dang tai...' : 'Chon bac si...'}
                allowClear
                loading={loadingDoctors}
                disabled={!selectedRoomId || loadingDoctors}
                optionLabelProp="label"
              >
                {doctors.map(d => (
                  <Option key={d.id} value={d.id} label={d.fullName} disabled={!d.hasScheduleToday && !d.scheduleWarning}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <UserOutlined style={{ marginRight: 4, color: d.hasScheduleToday ? '#059669' : '#9ca3af' }} />
                        {d.fullName}
                        {d.nickname ? <Text type="secondary" style={{ fontSize: 11 }}> ({d.nickname})</Text> : null}
                      </span>
                      {d.scheduleWarning ? (
                        <Tag color="orange" style={{ fontSize: 10, marginLeft: 4 }}>Khong xac minh lich</Tag>
                      ) : d.hasScheduleToday ? (
                        <Tag color="green" style={{ fontSize: 10, marginLeft: 4 }}>Co lich hom nay</Tag>
                      ) : (
                        <Tag color="default" style={{ fontSize: 10, marginLeft: 4 }}>Khong co lich</Tag>
                      )}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {selectedRoomId && !loadingDoctors && doctors.length > 0 && !doctors.some(d => d.hasScheduleToday) && !doctors[0]?.scheduleWarning && (
          <Alert
            message="Khong co bac si nao cua phong nay co lich lam viec hom nay. Ban van co the tiep nhan va dieu phoi sau."
            type="warning" showIcon style={{ marginBottom: 12, fontSize: 12 }}
          />
        )}

        <Divider style={{ margin: '10px 0', fontSize: 13 }}>Chi so Sinh hieu (Vitals)</Divider>

        <Row gutter={12}>
          <Col span={8}><Form.Item name="pulse" label="Mach (bpm)"><InputNumber placeholder="80" style={{ width: '100%' }} min={30} max={250} /></Form.Item></Col>
          <Col span={8}><Form.Item name="bloodPressure" label="Huyet ap (mmHg)"><Input placeholder="120/80" /></Form.Item></Col>
          <Col span={8}><Form.Item name="temperature" label="Nhiet do (C)"><InputNumber placeholder="36.5" style={{ width: '100%' }} min={34} max={43} step={0.1} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="weight" label="Can nang (kg)"><InputNumber placeholder="62.5" style={{ width: '100%' }} min={1} max={300} step={0.1} /></Form.Item></Col>
          <Col span={12}><Form.Item name="height" label="Chieu cao (cm)"><InputNumber placeholder="165" style={{ width: '100%' }} min={30} max={250} step={0.5} /></Form.Item></Col>
        </Row>
      </Form>
    </Modal>
  );
}
