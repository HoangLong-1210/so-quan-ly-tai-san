# Handoff: Sổ thống kê tài sản số (Digital Asset Ledger)

## Overview

Phần mềm web nội bộ dùng trong cơ quan nhà nước Việt Nam để quản lý tài sản số:
chữ ký số, phần mềm bản quyền, tên miền, chứng thư SSL. Thay thế cách quản lý bằng
nhiều file Excel rời rạc. Quy mô thiết kế: dưới 500 bản ghi tài sản, dưới 50 người dùng,
một đơn vị chính và 16 đơn vị trực thuộc.

Ba vấn đề phần mềm phải giải quyết:
1. Không biết cơ quan đang có tài sản gì.
2. Chữ ký số hết hạn mà không ai biết trước.
3. Yêu cầu hỗ trợ trao đổi qua điện thoại, không tra được đã xử lý tới đâu.

Bản thiết kế hiện tại gồm: trang đăng nhập, bảng điều khiển hai mức (toàn cảnh + theo từng loại),
sổ tài sản (danh sách),
biểu mẫu thêm/sửa với trường động theo loại tài sản, luồng nhập từ Excel 4 bước,
và một trang hệ thống thiết kế. Sáu màn hình còn lại trong đề bài gốc (chi tiết tài sản,
danh mục nhân sự, quản lý đơn vị, trình dựng trường, hệ thống yêu cầu) **chưa được thiết kế**
— thanh điều hướng đã có mục cho chúng nhưng bấm vào chỉ đổi tiêu đề, chưa có nội dung.

## About the Design Files

Các file trong gói này là **tài liệu thiết kế được viết bằng HTML** — bản mẫu thể hiện
giao diện và hành vi mong muốn, **không phải mã nguồn sản phẩm để copy trực tiếp**.

`Sổ tài sản số.dc.html` là một "Design Component": một file HTML gồm phần template
(markup có các hole `{{ }}`) và một class logic kiểu React, được `support.js` biên dịch
lúc chạy. Cấu trúc đó chỉ phục vụ việc dựng mẫu nhanh. **Không đem `support.js` hay cú pháp
`<sc-for>` / `<sc-if>` / `<x-dc>` vào sản phẩm.**

Việc cần làm: dựng lại các màn hình này trong môi trường sẵn có của codebase đích
(React, Vue, Blazor, SwiftUI, native…) theo đúng thư viện và quy ước của codebase đó.
Nếu chưa có codebase, hãy chọn framework phù hợp rồi triển khai. Toàn bộ dữ liệu trong
bản mẫu là dữ liệu giả nằm cứng trong class logic; sản phẩm thật phải lấy từ API.

Mapping cú pháp mẫu → khái niệm thường gặp:

| Trong file mẫu | Ý nghĩa |
|---|---|
| `<sc-for list="{{ rows }}" as="r">` | vòng lặp danh sách (`rows.map(...)`) |
| `<sc-if value="{{ canEdit }}">` | render có điều kiện |
| `{{ x }}` trong text/attr | nội suy giá trị từ `renderVals()` |
| `renderVals()` | hàm trả về toàn bộ dữ liệu + handler cho template |
| `style-hover="…"` | pseudo-state `:hover` |
| `this.state` / `this.setState` | state cục bộ của màn hình |

## Fidelity

**High-fidelity.** Màu, cỡ chữ, khoảng cách, bo góc, chiều cao control đều là giá trị cuối cùng
và được liệt kê đầy đủ ở mục Design Tokens. Hãy dựng lại đúng theo các giá trị đó, dùng
component sẵn có của codebase nếu có tương đương. Hành vi (điều hướng, mở hộp thoại, đổi loại
tài sản làm đổi trường động, các trạng thái rỗng/tải/lỗi) cũng đã được thể hiện thật trong bản mẫu.

Ngoại lệ: biểu đồ dùng Chart.js 4.4.1 với số liệu giả; hộp chọn file Excel chỉ mô phỏng, không
thực sự đọc file.

---

## Ràng buộc thiết kế bắt buộc (giữ nguyên khi triển khai)

**Ngôn ngữ.** Toàn bộ giao diện tiếng Việt có dấu. Chuỗi tiếng Việt dài hơn tiếng Anh
25–30% và dấu thanh nằm trên/dưới chữ, nên `line-height` tối thiểu **1.6**. Không được để
nhãn nút hoặc tiêu đề cột bị cắt cụt. Tên đơn vị dài tới mức
"Chi nhánh Trung tâm Phục vụ hành chính công số 01"; tên người tới mức
"Nguyễn Thị Hoàng Phương Anh". Font: **Inter** (400/500/600/700), Google Fonts.

**Thiết bị.** Ưu tiên desktop 1366×768 và 1920×1080. Tablet chỉ cần dùng được ở chế độ
đọc. Không cần thiết kế cho điện thoại. Bản mẫu khai báo `<meta name="viewport" content="width=1366">`.

**Khả năng tiếp cận.**
- Cỡ chữ nội dung 16px, nhỏ nhất 12.5px và chỉ dùng cho chú thích.
- Vùng bấm tối thiểu 46×46px (bản mẫu dùng `min-height: 46px` cho control thường,
  48px cho ô nhập, 50px cho nút chính của biểu mẫu).
- **Trạng thái không bao giờ chỉ phân biệt bằng màu**: mỗi trạng thái có chữ + một ký hiệu
  riêng (● ▲ ✕ ⊘ ❙❙) + kiểu viền riêng, để in đen trắng vẫn đọc được.
- Không dùng nút chỉ có biểu tượng ở thao tác quan trọng. Icon luôn kèm nhãn chữ.
- Tương phản đạt WCAG AA.

**Tính trang trọng.** Bảng màu trầm, không neon, không gradient sặc sỡ, không hoạt ảnh vui nhộn.
Transition chỉ 90–120ms cho border/background. Hiện đại và sạch sẽ, nhưng nghiêm túc hơn
các công cụ SaaS thông thường.

**In ấn.** Lãnh đạo in bảng điều khiển và danh sách ra A4 để họp. Bản mẫu có `@media print`:

```css
@media print {
  [data-noprint] { display: none !important; }          /* thanh bên, thanh trên, phân trang, nút */
  body { background: #FFFFFF; font-size: 11pt; }
  [data-print-plain] { background: #FFFFFF !important; color: #101828 !important;
                       border-color: #98A2B3 !important; box-shadow: none !important; }
  [data-print-wide] { width: 100% !important; max-width: 100% !important; padding: 0 !important; }
  [data-page-break] { break-inside: avoid; }
}
```

Giữ nguyên bốn attribute này trong sản phẩm. Biểu đồ phải đọc được khi in đen trắng —
vì vậy pie/bar dùng bốn bậc sáng tối rõ rệt của cùng một màu xanh, không dùng bốn màu khác nhau.

---

## Design Tokens

### Màu

| Token | Hex | Dùng ở đâu |
|---|---|---|
| Chủ đạo | `#17457F` | nút chính, liên kết, viền chọn |
| Chủ đạo đậm | `#10305C` | hover của nút chính |
| Nền điều hướng | `#0E2A52` | thanh bên, cột trái trang đăng nhập |
| Viền trong thanh bên | `#1C4272` | đường phân cách trong thanh bên |
| Mục đang chọn (thanh bên) | `#1B4478` | nền mục nav active |
| Hover mục nav | `#183E6E` | nền mục nav khi hover |
| Viền nút trong thanh bên | `#2A5288` | nút "Đổi vai trò / Đăng xuất" |
| Phụ | `#4A7FC1` | biểu đồ, vòng focus |
| Nền trang | `#F5F7FA` | nền ngoài các khối |
| Nền khối phụ | `#FBFCFE` | header bảng, header nhóm biểu mẫu |
| Bề mặt | `#FFFFFF` | thẻ, bảng, hộp thoại |
| Viền khối | `#E7EBF1` | viền thẻ, bảng |
| Viền ô nhập | `#DFE5EC` | input, select, textarea |
| Viền ô nhập (hover) | `#C3CFDD` | |
| Đường kẻ dòng bảng | `#F1F4F8` | |
| Chữ chính | `#101828` | |
| Chữ phụ | `#475467` | nhãn, mô tả |
| Chữ chú thích | `#667085` | hint, đơn vị đo |
| Chữ tiêu đề cột | `#64748B` | th, in hoa |
| Placeholder | `#9AA6B6` | |
| Chữ vô hiệu | `#98A2B3` | |

### Màu trạng thái tài sản

| Trạng thái | Ký hiệu | Chữ | Nền | Viền |
|---|---|---|---|---|
| Đang hiệu lực | ● | `#0B6E55` | `#E6F6F0` | `1px solid #A5DCC9` |
| Sắp hết hạn | ▲ | `#7A4409` | `#FDF3E3` | `1px solid #E4B168` + `border-left: 4px solid #B45309` |
| Đã hết hạn | ✕ | `#7A1710` | `#FBEAE8` | `1px solid #E8B4AE` |
| Đã thu hồi | ⊘ | `#475467` | `#F2F4F7` | `1px dashed #B6BFCC` |
| Tạm ngưng | ❙❙ | `#33459A` | `#EAEEF9` | `1px solid #B9C4E6` |

Màu gốc của từng trạng thái (dùng cho icon đơn sắc, viền dày): hiệu lực `#0E8B6C`,
cảnh báo `#B45309`, nguy hiểm `#B42318`, trung tính `#667085`, tạm ngưng `#3F5BA9`.
Nút nguy hiểm: chữ `#B42318`, viền `#E8B4AE`, nền hover `#FBEAE8`; nút nguy hiểm dạng đặc
(trong hộp thoại xác nhận): nền `#B42318`, hover `#96190F`.

### Thang chữ

Font `Inter, system-ui, sans-serif`. `-webkit-font-smoothing: antialiased`.

| Vai trò | Cỡ | Đậm | Line-height |
|---|---|---|---|
| Tiêu đề hero trang đăng nhập | 44px | 600 | 1.3 |
| Số liệu thẻ chỉ số nhấn mạnh | 52px | 700 | mặc định |
| Số liệu thẻ chỉ số thường | 44px | 600 | mặc định |
| Tiêu đề trang | 30px | 600 | 1.35 |
| Số liệu phụ (hộp thoại nhập Excel) | 32px | 600 | |
| Tiêu đề mục / hộp thoại | 20–24px | 600 | 1.4 |
| Tiêu đề nhóm trong trang DS | 19px | 600 | 1.45 |
| Tiêu đề thẻ, tiêu đề bảng | 18px | 600 | 1.5 |
| Chữ nội dung | 16px | 400 | 1.6 |
| Chữ phụ, mô tả dưới nhãn, nhãn ô nhập | 15px | 400/500 | 1.6 |
| Chữ trong ô nhỏ, mã tài sản, thẻ trạng thái | 14px | 400/500/600 | 1.55 |
| Chú thích, hint, tiêu đề cột bảng | 13–13.5px | 400/600 | 1.5 |
| Nhãn nhóm trong thanh bên (in hoa) | 12.5px | 600 | letter-spacing 0.08em |

Mã tài sản, ngày, số tiền dùng `font-family: ui-monospace, monospace` hoặc
`font-variant-numeric: tabular-nums` để cột thẳng hàng khi đọc lướt.

### Khoảng cách

Bội số 4: **4, 8, 12, 16, 24, 32, 48**. Trong bản mẫu (phong cách thoáng):
- Gap trong thành phần: 12–14px
- Gap giữa các thành phần: 18–26px
- Gap giữa các khối: 26–44px
- Padding thẻ/khối: 26px 30px
- Padding header nhóm: 22px 30px
- Padding ô bảng: 13px 22px (cột đầu/cuối), 13px 14–18px (cột giữa) — dòng cao khoảng 44px
- Padding main: 48px 56px 96px

### Bo góc

| Giá trị | Dùng cho |
|---|---|
| 7px | thẻ trạng thái |
| 8px | nút, ô nhập, select, textarea |
| 10px | khối nhỏ, vùng kéo thả file |
| 12px | thẻ, bảng, khối nội dung |
| 14px | hộp thoại |
| 999px | thẻ bộ lọc (pill) |
| 50% | nút đóng thẻ bộ lọc, dấu bước trong wizard |

### Bóng đổ

| Dùng cho | Giá trị |
|---|---|
| Thẻ, bảng | `0 1px 2px rgba(16, 36, 58, 0.04)` |
| Panel thông báo | `0 12px 32px rgba(16, 36, 58, 0.16)` |
| Thông báo nổi (toast) | `0 12px 28px rgba(16, 36, 58, 0.16)` |
| Hộp thoại | `0 24px 64px rgba(16, 36, 58, 0.3)` |
| Nền mờ sau hộp thoại | `rgba(16, 36, 58, 0.45)` |
| Chỉ dấu mục nav active | `inset 3px 0 0 #7FA3C8` |

### Kích thước control

| | |
|---|---|
| Ô nhập, select, textarea | cao 48px, padding ngang 12px (textarea 10px 12px) |
| Nút thường | `min-height: 46px`, padding 14px 20px |
| Nút chính biểu mẫu | `min-height: 50px`, padding 15px 26px |
| Nút trong hộp thoại | `min-height: 48px`, padding 15px 22–26px |
| Checkbox | 16px trong bảng, 18px trong biểu mẫu |
| Thanh trên | cao 76px |
| Thanh bên | rộng 272px |
| Dòng bảng | cao khoảng 44px (padding dọc 13px) |

### Trạng thái focus / hover (đặt ở CSS toàn cục)

```css
input:focus, select:focus, textarea:focus {
  outline: 2px solid #4A7FC1; outline-offset: 1px; border-color: #4A7FC1;
}
input, select, textarea { transition: border-color 120ms ease, box-shadow 120ms ease; }
input:hover:not(:focus), select:hover:not(:focus), textarea:hover:not(:focus) { border-color: #C3CFDD; }
button { transition: background-color 120ms ease, border-color 120ms ease; }
tbody tr { transition: background-color 90ms ease; }
```

Dòng bảng hover: `background: #FBFCFE`.

---

## Vai trò người dùng

| Vai trò | Tài khoản mẫu | Phạm vi | Được làm gì |
|---|---|---|---|
| `it` — Quản trị IT | Trần Quốc Bảo | toàn cơ quan, 16 đơn vị | tất cả: thêm, sửa, thu hồi, nhập Excel, xuất Excel, cấu hình |
| `unit` — Admin đơn vị | Nguyễn Thị Hoàng Phương Anh | Chi nhánh số 01 | quản lý tài sản đơn vị mình, gửi yêu cầu lên IT |
| `boss` — Lãnh đạo | Lê Minh Đức | toàn cơ quan | **chỉ đọc**: xem, xuất Excel, in |

Người dùng quan trọng nhất để tối ưu là **admin đơn vị**: họ dùng vài lần mỗi tháng,
không rành công nghệ. Nếu giao diện khiến họ phải đoán, họ quay về Excel và cả hệ thống thất bại.

**Giao diện chỉ đọc của Lãnh đạo** không được trông như bị hỏng hay thiếu:
- Ẩn nút Thêm tài sản, Nhập từ Excel, cột checkbox chọn dòng.
- Thay bằng Xuất Excel + In danh sách.
- Hiện một dải giải thích (nền `#EEF2F7`, viền `#CBD6E2`, ký hiệu ◇):
  "Chế độ xem của Lãnh đạo: toàn bộ số liệu toàn cơ quan, dùng để tra cứu và in.
  Việc thêm, sửa, thu hồi tài sản do Quản trị IT và admin đơn vị thực hiện."

---

## Mô hình dữ liệu

### Loại tài sản (mở rộng được)

Danh mục loại tài sản **do quản trị viên tự thêm** trên giao diện, và tự khai báo các trường
riêng của loại đó. Biểu mẫu nhập liệu sinh động theo khai báo này. Thiết kế phải chịu được
việc một loại có 2 trường riêng và một loại khác có 12 trường riêng.

```ts
type FieldType = 'text' | 'long' | 'number' | 'date' | 'select' | 'check';

interface CustomField {
  label: string;          // nhãn hiển thị, tiếng Việt có dấu
  type: FieldType;
  req: boolean;           // bắt buộc hay không
  options?: string[];     // chỉ với type 'select'
  ph?: string;            // placeholder gợi ý
  checkText?: string;     // nhãn cạnh checkbox, chỉ với type 'check'
}

interface AssetType { id: string; name: string; fields: CustomField[]; }
```

Năm loại trong bản mẫu:

1. **Chữ ký số** (`cks`) — 4 trường: Nhà cung cấp CA (select: Viettel-CA, VNPT-CA, FPT-CA,
   BKAV-CA; bắt buộc) · Số serial chứng thư (text, bắt buộc, ph `54 01 a2 8f 3b`) ·
   Loại thiết bị (select: USB Token, HSM, SIM PKI, Ký số từ xa; bắt buộc) ·
   Chủ thể chứng thư (text, bắt buộc).
2. **Phần mềm bản quyền** (`pm`) — 4 trường: Số license (text, bắt buộc) ·
   Số máy được cài (number, bắt buộc) · Hình thức mua (select: Mua vĩnh viễn, Thuê bao năm,
   Thuê bao tháng; bắt buộc) · Phiên bản (text).
3. **Tên miền** (`dm`) — 2 trường: Nhà đăng ký (text, bắt buộc) · Máy chủ DNS (long).
4. **Chứng thư SSL** (`ssl`) — 12 trường: Tên miền áp dụng · Tổ chức phát hành (select:
   DigiCert, Sectigo, GlobalSign, Let's Encrypt) · Loại chứng thư (select: DV, OV, EV, Wildcard) ·
   Số serial · Thuật toán khóa (select: RSA 2048, RSA 4096, ECDSA P-256) · Số tên miền phụ (number) ·
   Ngày cài đặt lên máy chủ (date) · Máy chủ đang cài · Địa chỉ IP máy chủ ·
   Đơn vị kỹ thuật vận hành · Tự động gia hạn (check) · Ghi chú cấu hình (long).
   Loại này tồn tại để kiểm chứng bố cục chịu được nhiều trường.
5. **Chứng thư nội bộ** (`nb`) — 3 trường: Hệ thống nội bộ (text, bắt buộc,
   ph `Cổng nội bộ Trung tâm`) · Mã định danh (text) · Người phê duyệt (text).
   Loại này **không có bản ghi nào** (mọi chỉ số = 0), dùng để thể hiện trường hợp
   loại tài sản vừa được khai báo.

Trường `long` chiếm cả 2 cột của grid; các trường khác 1 cột.

### Tài sản

Trường chung: mã tài sản, tên, loại, đơn vị, người giữ, nhà cung cấp, ngày cấp, ngày hết hạn,
chi phí, ghi chú — cộng các trường riêng theo loại.

**Không có ô chọn trạng thái.** Trạng thái do hệ thống tự tính từ ngày hết hạn so với hôm nay:

```
d = số ngày còn lại đến ngày hết hạn
d  <  0            → 'expired'  (Đã hết hạn)
0 <= d <= 30       → 'soon'     (Sắp hết hạn)
d  >  30           → 'active'   (Đang hiệu lực)
```

`revoked` (Đã thu hồi) và `paused` (Tạm ngưng) là trạng thái do người dùng đặt bằng hành động
riêng ở trang chi tiết, và ghi đè kết quả tính theo ngày. **Cần xác nhận với chủ sản phẩm:**
ai được đặt "Tạm ngưng" và đặt ở đâu — điểm này chưa được mô tả rõ.

Chuỗi ngày còn lại luôn viết bằng chữ, không bao giờ là số âm:
```
d === 0  → "Hết hạn hôm nay"
d  >  0  → "Còn 12 ngày"
d  <  0  → "Đã quá hạn 3 ngày"
```

Định dạng: ngày `dd/mm/yyyy`, tiền `1.500.000 ₫` (dấu chấm phân cách nghìn, ký hiệu ₫ ở sau).
Ngày mốc dùng trong dữ liệu mẫu là 04/08/2026.

### Đơn vị

16 đơn vị trực thuộc, phân cấp 3 tầng (cơ quan → phòng ban / chi nhánh → tổ):

Văn phòng Trung tâm · Phòng Kế hoạch — Tài chính và Đầu tư · Phòng Hành chính — Tổng hợp ·
Phòng Công nghệ thông tin · Phòng Tiếp nhận và Trả kết quả · Phòng Kiểm soát thủ tục hành chính ·
Chi nhánh Trung tâm Phục vụ hành chính công số 01…05 · Bộ phận Một cửa liên thông ·
Tổ Hỗ trợ kỹ thuật · Tổ Số hóa hồ sơ · Ban Quản lý dự án chuyển đổi số · Đội Bảo vệ — Hậu cần

Tên đơn vị dài là ràng buộc thật, không phải dữ liệu giả cho vui: mọi bố cục phải chịu được chúng.

---

## Screens / Views

### 1. Đăng nhập (`screen: 'login'`)

**Mục đích.** Vào hệ thống. Trong bản mẫu, ba nút vai trò thay cho việc xác thực thật.

**Bố cục.** Grid 2 cột `1.15fr 1fr`, cao tối thiểu 100vh.

Cột trái — nền `#0E2A52`, chữ `#E6ECF3`, padding 64px 72px, flex column, `justify-content: space-between`:
- Trên: ô logo 52×52 nền trắng bo 12px (ảnh logo cắt lấy phần biểu tượng) + chữ
  "Sổ quản lý tài sản số" 18px/600.
- Giữa: tiêu đề 44px/600, line-height 1.3, màu `#FFFFFF`, max-width 460px —
  "Toàn bộ tài sản số của cơ quan, trong một sổ duy nhất."; dưới đó mô tả 18px màu `#A9BCD0` —
  "Chữ ký số, phần mềm bản quyền, tên miền và chứng thư — biết rõ đang có gì, cái gì sắp hết hạn, ai đang giữ."
- Dưới: "Phiên bản 1.0 · Hỗ trợ nội bộ: máy lẻ 108" 14px màu `#7E93A8`.

Cột phải — nền `#F5F7FA`, canh giữa, cột nội dung rộng 440px, gap 24px:
- Logo 140px `object-fit: contain`.
- "TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG" 14px/600 in hoa, letter-spacing 0.06em, `#475467`.
- "Đăng nhập hệ thống" 32px/600.
- **Vùng lỗi cố định `min-height: 62px`** — chỗ dành cho thông báo lỗi để bố cục
  không nhảy khi lỗi xuất hiện. Nội dung khi có lỗi: nền `#FBEAE8`, viền `1px solid #E8B4AE`,
  `border-left: 4px solid #B42318`, chữ `#7A1710`, ký hiệu ✕ đậm, text
  "Tên đăng nhập hoặc mật khẩu không đúng. Còn 4 lần thử."
- Ô Tên đăng nhập, ô Mật khẩu (`type="password"`), cao 48px.
- Ba nút vai trò xếp dọc, `min-height: 50px`, canh trái: "Quản trị IT — Trần Quốc Bảo" (nút đặc),
  "Admin đơn vị — Nguyễn Thị Hoàng Phương Anh", "Lãnh đạo — Lê Minh Đức (chỉ đọc)" (nút viền).
- Link gạch chân "Xem trạng thái nhập sai mật khẩu" để demo trạng thái lỗi.

### 2. Khung ứng dụng (dùng cho mọi màn hình sau khi đăng nhập)

Grid `272px 1fr`.

**Thanh bên** (`data-noprint`) — nền `#0E2A52`, `position: sticky; top: 0; height: 100vh`, flex column:
- Header: logo 40×40 trong ô trắng bo 10px + "Sổ tài sản số" 15px/600 trắng +
  "TT Phục vụ HCC" 12.5px `#7E93A8`. Viền dưới `#1C4272`.
- Nhóm "NGHIỆP VỤ": Bảng điều khiển (▦) · Sổ tài sản (☰, badge 23) ·
  Danh mục nhân sự (◍) · Yêu cầu hỗ trợ (✉, badge 4).
- Nhóm "CẤU HÌNH": Quản lý đơn vị (⌸) · Loại tài sản và trường (⚙) · Hệ thống thiết kế (◈).
- Nhãn nhóm: 12.5px/600 in hoa, letter-spacing 0.08em, `#6F869C`.
- Mục nav: `min-height: 46px`, padding 14px 16px, bo 8px, chữ 15px/500 `#C4D2E0`;
  hover `background: #183E6E; color: #FFFFFF`;
  active `background: #1B4478; color: #FFFFFF; font-weight: 600; box-shadow: inset 3px 0 0 #7FA3C8`.
- Badge: nền `#B45309`, chữ trắng 12.5px/600, padding 1px 7px, bo 10px, đẩy sang phải bằng `margin-left: auto`.
- Chân: "Đang đăng nhập" + tên + vai trò + nút "Đổi vai trò / Đăng xuất" (viền `#2A5288`).

**Thanh trên** (`data-noprint`) — cao 76px, nền trắng, viền dưới `#E7EBF1`, padding ngang 34px,
`position: sticky; top: 0; z-index: 20`:
- Trái: tiêu đề màn hình hiện tại 18px/600.
- Phải: dropdown "Trạng thái demo" (chỉ dùng để trình bày, **bỏ khi làm sản phẩm**) +
  nút Thông báo.
- Nút Thông báo: icon chuông SVG 18px (stroke `#344054`, stroke-width 1.8) + nhãn chữ
  "Thông báo" + badge đỏ `#B42318` số 7. Icon **luôn kèm chữ**.

**Panel thông báo** — mở khi bấm nút, `position: fixed; right: 34px; top: 88px`, rộng 440px,
nền trắng, viền `#D7DEE7`, bo 14px, shadow `0 12px 32px rgba(16,36,58,0.16)`, `z-index: 60`:
- Header: icon chuông màu `#B45309` + "Cảnh báo tài sản" + link "Đóng".
- Danh sách cảnh báo, mỗi mục: ▲ màu `#B45309` + tiêu đề 16px/500 + phụ đề 14px `#475467`.
  Ví dụ: "CKS-2024-018 đã quá hạn 3 ngày" / "Phạm Thị Thanh Hằng · Phòng Kế hoạch — Tài chính và Đầu tư".
- Chân: nút "Xem tất cả tài sản sắp hết hạn" → sang Sổ tài sản với bộ lọc 30 ngày bật sẵn.

**Toast** — `position: fixed; right: 24px; bottom: 24px`, nền trắng, viền `1px solid #A5DCC9`,
`border-left: 4px solid #0E8B6C`, bo 8px, shadow `0 12px 28px`, max-width 420px, tự ẩn sau 3,6s,
có nút ✕. Ký hiệu ● màu `#0B6E55` ở đầu.

### 3. Bảng điều khiển (`screen: 'dash'`)

**Mục đích.** Trả lời câu hỏi "có gì cần lo không" trong 10 giây, ở **hai mức**: toàn cảnh và
chi tiết theo từng loại tài sản. Đây là màn hình lãnh đạo nhìn nhiều nhất và hay in ra giấy.
Trang có nhiều khối nên phân cấp thị giác phải dẫn mắt theo đúng thứ tự:
**điều gì đáng lo → thuộc loại nào → chi tiết ra sao.**

**Bố cục.** Cột dọc, gap 30px, max-width 1500px. Thứ tự từ trên xuống: header → bộ lọc loại →
4 thẻ tổng → khối chỉ số theo từng loại → bảng loại × trạng thái → 3 biểu đồ → bảng Cần xử lý ngay.

Header: tiêu đề "Bảng điều khiển" 30px/600 + dòng phụ
"Số liệu tính đến 04/08/2026 · <phạm vi vai trò> · <phạm vi loại>", trong đó phạm vi loại là
"Tất cả loại tài sản" hoặc "Chỉ tính loại: Chữ ký số". Bên phải (`data-noprint`):
"In báo cáo A4" và "Xuất Excel".

#### 3.1 Bộ lọc loại tài sản

`state.dashType` — chuỗi rỗng = tất cả, hoặc id một loại. **Khi có giá trị, toàn bộ nội dung
bên dưới chỉ tính cho loại đó**: 4 thẻ tổng, bảng loại × trạng thái, cả ba biểu đồ, và bảng
Cần xử lý ngay.

Hàng lọc là một dải **sticky** ngay dưới thanh trên (`position: sticky; top: 76px; z-index: 15`,
nền `#F5F7FA`, viền dưới `#E7EBF1`, `data-noprint`), gồm:
- Nhãn "LOẠI TÀI SẢN" 13px/600 in hoa letter-spacing 0.05em `#64748B`.
- Các pill: "Tất cả" + một pill cho mỗi loại. Pill thường: nền trắng, viền `#DFE5EC`,
  chữ `#344054`, bo 999px, `min-height: 40px`, padding 8px 16px.
  Pill đang chọn: nền `#17457F`, chữ trắng, weight 600.
- Khi đang lọc, chip ở cuối hàng (đẩy phải bằng `margin-left: auto`):
  **"Đang xem: Chữ ký số ✕"** — nền `#EEF2F7`, viền `1px solid #17457F`, bo 999px,
  chữ 15px/600 `#17457F`, nút ✕ tròn 26px nền `#D8E2EE`.

> Vì sao sticky: người dùng cuộn xuống giữa trang rất dễ quên mình đang xem số liệu của một loại
> chứ không phải toàn bộ. Dải lọc + chip luôn nằm trong tầm mắt giải quyết việc đó. Bản in không có
> dải này (`data-noprint`) nên phạm vi loại được nhắc lại trong dòng phụ đề của header.

#### 3.2 Hàng bốn thẻ chỉ số tổng

Grid `repeat(4, minmax(0, 1fr))`, gap 26px. Số liệu lấy từ `stats(dashType)`.

1. **Tổng tài sản** — nền trắng, số 44px/600. Phụ đề: "Trên 16 đơn vị · 5 loại" khi không lọc,
   hoặc tên loại khi đang lọc.
2. **Đang hiệu lực** — nền trắng, nhãn có ● `#0E8B6C`, số 44px, phụ đề "82% tổng số"
   (tính động; nếu tổng = 0 thì "Chưa có bản ghi").
3. **Sắp hết hạn trong 30 ngày** — **hai biến thể**:
   - Khi > 0: là **nút bấm được**, nền `#FDF3E3`, viền `1px solid #E4B168`,
     `border-top: 4px solid #B45309`, nhãn "▲ Sắp hết hạn trong 30 ngày" 14px/600 `#7A4409`,
     số **52px/700** `#7A4409`, dòng gạch chân "Gần nhất: còn 3 ngày — xem danh sách".
     Hover `#FBEBD3`. Bấm → Sổ tài sản với bộ lọc 30 ngày bật sẵn **và mang theo loại đang lọc**.
   - Khi = 0: trở về thẻ trắng bình thường, số 0 màu `#101828`,
     phụ đề "Không có tài sản nào cần xử lý". Không tô cam khi không có gì phải lo.
4. **Đã hết hạn** — nền trắng, viền `#E8B4AE`, nhãn "✕ Đã hết hạn" `#7A1710`, số 44px `#7A1710`,
   phụ đề "Quá hạn lâu nhất: 47 ngày" (hoặc "Không có tài sản quá hạn").

> Quyết định thị giác: **chỉ thẻ cần hành động được tô nền**. Ba thẻ còn lại nền trắng nên không
> tranh chú ý.

#### 3.3 Dải khối chỉ số theo từng loại tài sản

Trả lời câu hỏi lãnh đạo hay hỏi nhất — "chữ ký số có bao nhiêu cái sắp hết hạn" — ngay trên trang chủ.

Tiêu đề nhóm "Chỉ số theo từng loại tài sản" 18px/600 + phụ đề
"Bấm vào một loại để lọc toàn bộ bảng điều khiển theo loại đó".

Grid **`repeat(auto-fit, minmax(300px, 1fr))`, gap 20px** — đây là cách xử lý việc số khối
thay đổi theo cấu hình: 2 loại thì thành hai khối rộng cân đối (không trống trải vì mỗi khối
tự giãn), 6 loại tự xuống hàng thành 3+3 (không tràn vỡ). Không hard-code số cột.

Mỗi khối là một `button` (`data-print-plain`), padding 22px 24px, bo 12px, nền trắng,
shadow `0 1px 2px rgba(16,36,58,0.04)`, viền:
- `1.5px solid #17457F` khi loại đó đang được lọc,
- `1px solid #E4B168` khi loại đó có "sắp hết hạn" > 0,
- `1px solid #E7EBF1` bình thường.

Nội dung khối: hàng trên là tên loại 16px/600 + tỷ lệ "50% tổng số" 13.5px `#667085` đẩy phải;
dưới là grid 2×2 bốn chỉ số, mỗi ô gồm nhãn 13px `#667085` và số **26px** tabular-nums:
- Tổng (`#101828`)
- ● Đang hiệu lực (`#0B6E55`)
- ▲ Sắp hết hạn — `#7A4409`/700 khi > 0, `#101828`/600 khi = 0
- ✕ Đã hết hạn — `#7A1710` khi > 0, `#101828` khi = 0

Bấm khối → lọc theo loại đó; bấm lại khối đang chọn → bỏ lọc.

**Loại vừa khai báo, chưa có bản ghi nào** (mọi số bằng 0): khối chuyển nền `#FBFCFE`,
tỷ lệ ghi "chưa có bản ghi", **thay toàn bộ grid số bằng** dòng
"Loại vừa được khai báo, chưa có bản ghi nào." + liên kết gạch chân
"Thêm tài sản đầu tiên". Không hiện bốn số 0 vô nghĩa.

#### 3.4 Bảng tổng hợp loại × trạng thái

Khối trắng, `data-page-break data-print-plain`. Tiêu đề "Tổng hợp loại tài sản × trạng thái" +
phụ đề "Bảng này in được ra A4, mỗi trạng thái có ký hiệu riêng nên đọc được khi in đen trắng".

Cột: **Loại tài sản** (canh trái) · ● Đang hiệu lực · ▲ Sắp hết hạn · ✕ Đã hết hạn ·
⊘ Đã thu hồi · ❙❙ Tạm ngưng · **Tổng** — năm cột trạng thái và cột Tổng canh phải, tabular-nums.
Tiêu đề cột 13px/600 in hoa letter-spacing 0.05em; cột "▲ Sắp hết hạn" dùng màu `#7A4409`,
cột Tổng weight 700 màu `#344054`. Ký hiệu nằm ngay trong tiêu đề cột để bản in đen trắng
vẫn phân biệt được cột nào là cột nào.

Mỗi dòng một loại. Ô "sắp hết hạn" / "đã hết hạn" in đậm và đổi màu (`#7A4409` / `#7A1710`)
khi giá trị > 0, còn lại `#344054`; hai cột thu hồi/tạm ngưng màu `#667085` (thông tin nền).
Dòng cuối **Tổng cộng**: `border-top: 2px solid #CBD6E2`, nền `#FBFCFE`, toàn bộ số weight 700.

Khi đang lọc một loại: bảng **chỉ hiện dòng của loại đó**, bỏ dòng Tổng cộng
(vì trùng), phụ đề đổi thành "Chỉ hiện loại đang lọc: <tên loại>".

Số liệu mẫu (`STATS` trong file, mỗi loại có `active/soon/expired/revoked/paused`,
`total` được tính bằng tổng năm giá trị đó):

| Loại | Đang hiệu lực | Sắp hết hạn | Đã hết hạn | Đã thu hồi | Tạm ngưng | Tổng |
|---|---:|---:|---:|---:|---:|---:|
| Chữ ký số | 176 | 12 | 4 | 18 | 4 | 214 |
| Phần mềm bản quyền | 121 | 8 | 3 | 14 | 2 | 148 |
| Tên miền | 17 | 1 | 1 | 3 | 0 | 22 |
| Chứng thư SSL | 37 | 2 | 1 | 4 | 0 | 44 |
| Chứng thư nội bộ | 0 | 0 | 0 | 0 | 0 | 0 |
| **Tổng cộng** | **351** | **23** | **9** | **39** | **6** | **428** |

#### 3.5 Ba biểu đồ

Cấu hình chung Chart.js 4.4.1: `font.family = 'Inter, system-ui, sans-serif'`, `font.size = 13.5`,
`color = '#475467'`, grid `#E7EBF0`, `maintainAspectRatio: false`.
Cả ba biểu đồ **rebuild khi `dashType` đổi** (bản mẫu so `this._chartKey` rồi `destroy()`
các instance cũ trước khi tạo mới).

**a. Doughnut** (khối trái, grid `440px minmax(0, 1fr)`), cao 290px, `cutout: '54%'`,
legend bên phải (`boxWidth: 12, padding: 12`), viền trắng 2px:
- Không lọc — "Cơ cấu theo loại tài sản": 5 miếng theo loại, màu bốn/năm bậc sáng tối của cùng
  gam xanh `#17457F, #4A7FC1, #7FA3C8, #9BB6CC, #EAEEF3` để in đen trắng vẫn phân biệt được.
- Đang lọc — tiêu đề đổi thành "Cơ cấu theo trạng thái — <tên loại>", dữ liệu là 5 trạng thái của
  loại đó, màu `#17457F, #B45309, #8C3128, #9BB6CC, #D6DFE8`.
  (Lý do: khi lọc một loại thì "cơ cấu theo loại" chỉ còn một miếng, vô nghĩa.)
- Phụ đề: "<tổng> bản ghi".

**b. Line — số tài sản hết hạn theo từng tháng, 12 tháng tới** (khối phải), cao 290px:
`type: 'line'`, `borderColor: '#17457F'`, `borderWidth: 2`, `tension: 0.3`,
`fill: true`, `backgroundColor: 'rgba(23, 69, 127, 0.08)'`.
**Điểm tô đậm = tháng dồn việc**: `pointRadius` 6 và `pointBackgroundColor: '#17457F'` khi
giá trị ≥ ngưỡng, ngược lại radius 3 và nền trắng viền xanh 2px.
Ngưỡng: 30 khi không lọc, 10 khi lọc một loại. Phụ đề ghi rõ ngưỡng đang dùng.
Nhãn 08/2026 → 07/2027. Dữ liệu mẫu theo loại (tổng khi không lọc là tổng các loại):

| Loại | 12 tháng |
|---|---|
| Chữ ký số | 12, 9, 6, 4, 18, 8, 5, 14, 7, 16, 4, 7 |
| Phần mềm bản quyền | 8, 6, 4, 3, 11, 5, 4, 9, 5, 10, 2, 4 |
| Tên miền | 1, 1, 0, 1, 2, 1, 0, 1, 1, 2, 1, 1 |
| Chứng thư SSL | 2, 2, 2, 1, 3, 2, 2, 3, 1, 3, 1, 1 |
| Chứng thư nội bộ | 0 × 12 |
| **Tổng** | **23, 18, 12, 9, 34, 16, 11, 27, 14, 31, 8, 13** |

**c. Bar ngang — số lượng tài sản theo đơn vị** (khối riêng, chiếm cả chiều rộng), cao 500px,
`indexAxis: 'y'`, `barThickness: 18`, `ticks.autoSkip: false`, cột `#4A7FC1` viền `#17457F`.
Nằm ngang vì tên đơn vị dài — đọc ngang thoải mái, không phải xoay nhãn.
Giá trị mẫu 16 đơn vị giảm dần: 64, 52, 47, 41, 36, 31, 28, 24, 21, 18, 16, 14, 12, 9, 8, 7.
Khi lọc, giá trị nhân theo tỷ lệ của loại đó (`Math.round(v * share)`) — sản phẩm thật lấy số
đúng từ API. Phụ đề: "16 đơn vị trực thuộc, xếp giảm dần" hoặc
"16 đơn vị trực thuộc · chỉ tính <tên loại>".

#### 3.6 Bảng "Cần xử lý ngay"

Viền `#E4B168`, header nền `#FDF9F2` có ▲, tiêu đề 18px/600, nút "Xem tất cả" bên phải.
Phụ đề động: "32 tài sản đã hết hạn hoặc sẽ hết hạn trong 30 ngày, sắp theo hạn gần nhất",
hoặc "<n> tài sản loại <tên loại> cần xử lý, sắp theo hạn gần nhất" khi đang lọc.
Cột: Mã tài sản · Tên tài sản · Đơn vị · Người giữ · Ngày hết hạn · Còn lại.
Sắp theo ngày hết hạn tăng dần, tối đa 8 dòng. Cột "Còn lại" ghi bằng chữ kèm ký hiệu:
quá hạn "✕ Đã quá hạn 3 ngày" `#7A1710`/600; sắp hết hạn "▲ Còn 7 ngày" `#7A4409`/600.

#### 3.7 Các trạng thái khác của bảng điều khiển

**Rỗng lần đầu cài đặt**: khối trắng, padding 80px, canh giữa — ô 46px viền nét đứt dấu +,
tiêu đề 22px "Sổ tài sản chưa có bản ghi nào", mô tả
"Cơ quan vừa được khởi tạo. Cách nhanh nhất là tải file mẫu Excel, dán dữ liệu đang có sẵn vào
rồi nhập lên — 145 dòng chỉ mất khoảng hai phút.", nút "Nhập từ Excel" (chính) +
"Thêm một tài sản" (phụ), link "Khai báo loại tài sản mới". Trạng thái rỗng phải **hướng dẫn
bước tiếp theo**, không chỉ thông báo trống.

**Đang tải**: skeleton bốn thẻ (khối xám `#EAEEF3` / `#F0F3F7`, bo 7px), vòng tròn 170px
viền 22px cho doughnut, 12 cột xám cho biểu đồ, kèm dòng "Đang tải số liệu…".

**Không có quyền**: khối trắng, ⊘, "Bạn không có quyền xem số liệu toàn cơ quan",
giải thích phạm vi tài khoản, nút "Gửi yêu cầu cấp quyền".

**Lỗi hệ thống**: viền `#E8B4AE`, `border-top: 3px solid #B42318`, ô 40px viền đỏ ✕,
tiêu đề "Không tải được số liệu bảng điều khiển", mô tả cách xử lý, **mã truy vết trong khối mono**
`Mã truy vết: TS-20260804-7F3C21 · 14:26:03`, nút "Thử tải lại" + "Chép mã truy vết".
Mọi lỗi hệ thống phải có mã truy vết để người dùng báo IT.

### 4. Sổ tài sản — danh sách (`screen: 'list'`)

**Mục đích.** Màn hình quản trị IT dùng nhiều nhất. Tra cứu và so sánh.

Header: tiêu đề 30px + dòng phạm vi. Nút bên phải theo vai trò:
`it`/`unit` → Thêm tài sản (chính) · Nhập từ Excel · Xuất Excel;
`boss` → Xuất Excel · In danh sách. Với `boss` thêm dải giải thích chế độ chỉ đọc (xem mục Vai trò).

**Thanh lọc** (`data-noprint`) — khối trắng, padding 22px 26px, các control canh đáy, wrap:
- Ô tìm kiếm `flex: 1 1 300px`, nhãn "Tìm theo mã, tên tài sản hoặc người giữ",
  placeholder "Ví dụ: CKS-2024-018 hoặc Phương Anh".
- Select Loại tài sản (min-width 190px), Đơn vị (min-width 260px), Trạng thái (min-width 170px).
- Nút nhanh **"▲ Sắp hết hạn trong 30 ngày"**: khi tắt là nút viền thường; khi bật đổi sang
  nền `#FDF3E3`, viền `1.5px solid #B45309`, chữ `#7A4409`/600.
- Hàng thẻ bộ lọc đang áp dụng (chỉ hiện khi có bộ lọc), phân cách bằng viền trên:
  nhãn "Đang lọc:" + các pill (nền `#EEF2F7`, viền `#CBD6E2`, bo 999px, nút ✕ tròn 26px) +
  link "Bỏ tất cả bộ lọc". Nội dung pill: "Loại: Chữ ký số", "Đơn vị: …",
  "Trạng thái đã chọn", "▲ Sắp hết hạn trong 30 ngày", "Từ khóa: …".

**Bảng.** Header khối: "**428** kết quả · Đang xem 1–15".
Cột: checkbox (ẩn với `boss`) · Mã tài sản · Tên tài sản · Loại · Đơn vị · Người giữ ·
Ngày hết hạn ↑ · Trạng thái.
- `th`: 13px/600, in hoa, letter-spacing 0.05em, màu `#64748B`, nền hàng `#FBFCFE`.
- Mã tài sản là link mono `#17457F`/500 → mở trang chi tiết (bản mẫu tạm mở biểu mẫu).
- Cột Ngày hết hạn: **hai dòng** — ngày `dd/mm/yyyy` (tabular-nums) và dòng phụ 13.5px
  `#667085` ghi "Còn 12 ngày" / "Đã quá hạn 3 ngày". Đây là cột dùng để đọc lướt.
- Cột Trạng thái: thẻ trạng thái theo bảng ở mục Design Tokens.
- Dòng hover `#FBFCFE`, kẻ dưới `#F1F4F8`.

**Phân trang** (`data-noprint`) — "Trang 1 / 8" bên trái; bên phải nút ‹ (vô hiệu khi ở trang 1),
số trang 1 2 3 … 8 (trang hiện tại nền `#17457F` chữ trắng), nút ›; và select "Số dòng" 15/30/50.
Mỗi nút 46×46px.

**Ba trạng thái rỗng khác nhau** (phân biệt rõ, không dùng chung một thông điệp):
- *Bộ lọc không khớp*: ⌕, "Không có tài sản nào khớp với bộ lọc hiện tại", nhắc rõ sổ vẫn có
  428 bản ghi và **liệt kê bộ lọc đang áp dụng**, nút "Bỏ tất cả bộ lọc" +
  "Chỉ giữ lại lọc theo đơn vị".
- *Chưa có dữ liệu bao giờ*: dấu +, "Chưa có tài sản nào trong sổ", hướng vào nhập Excel.
- *Không có quyền*: ⊘, nói rõ tài khoản thuộc đơn vị nào, nút gửi yêu cầu cấp quyền.

**Trạng thái đang tải**: skeleton 12 dòng theo đúng grid cột
`130px minmax(0,2fr) 140px minmax(0,1.6fr) 150px 120px 130px`, kèm "Đang tải danh sách tài sản…".

### 5. Biểu mẫu thêm/sửa tài sản (`screen: 'form'`)

**Mục đích.** Màn hình khó nhất. Thử thách: khi đổi loại tài sản ở đầu biểu mẫu, toàn bộ phần
trường riêng bên dưới thay đổi — phải làm cho việc này **dễ hiểu chứ không gây hoang mang**.

**Bố cục.** max-width 1180px, grid `minmax(0, 1fr) 340px`, gap 26px, `align-items: start`.
Trên cùng: link "‹ Về sổ tài sản", tiêu đề "Thêm tài sản mới" 30px,
dòng "Các trường có dấu * là bắt buộc" (dấu * màu `#B42318`/700).

Cột chính chia làm ba khối có số bước rõ ràng, mỗi khối có header nền `#FBFCFE`:

**Bước 1 — Chọn loại tài sản.** Phụ đề: "Loại tài sản quyết định các trường cần khai ở phần dưới".
Các nút loại xếp ngang, wrap; mỗi nút hiện tên loại 16px/600 và
"N trường riêng" 13.5px. Nút đang chọn: nền `#EEF2F7`, viền `1.5px solid #17457F`.

**Bước 2 — Thông tin chung.** Phụ đề "Giống nhau với mọi loại tài sản".
Grid 2 cột, gap 26px. Các trường:
- Mã tài sản (bắt buộc, mono, ph `CKS-2026-041`, hint "Để trống nếu muốn hệ thống tự sinh mã")
- Tên tài sản (bắt buộc)
- Đơn vị quản lý (select, bắt buộc)
- Người giữ (select, bắt buộc; option dạng "Nguyễn Thị Hoàng Phương Anh — Chuyên viên")
- Nhà cung cấp
- Chi phí (canh phải, tabular-nums, ký hiệu ₫ nằm ngoài ô, hint động "Sẽ lưu là 1.500.000 ₫")
- Ngày cấp (bắt buộc, ph `dd/mm/yyyy`)
- Ngày hết hạn (bắt buộc, ph `dd/mm/yyyy`)
- Ghi chú (textarea 3 dòng, chiếm 2 cột)

**Bước 3 — Trường riêng của loại "<tên loại>".** Grid 2 cột; trường `long` chiếm 2 cột.
Phụ đề: "N trường do quản trị viên khai báo cho loại này. Đổi loại ở Bước 1 thì phần này thay đổi theo."

> **Xử lý việc trường động thay đổi** (điểm quan trọng nhất của màn hình này): khi người dùng
> đổi loại ở Bước 1, khối Bước 3 đổi viền sang `1.5px solid #B45309` và hiện một pill
> "↻ Vừa thay đổi theo loại bạn chọn" (nền `#FDF3E3`, viền `#E4B168`, chữ `#7A4409`/600)
> cạnh tiêu đề, **tự tắt sau 4000ms**. Tiêu đề khối luôn nhắc lại tên loại đang chọn.
> Nhờ vậy người dùng nhận ra "phần này thay đổi vì tôi vừa đổi loại".

**Cột phải (sticky, top 100px)** — hai khối:
1. *Trạng thái do hệ thống tự tính* (nền `#EEF2F7`, viền `#CBD6E2`, ký hiệu ◇):
   "Bạn không cần chọn trạng thái. Hệ thống so ngày hết hạn với ngày hôm nay để xác định."
   Bên dưới, phần xem trước sống: "Với ngày hết hạn **20/08/2027**, tài sản sẽ là:" +
   thẻ trạng thái tương ứng, tính lại khi người dùng đổi ngày hết hạn. Kết: "Muốn dừng dùng tài sản
   trước hạn? Dùng nút **Thu hồi** hoặc **Tạm ngưng** ở trang chi tiết."
   → Đây là cách trả lời câu hỏi "tại sao tôi không đặt được trạng thái" ngay tại chỗ.
2. *Nhiều tài sản cùng loại?* — dẫn sang nhập Excel.

**Hàng nút** (`data-noprint`): Lưu tài sản (chính, `min-height: 50px`) · Lưu và thêm tiếp (phụ) ·
Hủy (link) · **Thu hồi tài sản** đẩy sang phải, kiểu nút nguy hiểm.

**Kiểm tra dữ liệu.** Lỗi hiện **ngay tại từng ô sai**, không gom lên đầu trang:
ô lỗi đổi sang `border: 1.5px solid #B42318; background: #FFFBFA`, dưới ô là dòng lỗi 13.5px
`#B42318` có ký hiệu ✕ — ví dụ "Vui lòng nhập tên tài sản",
"Ngày hết hạn phải sau ngày cấp (05/08/2026)". Khi submit thất bại, toast phụ trợ
"Còn 1 ô chưa hợp lệ, đã cuộn tới ô đó." và focus/cuộn tới ô đầu tiên bị lỗi.
Lỗi xóa ngay khi người dùng sửa ô đó (`onChange` reset cờ lỗi).

**Hộp thoại xác nhận thu hồi** (hành động nguy hiểm) — rộng 580px, bo 14px,
`border-top: 4px solid #B42318`. Tiêu đề nêu rõ đối tượng: "Thu hồi chứng thư số CKS-2024-018?"
— **không dùng "Bạn có chắc chắn?" chung chung**. Thân bài nêu hậu quả bằng tiếng Việt tự nhiên:
"Sau khi thu hồi, tài sản chuyển sang trạng thái **Đã thu hồi**, không còn được tính vào số liệu
đang hiệu lực và không xuất hiện trong cảnh báo hết hạn. Bản ghi vẫn được giữ trong sổ cùng toàn bộ
nhật ký để phục vụ thanh tra." + "Người giữ hiện tại là **Nguyễn Thị Hoàng Phương Anh** sẽ nhận
thông báo về việc này." Có **ô nhập lý do bắt buộc** (textarea, ph
"Ví dụ: Cán bộ chuyển công tác sang đơn vị khác từ 01/09/2026", hint "Lý do được ghi vào nhật ký
thay đổi và không sửa được sau khi lưu."). Hai nút: "Không thu hồi" (phụ) và
"Thu hồi tài sản" (nguy hiểm đặc).

### 6. Nhập dữ liệu từ Excel — hộp thoại 4 bước

**Mục đích.** Chức năng quyết định thành bại: cơ quan đang có sẵn hàng trăm dòng trong Excel.
Nếu bắt nhập tay lại, họ bỏ phần mềm.

**Vỏ hộp thoại.** Nền mờ `rgba(16,36,58,0.45)`, hộp rộng 1080px, `max-height: 88vh`, bo 14px,
flex column: header + thanh bước + thân cuộn + chân cố định.
- Header: "Nhập tài sản từ Excel" 20px/600 + "Bước N / 4 — <tên bước>" + nút Đóng.
- Thanh bước (nền `#FBFCFE`): 4 chấm tròn 24px nối bằng gạch 28px.
  Bước đã qua: nền `#0B6E55` chữ ✓ trắng. Bước hiện tại: nền `#17457F` chữ trắng, nhãn 14px/600
  `#101828`. Bước chưa tới: nền `#E4E9EF` chữ `#667085`.
  Tên bước: "Chọn loại tài sản" · "Tải file mẫu" · "Chọn file đã điền" · "Xem trước và xác nhận".
- Chân: nút "‹ Quay lại" (vô hiệu ở bước 1) · link Hủy · "Tiếp tục ›" (bước 1–3) hoặc
  **"Nhập 138 dòng hợp lệ"** (bước 4).

**Bước 1 — Chọn loại tài sản.** Grid 2 cột các nút loại, mỗi nút ghi tên loại và
"N cột trong file mẫu" (= 9 cột chung + số trường riêng). Giải thích:
"Mỗi loại có bộ cột riêng, nên file mẫu cũng khác nhau. Nếu file Excel của bạn có nhiều loại lẫn
nhau, hãy nhập từng loại một."

**Bước 2 — Tải file mẫu.** Nhắc: "Điền dữ liệu vào file mẫu này rồi tải lên ở bước sau.
Không đổi tên hoặc xóa dòng tiêu đề." Bảng **liệt kê đúng các cột của loại đã chọn**, mỗi tiêu đề
ghi kèm chữ cột Excel: `A · Mã tài sản`, `B · Tên tài sản`, `C · Mã đơn vị`, `D · Người giữ`,
`E · Nhà cung cấp`, `F · Ngày cấp`, `G · Ngày hết hạn`, `H · Chi phí`, `I · Ghi chú`,
rồi `J, K, L…` cho các trường riêng. Có một dòng "Ví dụ dòng 2" với giá trị mẫu.
Nút "Tải file mẫu (.xlsx)".

**Bước 3 — Chọn file đã điền.** Ràng buộc ghi rõ: ".xlsx hoặc .xls, tối đa 10 MB,
tối đa 1.000 dòng mỗi lần nhập." Vùng kéo thả: viền `1.5px dashed #CBD6E4`, nền `#FAFCFE`,
padding 56px, ô 44px dấu ↑, chữ "Kéo file vào đây hoặc chọn từ máy tính",
nút "Chọn file từ máy tính". Sau khi chọn: khối xác nhận nền `#F1FBF7` viền `#A5DCC9`,
"chu-ky-so-thang-08-2026.xlsx", "312 KB · đã đọc 145 dòng dữ liệu", nút "Chọn file khác".
Bấm Tiếp tục khi chưa chọn file → toast "Vui lòng chọn file Excel trước khi tiếp tục."

**Bước 4 — Xem trước và xác nhận.** Đây là chỗ dễ làm người dùng bế tắc nhất.
- Ba thẻ tổng: "Đã đọc từ file / 145 dòng" (trắng) · "● Hợp lệ, sẽ được nhập / 138 dòng"
  (nền `#F1FBF7`, viền `#A5DCC9`, chữ `#0B6E55`) · "✕ Có lỗi, sẽ bị bỏ qua / 7 dòng"
  (nền `#FDF6F5`, viền `#E8B4AE`, chữ `#7A1710`). Số 32px/600.
- **Bảng lỗi** (viền `#E8B4AE`, header nền `#FDF6F5`): tiêu đề
  "7 dòng cần sửa trong file Excel của bạn" + "Số dòng dưới đây đúng theo số dòng trong file Excel,
  mở file lên và sửa trực tiếp tại ô đó."
  Bốn cột: **Dòng** (đậm `#7A1710`, "Dòng 23") · **Ô** (mono, `C23`) ·
  **Giá trị đang có** · **Cần sửa thế nào**. Bảy lỗi mẫu, mô tả cụ thể chứ không chung chung:

  | Dòng | Ô | Giá trị đang có | Cần sửa thế nào |
  |---|---|---|---|
  | 23 | C23 | PKH | Không tìm thấy đơn vị có mã PKH. Mã đúng của Phòng Kế hoạch — Tài chính và Đầu tư là PKHTC. |
  | 41 | J41 | (để trống) | Vui lòng nhập Nhà cung cấp CA: Viettel-CA, VNPT-CA, FPT-CA hoặc BKAV-CA. |
  | 58 | G58 | 2026-13-05 | Ngày hết hạn phải theo dạng dd/mm/yyyy, ví dụ 05/12/2026. |
  | 77 | A77 | CKS-2024-018 | Mã tài sản đã tồn tại trong sổ. Đổi mã khác hoặc xóa dòng này nếu là bản trùng. |
  | 92 | D92 | Nguyen Van B | Không tìm thấy cán bộ này trong danh mục nhân sự. Kiểm tra lại họ tên có dấu hoặc thêm cán bộ trước khi nhập. |
  | 104 | L104 | Token USB | Loại thiết bị chỉ nhận: USB Token, HSM, SIM PKI, Ký số từ xa. |
  | 131 | H131 | 1.500.000 ₫ | Chi phí chỉ nhập số, không kèm dấu chấm và ký hiệu ₫. Ví dụ: 1500000. |

  Chân bảng lỗi: nút "Tải file 7 dòng lỗi (.xlsx)" + giải thích
  "Sửa trong file lỗi rồi nhập lại chỉ phần đó, không cần nhập lại 145 dòng."
- Bảng xem trước 4 dòng hợp lệ đầu tiên: Dòng · Mã tài sản · Tên tài sản · Đơn vị · Ngày hết hạn.
- Nút xác nhận ghi rõ số lượng: **"Nhập 138 dòng hợp lệ"**. Sau khi nhập: đóng hộp thoại,
  về danh sách, toast "Đã nhập 138 tài sản. 7 dòng lỗi được bỏ qua, tải file lỗi ở nhật ký nhập liệu."

### 7. Trang hệ thống thiết kế (`screen: 'ds'`)

Trang tài liệu nội bộ, không phải màn hình nghiệp vụ: bảng màu (13 swatch), năm thẻ trạng thái
kèm giải thích ký hiệu, thang chữ minh họa bằng câu tiếng Việt có dấu thật, thang khoảng cách
và bo góc, và thư viện thành phần (nút 4 kiểu, ô nhập gồm cả trạng thái lỗi, select, checkbox,
ô tìm kiếm, thẻ bộ lọc, thẻ chỉ số, khung tải, thông báo nổi).
Giữ hay bỏ trang này trong sản phẩm là tùy bạn — nó hữu ích khi làm storybook.

---

## Interactions & Behavior

| Hành động | Kết quả |
|---|---|
| Bấm 1 trong 3 nút vai trò ở trang đăng nhập | vào Bảng điều khiển với vai trò đó |
| Bấm thẻ "Sắp hết hạn trong 30 ngày" | sang Sổ tài sản, bật bộ lọc 30 ngày |
| Bấm "Xem tất cả" ở bảng Cần xử lý ngay | như trên |
| Bấm nút Thông báo | mở/đóng panel cảnh báo |
| Bấm "Xem tất cả tài sản sắp hết hạn" trong panel | sang Sổ tài sản đã lọc, đóng panel |
| Bấm mã tài sản trong bảng | mở trang chi tiết (chưa thiết kế; bản mẫu mở biểu mẫu) |
| Đổi loại tài sản ở Bước 1 biểu mẫu | thay toàn bộ trường Bước 3; viền cam + pill "↻ Vừa thay đổi theo loại bạn chọn" trong 4s |
| Đổi ngày hết hạn trong biểu mẫu | thẻ trạng thái xem trước ở cột phải tính lại |
| Submit biểu mẫu thiếu tên tài sản | ô đổi đỏ + dòng lỗi dưới ô + toast; không rời trang |
| Bấm "Thu hồi tài sản" | mở hộp thoại xác nhận có ô nhập lý do |
| Bấm "Tiếp tục" ở bước 3 khi chưa chọn file | toast nhắc chọn file, không sang bước 4 |
| Bấm "Nhập 138 dòng hợp lệ" | đóng hộp thoại, về danh sách, toast tổng kết |
| Bấm ✕ trên thẻ bộ lọc | bỏ đúng một bộ lọc đó |
| Bấm "In báo cáo A4" / "In danh sách" | `window.print()` với CSS in ở trên |

Chuyển động: chỉ transition 90–120ms cho `background-color`, `border-color`, `box-shadow`.
Không animation trang trí.

## State Management

State cục bộ trong bản mẫu (khi làm thật, phần dữ liệu chuyển sang server state / query cache;
phần UI giữ nguyên):

```js
{
  screen: 'login'|'dash'|'list'|'form'|'ds'|'people'|'req'|'units'|'types',
  role: 'it'|'unit'|'boss',
  demo: 'normal'|'loading'|'empty'|'nofilter'|'noperm'|'error',  // chỉ để trình bày, bỏ khi làm thật
  loginError: bool, loginUser: str, loginPass: str,
  q: str, fType: str, fUnit: str, fStatus: str, soon: bool,      // bộ lọc danh sách
  typeId: str, typeJustChanged: bool,                            // biểu mẫu: loại đang chọn
  vName, vCode, vExpiry, vCost: str, errName, errExpiry: bool,   // biểu mẫu: giá trị + lỗi
  importOpen: bool, importStep: 1|2|3|4, importTypeId: str, hasFile: bool,
  confirmOpen: bool, notifOpen: bool, toast: str
}
```

Hai timer cần dọn khi unmount: `typeJustChanged` (4000ms) và `toast` (3600ms).
Chart.js instance phải `destroy()` khi rời màn hình bảng điều khiển hoặc khi đổi sang
trạng thái loading/empty/error — bản mẫu làm việc này trong `syncCharts()` / `componentWillUnmount()`.

Dữ liệu cần từ API (tối thiểu): danh sách loại tài sản kèm khai báo trường; danh sách đơn vị;
danh sách cán bộ; danh sách tài sản có phân trang + lọc + sắp xếp; số liệu tổng hợp cho 4 thẻ
chỉ số và 3 biểu đồ; danh sách cảnh báo hết hạn; endpoint tải file mẫu; endpoint validate +
commit file Excel trả về danh sách lỗi theo số dòng và ô.

## Assets

| File | Nguồn | Ghi chú |
|---|---|---|
| `assets/logo.png` | do người dùng cung cấp | PNG vuông 1254×1254, **lockup đầy đủ** (biểu tượng sách + lá chắn ở trên, chữ "SỔ QUẢN LÝ / TÀI SẢN SỐ" ở dưới) |

Chỗ dùng logo:
- Trang đăng nhập, cột phải: dùng cả lockup ở 140×140, `object-fit: contain`.
- Trang đăng nhập, cột trái + thanh bên: **chỉ dùng phần biểu tượng**. Vì ảnh gốc là lockup
  vuông, phải cắt bằng khung `overflow: hidden` + ảnh phóng lớn định vị tuyệt đối
  (ô 52px: `img` 121×113 tại `left: -35px; top: -11px`; ô 40px: `img` 93×87 tại
  `left: -27px; top: -9px`). Vùng biểu tượng nằm khoảng x 29–72%, y 10–56% của ảnh gốc.
- **Đề nghị**: xin file logo tách riêng phần biểu tượng, dạng SVG hoặc PNG nền trong suốt.
  Khi có, bỏ toàn bộ phần cắt thủ công ở trên.

Icon: chỉ có một icon vẽ bằng SVG inline (chuông thông báo, 24×24 viewBox, stroke-width 1.8,
stroke-linecap/linejoin round). Các "icon" còn lại là ký tự Unicode
(▦ ☰ ◍ ✉ ⌸ ⚙ ◈ ● ▲ ✕ ⊘ ❙❙ ◇ ⌕ ↑ ↻ ‹ ›). Khi làm thật nên thay bằng một bộ icon nhất quán
(Lucide, Phosphor…), **nhưng phải giữ nguyên nguyên tắc: mỗi trạng thái có một hình dạng riêng
để in đen trắng vẫn phân biệt được**, và icon luôn kèm nhãn chữ.

Thư viện ngoài: Chart.js 4.4.1 (`cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js`),
Google Fonts Inter 400/500/600/700. Thay bằng thư viện biểu đồ sẵn có của codebase nếu đã có.

## Files

| File | Nội dung |
|---|---|
| `Sổ tài sản số.dc.html` | toàn bộ bản thiết kế: template + class logic + dữ liệu mẫu |
| `support.js` | runtime của công cụ dựng mẫu — **chỉ để mở được file HTML, không đưa vào sản phẩm** |
| `assets/logo.png` | logo do người dùng cung cấp |

Mở `Sổ tài sản số.dc.html` trực tiếp bằng trình duyệt (cần mạng để tải Inter và Chart.js).
Trong file: phần template nằm giữa `<x-dc>` và `</x-dc>`; class logic nằm trong
`<script data-dc-script>` ở cuối. Dữ liệu mẫu (`TYPES`, `UNITS`, `ROWS`) và các hằng màu
nằm ở đầu class logic.

## Câu hỏi còn mở

1. **Chế độ tối** được nêu trong yêu cầu ban đầu nhưng chưa thiết kế — bản mẫu chỉ có chế độ sáng.
2. **"Tạm ngưng"** chưa rõ ai được đặt và đặt ở đâu, vì biểu mẫu không có ô trạng thái.
   Bản thiết kế tạm coi đó là một hành động ở trang chi tiết, giống Thu hồi.
3. **Mật độ bảng**: đã cân lại về dòng cao ~44px (khoảng 13–15 dòng trên màn 1366×768) sau khi
   chuyển sang phong cách thoáng. Nếu quản trị IT cần dày hơn, thêm nút "Thu gọn dòng"
   (padding dọc 8px).
4. **Sáu màn hình chưa thiết kế**: chi tiết tài sản (gồm nhật ký thay đổi dạng dòng thời gian
   với `Ngày hết hạn: 04/08/2026 → 04/08/2027`), danh mục nhân sự + trang chi tiết cán bộ,
   quản lý đơn vị dạng cây 3 cấp, danh mục loại tài sản + trình dựng trường có kéo thả và
   khung xem trước, hệ thống yêu cầu hỗ trợ (hàng đợi, dòng thời gian bình luận, mức ưu tiên).
