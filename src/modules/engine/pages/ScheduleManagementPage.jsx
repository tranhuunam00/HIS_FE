import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Table,
  Button,
  Tag,
  Switch,
  Card,
  Select,
  DatePicker,
  Space,
  Typography,
  Tooltip,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  CalendarOutlined,
  BuildOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { scheduleService } from '../../../services/scheduleService';
import { orgService } from '../../../services/orgService';
import { staffService } from '../../../services/staffService';
import ShiftFormModal from '../components/ShiftFormModal';
import ScheduleUpdateModal from '../components/ScheduleUpdateModal';
import ScheduleOverrideModal from '../components/ScheduleOverrideModal';

const { Option } = Select;
const { Title, Paragraph } = Typography;

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DAY_FULL_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const DAY_VALUES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ScheduleManagementPage() {
  const [activeTab, setActiveTab] = useState('schedules');
  const [loading, setLoading] = useState(false);

  // Filter states
  const [selectedBranchId, setSelectedBranchId] = useState(undefined);
  const [selectedWeek, setSelectedWeek] = useState(dayjs()); // default to current week

  // Metadata
  const [branches, setBranches] = useState([]);
  const [shifts, setShifts] = useState([]);

  // Data states
  const [staffList, setStaffList] = useState([]);
  const [resolvedSchedules, setResolvedSchedules] = useState([]);

  // Modal states
  const [shiftModalVisible, setShiftModalVisible] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  const [scheduleUpdateVisible, setScheduleUpdateVisible] = useState(false);
  const [selectedStaffForUpdate, setSelectedStaffForUpdate] = useState(null);

  const [overrideVisible, setOverrideVisible] = useState(false);
  const [overrideParams, setOverrideParams] = useState({
    staff: null,
    date: '',
    overrideId: null,
    currentOverride: null,
  });

  useEffect(() => {
    fetchMetadata();

    const handleBranchChanged = () => {
      const storedBranch = localStorage.getItem('activeBranchId');
      if (storedBranch) {
        setSelectedBranchId(storedBranch);
      }
    };

    window.addEventListener('branchChanged', handleBranchChanged);
    return () => {
      window.removeEventListener('branchChanged', handleBranchChanged);
    };
  }, []);

  const fetchMetadata = async () => {
    try {
      const branchList = await orgService.getBranches();
      setBranches(branchList);
      if (branchList.length > 0) {
        const storedBranch = localStorage.getItem('activeBranchId');
        const defaultBranch = branchList.some(b => b.id === storedBranch) ? storedBranch : branchList[0].id;
        setSelectedBranchId(defaultBranch);
      }
      const shiftList = await scheduleService.getShifts();
      setShifts(shiftList);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải dữ liệu cấu hình chi nhánh & ca trực');
    }
  };

  const handleBranchChange = (value) => {
    setSelectedBranchId(value);
  };

  // Main schedule query execution
  const fetchSchedules = async () => {
    if (!selectedBranchId) return;

    try {
      setLoading(true);

      // 1. Get staff list matching the branch filter
      const staffParams = { branchId: selectedBranchId };
      const staffData = await staffService.getStaffList(staffParams);
      setStaffList(staffData);

      if (staffData.length === 0) {
        setResolvedSchedules([]);
        setLoading(false);
        return;
      }

      // 2. Parse date range (Monday to Sunday) of selectedWeek
      const startOfWeek = selectedWeek.startOf('week').add(1, 'day'); // Monday in dayjs
      const endOfWeek = selectedWeek.endOf('week').add(1, 'day'); // Sunday in dayjs

      const staffIds = staffData.map((s) => s.id);
      const scheduleParams = {
        staffIds,
        startDate: startOfWeek.format('YYYY-MM-DD'),
        endDate: endOfWeek.format('YYYY-MM-DD'),
      };

      // 3. Query resolved schedules
      const scheduleData = await scheduleService.getSchedules(scheduleParams);
      setResolvedSchedules(scheduleData);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải thông tin lịch trực nhân sự');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'schedules') {
      fetchSchedules();
    }
  }, [activeTab, selectedBranchId, selectedWeek]);

  // Shifts Tab functions
  const fetchShiftsOnly = async () => {
    try {
      setLoading(true);
      const data = await scheduleService.getShifts();
      setShifts(data);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải ca trực');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'shifts') {
      fetchShiftsOnly();
    }
  }, [activeTab]);

  const handleEditShift = (shift) => {
    setSelectedShift(shift);
    setShiftModalVisible(true);
  };

  const handleAddShift = () => {
    setSelectedShift(null);
    setShiftModalVisible(true);
  };

  const handleToggleShiftStatus = async (checked, record) => {
    try {
      await scheduleService.toggleShiftStatus(record.id, checked);
      message.success(`Đã ${checked ? 'hoạt động' : 'ngừng hoạt động'} ca trực ${record.name}`);
      fetchShiftsOnly();
    } catch (err) {
      console.error(err);
      message.error('Thay đổi trạng thái ca trực thất bại');
    }
  };

  // Schedule Update Modal triggers
  const handleOpenIndividualUpdate = (staffItem) => {
    setSelectedStaffForUpdate(staffItem);
    setScheduleUpdateVisible(true);
  };

  const handleOpenBulkUpdate = () => {
    setSelectedStaffForUpdate(null);
    setScheduleUpdateVisible(true);
  };

  // Cell clicking -> Override Daily Schedule
  const handleCellClick = (staffItem, dateStr) => {
    const daySched = resolvedSchedules.find(
      (s) => s.staffId === staffItem.id && s.date === dateStr
    );

    setOverrideParams({
      staff: staffItem,
      date: dateStr,
      overrideId: daySched?.overrideId || null,
      currentOverride: daySched || null,
    });
    setOverrideVisible(true);
  };

  // Grid dates construction helper
  const getWeekDays = () => {
    const startOfWeek = selectedWeek.startOf('week').add(1, 'day'); // Monday
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = startOfWeek.add(idx, 'day');
      return {
        dateStr: d.format('YYYY-MM-DD'),
        label: DAY_FULL_LABELS[idx],
        shortLabel: `${DAY_LABELS[idx]} (${d.format('DD/MM')})`,
      };
    });
  };

  const weekDays = getWeekDays();

  // Columns for resolved schedules table grid
  const scheduleColumns = [
    {
      title: 'Nhân sự',
      key: 'staff',
      width: '180px',
      fixed: 'left',
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#30456c' }}>{record.fullName}</span>
          <span style={{ fontSize: 11, color: '#8c8c8c' }}>
            {record.staffCode} | {record.title}
          </span>
          {record.nickname && (
            <Tag size="small" color="blue" style={{ width: 'fit-content', fontSize: 10, margin: 0, padding: '0 4px' }}>
              {record.nickname}
            </Tag>
          )}
        </div>
      ),
    },
    ...weekDays.map((day) => ({
      title: day.shortLabel,
      key: day.dateStr,
      align: 'center',
      render: (_, record) => {
        const daySched = resolvedSchedules.find(
          (s) => s.staffId === record.id && s.date === day.dateStr
        );

        if (!daySched || (daySched.shifts.length === 0 && !daySched.isLeave)) {
          return (
            <div
              style={{ padding: '8px', cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => handleCellClick(record, day.dateStr)}
            >
              <span style={{ color: '#bfbfbf' }}>-</span>
            </div>
          );
        }

        if (daySched.isLeave) {
          return (
            <div
              style={{ padding: '4px', cursor: 'pointer', minHeight: '44px', background: '#fff2f0', borderRadius: 4 }}
              onClick={() => handleCellClick(record, day.dateStr)}
            >
              <Tooltip title={`Lý do: ${daySched.leaveReason || 'Nghỉ phép'}`}>
                <Tag color="red" style={{ margin: 0, fontSize: 11 }}>
                  Nghỉ phép
                </Tag>
              </Tooltip>
            </div>
          );
        }

        return (
          <div
            style={{
              padding: '4px',
              cursor: 'pointer',
              minHeight: '44px',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => handleCellClick(record, day.dateStr)}
          >
            {daySched.shifts.map((s, sIdx) => {
              // Assign color by shift name
              let color = 'default';
              const nameLower = s.shiftName.toLowerCase();
              if (nameLower.includes('sáng')) color = 'success';
              else if (nameLower.includes('chiều')) color = 'processing';
              else if (nameLower.includes('tối')) color = 'warning';

              return (
                <Tooltip key={sIdx} title={`${s.shiftName}: ${s.startTime} - ${s.endTime} @ ${s.branchName}`}>
                  <Tag color={color} style={{ margin: 0, fontSize: 10, width: '100%', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {s.shiftName} ({s.branchName.replace('Chi nhánh ', '')})
                  </Tag>
                </Tooltip>
              );
            })}
          </div>
        );
      },
    })),
    {
      title: 'Thao tác',
      key: 'action',
      width: '100px',
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => handleOpenIndividualUpdate(record)}
          icon={<CalendarOutlined />}
          style={{ fontSize: 11 }}
        >
          Xếp lịch tuần
        </Button>
      ),
    },
  ];

  // Columns for shifts tab table
  const shiftColumns = [
    {
      title: 'Tên ca trực',
      dataIndex: 'name',
      key: 'name',
      width: '35%',
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Giờ bắt đầu',
      dataIndex: 'startTime',
      key: 'startTime',
      width: '25%',
    },
    {
      title: 'Giờ kết thúc',
      dataIndex: 'endTime',
      key: 'endTime',
      width: '25%',
    },
    {
      title: 'Trạng thái hoạt động',
      dataIndex: 'isActive',
      key: 'isActive',
      width: '10%',
      render: (isActive, record) => (
        <Switch
          size="small"
          checked={isActive}
          onChange={(checked) => handleToggleShiftStatus(checked, record)}
        />
      ),
    },
    {
      title: 'Sửa',
      key: 'action',
      width: '5%',
      render: (_, record) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          size="small"
          onClick={() => handleEditShift(record)}
        />
      ),
    },
  ];

  const tabItems = [
    {
      key: 'schedules',
      label: (
        <span>
          <CalendarOutlined />
          Lịch làm việc nhân sự
        </span>
      ),
      children: (
        <Card
          size="small"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Chi nhánh:</span>
              <Select
                size="small"
                style={{ width: 180 }}
                value={selectedBranchId}
                onChange={handleBranchChange}
              >
                {branches.map((b) => (
                  <Option key={b.id} value={b.id}>
                    {b.name}
                  </Option>
                ))}
              </Select>

              <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 8 }}>Tuần trực:</span>
              <DatePicker
                picker="week"
                size="small"
                style={{ width: 180 }}
                value={selectedWeek}
                onChange={setSelectedWeek}
                format="Tuần w, YYYY"
              />
            </div>
          }
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenBulkUpdate}
              size="small"
            >
              Cập nhật nhanh
            </Button>
          }
          styles={{ body: { padding: '0px' } }}
        >
          <div style={{ padding: '6px 12px', background: '#fafafa', borderBottom: '1px solid #f0f0f0', fontSize: 11, color: '#8c8c8c' }}>
            💡 Mẹo: Nhấp chuột vào một ô ca trực bất kỳ của nhân viên để thiết lập nghỉ phép hoặc điều chỉnh ca của ngày đó đột xuất.
          </div>
          <Table
            dataSource={staffList}
            columns={scheduleColumns}
            rowKey="id"
            size="small"
            loading={loading}
            scroll={{ x: 900 }}
            pagination={{ pageSize: 15, size: 'small' }}
          />
        </Card>
      ),
    },
    {
      key: 'shifts',
      label: (
        <span>
          <BuildOutlined />
          Danh mục ca trực
        </span>
      ),
      children: (
        <Card
          size="small"
          title={<span style={{ fontWeight: 600 }}>Cấu hình ca làm việc mặc định</span>}
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddShift}
              size="small"
            >
              Thêm ca trực
            </Button>
          }
          styles={{ body: { padding: '0px' } }}
        >
          <Table
            dataSource={shifts}
            columns={shiftColumns}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={false}
          />
        </Card>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '16px', maxWidth: 1200, margin: '0 auto 16px auto' }}>
        <Title level={4} style={{ margin: 0 }}>Xếp lịch làm việc & Ca trực</Title>
        <Paragraph style={{ margin: 0, color: '#8c8c8c', fontSize: '12px' }}>
          Quản lý ca làm việc mặc định và xếp lịch tuần cho nhân sự, hỗ trợ điều chỉnh lịch nghỉ phép/đổi ca trực trực tiếp theo ngày.
        </Paragraph>
      </div>

      <Card size="small" style={{ maxWidth: 1200, margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="small" />
      </Card>

      {/* Shift Form Modal */}
      <ShiftFormModal
        visible={shiftModalVisible}
        shift={selectedShift}
        onClose={() => setShiftModalVisible(false)}
        onRefresh={fetchShiftsOnly}
      />

      {/* Schedule Update Modal */}
      <ScheduleUpdateModal
        visible={scheduleUpdateVisible}
        staff={selectedStaffForUpdate}
        staffList={staffList}
        shifts={shifts}
        branches={branches}
        defaultEffectiveDate={selectedWeek.startOf('week').add(1, 'day')}
        initialSchedules={selectedStaffForUpdate ? resolvedSchedules.filter(s => s.staffId === selectedStaffForUpdate.id) : []}
        onClose={() => setScheduleUpdateVisible(false)}
        onRefresh={fetchSchedules}
      />

      {/* Schedule Override Modal */}
      <ScheduleOverrideModal
        visible={overrideVisible}
        staff={overrideParams.staff}
        date={overrideParams.date}
        currentOverrideId={overrideParams.overrideId}
        currentOverride={overrideParams.currentOverride}
        shifts={shifts}
        branches={branches}
        onClose={() => setOverrideVisible(false)}
        onRefresh={fetchSchedules}
      />
    </div>
  );
}
