# Xác nhận thanh toán chuyển khoản qua email

Ứng dụng kiểm tra hộp thư IMAP qua SSL, mỗi 15 giây. Chỉ email từ đúng
`BankSenderAddress` mới được xét; nội dung email phải có mã đơn dạng `CM` kèm
10 chữ số cùng số tiền nhận được kèm đơn vị `VND`, `VNĐ`, `đồng` hoặc `đ`
(ví dụ: “nhận 77,000 VND” hoặc “GD: +77,000 VND”). Hệ thống chỉ xác nhận khi số
tiền khớp chính xác tổng đơn và đơn vẫn trong hạn thanh toán.

## Gmail khi chạy local bằng Visual Studio

1. Trong Gmail, xác nhận email biến động số dư của ngân hàng được chuyển đến hộp
   thư này. Mở một email thông báo của ngân hàng, chọn menu dấu ba chấm rồi
   **Show original / Hiển thị bản gốc** để lấy địa chỉ người gửi đầy đủ.
2. Bật IMAP trong **Gmail → Settings → See all settings → Forwarding and POP/IMAP**
   nếu mục này có trong tài khoản.
3. Với Gmail cá nhân, bật xác minh 2 bước rồi tạo **App password** trong Google
   Account → Security. Không dùng mật khẩu đăng nhập Gmail thông thường.
4. Trong Visual Studio, nhấp phải project → **Manage User Secrets**. Thêm các
   khóa sau vào JSON User Secrets ở máy local; thay các giá trị trong ngoặc bằng
   thông tin của bạn:

```text
"BankPaymentEmail": {
  "Enabled": true,
  "ImapHost": "imap.gmail.com",
  "ImapPort": 993,
  "Username": "<email Gmail nhận thông báo>",
  "Password": "<App password Gmail mới>",
  "BankSenderAddress": "<địa chỉ From đầy đủ của email ngân hàng>",
  "PollIntervalSeconds": 15
}
```

User Secrets được nạp tự động khi chạy profile Development trong
`Properties/launchSettings.json`. Lưu mật khẩu chỉ trong User Secrets hoặc kho
secret của máy chủ; không thêm mật khẩu vào `appsettings*.json` hay commit vào
repository. Nếu đổi App password, cập nhật cả `Email:Password` nếu ứng dụng vẫn
dùng SMTP gửi email.

Đăng ký tài khoản và các luồng quên/đổi mật khẩu gửi mã xác nhận qua SMTP. Để
cấu hình Gmail SMTP local, chạy
`pwsh -ExecutionPolicy Bypass -File scripts\Configure-EmailSecrets.ps1` và nhập
email Gmail cùng App password khi được nhắc. Script lưu cấu hình trong User
Secrets của project, không ghi mật khẩu vào repository.

Khởi động lại ứng dụng sau khi lưu cấu hình. Trong Visual Studio, chọn
**View → Output → ASP.NET Core Web Server** (hoặc cửa sổ Output khi chạy) để xem
worker khởi động và lỗi kết nối IMAP. Nếu Gmail từ chối đăng nhập, kiểm tra lại
IMAP, username là email đầy đủ, App password và quyền của tài khoản Google.

Đơn chuyển khoản hết hạn sau 10 phút kể từ lúc tạo; worker sẽ chuyển đơn chưa
thanh toán sang trạng thái hủy. Thông tin email sai mã đơn, sai số tiền hoặc đến
sau hạn sẽ không tự xác nhận; cần kiểm tra thủ công.
