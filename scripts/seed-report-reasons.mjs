import { PrismaClient } from '@prisma/client/admin-mod/index.js';

const prisma = new PrismaClient();

const reasons = [
  { code: 'SPAM', name: 'Tin rác, gây phiền hà', category: 'product' },
  { code: 'FAKE', name: 'Hàng giả, hàng nhái', category: 'product' },
  { code: 'WRONG_INFO', name: 'Thông tin sai sự thật', category: 'product' },
  { code: 'SCAM_SHOP', name: 'Cửa hàng có dấu hiệu lừa đảo', category: 'shop' },
  { code: 'BAD_CS', name: 'Dịch vụ chăm sóc khách hàng kém', category: 'shop' },
  { code: 'OTHERS', name: 'Lý do khác', category: 'product' },
  { code: 'OTHERS_SHOP', name: 'Lý do khác', category: 'shop' },
];

async function main() {
  console.log('Seeding report reasons...');
  for (const reason of reasons) {
    await prisma.reportReason.upsert({
      where: { code: reason.code },
      update: {},
      create: reason,
    });
  }
  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
