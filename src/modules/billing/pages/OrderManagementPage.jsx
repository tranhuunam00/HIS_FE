import React, { useEffect, useState } from 'react';
import {
  Row, Col, Card, Table, Button, Form, Select, InputNumber,
  Input, Space, Tag, Typography, message, Divider, Tooltip, Empty, Alert
} from 'antd';
import {
  MedicineBoxOutlined, SearchOutlined, CheckCircleOutlined,
  DeleteOutlined, PlusOutlined, UserOutlined
} from '@ant-design/icons';
import { visitService } from '../../../services/visitService';
import { medicalService } from '../../../services/medicalService';
import { billingService } from '../../../services/billingService';
import { authAdminService } from '../../../services/authAdminService';
import { attendanceService } from '../../../services/attendanceService';

const { Title, Text } = Typography;
const { Option } = Select;

const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function OrderManagementPage() {
  const [visits, setVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [searchVisitText, setSearchVisitText] = useState('');
  const [selectedVisit, setSelectedVisit] = useState(null);
  
  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const [specialties, setSpecialties] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const [form] = Form.useForm();
  const [addingItem, setAddingItem] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [activeAttendances, setActiveAttendances] = useState([]);
  
  const activeBranchId = localStorage.getItem('activeBranchId');

  useEffect(() => {
    fetchVisits();
    loadSpecialties();
    loadUserProfile();
    
    // Listen for branch changes
    const handleBranchChange = () => {
      setSelectedVisit(null);
      setOrder(null);
      fetchVisits();
      loadUserProfile();
    };
    window.addEventListener('branchChanged', handleBranchChange);
    return () => window.removeEventListener('branchChanged', handleBranchChange);
  }, [activeBranchId]);

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

  const fetchVisits = async () => {
    if (!activeBranchId) return;
    try {
      setLoadingVisits(true);
      const today = getTodayStr();
      const list = await visitService.getVisits({ branchId: activeBranchId, date: today });
      setVisits(list);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách lượt khám hôm nay');
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
      const listPrice = selectedSvc.prices?.find(p => p.priceType === 'LISTED');
      const amount = listPrice ? Number(listPrice.amount) : (selectedSvc.prices?.[0] ? Number(selectedSvc.prices[0].amount) : 0);
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
      const updatedOrder = await billingService.updateOrderItem(order.id, itemId, { status: newStatus });
      setOrder(updatedOrder);
      message.success('Cập nhật trạng thái thành công');
    } catch (err) {
      console.error(err);
      message.error('Không thể cập nhật trạng thái');
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

  const filteredVisits = visits.filter(v => {
    if (currentUser && ['DOCTOR', 'NURSE'].includes(currentUser.roleName)) {
      if (activeAttendances.length === 0) return false;
      const doctorRoomIds = currentUser.staff?.assignments?.map(a => a.roomId).filter(Boolean) || [];
      if (!doctorRoomIds.includes(v.currentRoomId)) return false;
    }
    const term = searchVisitText.toLowerCase();
    const patientName = v.patient?.fullName?.toLowerCase() || '';
    const visitCode = v.visitCode?.toLowerCase() || '';
    const phone = v.patient?.phone || '';
    return patientName.includes(term) || visitCode.includes(term) || phone.includes(term);
  });

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
          </div>
        </div>
      )
    },
    {
      title: 'Đơn giá',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      width: 130,
      render: price => <Text strong>{Number(price).toLocaleString('vi-VN')}đ</Text>
    },
    {
      title: 'SL',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
      width: 60,
    },
    {
      title: 'Thành tiền',
      key: 'total',
      align: 'right',
      width: 140,
      render: (_, record) => (
        <Text type="success" strong>
          {(Number(record.price) * record.quantity).toLocaleString('vi-VN')}đ
        </Text>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      width: 110,
      render: status => {
        if (status === 'COMPLETED') return <Tag color="green">Đã thực hiện</Tag>;
        if (status === 'CANCELLED') return <Tag color="red">Đã hủy</Tag>;
        return <Tag color="orange">Chờ thực hiện</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      width: 120,
      render: (_, record) => {
        if (record.status === 'PENDING') {
          return (
            <Space>
              <Tooltip title="Đánh dấu hoàn thành dịch vụ">
                <Button
                  type="text"
                  icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  onClick={() => handleUpdateItemStatus(record.id, 'COMPLETED')}
                />
              </Tooltip>
              <Tooltip title="Xóa dịch vụ chưa thực hiện">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteItem(record.id)}
                />
              </Tooltip>
            </Space>
          );
        }
        return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
      }
    }
  ];

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16}>
        {/* Left Side: Visits list */}
        <Col span={8}>
          <Card
            title={
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                <UserOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                Lượt khám hôm nay
              </span>
            }
            size="small"
            style={{ height: 'calc(100vh - 120px)', overflowY: 'auto' }}
          >
            {currentUser && ['DOCTOR', 'NURSE'].includes(currentUser.roleName) && activeAttendances.length === 0 && (
              <Alert
                message="Chưa check-in ca trực"
                description="Bạn cần điểm danh check-in ca trực hôm nay để xem hàng đợi khám."
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}
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
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                        <div>Mã LK: {v.visitCode}</div>
                        <div>Lý do: {v.reason || 'Khám tổng quát'}</div>
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
              <div style={{ background: '#f5f5f5', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                <Row gutter={16}>
                  <Col span={6}><strong>Mã LK:</strong> {selectedVisit.visitCode}</Col>
                  <Col span={6}><strong>Giới tính:</strong> {selectedVisit.patient?.gender === 'MALE' ? 'Nam' : 'Nữ'}</Col>
                  <Col span={6}><strong>Ngày sinh:</strong> {selectedVisit.patient?.dob}</Col>
                  <Col span={6}><strong>SĐT:</strong> {selectedVisit.patient?.phone}</Col>
                </Row>
              </div>

              {/* Order Items Table */}
              <Title level={5} style={{ margin: '8px 0', fontSize: 13 }}>Dịch vụ chỉ định</Title>
              <Table
                dataSource={order?.items || []}
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
              {order?.status !== 'PAID' ? (
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
    </div>
  );
}
