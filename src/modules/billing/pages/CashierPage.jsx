import React, { useEffect, useState } from 'react';
import {
  Row, Col, Card, Table, Button, Radio, Space, Tag,
  Typography, message, Input, Empty, Modal, Badge
} from 'antd';
import {
  DollarOutlined, SearchOutlined, CreditCardOutlined,
  PrinterOutlined, ShoppingCartOutlined, QrcodeOutlined
} from '@ant-design/icons';
import { billingService } from '../../../services/billingService';

const { Title, Text } = Typography;

export default function CashierPage() {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paying, setPaying] = useState(false);
  
  const [showQRModal, setShowQRModal] = useState(false);
  
  const activeBranchId = localStorage.getItem('activeBranchId');

  useEffect(() => {
    fetchPendingOrders();

    // Listen for branch changes
    const handleBranchChange = () => {
      setSelectedOrder(null);
      fetchPendingOrders();
    };
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, []);

  const fetchPendingOrders = async () => {
    try {
      setLoadingOrders(true);
      // Fetch all orders (we will filter PENDING orders for cashier)
      const data = await billingService.getOrders({ status: 'PENDING' });
      setOrders(data);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách hóa đơn chờ thanh toán');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setPaymentMethod('CASH');
  };

  const handlePayment = async () => {
    if (!selectedOrder) return;
    try {
      setPaying(true);
      const res = await billingService.createPayment({
        orderId: selectedOrder.id,
        amount: Number(selectedOrder.totalAmount),
        paymentMethod: paymentMethod,
      });
      message.success('Thanh toán thành công!');
      
      // Auto-trigger printing receipt
      handlePrintInvoice(selectedOrder, [res]);
      
      setSelectedOrder(null);
      fetchPendingOrders();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Thanh toán thất bại');
    } finally {
      setPaying(false);
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
    }
  ];

  // VietQR generation variables fallback matching backend configurations
  const bankCode = '970418';
  const accountNum = '2152486504';
  const accountName = 'TRAN HUU NAM';

  const qrImageUrl = selectedOrder 
    ? `https://img.vietqr.io/image/${bankCode}-${accountNum}-compact2.png?amount=${selectedOrder.totalAmount}&addInfo=Thanh%20toan%20vien%20phi%20${selectedOrder.orderCode}&accountName=${encodeURIComponent(accountName)}`
    : '';

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16}>
        {/* Left column: list of pending bills */}
        <Col span={8}>
          <Card
            title={
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                <DollarOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                Danh sách chờ thanh toán
              </span>
            }
            size="small"
            style={{ height: 'calc(100vh - 120px)', overflowY: 'auto' }}
          >
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
              <Empty description="Không có hóa đơn chờ thanh toán" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                        <Badge count="Chờ" style={{ backgroundColor: '#fa8c16' }} />
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
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  <ShoppingCartOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                  Chi tiết hóa đơn y tế: {selectedOrder.orderCode}
                </span>
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

              {/* Items List Table */}
              <Title level={5} style={{ margin: '8px 0', fontSize: 13 }}>Danh sách dịch vụ sử dụng</Title>
              <Table
                dataSource={selectedOrder.items || []}
                columns={columns}
                rowKey="id"
                pagination={false}
                size="small"
              />

              <div style={{ textAlign: 'right', marginTop: 16, background: '#fafafa', padding: '10px 14px', borderRadius: 6 }}>
                <Text style={{ fontSize: 14, marginRight: 8 }}>Tổng tiền thanh toán:</Text>
                <Text type="danger" strong style={{ fontSize: 20 }}>
                  {Number(selectedOrder.totalAmount).toLocaleString('vi-VN')} đ
                </Text>
              </div>

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
                      <div>Số tiền: <strong style={{ color: '#ff4d4f' }}>{Number(selectedOrder.totalAmount).toLocaleString('vi-VN')}đ</strong></div>
                      <div>Nội dung chuyển khoản: <strong>Thanh toan vien phi ${selectedOrder.orderCode}</strong></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action checkout buttons */}
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Space size="middle">
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
                    onClick={handlePayment}
                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', height: 42, padding: '0 24px' }}
                  >
                    Xác nhận thanh toán & In hóa đơn
                  </Button>
                </Space>
              </div>
            </Card>
          ) : (
            <Card style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="Vui lòng chọn hóa đơn chờ thanh toán bên trái" />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
