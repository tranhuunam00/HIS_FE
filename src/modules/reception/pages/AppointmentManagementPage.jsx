import React, { useEffect, useState } from 'react';
import { Table, Button, Card, DatePicker, Select, Tag, Space, Modal, Form, Input, Row, Col, Typography, message, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, MedicineBoxOutlined, CloseCircleOutlined, UserOutlined } from '@ant-design/icons';
import { appointmentService } from '../../../services/appointmentService';
import { patientService } from '../../../services/patientService';
import { roomService } from '../../../services/roomService';
import { staffService } from '../../../services/staffService';
import { medicalService } from '../../../services/medicalService';
import CheckInModal from '../components/CheckInModal';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;
const { Option } = Select;

const STATUS_MAP = {
  BOOKED: { color: 'blue', label: 'Chờ xác nhận (Booked)' },
  CONFIRMED: { color: 'orange', label: 'Đã xác nhận (Confirmed)' },
  CHECKED_IN: { color: 'green', label: 'Đã đón tiếp (Checked-in)' },
  CANCELLED: { color: 'red', label: 'Đã hủy lịch (Cancelled)' },
};

export default function AppointmentManagementPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filterDate, setFilterDate] = useState(dayjs());
  const [filterStatus, setFilterStatus] = useState(undefined);

  // Modal form states
  const [editorVisible, setEditorVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Reception check-in modal
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [activeCheckInAppointment, setActiveCheckInAppointment] = useState(null);

  // Metadata arrays
  const [patients, setPatients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);

  const activeBranchId = localStorage.getItem('activeBranchId');

  useEffect(() => {
    fetchAppointments();
  }, [filterDate, filterStatus]);

  useEffect(() => {
    if (editorVisible) {
      loadMetadata();
    }
  }, [editorVisible]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = {
        branchId: activeBranchId,
        date: filterDate.format('YYYY-MM-DD'),
      };
      if (filterStatus) {
        params.status = filterStatus;
      }
      const list = await appointmentService.getAppointments(params);
      setData(list);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const [patientList, roomList, staffList, serviceList] = await Promise.all([
        patientService.getPatients(),
        roomService.getRooms(activeBranchId),
        staffService.getStaffList({ branchId: activeBranchId, title: 'DOCTOR' }),
        medicalService.getServices(),
      ]);

      setPatients(patientList);
      setRooms(roomList.filter((r) => r.type === 'CLINIC' && r.isActive));
      setDoctors(staffList.filter((s) => s.isActive));
      setServices(serviceList);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải dữ liệu cấu hình đặt lịch');
    }
  };

  const handleAdd = () => {
    setSelectedAppointment(null);
    form.resetFields();
    form.setFieldsValue({
      appointmentDate: dayjs(),
    });
    setEditorVisible(true);
  };

  const handleEdit = (record) => {
    // VTTech constraint: Chỉ cho phép sửa những lịch hẹn "Chưa đến"
    if (record.status !== 'BOOKED' && record.status !== 'CONFIRMED') {
      message.error('Chỉ được chỉnh sửa lịch hẹn ở trạng thái Chờ xác nhận hoặc Đã xác nhận');
      return;
    }

    setSelectedAppointment(record);
    form.resetFields();
    form.setFieldsValue({
      patientId: record.patientId,
      doctorId: record.doctorId || undefined,
      roomId: record.roomId || undefined,
      serviceId: record.serviceId || undefined,
      appointmentDate: dayjs(record.appointmentDate),
      startTime: record.startTime,
      endTime: record.endTime,
      notes: record.notes || '',
    });
    setEditorVisible(true);
  };

  const handleCancelAppointment = async (record) => {
    try {
      if (record.status === 'CHECKED_IN') {
        message.error('Không thể hủy lịch hẹn đã được tiếp đón');
        return;
      }
      Modal.confirm({
        title: 'Hủy lịch hẹn khám',
        content: `Bạn chắc chắn muốn hủy lịch hẹn của bệnh nhân ${record.patient?.fullName || ''}?`,
        okText: 'Hủy lịch',
        okType: 'danger',
        cancelText: 'Quay lại',
        onOk: async () => {
          await appointmentService.updateAppointment(record.id, { status: 'CANCELLED' });
          message.success('Đã hủy lịch hẹn thành công');
          fetchAppointments();
        },
      });
    } catch (err) {
      console.error(err);
      message.error('Hủy lịch hẹn thất bại');
    }
  };

  const handleCheckIn = (record) => {
    setActiveCheckInAppointment(record);
    setCheckInVisible(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      const payload = {
        branchId: activeBranchId,
        patientId: values.patientId,
        doctorId: values.doctorId,
        roomId: values.roomId,
        serviceId: values.serviceId,
        appointmentDate: values.appointmentDate.format('YYYY-MM-DD'),
        startTime: values.startTime,
        endTime: values.endTime,
        notes: values.notes,
      };

      if (selectedAppointment) {
        await appointmentService.updateAppointment(selectedAppointment.id, payload);
        message.success('Cập nhật lịch hẹn thành công!');
      } else {
        await appointmentService.createAppointment(payload);
        message.success('Tạo lịch hẹn khám thành công!');
      }
      setEditorVisible(false);
      fetchAppointments();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lưu thông tin lịch hẹn thất bại');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Giờ hẹn',
      key: 'time',
      render: (_, record) => (
        <span style={{ fontWeight: 600, color: '#262626' }}>
          {record.startTime} - {record.endTime}
        </span>
      ),
    },
    {
      title: 'Mã lịch hẹn',
      dataIndex: 'appointmentCode',
      key: 'appointmentCode',
      render: (code) => <Tag color="cyan">{code}</Tag>,
    },
    {
      title: 'Bệnh nhân',
      dataIndex: ['patient', 'fullName'],
      key: 'patientName',
      render: (text, record) => {
        const fullName = text || record.patient?.fullName || 'N/A';
        const phone = record.patient?.phone || 'N/A';
        const dob = record.patient?.dob;
        let ageText = '';
        if (dob) {
          const birthYear = new Date(dob).getFullYear();
          const currentYear = new Date().getFullYear();
          const age = currentYear - birthYear;
          ageText = ` (${age} tuổi)`;
        }
        return (
          <div>
            <div style={{ fontWeight: 600, textTransform: 'uppercase' }}>
              {fullName}{ageText}
            </div>
            <small style={{ color: '#8c8c8c' }}>SĐT: {phone}</small>
          </div>
        );
      },
    },
    {
      title: 'Dịch vụ khám',
      dataIndex: ['service', 'name'],
      key: 'serviceName',
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>Khám tổng quát</span>,
    },
    {
      title: 'Phòng khám',
      dataIndex: ['room', 'name'],
      key: 'roomName',
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>Chưa gán</span>,
    },
    {
      title: 'Bác sĩ chỉ định',
      dataIndex: ['doctor', 'fullName'],
      key: 'doctorName',
      render: (text) => text || <span style={{ color: '#bfbfbf' }}>Chờ tiếp nhận</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const item = STATUS_MAP[status] || { color: 'default', label: status };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => {
        const isEditable = record.status === 'BOOKED' || record.status === 'CONFIRMED';
        return (
          <Space size="small">
            {isEditable && (
              <>
                <Tooltip title="Đón tiếp bệnh nhân">
                  <Button
                    type="primary"
                    icon={<MedicineBoxOutlined />}
                    onClick={() => handleCheckIn(record)}
                    size="small"
                    style={{ backgroundColor: '#059669', borderColor: '#059669', display: 'inline-flex', alignItems: 'center' }}
                  >
                    Tiếp nhận
                  </Button>
                </Tooltip>
                <Tooltip title="Chỉnh sửa lịch hẹn">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(record)}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title="Hủy cuộc hẹn">
                  <Button
                    type="text"
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={() => handleCancelAppointment(record)}
                    size="small"
                  />
                </Tooltip>
              </>
            )}
            {!isEditable && <span style={{ fontSize: '11px', color: '#8c8c8c' }}>Không thể chỉnh sửa</span>}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '16px', background: '#f5f5f5', minHeight: 'calc(100vh - 48px)' }}>
      <div style={{ marginBottom: '16px', maxWidth: 1200, margin: '0 auto 16px auto', display: 'flex', justifycontent: 'space-between', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Quản lý Lịch hẹn Khám</Title>
          <Paragraph style={{ margin: 0, color: '#8c8c8c', fontSize: '12px' }}>
            Đặt lịch hẹn khám trước cho khách hàng, theo dõi danh sách lịch hẹn trong ngày và thực hiện tiếp đón.
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          size="small"
          style={{ backgroundColor: '#059669', borderColor: '#059669' }}
        >
          Đặt lịch hẹn
        </Button>
      </div>

      <Card size="small" style={{ maxWidth: 1200, margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Space style={{ marginBottom: 16 }} size="small">
          <span>Ngày hẹn:</span>
          <DatePicker
            value={filterDate}
            onChange={(date) => date && setFilterDate(date)}
            format="DD/MM/YYYY"
            size="small"
            allowClear={false}
          />
          <span>Trạng thái:</span>
          <Select
            placeholder="Tất cả trạng thái"
            style={{ width: 180 }}
            allowClear
            value={filterStatus}
            onChange={setFilterStatus}
            size="small"
          >
            <Option value="BOOKED">Chờ xác nhận (Booked)</Option>
            <Option value="CONFIRMED">Đã xác nhận (Confirmed)</Option>
            <Option value="CHECKED_IN">Đã đón tiếp (Checked-in)</Option>
            <Option value="CANCELLED">Đã hủy lịch (Cancelled)</Option>
          </Select>
        </Space>

        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{ pageSize: 10, size: 'small' }}
        />
      </Card>

      {/* Appointment Form Modal */}
      <Modal
        title={selectedAppointment ? 'Chỉnh sửa lịch hẹn khám' : 'Đặt lịch hẹn khám mới'}
        open={editorVisible}
        onCancel={() => setEditorVisible(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={550}
        okText="Lưu lịch hẹn"
        cancelText="Đóng"
        size="small"
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item
            name="patientId"
            label="Chọn Bệnh nhân"
            rules={[{ required: true, message: 'Vui lòng chọn bệnh nhân' }]}
          >
            <Select
              showSearch
              placeholder="Gõ tên hoặc SĐT để tìm"
              optionFilterProp="children"
              filterOption={(input, option) =>
                option?.children?.toLowerCase()?.indexOf(input.toLowerCase()) >= 0
              }
            >
              {patients.map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.fullName.toUpperCase()} ({p.phone}) - {p.patientCode}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="serviceId"
                label="Dịch vụ quan tâm"
                rules={[{ required: true, message: 'Vui lòng chọn dịch vụ khám' }]}
              >
                <Select placeholder="Chọn dịch vụ khám">
                  {services.map((s) => (
                    <Option key={s.id} value={s.id}>{s.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="roomId"
                label="Phòng khám trước (Pre-book)"
              >
                <Select placeholder="Không bắt buộc" allowClear>
                  {rooms.map((r) => (
                    <Option key={r.id} value={r.id}>{r.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="doctorId"
            label="Bác sĩ khám chỉ định"
          >
            <Select placeholder="Bác sĩ điều trị (Không bắt buộc)" allowClear>
              {doctors.map((d) => (
                <Option key={d.id} value={d.id}>{d.fullName} ({d.nickname || 'Không có biệt danh'})</Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="appointmentDate"
                label="Ngày hẹn"
                rules={[{ required: true, message: 'Vui lòng chọn ngày hẹn' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="startTime"
                label="Giờ bắt đầu"
                rules={[
                  { required: true, message: 'Nhập giờ bắt đầu' },
                  { pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, message: 'Định dạng HH:MM' }
                ]}
              >
                <Input placeholder="09:00" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="endTime"
                label="Giờ kết thúc"
                rules={[
                  { required: true, message: 'Nhập giờ kết thúc' },
                  { pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, message: 'Định dạng HH:MM' }
                ]}
              >
                <Input placeholder="09:30" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Ghi chú lịch hẹn">
            <Input.TextArea placeholder="Mô tả triệu chứng bệnh nhân hoặc yêu cầu đặc biệt..." rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Check In Modal */}
      <CheckInModal
        visible={checkInVisible}
        onCancel={() => setCheckInVisible(false)}
        onSuccess={() => fetchAppointments()}
        appointment={activeCheckInAppointment}
        branchId={activeBranchId}
      />
    </div>
  );
}
