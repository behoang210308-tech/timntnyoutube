# Payment Production Playbook (VietQR)

## 1) Thứ tự triển khai chuẩn

1. Deploy app lên domain public HTTPS
2. Set đủ biến môi trường production
3. Cấu hình webhook VietQR về đúng URL production
4. Test end-to-end bằng giao dịch số tiền nhỏ
5. Bật hardening chống fake callback
6. Theo dõi log và retry policy 48h đầu

## 2) Checklist cấu hình production

### 2.1 Biến môi trường bắt buộc

- `APP_BASE_URL=https://timsieungach.com`
- `DATABASE_URL=...` (production DB)
- `VIETQR_BANK_BIN=9704xx`
- `VIETQR_ACCOUNT_NO=...`
- `VIETQR_ACCOUNT_NAME=...`
- `VIETQR_WEBHOOK_SECRET=...` (chuỗi ngẫu nhiên dài 32+)

### 2.2 URL webhook phải trỏ đúng

- VietQR webhook:
  - `https://timsieungach.com/api/payments/webhook/vietqr`

### 2.3 Route chính đang dùng

- Tạo đơn thanh toán: `/api/billing/checkout`
- Poll trạng thái đơn: `/api/billing/status?orderId=...`
- VietQR callback: `/api/payments/webhook/vietqr`

## 3) Deploy public domain (gợi ý nhanh)

### 3.1 Vercel

1. Push code lên GitHub
2. Import project vào Vercel
3. Set env ở Project Settings -> Environment Variables
4. Redeploy
5. Kiểm tra:
   - `/pricing`
   - `/api/billing/checkout`
   - `/api/payments/webhook/vietqr`

### 3.2 Nếu dùng Railway/Render

1. Set env tương tự
2. Bật HTTPS domain
3. Cập nhật `APP_BASE_URL` đúng domain final
4. Redeploy và test callback

## 4) Cấu hình VietQR production

VietQR là mã QR, cần nguồn webhook giao dịch ngân hàng (ví dụ SePay hoặc cổng banking webhook).

1. Cấu hình provider webhook gửi về:
   - `POST /api/payments/webhook/vietqr`
2. Header bắt buộc:
   - `x-webhook-secret: <VIETQR_WEBHOOK_SECRET>`
3. Payload phải có:
   - nội dung chuyển khoản (match `transferContent`)
   - số tiền (match `amountVnd`)
4. Test:
   - tạo đơn -> lấy `transferContent`
   - chuyển khoản đúng số tiền + nội dung
   - webhook bắn về
   - đơn tự `PAID` + plan tự nâng

## 5) Harden bảo mật chống fake callback

1. Bắt buộc secret header cho VietQR webhook
2. Chỉ chấp nhận callback qua HTTPS
3. Rate-limit webhook endpoint theo IP
4. Idempotency:
   - nếu order đã `PAID` thì bỏ qua callback lặp
5. Validate nghiêm:
   - order tồn tại
   - status đang `PENDING`
   - amount khớp
   - transferContent khớp
6. Log đầy đủ:
   - providerTransactionId
   - orderId
   - status
7. Alert:
   - callback fail liên tục
   - mismatch amount tăng đột biến

## 6) Checklist go-live 15 phút

- [ ] Domain HTTPS chạy ổn định
- [ ] Env production set đủ
- [ ] VietQR webhook URL + secret đúng
- [ ] Test 1 giao dịch VietQR thành công end-to-end
- [ ] Order `PAID` tự nâng plan không cần duyệt tay
- [ ] Affiliate commission vẫn ghi nhận đúng

## 7) Quy tắc vận hành sau go-live

- Không sửa format `transferContent` khi còn đơn pending
- Nếu đổi domain, cập nhật ngay `APP_BASE_URL`
- Không tắt log webhook trong tuần đầu
- Backup DB hằng ngày
