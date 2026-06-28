import React, { useEffect, useState } from 'react';
import {
  Row, Col, Card, Table, Button, Radio, Space, Tag,
  Typography, message, Input, Empty, Modal, Badge, Form, Alert,
  Select,
  Divider
} from 'antd';
import {
  DollarOutlined, SearchOutlined, CreditCardOutlined,
  PrinterOutlined, ShoppingCartOutlined, QrcodeOutlined,
  CompassOutlined
} from '@ant-design/icons';
import { billingService } from '../../../services/billingService';
import { authAdminService } from '../../../services/authAdminService';
import { attendanceService } from '../../../services/attendanceService';
import { roomService } from '../../../services/roomService';
import { staffService } from '../../../services/staffService';
import { visitService } from '../../../services/visitService';

const { Title, Text } = Typography;

export default function CashierPage() {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paying, setPaying] = useState(false);

  const [showQRModal, setShowQRModal] = useState(false);

  // Status filter for cashier list
  const [statusFilter, setStatusFilter] = useState('PENDING'); // PENDING | PAID
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [selectedItemsForRefund, setSelectedItemsForRefund] = useState([]);
  const [refundReason, setRefundReason] = useState('');
  const [refundPaymentMethod, setRefundPaymentMethod] = useState('CASH');
  const [refundLoading, setRefundLoading] = useState(false);

  const activeBranchId = localStorage.getItem('activeBranchId');
  const [currentUser, setCurrentUser] = useState(null);
  const [activeAttendances, setActiveAttendances] = useState([]);

  // Coordination states
  const [rooms, setRooms] = useState([]);
  const [roomDoctors, setRoomDoctors] = useState([]);
  const [loadingRoomDoctors, setLoadingRoomDoctors] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(undefined);
  const [transferVisible, setTransferVisible] = useState(false);
  const [savingTransfer, setSavingTransfer] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [formTransfer] = Form.useForm();
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    fetchOrders(statusFilter);
    loadUserProfile();
    loadRooms();

    // Listen for branch changes
    const handleBranchChange = () => {
      setSelectedOrder(null);
      fetchOrders(statusFilter);
      loadUserProfile();
      loadRooms();
    };
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, [statusFilter]);

  const loadUserProfile = async () => {
    try {
      const user = await authAdminService.getCurrentUser();
      setCurrentUser(user);
      if (user.staff) {
        const today = new Date().toISOString().split('T')[0];
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

  const loadRooms = async () => {
    if (!activeBranchId) return;
    try {
      const roomList = await roomService.getRooms(activeBranchId);
      setRooms(roomList.filter((r) => r.isActive));
    } catch (err) {
      console.error('Error loading rooms:', err);
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
      const roomStaffList = await staffService.getDoctorsByRoom(activeBranchId, roomId);
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
    if (!visit) return;
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

      await visitService.transferRoom(selectedVisit.id, {
        roomId: values.roomId,
        doctorId: values.doctorId,
        status: status
      });

      message.success('Điều phối chuyển phòng thành công!');
      setTransferVisible(false);
      fetchOrders(statusFilter);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Chuyển phòng thất bại. Vui lòng kiểm tra lịch trực/điểm danh của bác sĩ.');
    } finally {
      setSavingTransfer(false);
    }
  };

  const fetchOrders = async (status) => {
    try {
      setLoadingOrders(true);
      if (status === 'PENDING') {
        const data = await billingService.getOrders({ status: 'PENDING' });
        setOrders(data);
      } else {
        // Fetch all orders, then filter to show PAID and CANCELLED
        const data = await billingService.getOrders();
        setOrders(data.filter(o => o.status === 'PAID' || o.status === 'CANCELLED'));
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách hóa đơn');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);
    setPaymentMethod('CASH');
    setPayments([]);
    if (order) {
      try {
        setLoadingPayments(true);
        const paymentsList = await billingService.getPaymentsByOrder(order.id);
        setPayments(paymentsList || []);
      } catch (err) {
        console.error('Error fetching payments:', err);
      } finally {
        setLoadingPayments(false);
      }
    }
  };

  const handlePayment = async () => {
    if (!selectedOrder) return;
    try {
      setPaying(true);
      const res = await billingService.createPayment({
        orderId: selectedOrder.id,
        amount: unpaidAmount,
        paymentMethod: paymentMethod,
      });
      message.success('Thanh toán thành công!');

      // Auto-trigger printing receipt
      handlePrintInvoice(selectedOrder, [res]);

      const paidVisit = selectedOrder.visit;
      setSelectedOrder(null);
      fetchOrders(statusFilter);

      // Auto-open transfer/coordination modal if visit is available
      if (paidVisit) {
        setTimeout(async () => {
          try {
            const freshVisit = await visitService.getVisitById(paidVisit.id);
            handleOpenTransfer(freshVisit);
          } catch (err) {
            console.warn('Could not load fresh visit for auto-transfer:', err);
            handleOpenTransfer(paidVisit);
          }
        }, 300);
      }
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Thanh toán thất bại');
    } finally {
      setPaying(false);
    }
  };

  const handleRefundSubmit = async () => {
    if (selectedItemsForRefund.length === 0) {
      message.warning('Vui lòng chọn ít nhất một dịch vụ để hoàn tiền');
      return;
    }
    if (!refundReason.trim()) {
      message.warning('Vui lòng nhập lý do hoàn trả');
      return;
    }

    try {
      setRefundLoading(true);
      await billingService.refundOrder(selectedOrder.id, {
        itemIds: selectedItemsForRefund,
        reason: refundReason,
        paymentMethod: refundPaymentMethod,
      });

      message.success('Hoàn trả tiền dịch vụ thành công!');
      setRefundModalVisible(false);

      // Refresh list
      const updatedOrders = await billingService.getOrders();
      const filtered = updatedOrders.filter(o => o.status === 'PAID' || o.status === 'CANCELLED');
      setOrders(filtered);

      // Update selected order view
      const freshOrder = filtered.find(o => o.id === selectedOrder.id);
      setSelectedOrder(freshOrder || null);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Hoàn tiền thất bại');
    } finally {
      setRefundLoading(false);
    }
  };

  const handlePrintInvoice = (orderData, paymentsList = []) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.warning('Vui lòng cho phép popup để in hóa đơn');
      return;
    }

    const now = new Date();
    const dateTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    const itemsHtml = orderData.items?.map((item, idx) => `
      <tr>
        <td style="padding: 6px 0; font-size: 11px; border-bottom: 1px dashed #e5e7eb;">${idx + 1}. ${item.service?.name}</td>
        <td style="padding: 6px 0; font-size: 11px; text-align: center; border-bottom: 1px dashed #e5e7eb;">${item.quantity}</td>
        <td style="padding: 6px 0; font-size: 11px; text-align: right; border-bottom: 1px dashed #e5e7eb;">${Number(item.price).toLocaleString('vi-VN')}</td>
        <td style="padding: 6px 0; font-size: 11px; text-align: right; border-bottom: 1px dashed #e5e7eb;">${(Number(item.price) * item.quantity).toLocaleString('vi-VN')}</td>
      </tr>
    `).join('') || '';

    const pMethodStr = paymentsList[0]?.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' :
      paymentsList[0]?.paymentMethod === 'CARD' ? 'Thẻ ngân hàng' : 'Tiền mặt';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hóa đơn thanh toán</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; padding: 16px; width: 300px; margin: 0 auto; color: #1f2937; }
          .header { text-align: center; margin-bottom: 12px; }
          .header h2 { margin: 0; font-size: 15px; font-weight: 700; color: #059669; }
          .header p { margin: 2px 0; font-size: 9px; color: #6b7280; }
          .title { text-align: center; font-size: 12px; font-weight: 700; text-transform: uppercase; margin: 8px 0; letter-spacing: 0.5px; }
          .info { font-size: 10px; line-height: 1.4; margin-bottom: 10px; border-bottom: 1px dashed #d1d5db; padding-bottom: 6px; }
          .info div { display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          th { text-align: left; padding: 4px 0; font-size: 10px; font-weight: 600; border-bottom: 1px dashed #d1d5db; }
          .totals { font-size: 11px; line-height: 1.5; margin-top: 8px; border-top: 1px dashed #d1d5db; padding-top: 6px; }
          .totals div { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .footer { text-align: center; margin-top: 20px; font-size: 9px; color: #6b7280; border-top: 1px dashed #e5e7eb; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>DAO CARE CLINIC</h2>
          <p>Địa chỉ: Hà Nội, Việt Nam</p>
          <p>Hotline: 1900 1234</p>
        </div>
        <div class="title">Hóa Đơn Thanh Toán</div>
        <div class="info">
          <div><span>Số hóa đơn:</span> <strong>${orderData.orderCode}</strong></div>
          <div><span>Bệnh nhân:</span> <strong style="text-transform: uppercase;">${orderData.patient?.fullName}</strong></div>
          <div><span>Mã lượt khám:</span> <span>${orderData.visit?.visitCode}</span></div>
          <div><span>Thời gian in:</span> <span>${dateTimeStr}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 50%;">Tên dịch vụ</th>
              <th style="width: 10%; text-align: center;">SL</th>
              <th style="width: 20%; text-align: right;">Đơn giá</th>
              <th style="width: 20%; text-align: right;">T.Tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="totals">
          <div style="font-weight: 700; font-size: 11px; margin-bottom: 4px;">
            <span>Tổng cộng:</span>
            <span style="color: #059669; font-size: 12px;">${Number(orderData.totalAmount).toLocaleString('vi-VN')} đ</span>
          </div>
          <div>
            <span>Phương thức thanh toán:</span>
            <span>${pMethodStr}</span>
          </div>
          <div>
            <span>Trạng thái:</span>
            <span style="color: #059669; font-weight: 600;">ĐÃ THANH TOÁN</span>
          </div>
        </div>
        <div class="footer">
          Cảm ơn Quý khách đã tin tưởng sử dụng dịch vụ!<br>Chúc Quý khách luôn khỏe mạnh!
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 300);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredOrders = orders.filter(o => {
    const term = searchText.toLowerCase();
    const patientName = o.patient?.fullName?.toLowerCase() || '';
    const orderCode = o.orderCode?.toLowerCase() || '';
    const visitCode = o.visit?.visitCode?.toLowerCase() || '';
    const phone = o.patient?.phone || '';
    return patientName.includes(term) || orderCode.includes(term) || visitCode.includes(term) || phone.includes(term);
  });

  const columns = [
    {
      title: 'Dịch vụ y tế',
      dataIndex: ['service', 'name'],
      key: 'name',
      render: (t, r) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{t}</Text>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Mã: {r.service?.code}</div>
        </div>
      )
    },
    {
      title: 'Đơn giá',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      render: p => `${Number(p).toLocaleString('vi-VN')}đ`
    },
    {
      title: 'SL',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
    },
    {
      title: 'Thành tiền',
      key: 'total',
      align: 'right',
      render: (_, r) => <Text type="success" strong>{(Number(r.price) * r.quantity).toLocaleString('vi-VN')}đ</Text>
    },
    {
      title: 'Thanh toán',
      key: 'isPaid',
      align: 'center',
      render: (_, r) => r.isPaid
        ? <Tag color="green">Đã thu</Tag>
        : <Tag color="orange">Chưa thu</Tag>
    },
    ...(statusFilter === 'PAID' ? [{
      title: 'Thực hiện',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status) => {
        if (status === 'COMPLETED') return <Tag color="green">Đã thực hiện</Tag>;
        if (status === 'CANCELLED') return <Tag color="red">Đã hủy</Tag>;
        return <Tag color="orange">Chờ thực hiện</Tag>;
      }
    }] : [])
  ];

  // VietQR generation variables fallback matching backend configurations
  const bankCode = '970418';
  const accountNum = '2152486504';
  const accountName = 'TRAN HUU NAM';

  // Use item.isPaid as source of truth for per-item payment status
  const paidItems = selectedOrder?.items?.filter(i => i.isPaid) || [];
  const unpaidItems = selectedOrder?.items?.filter(i => !i.isPaid) || [];
  const paidAmount = paidItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const unpaidAmount = unpaidItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  const qrImageUrl = selectedOrder
    ? `https://img.vietqr.io/image/${bankCode}-${accountNum}-compact2.png?amount=${unpaidAmount}&addInfo=Thanh%20toan%20vien%20phi%20${selectedOrder.orderCode}&accountName=${encodeURIComponent(accountName)}`
    : '';

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16}>
        {/* Left column: list of pending & paid bills */}
        <Col span={8}>
          <Card
            title={
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                <DollarOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                Danh sách hóa đơn
              </span>
            }
            size="small"
            style={{ height: 'calc(100vh - 120px)', overflowY: 'auto' }}
          >
            <Radio.Group
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setSelectedOrder(null);
              }}
              style={{ width: '100%', marginBottom: 12 }}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="PENDING" style={{ width: '50%', textAlign: 'center' }}>
                Chờ thanh toán
              </Radio.Button>
              <Radio.Button value="PAID" style={{ width: '50%', textAlign: 'center' }}>
                Lịch sử đã thu
              </Radio.Button>
            </Radio.Group>

            <Input
              placeholder="Tìm bệnh nhân, mã HĐ, sđt..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ marginBottom: 12 }}
              size="small"
              allowClear
            />

            {loadingOrders ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>Đang tải...</div>
            ) : filteredOrders.length === 0 ? (
              <Empty description={statusFilter === 'PENDING' ? 'Không có hóa đơn chờ thanh toán' : 'Không có hóa đơn đã thanh toán'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredOrders.map(o => {
                  const isSelected = selectedOrder?.id === o.id;
                  return (
                    <div
                      key={o.id}
                      onClick={() => handleSelectOrder(o)}
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
                        <Text strong style={{ fontSize: 13, textTransform: 'uppercase' }}>{o.patient?.fullName}</Text>
                        {o.status === 'PENDING' && <Badge count="Chờ" style={{ backgroundColor: '#fa8c16' }} />}
                        {o.status === 'PAID' && <Badge count="Đã thu" style={{ backgroundColor: '#52c41a' }} />}
                        {o.status === 'CANCELLED' && <Badge count="Đã hủy" style={{ backgroundColor: '#ff4d4f' }} />}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                        <div>Mã HĐ: {o.orderCode}</div>
                        <div>Lượt khám: {o.visit?.visitCode}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                          <span>Tổng tiền:</span>
                          <Text type="danger" strong>{Number(o.totalAmount).toLocaleString('vi-VN')}đ</Text>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* Right column: invoice detail & payment */}
        <Col span={16}>
          {selectedOrder ? (
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    <ShoppingCartOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                    Chi tiết hóa đơn y tế: {selectedOrder.orderCode}
                  </span>
                  <Tag color={selectedOrder.items?.some(i => !i.isPaid) ? 'orange' : (selectedOrder.status === 'CANCELLED' ? 'red' : 'green')} style={{ fontSize: 11, margin: 0 }}>
                    {selectedOrder.status === 'CANCELLED' ? 'ĐÃ HỦY / HOÀN TIỀN' : (selectedOrder.items?.some(i => !i.isPaid) ? 'CÓ DỊCH VỤ CHƯA THU' : 'ĐÃ THANH TOÁN ĐỦ')}
                  </Tag>
                </div>
              }
              size="small"
              style={{ minHeight: 'calc(100vh - 120px)' }}
            >
              {/* Patient summary details */}
              <div style={{ background: '#f5f5f5', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                <Row gutter={16}>
                  <Col span={8}><strong>Bệnh nhân:</strong> <Text strong style={{ textTransform: 'uppercase' }}>{selectedOrder.patient?.fullName}</Text></Col>
                  <Col span={8}><strong>Ngày sinh:</strong> {selectedOrder.patient?.dob}</Col>
                  <Col span={8}><strong>Số điện thoại:</strong> {selectedOrder.patient?.phone}</Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 6 }}>
                  <Col span={8}><strong>Mã LK:</strong> {selectedOrder.visit?.visitCode}</Col>
                  <Col span={16}><strong>Lý do đến khám:</strong> {selectedOrder.visit?.reason || 'Khám'}</Col>
                </Row>
              </div>

              {activeAttendances.length === 0 && (
                <Alert
                  message="Chưa check-in ca trực"
                  description="Bạn cần điểm danh check-in ca trực hôm nay để thực hiện thu tiền."
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              {/* Items List Table */}
              <Title level={5} style={{ margin: '8px 0', fontSize: 13 }}>Danh sách dịch vụ sử dụng</Title>
              <Table
                dataSource={selectedOrder.items || []}
                columns={columns}
                rowKey="id"
                pagination={false}
                size="small"
              />

              <div style={{ marginTop: 16, background: '#fafafa', padding: '12px 14px', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13 }}>Tổng giá trị dịch vụ:</Text>
                  <Text strong style={{ fontSize: 14 }}>
                    {Number(selectedOrder.totalAmount).toLocaleString('vi-VN')} đ
                  </Text>
                </div>
                {paidAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13 }}>Đã thanh toán ({paidItems.length} dịch vụ):</Text>
                    <Text type="success" strong style={{ fontSize: 14 }}>
                      -{paidAmount.toLocaleString('vi-VN')} đ
                    </Text>
                  </div>
                )}
                <Divider style={{ margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: 600 }}>Cần thanh toán thêm:</Text>
                  <Text type="danger" strong style={{ fontSize: 20 }}>
                    {unpaidAmount.toLocaleString('vi-VN')} đ
                  </Text>
                </div>
              </div>

              {statusFilter === 'PENDING' && (
                <>
                  {/* Payment Method Option Selector */}
                  <div style={{ marginTop: 20 }}>
                    <Title level={5} style={{ margin: '8px 0', fontSize: 13 }}>Phương thức thanh toán</Title>
                    <Radio.Group
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      buttonStyle="solid"
                      size="middle"
                    >
                      <Radio.Button value="CASH">
                        <DollarOutlined style={{ marginRight: 6 }} />
                        Tiền mặt
                      </Radio.Button>
                      <Radio.Button value="TRANSFER">
                        <QrcodeOutlined style={{ marginRight: 6 }} />
                        Chuyển khoản (VietQR)
                      </Radio.Button>
                      <Radio.Button value="CARD">
                        <CreditCardOutlined style={{ marginRight: 6 }} />
                        Thẻ ngân hàng
                      </Radio.Button>
                    </Radio.Group>
                  </div>

                  {/* QR display block for Transfer method */}
                  {paymentMethod === 'TRANSFER' && (
                    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', background: '#e6f7ff', border: '1px solid #91d5ff', padding: 12, borderRadius: 6, gap: 16 }}>
                      <img src={qrImageUrl} alt="VietQR" style={{ width: 130, height: 130, background: '#fff', padding: 4, border: '1px solid #d9d9d9', borderRadius: 4 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1890ff' }}>Thanh toán chuyển khoản nhanh qua VietQR</div>
                        <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>
                          <div>Ngân hàng: <strong>BIDV (Mã ngân hàng: 970418)</strong></div>
                          <div>Số tài khoản: <strong>2152486504</strong></div>
                          <div>Chủ tài khoản: <strong>TRAN HUU NAM</strong></div>
                          <div>Số tiền: <strong style={{ color: '#ff4d4f' }}>{unpaidAmount.toLocaleString('vi-VN')}đ</strong></div>
                          <div>Nội dung chuyển khoản: <strong>Thanh toan vien phi ${selectedOrder.orderCode}</strong></div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Action checkout buttons */}
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Space size="middle">
                  {statusFilter === 'PENDING' ? (
                    <>
                      <Button
                        icon={<PrinterOutlined />}
                        onClick={() => handlePrintInvoice(selectedOrder)}
                      >
                        Xem phiếu nháp
                      </Button>
                      <Button
                        type="primary"
                        size="large"
                        loading={paying}
                        onClick={() => {
                          if (paymentMethod === 'TRANSFER') {
                            setShowQRModal(true);
                          } else {
                            handlePayment();
                          }
                        }}
                        disabled={activeAttendances.length === 0 || !hasBranchPermission('canCollectPayment') || unpaidAmount === 0}
                        style={{ backgroundColor: (activeAttendances.length === 0 || !hasBranchPermission('canCollectPayment') || unpaidAmount === 0) ? undefined : '#52c41a', borderColor: (activeAttendances.length === 0 || !hasBranchPermission('canCollectPayment') || unpaidAmount === 0) ? undefined : '#52c41a', height: 42, padding: '0 24px' }}
                      >
                        {unpaidAmount === 0 ? 'Đã thu đủ tiền' : (paymentMethod === 'TRANSFER' ? 'Hiển thị mã QR & Thu tiền' : 'Xác nhận thanh toán & In hóa đơn')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        icon={<PrinterOutlined />}
                        onClick={() => handlePrintInvoice(selectedOrder)}
                      >
                        In lại hóa đơn
                      </Button>
                      <Button
                        type="primary"
                        ghost
                        icon={<CompassOutlined />}
                        onClick={() => handleOpenTransfer(selectedOrder.visit)}
                        disabled={!selectedOrder.visit}
                        style={{ borderColor: '#52c41a', color: '#52c41a' }}
                      >
                        Điều phối phòng
                      </Button>
                      {hasBranchPermission('canRefundPayment') && selectedOrder.items?.some(item => item.status === 'PENDING') && (
                        <Button
                          type="primary"
                          danger
                          size="large"
                          onClick={() => {
                            setSelectedItemsForRefund([]);
                            setRefundReason('');
                            setRefundPaymentMethod('CASH');
                            setRefundModalVisible(true);
                          }}
                          style={{ height: 42, padding: '0 24px' }}
                        >
                          Hoàn tiền / Hủy dịch vụ
                        </Button>
                      )}
                    </>
                  )}
                </Space>
              </div>
            </Card>
          ) : (
            <Card style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description={statusFilter === 'PENDING' ? 'Vui lòng chọn hóa đơn chờ thanh toán bên trái' : 'Vui lòng chọn hóa đơn đã thanh toán bên trái'} />
            </Card>
          )}

          {/* Refund Modal */}
          {selectedOrder && (
            <Modal
              title={
                <span style={{ color: '#d9363e', fontWeight: 600 }}>
                  Hủy dịch vụ & Hoàn trả tiền y tế
                </span>
              }
              open={refundModalVisible}
              onCancel={() => setRefundModalVisible(false)}
              okText="Xác nhận hoàn tiền"
              cancelText="Hủy bỏ"
              confirmLoading={refundLoading}
              onOk={handleRefundSubmit}
              width={650}
              destroyOnClose
            >
              <div style={{ marginBottom: 16, fontSize: 13 }}>
                Hóa đơn: <strong>{selectedOrder.orderCode}</strong> - Bệnh nhân: <strong style={{ textTransform: 'uppercase' }}>{selectedOrder.patient?.fullName}</strong>
              </div>

              <div style={{ marginBottom: 12, fontWeight: 600 }}>Chọn dịch vụ muốn hoàn trả:</div>
              <Table
                dataSource={selectedOrder.items?.filter(i => i.status === 'PENDING') || []}
                rowKey="id"
                pagination={false}
                size="small"
                rowSelection={{
                  type: 'checkbox',
                  selectedRowKeys: selectedItemsForRefund,
                  onChange: (selectedKeys) => setSelectedItemsForRefund(selectedKeys),
                }}
                columns={[
                  {
                    title: 'Tên dịch vụ',
                    dataIndex: ['service', 'name'],
                    key: 'serviceName',
                  },
                  {
                    title: 'Đơn giá',
                    dataIndex: 'price',
                    key: 'price',
                    align: 'right',
                    render: p => `${Number(p).toLocaleString('vi-VN')}đ`,
                  },
                  {
                    title: 'SL',
                    dataIndex: 'quantity',
                    key: 'quantity',
                    align: 'center',
                  },
                  {
                    title: 'Tổng cộng',
                    key: 'total',
                    align: 'right',
                    render: (_, r) => `${(Number(r.price) * r.quantity).toLocaleString('vi-VN')}đ`,
                  }
                ]}
              />

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff2f0', border: '1px solid #ffccc7', padding: '10px 14px', borderRadius: 6 }}>
                <span style={{ fontWeight: 600 }}>Tổng tiền hoàn trả:</span>
                <span style={{ color: '#ff4d4f', fontWeight: 700, fontSize: 18 }}>
                  {(() => {
                    const totalRefund = selectedItemsForRefund.reduce((sum, itemId) => {
                      const item = selectedOrder.items?.find(i => i.id === itemId);
                      return sum + (item ? Number(item.price) * item.quantity : 0);
                    }, 0);
                    return totalRefund.toLocaleString('vi-VN');
                  })()} đ
                </span>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Hình thức hoàn tiền:</div>
                <Radio.Group
                  value={refundPaymentMethod}
                  onChange={e => setRefundPaymentMethod(e.target.value)}
                  buttonStyle="solid"
                  size="middle"
                >
                  <Radio.Button value="CASH">Tiền mặt</Radio.Button>
                  <Radio.Button value="TRANSFER">Chuyển khoản</Radio.Button>
                  <Radio.Button value="CARD">Thẻ ngân hàng</Radio.Button>
                </Radio.Group>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Lý do hoàn trả:</div>
                <Input.TextArea
                  rows={3}
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  placeholder="Nhập lý do chi tiết hoàn trả dịch vụ..."
                />
              </div>
            </Modal>
          )}

          {/* VietQR Modal */}
          <Modal
            title={<strong style={{ color: '#1890ff', fontSize: 16 }}>Quét mã VietQR để thanh toán</strong>}
            open={showQRModal}
            onCancel={() => setShowQRModal(false)}
            footer={[
              <Button key="close" onClick={() => setShowQRModal(false)}>Đóng</Button>,
              <Button
                key="pay"
                type="primary"
                loading={paying}
                onClick={() => {
                  setShowQRModal(false);
                  handlePayment();
                }}
                disabled={activeAttendances.length === 0 || unpaidAmount === 0}
                style={{ backgroundColor: (activeAttendances.length === 0 || unpaidAmount === 0) ? undefined : '#52c41a', borderColor: (activeAttendances.length === 0 || unpaidAmount === 0) ? undefined : '#52c41a' }}
              >
                Xác nhận đã nhận chuyển khoản & In hóa đơn
              </Button>
            ]}
            width={420}
            bodyStyle={{ textAlign: 'center', padding: '12px' }}
          >
            {selectedOrder && (
              <div>
                <img
                  src={qrImageUrl}
                  alt="VietQR"
                  style={{ width: 200, height: 200, margin: '0 auto 12px auto', display: 'block', border: '1px solid #d9d9d9', padding: 4, borderRadius: 6 }}
                />
                <div style={{ textAlign: 'left', background: '#f5f5f5', padding: '12px', borderRadius: 6, fontSize: '12px', lineHeight: '1.6' }}>
                  <div>Ngân hàng: <strong>BIDV (Mã: 970418)</strong></div>
                  <div>Số tài khoản: <strong>2152486504</strong></div>
                  <div>Chủ tài khoản: <strong>TRAN HUU NAM</strong></div>
                  <div>Số tiền: <strong style={{ color: '#ff4d4f' }}>{Number(selectedOrder.totalAmount).toLocaleString('vi-VN')}đ</strong></div>
                  <div style={{ marginTop: 4 }}>Nội dung CK: <strong style={{ color: '#059669' }}>Thanh toan vien phi {selectedOrder.orderCode}</strong></div>
                </div>
              </div>
            )}
          </Modal>

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
                    <span>Dịch vụ chỉ định & Trạng thái thanh toán</span>
                    {selectedOrder ? (
                      <Tag color={selectedOrder.status === 'PAID' ? 'green' : 'orange'} style={{ margin: 0, fontSize: '10px' }}>
                        {selectedOrder.status === 'PAID' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
                      </Tag>
                    ) : (
                      <Tag color="red" style={{ margin: 0, fontSize: '10px' }}>CHƯA CÓ HÓA ĐƠN</Tag>
                    )}
                  </div>

                  {selectedOrder && selectedOrder.items?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
                      {selectedOrder.items.map((item, idx) => (
                        <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '6px 8px', borderRadius: 4 }}>
                          <span style={{ fontWeight: 500, color: '#262626' }}>{item.service?.name}</span>
                          <span style={{ fontSize: '11px' }}>
                            {selectedOrder.status === 'PAID' ? (
                              <span style={{ color: '#52c41a', fontWeight: 600 }}>● Đã thanh toán</span>
                            ) : (
                              <span style={{ color: '#fa8c16', fontWeight: 600 }}>● Chưa thanh toán</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#8c8c8c', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                      Chưa có dịch vụ chỉ định nào.
                    </div>
                  )}

                  {selectedOrder && selectedOrder.status === 'PENDING' && (
                    <div style={{ marginTop: 10, padding: '8px 10px', background: '#fff2e6', border: '1px solid #ffd8bf', borderRadius: 4, color: '#d46b08', fontSize: '11px', lineHeight: '1.4' }}>
                      ⚠️ <strong>Cảnh báo:</strong> Bệnh nhân chưa thanh toán. Vui lòng thực hiện thu tiền và hoàn tất hóa đơn trước khi điều phối vào phòng thực hiện CLS!
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
        </Col>
      </Row>
    </div>
  );
}
