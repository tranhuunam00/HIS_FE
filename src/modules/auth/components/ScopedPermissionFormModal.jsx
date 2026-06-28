import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Input, Checkbox, Row, Col, message, Divider, Space, Button } from 'antd';
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

  const loadExistingConfig = async (bId, rId, uId, roleMode) => {
    if (!bId) return;
    try {
      if (roleMode && rId) {
        const rolePerms = await authAdminService.getRoleScopedPermissions(rId);
        const match = rolePerms.find(p => p.branchId === bId);
        if (match) {
          form.setFieldsValue({
            canView: !!match.canView,
            canRead: !!match.canRead,
            canApprove: !!match.canApprove,
            canConsult: !!match.canConsult,
            canCancelConsult: !!match.canCancelConsult,
            canEdit: !!match.canEdit,
            canDelete: !!match.canDelete,
            canUpdateHis: !!match.canUpdateHis,
            canShare: !!match.canShare,
            canStats: !!match.canStats,
            canCancelApprove: !!match.canCancelApprove,
            canDeleteSeries: !!match.canDeleteSeries,
            canViewHistory: !!match.canViewHistory,
            canRegisterPatient: !!match.canRegisterPatient,
            canUpdatePatient: !!match.canUpdatePatient,
            canDeletePatient: !!match.canDeletePatient,
            canManageAppointment: !!match.canManageAppointment,
            canCheckIn: !!match.canCheckIn,
            canPerformExam: !!match.canPerformExam,
            canOrderServices: !!match.canOrderServices,
            canPrescribeMedicine: !!match.canPrescribeMedicine,
            canConcludeExam: !!match.canConcludeExam,
            canExecuteLaboratory: !!match.canExecuteLaboratory,
            canApproveResult: !!match.canApproveResult,
            canCollectPayment: !!match.canCollectPayment,
            canRefundPayment: !!match.canRefundPayment,
            canViewFinancialReports: !!match.canViewFinancialReports,
            canViewClinicalReports: !!match.canViewClinicalReports,
            canManagePharmacyStock: !!match.canManagePharmacyStock,
            canDispenseMedicine: !!match.canDispenseMedicine,
            canManageSchedules: !!match.canManageSchedules,
            canManageHR: !!match.canManageHR,
            canConfigureCatalog: !!match.canConfigureCatalog,
            canConfigureSystem: !!match.canConfigureSystem,
          });
          return;
        }
      } else if (!roleMode && uId) {
        const allUsersPerms = await authAdminService.getScopedPermissions();
        const userObj = allUsersPerms.find(u => u.userId === uId);
        const match = userObj?.permissions?.find(p => p.branchId === bId);
        if (match) {
          form.setFieldsValue({
            canView: !!match.canView,
            canRead: !!match.canRead,
            canApprove: !!match.canApprove,
            canConsult: !!match.canConsult,
            canCancelConsult: !!match.canCancelConsult,
            canEdit: !!match.canEdit,
            canDelete: !!match.canDelete,
            canUpdateHis: !!match.canUpdateHis,
            canShare: !!match.canShare,
            canStats: !!match.canStats,
            canCancelApprove: !!match.canCancelApprove,
            canDeleteSeries: !!match.canDeleteSeries,
            canViewHistory: !!match.canViewHistory,
            canRegisterPatient: !!match.canRegisterPatient,
            canUpdatePatient: !!match.canUpdatePatient,
            canDeletePatient: !!match.canDeletePatient,
            canManageAppointment: !!match.canManageAppointment,
            canCheckIn: !!match.canCheckIn,
            canPerformExam: !!match.canPerformExam,
            canOrderServices: !!match.canOrderServices,
            canPrescribeMedicine: !!match.canPrescribeMedicine,
            canConcludeExam: !!match.canConcludeExam,
            canExecuteLaboratory: !!match.canExecuteLaboratory,
            canApproveResult: !!match.canApproveResult,
            canCollectPayment: !!match.canCollectPayment,
            canRefundPayment: !!match.canRefundPayment,
            canViewFinancialReports: !!match.canViewFinancialReports,
            canViewClinicalReports: !!match.canViewClinicalReports,
            canManagePharmacyStock: !!match.canManagePharmacyStock,
            canDispenseMedicine: !!match.canDispenseMedicine,
            canManageSchedules: !!match.canManageSchedules,
            canManageHR: !!match.canManageHR,
            canConfigureCatalog: !!match.canConfigureCatalog,
            canConfigureSystem: !!match.canConfigureSystem,
          });
          return;
        }
      }

      form.setFieldsValue({
        canView: false, canRead: false, canApprove: false, canConsult: false, canCancelConsult: false,
        canEdit: false, canDelete: false, canUpdateHis: false, canShare: false, canStats: false,
        canCancelApprove: false, canDeleteSeries: false, canViewHistory: false,
        canRegisterPatient: false, canUpdatePatient: false, canDeletePatient: false, canManageAppointment: false,
        canCheckIn: false, canPerformExam: false, canOrderServices: false, canPrescribeMedicine: false,
        canConcludeExam: false, canExecuteLaboratory: false, canApproveResult: false, canCollectPayment: false,
        canRefundPayment: false, canViewFinancialReports: false, canViewClinicalReports: false, canManagePharmacyStock: false,
        canDispenseMedicine: false, canManageSchedules: false, canManageHR: false, canConfigureCatalog: false,
        canConfigureSystem: false,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleValuesChange = (changedValues, allValues) => {
    if ('branchId' in changedValues || 'roleId' in changedValues || 'userId' in changedValues) {
      const targetBranchId = allValues.branchId;
      const targetRoleId = allValues.roleId || roleId;
      const targetUserId = allValues.userId || userId;
      const currentMode = allValues.userId ? false : (allValues.roleId ? true : isRoleMode);
      loadExistingConfig(targetBranchId, targetRoleId, targetUserId, currentMode);
    }
  };

  const checkboxFields = [
    'canRegisterPatient', 'canUpdatePatient', 'canDeletePatient', 'canManageAppointment',
    'canCheckIn', 'canPerformExam', 'canOrderServices', 'canPrescribeMedicine',
    'canConcludeExam', 'canExecuteLaboratory', 'canApproveResult', 'canCollectPayment',
    'canRefundPayment', 'canViewFinancialReports', 'canViewClinicalReports', 'canManagePharmacyStock',
    'canDispenseMedicine', 'canManageSchedules', 'canManageHR', 'canConfigureCatalog',
    'canConfigureSystem'
  ];

  const handleSelectAll = () => {
    const vals = {};
    checkboxFields.forEach(f => {
      vals[f] = true;
    });
    form.setFieldsValue(vals);
  };

  const handleDeselectAll = () => {
    const vals = {};
    checkboxFields.forEach(f => {
      vals[f] = false;
    });
    form.setFieldsValue(vals);
  };

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
        canRegisterPatient: !!values.canRegisterPatient,
        canUpdatePatient: !!values.canUpdatePatient,
        canDeletePatient: !!values.canDeletePatient,
        canManageAppointment: !!values.canManageAppointment,
        canCheckIn: !!values.canCheckIn,
        canPerformExam: !!values.canPerformExam,
        canOrderServices: !!values.canOrderServices,
        canPrescribeMedicine: !!values.canPrescribeMedicine,
        canConcludeExam: !!values.canConcludeExam,
        canExecuteLaboratory: !!values.canExecuteLaboratory,
        canApproveResult: !!values.canApproveResult,
        canCollectPayment: !!values.canCollectPayment,
        canRefundPayment: !!values.canRefundPayment,
        canViewFinancialReports: !!values.canViewFinancialReports,
        canViewClinicalReports: !!values.canViewClinicalReports,
        canManagePharmacyStock: !!values.canManagePharmacyStock,
        canDispenseMedicine: !!values.canDispenseMedicine,
        canManageSchedules: !!values.canManageSchedules,
        canManageHR: !!values.canManageHR,
        canConfigureCatalog: !!values.canConfigureCatalog,
        canConfigureSystem: !!values.canConfigureSystem,
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
        onValuesChange={handleValuesChange}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#30456c' }}>Các quyền thao tác</div>
          <Space size="small">
            <Button type="link" size="small" style={{ padding: 0 }} onClick={handleSelectAll}>Tích tất cả</Button>
            <Button type="link" size="small" style={{ padding: 0 }} onClick={handleDeselectAll} danger>Bỏ tích tất cả</Button>
          </Space>
        </div>

        <Row gutter={[16, 12]}>
          <Col span={6}><Form.Item name="canRegisterPatient" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Đăng ký BN</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canUpdatePatient" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Sửa BN</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canDeletePatient" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Xóa BN</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canManageAppointment" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Đặt lịch hẹn</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canCheckIn" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Tiếp nhận</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canPerformExam" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Khám bệnh</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canOrderServices" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Chỉ định CLS</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canPrescribeMedicine" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Kê đơn thuốc</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canConcludeExam" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Kết luận khám</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canExecuteLaboratory" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Thực hiện CLS</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canApproveResult" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Duyệt kết quả</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canCollectPayment" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Thu tiền</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canRefundPayment" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Hoàn tiền</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canViewFinancialReports" valuePropName="checked" style={{ margin: 0 }}><Checkbox>BC Doanh thu</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canViewClinicalReports" valuePropName="checked" style={{ margin: 0 }}><Checkbox>BC Chuyên môn</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canManagePharmacyStock" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Tồn kho</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canDispenseMedicine" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Cấp phát thuốc</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canManageSchedules" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Lịch trực</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canManageHR" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Nhân sự</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canConfigureCatalog" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Danh mục</Checkbox></Form.Item></Col>
          <Col span={6}><Form.Item name="canConfigureSystem" valuePropName="checked" style={{ margin: 0 }}><Checkbox>Hệ thống</Checkbox></Form.Item></Col>
        </Row>
      </Form>
    </Modal>
  );
}
