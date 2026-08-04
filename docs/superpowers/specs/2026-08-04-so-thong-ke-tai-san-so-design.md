# Thiết kế: Sổ thống kê tài sản số

**Ngày:** 2026-08-04
**Trạng thái:** Chờ rà soát

## 1. Mục tiêu

Xây dựng ứng dụng web quản lý tài sản số cho một cơ quan có nhiều đơn vị trực thuộc (phòng ban, chi nhánh). Ứng dụng thay thế cách quản lý bằng file Excel rời rạc, giải quyết ba nhu cầu:

1. Biết cơ quan đang có những tài sản số nào, ở đơn vị nào, ai đang giữ, còn hiệu lực đến bao giờ.
2. Cảnh báo trước khi tài sản hết hạn, để không xảy ra tình trạng chữ ký số hết hạn giữa lúc cần dùng.
3. Tiếp nhận và xử lý yêu cầu từ các đơn vị theo một quy trình có lưu vết, thay cho gọi điện và nhắn tin.

Thành công được đo bằng: mọi tài sản số của cơ quan có mặt trong hệ thống; không còn tài sản nào hết hạn mà không ai biết trước; mọi yêu cầu của đơn vị đều tra được trạng thái xử lý.

## 2. Người dùng và vai trò

| Vai trò | Ai | Quyền |
|---|---|---|
| `IT_ADMIN` | Bộ phận IT trung tâm | Toàn quyền trên mọi đơn vị: quản lý tài sản, cấu hình danh mục, quản lý người dùng, xử lý ticket |
| `UNIT_ADMIN` | Admin phòng ban, chi nhánh | Xem và sửa tài sản thuộc đơn vị mình và các đơn vị con; tạo và theo dõi ticket của đơn vị mình |
| `LEADER` | Lãnh đạo | Chỉ đọc: dashboard và báo cáo toàn cơ quan |

Nhân viên thường không có tài khoản đăng nhập. Họ xuất hiện trong hệ thống với tư cách nhân sự được gán tài sản.

## 3. Kiến trúc

Backend và frontend tách rời, chạy trong container Docker trên một VPS.

```
Internet
   |
 Caddy (reverse proxy, HTTPS tự động)
   |-- /api/*  -->  Backend NestJS  -->  PostgreSQL
   |-- /*      -->  Frontend (file tĩnh React)
                          |
                    Volume uploads (tệp đính kèm, mẫu báo cáo)
```

**Backend:** NestJS + TypeScript + Prisma + PostgreSQL. REST API dưới tiền tố `/api`.

**Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui. TanStack Query quản lý dữ liệu máy chủ, React Router điều hướng, Recharts vẽ biểu đồ.

**Reverse proxy:** Caddy, tự cấp chứng chỉ HTTPS từ Let's Encrypt. Vì frontend và API dùng chung một tên miền nên không phát sinh CORS.

Backend chia thành các module độc lập, mỗi module một trách nhiệm và giao tiếp qua service được inject:

| Module | Trách nhiệm |
|---|---|
| `auth` | Đăng nhập, JWT, refresh token, đổi mật khẩu |
| `users` | Tài khoản đăng nhập và vai trò |
| `org-units` | Cây đơn vị |
| `employees` | Danh mục nhân sự được gán tài sản |
| `asset-types` | Danh mục loại tài sản và schema trường tùy biến |
| `assets` | Sổ tài sản, nhật ký thay đổi, nhập/xuất Excel |
| `tickets` | Yêu cầu và luồng xử lý |
| `dashboard` | Truy vấn tổng hợp cho biểu đồ và chỉ số |
| `notifications` | Cảnh báo hết hạn |
| `attachments` | (tùy chọn) Hồ sơ đính kèm |
| `handovers` | (tùy chọn) Biên bản bàn giao và thu hồi |
| `reports` | Sinh báo cáo Word và PDF từ mẫu |

Mỗi module gồm controller (nhận HTTP, kiểm tra đầu vào), service (logic nghiệp vụ), và truy cập dữ liệu qua Prisma. Controller không chứa logic nghiệp vụ, service không biết gì về HTTP.

### 3.1 Xác thực và phân quyền

JWT lưu trong cookie `httpOnly` `Secure` `SameSite=Strict`. Chọn cookie thay vì localStorage vì JavaScript không đọc được cookie `httpOnly`, nên lỗ hổng XSS không đánh cắp được phiên đăng nhập. Access token sống 15 phút, refresh token 7 ngày.

Phân quyền có hai tầng:

- **Tầng vai trò:** guard trên từng route kiểm tra vai trò được phép gọi (ví dụ chỉ `IT_ADMIN` được sửa danh mục loại tài sản).
- **Tầng phạm vi dữ liệu:** một hàm dùng chung `buildScopeFilter(user)` trả về điều kiện lọc Prisma theo vai trò và đơn vị của người đăng nhập. Mọi truy vấn tài sản, ticket, nhân sự đều bắt buộc đi qua hàm này.

Việc gom phạm vi dữ liệu vào một hàm duy nhất là có chủ đích: nếu mỗi service tự viết điều kiện lọc, chỉ cần một chỗ quên là dữ liệu đơn vị này lộ sang đơn vị khác, và lỗi đó rất khó phát hiện bằng mắt.

## 4. Mô hình dữ liệu

### 4.1 Tổ chức và con người

**OrgUnit** — cây đơn vị, tự tham chiếu.
`id`, `code`, `name`, `type` (CO_QUAN | PHONG_BAN | CHI_NHANH), `parentId`, `isActive`

**User** — tài khoản đăng nhập.
`id`, `username`, `passwordHash`, `fullName`, `email`, `role`, `orgUnitId`, `employeeId` (tùy chọn), `isActive`, `lastLoginAt`

**Employee** — cán bộ nhân viên được gán tài sản.
`id`, `code`, `fullName`, `position`, `orgUnitId`, `email`, `phone`, `isActive`, `note`

`User` và `Employee` tách riêng vì phần lớn cán bộ có tài sản nhưng không có tài khoản đăng nhập. Liên kết giữa hai bảng là tùy chọn, dùng khi một người vừa là cán bộ vừa có tài khoản.

### 4.2 Tài sản

**AssetType** — danh mục loại tài sản, cấu hình được trên giao diện.
`id`, `code`, `name`, `icon`, `hasExpiry`, `fieldSchema` (JSON), `isActive`, `sortOrder`

`fieldSchema` là mảng mô tả các trường riêng của loại đó:

```json
[
  { "key": "ca_provider", "label": "Nhà cung cấp CA", "type": "select",
    "options": ["Viettel-CA", "VNPT-CA", "FPT-CA", "BKAV-CA"], "required": true },
  { "key": "serial", "label": "Số serial", "type": "text", "required": true },
  { "key": "device_type", "label": "Loại thiết bị", "type": "select",
    "options": ["USB Token", "HSM", "SIM PKI", "Ký số từ xa"], "required": false }
]
```

Kiểu trường được hỗ trợ: `text`, `textarea`, `number`, `date`, `select`, `checkbox`.

Hai loại tài sản khởi tạo sẵn khi cài đặt: **Chữ ký số** và **Phần mềm bản quyền**. IT tự thêm loại mới trên giao diện quản trị mà không cần lập trình viên.

**Asset** — bản ghi tài sản.
`id`, `assetTypeId`, `code`, `name`, `orgUnitId`, `holderEmployeeId`, `vendor`, `issuedDate`, `expiryDate`, `status`, `cost`, `attributes` (JSON), `note`, `createdById`, `createdAt`, `updatedAt`

`status`: `ACTIVE` (đang hiệu lực) | `EXPIRING` (sắp hết hạn) | `EXPIRED` (đã hết hạn) | `REVOKED` (đã thu hồi) | `SUSPENDED` (tạm ngưng).

`EXPIRING` và `EXPIRED` do tác vụ nền tính từ `expiryDate`, không cho người dùng đặt tay. `REVOKED` và `SUSPENDED` do người dùng đặt. Tài sản không có ngày hết hạn (`hasExpiry` bằng false) luôn ở `ACTIVE` cho tới khi bị thu hồi.

`attributes` lưu giá trị theo `fieldSchema` của loại tương ứng. Backend kiểm tra tính hợp lệ của `attributes` dựa trên schema mỗi khi tạo hoặc sửa.

**AssetHistory** — nhật ký thay đổi.
`id`, `assetId`, `action` (CREATE | UPDATE | REVOKE | TRANSFER | IMPORT), `changedById`, `changedAt`, `changes` (JSON dạng `{ field: { from, to } }`), `note`

Nhật ký được ghi trong cùng transaction với thao tác sửa tài sản, để không có trường hợp dữ liệu đổi mà không có vết.

### 4.3 Ticket

**Ticket**
`id`, `code` (YC-2026-0001), `title`, `description`, `category`, `priority` (LOW | NORMAL | HIGH | URGENT), `status`, `orgUnitId`, `createdById`, `assignedToId`, `relatedAssetId` (tùy chọn), `createdAt`, `assignedAt`, `closedAt`, `resolution`

`status`: `NEW` (Mới) → `IN_PROGRESS` (Đang xử lý) → `DONE` (Hoàn thành), hoặc → `REJECTED` (Từ chối). Có thêm `CANCELLED` khi đơn vị tự hủy yêu cầu chưa được nhận.

`category`: cấp mới chữ ký số, gia hạn chữ ký số, thu hồi chữ ký số, cấp license phần mềm, gia hạn license, hỗ trợ khác.

Các chuyển trạng thái hợp lệ được định nghĩa tường minh trong một bảng chuyển tiếp; mọi yêu cầu chuyển trạng thái không nằm trong bảng đó bị từ chối. Ví dụ không thể chuyển thẳng từ `NEW` sang `DONE` mà không qua `IN_PROGRESS`.

**TicketComment** — `id`, `ticketId`, `authorId`, `content`, `createdAt`
**TicketAttachment** — `id`, `ticketId`, `fileName`, `storedName`, `mimeType`, `size`, `uploadedById`, `uploadedAt`

Tệp đính kèm của ticket luôn có, không phụ thuộc module hồ sơ tùy chọn ở mục 4.5 — đó là hồ sơ pháp lý của tài sản, còn đây là ảnh chụp màn hình hay công văn kèm theo yêu cầu. Hai loại tệp này dùng chung cơ chế lưu trữ và quy tắc an toàn mô tả ở mục 5.6.
**TicketHistory** — `id`, `ticketId`, `fromStatus`, `toStatus`, `byUserId`, `at`, `note`

### 4.4 Thông báo

**Notification** — `id`, `userId`, `type`, `title`, `message`, `linkUrl`, `isRead`, `createdAt`

### 4.5 Module tùy chọn

Hai nhóm bảng sau phục vụ chức năng tùy chọn, bật/tắt bằng biến môi trường (`FEATURE_ATTACHMENTS`, `FEATURE_HANDOVER`). Khi tắt, các route tương ứng không đăng ký và menu tương ứng ẩn khỏi giao diện.

**AssetAttachment** — `id`, `assetId`, `category` (HOP_DONG | HOA_DON | QUYET_DINH | CHUNG_THU | KHAC), `fileName`, `storedName`, `mimeType`, `size`, `uploadedById`, `uploadedAt`

**HandoverRecord** — `id`, `code`, `type` (BAN_GIAO | THU_HOI), `date`, `orgUnitId`, `fromEmployeeId`, `toEmployeeId`, `reason`, `status` (DRAFT | CONFIRMED), `createdById`, `note`
**HandoverItem** — `id`, `handoverRecordId`, `assetId`, `condition`, `note`

Một biên bản chứa nhiều tài sản vì thực tế thường bàn giao nhiều thứ cùng lúc cho một người. Khi biên bản chuyển sang `CONFIRMED`, hệ thống cập nhật `holderEmployeeId` của các tài sản trong biên bản và ghi `AssetHistory` với action `TRANSFER`, trong cùng một transaction.

**ReportTemplate** — `id`, `code`, `name`, `fileName`, `storedName`, `uploadedById`, `uploadedAt`

## 5. Chức năng

### 5.1 Sổ tài sản

Danh sách có phân trang, lọc theo loại tài sản, đơn vị, trạng thái, khoảng ngày hết hạn, và tìm kiếm theo mã, tên, người giữ. Cột hiển thị tùy chỉnh được và ghi nhớ theo người dùng.

Trang chi tiết hiển thị thông tin chung, các trường riêng theo loại, người giữ hiện tại, và nhật ký thay đổi.

Biểu mẫu thêm/sửa sinh động: các trường chung cố định, phần trường riêng render từ `fieldSchema` của loại được chọn.

**Nhập từ Excel:** tải file lên, hệ thống đối chiếu cột với schema của loại tài sản, hiển thị bảng xem trước có đánh dấu lỗi từng dòng (thiếu trường bắt buộc, sai định dạng ngày, đơn vị không tồn tại, mã trùng). Người dùng sửa hoặc bỏ qua các dòng lỗi rồi mới xác nhận ghi. Không ghi một phần: hoặc toàn bộ các dòng hợp lệ được ghi trong một transaction, hoặc không ghi gì.

Nhập từ Excel là chức năng bắt buộc chứ không phải tiện ích: cơ quan đang có sẵn danh sách trong Excel, và bắt nhập tay lại hàng trăm dòng là lý do phổ biến nhất khiến phần mềm quản lý tài sản bị bỏ không.

**Xuất Excel:** mọi danh sách đang lọc đều xuất được, giữ nguyên điều kiện lọc hiện hành.

### 5.2 Cảnh báo hết hạn

Một tác vụ chạy hằng ngày lúc 07:00 (giờ Việt Nam):

1. Quét các tài sản có `expiryDate`, cập nhật `status` thành `EXPIRING` nếu còn dưới ngưỡng cảnh báo, `EXPIRED` nếu đã qua ngày.
2. Tạo `Notification` cho admin của đơn vị sở hữu và cho `IT_ADMIN`.

Ngưỡng cảnh báo cấu hình được, mặc định 30 ngày. Thông báo hiển thị ở biểu tượng chuông trên thanh điều hướng. Gửi email là tùy chọn, bật bằng cấu hình SMTP; nếu không cấu hình SMTP thì hệ thống chỉ thông báo trong ứng dụng.

### 5.3 Dashboard

Dashboard thống kê ở hai mức: mức toàn cảnh cho toàn bộ tài sản, và mức chi tiết theo từng loại tài sản.

**Bộ lọc loại tài sản** đặt ở đầu trang, mặc định "Tất cả". Khi chọn một loại cụ thể, **toàn bộ** nội dung bên dưới — các thẻ chỉ số, mọi biểu đồ, bảng loại × trạng thái và bảng cần xử lý — đều chỉ tính cho loại đó. Một bộ lọc điều khiển cả trang thay vì mỗi khối một bộ lọc riêng, để người dùng không bao giờ phải tự hỏi con số đang xem thuộc phạm vi nào.

**Bốn thẻ chỉ số tổng:** tổng số tài sản, số đang hiệu lực, số sắp hết hạn trong 30 ngày, số đã hết hạn.

**Khối chỉ số theo từng loại tài sản.** Mỗi loại có một khối riêng mang tên loại, bên trong là bốn chỉ số tổng / đang hiệu lực / sắp hết hạn / đã hết hạn của riêng loại đó. Số khối sinh động theo danh mục: thêm loại tài sản mới thì dashboard tự có thêm khối, không cần sửa code. Đây là cách trả lời câu hỏi thường gặp nhất của lãnh đạo — "chữ ký số có bao nhiêu cái sắp hết hạn" — mà không cần rời khỏi trang chủ.

**Bảng tổng hợp loại × trạng thái.** Mỗi dòng là một loại tài sản, mỗi cột là một trạng thái (đang hiệu lực, sắp hết hạn, đã hết hạn, đã thu hồi, tạm ngưng), cộng cột tổng và dòng tổng cộng cuối bảng. Bảng này phục vụ việc in ra giấy mang đi họp, nên phải đọc được khi in đen trắng.

**Ba biểu đồ:**
- Biểu đồ tròn: cơ cấu tài sản theo loại.
- Biểu đồ cột: số lượng tài sản theo đơn vị.
- Biểu đồ đường: số tài sản hết hạn theo từng tháng trong 12 tháng tới.

**Bảng cần xử lý:** danh sách tài sản sắp hết hạn, sắp theo ngày hết hạn tăng dần.

Dữ liệu tự lọc theo phạm vi của người đăng nhập: `LEADER` và `IT_ADMIN` thấy toàn cơ quan, `UNIT_ADMIN` chỉ thấy đơn vị mình và đơn vị con. Cùng một trang, khác dữ liệu.

Toàn bộ số liệu của dashboard lấy từ **một truy vấn gộp nhóm duy nhất theo cặp (loại tài sản, trạng thái)**, rồi tính ngược ra các chỉ số tổng, khối theo loại và bảng ma trận. Cách này tránh việc mỗi loại tài sản mới lại thêm bốn truy vấn đếm vào cơ sở dữ liệu.

### 5.4 Ticket

Admin đơn vị tạo yêu cầu, chọn loại yêu cầu, mô tả, mức ưu tiên, liên kết tới tài sản liên quan nếu có, đính kèm tệp nếu cần.

IT thấy hàng đợi ticket lọc được theo trạng thái, đơn vị, mức ưu tiên, người được giao. Thao tác: nhận xử lý (tự gán cho mình hoặc gán cho người khác), bình luận trao đổi, hoàn thành kèm ghi chú kết quả, hoặc từ chối kèm lý do.

Mỗi lần đổi trạng thái ghi vào `TicketHistory`. Người tạo ticket nhận thông báo khi trạng thái đổi.

### 5.5 Nhân sự

Danh mục cán bộ theo đơn vị, nhập hàng loạt từ Excel. Trang chi tiết một cán bộ liệt kê toàn bộ tài sản người đó đang giữ — đây là màn hình cần dùng khi cán bộ nghỉ việc hoặc chuyển công tác.

### 5.6 Hồ sơ đính kèm (tùy chọn)

Mỗi tài sản đính kèm được nhiều tệp, phân nhóm theo loại hồ sơ.

Quy tắc an toàn tệp:
- Tệp lưu trên volume của VPS, cơ sở dữ liệu chỉ lưu đường dẫn. Lưu tệp vào database sẽ làm bản sao lưu phình rất nhanh.
- Tên tệp lưu trữ sinh ngẫu nhiên (UUID), tên gốc chỉ lưu trong database để hiển thị. Tránh hoàn toàn nguy cơ path traversal từ tên tệp do người dùng đặt.
- Chỉ chấp nhận: pdf, doc, docx, xls, xlsx, jpg, jpeg, png. Giới hạn 10 MB mỗi tệp.
- Tải về chỉ qua endpoint `GET /api/attachments/:id/download` có kiểm tra quyền theo phạm vi đơn vị. Thư mục lưu tệp không được Caddy phục vụ trực tiếp.

### 5.7 Biên bản bàn giao và thu hồi (tùy chọn)

Tạo biên bản chọn nhiều tài sản, người giao, người nhận, lý do. Lưu nháp trước, xác nhận sau. Khi xác nhận, người giữ tài sản được cập nhật tự động và ghi vào nhật ký. In ra file Word theo mẫu để ký tươi.

### 5.8 Báo cáo Word và PDF

Hệ thống không viết cứng mẫu báo cáo trong code. Cơ quan soạn mẫu `.docx` có đánh dấu chỗ điền và tải lên; backend dùng `docxtemplater` điền số liệu, giữ nguyên quốc hiệu tiêu ngữ, thể thức và bảng biểu hành chính. Bản PDF sinh bằng LibreOffice chạy nền trong container backend.

Cách này quan trọng vì thể thức văn bản hành chính rất khắt khe và hay thay đổi; khi mẫu đổi, văn thư chỉ cần sửa file Word rồi tải lên, không phải nhờ lập trình viên sửa code và triển khai lại.

Các mẫu ban đầu:
- Báo cáo tổng hợp tài sản số theo đơn vị.
- Báo cáo tài sản sắp hết hạn.
- Báo cáo tình hình tiếp nhận và xử lý yêu cầu theo tháng, quý, năm.
- Biên bản bàn giao / thu hồi (khi bật module tương ứng).

## 6. Xử lý lỗi

**Backend.** Một bộ lọc ngoại lệ toàn cục trả về lỗi theo cấu trúc thống nhất `{ statusCode, message, code, details }` với thông điệp tiếng Việt cho người dùng cuối. Lỗi kiểm tra đầu vào trả 400 kèm danh sách trường sai. Về lỗi phân quyền, phân biệt hai tình huống: thiếu quyền theo vai trò trên một chức năng (ví dụ lãnh đạo gọi API sửa tài sản) trả 403; truy cập bản ghi cụ thể nằm ngoài phạm vi đơn vị trả 404 như thể bản ghi không tồn tại, để không lộ qua mã lỗi rằng đơn vị khác đang có bản ghi đó. Mọi lỗi 500 ghi log kèm mã truy vết hiển thị cho người dùng để báo IT.

**Frontend.** Lỗi mạng và lỗi máy chủ hiển thị bằng toast tiếng Việt. Form hiển thị lỗi ngay tại trường sai. Một error boundary bao toàn ứng dụng để lỗi render không làm trắng màn hình.

**Tác vụ nền.** Tác vụ cảnh báo hết hạn ghi log kết quả mỗi lần chạy. Nếu lỗi, ghi log và thử lại ở lần chạy kế tiếp, không làm sập ứng dụng.

## 7. Kiểm thử

Viết theo lối test-driven cho phần logic dễ sai và tốn kém khi sai:

**Kiểm thử đơn vị và tích hợp (Jest + Postgres trong container thử nghiệm):**
- `buildScopeFilter`: admin đơn vị A không truy vấn được tài sản, ticket, nhân sự của đơn vị B; admin đơn vị cha thấy được đơn vị con; lãnh đạo đọc được toàn bộ nhưng mọi thao tác ghi đều bị từ chối.
- Quy tắc tính trạng thái hết hạn theo ngưỡng, kể cả các mốc biên (đúng ngày hết hạn, đúng ngưỡng cảnh báo).
- Bảng chuyển trạng thái ticket: chuyển hợp lệ thành công, chuyển không hợp lệ bị từ chối.
- Kiểm tra `attributes` theo `fieldSchema`: thiếu trường bắt buộc, sai kiểu, giá trị ngoài danh sách `options`.
- Nhập Excel: file hợp lệ, file có dòng lỗi, file sai định dạng cột; xác nhận tính nguyên tử của transaction.
- Xác nhận biên bản bàn giao cập nhật đúng người giữ và ghi nhật ký (khi bật module).

**Kiểm thử giao diện (Playwright)** cho các luồng chính: đăng nhập; thêm tài sản chữ ký số; nhập danh sách từ Excel; gửi ticket từ đơn vị và xử lý từ IT; xem dashboard với ba vai trò khác nhau.

## 8. Triển khai

Một file `docker-compose.yml` dựng bốn dịch vụ: `caddy`, `api`, `web`, `db`. Cấu hình qua `.env`:

```
DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, APP_DOMAIN, TZ=Asia/Ho_Chi_Minh
EXPIRY_WARNING_DAYS=30
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS   (tùy chọn)
FEATURE_ATTACHMENTS=false
FEATURE_HANDOVER=false
```

Volume Docker cho dữ liệu PostgreSQL, thư mục tệp đính kèm, và mẫu báo cáo.

Script sao lưu chạy hằng đêm: `pg_dump` cơ sở dữ liệu và nén thư mục tệp, giữ lại 30 bản gần nhất.

Kèm tài liệu tiếng Việt: hướng dẫn cài đặt lần đầu, hướng dẫn sao lưu và phục hồi, hướng dẫn sử dụng cho ba vai trò.

Dữ liệu khởi tạo khi cài lần đầu: một tài khoản `IT_ADMIN`, đơn vị gốc, và hai loại tài sản Chữ ký số và Phần mềm bản quyền kèm `fieldSchema` mặc định.

## 9. Giai đoạn triển khai

Mỗi giai đoạn cho ra một bản chạy được và dùng được thật, không phải bản nửa vời.

**Giai đoạn 1 — Nền tảng.** Dựng dự án, cơ sở dữ liệu, đăng nhập và phân quyền, cây đơn vị, danh mục nhân sự, danh mục loại tài sản có trường tùy biến, sổ tài sản đầy đủ (thêm/sửa/xóa, lọc, tìm kiếm, nhật ký thay đổi), nhập và xuất Excel, dashboard. Kết thúc giai đoạn này cơ quan đã dùng được để thay Excel.

**Giai đoạn 2 — Vận hành.** Hệ thống ticket đầy đủ, cảnh báo hết hạn, thông báo trong ứng dụng, email tùy chọn.

**Giai đoạn 3 — Văn bản và hồ sơ.** Báo cáo Word/PDF từ mẫu; hồ sơ đính kèm và biên bản bàn giao/thu hồi (hai module tùy chọn, mặc định tắt).

## 10. Ngoài phạm vi

Các mục sau được loại bỏ có chủ đích khỏi phiên bản này:

- Ứng dụng di động.
- Tích hợp LDAP / Active Directory / SSO.
- Ký số trực tiếp trên phần mềm.
- Quản lý hợp đồng, hóa đơn và quyết toán ngân sách (chỉ lưu trường chi phí và tệp hồ sơ, không có nghiệp vụ tài chính).
- Đa ngôn ngữ (chỉ tiếng Việt).
- Đồng bộ tự động với hệ thống của nhà cung cấp chữ ký số.
