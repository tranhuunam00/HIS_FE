import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, Spin, Alert, Typography } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { orgService } from '../../../services/orgService';

const { Text } = Typography;

export default function PrintPreviewModal({ visible, onCancel, record }) {
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [activeBranch, setActiveBranch] = useState(null);
  const [renderedHtml, setRenderedHtml] = useState('');

  useEffect(() => {
    if (visible && record) {
      loadDetailsAndRender();
    }
  }, [visible, record]);

  const loadDetailsAndRender = async () => {
    try {
      setLoading(true);
      const [org, branches] = await Promise.all([
        orgService.getOrganization(),
        orgService.getBranches(),
      ]);

      setOrganization(org);

      const activeBranchId = localStorage.getItem('activeBranchId');
      const branch = branches.find((b) => b.id === activeBranchId) || branches[0];
      setActiveBranch(branch);

      renderTemplate(record.htmlContent, org, branch);
    } catch (err) {
      console.error('Lỗi tải dữ liệu tổ chức/chi nhánh:', err);
      // Fallback
      renderTemplate(record.htmlContent, null, null);
    } finally {
      setLoading(false);
    }
  };

  const renderTemplate = (htmlContent, org, branch) => {
    if (!htmlContent) {
      setRenderedHtml('');
      return;
    }

    // Prepare variables
    const now = new Date();
    const dateTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    const vars = {
      organizationName: org?.name || 'Hệ thống Phòng khám DAO CARE',
      branchName: branch?.name || 'Cơ sở Hà Nội - Hai Bà Trưng',
      branchAddress: branch
        ? `${branch.addressDetail ? branch.addressDetail + ', ' : ''}${branch.district ? branch.district + ', ' : ''}${branch.province || ''}`
        : 'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội',
      branchHotline: branch?.hotline || '024777888',
      patientName: 'Trần Quốc Bảo',
      patientCode: 'BN-2026-10482',
      patientDob: '15/08/1988',
      patientGender: 'Nam',
      patientPhone: '0905123456',
      patientAddress: '72 Nguyễn Chí Thanh, Láng Thượng, Đống Đa, Hà Nội',
      dateTime: dateTimeStr,
      doctorName: 'ThS. BS. Trần Hữu Nam',
      diagnosis: 'K29.5 - Viêm dạ dày mạn tính, không xác định / Trào ngược dạ dày thực quản (GERD)',
      invoiceCode: 'HD260624-9988',
      totalAmount: '1,150,000',
      discountAmount: '150,000',
      payableAmount: '1,000,000',
      amountInWords: 'Một triệu đồng chẵn',
      cashierName: 'Lê Thị Thu Thủy',
      serviceRows: `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; text-align: center;">1</td>
          <td style="padding: 8px; font-weight: 500;">Khám lâm sàng chuyên khoa Tiêu hóa</td>
          <td style="padding: 8px; text-align: center;">1</td>
          <td style="padding: 8px; text-align: right;">150,000</td>
          <td style="padding: 8px; text-align: right;">150,000</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; text-align: center;">2</td>
          <td style="padding: 8px; font-weight: 500;">Nội soi dạ dày tá tràng ống mềm có gây mê</td>
          <td style="padding: 8px; text-align: center;">1</td>
          <td style="padding: 8px; text-align: right;">800,000</td>
          <td style="padding: 8px; text-align: right;">800,000</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; text-align: center;">3</td>
          <td style="padding: 8px; font-weight: 500;">Xét nghiệm tìm vi khuẩn H.pylori (Test thở C13)</td>
          <td style="padding: 8px; text-align: center;">1</td>
          <td style="padding: 8px; text-align: right;">200,000</td>
          <td style="padding: 8px; text-align: right;">200,000</td>
        </tr>
      `,
      medicationRows: `
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 8px; text-align: center; vertical-align: top;">1</td>
          <td style="padding: 8px;">
            <div style="font-weight: 600; color: #111827;">Esomeprazole 40mg (Nexium MUPS)</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Uống 1 viên vào buổi sáng trước khi ăn 30 phút</div>
          </td>
          <td style="padding: 8px; text-align: center; font-weight: 600; vertical-align: top;">14 Viên</td>
        </tr>
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 8px; text-align: center; vertical-align: top;">2</td>
          <td style="padding: 8px;">
            <div style="font-weight: 600; color: #111827;">Clarithromycin 500mg (Klacid)</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Uống 1 viên vào buổi sáng và 1 viên vào buổi tối (sau ăn)</div>
          </td>
          <td style="padding: 8px; text-align: center; font-weight: 600; vertical-align: top;">14 Viên</td>
        </tr>
        <tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 8px; text-align: center; vertical-align: top;">3</td>
          <td style="padding: 8px;">
            <div style="font-weight: 600; color: #111827;">Amoxicillin 500mg (Ospamox)</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Uống 2 viên vào buổi sáng và 2 viên vào buổi tối (sau ăn)</div>
          </td>
          <td style="padding: 8px; text-align: center; font-weight: 600; vertical-align: top;">28 Viên</td>
        </tr>
      `,
      labResultRows: `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; font-weight: 500;">Glucose (Máu)</td>
          <td style="padding: 8px; text-align: center; font-weight: 600; color: #ef4444;">6.8</td>
          <td style="padding: 8px; text-align: center;">mmol/L</td>
          <td style="padding: 8px; text-align: center; color: #6b7280;">3.9 - 6.4</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; font-weight: 500;">Creatinine (Máu)</td>
          <td style="padding: 8px; text-align: center;">78</td>
          <td style="padding: 8px; text-align: center;">umol/L</td>
          <td style="padding: 8px; text-align: center; color: #6b7280;">62 - 115</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; font-weight: 500;">AST (GOT)</td>
          <td style="padding: 8px; text-align: center;">25</td>
          <td style="padding: 8px; text-align: center;">U/L</td>
          <td style="padding: 8px; text-align: center; color: #6b7280;">Dưới 40</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; font-weight: 500;">ALT (GPT)</td>
          <td style="padding: 8px; text-align: center; font-weight: 600; color: #ef4444;">45</td>
          <td style="padding: 8px; text-align: center;">U/L</td>
          <td style="padding: 8px; text-align: center; color: #6b7280;">Dưới 40</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px; font-weight: 500;">Test HP thở C13</td>
          <td style="padding: 8px; text-align: center; font-weight: 600; color: #ef4444;">Dương tính (32.5)</td>
          <td style="padding: 8px; text-align: center;">DOB</td>
          <td style="padding: 8px; text-align: center; color: #6b7280;">Âm tính (&lt; 4.0)</td>
        </tr>
      `,
      ultrasoundResult: `- Gan: Kích thước bình thường, nhu mô đều, bờ đều, không có khối khu trú, tĩnh mạch cửa không giãn.
- Túi mật: Kích thước bình thường, thành mỏng, không có sỏi, đường mật trong và ngoài gan không giãn.
- Tụy: Kích thước bình thường, cấu trúc nhu mô đồng nhất.
- Lách: Kích thước bình thường, cấu trúc nhu mô đồng nhất.
- Thận hai bên: Kích thước bình thường, ranh giới tủy vỏ rõ, hệ thống đài bể thận không giãn, không có sỏi.
- Bàng quang: Thành mỏng, không có sỏi.
- Tiền liệt tuyến: Kích thước bình thường.
- Dịch ổ bụng: Không có dịch tự do trong ổ bụng.`,
      ultrasoundConclusion: 'Hiện tại chưa phát hiện hình ảnh tổn thương bất thường trên siêu âm ổ bụng tổng quát.',
    };

    let result = htmlContent;
    Object.keys(vars).forEach((key) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, vars[key]);
    });

    setRenderedHtml(result);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Vui lòng cho phép popup để mở hộp thoại in');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In thử: ${record?.name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              margin: 0;
              padding: 0;
              background-color: white;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
              .print-container {
                padding: 0 !important;
                margin: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                box-shadow: none !important;
              }
            }
          </style>
        </head>
        <body>
          ${renderedHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginRight: '32px' }}>
          <span>Xem trước & In thử - {record?.name}</span>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            size="small"
            style={{ backgroundColor: '#059669', borderColor: '#059669' }}
            onClick={handlePrint}
            disabled={!renderedHtml}
          >
            In thử nghiệm
          </Button>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel} size="small">
          Đóng
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          size="small"
          style={{ backgroundColor: '#059669', borderColor: '#059669' }}
          onClick={handlePrint}
          disabled={!renderedHtml}
        >
          Kích hoạt in ấn
        </Button>,
      ]}
      width={880}
      style={{ top: 20 }}
      size="small"
    >
      <div style={{ background: '#f0f2f5', padding: '24px 12px', minHeight: '400px', display: 'flex', justifyContent: 'center' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', width: '100%' }}>
            <Spin size="large" tip="Đang giả lập dữ liệu in thử..." />
          </div>
        ) : (
          <div
            id="print-preview-content"
            style={{
              background: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: '4px',
              width: '100%',
              maxWidth: '800px',
              minHeight: '842px', // Approx A4 ratio
              boxSizing: 'border-box',
            }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>
      <Alert
        message={
          <div style={{ fontSize: '12px' }}>
            <span style={{ fontWeight: 'bold' }}>Thông tin địa điểm:</span> Địa chỉ chi nhánh in ấn (
            <Text code>{"{{branchAddress}}"}</Text>) được liên kết tự động với chi nhánh hiện tại của bạn: 
            <span style={{ fontWeight: 600, color: '#059669' }}> {activeBranch?.name || 'Chưa chọn'}</span>
            {activeBranch && ` - Địa chỉ: ${activeBranch.addressDetail || ''}, ${activeBranch.district || ''}, ${activeBranch.province || ''}`}
          </div>
        }
        type="success"
        showIcon
        style={{ marginTop: '12px' }}
      />
    </Modal>
  );
}
