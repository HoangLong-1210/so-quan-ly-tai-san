# CLAUDE.md — Quy ước mã nguồn dự án Sổ thống kê tài sản số

Tài liệu này ràng buộc mọi người và mọi agent viết mã trong repo. Khi tài liệu này mâu thuẫn với mã mẫu trong kế hoạch triển khai, **tài liệu này thắng** — mã mẫu trong kế hoạch là tham chiếu về logic, không phải về cách đặt tên và cấu trúc.

## Bối cảnh dự án

Phần mềm web quản lý tài sản số (chữ ký số, phần mềm bản quyền) cho cơ quan nhà nước Việt Nam. Backend NestJS + Prisma + PostgreSQL ở `apps/api`, frontend React + Vite ở `apps/web`. Quy mô dưới 500 bản ghi tài sản, dưới 50 người dùng, 16 đơn vị trực thuộc.

Tài liệu nền: thiết kế hệ thống ở `docs/superpowers/specs/`, kế hoạch triển khai ở `docs/superpowers/plans/`, thiết kế giao diện ở `docs/design/README.md`.

---

## 1. Ngôn ngữ trong mã

Đây là quy tắc bị vi phạm nhiều nhất, nên đặt lên đầu.

**Định danh viết bằng tiếng Anh.** Tên biến, hàm, lớp, hằng số, thuộc tính, tên file, tên bảng, tên cột, tên nhánh git — tất cả tiếng Anh.

**Chuỗi hiển thị cho người dùng viết bằng tiếng Việt có dấu.** Thông điệp lỗi, nhãn, tiêu đề, nội dung thông báo.

```typescript
// Đúng
const LOGIN_FAILED_MESSAGE = 'Tên đăng nhập hoặc mật khẩu không đúng';
const passwordMatches = await bcrypt.compare(password, user.passwordHash);
function calculateStatus(expiryDate: Date | null): AssetStatus { }

// Sai — định danh tiếng Việt không dấu
const LOI_DANG_NHAP = 'Tên đăng nhập hoặc mật khẩu không đúng';
const khop = await bcrypt.compare(password, user.passwordHash);
function tinhTrangThai(expiryDate: Date | null): AssetStatus { }
```

Lý do: mã nguồn nằm cạnh tên API của NestJS, Prisma, React — trộn hai ngôn ngữ trong cùng một biểu thức làm câu lệnh khó đọc. Tiếng Việt không dấu (`nguoiDung`, `khop`) là tệ nhất trong ba lựa chọn: vừa mất nghĩa với người Việt, vừa vô nghĩa với công cụ và người ngoài.

**Ngoại lệ duy nhất**: dữ liệu miền nghiệp vụ mà bản dịch sẽ gây hiểu nhầm, ví dụ mã đơn vị `PKHTC`. Khi đó giữ nguyên và thêm chú thích.

**Bình luận và commit viết bằng tiếng Việt.** Đây là dự án của đội Việt Nam, người đọc lại mã là người Việt.

## 2. Cấu trúc thư mục backend

Backend chia theo **tầng kỹ thuật**, không chia theo module nghiệp vụ. Đây là quyết định của chủ dự án, khác quy ước mặc định của NestJS — mã mẫu trong kế hoạch triển khai viết theo kiểu module, khi chép sang phải đặt file vào đúng thư mục dưới đây.

```
apps/api/src/
├─ main.ts                    Bootstrap ứng dụng
├─ app.module.ts              Module gốc, đăng ký guard toàn cục
├─ controllers/               Nhận HTTP, gọi service, trả kết quả
│  ├─ auth.controller.ts
│  ├─ org-units.controller.ts
│  ├─ employees.controller.ts
│  ├─ asset-types.controller.ts
│  ├─ assets.controller.ts
│  ├─ dashboard.controller.ts
│  └─ health.controller.ts
├─ services/                  Logic nghiệp vụ, không biết gì về HTTP
│  ├─ auth.service.ts
│  ├─ auth.service.spec.ts
│  ├─ scope.service.ts        Phân quyền phạm vi dữ liệu
│  ├─ org-units.service.ts
│  ├─ employees.service.ts
│  ├─ asset-types.service.ts
│  ├─ assets.service.ts
│  ├─ asset-import.service.ts
│  ├─ dashboard.service.ts
│  └─ prisma.service.ts
├─ models/                    Kiểu miền nghiệp vụ, không phụ thuộc NestJS
│  ├─ auth-user.model.ts      AuthUser, JwtPayload
│  ├─ field-schema.model.ts   FieldDef, FieldType, hàm kiểm tra và chuẩn hóa
│  ├─ import.model.ts         ImportError, ImportPreview, RawRow
│  └─ dashboard.model.ts      DashboardSummary, StatusBreakdown
├─ dto/                       Hình dạng dữ liệu vào, có class-validator
│  ├─ login.dto.ts
│  ├─ create-org-unit.dto.ts
│  ├─ update-org-unit.dto.ts
│  ├─ create-employee.dto.ts
│  ├─ create-asset.dto.ts
│  ├─ update-asset.dto.ts
│  └─ query-assets.dto.ts
├─ modules/                   File *.module.ts — NestJS bắt buộc phải có
│  ├─ auth.module.ts
│  ├─ prisma.module.ts
│  ├─ scope.module.ts
│  ├─ org-units.module.ts
│  ├─ employees.module.ts
│  ├─ asset-types.module.ts
│  ├─ assets.module.ts
│  └─ dashboard.module.ts
├─ guards/
│  ├─ jwt-auth.guard.ts
│  └─ roles.guard.ts
├─ filters/
│  └─ all-exceptions.filter.ts
├─ decorators/
│  ├─ roles.decorator.ts       @Roles và @Public
│  └─ current-user.decorator.ts
├─ config/
│  └─ session.config.ts        Hằng số cookie và thời hạn token
└─ utils/                      Hàm thuần, không phụ thuộc NestJS
   ├─ excel.util.ts
   ├─ expiry.util.ts
   └─ format.util.ts
```

**File test đặt cạnh file được test**, không gom vào thư mục riêng: `services/auth.service.ts` đi cùng `services/auth.service.spec.ts`. Xa nhau thì sửa mã xong dễ quên sửa test.

**Giữ hậu tố trong tên file** (`auth.controller.ts` chứ không phải `auth.ts`) dù thư mục đã nói lên vai trò. Lý do: khi mở nhiều tab trong trình soạn thảo, tên tab chỉ hiện tên file — bốn tab tên `auth.ts` là không phân biệt được.

**Ba quy tắc phụ thuộc giữa các tầng**, vi phạm là lỗi thiết kế:

1. `controllers/` gọi `services/`, không bao giờ ngược lại.
2. `models/` và `utils/` không được import bất cứ thứ gì từ `controllers/`, `services/`, hay `@nestjs/common` ngoài lớp exception. Chúng là hàm thuần và kiểu dữ liệu, phải test được mà không cần dựng module NestJS.
3. `services/` không import `@nestjs/common` để dùng `Request`, `Response`, hay đụng tới cookie. Service nhận dữ liệu đã bóc tách và trả dữ liệu thuần.

**Cái gì đi vào `models/` và cái gì đi vào `utils/`**: `models/` chứa kiểu dữ liệu và các hàm gắn chặt với kiểu đó (ví dụ `validateAttributes` gắn với `FieldDef`). `utils/` chứa hàm tiện ích dùng được ở nhiều nơi và không thuộc về một kiểu miền nào (đọc Excel, định dạng ngày).

## 3. Quy ước đặt tên

| Đối tượng | Kiểu | Ví dụ |
|---|---|---|
| Biến, hàm, thuộc tính | `camelCase` | `expiryDate`, `buildScopeFilter` |
| Lớp, interface, type, enum | `PascalCase` | `AssetsService`, `FieldDef`, `AssetStatus` |
| Hằng số cấp module | `SCREAMING_SNAKE_CASE` | `DEFAULT_PAGE_SIZE`, `MAX_UPLOAD_BYTES` |
| Giá trị enum | `SCREAMING_SNAKE_CASE` | `IT_ADMIN`, `EXPIRING` |
| File backend | `kebab-case.<vai-trò>.ts` | `assets.service.ts`, `jwt-auth.guard.ts` |
| File component React | `PascalCase.tsx` | `AssetFormPage.tsx` |
| File tiện ích frontend | `kebab-case.ts` | `api-client.ts`, `format.ts` |
| Bảng và cột database | Prisma `PascalCase` model, `camelCase` field | `AssetHistory.changedById` |

Hàm trả về boolean bắt đầu bằng `is`, `has`, `can`, `should`: `isExpired`, `canWriteToUnit`.

Hàm bất đồng bộ không cần hậu tố `Async` — kiểu trả về `Promise` đã nói lên điều đó.

Không viết tắt trừ khi đã là quy ước phổ biến (`id`, `url`, `api`, `dto`). `emp` không bằng `employee`; `cfg` không bằng `config`.

## 4. Nguyên lý SOLID áp dụng vào dự án này

SOLID không phải khẩu hiệu — dưới đây là cách từng nguyên lý biểu hiện cụ thể trong codebase này.

### S — Trách nhiệm đơn nhất

Mỗi lớp một lý do để thay đổi. Trong dự án này ranh giới đã được vạch sẵn theo tầng:

- **Controller** nhận HTTP, kiểm tra đầu vào qua DTO, gọi service, trả kết quả. **Không chứa logic nghiệp vụ.**
- **Service** chứa logic nghiệp vụ. **Không biết gì về HTTP** — không nhận `Request`, không đặt cookie, không biết mã trạng thái HTTP.
- **DTO** khai báo hình dạng và ràng buộc dữ liệu vào.
- **Guard** quyết định cho qua hay không. **Không sửa dữ liệu nghiệp vụ.**

Dấu hiệu vi phạm: một service dài quá 300 dòng, hoặc một file phải sửa vì hai lý do không liên quan. Khi thấy, tách theo trách nhiệm chứ không tách theo số dòng.

### O — Mở để mở rộng, đóng để sửa đổi

Ví dụ sống trong dự án: **danh mục loại tài sản có trường tùy biến**. Thêm loại tài sản mới (Tên miền, Chứng thư SSL) không được đụng vào một dòng mã nào — chỉ thêm bản ghi `AssetType` với `fieldSchema` tương ứng.

Khi bạn định thêm `if (assetType === 'CKS')` vào bất kỳ đâu, dừng lại. Đó là dấu hiệu logic đang lẽ ra phải nằm trong cấu hình chứ không phải trong mã.

Áp dụng tương tự cho: kiểu trường (`FieldType`), trạng thái tài sản, loại yêu cầu hỗ trợ.

### L — Thay thế Liskov

Lớp con dùng thay lớp cha mà không làm hỏng hành vi. Trong dự án này chủ yếu liên quan tới `PrismaService extends PrismaClient` và các exception kế thừa `HttpException`.

Cụ thể: khi cần một loại lỗi mới, kế thừa từ `HttpException` chuẩn của NestJS chứ đừng tạo lớp lỗi riêng có hành vi khác — bộ lọc lỗi toàn cục dựa vào hợp đồng đó.

### I — Phân tách interface

Đừng bắt bên gọi phụ thuộc vào thứ nó không dùng. Cụ thể trong dự án:

- `Prisma` `select` chỉ lấy các cột thật sự cần. `findMany` không kèm `include` vô tội vạ — mỗi quan hệ thừa là một truy vấn JOIN thừa.
- Kiểu trả về API chỉ chứa trường frontend cần. Tuyệt đối không trả nguyên bản ghi `User` ra ngoài vì nó chứa `passwordHash`.
- Component React nhận đúng props nó dùng, không nhận cả object lớn rồi tự moi.

### D — Đảo ngược phụ thuộc

Tầng cao phụ thuộc vào trừu tượng, không phụ thuộc vào chi tiết. NestJS đã cung cấp sẵn cơ chế qua dependency injection — hãy dùng nó đúng cách:

- Service nhận phụ thuộc qua constructor, **không** `new` trực tiếp bên trong.
- Không gọi `process.env` rải rác trong logic nghiệp vụ; đọc cấu hình một chỗ và truyền vào.
- Trong test, phụ thuộc được thay bằng đối tượng giả qua `Test.createTestingModule` — nếu một service không thể test vì phụ thuộc cứng, đó là lỗi thiết kế chứ không phải lỗi của test.

## 5. Mẫu thiết kế dùng trong dự án

Chỉ dùng mẫu khi nó giải quyết vấn đề thật đang có. Mẫu thiết kế áp đặt lên bài toán đơn giản làm mã khó đọc hơn chứ không tốt hơn.

### Đang dùng và bắt buộc giữ

**Dependency Injection** — toàn bộ backend. Mọi service, guard, filter đều nhận phụ thuộc qua constructor.

**Repository (qua Prisma)** — Prisma Client đóng vai trò lớp truy cập dữ liệu. **Không viết SQL thô** trừ khi có lý do đo lường được về hiệu năng, và khi đó phải kèm chú thích giải thích.

**Strategy** — dùng cho hai chỗ:
- Kiểm tra và render trường tùy biến theo `FieldType`: mỗi kiểu một cách kiểm tra và một cách hiển thị, chọn theo dữ liệu chứ không theo chuỗi `if/else` dài.
- Sinh báo cáo theo mẫu (giai đoạn 3).

**Guard / Chain of Responsibility** — `JwtAuthGuard` rồi `RolesGuard` rồi tới controller. Thứ tự quan trọng: `RolesGuard` đọc `request.user` do `JwtAuthGuard` đặt vào. Đảo thứ tự khiến phân quyền im lặng không hoạt động.

**Specification cho phạm vi dữ liệu** — `buildScopeFilter(user)` trả về mảnh điều kiện `where` của Prisma. Mọi truy vấn có phạm vi đơn vị **bắt buộc** đi qua hàm này. Không service nào được tự viết điều kiện `orgUnitId` riêng. Đây là quy tắc quan trọng nhất về an toàn dữ liệu trong dự án: gom về một chỗ nghĩa là chỉ có một chỗ để kiểm tra và một chỗ để sai.

**Data Transfer Object** — mọi dữ liệu vào đi qua DTO có `class-validator`. Không nhận `any` từ body.

**Facade cho lớp gọi API ở frontend** — toàn bộ lời gọi mạng đi qua `lib/api-client.ts`. Component không gọi `fetch` trực tiếp.

### Cố tình không dùng

**Không dùng Repository tự viết bọc thêm quanh Prisma.** Prisma đã là lớp trừu tượng; bọc thêm một tầng nữa chỉ để "cho đúng mẫu" là chi phí không đổi lấy gì.

**Không dùng Event Bus / CQRS.** Quy mô dự án không cần, và nó làm việc truy vết luồng xử lý khó hơn nhiều.

**Không dùng Abstract Factory hay Builder** cho việc dựng đối tượng đơn giản. Object literal là đủ.

**Không tạo interface cho service chỉ có một cài đặt.** `IAssetsService` với duy nhất `AssetsService` cài đặt là nghi thức thừa — NestJS inject bằng lớp cụ thể vẫn test được bình thường.

## 6. Quy tắc viết mã

### Xử lý lỗi

Ném exception chuẩn của NestJS (`BadRequestException`, `NotFoundException`, `ForbiddenException`, `UnauthorizedException`). Bộ lọc toàn cục `AllExceptionsFilter` chuẩn hóa thành `{ statusCode, message, code, details }`.

**Thông điệp lỗi viết cho người dùng cuối đọc**, bằng tiếng Việt, nói rõ phải làm gì:

```typescript
// Đúng
throw new BadRequestException('Ngày hết hạn phải sau ngày cấp');
throw new BadRequestException(`Không tìm thấy đơn vị có mã ${code}`);

// Sai — người dùng không hiểu và không biết làm gì tiếp
throw new BadRequestException('Invalid input');
throw new BadRequestException('Dữ liệu không hợp lệ');
```

Không nuốt lỗi bằng `catch {}` rỗng. Nếu thật sự cần bỏ qua, viết chú thích nói rõ vì sao an toàn.

### Bất biến và kiểu dữ liệu

`const` là mặc định, `let` chỉ khi thật sự cần gán lại. Không dùng `var`.

**Không dùng `any`.** Khi không biết kiểu, dùng `unknown` rồi thu hẹp. Đặc biệt: `request.user` phải có kiểu qua khai báo mở rộng `Express.Request`, và payload JWT phải có kiểu tường minh — RBAC của toàn hệ thống dựa vào hai chỗ này, để `any` là mất hết bảo vệ của `strict`.

Không dùng `!` để ép kiểu non-null trừ khi vừa kiểm tra ngay phía trên. Nếu phải dùng nhiều, thiết kế kiểu đang sai.

Tiền tệ dùng `Decimal`, không dùng `number`. Ngày tháng dùng `Date`, không dùng chuỗi, trừ ở biên API.

### Hằng số

Không có số ma thuật và chuỗi ma thuật trong logic. Đặt tên và để ở đầu module hoặc file hằng số dùng chung.

Giá trị dùng ở nhiều nơi phải có **đúng một nguồn**. Ví dụ thời hạn access token xuất hiện cả trong `expiresIn` của JWT lẫn `maxAge` của cookie — hai chỗ này phải đọc từ cùng một hằng số, nếu không sẽ có ngày lệch nhau và gây lỗi phiên rất khó lần.

### Bình luận

Bình luận nói **vì sao**, không nói **cái gì**. Mã đã nói cái gì rồi.

```typescript
// Đúng — nêu ràng buộc mà mã không tự nói được
// So sánh mật khẩu cả khi không tìm thấy tài khoản, để thời gian phản hồi
// của hai nhánh bằng nhau — nếu không, kẻ tấn công dò được username tồn tại.

// Sai — nhắc lại điều dòng dưới đã nói
// Lấy user từ database
const user = await this.prisma.user.findUnique(...);
```

Không để lại mã chết đã bị chú thích. Git giữ lịch sử rồi.

### Truy vấn dữ liệu

Thao tác ghi liên quan nhiều bảng phải nằm trong `$transaction`. Cụ thể: tạo/sửa tài sản và ghi `AssetHistory` phải cùng một transaction — không được để dữ liệu đổi mà không có vết.

Nhập liệu hàng loạt là **tất cả hoặc không gì cả**. Không được ghi một phần.

Danh sách luôn phân trang, có trần trên cho `pageSize`.

## 7. Quy tắc viết test

Viết test trước, chạy để **xác nhận nó thất bại**, rồi mới viết mã. Bước xác nhận thất bại là bắt buộc — nó chứng minh test thật sự kiểm được thứ gì đó.

**Test phải khẳng định hành vi, không khẳng định cách cài đặt.** Test tốt vẫn xanh sau khi refactor nội bộ.

Tên test mô tả hành vi bằng tiếng Việt: `it('từ chối khi mật khẩu sai')`, không phải `it('test login 2')`.

Ưu tiên test cho phần dễ sai và tốn kém khi sai, theo thứ tự trong dự án này:
1. Phân quyền phạm vi dữ liệu — admin đơn vị A không được đọc dữ liệu đơn vị B.
2. Xác thực và guard — kể cả nhánh làm mới token.
3. Tính trạng thái hết hạn ở các mốc biên.
4. Kiểm tra trường tùy biến theo schema.
5. Nhập Excel, gồm cả file có dòng lỗi.

Không viết test chỉ để tăng độ phủ. Một test khẳng định `expect(result).toBeDefined()` là test giả.

## 8. Bảo mật — những điều không được thỏa hiệp

- Thông điệp lỗi đăng nhập **giống hệt nhau** dù sai tên đăng nhập hay sai mật khẩu, và **thời gian phản hồi cũng phải tương đương**. Cả hai đều là kênh dò tài khoản.
- Cookie phiên luôn `httpOnly`, `sameSite: 'strict'`, và `secure` khi chạy production.
- Không bao giờ trả `passwordHash` ra khỏi API. Dùng `select` tường minh.
- Không ghi token, mật khẩu, hay dữ liệu cá nhân vào log.
- Không hard-code secret. Đọc từ biến môi trường, không có giá trị mặc định.
- Thiếu quyền theo vai trò trả **403**. Truy cập bản ghi ngoài phạm vi đơn vị trả **404** — trả 403 sẽ xác nhận rằng bản ghi đó tồn tại ở đơn vị khác.
- Tệp tải lên: tên lưu trữ sinh ngẫu nhiên, danh sách định dạng cho phép, giới hạn dung lượng, và chỉ tải về qua endpoint có kiểm tra quyền.

## 9. Frontend

Component chia nhỏ theo trách nhiệm. Component quá 200 dòng là dấu hiệu cần tách.

Trạng thái máy chủ do TanStack Query quản lý. Không tự viết `useEffect` + `useState` để tải dữ liệu.

Mọi lời gọi API qua `lib/api-client.ts`.

**Giao diện tuân theo `docs/design/README.md`** — màu, cỡ chữ, khoảng cách, bo góc, kích thước control đều đã quy định ở đó. Không tự nghĩ giá trị mới khi tài liệu đã có.

Ba quy tắc trải nghiệm không được bỏ:
- Trạng thái không bao giờ chỉ phân biệt bằng màu — luôn kèm chữ và một ký hiệu riêng, để in đen trắng vẫn đọc được.
- Icon luôn kèm nhãn chữ ở thao tác quan trọng.
- Trạng thái rỗng phải hướng dẫn bước tiếp theo, không chỉ báo trống.

## 10. Git

Một commit làm một việc. Thông điệp tiếng Việt, tiền tố `feat:` / `fix:` / `test:` / `refactor:` / `chore:` / `docs:`.

Dòng đầu dưới 72 ký tự, mô tả kết quả chứ không mô tả thao tác:

```
feat: đăng nhập JWT qua cookie httpOnly và bộ lọc lỗi thống nhất
fix: chống dò tài khoản qua thời gian phản hồi khi đăng nhập
```

Không commit file `.env`, thư mục `node_modules`, `dist`, hay tệp người dùng tải lên.

## 11. Trước khi coi một việc là xong

Chạy và xác nhận **xanh thật**, không suy đoán:

```bash
cd apps/api && npx tsc --noEmit && npx jest
cd apps/web && npx tsc --noEmit && npx vitest run
```

Nếu test đỏ, nói rõ là đỏ kèm output. Không tuyên bố hoàn thành khi chưa chạy.
