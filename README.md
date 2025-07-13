# ShopSphere E-commerce Platform

เว็บแอปพลิเคชัน E-commerce ที่สร้างด้วย NestJS (Backend) พร้อมระบบจัดการผู้ใช้ 3 ระดับ (User, Admin, CEO)

## API Endpoints

### Authentication

- `POST /api/auth/register` - สมัครสมาชิก
- `POST /api/auth/login` - เข้าสู่ระบบ
- `GET /api/auth/profile` - ดูโปรไฟล์

### Products (Public)

- `GET /api/products` - ดูสินค้าทั้งหมด
- `GET /api/products/featured` - ดูสินค้าแนะนำ
- `GET /api/products/:id` - ดูสินค้ารายการ

### Products (Admin)

- `POST /api/products` - เพิ่มสินค้า
- `PUT /api/products/:id` - แก้ไขสินค้า
- `DELETE /api/products/:id` - ลบสินค้า

### Categories

- `GET /api/categories` - ดูหมวดหมู่ทั้งหมด
- `POST /api/categories` (Admin) - เพิ่มหมวดหมู่

### Orders

- `POST /api/orders` - สร้างออเดอร์
- `GET /api/orders/my-orders` - ดูออเดอร์ของตัวเอง
- `GET /api/orders` (Admin) - ดูออเดอร์ทั้งหมด

### Coupons

- `POST /api/coupons/validate` - ตรวจสอบคูปอง
- `GET /api/coupons` (Admin) - จัดการคูปอง

### Dashboard (CEO)

- `GET /api/dashboard/summary` - ข้อมูลสรุป
- `GET /api/dashboard/sales-report` - รายงานยอดขาย
- `GET /api/dashboard/top-products` - สินค้าขายดี

## User Roles

- **USER**: ลูกค้าทั่วไป (ซื้อสินค้า, ดูประวัติ)
- **ADMIN**: ผู้ดูแลระบบ (จัดการสินค้า, ออเดอร์, คูปอง)
- **CEO**: ผู้บริหาร (ดูรายงาน, สถิติ)

## Environment Variables

### Backend (.env)

```
MONGODB_URI=mongodb:
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
PORT=5000
FRONTEND_URL=http://localhost:5173
```

## Database Schema

- **User**: ข้อมูลผู้ใช้และบทบาท
- **Product**: ข้อมูลสินค้า
- **Category**: หมวดหมู่สินค้า
- **Order**: ข้อมูลการสั่งซื้อ
- **Coupon**: คูปองส่วนลด
