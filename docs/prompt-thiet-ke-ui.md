# Prompt thiết kế UI/UX — Sổ thống kê tài sản số

> Copy toàn bộ phần dưới dấu phân cách và dán vào Claude để nhận thiết kế giao diện.

---

Bạn là nhà thiết kế sản phẩm. Hãy thiết kế giao diện cho một ứng dụng web nội bộ tên là **"Sổ thống kê tài sản số"**, dùng trong cơ quan nhà nước Việt Nam. Tạo artifact HTML tương tác thể hiện hệ thống thiết kế và các màn hình chính.

## Bối cảnh sản phẩm

Cơ quan có một đơn vị chính và khoảng 10–20 đơn vị trực thuộc (phòng ban, chi nhánh). Hiện họ quản lý tài sản số bằng nhiều file Excel rời rạc, dẫn đến ba vấn đề: không biết cơ quan đang có gì, chữ ký số hết hạn mà không ai biết trước, và yêu cầu hỗ trợ trao đổi qua điện thoại nên không tra được đã xử lý tới đâu.

Phần mềm thay thế cách làm đó. Quy mô: dưới 500 bản ghi tài sản, dưới 50 người dùng.

**Hai loại tài sản số ban đầu:**
- **Chữ ký số** — có ngày hết hạn, thuộc tính riêng: nhà cung cấp CA (Viettel-CA, VNPT-CA, FPT-CA, BKAV-CA), số serial, loại thiết bị (USB Token, HSM, SIM PKI, Ký số từ xa), chủ thể chứng thư.
- **Phần mềm bản quyền** — thuộc tính riêng: số license, số máy được cài, hình thức mua (mua vĩnh viễn / thuê bao năm / thuê bao tháng), phiên bản.

Quan trọng: danh mục loại tài sản **mở rộng được**. Quản trị viên tự thêm loại mới (ví dụ "Tên miền", "Chứng thư SSL") và tự khai báo các trường riêng của loại đó ngay trên giao diện. Biểu mẫu nhập liệu sinh động theo khai báo này. Thiết kế phải chịu được việc một loại tài sản có 2 trường riêng và một loại khác có 12 trường riêng.

## Ba nhóm người dùng

| Vai trò | Là ai | Dùng để làm gì | Đặc điểm |
|---|---|---|---|
| **Quản trị IT** | 1–2 cán bộ IT của cơ quan | Nhập và quản lý toàn bộ tài sản, cấu hình danh mục, tạo tài khoản, xử lý yêu cầu | Rành công nghệ, dùng hằng ngày, cần thao tác nhanh và hàng loạt |
| **Admin đơn vị** | Cán bộ kiêm nhiệm ở mỗi phòng ban / chi nhánh | Quản lý tài sản của riêng đơn vị mình, gửi yêu cầu lên IT | Không rành công nghệ, dùng vài lần mỗi tháng, dễ quên thao tác |
| **Lãnh đạo** | Trưởng phòng, giám đốc | Chỉ xem dashboard và báo cáo toàn cơ quan | Xem trên máy tính văn phòng, cần nắm tình hình trong 10 giây, hay in ra giấy |

Người dùng quan trọng nhất để thiết kế cho là **admin đơn vị**: họ ít dùng nhất nên nếu giao diện khiến họ phải đoán, họ sẽ quay về dùng Excel và cả hệ thống thất bại.

## Ràng buộc thiết kế bắt buộc

**Ngôn ngữ và chữ.** Toàn bộ nội dung bằng tiếng Việt có dấu. Chuỗi tiếng Việt dài hơn tiếng Anh khoảng 25–30%, và dấu thanh nằm trên/dưới chữ nên cần chiều cao dòng thoáng hơn bình thường (line-height tối thiểu 1.5). Không được để nhãn nút hay tiêu đề cột bị cắt cụt hoặc xuống dòng xấu. Tên đơn vị có thể dài như "Phòng Kế hoạch — Tài chính và Đầu tư"; tên người có thể dài như "Nguyễn Thị Hoàng Phương Anh". Chọn font hỗ trợ tốt tiếng Việt: Inter, Be Vietnam Pro, hoặc Source Sans 3.

**Thiết bị.** Ưu tiên máy tính để bàn, độ phân giải chuẩn 1366×768 (rất phổ biến ở máy văn phòng cơ quan) và 1920×1080. Cần dùng được trên máy tính bảng ở chế độ chỉ đọc. Không cần thiết kế cho điện thoại.

**Khả năng tiếp cận.** Người dùng có cả cán bộ lớn tuổi. Cỡ chữ nội dung tối thiểu 14px, vùng bấm tối thiểu 40×40px. Trạng thái **không được** phân biệt chỉ bằng màu — mỗi trạng thái phải có chữ, và nên có thêm biểu tượng hoặc hình dạng riêng. Độ tương phản đạt WCAG AA. Không dùng nút chỉ có biểu tượng mà không có nhãn chữ ở những thao tác quan trọng.

**Mật độ thông tin.** Đây là công cụ tra cứu và so sánh, không phải trang tiếp thị. Bảng dữ liệu cần đủ dày để thấy 15–20 dòng trên một màn hình mà vẫn đọc thoải mái. Tránh khoảng trắng thừa thãi và thẻ bo tròn to.

**Tính trang trọng.** Đây là phần mềm cơ quan nhà nước. Giao diện cần chững chạc và đáng tin: bảng màu trầm, không màu neon, không gradient sặc sỡ, không hoạt ảnh vui nhộn. Nhưng cũng đừng nhại lại giao diện phần mềm nhà nước cũ kỹ — mục tiêu là hiện đại, sạch sẽ, chuyên nghiệp, kiểu Linear hoặc Notion nhưng nghiêm túc hơn.

**In ấn.** Lãnh đạo hay in dashboard và danh sách ra giấy A4 để họp. Cần có kiểu hiển thị khi in: bỏ thanh điều hướng, chuyển nền tối sang trắng, biểu đồ vẫn đọc được khi in đen trắng.

## Hệ thống thiết kế cần xây

Trình bày trước một trang hệ thống thiết kế gồm:

1. **Bảng màu** — màu chủ đạo, màu phụ, thang xám, và **năm màu trạng thái** cho tài sản. Kiểm tra tương phản trên cả nền sáng và nền tối.
2. **Thang chữ** — từ tiêu đề trang tới chữ chú thích, ghi rõ cỡ và độ đậm, minh họa bằng chữ tiếng Việt có dấu thật.
3. **Thang khoảng cách và bo góc.**
4. **Thư viện thành phần** — nút (chính, phụ, nguy hiểm, vô hiệu), ô nhập, danh sách chọn, ô đánh dấu, thẻ trạng thái, bảng, phân trang, hộp thoại, thông báo nổi, thẻ chỉ số, ô tìm kiếm, thẻ bộ lọc, khung tải, trạng thái rỗng, trạng thái lỗi.

**Năm trạng thái tài sản** — thiết kế thẻ trạng thái cho từng cái, phân biệt được cả khi in đen trắng:
- `Đang hiệu lực` — bình thường, không cần chú ý
- `Sắp hết hạn` — cần hành động trong vòng 30 ngày, đây là trạng thái quan trọng nhất phải nổi bật
- `Đã hết hạn` — nghiêm trọng, đã lỡ hạn
- `Đã thu hồi` — đã ngừng dùng, không cần chú ý
- `Tạm ngưng` — đang tạm dừng

Hỗ trợ cả chế độ sáng và tối, nhưng chế độ sáng là mặc định vì người dùng làm việc trong phòng đủ sáng.

## Các màn hình cần thiết kế

### 1. Đăng nhập
Đơn giản: tên đăng nhập, mật khẩu, nút Đăng nhập. Hiển thị tên cơ quan. Cần chỗ hiện thông báo lỗi "Tên đăng nhập hoặc mật khẩu không đúng" mà không làm nhảy bố cục.

### 2. Bảng điều khiển (Dashboard) — màn hình chính
Đây là màn hình lãnh đạo nhìn nhiều nhất và phải trả lời được câu hỏi "có gì cần lo không" trong 10 giây.

- Hàng bốn thẻ chỉ số: Tổng tài sản, Đang hiệu lực, **Sắp hết hạn trong 30 ngày**, Đã hết hạn. Thẻ "Sắp hết hạn" phải là thứ mắt nhìn thấy đầu tiên khi con số lớn hơn 0.
- Biểu đồ tròn: cơ cấu theo loại tài sản.
- Biểu đồ cột: số lượng theo đơn vị (10–20 cột, tên đơn vị dài).
- Biểu đồ đường hoặc cột: số tài sản hết hạn theo từng tháng trong 12 tháng tới — giúp lãnh đạo thấy trước tháng nào dồn việc.
- Bảng "Cần xử lý ngay": tài sản sắp hết hạn, sắp theo ngày hết hạn tăng dần, mỗi dòng ghi rõ **"Còn 12 ngày"** hoặc **"Đã quá hạn 3 ngày"** bằng chữ chứ không phải số ngày âm.

Thiết kế cả trạng thái khi cơ quan chưa có dữ liệu nào (mới cài đặt) — trạng thái rỗng phải hướng dẫn người dùng làm gì tiếp theo.

### 3. Sổ tài sản — danh sách
Màn hình dùng nhiều nhất của quản trị IT.

- Thanh lọc: ô tìm kiếm (theo mã, tên, người giữ), chọn loại tài sản, chọn đơn vị, chọn trạng thái, và một nút nhanh "Sắp hết hạn trong 30 ngày".
- Bảng: mã tài sản, tên, loại, đơn vị, người giữ, ngày hết hạn, trạng thái. Cần đọc lướt nhanh theo cột ngày hết hạn.
- Phân trang, đếm tổng số kết quả.
- Ba nút hành động: Thêm tài sản, Nhập từ Excel, Xuất Excel.
- Thiết kế rõ trạng thái khi bộ lọc không ra kết quả nào (khác với trạng thái chưa có dữ liệu).

### 4. Chi tiết tài sản
- Thông tin chung, và một khối riêng cho **các trường tùy biến theo loại** (số lượng trường thay đổi tùy loại).
- **Nhật ký thay đổi** theo dòng thời gian, mới nhất trước. Mỗi mục ghi: ai làm, lúc nào, hành động gì. Với hành động sửa thì liệt kê từng trường đã đổi theo dạng `Ngày hết hạn: 04/08/2026 → 04/08/2027`. Đây là phần phục vụ thanh tra kiểm tra nên phải dễ đọc và dễ in.
- Nút Sửa và nút Thu hồi (thu hồi là hành động nguy hiểm, cần hộp thoại xác nhận có ô nhập lý do).

### 5. Biểu mẫu thêm/sửa tài sản — màn hình khó nhất
Biểu mẫu gồm hai phần: **trường chung** (mã, tên, đơn vị, người giữ, nhà cung cấp, ngày cấp, ngày hết hạn, chi phí, ghi chú) và **trường riêng sinh động** theo loại tài sản đang chọn.

Thử thách thiết kế: khi người dùng đổi loại tài sản ở đầu biểu mẫu, toàn bộ phần trường riêng bên dưới thay đổi. Hãy làm cho việc này dễ hiểu chứ không gây hoang mang — người dùng phải nhận ra "phần này thay đổi vì tôi vừa đổi loại".

Không có ô chọn trạng thái — hệ thống tự tính từ ngày hết hạn. Hãy thể hiện điều đó cho người dùng biết thay vì để họ thắc mắc tại sao không đặt được trạng thái.

Lỗi kiểm tra dữ liệu hiển thị ngay tại từng ô sai, không gom hết lên đầu trang.

### 6. Nhập dữ liệu từ Excel — màn hình quyết định thành bại
Đây là chức năng quan trọng nhất về mặt trải nghiệm: cơ quan đang có sẵn hàng trăm dòng trong Excel, và nếu bắt họ nhập tay lại thì họ sẽ bỏ phần mềm.

Luồng bốn bước trong một hộp thoại:
1. Chọn loại tài sản cần nhập.
2. Tải file mẫu (đúng cột của loại đó).
3. Chọn file đã điền lên.
4. **Bảng xem trước**: hiển thị "Đã đọc 145 dòng: 138 dòng hợp lệ, 7 dòng lỗi", liệt kê từng lỗi kèm **số dòng trong file Excel** và mô tả cụ thể ("Dòng 23 — Không tìm thấy đơn vị có mã PKH", "Dòng 41 — Vui lòng nhập Nhà cung cấp CA"). Nút xác nhận ghi rõ "Nhập 138 dòng hợp lệ".

Thiết kế phần xem trước sao cho người dùng đọc được danh sách lỗi và biết chính xác phải sửa ô nào trong file Excel của họ. Đây là chỗ dễ làm cho người dùng bế tắc nhất.

### 7. Danh mục nhân sự
- Danh sách cán bộ theo đơn vị, có tìm kiếm và nhập từ Excel.
- **Trang chi tiết một cán bộ**: thông tin cá nhân và bảng liệt kê toàn bộ tài sản người đó đang giữ. Màn hình này được dùng khi cán bộ nghỉ hưu hoặc chuyển công tác, nên phải trả lời ngay câu hỏi "người này đang giữ những gì cần thu hồi".

### 8. Quản lý đơn vị
Cây đơn vị phân cấp (cơ quan → phòng ban / chi nhánh → tổ), thêm sửa xóa. Thiết kế cách thể hiện cấp bậc rõ ràng khi cây sâu 3 cấp.

### 9. Danh mục loại tài sản và trình dựng trường
Màn hình cấu hình dành riêng cho quản trị IT — nơi họ thêm loại tài sản mới và khai báo các trường riêng.

Trình dựng trường: mỗi trường có nhãn hiển thị, kiểu (Văn bản / Văn bản dài / Số / Ngày / Danh sách lựa chọn / Ô đánh dấu), đánh dấu bắt buộc hay không, và với kiểu danh sách thì nhập các lựa chọn. Cần kéo thả đổi thứ tự và xóa trường.

Nên có khung xem trước ngay bên cạnh, cho thấy biểu mẫu nhập liệu sẽ trông ra sao — người cấu hình cần thấy kết quả ngay chứ không phải đoán.

### 10. Hệ thống yêu cầu (giai đoạn sau, thiết kế trước để hệ thống nhất quán)
- Admin đơn vị gửi yêu cầu: loại yêu cầu (cấp mới chữ ký số / gia hạn / thu hồi / cấp license phần mềm / hỗ trợ khác), mô tả, mức ưu tiên, tệp đính kèm.
- IT xem hàng đợi yêu cầu, nhận xử lý, trao đổi bằng bình luận, hoàn thành hoặc từ chối.
- Trạng thái: Mới → Đang xử lý → Hoàn thành, hoặc Từ chối.
- Cần thiết kế: thẻ trạng thái yêu cầu, dòng thời gian trao đổi giữa đơn vị và IT, và cách thể hiện mức ưu tiên.

## Những chi tiết dễ bị bỏ sót — hãy thiết kế cả chúng

- **Khác biệt theo vai trò**: lãnh đạo thấy cùng màn hình danh sách nhưng không có nút Thêm / Sửa / Xóa. Đừng để giao diện của họ trông như bị hỏng hay thiếu sót — hãy làm nó trông như một bản chỉ đọc hoàn chỉnh.
- **Trạng thái đang tải** cho bảng và biểu đồ.
- **Ba loại trạng thái rỗng khác nhau**: chưa có dữ liệu bao giờ, bộ lọc không khớp, và người dùng không có quyền xem.
- **Thông báo lỗi hệ thống** kèm mã truy vết để người dùng báo IT.
- **Chuông thông báo** trên thanh trên cùng, hiển thị các cảnh báo tài sản sắp hết hạn.
- **Xác nhận hành động nguy hiểm** (thu hồi tài sản, xóa đơn vị) — nêu rõ hậu quả bằng tiếng Việt tự nhiên, không dùng "Bạn có chắc chắn?" chung chung.

## Kết quả mong muốn

Một artifact HTML gồm: trang hệ thống thiết kế, rồi từng màn hình theo thứ tự trên với dữ liệu mẫu tiếng Việt thật (tên người Việt, tên đơn vị hành chính Việt Nam, mã tài sản hợp lý, ngày tháng định dạng dd/mm/yyyy, tiền tệ định dạng "1.500.000 ₫").

Với mỗi màn hình, giải thích ngắn gọn các quyết định thiết kế: vì sao đặt thành phần ở đó, ưu tiên thị giác dựa trên điều gì, xử lý trường hợp khó ra sao. Đừng chỉ vẽ đẹp — hãy cho thấy thiết kế giải quyết bài toán thật của ba nhóm người dùng.

Nếu có chỗ nào trong mô tả trên bạn thấy mâu thuẫn hoặc thiếu thông tin để quyết định, hãy nêu ra thay vì tự đoán.
