# データベース設計

## テーブル構成

### daily_reports（日報）

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | UUID (PK) | 自動生成 |
| user_id | UUID (FK) | auth.users.id |
| report_date | DATE | 報告日 |
| project_name | TEXT | プロジェクト名 |
| tomorrow_plan | TEXT | 明日の予定 |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 更新日時 |

### daily_tasks（日報タスク明細）

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | UUID (PK) | 自動生成 |
| daily_report_id | UUID (FK) | daily_reports.id |
| task_name | TEXT | タスク名 |
| category | TEXT | カテゴリ（開発/設計/教育/会議/その他） |
| hours | DECIMAL | 所要工数（時間） |
| progress | INT | 進捗率（0-100） |
| kpi_contribution | TEXT | KGI/KPIへの寄与 |

### daily_issues（課題と対策）

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | UUID (PK) | 自動生成 |
| daily_report_id | UUID (FK) | daily_reports.id |
| issue | TEXT | 課題内容 |
| cause | TEXT | 原因分析 |
| action | TEXT | 対策/ネクストアクション |
| resolved | BOOLEAN | 解決済みフラグ |

### efficiency_actions（工数削減アクション）

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | UUID (PK) | 自動生成 |
| daily_report_id | UUID (FK) | daily_reports.id |
| description | TEXT | 何をしたか |
| hours_saved | DECIMAL | 削減時間（時間） |
| category | TEXT | 自動化/効率化/プロセス改善/ツール導入 |

### knowledge_notes（定性的気づき・暗黙知）

| カラム | 型 | 説明 |
| --- | --- | --- |
| id | UUID (PK) | 自動生成 |
| daily_report_id | UUID (FK) | daily_reports.id |
| content | TEXT | 気づきの内容 |
| tags | TEXT[] | タグ（教育/技術/チーム/プロセス等） |
| is_shared | BOOLEAN | チーム共有フラグ |

## SQL定義

```sql
-- 日報
CREATE TABLE daily_reports (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_date   DATE NOT NULL,
  project_name  TEXT NOT NULL,
  tomorrow_plan TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, report_date)
);

-- 日報タスク明細
CREATE TABLE daily_tasks (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_report_id   UUID REFERENCES daily_reports(id) ON DELETE CASCADE NOT NULL,
  task_name         TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'その他',
  hours             DECIMAL(4,1) NOT NULL DEFAULT 0,
  progress          INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  kpi_contribution  TEXT
);

-- 課題と対策
CREATE TABLE daily_issues (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_report_id   UUID REFERENCES daily_reports(id) ON DELETE CASCADE NOT NULL,
  issue             TEXT NOT NULL,
  cause             TEXT,
  action            TEXT,
  resolved          BOOLEAN NOT NULL DEFAULT false
);

-- 工数削減アクション
CREATE TABLE efficiency_actions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_report_id   UUID REFERENCES daily_reports(id) ON DELETE CASCADE NOT NULL,
  description       TEXT NOT NULL,
  hours_saved       DECIMAL(4,1) NOT NULL DEFAULT 0,
  category          TEXT NOT NULL DEFAULT 'その他'
);

-- 定性的気づき・暗黙知
CREATE TABLE knowledge_notes (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_report_id   UUID REFERENCES daily_reports(id) ON DELETE CASCADE NOT NULL,
  content           TEXT NOT NULL,
  tags              TEXT[] DEFAULT '{}',
  is_shared         BOOLEAN NOT NULL DEFAULT false
);
```

## ビュー（週報・月報集約用）

```sql
-- 週報集約ビュー
CREATE VIEW weekly_summary AS
SELECT
  user_id,
  date_trunc('week', report_date)::DATE AS week_start,
  COUNT(DISTINCT report_date) AS report_count,
  (SELECT COALESCE(SUM(dt.hours), 0)
   FROM daily_tasks dt
   JOIN daily_reports dr2 ON dt.daily_report_id = dr2.id
   WHERE dr2.user_id = dr.user_id
     AND date_trunc('week', dr2.report_date) = date_trunc('week', dr.report_date)
  ) AS total_hours,
  (SELECT COALESCE(SUM(ea.hours_saved), 0)
   FROM efficiency_actions ea
   JOIN daily_reports dr3 ON ea.daily_report_id = dr3.id
   WHERE dr3.user_id = dr.user_id
     AND date_trunc('week', dr3.report_date) = date_trunc('week', dr.report_date)
  ) AS total_hours_saved
FROM daily_reports dr
GROUP BY user_id, date_trunc('week', report_date);

-- 月報集約ビュー
CREATE VIEW monthly_summary AS
SELECT
  user_id,
  date_trunc('month', report_date)::DATE AS month_start,
  COUNT(DISTINCT report_date) AS report_count,
  (SELECT COALESCE(SUM(dt.hours), 0)
   FROM daily_tasks dt
   JOIN daily_reports dr2 ON dt.daily_report_id = dr2.id
   WHERE dr2.user_id = dr.user_id
     AND date_trunc('month', dr2.report_date) = date_trunc('month', dr.report_date)
  ) AS total_hours,
  (SELECT COALESCE(SUM(ea.hours_saved), 0)
   FROM efficiency_actions ea
   JOIN daily_reports dr3 ON ea.daily_report_id = dr3.id
   WHERE dr3.user_id = dr.user_id
     AND date_trunc('month', dr3.report_date) = date_trunc('month', dr.report_date)
  ) AS total_hours_saved
FROM daily_reports dr
GROUP BY user_id, date_trunc('month', report_date);
```

## プルダウン項目（入力規則）

| 項目 | 選択肢 |
| --- | --- |
| category (タスク) | 開発, 設計, 教育, 会議, レビュー, 調査, ドキュメント, その他 |
| category (工数削減) | 自動化, 効率化, プロセス改善, ツール導入 |
| tags (気づき) | 教育, 技術, チーム, プロセス, ツール, コミュニケーション |
