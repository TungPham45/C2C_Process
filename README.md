# Nền tảng C2C (C2C Platform)

Kho lưu trữ (repo) này là một Nx monorepo cho nền tảng demo C2C.

Các ứng dụng hiện tại:

- **Frontend**: `web` (React/Vite)
- **Edge**: `api-gateway` (NestJS)
- **Dịch vụ (Services)**: `auth-service`, `product-service`, `admin-moderation-service`

## 🏗️ Tổng quan về Kiến trúc (Architecture Overview)

Dự án này tuân theo Kiến trúc Microservices sử dụng Nx Monorepo.

- **Frontend (`web`)**: Một ứng dụng React giao tiếp duy nhất với `api-gateway`.
- **API Gateway**: Đóng vai trò là điểm đầu vào cho frontend. Nó điều hướng (proxy) các yêu cầu đến các microservices tương ứng.
- **Microservices**: Các dịch vụ NestJS độc lập, mỗi dịch vụ sở hữu cơ sở dữ liệu PostgreSQL riêng (được quản lý thông qua Prisma).
- **Thư viện (`libs`)**: Mã nguồn dùng chung, chẳng hạn như các Prisma client được tạo tự động và các kiểu dữ liệu (types) chung.

## 🚀 Hướng dẫn bắt đầu (Getting Started)

### Thiết lập bằng 1 lệnh

Sau khi clone repo, tại thư mục gốc hãy chạy:

```powershell
docker compose up --build
```

Lệnh này sẽ tự động:

- build toàn bộ container cần thiết cho hệ thống
- khởi động `postgres`, `pgadmin`, `auth-service`, `product-service`, `admin-moderation-service`, `api-gateway`, `web`
- tự tạo 5 database và seed dữ liệu mẫu ở lần khởi tạo PostgreSQL đầu tiên
- cho phép bạn áp dụng migration mới về sau bằng lệnh `npm.cmd run db:sync` sau khi pull code
- nối toàn bộ service vào cùng mạng nội bộ Docker để chúng gọi nhau bằng tên service

### Điều kiện tiên quyết (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy bạn đã cài đặt:

- **Docker Desktop**: Để chạy PostgreSQL và các dịch vụ đi kèm. Đảm bảo Docker đang mở.
- **Node.js (v20 trở lên)**: Để chạy ứng dụng trực tiếp trên máy host.
- **npm**: Đi kèm với Node.js.

### Truy cập (Access Information)

Sau khi stack chạy xong:

- Frontend: [http://localhost:4200](http://localhost:4200)
- API Gateway: [http://localhost:3000](http://localhost:3000)
- PostgreSQL: `postgres:5432`
- pgAdmin: [http://localhost:5050](http://localhost:5050)

Thông tin đăng nhập pgAdmin:

- Email: `admin@c2cplatform.com`
- Password: `123456`
- Server được cấu hình sẵn: `C2C Platform Postgres`

Nếu bạn kết nối PostgreSQL từ máy host bằng `psql`, DBeaver, hoặc pgAdmin cài trực tiếp trên Windows/macOS, hãy dùng:

- Host: `localhost`
- Port: `5433`
- Username: `postgres`
- Password: `123456`

Không dùng `localhost:5432` cho repo này. Trên nhiều máy phát triển, `5432` đã được PostgreSQL local sử dụng, còn PostgreSQL Docker của project được publish ra host ở `5433`.

Trong pgAdmin web của Docker, sau khi đăng nhập hãy mở:

- `Servers > C2C Platform > C2C Platform Postgres > Databases`

Bạn sẽ thấy 5 database:

- `admin_mod_db`
- `auth_db`
- `chat_db`
- `order_db`
- `product_db`

Tài khoản mẫu:

- `buyer@gmail.com` / `123456`
- `seller1@gmail.com` / `123456`
- `admin@gmail.com` / `123456`
- `seller2@gmail.com` / `123456`

> [!NOTE]
> Ở lần khởi tạo PostgreSQL đầu tiên, script `init-multiple-db.sh` sẽ tự động tạo database, chạy migration và nạp dữ liệu mẫu. Khi repo có migration mới sau này, chỉ cần chạy `npm.cmd run db:sync` để áp dụng schema mới lên volume PostgreSQL hiện có mà không cần `docker compose down -v`.

### Dừng hệ thống

```powershell
docker compose down
```

### Reset sạch dữ liệu database

```powershell
docker compose down -v
docker compose up --build
```

### Chế độ chạy local không Docker cho app (tùy chọn)

Nếu bạn chỉ muốn Docker chạy database còn app chạy bằng Node trên máy host:

```powershell
npm.cmd run setup
```

Lệnh `setup` sẽ:

- cài dependencies
- khởi động container `postgres`
- áp dụng toàn bộ Prisma migration còn thiếu
- generate lại Prisma clients

PostgreSQL do repo khởi động sẽ được expose ra máy host ở `postgres:5432`.

Lệnh này **không** tự mở terminal và **không** tự chạy `auth-service`, `product-service`, `admin-moderation-service`, `api-gateway`, `web`.

### Cách 1: Tự mở 5 terminal (Thực hiện thủ công)

Nếu bạn muốn kiểm soát từng dịch vụ hoặc đang ở trên hệ điều hành không phải Windows:

1.  **Cài đặt & Chuẩn bị**:
    ```powershell
    npm install
    ```
    *(Lệnh này sẽ tự động cài thư viện và tự generate toàn bộ Prisma Clients cho bạn)*.

2.  **Khởi động Database**:
    ```powershell
    docker compose up -d postgres
    ```

3.  **Đồng bộ schema mới nhất vào database**:
    ```powershell
    npm.cmd run db:sync
    ```

4.  **Mở 5 cửa sổ terminal riêng biệt** và chạy:
    - **Terminal 1**: `npx nx serve auth-service`
    - **Terminal 2**: `npx nx serve product-service`
    - **Terminal 3**: `npx nx serve admin-moderation-service`
    - **Terminal 4**: `npx nx serve api-gateway`
    - **Terminal 5**: `npx nx serve web`

### Cách 2: Tự động mở 5 terminal (Dùng script - Khuyên dùng)

Nếu bạn muốn bật nhanh toàn bộ stack local mà không phải gõ lệnh nhiều lần, hãy dùng:

```powershell
npm run local:up
```

Lệnh này sẽ khởi động PostgreSQL, áp dụng toàn bộ Prisma migration còn thiếu, generate lại Prisma clients và **tự mở 6 cửa sổ PowerShell** cho bạn.

## 🗄️ Tự động hóa Cơ sở dữ liệu (Database Automation)

Bạn **không cần** phải tạo cơ sở dữ liệu thủ công hay sử dụng pgAdmin để thiết lập dữ liệu ban đầu. Dự án này đã được tự động hóa hoàn toàn bên trong Docker:

- **Tự động tạo Database**: Khi chạy `docker compose up --build`, hệ thống sẽ tự động tạo đủ 5 database phục vụ cho các microservices.
- **Tự động chạy Migration**: Cấu trúc bảng (schema) từ Prisma sẽ được tự động áp dụng.
- **Tự động nạp dữ liệu mẫu (Seeding)**: Các tài khoản buyer, seller, admin và sản phẩm mẫu sẽ được chèn sẵn vào hệ thống.

### Khi pull code có thay đổi schema

Nếu đồng đội vừa push Prisma schema hoặc migration mới, sau khi pull repo hãy chạy:

```powershell
npm.cmd run db:sync
```

Lệnh này sẽ:

- chờ PostgreSQL ở `postgres:5432`
- chạy `prisma migrate deploy` cho tất cả database của repo
- generate lại Prisma clients để code local khớp với schema mới nhất

### Khi chỉ cần generate lại tất cả Prisma clients

Nếu bạn vừa sửa file `schema.prisma` và chỉ cần generate lại toàn bộ Prisma clients, hãy chạy:

```powershell
npm.cmd run prisma:generate
```

Lệnh này sẽ generate lại client cho toàn bộ schema trong:

- `libs/prisma-clients/auth-client/schema.prisma`
- `libs/prisma-clients/product-client/schema.prisma`
- `libs/prisma-clients/order-client/schema.prisma`
- `libs/prisma-clients/chat-client/schema.prisma`
- `libs/prisma-clients/admin-mod-client/schema.prisma`

Nếu bạn vừa đổi schema và cũng có migration mới, quy trình nên là:

```powershell
npx prisma migrate dev --schema=libs/prisma-clients/<client-name>/schema.prisma --name <migration_name>
npm.cmd run prisma:generate
```

### Cách "làm sạch" dữ liệu (Reset Database)

Nếu bạn muốn xóa sạch dữ liệu cũ và bắt đầu lại từ đầu với trạng thái "sạch", hãy chạy bộ lệnh sau:

```powershell
docker compose down -v
docker compose up --build
```
*(Tham số `-v` sẽ xóa Volume dữ liệu của Docker, buộc hệ thống phải khởi chạy lại quy trình tự động hóa từ đầu).*

### Dịch vụ được dựng cùng nhau

Stack Docker hiện tại sẽ dựng:

- `postgres`
- `pgadmin`
- `auth-service`
- `product-service`
- `admin-moderation-service`
- `api-gateway`
- `web`

## Luồng Demo Dự kiến

Các bước trải nghiệm demo hiện tại:

1. Mở trang web.
2. Đăng nhập thông qua `auth-service`.
3. Thông tin người bán (seller context) được lấy từ `product-service`.
4. Truy cập vào bảng điều khiển người bán (seller dashboard).
5. Mở phần quản lý sản phẩm.
6. Thực hiện tạo, chỉnh sửa, liệt kê và xóa sản phẩm.

Luồng này phụ thuộc vào:

- PostgreSQL đang chạy.
- Tài khoản người bán đã tồn tại trong `auth_db`.
- Người bán có một cửa hàng đang hoạt động trong `product_db`.

## Các lệnh Nx hữu ích

Xây dựng (build) một dịch vụ:

```powershell
npx nx build product-service
```

Hiển thị các project Nx đã đăng ký:

```powershell
npx nx show projects
```

Hiển thị thông tin chi tiết của một project:

```powershell
npx nx show project product-service
```

## Xử lý sự cố (Troubleshooting)

### Cổng (Port) đã bị chiếm dụng

Nếu `nx serve` thất bại với lỗi `EADDRINUSE`, nghĩa là một tiến trình khác đã sử dụng cổng đó.

Ví dụ:

- `3001` được sử dụng bởi `product-service`
- `3002` được sử dụng bởi `auth-service`

Hãy dừng tiến trình cũ và chạy lại dịch vụ.

### Prisma báo `Database "<db_name>" does not exist on the database server at "localhost:5432"`

Lỗi này gần như luôn có nghĩa là service đang trỏ nhầm vào PostgreSQL cài local trên máy, không phải PostgreSQL Docker của repo.

Cách xử lý:

- dùng `postgresql://postgres:123456@postgres:5432/<db_name>`
- nếu chạy stack local của repo, dùng `powershell -ExecutionPolicy Bypass -File .\scripts\run-local-stack.ps1` hoặc `npm.cmd run local:up`
- nếu dùng pgAdmin hoặc database client cài trên máy, sửa connection sang `postgres:5432`
- nếu cần nạp lại migration và seed từ đầu, chạy `docker compose down -v` rồi `docker compose up --build`

### Lỗi import Prisma client khi chạy `nx serve`

Repo này sử dụng các Prisma client được tạo trong:

- `@prisma/client/auth`
- `@prisma/client/product`
- `@prisma/client/order`
- `@prisma/client/chat`
- `@prisma/client/admin-mod`

Đối với các dịch vụ Nest trong repo này, hãy sử dụng cách import tường minh như sau:

```ts
import { PrismaClient } from '@prisma/client/product/index.js';
```

Điều này giúp tránh lỗi không tìm thấy module khi chạy lệnh `nx serve`.

### Đăng nhập trả về lỗi `401 Unauthorized`

Điều này có nghĩa là hệ thống từ chối thông tin đăng nhập.

Luồng đăng nhập sẽ kiểm tra:

- Người dùng có tồn tại theo email hay không.
- Mật khẩu có khớp với mã hash bcrypt trong `auth_db` hay không.

Nếu phản hồi là `401 Invalid credentials`, lỗi thường không nằm ở gateway mà do thông tin đăng nhập sai.

## Ghi chú về Repo (Repo Notes)

- [Prisma schemas](./libs/prisma-clients)
- [Quy trình làm việc backend (Backend service workflow)](./service-module-workflow.md)
- [Ý tưởng sửa lỗi Microservices](./microservices-fix-ideas.txt)

## Các bản mẫu giao diện (UI Prototypes)

Các bản mẫu HTML/Tailwind chất lượng cao được sử dụng để tham khảo giao diện nằm trong thư mục [./prototypes](./prototypes). Bạn có thể xem các bản thiết kế mục tiêu tại đây trước khi chúng được tích hợp hoàn toàn vào các React component trong ứng dụng `web`.

- `seller_center.html`: Bản mẫu bảng điều khiển chính.
- `product_mgmt.html`: Bản mẫu quản lý kho hàng.
- `add_product.html`: Bản mẫu tạo sản phẩm mới.
