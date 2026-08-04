import type { AuthUser } from '../../auth/auth.service';

// Toàn bộ RBAC của hệ thống dựa vào request.user do JwtAuthGuard đặt vào.
// Không khai báo kiểu ở đây thì mọi nơi đọc request.user sẽ ngầm là `any`,
// và một lỗi gõ nhầm kiểu `user.roel` sẽ biên dịch trót lọt rồi im lặng cho
// qua mọi vai trò trong RolesGuard.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
