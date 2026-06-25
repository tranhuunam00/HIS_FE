import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Space, Alert, Typography, Tabs, Row, Col, Card, Button, Switch, Radio } from 'antd';
import { 
  ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined,
  AudioOutlined, CalculatorOutlined, PictureOutlined, CodeOutlined, SettingOutlined, LayoutOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Option } = Select;

const COMPONENT_LABELS = {
  HEADER: 'Tiêu đề phiếu',
  PATIENT_INFO: 'Thông tin bệnh nhân',
  SERVICE_TABLE: 'Bảng dịch vụ chỉ định',
  MEDICATION_TABLE: 'Bảng đơn thuốc',
  CLINICAL_INPUT_TEXT: 'Ô nhập văn bản (Text)',
  CLINICAL_INPUT_NUMBER: 'Ô nhập số đo (Number)',
  CLINICAL_DROPDOWN: 'Hộp chọn Dropdown',
  FORMULA_FIELD: 'Khối công thức (Formula)',
  CANVAS_DRAWING: 'Sơ đồ vẽ tổn thương',
  ULTRASOUND_RESULT: 'Khối kết quả siêu âm',
  LAB_RESULT: 'Khối kết quả xét nghiệm',
  SIGNATURES: 'Khối chữ ký',
};

export default function FormTemplateModal({ visible, onCancel, onSave, record, loading }) {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('general');
  const [components, setComponents] = useState([]);
  const [selectedComponentId, setSelectedComponentId] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [variableValues, setVariableValues] = useState({});

  const createComponentObject = (type, id) => {
    let newComp = { id, type };

    if (type === 'HEADER') {
      newComp.title = 'PHIẾU KẾT QUẢ MỚI';
    } else if (type === 'CLINICAL_INPUT_TEXT') {
      newComp.label = 'Ghi chú lâm sàng';
      newComp.fieldId = 'note_' + id.slice(-4);
      newComp.showVoice = true;
    } else if (type === 'CLINICAL_INPUT_NUMBER') {
      newComp.label = 'Huyết áp';
      newComp.fieldId = 'bp_' + id.slice(-4);
      newComp.unit = 'mmHg';
    } else if (type === 'CLINICAL_DROPDOWN') {
      newComp.label = 'Phân loại mức độ';
      newComp.fieldId = 'level_' + id.slice(-4);
      newComp.options = 'Bình thường, Nhẹ, Trung bình, Nặng';
    } else if (type === 'FORMULA_FIELD') {
      newComp.label = 'BMI';
      newComp.fieldId = 'bmi_' + id.slice(-4);
      newComp.formula = 'weight / ((height/100) * (height/100))';
    } else if (type === 'CANVAS_DRAWING') {
      newComp.label = 'Vẽ tổn thương y khoa';
      newComp.fieldId = 'draw_' + id.slice(-4);
      newComp.bgUrl = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400';
    } else if (type === 'SIGNATURES') {
      newComp.showDoctor = true;
      newComp.showCashier = false;
    }

    return newComp;
  };

  const addComponent = (type) => {
    const id = Date.now().toString();
    const newComp = createComponentObject(type, id);
    setComponents([...components, newComp]);
    setSelectedComponentId(id);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const newType = e.dataTransfer.getData('newComponentType');
    
    if (newType) {
      const id = Date.now().toString();
      const newComp = createComponentObject(newType, id);
      const newComps = [...components];
      newComps.splice(targetIndex, 0, newComp);
      setComponents(newComps);
      setSelectedComponentId(id);
    } else if (draggedIndex !== null && draggedIndex !== targetIndex) {
      const newComps = [...components];
      const [draggedItem] = newComps.splice(draggedIndex, 1);
      newComps.splice(targetIndex, 0, draggedItem);
      setComponents(newComps);
    }
    setDraggedIndex(null);
  };

  const evaluateFormula = (formula, vars) => {
    if (!formula) return '0.00';
    try {
      let expression = formula;
      const matches = formula.match(/[a-zA-Z_0-9]+/g) || [];
      
      matches.sort((a, b) => b.length - a.length);
      
      matches.forEach((m) => {
        if (m !== 'Math') {
          const val = Number(vars[m]) || 0;
          expression = expression.replace(new RegExp(`\\b${m}\\b`, 'g'), val.toString());
        }
      });
      
      // eslint-disable-next-line no-eval
      const result = eval(expression);
      return isFinite(result) ? result.toFixed(2) : '0.00';
    } catch (err) {
      return 'Lỗi công thức';
    }
  };

  // Load components from record htmlContent or set defaults
  useEffect(() => {
    if (visible) {
      setActiveTab('general');
      setSelectedComponentId(null);
      setVariableValues({});
      if (record) {
        form.setFieldsValue(record);
        // Try to parse components from HTML comments
        const parsed = parseHtmlToComponents(record.htmlContent);
        if (parsed && parsed.length > 0) {
          setComponents(parsed);
        } else {
          // Default fallbacks
          setComponents([
            { id: '1', type: 'HEADER', title: record.name || 'TIÊU ĐỀ BIỂU MẪU' },
            { id: '2', type: 'PATIENT_INFO' },
            { id: '3', type: 'SIGNATURES', showDoctor: true, showCashier: false }
          ]);
        }
      } else {
        form.resetFields();
        form.setFieldsValue({
          type: 'PRINT_TEMPLATE',
          isActive: true,
        });
        setComponents([
          { id: '1', type: 'HEADER', title: 'TIÊU ĐỀ BIỂU MẪU' },
          { id: '2', type: 'PATIENT_INFO' },
          { id: '3', type: 'SIGNATURES', showDoctor: true, showCashier: false }
        ]);
      }
    }
  }, [visible, record, form]);

  // Sync components to HTML editor value
  useEffect(() => {
    if (components.length > 0) {
      const html = generateHtmlFromComponents(components);
      form.setFieldsValue({ htmlContent: html });
    }
  }, [components]);

  const removeComponent = (id) => {
    setComponents(components.filter(c => c.id !== id));
    if (selectedComponentId === id) {
      setSelectedComponentId(null);
    }
  };

  const moveComponent = (index, direction) => {
    const newComps = [...components];
    if (direction === 'up' && index > 0) {
      [newComps[index], newComps[index - 1]] = [newComps[index - 1], newComps[index]];
    } else if (direction === 'down' && index < newComps.length - 1) {
      [newComps[index], newComps[index + 1]] = [newComps[index + 1], newComps[index]];
    }
    setComponents(newComps);
  };

  const updateComponentProperty = (id, propName, val) => {
    setComponents(components.map(c => {
      if (c.id === id) {
        return { ...c, [propName]: val };
      }
      return c;
    }));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // Embed components metadata comment at the bottom of htmlContent
      const metaComment = `\n<!-- VISUAL_COMPONENTS_DATA: ${JSON.stringify(components)} -->`;
      values.htmlContent = values.htmlContent.split('\n<!-- VISUAL_COMPONENTS_DATA')[0] + metaComment;
      await onSave(values);
    } catch (err) {
      console.error('Validation failed:', err);
    }
  };

  const parseHtmlToComponents = (html) => {
    if (!html) return null;
    try {
      const parts = html.split('<!-- VISUAL_COMPONENTS_DATA:');
      if (parts.length > 1) {
        const jsonStr = parts[1].split('-->')[0].trim();
        return JSON.parse(jsonStr);
      }
    } catch (e) {
      console.error('Failed to parse components metadata from HTML:', e);
    }
    return null;
  };

  const generateHtmlFromComponents = (comps) => {
    let bodyContent = '';
    let scriptContent = '';

    comps.forEach((c) => {
      const originalBodyContent = bodyContent;
      bodyContent = '';

      switch (c.type) {
        case 'HEADER': {
          const title = c.title || 'PHIẾU KẾT QUẢ';
          bodyContent += `
<div style="display: flex; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; font-family: 'Inter', sans-serif;">
  <div>
    <h2 style="margin: 0; color: #059669; font-size: 20px;">{{organizationName}}</h2>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #4b5563;">Địa chỉ: {{branchAddress}}</p>
    <p style="margin: 2px 0 0 0; font-size: 12px; color: #4b5563;">Hotline: {{branchHotline}}</p>
  </div>
  <div style="text-align: right;">
    <h2 style="margin: 0; color: #111827; font-size: 18px; font-weight: 700;">${title}</h2>
    <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Mã số: {{invoiceCode}}</p>
  </div>
</div>
          `;
          break;
        }
        case 'PATIENT_INFO': {
          bodyContent += `
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; font-family: 'Inter', sans-serif; font-size: 13px; line-height: 1.6; border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; background-color: #fafafa;">
  <div><strong>Họ và tên bệnh nhân:</strong> {{patientName}}</div>
  <div><strong>Mã bệnh nhân (MRN):</strong> {{patientCode}}</div>
  <div><strong>Ngày sinh / Tuổi:</strong> {{patientDob}}</div>
  <div><strong>Giới tính:</strong> {{patientGender}}</div>
  <div><strong>Số điện thoại:</strong> {{patientPhone}}</div>
  <div><strong>Địa chỉ:</strong> {{patientAddress}}</div>
  <div style="grid-column: span 2;"><strong>Chẩn đoán bệnh:</strong> {{diagnosis}}</div>
</div>
          `;
          break;
        }
        case 'SERVICE_TABLE': {
          bodyContent += `
<div style="margin-bottom: 20px; font-family: 'Inter', sans-serif;">
  <h3 style="font-size: 14px; color: #111827; margin: 0 0 8px 0; border-left: 3px solid #059669; padding-left: 8px;">DANH SÁCH DỊCH VỤ CHỈ ĐỊNH</h3>
  <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
    <thead>
      <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db; color: #374151;">
        <th style="padding: 8px; text-align: center; width: 40px; border: 1px solid #e5e7eb;">STT</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Tên dịch vụ y tế</th>
        <th style="padding: 8px; text-align: center; width: 60px; border: 1px solid #e5e7eb;">SL</th>
        <th style="padding: 8px; text-align: right; width: 100px; border: 1px solid #e5e7eb;">Đơn giá</th>
        <th style="padding: 8px; text-align: right; width: 120px; border: 1px solid #e5e7eb;">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      {{serviceRows}}
    </tbody>
  </table>
</div>
          `;
          break;
        }
        case 'MEDICATION_TABLE': {
          bodyContent += `
<div style="margin-bottom: 20px; font-family: 'Inter', sans-serif;">
  <h3 style="font-size: 14px; color: #111827; margin: 0 0 8px 0; border-left: 3px solid #059669; padding-left: 8px;">ĐƠN THUỐC ĐIỆN TỬ</h3>
  <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
    <thead>
      <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #334155;">
        <th style="padding: 8px; text-align: center; width: 40px; border: 1px solid #e2e8f0;">STT</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #e2e8f0;">Tên thuốc / Hướng dẫn sử dụng</th>
        <th style="padding: 8px; text-align: center; width: 80px; border: 1px solid #e2e8f0;">Số lượng</th>
      </tr>
    </thead>
    <tbody>
      {{medicationRows}}
    </tbody>
  </table>
</div>
          `;
          break;
        }
        case 'CLINICAL_INPUT_TEXT': {
          const label = c.label || 'Ghi chú lâm sàng';
          const fieldId = c.fieldId || 'note';
          const showVoice = c.showVoice !== false;
          bodyContent += `
<div style="margin-bottom: 12px; font-family: 'Inter', sans-serif;">
  <label style="display: block; font-weight: 600; font-size: 13px; color: #374151; margin-bottom: 4px;">${label}:</label>
  <div style="position: relative; display: flex; align-items: center;">
    <textarea id="input_${fieldId}" name="${fieldId}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; font-family: inherit; resize: vertical;" rows="3" placeholder="Nhập nội dung..."></textarea>
    ${showVoice ? `
    <button type="button" onclick="startSpeechToText('input_${fieldId}')" style="position: absolute; right: 8px; bottom: 8px; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background-color: #f3f4f6; color: #4b5563;" title="Nhập liệu bằng giọng nói">
      🎙️
    </button>` : ''}
  </div>
</div>
          `;
          break;
        }
        case 'CLINICAL_INPUT_NUMBER': {
          const label = c.label || 'Chỉ số';
          const fieldId = c.fieldId || 'num';
          const unit = c.unit || '';
          bodyContent += `
<div style="margin-bottom: 12px; font-family: 'Inter', sans-serif;">
  <label style="display: block; font-weight: 600; font-size: 13px; color: #374151; margin-bottom: 4px;">${label} ${unit ? `(${unit})` : ''}:</label>
  <input type="number" id="input_${fieldId}" name="${fieldId}" style="width: 150px; padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px;" oninput="recalculateFormulas()" placeholder="0" />
</div>
          `;
          break;
        }
        case 'CLINICAL_DROPDOWN': {
          const label = c.label || 'Đánh giá';
          const fieldId = c.fieldId || 'select';
          const optionsStr = c.options || 'Bình thường, Nhẹ, Trung bình, Nặng';
          const optionsHtml = optionsStr.split(',').map(o => o.trim()).map(o => `<option value="${o}">${o}</option>`).join('\n');
          bodyContent += `
<div style="margin-bottom: 12px; font-family: 'Inter', sans-serif;">
  <label style="display: block; font-weight: 600; font-size: 13px; color: #374151; margin-bottom: 4px;">${label}:</label>
  <select id="input_${fieldId}" name="${fieldId}" style="width: 200px; padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; background-color: white;">
    ${optionsHtml}
  </select>
</div>
          `;
          break;
        }
        case 'FORMULA_FIELD': {
          const label = c.label || 'BMI';
          const fieldId = c.fieldId || 'calculated_val';
          const formula = c.formula || 'weight / ((height/100) * (height/100))';
          
          let jsExpression = formula;
          const matches = formula.match(/[a-zA-Z_]+/g) || [];
          matches.forEach((m) => {
            if (m !== 'Math') {
              jsExpression = jsExpression.replace(new RegExp(m, 'g'), `(Number(document.getElementById('input_${m}')?.value) || 0)`);
            }
          });

          bodyContent += `
<div style="margin-bottom: 12px; font-family: 'Inter', sans-serif; display: flex; align-items: center; gap: 8px;">
  <span style="font-weight: 600; font-size: 13px; color: #374151;">${label}:</span>
  <span id="formula_${fieldId}" style="font-size: 14px; font-weight: bold; color: #059669; background-color: #ecfdf5; padding: 4px 10px; border-radius: 4px; border: 1px dashed #34d399;">0.00</span>
</div>
          `;

          scriptContent += `
        try {
          const val = ${jsExpression};
          if (document.getElementById('formula_${fieldId}')) {
            document.getElementById('formula_${fieldId}').innerText = isFinite(val) ? val.toFixed(2) : '0.00';
          }
        } catch (err) {
          console.error('Error computing ${fieldId}:', err);
        }
          `;
          break;
        }
        case 'CANVAS_DRAWING': {
          const label = c.label || 'Vẽ tổn thương';
          const fieldId = c.fieldId || 'canvas';
          const bgUrl = c.bgUrl || '';

          bodyContent += `
<div style="margin-bottom: 20px; font-family: 'Inter', sans-serif;">
  <label style="display: block; font-weight: 600; font-size: 13px; color: #374151; margin-bottom: 6px;">${label}:</label>
  <div style="display: flex; gap: 12px; align-items: flex-start;">
    <div style="position: relative; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; background-color: #f3f4f6;">
      <canvas id="canvas_${fieldId}" width="400" height="300" style="display: block; cursor: crosshair; background-image: url('${bgUrl}'); background-size: contain; background-repeat: no-repeat; background-position: center;"></canvas>
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <button type="button" onclick="clearCanvas('canvas_${fieldId}')" style="padding: 6px 12px; background-color: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit;">Xóa vẽ</button>
      <div style="display: flex; gap: 4px; align-items: center; margin-top: 4px;">
        <span onclick="setBrushColor('canvas_${fieldId}', '#ef4444')" style="width: 20px; height: 20px; border-radius: 50%; background-color: #ef4444; border: 1px solid #fff; box-shadow: 0 0 0 1px #d1d5db; cursor: pointer;" title="Đỏ"></span>
        <span onclick="setBrushColor('canvas_${fieldId}', '#3b82f6')" style="width: 20px; height: 20px; border-radius: 50%; background-color: #3b82f6; border: 1px solid #fff; box-shadow: 0 0 0 1px #d1d5db; cursor: pointer;" title="Xanh dương"></span>
        <span onclick="setBrushColor('canvas_${fieldId}', '#10b981')" style="width: 20px; height: 20px; border-radius: 50%; background-color: #10b981; border: 1px solid #fff; box-shadow: 0 0 0 1px #d1d5db; cursor: pointer;" title="Xanh lá"></span>
      </div>
    </div>
  </div>
</div>
          `;

          scriptContent += `
        initCanvasDrawing('canvas_${fieldId}');
          `;
          break;
        }
        case 'ULTRASOUND_RESULT': {
          bodyContent += `
<div style="margin-top: 15px; font-family: 'Inter', sans-serif;">
  <h3 style="border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; color: #111827; font-size: 14px; margin-bottom: 8px;">MÔ TẢ CHI TIẾT KẾT QUẢ KỸ THUẬT</h3>
  <div style="white-space: pre-wrap; font-size: 12px; line-height: 1.6; color: #374151; min-height: 80px; border: 1px solid #f3f4f6; padding: 10px; background-color: #f9fafb;">{{ultrasoundResult}}</div>
  <h3 style="border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; color: #111827; font-size: 14px; margin-top: 16px; margin-bottom: 8px;">KẾT LUẬN</h3>
  <div style="font-weight: bold; font-size: 13px; color: #111827; padding: 8px 12px; background-color: #ecfdf5; border-radius: 4px; border-left: 4px solid #10b981;">{{ultrasoundConclusion}}</div>
</div>
          `;
          break;
        }
        case 'LAB_RESULT': {
          bodyContent += `
<div style="margin-top: 15px; font-family: 'Inter', sans-serif;">
  <h3 style="border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; color: #111827; font-size: 14px; margin-bottom: 8px;">KẾT QUẢ XÉT NGHIỆM CHI TIẾT</h3>
  <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
    <thead>
      <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db; color: #374151;">
        <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Tên xét nghiệm</th>
        <th style="padding: 8px; text-align: center; width: 120px; border: 1px solid #e5e7eb;">Kết quả</th>
        <th style="padding: 8px; text-align: center; width: 100px; border: 1px solid #e5e7eb;">Đơn vị</th>
        <th style="padding: 8px; text-align: center; width: 140px; border: 1px solid #e5e7eb;">Khoảng tham chiếu</th>
      </tr>
    </thead>
    <tbody>
      {{labResultRows}}
    </tbody>
  </table>
</div>
          `;
          break;
        }
        case 'SIGNATURES': {
          const showDoctor = c.showDoctor !== false;
          const showCashier = c.showCashier === true;
          bodyContent += `
<div style="display: flex; justify-content: space-between; margin-top: 40px; font-family: 'Inter', sans-serif; font-size: 12px;">
  <div style="text-align: center; width: 220px;">
    ${showCashier ? `
    <p style="margin: 0; font-style: italic;">Ngày ..... tháng ..... năm 20...</p>
    <p style="margin: 4px 0 0 0; font-weight: bold; text-transform: uppercase;">Người lập phiếu / Thu ngân</p>
    <div style="height: 70px;"></div>
    <p style="margin: 0; color: #6b7280; font-size: 11px;">(Ký và ghi rõ họ tên)</p>` : ''}
  </div>
  <div style="text-align: center; width: 220px;">
    ${showDoctor ? `
    <p style="margin: 0; font-style: italic;">Ngày {{dateTime}}</p>
    <p style="margin: 4px 0 0 0; font-weight: bold; text-transform: uppercase;">Bác sĩ chuyên khoa</p>
    <div style="height: 70px;"></div>
    <p style="margin: 0; font-weight: 600; color: #111827; font-size: 13px;">{{doctorName}}</p>` : ''}
  </div>
</div>
          `;
          break;
        }
        default:
          break;
      }

      const componentHtml = bodyContent;
      bodyContent = originalBodyContent;

      if (componentHtml.trim()) {
        const widthPercent = c.width || 100;
        bodyContent += `
<div style="width: ${widthPercent}%; padding: 0 8px; box-sizing: border-box;">
  ${componentHtml.trim()}
</div>
        `;
      }
    });

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Biểu mẫu khám chuyên môn</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      body {
        font-family: 'Inter', sans-serif;
        color: #1f2937;
        margin: 0;
        padding: 20px;
        background-color: white;
      }
    </style>
  </head>
  <body>
    <!-- RENDERED BODY CONTENT -->
    <div style="display: flex; flex-wrap: wrap; margin: 0 -8px; row-gap: 16px;">
      ${bodyContent.trim()}
    </div>

    <!-- SYSTEM CLIENT-SIDE INTERACTION SCRIPTS -->
    <script>
      // 1. Voice Recognition logic
      function startSpeechToText(targetId) {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          alert('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói. Vui lòng dùng Google Chrome.');
          return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = function() {
          const btn = event?.currentTarget;
          if (btn) btn.style.backgroundColor = '#fecaca'; // Red microphone indicator
        };

        recognition.onend = function() {
          const btn = event?.currentTarget;
          if (btn) btn.style.backgroundColor = '#f3f4f6';
        };

        recognition.onresult = function(event) {
          const text = event.results[0][0].transcript;
          const txtArea = document.getElementById(targetId);
          if (txtArea) {
            txtArea.value = (txtArea.value + ' ' + text).trim();
          }
        };

        recognition.onerror = function(event) {
          console.error('Speech recognition error:', event.error);
        };

        recognition.start();
      }

      // 2. Dynamic formulas evaluation
      function recalculateFormulas() {
        ${scriptContent.trim()}
      }

      // 3. Drawing Canvas scripts
      const canvasBrushes = {};
      function initCanvasDrawing(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let drawing = false;
        
        canvasBrushes[canvasId] = '#ef4444'; // Default red color

        canvas.addEventListener('mousedown', (e) => {
          drawing = true;
          ctx.beginPath();
          const rect = canvas.getBoundingClientRect();
          ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
          ctx.strokeStyle = canvasBrushes[canvasId] || '#ef4444';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
        });

        canvas.addEventListener('mousemove', (e) => {
          if (!drawing) return;
          const rect = canvas.getBoundingClientRect();
          ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
          ctx.stroke();
        });

        window.addEventListener('mouseup', () => {
          if (drawing) {
            drawing = false;
            ctx.closePath();
          }
        });
      }

      function clearCanvas(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      function setBrushColor(canvasId, color) {
        canvasBrushes[canvasId] = color;
      }

      // Execute on load
      window.addEventListener('DOMContentLoaded', () => {
        recalculateFormulas();
      });
    </script>
  </body>
</html>`;
  };

  const renderMiniPreview = (c) => {
    switch (c.type) {
      case 'HEADER':
        return (
          <div style={{ border: '1px dashed #bfbfbf', padding: '6px', background: '#fafafa', fontSize: '11px', color: '#8c8c8c' }}>
            [Tiêu đề phòng khám & Tiêu đề biểu mẫu: <strong style={{ color: '#262626' }}>{c.title || 'PHIẾU KẾT QUẢ'}</strong>]
          </div>
        );
      case 'PATIENT_INFO':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: '#fafafa', padding: '6px', fontSize: '11px', border: '1px dashed #bfbfbf', color: '#8c8c8c' }}>
            <div>Họ tên: Trần Quốc Bảo</div>
            <div>Mã số: BN-2026-10482</div>
            <div>Ngày sinh: 15/08/1988</div>
            <div>Giới tính: Nam</div>
          </div>
        );
      case 'SERVICE_TABLE':
        return (
          <div style={{ border: '1px dashed #bfbfbf', padding: '6px', background: '#fafafa', fontSize: '11px', color: '#8c8c8c' }}>
            [Bảng các Dịch vụ chỉ định & Giá tiền của bệnh nhân]
          </div>
        );
      case 'MEDICATION_TABLE':
        return (
          <div style={{ border: '1px dashed #bfbfbf', padding: '6px', background: '#fafafa', fontSize: '11px', color: '#8c8c8c' }}>
            [Bảng danh sách Đơn thuốc y khoa & Hướng dẫn sử dụng]
          </div>
        );
      case 'CLINICAL_INPUT_TEXT':
        return (
          <div style={{ background: '#fafafa', padding: '6px', fontSize: '11px', border: '1px dashed #bfbfbf', color: '#8c8c8c' }} onClick={(e) => e.stopPropagation()}>
            <span style={{ fontWeight: 600, color: '#595959' }}>{c.label || 'Ghi chú lâm sàng'}</span>:
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <Input 
                size="small" 
                placeholder="Nhập thử dữ liệu..." 
                value={variableValues[c.fieldId] || ''}
                onChange={(e) => setVariableValues({ ...variableValues, [c.fieldId]: e.target.value })}
              />
              {c.showVoice !== false && <Button disabled size="small" icon={<AudioOutlined />} />}
            </div>
          </div>
        );
      case 'CLINICAL_INPUT_NUMBER':
        return (
          <div style={{ background: '#fafafa', padding: '6px', fontSize: '11px', border: '1px dashed #bfbfbf', color: '#8c8c8c' }} onClick={(e) => e.stopPropagation()}>
            <span style={{ fontWeight: 600, color: '#595959' }}>{c.label || 'Số đo'}</span> {c.unit ? `(${c.unit})` : ''}:
            <div style={{ width: 150, marginTop: 4 }}>
              <Input 
                size="small" 
                type="number"
                placeholder="Ví dụ: 1.70" 
                value={variableValues[c.fieldId] || ''}
                onChange={(e) => setVariableValues({ ...variableValues, [c.fieldId]: e.target.value })}
              />
            </div>
          </div>
        );
      case 'CLINICAL_DROPDOWN':
        return (
          <div style={{ background: '#fafafa', padding: '6px', fontSize: '11px', border: '1px dashed #bfbfbf', color: '#8c8c8c' }} onClick={(e) => e.stopPropagation()}>
            <span style={{ fontWeight: 600, color: '#595959' }}>{c.label || 'Lựa chọn'}</span>:
            <div style={{ width: 150, marginTop: 4 }}>
              <Select 
                size="small" 
                style={{ width: '100%' }} 
                value={variableValues[c.fieldId] || undefined}
                placeholder="Chọn thử..."
                onChange={(val) => setVariableValues({ ...variableValues, [c.fieldId]: val })}
              >
                {c.options?.split(',').map(o => o.trim()).map(o => (
                  <Select.Option key={o} value={o}>{o}</Select.Option>
                ))}
              </Select>
            </div>
          </div>
        );
      case 'FORMULA_FIELD':
        const liveVal = evaluateFormula(c.formula, variableValues);
        return (
          <div style={{ background: '#fafafa', padding: '6px', fontSize: '11px', border: '1px dashed #bfbfbf', color: '#8c8c8c', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, color: '#595959' }}>{c.label || 'BMI'} (Tính tự động)</span>:
            <span style={{ color: '#059669', fontWeight: 'bold', background: '#ecfdf5', padding: '2px 6px', border: '1px dashed #34d399', borderRadius: 4 }}>
              Kết quả thử: {liveVal}
            </span>
            <span style={{ fontSize: '10px', color: '#bfbfbf' }}>[Công thức: {c.formula}]</span>
          </div>
        );
      case 'CANVAS_DRAWING':
        return (
          <div style={{ background: '#fafafa', padding: '6px', fontSize: '11px', border: '1px dashed #bfbfbf', color: '#8c8c8c' }}>
            <span style={{ fontWeight: 600, color: '#595959' }}>{c.label || 'Vẽ sơ đồ'}</span>:
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
              <div style={{ width: 120, height: 60, border: '1px solid #d9d9d9', borderRadius: 4, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PictureOutlined style={{ fontSize: 20 }} />
              </div>
              <span>[Ảnh nền: {c.bgUrl ? 'Đã chọn hình' : 'Mặc định'}]</span>
            </div>
          </div>
        );
      case 'ULTRASOUND_RESULT':
        return (
          <div style={{ border: '1px dashed #bfbfbf', padding: '6px', background: '#fafafa', fontSize: '11px', color: '#8c8c8c' }}>
            [Vùng hiển thị chi tiết Mô tả & Kết luận Siêu âm lâm sàng]
          </div>
        );
      case 'LAB_RESULT':
        return (
          <div style={{ border: '1px dashed #bfbfbf', padding: '6px', background: '#fafafa', fontSize: '11px', color: '#8c8c8c' }}>
            [Bảng hiển thị kết quả Chỉ số Xét nghiệm & Khoảng tham chiếu]
          </div>
        );
      case 'SIGNATURES':
        return (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 20px', background: '#fafafa', fontSize: '10px', color: '#8c8c8c', border: '1px dashed #bfbfbf' }}>
            <div>{c.showCashier ? 'Người lập phiếu (Đồng ý ký)' : 'Người lập phiếu (Ẩn)'}</div>
            <div>{c.showDoctor ? 'Bác sĩ chuyên khoa (Đồng ý ký)' : 'Bác sĩ chuyên khoa (Ẩn)'}</div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderPropertyEditor = (c) => {
    switch (c.type) {
      case 'HEADER':
        return (
          <Form layout="vertical" size="small">
            <Form.Item label="Tiêu đề biểu mẫu in:">
              <Input 
                value={c.title} 
                onChange={(e) => updateComponentProperty(c.id, 'title', e.target.value)} 
                placeholder="Ví dụ: PHIẾU KHÁM NỘI KHOA"
              />
            </Form.Item>
          </Form>
        );
      case 'CLINICAL_INPUT_TEXT':
        return (
          <Form layout="vertical" size="small">
            <Form.Item label="Tên nhãn hiển thị:">
              <Input 
                value={c.label} 
                onChange={(e) => updateComponentProperty(c.id, 'label', e.target.value)} 
              />
            </Form.Item>
            <Form.Item label="Tên biến liên kết công thức (Field ID - Duy nhất):">
              <Input 
                value={c.fieldId} 
                onChange={(e) => updateComponentProperty(c.id, 'fieldId', e.target.value)} 
                placeholder="Ví dụ: symptoms"
              />
            </Form.Item>
            <Form.Item label="Kích hoạt Giọng nói (Speech-to-text):">
              <Switch 
                checked={c.showVoice !== false} 
                onChange={(checked) => updateComponentProperty(c.id, 'showVoice', checked)} 
              />
            </Form.Item>
          </Form>
        );
      case 'CLINICAL_INPUT_NUMBER':
        return (
          <Form layout="vertical" size="small">
            <Form.Item label="Tên nhãn hiển thị:">
              <Input 
                value={c.label} 
                onChange={(e) => updateComponentProperty(c.id, 'label', e.target.value)} 
              />
            </Form.Item>
            <Form.Item label="Tên biến liên kết công thức (Field ID - Duy nhất):">
              <Input 
                value={c.fieldId} 
                onChange={(e) => updateComponentProperty(c.id, 'fieldId', e.target.value)} 
                placeholder="Ví dụ: height"
              />
            </Form.Item>
            <Form.Item label="Đơn vị đo (nếu có):">
              <Input 
                value={c.unit} 
                onChange={(e) => updateComponentProperty(c.id, 'unit', e.target.value)} 
                placeholder="Ví dụ: kg, cm, mmHg"
              />
            </Form.Item>
          </Form>
        );
      case 'CLINICAL_DROPDOWN':
        return (
          <Form layout="vertical" size="small">
            <Form.Item label="Tên nhãn hiển thị:">
              <Input 
                value={c.label} 
                onChange={(e) => updateComponentProperty(c.id, 'label', e.target.value)} 
              />
            </Form.Item>
            <Form.Item label="Tên biến liên kết công thức (Field ID - Duy nhất):">
              <Input 
                value={c.fieldId} 
                onChange={(e) => updateComponentProperty(c.id, 'fieldId', e.target.value)} 
              />
            </Form.Item>
            <Form.Item label="Danh sách lựa chọn (cách nhau bằng dấu phẩy):">
              <Input.TextArea 
                value={c.options} 
                onChange={(e) => updateComponentProperty(c.id, 'options', e.target.value)} 
                rows={3}
                placeholder="Lựa chọn 1, Lựa chọn 2, Lựa chọn 3"
              />
            </Form.Item>
          </Form>
        );
      case 'FORMULA_FIELD':
        return (
          <Form layout="vertical" size="small">
            <Form.Item label="Tên nhãn hiển thị:">
              <Input 
                value={c.label} 
                onChange={(e) => updateComponentProperty(c.id, 'label', e.target.value)} 
              />
            </Form.Item>
            <Form.Item label="Tên biến kết quả (Field ID):">
              <Input 
                value={c.fieldId} 
                onChange={(e) => updateComponentProperty(c.id, 'fieldId', e.target.value)} 
              />
            </Form.Item>
            <Form.Item label="Công thức tính toán y khoa:">
              <Input 
                value={c.formula} 
                onChange={(e) => updateComponentProperty(c.id, 'formula', e.target.value)} 
                placeholder="Ví dụ: weight / ((height/100) * (height/100))"
              />
              <Text type="secondary" style={{ fontSize: '11px', marginTop: 4, display: 'block' }}>
                *Sử dụng các Tên biến của các ô nhập liệu làm biến số (Ví dụ: height, weight).
              </Text>
            </Form.Item>
          </Form>
        );
      case 'CANVAS_DRAWING':
        return (
          <Form layout="vertical" size="small">
            <Form.Item label="Tên nhãn sơ đồ:">
              <Input 
                value={c.label} 
                onChange={(e) => updateComponentProperty(c.id, 'label', e.target.value)} 
              />
            </Form.Item>
            <Form.Item label="Mã nhận diện hình (Field ID):">
              <Input 
                value={c.fieldId} 
                onChange={(e) => updateComponentProperty(c.id, 'fieldId', e.target.value)} 
              />
            </Form.Item>
            <Form.Item label="Chọn sơ đồ nền vẽ tổn thương:">
              <Radio.Group 
                value={c.bgUrl} 
                onChange={(e) => updateComponentProperty(c.id, 'bgUrl', e.target.value)}
              >
                <Space direction="vertical">
                  <Radio value="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400">Sơ đồ cơ thể người (Tổng quát)</Radio>
                  <Radio value="https://images.unsplash.com/photo-1579684389782-64d84b5e901a?w=400">Sơ đồ mắt cận cảnh (Mắt khoa)</Radio>
                  <Radio value="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400">Sơ đồ Răng Hàm Mặt (Nha khoa)</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          </Form>
        );
      case 'SIGNATURES':
        return (
          <Form layout="vertical" size="small">
            <Form.Item label="Hiển thị chữ ký Bác sĩ:">
              <Switch 
                checked={c.showDoctor !== false} 
                onChange={(checked) => updateComponentProperty(c.id, 'showDoctor', checked)} 
              />
            </Form.Item>
            <Form.Item label="Hiển thị chữ ký Người lập / Thu ngân:">
              <Switch 
                checked={c.showCashier === true} 
                onChange={(checked) => updateComponentProperty(c.id, 'showCashier', checked)} 
              />
            </Form.Item>
          </Form>
        );
      default:
        return <Text type="secondary">Khối này không có thuộc tính bổ sung.</Text>;
    }
  };

  const selectedComponent = components.find(c => c.id === selectedComponentId);

  return (
    <Modal
      title={record ? 'Chỉnh sửa Mẫu biểu mẫu' : 'Thêm Mẫu biểu mẫu Mới'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={1200}
      style={{ top: 20 }}
      size="small"
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} size="small">
        <Tabs.TabPane tab={<span><SettingOutlined /> Thiết lập chung</span>} key="general">
          <Form form={form} layout="vertical" size="small">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Form.Item
                name="name"
                label="Tên mẫu biểu mẫu"
                rules={[{ required: true, message: 'Vui lòng nhập tên mẫu' }]}
              >
                <Input placeholder="Ví dụ: Mẫu hóa đơn thanh toán chi phí" />
              </Form.Item>

              <Form.Item
                name="code"
                label="Mã mẫu (Duy nhất)"
                rules={[
                  { required: true, message: 'Vui lòng nhập mã mẫu' },
                  { pattern: /^[A-Z0-9_]+$/, message: 'Mã mẫu chỉ gồm chữ hoa, số và dấu gạch dưới' },
                ]}
              >
                <Input placeholder="Ví dụ: INVOICE_TEMPLATE" disabled={!!record} />
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Form.Item
                name="type"
                label="Loại biểu mẫu"
                rules={[{ required: true, message: 'Vui lòng chọn loại biểu mẫu' }]}
              >
                <Select>
                  <Select.Option value="PRINT_TEMPLATE">Mẫu in ra giấy (Print Template)</Select.Option>
                  <Select.Option value="CLINICAL_TEMPLATE">Mẫu nhập liệu lâm sàng (Clinical Template)</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="category"
                label="Nhóm nghiệp vụ"
                rules={[{ required: true, message: 'Vui lòng chọn nhóm nghiệp vụ' }]}
              >
                <Select>
                  <Select.Option value="INVOICE">Hóa đơn & Thanh toán (Invoice)</Select.Option>
                  <Select.Option value="PRESCRIPTION">Đơn thuốc (Prescription)</Select.Option>
                  <Select.Option value="LAB_RESULT">Xét nghiệm (Lab Result)</Select.Option>
                  <Select.Option value="ULTRASOUND_RESULT">Siêu âm (Ultrasound Result)</Select.Option>
                </Select>
              </Form.Item>
            </div>

            <Form.Item name="description" label="Mô tả mẫu">
              <Input placeholder="Mô tả chức năng hoặc mục đích sử dụng mẫu..." />
            </Form.Item>
          </Form>
        </Tabs.TabPane>

        <Tabs.TabPane tab={<span><LayoutOutlined /> Trình thiết kế trực quan (Visual Designer)</span>} key="designer">
          <Row gutter={16}>
            {/* Toolbox Cột Trái */}
            <Col span={6}>
              <Card title="Khối thành phần (Kéo thả)" size="small" bodyStyle={{ padding: 8 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ fontWeight: 600, fontSize: 11, margin: '4px 0', color: '#8c8c8c' }}>Khối Hành chính</div>
                  <Button size="small" style={{ width: '100%', textAlign: 'left', cursor: 'grab' }} draggable onDragStart={(e) => e.dataTransfer.setData('newComponentType', 'HEADER')} onClick={() => addComponent('HEADER')}>+ Tiêu đề phiếu</Button>
                  <Button size="small" style={{ width: '100%', textAlign: 'left', cursor: 'grab' }} draggable onDragStart={(e) => e.dataTransfer.setData('newComponentType', 'PATIENT_INFO')} onClick={() => addComponent('PATIENT_INFO')}>+ Thông tin Bệnh nhân</Button>
                  <Button size="small" style={{ width: '100%', textAlign: 'left', cursor: 'grab' }} draggable onDragStart={(e) => e.dataTransfer.setData('newComponentType', 'SIGNATURES')} onClick={() => addComponent('SIGNATURES')}>+ Khối Chữ ký</Button>

                  <div style={{ fontWeight: 600, fontSize: 11, margin: '8px 0 4px 0', color: '#8c8c8c' }}>Khối Chuyên môn</div>
                  <Button size="small" style={{ width: '100%', textAlign: 'left', cursor: 'grab' }} draggable onDragStart={(e) => e.dataTransfer.setData('newComponentType', 'SERVICE_TABLE')} onClick={() => addComponent('SERVICE_TABLE')}>+ Bảng dịch vụ chỉ định</Button>
                  <Button size="small" style={{ width: '100%', textAlign: 'left', cursor: 'grab' }} draggable onDragStart={(e) => e.dataTransfer.setData('newComponentType', 'MEDICATION_TABLE')} onClick={() => addComponent('MEDICATION_TABLE')}>+ Bảng đơn thuốc</Button>
                  <Button size="small" style={{ width: '100%', textAlign: 'left', cursor: 'grab' }} draggable onDragStart={(e) => e.dataTransfer.setData('newComponentType', 'ULTRASOUND_RESULT')} onClick={() => addComponent('ULTRASOUND_RESULT')}>+ Kết quả siêu âm</Button>
                  <Button size="small" style={{ width: '100%', textAlign: 'left', cursor: 'grab' }} draggable onDragStart={(e) => e.dataTransfer.setData('newComponentType', 'LAB_RESULT')} onClick={() => addComponent('LAB_RESULT')}>+ Kết quả xét nghiệm</Button>

                  <div style={{ fontWeight: 600, fontSize: 11, margin: '8px 0 4px 0', color: '#8c8c8c' }}>Nhập liệu Lâm sàng</div>
                  <Button size="small" style={{ width: '100%', textAlign: 'left', cursor: 'grab' }} draggable onDragStart={(e) => e.dataTransfer.setData('newComponentType', 'CLINICAL_INPUT_TEXT')} onClick={() => addComponent('CLINICAL_INPUT_TEXT')}>+ Nhập Văn bản (Text)</Button>
                  <Button size="small" style={{ width: '100%', textAlign: 'left', cursor: 'grab' }} draggable onDragStart={(e) => e.dataTransfer.setData('newComponentType', 'CLINICAL_INPUT_NUMBER')} onClick={() => addComponent('CLINICAL_INPUT_NUMBER')}>+ Nhập Số đo (Number)</Button>
                  <Button size="small" style={{ width: '100%', textAlign: 'left', cursor: 'grab' }} draggable onDragStart={(e) => e.dataTransfer.setData('newComponentType', 'CLINICAL_DROPDOWN')} onClick={() => addComponent('CLINICAL_DROPDOWN')}>+ Hộp chọn Dropdown</Button>

                  <div style={{ fontWeight: 600, fontSize: 11, margin: '8px 0 4px 0', color: '#8c8c8c' }}>Khối Cao cấp</div>
                  <Button size="small" style={{ width: '100%', textAlign: 'left', cursor: 'grab' }} draggable onDragStart={(e) => e.dataTransfer.setData('newComponentType', 'FORMULA_FIELD')} onClick={() => addComponent('FORMULA_FIELD')}>+ Khối Công thức y khoa</Button>
                  <Button size="small" style={{ width: '100%', textAlign: 'left', cursor: 'grab' }} draggable onDragStart={(e) => e.dataTransfer.setData('newComponentType', 'CANVAS_DRAWING')} onClick={() => addComponent('CANVAS_DRAWING')}>+ Sơ đồ vẽ tổn thương</Button>
                </Space>
              </Card>
            </Col>

            {/* Khung giữa Canvas */}
            <Col span={12}>
              <Card 
                title="Khung vẽ Canvas biểu mẫu (Kéo thả vào đây)" 
                size="small" 
                style={{ minHeight: 480, maxHeight: 600, overflowY: 'auto' }}
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  e.preventDefault();
                  const newType = e.dataTransfer.getData('newComponentType');
                  if (newType) {
                    const id = Date.now().toString();
                    const newComp = createComponentObject(newType, id);
                    setComponents([...components, newComp]);
                    setSelectedComponentId(id);
                  }
                }}
              >
                {components.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#bfbfbf' }}>
                    Khung trống. Vui lòng kéo các khối bên trái thả vào đây, hoặc bấm chọn trực tiếp.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', margin: '0 -5px', rowGap: 10 }}>
                    {components.map((c, index) => {
                      const isSelected = selectedComponentId === c.id;
                      const widthPercent = c.width || 100;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedComponentId(c.id)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          style={{
                            width: `${widthPercent}%`,
                            padding: '0 5px',
                            boxSizing: 'border-box',
                            transition: 'all 0.15s',
                            opacity: draggedIndex === index ? 0.4 : 1,
                            cursor: 'grab'
                          }}
                        >
                          <div style={{
                            border: `1px solid ${isSelected ? '#059669' : '#d9d9d9'}`,
                            borderRadius: 6,
                            padding: 10,
                            background: isSelected ? '#f0fdf4' : '#fff',
                            cursor: 'pointer',
                            height: '100%'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontWeight: 'bold', fontSize: 12, color: isSelected ? '#059669' : '#434343' }}>
                                {COMPONENT_LABELS[c.type] || c.type}
                              </span>
                              <Space size="small">
                                <Button 
                                  size="small" 
                                  type="text" 
                                  icon={<ArrowUpOutlined style={{ fontSize: 10 }} />} 
                                  onClick={(e) => { e.stopPropagation(); moveComponent(index, 'up'); }} 
                                  disabled={index === 0}
                                />
                                <Button 
                                  size="small" 
                                  type="text" 
                                  icon={<ArrowDownOutlined style={{ fontSize: 10 }} />} 
                                  onClick={(e) => { e.stopPropagation(); moveComponent(index, 'down'); }} 
                                  disabled={index === components.length - 1}
                                />
                                <Button 
                                  size="small" 
                                  type="text" 
                                  danger 
                                  icon={<DeleteOutlined style={{ fontSize: 10 }} />} 
                                  onClick={(e) => { e.stopPropagation(); removeComponent(c.id); }} 
                                />
                              </Space>
                            </div>
                            {renderMiniPreview(c)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </Col>

            {/* Bảng thuộc tính Cột Phải */}
            <Col span={6}>
              <Card title="Thuộc tính khối" size="small" style={{ minHeight: 480 }}>
                {selectedComponent ? (
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <Card size="small" title="Bố cục (Layout)" style={{ background: '#fcfcfc', border: '1px solid #f0f0f0' }}>
                      <Form layout="vertical" size="small">
                        <Form.Item label="Độ rộng khối:" style={{ margin: 0 }}>
                          <Select
                            value={selectedComponent.width || 100}
                            onChange={(val) => updateComponentProperty(selectedComponent.id, 'width', val)}
                            style={{ width: '100%' }}
                          >
                            <Select.Option value={100}>Toàn hàng (100%)</Select.Option>
                            <Select.Option value={50}>Nửa hàng (50%)</Select.Option>
                            <Select.Option value={33}>Một phần ba hàng (33%)</Select.Option>
                            <Select.Option value={25}>Một phần tư hàng (25%)</Select.Option>
                          </Select>
                        </Form.Item>
                      </Form>
                    </Card>
                    <Card size="small" title="Cấu hình chi tiết" style={{ border: '1px solid #f0f0f0' }}>
                      {renderPropertyEditor(selectedComponent)}
                    </Card>
                  </Space>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#bfbfbf', fontSize: 12 }}>
                    Chọn một khối trên Canvas để chỉnh sửa thuộc tính tương ứng.
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        <Tabs.TabPane tab={<span><CodeOutlined /> Mã nguồn HTML/CSS (Raw Code)</span>} key="code">
          <Form form={form} layout="vertical" size="small">
            <Form.Item
              name="htmlContent"
              label="Nội dung mã nguồn HTML/CSS mẫu in tự sinh"
              rules={[{ required: true, message: 'Vui lòng nhập nội dung HTML' }]}
            >
              <Input.TextArea
                rows={18}
                placeholder="<html>..."
                style={{ fontFamily: 'Courier New, Courier, monospace', fontSize: '11px' }}
              />
            </Form.Item>
          </Form>
        </Tabs.TabPane>
      </Tabs>
    </Modal>
  );
}
