# Sổ thống kê tài sản số — Backend (API)

Backend NestJS + Prisma cho phần mềm quản lý tài sản số (chữ ký số, phần mềm bản quyền) của cơ quan nhà nước.

## Cài đặt

```bash
npm install
```

Tạo file `.env` (không commit) trong `apps/api/` với biến `DATABASE_URL`, ví dụ:

```
DATABASE_URL=postgresql://tkts:doi_mat_khau_nay@localhost:5432/tkts?schema=public
```

## Chạy phát triển

```bash
# chế độ theo dõi thay đổi
npm run start:dev

# build rồi chạy bản production
npm run build
npm run start:prod
```

Ứng dụng lắng nghe ở cổng `3000`, tiền tố API là `/api` (ví dụ: `GET /api/health`).

## Chạy test

```bash
# unit test
npm run test

# unit test theo dõi thay đổi
npm run test:watch

# test tích hợp (cần Postgres đang chạy, xem mục Cơ sở dữ liệu)
npm run test:e2e
```

## Cơ sở dữ liệu (Prisma)

Cần Postgres đang chạy (dùng `docker compose up -d db` ở thư mục gốc repo, có publish port 5432 tạm thời nếu chạy migration từ máy host, vì `docker-compose.yml` mặc định không expose port `db` ra ngoài).

```bash
# tạo migration mới sau khi sửa schema.prisma
npx prisma migrate dev --name <ten_migration>

# sinh lại Prisma Client (tự động chạy sau migrate dev)
npx prisma generate

# kiểm tra schema hợp lệ
npx prisma validate

# định dạng lại schema.prisma
npx prisma format
```

### Vì sao ghim Prisma ở bản 6.19.3 (không dùng `latest`)

Prisma 7 đổi kiến trúc: không cho khai báo `url` trong khối `datasource` của `schema.prisma` nữa (bắt buộc chuyển sang `prisma.config.ts` + driver adapter khi khởi tạo `PrismaClient`), và generator mặc định đổi sang `prisma-client` với đường dẫn output tùy chỉnh thay vì sinh vào `node_modules/@prisma/client`. `PrismaService` của dự án này (`src/prisma/prisma.service.ts`) dùng `new PrismaClient()` kiểu cổ điển, dựa vào `url = env("DATABASE_URL")` trong `schema.prisma`.

**Không chạy `npm i prisma@latest` / `npm i @prisma/client@latest`** cho tới khi có quyết định chủ động di trú sang kiến trúc Prisma 7 (đổi `prisma.service.ts` sang dùng adapter, thêm `prisma.config.ts`). Nếu chỉ nâng cấp theo gợi ý của CLI, `schema.prisma` sẽ báo lỗi "The datasource property `url` is no longer supported in schema files" và toàn bộ migrate/generate sẽ hỏng.
