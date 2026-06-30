import React, { useEffect, useState } from 'react';
import { Modal, Form, DatePicker, Select, Button, Space, Divider, Row, Col, message } from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { scheduleService } from '../../../services/scheduleService';
import { roomService } from '../../../services/roomService';

const { Option } = Select;

const DAYS_OF_WEEK = [
  { label: 'Thứ 2', value: 'Monday' },
  { label: 'Thứ 3', value: 'Tuesday' },
  { label: 'Thứ 4', value: 'Wednesday' },
  { label: 'Thứ 5', value: 'Thursday' },
  { label: 'Thứ 6', value: 'Friday' },
  { label: 'Thứ 7', value: 'Saturday' },
  { label: 'Chủ Nhật', value: 'Sunday' },
];

export default function ScheduleUpdateModal({
  visible,
  staff, // null if bulk mode, otherwise the single staff object
  staffList,
  shifts,
  branches,
  defaultEffectiveDate,
  initialSchedules,
  onClose,
  onRefresh,
}) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [quickRoom, setQuickRoom] = useState(undefined);

  // Filter branches based on doctor assignments
  const doctorBranches = branches.filter((b) =>
    staff?.assignments?.some((a) => a.branchId === b.id)
  );
  const displayBranches = doctorBranches.length > 0 ? doctorBranches : branches;

  // Filter rooms in Quick Apply based on doctor assignments
  const getQuickApplyRooms = () => {
    return rooms.filter((r) =>
      r.branchId === quickBranch &&
      staff?.assignments?.some((a) => a.branchId === quickBranch && (a.roomId === r.id || !a.roomId))
    );
  };

  // Filter rooms in each row based on doctor assignments
  const getRowRooms = (allocBranchId) => {
    return rooms.filter((r) =>
      r.branchId === allocBranchId &&
      staff?.assignments?.some((a) => a.branchId === allocBranchId && (a.roomId === r.id || !a.roomId))
    );
  };

  // Configuration for each day of the week: { Monday: [{ shiftId, branchId, roomId }], Tuesday: [] ... }
  const [dayConfig, setDayConfig] = useState(
    DAYS_OF_WEEK.reduce((acc, day) => {
      acc[day.value] = [];
      return acc;
    }, {})
  );

  // "Apply to All" quick configuration helper
  const [quickShift, setQuickShift] = useState(undefined);
  const [quickBranch, setQuickBranch] = useState(undefined);

  useEffect(() => {
    if (visible) {
      roomService.getRooms().then(setRooms).catch(console.error);

      // Reset configs or set from initialSchedules
      const emptyConfig = DAYS_OF_WEEK.reduce((acc, day) => {
        acc[day.value] = [];
        return acc;
      }, {});

      if (staff && initialSchedules && initialSchedules.length > 0) {
        initialSchedules.forEach((daySched) => {
          if (daySched.shifts && daySched.shifts.length > 0) {
            emptyConfig[daySched.dayOfWeek] = daySched.shifts.map((s) => ({
              shiftId: s.shiftId,
              branchId: s.branchId,
              roomId: s.roomId || undefined,
            }));
          }
        });
      }
      setDayConfig(emptyConfig);

      setQuickShift(undefined);
      setQuickBranch(undefined);
      setQuickRoom(undefined);
      form.resetFields();

      const initialEffectiveDate = defaultEffectiveDate || dayjs().add(1, 'week').startOf('week').add(1, 'day');
      form.setFieldsValue({
        effectiveDate: initialEffectiveDate,
      });
    }
  }, [visible, staff, form, defaultEffectiveDate, initialSchedules]);

  const handleApplyToAll = () => {
    if (!quickShift || !quickBranch) {
      message.warning('Vui lòng chọn Ca trực và Chi nhánh ở dòng Áp dụng nhanh');
      return;
    }
    const newConfig = DAYS_OF_WEEK.reduce((acc, day) => {
      acc[day.value] = [{ shiftId: quickShift, branchId: quickBranch, roomId: quickRoom || undefined }];
      return acc;
    }, {});
    setDayConfig(newConfig);
    message.success('Đã áp dụng đồng loạt cho tất cả các ngày trong tuần');
  };

  const handleAddShiftRow = (dayValue) => {
    setDayConfig({
      ...dayConfig,
      [dayValue]: [...dayConfig[dayValue], { shiftId: undefined, branchId: undefined, roomId: undefined }],
    });
  };

  const handleRemoveShiftRow = (dayValue, index) => {
    const updated = [...dayConfig[dayValue]];
    updated.splice(index, 1);
    setDayConfig({
      ...dayConfig,
      [dayValue]: updated,
    });
  };

  const handleShiftRowChange = (dayValue, index, field, value) => {
    const updated = [...dayConfig[dayValue]];
    if (field === 'branchId') {
      updated[index] = { ...updated[index], [field]: value, roomId: undefined };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setDayConfig({
      ...dayConfig,
      [dayValue]: updated,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const staffIds = [staff?.id];
      if (!staff?.id) {
        message.warning('Không tìm thấy thông tin nhân viên');
        setSubmitting(false);
        return;
      }

      const items = [];
      let totalAllocations = 0;

      for (const dayValue of Object.keys(dayConfig)) {
        const allocations = dayConfig[dayValue];
        for (const alloc of allocations) {
          if (!alloc.shiftId || !alloc.branchId) {
            message.error('Vui lòng điền đầy đủ Ca trực và Chi nhánh cho các ca trực đã cấu hình');
            setSubmitting(false);
            return;
          }
          items.push({
            dayOfWeek: dayValue,
            shiftId: alloc.shiftId,
            branchId: alloc.branchId,
            roomId: alloc.roomId || null,
          });
          totalAllocations++;
        }
      }

      if (totalAllocations === 0) {
        message.error('Vui lòng xếp ít nhất một ca làm việc trong tuần');
        setSubmitting(false);
        return;
      }

      const payload = {
        staffIds: values.staffIds,
        effectiveDate: values.effectiveDate.format('YYYY-MM-DD'),
        items,
      };

      await scheduleService.saveScheduleTemplate(payload);
      message.success('Cập nhật lịch tuần nhân viên thành công');
      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi xếp lịch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
          📅 Thiết lập lịch trực tuần: {staff?.fullName} [{staff?.staffCode}]
        </div>
      }
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      destroyOnClose
      width={840}
      size="small"
      okText="Lưu lịch trực"
      cancelText="Hủy"
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingTop: 8 } }}
    >
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Ngày áp dụng có hiệu lực"
              name="effectiveDate"
              rules={[{ required: true, message: 'Chọn ngày áp dụng' }]}
            >
              <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} placeholder="Chọn ngày có hiệu lực" />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0' }} />

        {/* Quick Apply Panel */}
        <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, marginRight: 8, color: '#30456c' }}>
            <CopyOutlined /> Áp dụng nhanh (Đặt lịch giống nhau cho cả tuần):
          </span>
          <Space size="small" style={{ marginTop: 6 }}>
            <Select
              size="small"
              placeholder="Chọn ca trực"
              style={{ width: 180 }}
              value={quickShift}
              onChange={setQuickShift}
            >
              {shifts.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.name} ({s.startTime} - {s.endTime})
                </Option>
              ))}
            </Select>
            <Select
              size="small"
              placeholder="Chọn chi nhánh"
              style={{ width: 180 }}
              value={quickBranch}
              onChange={(val) => {
                setQuickBranch(val);
                setQuickRoom(undefined);
              }}
            >
              {displayBranches.map((b) => (
                <Option key={b.id} value={b.id}>
                  {b.name}
                </Option>
              ))}
            </Select>
            <Select
              size="small"
              placeholder="Chọn phòng"
              style={{ width: 180 }}
              value={quickRoom}
              onChange={setQuickRoom}
              allowClear
              disabled={!quickBranch}
            >
              {getQuickApplyRooms().map((r) => (
                <Option key={r.id} value={r.id}>
                  {r.name}
                </Option>
              ))}
            </Select>
            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleApplyToAll}>
              Áp dụng
            </Button>
          </Space>
        </div>

        {/* Weekday Configuration Grid */}
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#30456c' }}>
          Chi tiết ca trực trong tuần
        </div>

        {DAYS_OF_WEEK.map((day) => {
          const allocations = dayConfig[day.value] || [];
          return (
            <div
              key={day.value}
              style={{
                display: 'flex',
                borderBottom: '1px solid #f0f0f0',
                padding: '6px 0',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ width: 100, fontWeight: 500, paddingTop: 4, color: '#595959' }}>{day.label}</div>
              <div style={{ flex: 1 }}>
                {allocations.map((alloc, idx) => (
                  <Space key={idx} size="small" style={{ display: 'flex', marginBottom: 4 }}>
                    <Select
                      size="small"
                      placeholder="Chọn ca"
                      style={{ width: 180 }}
                      value={alloc.shiftId}
                      onChange={(val) => handleShiftRowChange(day.value, idx, 'shiftId', val)}
                    >
                      {shifts.map((s) => (
                        <Option key={s.id} value={s.id}>
                          {s.name} ({s.startTime} - {s.endTime})
                        </Option>
                      ))}
                    </Select>

                    <Select
                      size="small"
                      placeholder="Chọn chi nhánh"
                      style={{ width: 180 }}
                      value={alloc.branchId}
                      onChange={(val) => handleShiftRowChange(day.value, idx, 'branchId', val)}
                    >
                      {displayBranches.map((b) => (
                        <Option key={b.id} value={b.id}>
                          {b.name}
                        </Option>
                      ))}
                    </Select>

                    <Select
                      size="small"
                      placeholder="Chọn phòng"
                      style={{ width: 180 }}
                      value={alloc.roomId}
                      onChange={(val) => handleShiftRowChange(day.value, idx, 'roomId', val)}
                      allowClear
                      disabled={!alloc.branchId}
                    >
                      {getRowRooms(alloc.branchId).map((r) => (
                        <Option key={r.id} value={r.id}>
                          {r.name}
                        </Option>
                      ))}
                    </Select>

                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      onClick={() => handleRemoveShiftRow(day.value, idx)}
                    />
                  </Space>
                ))}
                <div>
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => handleAddShiftRow(day.value)}
                    style={{ fontSize: 11, padding: '0 8px', height: 22 }}
                  >
                    Thêm ca
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </Form>
    </Modal>
  );
}
