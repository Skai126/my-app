import "dotenv/config";
import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// データベース接続の準備（Part 4 と同じじゃ）
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query"] });

const app = express();
const PORT = process.env.PORT || 8888;

// EJS を使うための設定じゃ
app.set("view engine", "ejs");
app.set("views", "./views");
// フォームから送られてきたデータを受け取れるようにするぞ
app.use(express.urlencoded({ extended: true }));

// トップページ：ユーザー一覧を表示する
app.get("/", async (req, res) => {
  const users = await prisma.user.findMany();
  res.render("index", { users });
});

// ユーザー追加：フォームから送られた名前を保存する
app.post("/users", async (req, res) => {
  const name = req.body.name;
  const ageInput = req.body.age;

  // 年齢を数字に変換する
  const age =
    ageInput !== undefined && ageInput !== "" ? Number(ageInput) : null;

  // --- ここからが足りなかった「保存の命令」じゃ！ ---
  if (name) {
    try {
      await prisma.user.create({
        data: { name, age },
      });
      console.log("保存成功！:", { name, age });
    } catch (error) {
      console.error("保存失敗:", error);
    }
  }
  // ----------------------------------------------

  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
