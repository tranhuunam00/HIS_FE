import React from 'react';
import { Tabs, Card, Typography } from 'antd';
import { BuildOutlined, SettingOutlined, HomeOutlined, TeamOutlined, BankOutlined } from '@ant-design/icons';
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
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
          <SettingOutlined style={{ fontSize: 16 }} />
          Cấu hình tổ chức
        </span>
      ),
      children: <OrgSettingsForm />,
    },
    {
      key: 'branches',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
          <BuildOutlined style={{ fontSize: 16 }} />
          Quản lý chi nhánh
        </span>
      ),
      children: <BranchListTable />,
    },
    {
      key: 'rooms',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
          <HomeOutlined style={{ fontSize: 16 }} />
          Phòng ban & Cơ sở vật chất
        </span>
      ),
      children: <RoomListTable />,
    },
    {
      key: 'staff',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
          <TeamOutlined style={{ fontSize: 16 }} />
          Quản lý nhân sự
        </span>
      ),
      children: <StaffListTable />,
    },
  ];

  return (
    <div style={{ padding: '24px 16px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div 
        style={{ 
          maxWidth: 1200, 
          margin: '0 auto 20px auto', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          background: '#fff',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        <div 
          style={{ 
            width: 48, 
            height: 48, 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(24,144,255,0.2)'
          }}
        >
          <BankOutlined style={{ fontSize: 24, color: '#fff' }} />
        </div>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#262626' }}>Cấu hình tổ chức & Cơ sở</Title>
          <Paragraph style={{ margin: 0, color: '#8c8c8c', fontSize: '13px' }}>
            Quản lý hồ sơ pháp lý doanh nghiệp, các thông số định dạng hệ thống và sơ đồ tổ chức chi nhánh.
          </Paragraph>
        </div>
      </div>

      <Card 
        bordered={false}
        style={{ 
          maxWidth: 1200, 
          margin: '0 auto', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          borderRadius: '12px',
          padding: '8px'
        }}
      >
        <Tabs 
          defaultActiveKey="org-settings" 
          items={tabItems} 
          size="middle" 
          tabBarStyle={{ marginBottom: '20px' }}
        />
      </Card>
    </div>
  );
}
