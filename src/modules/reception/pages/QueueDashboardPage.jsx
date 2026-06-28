import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Tag, Space, Modal, Form, Select, Input, InputNumber, Typography, message, Tooltip, Progress, Badge, Divider } from 'antd';
import { SyncOutlined, ArrowRightOutlined, HeartOutlined, HomeOutlined, CheckCircleOutlined, DollarOutlined, ExperimentOutlined, FileTextOutlined, WarningOutlined, CompassOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { visitService } from '../../../services/visitService';
import { roomService } from '../../../services/roomService';
import { staffService } from '../../../services/staffService';
import { billingService } from '../../../services/billingService';
import { attendanceService } from '../../../services/attendanceService';
import { authAdminService } from '../../../services/authAdminService';

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
  const [roomDoctors, setRoomDoctors] = useState([]);
  const [loadingRoomDoctors, setLoadingRoomDoctors] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(undefined);

  const [formTransfer] = Form.useForm();
  const [formVitals] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const activeBranchId = localStorage.getItem('activeBranchId');

  useEffect(() => {
    fetchVisits();
    loadMetadata();
    fetchUser();
    
    // Setup interval for simulated real-time updates (every 10 seconds)
    const interval = setInterval(() => {
      fetchVisits();
    }, 10000);

    return () => clearInterval(interval);
  }, [activeBranchId]);

  const fetchUser = async () => {
    try {
      const user = await authAdminService.getCurrentUser();
      setCurrentUser(user);
    } catch (err) {
      console.error(err);
    }
  };

  const hasBranchPermission = (permissionField) => {
    if (!currentUser) return false;
    if (currentUser.roleName === 'SUPER_ADMIN' || currentUser.username === 'admin' || currentUser.email === 'admin@hisdaocare.com') return true;
    if (!activeBranchId) return false;
    const branchPerm = currentUser.scopedPermissions?.find(p => p.branchId === activeBranchId);
    return branchPerm ? !!branchPerm[permissionField] : false;
  };

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

  const fetchDoctorsForRoom = async (roomId) => {
    if (!roomId) {
      setRoomDoctors([]);
      return;
    }
    try {
      setLoadingRoomDoctors(true);
      const today = new Date().toISOString().split('T')[0];
      // 1. Fetch doctors assigned to this room
      const roomStaffList = await staffService.getDoctorsByRoom(activeBranchId, roomId);
      
      // 2. Fetch today's attendance for each assigned doctor in parallel and filter
      const checkedInDoctors = [];
      await Promise.all(
        roomStaffList.map(async (doc) => {
          try {
            const statusList = await attendanceService.getTodayStatus(doc.id, today);
            const isDocCheckedIn = statusList.some(
              (a) => a.status === 'CHECKED_IN' && !a.checkOutTime && a.isAcceptingPatients !== false
            );
            if (isDocCheckedIn) {
              checkedInDoctors.push(doc);
            }
          } catch (err) {
            console.warn(`Lỗi khi lấy trạng thái trực của bác sĩ ${doc.fullName}:`, err);
          }
        })
      );
      setRoomDoctors(checkedInDoctors);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải trạng thái điểm danh bác sĩ tại phòng này');
    } finally {
      setLoadingRoomDoctors(false);
    }
  };

  const handleOpenTransfer = (visit) => {
    setSelectedVisit(visit);
    formTransfer.resetFields();
    
    const initialRoomId = visit.currentRoomId || undefined;
    setSelectedRoomId(initialRoomId);
    
    formTransfer.setFieldsValue({
      roomId: initialRoomId,
      doctorId: visit.currentDoctorId || undefined,
      status: visit.status === 'ADMITTED' ? 'WAITING' : (visit.status === 'WAITING' ? 'WAITING' : visit.status),
    });
    
    if (initialRoomId) {
      fetchDoctorsForRoom(initialRoomId);
    } else {
      setRoomDoctors([]);
    }
    
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

    const borderColors = {
      blue: '#3b82f6',
      green: '#10b981',
      success: '#10b981',
      orange: '#f59e0b',
      purple: '#8b5cf6',
      cyan: '#06b6d4',
      geekblue: '#2f54eb',
      magenta: '#eb2f96',
      gold: '#d97706',
    };
    const cardBorderColor = borderColors[detailed.color] || '#9ca3af';

    const getPriorityStyle = (level) => {
      if (level === 'EMERGENCY') {
        return { color: '#ef4444', label: 'Cap cuu', bg: '#fef2f2', border: '#fca5a5' };
      } else if (level === 'PRIORITY') {
        return { color: '#f59e0b', label: 'Uu tien', bg: '#fffbeb', border: '#fcd34d' };
      }
      return { color: '#10b981', label: 'Thuong', bg: '#f0fdf4', border: '#bbf7d0' };
    };
    const prio = getPriorityStyle(visit.priorityLevel);

    const getWaitTimeText = (createdAt) => {
      if (!createdAt) return 'Vua xong';
      const diffMs = new Date() - new Date(createdAt);
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Vua xong';
      if (diffMins < 60) return `${diffMins} phut`;
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} gio ${diffMins % 60} phut`;
    };
    const waitTime = getWaitTimeText(visit.createdAt);

    return (
      <Card
        key={visit.id}
        size="small"
        style={{
          marginBottom: '10px',
          borderRadius: '10px',
          borderLeft: `4px solid ${cardBorderColor}`,
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          background: '#fff',
          border: '1px solid #edf2f7',
        }}
        styles={{ body: { padding: '10px' } }}
        className="queue-card-hover"
      >
        {/* Patient Name and STT badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'nowrap', overflow: 'hidden' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: '700',
            color: prio.color,
            backgroundColor: prio.bg,
            padding: '1px 5px',
            borderRadius: '4px',
            border: `1px solid ${prio.border}`,
            whiteSpace: 'nowrap'
          }}>
            STT {visit.queueNumber}
          </span>
          <Text strong style={{ fontSize: '13px', color: '#0f172a', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
            {visit.patient?.fullName}
          </Text>
        </div>

        {/* Tag, visit code, and wait time */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Tag color={detailed.color} style={{ fontWeight: '600', fontSize: '9px', borderRadius: '3px', textTransform: 'uppercase', border: 'none', padding: '0 4px', margin: 0 }}>
              {detailed.label}
            </Tag>
            <span style={{ fontSize: '9px', color: '#94a3b8', fontStyle: 'italic' }}>
              #{visit.visitCode?.slice(-4) || ''}
            </span>
          </div>
          <span style={{ fontSize: '10px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
            <ClockCircleOutlined style={{ fontSize: '9px' }} /> {waitTime}
          </span>
        </div>

        {/* Reason, Room and Doctor */}
        <div style={{ fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '6px' }}>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: '#94a3b8' }}>Ly do:</span> {visit.reason || 'Kham tong quan'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
              <HomeOutlined style={{ color: '#94a3b8', fontSize: '11px' }} />
              <strong style={{ color: '#334155' }}>{visit.currentRoom?.name || 'Chua dieu phoi'}</strong>
            </span>
            {visit.currentDoctor?.fullName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                <UserOutlined style={{ color: '#94a3b8', fontSize: '11px' }} />
                BS. <strong style={{ color: '#334155' }}>{visit.currentDoctor.nickname || visit.currentDoctor.fullName}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Service progress */}
        {totalCount > 0 && (
          <div style={{ marginBottom: '6px', background: '#f0f9ff', padding: '4px 6px', borderRadius: '4px', border: '1px solid #e0f2fe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '600', color: '#0284c7', marginBottom: '2px' }}>
              <span>Tien do CLS: {completedCount}/{totalCount} DV</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress percent={progressPercent} size="small" showInfo={false} strokeColor="#0284c7" trailColor="#e0f2fe" strokeWidth={4} style={{ margin: 0 }} />
          </div>
        )}

        {/* Vital signs */}
        {(visit.pulse || visit.bloodPressure || visit.temperature) ? (
          <div style={{ marginBottom: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {visit.pulse && (
              <span style={{ fontSize: '9px', fontWeight: '500', background: '#fef2f2', color: '#dc2626', padding: '1px 4px', borderRadius: '3px', border: '1px solid #fee2e2' }}>
                ❤️ {visit.pulse}
              </span>
            )}
            {visit.bloodPressure && (
              <span style={{ fontSize: '9px', fontWeight: '500', background: '#f0f9ff', color: '#0284c7', padding: '1px 4px', borderRadius: '3px', border: '1px solid #e0f2fe' }}>
                🩸 {visit.bloodPressure}
              </span>
            )}
            {visit.temperature && (
              <span style={{ fontSize: '9px', fontWeight: '500', background: '#fffbeb', color: '#d97706', padding: '1px 4px', borderRadius: '3px', border: '1px solid #fef3c7' }}>
                🌡️ {visit.temperature}°
              </span>
            )}
          </div>
        ) : null}

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
          {visit.status === 'ALL_SERVICES_DONE' ? (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleConfirmResultsWait(visit.id)}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontSize: '10px', borderRadius: '4px', padding: '0 6px', height: '22px' }}
            >
              Cho KQ
            </Button>
          ) : <div />}
          <div style={{ display: 'flex', gap: '4px' }}>
            {hasBranchPermission('canCheckIn') && (
              <>
                <Button
                  size="small"
                  icon={<HeartOutlined />}
                  onClick={() => handleOpenVitals(visit)}
                  style={{ color: '#ef4444', borderColor: '#fca5a5', fontSize: '10px', borderRadius: '4px', padding: '0 6px', height: '22px' }}
                >
                  Sinh hieu
                </Button>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<ArrowRightOutlined />}
                  onClick={() => handleOpenTransfer(visit)}
                  style={{ color: '#059669', borderColor: '#a7f3d0', fontSize: '10px', borderRadius: '4px', padding: '0 6px', height: '22px' }}
                >
                  Dieu phoi
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: '12px 16px', background: '#f8fafc', minHeight: 'calc(100vh - 48px)' }}>
      <style>{`
        .queue-card-hover {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .queue-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 10px rgba(0,0,0,0.05) !important;
          border-color: #cbd5e1 !important;
        }
      `}</style>
      
      {/* Page Header */}
      <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto 16px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 'bold', color: '#0f172a' }}>
            <CompassOutlined style={{ marginRight: 8, color: '#059669' }} />
            Bang dieu phoi hang doi kham benh (Queue Dashboard)
          </Title>
          <Paragraph type="secondary" style={{ margin: '4px 0 0 0', color: '#64748b' }}>
            Bieu do kanban 5 cot dieu phoi luot kham: Don tiep &rarr; Kham lam sang &rarr; Thanh toan &rarr; Lam CLS &rarr; Ket luan.
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<SyncOutlined spin={loading} />}
          onClick={fetchVisits}
          style={{ backgroundColor: '#059669', borderColor: '#059669', borderRadius: 8, fontWeight: 'bold', height: '36px', boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.2)' }}
        >
          Lam moi bang
        </Button>
      </div>

      {/* Kanban Layout - 5 Columns */}
      <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '100%', margin: '0 auto', alignItems: 'stretch' }}>
        {/* Column 1: Reception & Vitals */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0px', minWidth: 0 }}>
          <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', flex: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', borderTop: '4px solid #64748b', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
              <Text strong style={{ fontSize: '11px', color: '#475569', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>1. DON TIEP & SINH HIEU</Text>
              <Badge count={admittedVisits.length} style={{ backgroundColor: '#64748b', fontWeight: 'bold', fontSize: '10px' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '720px', paddingRight: '2px' }}>
              {admittedVisits.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0', fontSize: '11px', background: 'rgba(241, 245, 249, 0.5)', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>Trong</div>
              ) : (
                admittedVisits.map(renderVisitCard)
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Clinical Consultation */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0px', minWidth: 0 }}>
          <div style={{ background: '#f0f9ff', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', flex: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #e0f2fe', borderTop: '4px solid #0284c7', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e0f2fe', paddingBottom: '6px' }}>
              <Text strong style={{ fontSize: '11px', color: '#0369a1', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>2. KHAM LAM SANG</Text>
              <Badge count={clinicalVisits.length} style={{ backgroundColor: '#0284c7', fontWeight: 'bold', fontSize: '10px' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '720px', paddingRight: '2px' }}>
              {clinicalVisits.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0', fontSize: '11px', background: 'rgba(224, 242, 254, 0.5)', borderRadius: '6px', border: '1px dashed #bae6fd' }}>Trong</div>
              ) : (
                clinicalVisits.map(renderVisitCard)
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Billing & Payment */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0px', minWidth: 0 }}>
          <div style={{ background: '#fffbeb', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', flex: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #fef3c7', borderTop: '4px solid #d97706', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #fef3c7', paddingBottom: '6px' }}>
              <Text strong style={{ fontSize: '11px', color: '#b45309', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>3. THU NGAN & THANH TOAN</Text>
              <Badge count={paymentVisits.length} style={{ backgroundColor: '#d97706', fontWeight: 'bold', fontSize: '10px' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '720px', paddingRight: '2px' }}>
              {paymentVisits.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0', fontSize: '11px', background: 'rgba(254, 243, 199, 0.5)', borderRadius: '6px', border: '1px dashed #fde68a' }}>Trong</div>
              ) : (
                paymentVisits.map(renderVisitCard)
              )}
            </div>
          </div>
        </div>

        {/* Column 4: Lab Services */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0px', minWidth: 0 }}>
          <div style={{ background: '#fdf2f8', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', flex: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #fbcfe8', borderTop: '4px solid #db2777', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #fbcfe8', paddingBottom: '6px' }}>
              <Text strong style={{ fontSize: '11px', color: '#be185d', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>4. THUC HIEN CAN LAM SANG</Text>
              <Badge count={serviceVisits.length} style={{ backgroundColor: '#db2777', fontWeight: 'bold', fontSize: '10px' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '720px', paddingRight: '2px' }}>
              {serviceVisits.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0', fontSize: '11px', background: 'rgba(253, 242, 248, 0.5)', borderRadius: '6px', border: '1px dashed #fbcfe8' }}>Trong</div>
              ) : (
                serviceVisits.map(renderVisitCard)
              )}
            </div>
          </div>
        </div>

        {/* Column 5: Results Wait & Conclusion */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0px', minWidth: 0 }}>
          <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', flex: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #bbf7d0', borderTop: '4px solid #16a34a', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #bbf7d0', paddingBottom: '6px' }}>
              <Text strong style={{ fontSize: '11px', color: '#15803d', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>5. KET QUA & KET LUAN</Text>
              <Badge count={conclusionVisits.length} style={{ backgroundColor: '#16a34a', fontWeight: 'bold', fontSize: '10px' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '720px', paddingRight: '2px' }}>
              {conclusionVisits.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0', fontSize: '11px', background: 'rgba(240, 253, 244, 0.5)', borderRadius: '6px', border: '1px dashed #bbf7d0' }}>Trong</div>
              ) : (
                conclusionVisits.map(renderVisitCard)
              )}
            </div>
          </div>
        </div>
      </div>

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
            <Select 
              placeholder="Chọn phòng khám"
              onChange={(val) => {
                setSelectedRoomId(val);
                formTransfer.setFieldsValue({ doctorId: undefined });
                fetchDoctorsForRoom(val);
              }}
            >
              {rooms.map((r) => (
                <Option key={r.id} value={r.id}>{r.name} ({r.type === 'CLINIC' ? 'Phòng khám' : 'Cận lâm sàng'})</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="doctorId"
            label="Bác sĩ nhận điều phối:"
          >
            <Select 
              placeholder={
                !selectedRoomId 
                  ? "Vui lòng chọn phòng khám trước" 
                  : (roomDoctors.length === 0 && !loadingRoomDoctors 
                      ? "Không có bác sĩ trực tại phòng này" 
                      : "Bác sĩ nhận bệnh (Không bắt buộc)")
              } 
              allowClear
              disabled={!selectedRoomId}
              loading={loadingRoomDoctors}
            >
              {roomDoctors.map((d) => (
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
