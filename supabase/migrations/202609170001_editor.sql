begin;
create table public.jump_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('producer','editor','publisher'))
);
create table public.jump_drafts (
 id uuid primary key default gen_random_uuid(), body jsonb not null,
 version integer not null default 1, created_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
create table public.jump_revisions (
 draft_id uuid not null references public.jump_drafts(id), version integer not null,
 body jsonb not null, actor uuid not null references auth.users(id),
 created_at timestamptz not null default now(), primary key(draft_id,version)
);
create table public.jump_assets (
 id uuid primary key default gen_random_uuid(), draft_id uuid not null references public.jump_drafts(id),
 kind text not null check(kind in ('source','clip')), name text not null,
 storage_path text unique not null, source_id uuid references public.jump_assets(id),
 pages integer[] not null default '{}', created_at timestamptz not null default now()
);
create table public.jump_published (
 edition_date date primary key, draft_id uuid not null references public.jump_drafts(id),
 version integer not null, body jsonb not null, published_at timestamptz not null default now(),
 published_by uuid not null references auth.users(id)
);
create table public.jump_publications (
 draft_id uuid not null, version integer not null, edition_date date not null,
 body jsonb not null, actor uuid not null references auth.users(id), created_at timestamptz not null default now(),
 primary key(draft_id,version), foreign key(draft_id,version) references public.jump_revisions(draft_id,version)
);

create function public.jump_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.jump_members where user_id=auth.uid()
$$;
revoke all on function public.jump_role() from public;
grant execute on function public.jump_role() to authenticated;
alter table public.jump_members enable row level security;
alter table public.jump_drafts enable row level security;
alter table public.jump_revisions enable row level security;
alter table public.jump_assets enable row level security;
alter table public.jump_published enable row level security;
alter table public.jump_publications enable row level security;
create policy membership_read on public.jump_members for select to authenticated using(user_id=auth.uid());
create policy drafts_read on public.jump_drafts for select to authenticated using(public.jump_role() is not null);
create policy revisions_read on public.jump_revisions for select to authenticated using(public.jump_role() is not null);
create policy assets_read on public.jump_assets for select to authenticated using(public.jump_role() is not null);
create policy publications_read on public.jump_publications for select to authenticated using(public.jump_role() is not null);
create policy published_read on public.jump_published for select to anon,authenticated using(true);
revoke all on public.jump_members,public.jump_drafts,public.jump_revisions,public.jump_assets,public.jump_published,public.jump_publications from anon,authenticated;
grant select on public.jump_members,public.jump_drafts,public.jump_revisions,public.jump_assets,public.jump_publications to authenticated;
grant select(edition_date,draft_id,version,body,published_at) on public.jump_published to anon,authenticated;

create function public.jump_validate(p_body jsonb) returns void language plpgsql set search_path='' as $$
declare a jsonb; d date;
begin
 if jsonb_typeof(p_body) <> 'object' or coalesce(length(p_body->>'title'),0)=0 or length(p_body::text)>600000
 or jsonb_typeof(p_body->'articles') is distinct from 'array' or jsonb_typeof(p_body->'metrics') is distinct from 'array'
 or jsonb_typeof(p_body->'keyPoints') is distinct from 'array' or jsonb_typeof(p_body->'tones') is distinct from 'array'
 or jsonb_typeof(p_body->'intro') is distinct from 'string'
 or coalesce(p_body->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Bozza non valida' using errcode='22023'; end if;
 d:=(p_body->>'date')::date;
 if jsonb_array_length(p_body->'articles')>80 then raise exception 'Troppi articoli' using errcode='22023'; end if;
 if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(p_body->'articles') x) then raise exception 'ID duplicati' using errcode='22023'; end if;
 for a in select value from jsonb_array_elements(p_body->'articles') loop
  if coalesce(length(a->>'id'),0)=0 or coalesce(length(a->>'title'),0)=0 or coalesce(length(a->>'outlet'),0)=0 or coalesce(length(a->>'summary'),0)=0
  or jsonb_typeof(a->'pages') is distinct from 'array' then raise exception 'Articolo incompleto' using errcode='22023'; end if;
  perform (a->>'id')::uuid;
 end loop;
end $$;
revoke all on function public.jump_validate(jsonb) from public;

create function public.jump_save(p_id uuid,p_version integer,p_body jsonb) returns public.jump_drafts
language plpgsql security definer set search_path='' as $$
declare row public.jump_drafts;
begin
 if public.jump_role() is null then raise exception 'Accesso editor richiesto' using errcode='42501'; end if;
 perform public.jump_validate(p_body);
 select * into row from public.jump_drafts where id=p_id for update;
 if found then
  if row.version<>p_version then raise exception 'Versione non aggiornata' using errcode='40001'; end if;
  if row.body->>'date' is distinct from p_body->>'date' and exists(select 1 from public.jump_publications where draft_id=p_id) then raise exception 'La data di una rassegna già pubblicata non può cambiare' using errcode='22023'; end if;
  if row.body=p_body then return row; end if;
  update public.jump_drafts set body=p_body,version=version+1,updated_at=now() where id=p_id returning * into row;
 else
  if p_version<>0 then raise exception 'Bozza non trovata' using errcode='P0002'; end if;
  insert into public.jump_drafts(id,body,created_by) values(p_id,p_body,auth.uid()) returning * into row;
 end if;
 insert into public.jump_revisions(draft_id,version,body,actor) values(row.id,row.version,row.body,auth.uid());
 return row;
end $$;
create function public.jump_register_asset(p_id uuid,p_draft uuid,p_kind text,p_name text,p_source uuid default null,p_pages integer[] default '{}') returns public.jump_assets
language plpgsql security definer set search_path='' as $$
declare row public.jump_assets;
begin
 if public.jump_role() is null then raise exception 'Accesso editor richiesto' using errcode='42501'; end if;
 if p_kind not in ('source','clip') or length(p_name)>200 or p_name='' then raise exception 'File non valido' using errcode='22023'; end if;
 if not exists(select 1 from public.jump_drafts where id=p_draft) then raise exception 'Bozza non trovata' using errcode='P0002'; end if;
 if p_kind='clip' and (not exists(select 1 from public.jump_assets where id=p_source and kind='source' and draft_id=p_draft) or cardinality(p_pages)=0) then raise exception 'Fonte del ritaglio non valida' using errcode='22023'; end if;
 insert into public.jump_assets(id,draft_id,kind,name,storage_path,source_id,pages)
 values(p_id,p_draft,p_kind,p_name,p_draft::text||'/'||p_id::text||'.pdf',p_source,p_pages) returning * into row;
 return row;
end $$;

-- Publish a reviewed revision atomically; a replay never republishes over a newer edition.
create function public.jump_publish(p_id uuid,p_version integer,p_confirmation text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare row public.jump_drafts; a jsonb; clean jsonb; day date;
begin
 if public.jump_role() is distinct from 'publisher' then raise exception 'Permesso di pubblicazione richiesto' using errcode='42501'; end if;
 if p_confirmation is distinct from 'PUBBLICA' then raise exception 'Conferma esplicita richiesta' using errcode='22023'; end if;
 select * into row from public.jump_drafts where id=p_id for update;
 if not found then raise exception 'Bozza non trovata' using errcode='P0002'; end if;
 if exists(select 1 from public.jump_publications where draft_id=p_id and version=p_version) then return jsonb_build_object('alreadyPublished',true,'version',p_version); end if;
 if row.version<>p_version then raise exception 'Versione non aggiornata' using errcode='40001'; end if;
 if length(trim(row.body->>'intro'))=0 or jsonb_array_length(row.body->'articles')=0 then raise exception 'Introduzione e articoli obbligatori' using errcode='22023'; end if;
 for a in select value from jsonb_array_elements(row.body->'articles') loop
  if not exists(select 1 from public.jump_assets c join public.jump_assets s on s.id=c.source_id
    join storage.objects o on o.bucket_id='jump-files' and o.name=c.storage_path
    join storage.objects so on so.bucket_id='jump-files' and so.name=s.storage_path
    where c.id=(a->>'clipId')::uuid and c.kind='clip' and c.draft_id=p_id and s.draft_id=p_id
    and s.id=(a->>'sourceId')::uuid and to_jsonb(c.pages)=a->'pages') then
   raise exception 'Ogni articolo deve avere fonte e ritaglio caricati e coerenti' using errcode='22023';
  end if;
 end loop;
 day:=(row.body->>'date')::date;
 perform pg_advisory_xact_lock(hashtext('jump-publish-'||day::text));
 if exists(select 1 from public.jump_published where edition_date=day and draft_id<>p_id) then raise exception 'Esiste già una rassegna diversa per questa data: modifica la sua bozza' using errcode='40001'; end if;
 -- Explicit allowlist: never publish private source identifiers or editorial metadata.
 clean=jsonb_build_object('date',row.body->'date','title',row.body->'title','intro',row.body->'intro',
  'keyPoints',row.body->'keyPoints','tones',row.body->'tones',
  'metrics',(select coalesce(jsonb_agg(jsonb_build_object('label',m->'label','value',m->'value')),'[]'::jsonb) from jsonb_array_elements(row.body->'metrics') m),
  'articles',(select jsonb_agg(jsonb_build_object('id',x->'id','title',x->'title','category',x->'category','outlet',x->'outlet','author',x->'author','summary',x->'summary','rating',x->'rating','clipId',x->'clipId')) from jsonb_array_elements(row.body->'articles') x));
 insert into public.jump_publications(draft_id,version,edition_date,body,actor) values(p_id,p_version,day,clean,auth.uid());
 insert into public.jump_published(edition_date,draft_id,version,body,published_by) values(day,p_id,p_version,clean,auth.uid())
 on conflict(edition_date) do update set version=excluded.version,body=excluded.body,published_at=now(),published_by=auth.uid();
 return jsonb_build_object('published',true,'date',day,'version',p_version);
end $$;
revoke all on function public.jump_save(uuid,integer,jsonb),public.jump_register_asset(uuid,uuid,text,text,uuid,integer[]),public.jump_publish(uuid,integer,text) from public;
grant execute on function public.jump_save(uuid,integer,jsonb),public.jump_register_asset(uuid,uuid,text,text,uuid,integer[]),public.jump_publish(uuid,integer,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('jump-files','jump-files',false,52428800,array['application/pdf']);
create policy jump_file_read on storage.objects for select to authenticated using(bucket_id='jump-files' and public.jump_role() is not null);
create policy jump_file_insert on storage.objects for insert to authenticated with check(bucket_id='jump-files' and public.jump_role() is not null and exists(select 1 from public.jump_assets where storage_path=storage.objects.name));
-- No UPDATE/DELETE grants: published clips and originals cannot be overwritten.
create function public.jump_public_clip(p_id uuid) returns text language sql stable security definer set search_path='' as $$
 select a.storage_path from public.jump_assets a where a.id=p_id and a.kind='clip'
 and exists(select 1 from public.jump_published p, jsonb_array_elements(p.body->'articles') x where x->>'clipId'=a.id::text)
$$;
create function public.jump_public_file(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.jump_assets a where a.storage_path=p_path and a.kind='clip' and public.jump_public_clip(a.id) is not null)
$$;
revoke all on function public.jump_public_clip(uuid),public.jump_public_file(text) from public;
grant execute on function public.jump_public_clip(uuid),public.jump_public_file(text) to anon,authenticated;
create policy jump_published_clip_read on storage.objects for select to anon,authenticated using(bucket_id='jump-files' and public.jump_public_file(name));
commit;
