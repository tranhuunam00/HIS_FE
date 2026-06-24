import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Tag, Space, Modal, Form, Select, Input, InputNumber, Typography, message, Tooltip, Progress, Badge, Divider } from 'antd';
import { SyncOutlined, ArrowRightOutlined, HeartOutlined, HomeOutlined, CheckCircleOutlined, DollarOutlined, ExperimentOutlined, FileTextOutlined, WarningOutlined, CompassOutlined } from '@ant-design/icons';
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
  }, [activeBranchId]);

  const fetchVisits = async () => {
    if (!activeBranchId) return;
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const visitList = await visitService.getVisits({ branchId: activeBranchId, date: today });
      
      // Fetch orders to enrich clinical states and calculate service progress
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
    if (!activeBranchId) return;
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
      status: visit.status === 'ADMITTED' ? 'WAITING' : (visit.status === 'WAITING' ? 'WAITING' : visit.status),
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
      
      // Determine backend status to send based on room type
      const targetRoom = rooms.find(r => r.id === values.roomId);
      let status = values.status;
      
      // If moving to a CLINIC and status was WAITING, set status to WAITING_CLINICAL_EXAM
      if (targetRoom && targetRoom.type === 'CLINIC') {
        if (values.status === 'WAITING') {
          status = 'WAITING_CLINICAL_EXAM';
        }
      } else if (targetRoom && targetRoom.type !== 'CLINIC') {
        // If moving to CLS room, typically WAITING_SERVICE is set
        if (values.status === 'WAITING') {
          status = 'WAITING_SERVICE';
        }
      }

      await visitService.transferRoom(selectedVisit.id, {
        roomId: values.roomId,
        doctorId: values.doctorId,
        status: status
      });

      message.success('Điều phối phòng khám thành công!');
      setTransferVisible(false);
      fetchVisits();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Điều phối thất bại. Vui lòng kiểm tra lịch trực/điểm danh của bác sĩ phòng khám.');
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

  const handleConfirmResultsWait = async (visitId) => {
    try {
      setLoading(true);
      await visitService.confirmResultsWait(visitId);
      message.success('Xác nhận bệnh nhân chờ kết quả thành công!');
      fetchVisits();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể xác nhận trạng thái chờ kết quả');
    } finally {
      setLoading(false);
    }
  };

  // Detailed stage resolution mapping to 5 columns
  const getDetailedStatus = (visit) => {
    // 1. Column ADMITTED: status ADMITTED or WAITING and no vitals
    if (visit.status === 'ADMITTED' || (visit.status === 'WAITING' && !visit.pulse && !visit.bloodPressure)) {
      return {
        label: 'Đã Tiếp Nhận',
        color: 'blue',
        stage: 'ADMITTED',
        description: 'Chờ đo sinh hiệu & khai thác lý do'
      };
    }

    // 2. Column CLINICAL: waiting, in exam or clinical exam done
    if (['WAITING_CLINICAL_EXAM', 'IN_CLINICAL_EXAM', 'CLINICAL_EXAM_DONE'].includes(visit.status)) {
      let label = 'Chờ Khám LS';
      let color = 'cyan';
      if (visit.status === 'IN_CLINICAL_EXAM') {
        label = 'Đang Khám LS';
        color = 'purple';
      } else if (visit.status === 'CLINICAL_EXAM_DONE') {
        label = 'Đã Khám LS';
        color = 'geekblue';
      }
      return {
        label,
        color,
        stage: 'CLINICAL',
        description: visit.status === 'IN_CLINICAL_EXAM' ? 'Đang khám cùng bác sĩ' : 'Chờ vào khám / Đã khám xong LS'
      };
    }

    // Fallback for old WAITING/IN_ROOM status if they appear
    if (visit.status === 'WAITING') {
      return {
        label: 'Chờ Khám LS',
        color: 'cyan',
        stage: 'CLINICAL',
        description: 'Chờ vào khám phòng lâm sàng'
      };
    }
    if (visit.status === 'IN_ROOM') {
      return {
        label: 'Đang Khám LS',
        color: 'purple',
        stage: 'CLINICAL',
        description: 'Đang khám cùng bác sĩ'
      };
    }

    // 3. Column PAYMENT: pending payment status
    if (visit.status === 'PENDING_PAYMENT') {
      return {
        label: 'Chờ Thanh Toán',
        color: 'orange',
        stage: 'PAYMENT',
        description: `Chờ đóng tiền dịch vụ: ${Number(visit.order?.totalAmount || 0).toLocaleString('vi-VN')}đ`
      };
    }

    // 4. Column SERVICES: waiting, in service, or service done (some tests done, but not all)
    if (['WAITING_SERVICE', 'IN_SERVICE', 'SERVICE_DONE'].includes(visit.status)) {
      let label = 'Chờ Làm CLS';
      let color = 'gold';
      if (visit.status === 'IN_SERVICE') {
        label = 'Đang Làm CLS';
        color = 'magenta';
      } else if (visit.status === 'SERVICE_DONE') {
        label = 'Xong CLS Cục Bộ';
        color = 'cyan';
      }
      return {
        label,
        color,
        stage: 'SERVICES',
        description: 'Đang thực hiện xét nghiệm/siêu âm/chụp chiếu...'
      };
    }

    // 5. Column CONCLUSION: all services done, waiting results, waiting conclusion, in conclusion, completed, cancelled
    if (['ALL_SERVICES_DONE', 'WAITING_RESULTS', 'WAITING_CONCLUSION', 'IN_CONCLUSION', 'COMPLETED', 'CANCELLED'].includes(visit.status)) {
      let label = 'Chờ Kết Quả';
      let color = 'blue';
      if (visit.status === 'ALL_SERVICES_DONE') {
        label = 'Hoàn Thành CLS';
        color = 'green';
      } else if (visit.status === 'WAITING_CONCLUSION') {
        label = 'Chờ Kết Luận';
        color = 'orange';
      } else if (visit.status === 'IN_CONCLUSION') {
        label = 'Đang Đọc Kết Luận';
        color = 'purple';
      } else if (visit.status === 'COMPLETED') {
        label = 'Hoàn Thành';
        color = 'success';
      } else if (visit.status === 'CANCELLED') {
        label = 'Đã Hủy';
        color = 'red';
      }
      return {
        label,
        color,
        stage: 'CONCLUSION',
        description: visit.status === 'COMPLETED' ? 'Lượt khám hoàn thành' : 'Đang xử lý kết luận và trả hồ sơ'
      };
    }

    // Generic fallback
    return {
      label: visit.status,
      color: 'default',
      stage: 'CLINICAL',
      description: 'Lượt khám đang hoạt động'
    };
  };

  // Group visits into 5 Kanban columns
  const admittedVisits = visits.filter(v => getDetailedStatus(v).stage === 'ADMITTED');
  const clinicalVisits = visits.filter(v => getDetailedStatus(v).stage === 'CLINICAL');
  const paymentVisits = visits.filter(v => getDetailedStatus(v).stage === 'PAYMENT');
  const serviceVisits = visits.filter(v => getDetailedStatus(v).stage === 'SERVICES');
  const conclusionVisits = visits.filter(v => getDetailedStatus(v).stage === 'CONCLUSION');

  const renderVisitCard = (visit) => {
    const detailed = getDetailedStatus(visit);
    const orderItems = visit.order?.items || [];
    const totalCount = orderItems.length;
    const completedCount = orderItems.filter(i => i.status === 'COMPLETED').length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
      <Card
        key={visit.id}
        size="small"
        style={{
          marginBottom: '12px',
          borderRadius: '10px',
          borderLeft: `4px solid ${
            detailed.color === 'blue' ? '#3b82f6' :
            detailed.color === 'green' ? '#10b981' :
            detailed.color === 'success' ? '#10b981' :
            detailed.color === 'orange' ? '#f59e0b' :
            detailed.color === 'purple' ? '#8b5cf6' :
            detailed.color === 'cyan' ? '#06b6d4' :
            detailed.color === 'geekblue' ? '#2f54eb' :
            detailed.color === 'magenta' ? '#eb2f96' :
            detailed.color === 'gold' ? '#d97706' : '#9ca3af'
          }`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          background: '#fff',
          border: '1px solid #f0f0f0',
        }}
        styles={{ body: { padding: '12px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Tag color={detailed.color} style={{ fontWeight: 'bold', fontSize: '10px', borderRadius: 4, margin: 0 }}>
            {detailed.label}
          </Tag>
          <span style={{ fontSize: '11px', fontWeight: '500', color: '#8c8c8c' }}>{visit.visitCode}</span>
        </div>

        <div style={{ margin: '8px 0 4px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ fontSize: '14px', color: '#1f2937' }}>
            {visit.patient?.fullName}
          </Text>
          <Badge count={`STT ${visit.queueNumber}`} style={{ backgroundColor: '#e6f7ff', color: '#1890ff', fontWeight: 'bold', fontSize: '11px' }} />
        </div>

        <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.6, marginBottom: 8 }}>
          <div><Text type="secondary">Lý do:</Text> {visit.reason || 'Khám bệnh'}</div>
          <div>
            <Text type="secondary">Phòng:</Text> {visit.currentRoom?.name || <span style={{ color: '#bfbfbf' }}>Chưa điều phối</span>}
            {visit.currentDoctor?.fullName && <span style={{ color: '#8c8c8c' }}> (BS. {visit.currentDoctor.fullName})</span>}
          </div>
        </div>

        {/* Progress Bar for Services */}
        {totalCount > 0 && (
          <div style={{ margin: '10px 0', padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #edf2f7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: 4, fontWeight: 500 }}>
              <span style={{ color: '#64748b' }}>Tiến độ cận lâm sàng:</span>
              <span style={{ color: '#2f54eb' }}>{completedCount}/{totalCount} dịch vụ</span>
            </div>
            <Progress percent={progressPercent} size="small" strokeColor="#52c41a" status={progressPercent === 100 ? "success" : "active"} />
          </div>
        )}

        {/* Vital Signs summary data */}
        {(visit.pulse || visit.bloodPressure) ? (
          <div style={{ marginTop: '8px', fontSize: '11px', background: '#f0fdf4', padding: '6px 8px', borderRadius: '6px', border: '1px solid #dcfce7', display: 'flex', flexWrap: 'wrap', gap: '10px', color: '#166534' }}>
            {visit.pulse && <span>Mạch: <strong>{visit.pulse} bpm</strong></span>}
            {visit.bloodPressure && <span>HA: <strong>{visit.bloodPressure}</strong></span>}
            {visit.temperature && <span>Nhiệt độ: <strong>{visit.temperature}°C</strong></span>}
          </div>
        ) : null}

        <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
          <CompassOutlined /> {detailed.description}
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Action Buttons based on status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {visit.status === 'ALL_SERVICES_DONE' && (
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleConfirmResultsWait(visit.id)}
                style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontSize: '11px', borderRadius: 4 }}
              >
                Xác nhận chờ kết quả
              </Button>
            )}
          </div>
          <Space size="small">
            <Button
              size="small"
              icon={<HeartOutlined />}
              onClick={() => handleOpenVitals(visit)}
              style={{ color: '#ef4444', borderColor: '#fca5a5', fontSize: '11px', borderRadius: 4 }}
            >
              Sinh hiệu
            </Button>
            <Button
              size="small"
              type="dashed"
              icon={<ArrowRightOutlined />}
              onClick={() => handleOpenTransfer(visit)}
              style={{ color: '#059669', borderColor: '#a7f3d0', fontSize: '11px', borderRadius: 4 }}
            >
              Điều phối
            </Button>
          </Space>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: 'calc(100vh - 48px)' }}>
      {/* Page Header */}
      <div style={{ maxWidth: 1600, margin: '0 auto 24px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 'bold' }}>
            <CompassOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            Bảng điều phối hàng đợi khám bệnh (Queue Dashboard)
          </Title>
          <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
            Bảng Kanban 5 cột thời gian thực phân luồng di chuyển của bệnh nhân: Đón tiếp &rarr; Khám lâm sàng &rarr; Thanh toán &rarr; Làm CLS &rarr; Kết luận.
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<SyncOutlined spin={loading} />}
          onClick={fetchVisits}
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', borderRadius: 6, fontWeight: 'bold' }}
        >
          Làm mới bảng
        </Button>
      </div>

      {/* Kanban Layout - 5 Columns */}
      <Row gutter={16} style={{ maxWidth: 1600, margin: '0 auto', alignItems: 'stretch' }}>
        {/* Column 1: Reception & Vitals */}
        <Col xs={24} sm={12} lg={4} style={{ display: 'flex', flexDirection: 'column', width: '20%' }}>
          <div style={{ background: '#f1f5f9', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', flex: 1, borderTop: '4px solid #64748b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong style={{ fontSize: 13, color: '#475569' }}>1. ĐÓN TIẾP & SINH HIỆU</Text>
              <Badge count={admittedVisits.length} style={{ backgroundColor: '#64748b' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '680px', paddingRight: 4 }}>
              {admittedVisits.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '12px' }}>Trống</div>
              ) : (
                admittedVisits.map(renderVisitCard)
              )}
            </div>
          </div>
        </Col>

        {/* Column 2: Clinical Consultation */}
        <Col xs={24} sm={12} lg={4} style={{ display: 'flex', flexDirection: 'column', width: '20%' }}>
          <div style={{ background: '#e0f2fe', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', flex: 1, borderTop: '4px solid #0284c7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong style={{ fontSize: 13, color: '#0369a1' }}>2. KHÁM LÂM SÀNG</Text>
              <Badge count={clinicalVisits.length} style={{ backgroundColor: '#0284c7' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '680px', paddingRight: 4 }}>
              {clinicalVisits.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '12px' }}>Trống</div>
              ) : (
                clinicalVisits.map(renderVisitCard)
              )}
            </div>
          </div>
        </Col>

        {/* Column 3: Billing & Payment */}
        <Col xs={24} sm={12} lg={4} style={{ display: 'flex', flexDirection: 'column', width: '20%' }}>
          <div style={{ background: '#fef3c7', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', flex: 1, borderTop: '4px solid #d97706' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong style={{ fontSize: 13, color: '#b45309' }}>3. THU NGÂN & THANH TOÁN</Text>
              <Badge count={paymentVisits.length} style={{ backgroundColor: '#d97706' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '680px', paddingRight: 4 }}>
              {paymentVisits.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '12px' }}>Trống</div>
              ) : (
                paymentVisits.map(renderVisitCard)
              )}
            </div>
          </div>
        </Col>

        {/* Column 4: Lab Services */}
        <Col xs={24} sm={12} lg={4} style={{ display: 'flex', flexDirection: 'column', width: '20%' }}>
          <div style={{ background: '#fdf2f8', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', flex: 1, borderTop: '4px solid #db2777' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong style={{ fontSize: 13, color: '#be185d' }}>4. THỰC HIỆN CẬN LÂM SÀNG</Text>
              <Badge count={serviceVisits.length} style={{ backgroundColor: '#db2777' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '680px', paddingRight: 4 }}>
              {serviceVisits.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '12px' }}>Trống</div>
              ) : (
                serviceVisits.map(renderVisitCard)
              )}
            </div>
          </div>
        </Col>

        {/* Column 5: Results Wait & Conclusion */}
        <Col xs={24} sm={12} lg={4} style={{ display: 'flex', flexDirection: 'column', width: '20%' }}>
          <div style={{ background: '#dcfce7', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', flex: 1, borderTop: '4px solid #16a34a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong style={{ fontSize: 13, color: '#15803d' }}>5. KẾT QUẢ & KẾT LUẬN</Text>
              <Badge count={conclusionVisits.length} style={{ backgroundColor: '#16a34a' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '680px', paddingRight: 4 }}>
              {conclusionVisits.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: '12px' }}>Trống</div>
              ) : (
                conclusionVisits.map(renderVisitCard)
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Transfer Room Modal */}
      <Modal
        title={
          <Title level={4} style={{ margin: 0, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
            Điều phối Phân phòng & Bác sĩ thực hiện
          </Title>
        }
        open={transferVisible}
        onCancel={() => setTransferVisible(false)}
        onOk={handleSaveTransfer}
        confirmLoading={saving}
        okText="Xác nhận điều phối"
        cancelText="Đóng"
        width={450}
      >
        {selectedVisit && (
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', borderLeft: '3px solid #52c41a' }}>
            Bệnh nhân: <strong>{selectedVisit.patient?.fullName?.toUpperCase()}</strong> (Mã LK: {selectedVisit.visitCode})
          </div>
        )}
        <Form form={formTransfer} layout="vertical" size="small">
          <Form.Item
            name="roomId"
            label="Phòng khám / Bộ phận cận lâm sàng đích:"
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
            label="Bác sĩ nhận điều phối:"
          >
            <Select placeholder="Bác sĩ nhận bệnh (Không bắt buộc)" allowClear>
              {doctors.map((d) => (
                <Option key={d.id} value={d.id}>{d.fullName} ({d.nickname || 'Không có biệt danh'})</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái hàng đợi:"
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái hàng đợi' }]}
          >
            <Select>
              <Option value="WAITING">Chờ khám / Chờ dịch vụ (Waiting)</Option>
              <Option value="IN_ROOM">Đang khám / Đang thực hiện (In Room)</Option>
              <Option value="COMPLETED">Đã xong ca (Completed)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Vital Signs Modal */}
      <Modal
        title={
          <Title level={4} style={{ margin: 0, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
            Cập nhật chỉ số sinh hiệu (Vitals)
          </Title>
        }
        open={vitalsVisible}
        onCancel={() => setVitalsVisible(false)}
        onOk={handleSaveVitals}
        confirmLoading={saving}
        okText="Lưu sinh hiệu"
        cancelText="Đóng"
        width={480}
      >
        {selectedVisit && (
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', borderLeft: '3px solid #ef4444' }}>
            Bệnh nhân: <strong>{selectedVisit.patient?.fullName?.toUpperCase()}</strong> (Mã LK: {selectedVisit.visitCode})
          </div>
        )}
        <Form form={formVitals} layout="vertical" size="small">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="pulse" label="Mạch (nhịp/phút):">
                <InputNumber style={{ width: '100%' }} placeholder="bpm" min={30} max={250} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bloodPressure" label="Huyết áp (mmHg):">
                <Input placeholder="Ví dụ: 120/80" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="temperature" label="Nhiệt độ (°C):">
                <InputNumber style={{ width: '100%' }} placeholder="°C" min={34} max={43} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="weight" label="Cân nặng (kg):">
                <InputNumber style={{ width: '100%' }} placeholder="kg" min={1} max={300} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="height" label="Chiều cao (cm):">
                <InputNumber style={{ width: '100%' }} placeholder="cm" min={30} max={250} step={0.5} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
