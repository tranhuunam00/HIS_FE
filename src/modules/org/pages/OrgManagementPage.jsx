import React from 'react';
import { Tabs, Card, Typography } from 'antd';
import { BuildOutlined, SettingOutlined, HomeOutlined, TeamOutlined } from '@ant-design/icons';
import OrgSettingsForm from '../components/OrgSettingsForm';
import BranchListTable from '../components/BranchListTable';
import RoomListTable from '../components/RoomListTable';
import StaffListTable from '../components/StaffListTable';

const { Title, Paragraph } = Typography;

export default function OrgManagementPage() {
  const tabItems = [
    {
      key: 'org-settings',
      label: (
        <span>
          <SettingOutlined />
          Cấu hình tổ chức
        </span>
      ),
      children: <OrgSettingsForm />,
    },
    {
      key: 'branches',
      label: (
        <span>
          <BuildOutlined />
          Quản lý chi nhánh
        </span>
      ),
      children: <BranchListTable />,
    },
    {
      key: 'rooms',
      label: (
        <span>
          <HomeOutlined />
          Phòng ban & Cơ sở vật chất
        </span>
      ),
      children: <RoomListTable />,
    },
    {
      key: 'staff',
      label: (
        <span>
          <TeamOutlined />
          Quản lý nhân sự
        </span>
      ),
      children: <StaffListTable />,
    },
  ];

  return (
    <div style={{ padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '16px', maxWidth: 1200, margin: '0 auto 16px auto' }}>
        <Title level={4} style={{ margin: 0 }}>Cấu hình tổ chức & Cơ sở</Title>
        <Paragraph style={{ margin: 0, color: '#8c8c8c', fontSize: '12px' }}>
          Quản lý hồ sơ pháp lý, các tham số định cấu hình địa phương hóa toàn hệ thống và mạng lưới chi nhánh.
        </Paragraph>
      </div>

      <Card size="small" style={{ maxWidth: 1200, margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs defaultActiveKey="org-settings" items={tabItems} size="small" />
      </Card>
    </div>
  );
}
