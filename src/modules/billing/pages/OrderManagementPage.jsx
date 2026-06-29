import React, { useEffect, useState } from 'react';
import {
  Row, Col, Card, Table, Button, Form, Select, InputNumber,
  Input, Space, Tag, Typography, message, Divider, Tooltip, Empty, Alert, Modal, Badge
} from 'antd';
import {
  MedicineBoxOutlined, SearchOutlined, CheckCircleOutlined,
  DeleteOutlined, PlusOutlined, UserOutlined, PlayCircleOutlined,
  ArrowRightOutlined, CompassOutlined, FileTextOutlined, EditOutlined
} from '@ant-design/icons';
import { visitService } from '../../../services/visitService';
import { medicalService } from '../../../services/medicalService';
import { billingService } from '../../../services/billingService';
import { authAdminService } from '../../../services/authAdminService';
import { attendanceService } from '../../../services/attendanceService';
import { roomService } from '../../../services/roomService';
import { staffService } from '../../../services/staffService';

const { Title, Text } = Typography;
const { Option } = Select;

const getPaymentStatusTag = (item) => (
  item.isPaid
    ? <Tag color="green" style={{ margin: 0, fontSize: 10 }}>Đã thu</Tag>
    : <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>Chưa thu</Tag>
);

const getExecutionStatusTag = (item) => {
  if (item.status === 'COMPLETED') {
    return <Tag color="green" style={{ margin: 0, fontSize: 10 }}>Đã thực hiện</Tag>;
  }
  if (item.status === 'IN_PROGRESS') {
    return <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>Đang thực hiện</Tag>;
  }
  if (item.status === 'CANCELLED') {
    return <Tag color="red" style={{ margin: 0, fontSize: 10 }}>Đã hủy</Tag>;
  }
  return <Tag color="gold" style={{ margin: 0, fontSize: 10 }}>Chờ thực hiện</Tag>;
};

const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getActivePriceObjectAtDate = (prices, targetDate) => {
  if (!prices || prices.length === 0) return null;
  const listedPrices = prices.filter(p => p.priceType === 'LISTED');
  if (listedPrices.length === 0) {
    return prices[0] || null;
  }
  
  const targetTime = new Date(targetDate).setHours(0, 0, 0, 0);
  
  const eligiblePrices = listedPrices.filter(p => {
    const effTime = new Date(p.effectiveDate).setHours(0, 0, 0, 0);
    return effTime <= targetTime;
  });
  
  if (eligiblePrices.length === 0) {
    const sorted = [...listedPrices].sort((a, b) => 
      new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    );
    return sorted[0];
  }
  
  const sorted = eligiblePrices.sort((a, b) => 
    new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );
  return sorted[0];
};

const WORKLIST_SCOPES = {
  OPEN: [
    'WAITING_CLINICAL_EXAM',
    'WAITING_SERVICE',
    'WAITING_CONCLUSION',
    'IN_CLINICAL_EXAM',
    'IN_SERVICE',
    'IN_CONCLUSION',
    'CLINICAL_EXAM_DONE',
    'ALL_SERVICES_DONE',
    'WAITING_RESULTS',
  ],
  ACCEPTED: [
    'IN_CLINICAL_EXAM',
    'IN_SERVICE',
    'IN_CONCLUSION',
    'CLINICAL_EXAM_DONE',
    'ALL_SERVICES_DONE',
    'WAITING_RESULTS',
    'COMPLETED',
  ],
  DONE: ['COMPLETED'],
};

const getVisitStatusTag = (status) => {
  switch (status) {
    case 'WAITING_CLINICAL_EXAM':
      return <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>Chờ khám lâm sàng</Tag>;
    case 'IN_CLINICAL_EXAM':
      return <Tag color="geekblue" style={{ margin: 0, fontSize: 10 }}>Đang khám lâm sàng</Tag>;
    case 'CLINICAL_EXAM_DONE':
      return <Tag color="cyan" style={{ margin: 0, fontSize: 10 }}>Đã khám lâm sàng</Tag>;
    case 'WAITING_SERVICE':
      return <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>Chờ làm dịch vụ</Tag>;
    case 'IN_SERVICE':
      return <Tag color="magenta" style={{ margin: 0, fontSize: 10 }}>Đang làm dịch vụ</Tag>;
    case 'ALL_SERVICES_DONE':
      return <Tag color="green" style={{ margin: 0, fontSize: 10 }}>Đã xong dịch vụ</Tag>;
    case 'WAITING_RESULTS':
      return <Tag color="warning" style={{ margin: 0, fontSize: 10 }}>Chờ kết quả</Tag>;
    case 'WAITING_CONCLUSION':
      return <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>Chờ kết luận</Tag>;
    case 'IN_CONCLUSION':
      return <Tag color="volcano" style={{ margin: 0, fontSize: 10 }}>Đang kết luận</Tag>;
    case 'COMPLETED':
      return <Tag color="success" style={{ margin: 0, fontSize: 10 }}>Hoàn thành</Tag>;
    case 'CANCELLED':
      return <Tag color="error" style={{ margin: 0, fontSize: 10 }}>Đã hủy</Tag>;
    default:
      return <Tag style={{ margin: 0, fontSize: 10 }}>{status}</Tag>;
  }
};

export default function OrderManagementPage() {
  const [visits, setVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [searchVisitText, setSearchVisitText] = useState('');
  const [worklistDate, setWorklistDate] = useState(getTodayStr());
  const [serviceFilterId, setServiceFilterId] = useState(undefined);
  const [worklistScope, setWorklistScope] = useState('OPEN');
  const [selectedVisit, setSelectedVisit] = useState(null);
  
  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const [specialties, setSpecialties] = useState([]);
  const [services, setServices] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const [form] = Form.useForm();
  const [addingItem, setAddingItem] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [activeAttendances, setActiveAttendances] = useState([]);
  
  const [rooms, setRooms] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [roomDoctors, setRoomDoctors] = useState([]);
  const [loadingRoomDoctors, setLoadingRoomDoctors] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(undefined);
  const [transferVisible, setTransferVisible] = useState(false);
  const [formTransfer] = Form.useForm();
  const [savingTransfer, setSavingTransfer] = useState(false);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState(null);
  const [resultNotes, setResultNotes] = useState('');
  
  const [activeBranchId, setActiveBranchId] = useState(localStorage.getItem('activeBranchId'));

  useEffect(() => {
    loadSpecialties();
    loadServiceFilterOptions();
  }, []);

  useEffect(() => {
    loadUserProfile();
    loadMetadata();
    setSelectedVisit(null);
    setOrder(null);
  }, [activeBranchId]);

  useEffect(() => {
    fetchVisits();
  }, [activeBranchId, currentUser?.staff?.id, currentUser?.roleName, worklistDate, serviceFilterId]);

  useEffect(() => {
    const handleBranchChange = () => {
      setActiveBranchId(localStorage.getItem('activeBranchId'));
    };
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, []);

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
      console.error('Error loading metadata:', err);
    }
  };

  const loadUserProfile = async () => {
    try {
      const user = await authAdminService.getCurrentUser();
      setCurrentUser(user);
      if (user.staff) {
        const today = getTodayStr();
        const status = await attendanceService.getTodayStatus(user.staff.id, today);
        setActiveAttendances(status.filter(a => a.status === 'CHECKED_IN'));
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
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
    if (!activeBranchId || !currentUser) return;
    try {
      setLoadingVisits(true);
      const params = {
        branchId: activeBranchId,
        date: worklistDate,
      };
      if (['DOCTOR', 'NURSE', 'TECHNICIAN'].includes(currentUser.roleName) && currentUser.staff?.id) {
        params.doctorId = currentUser.staff.id;
      }
      if (serviceFilterId) {
        params.serviceId = serviceFilterId;
      }

      const list = await visitService.getVisits(params);
      setVisits(list);
      if (selectedVisit && !list.some((item) => item.id === selectedVisit.id)) {
        setSelectedVisit(null);
        setOrder(null);
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách lượt khám theo bộ lọc');
    } finally {
      setLoadingVisits(false);
    }
  };

  const loadSpecialties = async () => {
    try {
      const list = await medicalService.getSpecialties();
      setSpecialties(list.filter(s => s.isActive));
    } catch (err) {
      console.error(err);
    }
  };

  const loadServiceFilterOptions = async () => {
    try {
      const list = await medicalService.getServices();
      setAllServices(list.filter(s => s.isActive));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSpecialtyChange = async (specialtyId) => {
    form.setFieldsValue({ serviceId: undefined, price: 0 });
    setServices([]);
    if (!specialtyId) return;

    try {
      setLoadingServices(true);
      const svcList = await medicalService.getServices({ specialtyId, isActive: true });
      setServices(svcList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleServiceChange = (serviceId) => {
    const selectedSvc = services.find(s => s.id === serviceId);
    if (selectedSvc) {
      const targetDate = order?.createdAt || new Date();
      const activePrice = getActivePriceObjectAtDate(selectedSvc.prices, targetDate);
      const amount = activePrice ? Number(activePrice.amount) : 0;
      form.setFieldsValue({ price: amount });
    }
  };

  const handleSelectVisit = async (visit) => {
    setSelectedVisit(visit);
    fetchOrder(visit.id);
  };

  const fetchOrder = async (visitId) => {
    try {
      setLoadingOrder(true);
      const data = await billingService.getOrderByVisit(visitId);
      setOrder(data);
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi lấy thông tin đơn dịch vụ');
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleAddItem = async (values) => {
    if (!order) return;
    try {
      setAddingItem(true);
      const updatedOrder = await billingService.addOrderItem(order.id, {
        serviceId: values.serviceId,
        quantity: values.quantity,
        price: values.price,
      });
      setOrder(updatedOrder);
      message.success('Thêm dịch vụ thành công');
      form.resetFields(['specialtyId', 'serviceId', 'price']);
      form.setFieldsValue({ quantity: 1 });
      setServices([]);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể thêm dịch vụ');
    } finally {
      setAddingItem(false);
    }
  };

  const handleUpdateItemStatus = async (itemId, newStatus) => {
    if (!order) return;
    try {
      const performedById = currentUser?.staff?.id;
      const updatedOrder = await billingService.updateOrderItem(order.id, itemId, { 
        status: newStatus, 
        performedById 
      });
      setOrder(updatedOrder);
      message.success('Cap nhat trang thai thanh cong');
    } catch (err) {
      console.error(err);
      message.error('Khong the cap nhat trang thai');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!order) return;
    try {
      const updatedOrder = await billingService.deleteOrderItem(order.id, itemId);
      setOrder(updatedOrder);
      message.success('Xóa dịch vụ thành công');
    } catch (err) {
      console.error(err);
      message.error('Không thể xóa dịch vụ');
    }
  };

  const handleAcceptPatient = async () => {
    if (!selectedVisit) return;
    try {
      const doctorId = currentUser?.staff?.id;
      const updatedVisit = await visitService.acceptPatient(selectedVisit.id, doctorId);
      setSelectedVisit(updatedVisit);
      message.success('Tiep nhan benh nhan thanh cong!');
      fetchVisits();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Khong the tiep nhan benh nhan');
    }
  };

  const handleCompletePatient = async () => {
    if (!selectedVisit) return;
    try {
      const updatedVisit = await visitService.completePatient(selectedVisit.id);
      setSelectedVisit(updatedVisit);
      message.success('Hoàn thành lượt khám thành công!');
      fetchVisits();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể hoàn thành lượt khám');
    }
  };

  const fetchDoctorsForRoom = async (roomId) => {
    if (!roomId) {
      setRoomDoctors([]);
      return;
    }
    try {
      setLoadingRoomDoctors(true);
      const today = getTodayStr();
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

  const handleSaveTransfer = async () => {
    if (!selectedVisit) return;
    try {
      setSavingTransfer(true);
      const values = await formTransfer.validateFields();
      
      const targetRoom = rooms.find(r => r.id === values.roomId);
      let status = values.status;
      
      if (targetRoom && targetRoom.type === 'CLINIC') {
        if (values.status === 'WAITING' || !values.status) {
          status = 'WAITING_CLINICAL_EXAM';
        }
      } else if (targetRoom && targetRoom.type !== 'CLINIC') {
        if (values.status === 'WAITING' || !values.status) {
          status = 'WAITING_SERVICE';
        }
      }

      const updatedVisit = await visitService.transferRoom(selectedVisit.id, {
        roomId: values.roomId,
        doctorId: values.doctorId,
        status: status
      });

      message.success('Điều phối chuyển phòng khám thành công!');
      setSelectedVisit(updatedVisit);
      setTransferVisible(false);
      fetchVisits();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Chuyển phòng thất bại. Vui lòng kiểm tra lịch trực/điểm danh của bác sĩ.');
    } finally {
      setSavingTransfer(false);
    }
  };

  const handleSaveResult = async (itemId, newStatus, newResultStatus, newResultNotes) => {
    if (!order) return;
    try {
      const performedById = currentUser?.staff?.id;
      const updatedOrder = await billingService.updateOrderItem(order.id, itemId, {
        status: newStatus,
        resultStatus: newResultStatus,
        resultNotes: newResultNotes,
        performedById
      });
      setOrder(updatedOrder);
      message.success('Cap nhat ket qua dich vu thanh cong!');
      fetchVisits();
      if (selectedVisit) {
        const updatedVisit = await visitService.getVisitById(selectedVisit.id);
        setSelectedVisit(updatedVisit);
      }
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Khong the cap nhat ket qua');
    }
  };

  const handleOpenResultModal = (item) => {
    setSelectedOrderItem(item);
    setResultNotes(item.resultNotes || '');
    setResultModalVisible(true);
  };

  const handleSaveResultFromModal = async () => {
    if (!selectedOrderItem) return;
    await handleSaveResult(selectedOrderItem.id, 'COMPLETED', 'COMPLETED', resultNotes);
    setResultModalVisible(false);
    setSelectedOrderItem(null);
    setResultNotes('');
  };

  const filteredVisits = visits.filter(v => {
    if (worklistScope !== 'ALL') {
      const allowedStatuses = WORKLIST_SCOPES[worklistScope] || [];
      if (!allowedStatuses.includes(v.status)) return false;
    }
    const term = searchVisitText.toLowerCase();
    const patientName = v.patient?.fullName?.toLowerCase() || '';
    const visitCode = v.visitCode?.toLowerCase() || '';
    const phone = v.patient?.phone || '';
    return patientName.includes(term) || visitCode.includes(term) || phone.includes(term);
  });

  const getRoomScopedOrderItems = () => {
    const items = order?.items || [];
    const roomId = selectedVisit?.currentRoomId;
    const currentRoom = roomId ? rooms.find((room) => room.id === roomId) : null;
    const serviceIds = currentRoom?.serviceIds || [];
    if (!currentRoom || serviceIds.length === 0) {
      return items;
    }
    return items.filter((item) => serviceIds.includes(item.serviceId));
  };

  const orderItemColumns = [
    {
      title: 'Dịch vụ y tế',
      dataIndex: ['service', 'name'],
      key: 'serviceName',
      render: (text, record) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{text}</Text>
          <div>
            <Tag color="cyan" style={{ fontSize: 10 }}>{record.service?.code}</Tag>
            <Tag color="blue" style={{ fontSize: 10 }}>{record.service?.category}</Tag>
            {record.performedBy?.fullName && (
              <Tag color="default" style={{ fontSize: 10, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                BS: {record.performedBy.fullName}
              </Tag>
            )}
            {record.resultNotes && (
              <div style={{ marginTop: 4, padding: '4px 8px', background: '#f0fdf4', borderRadius: 4, borderLeft: '3px solid #10b981', fontSize: 11 }}>
                <strong>Ket qua:</strong> {record.resultNotes}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Đơn giá',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      width: 120,
      render: price => <Text strong>{Number(price).toLocaleString('vi-VN')}đ</Text>
    },
    {
      title: 'SL',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
      width: 50,
    },
    {
      title: 'Thành tiền',
      key: 'total',
      align: 'right',
      width: 120,
      render: (_, record) => (
        <Text type="success" strong>
          {(Number(record.price) * record.quantity).toLocaleString('vi-VN')}đ
        </Text>
      )
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center',
      width: 140,
      render: (_, record) => {
        return (
          <Space direction="vertical" size={2} style={{ alignItems: 'center' }}>
            {record.status === 'COMPLETED' ? (
              <Tag color="green">Đã thực hiện</Tag>
            ) : record.status === 'IN_PROGRESS' ? (
              <Tag color="blue">Đang thực hiện</Tag>
            ) : record.status === 'CANCELLED' ? (
              <Tag color="red">Đã hủy</Tag>
            ) : (
              <Tag color="orange">Chờ thực hiện</Tag>
            )}
            {record.status === 'COMPLETED' && (
              record.resultStatus === 'PENDING' ? (
                <Tag color="warning" style={{ fontSize: 10 }}>Trả sau (Chờ KQ)</Tag>
              ) : record.resultStatus === 'COMPLETED' ? (
                <Tag color="blue" style={{ fontSize: 10 }}>Đã trả KQ</Tag>
              ) : null
            )}
          </Space>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      width: 150,
      render: (_, record) => {
        if (record.status === 'PENDING') {
          return (
            <Space>
              {record.isPaid && (
                <Tooltip title="Bắt đầu thực hiện chỉ định này">
                  <Button
                    type="primary"
                    size="small"
                    ghost
                    icon={<PlayCircleOutlined />}
                    onClick={() => handleUpdateItemStatus(record.id, 'IN_PROGRESS')}
                  >
                    Đang làm
                  </Button>
                </Tooltip>
              )}
              {!record.isPaid && (
                <Text type="secondary" style={{ fontSize: 12 }}>Chưa thu</Text>
              )}
              {!record.isPaid && (
                <Tooltip title="Xóa dịch vụ chưa thực hiện">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteItem(record.id)}
                  />
                </Tooltip>
              )}
            </Space>
          );
        }
        if (record.status === 'IN_PROGRESS') {
          return (
            <Space>
              <Tooltip title="Trả sau (Kết quả bổ sung sau)">
                <Button
                  type="text"
                  icon={<FileTextOutlined style={{ color: '#d4b106' }} />}
                  onClick={() => handleSaveResult(record.id, 'COMPLETED', 'PENDING', '')}
                />
              </Tooltip>
              <Tooltip title="Đã xong / nhập kết quả">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  onClick={() => handleOpenResultModal(record)}
                >
                  Đã xong
                </Button>
              </Tooltip>
            </Space>
          );
        }
        if (record.status === 'COMPLETED' && hasBranchPermission('canExecuteLaboratory')) {
          if (record.resultStatus === 'PENDING') {
            return (
              <Tooltip title="Viết phiếu kết quả">
                <Button
                  type="primary"
                  size="small"
                  ghost
                  icon={<EditOutlined />}
                  onClick={() => handleOpenResultModal(record)}
                >
                  Viết KQ
                </Button>
              </Tooltip>
            );
          }
          if (record.resultStatus === 'COMPLETED') {
            return (
              <Tooltip title="Sửa kết quả">
                <Button
                  type="text"
                  icon={<EditOutlined style={{ color: '#1890ff' }} />}
                  onClick={() => handleOpenResultModal(record)}
                />
              </Tooltip>
            );
          }
        }
        return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
      }
    }
  ];

  const canAccept = selectedVisit && ['WAITING_CLINICAL_EXAM', 'WAITING_CONCLUSION', 'WAITING_SERVICE'].includes(selectedVisit.status) && hasBranchPermission('canPerformExam');
  const canComplete = selectedVisit && ['IN_CLINICAL_EXAM', 'IN_CONCLUSION'].includes(selectedVisit.status) && hasBranchPermission('canConcludeExam');

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16}>
        {/* Left Side: Visits list */}
        <Col span={8}>
          <Card
            title={
              <Space size={6}>
                <UserOutlined style={{ color: '#52c41a' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Worklist khám</span>
                <Badge count={filteredVisits.length} style={{ backgroundColor: '#52c41a' }} />
              </Space>
            }
            size="small"
            style={{ height: 'calc(100vh - 120px)', overflowY: 'auto' }}
          >
            {currentUser && ['DOCTOR', 'NURSE'].includes(currentUser.roleName) && activeAttendances.length === 0 && (
              <Alert
                message="Chua check-in ca truc"
                description="Ban can diem danh check-in ca truc hom nay de thuc hien tiep nhan benh."
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              <Row gutter={[6, 6]}>
                <Col span={10}>
                  <Input
                    type="date"
                    value={worklistDate}
                    onChange={(e) => setWorklistDate(e.target.value || getTodayStr())}
                    size="small"
                  />
                </Col>
                <Col span={14}>
                  <Select
                    placeholder="Lọc theo dịch vụ"
                    value={serviceFilterId}
                    onChange={setServiceFilterId}
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    size="small"
                    style={{ width: '100%' }}
                    options={allServices.map((service) => ({
                      value: service.id,
                      label: `${service.code || ''} ${service.name}`.trim(),
                    }))}
                  />
                </Col>
              </Row>
              <Row gutter={[6, 6]}>
                <Col span={18}>
                  <Select
                    value={worklistScope}
                    onChange={setWorklistScope}
                    size="small"
                    style={{ width: '100%' }}
                    options={[
                      { value: 'OPEN', label: 'Chờ + đang xử lý' },
                      { value: 'ACCEPTED', label: 'Đã/đang nhận' },
                      { value: 'DONE', label: 'Hoàn thành' },
                      { value: 'ALL', label: 'Tất cả trạng thái' },
                    ]}
                  />
                </Col>
                <Col span={6}>
                  <Button
                    size="small"
                    block
                    icon={<SearchOutlined />}
                    loading={loadingVisits}
                    onClick={fetchVisits}
                  >
                    Lọc
                  </Button>
                </Col>
              </Row>
            </div>
            <Input
              placeholder="Tìm tên, mã LK, sđt..."
              prefix={<SearchOutlined />}
              value={searchVisitText}
              onChange={e => setSearchVisitText(e.target.value)}
              style={{ marginBottom: 12 }}
              size="small"
              allowClear
            />
            
            {loadingVisits ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>Đang tải...</div>
            ) : filteredVisits.length === 0 ? (
              <Empty description="Không tìm thấy lượt khám nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredVisits.map(v => {
                  const isSelected = selectedVisit?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleSelectVisit(v)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: `1px solid ${isSelected ? '#52c41a' : '#f0f0f0'}`,
                        background: isSelected ? '#f6ffed' : '#fafafa',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: 13, textTransform: 'uppercase' }}>{v.patient?.fullName}</Text>
                        <Tag color="cyan" style={{ margin: 0, fontSize: 10 }}>STT: {v.queueNumber}</Tag>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <div>Mã LK: {v.visitCode}</div>
                          <div>Lý do: {v.reason || 'Khám tổng quát'}</div>
                        </div>
                        <div style={{ marginLeft: 4 }}>
                          {getVisitStatusTag(v.status)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* Right Side: Order management */}
        <Col span={16}>
          {selectedVisit ? (
            <Card
              loading={loadingOrder}
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    <MedicineBoxOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                    Chỉ định dịch vụ: {selectedVisit.patient?.fullName}
                  </span>
                  {order && (
                    <Tag color={order.status === 'PAID' ? 'green' : 'orange'} style={{ fontSize: 12 }}>
                      {order.status === 'PAID' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
                    </Tag>
                  )}
                </div>
              }
              size="small"
              style={{ minHeight: 'calc(100vh - 120px)' }}
            >
              {/* Patient mini summary card */}
              <div style={{ background: '#f5f5f5', padding: '12px 16px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                <Row gutter={16} align="middle">
                  <Col span={17}>
                    <Row gutter={[16, 8]}>
                      <Col span={8}><strong>Mã LK:</strong> {selectedVisit.visitCode}</Col>
                      <Col span={8}><strong>Giới tính:</strong> {selectedVisit.patient?.gender === 'MALE' ? 'Nam' : 'Nữ'}</Col>
                      <Col span={8}><strong>Ngày sinh:</strong> {selectedVisit.patient?.dob}</Col>
                      <Col span={8}><strong>SĐT:</strong> {selectedVisit.patient?.phone}</Col>
                      <Col span={16}><strong>Trạng thái:</strong> {getVisitStatusTag(selectedVisit.status)}</Col>
                    </Row>
                  </Col>
                  <Col span={7} style={{ display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '1px solid #d9d9d9', paddingLeft: 16 }}>
                    {canAccept && (
                      <Tooltip title={activeAttendances.length === 0 ? "Ban can diem danh check-in ca truc hom nay de tiep nhan kham" : ""}>
                        <Button
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          onClick={handleAcceptPatient}
                          disabled={activeAttendances.length === 0}
                          style={{ width: '100%' }}
                        >
                          Tiep nhan
                        </Button>
                      </Tooltip>
                    )}
                    {canComplete && (
                      <Tooltip title={activeAttendances.length === 0 ? "Ban can diem danh check-in ca truc hom nay de hoan thanh ca kham" : ""}>
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={handleCompletePatient}
                          disabled={activeAttendances.length === 0}
                          style={{ width: '100%', backgroundColor: activeAttendances.length === 0 ? undefined : '#52c41a', borderColor: activeAttendances.length === 0 ? undefined : '#52c41a' }}
                        >
                          Hoan thanh
                        </Button>
                      </Tooltip>
                    )}
                    <Button
                      type="default"
                      icon={<CompassOutlined />}
                      onClick={() => handleOpenTransfer(selectedVisit)}
                      style={{ width: '100%' }}
                    >
                      Chuyển phòng
                    </Button>
                  </Col>
                </Row>
              </div>

              {/* Order Items Table */}
              <Title level={5} style={{ margin: '8px 0', fontSize: 13 }}>Dịch vụ chỉ định</Title>
              <Table
                dataSource={getRoomScopedOrderItems()}
                columns={orderItemColumns}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: 'Chưa có dịch vụ nào được chỉ định' }}
                summary={pageData => {
                  const total = pageData.reduce((sum, row) => sum + (Number(row.price) * row.quantity), 0);
                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}><strong>Tổng chi phí chỉ định:</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <Text type="success" strong style={{ fontSize: 14 }}>
                            {total.toLocaleString('vi-VN')}đ
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} colSpan={2} />
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />

              <Divider style={{ margin: '16px 0' }} />

              {/* Add service form */}
              {order?.status !== 'PAID' && hasBranchPermission('canOrderServices') ? (
                <Card
                  title={<span style={{ fontSize: 12, fontWeight: 600 }}>Thêm dịch vụ khám mới</span>}
                  type="inner"
                  size="small"
                  bodyStyle={{ padding: '12px 14px' }}
                >
                  <Form form={form} layout="inline" size="small" onFinish={handleAddItem} style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                    <Form.Item name="specialtyId" label="Chuyên khoa" style={{ flex: 1, margin: 0 }}>
                      <Select placeholder="Chọn chuyên khoa..." onChange={handleSpecialtyChange} showSearch optionFilterProp="children">
                        {specialties.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                      </Select>
                    </Form.Item>
                    
                    <Form.Item
                      name="serviceId"
                      label="Dịch vụ"
                      rules={[{ required: true, message: 'Chọn dịch vụ' }]}
                      style={{ flex: 2, margin: 0 }}
                    >
                      <Select
                        placeholder={form.getFieldValue('specialtyId') ? 'Chọn dịch vụ...' : 'Chọn chuyên khoa trước...'}
                        onChange={handleServiceChange}
                        disabled={loadingServices || !form.getFieldValue('specialtyId')}
                        loading={loadingServices}
                        showSearch
                        optionFilterProp="children"
                      >
                        {services.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                      </Select>
                    </Form.Item>

                    <Form.Item name="price" label="Đơn giá (đ)" style={{ width: 140, margin: 0 }}>
                      <InputNumber
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\$\s?|(,*)/g, '')}
                        disabled
                        style={{ width: '100%' }}
                      />
                    </Form.Item>

                    <Form.Item name="quantity" label="SL" initialValue={1} style={{ width: 70, margin: 0 }}>
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item style={{ margin: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<PlusOutlined />}
                        loading={addingItem}
                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                      >
                        Thêm
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              ) : (
                <div style={{ background: '#f6ffed', padding: '10px 14px', borderRadius: 6, border: '1px solid #bbf7d0', color: '#389e0d', fontSize: 13 }}>
                  <strong>Đơn dịch vụ đã được thanh toán.</strong> Bạn không thể chỉnh sửa chỉ định dịch vụ hoặc xóa dịch vụ của lượt khám này.
                </div>
              )}
            </Card>
          ) : (
            <Card style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="Vui lòng chọn một bệnh nhân khám bên trái để chỉ định dịch vụ" />
            </Card>
          )}
        </Col>
      </Row>

      {/* Transfer Room Modal */}
      <Modal
        title={
          <Title level={4} style={{ margin: 0, paddingBottom: 8, borderBottom: '1px solid #f0f0f0', fontSize: 16 }}>
            Điều phối Phân phòng & Bác sĩ thực hiện
          </Title>
        }
        open={transferVisible}
        onCancel={() => setTransferVisible(false)}
        onOk={handleSaveTransfer}
        confirmLoading={savingTransfer}
        okText="Xác nhận điều phối"
        cancelText="Đóng"
        width={450}
      >
        {selectedVisit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '13px', borderLeft: '3px solid #52c41a', margin: 0 }}>
              Bệnh nhân: <strong>{selectedVisit.patient?.fullName?.toUpperCase()}</strong> (Mã LK: {selectedVisit.visitCode})
            </div>
            
            <div style={{ background: '#fff', border: '1px solid #edf2f7', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
              <div style={{ fontWeight: 600, color: '#30456c', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Dịch vụ chỉ định & Trạng thái</span>
                {order ? (() => {
                  const items = order.items || [];
                  const paidCount = items.filter(i => i.isPaid).length;
                  const totalCount = items.length;
                  const allPaid = totalCount > 0 && paidCount === totalCount;
                  const partialPaid = paidCount > 0 && paidCount < totalCount;
                  
                  const completedCount = items.filter(i => i.status === 'COMPLETED').length;
                  const allCompleted = totalCount > 0 && completedCount === totalCount;
                  const partialCompleted = completedCount > 0 && completedCount < totalCount;
                  return (
                    <Space size={4}>
                      <Tag
                        color={allPaid ? 'green' : paidCount > 0 ? 'blue' : 'orange'}
                        style={{ margin: 0, fontSize: '10px' }}
                      >
                        {allPaid ? 'ĐÃ THANH TOÁN' : `ĐÃ TT ${paidCount}/${totalCount}`}
                      </Tag>
                      <Tag
                        color={allCompleted ? 'green' : partialCompleted ? 'blue' : 'orange'}
                        style={{ margin: 0, fontSize: '10px' }}
                      >
                        {allCompleted ? 'ĐÃ XONG TOÀN BỘ' : `ĐÃ XONG ${completedCount}/${totalCount}`}
                      </Tag>
                    </Space>
                  );
                })() : (
                  <Tag color="red" style={{ margin: 0, fontSize: '10px' }}>CHƯA CÓ HÓA ĐƠN</Tag>
                )}
              </div>
              
              {order && getRoomScopedOrderItems().length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 190, overflowY: 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 78px 96px', gap: 6, padding: '0 8px', color: '#64748b', fontWeight: 600, fontSize: 11 }}>
                    <span>Dịch vụ</span>
                    <span>Thanh toán</span>
                    <span>Thực hiện</span>
                  </div>
                  {getRoomScopedOrderItems().map((item, idx) => (
                    <div key={item.id || idx} style={{ display: 'grid', gridTemplateColumns: '1fr 78px 96px', gap: 6, alignItems: 'center', background: '#f8fafc', padding: '6px 8px', borderRadius: 4 }}>
                      <span style={{ fontWeight: 500, color: '#262626', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.service?.name}>{item.service?.name}</span>
                      <span>{getPaymentStatusTag(item)}</span>
                      <span title={item.performedBy?.fullName || ''}>{getExecutionStatusTag(item)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#8c8c8c', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                  Chưa có dịch vụ chỉ định thuộc phòng này.
                </div>
              )}
              
              {order && order.status === 'PENDING' && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: '#fff2e6', border: '1px solid #ffd8bf', borderRadius: 4, color: '#d46b08', fontSize: '11px', lineHeight: '1.4' }}>
                  ⚠️ <strong>Cảnh báo:</strong> Bệnh nhân chưa thanh toán. Vui lòng hướng dẫn bệnh nhân qua quầy thu ngân thanh toán trước khi điều phối vào phòng thực hiện CLS!
                </div>
              )}
            </div>
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
            label="Trạng thái hàng đợi đích:"
            initialValue="WAITING"
          >
            <Select placeholder="Trạng thái hàng đợi">
              <Option value="WAITING">Chờ khám / Chờ dịch vụ (Mặc định)</Option>
              <Option value="WAITING_CLINICAL_EXAM">Chờ khám lâm sàng</Option>
              <Option value="WAITING_SERVICE">Chờ làm dịch vụ</Option>
              <Option value="WAITING_CONCLUSION">Chờ kết luận</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Result Entry Modal */}
      <Modal
        title={
          <Title level={4} style={{ margin: 0, paddingBottom: 8, borderBottom: '1px solid #f0f0f0', fontSize: 16 }}>
            Nhập kết quả dịch vụ cận lâm sàng
          </Title>
        }
        open={resultModalVisible}
        onCancel={() => {
          setResultModalVisible(false);
          setSelectedOrderItem(null);
          setResultNotes('');
        }}
        onOk={handleSaveResultFromModal}
        okText="Lưu kết quả"
        cancelText="Đóng"
        width={500}
      >
        {selectedOrderItem && (
          <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', borderLeft: '3px solid #10b981' }}>
            <div>Dịch vụ: <strong>{selectedOrderItem.service?.name}</strong></div>
            <div style={{ fontSize: 12, color: '#4b5563', marginTop: 4 }}>
              Bệnh nhân: {selectedVisit?.patient?.fullName} (STT: {selectedVisit?.queueNumber})
            </div>
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <Text strong>Nội dung/Kết luận phiếu kết quả:</Text>
        </div>
        <Input.TextArea
          rows={5}
          value={resultNotes}
          onChange={(e) => setResultNotes(e.target.value)}
          placeholder="Nhập ghi chú kết quả, kết luận hình ảnh, kết quả xét nghiệm..."
        />
      </Modal>
    </div>
  );
}
