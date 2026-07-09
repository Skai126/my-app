import express from "express";
import { prisma } from "../prisma.ts";

const router = express.Router();

// --- メンバー一覧（ソート機能付き） ---
router.get("/", async (req, res) => {
  const { sort } = req.query;

  // 1. 全員取ってくる
  let members = await prisma.member.findMany({ include: { group: true } });
  const groups = await prisma.group.findMany();

  // 2. 指定があれば並べ替える
  if (sort === "name") {
    members.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  } else if (sort === "group") {
    members.sort((a, b) => {
      const nameA = a.group?.name || "zzz";
      const nameB = b.group?.name || "zzz";
      return nameA.localeCompare(nameB, "ja");
    });
  } else if (sort === "role") {
    const roleRank: Record<string, number> = {
      社長: 1,
      部長: 2,
      正社員: 3,
      アルバイト: 4,
    };
    members.sort(
      (a, b) => (roleRank[a.roleClass] || 99) - (roleRank[b.roleClass] || 99),
    );
  }

  res.render("members/index", { members, groups });
});

// --- メンバー登録 ---
router.post("/", async (req, res) => {
  const { name, roleClass, isDrinker, groupId } = req.body;
  if (name) {
    await prisma.member.create({
      data: {
        name,
        roleClass,
        isDrinker: isDrinker === "on",
        groupId: groupId ? Number(groupId) : null,
      },
    });
  }
  res.redirect("/members");
});

// --- 編集画面の表示 ---
router.get("/:id/edit", async (req, res) => {
  const member = await prisma.member.findUnique({
    where: { id: Number(req.params.id) },
  });
  const groups = await prisma.group.findMany();
  if (!member) return res.send("メンバーが見つかりませぬ");
  res.render("members/edit", { member, groups });
});

// --- 情報の更新 ---
router.post("/:id/update", async (req, res) => {
  const { id } = req.params;
  const { name, roleClass, isDrinker, groupId } = req.body;
  await prisma.member.update({
    where: { id: Number(id) },
    data: {
      name,
      roleClass,
      isDrinker: isDrinker === "on",
      groupId: groupId ? Number(groupId) : null,
    },
  });
  res.redirect("/members");
});

// --- メンバー削除 ---
router.post("/:id/delete", async (req, res) => {
  try {
    await prisma.member.delete({ where: { id: Number(req.params.id) } });
  } catch (e) {
    return res.send(
      "このメンバーは既に飲み会に参加しておるので、削除できぬぞ！",
    );
  }
  res.redirect("/members");
});

// --- グループ作成 ---
router.post("/groups", async (req, res) => {
  const { groupName } = req.body;
  if (groupName) {
    await prisma.group.create({ data: { name: groupName } });
  }
  res.redirect("/members");
});

export default router;
