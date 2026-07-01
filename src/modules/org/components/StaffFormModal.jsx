import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col, message, Spin, Tabs, Upload, Card, Tag, Table, Button, Divider, Avatar, Switch } from 'antd';
import { 
  UserOutlined, 
  SafetyCertificateOutlined, 
  DeploymentUnitOutlined, 
  UploadOutlined, 
  LoadingOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  IdcardOutlined,
  CalendarOutlined,
  SolutionOutlined,
  DoubleRightOutlined,
  SaveOutlined,
  DeleteOutlined,
  StarOutlined,
  DisconnectOutlined,
  CompassOutlined,
  KeyOutlined,
  LockOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { staffService } from '../../../services/staffService';
import { medicalService } from '../../../services/medicalService';
import { roomService } from '../../../services/roomService';
import { orgService } from '../../../services/orgService';
import { authAdminService } from '../../../services/authAdminService';

const { Option } = Select;
const { TextArea } = Input;

const TITLE_CONFIGS = {
  DOCTOR: { color: '#1890ff', bg: '#e6f7ff', label: 'Bác sĩ' },
  NURSE: { color: '#13c2c2', bg: '#e6fffb', label: 'Điều dưỡng' },
  TECHNICIAN: { color: '#722ed1', bg: '#f9f0ff', label: 'Kỹ thuật viên' },
  RECEPTIONIST: { color: '#fa8c16', bg: '#fff7e6', label: 'Lễ tân' },
  ADMINISTRATOR: { color: '#f5222d', bg: '#fff1f0', label: 'Quản trị viên' },
  OTHER: { color: '#8c8c8c', bg: '#f5f5f5', label: 'Khác' },
};

export default function StaffFormModal({ visible, staff, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('profile');
  const [submitting, setSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [sigUploading, setSigUploading] = useState(false);
  
  // Live states to reflect on the left profile card
  const [avatarUrl, setAvatarUrl] = useState('');
  const [signatureScanUrl, setSignatureScanUrl] = useState('');
  const [fullName, setFullName] = useState('');
  const [staffCode, setStaffCode] = useState('');
  const [title, setTitle] = useState('DOCTOR');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  // Metadata & Assignments States
  const [rooms, setRooms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [filteredAssignRooms, setFilteredAssignRooms] = useState([]);
  
  // Sub-form States for Phân công (Assignments)
  const [assignBranchId, setAssignBranchId] = useState(undefined);
  const [assignRoomId, setAssignRoomId] = useState(undefined);
  const [assignSpecialtyId, setAssignSpecialtyId] = useState(undefined);
  const [assignIsPrimary, setAssignIsPrimary] = useState(false);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Credentials (Login) States
  const [roles, setRoles] = useState([]);
  const [userAccount, setUserAccount] = useState(null);

  const isEdit = !!staff;

  useEffect(() => {
    if (visible) {
      setActiveTab('profile');
      fetchMetadata();
      fetchRoles();
      if (staff) {
        fetchUserAccount(staff.userId);
        setAvatarUrl(staff.avatarUrl || '');
        setSignatureScanUrl(staff.certificate?.signatureScanUrl || '');
        setFullName(staff.fullName || '');
        setStaffCode(staff.staffCode || '');
        setTitle(staff.title || 'DOCTOR');
        setPhone(staff.phone || '');
        setEmail(staff.email || '');
        
        form.setFieldsValue({
          fullName: staff.fullName,
          dateOfBirth: staff.dateOfBirth ? dayjs(staff.dateOfBirth) : null,
          gender: staff.gender,
          identityNumber: staff.identityNumber,
          phone: staff.phone,
          email: staff.email,
          address: staff.address || '',
          staffCode: staff.staffCode,
          joinDate: staff.joinDate ? dayjs(staff.joinDate) : null,
          title: staff.title,
          nickname: staff.nickname || '',
          avatarUrl: staff.avatarUrl || '',
          academicTitle: staff.academicTitle || undefined,
          degree: staff.degree || undefined,
          
          // Certificate sub-fields
          certificateNumber: staff.certificate?.certificateNumber || '',
          issuedDate: staff.certificate?.issuedDate ? dayjs(staff.certificate.issuedDate) : null,
          expiryDate: staff.certificate?.expiryDate ? dayjs(staff.certificate.expiryDate) : null,
          issuedBy: staff.certificate?.issuedBy || '',
          scopeOfPractice: staff.certificate?.scopeOfPractice || '',
          signatureScanUrl: staff.certificate?.signatureScanUrl || '',
        });
      } else {
        form.resetFields();
        setAvatarUrl('');
        setSignatureScanUrl('');
        setFullName('');
        setStaffCode('');
        setTitle('DOCTOR');
        setPhone('');
        setEmail('');
        setUserAccount(null);
        form.setFieldsValue({
          gender: 'MALE',
          title: 'DOCTOR',
          joinDate: dayjs(),
        });
      }
    }
  }, [visible, staff, form]);

  const fetchRoles = async () => {
    try {
      const roleData = await authAdminService.getRoles();
      setRoles(roleData);
    } catch (err) {
      console.error('Không thể tải danh sách nhóm quyền:', err);
    }
  };

  const fetchUserAccount = async (userId) => {
    if (!userId) {
      setUserAccount(null);
      return;
    }
    try {
      const user = await authAdminService.getUserById(userId);
      setUserAccount(user);
      form.setFieldsValue({
        loginUsername: user.username || '',
        loginRoleId: user.roleId || undefined,
      });
    } catch (err) {
      console.error('Không thể tải thông tin tài khoản:', err);
      setUserAccount(null);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [roomList, branchList, specList] = await Promise.all([
        roomService.getRooms(),
        orgService.getBranches(),
        medicalService.getSpecialties()
      ]);
      setRooms(roomList);
      setBranches(branchList);
      setSpecialties(specList);

      // Pre-select first branch for assignment
      if (staff && branchList.length > 0) {
        const defaultBranchId = branchList[0].id;
        setAssignBranchId(defaultBranchId);
        const filtered = roomList.filter(r => r.branchId === defaultBranchId && r.isActive);
        setFilteredAssignRooms(filtered);

        const existing = staff.assignments?.find(a => a.branchId === defaultBranchId);
        if (existing) {
          setAssignRoomId(existing.roomId || undefined);
          setAssignSpecialtyId(existing.specialtyId || undefined);
          setAssignIsPrimary(existing.isPrimary);
        } else {
          setAssignRoomId(undefined);
          setAssignSpecialtyId(undefined);
          setAssignIsPrimary(false);
        }
      }
    } catch (err) {
      console.error('Không thể tải metadata cho StaffFormModal:', err);
    }
  };

  const handleAssignBranchChange = (value) => {
    setAssignBranchId(value);
    setAssignRoomId(undefined);
    const filtered = rooms.filter(r => r.branchId === value && r.isActive);
    setFilteredAssignRooms(filtered);

    // Look up if staff already has assignment in this branch to prefill
    const existing = staff?.assignments?.find(a => a.branchId === value);
    if (existing) {
      setAssignRoomId(existing.roomId || undefined);
      setAssignSpecialtyId(existing.specialtyId || undefined);
      setAssignIsPrimary(existing.isPrimary);
    } else {
      setAssignSpecialtyId(undefined);
      setAssignIsPrimary(false);
    }
  };

  const handleAvatarUpload = async (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Bạn chỉ có thể tải lên tệp ảnh!');
      return Upload.LIST_IGNORE;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('Ảnh phải nhỏ hơn 2MB!');
      return Upload.LIST_IGNORE;
    }

    try {
      setAvatarUploading(true);
      const res = await medicalService.uploadFile(file);
      if (res && res.url) {
        form.setFieldValue('avatarUrl', res.url);
        setAvatarUrl(res.url);
        message.success('Tải ảnh đại diện lên thành công');
      }
    } catch (err) {
      console.error(err);
      message.error('Tải ảnh đại diện thất bại');
    } finally {
      setAvatarUploading(false);
    }
    return false;
  };

  const handleSignatureUpload = async (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Bạn chỉ có thể tải lên tệp ảnh chữ ký!');
      return Upload.LIST_IGNORE;
    }
    try {
      setSigUploading(true);
      const res = await medicalService.uploadFile(file);
      if (res && res.url) {
        form.setFieldValue('signatureScanUrl', res.url);
        setSignatureScanUrl(res.url);
        message.success('Tải ảnh chữ ký lên thành công');
      }
    } catch (err) {
      console.error(err);
      message.error('Tải ảnh chữ ký thất bại');
    } finally {
      setSigUploading(false);
    }
    return false;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const staffPayload = {
        fullName: values.fullName,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
        gender: values.gender,
        identityNumber: values.identityNumber,
        phone: values.phone,
        email: values.email,
        address: values.address || null,
        title: values.title,
        avatarUrl: values.avatarUrl || null,
        academicTitle: values.academicTitle || null,
        degree: values.degree || null,
      };

      // Include credentials if provided
      if (values.loginUsername) staffPayload.username = values.loginUsername;
      if (values.loginPassword) staffPayload.password = values.loginPassword;
      if (values.loginRoleId) staffPayload.roleId = values.loginRoleId;

      let staffId = staff?.id;

      if (isEdit) {
        await staffService.updateStaff(staffId, staffPayload);
      } else {
        const createPayload = {
          ...staffPayload,
          staffCode: values.staffCode,
          joinDate: values.joinDate ? values.joinDate.format('YYYY-MM-DD') : null,
        };
        const newStaff = await staffService.createStaff(createPayload);
        staffId = newStaff.id;
      }

      // If clinical Doctor/Nurse/Technician has certificate info entered, save certificate as well
      const isClinicalTitle = ['DOCTOR', 'NURSE', 'TECHNICIAN'].includes(values.title);
      if (isClinicalTitle && values.certificateNumber) {
        const certPayload = {
          certificateNumber: values.certificateNumber,
          issuedDate: values.issuedDate ? values.issuedDate.format('YYYY-MM-DD') : null,
          expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : null,
          issuedBy: values.issuedBy,
          scopeOfPractice: values.scopeOfPractice,
          signatureScanUrl: values.signatureScanUrl || null,
        };
        await staffService.updateCertificate(staffId, certPayload);
      }

      message.success(isEdit ? 'Cập nhật hồ sơ nhân sự thành công' : 'Tạo hồ sơ nhân sự mới thành công');
      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') {
        message.error('Vui lòng kiểm tra lại các trường thông tin bắt buộc');
        return;
      }
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu hồ sơ nhân sự');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormValuesChange = (changed, all) => {
    if (changed.fullName !== undefined) setFullName(changed.fullName);
    if (changed.staffCode !== undefined) setStaffCode(changed.staffCode);
    if (changed.title !== undefined) setTitle(changed.title);
    if (changed.phone !== undefined) setPhone(changed.phone);
    if (changed.email !== undefined) setEmail(changed.email);
  };

  // Actions for Assignments
  const handleSaveAssignment = async () => {
    if (!assignBranchId) {
      message.error('Vui lòng chọn chi nhánh phân công');
      return;
    }
    try {
      setAssignSubmitting(true);

      const existing = staff.assignments?.find(
        (a) => a.branchId === assignBranchId && a.roomId === (assignRoomId || null)
      );

      const payload = {
        id: existing ? existing.id : undefined,
        branchId: assignBranchId,
        specialtyId: assignSpecialtyId || null,
        roomId: assignRoomId || null,
        isPrimary: assignIsPrimary,
      };
      await staffService.assignStaff(staff.id, payload);
      message.success('Cập nhật phân công công tác thành công');
      
      const updatedStaff = await staffService.getStaff(staff.id);
      staff.assignments = updatedStaff.assignments;
      onRefresh();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu phân công');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleSetPrimary = async (assign) => {
    try {
      const payload = {
        id: assign.id,
        branchId: assign.branchId,
        specialtyId: assign.specialtyId,
        roomId: assign.roomId,
        isPrimary: true,
      };
      await staffService.assignStaff(staff.id, payload);
      message.success('Đã đặt làm nơi làm việc chính');
      
      const updatedStaff = await staffService.getStaff(staff.id);
      staff.assignments = updatedStaff.assignments;
      onRefresh();
    } catch (err) {
      console.error(err);
      message.error('Đặt làm nơi làm việc chính thất bại');
    }
  };

  const handleClearRoom = async (assign) => {
    try {
      const payload = {
        id: assign.id,
        branchId: assign.branchId,
        specialtyId: null,
        roomId: null,
        isPrimary: false,
      };
      await staffService.assignStaff(staff.id, payload);
      message.success('Đã gỡ phòng làm việc khỏi chi nhánh này');
      
      const updatedStaff = await staffService.getStaff(staff.id);
      staff.assignments = updatedStaff.assignments;
      onRefresh();
    } catch (err) {
      console.error(err);
      message.error('Gỡ phòng làm việc thất bại');
    }
  };

  // Render assignments list table
  const renderAssignmentsTab = () => {
    if (!isEdit) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#fcfcfc', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
          <HomeOutlined style={{ fontSize: 48, marginBottom: 12, color: '#d9d9d9' }} />
          <div style={{ fontSize: '14px', color: '#8c8c8c', maxWidth: 500, margin: '0 auto', lineHeight: '1.5' }}>
            Nơi làm việc mặc định của nhân sự sẽ là chi nhánh hiện hành. Bạn có thể phân công chi tiết thêm phòng khám/chi nhánh khác sau khi tạo mới hồ sơ thành công.
          </div>
        </div>
      );
    }

    const list = staff?.assignments || [];

    const columns = [
      {
        title: 'Cơ sở làm việc',
        dataIndex: 'branchId',
        key: 'branchId',
        width: '35%',
        render: (branchId) => {
          const b = branches.find(item => item.id === branchId);
          return b ? (
            <span style={{ fontWeight: 600, color: '#262626' }}>{b.name}</span>
          ) : (
            <span style={{ color: '#8c8c8c' }}>Chi nhánh mặc định</span>
          );
        },
      },
      {
        title: 'Phòng khám / Phòng chuyên môn',
        dataIndex: 'roomId',
        key: 'roomId',
        width: '40%',
        render: (roomId) => {
          if (!roomId) return <span style={{ color: '#bfbfbf', fontSize: '13px' }}>Chưa gán phòng (Chờ phân công)</span>;
          const r = rooms.find(item => item.id === roomId);
          return r ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag color="purple" style={{ border: 'none', fontWeight: 500, fontSize: '12px', padding: '2px 8px' }}>{r.name}</Tag>
              <span style={{ color: '#8c8c8c', background: '#f5f5f5', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>Mã: {r.code}</span>
            </div>
          ) : (
            <span style={{ color: '#8c8c8c' }}>Mã phòng: {roomId.substring(0, 8)}...</span>
          );
        }
      },
      {
        title: 'Vai trò',
        dataIndex: 'isPrimary',
        key: 'isPrimary',
        width: '12%',
        render: (isPrimary) => isPrimary ? (
          <Tag color="blue" style={{ borderRadius: '4px', fontWeight: 600 }}>Cơ sở chính</Tag>
        ) : (
          <Tag color="default" style={{ borderRadius: '4px' }}>Kiêm nhiệm</Tag>
        )
      },
      {
        title: 'Hành động',
        key: 'actions',
        width: '13%',
        render: (_, record) => (
          <div style={{ display: 'flex', gap: '10px' }}>
            {!record.isPrimary && (
              <Button 
                type="link" 
                size="small" 
                icon={<StarOutlined />}
                onClick={() => handleSetPrimary(record)}
                style={{ padding: 0, fontSize: '12px' }}
              >
                Đặt làm chính
              </Button>
            )}
            {record.roomId && (
              <Button 
                type="link" 
                danger 
                size="small" 
                icon={<DisconnectOutlined />}
                onClick={() => handleClearRoom(record)}
                style={{ padding: 0, fontSize: '12px' }}
              >
                Gỡ phòng
              </Button>
            )}
          </div>
        )
      }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Assignment Form Section */}
        <Card 
          size="small" 
          bordered={false} 
          bodyStyle={{ padding: '16px' }}
          style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '12px' }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1890ff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CompassOutlined /> Thêm mới / Cập nhật phân công công tác
          </div>
          
          <Row gutter={[12, 12]} align="bottom">
            <Col xs={24} sm={8}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: 6 }}>Chọn Chi nhánh</div>
              <Select 
                style={{ width: '100%' }} 
                placeholder="Chọn chi nhánh" 
                value={assignBranchId}
                onChange={handleAssignBranchChange}
              >
                {branches.map(b => (
                  <Option key={b.id} value={b.id}>{b.name}</Option>
                ))}
              </Select>
            </Col>
            
            <Col xs={24} sm={8}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: 6 }}>Phòng làm việc</div>
              <Select 
                style={{ width: '100%' }} 
                placeholder="Chọn phòng làm việc" 
                value={assignRoomId}
                onChange={setAssignRoomId}
                allowClear
              >
                {filteredAssignRooms.map(r => (
                  <Option key={r.id} value={r.id}>{r.name} ({r.code})</Option>
                ))}
              </Select>
            </Col>

            <Col xs={12} sm={4} style={{ textAlign: 'center', paddingBottom: 6 }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: 6 }}>Cơ sở chính?</div>
              <Switch checked={assignIsPrimary} onChange={setAssignIsPrimary} checkedChildren="Có" unCheckedChildren="Không" />
            </Col>

            <Col xs={12} sm={4}>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleSaveAssignment}
                loading={assignSubmitting}
                style={{ width: '100%', borderRadius: '8px' }}
              >
                Áp dụng
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Existing Assignments Table Section */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#262626', marginBottom: 8 }}>
            Danh sách địa điểm công tác hiện tại
          </div>
          <Table 
            dataSource={list} 
            columns={columns} 
            rowKey="id" 
            size="middle" 
            pagination={false} 
            bordered
            locale={{ emptyText: 'Nhân viên này chưa có phân công nào' }}
            style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
          />
        </div>
      </div>
    );
  };

  const titleConfig = TITLE_CONFIGS[title] || TITLE_CONFIGS.OTHER;

  const tabItems = [
    {
      key: 'profile',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500 }}>
          <UserOutlined />
          Thông tin cơ bản
        </span>
      ),
      children: (
        <Row gutter={[24, 24]} style={{ marginTop: 16 }}>
          {/* Avatar Upload Left Side Panel */}
          <Col xs={24} sm={7} style={{ textAlign: 'center' }}>
            <Card
              bordered={false}
              style={{
                background: 'linear-gradient(180deg, #f5f7fa 0%, #e4e8eb 100%)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                borderRadius: '16px',
                padding: '24px 12px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start'
              }}
            >
              <Form.Item name="avatarUrl" noStyle>
                <Input type="hidden" />
              </Form.Item>
              
              {/* Profile Avatar with Hover Circle */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
                <div 
                  style={{ 
                    width: 140, 
                    height: 140, 
                    borderRadius: '50%', 
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '4px solid #fff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {avatarUploading ? (
                    <LoadingOutlined style={{ fontSize: 36, color: '#1890ff' }} />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserOutlined style={{ fontSize: 72, color: '#d9d9d9' }} />
                  )}
                </div>
                <Upload
                  showUploadList={false}
                  beforeUpload={handleAvatarUpload}
                  disabled={avatarUploading}
                >
                  <Button 
                    size="middle" 
                    shape="circle" 
                    icon={<UploadOutlined />} 
                    style={{ 
                      position: 'absolute', 
                      bottom: 4, 
                      right: 12, 
                      boxShadow: '0 4px 12px rgba(24,144,255,0.4)',
                      background: '#1890ff',
                      color: '#fff',
                      border: 'none',
                      width: 36,
                      height: 36
                    }} 
                  />
                </Upload>
              </div>

              {/* Live Info Preview */}
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#262626' }}>
                {fullName || 'Chưa nhập họ tên'}
              </h3>
              
              <div style={{ marginBottom: 24 }}>
                <Tag color={titleConfig.color} style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '20px', border: 'none', fontWeight: 600, color: titleConfig.color, background: titleConfig.bg }}>
                  {titleConfig.label}
                </Tag>
                {staffCode && (
                  <Tag color="default" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 500, marginLeft: 6 }}>
                    {staffCode}
                  </Tag>
                )}
              </div>

              <Divider style={{ margin: '16px 0', borderColor: '#d9d9d9' }} />

              {/* Quick Contacts */}
              <div style={{ textAlign: 'left', width: '100%', padding: '0 8px' }}>
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <PhoneOutlined style={{ color: '#1890ff', fontSize: 14 }} />
                  <span style={{ fontSize: '13px', color: '#595959' }}>{phone || '-'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MailOutlined style={{ color: '#1890ff', fontSize: 14 }} />
                  <span style={{ fontSize: '13px', color: '#595959', wordBreak: 'break-all' }}>{email || '-'}</span>
                </div>
              </div>
            </Card>
          </Col>

          {/* Form Fields Right Side */}
          <Col xs={24} sm={17}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Personal Info Card */}
              <Card 
                bordered={false} 
                bodyStyle={{ padding: '20px' }}
                style={{ border: '1px solid #f0f0f0', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#1890ff', fontWeight: 600, fontSize: '14px' }}>
                  <SolutionOutlined /> Thông tin cá nhân
                </div>
                
                <Row gutter={[16, 16]}>
                  <Col span={16}>
                    <Form.Item
                      label={<span style={{ fontWeight: 500 }}>Họ tên</span>}
                      name="fullName"
                      rules={[{ required: true, message: 'Vui lòng điền họ tên nhân sự' }]}
                    >
                      <Input placeholder="Ví dụ: BS. Trần Hữu Nam" style={{ borderRadius: '8px' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      label={<span style={{ fontWeight: 500 }}>Mã nhân viên</span>}
                      name="staffCode"
                      rules={[
                        { required: true, message: 'Vui lòng điền mã NV' },
                        { pattern: /^[A-Z0-9_]+$/, message: 'Mã chỉ gồm chữ in hoa, số' }
                      ]}
                    >
                      <Input placeholder="NV0001" disabled={isEdit} style={{ borderRadius: '8px' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <Form.Item
                      label={<span style={{ fontWeight: 500 }}>Giới tính</span>}
                      name="gender"
                      rules={[{ required: true, message: 'Chọn giới tính' }]}
                    >
                      <Select style={{ borderRadius: '8px' }}>
                        <Option value="MALE">Nam</Option>
                        <Option value="FEMALE">Nữ</Option>
                        <Option value="OTHER">Khác</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      label={<span style={{ fontWeight: 500 }}>Ngày sinh</span>}
                      name="dateOfBirth"
                      rules={[{ required: true, message: 'Chọn ngày sinh' }]}
                    >
                      <DatePicker style={{ width: '100%', borderRadius: '8px' }} format="DD/MM/YYYY" placeholder="Chọn ngày sinh" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label={<span style={{ fontWeight: 500 }}>CCCD</span>}
                      name="identityNumber"
                      rules={[
                        { required: true, message: 'Vui lòng điền số định danh' },
                        { pattern: /^[0-9]+$/, message: 'Số CCCD chỉ chứa chữ số' }
                      ]}
                    >
                      <Input placeholder="CCCD 12 số" style={{ borderRadius: '8px' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Position & Speciality Card */}
              <Card 
                bordered={false} 
                bodyStyle={{ padding: '20px' }}
                style={{ border: '1px solid #f0f0f0', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#1890ff', fontWeight: 600, fontSize: '14px' }}>
                  <SafetyCertificateOutlined /> Chức danh & Chuyên môn
                </div>

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item
                      label={<span style={{ fontWeight: 500 }}>Chức danh công việc</span>}
                      name="title"
                      rules={[{ required: true, message: 'Chọn chức danh' }]}
                    >
                      <Select onChange={() => form.setFieldsValue({ nickname: '' })} style={{ borderRadius: '8px' }}>
                        <Option value="DOCTOR">Bác sĩ (DOCTOR)</Option>
                        <Option value="NURSE">Điều dưỡng (NURSE)</Option>
                        <Option value="TECHNICIAN">Kỹ thuật viên (TECHNICIAN)</Option>
                        <Option value="RECEPTIONIST">Lễ tân (RECEPTIONIST)</Option>
                        <Option value="ADMINISTRATOR">Quản trị viên (ADMINISTRATOR)</Option>
                        <Option value="OTHER">Khác (OTHER)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label={<span style={{ fontWeight: 500 }}>Ngày vào làm chính thức</span>}
                      name="joinDate"
                      rules={[{ required: true, message: 'Chọn ngày vào làm' }]}
                    >
                      <DatePicker style={{ width: '100%', borderRadius: '8px' }} format="DD/MM/YYYY" placeholder="Chọn ngày vào làm" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item label={<span style={{ fontWeight: 500 }}>Học hàm</span>} name="academicTitle">
                      <Select placeholder="Chọn học hàm" allowClear style={{ borderRadius: '8px' }}>
                        <Option value="GS">Giáo sư (GS)</Option>
                        <Option value="PGS">Phó Giáo sư (PGS)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={<span style={{ fontWeight: 500 }}>Học vị</span>} name="degree">
                      <Select placeholder="Chọn học vị" allowClear style={{ borderRadius: '8px' }}>
                        <Option value="BS">Bác sĩ (BS)</Option>
                        <Option value="ThS">Thạc sĩ (ThS)</Option>
                        <Option value="TS">Tiến sĩ (TS)</Option>
                        <Option value="BSCKI">Bác sĩ CKI (BSCKI)</Option>
                        <Option value="BSCKII">Bác sĩ CKII (BSCKII)</Option>
                        <Option value="CN">Cử nhân (CN)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Contact Info Card */}
              <Card 
                bordered={false} 
                bodyStyle={{ padding: '20px' }}
                style={{ border: '1px solid #f0f0f0', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#1890ff', fontWeight: 600, fontSize: '14px' }}>
                  <PhoneOutlined /> Thông tin liên hệ
                </div>

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item
                      label={<span style={{ fontWeight: 500 }}>Số điện thoại liên lạc</span>}
                      name="phone"
                      rules={[
                        { required: true, message: 'Vui lòng điền số điện thoại' },
                        { pattern: /^[0-9+]+$/, message: 'Số điện thoại không hợp lệ' }
                      ]}
                    >
                      <Input prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />} placeholder="SĐT liên hệ di động" style={{ borderRadius: '8px' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label={<span style={{ fontWeight: 500 }}>Email</span>}
                      name="email"
                      rules={[
                        { required: true, message: 'Vui lòng điền Email' },
                        { type: 'email', message: 'Email không hợp lệ' }
                      ]}
                    >
                      <Input prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} placeholder="Email liên hệ" style={{ borderRadius: '8px' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label={<span style={{ fontWeight: 500 }}>Địa chỉ thường trú</span>}
                  name="address"
                >
                  <Input prefix={<EnvironmentOutlined style={{ color: '#bfbfbf' }} />} placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/TP" style={{ borderRadius: '8px' }} />
                </Form.Item>
              </Card>
            </div>
          </Col>
        </Row>
      )
    },
    {
      key: 'certificate',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500 }}>
          <SafetyCertificateOutlined />
          Chứng chỉ & Chữ ký
        </span>
      ),
      children: (
        <Row gutter={[24, 24]} style={{ marginTop: 16 }}>
          {/* Certificate fields */}
          <Col xs={24} sm={16}>
            <Card 
              title={
                <span style={{ fontSize: '14px', fontWeight: 600 }}>
                  Thông tin chứng chỉ hành nghề y khoa
                </span>
              } 
              size="small" 
              bordered={false} 
              style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    label={<span style={{ fontWeight: 500 }}>Số chứng chỉ hành nghề</span>}
                    name="certificateNumber"
                  >
                    <Input placeholder="Ví dụ: 12345/BYT-CCHN" style={{ borderRadius: '8px' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<span style={{ fontWeight: 500 }}>Cơ quan có thẩm quyền cấp</span>}
                    name="issuedBy"
                  >
                    <Input placeholder="Ví dụ: Bộ Y Tế" style={{ borderRadius: '8px' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    label={<span style={{ fontWeight: 500 }}>Ngày cấp phép</span>}
                    name="issuedDate"
                  >
                    <DatePicker style={{ width: '100%', borderRadius: '8px' }} format="DD/MM/YYYY" placeholder="Chọn ngày cấp" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<span style={{ fontWeight: 500 }}>Ngày hết hiệu lực</span>}
                    name="expiryDate"
                  >
                    <DatePicker style={{ width: '100%', borderRadius: '8px' }} format="DD/MM/YYYY" placeholder="Bỏ trống nếu vô thời hạn" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label={<span style={{ fontWeight: 500 }}>Phạm vi hoạt động chuyên môn cho phép</span>}
                name="scopeOfPractice"
              >
                <TextArea rows={4} placeholder="Mô tả cụ thể phạm vi hoạt động chuyên khoa được cấp phép ghi trên chứng chỉ..." style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Card>
          </Col>

          {/* Signature Scan Area */}
          <Col xs={24} sm={8}>
            <Form.Item name="signatureScanUrl" noStyle>
              <Input type="hidden" />
            </Form.Item>
            <Card 
              title={
                <span style={{ fontSize: '14px', fontWeight: 600 }}>
                  Chữ ký số bác sĩ
                </span>
              } 
              size="small" 
              bordered={false} 
              style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', textAlign: 'center' }}
            >
              <div 
                style={{ 
                  height: 160, 
                  border: '2px dashed #d9d9d9', 
                  borderRadius: '12px', 
                  background: '#fafafa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  overflow: 'hidden',
                  padding: 8,
                  position: 'relative'
                }}
              >
                {sigUploading ? (
                  <LoadingOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                ) : signatureScanUrl ? (
                  <img src={signatureScanUrl} alt="Chữ ký" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 13, color: '#bfbfbf' }}>Chưa cập nhật ảnh chữ ký</span>
                )}
              </div>
              <Upload
                showUploadList={false}
                beforeUpload={handleSignatureUpload}
                disabled={sigUploading}
              >
                <Button size="middle" icon={<UploadOutlined />} style={{ width: '100%', borderRadius: '8px' }}>
                  Tải lên ảnh chữ ký
                </Button>
              </Upload>
              <div style={{ marginTop: 12, fontSize: 11, color: '#bfbfbf', textAlign: 'left', lineHeight: '1.4' }}>
                * Khuyến nghị: Sử dụng ảnh nét vẽ rõ ràng trên nền trong suốt (tệp PNG) để hiển thị đẹp nhất trên đơn thuốc/hóa đơn.
              </div>
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'credentials',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500 }}>
          <KeyOutlined />
          Thông tin đăng nhập
        </span>
      ),
      children: (
        <div style={{ marginTop: 16 }}>
          <Card
            bordered={false}
            bodyStyle={{ padding: '24px' }}
            style={{ border: '1px solid #f0f0f0', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, color: '#1890ff', fontWeight: 600, fontSize: '14px' }}>
              <LockOutlined /> Tài khoản đăng nhập hệ thống
            </div>

            {userAccount && (
              <div style={{ marginBottom: 16, padding: '10px 16px', background: '#e6f7ff', borderRadius: '8px', fontSize: '13px', border: '1px solid #91d5ff' }}>
                Nhân sự này đã có tài khoản đăng nhập. Bỏ trống trường mật khẩu nếu không cần đổi.
              </div>
            )}

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ fontWeight: 500 }}>Tên đăng nhập (Username)</span>}
                  name="loginUsername"
                  rules={[
                    { min: 3, message: 'Username phải từ 3 ký tự trở lên' },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder="Để trống nếu chưa tạo tài khoản"
                    style={{ borderRadius: '8px' }}
                    autoComplete="off"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ fontWeight: 500 }}>Nhóm quyền (Role)</span>}
                  name="loginRoleId"
                >
                  <Select
                    placeholder="Chọn nhóm quyền"
                    allowClear
                    style={{ borderRadius: '8px' }}
                  >
                    {roles.filter(r => r.name !== 'PATIENT').map(r => (
                      <Option key={r.id} value={r.id}>{r.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ fontWeight: 500 }}>{userAccount ? 'Mật khẩu mới (bỏ trống nếu giữ nguyên)' : 'Mật khẩu'}</span>}
                  name="loginPassword"
                  rules={[
                    { min: 6, message: 'Mật khẩu phải từ 6 ký tự trở lên' },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                    placeholder={userAccount ? 'Bỏ trống nếu giữ nguyên' : 'Nhập mật khẩu'}
                    style={{ borderRadius: '8px' }}
                    autoComplete="new-password"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ fontWeight: 500 }}>Email đăng nhập</span>}
                >
                  <Input
                    value={email || ''}
                    disabled
                    prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                    style={{ borderRadius: '8px', background: '#fafafa' }}
                  />
                  <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
                    Email đăng nhập được lấy từ thông tin cơ bản của nhân sự.
                  </div>
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </div>
      )
    },
    {
      key: 'assignments',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500 }}>
          <DeploymentUnitOutlined />
          Nơi làm việc
        </span>
      ),
      children: renderAssignmentsTab()
    }
  ];

  return (
    <Modal
      title={
        <div style={{ fontSize: '17px', fontWeight: 600, color: '#262626', display: 'flex', alignItems: 'center', gap: 6 }}>
          <UserOutlined style={{ color: '#1890ff' }} />
          {isEdit ? `Chi tiết hồ sơ nhân sự: ${fullName || 'Nhân viên'} [${staffCode || '-'}]` : 'Thêm mới hồ sơ nhân viên'}
        </div>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      destroyOnClose
      width={980}
      styles={{ body: { padding: '12px 24px 20px 24px', background: '#f8f9fa' } }}
      okButtonProps={{
        style: {
          borderRadius: '8px',
          fontWeight: 500,
          background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
          border: 'none',
          minWidth: 100,
          height: 36
        }
      }}
      cancelButtonProps={{
        style: {
          borderRadius: '8px',
          minWidth: 100,
          height: 36
        }
      }}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        items={tabItems} 
        size="large"
        style={{ marginBottom: 12 }}
      />
    </Modal>
  );
}
