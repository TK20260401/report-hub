"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Task = {
  task_name: string;
  category: string;
  hours: number;
  progress: number;
  kpi_contribution: string;
};

type EfficiencyAction = {
  description: string;
  hours_saved: number;
  category: string;
};

type KnowledgeNote = {
  content: string;
  tags: string[];
};

const TASK_CATEGORIES = ["開発", "設計", "教育", "会議", "レビュー", "調査", "ドキュメント", "その他"];
const EFFICIENCY_CATEGORIES = ["自動化", "効率化", "プロセス改善", "ツール導入"];

function emptyTask(): Task {
  return { task_name: "", category: "開発", hours: 0, progress: 0, kpi_contribution: "" };
}

function emptyAction(): EfficiencyAction {
  return { description: "", hours_saved: 0, category: "効率化" };
}

function emptyNote(): KnowledgeNote {
  return { content: "", tags: [] };
}

export default function NewReportPage() {
  const router = useRouter();
  const supabase = createClient();

  const today = new Date().toISOString().split("T")[0];

  const [reportDate, setReportDate] = useState(today);
  const [projectName, setProjectName] = useState("");
  const [tomorrowPlan, setTomorrowPlan] = useState("");
  const [tasks, setTasks] = useState<Task[]>([emptyTask()]);
  const [actions, setActions] = useState<EfficiencyAction[]>([emptyAction()]);
  const [notes, setNotes] = useState<KnowledgeNote[]>([emptyNote()]);
  const [issues, setIssues] = useState<{ issue: string; cause: string; action: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateTask(index: number, field: keyof Task, value: string | number) {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  }

  function updateAction(index: number, field: keyof EfficiencyAction, value: string | number) {
    setActions((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  }

  function updateNote(index: number, field: string, value: string | string[]) {
    setNotes((prev) => prev.map((n, i) => (i === index ? { ...n, [field]: value } : n)));
  }

  function updateIssue(index: number, field: string, value: string) {
    setIssues((prev) => prev.map((is, i) => (i === index ? { ...is, [field]: value } : is)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim()) {
      setError("プロジェクト名を入力してください。");
      return;
    }
    if (tasks.every((t) => !t.task_name.trim())) {
      setError("タスクを1つ以上入力してください。");
      return;
    }

    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("ログインが必要です。");
      setLoading(false);
      return;
    }

    // 日報本体を作成
    const { data: report, error: reportError } = await supabase
      .from("daily_reports")
      .insert({
        user_id: user.id,
        report_date: reportDate,
        project_name: projectName,
        tomorrow_plan: tomorrowPlan || null,
      })
      .select("id")
      .single();

    if (reportError) {
      setError(reportError.message);
      setLoading(false);
      return;
    }

    const reportId = report.id;

    // タスク登録
    const validTasks = tasks.filter((t) => t.task_name.trim());
    if (validTasks.length > 0) {
      const { error: taskError } = await supabase.from("daily_tasks").insert(
        validTasks.map((t) => ({
          daily_report_id: reportId,
          task_name: t.task_name,
          category: t.category,
          hours: t.hours,
          progress: t.progress,
          kpi_contribution: t.kpi_contribution || null,
        }))
      );
      if (taskError) {
        setError("タスク登録エラー: " + taskError.message);
        setLoading(false);
        return;
      }
    }

    // 工数削減アクション登録
    const validActions = actions.filter((a) => a.description.trim());
    if (validActions.length > 0) {
      const { error: actionError } = await supabase.from("efficiency_actions").insert(
        validActions.map((a) => ({
          daily_report_id: reportId,
          description: a.description,
          hours_saved: a.hours_saved,
          category: a.category,
        }))
      );
      if (actionError) {
        setError("工数削減登録エラー: " + actionError.message);
        setLoading(false);
        return;
      }
    }

    // 課題登録
    const validIssues = issues.filter((is) => is.issue.trim());
    if (validIssues.length > 0) {
      const { error: issueError } = await supabase.from("daily_issues").insert(
        validIssues.map((is) => ({
          daily_report_id: reportId,
          issue: is.issue,
          cause: is.cause || null,
          action: is.action || null,
        }))
      );
      if (issueError) {
        setError("課題登録エラー: " + issueError.message);
        setLoading(false);
        return;
      }
    }

    // 気づき登録
    const validNotes = notes.filter((n) => n.content.trim());
    if (validNotes.length > 0) {
      const { error: noteError } = await supabase.from("knowledge_notes").insert(
        validNotes.map((n) => ({
          daily_report_id: reportId,
          content: n.content,
          tags: n.tags,
        }))
      );
      if (noteError) {
        setError("気づき登録エラー: " + noteError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/");
    router.refresh();
  }

  const inputClass =
    "w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40";
  const selectClass = inputClass;
  const labelClass = "block text-xs font-medium text-foreground/70 mb-1";

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-foreground/10 px-4 py-3 sm:px-6 sm:py-4">
        <h1 className="text-base font-bold sm:text-lg">日報を書く</h1>
        <button
          onClick={() => router.push("/")}
          className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm text-foreground hover:bg-foreground/5"
        >
          戻る
        </button>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
          {/* 基本情報 */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">基本情報</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>日付</label>
                <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>プロジェクト名</label>
                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className={inputClass} placeholder="例: Report Hub" required />
              </div>
            </div>
          </section>

          {/* タスク */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">実施タスク</h2>
              <button type="button" onClick={() => setTasks([...tasks, emptyTask()])} className="text-xs text-blue-600 hover:underline">
                + 追加
              </button>
            </div>
            {tasks.map((task, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-foreground/10 p-3">
                <div className="flex items-center gap-2">
                  <input type="text" value={task.task_name} onChange={(e) => updateTask(i, "task_name", e.target.value)} className={inputClass} placeholder="タスク名" />
                  {tasks.length > 1 && (
                    <button type="button" onClick={() => setTasks(tasks.filter((_, j) => j !== i))} className="shrink-0 text-xs text-red-500 hover:underline">
                      削除
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelClass}>カテゴリ</label>
                    <select value={task.category} onChange={(e) => updateTask(i, "category", e.target.value)} className={selectClass}>
                      {TASK_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>工数(h)</label>
                    <input type="number" step="0.5" min="0" value={task.hours} onChange={(e) => updateTask(i, "hours", parseFloat(e.target.value) || 0)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>進捗(%)</label>
                    <input type="number" min="0" max="100" step="10" value={task.progress} onChange={(e) => updateTask(i, "progress", parseInt(e.target.value) || 0)} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>KGI/KPIへの寄与</label>
                  <input type="text" value={task.kpi_contribution} onChange={(e) => updateTask(i, "kpi_contribution", e.target.value)} className={inputClass} placeholder="例: ユーザー満足度向上に寄与" />
                </div>
              </div>
            ))}
          </section>

          {/* 工数削減アクション */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">工数削減アクション <span className="text-xs font-normal text-red-500">必須</span></h2>
              <button type="button" onClick={() => setActions([...actions, emptyAction()])} className="text-xs text-blue-600 hover:underline">
                + 追加
              </button>
            </div>
            {actions.map((action, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-foreground/10 p-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className={labelClass}>何をしたか</label>
                  <input type="text" value={action.description} onChange={(e) => updateAction(i, "description", e.target.value)} className={inputClass} placeholder="例: テスト自動化スクリプト作成" />
                </div>
                <div className="w-full sm:w-24">
                  <label className={labelClass}>削減(h)</label>
                  <input type="number" step="0.5" min="0" value={action.hours_saved} onChange={(e) => updateAction(i, "hours_saved", parseFloat(e.target.value) || 0)} className={inputClass} />
                </div>
                <div className="w-full sm:w-32">
                  <label className={labelClass}>分類</label>
                  <select value={action.category} onChange={(e) => updateAction(i, "category", e.target.value)} className={selectClass}>
                    {EFFICIENCY_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
                {actions.length > 1 && (
                  <button type="button" onClick={() => setActions(actions.filter((_, j) => j !== i))} className="shrink-0 text-xs text-red-500 hover:underline">
                    削除
                  </button>
                )}
              </div>
            ))}
          </section>

          {/* 課題と対策 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">課題と対策 <span className="text-xs font-normal text-foreground/40">任意</span></h2>
              <button type="button" onClick={() => setIssues([...issues, { issue: "", cause: "", action: "" }])} className="text-xs text-blue-600 hover:underline">
                + 追加
              </button>
            </div>
            {issues.map((is, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-foreground/10 p-3">
                <div className="flex items-center gap-2">
                  <input type="text" value={is.issue} onChange={(e) => updateIssue(i, "issue", e.target.value)} className={inputClass} placeholder="課題内容" />
                  <button type="button" onClick={() => setIssues(issues.filter((_, j) => j !== i))} className="shrink-0 text-xs text-red-500 hover:underline">
                    削除
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={is.cause} onChange={(e) => updateIssue(i, "cause", e.target.value)} className={inputClass} placeholder="原因分析" />
                  <input type="text" value={is.action} onChange={(e) => updateIssue(i, "action", e.target.value)} className={inputClass} placeholder="対策/ネクストアクション" />
                </div>
              </div>
            ))}
          </section>

          {/* 定性的気づき */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">定性的気づき・暗黙知 <span className="text-xs font-normal text-red-500">必須</span></h2>
              <button type="button" onClick={() => setNotes([...notes, emptyNote()])} className="text-xs text-blue-600 hover:underline">
                + 追加
              </button>
            </div>
            {notes.map((note, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-foreground/10 p-3">
                <div className="flex items-center gap-2">
                  <textarea value={note.content} onChange={(e) => updateNote(i, "content", e.target.value)} className={inputClass + " min-h-[60px] resize-y"} placeholder="教育知見・技術的発見・チームへの共有事項など" />
                  {notes.length > 1 && (
                    <button type="button" onClick={() => setNotes(notes.filter((_, j) => j !== i))} className="shrink-0 self-start text-xs text-red-500 hover:underline">
                      削除
                    </button>
                  )}
                </div>
                <div>
                  <label className={labelClass}>タグ（カンマ区切り）</label>
                  <input
                    type="text"
                    value={note.tags.join(", ")}
                    onChange={(e) => updateNote(i, "tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
                    className={inputClass}
                    placeholder="教育, 技術, チーム"
                  />
                </div>
              </div>
            ))}
          </section>

          {/* 明日の予定 */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">明日の予定</h2>
            <textarea value={tomorrowPlan} onChange={(e) => setTomorrowPlan(e.target.value)} className={inputClass + " min-h-[60px] resize-y"} placeholder="翌日の計画タスク" />
          </section>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50 sm:py-2"
          >
            {loading ? "登録中..." : "日報を登録する"}
          </button>
        </form>
      </main>
    </div>
  );
}
