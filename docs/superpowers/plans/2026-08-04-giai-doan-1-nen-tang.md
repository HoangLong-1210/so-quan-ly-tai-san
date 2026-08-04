# Sổ thống kê tài sản số — Giai đoạn 1 (Nền tảng) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng nền tảng chạy được của hệ thống quản lý tài sản số: đăng nhập có phân quyền, cây đơn vị, danh mục nhân sự, danh mục loại tài sản có trường tùy biến, sổ tài sản đầy đủ với nhập/xuất Excel, và dashboard thống kê.

**Architecture:** Backend NestJS + Prisma + PostgreSQL cung cấp REST API dưới `/api`. Frontend React + Vite là SPA gọi API qua cùng một tên miền nhờ Caddy reverse proxy. Phân quyền dữ liệu tập trung ở một hàm `buildScopeFilter` duy nhất mà mọi truy vấn có phạm vi đơn vị đều phải đi qua.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL 16, TypeScript 5, React 18, Vite 5, TanStack Query 5, React Router 6, Tailwind 3, shadcn/ui, Recharts 2, ExcelJS 4, Jest, Playwright, Docker Compose, Caddy 2.

## Global Constraints

- Toàn bộ chuỗi hiển thị cho người dùng viết bằng **tiếng Việt có dấu**. Tên biến, tên hàm, tên bảng, tên cột viết bằng tiếng Anh.
- Múi giờ toàn hệ thống là `Asia/Ho_Chi_Minh`. Container đặt `TZ=Asia/Ho_Chi_Minh`.
- Ngôn ngữ: TypeScript ở cả backend và frontend, chế độ `strict: true`.
- Mọi endpoint có phạm vi đơn vị **bắt buộc** đi qua `buildScopeFilter(user)`. Không service nào được tự viết điều kiện `orgUnitId` riêng.
- Ba vai trò cố định: `IT_ADMIN`, `UNIT_ADMIN`, `LEADER`.
- Lỗi trả về theo cấu trúc `{ statusCode, message, code, details }`, `message` bằng tiếng Việt.
- Thiếu quyền theo vai trò trả **403**. Truy cập bản ghi ngoài phạm vi đơn vị trả **404** (không lộ sự tồn tại của bản ghi).
- Trạng thái tài sản `EXPIRING` / `EXPIRED` chỉ do hệ thống tính, không cho người dùng đặt tay.
- Ngưỡng cảnh báo hết hạn mặc định 30 ngày, đọc từ biến môi trường `EXPIRY_WARNING_DAYS`.
- Commit sau mỗi task. Thông điệp commit tiếng Việt, tiền tố `feat:`, `test:`, `chore:`, `fix:`.

---

## File Structure

```
TKTS_APP/
├─ docker-compose.yml            Bốn dịch vụ: db, api, web, caddy
├─ Caddyfile                     Định tuyến /api/* -> api, /* -> web
├─ .env.example                  Mẫu biến môi trường
├─ apps/
│  ├─ api/                       Backend NestJS
│  │  ├─ Dockerfile
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma        Toàn bộ mô hình dữ liệu
│  │  │  └─ seed.ts              Dữ liệu khởi tạo
│  │  ├─ src/
│  │  │  ├─ main.ts              Bootstrap, cookie-parser, prefix /api
│  │  │  ├─ app.module.ts
│  │  │  ├─ prisma/              PrismaService dùng chung
│  │  │  ├─ common/
│  │  │  │  ├─ filters/http-exception.filter.ts   Lỗi thống nhất
│  │  │  │  ├─ scope/scope.util.ts                buildScopeFilter
│  │  │  │  ├─ guards/jwt-auth.guard.ts
│  │  │  │  ├─ guards/roles.guard.ts
│  │  │  │  ├─ decorators/roles.decorator.ts
│  │  │  │  ├─ decorators/current-user.decorator.ts
│  │  │  │  └─ excel/excel.util.ts                Đọc/ghi workbook
│  │  │  ├─ auth/                Đăng nhập, JWT, refresh
│  │  │  ├─ users/               Tài khoản đăng nhập
│  │  │  ├─ org-units/           Cây đơn vị
│  │  │  ├─ employees/           Danh mục nhân sự
│  │  │  ├─ asset-types/         Danh mục loại tài sản + fieldSchema
│  │  │  ├─ assets/              Sổ tài sản, nhật ký, import/export
│  │  │  └─ dashboard/           Truy vấn tổng hợp
│  │  └─ test/                   Kiểm thử tích hợp
│  └─ web/                       Frontend React
│     ├─ Dockerfile
│     ├─ src/
│     │  ├─ main.tsx, App.tsx, router.tsx
│     │  ├─ lib/api-client.ts    Lớp gọi API duy nhất
│     │  ├─ lib/format.ts        Định dạng ngày, tiền tệ tiếng Việt
│     │  ├─ features/auth/
│     │  ├─ features/org-units/
│     │  ├─ features/employees/
│     │  ├─ features/asset-types/
│     │  ├─ features/assets/
│     │  ├─ features/dashboard/
│     │  └─ components/          Layout, bảng, form động dùng chung
│     └─ e2e/                    Kiểm thử Playwright
└─ docs/
   ├─ cai-dat.md                 Hướng dẫn cài đặt
   └─ huong-dan-su-dung.md       Hướng dẫn sử dụng theo vai trò
```

Mỗi module backend gồm `*.module.ts`, `*.controller.ts`, `*.service.ts`, thư mục `dto/`, và file kiểm thử `*.service.spec.ts` nằm cạnh. Controller không chứa logic nghiệp vụ; service không biết gì về HTTP.

---

## Task 1: Dựng khung dự án và cơ sở dữ liệu

**Files:**
- Create: `docker-compose.yml`, `Caddyfile`, `.env.example`
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/nest-cli.json`, `apps/api/Dockerfile`
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Test: `apps/api/src/health/health.controller.spec.ts`

**Interfaces:**
- Consumes: (không có — task đầu tiên)
- Produces: `PrismaService extends PrismaClient` (inject được toàn hệ thống); enum Prisma `Role`, `OrgUnitType`, `AssetStatus`, `TicketStatus`; toàn bộ model của mục 4 trong spec.

- [ ] **Step 1: Khởi tạo dự án NestJS**

```bash
cd apps && npx @nestjs/cli new api --package-manager npm --skip-git --language TypeScript
cd api && npm i @prisma/client @nestjs/config cookie-parser class-validator class-transformer
npm i -D prisma @types/cookie-parser
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Viết schema Prisma đầy đủ cho giai đoạn 1**

Trong `apps/api/prisma/schema.prisma`. Các model của giai đoạn 2 và 3 (Ticket, Notification, Attachment, Handover) **không** khai báo ở đây — thêm khi làm giai đoạn đó.

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role        { IT_ADMIN UNIT_ADMIN LEADER }
enum OrgUnitType { CO_QUAN PHONG_BAN CHI_NHANH }
enum AssetStatus { ACTIVE EXPIRING EXPIRED REVOKED SUSPENDED }
enum HistoryAction { CREATE UPDATE REVOKE TRANSFER IMPORT }

model OrgUnit {
  id        String      @id @default(uuid())
  code      String      @unique
  name      String
  type      OrgUnitType
  parentId  String?
  parent    OrgUnit?    @relation("OrgUnitTree", fields: [parentId], references: [id])
  children  OrgUnit[]   @relation("OrgUnitTree")
  isActive  Boolean     @default(true)
  users     User[]
  employees Employee[]
  assets    Asset[]
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  @@index([parentId])
}

model User {
  id           String    @id @default(uuid())
  username     String    @unique
  passwordHash String
  fullName     String
  email        String?
  role         Role
  orgUnitId    String
  orgUnit      OrgUnit   @relation(fields: [orgUnitId], references: [id])
  employeeId   String?   @unique
  employee     Employee? @relation(fields: [employeeId], references: [id])
  isActive     Boolean   @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Employee {
  id        String   @id @default(uuid())
  code      String   @unique
  fullName  String
  position  String?
  orgUnitId String
  orgUnit   OrgUnit  @relation(fields: [orgUnitId], references: [id])
  email     String?
  phone     String?
  isActive  Boolean  @default(true)
  note      String?
  user      User?
  assets    Asset[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([orgUnitId])
}

model AssetType {
  id          String  @id @default(uuid())
  code        String  @unique
  name        String
  icon        String?
  hasExpiry   Boolean @default(true)
  fieldSchema Json    @default("[]")
  isActive    Boolean @default(true)
  sortOrder   Int     @default(0)
  assets      Asset[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Asset {
  id               String      @id @default(uuid())
  assetTypeId      String
  assetType        AssetType   @relation(fields: [assetTypeId], references: [id])
  code             String      @unique
  name             String
  orgUnitId        String
  orgUnit          OrgUnit     @relation(fields: [orgUnitId], references: [id])
  holderEmployeeId String?
  holder           Employee?   @relation(fields: [holderEmployeeId], references: [id])
  vendor           String?
  issuedDate       DateTime?
  expiryDate       DateTime?
  status           AssetStatus @default(ACTIVE)
  cost             Decimal?    @db.Decimal(15, 2)
  attributes       Json        @default("{}")
  note             String?
  createdById      String
  history          AssetHistory[]
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  @@index([orgUnitId])
  @@index([assetTypeId])
  @@index([expiryDate])
  @@index([status])
}

model AssetHistory {
  id          String        @id @default(uuid())
  assetId     String
  asset       Asset         @relation(fields: [assetId], references: [id], onDelete: Cascade)
  action      HistoryAction
  changedById String
  changedAt   DateTime      @default(now())
  changes     Json          @default("{}")
  note        String?
  @@index([assetId])
}
```

- [ ] **Step 3: Viết docker-compose.yml và Caddyfile**

`docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      TZ: Asia/Ho_Chi_Minh
    volumes: [db_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      retries: 5
    restart: unless-stopped

  api:
    build: ./apps/api
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      EXPIRY_WARNING_DAYS: ${EXPIRY_WARNING_DAYS:-30}
      TZ: Asia/Ho_Chi_Minh
    depends_on:
      db: { condition: service_healthy }
    restart: unless-stopped

  web:
    build: ./apps/web
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    depends_on: [api, web]
    restart: unless-stopped

volumes:
  db_data:
  caddy_data:
```

`Caddyfile`:

```
{$APP_DOMAIN} {
	handle /api/* {
		reverse_proxy api:3000
	}
	handle {
		reverse_proxy web:80
	}
}
```

`.env.example`:

```
APP_DOMAIN=taisanso.example.gov.vn
POSTGRES_USER=tkts
POSTGRES_PASSWORD=doi_mat_khau_nay
POSTGRES_DB=tkts
DATABASE_URL=postgresql://tkts:doi_mat_khau_nay@db:5432/tkts?schema=public
JWT_SECRET=sinh_chuoi_ngau_nhien_64_ky_tu
JWT_REFRESH_SECRET=sinh_chuoi_ngau_nhien_64_ky_tu_khac
EXPIRY_WARNING_DAYS=30
TZ=Asia/Ho_Chi_Minh
```

- [ ] **Step 4: Viết test kiểm tra endpoint health**

`apps/api/src/health/health.controller.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('trả về trạng thái ok', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    const controller = moduleRef.get(HealthController);
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 5: Chạy test để xác nhận nó thất bại**

Run: `cd apps/api && npx jest src/health --verbose`
Expected: FAIL — `Cannot find module './health.controller'`

- [ ] **Step 6: Viết PrismaService và HealthController**

`apps/api/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

`apps/api/src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

`apps/api/src/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

`apps/api/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
```

- [ ] **Step 7: Chạy test để xác nhận nó qua**

Run: `cd apps/api && npx jest src/health --verbose`
Expected: PASS

- [ ] **Step 8: Tạo migration đầu tiên và xác nhận database dựng được**

```bash
docker compose up -d db
cd apps/api && npx prisma migrate dev --name khoi_tao
```
Expected: migration tạo thành công, `npx prisma studio` mở được và thấy đủ 6 bảng.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: dựng khung dự án NestJS, schema Prisma và Docker Compose"
```

---

## Task 2: Đăng nhập, JWT và bộ lọc lỗi thống nhất

**Files:**
- Create: `apps/api/src/common/filters/http-exception.filter.ts`
- Create: `apps/api/src/common/decorators/roles.decorator.ts`, `apps/api/src/common/decorators/current-user.decorator.ts`
- Create: `apps/api/src/common/guards/jwt-auth.guard.ts`, `apps/api/src/common/guards/roles.guard.ts`
- Create: `apps/api/src/auth/auth.module.ts`, `auth.service.ts`, `auth.controller.ts`, `dto/login.dto.ts`
- Modify: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
- Test: `apps/api/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (Task 1).
- Produces:
  - `type AuthUser = { id: string; username: string; role: Role; orgUnitId: string; fullName: string }`
  - `AuthService.validateUser(username: string, password: string): Promise<AuthUser>`
  - `AuthService.issueTokens(user: AuthUser): { accessToken: string; refreshToken: string }`
  - Decorator `@CurrentUser()` inject `AuthUser` vào tham số controller.
  - Decorator `@Roles(...roles: Role[])` đặt trên controller hoặc method.
  - `JwtAuthGuard`, `RolesGuard` đăng ký toàn cục.

- [ ] **Step 1: Cài phụ thuộc**

```bash
cd apps/api && npm i @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm i -D @types/passport-jwt @types/bcrypt
```

- [ ] **Step 2: Viết test cho AuthService**

`apps/api/src/auth/auth.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

const nguoiDung = {
  id: 'u1',
  username: 'admin',
  fullName: 'Quản trị viên',
  role: 'IT_ADMIN',
  orgUnitId: 'o1',
  isActive: true,
  passwordHash: bcrypt.hashSync('MatKhau@123', 10),
};

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      providers: [AuthService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('trả về thông tin người dùng khi mật khẩu đúng', async () => {
    prisma.user.findUnique.mockResolvedValue(nguoiDung);
    const result = await service.validateUser('admin', 'MatKhau@123');
    expect(result).toEqual({
      id: 'u1',
      username: 'admin',
      fullName: 'Quản trị viên',
      role: 'IT_ADMIN',
      orgUnitId: 'o1',
    });
  });

  it('từ chối khi mật khẩu sai', async () => {
    prisma.user.findUnique.mockResolvedValue(nguoiDung);
    await expect(service.validateUser('admin', 'SaiMatKhau')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('từ chối khi tài khoản đã bị khóa', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...nguoiDung, isActive: false });
    await expect(service.validateUser('admin', 'MatKhau@123')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('báo lỗi giống nhau khi sai tên đăng nhập và khi sai mật khẩu', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const loiKhongCoTaiKhoan = await service
      .validateUser('khongton', 'MatKhau@123')
      .catch((e) => e.message);
    prisma.user.findUnique.mockResolvedValue(nguoiDung);
    const loiSaiMatKhau = await service
      .validateUser('admin', 'SaiMatKhau')
      .catch((e) => e.message);
    expect(loiKhongCoTaiKhoan).toBe(loiSaiMatKhau);
  });
});
```

Test cuối cùng có chủ đích: nếu hai thông điệp lỗi khác nhau, kẻ tấn công dò được tên đăng nhập nào tồn tại trong hệ thống.

- [ ] **Step 3: Chạy test để xác nhận nó thất bại**

Run: `cd apps/api && npx jest src/auth --verbose`
Expected: FAIL — `Cannot find module './auth.service'`

- [ ] **Step 4: Viết AuthService**

`apps/api/src/auth/auth.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  orgUnitId: string;
};

const LOI_DANG_NHAP = 'Tên đăng nhập hoặc mật khẩu không đúng';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException(LOI_DANG_NHAP);
    }
    const khop = await bcrypt.compare(password, user.passwordHash);
    if (!khop) {
      throw new UnauthorizedException(LOI_DANG_NHAP);
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      orgUnitId: user.orgUnitId,
    };
  }

  issueTokens(user: AuthUser) {
    const payload = { sub: user.id, role: user.role, orgUnitId: user.orgUnitId };
    return {
      accessToken: this.jwt.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      }),
      refreshToken: this.jwt.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    };
  }

  async findById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive) return null;
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      orgUnitId: user.orgUnitId,
    };
  }
}
```

- [ ] **Step 5: Chạy test để xác nhận nó qua**

Run: `cd apps/api && npx jest src/auth --verbose`
Expected: PASS — 4 test qua.

- [ ] **Step 6: Viết controller, guard và decorator**

`apps/api/src/auth/auth.controller.ts`:

```typescript
import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService, AuthUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const COOKIE_CHUNG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateUser(dto.username, dto.password);
    const { accessToken, refreshToken } = this.auth.issueTokens(user);
    res.cookie('access_token', accessToken, {
      ...COOKIE_CHUNG,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_CHUNG,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', COOKIE_CHUNG);
    res.clearCookie('refresh_token', COOKIE_CHUNG);
    return { message: 'Đã đăng xuất' };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
```

`apps/api/src/auth/dto/login.dto.ts`:

```typescript
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên đăng nhập' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  password: string;
}
```

`apps/api/src/common/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
```

`apps/api/src/common/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../../auth/auth.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);
```

`apps/api/src/common/guards/jwt-auth.guard.ts` — đọc token từ cookie, xác thực, nạp người dùng vào `request.user`; nếu access token hết hạn nhưng refresh token còn hiệu lực thì cấp access token mới và ghi lại cookie:

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../auth/auth.service';
import { PUBLIC_KEY } from '../decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    let payload = this.verify(req.cookies?.access_token, process.env.JWT_SECRET);

    if (!payload) {
      payload = this.verify(
        req.cookies?.refresh_token,
        process.env.JWT_REFRESH_SECRET,
      );
      if (!payload) {
        throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
      }
      const user = await this.auth.findById(payload.sub);
      if (!user) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
      const { accessToken } = this.auth.issueTokens(user);
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60 * 1000,
      });
    }

    const user = await this.auth.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    req.user = user;
    return true;
  }

  private verify(token: string | undefined, secret: string | undefined) {
    if (!token) return null;
    try {
      return this.jwt.verify(token, { secret });
    } catch {
      return null;
    }
  }
}
```

`apps/api/src/common/guards/roles.guard.ts`:

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const user = ctx.switchToHttp().getRequest().user;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }
    return true;
  }
}
```

- [ ] **Step 7: Viết bộ lọc lỗi thống nhất**

`apps/api/src/common/filters/http-exception.filter.ts`:

```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as any;
      return res.status(status).json({
        statusCode: status,
        message: Array.isArray(body?.message)
          ? 'Dữ liệu nhập vào không hợp lệ'
          : (body?.message ?? exception.message),
        code: body?.code ?? null,
        details: Array.isArray(body?.message) ? body.message : null,
      });
    }

    const traceId = randomUUID().slice(0, 8);
    this.logger.error(`[${traceId}] ${String(exception)}`, (exception as Error)?.stack);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      message: `Đã xảy ra lỗi hệ thống. Vui lòng báo bộ phận IT kèm mã lỗi ${traceId}`,
      code: 'INTERNAL_ERROR',
      details: null,
    });
  }
}
```

Đăng ký trong `main.ts`: `app.useGlobalFilters(new AllExceptionsFilter());` và đăng ký hai guard toàn cục trong `app.module.ts` bằng `APP_GUARD` (JwtAuthGuard trước, RolesGuard sau).

- [ ] **Step 8: Kiểm thử thủ công luồng đăng nhập**

```bash
docker compose up -d db && cd apps/api && npm run start:dev
curl -i -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"MatKhau@123"}'
```
Expected: 200, header `Set-Cookie` chứa `access_token` có `HttpOnly`, và `refresh_token`. (Tài khoản admin được tạo ở Task 17 bằng seed; ở bước này tạo tạm bằng `npx prisma studio` hoặc bỏ qua và xác nhận trả về 401 với thông điệp tiếng Việt.)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: đăng nhập JWT qua cookie httpOnly và bộ lọc lỗi thống nhất"
```

---

## Task 3: Cây đơn vị

**Files:**
- Create: `apps/api/src/org-units/org-units.module.ts`, `org-units.service.ts`, `org-units.controller.ts`
- Create: `apps/api/src/org-units/dto/create-org-unit.dto.ts`, `dto/update-org-unit.dto.ts`
- Test: `apps/api/src/org-units/org-units.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (Task 1), `AuthUser`, `@Roles`, `@CurrentUser` (Task 2).
- Produces:
  - `OrgUnitsService.getDescendantIds(orgUnitId: string): Promise<string[]>` — trả về id của chính đơn vị đó **và** toàn bộ đơn vị con ở mọi cấp. Đây là hàm mà `buildScopeFilter` ở Task 4 dựa vào.
  - `OrgUnitsService.findTree(): Promise<OrgUnitNode[]>` với `type OrgUnitNode = { id: string; code: string; name: string; type: OrgUnitType; isActive: boolean; children: OrgUnitNode[] }`.

- [ ] **Step 1: Viết test cho getDescendantIds và findTree**

`apps/api/src/org-units/org-units.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrgUnitsService } from './org-units.service';
import { PrismaService } from '../prisma/prisma.service';

// Cây: co-quan -> [phong-a -> [to-a1], chi-nhanh-b]
const danhSach = [
  { id: 'co-quan', code: 'CQ', name: 'Cơ quan', type: 'CO_QUAN', parentId: null, isActive: true },
  { id: 'phong-a', code: 'PA', name: 'Phòng A', type: 'PHONG_BAN', parentId: 'co-quan', isActive: true },
  { id: 'to-a1', code: 'TA1', name: 'Tổ A1', type: 'PHONG_BAN', parentId: 'phong-a', isActive: true },
  { id: 'chi-nhanh-b', code: 'CNB', name: 'Chi nhánh B', type: 'CHI_NHANH', parentId: 'co-quan', isActive: true },
];

describe('OrgUnitsService', () => {
  let service: OrgUnitsService;
  const prisma = { orgUnit: { findMany: jest.fn(), findUnique: jest.fn() } };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.orgUnit.findMany.mockResolvedValue(danhSach);
    const moduleRef = await Test.createTestingModule({
      providers: [OrgUnitsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(OrgUnitsService);
  });

  it('trả về chính đơn vị đó khi không có đơn vị con', async () => {
    expect(await service.getDescendantIds('to-a1')).toEqual(['to-a1']);
  });

  it('trả về đơn vị con ở mọi cấp', async () => {
    const ids = await service.getDescendantIds('phong-a');
    expect(ids.sort()).toEqual(['phong-a', 'to-a1']);
  });

  it('đơn vị gốc bao trùm toàn bộ cây', async () => {
    const ids = await service.getDescendantIds('co-quan');
    expect(ids.sort()).toEqual(['chi-nhanh-b', 'co-quan', 'phong-a', 'to-a1']);
  });

  it('không lấy nhầm đơn vị anh em', async () => {
    const ids = await service.getDescendantIds('chi-nhanh-b');
    expect(ids).not.toContain('phong-a');
  });

  it('dựng được cây lồng nhau từ danh sách phẳng', async () => {
    const tree = await service.findTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('co-quan');
    expect(tree[0].children.map((c) => c.id).sort()).toEqual([
      'chi-nhanh-b',
      'phong-a',
    ]);
    const phongA = tree[0].children.find((c) => c.id === 'phong-a');
    expect(phongA?.children[0].id).toBe('to-a1');
  });

  it('từ chối đặt đơn vị làm cha của chính nó', async () => {
    await expect(
      service.update('phong-a', { parentId: 'phong-a' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('từ chối tạo vòng lặp khi chuyển đơn vị cha xuống dưới đơn vị con của nó', async () => {
    await expect(
      service.update('phong-a', { parentId: 'to-a1' }),
    ).rejects.toThrow(BadRequestException);
  });
});
```

Hai test cuối quan trọng: một vòng lặp trong cây đơn vị sẽ làm `getDescendantIds` chạy vô tận và treo toàn bộ API.

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `cd apps/api && npx jest src/org-units --verbose`
Expected: FAIL — `Cannot find module './org-units.service'`

- [ ] **Step 3: Viết OrgUnitsService**

`apps/api/src/org-units/org-units.service.ts`:

```typescript
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrgUnitType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';

export type OrgUnitNode = {
  id: string;
  code: string;
  name: string;
  type: OrgUnitType;
  isActive: boolean;
  children: OrgUnitNode[];
};

@Injectable()
export class OrgUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadAll() {
    return this.prisma.orgUnit.findMany();
  }

  async getDescendantIds(orgUnitId: string): Promise<string[]> {
    const all = await this.loadAll();
    const conTheoCha = new Map<string, string[]>();
    for (const u of all) {
      if (!u.parentId) continue;
      const ds = conTheoCha.get(u.parentId) ?? [];
      ds.push(u.id);
      conTheoCha.set(u.parentId, ds);
    }
    const ketQua: string[] = [];
    const daDuyet = new Set<string>();
    const hangDoi = [orgUnitId];
    while (hangDoi.length > 0) {
      const id = hangDoi.shift()!;
      if (daDuyet.has(id)) continue;
      daDuyet.add(id);
      ketQua.push(id);
      hangDoi.push(...(conTheoCha.get(id) ?? []));
    }
    return ketQua;
  }

  async findTree(): Promise<OrgUnitNode[]> {
    const all = await this.loadAll();
    const theoId = new Map<string, OrgUnitNode>();
    for (const u of all) {
      theoId.set(u.id, {
        id: u.id,
        code: u.code,
        name: u.name,
        type: u.type,
        isActive: u.isActive,
        children: [],
      });
    }
    const goc: OrgUnitNode[] = [];
    for (const u of all) {
      const node = theoId.get(u.id)!;
      if (u.parentId && theoId.has(u.parentId)) {
        theoId.get(u.parentId)!.children.push(node);
      } else {
        goc.push(node);
      }
    }
    return goc;
  }

  async findAll() {
    return this.prisma.orgUnit.findMany({ orderBy: { code: 'asc' } });
  }

  async create(dto: CreateOrgUnitDto) {
    return this.prisma.orgUnit.create({ data: dto });
  }

  async update(id: string, dto: UpdateOrgUnitDto) {
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException(
          'Không thể đặt đơn vị làm đơn vị cha của chính nó',
        );
      }
      const conChau = await this.getDescendantIds(id);
      if (conChau.includes(dto.parentId)) {
        throw new BadRequestException(
          'Không thể chuyển đơn vị xuống dưới một đơn vị con của nó',
        );
      }
    }
    return this.prisma.orgUnit.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const conChau = await this.getDescendantIds(id);
    if (conChau.length > 1) {
      throw new BadRequestException(
        'Không thể xóa đơn vị đang có đơn vị trực thuộc',
      );
    }
    const soTaiSan = await this.prisma.asset.count({ where: { orgUnitId: id } });
    if (soTaiSan > 0) {
      throw new BadRequestException(
        `Không thể xóa đơn vị đang có ${soTaiSan} tài sản`,
      );
    }
    return this.prisma.orgUnit.delete({ where: { id } });
  }

  async findOne(id: string) {
    const unit = await this.prisma.orgUnit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException('Không tìm thấy đơn vị');
    return unit;
  }
}
```

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `cd apps/api && npx jest src/org-units --verbose`
Expected: PASS — 7 test qua.

- [ ] **Step 5: Viết DTO và controller**

`apps/api/src/org-units/dto/create-org-unit.dto.ts`:

```typescript
import { OrgUnitType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrgUnitDto {
  @IsString() @IsNotEmpty({ message: 'Vui lòng nhập mã đơn vị' })
  code: string;

  @IsString() @IsNotEmpty({ message: 'Vui lòng nhập tên đơn vị' })
  name: string;

  @IsEnum(OrgUnitType, { message: 'Loại đơn vị không hợp lệ' })
  type: OrgUnitType;

  @IsOptional() @IsUUID()
  parentId?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
```

`apps/api/src/org-units/dto/update-org-unit.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateOrgUnitDto } from './create-org-unit.dto';

export class UpdateOrgUnitDto extends PartialType(CreateOrgUnitDto) {}
```

`apps/api/src/org-units/org-units.controller.ts` — mọi thao tác ghi chỉ dành cho `IT_ADMIN`; đọc thì mọi vai trò đều được vì cần dùng cho bộ lọc trên giao diện:

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { OrgUnitsService } from './org-units.service';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';

@Controller('org-units')
export class OrgUnitsController {
  constructor(private readonly service: OrgUnitsService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get('tree') findTree() { return this.service.findTree(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Roles(Role.IT_ADMIN)
  @Post() create(@Body() dto: CreateOrgUnitDto) { return this.service.create(dto); }

  @Roles(Role.IT_ADMIN)
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateOrgUnitDto) {
    return this.service.update(id, dto);
  }

  @Roles(Role.IT_ADMIN)
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
```

`apps/api/src/org-units/org-units.module.ts` export `OrgUnitsService` để Task 4 và các module khác dùng lại.

- [ ] **Step 6: Commit**

```bash
cd apps/api && npx jest src/org-units && cd ../.. && git add -A
git commit -m "feat: quản lý cây đơn vị và tra cứu đơn vị trực thuộc"
```

---

## Task 4: Phân quyền phạm vi dữ liệu — buildScopeFilter

Đây là task quan trọng nhất về mặt an toàn dữ liệu trong toàn bộ giai đoạn 1. Mọi truy vấn tài sản, nhân sự, và về sau là ticket, đều đi qua hàm này.

**Files:**
- Create: `apps/api/src/common/scope/scope.service.ts`
- Test: `apps/api/src/common/scope/scope.service.spec.ts`

**Interfaces:**
- Consumes: `OrgUnitsService.getDescendantIds` (Task 3), `AuthUser` (Task 2).
- Produces:
  - `ScopeService.buildScopeFilter(user: AuthUser): Promise<{ orgUnitId?: { in: string[] } }>` — trả về mảnh điều kiện `where` của Prisma. `IT_ADMIN` và `LEADER` nhận về `{}` (không giới hạn); `UNIT_ADMIN` nhận về `{ orgUnitId: { in: [...] } }`.
  - `ScopeService.assertCanWrite(user: AuthUser, orgUnitId: string): Promise<void>` — ném `NotFoundException` nếu đơn vị nằm ngoài phạm vi ghi của người dùng, `ForbiddenException` nếu vai trò không được ghi.
  - `ScopeService.canWriteRole(role: Role): boolean` — `LEADER` trả về `false`.

- [ ] **Step 1: Viết test**

`apps/api/src/common/scope/scope.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ScopeService } from './scope.service';
import { OrgUnitsService } from '../../org-units/org-units.service';
import type { AuthUser } from '../../auth/auth.service';

const taoNguoiDung = (role: Role, orgUnitId: string): AuthUser => ({
  id: 'u1', username: 'u', fullName: 'Người dùng', role, orgUnitId,
});

describe('ScopeService', () => {
  let service: ScopeService;
  const orgUnits = { getDescendantIds: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ScopeService,
        { provide: OrgUnitsService, useValue: orgUnits },
      ],
    }).compile();
    service = moduleRef.get(ScopeService);
  });

  it('IT_ADMIN không bị giới hạn phạm vi', async () => {
    const filter = await service.buildScopeFilter(taoNguoiDung(Role.IT_ADMIN, 'phong-a'));
    expect(filter).toEqual({});
    expect(orgUnits.getDescendantIds).not.toHaveBeenCalled();
  });

  it('LEADER đọc được toàn cơ quan', async () => {
    const filter = await service.buildScopeFilter(taoNguoiDung(Role.LEADER, 'phong-a'));
    expect(filter).toEqual({});
  });

  it('UNIT_ADMIN chỉ thấy đơn vị mình và đơn vị con', async () => {
    orgUnits.getDescendantIds.mockResolvedValue(['phong-a', 'to-a1']);
    const filter = await service.buildScopeFilter(taoNguoiDung(Role.UNIT_ADMIN, 'phong-a'));
    expect(filter).toEqual({ orgUnitId: { in: ['phong-a', 'to-a1'] } });
  });

  it('UNIT_ADMIN của đơn vị A không thấy đơn vị B', async () => {
    orgUnits.getDescendantIds.mockResolvedValue(['phong-a', 'to-a1']);
    const filter = await service.buildScopeFilter(taoNguoiDung(Role.UNIT_ADMIN, 'phong-a'));
    expect(filter.orgUnitId?.in).not.toContain('chi-nhanh-b');
  });

  it('LEADER không được phép ghi', () => {
    expect(service.canWriteRole(Role.LEADER)).toBe(false);
    expect(service.canWriteRole(Role.UNIT_ADMIN)).toBe(true);
    expect(service.canWriteRole(Role.IT_ADMIN)).toBe(true);
  });

  it('assertCanWrite từ chối LEADER bằng lỗi 403', async () => {
    await expect(
      service.assertCanWrite(taoNguoiDung(Role.LEADER, 'phong-a'), 'phong-a'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('assertCanWrite trả 404 khi UNIT_ADMIN ghi vào đơn vị ngoài phạm vi', async () => {
    orgUnits.getDescendantIds.mockResolvedValue(['phong-a', 'to-a1']);
    await expect(
      service.assertCanWrite(taoNguoiDung(Role.UNIT_ADMIN, 'phong-a'), 'chi-nhanh-b'),
    ).rejects.toThrow(NotFoundException);
  });

  it('assertCanWrite cho phép UNIT_ADMIN ghi vào đơn vị con', async () => {
    orgUnits.getDescendantIds.mockResolvedValue(['phong-a', 'to-a1']);
    await expect(
      service.assertCanWrite(taoNguoiDung(Role.UNIT_ADMIN, 'phong-a'), 'to-a1'),
    ).resolves.toBeUndefined();
  });

  it('assertCanWrite cho phép IT_ADMIN ghi vào bất kỳ đơn vị nào', async () => {
    await expect(
      service.assertCanWrite(taoNguoiDung(Role.IT_ADMIN, 'phong-a'), 'chi-nhanh-b'),
    ).resolves.toBeUndefined();
  });
});
```

Lưu ý test thứ bảy: ghi vào đơn vị ngoài phạm vi phải trả **404 chứ không phải 403**, đúng theo ràng buộc toàn cục — 403 sẽ vô tình xác nhận rằng đơn vị đó có tồn tại.

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `cd apps/api && npx jest src/common/scope --verbose`
Expected: FAIL — `Cannot find module './scope.service'`

- [ ] **Step 3: Viết ScopeService**

`apps/api/src/common/scope/scope.service.ts`:

```typescript
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { OrgUnitsService } from '../../org-units/org-units.service';
import type { AuthUser } from '../../auth/auth.service';

export type ScopeFilter = { orgUnitId?: { in: string[] } };

@Injectable()
export class ScopeService {
  constructor(private readonly orgUnits: OrgUnitsService) {}

  canWriteRole(role: Role): boolean {
    return role !== Role.LEADER;
  }

  async buildScopeFilter(user: AuthUser): Promise<ScopeFilter> {
    if (user.role === Role.IT_ADMIN || user.role === Role.LEADER) {
      return {};
    }
    const ids = await this.orgUnits.getDescendantIds(user.orgUnitId);
    return { orgUnitId: { in: ids } };
  }

  async assertCanWrite(user: AuthUser, orgUnitId: string): Promise<void> {
    if (!this.canWriteRole(user.role)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }
    if (user.role === Role.IT_ADMIN) return;
    const ids = await this.orgUnits.getDescendantIds(user.orgUnitId);
    if (!ids.includes(orgUnitId)) {
      throw new NotFoundException('Không tìm thấy đơn vị');
    }
  }
}
```

Đăng ký `ScopeService` trong một `ScopeModule` có `@Global()`, import `OrgUnitsModule`, và export `ScopeService`.

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `cd apps/api && npx jest src/common/scope --verbose`
Expected: PASS — 9 test qua.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: lớp phân quyền phạm vi dữ liệu theo cây đơn vị"
```

---

## Task 5: Danh mục nhân sự và bộ đọc Excel dùng chung

**Files:**
- Create: `apps/api/src/common/excel/excel.util.ts`
- Create: `apps/api/src/employees/employees.module.ts`, `employees.service.ts`, `employees.controller.ts`
- Create: `apps/api/src/employees/dto/create-employee.dto.ts`, `dto/update-employee.dto.ts`
- Test: `apps/api/src/common/excel/excel.util.spec.ts`, `apps/api/src/employees/employees.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `ScopeService` (Task 4), `OrgUnitsService` (Task 3).
- Produces:
  - `readSheetAsync(buffer: Buffer, columns: ColumnMap): Promise<RawRow[]>` với `type ColumnMap = Record<string, string>` ánh xạ tiêu đề cột tiếng Việt sang tên trường, và `type RawRow = { rowNumber: number; values: Record<string, string | null> }`. Hàm bất đồng bộ vì ExcelJS chỉ nạp buffer bằng Promise.
  - `writeSheet(rows: object[], headers: { key: string; label: string; width?: number }[]): Promise<Buffer>`.
  - `type ImportError = { rowNumber: number; field: string | null; message: string }`
  - `type ImportPreview<T> = { validRows: T[]; errors: ImportError[]; totalRows: number }`
  - `EmployeesService.buildPreview(rows: RawRow[], user: AuthUser): Promise<ImportPreview<EmployeeImportRow>>` với `type EmployeeImportRow = { code: string; fullName: string; orgUnitId: string; position: string | null; email: string | null; phone: string | null }`
  - `EmployeesService.commitImport(rows: EmployeeImportRow[], user: AuthUser): Promise<{ imported: number }>`

- [ ] **Step 1: Cài ExcelJS và viết test cho excel.util**

```bash
cd apps/api && npm i exceljs && npm i -D @types/multer
```

`apps/api/src/common/excel/excel.util.spec.ts`:

```typescript
import * as ExcelJS from 'exceljs';
import { readSheetAsync, writeSheet } from './excel.util';

async function taoFile(rows: string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  rows.forEach((r) => ws.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const cot = { 'Mã cán bộ': 'code', 'Họ và tên': 'fullName', 'Đơn vị': 'orgUnitCode' };

describe('excel.util', () => {
  it('đọc được các dòng theo ánh xạ cột', async () => {
    const buf = await taoFile([
      ['Mã cán bộ', 'Họ và tên', 'Đơn vị'],
      ['CB001', 'Nguyễn Văn A', 'PA'],
      ['CB002', 'Trần Thị B', 'CNB'],
    ]);
    const rows = await readSheetAsync(buf, cot);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      rowNumber: 2,
      values: { code: 'CB001', fullName: 'Nguyễn Văn A', orgUnitCode: 'PA' },
    });
    expect(rows[1].rowNumber).toBe(3);
  });

  it('bỏ qua dòng trống hoàn toàn', async () => {
    const buf = await taoFile([
      ['Mã cán bộ', 'Họ và tên', 'Đơn vị'],
      ['CB001', 'Nguyễn Văn A', 'PA'],
      ['', '', ''],
    ]);
    expect(await readSheetAsync(buf, cot)).toHaveLength(1);
  });

  it('trả về null cho ô trống và cắt khoảng trắng thừa', async () => {
    const buf = await taoFile([
      ['Mã cán bộ', 'Họ và tên', 'Đơn vị'],
      ['  CB001  ', 'Nguyễn Văn A', ''],
    ]);
    expect((await readSheetAsync(buf, cot))[0].values).toEqual({
      code: 'CB001', fullName: 'Nguyễn Văn A', orgUnitCode: null,
    });
  });

  it('báo lỗi khi thiếu cột bắt buộc trong file', async () => {
    const buf = await taoFile([['Mã cán bộ', 'Họ và tên'], ['CB001', 'A']]);
    await expect(readSheetAsync(buf, cot)).rejects.toThrow(/Đơn vị/);
  });

  it('ghi được workbook đọc lại đúng nội dung', async () => {
    const buf = await writeSheet(
      [{ code: 'CB001', fullName: 'Nguyễn Văn A' }],
      [{ key: 'code', label: 'Mã cán bộ' }, { key: 'fullName', label: 'Họ và tên' }],
    );
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.getWorksheet(1)!;
    expect(ws.getRow(1).getCell(1).value).toBe('Mã cán bộ');
    expect(ws.getRow(2).getCell(2).value).toBe('Nguyễn Văn A');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `cd apps/api && npx jest src/common/excel --verbose`
Expected: FAIL — `Cannot find module './excel.util'`

- [ ] **Step 3: Viết excel.util**

`apps/api/src/common/excel/excel.util.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export type ColumnMap = Record<string, string>;
export type RawRow = { rowNumber: number; values: Record<string, string | null> };
export type ImportError = { rowNumber: number; field: string | null; message: string };
export type ImportPreview<T> = { validRows: T[]; errors: ImportError[]; totalRows: number };

function doiSangChuoi(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && 'text' in (value as any)) {
    return String((value as any).text).trim() || null;
  }
  const s = String(value).trim();
  return s === '' ? null : s;
}

export async function readSheetAsync(
  buffer: Buffer,
  columns: ColumnMap,
): Promise<RawRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.getWorksheet(1);
  if (!ws) throw new BadRequestException('File Excel không có dữ liệu');
  return readSheetFromWorksheet(ws, columns);
}

function readSheetFromWorksheet(ws: ExcelJS.Worksheet, columns: ColumnMap): RawRow[] {
  const viTriCot = new Map<string, number>();
  ws.getRow(1).eachCell((cell, colNumber) => {
    const label = doiSangChuoi(cell.value);
    if (label && columns[label]) viTriCot.set(columns[label], colNumber);
  });
  const thieu = Object.entries(columns)
    .filter(([, field]) => !viTriCot.has(field))
    .map(([label]) => label);
  if (thieu.length > 0) {
    throw new BadRequestException(`File thiếu các cột bắt buộc: ${thieu.join(', ')}`);
  }
  const rows: RawRow[] = [];
  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const values: Record<string, string | null> = {};
    for (const [field, colNumber] of viTriCot) {
      values[field] = doiSangChuoi(row.getCell(colNumber).value);
    }
    if (!Object.values(values).every((v) => v === null)) {
      rows.push({ rowNumber: i, values });
    }
  }
  return rows;
}

export async function writeSheet(
  rows: Record<string, unknown>[],
  headers: { key: string; label: string; width?: number }[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Dữ liệu');
  ws.columns = headers.map((h) => ({
    header: h.label,
    key: h.key,
    width: h.width ?? 20,
  }));
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
```

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `cd apps/api && npx jest src/common/excel --verbose`
Expected: PASS — 5 test qua.

- [ ] **Step 5: Viết test cho EmployeesService**

`apps/api/src/employees/employees.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { EmployeesService } from './employees.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import type { AuthUser } from '../auth/auth.service';

const adminDonVi: AuthUser = {
  id: 'u1', username: 'pa', fullName: 'Admin Phòng A',
  role: Role.UNIT_ADMIN, orgUnitId: 'phong-a',
};

describe('EmployeesService', () => {
  let service: EmployeesService;
  const prisma = {
    employee: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), createMany: jest.fn() },
    orgUnit: { findMany: jest.fn() },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const scope = { buildScopeFilter: jest.fn(), assertCanWrite: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ScopeService, useValue: scope },
      ],
    }).compile();
    service = moduleRef.get(EmployeesService);
  });

  it('danh sách nhân sự luôn áp dụng bộ lọc phạm vi', async () => {
    scope.buildScopeFilter.mockResolvedValue({ orgUnitId: { in: ['phong-a'] } });
    await service.findAll(adminDonVi, {});
    expect(scope.buildScopeFilter).toHaveBeenCalledWith(adminDonVi);
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orgUnitId: { in: ['phong-a'] } }),
      }),
    );
  });

  it('xem trước nhập liệu báo lỗi thiếu họ tên kèm số dòng', async () => {
    prisma.orgUnit.findMany.mockResolvedValue([{ id: 'pa-id', code: 'PA' }]);
    prisma.employee.findMany.mockResolvedValue([]);
    const rows = [
      { rowNumber: 2, values: { code: 'CB001', fullName: null, orgUnitCode: 'PA', position: null, email: null, phone: null } },
    ];
    const kq = await service.buildPreview(rows as any, adminDonVi);
    expect(kq.validRows).toHaveLength(0);
    expect(kq.errors).toEqual([
      { rowNumber: 2, field: 'fullName', message: 'Thiếu họ và tên' },
    ]);
  });

  it('xem trước báo lỗi khi mã đơn vị không tồn tại', async () => {
    prisma.orgUnit.findMany.mockResolvedValue([{ id: 'pa-id', code: 'PA' }]);
    prisma.employee.findMany.mockResolvedValue([]);
    const rows = [
      { rowNumber: 2, values: { code: 'CB001', fullName: 'Nguyễn Văn A', orgUnitCode: 'KHONG_CO', position: null, email: null, phone: null } },
    ];
    const kq = await service.buildPreview(rows as any, adminDonVi);
    expect(kq.errors[0]).toEqual({
      rowNumber: 2, field: 'orgUnitCode',
      message: 'Không tìm thấy đơn vị có mã KHONG_CO',
    });
  });

  it('xem trước báo lỗi khi mã cán bộ đã tồn tại trong hệ thống', async () => {
    prisma.orgUnit.findMany.mockResolvedValue([{ id: 'pa-id', code: 'PA' }]);
    prisma.employee.findMany.mockResolvedValue([{ code: 'CB001' }]);
    const rows = [
      { rowNumber: 2, values: { code: 'CB001', fullName: 'Nguyễn Văn A', orgUnitCode: 'PA', position: null, email: null, phone: null } },
    ];
    const kq = await service.buildPreview(rows as any, adminDonVi);
    expect(kq.errors[0].message).toBe('Mã cán bộ CB001 đã tồn tại');
  });

  it('xem trước báo lỗi khi mã cán bộ trùng nhau ngay trong file', async () => {
    prisma.orgUnit.findMany.mockResolvedValue([{ id: 'pa-id', code: 'PA' }]);
    prisma.employee.findMany.mockResolvedValue([]);
    const rows = [
      { rowNumber: 2, values: { code: 'CB001', fullName: 'A', orgUnitCode: 'PA', position: null, email: null, phone: null } },
      { rowNumber: 3, values: { code: 'CB001', fullName: 'B', orgUnitCode: 'PA', position: null, email: null, phone: null } },
    ];
    const kq = await service.buildPreview(rows as any, adminDonVi);
    expect(kq.validRows).toHaveLength(1);
    expect(kq.errors[0]).toEqual({
      rowNumber: 3, field: 'code', message: 'Mã cán bộ CB001 bị trùng trong file',
    });
  });

  it('dòng hợp lệ được chuyển thành dữ liệu ghi kèm id đơn vị', async () => {
    prisma.orgUnit.findMany.mockResolvedValue([{ id: 'pa-id', code: 'PA' }]);
    prisma.employee.findMany.mockResolvedValue([]);
    const rows = [
      { rowNumber: 2, values: { code: 'CB001', fullName: 'Nguyễn Văn A', orgUnitCode: 'PA', position: 'Chuyên viên', email: null, phone: null } },
    ];
    const kq = await service.buildPreview(rows as any, adminDonVi);
    expect(kq.validRows[0]).toEqual({
      code: 'CB001', fullName: 'Nguyễn Văn A', orgUnitId: 'pa-id',
      position: 'Chuyên viên', email: null, phone: null,
    });
    expect(kq.totalRows).toBe(1);
  });
});
```

- [ ] **Step 6: Chạy test để xác nhận nó thất bại**

Run: `cd apps/api && npx jest src/employees --verbose`
Expected: FAIL — `Cannot find module './employees.service'`

- [ ] **Step 7: Viết EmployeesService**

`apps/api/src/employees/employees.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import type { AuthUser } from '../auth/auth.service';
import type { ImportError, ImportPreview, RawRow } from '../common/excel/excel.util';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

export const COT_NHAN_SU = {
  'Mã cán bộ': 'code',
  'Họ và tên': 'fullName',
  'Đơn vị': 'orgUnitCode',
  'Chức vụ': 'position',
  'Email': 'email',
  'Điện thoại': 'phone',
};

type EmployeeImportRow = {
  code: string; fullName: string; orgUnitId: string;
  position: string | null; email: string | null; phone: string | null;
};

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async findAll(user: AuthUser, query: { search?: string; orgUnitId?: string }) {
    const filter = await this.scope.buildScopeFilter(user);
    return this.prisma.employee.findMany({
      where: {
        ...filter,
        ...(query.orgUnitId ? { orgUnitId: query.orgUnitId } : {}),
        ...(query.search
          ? {
              OR: [
                { fullName: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { orgUnit: { select: { id: true, name: true, code: true } } },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const filter = await this.scope.buildScopeFilter(user);
    const [nhanSu] = await this.prisma.employee.findMany({
      where: { id, ...filter },
      include: {
        orgUnit: true,
        assets: {
          include: { assetType: { select: { name: true } } },
          orderBy: { expiryDate: 'asc' },
        },
      },
      take: 1,
    });
    if (!nhanSu) throw new NotFoundException('Không tìm thấy cán bộ');
    return nhanSu;
  }

  async create(dto: CreateEmployeeDto, user: AuthUser) {
    await this.scope.assertCanWrite(user, dto.orgUnitId);
    return this.prisma.employee.create({ data: dto });
  }

  async update(id: string, dto: UpdateEmployeeDto, user: AuthUser) {
    const hienTai = await this.findOne(id, user);
    await this.scope.assertCanWrite(user, dto.orgUnitId ?? hienTai.orgUnitId);
    return this.prisma.employee.update({ where: { id }, data: dto });
  }

  async buildPreview(
    rows: RawRow[],
    user: AuthUser,
  ): Promise<ImportPreview<EmployeeImportRow>> {
    const donVi = await this.prisma.orgUnit.findMany({
      select: { id: true, code: true },
    });
    const donViTheoMa = new Map(donVi.map((d) => [d.code, d.id]));
    const maDaCo = new Set(
      (await this.prisma.employee.findMany({ select: { code: true } })).map(
        (e) => e.code,
      ),
    );

    const validRows: EmployeeImportRow[] = [];
    const errors: ImportError[] = [];
    const maTrongFile = new Set<string>();

    for (const row of rows) {
      const { code, fullName, orgUnitCode, position, email, phone } = row.values;
      const loiCuaDong: ImportError[] = [];

      if (!code) loiCuaDong.push({ rowNumber: row.rowNumber, field: 'code', message: 'Thiếu mã cán bộ' });
      if (!fullName) loiCuaDong.push({ rowNumber: row.rowNumber, field: 'fullName', message: 'Thiếu họ và tên' });
      if (!orgUnitCode) {
        loiCuaDong.push({ rowNumber: row.rowNumber, field: 'orgUnitCode', message: 'Thiếu mã đơn vị' });
      } else if (!donViTheoMa.has(orgUnitCode)) {
        loiCuaDong.push({
          rowNumber: row.rowNumber, field: 'orgUnitCode',
          message: `Không tìm thấy đơn vị có mã ${orgUnitCode}`,
        });
      }
      if (code && maDaCo.has(code)) {
        loiCuaDong.push({ rowNumber: row.rowNumber, field: 'code', message: `Mã cán bộ ${code} đã tồn tại` });
      }
      if (code && maTrongFile.has(code)) {
        loiCuaDong.push({ rowNumber: row.rowNumber, field: 'code', message: `Mã cán bộ ${code} bị trùng trong file` });
      }

      if (loiCuaDong.length > 0) {
        errors.push(...loiCuaDong);
        continue;
      }
      maTrongFile.add(code!);
      validRows.push({
        code: code!, fullName: fullName!, orgUnitId: donViTheoMa.get(orgUnitCode!)!,
        position: position ?? null, email: email ?? null, phone: phone ?? null,
      });
    }

    return { validRows, errors, totalRows: rows.length };
  }

  async commitImport(rows: EmployeeImportRow[], user: AuthUser) {
    for (const row of rows) {
      await this.scope.assertCanWrite(user, row.orgUnitId);
    }
    return this.prisma.$transaction(async (tx) => {
      const kq = await tx.employee.createMany({ data: rows });
      return { imported: kq.count };
    });
  }
}
```

Ghi trong một transaction là có chủ đích: nếu dòng thứ 200 lỗi, không được để 199 dòng đầu đã nằm trong database — người dùng sẽ sửa file rồi nhập lại và sinh ra dữ liệu trùng.

- [ ] **Step 8: Chạy test để xác nhận nó qua**

Run: `cd apps/api && npx jest src/employees --verbose`
Expected: PASS — 6 test qua.

- [ ] **Step 9: Viết controller và DTO**

`apps/api/src/employees/employees.controller.ts` — endpoint nhập liệu hai bước: `POST /api/employees/import/preview` nhận file và trả về `ImportPreview`, `POST /api/employees/import/commit` nhận `validRows` đã được người dùng xác nhận:

```typescript
import {
  Body, Controller, Get, Param, Patch, Post, Query,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';
import { readSheetAsync } from '../common/excel/excel.util';
import { COT_NHAN_SU, EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: { search?: string; orgUnitId?: string }) {
    return this.service.findAll(user, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  async preview(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    const rows = await readSheetAsync(file.buffer, COT_NHAN_SU);
    return this.service.buildPreview(rows, user);
  }

  @Post('import/commit')
  commit(@Body() body: { rows: any[] }, @CurrentUser() user: AuthUser) {
    return this.service.commitImport(body.rows, user);
  }
}
```

DTO `CreateEmployeeDto` gồm `code`, `fullName` bắt buộc (`@IsNotEmpty` với thông điệp tiếng Việt), `orgUnitId` bắt buộc `@IsUUID`, các trường `position`, `email`, `phone`, `note` tùy chọn. `UpdateEmployeeDto extends PartialType(CreateEmployeeDto)`.

- [ ] **Step 10: Commit**

```bash
cd apps/api && npx jest src/employees src/common/excel && cd ../.. && git add -A
git commit -m "feat: danh mục nhân sự và bộ đọc/ghi Excel dùng chung"
```

---

## Task 6: Danh mục loại tài sản và kiểm tra trường tùy biến

**Files:**
- Create: `apps/api/src/asset-types/field-schema.ts`
- Create: `apps/api/src/asset-types/asset-types.module.ts`, `asset-types.service.ts`, `asset-types.controller.ts`
- Create: `apps/api/src/asset-types/dto/create-asset-type.dto.ts`, `dto/update-asset-type.dto.ts`
- Test: `apps/api/src/asset-types/field-schema.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `@Roles` (Task 2).
- Produces:
  - `type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox'`
  - `type FieldDef = { key: string; label: string; type: FieldType; required?: boolean; options?: string[] }`
  - `parseFieldSchema(raw: unknown): FieldDef[]` — ném `BadRequestException` nếu schema sai cấu trúc.
  - `validateAttributes(schema: FieldDef[], attributes: Record<string, unknown>): AttributeError[]` với `type AttributeError = { field: string; message: string }`.
  - `normalizeAttributes(schema: FieldDef[], attributes: Record<string, unknown>): Record<string, unknown>` — ép kiểu về đúng kiểu khai báo và loại bỏ khóa lạ không có trong schema.
  - `AssetTypesService.findOneOrFail(id: string)` trả về bản ghi `AssetType` kèm `fieldSchema` đã parse.

- [ ] **Step 1: Viết test cho field-schema**

`apps/api/src/asset-types/field-schema.spec.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';
import {
  FieldDef, normalizeAttributes, parseFieldSchema, validateAttributes,
} from './field-schema';

const schema: FieldDef[] = [
  { key: 'ca_provider', label: 'Nhà cung cấp CA', type: 'select',
    options: ['Viettel-CA', 'VNPT-CA'], required: true },
  { key: 'serial', label: 'Số serial', type: 'text', required: true },
  { key: 'so_may', label: 'Số máy được cài', type: 'number' },
  { key: 'ngay_ky', label: 'Ngày ký hợp đồng', type: 'date' },
  { key: 'vinh_vien', label: 'Bản quyền vĩnh viễn', type: 'checkbox' },
];

describe('parseFieldSchema', () => {
  it('parse được schema hợp lệ', () => {
    expect(parseFieldSchema(schema)).toEqual(schema);
  });

  it('từ chối schema không phải mảng', () => {
    expect(() => parseFieldSchema({ key: 'a' })).toThrow(BadRequestException);
  });

  it('từ chối trường thiếu key hoặc label', () => {
    expect(() => parseFieldSchema([{ label: 'Thiếu key', type: 'text' }])).toThrow(
      /key/,
    );
  });

  it('từ chối kiểu trường không được hỗ trợ', () => {
    expect(() =>
      parseFieldSchema([{ key: 'a', label: 'A', type: 'file' }]),
    ).toThrow(/file/);
  });

  it('từ chối trường select không có danh sách lựa chọn', () => {
    expect(() =>
      parseFieldSchema([{ key: 'a', label: 'A', type: 'select' }]),
    ).toThrow(/lựa chọn/);
  });

  it('từ chối hai trường trùng key', () => {
    expect(() =>
      parseFieldSchema([
        { key: 'a', label: 'A', type: 'text' },
        { key: 'a', label: 'B', type: 'text' },
      ]),
    ).toThrow(/trùng/);
  });
});

describe('validateAttributes', () => {
  it('không báo lỗi khi dữ liệu hợp lệ', () => {
    expect(
      validateAttributes(schema, {
        ca_provider: 'Viettel-CA', serial: 'ABC123', so_may: 5,
      }),
    ).toEqual([]);
  });

  it('báo lỗi khi thiếu trường bắt buộc', () => {
    expect(validateAttributes(schema, { serial: 'ABC123' })).toEqual([
      { field: 'ca_provider', message: 'Vui lòng nhập Nhà cung cấp CA' },
    ]);
  });

  it('báo lỗi khi giá trị select nằm ngoài danh sách', () => {
    const errors = validateAttributes(schema, {
      ca_provider: 'CA-Khong-Ton-Tai', serial: 'ABC123',
    });
    expect(errors).toEqual([
      { field: 'ca_provider',
        message: 'Nhà cung cấp CA phải là một trong: Viettel-CA, VNPT-CA' },
    ]);
  });

  it('báo lỗi khi trường số nhận chữ', () => {
    const errors = validateAttributes(schema, {
      ca_provider: 'VNPT-CA', serial: 'ABC', so_may: 'nhiều',
    });
    expect(errors).toEqual([
      { field: 'so_may', message: 'Số máy được cài phải là số' },
    ]);
  });

  it('báo lỗi khi trường ngày sai định dạng', () => {
    const errors = validateAttributes(schema, {
      ca_provider: 'VNPT-CA', serial: 'ABC', ngay_ky: 'hôm qua',
    });
    expect(errors).toEqual([
      { field: 'ngay_ky', message: 'Ngày ký hợp đồng không đúng định dạng ngày' },
    ]);
  });

  it('bỏ qua trường không bắt buộc để trống', () => {
    expect(
      validateAttributes(schema, {
        ca_provider: 'VNPT-CA', serial: 'ABC', so_may: null, ngay_ky: '',
      }),
    ).toEqual([]);
  });
});

describe('normalizeAttributes', () => {
  it('ép kiểu số và checkbox về đúng kiểu', () => {
    expect(
      normalizeAttributes(schema, {
        ca_provider: 'VNPT-CA', serial: 'ABC', so_may: '5', vinh_vien: 'true',
      }),
    ).toEqual({
      ca_provider: 'VNPT-CA', serial: 'ABC', so_may: 5, vinh_vien: true,
    });
  });

  it('loại bỏ khóa không có trong schema', () => {
    expect(
      normalizeAttributes(schema, { serial: 'ABC', khoa_la: 'giá trị lạ' }),
    ).toEqual({ serial: 'ABC' });
  });
});
```

Test cuối quan trọng: nếu không lọc khóa lạ, người dùng gửi thẳng JSON tùy ý vào cột `attributes` và database phình ra dữ liệu rác không ai kiểm soát được.

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `cd apps/api && npx jest src/asset-types --verbose`
Expected: FAIL — `Cannot find module './field-schema'`

- [ ] **Step 3: Viết field-schema.ts**

```typescript
import { BadRequestException } from '@nestjs/common';

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox';

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
};

export type AttributeError = { field: string; message: string };

const KIEU_HOP_LE: FieldType[] = ['text', 'textarea', 'number', 'date', 'select', 'checkbox'];

export function parseFieldSchema(raw: unknown): FieldDef[] {
  if (!Array.isArray(raw)) {
    throw new BadRequestException('Cấu hình trường phải là một danh sách');
  }
  const daThayKey = new Set<string>();
  return raw.map((item: any, i) => {
    if (!item?.key || typeof item.key !== 'string') {
      throw new BadRequestException(`Trường thứ ${i + 1} thiếu thuộc tính key`);
    }
    if (!item?.label || typeof item.label !== 'string') {
      throw new BadRequestException(`Trường "${item.key}" thiếu nhãn hiển thị (label)`);
    }
    if (!KIEU_HOP_LE.includes(item.type)) {
      throw new BadRequestException(
        `Kiểu trường "${item.type}" không được hỗ trợ. Các kiểu hợp lệ: ${KIEU_HOP_LE.join(', ')}`,
      );
    }
    if (item.type === 'select' && (!Array.isArray(item.options) || item.options.length === 0)) {
      throw new BadRequestException(
        `Trường "${item.label}" kiểu danh sách phải khai báo các lựa chọn`,
      );
    }
    if (daThayKey.has(item.key)) {
      throw new BadRequestException(`Khóa trường "${item.key}" bị trùng`);
    }
    daThayKey.add(item.key);
    return {
      key: item.key,
      label: item.label,
      type: item.type as FieldType,
      required: Boolean(item.required),
      ...(item.options ? { options: item.options as string[] } : {}),
    };
  });
}

function coGiaTri(v: unknown): boolean {
  return v !== null && v !== undefined && v !== '';
}

export function validateAttributes(
  schema: FieldDef[],
  attributes: Record<string, unknown>,
): AttributeError[] {
  const errors: AttributeError[] = [];
  for (const field of schema) {
    const value = attributes?.[field.key];
    if (!coGiaTri(value)) {
      if (field.required) {
        errors.push({ field: field.key, message: `Vui lòng nhập ${field.label}` });
      }
      continue;
    }
    if (field.type === 'number' && Number.isNaN(Number(value))) {
      errors.push({ field: field.key, message: `${field.label} phải là số` });
    }
    if (field.type === 'date' && Number.isNaN(Date.parse(String(value)))) {
      errors.push({
        field: field.key,
        message: `${field.label} không đúng định dạng ngày`,
      });
    }
    if (field.type === 'select' && !field.options!.includes(String(value))) {
      errors.push({
        field: field.key,
        message: `${field.label} phải là một trong: ${field.options!.join(', ')}`,
      });
    }
  }
  return errors;
}

export function normalizeAttributes(
  schema: FieldDef[],
  attributes: Record<string, unknown>,
): Record<string, unknown> {
  const ketQua: Record<string, unknown> = {};
  for (const field of schema) {
    const value = attributes?.[field.key];
    if (!coGiaTri(value)) continue;
    if (field.type === 'number') ketQua[field.key] = Number(value);
    else if (field.type === 'checkbox') ketQua[field.key] = value === true || value === 'true';
    else ketQua[field.key] = String(value);
  }
  return ketQua;
}
```

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `cd apps/api && npx jest src/asset-types --verbose`
Expected: PASS — 15 test qua.

- [ ] **Step 5: Viết AssetTypesService và controller**

`apps/api/src/asset-types/asset-types.service.ts`:

```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FieldDef, parseFieldSchema } from './field-schema';
import { CreateAssetTypeDto } from './dto/create-asset-type.dto';
import { UpdateAssetTypeDto } from './dto/update-asset-type.dto';

@Injectable()
export class AssetTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.assetType.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async findOneOrFail(id: string) {
    const loai = await this.prisma.assetType.findUnique({ where: { id } });
    if (!loai) throw new NotFoundException('Không tìm thấy loại tài sản');
    return { ...loai, fieldSchema: parseFieldSchema(loai.fieldSchema) as FieldDef[] };
  }

  async create(dto: CreateAssetTypeDto) {
    const schema = parseFieldSchema(dto.fieldSchema ?? []);
    return this.prisma.assetType.create({ data: { ...dto, fieldSchema: schema as any } });
  }

  async update(id: string, dto: UpdateAssetTypeDto) {
    const data: any = { ...dto };
    if (dto.fieldSchema !== undefined) {
      data.fieldSchema = parseFieldSchema(dto.fieldSchema);
    }
    return this.prisma.assetType.update({ where: { id }, data });
  }

  async remove(id: string) {
    const soTaiSan = await this.prisma.asset.count({ where: { assetTypeId: id } });
    if (soTaiSan > 0) {
      throw new BadRequestException(
        `Không thể xóa loại tài sản đang có ${soTaiSan} bản ghi. Hãy tạm ngưng sử dụng thay vì xóa.`,
      );
    }
    return this.prisma.assetType.delete({ where: { id } });
  }
}
```

Controller `asset-types`: `GET /` và `GET /:id` cho mọi vai trò (giao diện cần để dựng biểu mẫu); `POST`, `PATCH`, `DELETE` gắn `@Roles(Role.IT_ADMIN)`.

Xóa một trường khỏi `fieldSchema` **không** xóa dữ liệu tương ứng trong `attributes` của các tài sản cũ — dữ liệu vẫn nằm đó nhưng không hiển thị. Đây là hành vi có chủ đích: IT lỡ tay xóa nhầm một trường thì thêm lại là dữ liệu hiện về, không mất.

- [ ] **Step 6: Commit**

```bash
cd apps/api && npx jest src/asset-types && cd ../.. && git add -A
git commit -m "feat: danh mục loại tài sản với trường tùy biến"
```

---

## Task 7: Sổ tài sản — tạo, sửa, tính trạng thái và nhật ký thay đổi

**Files:**
- Create: `apps/api/src/assets/expiry.util.ts`
- Create: `apps/api/src/assets/assets.module.ts`, `assets.service.ts`, `assets.controller.ts`
- Create: `apps/api/src/assets/dto/create-asset.dto.ts`, `dto/update-asset.dto.ts`
- Test: `apps/api/src/assets/expiry.util.spec.ts`, `apps/api/src/assets/assets.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `ScopeService` (Task 4), `AssetTypesService.findOneOrFail` (Task 6), `validateAttributes` / `normalizeAttributes` (Task 6).
- Produces:
  - `tinhTrangThai(expiryDate: Date | null, hienTai: AssetStatus, homNay: Date, nguongNgay: number): AssetStatus`
  - `AssetsService.create(dto, user)`, `.update(id, dto, user)`, `.findOne(id, user)`, `.revoke(id, note, user)`
  - `AssetsService.ghiNhatKy(tx, assetId, action, userId, changes, note)` — dùng lại ở Task 9.

- [ ] **Step 1: Viết test cho tính trạng thái hết hạn**

`apps/api/src/assets/expiry.util.spec.ts`:

```typescript
import { AssetStatus } from '@prisma/client';
import { tinhTrangThai } from './expiry.util';

const homNay = new Date('2026-08-04T00:00:00+07:00');
const NGUONG = 30;

describe('tinhTrangThai', () => {
  it('giữ ACTIVE khi không có ngày hết hạn', () => {
    expect(tinhTrangThai(null, AssetStatus.ACTIVE, homNay, NGUONG)).toBe(AssetStatus.ACTIVE);
  });

  it('ACTIVE khi còn hạn xa hơn ngưỡng', () => {
    expect(
      tinhTrangThai(new Date('2026-12-31'), AssetStatus.ACTIVE, homNay, NGUONG),
    ).toBe(AssetStatus.ACTIVE);
  });

  it('EXPIRING khi còn đúng bằng ngưỡng', () => {
    expect(
      tinhTrangThai(new Date('2026-09-03'), AssetStatus.ACTIVE, homNay, NGUONG),
    ).toBe(AssetStatus.EXPIRING);
  });

  it('ACTIVE khi còn nhiều hơn ngưỡng đúng một ngày', () => {
    expect(
      tinhTrangThai(new Date('2026-09-04'), AssetStatus.ACTIVE, homNay, NGUONG),
    ).toBe(AssetStatus.ACTIVE);
  });

  it('EXPIRING vào đúng ngày hết hạn', () => {
    expect(
      tinhTrangThai(new Date('2026-08-04'), AssetStatus.ACTIVE, homNay, NGUONG),
    ).toBe(AssetStatus.EXPIRING);
  });

  it('EXPIRED khi đã qua ngày hết hạn', () => {
    expect(
      tinhTrangThai(new Date('2026-08-03'), AssetStatus.ACTIVE, homNay, NGUONG),
    ).toBe(AssetStatus.EXPIRED);
  });

  it('không ghi đè trạng thái REVOKED', () => {
    expect(
      tinhTrangThai(new Date('2026-08-03'), AssetStatus.REVOKED, homNay, NGUONG),
    ).toBe(AssetStatus.REVOKED);
  });

  it('không ghi đè trạng thái SUSPENDED', () => {
    expect(
      tinhTrangThai(new Date('2026-08-03'), AssetStatus.SUSPENDED, homNay, NGUONG),
    ).toBe(AssetStatus.SUSPENDED);
  });

  it('đưa tài sản từ EXPIRING về ACTIVE khi được gia hạn', () => {
    expect(
      tinhTrangThai(new Date('2027-08-04'), AssetStatus.EXPIRING, homNay, NGUONG),
    ).toBe(AssetStatus.ACTIVE);
  });
});
```

Các mốc biên (đúng ngày hết hạn, đúng ngưỡng cảnh báo) là chỗ dễ sai nhất và cũng là chỗ gây hậu quả thật: lệch một ngày nghĩa là chữ ký số hết hạn mà không ai được cảnh báo.

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `cd apps/api && npx jest src/assets/expiry --verbose`
Expected: FAIL — `Cannot find module './expiry.util'`

- [ ] **Step 3: Viết expiry.util.ts**

```typescript
import { AssetStatus } from '@prisma/client';

const MOT_NGAY = 24 * 60 * 60 * 1000;

function batDauNgay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function soNgayConLai(expiryDate: Date, homNay: Date): number {
  return Math.round((batDauNgay(expiryDate) - batDauNgay(homNay)) / MOT_NGAY);
}

export function tinhTrangThai(
  expiryDate: Date | null,
  hienTai: AssetStatus,
  homNay: Date,
  nguongNgay: number,
): AssetStatus {
  if (hienTai === AssetStatus.REVOKED || hienTai === AssetStatus.SUSPENDED) {
    return hienTai;
  }
  if (!expiryDate) return AssetStatus.ACTIVE;
  const conLai = soNgayConLai(expiryDate, homNay);
  if (conLai < 0) return AssetStatus.EXPIRED;
  if (conLai <= nguongNgay) return AssetStatus.EXPIRING;
  return AssetStatus.ACTIVE;
}
```

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `cd apps/api && npx jest src/assets/expiry --verbose`
Expected: PASS — 9 test qua.

- [ ] **Step 5: Viết test cho AssetsService**

`apps/api/src/assets/assets.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AssetStatus, HistoryAction, Role } from '@prisma/client';
import { AssetsService } from './assets.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { AssetTypesService } from '../asset-types/asset-types.service';
import type { AuthUser } from '../auth/auth.service';

const itAdmin: AuthUser = {
  id: 'u-it', username: 'it', fullName: 'IT', role: Role.IT_ADMIN, orgUnitId: 'co-quan',
};

const loaiCKS = {
  id: 'loai-cks', code: 'CKS', name: 'Chữ ký số', hasExpiry: true,
  fieldSchema: [
    { key: 'ca_provider', label: 'Nhà cung cấp CA', type: 'select',
      options: ['Viettel-CA', 'VNPT-CA'], required: true },
  ],
};

describe('AssetsService', () => {
  let service: AssetsService;
  const tx = {
    asset: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    assetHistory: { create: jest.fn() },
  };
  const prisma = {
    asset: { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    assetHistory: { create: jest.fn() },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const scope = { buildScopeFilter: jest.fn().mockResolvedValue({}), assertCanWrite: jest.fn() };
  const assetTypes = { findOneOrFail: jest.fn().mockResolvedValue(loaiCKS) };

  beforeEach(async () => {
    jest.clearAllMocks();
    scope.buildScopeFilter.mockResolvedValue({});
    assetTypes.findOneOrFail.mockResolvedValue(loaiCKS);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ScopeService, useValue: scope },
        { provide: AssetTypesService, useValue: assetTypes },
      ],
    }).compile();
    service = moduleRef.get(AssetsService);
  });

  const dtoHopLe = {
    assetTypeId: 'loai-cks', code: 'CKS-001', name: 'CKS Nguyễn Văn A',
    orgUnitId: 'phong-a', expiryDate: '2027-08-04',
    attributes: { ca_provider: 'Viettel-CA' },
  };

  it('từ chối tạo khi thiếu trường bắt buộc của loại tài sản', async () => {
    await expect(
      service.create({ ...dtoHopLe, attributes: {} } as any, itAdmin),
    ).rejects.toThrow(BadRequestException);
  });

  it('loại bỏ thuộc tính lạ không có trong schema trước khi ghi', async () => {
    tx.asset.create.mockResolvedValue({ id: 'a1' });
    await service.create(
      { ...dtoHopLe, attributes: { ca_provider: 'VNPT-CA', khoa_la: 'x' } } as any,
      itAdmin,
    );
    expect(tx.asset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ attributes: { ca_provider: 'VNPT-CA' } }),
      }),
    );
  });

  it('tính trạng thái khi tạo thay vì lấy từ dữ liệu người dùng gửi lên', async () => {
    tx.asset.create.mockResolvedValue({ id: 'a1' });
    await service.create(
      { ...dtoHopLe, expiryDate: '2020-01-01', status: 'ACTIVE' } as any,
      itAdmin,
    );
    expect(tx.asset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: AssetStatus.EXPIRED }),
      }),
    );
  });

  it('ghi nhật ký CREATE trong cùng transaction với việc tạo tài sản', async () => {
    tx.asset.create.mockResolvedValue({ id: 'a1' });
    await service.create(dtoHopLe as any, itAdmin);
    expect(tx.assetHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assetId: 'a1', action: HistoryAction.CREATE, changedById: 'u-it',
        }),
      }),
    );
  });

  it('kiểm tra quyền ghi theo đơn vị trước khi tạo', async () => {
    tx.asset.create.mockResolvedValue({ id: 'a1' });
    await service.create(dtoHopLe as any, itAdmin);
    expect(scope.assertCanWrite).toHaveBeenCalledWith(itAdmin, 'phong-a');
  });

  it('nhật ký UPDATE chỉ ghi các trường thực sự thay đổi', async () => {
    prisma.asset.findMany.mockResolvedValue([
      { id: 'a1', name: 'Tên cũ', orgUnitId: 'phong-a', assetTypeId: 'loai-cks',
        status: AssetStatus.ACTIVE, expiryDate: new Date('2027-08-04'),
        attributes: { ca_provider: 'Viettel-CA' }, vendor: null },
    ]);
    tx.asset.update.mockResolvedValue({ id: 'a1' });
    await service.update('a1', { name: 'Tên mới' } as any, itAdmin);
    expect(tx.assetHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: HistoryAction.UPDATE,
          changes: { name: { from: 'Tên cũ', to: 'Tên mới' } },
        }),
      }),
    );
  });

  it('không ghi nhật ký khi không có gì thay đổi', async () => {
    prisma.asset.findMany.mockResolvedValue([
      { id: 'a1', name: 'Tên cũ', orgUnitId: 'phong-a', assetTypeId: 'loai-cks',
        status: AssetStatus.ACTIVE, expiryDate: null,
        attributes: { ca_provider: 'Viettel-CA' }, vendor: null },
    ]);
    tx.asset.update.mockResolvedValue({ id: 'a1' });
    await service.update('a1', { name: 'Tên cũ' } as any, itAdmin);
    expect(tx.assetHistory.create).not.toHaveBeenCalled();
  });

  it('bỏ qua trạng thái người dùng gửi lên khi sửa', async () => {
    prisma.asset.findMany.mockResolvedValue([
      { id: 'a1', name: 'T', orgUnitId: 'phong-a', assetTypeId: 'loai-cks',
        status: AssetStatus.ACTIVE, expiryDate: new Date('2027-08-04'),
        attributes: { ca_provider: 'Viettel-CA' }, vendor: null },
    ]);
    tx.asset.update.mockResolvedValue({ id: 'a1' });
    await service.update('a1', { status: AssetStatus.EXPIRED } as any, itAdmin);
    const data = tx.asset.update.mock.calls[0][0].data;
    expect(data.status).not.toBe(AssetStatus.EXPIRED);
  });

  it('trả 404 khi sửa tài sản nằm ngoài phạm vi đơn vị', async () => {
    prisma.asset.findMany.mockResolvedValue([]);
    await expect(
      service.update('a-khac', { name: 'X' } as any, itAdmin),
    ).rejects.toThrow(NotFoundException);
  });

  it('thu hồi đặt trạng thái REVOKED và ghi nhật ký REVOKE', async () => {
    prisma.asset.findMany.mockResolvedValue([
      { id: 'a1', name: 'T', orgUnitId: 'phong-a', assetTypeId: 'loai-cks',
        status: AssetStatus.ACTIVE, expiryDate: null,
        attributes: {}, vendor: null },
    ]);
    tx.asset.update.mockResolvedValue({ id: 'a1' });
    await service.revoke('a1', 'Cán bộ nghỉ hưu', itAdmin);
    expect(tx.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: AssetStatus.REVOKED }),
      }),
    );
    expect(tx.assetHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: HistoryAction.REVOKE, note: 'Cán bộ nghỉ hưu',
        }),
      }),
    );
  });
});
```

- [ ] **Step 6: Chạy test để xác nhận nó thất bại**

Run: `cd apps/api && npx jest src/assets/assets.service --verbose`
Expected: FAIL — `Cannot find module './assets.service'`

- [ ] **Step 7: Viết AssetsService**

`apps/api/src/assets/assets.service.ts`:

```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatus, HistoryAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { AssetTypesService } from '../asset-types/asset-types.service';
import { normalizeAttributes, validateAttributes } from '../asset-types/field-schema';
import { tinhTrangThai } from './expiry.util';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import type { AuthUser } from '../auth/auth.service';
import { writeSheet, type ColumnMap } from '../common/excel/excel.util';
import type { QueryAssetsDto } from './dto/query-assets.dto';
import { dinhDangNgay } from './expiry.util';

const TRUONG_THEO_DOI = [
  'name', 'orgUnitId', 'holderEmployeeId', 'vendor',
  'issuedDate', 'expiryDate', 'cost', 'note',
] as const;

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly assetTypes: AssetTypesService,
  ) {}

  private get nguongNgay(): number {
    return Number(process.env.EXPIRY_WARNING_DAYS ?? 30);
  }

  async findOne(id: string, user: AuthUser) {
    const filter = await this.scope.buildScopeFilter(user);
    const [asset] = await this.prisma.asset.findMany({
      where: { id, ...filter },
      include: {
        assetType: true,
        orgUnit: { select: { id: true, code: true, name: true } },
        holder: { select: { id: true, code: true, fullName: true } },
        history: { orderBy: { changedAt: 'desc' } },
      },
      take: 1,
    });
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản');
    return asset;
  }

  private async loadForWrite(id: string, user: AuthUser) {
    const filter = await this.scope.buildScopeFilter(user);
    const [asset] = await this.prisma.asset.findMany({
      where: { id, ...filter }, take: 1,
    });
    if (!asset) throw new NotFoundException('Không tìm thấy tài sản');
    return asset;
  }

  private kiemTraThuocTinh(schema: any[], attributes: Record<string, unknown>) {
    const loi = validateAttributes(schema, attributes ?? {});
    if (loi.length > 0) {
      throw new BadRequestException({
        message: 'Dữ liệu nhập vào không hợp lệ',
        code: 'ATTRIBUTE_INVALID',
        details: loi,
      });
    }
    return normalizeAttributes(schema, attributes ?? {});
  }

  async create(dto: CreateAssetDto, user: AuthUser) {
    await this.scope.assertCanWrite(user, dto.orgUnitId);
    const loai = await this.assetTypes.findOneOrFail(dto.assetTypeId);
    const attributes = this.kiemTraThuocTinh(loai.fieldSchema, dto.attributes);
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    const status = tinhTrangThai(
      loai.hasExpiry ? expiryDate : null,
      AssetStatus.ACTIVE,
      new Date(),
      this.nguongNgay,
    );

    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          assetTypeId: dto.assetTypeId,
          code: dto.code,
          name: dto.name,
          orgUnitId: dto.orgUnitId,
          holderEmployeeId: dto.holderEmployeeId ?? null,
          vendor: dto.vendor ?? null,
          issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : null,
          expiryDate,
          cost: dto.cost ?? null,
          note: dto.note ?? null,
          attributes: attributes as Prisma.InputJsonValue,
          status,
          createdById: user.id,
        },
      });
      await this.ghiNhatKy(tx, asset.id, HistoryAction.CREATE, user.id, {}, null);
      return asset;
    });
  }

  async update(id: string, dto: UpdateAssetDto, user: AuthUser) {
    const hienTai = await this.loadForWrite(id, user);
    await this.scope.assertCanWrite(user, dto.orgUnitId ?? hienTai.orgUnitId);
    const loai = await this.assetTypes.findOneOrFail(
      dto.assetTypeId ?? hienTai.assetTypeId,
    );

    const data: Record<string, unknown> = {};
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    for (const truong of TRUONG_THEO_DOI) {
      if (dto[truong] === undefined) continue;
      const moi =
        truong === 'issuedDate' || truong === 'expiryDate'
          ? dto[truong]
            ? new Date(dto[truong] as string)
            : null
          : dto[truong];
      const cu = (hienTai as any)[truong];
      const khac =
        moi instanceof Date || cu instanceof Date
          ? String(moi ?? '') !== String(cu ?? '')
          : moi !== cu;
      if (khac) {
        data[truong] = moi;
        changes[truong] = { from: cu ?? null, to: moi ?? null };
      }
    }

    if (dto.attributes !== undefined) {
      const attributes = this.kiemTraThuocTinh(loai.fieldSchema, dto.attributes);
      if (JSON.stringify(attributes) !== JSON.stringify(hienTai.attributes)) {
        data.attributes = attributes as Prisma.InputJsonValue;
        changes.attributes = { from: hienTai.attributes, to: attributes };
      }
    }

    const expiryDate =
      data.expiryDate !== undefined
        ? (data.expiryDate as Date | null)
        : hienTai.expiryDate;
    data.status = tinhTrangThai(
      loai.hasExpiry ? expiryDate : null,
      hienTai.status,
      new Date(),
      this.nguongNgay,
    );

    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({ where: { id }, data });
      if (Object.keys(changes).length > 0) {
        await this.ghiNhatKy(tx, id, HistoryAction.UPDATE, user.id, changes, null);
      }
      return asset;
    });
  }

  async revoke(id: string, note: string, user: AuthUser) {
    const hienTai = await this.loadForWrite(id, user);
    await this.scope.assertCanWrite(user, hienTai.orgUnitId);
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id },
        data: { status: AssetStatus.REVOKED },
      });
      await this.ghiNhatKy(
        tx, id, HistoryAction.REVOKE, user.id,
        { status: { from: hienTai.status, to: AssetStatus.REVOKED } }, note,
      );
      return asset;
    });
  }

  async ghiNhatKy(
    tx: Prisma.TransactionClient,
    assetId: string,
    action: HistoryAction,
    changedById: string,
    changes: Record<string, unknown>,
    note: string | null,
  ) {
    await tx.assetHistory.create({
      data: { assetId, action, changedById, changes: changes as Prisma.InputJsonValue, note },
    });
  }
}
```

Hai điểm cố ý trong thiết kế này: trạng thái luôn được tính lại từ `expiryDate` chứ không nhận từ `dto`, và nhật ký chỉ ghi khi thực sự có thay đổi — nếu ghi mọi lần bấm Lưu thì nhật ký đầy dòng rỗng và mất tác dụng truy vết.

- [ ] **Step 8: Chạy test để xác nhận nó qua**

Run: `cd apps/api && npx jest src/assets --verbose`
Expected: PASS — 9 test expiry + 10 test service.

- [ ] **Step 9: Viết controller và DTO**

`CreateAssetDto`: `assetTypeId` `@IsUUID`, `code` `@IsNotEmpty({ message: 'Vui lòng nhập mã tài sản' })`, `name` `@IsNotEmpty({ message: 'Vui lòng nhập tên tài sản' })`, `orgUnitId` `@IsUUID`, các trường tùy chọn `holderEmployeeId`, `vendor`, `issuedDate` (`@IsDateString`), `expiryDate` (`@IsDateString`), `cost` (`@IsNumber`), `note`, và `attributes` (`@IsObject`, mặc định `{}`). `UpdateAssetDto extends PartialType(CreateAssetDto)`.

Controller `assets` với các route: `GET /:id`, `POST /`, `PATCH /:id`, `POST /:id/revoke` (body `{ note: string }`). Thao tác ghi không gắn `@Roles` vì `ScopeService.assertCanWrite` đã chặn `LEADER`; gắn thêm `@Roles` sẽ tách quy tắc ra hai chỗ và dễ lệch nhau.

- [ ] **Step 10: Commit**

```bash
cd apps/api && npx jest src/assets && cd ../.. && git add -A
git commit -m "feat: sổ tài sản với kiểm tra trường tùy biến và nhật ký thay đổi"
```

---

## Task 8: Danh sách tài sản — lọc, tìm kiếm, phân trang và xuất Excel

**Files:**
- Create: `apps/api/src/assets/dto/query-assets.dto.ts`
- Modify: `apps/api/src/assets/assets.service.ts` (thêm `findAll`, `exportExcel`)
- Modify: `apps/api/src/assets/assets.controller.ts` (thêm `GET /`, `GET /export`)
- Test: `apps/api/src/assets/assets-query.service.spec.ts`

**Interfaces:**
- Consumes: `ScopeService.buildScopeFilter` (Task 4), `writeSheet` (Task 5).
- Produces:
  - `type QueryAssetsDto = { search?: string; assetTypeId?: string; orgUnitId?: string; status?: AssetStatus; expiringWithinDays?: number; page?: number; pageSize?: number }`
  - `AssetsService.buildWhere(query, user): Promise<Prisma.AssetWhereInput>`
  - `AssetsService.findAll(query, user): Promise<{ items: Asset[]; total: number; page: number; pageSize: number }>`
  - `AssetsService.exportExcel(query, user): Promise<Buffer>`

- [ ] **Step 1: Viết test cho buildWhere**

`apps/api/src/assets/assets-query.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { AssetStatus, Role } from '@prisma/client';
import { AssetsService } from './assets.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { AssetTypesService } from '../asset-types/asset-types.service';
import type { AuthUser } from '../auth/auth.service';

const adminDonVi: AuthUser = {
  id: 'u1', username: 'pa', fullName: 'Admin Phòng A',
  role: Role.UNIT_ADMIN, orgUnitId: 'phong-a',
};

describe('AssetsService — truy vấn danh sách', () => {
  let service: AssetsService;
  const prisma = {
    asset: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn(),
  };
  const scope = { buildScopeFilter: jest.fn(), assertCanWrite: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    scope.buildScopeFilter.mockResolvedValue({ orgUnitId: { in: ['phong-a', 'to-a1'] } });
    const moduleRef = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ScopeService, useValue: scope },
        { provide: AssetTypesService, useValue: { findOneOrFail: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(AssetsService);
  });

  it('luôn áp bộ lọc phạm vi ngay cả khi không có tham số lọc', async () => {
    const where = await service.buildWhere({}, adminDonVi);
    expect(where.orgUnitId).toEqual({ in: ['phong-a', 'to-a1'] });
  });

  it('lọc theo một đơn vị cụ thể vẫn giữ giới hạn phạm vi', async () => {
    const where = await service.buildWhere({ orgUnitId: 'to-a1' }, adminDonVi);
    expect(where.AND).toContainEqual({ orgUnitId: 'to-a1' });
    expect(where.orgUnitId).toEqual({ in: ['phong-a', 'to-a1'] });
  });

  it('tìm kiếm khớp mã, tên và tên người giữ', async () => {
    const where = await service.buildWhere({ search: 'nguyễn' }, adminDonVi);
    const or = (where.OR ?? []) as any[];
    expect(or).toHaveLength(3);
    expect(or[0].code.contains).toBe('nguyễn');
    expect(or[0].code.mode).toBe('insensitive');
    expect(or[2].holder.fullName.contains).toBe('nguyễn');
  });

  it('lọc theo trạng thái', async () => {
    const where = await service.buildWhere({ status: AssetStatus.EXPIRING }, adminDonVi);
    expect(where.status).toBe(AssetStatus.EXPIRING);
  });

  it('lọc sắp hết hạn trong N ngày tạo khoảng ngày từ hôm nay', async () => {
    const where = await service.buildWhere({ expiringWithinDays: 30 }, adminDonVi);
    expect(where.expiryDate).toEqual({
      gte: expect.any(Date), lte: expect.any(Date),
    });
    const { gte, lte } = where.expiryDate as any;
    expect(Math.round((lte - gte) / 86400000)).toBe(30);
  });

  it('phân trang mặc định 20 dòng, trang 1', async () => {
    await service.findAll({}, adminDonVi);
    expect(prisma.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it('phân trang trang 3 với 50 dòng bỏ qua 100 dòng đầu', async () => {
    await service.findAll({ page: 3, pageSize: 50 }, adminDonVi);
    expect(prisma.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 100, take: 50 }),
    );
  });

  it('giới hạn pageSize tối đa 200 để tránh truy vấn quá nặng', async () => {
    await service.findAll({ pageSize: 5000 }, adminDonVi);
    expect(prisma.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `cd apps/api && npx jest src/assets/assets-query --verbose`
Expected: FAIL — `service.buildWhere is not a function`

- [ ] **Step 3: Thêm buildWhere, findAll, exportExcel vào AssetsService**

```typescript
const PAGE_SIZE_MAC_DINH = 20;
const PAGE_SIZE_TOI_DA = 200;

async buildWhere(query: QueryAssetsDto, user: AuthUser): Promise<Prisma.AssetWhereInput> {
  const filter = await this.scope.buildScopeFilter(user);
  const where: Prisma.AssetWhereInput = { ...filter };
  const AND: Prisma.AssetWhereInput[] = [];

  if (query.orgUnitId) AND.push({ orgUnitId: query.orgUnitId });
  if (query.assetTypeId) where.assetTypeId = query.assetTypeId;
  if (query.status) where.status = query.status;

  if (query.search) {
    where.OR = [
      { code: { contains: query.search, mode: 'insensitive' } },
      { name: { contains: query.search, mode: 'insensitive' } },
      { holder: { fullName: { contains: query.search, mode: 'insensitive' } } },
    ];
  }

  if (query.expiringWithinDays !== undefined) {
    const tuNgay = new Date();
    const denNgay = new Date(tuNgay);
    denNgay.setDate(denNgay.getDate() + Number(query.expiringWithinDays));
    where.expiryDate = { gte: tuNgay, lte: denNgay };
  }

  if (AND.length > 0) where.AND = AND;
  return where;
}

async findAll(query: QueryAssetsDto, user: AuthUser) {
  const where = await this.buildWhere(query, user);
  const page = Math.max(1, Number(query.page ?? 1));
  const pageSize = Math.min(
    PAGE_SIZE_TOI_DA,
    Math.max(1, Number(query.pageSize ?? PAGE_SIZE_MAC_DINH)),
  );
  const [items, total] = await Promise.all([
    this.prisma.asset.findMany({
      where,
      include: {
        assetType: { select: { id: true, name: true, code: true } },
        orgUnit: { select: { id: true, name: true, code: true } },
        holder: { select: { id: true, fullName: true } },
      },
      orderBy: [{ expiryDate: 'asc' }, { code: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    this.prisma.asset.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

async exportExcel(query: QueryAssetsDto, user: AuthUser): Promise<Buffer> {
  const where = await this.buildWhere(query, user);
  const rows = await this.prisma.asset.findMany({
    where,
    include: {
      assetType: { select: { name: true } },
      orgUnit: { select: { name: true } },
      holder: { select: { fullName: true } },
    },
    orderBy: [{ expiryDate: 'asc' }, { code: 'asc' }],
  });
  const NHAN_TRANG_THAI: Record<string, string> = {
    ACTIVE: 'Đang hiệu lực', EXPIRING: 'Sắp hết hạn', EXPIRED: 'Đã hết hạn',
    REVOKED: 'Đã thu hồi', SUSPENDED: 'Tạm ngưng',
  };
  return writeSheet(
    rows.map((a) => ({
      code: a.code,
      name: a.name,
      assetType: a.assetType.name,
      orgUnit: a.orgUnit.name,
      holder: a.holder?.fullName ?? '',
      vendor: a.vendor ?? '',
      issuedDate: a.issuedDate ? dinhDangNgay(a.issuedDate) : '',
      expiryDate: a.expiryDate ? dinhDangNgay(a.expiryDate) : '',
      status: NHAN_TRANG_THAI[a.status],
      cost: a.cost ? Number(a.cost) : '',
      note: a.note ?? '',
    })),
    [
      { key: 'code', label: 'Mã tài sản', width: 18 },
      { key: 'name', label: 'Tên tài sản', width: 32 },
      { key: 'assetType', label: 'Loại tài sản', width: 20 },
      { key: 'orgUnit', label: 'Đơn vị', width: 24 },
      { key: 'holder', label: 'Người giữ', width: 24 },
      { key: 'vendor', label: 'Nhà cung cấp', width: 20 },
      { key: 'issuedDate', label: 'Ngày cấp', width: 14 },
      { key: 'expiryDate', label: 'Ngày hết hạn', width: 14 },
      { key: 'status', label: 'Trạng thái', width: 16 },
      { key: 'cost', label: 'Chi phí', width: 14 },
      { key: 'note', label: 'Ghi chú', width: 30 },
    ],
  );
}
```

Thêm hàm phụ trong `expiry.util.ts`:

```typescript
export function dinhDangNgay(d: Date): string {
  return d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}
```

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `cd apps/api && npx jest src/assets --verbose`
Expected: PASS — toàn bộ test của assets.

- [ ] **Step 5: Thêm route vào controller**

```typescript
@Get()
findAll(@Query() query: QueryAssetsDto, @CurrentUser() user: AuthUser) {
  return this.service.findAll(query, user);
}

@Get('export')
async export(
  @Query() query: QueryAssetsDto,
  @CurrentUser() user: AuthUser,
  @Res({ passthrough: true }) res: Response,
) {
  const buffer = await this.service.exportExcel(query, user);
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="danh-sach-tai-san-${new Date().toISOString().slice(0, 10)}.xlsx"`,
  });
  return new StreamableFile(buffer);
}
```

Đặt `@Get('export')` **trước** `@Get(':id')` trong file controller, nếu không NestJS sẽ khớp `export` vào tham số `:id`.

`QueryAssetsDto` dùng `@Type(() => Number)` cho `page`, `pageSize`, `expiringWithinDays` vì query string luôn là chuỗi.

- [ ] **Step 6: Commit**

```bash
cd apps/api && npx jest src/assets && cd ../.. && git add -A
git commit -m "feat: lọc, tìm kiếm, phân trang và xuất Excel danh sách tài sản"
```

---

## Task 9: Nhập tài sản hàng loạt từ Excel

**Files:**
- Create: `apps/api/src/assets/asset-import.service.ts`
- Modify: `apps/api/src/assets/assets.controller.ts` (thêm 3 route import)
- Modify: `apps/api/src/assets/assets.module.ts`
- Test: `apps/api/src/assets/asset-import.service.spec.ts`

**Interfaces:**
- Consumes: `readSheetAsync`, `writeSheet`, `ImportPreview`, `ImportError` (Task 5); `validateAttributes` / `normalizeAttributes` (Task 6); `tinhTrangThai` (Task 7); `AssetsService.ghiNhatKy` (Task 7); `ScopeService` (Task 4).
- Produces:
  - `AssetImportService.buildColumnMap(assetTypeId: string): Promise<ColumnMap>` — cột cố định cộng một cột cho mỗi trường trong `fieldSchema`.
  - `AssetImportService.buildTemplate(assetTypeId: string): Promise<Buffer>` — sinh file mẫu có đúng các cột của loại tài sản đó.
  - `AssetImportService.buildPreview(rows: RawRow[], assetTypeId: string, user: AuthUser): Promise<ImportPreview<AssetImportRow>>`
  - `AssetImportService.commit(rows: AssetImportRow[], user: AuthUser): Promise<{ imported: number }>` — không nhận `assetTypeId` vì mỗi phần tử `AssetImportRow` đã mang sẵn `assetTypeId`.

- [ ] **Step 1: Viết test**

`apps/api/src/assets/asset-import.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { AssetStatus, Role } from '@prisma/client';
import { AssetImportService } from './asset-import.service';
import { AssetsService } from './assets.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { AssetTypesService } from '../asset-types/asset-types.service';
import type { AuthUser } from '../auth/auth.service';

const itAdmin: AuthUser = {
  id: 'u-it', username: 'it', fullName: 'IT', role: Role.IT_ADMIN, orgUnitId: 'co-quan',
};

const loaiCKS = {
  id: 'loai-cks', code: 'CKS', name: 'Chữ ký số', hasExpiry: true,
  fieldSchema: [
    { key: 'ca_provider', label: 'Nhà cung cấp CA', type: 'select',
      options: ['Viettel-CA', 'VNPT-CA'], required: true },
    { key: 'serial', label: 'Số serial', type: 'text', required: false },
  ],
};

const dong = (rowNumber: number, values: Record<string, string | null>) => ({
  rowNumber,
  values: {
    code: null, name: null, orgUnitCode: null, holderCode: null,
    vendor: null, issuedDate: null, expiryDate: null, cost: null, note: null,
    'Nhà cung cấp CA': null, 'Số serial': null, ...values,
  },
});

describe('AssetImportService', () => {
  let service: AssetImportService;
  const prisma = {
    orgUnit: { findMany: jest.fn() },
    employee: { findMany: jest.fn() },
    asset: { findMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const scope = { assertCanWrite: jest.fn() };
  const assetTypes = { findOneOrFail: jest.fn().mockResolvedValue(loaiCKS) };
  const assets = { ghiNhatKy: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    assetTypes.findOneOrFail.mockResolvedValue(loaiCKS);
    prisma.orgUnit.findMany.mockResolvedValue([{ id: 'pa-id', code: 'PA' }]);
    prisma.employee.findMany.mockResolvedValue([{ id: 'cb-id', code: 'CB001' }]);
    prisma.asset.findMany.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AssetImportService,
        { provide: PrismaService, useValue: prisma },
        { provide: ScopeService, useValue: scope },
        { provide: AssetTypesService, useValue: assetTypes },
        { provide: AssetsService, useValue: assets },
      ],
    }).compile();
    service = moduleRef.get(AssetImportService);
  });

  it('chuyển dòng hợp lệ thành dữ liệu ghi và tính trạng thái', async () => {
    const kq = await service.buildPreview(
      [dong(2, {
        code: 'CKS-001', name: 'CKS Nguyễn Văn A', orgUnitCode: 'PA',
        holderCode: 'CB001', expiryDate: '2020-01-01', 'Nhà cung cấp CA': 'Viettel-CA',
      })],
      'loai-cks', itAdmin,
    );
    expect(kq.errors).toEqual([]);
    expect(kq.validRows[0]).toMatchObject({
      code: 'CKS-001', orgUnitId: 'pa-id', holderEmployeeId: 'cb-id',
      status: AssetStatus.EXPIRED,
      attributes: { ca_provider: 'Viettel-CA' },
    });
  });

  it('báo lỗi trường tùy biến bắt buộc bị bỏ trống kèm số dòng', async () => {
    const kq = await service.buildPreview(
      [dong(5, { code: 'CKS-002', name: 'CKS B', orgUnitCode: 'PA' })],
      'loai-cks', itAdmin,
    );
    expect(kq.errors).toContainEqual({
      rowNumber: 5, field: 'ca_provider',
      message: 'Vui lòng nhập Nhà cung cấp CA',
    });
    expect(kq.validRows).toHaveLength(0);
  });

  it('báo lỗi khi mã cán bộ giữ tài sản không tồn tại', async () => {
    const kq = await service.buildPreview(
      [dong(2, {
        code: 'CKS-003', name: 'CKS C', orgUnitCode: 'PA', holderCode: 'CB999',
        'Nhà cung cấp CA': 'VNPT-CA',
      })],
      'loai-cks', itAdmin,
    );
    expect(kq.errors[0].message).toBe('Không tìm thấy cán bộ có mã CB999');
  });

  it('báo lỗi khi ngày hết hạn sai định dạng', async () => {
    const kq = await service.buildPreview(
      [dong(2, {
        code: 'CKS-004', name: 'CKS D', orgUnitCode: 'PA',
        expiryDate: '31/02/2026', 'Nhà cung cấp CA': 'VNPT-CA',
      })],
      'loai-cks', itAdmin,
    );
    expect(kq.errors[0]).toEqual({
      rowNumber: 2, field: 'expiryDate',
      message: 'Ngày hết hạn không đúng định dạng ngày',
    });
  });

  it('báo lỗi khi mã tài sản đã tồn tại trong hệ thống', async () => {
    prisma.asset.findMany.mockResolvedValue([{ code: 'CKS-001' }]);
    const kq = await service.buildPreview(
      [dong(2, {
        code: 'CKS-001', name: 'CKS A', orgUnitCode: 'PA',
        'Nhà cung cấp CA': 'VNPT-CA',
      })],
      'loai-cks', itAdmin,
    );
    expect(kq.errors[0].message).toBe('Mã tài sản CKS-001 đã tồn tại');
  });

  it('gom nhiều lỗi của cùng một dòng thay vì dừng ở lỗi đầu tiên', async () => {
    const kq = await service.buildPreview(
      [dong(2, { orgUnitCode: 'KHONG_CO' })],
      'loai-cks', itAdmin,
    );
    const soDong2 = kq.errors.filter((e) => e.rowNumber === 2).length;
    expect(soDong2).toBeGreaterThanOrEqual(3);
  });

  it('ghi toàn bộ trong một transaction và ghi nhật ký IMPORT cho từng tài sản', async () => {
    prisma.asset.createMany.mockResolvedValue({ count: 2 });
    prisma.asset.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: 'a1' }, { id: 'a2' },
    ]);
    const rows = [
      { code: 'CKS-001', name: 'A', orgUnitId: 'pa-id', assetTypeId: 'loai-cks',
        holderEmployeeId: null, vendor: null, issuedDate: null, expiryDate: null,
        cost: null, note: null, status: AssetStatus.ACTIVE, attributes: {} },
      { code: 'CKS-002', name: 'B', orgUnitId: 'pa-id', assetTypeId: 'loai-cks',
        holderEmployeeId: null, vendor: null, issuedDate: null, expiryDate: null,
        cost: null, note: null, status: AssetStatus.ACTIVE, attributes: {} },
    ];
    const kq = await service.commit(rows as any, itAdmin);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(kq).toEqual({ imported: 2 });
    expect(assets.ghiNhatKy).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `cd apps/api && npx jest src/assets/asset-import --verbose`
Expected: FAIL — `Cannot find module './asset-import.service'`

- [ ] **Step 3: Viết AssetImportService**

Cột cố định dùng chung cho mọi loại tài sản, cộng thêm một cột cho mỗi trường trong `fieldSchema` (tiêu đề cột chính là `label` của trường):

```typescript
import { Injectable } from '@nestjs/common';
import { AssetStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { AssetTypesService } from '../asset-types/asset-types.service';
import { validateAttributes, normalizeAttributes } from '../asset-types/field-schema';
import { AssetsService } from './assets.service';
import { tinhTrangThai } from './expiry.util';
import { writeSheet, type ColumnMap, type ImportError, type ImportPreview, type RawRow }
  from '../common/excel/excel.util';
import type { AuthUser } from '../auth/auth.service';
import { HistoryAction } from '@prisma/client';

export const COT_CO_DINH: ColumnMap = {
  'Mã tài sản': 'code',
  'Tên tài sản': 'name',
  'Mã đơn vị': 'orgUnitCode',
  'Mã cán bộ giữ': 'holderCode',
  'Nhà cung cấp': 'vendor',
  'Ngày cấp': 'issuedDate',
  'Ngày hết hạn': 'expiryDate',
  'Chi phí': 'cost',
  'Ghi chú': 'note',
};

export type AssetImportRow = {
  code: string; name: string; assetTypeId: string; orgUnitId: string;
  holderEmployeeId: string | null; vendor: string | null;
  issuedDate: Date | null; expiryDate: Date | null; cost: number | null;
  note: string | null; status: AssetStatus; attributes: Record<string, unknown>;
};

@Injectable()
export class AssetImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly assetTypes: AssetTypesService,
    private readonly assets: AssetsService,
  ) {}

  async buildColumnMap(assetTypeId: string): Promise<ColumnMap> {
    const loai = await this.assetTypes.findOneOrFail(assetTypeId);
    const map: ColumnMap = { ...COT_CO_DINH };
    for (const f of loai.fieldSchema) map[f.label] = f.label;
    return map;
  }

  async buildTemplate(assetTypeId: string): Promise<Buffer> {
    const map = await this.buildColumnMap(assetTypeId);
    return writeSheet([], Object.keys(map).map((label) => ({ key: label, label })));
  }

  async buildPreview(
    rows: RawRow[],
    assetTypeId: string,
    user: AuthUser,
  ): Promise<ImportPreview<AssetImportRow>> {
    const loai = await this.assetTypes.findOneOrFail(assetTypeId);
    const donVi = new Map(
      (await this.prisma.orgUnit.findMany({ select: { id: true, code: true } }))
        .map((d) => [d.code, d.id]),
    );
    const canBo = new Map(
      (await this.prisma.employee.findMany({ select: { id: true, code: true } }))
        .map((e) => [e.code, e.id]),
    );
    const maDaCo = new Set(
      (await this.prisma.asset.findMany({ select: { code: true } })).map((a) => a.code),
    );

    const validRows: AssetImportRow[] = [];
    const errors: ImportError[] = [];
    const maTrongFile = new Set<string>();
    const homNay = new Date();
    const nguong = Number(process.env.EXPIRY_WARNING_DAYS ?? 30);

    for (const row of rows) {
      const v = row.values;
      const loiDong: ImportError[] = [];
      const them = (field: string | null, message: string) =>
        loiDong.push({ rowNumber: row.rowNumber, field, message });

      if (!v.code) them('code', 'Thiếu mã tài sản');
      if (!v.name) them('name', 'Thiếu tên tài sản');
      if (!v.orgUnitCode) them('orgUnitCode', 'Thiếu mã đơn vị');
      else if (!donVi.has(v.orgUnitCode))
        them('orgUnitCode', `Không tìm thấy đơn vị có mã ${v.orgUnitCode}`);
      if (v.holderCode && !canBo.has(v.holderCode))
        them('holderCode', `Không tìm thấy cán bộ có mã ${v.holderCode}`);
      if (v.code && maDaCo.has(v.code)) them('code', `Mã tài sản ${v.code} đã tồn tại`);
      if (v.code && maTrongFile.has(v.code))
        them('code', `Mã tài sản ${v.code} bị trùng trong file`);

      const ngay = (raw: string | null, field: string, nhan: string) => {
        if (!raw) return null;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) {
          them(field, `${nhan} không đúng định dạng ngày`);
          return null;
        }
        return d;
      };
      const issuedDate = ngay(v.issuedDate, 'issuedDate', 'Ngày cấp');
      const expiryDate = ngay(v.expiryDate, 'expiryDate', 'Ngày hết hạn');

      if (v.cost && Number.isNaN(Number(v.cost))) them('cost', 'Chi phí phải là số');

      const thuocTinhTho: Record<string, unknown> = {};
      for (const f of loai.fieldSchema) thuocTinhTho[f.key] = v[f.label] ?? null;
      for (const loi of validateAttributes(loai.fieldSchema, thuocTinhTho)) {
        them(loi.field, loi.message);
      }

      if (loiDong.length > 0) {
        errors.push(...loiDong);
        continue;
      }
      maTrongFile.add(v.code!);
      validRows.push({
        code: v.code!, name: v.name!, assetTypeId,
        orgUnitId: donVi.get(v.orgUnitCode!)!,
        holderEmployeeId: v.holderCode ? canBo.get(v.holderCode)! : null,
        vendor: v.vendor ?? null, issuedDate, expiryDate,
        cost: v.cost ? Number(v.cost) : null, note: v.note ?? null,
        status: tinhTrangThai(
          loai.hasExpiry ? expiryDate : null, AssetStatus.ACTIVE, homNay, nguong,
        ),
        attributes: normalizeAttributes(loai.fieldSchema, thuocTinhTho),
      });
    }
    return { validRows, errors, totalRows: rows.length };
  }

  async commit(rows: AssetImportRow[], user: AuthUser) {
    const donViDaKiem = new Set<string>();
    for (const row of rows) {
      if (donViDaKiem.has(row.orgUnitId)) continue;
      await this.scope.assertCanWrite(user, row.orgUnitId);
      donViDaKiem.add(row.orgUnitId);
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.asset.createMany({
        data: rows.map((r) => ({
          ...r,
          attributes: r.attributes as Prisma.InputJsonValue,
          createdById: user.id,
        })),
      });
      const daTao = await tx.asset.findMany({
        where: { code: { in: rows.map((r) => r.code) } },
        select: { id: true },
      });
      for (const a of daTao) {
        await this.assets.ghiNhatKy(
          tx, a.id, HistoryAction.IMPORT, user.id, {}, 'Nhập từ file Excel',
        );
      }
      return { imported: daTao.length };
    });
  }
}
```

Việc gom hết lỗi của một dòng rồi mới sang dòng sau (thay vì dừng ở lỗi đầu tiên) là có chủ đích: người dùng cần thấy toàn bộ vấn đề trong một lần để sửa file một lần, chứ không phải nhập lại năm lần mới hết lỗi.

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `cd apps/api && npx jest src/assets/asset-import --verbose`
Expected: PASS — 7 test qua.

- [ ] **Step 5: Thêm route vào controller**

```typescript
@Get('import/template')
async template(@Query('assetTypeId') assetTypeId: string, @Res({ passthrough: true }) res: Response) {
  const buffer = await this.importService.buildTemplate(assetTypeId);
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="mau-nhap-tai-san.xlsx"',
  });
  return new StreamableFile(buffer);
}

@Post('import/preview')
@UseInterceptors(FileInterceptor('file'))
async importPreview(
  @UploadedFile() file: Express.Multer.File,
  @Body('assetTypeId') assetTypeId: string,
  @CurrentUser() user: AuthUser,
) {
  const columns = await this.importService.buildColumnMap(assetTypeId);
  const rows = await readSheetAsync(file.buffer, columns);
  return this.importService.buildPreview(rows, assetTypeId, user);
}

@Post('import/commit')
importCommit(@Body() body: { rows: AssetImportRow[] }, @CurrentUser() user: AuthUser) {
  return this.importService.commit(body.rows, user);
}
```

Cả ba route `import/*` phải khai báo trước `@Get(':id')`.

- [ ] **Step 6: Commit**

```bash
cd apps/api && npx jest src/assets && cd ../.. && git add -A
git commit -m "feat: nhập tài sản hàng loạt từ Excel có xem trước và báo lỗi từng dòng"
```

---

## Task 10: API dashboard

**Files:**
- Create: `apps/api/src/dashboard/dashboard.module.ts`, `dashboard.service.ts`, `dashboard.controller.ts`
- Test: `apps/api/src/dashboard/dashboard.service.spec.ts`

**Interfaces:**
- Consumes: `ScopeService.buildScopeFilter` (Task 4).
- Produces: `DashboardService.getSummary(user: AuthUser, query: { assetTypeId?: string }): Promise<DashboardSummary>`

```typescript
type ThongKeTrangThai = {
  tong: number;
  dangHieuLuc: number;   // ACTIVE
  sapHetHan: number;     // EXPIRING
  daHetHan: number;      // EXPIRED
  daThuHoi: number;      // REVOKED
  tamNgung: number;      // SUSPENDED
};

type DashboardSummary = {
  tongQuan: ThongKeTrangThai;
  theoLoaiChiTiet: ({ assetTypeId: string; ten: string } & ThongKeTrangThai)[];
  theoLoai: { assetTypeId: string; ten: string; soLuong: number }[];
  theoDonVi: { orgUnitId: string; ten: string; soLuong: number }[];
  hetHanTheoThang: { thang: string; soLuong: number }[];  // 12 tháng tới, dạng 'MM/YYYY'
  canXuLy: {
    id: string; code: string; name: string; donVi: string;
    nguoiGiu: string | null; expiryDate: string; soNgayConLai: number;
  }[];
};
```

Tham số `assetTypeId` lọc **toàn bộ** nội dung trả về, kể cả `theoLoaiChiTiet` (khi đó chỉ còn một phần tử) và `theoDonVi`. Một bộ lọc điều khiển cả trang.

`theoLoaiChiTiet` liệt kê **mọi loại tài sản đang hoạt động**, kể cả loại chưa có bản ghi nào — khi đó mọi số bằng 0. Nếu chỉ trả về các loại có dữ liệu, quản trị viên vừa thêm loại mới sẽ không thấy nó đâu và tưởng hệ thống lỗi.

- [ ] **Step 1: Viết test**

`apps/api/src/dashboard/dashboard.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { AssetStatus, Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import type { AuthUser } from '../auth/auth.service';

const adminDonVi: AuthUser = {
  id: 'u1', username: 'pa', fullName: 'Admin Phòng A',
  role: Role.UNIT_ADMIN, orgUnitId: 'phong-a',
};

const LOAI_TAI_SAN = [
  { id: 'loai-cks', name: 'Chữ ký số' },
  { id: 'loai-pm', name: 'Phần mềm bản quyền' },
  { id: 'loai-domain', name: 'Tên miền' },   // loại mới, chưa có bản ghi nào
];

// Ma trận (loại, trạng thái) do groupBy trả về
const MA_TRAN = [
  { assetTypeId: 'loai-cks', status: AssetStatus.ACTIVE, _count: { _all: 118 } },
  { assetTypeId: 'loai-cks', status: AssetStatus.EXPIRING, _count: { _all: 19 } },
  { assetTypeId: 'loai-cks', status: AssetStatus.EXPIRED, _count: { _all: 5 } },
  { assetTypeId: 'loai-pm', status: AssetStatus.ACTIVE, _count: { _all: 74 } },
  { assetTypeId: 'loai-pm', status: AssetStatus.REVOKED, _count: { _all: 3 } },
];

describe('DashboardService', () => {
  let service: DashboardService;
  const prisma = {
    asset: { groupBy: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    assetType: { findMany: jest.fn().mockResolvedValue(LOAI_TAI_SAN) },
    orgUnit: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const scope = { buildScopeFilter: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    scope.buildScopeFilter.mockResolvedValue({ orgUnitId: { in: ['phong-a'] } });
    prisma.assetType.findMany.mockResolvedValue(LOAI_TAI_SAN);
    prisma.asset.findMany.mockResolvedValue([]);
    // groupBy được gọi hai lần: theo (loại, trạng thái) rồi theo đơn vị
    prisma.asset.groupBy.mockResolvedValueOnce(MA_TRAN).mockResolvedValueOnce([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: ScopeService, useValue: scope },
      ],
    }).compile();
    service = moduleRef.get(DashboardService);
  });

  it('mọi truy vấn đều áp bộ lọc phạm vi của người dùng', async () => {
    await service.getSummary(adminDonVi, {});
    for (const call of prisma.asset.groupBy.mock.calls) {
      expect(call[0].where).toMatchObject({ orgUnitId: { in: ['phong-a'] } });
    }
    expect(prisma.asset.findMany.mock.calls[0][0].where).toMatchObject({
      orgUnitId: { in: ['phong-a'] },
    });
  });

  it('cộng chỉ số tổng quan từ ma trận loại × trạng thái', async () => {
    const kq = await service.getSummary(adminDonVi, {});
    expect(kq.tongQuan).toEqual({
      tong: 219, dangHieuLuc: 192, sapHetHan: 19,
      daHetHan: 5, daThuHoi: 3, tamNgung: 0,
    });
  });

  it('tách được chỉ số riêng của từng loại tài sản', async () => {
    const kq = await service.getSummary(adminDonVi, {});
    expect(kq.theoLoaiChiTiet).toContainEqual({
      assetTypeId: 'loai-cks', ten: 'Chữ ký số',
      tong: 142, dangHieuLuc: 118, sapHetHan: 19,
      daHetHan: 5, daThuHoi: 0, tamNgung: 0,
    });
  });

  it('vẫn liệt kê loại tài sản chưa có bản ghi nào với tất cả số bằng 0', async () => {
    const kq = await service.getSummary(adminDonVi, {});
    const tenMien = kq.theoLoaiChiTiet.find((l) => l.assetTypeId === 'loai-domain');
    expect(tenMien).toEqual({
      assetTypeId: 'loai-domain', ten: 'Tên miền',
      tong: 0, dangHieuLuc: 0, sapHetHan: 0, daHetHan: 0, daThuHoi: 0, tamNgung: 0,
    });
  });

  it('lọc theo loại thì mọi truy vấn đều mang thêm điều kiện loại đó', async () => {
    await service.getSummary(adminDonVi, { assetTypeId: 'loai-cks' });
    for (const call of prisma.asset.groupBy.mock.calls) {
      expect(call[0].where).toMatchObject({ assetTypeId: 'loai-cks' });
    }
    expect(prisma.asset.findMany.mock.calls[0][0].where).toMatchObject({
      assetTypeId: 'loai-cks',
    });
  });

  it('lọc theo loại thì theoLoaiChiTiet chỉ còn đúng loại đó', async () => {
    const kq = await service.getSummary(adminDonVi, { assetTypeId: 'loai-cks' });
    expect(kq.theoLoaiChiTiet).toHaveLength(1);
    expect(kq.theoLoaiChiTiet[0].assetTypeId).toBe('loai-cks');
  });

  it('theoLoai dùng cho biểu đồ tròn lấy từ cùng ma trận', async () => {
    const kq = await service.getSummary(adminDonVi, {});
    expect(kq.theoLoai).toContainEqual({
      assetTypeId: 'loai-cks', ten: 'Chữ ký số', soLuong: 142,
    });
    expect(kq.theoLoai.find((l) => l.assetTypeId === 'loai-domain')).toBeUndefined();
  });

  it('trả về đủ 12 tháng kể cả tháng không có tài sản nào hết hạn', async () => {
    const kq = await service.getSummary(adminDonVi, {});
    expect(kq.hetHanTheoThang).toHaveLength(12);
    expect(kq.hetHanTheoThang.every((m) => m.soLuong === 0)).toBe(true);
    expect(kq.hetHanTheoThang[0].thang).toMatch(/^\d{2}\/\d{4}$/);
  });

  it('gộp số tài sản hết hạn vào đúng tháng', async () => {
    const thangSau = new Date();
    thangSau.setMonth(thangSau.getMonth() + 1);
    prisma.asset.findMany.mockResolvedValue([
      { expiryDate: thangSau, orgUnit: { name: 'X' }, holder: null,
        id: 'a', code: 'c', name: 'n' },
      { expiryDate: thangSau, orgUnit: { name: 'X' }, holder: null,
        id: 'b', code: 'c2', name: 'n2' },
    ]);
    const kq = await service.getSummary(adminDonVi, {});
    const nhan = `${String(thangSau.getMonth() + 1).padStart(2, '0')}/${thangSau.getFullYear()}`;
    expect(kq.hetHanTheoThang.find((m) => m.thang === nhan)?.soLuong).toBe(2);
  });

  it('danh sách cần xử lý kèm số ngày còn lại', async () => {
    const sauMuoiNgay = new Date();
    sauMuoiNgay.setDate(sauMuoiNgay.getDate() + 10);
    prisma.asset.findMany.mockResolvedValue([
      { id: 'a1', code: 'CKS-001', name: 'CKS A', expiryDate: sauMuoiNgay,
        orgUnit: { name: 'Phòng A' }, holder: { fullName: 'Nguyễn Văn A' } },
    ]);
    const kq = await service.getSummary(adminDonVi, {});
    expect(kq.canXuLy[0]).toMatchObject({
      code: 'CKS-001', donVi: 'Phòng A', nguoiGiu: 'Nguyễn Văn A', soNgayConLai: 10,
    });
  });
});
```

Hai test đáng chú ý: test "vẫn liệt kê loại tài sản chưa có bản ghi nào" chặn lỗi quản trị viên thêm loại mới rồi không thấy nó trên dashboard; test "lọc theo loại thì mọi truy vấn đều mang thêm điều kiện" chặn lỗi bộ lọc chỉ ăn vào một phần trang, khiến các con số trên cùng màn hình mâu thuẫn nhau.

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `cd apps/api && npx jest src/dashboard --verbose`
Expected: FAIL — `Cannot find module './dashboard.service'`

- [ ] **Step 3: Viết DashboardService**

```typescript
import { Injectable } from '@nestjs/common';
import { AssetStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { soNgayConLai } from '../assets/expiry.util';
import type { AuthUser } from '../auth/auth.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async getSummary(user: AuthUser, query: { assetTypeId?: string }) {
    const scopeFilter = await this.scope.buildScopeFilter(user);
    const filter = {
      ...scopeFilter,
      ...(query.assetTypeId ? { assetTypeId: query.assetTypeId } : {}),
    };
    const homNay = new Date();

    const [maTran, nhomDonVi, loaiTS, donViTS] = await Promise.all([
      this.prisma.asset.groupBy({
        by: ['assetTypeId', 'status'], where: { ...filter }, _count: { _all: true },
      }),
      this.prisma.asset.groupBy({ by: ['orgUnitId'], where: { ...filter }, _count: true }),
      this.prisma.assetType.findMany({
        where: { isActive: true, ...(query.assetTypeId ? { id: query.assetTypeId } : {}) },
        select: { id: true, name: true }, orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.orgUnit.findMany({ select: { id: true, name: true } }),
    ]);
    const tenDonVi = new Map(donViTS.map((d) => [d.id, d.name]));

    // Dựng bảng loại × trạng thái từ một truy vấn gộp nhóm duy nhất.
    // Mỗi loại đang hoạt động đều có một dòng, kể cả loại chưa có bản ghi nào.
    const theoLoaiChiTiet = loaiTS.map((loai) => {
      const dong = {
        assetTypeId: loai.id, ten: loai.name,
        tong: 0, dangHieuLuc: 0, sapHetHan: 0, daHetHan: 0, daThuHoi: 0, tamNgung: 0,
      };
      for (const o of maTran) {
        if (o.assetTypeId !== loai.id) continue;
        const n = o._count._all;
        dong.tong += n;
        if (o.status === AssetStatus.ACTIVE) dong.dangHieuLuc += n;
        else if (o.status === AssetStatus.EXPIRING) dong.sapHetHan += n;
        else if (o.status === AssetStatus.EXPIRED) dong.daHetHan += n;
        else if (o.status === AssetStatus.REVOKED) dong.daThuHoi += n;
        else if (o.status === AssetStatus.SUSPENDED) dong.tamNgung += n;
      }
      return dong;
    });

    const tongQuan = theoLoaiChiTiet.reduce(
      (acc, d) => ({
        tong: acc.tong + d.tong,
        dangHieuLuc: acc.dangHieuLuc + d.dangHieuLuc,
        sapHetHan: acc.sapHetHan + d.sapHetHan,
        daHetHan: acc.daHetHan + d.daHetHan,
        daThuHoi: acc.daThuHoi + d.daThuHoi,
        tamNgung: acc.tamNgung + d.tamNgung,
      }),
      { tong: 0, dangHieuLuc: 0, sapHetHan: 0, daHetHan: 0, daThuHoi: 0, tamNgung: 0 },
    );

    const motNamSau = new Date(homNay);
    motNamSau.setFullYear(motNamSau.getFullYear() + 1);
    const sapToi = await this.prisma.asset.findMany({
      where: {
        ...filter,
        expiryDate: { gte: homNay, lte: motNamSau },
        status: { notIn: [AssetStatus.REVOKED, AssetStatus.SUSPENDED] },
      },
      select: {
        id: true, code: true, name: true, expiryDate: true,
        orgUnit: { select: { name: true } },
        holder: { select: { fullName: true } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    const hetHanTheoThang: { thang: string; soLuong: number }[] = [];
    const chiSoThang = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(homNay.getFullYear(), homNay.getMonth() + i, 1);
      const nhan = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      chiSoThang.set(nhan, hetHanTheoThang.length);
      hetHanTheoThang.push({ thang: nhan, soLuong: 0 });
    }
    for (const a of sapToi) {
      const d = a.expiryDate!;
      const nhan = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const idx = chiSoThang.get(nhan);
      if (idx !== undefined) hetHanTheoThang[idx].soLuong++;
    }

    return {
      tongQuan,
      theoLoaiChiTiet,
      // Biểu đồ tròn bỏ qua các loại chưa có bản ghi nào — một lát cắt bằng 0
      // không vẽ được và chỉ làm rối chú giải.
      theoLoai: theoLoaiChiTiet
        .filter((d) => d.tong > 0)
        .map((d) => ({ assetTypeId: d.assetTypeId, ten: d.ten, soLuong: d.tong })),
      theoDonVi: nhomDonVi.map((g) => ({
        orgUnitId: g.orgUnitId,
        ten: tenDonVi.get(g.orgUnitId) ?? 'Không xác định',
        soLuong: g._count as unknown as number,
      })),
      hetHanTheoThang,
      canXuLy: sapToi.slice(0, 20).map((a) => ({
        id: a.id, code: a.code, name: a.name,
        donVi: a.orgUnit.name, nguoiGiu: a.holder?.fullName ?? null,
        expiryDate: a.expiryDate!.toISOString(),
        soNgayConLai: soNgayConLai(a.expiryDate!, homNay),
      })),
    };
  }
}
```

Controller: một route duy nhất `GET /api/dashboard/summary?assetTypeId=...`, không gắn `@Roles` vì cả ba vai trò đều được xem — dữ liệu đã tự giới hạn qua `buildScopeFilter`:

```typescript
@Get('summary')
getSummary(
  @CurrentUser() user: AuthUser,
  @Query('assetTypeId') assetTypeId?: string,
) {
  return this.service.getSummary(user, { assetTypeId });
}
```

Ba lý do dùng một truy vấn gộp nhóm theo cặp `(assetTypeId, status)` thay vì đếm riêng từng ô: số truy vấn không tăng khi cơ quan thêm loại tài sản mới; các con số trên cùng màn hình chắc chắn nhất quán vì cùng đến từ một ảnh chụp dữ liệu; và bảng ma trận, khối theo loại, chỉ số tổng đều suy ra được từ cùng một kết quả.

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `cd apps/api && npx jest src/dashboard --verbose`
Expected: PASS — 10 test qua.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: API tổng hợp số liệu dashboard theo phạm vi đơn vị"
```

---

## Task 11: Khung frontend, đăng nhập và bố cục chung

**Files:**
- Create: `apps/web/` (dự án Vite), `apps/web/Dockerfile`, `apps/web/nginx.conf`
- Create: `apps/web/src/lib/api-client.ts`, `src/lib/format.ts`
- Create: `apps/web/src/features/auth/LoginPage.tsx`, `src/features/auth/useAuth.ts`
- Create: `apps/web/src/components/AppLayout.tsx`, `src/components/RequireRole.tsx`
- Create: `apps/web/src/router.tsx`, `src/App.tsx`, `src/main.tsx`
- Test: `apps/web/src/lib/api-client.spec.ts`, `apps/web/src/lib/format.spec.ts`

**Interfaces:**
- Consumes: API `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` (Task 2).
- Produces:
  - `apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T>`
  - `apiPost<T>(path: string, body?: unknown): Promise<T>`, `apiPatch<T>`, `apiUpload<T>(path, formData)`, `apiDownload(path, params)`
  - `class ApiError extends Error { statusCode: number; code: string | null; details: unknown }`
  - `useAuth(): { user: AuthUser | null; dangTai: boolean; dangNhap(username, password): Promise<void>; dangXuat(): Promise<void> }`
  - `<RequireRole roles={Role[]}>` — bọc route, chuyển hướng về `/` nếu vai trò không khớp.
  - `dinhDangNgay(iso: string | null): string`, `dinhDangTien(v: number | null): string`, `NHAN_TRANG_THAI: Record<AssetStatus, string>`

- [ ] **Step 1: Khởi tạo dự án**

```bash
cd apps && npm create vite@latest web -- --template react-ts
cd web && npm i @tanstack/react-query react-router-dom recharts clsx
npm i -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom
npx tailwindcss init -p
npx shadcn@latest init
```

Trong `vite.config.ts` thêm proxy để chạy phát triển: `server: { proxy: { '/api': 'http://localhost:3000' } }`.

- [ ] **Step 2: Viết test cho api-client và format**

`apps/web/src/lib/format.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { dinhDangNgay, dinhDangTien, NHAN_TRANG_THAI } from './format';

describe('format', () => {
  it('định dạng ngày theo kiểu Việt Nam', () => {
    expect(dinhDangNgay('2026-08-04T00:00:00.000Z')).toBe('04/08/2026');
  });

  it('trả về gạch ngang khi không có ngày', () => {
    expect(dinhDangNgay(null)).toBe('—');
  });

  it('định dạng tiền có phân cách nghìn và đơn vị đồng', () => {
    expect(dinhDangTien(1500000)).toBe('1.500.000 ₫');
  });

  it('trả về gạch ngang khi không có chi phí', () => {
    expect(dinhDangTien(null)).toBe('—');
  });

  it('có nhãn tiếng Việt cho mọi trạng thái', () => {
    expect(Object.keys(NHAN_TRANG_THAI).sort()).toEqual(
      ['ACTIVE', 'EXPIRED', 'EXPIRING', 'REVOKED', 'SUSPENDED'],
    );
    expect(NHAN_TRANG_THAI.EXPIRING).toBe('Sắp hết hạn');
  });
});
```

`apps/web/src/lib/api-client.spec.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiGet, apiPost } from './api-client';

describe('api-client', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('gửi kèm cookie phiên đăng nhập', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ id: 'a1' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await apiGet('/assets/a1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/assets/a1',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('ghép tham số truy vấn và bỏ qua giá trị rỗng', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    await apiGet('/assets', { search: 'cks', status: '', page: 2 });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/assets?search=cks&page=2');
  });

  it('ném ApiError mang thông điệp tiếng Việt từ máy chủ', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 400,
      json: async () => ({
        statusCode: 400, message: 'Dữ liệu nhập vào không hợp lệ',
        code: 'ATTRIBUTE_INVALID',
        details: [{ field: 'serial', message: 'Vui lòng nhập Số serial' }],
      }),
    }));
    await expect(apiPost('/assets', {})).rejects.toMatchObject({
      message: 'Dữ liệu nhập vào không hợp lệ',
      statusCode: 400,
      code: 'ATTRIBUTE_INVALID',
    });
  });

  it('ném ApiError có thông điệp mặc định khi máy chủ không trả JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 502,
      json: async () => { throw new Error('không phải JSON'); },
    }));
    const loi = await apiGet('/assets').catch((e) => e as ApiError);
    expect(loi.message).toBe('Không kết nối được máy chủ. Vui lòng thử lại.');
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận nó thất bại**

Run: `cd apps/web && npx vitest run src/lib`
Expected: FAIL — không tìm thấy module `./format` và `./api-client`

- [ ] **Step 4: Viết api-client.ts và format.ts**

```typescript
// apps/web/src/lib/api-client.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string | null = null,
    public readonly details: unknown = null,
  ) {
    super(message);
  }
}

const LOI_MANG = 'Không kết nối được máy chủ. Vui lòng thử lại.';

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = `/api${path}`;
  if (!params) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qs.append(k, String(v));
  }
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

async function xuLy<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  try {
    const body = await res.json();
    throw new ApiError(
      body.message ?? LOI_MANG, res.status, body.code ?? null, body.details ?? null,
    );
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(LOI_MANG, res.status);
  }
}

export async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  return xuLy<T>(await fetch(buildUrl(path, params), { credentials: 'include' }));
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return xuLy<T>(
    await fetch(buildUrl(path), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
  );
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return xuLy<T>(
    await fetch(buildUrl(path), {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return xuLy<T>(
    await fetch(buildUrl(path), { method: 'POST', credentials: 'include', body: form }),
  );
}

export function apiDownload(path: string, params?: Record<string, unknown>): void {
  window.location.href = buildUrl(path, params);
}
```

```typescript
// apps/web/src/lib/format.ts
export const NHAN_TRANG_THAI = {
  ACTIVE: 'Đang hiệu lực',
  EXPIRING: 'Sắp hết hạn',
  EXPIRED: 'Đã hết hạn',
  REVOKED: 'Đã thu hồi',
  SUSPENDED: 'Tạm ngưng',
} as const;

export function dinhDangNgay(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export function dinhDangTien(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return `${v.toLocaleString('vi-VN')} ₫`;
}
```

- [ ] **Step 5: Chạy test để xác nhận nó qua**

Run: `cd apps/web && npx vitest run src/lib`
Expected: PASS — 8 test qua.

- [ ] **Step 6: Viết trang đăng nhập, useAuth, AppLayout và router**

`useAuth` dùng TanStack Query gọi `GET /api/auth/me`; khi lỗi 401 thì `user` là `null`. `LoginPage` là form hai trường với thông điệp lỗi tiếng Việt hiển thị ngay dưới nút Đăng nhập.

`AppLayout` gồm thanh bên trái với các mục: Bảng điều khiển, Sổ tài sản, Nhân sự, Đơn vị, Loại tài sản. Mục Đơn vị và Loại tài sản chỉ hiện với `IT_ADMIN`. Thanh trên cùng hiển thị tên người dùng, tên đơn vị và nút Đăng xuất.

`RequireRole` đọc `user.role`, chuyển hướng về `/` kèm thông báo nếu không đủ quyền. Đây là lớp trải nghiệm người dùng, không phải lớp bảo mật — backend mới là nơi chặn thật.

Router: `/dang-nhap` công khai; các đường dẫn còn lại bọc trong `AppLayout` và yêu cầu đăng nhập: `/` (dashboard), `/tai-san`, `/tai-san/:id`, `/nhan-su`, `/nhan-su/:id`, `/don-vi`, `/loai-tai-san`.

- [ ] **Step 7: Kiểm thử thủ công**

Chạy `npm run dev` ở cả `apps/api` và `apps/web`, mở `http://localhost:5173`, đăng nhập sai để thấy thông điệp tiếng Việt, đăng nhập đúng để vào được bố cục chính.

- [ ] **Step 8: Commit**

```bash
cd apps/web && npx vitest run && cd ../.. && git add -A
git commit -m "feat: khung frontend, đăng nhập và bố cục chung"
```

---

## Task 12: Giao diện quản lý đơn vị và nhân sự

**Files:**
- Create: `apps/web/src/features/org-units/OrgUnitsPage.tsx`, `OrgUnitTree.tsx`, `OrgUnitFormDialog.tsx`
- Create: `apps/web/src/features/employees/EmployeesPage.tsx`, `EmployeeDetailPage.tsx`, `EmployeeFormDialog.tsx`
- Create: `apps/web/src/features/employees/EmployeeImportDialog.tsx`
- Create: `apps/web/src/components/ImportPreviewTable.tsx`
- Create: `apps/web/src/components/DataTable.tsx`
- Test: `apps/web/src/components/ImportPreviewTable.spec.tsx`

**Interfaces:**
- Consumes: `apiGet`, `apiPost`, `apiPatch`, `apiUpload` (Task 11); API `/api/org-units`, `/api/org-units/tree`, `/api/employees`, `/api/employees/import/preview`, `/api/employees/import/commit` (Task 3, Task 5).
- Produces:
  - `<DataTable columns={Column<T>[]} rows={T[]} loading empty />` với `type Column<T> = { key: string; label: string; render?: (row: T) => ReactNode; width?: string }` — dùng lại ở Task 14.
  - `<ImportPreviewTable preview={ImportPreview} onConfirm={() => void} onCancel={() => void} />` — dùng lại ở Task 15.

- [ ] **Step 1: Viết test cho ImportPreviewTable**

`apps/web/src/components/ImportPreviewTable.spec.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ImportPreviewTable } from './ImportPreviewTable';

const preview = {
  totalRows: 3,
  validRows: [{ code: 'CB001' }, { code: 'CB002' }],
  errors: [{ rowNumber: 4, field: 'fullName', message: 'Thiếu họ và tên' }],
};

describe('ImportPreviewTable', () => {
  it('hiển thị số dòng hợp lệ và số dòng lỗi', () => {
    render(<ImportPreviewTable preview={preview} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/2 dòng hợp lệ/)).toBeInTheDocument();
    expect(screen.getByText(/1 dòng lỗi/)).toBeInTheDocument();
  });

  it('liệt kê lỗi kèm số dòng trong file', () => {
    render(<ImportPreviewTable preview={preview} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/Dòng 4/)).toBeInTheDocument();
    expect(screen.getByText(/Thiếu họ và tên/)).toBeInTheDocument();
  });

  it('nút xác nhận ghi rõ số dòng sẽ được nhập', () => {
    render(<ImportPreviewTable preview={preview} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Nhập 2 dòng hợp lệ/ })).toBeEnabled();
  });

  it('vô hiệu hóa nút xác nhận khi không có dòng nào hợp lệ', () => {
    render(
      <ImportPreviewTable
        preview={{ totalRows: 1, validRows: [], errors: preview.errors }}
        onConfirm={vi.fn()} onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /Nhập/ })).toBeDisabled();
  });

  it('gọi onConfirm khi bấm xác nhận', () => {
    const onConfirm = vi.fn();
    render(<ImportPreviewTable preview={preview} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Nhập 2 dòng hợp lệ/ }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `cd apps/web && npx vitest run src/components/ImportPreviewTable`
Expected: FAIL — không tìm thấy module `./ImportPreviewTable`

- [ ] **Step 3: Viết ImportPreviewTable và DataTable**

`ImportPreviewTable` hiển thị hai khối: dòng tóm tắt `"Đã đọc {totalRows} dòng: {validRows.length} dòng hợp lệ, {errors.length} dòng lỗi"`, bảng liệt kê lỗi (cột "Dòng {rowNumber}", "Trường", "Lỗi"), và hai nút. Nút xác nhận có nhãn `Nhập {validRows.length} dòng hợp lệ`, `disabled` khi `validRows.length === 0`.

`DataTable` là bảng chung: nhận `columns` và `rows`, hiển thị trạng thái đang tải bằng khung xám, và thông điệp `Chưa có dữ liệu` khi rỗng.

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `cd apps/web && npx vitest run src/components/ImportPreviewTable`
Expected: PASS — 5 test qua.

- [ ] **Step 5: Viết trang đơn vị**

`OrgUnitsPage` gọi `GET /api/org-units/tree`, vẽ cây lồng nhau bằng `OrgUnitTree` đệ quy (thụt lề theo cấp, mỗi nút có nút sửa và xóa cho `IT_ADMIN`). `OrgUnitFormDialog` là hộp thoại thêm/sửa với các trường mã, tên, loại đơn vị (danh sách chọn Cơ quan / Phòng ban / Chi nhánh) và đơn vị cha (danh sách phẳng). Lỗi từ `ApiError` hiển thị trong hộp thoại, đặc biệt là hai thông điệp chống vòng lặp cây từ Task 3.

- [ ] **Step 6: Viết trang nhân sự**

`EmployeesPage` gồm ô tìm kiếm, bộ lọc đơn vị, bảng `DataTable` (mã, họ tên, chức vụ, đơn vị, email, điện thoại), nút Thêm cán bộ và nút Nhập từ Excel.

`EmployeeDetailPage` hiển thị thông tin cán bộ và bảng tài sản người đó đang giữ — mỗi dòng có mã, tên, loại, ngày hết hạn và trạng thái. Đây là màn hình dùng khi cán bộ nghỉ việc.

`EmployeeImportDialog` ba bước: chọn file → gọi `POST /api/employees/import/preview` → hiện `ImportPreviewTable` → bấm xác nhận thì gọi `POST /api/employees/import/commit` với `preview.validRows`.

- [ ] **Step 7: Commit**

```bash
cd apps/web && npx vitest run && cd ../.. && git add -A
git commit -m "feat: giao diện quản lý đơn vị và nhân sự kèm nhập Excel"
```

---

## Task 13: Giao diện danh mục loại tài sản và trình dựng trường tùy biến

**Files:**
- Create: `apps/web/src/features/asset-types/AssetTypesPage.tsx`, `AssetTypeFormDialog.tsx`, `FieldSchemaBuilder.tsx`
- Create: `apps/web/src/components/DynamicFieldInput.tsx`
- Test: `apps/web/src/features/asset-types/FieldSchemaBuilder.spec.tsx`

**Interfaces:**
- Consumes: API `/api/asset-types` (Task 6); kiểu `FieldDef` sao chép sang `apps/web/src/features/asset-types/types.ts` với đúng tên trường như backend: `{ key, label, type, required?, options? }`.
- Produces:
  - `<FieldSchemaBuilder value={FieldDef[]} onChange={(v: FieldDef[]) => void} />`
  - `<DynamicFieldInput field={FieldDef} value={unknown} onChange={(v: unknown) => void} error={string | null} />` — dùng lại ở Task 14.

- [ ] **Step 1: Viết test cho FieldSchemaBuilder**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FieldSchemaBuilder } from './FieldSchemaBuilder';

describe('FieldSchemaBuilder', () => {
  it('thêm một trường mới với kiểu mặc định là văn bản', () => {
    const onChange = vi.fn();
    render(<FieldSchemaBuilder value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Thêm trường/ }));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'text', required: false }),
    ]);
  });

  it('tự sinh khóa từ nhãn tiếng Việt có dấu', () => {
    const onChange = vi.fn();
    render(
      <FieldSchemaBuilder
        value={[{ key: '', label: '', type: 'text', required: false }]}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Nhãn hiển thị/), {
      target: { value: 'Nhà cung cấp CA' },
    });
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ key: 'nha_cung_cap_ca', label: 'Nhà cung cấp CA' }),
    ]);
  });

  it('hiện ô nhập danh sách lựa chọn khi chọn kiểu danh sách', () => {
    render(
      <FieldSchemaBuilder
        value={[{ key: 'a', label: 'A', type: 'select', options: [], required: false }]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/Các lựa chọn/)).toBeInTheDocument();
  });

  it('không hiện ô lựa chọn với kiểu văn bản', () => {
    render(
      <FieldSchemaBuilder
        value={[{ key: 'a', label: 'A', type: 'text', required: false }]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/Các lựa chọn/)).not.toBeInTheDocument();
  });

  it('cảnh báo ngay khi hai trường trùng khóa', () => {
    render(
      <FieldSchemaBuilder
        value={[
          { key: 'a', label: 'A', type: 'text', required: false },
          { key: 'a', label: 'B', type: 'text', required: false },
        ]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Khóa trường bị trùng/)).toBeInTheDocument();
  });

  it('xóa được một trường', () => {
    const onChange = vi.fn();
    render(
      <FieldSchemaBuilder
        value={[
          { key: 'a', label: 'A', type: 'text', required: false },
          { key: 'b', label: 'B', type: 'text', required: false },
        ]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: /Xóa trường/ })[0]);
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ key: 'b' }),
    ]);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `cd apps/web && npx vitest run src/features/asset-types`
Expected: FAIL — không tìm thấy module `./FieldSchemaBuilder`

- [ ] **Step 3: Viết hàm sinh khóa và FieldSchemaBuilder**

Hàm sinh khóa bỏ dấu tiếng Việt rồi chuyển sang `snake_case`:

```typescript
export function sinhKhoa(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
```

`FieldSchemaBuilder` hiển thị danh sách trường, mỗi dòng gồm: nhãn hiển thị, danh sách chọn kiểu (Văn bản / Văn bản dài / Số / Ngày / Danh sách / Ô đánh dấu), ô đánh dấu Bắt buộc, ô nhập các lựa chọn (chỉ với kiểu danh sách, nhập cách nhau bằng dấu phẩy), và nút Xóa trường. Khóa được sinh tự động từ nhãn nhưng sửa tay được; nếu trùng thì hiện cảnh báo `Khóa trường bị trùng` ngay dưới ô.

`DynamicFieldInput` ánh xạ `FieldDef.type` sang thành phần nhập liệu tương ứng, hiển thị dấu sao đỏ khi `required`, và hiện `error` bằng chữ đỏ bên dưới.

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `cd apps/web && npx vitest run src/features/asset-types`
Expected: PASS — 6 test qua.

- [ ] **Step 5: Viết AssetTypesPage**

Bảng liệt kê các loại tài sản (mã, tên, có hạn sử dụng hay không, số trường tùy biến, trạng thái). `AssetTypeFormDialog` gồm mã, tên, ô đánh dấu Có ngày hết hạn, và `FieldSchemaBuilder`. Trang này chỉ `IT_ADMIN` vào được, bọc bằng `RequireRole`.

- [ ] **Step 6: Commit**

```bash
cd apps/web && npx vitest run && cd ../.. && git add -A
git commit -m "feat: giao diện danh mục loại tài sản và trình dựng trường tùy biến"
```

---

## Task 14: Giao diện sổ tài sản

**Files:**
- Create: `apps/web/src/features/assets/AssetsPage.tsx`, `AssetFilters.tsx`, `AssetFormDialog.tsx`, `AssetDetailPage.tsx`, `AssetHistoryList.tsx`, `StatusBadge.tsx`
- Test: `apps/web/src/features/assets/StatusBadge.spec.tsx`, `apps/web/src/features/assets/AssetFormDialog.spec.tsx`

**Interfaces:**
- Consumes: `DataTable` (Task 12), `DynamicFieldInput` (Task 13), `apiGet`/`apiPost`/`apiPatch` (Task 11), `NHAN_TRANG_THAI`/`dinhDangNgay`/`dinhDangTien` (Task 11); API `/api/assets` (Task 7, Task 8).
- Produces: `<StatusBadge status={AssetStatus} />`.

- [ ] **Step 1: Viết test**

```tsx
// StatusBadge.spec.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('hiển thị nhãn tiếng Việt', () => {
    render(<StatusBadge status="EXPIRING" />);
    expect(screen.getByText('Sắp hết hạn')).toBeInTheDocument();
  });

  it('dùng màu cảnh báo cho sắp hết hạn và màu đỏ cho đã hết hạn', () => {
    const { rerender } = render(<StatusBadge status="EXPIRING" />);
    expect(screen.getByText('Sắp hết hạn').className).toMatch(/amber/);
    rerender(<StatusBadge status="EXPIRED" />);
    expect(screen.getByText('Đã hết hạn').className).toMatch(/red/);
  });

  it('kèm chữ mô tả trạng thái cho trình đọc màn hình', () => {
    render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByText('Đang hiệu lực')).toHaveAttribute('title', 'Đang hiệu lực');
  });
});
```

```tsx
// AssetFormDialog.spec.tsx — kiểm tra biểu mẫu sinh động theo loại tài sản
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssetFormDialog } from './AssetFormDialog';

const loaiCKS = {
  id: 'loai-cks', name: 'Chữ ký số', hasExpiry: true,
  fieldSchema: [
    { key: 'ca_provider', label: 'Nhà cung cấp CA', type: 'select',
      options: ['Viettel-CA', 'VNPT-CA'], required: true },
    { key: 'serial', label: 'Số serial', type: 'text', required: false },
  ],
};
const loaiPM = {
  id: 'loai-pm', name: 'Phần mềm bản quyền', hasExpiry: false,
  fieldSchema: [{ key: 'so_license', label: 'Số license', type: 'text', required: true }],
};

describe('AssetFormDialog', () => {
  it('hiển thị các trường riêng của loại tài sản đang chọn', () => {
    render(
      <AssetFormDialog open assetTypes={[loaiCKS, loaiPM]} selectedTypeId="loai-cks"
        onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    expect(screen.getByLabelText(/Nhà cung cấp CA/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Số serial/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Số license/)).not.toBeInTheDocument();
  });

  it('đổi loại tài sản thì đổi luôn bộ trường hiển thị', () => {
    const { rerender } = render(
      <AssetFormDialog open assetTypes={[loaiCKS, loaiPM]} selectedTypeId="loai-cks"
        onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    rerender(
      <AssetFormDialog open assetTypes={[loaiCKS, loaiPM]} selectedTypeId="loai-pm"
        onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    expect(screen.getByLabelText(/Số license/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nhà cung cấp CA/)).not.toBeInTheDocument();
  });

  it('ẩn ô ngày hết hạn với loại tài sản không có hạn sử dụng', () => {
    render(
      <AssetFormDialog open assetTypes={[loaiCKS, loaiPM]} selectedTypeId="loai-pm"
        onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    expect(screen.queryByLabelText(/Ngày hết hạn/)).not.toBeInTheDocument();
  });

  it('không cho người dùng chọn trạng thái vì hệ thống tự tính', () => {
    render(
      <AssetFormDialog open assetTypes={[loaiCKS, loaiPM]} selectedTypeId="loai-cks"
        onClose={vi.fn()} onSaved={vi.fn()} />,
    );
    expect(screen.queryByLabelText(/Trạng thái/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `cd apps/web && npx vitest run src/features/assets`
Expected: FAIL — không tìm thấy `./StatusBadge` và `./AssetFormDialog`

- [ ] **Step 3: Viết StatusBadge và AssetFormDialog**

`StatusBadge` ánh xạ trạng thái sang lớp màu Tailwind: `ACTIVE` xanh lá, `EXPIRING` hổ phách (`amber`), `EXPIRED` đỏ, `REVOKED` xám, `SUSPENDED` xanh dương. Kèm thuộc tính `title` để trình đọc màn hình đọc được, vì màu sắc một mình không truyền đạt được thông tin cho người dùng khiếm thị màu.

`AssetFormDialog` gồm phần trường chung (loại tài sản, mã, tên, đơn vị, người giữ, nhà cung cấp, ngày cấp, ngày hết hạn nếu `hasExpiry`, chi phí, ghi chú) và phần trường riêng sinh từ `fieldSchema` của loại đang chọn bằng `DynamicFieldInput`. Không có ô chọn trạng thái. Khi API trả `ApiError` có `code === 'ATTRIBUTE_INVALID'`, đọc `details` (mảng `{ field, message }`) và gắn lỗi vào đúng ô nhập tương ứng.

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `cd apps/web && npx vitest run src/features/assets`
Expected: PASS — 7 test qua.

- [ ] **Step 5: Viết AssetsPage và AssetDetailPage**

`AssetFilters`: ô tìm kiếm, danh sách chọn loại tài sản, danh sách chọn đơn vị, danh sách chọn trạng thái, và nút nhanh "Sắp hết hạn trong 30 ngày". Mọi bộ lọc đồng bộ vào query string của URL để người dùng gửi được đường dẫn kèm bộ lọc cho đồng nghiệp.

`AssetsPage`: `DataTable` với các cột mã, tên, loại, đơn vị, người giữ, ngày hết hạn, trạng thái (`StatusBadge`); phân trang; nút Thêm tài sản, nút Xuất Excel (gọi `apiDownload('/assets/export', filters)`), nút Nhập từ Excel (Task 15).

`AssetDetailPage`: thông tin chung, bảng trường riêng theo loại, và `AssetHistoryList` hiển thị nhật ký theo thứ tự mới nhất trước — mỗi mục ghi rõ hành động (Tạo mới / Cập nhật / Thu hồi / Bàn giao / Nhập từ Excel), thời điểm, người thực hiện, và với hành động cập nhật thì liệt kê từng trường đã đổi theo dạng `Tên tài sản: "Tên cũ" → "Tên mới"`. Có nút Thu hồi mở hộp thoại nhập lý do rồi gọi `POST /api/assets/:id/revoke`.

- [ ] **Step 6: Commit**

```bash
cd apps/web && npx vitest run && cd ../.. && git add -A
git commit -m "feat: giao diện sổ tài sản với biểu mẫu động và nhật ký thay đổi"
```

---

## Task 15: Giao diện nhập tài sản từ Excel

**Files:**
- Create: `apps/web/src/features/assets/AssetImportDialog.tsx`
- Test: `apps/web/src/features/assets/AssetImportDialog.spec.tsx`

**Interfaces:**
- Consumes: `ImportPreviewTable` (Task 12), `apiUpload`/`apiPost`/`apiDownload` (Task 11); API `/api/assets/import/template`, `/import/preview`, `/import/commit` (Task 9).
- Produces: không có thành phần dùng lại.

- [ ] **Step 1: Viết test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AssetImportDialog } from './AssetImportDialog';
import * as api from '../../lib/api-client';

const loai = [{ id: 'loai-cks', name: 'Chữ ký số', hasExpiry: true, fieldSchema: [] }];

describe('AssetImportDialog', () => {
  it('bắt buộc chọn loại tài sản trước khi cho tải file lên', () => {
    render(<AssetImportDialog open assetTypes={loai} onClose={vi.fn()} onImported={vi.fn()} />);
    expect(screen.getByLabelText(/Chọn file Excel/)).toBeDisabled();
  });

  it('cho tải file mẫu của loại tài sản đang chọn', () => {
    const download = vi.spyOn(api, 'apiDownload').mockImplementation(() => {});
    render(
      <AssetImportDialog open assetTypes={loai} defaultTypeId="loai-cks"
        onClose={vi.fn()} onImported={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Tải file mẫu/ }));
    expect(download).toHaveBeenCalledWith('/assets/import/template', {
      assetTypeId: 'loai-cks',
    });
  });

  it('hiển thị bảng xem trước sau khi tải file lên', async () => {
    vi.spyOn(api, 'apiUpload').mockResolvedValue({
      totalRows: 2, validRows: [{ code: 'CKS-001' }],
      errors: [{ rowNumber: 3, field: 'code', message: 'Thiếu mã tài sản' }],
    } as never);
    render(
      <AssetImportDialog open assetTypes={loai} defaultTypeId="loai-cks"
        onClose={vi.fn()} onImported={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText(/Chọn file Excel/), {
      target: { files: [new File(['x'], 'ts.xlsx')] },
    });
    await waitFor(() => {
      expect(screen.getByText(/1 dòng hợp lệ/)).toBeInTheDocument();
      expect(screen.getByText(/Thiếu mã tài sản/)).toBeInTheDocument();
    });
  });

  it('hiển thị lỗi tiếng Việt khi file thiếu cột bắt buộc', async () => {
    vi.spyOn(api, 'apiUpload').mockRejectedValue(
      new api.ApiError('File thiếu các cột bắt buộc: Mã đơn vị', 400),
    );
    render(
      <AssetImportDialog open assetTypes={loai} defaultTypeId="loai-cks"
        onClose={vi.fn()} onImported={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText(/Chọn file Excel/), {
      target: { files: [new File(['x'], 'ts.xlsx')] },
    });
    await waitFor(() => {
      expect(screen.getByText(/File thiếu các cột bắt buộc: Mã đơn vị/)).toBeInTheDocument();
    });
  });

  it('gửi đúng các dòng hợp lệ khi xác nhận nhập', async () => {
    vi.spyOn(api, 'apiUpload').mockResolvedValue({
      totalRows: 1, validRows: [{ code: 'CKS-001' }], errors: [],
    } as never);
    const post = vi.spyOn(api, 'apiPost').mockResolvedValue({ imported: 1 } as never);
    const onImported = vi.fn();
    render(
      <AssetImportDialog open assetTypes={loai} defaultTypeId="loai-cks"
        onClose={vi.fn()} onImported={onImported} />,
    );
    fireEvent.change(screen.getByLabelText(/Chọn file Excel/), {
      target: { files: [new File(['x'], 'ts.xlsx')] },
    });
    await waitFor(() => screen.getByRole('button', { name: /Nhập 1 dòng hợp lệ/ }));
    fireEvent.click(screen.getByRole('button', { name: /Nhập 1 dòng hợp lệ/ }));
    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/assets/import/commit', {
        rows: [{ code: 'CKS-001' }],
      });
      expect(onImported).toHaveBeenCalledWith(1);
    });
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `cd apps/web && npx vitest run src/features/assets/AssetImportDialog`
Expected: FAIL — không tìm thấy module `./AssetImportDialog`

- [ ] **Step 3: Viết AssetImportDialog**

Bốn bước trong một hộp thoại: chọn loại tài sản → tải file mẫu (tùy chọn) → chọn file và xem trước → xác nhận. Ô chọn file `disabled` cho tới khi có `assetTypeId`. Lỗi cấp file (thiếu cột) hiển thị nguyên văn thông điệp từ `ApiError`. Sau khi nhập thành công hiện thông báo `Đã nhập thành công {n} tài sản` và gọi `onImported(n)` để trang cha tải lại danh sách.

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `cd apps/web && npx vitest run src/features/assets/AssetImportDialog`
Expected: PASS — 5 test qua.

- [ ] **Step 5: Commit**

```bash
cd apps/web && npx vitest run && cd ../.. && git add -A
git commit -m "feat: giao diện nhập tài sản từ Excel có xem trước và báo lỗi"
```

---

## Task 16: Giao diện dashboard

**BẮT BUỘC trước khi viết mã biểu đồ:** nạp skill `dataviz` bằng công cụ Skill. Skill này quy định bảng màu, dạng biểu đồ, thẻ chỉ số và quy tắc tương tác; viết biểu đồ mà không nạp nó sẽ cho ra bốn khối trông rời rạc như của bốn phần mềm khác nhau.

**Files:**
- Create: `apps/web/src/features/dashboard/DashboardPage.tsx`, `StatCard.tsx`, `AssetTypeFilter.tsx`, `AssetTypeStatBlock.tsx`, `TypeStatusMatrix.tsx`, `AssetTypePieChart.tsx`, `OrgUnitBarChart.tsx`, `ExpiryLineChart.tsx`, `ExpiringTable.tsx`
- Test: `apps/web/src/features/dashboard/StatCard.spec.tsx`, `ExpiringTable.spec.tsx`, `TypeStatusMatrix.spec.tsx`, `AssetTypeStatBlock.spec.tsx`

**Interfaces:**
- Consumes: `apiGet` (Task 11), `StatusBadge` (Task 14), `dinhDangNgay` (Task 11); API `GET /api/dashboard/summary?assetTypeId=` trả `DashboardSummary` (Task 10).
- Produces: không có thành phần dùng lại ngoài dashboard.

**Bố cục trang từ trên xuống:** bộ lọc loại tài sản → hàng bốn thẻ chỉ số tổng → dải khối chỉ số theo từng loại → bảng loại × trạng thái → lưới ba biểu đồ → bảng cần xử lý.

- [ ] **Step 1: Viết test**

```tsx
// StatCard.spec.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('hiển thị nhãn và giá trị có phân cách nghìn', () => {
    render(<StatCard label="Tổng tài sản" value={1234} tone="neutral" />);
    expect(screen.getByText('Tổng tài sản')).toBeInTheDocument();
    expect(screen.getByText('1.234')).toBeInTheDocument();
  });

  it('hiển thị số 0 thay vì để trống', () => {
    render(<StatCard label="Sắp hết hạn" value={0} tone="warning" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
```

```tsx
// ExpiringTable.spec.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExpiringTable } from './ExpiringTable';

const rows = [
  { id: 'a1', code: 'CKS-001', name: 'CKS Nguyễn Văn A', donVi: 'Phòng A',
    nguoiGiu: 'Nguyễn Văn A', expiryDate: '2026-08-14T00:00:00.000Z', soNgayConLai: 10 },
  { id: 'a2', code: 'CKS-002', name: 'CKS B', donVi: 'Phòng B',
    nguoiGiu: null, expiryDate: '2026-08-01T00:00:00.000Z', soNgayConLai: -3 },
];

describe('ExpiringTable', () => {
  it('hiển thị số ngày còn lại dạng chữ', () => {
    render(<MemoryRouter><ExpiringTable rows={rows} /></MemoryRouter>);
    expect(screen.getByText('Còn 10 ngày')).toBeInTheDocument();
  });

  it('hiển thị rõ khi đã quá hạn thay vì số ngày âm', () => {
    render(<MemoryRouter><ExpiringTable rows={rows} /></MemoryRouter>);
    expect(screen.getByText('Đã quá hạn 3 ngày')).toBeInTheDocument();
    expect(screen.queryByText(/-3/)).not.toBeInTheDocument();
  });

  it('hiển thị gạch ngang khi tài sản chưa gán người giữ', () => {
    render(<MemoryRouter><ExpiringTable rows={rows} /></MemoryRouter>);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('mỗi dòng liên kết tới trang chi tiết tài sản', () => {
    render(<MemoryRouter><ExpiringTable rows={rows} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /CKS-001/ })).toHaveAttribute(
      'href', '/tai-san/a1',
    );
  });

  it('hiển thị thông điệp khi không có tài sản nào sắp hết hạn', () => {
    render(<MemoryRouter><ExpiringTable rows={[]} /></MemoryRouter>);
    expect(
      screen.getByText('Không có tài sản nào sắp hết hạn'),
    ).toBeInTheDocument();
  });
});
```

```tsx
// AssetTypeStatBlock.spec.tsx — khối chỉ số của một loại tài sản
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AssetTypeStatBlock } from './AssetTypeStatBlock';

const cks = {
  assetTypeId: 'loai-cks', ten: 'Chữ ký số',
  tong: 142, dangHieuLuc: 118, sapHetHan: 19, daHetHan: 5, daThuHoi: 12, tamNgung: 0,
};

describe('AssetTypeStatBlock', () => {
  it('hiển thị tên loại và bốn chỉ số của riêng loại đó', () => {
    render(<AssetTypeStatBlock data={cks} onSelect={vi.fn()} />);
    expect(screen.getByText('Chữ ký số')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
    expect(screen.getByText('118')).toBeInTheDocument();
    expect(screen.getByText('19')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('làm nổi chỉ số sắp hết hạn khi lớn hơn 0', () => {
    render(<AssetTypeStatBlock data={cks} onSelect={vi.fn()} />);
    expect(screen.getByText('19').className).toMatch(/amber/);
  });

  it('không làm nổi khi không có tài sản nào sắp hết hạn', () => {
    render(
      <AssetTypeStatBlock data={{ ...cks, sapHetHan: 0 }} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('0').className).not.toMatch(/amber/);
  });

  it('loại chưa có bản ghi nào vẫn hiện kèm lời nhắc', () => {
    render(
      <AssetTypeStatBlock
        data={{ assetTypeId: 'loai-domain', ten: 'Tên miền', tong: 0,
          dangHieuLuc: 0, sapHetHan: 0, daHetHan: 0, daThuHoi: 0, tamNgung: 0 }}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('Tên miền')).toBeInTheDocument();
    expect(screen.getByText('Chưa có tài sản nào')).toBeInTheDocument();
  });

  it('bấm vào khối thì lọc dashboard theo loại đó', () => {
    const onSelect = vi.fn();
    render(<AssetTypeStatBlock data={cks} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Chữ ký số/ }));
    expect(onSelect).toHaveBeenCalledWith('loai-cks');
  });
});
```

```tsx
// TypeStatusMatrix.spec.tsx — bảng loại × trạng thái
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { TypeStatusMatrix } from './TypeStatusMatrix';

const rows = [
  { assetTypeId: 'loai-cks', ten: 'Chữ ký số', tong: 142,
    dangHieuLuc: 118, sapHetHan: 19, daHetHan: 5, daThuHoi: 12, tamNgung: 0 },
  { assetTypeId: 'loai-pm', ten: 'Phần mềm bản quyền', tong: 87,
    dangHieuLuc: 74, sapHetHan: 9, daHetHan: 4, daThuHoi: 3, tamNgung: 1 },
];

describe('TypeStatusMatrix', () => {
  it('mỗi loại một dòng với đủ các cột trạng thái', () => {
    render(<TypeStatusMatrix rows={rows} />);
    const dong = screen.getByRole('row', { name: /Chữ ký số/ });
    expect(within(dong).getByText('142')).toBeInTheDocument();
    expect(within(dong).getByText('118')).toBeInTheDocument();
    expect(within(dong).getByText('19')).toBeInTheDocument();
  });

  it('có dòng tổng cộng cộng đúng theo từng cột', () => {
    render(<TypeStatusMatrix rows={rows} />);
    const tong = screen.getByRole('row', { name: /Tổng cộng/ });
    expect(within(tong).getByText('229')).toBeInTheDocument();
    expect(within(tong).getByText('192')).toBeInTheDocument();
    expect(within(tong).getByText('28')).toBeInTheDocument();
  });

  it('tiêu đề cột dùng nhãn tiếng Việt của trạng thái', () => {
    render(<TypeStatusMatrix rows={rows} />);
    for (const nhan of ['Đang hiệu lực', 'Sắp hết hạn', 'Đã hết hạn', 'Đã thu hồi', 'Tạm ngưng']) {
      expect(screen.getByRole('columnheader', { name: nhan })).toBeInTheDocument();
    }
  });

  it('hiển thị thông điệp khi chưa có loại tài sản nào', () => {
    render(<TypeStatusMatrix rows={[]} />);
    expect(screen.getByText('Chưa có loại tài sản nào')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận nó thất bại**

Run: `cd apps/web && npx vitest run src/features/dashboard`
Expected: FAIL — không tìm thấy `./StatCard`, `./ExpiringTable`, `./AssetTypeStatBlock`, `./TypeStatusMatrix`

- [ ] **Step 3: Viết StatCard và ExpiringTable**

`StatCard` nhận `label`, `value`, `tone` (`'neutral' | 'success' | 'warning' | 'danger'`), hiển thị số đã qua `value.toLocaleString('vi-VN')`.

`ExpiringTable` hiển thị các cột mã (liên kết tới `/tai-san/:id`), tên, đơn vị, người giữ, ngày hết hạn, và cột thời hạn dạng chữ: `Còn {n} ngày` khi `soNgayConLai >= 0`, `Đã quá hạn {|n|} ngày` khi âm. Không bao giờ hiển thị số ngày âm trực tiếp — người dùng đọc "-3 ngày" sẽ phải dừng lại suy nghĩ.

`AssetTypeStatBlock` là một thẻ bấm được (thẻ `<button>` để bàn phím dùng được), tiêu đề là tên loại, bên trong bốn chỉ số Tổng / Đang hiệu lực / Sắp hết hạn / Đã hết hạn. Chỉ số sắp hết hạn tô màu hổ phách khi lớn hơn 0 và để màu thường khi bằng 0 — tô cảnh báo cho số 0 sẽ làm loãng tín hiệu và người dùng dần bỏ qua nó. Loại chưa có bản ghi nào vẫn hiện, kèm dòng chữ nhạt `Chưa có tài sản nào`.

`TypeStatusMatrix` là bảng: cột đầu là tên loại, các cột sau là Tổng, Đang hiệu lực, Sắp hết hạn, Đã hết hạn, Đã thu hồi, Tạm ngưng, và dòng cuối là Tổng cộng. Cột số căn phải để mắt so sánh theo chiều dọc dễ hơn. Bảng dùng thẻ `<table>` thật với `<th scope="col">` — vừa để trình đọc màn hình hiểu, vừa để in ra giấy đúng.

- [ ] **Step 4: Chạy test để xác nhận nó qua**

Run: `cd apps/web && npx vitest run src/features/dashboard`
Expected: PASS — 16 test qua.

- [ ] **Step 5: Viết bộ lọc loại, ba biểu đồ và DashboardPage**

`AssetTypeFilter` là danh sách chọn có mục đầu tiên `Tất cả loại tài sản`, các mục sau lấy từ `GET /api/asset-types`. Giá trị đang chọn đồng bộ vào query string của URL (`/?assetTypeId=...`) để người dùng gửi được đường dẫn kèm bộ lọc cho đồng nghiệp và bấm nút quay lại của trình duyệt vẫn đúng.

Sau khi đã nạp skill `dataviz`, viết ba thành phần Recharts:
- `AssetTypePieChart` — cơ cấu theo loại tài sản, dữ liệu từ `summary.theoLoai`. Khi đang lọc theo một loại, biểu đồ này chỉ còn một lát cắt nên **ẩn nó đi** thay vì vẽ một hình tròn đặc vô nghĩa.
- `OrgUnitBarChart` — số lượng theo đơn vị, dữ liệu từ `summary.theoDonVi`, sắp giảm dần.
- `ExpiryLineChart` — số hết hạn theo 12 tháng tới, dữ liệu từ `summary.hetHanTheoThang`, trục hoành là nhãn `MM/YYYY`.

`DashboardPage` đọc `assetTypeId` từ query string, gọi `GET /api/dashboard/summary` với tham số đó, rồi dựng trang theo thứ tự:

1. `AssetTypeFilter`.
2. Hàng bốn `StatCard` từ `summary.tongQuan`: Tổng tài sản `neutral`, Đang hiệu lực `success`, Sắp hết hạn trong 30 ngày `warning`, Đã hết hạn `danger`.
3. Dải `AssetTypeStatBlock`, một khối cho mỗi phần tử của `summary.theoLoaiChiTiet`, cuộn ngang khi có nhiều loại. Bấm vào một khối thì đặt `assetTypeId` tương ứng vào URL — tức là lọc cả trang theo loại đó. Khi đang lọc, ẩn dải này vì nó chỉ còn đúng một khối trùng lặp với hàng chỉ số phía trên.
4. `TypeStatusMatrix` từ `summary.theoLoaiChiTiet`.
5. Lưới hai cột chứa ba biểu đồ.
6. `ExpiringTable` từ `summary.canXuLy`.

Khi đang lọc theo một loại, hiển thị thẻ bộ lọc đang áp dụng kèm nút xóa (ví dụ `Đang xem: Chữ ký số ✕`) đặt ngay dưới tiêu đề trang. Không có dấu hiệu này, người dùng cuộn xuống giữa trang sẽ quên mất mình đang xem số liệu của một loại chứ không phải toàn bộ.

Với `UNIT_ADMIN`, mọi số liệu chỉ gồm đơn vị mình và đơn vị con — không cần xử lý gì thêm ở frontend vì backend đã lọc sẵn.

- [ ] **Step 6: Kiểm thử thủ công ba vai trò và bộ lọc**

Đăng nhập lần lượt bằng ba tài khoản `IT_ADMIN`, `UNIT_ADMIN`, `LEADER` (tạo ở Task 17) và xác nhận: `UNIT_ADMIN` thấy số liệu nhỏ hơn `IT_ADMIN`; `LEADER` thấy số liệu toàn cơ quan nhưng không có nút Thêm tài sản.

Kiểm tra bộ lọc: chọn "Chữ ký số" và xác nhận **mọi** con số trên trang đều đổi theo — bốn thẻ chỉ số, bảng ma trận, biểu đồ theo đơn vị, biểu đồ hết hạn theo tháng, và bảng cần xử lý. Cộng thủ công các dòng trong bảng ma trận và đối chiếu với bốn thẻ chỉ số phía trên: nếu lệch nghĩa là có chỗ chưa nhận bộ lọc.

- [ ] **Step 7: Commit**

```bash
cd apps/web && npx vitest run && cd ../.. && git add -A
git commit -m "feat: giao diện dashboard thống kê theo từng loại tài sản"
```

---

## Task 17: Dữ liệu khởi tạo, kiểm thử đầu-cuối, triển khai và tài liệu

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Create: `apps/web/e2e/dang-nhap.spec.ts`, `e2e/tai-san.spec.ts`, `e2e/phan-quyen.spec.ts`
- Create: `apps/web/playwright.config.ts`
- Create: `scripts/sao-luu.sh`
- Create: `docs/cai-dat.md`, `docs/huong-dan-su-dung.md`
- Modify: `apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.yml`

**Interfaces:**
- Consumes: toàn bộ các task trước.
- Produces: lệnh `npm run seed` trong `apps/api`; ba tài khoản mẫu để kiểm thử và bàn giao.

- [ ] **Step 1: Viết seed.ts**

Dữ liệu khởi tạo gồm: đơn vị gốc và hai đơn vị con, ba tài khoản một cho mỗi vai trò, hai loại tài sản với `fieldSchema` mặc định.

```typescript
import { OrgUnitType, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SCHEMA_CKS = [
  { key: 'ca_provider', label: 'Nhà cung cấp CA', type: 'select',
    options: ['Viettel-CA', 'VNPT-CA', 'FPT-CA', 'BKAV-CA', 'MISA-CA', 'Khác'],
    required: true },
  { key: 'serial', label: 'Số serial', type: 'text', required: true },
  { key: 'device_type', label: 'Loại thiết bị', type: 'select',
    options: ['USB Token', 'HSM', 'SIM PKI', 'Ký số từ xa'], required: false },
  { key: 'subject', label: 'Chủ thể chứng thư', type: 'text', required: false },
];

const SCHEMA_PHAN_MEM = [
  { key: 'license_key', label: 'Số license', type: 'text', required: true },
  { key: 'so_may', label: 'Số máy được cài', type: 'number', required: false },
  { key: 'hinh_thuc', label: 'Hình thức mua', type: 'select',
    options: ['Mua vĩnh viễn', 'Thuê bao năm', 'Thuê bao tháng', 'Miễn phí'],
    required: true },
  { key: 'phien_ban', label: 'Phiên bản', type: 'text', required: false },
];

async function main() {
  const coQuan = await prisma.orgUnit.upsert({
    where: { code: 'CQ' },
    update: {},
    create: { code: 'CQ', name: 'Cơ quan', type: OrgUnitType.CO_QUAN },
  });
  const phongA = await prisma.orgUnit.upsert({
    where: { code: 'PHC' },
    update: {},
    create: { code: 'PHC', name: 'Phòng Hành chính', type: OrgUnitType.PHONG_BAN,
      parentId: coQuan.id },
  });
  await prisma.orgUnit.upsert({
    where: { code: 'CN1' },
    update: {},
    create: { code: 'CN1', name: 'Chi nhánh 1', type: OrgUnitType.CHI_NHANH,
      parentId: coQuan.id },
  });

  const matKhau = await bcrypt.hash('MatKhau@123', 10);
  const taiKhoan = [
    { username: 'admin', fullName: 'Quản trị hệ thống', role: Role.IT_ADMIN, orgUnitId: coQuan.id },
    { username: 'phc', fullName: 'Admin Phòng Hành chính', role: Role.UNIT_ADMIN, orgUnitId: phongA.id },
    { username: 'lanhdao', fullName: 'Lãnh đạo cơ quan', role: Role.LEADER, orgUnitId: coQuan.id },
  ];
  for (const tk of taiKhoan) {
    await prisma.user.upsert({
      where: { username: tk.username },
      update: {},
      create: { ...tk, passwordHash: matKhau },
    });
  }

  await prisma.assetType.upsert({
    where: { code: 'CKS' },
    update: {},
    create: { code: 'CKS', name: 'Chữ ký số', hasExpiry: true, sortOrder: 1,
      fieldSchema: SCHEMA_CKS as any },
  });
  await prisma.assetType.upsert({
    where: { code: 'PMBQ' },
    update: {},
    create: { code: 'PMBQ', name: 'Phần mềm bản quyền', hasExpiry: true, sortOrder: 2,
      fieldSchema: SCHEMA_PHAN_MEM as any },
  });

  console.log('Đã tạo dữ liệu khởi tạo. Tài khoản: admin / phc / lanhdao, mật khẩu MatKhau@123');
}

main().finally(() => prisma.$disconnect());
```

Dùng `upsert` để chạy lại nhiều lần không sinh dữ liệu trùng. Thêm `"seed": "ts-node prisma/seed.ts"` vào `scripts` và khối `"prisma": { "seed": "ts-node prisma/seed.ts" }` trong `apps/api/package.json`.

- [ ] **Step 2: Chạy seed và xác nhận đăng nhập được**

```bash
cd apps/api && npx prisma db seed
curl -i -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"MatKhau@123"}'
```
Expected: 200 kèm `Set-Cookie: access_token=...; HttpOnly`.

- [ ] **Step 3: Viết kiểm thử Playwright cho luồng đăng nhập**

`apps/web/e2e/dang-nhap.spec.ts`:

```typescript
import { expect, test } from '@playwright/test';

test('báo lỗi tiếng Việt khi sai mật khẩu', async ({ page }) => {
  await page.goto('/dang-nhap');
  await page.getByLabel('Tên đăng nhập').fill('admin');
  await page.getByLabel('Mật khẩu').fill('SaiMatKhau');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(
    page.getByText('Tên đăng nhập hoặc mật khẩu không đúng'),
  ).toBeVisible();
});

test('đăng nhập thành công vào được bảng điều khiển', async ({ page }) => {
  await page.goto('/dang-nhap');
  await page.getByLabel('Tên đăng nhập').fill('admin');
  await page.getByLabel('Mật khẩu').fill('MatKhau@123');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByRole('heading', { name: 'Bảng điều khiển' })).toBeVisible();
  await expect(page.getByText('Quản trị hệ thống')).toBeVisible();
});

test('chưa đăng nhập thì bị chuyển về trang đăng nhập', async ({ page }) => {
  await page.goto('/tai-san');
  await expect(page).toHaveURL(/\/dang-nhap/);
});
```

- [ ] **Step 4: Viết kiểm thử Playwright cho luồng thêm tài sản**

`apps/web/e2e/tai-san.spec.ts`:

```typescript
import { expect, test } from '@playwright/test';

async function dangNhap(page: any, username: string) {
  await page.goto('/dang-nhap');
  await page.getByLabel('Tên đăng nhập').fill(username);
  await page.getByLabel('Mật khẩu').fill('MatKhau@123');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByRole('heading', { name: 'Bảng điều khiển' })).toBeVisible();
}

test('thêm một chữ ký số và thấy nó trong danh sách', async ({ page }) => {
  await dangNhap(page, 'admin');
  await page.getByRole('link', { name: 'Sổ tài sản' }).click();
  await page.getByRole('button', { name: 'Thêm tài sản' }).click();
  await page.getByLabel('Loại tài sản').selectOption({ label: 'Chữ ký số' });
  const ma = `CKS-E2E-${Date.now()}`;
  await page.getByLabel('Mã tài sản').fill(ma);
  await page.getByLabel('Tên tài sản').fill('CKS kiểm thử tự động');
  await page.getByLabel('Đơn vị').selectOption({ label: 'Phòng Hành chính' });
  await page.getByLabel('Nhà cung cấp CA').selectOption('Viettel-CA');
  await page.getByLabel('Số serial').fill('SERIAL-E2E-001');
  await page.getByLabel('Ngày hết hạn').fill('2027-12-31');
  await page.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByText(ma)).toBeVisible();
});

test('không lưu được khi bỏ trống trường bắt buộc của loại tài sản', async ({ page }) => {
  await dangNhap(page, 'admin');
  await page.goto('/tai-san');
  await page.getByRole('button', { name: 'Thêm tài sản' }).click();
  await page.getByLabel('Loại tài sản').selectOption({ label: 'Chữ ký số' });
  await page.getByLabel('Mã tài sản').fill(`CKS-LOI-${Date.now()}`);
  await page.getByLabel('Tên tài sản').fill('Thiếu nhà cung cấp');
  await page.getByLabel('Đơn vị').selectOption({ label: 'Phòng Hành chính' });
  await page.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByText('Vui lòng nhập Nhà cung cấp CA')).toBeVisible();
});

test('tài sản hết hạn hiển thị đúng trạng thái', async ({ page }) => {
  await dangNhap(page, 'admin');
  await page.goto('/tai-san');
  await page.getByRole('button', { name: 'Thêm tài sản' }).click();
  await page.getByLabel('Loại tài sản').selectOption({ label: 'Chữ ký số' });
  const ma = `CKS-HH-${Date.now()}`;
  await page.getByLabel('Mã tài sản').fill(ma);
  await page.getByLabel('Tên tài sản').fill('CKS đã hết hạn');
  await page.getByLabel('Đơn vị').selectOption({ label: 'Phòng Hành chính' });
  await page.getByLabel('Nhà cung cấp CA').selectOption('VNPT-CA');
  await page.getByLabel('Số serial').fill('SERIAL-HH');
  await page.getByLabel('Ngày hết hạn').fill('2020-01-01');
  await page.getByRole('button', { name: 'Lưu' }).click();
  const dong = page.getByRole('row', { name: new RegExp(ma) });
  await expect(dong.getByText('Đã hết hạn')).toBeVisible();
});
```

- [ ] **Step 5: Viết kiểm thử Playwright cho phân quyền**

`apps/web/e2e/phan-quyen.spec.ts`:

```typescript
import { expect, test } from '@playwright/test';

async function dangNhap(page: any, username: string) {
  await page.goto('/dang-nhap');
  await page.getByLabel('Tên đăng nhập').fill(username);
  await page.getByLabel('Mật khẩu').fill('MatKhau@123');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByRole('heading', { name: 'Bảng điều khiển' })).toBeVisible();
}

test('lãnh đạo không thấy nút thêm tài sản', async ({ page }) => {
  await dangNhap(page, 'lanhdao');
  await page.goto('/tai-san');
  await expect(page.getByRole('button', { name: 'Thêm tài sản' })).toHaveCount(0);
});

test('admin đơn vị không thấy mục quản lý đơn vị và loại tài sản', async ({ page }) => {
  await dangNhap(page, 'phc');
  await expect(page.getByRole('link', { name: 'Đơn vị' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Loại tài sản' })).toHaveCount(0);
});

test('API từ chối khi lãnh đạo cố tạo tài sản', async ({ page, request }) => {
  await dangNhap(page, 'lanhdao');
  const res = await request.post('/api/assets', {
    data: { assetTypeId: 'x', code: 'X', name: 'X', orgUnitId: 'y', attributes: {} },
  });
  expect(res.status()).toBe(403);
});
```

Kiểm thử cuối cùng gọi thẳng API chứ không qua giao diện, vì ẩn nút trên giao diện không phải là bảo mật — phải chứng minh backend chặn thật.

- [ ] **Step 6: Chạy toàn bộ kiểm thử đầu-cuối**

```bash
cd apps/web && npx playwright install chromium
docker compose up -d db
(cd ../api && npx prisma migrate deploy && npx prisma db seed && npm run start:dev &)
npx playwright test
```
Expected: 9 test qua.

- [ ] **Step 7: Hoàn thiện Dockerfile và chạy thử toàn bộ hệ thống**

`apps/api/Dockerfile` dựng nhiều tầng: tầng build chạy `npm ci`, `npx prisma generate`, `npm run build`; tầng chạy dùng `node:20-alpine`, sao chép `dist`, `node_modules`, `prisma`, và khởi động bằng `npx prisma migrate deploy && node dist/main.js`.

`apps/web/Dockerfile` dựng bằng `npm run build` rồi phục vụ `dist` bằng `nginx:alpine` với `nginx.conf` có `try_files $uri /index.html;` để định tuyến phía trình duyệt hoạt động khi tải lại trang.

```bash
cp .env.example .env   # sửa mật khẩu và JWT_SECRET trước khi chạy
docker compose up -d --build
docker compose ps
```
Expected: cả bốn dịch vụ ở trạng thái `running`, mở được ứng dụng qua trình duyệt và đăng nhập thành công.

- [ ] **Step 8: Viết script sao lưu**

`scripts/sao-luu.sh` chạy `pg_dump` trong container `db`, nén ra `backup/tkts-YYYYMMDD.sql.gz`, và xóa các bản cũ hơn 30 bản. Thêm dòng crontab mẫu vào tài liệu cài đặt: `0 1 * * * /duong/dan/scripts/sao-luu.sh`.

- [ ] **Step 9: Viết tài liệu tiếng Việt**

`docs/cai-dat.md`: yêu cầu máy chủ (2 nhân, 4 GB RAM, 40 GB đĩa là đủ cho quy mô dưới 20 đơn vị), cài Docker, trỏ tên miền, sao chép và sửa `.env` (nhấn mạnh phải đổi `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET` và đổi mật khẩu ba tài khoản mẫu ngay sau lần đăng nhập đầu), chạy `docker compose up -d`, tạo dữ liệu khởi tạo, thiết lập sao lưu định kỳ, và cách xem log khi có sự cố.

`docs/huong-dan-su-dung.md`: chia theo ba vai trò. Phần IT gồm tạo đơn vị, tạo tài khoản, thêm loại tài sản mới kèm ví dụ thêm loại "Tên miền" để minh họa tính mở rộng. Phần admin đơn vị gồm nhập nhân sự và tài sản từ Excel, thêm sửa tài sản, tra cứu tài sản của một cán bộ. Phần lãnh đạo gồm đọc dashboard và xuất báo cáo Excel.

- [ ] **Step 10: Chạy toàn bộ kiểm thử lần cuối và commit**

```bash
cd apps/api && npx jest && cd ../web && npx vitest run && npx playwright test
cd ../.. && git add -A
git commit -m "feat: dữ liệu khởi tạo, kiểm thử đầu-cuối, triển khai Docker và tài liệu tiếng Việt"
```

Không tuyên bố giai đoạn 1 hoàn thành cho tới khi cả ba lệnh trên đều xanh và `docker compose up -d --build` chạy được từ máy sạch.

---

## Đối chiếu với spec

| Yêu cầu trong spec (giai đoạn 1) | Task |
|---|---|
| Kiến trúc bốn container, Caddy, HTTPS | 1, 17 |
| JWT trong cookie httpOnly, refresh token | 2 |
| Lỗi thống nhất, 403 vai trò / 404 ngoài phạm vi | 2, 4 |
| Cây đơn vị tự tham chiếu | 3 |
| `buildScopeFilter` tập trung một chỗ | 4 |
| Danh mục nhân sự, nhập Excel | 5, 12 |
| Danh mục loại tài sản với `fieldSchema` | 6, 13 |
| Sổ tài sản, kiểm tra `attributes`, tính trạng thái | 7, 14 |
| Nhật ký thay đổi trong cùng transaction | 7, 14 |
| Lọc, tìm kiếm, phân trang, xuất Excel | 8, 14 |
| Nhập tài sản từ Excel có xem trước, ghi nguyên tử | 9, 15 |
| Dashboard bốn chỉ số, ba biểu đồ, bảng cần xử lý | 10, 16 |
| Dữ liệu tự lọc theo vai trò trên dashboard | 10, 16 |
| Kiểm thử phạm vi dữ liệu, mốc biên hết hạn, nhập Excel | 4, 7, 9 |
| Kiểm thử Playwright các luồng chính | 17 |
| Dữ liệu khởi tạo, sao lưu, tài liệu tiếng Việt | 17 |

Các mục thuộc giai đoạn 2 và 3 (ticket, cảnh báo hết hạn tự động, thông báo, báo cáo Word/PDF, hồ sơ đính kèm, biên bản bàn giao) **không** nằm trong kế hoạch này và sẽ có kế hoạch riêng.

