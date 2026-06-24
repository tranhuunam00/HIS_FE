import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, Modal, Radio, Input, Form, Tag, Alert, Spin, message, Row, Col, Switch } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, LogoutOutlined, CalendarOutlined, SolutionOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { scheduleService } from '../../../services/scheduleService';
import { attendanceService } from '../../../services/attendanceService';
import { authAdminService } from '../../../services/authAdminService';

const { Title, Text, Paragraph } = Typography;

export default function DoctorAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [time, setTime] = useState(new Date());

  // Shifts state
  const [lastShift, setLastShift] = useState(null);
  const [currentShift, setCurrentShift] = useState(null);
  const [upcomingShift, setUpcomingShift] = useState(null);

  // Modal checkout state
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const [checkoutReason, setCheckoutReason] = useState('Hết ca trực');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeBranchId = localStorage.getItem('activeBranchId') || '';

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

      // Fetch schedules from today - 3 days to today + 3 days to capture last, current and upcoming shifts
      const start = dayjs().subtract(3, 'day').format('YYYY-MM-DD');
      const end = dayjs().add(3, 'day').format('YYYY-MM-DD');

      const resolvedSchedules = await scheduleService.getSchedules({
        staffIds: [user.staff.id],
        startDate: start,
        endDate: end,
      });

      // Flatten and filter shifts for the active branch
      const allShifts = [];
      resolvedSchedules.forEach((daySched) => {
        if (daySched.staffId !== user.staff.id || daySched.isLeave) return;
        daySched.shifts.forEach((s) => {
          if (s.branchId !== activeBranchId) return;

          const [startH, startM] = s.startTime.split(':').map(Number);
          const [endH, endM] = s.endTime.split(':').map(Number);

          const shiftStart = dayjs(daySched.date).hour(startH).minute(startM).second(0).toDate();
          const shiftEnd = dayjs(daySched.date).hour(endH).minute(endM).second(0).toDate();

          allShifts.push({
            ...s,
            date: daySched.date,
            dayOfWeek: daySched.dayOfWeek,
            shiftStart,
            shiftEnd,
          });
        });
      });

      // Sort shifts by start time
      allShifts.sort((a, b) => a.shiftStart.getTime() - b.shiftStart.getTime());

      const now = new Date();
      const nowTime = now.getTime();

      // Find current shift
      const curr = allShifts.find(s => nowTime >= s.shiftStart.getTime() && nowTime <= s.shiftEnd.getTime()) || null;
      setCurrentShift(curr);

      // Find upcoming shift
      const upcoming = allShifts.find(s => s.shiftStart.getTime() > nowTime) || null;
      setUpcomingShift(upcoming);

      // Find last shift
      const pastShifts = allShifts.filter(s => s.shiftEnd.getTime() < nowTime);
      const last = pastShifts.length > 0 ? pastShifts[pastShifts.length - 1] : null;
      setLastShift(last);

      // Fetch attendance status for the unique dates of these shifts
      const uniqueDates = Array.from(new Set([last?.date, curr?.date, upcoming?.date].filter(Boolean)));
      let allAttendances = [];
      if (uniqueDates.length > 0) {
        const attendancePromises = uniqueDates.map((d) => attendanceService.getTodayStatus(user.staff.id, d));
        const attendanceResults = await Promise.all(attendancePromises);
        allAttendances = attendanceResults.flat();
      }
      setAttendances(allAttendances);
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
        date: shift.date,
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
      await fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAccepting = async (attendanceId, checked) => {
    try {
      setLoading(true);
      await attendanceService.toggleAcceptingPatients(attendanceId, checked);
      message.success(checked ? 'Đã bật nhận bệnh nhân mới!' : 'Đã ngưng nhận bệnh nhân mới.');
      await fetchData();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể cập nhật trạng thái nhận bệnh');
      setLoading(false);
    }
  };

  const getCheckInStatus = (shift) => {
    const now = new Date().getTime();
    const startMs = shift.shiftStart.getTime();
    const endMs = shift.shiftEnd.getTime();

    // Check-in early limit: maximum 1 hour early
    if (now < startMs - 3600000) {
      return {
        allowed: false,
        reason: `Chưa đến giờ điểm danh (chỉ cho phép trước ca tối đa 1 tiếng, từ ${dayjs(startMs - 3600000).format('HH:mm')})`,
        statusLabel: 'CHƯA ĐẾN GIỜ',
        tagColor: 'default',
      };
    }
    // Check-in late limit: cannot check-in after the shift ends
    if (now > endMs) {
      return {
        allowed: false,
        reason: `Ca trực này đã kết thúc vào lúc ${shift.endTime}. Không thể thực hiện điểm danh Check-in.`,
        statusLabel: 'VẮNG MẶT',
        tagColor: 'error',
      };
    }
    return {
      allowed: true,
      reason: 'Bạn có lịch trực ca này hôm nay. Vui lòng bấm Điểm danh Check-in khi bắt đầu làm việc.',
      statusLabel: 'SẴN SÀNG ĐIỂM DANH',
      tagColor: 'processing',
    };
  };

  const getCheckOutStatus = (shift, attendance) => {
    if (!attendance) return { allowed: false, reason: null };
    const now = new Date().getTime();
    const endMs = shift.shiftEnd.getTime();

    // Check-out late limit: maximum 1 hour after shift ends
    if (now > endMs + 3600000) {
      return {
        allowed: false,
        reason: `Ca trực đã kết thúc lúc ${shift.endTime} và quá 1 tiếng sau ca. Bạn không thể tự thực hiện Check-out.`,
      };
    }
    return {
      allowed: true,
      reason: null,
    };
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

  const displayShifts = [
    { type: 'LAST', title: 'Ca trực gần nhất', data: lastShift },
    { type: 'CURRENT', title: 'Ca trực hiện tại', data: currentShift },
    { type: 'UPCOMING', title: 'Ca trực tiếp theo', data: upcomingShift },
  ].filter(item => item.data !== null);

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

      {displayShifts.length === 0 ? (
        <Alert
          message="Không có lịch trực nào gần đây"
          description="Hôm nay và các ngày lân cận bạn không có lịch trực được phân công tại chi nhánh này."
          type="info"
          showIcon
          style={{ borderRadius: 8 }}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {displayShifts.map((item) => {
            const shift = item.data;
            const attendance = attendances.find((a) => a.shiftId === shift.shiftId && a.date === shift.date);
            const checkInStatus = getCheckInStatus(shift);
            const checkOutStatus = getCheckOutStatus(shift, attendance);

            let headerBg = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
            let tagColor = 'warning';
            let tagText = 'CHƯA ĐIỂM DANH';

            if (attendance) {
              if (attendance.status === 'CHECKED_IN') {
                headerBg = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                tagColor = 'processing';
                tagText = 'ĐANG TRỰC';
              } else {
                headerBg = 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
                tagColor = 'default';
                tagText = 'ĐÃ KẾT THÚC';
              }
            } else {
              tagColor = checkInStatus.tagColor;
              tagText = checkInStatus.statusLabel;

              if (checkInStatus.statusLabel === 'VẮNG MẶT') {
                headerBg = 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)';
              } else if (checkInStatus.statusLabel === 'CHƯA ĐẾN GIỜ') {
                headerBg = 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)';
              }
            }

            let shiftTypeTag = null;
            if (item.type === 'LAST') {
              shiftTypeTag = <Tag color="default" style={{ margin: 0, fontWeight: 'bold' }}>CA GẦN NHẤT</Tag>;
            } else if (item.type === 'CURRENT') {
              shiftTypeTag = <Tag color="success" style={{ margin: 0, fontWeight: 'bold' }}>CA ĐANG DIỄN RA</Tag>;
            } else if (item.type === 'UPCOMING') {
              shiftTypeTag = <Tag color="blue" style={{ margin: 0, fontWeight: 'bold' }}>CA TIẾP THEO</Tag>;
            }

            return (
              <Col xs={24} md={12} key={`${shift.date}-${shift.shiftId}`}>
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
                      background: headerBg,
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
                      <Space>
                        {shiftTypeTag}
                        <Tag color={tagColor} style={{ borderRadius: 12, fontWeight: 'bold', margin: 0 }}>
                          {tagText}
                        </Tag>
                      </Space>
                    </div>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, display: 'block', marginTop: 4 }}>
                      Ngày trực: {dayjs(shift.date).format('DD/MM/YYYY')} ({shift.dayOfWeek}) | Khung giờ: {shift.startTime} - {shift.endTime}
                    </Text>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '20px' }}>
                    {!attendance ? (
                      <div>
                        <Paragraph type={checkInStatus.allowed ? 'secondary' : 'danger'} style={{ marginBottom: checkInStatus.allowed ? 20 : 0, fontWeight: checkInStatus.allowed ? 'normal' : 500 }}>
                          {checkInStatus.reason}
                        </Paragraph>
                        {checkInStatus.allowed && (
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
                        )}
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

                          {attendance.status === 'CHECKED_IN' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 16px 0', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #edf2f7' }}>
                              <Space direction="vertical" size={0}>
                                <Text strong style={{ fontSize: 13, color: '#1e293b' }}>Nhận bệnh nhân mới</Text>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', maxWidth: 220 }}>
                                  {attendance.isAcceptingPatients !== false 
                                    ? 'Sẵn sàng nhận thêm bệnh nhân vào hàng đợi' 
                                    : 'Dừng nhận thêm bệnh nhân mới vào phòng khám'}
                                </Text>
                              </Space>
                              <Switch
                                checked={attendance.isAcceptingPatients !== false}
                                onChange={(checked) => handleToggleAccepting(attendance.id, checked)}
                                checkedChildren="Bật"
                                unCheckedChildren="Tắt"
                              />
                            </div>
                          )}

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
                          checkOutStatus.allowed ? (
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
                          ) : (
                            <div style={{ padding: '4px 0' }}>
                              <Paragraph type="danger" style={{ marginBottom: 0, fontWeight: 500 }}>
                                {checkOutStatus.reason}
                              </Paragraph>
                            </div>
                          )
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
