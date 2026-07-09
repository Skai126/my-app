import express, { Request, Response, Router } from "express";
import { prisma } from "../prisma";

const router = Router();

// フロントエンドと合致させる役割の順序
const ROLE_ORDER = ["社長", "部長", "正社員", "アルバイト"] as const;

// --- 型定義 ---

// 1. フロントから送られてくるリクエストボディの型
interface CalculateRequestBody {
  total_amount: number | string;
  participants: number | number[]; // フロントから空配列が来るケースも考慮
  ratio_settings?: string;
  round_mode?: "floor" | "ceil" | "round";
  organizer_member_id: number | string;
}

// 2. 計算過程で扱うメンバーごとの支払いデータ型
interface CalculationResult {
  memberId: number;
  raw: number;
  amountToPay: number;
  gapToNextHundred: number;
}

// -------------

// 1. 計算画面を表示
router.get("/new", async (req: Request, res: Response) => {
  const members = await prisma.member.findMany();
  res.render("events/new", { members });
});

// 2. 計算実行と保存
// 2. 計算実行と保存
router.post(
  "/",
  async (
    req: Request<{}, {}, CalculateRequestBody>,
    res: Response,
  ): Promise<void> => {
    const {
      total_amount,
      participants,
      ratio_settings,
      round_mode,
      organizer_member_id,
    } = req.body;

    // --- バリデーション & サニタイズ ---
    if (!participants) {
      res.status(400).send("参加者が指定されていません。");
      return;
    }

    const ids = (Array.isArray(participants) ? participants : [participants])
      .map(Number)
      .filter((id) => !isNaN(id));

    if (ids.length === 0) {
      res.status(400).send("有効な参加者が選ばれておらんぞ。");
      return;
    }

    const totalAmount = Number(total_amount);
    const roundMode = round_mode || "ceil";

    const selectedMembers = await prisma.member.findMany({
      where: { id: { in: ids } },
    });

    if (selectedMembers.length === 0) {
      res.status(400).send("DBに参加者が存在しません。");
      return;
    }

    // --- 比率のパース ---
    let finalRatioSettings = "";
    if (Array.isArray(ratio_settings)) {
      finalRatioSettings = String(ratio_settings[ratio_settings.length - 1]);
    } else {
      finalRatioSettings = String(ratio_settings || "");
    }

    const ratioValues = finalRatioSettings.split(":").map(Number);
    const ratioMap: Record<string, number> = {};
    ROLE_ORDER.forEach((role, index) => {
      ratioMap[role] = ratioValues[index] || 1;
    });

    const totalRatio = selectedMembers.reduce((sum, m) => {
      const role = (m as any).roleClass || (m as any).role_class;
      return sum + (ratioMap[role] || 0);
    }, 0);

    if (totalRatio === 0) {
      res.status(400).send("比率の合計が0になっています。");
      return;
    }

    // --- 丸めと計算 ---
    const roundHundred = (
      amount: number,
      mode: "floor" | "ceil" | "round",
    ): number => {
      if (mode === "floor") return Math.floor(amount / 100) * 100;
      if (mode === "ceil") return Math.ceil(amount / 100) * 100;
      return Math.round(amount / 100) * 100;
    };

    const results: CalculationResult[] = selectedMembers.map((m) => {
      const role = (m as any).roleClass || (m as any).role_class;
      const ratio = ratioMap[role] || 0;
      const rawAmount = (totalAmount * ratio) / totalRatio;
      const roundedAmount = roundHundred(rawAmount, roundMode);
      return {
        memberId: m.id,
        raw: rawAmount,
        amountToPay: roundedAmount,
        gapToNextHundred: Math.ceil(rawAmount / 100) * 100 - roundedAmount,
      };
    });

    let actualTotal = results.reduce((sum, r) => sum + r.amountToPay, 0);

    // 不足分の補填ロジック
    if (totalAmount > 0 && actualTotal < totalAmount) {
      let remainingUnits = Math.ceil((totalAmount - actualTotal) / 100);
      const priorityIndices = results
        .map((r, index) => ({ index, ...r }))
        .sort(
          (a, b) => b.gapToNextHundred - a.gapToNextHundred || b.raw - a.raw,
        )
        .map((p) => p.index);

      while (remainingUnits > 0) {
        for (const index of priorityIndices) {
          results[index].amountToPay += 100;
          actualTotal += 100;
          remainingUnits -= 1;
          if (remainingUnits === 0) break;
        }
      }
    }

    const organizerProfit = actualTotal - totalAmount;
    const attendancesData = results.map((r) => ({
      memberId: r.memberId,
      amountToPay: r.amountToPay,
    }));

    // --- データベースへの保存 ---
    try {
      const event = await prisma.event.create({
        data: {
          totalAmount,
          ratioSettings: finalRatioSettings,
          organizerProfit,
          organizerId: Number(organizer_member_id),
          attendances: { create: attendancesData },
        },
        include: {
          attendances: { include: { member: true } },
          organizer: true,
        },
      });

      res.render("events/result", { event });
    } catch (error) {
      console.error("Event creation failed:", error);
      res.status(500).send("DBへの保存中にエラーが発生しました。");
    }
  },
);

// 3. 履歴一覧
router.get("/history", async (req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    orderBy: { eventDate: "desc" },
    include: { organizer: true, attendances: { include: { member: true } } },
  });
  res.render("events/history", { events });
});

export default router;
