// Nguồn duy nhất cho tên cookie phiên, thời hạn token và tùy chọn cookie.
// AuthService (JWT expiresIn), AuthController và JwtAuthGuard (cookie maxAge)
// đều đọc lại đúng các hằng số này — sửa thời hạn một chỗ, tránh tình trạng
// hạn JWT lệch hạn cookie gây lỗi phiên khó lần ra.
export const ACCESS_TOKEN_COOKIE_NAME = 'access_token';
export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 phút
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};
