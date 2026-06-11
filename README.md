# Fake News Detection Frontend (React + TS + Vite)

Giao diện Web tương tác (Frontend) thuộc hệ thống kiểm chứng tin giả **Fake News Detection**, được xây dựng trên nền tảng **React**, **TypeScript** và công cụ build **Vite**.

---

## 🎨 Tính năng chính
- **Bảng điều khiển kiểm chứng (Guest Dashboard)**: Dán bài viết để nhận kết quả phân tích nhanh từ SLM, XGBoost và kích hoạt RAG kiểm chứng chéo tin tức.
- **Trình quản lý lịch sử (Admin History)**: Liệt kê, tìm kiếm, phân trang và bộ lọc trạng thái các bài viết đã kiểm duyệt trong hệ thống.
- **Trình bày bằng chứng trực quan**: Hiển thị thẻ kết quả đồng nhất/mâu thuẫn giữa các mô hình AI, băng chuyền (carousel) thực thể Wikipedia, danh sách trích đoạn báo chí đối chiếu kèm link liên kết gốc.

---

## 🛠️ Công nghệ sử dụng
- **React 18** & **TypeScript**
- **Vite**: Bộ công cụ đóng gói và chạy Hot Module Replacement (HMR) tốc độ cao.
- **CSS**: Hệ thống giao diện tối ưu hiệu ứng chuyển động mượt mà (Glassmorphic) & đáp ứng thiết bị (Responsive).
- **React Router DOM**: Điều hướng trang phía máy khách (Client-side routing).
- **Lucide React**: Thư viện biểu tượng thiết kế giao diện.

---

## 📋 Yêu cầu hệ thống
- **Node.js**: Phiên bản `18.x` hoặc `20.x` trở lên.
- **npm** (đi kèm khi cài Node.js).

---

## 🚀 Hướng dẫn cài đặt & Chạy cục bộ (Local)

### Bước 1: Di chuyển tới thư mục Frontend
```bash
cd Frontend
```

### Bước 2: Cài đặt các gói thư viện Node
```bash
npm install
```

### Bước 3: Cấu hình tệp môi trường `.env`
Tạo tệp `.env` để cấu hình địa chỉ cổng kết nối đến máy chủ Backend API:
```bash
cp .env.example .env
```
Nội dung tệp cấu hình `.env` mặc định:
```env
VITE_API_URL=http://localhost:8000
```
*Lưu ý: Bạn có thể thay đổi đường dẫn này thành URL máy chủ Backend chạy thực tế (ví dụ: liên kết Hugging Face Space).*

### Bước 4: Khởi chạy môi trường phát triển (Dev Server)
```bash
npm run dev
```
Giao diện sẽ chạy tại địa chỉ: `http://localhost:5173` (hoặc cổng hiển thị trên terminal).

---

## 📦 Đóng gói ứng dụng (Production Build)
Để biên dịch tối ưu tài nguyên tĩnh chuẩn bị đưa lên các môi trường lưu trữ Hosting:
```bash
npm run build
```
Thư mục đầu ra sau khi build xong sẽ là `/dist`.

---

## ☁️ Triển khai lên Vercel
Mã nguồn đã đi kèm tệp [vercel.json](./vercel.json) để xử lý cơ chế định tuyến Single Page Application (SPA). 

Khi bạn deploy thư mục này lên **Vercel**, máy chủ sẽ tự động cấu hình điều hướng tất cả các đường dẫn trực tiếp (Direct URL) về tệp `index.html` của React, tránh tình trạng gặp lỗi **404: NOT_FOUND** khi tải lại trang hoặc truy cập liên kết sâu.
