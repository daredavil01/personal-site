-- 0017 — Admin evaluations on the /ask conversation log.
--
-- Reader feedback (feedback, feedback_tags, feedback_comment) is what a visitor
-- said about an answer. These eval_* columns are the owner's own judgement,
-- kept separate so neither overwrites the other. Written from
-- /admin/ask/conversations in eval mode; the existing "owner write" RLS policy
-- on ask_messages (0012) already covers the update, so no RPC is needed.

alter table public.ask_messages
  add column if not exists eval_verdict text,
  add column if not exists eval_score smallint,
  add column if not exists eval_tags text[] not null default '{}',
  add column if not exists eval_notes text,
  add column if not exists eval_ideal_answer text,
  add column if not exists evaluated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ask_messages_eval_verdict') then
    alter table public.ask_messages
      add constraint ask_messages_eval_verdict check (eval_verdict in ('pass', 'fail'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ask_messages_eval_score') then
    alter table public.ask_messages
      add constraint ask_messages_eval_score check (eval_score between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ask_messages_eval_text_len') then
    alter table public.ask_messages
      add constraint ask_messages_eval_text_len check (
        (eval_notes is null or char_length(eval_notes) <= 4000)
        and (eval_ideal_answer is null or char_length(eval_ideal_answer) <= 8000)
      );
  end if;
end$$;

notify pgrst, 'reload schema';
