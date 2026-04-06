import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";

// サンプルデータ（後日DBに切り替え）
const sampleReports = [
  {
    date: "2026-04-06",
    project: "備品管理台帳",
    tasks: [
      { name: "DB設計・マイグレーション", category: "設計", hours: 2.0, progress: 100 },
      { name: "認証機能実装", category: "開発", hours: 1.5, progress: 100 },
      { name: "レスポンシブ対応", category: "開発", hours: 1.0, progress: 80 },
    ],
    efficiencyAction: { description: "Claude Codeで認証テンプレート自動生成", hoursSaved: 1.5 },
    knowledge: "Supabase RLSでメールベースの権限制御が簡潔に実装できる",
    tomorrowPlan: "備品CRUDフォーム実装",
  },
  {
    date: "2026-04-05",
    project: "IPAS-Master",
    tasks: [
      { name: "問題データ追加（50問）", category: "開発", hours: 3.0, progress: 100 },
      { name: "レーダーチャート改修", category: "開発", hours: 1.0, progress: 100 },
      { name: "コードレビュー", category: "レビュー", hours: 0.5, progress: 100 },
    ],
    efficiencyAction: { description: "問題JSONの一括生成スクリプト作成", hoursSaved: 2.0 },
    knowledge: "分野別の正答率を見せることで学習者の自己効力感が向上する",
    tomorrowPlan: "用語フラッシュの追加・UI改善",
  },
  {
    date: "2026-04-04",
    project: "Logic-Riichi",
    tasks: [
      { name: "ランキング機能実装", category: "開発", hours: 2.5, progress: 100 },
      { name: "テスト・デバッグ", category: "開発", hours: 1.0, progress: 100 },
      { name: "チームMTG", category: "会議", hours: 1.0, progress: 100 },
    ],
    efficiencyAction: { description: "Supabaseビューで集計SQLをまとめた", hoursSaved: 0.5 },
    knowledge: "ゲーミフィケーション要素（ランキング）は学習継続率に大きく寄与する",
    tomorrowPlan: "待ち牌クイズのHardモード追加",
  },
];

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    開発: "bg-blue-100 text-blue-800",
    設計: "bg-purple-100 text-purple-800",
    教育: "bg-green-100 text-green-800",
    会議: "bg-yellow-100 text-yellow-800",
    レビュー: "bg-orange-100 text-orange-800",
    調査: "bg-cyan-100 text-cyan-800",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[category] ?? "bg-gray-100 text-gray-800"}`}>
      {category}
    </span>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const totalHours = sampleReports.reduce(
    (sum, r) => sum + r.tasks.reduce((s, t) => s + t.hours, 0), 0
  );
  const totalSaved = sampleReports.reduce(
    (sum, r) => sum + r.efficiencyAction.hoursSaved, 0
  );
  const totalKnowledge = sampleReports.length;

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/10 px-4 py-3 sm:px-6 sm:py-4">
        <h1 className="text-base font-bold sm:text-lg">Report Hub</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden text-sm text-foreground/60 sm:inline">{user.email}</span>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6">
        {/* ダッシュボードカード */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-lg border border-foreground/10 p-3 sm:p-4">
            <p className="text-xs text-foreground/50 sm:text-sm">日報数</p>
            <p className="text-xl font-bold sm:text-2xl">{sampleReports.length}</p>
          </div>
          <div className="rounded-lg border border-foreground/10 p-3 sm:p-4">
            <p className="text-xs text-foreground/50 sm:text-sm">総工数</p>
            <p className="text-xl font-bold text-blue-600 sm:text-2xl">{totalHours}h</p>
          </div>
          <div className="rounded-lg border border-foreground/10 p-3 sm:p-4">
            <p className="text-xs text-foreground/50 sm:text-sm">工数削減</p>
            <p className="text-xl font-bold text-green-600 sm:text-2xl">{totalSaved}h</p>
          </div>
          <div className="rounded-lg border border-foreground/10 p-3 sm:p-4">
            <p className="text-xs text-foreground/50 sm:text-sm">ナレッジ</p>
            <p className="text-xl font-bold text-purple-600 sm:text-2xl">{totalKnowledge}件</p>
          </div>
        </div>

        {/* 見本ラベル */}
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-semibold sm:text-base">日報一覧</h2>
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            サンプルデータ
          </span>
        </div>

        {/* 日報カード */}
        <div className="space-y-4">
          {sampleReports.map((report) => (
            <div key={report.date} className="rounded-lg border border-foreground/10 p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium">{report.date}</span>
                  <span className="rounded bg-foreground/5 px-2 py-0.5 text-xs">{report.project}</span>
                </div>
                <span className="text-xs text-foreground/50">
                  {report.tasks.reduce((s, t) => s + t.hours, 0)}h
                </span>
              </div>

              <div className="mb-3 space-y-1">
                {report.tasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CategoryBadge category={task.category} />
                    <span className="flex-1">{task.name}</span>
                    <span className="text-foreground/50">{task.hours}h</span>
                    <span className="w-12 text-right text-foreground/50">{task.progress}%</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 border-t border-foreground/5 pt-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">削減</span>
                  <span>{report.efficiencyAction.description}</span>
                  <span className="ml-auto shrink-0 font-medium text-green-600">-{report.efficiencyAction.hoursSaved}h</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">知見</span>
                  <span className="text-foreground/70">{report.knowledge}</span>
                </div>
              </div>

              <div className="mt-2 text-xs text-foreground/40">
                明日の予定: {report.tomorrowPlan}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
