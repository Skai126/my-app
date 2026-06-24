import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// データベースに接続するための準備じゃ
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query"] });

async function main() {
  console.log("データベースに接続中...");
  // ユーザーを一人作ってみるぞ
  const newUser = await prisma.user.create({
    data: { name: `ひつじ仙人の弟子 ${new Date().toLocaleTimeString()}` },
  });
  console.log("追加されたユーザー:", newUser);

  // 全員表示してみるぞ
  const users = await prisma.user.findMany();
  console.log("現在のユーザー一覧:", users);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => Promise.all([prisma.$disconnect(), pool.end()]));
