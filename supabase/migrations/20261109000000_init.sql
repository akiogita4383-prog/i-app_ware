-- my coordy: サーバー側に置くのは「AI の利用回数」だけ。服のデータや写真は端末内にのみ保存する。

create table public.ai_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  fn         text not null,
  created_at timestamptz not null default now()
);

create index ai_usage_user_fn_time on public.ai_usage (user_id, fn, created_at desc);

-- アプリからは直接読み書きさせない（ポリシー無し = Edge Functions のサービスロールのみアクセス可）
alter table public.ai_usage enable row level security;
