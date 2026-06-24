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
  loginTimeWindows,
  onClose,
  onRefresh,
}) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [limitLoginTime, setLimitLoginTime] = useState(false);
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
      setLimitLoginTime(!!user.loginTimeWindowId);
      form.setFieldsValue({
        staffId: user.staffId || undefined,
        username: user.username || '',
        email: user.email || '',
        roleId: user.roleId,
        defaultBranchId: user.defaultBranchId || undefined,
        branchScopeMode: user.branchScopeMode || 'SPECIFIC',
        branchIds: user.branchScopeIds || [],
        bypassIpRestriction: user.bypassIpRestriction,
        limitLoginTime: !!user.loginTimeWindowId,
        loginTimeWindowId: user.loginTimeWindowId || undefined,
        failedLoginLimit: user.failedLoginLimit || undefined,
      });
    } else {
      setAllBranches(true);
      setLimitLoginTime(false);
      form.resetFields();
      form.setFieldsValue({
        branchScopeMode: 'ALL',
        bypassIpRestriction: true,
        limitLoginTime: false,
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
    });
  };

  const handleAllBranchesChange = (checked) => {
    setAllBranches(checked);
    form.setFieldsValue({
      branchScopeMode: checked ? 'ALL' : 'SPECIFIC',
    });
  };

  const handleLimitTimeChange = (checked) => {
    setLimitLoginTime(checked);
    if (!checked) {
      form.setFieldsValue({
        loginTimeWindowId: undefined,
        failedLoginLimit: undefined,
      });
    }
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
        email: values.email,
        roleId: values.roleId,
        defaultBranchId,
        branchScopeMode: values.branchScopeMode,
        branchIds: selectedBranchIds,
        bypassIpRestriction: values.bypassIpRestriction,
        loginTimeWindowId: values.limitLoginTime ? values.loginTimeWindowId : null,
        failedLoginLimit: values.limitLoginTime ? values.failedLoginLimit : null,
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
        <Button key="close" size="small" onClick={onClose}>
          Đóng
        </Button>,
        <Button key="save" type="primary" size="small" loading={submitting} onClick={handleSubmit}>
          Lưu
        </Button>,
      ]}
      styles={{ body: { paddingTop: 8 } }}
    >
      <div style={{ fontSize: 12, color: '#587199', marginBottom: 10 }}>
        Chỉ tiết thông tin user - Khi thay đổi giá trị cần đăng nhập lại để áp dụng
      </div>

      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Nhân viên"
              name="staffId"
              rules={[{ required: true, message: 'Chọn nhân viên' }]}
            >
              <Select
                showSearch
                placeholder="eg .nhân viên"
                optionFilterProp="label"
                onChange={handleStaffChange}
                disabled={isEdit}
              >
                {availableStaff.map((staff) => (
                  <Option
                    key={staff.id}
                    value={staff.id}
                    label={`${staff.staffCode} ${staff.fullName}`}
                  >
                    {staff.staffCode} - {staff.fullName}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Tên đăng nhập"
              name="username"
              rules={[
                { required: true, message: 'Nhập tên đăng nhập' },
                { pattern: /^[A-Za-z0-9._-]+$/, message: 'Chỉ gồm chữ, số, dấu chấm, gạch dưới, gạch ngang' },
              ]}
            >
              <Input placeholder="eg .tên đăng nhập" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={isEdit ? [] : [
                { required: true, message: 'Nhập mật khẩu' },
                { min: 6, message: 'Tối thiểu 6 ký tự' },
              ]}
            >
              <Input.Password
                placeholder={isEdit ? 'Đổi bằng nút reset mật khẩu' : 'eg .mật khẩu'}
                disabled={isEdit}
                iconRender={(visibleIcon) => (visibleIcon ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
            >
              <Input placeholder="eg .email" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Nhóm"
              name="roleId"
              rules={[{ required: true, message: 'Chọn nhóm user' }]}
            >
              <Select placeholder="eg .nhóm">
                {roles.map((role) => (
                  <Option key={role.id} value={role.id}>
                    {role.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Chi nhánh"
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

        <div style={{ fontWeight: 600, fontSize: 13, color: '#30456c' }}>Phạm vi sử dụng</div>
        <div style={{ fontSize: 12, color: '#587199', marginBottom: 12 }}>Cấu hình phạm vi sử dụng phần mềm của user</div>

        <Row gutter={16}>
          <Col span={12}>
            <Space align="start" size={10}>
              <Form.Item name="bypassIpRestriction" valuePropName="checked" style={{ marginBottom: 8 }}>
                <Switch size="small" />
              </Form.Item>
              <div>
                <div style={{ color: '#30456c' }}>Bỏ qua xác thực - IP</div>
                <div style={{ color: '#587199', fontSize: 12 }}>Không bắt buộc đúng IP chi nhánh để sử dụng phần mềm</div>
              </div>
            </Space>

            <br />

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
                label="Phạm vi chi nhánh cụ thể"
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
            <Space align="start" size={10}>
              <Form.Item name="limitLoginTime" valuePropName="checked" style={{ marginBottom: 8 }}>
                <Switch size="small" onChange={handleLimitTimeChange} />
              </Form.Item>
              <div>
                <div style={{ color: '#30456c' }}>Giới hạn thời gian đăng nhập</div>
                <div style={{ color: '#587199', fontSize: 12 }}>Giới hạn thời gian user có thể đăng nhập vào phần mềm</div>
              </div>
            </Space>

            {limitLoginTime && (
              <>
                <Form.Item
                  label="Giới hạn số lần sai mật khẩu"
                  name="failedLoginLimit"
                  style={{ marginTop: 8 }}
                >
                  <Input type="number" min={1} placeholder="eg .giới hạn số lần đăng nhập" />
                </Form.Item>

                <Form.Item
                  label="Giới hạn đăng nhập"
                  name="loginTimeWindowId"
                  rules={[{ required: true, message: 'Chọn khung giờ đăng nhập' }]}
                >
                  <Select placeholder="Chọn khung giờ">
                    {loginTimeWindows.map((item) => (
                      <Option key={item.id} value={item.id}>
                        {item.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </>
            )}
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
