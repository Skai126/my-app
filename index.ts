import "dotenv/config";
import express from "express";
import memberRoutes from "./routes/members.ts";
import eventRoutes from "./routes/events.ts";

const app = express();
const PORT = process.env.PORT || 8888;

// public フォルダを公開する設定じゃ
app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({ extended: true }));

// 各機能への道案内
app.use("/members", memberRoutes);
app.use("/events", eventRoutes);

// トップページ：メンバー管理へ飛ばす
app.get("/", (req, res) => {
  res.redirect("/members");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
