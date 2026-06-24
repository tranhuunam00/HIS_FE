import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { departmentService } from '../../../services/departmentService';
import { orgService } from '../../../services/orgService';

const { Option } = Select;

export default function DepartmentFormModal({ visible, department, onClose, onRefresh }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState([]);
  const isEdit = !!department;

  useEffect(() => {
    if (visible) {
      fetchBranches();
      if (department) {
        form.setFieldsValue({
          name: department.name,
          code: department.code,
          branchId: department.branchId || undefined,
          description: department.description || '',
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, department, form]);

  const fetchBranches = async () => {
    try {
      const list = await orgService.getBranches();
      setBranches(list);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        name: values.name,
        branchId: values.branchId || null,
        description: values.description || null,
      };

      if (isEdit) {
        await departmentService.updateDepartment(department.id, payload);
        message.success('Cập nhật bộ phận thành công');
      } else {
        const createPayload = {
          ...payload,
          code: values.code,
        };
        await departmentService.createDepartment(createPayload);
        message.success('Tạo bộ phận mới thành công');
      }
      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu bộ phận');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa Bộ phận' : 'Thêm Bộ phận mới'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={submitting}
      destroyOnClose
      width={500}
      size="small"
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
        style={{ marginTop: 12 }}
      >
        <Form.Item
          label="Tên bộ phận/phòng ban"
          name="name"
          rules={[{ required: true, message: 'Vui lòng điền tên bộ phận' }]}
        >
          <Input placeholder="Ví dụ: Bộ phận Hành chính" />
        </Form.Item>

        <Form.Item
          label="Mã bộ phận"
          name="code"
          rules={
            isEdit
              ? []
              : [
                  { required: true, message: 'Vui lòng điền mã bộ phận' },
                  { pattern: /^[A-Z0-9_]+$/, message: 'Mã chỉ gồm chữ in hoa, số và dấu gạch dưới' },
                ]
          }
        >
          <Input placeholder="Ví dụ: DEPT_HC" disabled={isEdit} />
        </Form.Item>

        <Form.Item label="Chi nhánh trực thuộc (Nếu có)" name="branchId">
          <Select placeholder="Chọn chi nhánh trực thuộc" allowClear>
            {branches.map((b) => (
              <Option key={b.id} value={b.id}>
                {b.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Mô tả công việc / Chức năng" name="description">
          <Input.TextArea rows={3} placeholder="Mô tả chức năng nhiệm vụ..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
