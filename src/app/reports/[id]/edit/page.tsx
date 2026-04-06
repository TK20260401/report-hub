"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import ReportForm, { type ReportFormData } from "../../report-form";

export default function EditReportPage() {
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [initialData, setInitialData] = useState<ReportFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      // 日報本体
      const { data: report, error: reportError } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("id", id)
        .single();

      if (reportError || !report) {
        setError("日報が見つかりません。");
        setLoading(false);
        return;
      }

      // 子テーブルを並列取得
      const [tasksRes, actionsRes, issuesRes, notesRes] = await Promise.all([
        supabase.from("daily_tasks").select("*").eq("daily_report_id", id),
        supabase.from("efficiency_actions").select("*").eq("daily_report_id", id),
        supabase.from("daily_issues").select("*").eq("daily_report_id", id),
        supabase.from("knowledge_notes").select("*").eq("daily_report_id", id),
      ]);

      setInitialData({
        reportDate: report.report_date,
        projectName: report.project_name,
        tomorrowPlan: report.tomorrow_plan ?? "",
        tasks: (tasksRes.data ?? []).map((t) => ({
          task_name: t.task_name,
          category: t.category,
          hours: Number(t.hours),
          progress: t.progress,
          kpi_contribution: t.kpi_contribution ?? "",
        })),
        actions: (actionsRes.data ?? []).map((a) => ({
          description: a.description,
          hours_saved: Number(a.hours_saved),
          category: a.category,
        })),
        issues: (issuesRes.data ?? []).map((is) => ({
          issue: is.issue,
          cause: is.cause ?? "",
          action: is.action ?? "",
        })),
        notes: (notesRes.data ?? []).map((n) => ({
          content: n.content,
          tags: n.tags ?? [],
        })),
      });
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-foreground/40">読み込み中...</p>
      </div>
    );
  }

  if (error || !initialData) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-red-500">{error || "データの読み込みに失敗しました。"}</p>
      </div>
    );
  }

  return <ReportForm mode="edit" reportId={id} initialData={initialData} />;
}
