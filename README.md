# Sổ thống kê tài sản số

Phần mềm web nội bộ giúp cơ quan nhà nước quản lý tài sản số: chữ ký số, phần mềm bản quyền, và các loại tài sản khác do đơn vị tự khai báo thêm.

## Phần mềm này giải quyết chuyện gì

Hầu hết cơ quan đang quản lý tài sản số bằng nhiều file Excel rời rạc ở từng phòng ban. Cách đó gây ra ba vấn đề thật:

**Không ai biết cơ quan đang có gì.** Muốn biết tổng số chữ ký số hay đơn vị nào đang giữ bao nhiêu license, phải đi hỏi từng phòng rồi cộng tay.

**Chữ ký số hết hạn mà không ai biết trước.** Đến lúc cần ký văn bản gấp mới phát hiện chứng thư đã hết hạn, công việc đình trệ vài ngày chờ gia hạn.

**Yêu cầu hỗ trợ trao đổi qua điện thoại.** Đơn vị gọi lên IT xin cấp chữ ký số, vài tuần sau không ai nhớ đã xử lý tới đâu, cũng không tra lại được.

Phần mềm thay thế cách làm đó bằng một sổ chung có cảnh báo trước hạn và có quy trình yêu cầu lưu vết.

## Chức năng chính

### Sổ tài sản

Danh sách toàn bộ tài sản số của cơ quan, lọc được theo loại, đơn vị, trạng thái và khoảng ngày hết hạn. Mỗi tài sản ghi rõ ai đang giữ, đơn vị nào quản lý, còn hiệu lực tới bao giờ.

Mỗi lần thêm, sửa hay thu hồi tài sản đều được ghi vào **nhật ký thay đổi** kèm người thực hiện và nội dung thay đổi cụ thể, phục vụ việc thanh tra kiểm tra.

**Nhập hàng loạt từ Excel** với bản xem trước báo lỗi từng dòng: hệ thống chỉ rõ dòng nào ô nào sai, giá trị đang có là gì và phải sửa thế nào. Cơ quan đang có sẵn danh sách trong Excel, nếu bắt nhập tay lại hàng trăm dòng thì phần mềm sẽ bị bỏ không — đây là lý do chức năng này được làm kỹ. Chiều ngược lại, mọi danh sách đang lọc đều xuất được ra Excel.

### Danh mục loại tài sản mở rộng được

Trước mắt có chữ ký số và phần mềm bản quyền. Nhưng quản trị viên **tự thêm loại tài sản mới ngay trên giao diện** — tên miền, chứng thư SSL, tài khoản dịch vụ — và tự khai báo các trường riêng của loại đó. Biểu mẫu nhập liệu tự sinh theo khai báo.

Nghĩa là mở rộng phạm vi quản lý không cần lập trình viên can thiệp.

### Bảng điều khiển

Trả lời câu hỏi "có gì cần lo không" trong mười giây, ở hai mức:

- **Toàn cảnh**: tổng tài sản, đang hiệu lực, sắp hết hạn trong 30 ngày, đã hết hạn.
- **Theo từng loại**: mỗi loại tài sản một khối chỉ số riêng, kèm bảng tổng hợp loại × trạng thái in được ra A4.

Ba biểu đồ: cơ cấu theo loại, số lượng theo đơn vị, và số tài sản hết hạn theo từng tháng trong 12 tháng tới để lãnh đạo thấy trước tháng nào dồn việc.

Bộ lọc theo loại áp cho cả trang, nên xem riêng số liệu chữ ký số chỉ mất một cú bấm.

### Cảnh báo hết hạn

Tác vụ chạy hằng ngày quét các tài sản sắp hết hạn và tạo thông báo cho admin đơn vị sở hữu cùng bộ phận IT. Ngưỡng cảnh báo cấu hình được, mặc định 30 ngày.

Đây thực chất là giá trị lớn nhất của phần mềm.

### Hệ thống yêu cầu hỗ trợ

Admin đơn vị gửi yêu cầu (cấp mới chữ ký số, gia hạn, thu hồi, cấp license phần mềm), IT tiếp nhận, trao đổi qua bình luận, rồi đóng kèm ghi chú kết quả. Mỗi lần đổi trạng thái đều lưu vết ai làm và lúc nào.

## Ba nhóm người dùng

| Vai trò | Phạm vi | Được làm gì |
|---|---|---|
| **Quản trị IT** | Toàn cơ quan | Toàn quyền: quản lý tài sản, cấu hình danh mục, quản lý tài khoản, xử lý yêu cầu |
| **Admin đơn vị** | Đơn vị mình và đơn vị con | Quản lý tài sản trong phạm vi đơn vị, gửi yêu cầu lên IT |
| **Lãnh đạo** | Toàn cơ quan | Chỉ đọc: xem bảng điều khiển, xuất báo cáo, in |

Phân quyền dữ liệu theo cây đơn vị: admin phòng ban A không truy vấn được tài sản của phòng ban B. Việc này được thực hiện tập trung tại một lớp duy nhất trong backend, để không endpoint nào vô tình lộ dữ liệu đơn vị khác.

## Công nghệ

**Backend** — NestJS 10, Prisma 6, PostgreSQL 16, TypeScript strict. REST API dưới `/api`.

**Frontend** — React 18, Vite, TypeScript, Tailwind, shadcn/ui, TanStack Query, Chart.js.

**Triển khai** — Docker Compose bốn dịch vụ (Caddy reverse proxy có HTTPS tự động, backend, frontend, PostgreSQL) trên một VPS.

**Xác thực** — JWT lưu trong cookie `httpOnly` `SameSite=Strict`. Chọn cookie thay vì localStorage vì JavaScript không đọc được cookie httpOnly, nên lỗ hổng XSS không đánh cắp được phiên đăng nhập.

## Cấu trúc thư mục

```
TKTS_APP/
├─ apps/
│  ├─ api/                 Backend NestJS
│  │  ├─ prisma/           Schema và migration
│  │  └─ src/
│  │     ├─ controllers/   Nhận HTTP
│  │     ├─ services/      Logic nghiệp vụ
│  │     ├─ models/        Kiểu miền nghiệp vụ
│  │     ├─ dto/           Ràng buộc dữ liệu vào
│  │     ├─ modules/       Khai báo module NestJS
│  │     ├─ guards/        Xác thực và phân quyền
│  │     ├─ filters/       Xử lý lỗi thống nhất
│  │     ├─ decorators/
│  │     ├─ config/
│  │     └─ utils/
│  └─ web/                 Frontend React
├─ docs/
│  ├─ design/              Bản thiết kế giao diện high-fidelity
│  └─ superpowers/
│     ├─ specs/            Tài liệu thiết kế hệ thống
│     └─ plans/            Kế hoạch triển khai
├─ CLAUDE.md               Quy ước mã nguồn, SOLID, mẫu thiết kế
├─ docker-compose.yml
└─ Caddyfile
```

## Chạy thử trên máy

Cần Docker Desktop và Node.js 20 trở lên.

```bash
# Khởi động cơ sở dữ liệu
docker compose up -d db

# Backend
cd apps/api
npm install
cp ../../.env.example .env        # sửa mật khẩu và JWT_SECRET trước khi chạy
npx prisma migrate deploy
npm run start:dev                 # http://localhost:3000/api

# Frontend (cửa sổ terminal khác)
cd apps/web
npm install
npm run dev                       # http://localhost:5173
```

Chạy kiểm thử:

```bash
cd apps/api && npx tsc --noEmit && npx jest
cd apps/web && npx tsc --noEmit && npx vitest run
```

## Triển khai lên máy chủ

```bash
cp .env.example .env
# Bắt buộc đổi: POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, APP_DOMAIN
docker compose up -d --build
```

Caddy tự xin chứng chỉ HTTPS từ Let's Encrypt cho tên miền khai trong `APP_DOMAIN`.

Sau lần đăng nhập đầu tiên phải đổi mật khẩu các tài khoản mẫu.

## Tình trạng hiện tại

Đang triển khai **giai đoạn 1 — nền tảng**, gồm 17 hạng mục.

| Giai đoạn | Nội dung | Tình trạng |
|---|---|---|
| 1 | Đăng nhập và phân quyền, cây đơn vị, nhân sự, danh mục loại tài sản, sổ tài sản, nhập/xuất Excel, bảng điều khiển | Đang làm |
| 2 | Hệ thống yêu cầu hỗ trợ, cảnh báo hết hạn, thông báo | Chưa bắt đầu |
| 3 | Báo cáo Word/PDF theo mẫu, hồ sơ đính kèm, biên bản bàn giao | Chưa bắt đầu |

Mỗi giai đoạn cho ra một bản chạy được và dùng được thật. Kết thúc giai đoạn 1, cơ quan đã dùng được để thay Excel.

## Tài liệu

| Tài liệu | Nội dung |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Quy ước mã nguồn, SOLID, mẫu thiết kế, quy tắc bảo mật |
| [docs/superpowers/specs/](docs/superpowers/specs/) | Thiết kế hệ thống: kiến trúc, mô hình dữ liệu, phân quyền |
| [docs/superpowers/plans/](docs/superpowers/plans/) | Kế hoạch triển khai chi tiết theo từng hạng mục |
| [docs/design/README.md](docs/design/README.md) | Thiết kế giao diện: design token, mô tả từng màn hình |
| [apps/api/README.md](apps/api/README.md) | Hướng dẫn riêng cho backend |
