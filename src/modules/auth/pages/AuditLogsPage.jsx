import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Select, DatePicker, Button, Space, Typography, Tag, Row, Col, message } from 'antd';
import { HistoryOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons';
import { auditLogService } from '../../../services/auditLogService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [selectedModule, setSelectedModule] = useState(undefined);
  const [selectedAction, setSelectedAction] = useState(undefined);
  const [dateRange, setDateRange] = useState(null);

  const fetchLogs = async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      const offset = (page - 1) * size;
      
      const filters = {
        limit: size,
        offset,
      };

      if (searchText.trim()) {
        filters.search = searchText.trim();
      }
      if (selectedModule) {
        filters.module = selectedModule;
      }
      if (selectedAction) {
        filters.action = selectedAction;
      }
      if (dateRange && dateRange[0] && dateRange[1]) {
        filters.startDate = dateRange[0].format('YYYY-MM-DD');
        filters.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const res = await auditLogService.getAuditLogs(filters);
      setLogs(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải nhật ký thao tác hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, pageSize);
    setCurrentPage(1);
  }, [selectedModule, selectedAction, dateRange]);

  const handleSearch = () => {
    fetchLogs(1, pageSize);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchText('');
    setSelectedModule(undefined);
    setSelectedAction(undefined);
    setDateRange(null);
    setCurrentPage(1);
  };

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'Người thao tác',
      key: 'user',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.userName || 'N/A'}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>ID: {record.userId?.slice(-8) || 'System'}</Text>
        </Space>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'userRole',
      key: 'userRole',
      width: 120,
      render: (role) => {
        let color = 'default';
        if (role === 'ADMIN') color = 'red';
        else if (role === 'DOCTOR') color = 'blue';
        else if (role === 'NURSE') color = 'green';
        return <Tag color={color} style={{ fontWeight: 600 }}>{role || 'N/A'}</Tag>;
      },
    },
    {
      title: 'Phân hệ',
      dataIndex: 'module',
      key: 'module',
      width: 130,
      render: (mod) => {
        let color = 'default';
        if (mod === 'BILLING') color = 'gold';
        else if (mod === 'RECEPTION') color = 'blue';
        else if (mod === 'AUTH') color = 'cyan';
        return <Tag color={color} style={{ fontWeight: 600 }}>{mod}</Tag>;
      },
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 180,
      render: (act) => {
        let color = 'default';
        let label = act;
        switch (act) {
          case 'ADD_SERVICE':
            color = 'green';
            label = 'Thêm chỉ định';
            break;
          case 'UPDATE_SERVICE':
            color = 'orange';
            label = 'Sửa chỉ định / KQ';
            break;
          case 'DELETE_SERVICE':
            color = 'volcano';
            label = 'Xóa chỉ định';
            break;
          case 'CHECK_IN':
            color = 'geekblue';
            label = 'Tiếp nhận khám';
            break;
          case 'UPDATE_VITALS':
            color = 'cyan';
            label = 'Cập nhật sinh hiệu';
            break;
          case 'TRANSFER_ROOM':
            color = 'purple';
            label = 'Điều phối phòng';
            break;
          case 'CONFIRM_RESULTS_WAIT':
            color = 'magenta';
            label = 'Chờ kết quả';
            break;
          case 'ACCEPT_PATIENT':
            color = 'pink';
            label = 'Nhận khám';
            break;
          case 'COMPLETE_PATIENT':
            color = 'success';
            label = 'Hoàn thành khám';
            break;
        }
        return <Tag color={color} style={{ fontWeight: 'bold' }}>{label}</Tag>;
      },
    },
    {
      title: 'Mô tả hoạt động',
      dataIndex: 'description',
      key: 'description',
      render: (text) => <Text style={{ fontSize: 13 }}>{text}</Text>,
    },
    {
      title: 'Địa chỉ IP',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
      render: (ip) => ip || 'N/A',
    },
  ];

  return (
    <div style={{ padding: '16px 20px', background: '#f8fafc', minHeight: 'calc(100vh - 48px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 'bold', color: '#0f172a' }}>
            <HistoryOutlined style={{ marginRight: 8, color: '#3b82f6' }} />
            Nhật ký hệ thống (Audit Trail)
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Lịch sử toàn bộ các thao tác thêm, sửa, xóa dữ liệu khám, điều phối và chỉ định dịch vụ của nhân viên.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<SyncOutlined spin={loading} />}
          onClick={() => fetchLogs(currentPage, pageSize)}
          style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6', borderRadius: 6 }}
        >
          Làm mới
        </Button>
      </div>

      <Card style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} md={6}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Tìm kiếm thông tin:</div>
            <Input
              placeholder="Nhập tên user, vai trò, mô tả..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              size="small"
            />
          </Col>
          <Col xs={12} md={4}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Lọc Phân hệ:</div>
            <Select
              placeholder="Tất cả phân hệ"
              value={selectedModule}
              onChange={setSelectedModule}
              allowClear
              style={{ width: '100%' }}
              size="small"
            >
              <Option value="RECEPTION">RECEPTION (Tiếp đón)</Option>
              <Option value="BILLING">BILLING (Hóa đơn & CLS)</Option>
              <Option value="AUTH">AUTH (Bảo mật & Quyền)</Option>
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Lọc Hành động:</div>
            <Select
              placeholder="Tất cả hành động"
              value={selectedAction}
              onChange={setSelectedAction}
              allowClear
              style={{ width: '100%' }}
              size="small"
            >
              <Option value="CHECK_IN">Tiếp nhận khám</Option>
              <Option value="UPDATE_VITALS">Cập nhật sinh hiệu</Option>
              <Option value="TRANSFER_ROOM">Điều phối phòng</Option>
              <Option value="ADD_SERVICE">Thêm chỉ định</Option>
              <Option value="UPDATE_SERVICE">Sửa chỉ định / KQ</Option>
              <Option value="DELETE_SERVICE">Xóa chỉ định</Option>
              <Option value="CONFIRM_RESULTS_WAIT">Chờ kết quả</Option>
              <Option value="ACCEPT_PATIENT">Nhận khám</Option>
              <Option value="COMPLETE_PATIENT">Hoàn thành khám</Option>
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Lọc theo Khoảng ngày:</div>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              size="small"
            />
          </Col>
          <Col xs={24} md={4} style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" onClick={handleSearch} style={{ flex: 1 }} size="small">
              Tìm kiếm
            </Button>
            <Button onClick={handleReset} style={{ flex: 1 }} size="small">
              Xóa lọc
            </Button>
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            pageSizeOptions: ['15', '30', '50', '100'],
            showTotal: (totalCount) => `Tổng cộng ${totalCount} bản ghi`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
              fetchLogs(page, size);
            },
          }}
          size="small"
        />
      </Card>
    </div>
  );
}
