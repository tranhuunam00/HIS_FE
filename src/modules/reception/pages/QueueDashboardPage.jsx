import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Tag, Space, Modal, Form, Select, Input, InputNumber, Typography, message, Tooltip } from 'antd';
import { SyncOutlined, ArrowRightOutlined, HeartOutlined, HomeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { visitService } from '../../../services/visitService';
import { roomService } from '../../../services/roomService';
import { staffService } from '../../../services/staffService';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

export default function QueueDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState([]);
  
  // Modals
  const [transferVisible, setTransferVisible] = useState(false);
  const [vitalsVisible, setVitalsVisible] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  
  // Metadata
  const [rooms, setRooms] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [formTransfer] = Form.useForm();
  const [formVitals] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const activeBranchId = localStorage.getItem('activeBranchId');

  useEffect(() => {
    fetchVisits();
    loadMetadata();
    
    // Setup interval for simulated real-time updates (every 10 seconds)
    const interval = setInterval(() => {
      fetchVisits();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const data = await visitService.getVisits({ branchId: activeBranchId, date: today });
      setVisits(data);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải dữ liệu hàng đợi');
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const [roomList, staffList] = await Promise.all([
        roomService.getRooms(activeBranchId),
        staffService.getStaffList({ branchId: activeBranchId, title: 'DOCTOR' }),
      ]);
      setRooms(roomList.filter((r) => r.isActive));
      setDoctors(staffList.filter((s) => s.isActive));
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenTransfer = (visit) => {
    setSelectedVisit(visit);
    formTransfer.resetFields();
    formTransfer.setFieldsValue({
      roomId: visit.currentRoomId || undefined,
      doctorId: visit.currentDoctorId || undefined,
      status: visit.status,
    });
    setTransferVisible(true);
  };

  const handleOpenVitals = (visit) => {
    setSelectedVisit(visit);
    formVitals.resetFields();
    formVitals.setFieldsValue({
      pulse: visit.pulse || undefined,
      bloodPressure: visit.bloodPressure || '',
      temperature: visit.temperature || undefined,
      weight: visit.weight || undefined,
      height: visit.height || undefined,
    });
    setVitalsVisible(true);
  };

  const handleSaveTransfer = async () => {
    try {
      setSaving(true);
      const values = await formTransfer.validateFields();
      await visitService.transferRoom(selectedVisit.id, values);
      message.success('Điều phối phòng khám thành công!');
      setTransferVisible(false);
      fetchVisits();
    } catch (err) {
      console.error(err);
      message.error('Điều phối phòng khám thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVitals = async () => {
    try {
      setSaving(true);
      const values = await formVitals.validateFields();
      await visitService.updateVitals(selectedVisit.id, values);
      message.success('Cập nhật chỉ số sinh hiệu thành công!');
      setVitalsVisible(false);
      fetchVisits();
    } catch (err) {
      console.error(err);
      message.error('Cập nhật sinh hiệu thất bại');
    } finally {
      setSaving(false);
    }
  };

  // Group visits by status
  const waitingVisits = visits.filter((v) => v.status === 'WAITING');
  const inRoomVisits = visits.filter((v) => v.status === 'IN_ROOM');
  const completedVisits = visits.filter((v) => v.status === 'COMPLETED');

  const renderVisitCard = (visit) => {
    return (
      <Card
        key={visit.id}
        size="small"
        style={{ marginBottom: '10px', borderRadius: '6px', borderLeft: '4px solid #059669', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        bodyStyle={{ padding: '10px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Tag color="green" style={{ fontWeight: 'bold', fontSize: '12px' }}>STT {visit.queueNumber}</Tag>
            <span style={{ fontSize: '11px', color: '#8c8c8c', marginLeft: '6px' }}>{visit.visitCode}</span>
          </div>
          {visit.pulse || visit.bloodPressure || visit.temperature ? (
            <Tag color="orange" size="small"><HeartOutlined /> Sinh hiệu</Tag>
          ) : (
            <Tag color="default" size="small">Chưa đo</Tag>
          )}
        </div>

        <div style={{ margin: '8px 0', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', color: '#1f2937' }}>
          {visit.patient?.fullName}
        </div>

        <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.6 }}>
          <div><strong>Lý do:</strong> {visit.reason || 'Khám bệnh'}</div>
          <div><strong>Phòng khám:</strong> {visit.currentRoom?.name || <span style={{ color: '#bfbfbf' }}>Chưa gán</span>}</div>
          <div><strong>Bác sĩ:</strong> {visit.currentDoctor?.fullName || <span style={{ color: '#bfbfbf' }}>Chờ tiếp nhận</span>}</div>
        </div>

        {visit.pulse || visit.bloodPressure ? (
          <div style={{ marginTop: '8px', fontSize: '11px', background: '#f9fafb', padding: '4px 6px', borderRadius: '4px', display: 'flex', gap: '8px', color: '#6b7280' }}>
            {visit.pulse && <span>Mạch: {visit.pulse} bpm</span>}
            {visit.bloodPressure && <span>HA: {visit.bloodPressure} mmHg</span>}
            {visit.temperature && <span>Nhiệt độ: {visit.temperature}°C</span>}
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid #f3f4f6', paddingTop: '8px' }}>
          <Space size="small">
            <Button
              size="small"
              icon={<HeartOutlined />}
              onClick={() => handleOpenVitals(visit)}
              style={{ color: '#ef4444', borderColor: '#fca5a5' }}
            >
              Sinh hiệu
            </Button>
            <Button
              size="small"
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => handleOpenTransfer(visit)}
              style={{ backgroundColor: '#059669', borderColor: '#059669', display: 'inline-flex', alignItems: 'center' }}
            >
              Điều phối
            </Button>
          </Space>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: '16px', background: '#f5f5f5', minHeight: 'calc(100vh - 48px)' }}>
      <div style={{ marginBottom: '16px', maxWidth: 1200, margin: '0 auto 16px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Điều phối & Hàng đợi Khám</Title>
          <Paragraph style={{ margin: 0, color: '#8c8c8c', fontSize: '12px' }}>
            Theo dõi danh sách bệnh nhân chờ khám trực quan theo thời gian thực. Điều phối chuyển phòng khám, gán bác sĩ/điều dưỡng.
          </Paragraph>
        </div>
        <Button
          icon={<SyncOutlined spin={loading} />}
          onClick={fetchVisits}
          size="small"
          style={{ color: '#059669', borderColor: '#059669' }}
        >
          Làm mới
        </Button>
      </div>

      <Row gutter={16} style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Column 1: WAITING */}
        <Col span={8}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Đang chờ khám (Waiting)</span>
                <Tag color="blue">{waitingVisits.length}</Tag>
              </div>
            }
            size="small"
            style={{ background: '#f0fdf4', minHeight: '500px', borderTop: '4px solid #3b82f6' }}
          >
            {waitingVisits.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '40px 0' }}>Không có bệnh nhân chờ khám</div>
            ) : (
              waitingVisits.map(renderVisitCard)
            )}
          </Card>
        </Col>

        {/* Column 2: IN_ROOM */}
        <Col span={8}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Đang trong phòng khám (In Room)</span>
                <Tag color="orange">{inRoomVisits.length}</Tag>
              </div>
            }
            size="small"
            style={{ background: '#fffbeb', minHeight: '500px', borderTop: '4px solid #f59e0b' }}
          >
            {inRoomVisits.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '40px 0' }}>Không có bệnh nhân đang khám</div>
            ) : (
              inRoomVisits.map(renderVisitCard)
            )}
          </Card>
        </Col>

        {/* Column 3: COMPLETED */}
        <Col span={8}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Đã khám xong (Completed)</span>
                <Tag color="green">{completedVisits.length}</Tag>
              </div>
            }
            size="small"
            style={{ background: '#f0fdf4', minHeight: '500px', borderTop: '4px solid #10b981' }}
          >
            {completedVisits.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '40px 0' }}>Chưa có lượt khám hoàn thành</div>
            ) : (
              completedVisits.map(renderVisitCard)
            )}
          </Card>
        </Col>
      </Row>

      {/* Transfer Room Modal */}
      <Modal
        title="Điều phối Phân phòng & Bác sĩ"
        open={transferVisible}
        onCancel={() => setTransferVisible(false)}
        onOk={handleSaveTransfer}
        confirmLoading={saving}
        okText="Xác nhận điều phối"
        cancelText="Đóng"
        size="small"
      >
        {selectedVisit && (
          <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '4px', marginBottom: '16px', fontSize: '12px' }}>
            Bệnh nhân: <strong>{selectedVisit.patient?.fullName?.toUpperCase()}</strong> (Mã LK: {selectedVisit.visitCode})
          </div>
        )}
        <Form form={formTransfer} layout="vertical" size="small">
          <Form.Item
            name="roomId"
            label="Phòng khám / Bộ phận đích"
            rules={[{ required: true, message: 'Vui lòng chọn phòng điều phối đến' }]}
          >
            <Select placeholder="Chọn phòng khám">
              {rooms.map((r) => (
                <Option key={r.id} value={r.id}>{r.name} ({r.type === 'CLINIC' ? 'Phòng khám' : 'Cận lâm sàng'})</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="doctorId"
            label="Bác sĩ điều trị phụ trách"
          >
            <Select placeholder="Bác sĩ nhận bệnh (Không bắt buộc)" allowClear>
              {doctors.map((d) => (
                <Option key={d.id} value={d.id}>{d.fullName} ({d.nickname || 'Không có biệt danh'})</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái hàng đợi phòng khám"
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
          >
            <Select>
              <Option value="WAITING">Chờ khám (Waiting)</Option>
              <Option value="IN_ROOM">Đang trong phòng khám (In Room)</Option>
              <Option value="COMPLETED">Đã khám xong (Completed)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Vital Signs Modal */}
      <Modal
        title="Cập nhật chỉ số sinh hiệu (Vitals)"
        open={vitalsVisible}
        onCancel={() => setVitalsVisible(false)}
        onOk={handleSaveVitals}
        confirmLoading={saving}
        okText="Lưu sinh hiệu"
        cancelText="Đóng"
        size="small"
      >
        {selectedVisit && (
          <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '4px', marginBottom: '16px', fontSize: '12px' }}>
            Bệnh nhân: <strong>{selectedVisit.patient?.fullName?.toUpperCase()}</strong> (Mã LK: {selectedVisit.visitCode})
          </div>
        )}
        <Form form={formVitals} layout="vertical" size="small">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="pulse" label="Mạch (nhịp/phút)">
                <InputNumber style={{ width: '100%' }} placeholder="bpm" min={30} max={250} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bloodPressure" label="Huyết áp (mmHg)">
                <Input placeholder="Ví dụ: 120/80" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="temperature" label="Nhiệt độ (°C)">
                <InputNumber style={{ width: '100%' }} placeholder="°C" min={34} max={43} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="weight" label="Cân nặng (kg)">
                <InputNumber style={{ width: '100%' }} placeholder="kg" min={1} max={300} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="height" label="Chiều cao (cm)">
                <InputNumber style={{ width: '100%' }} placeholder="cm" min={30} max={250} step={0.5} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
