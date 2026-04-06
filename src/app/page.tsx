import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "./logout-button";

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    開発: "bg-blue-100 text-blue-800",
    設計: "bg-purple-100 text-purple-800",
    教育: "bg-green-100 text-green-800",
    会議: "bg-yellow-100 text-yellow-800",
    レビュー: "bg-orange-100 text-orange-800",
    調査: "bg-cyan-100 text-cyan-800",
    ドキュメント: "bg-indigo-100 text-indigo-800",
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

  // 日報一覧を取得
  const { data: reports } = await supabase
    .from("daily_reports")
    .select("id, report_date, project_name, tomorrow_plan")
    .eq("user_id", user.id)
    .order("report_date", { ascending: false })
    .limit(20);

  // 各日報のタスク・工数削減・気づきを取得
  const reportIds = (reports ?? []).map((r) => r.id);

  const [tasksRes, actionsRes, notesRes] = await Promise.all([
    reportIds.length > 0
      ? supabase.from("daily_tasks").select("*").in("daily_report_id", reportIds)
      : { data: [] },
    reportIds.length > 0
      ? supabase.from("efficiency_actions").select("*").in("daily_report_id", reportIds)
      : { data: [] },
    reportIds.length > 0
      ? supabase.from("knowledge_notes").select("*").in("daily_report_id", reportIds)
      : { data: [] },
  ]);

  type AnyRow = Record<string, unknown>;

  const tasksByReport = new Map<string, AnyRow[]>();
  (tasksRes.data ?? []).forEach((t: AnyRow) => {
    const rid = t.daily_report_id as string;
    if (!tasksByReport.has(rid)) tasksByReport.set(rid, []);
    tasksByReport.get(rid)!.push(t);
  });

  const actionsByReport = new Map<string, AnyRow[]>();
  (actionsRes.data ?? []).forEach((a: AnyRow) => {
    const rid = a.daily_report_id as string;
    if (!actionsByReport.has(rid)) actionsByReport.set(rid, []);
    actionsByReport.get(rid)!.push(a);
  });

  const notesByReport = new Map<string, AnyRow[]>();
  (notesRes.data ?? []).forEach((n: AnyRow) => {
    const rid = n.daily_report_id as string;
    if (!notesByReport.has(rid)) notesByReport.set(rid, []);
    notesByReport.get(rid)!.push(n);
  });

  // 集計
  const allTasks = (tasksRes.data ?? []) as AnyRow[];
  const allActions = (actionsRes.data ?? []) as AnyRow[];
  const totalHours = allTasks.reduce((sum: number, t) => sum + (Number(t.hours) || 0), 0);
  const totalSaved = allActions.reduce((sum: number, a) => sum + (Number(a.hours_saved) || 0), 0);
  const totalKnowledge = (notesRes.data ?? []).length;
  const reportCount = (reports ?? []).length;

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
            <p className="text-xl font-bold sm:text-2xl">{reportCount}</p>
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

        {/* 日報作成ボタン + 一覧ヘッダー */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold sm:text-base">日報一覧</h2>
          <Link
            href="/reports/new"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
          >
            + 日報を書く
          </Link>
        </div>

        {/* 日報一覧 */}
        {reportCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-foreground/40">
            <p className="mb-4 text-lg">まだ日報がありません</p>
            <Link
              href="/reports/new"
              className="rounded-md bg-foreground px-6 py-3 text-sm font-medium text-background hover:bg-foreground/90"
            >
              最初の日報を書く
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {(reports ?? []).map((report) => {
              const rTasks = tasksByReport.get(report.id) ?? [];
              const rActions = actionsByReport.get(report.id) ?? [];
              const rNotes = notesByReport.get(report.id) ?? [];
              const dayHours = rTasks.reduce((s: number, t) => s + (Number(t.hours) || 0), 0);

              return (
                <div key={report.id} className="rounded-lg border border-foreground/10 p-4 sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium">{report.report_date}</span>
                      <span className="rounded bg-foreground/5 px-2 py-0.5 text-xs">{report.project_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground/50">{dayHours}h</span>
                      <Link
                        href={`/reports/${report.id}/edit`}
                        className="rounded border border-foreground/20 px-2 py-1 text-xs text-foreground/60 hover:bg-foreground/5"
                      >
                        編集
                      </Link>
                    </div>
                  </div>

                  {rTasks.length > 0 && (
                    <div className="mb-3 space-y-1">
                      {rTasks.map((task: AnyRow) => (
                        <div key={task.id as string} className="flex items-center gap-2 text-sm">
                          <CategoryBadge category={task.category as string} />
                          <span className="flex-1">{task.task_name as string}</span>
                          <span className="text-foreground/50">{String(task.hours)}h</span>
                          <span className="w-12 text-right text-foreground/50">{String(task.progress)}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(rActions.length > 0 || rNotes.length > 0) && (
                    <div className="space-y-1 border-t border-foreground/5 pt-3 text-sm">
                      {rActions.map((action: AnyRow) => (
                        <div key={action.id as string} className="flex items-start gap-2">
                          <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">削減</span>
                          <span>{action.description as string}</span>
                          <span className="ml-auto shrink-0 font-medium text-green-600">-{String(action.hours_saved)}h</span>
                        </div>
                      ))}
                      {rNotes.map((note: AnyRow) => (
                        <div key={note.id as string} className="flex items-start gap-2">
                          <span className="shrink-0 rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">知見</span>
                          <span className="text-foreground/70">{note.content as string}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {report.tomorrow_plan && (
                    <div className="mt-2 text-xs text-foreground/40">
                      明日の予定: {report.tomorrow_plan}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
