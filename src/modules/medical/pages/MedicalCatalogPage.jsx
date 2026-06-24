import React from 'react';
import { Tabs, Card, Typography } from 'antd';
import {
  MedicineBoxOutlined,
  AppstoreOutlined,
  FileSearchOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import SpecialtyListTable from '../components/SpecialtyListTable';
import ServiceListTable from '../components/ServiceListTable';
import Icd10ListTable from '../components/Icd10ListTable';
import MedicationListTable from '../components/MedicationListTable';

const { Title, Paragraph } = Typography;

export default function MedicalCatalogPage() {
  const tabItems = [
    {
      key: 'specialties',
      label: (
        <span>
          <AppstoreOutlined />
          Chuyên khoa lâm sàng
        </span>
      ),
      children: <SpecialtyListTable />,
    },
    {
      key: 'services',
      label: (
        <span>
          <TagsOutlined />
          Dịch vụ & Bảng giá
        </span>
      ),
      children: <ServiceListTable />,
    },
    {
      key: 'icd10',
      label: (
        <span>
          <FileSearchOutlined />
          Mã bệnh ICD-10
        </span>
      ),
      children: <Icd10ListTable />,
    },
    {
      key: 'medications',
      label: (
        <span>
          <MedicineBoxOutlined />
          Danh mục thuốc
        </span>
      ),
      children: <MedicationListTable />,
    },
  ];

  return (
    <div style={{ padding: '16px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '16px', maxWidth: 1200, margin: '0 auto 16px auto' }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý Danh mục Y tế</Title>
        <Paragraph style={{ margin: 0, color: '#8c8c8c', fontSize: '12px' }}>
          Thiết lập các chuyên khoa lâm sàng, bảng giá dịch vụ kỹ thuật, danh mục ICD-10 quốc gia và kho danh mục thuốc dùng chung.
        </Paragraph>
      </div>

      <Card size="small" style={{ maxWidth: 1200, margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs defaultActiveKey="specialties" items={tabItems} size="small" />
      </Card>
    </div>
  );
}
