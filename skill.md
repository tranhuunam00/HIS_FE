# HIS-DAO-CARE: Frontend Development Skill & UX/UI Guide

Tài liệu này định nghĩa các nguyên tắc phát triển, cấu trúc thư mục, tiêu chuẩn giao diện (UI/UX) và quy tắc viết code dành cho các Frontend Agent phát triển dự án **HIS-DAO-CARE (Admin/Staff Portal)**.

---

## 1. Công Nghệ & Tiêu Chuẩn Giao Diện (Core Stack & UI Standards)

*   **Framework**: ReactJS.
*   **Ngôn ngữ**: JavaScript (JS) (ES6+).
*   **UI Library**: Ant Design (antd).
*   **Màu sắc chủ đạo (Theme & Brand Colors)**: Xanh lá cây nhẹ (Light Green, ví dụ: `#4caf50` hoặc `#52c41a`) và Trắng (White, `#ffffff`) là tông màu chỉ đạo thống nhất toàn hệ thống.
*   **Tiêu chuẩn Layout**: **Compact & Dense UI** (Thiết kế cực kỳ tối giản không gian, hạn chế padding/margin thừa để tối đa hóa lượng thông tin hiển thị trên một màn hình).

---

## 2. Quy Tắc Thiết Kế Tiết Kiệm Không Gian (Compact Layout Rules)

Đặc thù của hệ thống quản lý y tế (HIS) là nhân viên y tế cần xem rất nhiều thông tin đồng thời để ra quyết định nhanh. Do đó, giao diện phải tuân thủ nghiêm ngặt các quy tắc sau:

### 2.1. Cấu hình Ant Design Compact & Size Small
*   Tất cả các Component của `antd` như Table, Form, Input, Button, Select, Tabs phải sử dụng thuộc tính `size="small"` theo mặc định.
*   Sử dụng `<Space.Compact>` của Ant Design để ghép nhóm các ô nhập liệu và nút bấm mà không có khoảng trống (margin) giữa chúng.

### 2.2. Kiểm soát Padding & Margin (Spacing)
*   Không sử dụng khoảng trống mặc định của Ant Design (thường là 16px - 24px).
*   **Quy chuẩn Spacing**:
    *   Khoảng cách giữa các phần tử (margin/gap): Tối đa **4px - 8px**.
    *   Khoảng cách đệm bên trong các ô/card (padding): Tối đa **8px - 12px**.
*   Bảng dữ liệu (Table): Padding của các hàng (`td`) và tiêu đề (`th`) phải cấu hình siêu nhỏ (dense padding) để hiển thị được nhiều hàng nhất có thể mà không cần cuộn trang.

### 2.3. Bố cục Đa cột & Thu gọn (Responsive & Collapsible Panels)
*   Sử dụng bố cục dạng Grid (Row/Col) chia nhỏ thông tin thành nhiều cột trên màn hình rộng.
*   Các vùng thông tin phụ hoặc chi tiết bổ sung nên được đặt trong các thẻ sập/mở (Collapse/Accordion), Drawer, Tabs hoặc hiển thị dạng Hover (Tooltip, Popover) thay vì hiển thị tràn lan trên màn hình chính.
*   Sử dụng Table có thanh cuộn ngang độc lập cho từng bảng thay vì làm giãn toàn bộ trang.

---

## 3. Cấu Trúc Thư Mục Dự Án (Folder Structure)

Cấu trúc mã nguồn được tổ chức theo module/chức năng tương ứng với sơ đồ Subagent nhằm tránh xung đột code và dễ quản lý context:

```
src/
├── assets/                  # Hình ảnh, icon, font
├── components/              # Các component dùng chung toàn hệ thống (Common UI)
│   ├── Table/
│   ├── Button/
│   └── Form/
├── constants/               # Định nghĩa các hằng số, Enum, Route path (Tránh magic strings/numbers)
├── hooks/                   # Custom hooks dùng chung
├── layout/                  # Giao diện khung (Sidebar, Header, Footer)
├── modules/                 # Chức năng phân chia theo Subagent
│   ├── org/                 # Module Tổ chức & Cơ sở (fe-agent-org)
│   ├── auth/                # Module Phân quyền & User (fe-agent-auth)
│   ├── medical/             # Module Dịch vụ & ICD (fe-agent-medical)
│   ├── engine/              # Module Lịch làm việc & Quy trình (fe-agent-engine)
│   └── forms/               # Module Form Builder (fe-agent-forms)
├── services/                # Các lớp kết nối API (Axios/Fetch)
└── utils/                   # Hàm bổ trợ (Format ngày, tiền tệ, logic chung)
```

---

## 4. Các Quy Quy Tắc Lập Trình Bắt Buộc (Coding Standards)

### 4.1. Không sử dụng Magic Value
*   Tất cả URL API, Key lưu trữ (localStorage), Mã vai trò (Role Code), Trạng thái (Status)... phải được định nghĩa trong thư mục `constants/` và import khi sử dụng.
*   *Sai*: `if (user.role === 'admin')`
*   *Đúng*: `if (user.role === USER_ROLES.ADMIN)`

### 4.2. Quản lý trạng thái dữ liệu (State Management & Fetching)
*   Sử dụng custom hook hoặc React Query để quản lý việc gọi API và lưu bộ nhớ đệm (caching), giúp giảm số lượng request không cần thiết lên Backend.
*   Bắt buộc hiển thị spinner siêu nhỏ hoặc skeleton nhẹ khi đang tải dữ liệu để tránh làm dịch chuyển bố cục giao diện đột ngột (Layout Shift).

### 4.3. Quản lý lỗi hiển thị (Error Boundaries)
*   Tất cả các form nhập liệu phải có thông báo lỗi nhỏ màu đỏ ngay dưới trường nhập (sử dụng validate của Form Antd). Không sử dụng alert hệ thống.
*   Bao bọc các phần lớn của ứng dụng trong Error Boundary để nếu một component nhỏ bị lỗi hiển thị, toàn bộ trang web không bị trắng xóa.

---

## 5. Quy Trình Mô Phỏng Nghiệp Vụ VTTECH (VTTech Emulation Guidelines)

### 5.1. Nguyên tắc đọc tài liệu và phản hồi
*   **Bắt buộc quét tài liệu và cập nhật Requirement trước khi làm**: Trước khi bắt đầu bất kỳ tính năng, sửa đổi hoặc sửa lỗi nào, Agent phải tìm kiếm và đọc kỹ tài liệu nghiệp vụ tương ứng từ cổng tài liệu của VTTech (`https://vttechsolution.com/documentation`). Sau đó, Agent **phải ghi nhận lại các yêu cầu nghiệp vụ chi tiết** vào tệp tài liệu cache tương ứng trong thư mục `.agents/vttech-docs/` (hoặc tệp requirement của dự án) rồi mới được tiến hành lập kế hoạch và thực hiện code.
*   **Review trước khi code**: Trình bày rõ ràng giải pháp, luồng đi và thiết kế API/Giao diện cho USER duyệt. **Không tự ý thực hiện code khi chưa có sự xác nhận.**
*   **Hỏi ý kiến từng chặng**: Đến mỗi bước có sự lựa chọn thiết kế hoặc cấu trúc dữ liệu, phải dừng lại hỏi ý kiến USER.

### 5.2. Phân chia Agent chi tiết cho từng phần việc tiếp theo
*   **Phần 1: Chi nhánh & Phòng/Giường (Branch & Rooms Card Grid)**
    *   **Backend Agent**: `be-agent-org` chịu trách nhiệm mở rộng schema/API (cập nhật thông tin ngân hàng VietQR cho chi nhánh, cấu hình trạng thái phòng/giường).
    *   **Frontend Agent**: `fe-agent-org` chịu trách nhiệm thiết kế giao diện đổi chi nhánh trên Header, và sơ đồ lưới phòng theo Tầng -> Thẻ Phòng -> Danh sách Giường/Ghế.
*   **Phần 2: Nhân viên & Phòng ban (Staff & Departments)**
    *   **Backend Agent**: `be-agent-org` (quản lý nhân viên, hồ sơ, Nickname bác sĩ) kết hợp với `be-agent-auth` (quản lý phân quyền theo Bộ phận/Phòng ban).
    *   **Frontend Agent**: `fe-agent-org` (UI thêm/sửa nhân sự có Nickname, quản lý danh mục phòng ban) và `fe-agent-auth` (UI gán vai trò theo Phòng ban).
*   **Phần 3: Lịch làm việc & Ca trực (Schedules & Shifts)**
    *   **Backend Agent**: `be-agent-engine`.
    *   **Frontend Agent**: `fe-agent-engine`.

