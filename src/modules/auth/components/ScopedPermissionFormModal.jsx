import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Input, Checkbox, Row, Col, message, Divider } from 'antd';
import { authAdminService } from '../../../services/authAdminService';

const { Option } = Select;

export default function ScopedPermissionFormModal({
  visible,
  userId,
  roleId,
  users,
  roles,
  branches,
  onClose,
  onRefresh,
}) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [isRoleMode, setIsRoleMode] = useState(!!roleId);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setIsRoleMode(!!roleId);
      form.setFieldsValue({
        userId: userId || undefined,
        roleId: roleId || undefined,
        canView: true, // Default to true when adding
      });
    }
  }, [visible, userId, roleId, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        branchId: values.branchId,
        canView: !!values.canView,
        canRead: !!values.canRead,
        canApprove: !!values.canApprove,
        canConsult: !!values.canConsult,
        canCancelConsult: !!values.canCancelConsult,
        canEdit: !!values.canEdit,
        canDelete: !!values.canDelete,
        canUpdateHis: !!values.canUpdateHis,
        canShare: !!values.canShare,
        canStats: !!values.canStats,
        canCancelApprove: !!values.canCancelApprove,
        canDeleteSeries: !!values.canDeleteSeries,
        canViewHistory: !!values.canViewHistory,
      };

      if (values.roleId) {
        await authAdminService.saveRoleScopedPermission(values.roleId, payload);
        message.success('Thêm dòng quyền cho Nhóm thành công!');
      } else {
        const targetUserId = values.userId || userId;
        await authAdminService.saveUserCustomPermission(targetUserId, payload);
        message.success('Thêm dòng quyền custom cho User thành công!');
      }

      onRefresh();
      onClose();
    } catch (err) {
      if (err.name === 'ValidationError') return;
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể lưu dòng cấu hình quyền');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={roleId ? "Thêm dòng quyền cho Nhóm" : "Thêm dòng cấu hình phân quyền"}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      destroyOnClose
      width={600}
      size="small"
      okText="Lưu cấu hình"
      cancelText="Hủy"
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
        style={{ paddingTop: 12 }}
      >
        <Row gutter={12}>
          {!roleId && !userId && (
            <Col span={12}>
              <Form.Item label="Chọn đối tượng áp dụng" required>
                <Select
                  placeholder="Chọn phân loại..."
                  onChange={(val) => {
                    setIsRoleMode(val === 'ROLE');
                    form.setFieldsValue({ userId: undefined, roleId: undefined });
                  }}
                  defaultValue="USER"
                >
                  <Option value="USER">Cá nhân (User)</Option>
                  <Option value="ROLE">Nhóm quyền (Role)</Option>
                </Select>
              </Form.Item>
            </Col>
          )}

          {/* User selector */}
          {!roleId && !userId && !isRoleMode && (
            <Col span={12}>
              <Form.Item
                label="Chọn tài khoản"
                name="userId"
                rules={[{ required: true, message: 'Vui lòng chọn tài khoản' }]}
              >
                <Select
                  placeholder="Chọn tài khoản nhân viên..."
                  showSearch
                  optionFilterProp="children"
                >
                  {users.filter(u => u.roleName !== 'PATIENT').map(u => (
                    <Option key={u.userId} value={u.userId}>
                      {u.username} ({u.email})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          )}

          {/* Role selector */}
          {!roleId && !userId && isRoleMode && (
            <Col span={12}>
              <Form.Item
                label="Chọn Nhóm quyền"
                name="roleId"
                rules={[{ required: true, message: 'Vui lòng chọn nhóm' }]}
              >
                <Select placeholder="Chọn nhóm vai trò...">
                  {roles.filter(r => r.name !== 'PATIENT').map(r => (
                    <Option key={r.id} value={r.id}>
                      {r.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          )}

          {roleId && (
            <Form.Item name="roleId" hidden><Input /></Form.Item>
          )}
          {userId && (
            <Form.Item name="userId" hidden><Input /></Form.Item>
          )}
        </Row>

        <Divider style={{ margin: '8px 0 16px 0' }} />
        <div style={{ fontWeight: 600, fontSize: 13, color: '#30456c', marginBottom: 12 }}>Phạm vi áp dụng (Scope)</div>

        <Row gutter={12}>
          <Col span={24}>
            <Form.Item
              label="Cơ sở / Chi nhánh"
              name="branchId"
              rules={[{ required: true, message: 'Chọn cơ sở' }]}
            >
              <Select placeholder="Chọn cơ sở...">
                {branches.map(b => (
                  <Option key={b.id} value={b.id}>
                    {b.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0 16px 0' }} />
        <div style={{ fontWeight: 600, fontSize: 13, color: '#30456c', marginBottom: 12 }}>Các quyền thao tác</div>

        <Row gutter={[16, 12]}>
          <Col span={6}><Form.Item name="canView" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Chỉ xem</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canRead" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Đọc</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canApprove" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Duyệt</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canConsult" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Hội chẩn</Checkbox></Form.Item></Col>

          <Col span={6}><Form.Item name="canCancelConsult" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Hủy hội chẩn</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canEdit" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Chỉnh sửa</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canDelete" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Xóa</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canUpdateHis" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Cập nhật từ HIS</Checkbox></Form.Item></Col>

          <Col span={6}><Form.Item name="canShare" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Chia sẻ</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canStats" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Thống kê</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canCancelApprove" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Hủy duyệt</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canDeleteSeries" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Xóa seri</Checkbox></Form.Item></Col>
          
          <Col span={6}><Form.Item name="canViewHistory" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Xem lịch sử</Checkbox></Form.Item></Col>
        </Row>
      </Form>
    </Modal>
  );
}
