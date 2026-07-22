-- =====================================================================
-- 001 — Fecha a tabela pedido_users (fim do texto plano no portal)
-- Projeto Supabase: todeupahpgoopcxvfakt
--
-- ⚠️ RODAR SÓ DEPOIS do deploy do portal novo (login server-side no ar).
--    Se rodar antes, o portal antigo lê pedido_users pela chave pública e o
--    login para. Com o código novo, a API (service role) ignora RLS e o
--    login segue funcionando.
--
-- Espelha o que a migration 008 fez no Gestão. Não mexe no NOT NULL de
-- `password`: o texto plano vira string vazia ''. Vazio não revela nada; o
-- login passa a usar exclusivamente o bcrypt em password_hash.
-- =====================================================================

create extension if not exists pgcrypto;

-- 1) Coluna do hash (aditiva)
alter table pedido_users add column if not exists password_hash text;

-- 2) Todo mundo com hash. Quem só tinha texto plano ganha bcrypt AGORA.
--    crypt(...,gen_salt('bf',10)) gera $2a$ — o bcryptjs da API confere.
update pedido_users
   set password_hash = crypt(password, gen_salt('bf', 10))
 where password is not null
   and length(trim(password)) > 0
   and (password_hash is null or length(trim(password_hash)) = 0);

-- Trava: ninguém pode ficar sem hash antes de apagarmos o texto plano.
do $$
declare v int;
begin
  select count(*) into v from pedido_users
   where (password_hash is null or length(trim(password_hash)) = 0);
  if v > 0 then
    raise exception 'ABORTADO: % usuario(s) sem hash. Nada apagado.', v;
  end if;
end $$;

-- 3) Apaga o texto plano (vira '' — a senha real deixa de existir no banco).
update pedido_users set password = '' where password is not null and password <> '';

-- 4) Fecha leitura/escrita pública: RLS ligado + sem policy = negado para
--    anon/authenticated; a service role (API) passa por cima.
alter table pedido_users enable row level security;

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies
             where schemaname='public' and tablename='pedido_users'
  loop execute format('drop policy if exists %I on pedido_users', pol.policyname); end loop;
end $$;

revoke all on pedido_users from anon, authenticated;

-- 5) Conferência final (esperado: 0 | 0 | true | false)
select
  (select count(*) from pedido_users where password is not null and password <> '') as com_texto_plano,
  (select count(*) from pedido_users where password_hash is null)                    as sem_hash,
  (select relrowsecurity from pg_class
     where relname='pedido_users' and relnamespace = 'public'::regnamespace)         as rls_ligado,
  (select has_table_privilege('anon','pedido_users','select'))                       as anon_le;
