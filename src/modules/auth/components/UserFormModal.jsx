import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, Switch, Button, Space, Divider, message } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { authAdminService } from '../../../services/authAdminService';

const { Option } = Select;

export default function UserFormModal({
  visible,
  user,
  roles,
  staffList,
  branches,
  onClose,
  onRefresh,
}) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [allBranches, setAllBranches] = useState(true);
  const isEdit = !!user;

  const availableStaff = useMemo(() => {
    return staffList.filter((staff) => !staff.userId || staff.id === user?.staffId);
  }, [staffList, user]);

  useEffect(() => {
    if (!visible) return;

    if (user) {
      const isAllBranches = user.branchScopeMode === 'ALL';
      setAllBranches(isAllBranches);
      form.setFieldsValue({
        staffId: user.staffId || undefined,
        identityNumber: user.staffIdentityNumber || '',
        username: user.username || '',
        email: user.email || '',
        roleId: user.roleId,
        defaultBranchId: user.defaultBranchId || undefined,
        branchScopeMode: user.branchScopeMode || 'SPECIFIC',
        branchIds: user.branchScopeIds || [],
        failedLoginLimit: user.failedLoginLimit || undefined,
      });
    } else {
      setAllBranches(true);
      form.resetFields();
      form.setFieldsValue({
        branchScopeMode: 'ALL',
      });
    }
  }, [visible, user, form]);

  const handleStaffChange = (staffId) => {
    const staff = staffList.find((item) => item.id === staffId);
    if (!staff || isEdit) return;

    const compactName = staff.fullName
      .replace(/^BS\.\s*/i, '')
      .split(/\s+/)
      .slice(-2)
      .join('')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    form.setFieldsValue({
      email: staff.email,
      username: compactName || staff.staffCode,
      identityNumber: staff.identityNumber || '',
    });
  };

  const handleAllBranchesChange = (checked) => {
    setAllBranches(checked);
    form.setFieldsValue({
      branchScopeMode: checked ? 'ALL' : 'SPECIFIC',
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const defaultBranchId = values.defaultBranchId;
      const selectedBranchIds = values.branchScopeMode === 'ALL'
        ? [defaultBranchId]
        : Array.from(new Set([...(values.branchIds || []), defaultBranchId]));

      const payload = {
        staffId: values.staffId,
        username: values.username,
        identityNumber: values.identityNumber,
        email: values.email,
        roleId: values.roleId,
        defaultBranchId,
        branchScopeMode: values.branchScopeMode,
        branchIds: selectedBranchIds,
        bypassIpRestriction: true,
        loginTimeWindowId: null,
        failedLoginLimit: values.failedLoginLimit ? Number(values.failedLoginLimit) : null,
      };

      if (isEdit) {
        await authAdminService.updateUser(user.id, payload);
        message.success('Cập nhật user thành công');
      } else {
        await authAdminService.createUser({
          ...payload,
          password: values.password,
        });
        message.success('Tạo user thành công');
      }

      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể lưu user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Thông tin user"
      open={visible}
      onCancel={onClose}
      destroyOnClose
      width={1160}
      footer={[
        <Button key="cancel" size="small" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          size="small"
          loading={submitting}
          onClick={handleSubmit}
        >
          Lưu lại
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" size="small">
        <div style={{ fontWeight: 600, fontSize: 13, color: '#30456c', marginBottom: 12 }}>Thông tin cơ bản</div>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              label="Nhân sự liên kết"
              name="staffId"
              rules={[{ required: true, message: 'Chọn nhân sự liên kết' }]}
            >
              <Select
                placeholder="Chọn nhân sự"
                showSearch
                optionFilterProp="children"
                disabled={isEdit}
                onChange={handleStaffChange}
              >
                {availableStaff.map((staff) => (
                  <Option key={staff.id} value={staff.id}>
                    {staff.staffCode} - {staff.fullName}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Số CCCD"
              name="identityNumber"
              rules={[{ required: true, message: 'Nhập số định danh/CCCD' }]}
            >
              <Input placeholder="eg .001095000123" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Vai trò/Nhóm quyền"
              name="roleId"
              rules={[{ required: true, message: 'Chọn nhóm quyền' }]}
            >
              <Select placeholder="Chọn nhóm quyền">
                {roles.filter((r) => r.name !== 'PATIENT').map((role) => (
                  <Option key={role.id} value={role.id}>
                    {role.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              label="Tên đăng nhập"
              name="username"
              rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}
            >
              <Input placeholder="eg .nam.th" disabled={isEdit} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Nhập email liên hệ' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input placeholder="eg .nam@gmail.com" />
            </Form.Item>
          </Col>
          <Col span={8}>
            {!isEdit && (
              <Form.Item
                label="Mật khẩu"
                name="password"
                rules={[
                  { required: true, message: 'Nhập mật khẩu khởi tạo' },
                  { min: 6, message: 'Mật khẩu phải dài tối thiểu 6 ký tự' },
                ]}
              >
                <Input.Password
                  placeholder="Mật khẩu khởi tạo"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>
            )}
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              label="Chi nhánh mặc định"
              name="defaultBranchId"
              rules={[{ required: true, message: 'Chọn chi nhánh mặc định' }]}
            >
              <Select placeholder="eg .chi nhánh">
                {branches.map((branch) => (
                  <Option key={branch.id} value={branch.id}>
                    {branch.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '6px 0 10px' }} />

        <div style={{ fontWeight: 600, fontSize: 13, color: '#30456c' }}>Phạm vi sử dụng & Bảo mật</div>
        <div style={{ fontSize: 12, color: '#587199', marginBottom: 12 }}>Cấu hình phạm vi sử dụng phần mềm và bảo mật tài khoản của user</div>

        <Row gutter={16}>
          <Col span={12}>
            <Space align="start" size={10}>
              <Form.Item name="branchScopeMode" noStyle>
                <Input type="hidden" />
              </Form.Item>
              <Switch size="small" checked={allBranches} onChange={handleAllBranchesChange} />
              <div>
                <div style={{ color: '#30456c' }}>Tất cả chi nhánh</div>
                <div style={{ color: '#587199', fontSize: 12 }}>Cho phép user sử dụng tất cả chi nhánh</div>
              </div>
            </Space>

            {!allBranches && (
              <Form.Item
                label={
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>Phạm vi chi nhánh cụ thể</span>
                    <Space size={8} style={{ fontWeight: 'normal' }}>
                      <a onClick={() => form.setFieldsValue({ branchIds: branches.map((b) => b.id) })} style={{ fontSize: 11 }}>Chọn tất cả</a>
                      <a onClick={() => form.setFieldsValue({ branchIds: [] })} style={{ fontSize: 11 }}>Bỏ chọn</a>
                    </Space>
                  </div>
                }
                name="branchIds"
                rules={[{ required: true, message: 'Chọn phạm vi chi nhánh' }]}
                style={{ marginTop: 10 }}
              >
                <Select mode="multiple" placeholder="Chọn chi nhánh được phép sử dụng">
                  {branches.map((branch) => (
                    <Option key={branch.id} value={branch.id}>
                      {branch.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}
          </Col>

          <Col span={12}>
            <Form.Item
              label="Giới hạn số lần sai mật khẩu"
              name="failedLoginLimit"
            >
              <Input type="number" min={1} placeholder="eg .5" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
