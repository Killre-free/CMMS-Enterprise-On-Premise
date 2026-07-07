import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: { name: "Admin", description: "Full system access" },
  });

  const passwordHash = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { username: "admin1" },
    update: {},
    create: {
      employeeId: "EMP-0001",
      username: "admin1",
      passwordHash,
      firstName: "System",
      lastName: "Administrator",
      roleId: adminRole.id,
      isSuperAdmin: true,
      isActive: true,
      forcePasswordChange: false,
    },
  });

  console.log("Seeded: role 'Admin', user 'admin1' / 'admin123'");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
