-- Lead logged per ascent ("go"): clean / topped with N takes / not topped (how far up).
-- Goes on the same route share RouteKey; GoNumber counts them (1, 2, 3…).
alter table "ClimbingLog"
  add column if not exists "RouteKey"   text,
  add column if not exists "GoNumber"   integer,
  add column if not exists "ReachedTop" boolean,
  add column if not exists "Takes"      integer,
  add column if not exists "HeightPct"  integer check ("HeightPct" between 1 and 100);

create index if not exists "ClimbingLog_RouteKey_idx" on "ClimbingLog" ("RouteKey");

-- Volume of a lead go (rows with a RouteKey): reached the top (clean or with takes) = the grade's
-- full score; not topped = the share of the route climbed (HeightPct, ½ when unknown).
-- The existing volume trigger gives an unsent row half the score; this one runs after it
-- (BEFORE triggers fire in name order, "zzz_" last) and only touches lead-go rows.
-- Boulder / board / older lead rows keep their current calculation.
create or replace function lead_go_volume() returns trigger language plpgsql as $$
declare s numeric;
begin
  if new."ClimbType" = 'Lead' and new."RouteKey" is not null then
    select "Score" into s from "LeadGrades" where "LeadGradeID" = new."GradeID";
    new."VolumeScore" := coalesce(s, 0) *
      case when coalesce(new."ReachedTop", new."Successful", false) then 1
           else coalesce(new."HeightPct", 50) / 100.0 end;
  end if;
  return new;
end $$;

drop trigger if exists zzz_lead_go_volume on "ClimbingLog";
create trigger zzz_lead_go_volume before insert or update on "ClimbingLog"
  for each row execute function lead_go_volume();
