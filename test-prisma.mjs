import { PrismaClient } from '@prisma/client/product/index.js';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:123456@postgres:5432/product_db',
    },
  },
});
async function main() {
  try {
    const rawProducts = await prisma.$queryRaw`SELECT * FROM products`;
    console.log("Raw products:", rawProducts);
    const count = await prisma.product.count();
    console.log("Prisma count:", count);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
