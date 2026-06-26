import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Input, Space, Tag, Modal, Form, Select, DatePicker, Typography, message, Tooltip, Row, Col, Divider } from 'antd';
import { PlusOutlined, SearchOutlined, ScanOutlined, EditOutlined, MedicineBoxOutlined } from '@ant-design/icons';
import { patientService } from '../../../services/patientService';
import CheckInModal from '../components/CheckInModal';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;
const { Option } = Select;

export default function PatientManagementPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [searchText, setSearchText] = useState('');

  // Modals
  const [formVisible, setFormVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [checkInVisible, setCheckInVisible] = useState(false);
  const [checkInPatient, setCheckInPatient] = useState(null);

  const activeBranchId = localStorage.getItem('activeBranchId');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async (query = '') => {
    try {
      setLoading(true);
      const list = await patientService.getPatients(query);
      setData(list);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách hồ sơ bệnh nhân');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchPatients(searchText);
  };

  const handleAdd = () => {
    setSelectedPatient(null);
    form.resetFields();
    form.setFieldsValue({ gender: 'MALE' });
    setFormVisible(true);
  };

  const handleEdit = (record) => {
    setSelectedPatient(record);
    form.resetFields();
    form.setFieldsValue({
      ...record,
      dob: dayjs(record.dob),
    });
    setFormVisible(true);
  };

  const handleCheckIn = (patient) => {
    setCheckInPatient(patient);
    setCheckInVisible(true);
  };

  // Simulate scanning citizen ID card QR code
  const handleSimulateQRScan = () => {
    message.loading('Đang quét mã QR trên Thẻ Căn cước công dân...', 1.5);
    setTimeout(() => {
      // Mock CCCD details: 12-digit ID|Full name|DOB (DDMMYYYY)|Gender|Address
      const mockScanStr = '037088998877|Nguyễn Văn Thành|25091992|Nam|254 Minh Khai, Vĩnh Tuy, Hai Bà Trưng, Hà Nội';
      const parts = mockScanStr.split('|');

      const cccdNumber = parts[0];
      const fullName = parts[1];

      // Parse DOB DDMMYYYY to YYYY-MM-DD
      const rawDob = parts[2];
      const dobFormatted = `${rawDob.substring(4, 8)}-${rawDob.substring(2, 4)}-${rawDob.substring(0, 2)}`;

      const gender = parts[3] === 'Nam' ? 'MALE' : 'FEMALE';
      const address = parts[4];

      form.setFieldsValue({
        cccd: cccdNumber,
        fullName,
        dob: dayjs(dobFormatted),
        gender,
        address,
      });
      message.success('Đã quét thành công và điền tự động dữ liệu CCCD!');
    }, 1500);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      const payload = {
        ...values,
        dob: values.dob.format('YYYY-MM-DD'),
      };

      if (selectedPatient) {
        await patientService.updatePatient(selectedPatient.id, payload);
        message.success('Cập nhật hồ sơ bệnh nhân thành công!');
      } else {
        await patientService.createPatient(payload);
        message.success('Tạo hồ sơ bệnh nhân mới thành công!');
      }
      setFormVisible(false);
      fetchPatients();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lưu thông tin bệnh nhân thất bại');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Mã bệnh nhân',
      dataIndex: 'patientCode',
      key: 'patientCode',
      render: (code) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text) => <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{text}</span>,
    },
    {
      title: 'Ngày sinh',
      dataIndex: 'dob',
      key: 'dob',
      render: (dob) => {
        const d = new Date(dob);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      },
    },
    {
      title: 'Giới tính',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender) => (
        <Tag color={gender === 'MALE' ? 'cyan' : gender === 'FEMALE' ? 'pink' : 'purple'}>
          {gender === 'MALE' ? 'Nam' : gender === 'FEMALE' ? 'Nữ' : 'Khác'}
        </Tag>
      ),
    },
    {
      title: 'Số CCCD',
      dataIndex: 'cccd',
      key: 'cccd',
      render: (text) => text ? <Tag color="blue">{text}</Tag> : '-',
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      render: (text) => text || '-',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa hồ sơ">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Đón tiếp khám ngay (Check-in)">
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
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px', background: '#f5f5f5', minHeight: 'calc(100vh - 48px)' }}>
      <div style={{ marginBottom: '16px', maxWidth: 1200, margin: '0 auto 16px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Hồ sơ Bệnh nhân</Title>
          <Paragraph style={{ margin: 0, color: '#8c8c8c', fontSize: '12px' }}>
            Quản lý thông tin hồ sơ y tế hành chính của khách hàng, tích hợp đón tiếp nhanh và điều phối khám chữa bệnh.
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          size="small"
          style={{ backgroundColor: '#059669', borderColor: '#059669' }}
        >
          Thêm bệnh nhân
        </Button>
      </div>

      <Card size="small" style={{ maxWidth: 1200, margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Space style={{ marginBottom: 16 }} size="small">
          <Input
            placeholder="Tìm theo tên, SĐT, CCCD, mã BN..."
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            size="small"
            suffix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          />
          <Button type="primary" onClick={handleSearch} size="small" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}>
            Tìm kiếm
          </Button>
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

      <Modal
        title={selectedPatient ? 'Chỉnh sửa hồ sơ bệnh nhân' : 'Đăng ký bệnh nhân mới'}
        open={formVisible}
        onCancel={() => setFormVisible(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={650}
        okText="Lưu thông tin"
        cancelText="Đóng"
        size="small"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            {(selectedPatient?.phone?.startsWith('GOOGLE-') || selectedPatient?.dob === '1900-01-01') && (
              <Tag color="warning" style={{ fontSize: '11px', padding: '4px 8px' }}>
                🔑 Tài khoản liên kết Google (Chưa hoàn tất hồ sơ)
              </Tag>
            )}
          </div>
          <Button
            type="dashed"
            icon={<ScanOutlined />}
            size="small"
            onClick={handleSimulateQRScan}
            style={{ color: '#059669', borderColor: '#059669' }}
          >
            Quét CCCD (Demo)
          </Button>
        </div>

        {(selectedPatient?.phone?.startsWith('GOOGLE-') || selectedPatient?.dob === '1900-01-01') && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4, color: '#d46b08', fontSize: '12px', lineHeight: '1.5' }}>
            <strong>Lưu ý tiếp đón:</strong> Bệnh nhân đăng nhập qua Google chưa hoàn tất thông tin cá nhân.
            {selectedPatient?.phone?.startsWith('GOOGLE-') && <div>• Số điện thoại hiện là ID Google tạm thời: <i>{selectedPatient.phone}</i>. Cần lấy SĐT thật của khách.</div>}
            {selectedPatient?.dob === '1900-01-01' && <div>• Ngày sinh hiện là mặc định (01/01/1900). Cần cập nhật lại ngày sinh thật.</div>}
          </div>
        )}

        <Form form={form} layout="vertical" size="small">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="cccd"
                label="Số CCCD"
                rules={[{ required: true, message: 'Vui lòng nhập số CCCD!' }]}
              >
                <Input placeholder="CCCD 12 số" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="fullName"
                label="Họ và tên bệnh nhân"
                rules={[{ required: true, message: 'Vui lòng nhập tên bệnh nhân' }]}
              >
                <Input placeholder="Họ và tên viết hoa có dấu" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="dob"
                label="Ngày sinh"
                rules={[{ required: true, message: 'Vui lòng chọn ngày sinh' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="gender"
                label="Giới tính"
                rules={[{ required: true, message: 'Vui lòng chọn giới tính' }]}
              >
                <Select>
                  <Option value="MALE">Nam</Option>
                  <Option value="FEMALE">Nữ</Option>
                  <Option value="OTHER">Khác</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="phone"
                label="Số điện thoại liên hệ"
                rules={[
                  { required: true, message: 'Vui lòng nhập số điện thoại' },
                  { pattern: /^[0-9]{10}$/, message: 'Số điện thoại gồm 10 chữ số' },
                ]}
              >
                <Input placeholder="Số điện thoại di động" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="email" label="Email">
                <Input type="email" placeholder="example@gmail.com" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="address" label="Địa chỉ liên hệ">
                <Input placeholder="Số nhà, đường/phố, quận/huyện..." />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '8px 0' }}><small style={{ color: '#8c8c8c' }}>Người Giám Hộ (Nếu có)</small></Divider>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="guardianName" label="Họ tên người giám hộ">
                <Input placeholder="Bố, mẹ hoặc người bảo hộ" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="guardianPhone" label="Số điện thoại">
                <Input placeholder="Số điện thoại di động" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="guardianRelation" label="Quan hệ">
                <Input placeholder="Ví dụ: Bố, Mẹ, Anh..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Check In Modal */}
      <CheckInModal
        visible={checkInVisible}
        onCancel={() => setCheckInVisible(false)}
        onSuccess={() => fetchPatients()}
        patient={checkInPatient}
        branchId={activeBranchId}
      />
    </div>
  );
}
