const fs = require('fs');
const path = 'apps/order-service/src/app/order.service.ts';
let content = fs.readFileSync(path, 'utf8');

// The new method to replace with (using CRLF to match file)
const newMethod = `  async getSellerOrders(userId: number) {\r\n    // Look up the shop owned by this user (from product DB)\r\n    const shop = await this.productPrisma.shop.findFirst({\r\n      where: { owner_id: userId },\r\n      select: { id: true },\r\n    });\r\n\r\n    if (!shop) {\r\n      return [];\r\n    }\r\n\r\n    return this.prisma.shopOrder.findMany({\r\n      where: {\r\n        shop_id: shop.id,\r\n      },\r\n      include: {\r\n        items: true,\r\n      },\r\n      orderBy: {\r\n        created_at: 'desc',\r\n      },\r\n    });\r\n  }`;

// Find exact start/end indices
const start = content.indexOf('  async getSellerOrders(shopId: number) {');
const end = content.indexOf('  async getOrderDetail(');

if (start === -1 || end === -1) {
  console.error('Could not find method boundaries');
  process.exit(1);
}

// Slice and replace 
content = content.slice(0, start) + newMethod + '\r\n\r\n' + content.slice(end);
fs.writeFileSync(path, content);
console.log('Fixed successfully!');
