import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Tag, Space, Modal, Form, Select, Input, InputNumber, Typography, message, Tooltip, Progress } from 'antd';
import { SyncOutlined, ArrowRightOutlined, HeartOutlined, HomeOutlined, CheckCircleOutlined, DollarOutlined, ExperimentOutlined, FileTextOutlined } from '@ant-design/icons';
import { visitService } from '../../../services/visitService';
import { roomService } from '../../../services/roomService';
import { staffService } from '../../../services/staffService';
import { billingService } from '../../../services/billingService';

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
      const visitList = await visitService.getVisits({ branchId: activeBranchId, date: today });
      
      // Try fetching orders to enrich clinical states
      let orderList = [];
      try {
        orderList = await billingService.getOrders();
      } catch (err) {
        console.warn('Could not load orders for queue dashboard:', err);
      }

      const enrichedVisits = visitList.map(v => {
        const order = orderList.find(o => o.visitId === v.id);
        return { ...v, order };
      });

      setVisits(enrichedVisits);
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

  // Detailed stage resolution
  const getDetailedStatus = (visit) => {
    if (visit.status === 'COMPLETED') {
      return {
        label: 'Khám xong ra về',
        color: 'green',
        stage: 'COMPLETED',
        description: 'Lượt khám hoàn thành, bệnh nhân ra về'
      };
    }
    
    if (visit.status === 'CANCELLED') {
      return {
        label: 'Đã hủy',
        color: 'red',
        stage: 'CANCELLED',
        description: 'Lượt khám bị hủy'
      };
    }

    // 1. Check vitals completion
    const hasVitals = visit.pulse || visit.bloodPressure || visit.temperature;
    if (!hasVitals) {
      return {
        label: 'Chờ đo sinh hiệu',
        color: 'blue',
        stage: 'VITALS',
        description: 'Mới đón tiếp, chờ nhân viên đo mạch, HA, nhiệt độ'
      };
    }

    // 2. Check clinical order
    const order = visit.order;
    if (!order || !order.items || order.items.length === 0) {
      // Waiting or being examined
      if (visit.status === 'IN_ROOM') {
        return {
          label: 'Đang khám',
          color: 'purple',
          stage: 'EXAM',
          description: `Đang khám cùng BS tại ${visit.currentRoom?.name || 'Phòng khám'}`
        };
      }
      return {
        label: 'Chờ khám',
        color: 'cyan',
        stage: 'EXAM',
        description: `Đang chờ khám tại ${visit.currentRoom?.name || 'Phòng khám'}`
      };
    }

    // 3. Has service items ordered
    const isPendingPayment = order.status === 'PENDING';
    if (isPendingPayment) {
      return {
        label: 'Chờ thanh toán',
        color: 'orange',
        stage: 'SERVICES',
        description: `Chờ thanh toán dịch vụ chỉ định: ${Number(order.totalAmount).toLocaleString('vi-VN')}đ`
      };
    }

    // 4. Paid, checking service execution status
    const items = order.items || [];
    const totalCount = items.length;
    const completedCount = items.filter(i => i.status === 'COMPLETED').length;
    const cancelledCount = items.filter(i => i.status === 'CANCELLED').length;

    if (completedCount + cancelledCount < totalCount) {
      return {
        label: `Thực hiện CLS (${completedCount}/${totalCount})`,
        color: 'geekblue',
        stage: 'SERVICES',
        description: `Đang làm xét nghiệm/siêu âm tại các phòng chuyên môn`
      };
    }

    // 5. All tests completed. Returning to doctor room for review
    if (visit.status === 'IN_ROOM') {
      return {
        label: 'Đang đọc kết quả',
        color: 'magenta',
        stage: 'CONCLUSION',
        description: 'Bác sĩ đang tư vấn kết quả & chốt đơn thuốc'
      };
    }
    return {
      label: 'Chờ BS kết luận',
      color: 'gold',
      stage: 'CONCLUSION',
      description: `Quay lại ${visit.currentRoom?.name || 'Phòng khám'} chờ BS chốt kết quả`
    };
  };

  // Group visits into 4 workflow columns
  const vitalsVisits = visits.filter(v => getDetailedStatus(v).stage === 'VITALS');
  const examVisits = visits.filter(v => getDetailedStatus(v).stage === 'EXAM');
  const serviceVisits = visits.filter(v => getDetailedStatus(v).stage === 'SERVICES');
  const conclusionVisits = visits.filter(v => ['CONCLUSION', 'COMPLETED'].includes(getDetailedStatus(v).stage));

  const renderVisitCard = (visit) => {
    const detailed = getDetailedStatus(visit);
    const orderItems = visit.order?.items || [];
    const totalCount = orderItems.length;
    const completedCount = orderItems.filter(i => i.status === 'COMPLETED').length;

    return (
      <Card
        key={visit.id}
        size="small"
        style={{
          marginBottom: '10px',
          borderRadius: '6px',
          borderLeft: `4px solid ${
            detailed.color === 'blue' ? '#3b82f6' :
            detailed.color === 'green' ? '#10b981' :
            detailed.color === 'orange' ? '#f59e0b' :
            detailed.color === 'purple' ? '#8b5cf6' :
            detailed.color === 'cyan' ? '#06b6d4' :
            detailed.color === 'geekblue' ? '#2f54eb' :
            detailed.color === 'magenta' ? '#eb2f96' :
            detailed.color === 'gold' ? '#d97706' : '#9ca3af'
          }`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          background: '#fff'
        }}
        bodyStyle={{ padding: '10px' }}
      >
        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Tag color={detailed.color} style={{ fontWeight: 'bold', fontSize: '11px', margin: 0 }}>
              {detailed.label}
            </Tag>
          </div>
          <span style={{ fontSize: '10px', color: '#8c8c8c' }}>{visit.visitCode}</span>
        </div>

        <div style={{ margin: '6px 0', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', color: '#1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{visit.patient?.fullName}</span>
          <Tag color="cyan" style={{ fontSize: '10px', fontWeight: 'bold', margin: 0 }}>STT {visit.queueNumber}</Tag>
        </div>

        <div style={{ fontSize: '11px', color: '#4b5563', lineHeight: 1.5 }}>
          <div><strong>Lý do:</strong> {visit.reason || 'Khám bệnh'}</div>
          <div>
            <strong>Nơi đang ở:</strong> {visit.currentRoom?.name || <span style={{ color: '#bfbfbf' }}>Chưa gán</span>}
            {visit.currentDoctor?.fullName && <span style={{ color: '#8c8c8c' }}> (BS. {visit.currentDoctor.fullName})</span>}
          </div>
        </div>

        {/* Dynamic Service details list */}
        {totalCount > 0 && (
          <div style={{ marginTop: '6px', padding: '5px 8px', background: '#fafafa', borderRadius: '4px', border: '1px solid #f0f0f0', fontSize: '10px' }}>
            <div style={{ fontWeight: 600, color: '#595959', borderBottom: '1px dashed #e8e8e8', paddingBottom: '2px', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Dịch vụ chỉ định:</span>
              <span style={{ color: '#2f54eb' }}>{completedCount}/{totalCount} Đã xong</span>
            </div>
            {orderItems.map((item, idx) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#8c8c8c', marginTop: '1px' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                  {idx + 1}. {item.service?.name}
                </span>
                <span style={{ fontWeight: '500', color: item.status === 'COMPLETED' ? '#52c41a' : item.status === 'CANCELLED' ? '#ff4d4f' : '#fa8c16' }}>
                  {item.status === 'COMPLETED' ? 'Hoàn thành' : item.status === 'CANCELLED' ? 'Đã hủy' : 'Chờ làm'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Vital Signs summary data */}
        {visit.pulse || visit.bloodPressure ? (
          <div style={{ marginTop: '6px', fontSize: '10px', background: '#f9fafb', padding: '3px 5px', borderRadius: '4px', display: 'flex', gap: '8px', color: '#6b7280' }}>
            {visit.pulse && <span>Mạch: {visit.pulse} bpm</span>}
            {visit.bloodPressure && <span>HA: {visit.bloodPressure}</span>}
            {visit.temperature && <span>Nhiệt độ: {visit.temperature}°C</span>}
          </div>
        ) : null}

        <div style={{ marginTop: '6px', fontSize: '10px', color: '#8c8c8c', fontStyle: 'italic' }}>
          ℹ️ {detailed.description}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid #f3f4f6', paddingTop: '6px' }}>
          <Space size="small">
            <Button
              size="small"
              icon={<HeartOutlined />}
              onClick={() => handleOpenVitals(visit)}
              style={{ color: '#ef4444', borderColor: '#fca5a5', fontSize: '11px', height: '24px', padding: '0 6px' }}
            >
              Sinh hiệu
            </Button>
            <Button
              size="small"
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => handleOpenTransfer(visit)}
              style={{ backgroundColor: '#059669', borderColor: '#059669', display: 'inline-flex', alignItems: 'center', fontSize: '11px', height: '24px', padding: '0 6px' }}
            >
              Điều phối
            </Button>
          </Space>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: '16px', background: '#f0f2f5', minHeight: 'calc(100vh - 48px)' }}>
      <div style={{ marginBottom: '16px', maxWidth: 1400, margin: '0 auto 16px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Điều phối &amp; Hàng đợi Khám</Title>
          <Paragraph style={{ margin: 0, color: '#8c8c8c', fontSize: '12px' }}>
            Bản đồ theo dõi trạng thái bệnh nhân trong cơ sở y tế theo thời gian thực (sinh hiệu, phòng khám, chỉ định cận lâm sàng, thanh toán).
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

      <Row gutter={12} style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Column 1: Clinical Consultation */}
        <Col span={6}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><HomeOutlined style={{ marginRight: 6, color: '#06b6d4' }} />Khám lâm sàng</span>
                <Tag color="cyan">{examVisits.length}</Tag>
              </div>
            }
            size="small"
            style={{ background: '#e6f7ff', minHeight: '520px', borderTop: '4px solid #06b6d4' }}
          >
            {examVisits.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '40px 0', fontSize: '12px' }}>Không có bệnh nhân đang chờ/khám</div>
            ) : (
              examVisits.map(renderVisitCard)
            )}
          </Card>
        </Col>

        {/* Column 3: Billing & Lab Services */}
        <Col span={6}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><ExperimentOutlined style={{ marginRight: 6, color: '#f59e0b' }} />Thanh toán &amp; CLS</span>
                <Tag color="warning">{serviceVisits.length}</Tag>
              </div>
            }
            size="small"
            style={{ background: '#fffbe6', minHeight: '520px', borderTop: '4px solid #f59e0b' }}
          >
            {serviceVisits.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '40px 0', fontSize: '12px' }}>Không có bệnh nhân làm dịch vụ</div>
            ) : (
              serviceVisits.map(renderVisitCard)
            )}
          </Card>
        </Col>

        {/* Column 4: Review & Completed */}
        <Col span={6}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><FileTextOutlined style={{ marginRight: 6, color: '#10b981' }} />Kết quả &amp; Hoàn thành</span>
                <Tag color="success">{conclusionVisits.length}</Tag>
              </div>
            }
            size="small"
            style={{ background: '#f6ffed', minHeight: '520px', borderTop: '4px solid #10b981' }}
          >
            {conclusionVisits.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '40px 0', fontSize: '12px' }}>Không có lượt khám hoàn thành/kết luận</div>
            ) : (
              conclusionVisits.map(renderVisitCard)
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
