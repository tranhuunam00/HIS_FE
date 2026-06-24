import React, { useEffect, useState } from 'react';
import { Modal, Form, Radio, Select, Input, Button, Space, message } from 'antd';
import { scheduleService } from '../../../services/scheduleService';

const { Option } = Select;

export default function ScheduleOverrideModal({
  visible,
  staff,
  date,
  currentOverrideId,
  currentOverride,
  shifts,
  branches,
  onClose,
  onRefresh,
}) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [type, setType] = useState('LEAVE');

  useEffect(() => {
    if (visible) {
      if (currentOverride) {
        setType(currentOverride.isLeave ? 'LEAVE' : 'WORK');
        form.setFieldsValue({
          overrideType: currentOverride.isLeave ? 'LEAVE' : 'WORK',
          reason: currentOverride.leaveReason || '',
          shiftId: currentOverride.shifts?.[0]?.shiftId || undefined,
          branchId: currentOverride.shifts?.[0]?.branchId || undefined,
        });
      } else {
        setType('LEAVE');
        form.resetFields();
        form.setFieldsValue({
          overrideType: 'LEAVE',
        });
      }
    }
  }, [visible, currentOverride, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        staffId: staff.id,
        date,
        overrideType: values.overrideType,
        reason: values.overrideType === 'LEAVE' ? values.reason : null,
        shiftId: values.overrideType === 'WORK' ? values.shiftId : null,
        branchId: values.overrideType === 'WORK' ? values.branchId : null,
      };

      await scheduleService.createScheduleOverride(payload);
      message.success('Điều chỉnh lịch ngày thành công');
      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể điều chỉnh lịch ngày');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentOverrideId) return;
    try {
      setDeleting(true);
      await scheduleService.deleteScheduleOverride(currentOverrideId);
      message.success('Đã hủy điều chỉnh lịch ngày, quay về lịch gốc');
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể hủy điều chỉnh');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      title={`Điều chỉnh lịch ngày: ${date}`}
      open={visible}
      onCancel={onClose}
      destroyOnClose
      width={400}
      size="small"
      footer={[
        currentOverrideId && (
          <Button key="delete" danger size="small" loading={deleting} onClick={handleDelete} style={{ float: 'left' }}>
            Hủy điều chỉnh
          </Button>
        ),
        <Button key="cancel" size="small" onClick={onClose}>
          Hủy
        </Button>,
        <Button key="submit" type="primary" size="small" loading={submitting} onClick={handleSubmit}>
          Lưu
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 12, fontSize: 12, color: '#595959' }}>
        Nhân viên: <strong style={{ color: '#262626' }}>{staff?.fullName}</strong> ({staff?.staffCode})
      </div>

      <Form form={form} layout="vertical" size="small">
        <Form.Item name="overrideType" label="Loại điều chỉnh">
          <Radio.Group onChange={(e) => setType(e.target.value)} buttonStyle="solid" size="small">
            <Radio.Button value="LEAVE">Nghỉ phép / Nghỉ ca</Radio.Button>
            <Radio.Button value="WORK">Thay đổi ca trực</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {type === 'LEAVE' ? (
          <Form.Item
            label="Lý do nghỉ"
            name="reason"
            rules={[{ required: true, message: 'Nhập lý do nghỉ phép' }]}
          >
            <Input.TextArea placeholder="Nghỉ ốm, nghỉ phép năm, bận việc gia đình..." rows={3} />
          </Form.Item>
        ) : (
          <>
            <Form.Item
              label="Chọn ca làm việc mới"
              name="shiftId"
              rules={[{ required: true, message: 'Vui lòng chọn ca trực' }]}
            >
              <Select placeholder="Chọn ca trực">
                {shifts.map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Chọn chi nhánh làm việc mới"
              name="branchId"
              rules={[{ required: true, message: 'Vui lòng chọn chi nhánh' }]}
            >
              <Select placeholder="Chọn chi nhánh">
                {branches.map((b) => (
                  <Option key={b.id} value={b.id}>
                    {b.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
