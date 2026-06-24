import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, Modal, Radio, Input, Form, Tag, Alert, Spin, message, Row, Col } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, LogoutOutlined, CalendarOutlined, SolutionOutlined } from '@ant-design/icons';
import { scheduleService } from '../../../services/scheduleService';
import { attendanceService } from '../../../services/attendanceService';
import { authAdminService } from '../../../services/authAdminService';

const { Title, Text, Paragraph } = Typography;

export default function DoctorAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [time, setTime] = useState(new Date());

  // Modal checkout state
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const [checkoutReason, setCheckoutReason] = useState('Hết ca trực');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeBranchId = localStorage.getItem('activeBranchId') || '';

  // Get YYYY-MM-DD in local time
  const getTodayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Clock effect
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const user = await authAdminService.getCurrentUser();
      setCurrentUser(user);

      if (!user.staff) {
        setLoading(false);
        return;
      }

      const today = getTodayStr();

      // Fetch today's resolved schedule
      const resolvedSchedules = await scheduleService.getSchedules({
        staffIds: [user.staff.id],
        startDate: today,
        endDate: today,
      });

      // Filter shifts for the active branch
      const staffSchedule = resolvedSchedules.find((s) => s.staffId === user.staff.id);
      if (staffSchedule && !staffSchedule.isLeave) {
        setTodaySchedules(staffSchedule.shifts.filter((s) => s.branchId === activeBranchId));
      } else {
        setTodaySchedules([]);
      }

      // Fetch today's attendance records
      const todayAttendances = await attendanceService.getTodayStatus(user.staff.id, today);
      setAttendances(todayAttendances);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải thông tin điểm danh ca trực');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen to branch change event
    const handleBranchChange = () => {
      fetchData();
    };
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, [activeBranchId]);

  const handleCheckIn = async (shift) => {
    try {
      setLoading(true);
      await attendanceService.checkIn({
        staffId: currentUser.staff.id,
        branchId: activeBranchId,
        shiftId: shift.shiftId,
        date: getTodayStr(),
      });
      message.success(`Điểm danh vào ca (${shift.shiftName}) thành công!`);
      await fetchData();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Điểm danh Check-in thất bại');
      setLoading(false);
    }
  };

  const handleOpenCheckOut = (attendance) => {
    setCheckoutTarget(attendance);
    setCheckoutReason('Hết ca trực');
    setCustomReason('');
    setCheckoutModalVisible(true);
  };

  const handleCheckOutSubmit = async () => {
    if (!checkoutTarget) return;
    try {
      setSubmitting(true);
      const finalReason = checkoutReason === 'Khác' ? customReason : checkoutReason;
      if (!finalReason.trim()) {
        message.warning('Vui lòng nhập lý do check-out');
        setSubmitting(false);
        return;
      }

      await attendanceService.checkOut({
        attendanceId: checkoutTarget.id,
        checkoutReason: finalReason,
      });

      message.success('Điểm danh kết thúc ca trực thành công!');
      setCheckoutModalVisible(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Điểm danh Check-out thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !currentUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" tip="Đang tải dữ liệu ca trực..." />
      </div>
    );
  }

  if (!currentUser?.staff) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="Không tìm thấy thông tin nhân viên"
          description="Tài khoản này chưa được liên kết với nhân sự trong hệ thống. Vui lòng liên hệ Admin."
          type="warning"
          showIcon
        />
      </div>
    );
  }

  const formatTimeString = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Title section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 'bold' }}>
            <SolutionOutlined style={{ marginRight: 8, color: '#52c41a' }} />
            Điểm danh Ca trực Bác sĩ
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 4 }}>
            Chào bác sĩ, <strong>{currentUser.staff.fullName}</strong> ({currentUser.staff.title}). Hãy điểm danh vào đầu ca và kết thúc ca làm việc.
          </Paragraph>
        </div>

        {/* Dynamic Premium Digital Clock */}
        <Card
          size="small"
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            color: '#fff',
            borderRadius: 8,
            minWidth: 200,
            textAlign: 'center',
          }}
        >
          <Space direction="vertical" size={2}>
            <Text style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
              Giờ Hệ Thống
            </Text>
            <Title level={3} style={{ color: '#52c41a', margin: 0, fontFamily: 'monospace', fontSize: 24, fontWeight: 'bold' }}>
              {time.toLocaleTimeString('vi-VN')}
            </Title>
            <Text style={{ color: '#cbd5e1', fontSize: 12 }}>
              {time.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          </Space>
        </Card>
      </div>

      {todaySchedules.length === 0 ? (
        <Alert
          message="Không có lịch trực nào hôm nay"
          description="Hôm nay bạn không có lịch trực được phân công tại chi nhánh này, hoặc đang trong ngày nghỉ phép."
          type="info"
          showIcon
          style={{ borderRadius: 8 }}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {todaySchedules.map((shift) => {
            // Find if there is an attendance record for this shift
            const attendance = attendances.find((a) => a.shiftId === shift.shiftId);

            return (
              <Col xs={24} md={12} key={shift.shiftId}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 12,
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                  }}
                  styles={{
                    body: { padding: 0 }
                  }}
                >
                  {/* Card Header with gradient based on status */}
                  <div
                    style={{
                      background: attendance
                        ? attendance.status === 'CHECKED_IN'
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      padding: '16px 20px',
                      color: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space size={8}>
                        <CalendarOutlined style={{ fontSize: 18 }} />
                        <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 'bold' }}>
                          {shift.shiftName}
                        </Title>
                      </Space>
                      {attendance ? (
                        <Tag color={attendance.status === 'CHECKED_IN' ? 'success' : 'default'} style={{ borderRadius: 12, fontWeight: 'bold', margin: 0 }}>
                          {attendance.status === 'CHECKED_IN' ? 'ĐANG TRỰC' : 'ĐÃ KẾT THÚC'}
                        </Tag>
                      ) : (
                        <Tag color="warning" style={{ borderRadius: 12, fontWeight: 'bold', margin: 0 }}>
                          CHƯA ĐIỂM DANH
                        </Tag>
                      )}
                    </div>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, display: 'block', marginTop: 4 }}>
                      Khung giờ: {shift.startTime} - {shift.endTime}
                    </Text>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '20px' }}>
                    {!attendance ? (
                      <div>
                        <Paragraph type="secondary" style={{ marginBottom: 20 }}>
                          Bạn có lịch trực ca này hôm nay. Vui lòng bấm Điểm danh Check-in khi bắt đầu làm việc.
                        </Paragraph>
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          size="large"
                          block
                          style={{ height: 42, borderRadius: 8, fontWeight: 'bold' }}
                          onClick={() => handleCheckIn(shift)}
                        >
                          Điểm danh Check-in
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text type="secondary">Thời gian Check-in:</Text>
                            <Text strong style={{ color: '#10b981' }}>
                              {formatTimeString(attendance.checkInTime)}
                            </Text>
                          </div>

                          {attendance.status === 'CHECKED_OUT' && (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text type="secondary">Thời gian Check-out:</Text>
                                <Text strong>{formatTimeString(attendance.checkOutTime)}</Text>
                              </div>
                              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 6, borderLeft: '3px solid #64748b' }}>
                                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>Lý do Checkout:</Text>
                                <Text strong style={{ fontSize: 13 }}>{attendance.checkoutReason}</Text>
                              </div>
                            </>
                          )}
                        </div>

                        {attendance.status === 'CHECKED_IN' && (
                          <Button
                            danger
                            type="primary"
                            icon={<LogoutOutlined />}
                            size="large"
                            block
                            style={{ height: 42, borderRadius: 8, fontWeight: 'bold' }}
                            onClick={() => handleOpenCheckOut(attendance)}
                          >
                            Báo cáo Kết thúc ca trực
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Modal checkout reason selection */}
      <Modal
        title={
          <Title level={4} style={{ margin: 0, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
            Báo cáo Kết thúc ca trực (Check-out)
          </Title>
        }
        open={checkoutModalVisible}
        onOk={handleCheckOutSubmit}
        onCancel={() => setCheckoutModalVisible(false)}
        confirmLoading={submitting}
        okText="Xác nhận Check-out"
        cancelText="Hủy"
        width={450}
        style={{ top: 100 }}
      >
        <div style={{ padding: '16px 0' }}>
          <Paragraph type="secondary">
            Vui lòng chọn lý do kết thúc ca trực của bạn hôm nay:
          </Paragraph>
          <Form layout="vertical">
            <Form.Item label="Lý do check-out:">
              <Radio.Group
                value={checkoutReason}
                onChange={(e) => setCheckoutReason(e.target.value)}
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <Radio value="Hết ca trực">Hết giờ làm việc (Hoàn thành ca trực)</Radio>
                <Radio value="Có việc riêng xin nghỉ sớm">Có việc riêng xin về sớm</Radio>
                <Radio value="Khác">Lý do khác (Vui lòng điền chi tiết)</Radio>
              </Radio.Group>
            </Form.Item>

            {checkoutReason === 'Khác' && (
              <Form.Item label="Lý do chi tiết:" required>
                <Input.TextArea
                  rows={3}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Ghi rõ lý do kết thúc ca trực sớm/muộn..."
                  style={{ borderRadius: 6 }}
                />
              </Form.Item>
            )}
          </Form>
        </div>
      </Modal>
    </div>
  );
}
