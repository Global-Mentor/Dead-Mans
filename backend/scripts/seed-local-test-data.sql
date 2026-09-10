SELECT EXISTS (
  SELECT 1
  FROM games
  WHERE id = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid
) AS deadmans_local_seed_exists \gset

\if :deadmans_local_seed_exists
\echo 'Local test game already exists; seed skipped.'
\quit
\endif

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.deadmans_seed_uuid(seed text)
RETURNS uuid
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT (
    substr(hash, 1, 8) || '-' ||
    substr(hash, 9, 4) || '-' ||
    substr(hash, 13, 4) || '-' ||
    substr(hash, 17, 4) || '-' ||
    substr(hash, 21, 12)
  )::uuid
  FROM (SELECT md5(seed) AS hash) AS hashed;
$$;

DO $$
DECLARE
  test_game_id uuid := 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM games
    WHERE id <> test_game_id
      AND status = 'active'
      AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'Cannot seed local test game while another active game exists.';
  END IF;
END $$;

WITH seed_users(id, twitch_user_id, login, display_name) AS (
  VALUES
    ('0f000000-0000-0000-0000-000000000001'::uuid, 'deadmans-local-host', 'local_host', 'Local Host'),
    ('4f00c7f1-08e2-4d2e-b27d-7a943b5740c1'::uuid, 'deadmans-local-test-user-001', 'anna_sokolova', 'Anna Sokolova'),
    ('13f1a25d-227b-4e3d-a6e6-0a4d83b5cbb2'::uuid, 'deadmans-local-test-user-002', 'dmitry_volkov', 'Dmitry Volkov'),
    ('0dc2383c-dde8-46ad-8f21-00f1430b7c31'::uuid, 'deadmans-local-test-user-003', 'maria_orlova', 'Maria Orlova'),
    ('2dc6119a-2693-4449-8fbf-2b77c9c69bf5'::uuid, 'deadmans-local-test-user-004', 'ivan_petrov', 'Ivan Petrov'),
    ('672bd1cc-4e79-4d3c-a35f-f0ce0b3779b0'::uuid, 'deadmans-local-test-user-005', 'elena_morozova', 'Elena Morozova'),
    ('59a208a4-22ac-4afb-b7ab-9186bb25d788'::uuid, 'deadmans-local-test-user-006', 'maxim_lebedev', 'Maxim Lebedev'),
    ('e0b67312-f6d7-44d9-a0f9-9d8e53810b86'::uuid, 'deadmans-local-test-user-007', 'olga_nikitina', 'Olga Nikitina'),
    ('f025fa80-cbf6-46ee-a4d5-b44b3dfb9182'::uuid, 'deadmans-local-test-user-008', 'sergey_kuznetsov', 'Sergey Kuznetsov'),
    ('9e4dac78-17d7-4096-a8a2-033c16085560'::uuid, 'deadmans-local-test-user-009', 'natalia_romanova', 'Natalia Romanova'),
    ('ac84f417-6828-43e3-9294-2eb9bb9156c6'::uuid, 'deadmans-local-test-user-010', 'artem_fedorov', 'Artem Fedorov')
)
INSERT INTO users (
  id,
  twitch_user_id,
  login,
  display_name,
  profile_image_url,
  broadcaster_type,
  twitch_user_type,
  is_active,
  last_login_at_utc,
  created_at_utc,
  updated_at_utc
)
SELECT
  id,
  twitch_user_id,
  login,
  display_name,
  NULL,
  NULL,
  NULL,
  true,
  NULL,
  TIMESTAMPTZ '2026-08-07 00:00:00+00',
  TIMESTAMPTZ '2026-08-07 00:00:00+00'
FROM seed_users
ON CONFLICT (id) DO UPDATE
SET
  twitch_user_id = EXCLUDED.twitch_user_id,
  login = EXCLUDED.login,
  display_name = EXCLUDED.display_name,
  is_active = true,
  updated_at_utc = EXCLUDED.updated_at_utc;

INSERT INTO user_roles (user_id, role_id, assigned_by_user_id, assigned_at_utc, expires_at_utc)
VALUES
  ('0f000000-0000-0000-0000-000000000001'::uuid, 1, NULL, TIMESTAMPTZ '2026-08-07 00:00:00+00', NULL),
  ('0f000000-0000-0000-0000-000000000001'::uuid, 2, NULL, TIMESTAMPTZ '2026-08-07 00:00:00+00', NULL),
  ('0f000000-0000-0000-0000-000000000001'::uuid, 3, NULL, TIMESTAMPTZ '2026-08-07 00:00:00+00', NULL),
  ('0f000000-0000-0000-0000-000000000001'::uuid, 4, NULL, TIMESTAMPTZ '2026-08-07 00:00:00+00', NULL)
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id, assigned_by_user_id, assigned_at_utc, expires_at_utc)
SELECT
  id,
  3,
  '0f000000-0000-0000-0000-000000000001'::uuid,
  TIMESTAMPTZ '2026-08-07 00:00:00+00',
  NULL
FROM users
WHERE is_active = true
  AND twitch_user_id NOT LIKE 'deadmans-local-test-user-%'
ON CONFLICT (user_id, role_id) DO NOTHING;

WITH categories(id, name) AS (
  VALUES
    ('50000000-0000-0000-0000-000000000001'::uuid, 'Project Zomboid'),
    ('50000000-0000-0000-0000-000000000002'::uuid, 'Dead Mans'),
    ('50000000-0000-0000-0000-000000000003'::uuid, 'Выживание')
)
INSERT INTO question_categories (id, name, created_at_utc, updated_at_utc)
SELECT id, name, TIMESTAMPTZ '2026-08-07 00:00:00+00', TIMESTAMPTZ '2026-08-07 00:00:00+00'
FROM categories
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  updated_at_utc = EXCLUDED.updated_at_utc;

WITH questions(id, external_code, category_id, text, reward, priority) AS (
  VALUES
    ('60000000-0000-0000-0000-000000000001'::uuid, 'local-pz-001', '50000000-0000-0000-0000-000000000001'::uuid, 'Какой навык отвечает за скрытное перемещение?', 3, 50),
    ('60000000-0000-0000-0000-000000000002'::uuid, 'local-pz-002', '50000000-0000-0000-0000-000000000001'::uuid, 'Как называется состояние персонажа при заражении зомби-вирусом?', 4, 45),
    ('60000000-0000-0000-0000-000000000003'::uuid, 'local-pz-003', '50000000-0000-0000-0000-000000000001'::uuid, 'Какой предмет чаще всего нужен для обработки глубокого пореза?', 2, 40),
    ('60000000-0000-0000-0000-000000000004'::uuid, 'local-pz-004', '50000000-0000-0000-0000-000000000001'::uuid, 'Какой транспортный ресурс расходуется при езде на машине?', 3, 38),
    ('60000000-0000-0000-0000-000000000005'::uuid, 'local-dm-001', '50000000-0000-0000-0000-000000000002'::uuid, 'Что получает команда за каждое убийство на карточке стоимостью 100?', 5, 60),
    ('60000000-0000-0000-0000-000000000006'::uuid, 'local-dm-002', '50000000-0000-0000-0000-000000000002'::uuid, 'Как называется модификатор с нарастающим бонусом за убийства?', 5, 55),
    ('60000000-0000-0000-0000-000000000007'::uuid, 'local-dm-003', '50000000-0000-0000-0000-000000000002'::uuid, 'Сколько очков даёт одна вынесенная награда на карточке 150?', 4, 48),
    ('60000000-0000-0000-0000-000000000008'::uuid, 'local-dm-004', '50000000-0000-0000-0000-000000000002'::uuid, 'Какой этап идёт перед ручным подведением итогов раунда?', 4, 42),
    ('60000000-0000-0000-0000-000000000009'::uuid, 'local-survival-001', '50000000-0000-0000-0000-000000000003'::uuid, 'Какой базовый ресурс нужен персонажу для восстановления выносливости?', 2, 36),
    ('60000000-0000-0000-0000-00000000000a'::uuid, 'local-survival-002', '50000000-0000-0000-0000-000000000003'::uuid, 'Какой инструмент помогает рубить деревья быстрее всего?', 3, 34),
    ('60000000-0000-0000-0000-00000000000b'::uuid, 'local-survival-003', '50000000-0000-0000-0000-000000000003'::uuid, 'Что обычно снижает риск паники ночью?', 2, 32),
    ('60000000-0000-0000-0000-00000000000c'::uuid, 'local-survival-004', '50000000-0000-0000-0000-000000000003'::uuid, 'Какой предмет нужен для кипячения воды на костре?', 3, 30)
)
INSERT INTO question_definitions (
  id,
  external_code,
  category_id,
  text,
  reward,
  is_enabled,
  is_deleted,
  deleted_at_utc,
  priority,
  created_at_utc,
  updated_at_utc
)
SELECT
  id,
  external_code,
  category_id,
  text,
  reward,
  true,
  false,
  NULL,
  priority,
  TIMESTAMPTZ '2026-08-07 00:00:00+00',
  TIMESTAMPTZ '2026-08-07 00:00:00+00'
FROM questions
ON CONFLICT (external_code) DO UPDATE
SET
  category_id = EXCLUDED.category_id,
  text = EXCLUDED.text,
  reward = EXCLUDED.reward,
  is_enabled = true,
  is_deleted = false,
  deleted_at_utc = NULL,
  priority = EXCLUDED.priority,
  updated_at_utc = EXCLUDED.updated_at_utc;

DELETE FROM question_accepted_answers AS accepted_answer
USING question_definitions AS question
WHERE accepted_answer.question_id = question.id
  AND question.external_code LIKE 'local-%';

WITH answers(external_code, answer_text, normalized_answer) AS (
  VALUES
    ('local-pz-001', 'Скрытность', 'скрытность'),
    ('local-pz-002', 'Заражен', 'заражен'),
    ('local-pz-003', 'Бинт', 'бинт'),
    ('local-pz-004', 'Бензин', 'бензин'),
    ('local-dm-001', '100 очков', '100 очков'),
    ('local-dm-002', 'Жажда', 'жажда'),
    ('local-dm-003', '150', '150'),
    ('local-dm-004', 'Игра карточки', 'игра карточки'),
    ('local-survival-001', 'Отдых', 'отдых'),
    ('local-survival-002', 'Топор', 'топор'),
    ('local-survival-003', 'Свет', 'свет'),
    ('local-survival-004', 'Кастрюля', 'кастрюля')
)
INSERT INTO question_accepted_answers (
  id,
  question_id,
  answer_text,
  normalized_answer,
  is_primary,
  sort_order,
  created_at_utc
)
SELECT
  pg_temp.deadmans_seed_uuid('local-test-question-answer-' || answers.external_code),
  question.id,
  answers.answer_text,
  answers.normalized_answer,
  true,
  0,
  TIMESTAMPTZ '2026-08-07 00:00:00+00'
FROM answers
JOIN question_definitions AS question
  ON question.external_code = answers.external_code;

UPDATE games
SET active_team_id = NULL
WHERE id = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid;

DELETE FROM game_round_cell_media
WHERE round_id IN (
  SELECT id FROM game_rounds WHERE game_id = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid
);

DELETE FROM game_round_modifier_results
WHERE round_id IN (
  SELECT id FROM game_rounds WHERE game_id = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid
);

DELETE FROM game_round_participants
WHERE round_id IN (
  SELECT id FROM game_rounds WHERE game_id = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid
);

DELETE FROM game_modifier_activations
WHERE game_id = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid;

DELETE FROM game_rounds
WHERE game_id = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid;

DELETE FROM games
WHERE id = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid;

INSERT INTO games (
  id,
  title,
  description,
  status,
  created_at_utc,
  ready_at_utc,
  started_at_utc,
  finished_at_utc,
  is_deleted,
  deleted_at_utc,
  min_players_per_team,
  max_players_per_team,
  active_team_id
)
VALUES (
  'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid,
  'Dead Mans Local Test Game',
  'Локальная тестовая игра с заполненной доской, командами и вопросами викторины.',
  'draft',
  TIMESTAMPTZ '2026-08-07 00:00:00+00',
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  1,
  3,
  NULL
);

INSERT INTO game_boards (
  id,
  game_id,
  version,
  rows,
  cols,
  row_labels,
  col_labels,
  created_at_utc
)
VALUES (
  'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6b'::uuid,
  'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid,
  1,
  5,
  6,
  ARRAY['Разминка','Риск','Тактика','Хардкор','Финал']::text[],
  ARRAY['Бомбардир','Пиромант','Токсик','Вампир','Аватар','Всё могу x2']::text[],
  TIMESTAMPTZ '2026-08-07 00:10:00+00'
);

WITH slots(slot_index, slot_type, reserved_label) AS (
  VALUES
    (1, 'public', NULL),
    (2, 'public', NULL),
    (3, 'public', NULL),
    (4, 'reserved', 'Команда стримеров'),
    (5, 'reserved', 'Команда гостей'),
    (6, 'public', NULL)
)
INSERT INTO game_team_slots (id, game_id, slot_index, slot_type, reserved_label, created_at_utc)
SELECT
  pg_temp.deadmans_seed_uuid('local-test-slot-' || slot_index::text),
  'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid,
  slot_index,
  slot_type,
  reserved_label,
  TIMESTAMPTZ '2026-08-07 00:10:00+00'
FROM slots;

WITH team_seed(team_id, slot_index, team_name, recruitment_open, is_played, played_at_utc) AS (
  VALUES
    ('40000000-0000-0000-0000-000000000001'::uuid, 1, 'Северный ветер', false, false, NULL::timestamptz),
    ('40000000-0000-0000-0000-000000000002'::uuid, 2, 'Красные лисы', false, false, NULL::timestamptz),
    ('40000000-0000-0000-0000-000000000003'::uuid, 3, 'Тихая гавань', false, false, NULL::timestamptz),
    ('40000000-0000-0000-0000-000000000004'::uuid, 4, 'Стримеры', false, false, NULL::timestamptz)
)
INSERT INTO game_teams (
  id,
  game_id,
  slot_id,
  recruitment_open,
  is_played,
  status,
  created_by_user_id,
  created_at_utc,
  updated_at_utc,
  confirmed_at_utc,
  confirmed_by_user_id,
  rejected_at_utc,
  rejected_by_user_id,
  disbanded_at_utc,
  disbanded_by_user_id,
  disband_requested_at_utc,
  disband_requested_by_user_id,
  name,
  played_at_utc
)
SELECT
  team_seed.team_id,
  'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid,
  slot.id,
  team_seed.recruitment_open,
  team_seed.is_played,
  'confirmed',
  '0f000000-0000-0000-0000-000000000001'::uuid,
  TIMESTAMPTZ '2026-08-07 00:12:00+00',
  TIMESTAMPTZ '2026-08-07 00:12:00+00',
  TIMESTAMPTZ '2026-08-07 00:15:00+00',
  '0f000000-0000-0000-0000-000000000001'::uuid,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  team_seed.team_name,
  team_seed.played_at_utc
FROM team_seed
JOIN game_team_slots AS slot
  ON slot.game_id = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid
 AND slot.slot_index = team_seed.slot_index;

WITH members(team_id, user_id, sort_order) AS (
  VALUES
    ('40000000-0000-0000-0000-000000000001'::uuid, '4f00c7f1-08e2-4d2e-b27d-7a943b5740c1'::uuid, 1),
    ('40000000-0000-0000-0000-000000000001'::uuid, '13f1a25d-227b-4e3d-a6e6-0a4d83b5cbb2'::uuid, 2),
    ('40000000-0000-0000-0000-000000000001'::uuid, '0dc2383c-dde8-46ad-8f21-00f1430b7c31'::uuid, 3),
    ('40000000-0000-0000-0000-000000000002'::uuid, '2dc6119a-2693-4449-8fbf-2b77c9c69bf5'::uuid, 1),
    ('40000000-0000-0000-0000-000000000002'::uuid, '672bd1cc-4e79-4d3c-a35f-f0ce0b3779b0'::uuid, 2),
    ('40000000-0000-0000-0000-000000000002'::uuid, '59a208a4-22ac-4afb-b7ab-9186bb25d788'::uuid, 3),
    ('40000000-0000-0000-0000-000000000003'::uuid, 'e0b67312-f6d7-44d9-a0f9-9d8e53810b86'::uuid, 1),
    ('40000000-0000-0000-0000-000000000003'::uuid, 'f025fa80-cbf6-46ee-a4d5-b44b3dfb9182'::uuid, 2),
    ('40000000-0000-0000-0000-000000000004'::uuid, '9e4dac78-17d7-4096-a8a2-033c16085560'::uuid, 1),
    ('40000000-0000-0000-0000-000000000004'::uuid, 'ac84f417-6828-43e3-9294-2eb9bb9156c6'::uuid, 2)
)
INSERT INTO game_team_members (id, game_id, team_id, user_id, joined_at_utc, left_at_utc)
SELECT
  pg_temp.deadmans_seed_uuid('local-test-member-' || team_id::text || '-' || user_id::text),
  'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid,
  team_id,
  user_id,
  TIMESTAMPTZ '2026-08-07 00:16:00+00' + (sort_order || ' minutes')::interval,
  NULL
FROM members;

WITH rows(row_index, row_label, base_cost) AS (
  VALUES
    (0, 'Разминка', 100),
    (1, 'Риск', 130),
    (2, 'Тактика', 160),
    (3, 'Хардкор', 190),
    (4, 'Финал', 220)
),
cols(col_index, col_label, cost_offset) AS (
  VALUES
    (0, 'Бомбардир', 0),
    (1, 'Пиромант', 5),
    (2, 'Токсик', 10),
    (3, 'Вампир', 15),
    (4, 'Аватар', 20),
    (5, 'Всё могу x2', 25)
),
cells AS (
  SELECT
    row_index,
    col_index,
    row_label,
    col_label,
    base_cost + cost_offset AS cost,
    (col_index + 1)::text || '-' || (row_index + 1)::text || '.png' AS filename
  FROM rows
  CROSS JOIN cols
)
INSERT INTO game_board_cells (
  id,
  board_id,
  row_index,
  col_index,
  state,
  cell_type,
  title,
  cost,
  description
)
SELECT
  pg_temp.deadmans_seed_uuid('local-test-cell-' || filename),
  'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6b'::uuid,
  row_index,
  col_index,
  'closed',
  'tile',
  col_label || ': ' || row_label,
  cost,
  'Тестовая карточка «' || col_label || '» из строки «' || row_label || '». Независимая стоимость карточки: ' || cost::text || ' очков.'
FROM cells;

WITH rows(row_index) AS (
  VALUES (0), (1), (2), (3), (4)
),
cols(col_index) AS (
  VALUES (0), (1), (2), (3), (4), (5)
),
media_rows AS (
  SELECT
    (col_index + 1)::text || '-' || (row_index + 1)::text || '.png' AS filename,
    'games/c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a/cards/' ||
      (col_index + 1)::text || '-' || (row_index + 1)::text || '.png' AS object_key
  FROM rows
  CROSS JOIN cols
)
INSERT INTO media_assets (
  id,
  bucket,
  object_key,
  mime_type,
  size_bytes,
  created_at_utc
)
SELECT
  pg_temp.deadmans_seed_uuid('local-test-media-' || filename),
  'deadman',
  object_key,
  'image/png',
  1,
  TIMESTAMPTZ '2026-08-07 00:20:00+00'
FROM media_rows
ON CONFLICT (bucket, object_key) DO UPDATE
SET
  mime_type = EXCLUDED.mime_type,
  size_bytes = EXCLUDED.size_bytes;

WITH rows(row_index) AS (
  VALUES (0), (1), (2), (3), (4)
),
cols(col_index) AS (
  VALUES (0), (1), (2), (3), (4), (5)
),
links AS (
  SELECT
    (col_index + 1)::text || '-' || (row_index + 1)::text || '.png' AS filename,
    pg_temp.deadmans_seed_uuid('local-test-cell-' || (col_index + 1)::text || '-' || (row_index + 1)::text || '.png') AS cell_id,
    'games/c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a/cards/' ||
      (col_index + 1)::text || '-' || (row_index + 1)::text || '.png' AS object_key
  FROM rows
  CROSS JOIN cols
)
INSERT INTO game_board_cell_media (id, cell_id, media_asset_id, role, sort_order)
SELECT
  pg_temp.deadmans_seed_uuid('local-test-board-cell-media-' || links.filename),
  links.cell_id,
  media.id,
  'content',
  0
FROM links
JOIN media_assets AS media
  ON media.bucket = 'deadman'
 AND media.object_key = links.object_key
ON CONFLICT (cell_id, sort_order) DO UPDATE
SET
  media_asset_id = EXCLUDED.media_asset_id,
  role = EXCLUDED.role;

INSERT INTO game_enabled_questions (
  game_id,
  question_id,
  enabled_at_utc,
  question_revision_snapshot,
  question_code_snapshot,
  category_name_snapshot,
  question_text_snapshot,
  accepted_answers_snapshot,
  normalized_answers_snapshot,
  reward_snapshot,
  priority_snapshot,
  snapshot_at_utc
)
SELECT
  'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid,
  question.id,
  TIMESTAMPTZ '2026-08-07 00:25:00+00',
  question.revision,
  question.external_code::text,
  category.name::text,
  question.text,
  answers.accepted,
  answers.normalized,
  question.reward,
  question.priority,
  TIMESTAMPTZ '2026-08-07 00:30:00+00'
FROM question_definitions AS question
JOIN question_categories AS category
  ON category.id = question.category_id
JOIN LATERAL (
  SELECT
    array_agg(answer.answer_text::text ORDER BY answer.is_primary DESC, answer.sort_order) AS accepted,
    array_agg(answer.normalized_answer::text ORDER BY answer.is_primary DESC, answer.sort_order) AS normalized
  FROM question_accepted_answers AS answer
  WHERE answer.question_id = question.id
) AS answers ON true
WHERE question.is_deleted = false
  AND question.is_enabled = true;

UPDATE games
SET
  status = 'ready',
  ready_at_utc = TIMESTAMPTZ '2026-08-07 00:30:00+00'
WHERE id = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid;

UPDATE games
SET
  status = 'active',
  started_at_utc = TIMESTAMPTZ '2026-08-07 00:30:00+00'
WHERE id = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid;

UPDATE game_board_cells AS cell
SET state = 'open'
FROM game_boards AS board
WHERE board.id = cell.board_id
  AND board.game_id = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid
  AND cell.row_index = 0
  AND cell.col_index < 3;

INSERT INTO game_rounds (
  id,
  game_id,
  board_id,
  board_cell_id,
  team_id,
  status,
  prepared_at_utc,
  gameplay_started_at_utc,
  reviewed_at_utc,
  finished_at_utc,
  base_score,
  final_score,
  empty_card_penalty_applied,
  kills_count,
  bounty_count,
  team_slot_index_snapshot,
  cell_row_index,
  cell_col_index,
  cell_title_snapshot,
  cell_description_snapshot,
  cell_cost_snapshot,
  notes,
  resolved_by_user_id,
  created_at_utc,
  updated_at_utc
)
VALUES
  (
    '80000000-0000-0000-0000-000000000001'::uuid,
    'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid,
    'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6b'::uuid,
    pg_temp.deadmans_seed_uuid('local-test-cell-2-1.png'),
    '40000000-0000-0000-0000-000000000004'::uuid,
    'completed',
    TIMESTAMPTZ '2026-08-07 00:40:00+00',
    TIMESTAMPTZ '2026-08-07 00:40:00+00',
    TIMESTAMPTZ '2026-08-07 00:55:00+00',
    TIMESTAMPTZ '2026-08-07 00:55:00+00',
    105,
    -105,
    true,
    0,
    0,
    4,
    0,
    1,
    'Пиромант: Разминка',
    'Тестовая карточка «Пиромант» из строки «Разминка». Независимая стоимость карточки: 105 очков.',
    105,
    'Команда сыграла карточку в ноль: стоимость карточки полностью ушла в штраф.',
    '0f000000-0000-0000-0000-000000000001'::uuid,
    TIMESTAMPTZ '2026-08-07 00:40:00+00',
    TIMESTAMPTZ '2026-08-07 00:55:00+00'
  ),
  (
    '80000000-0000-0000-0000-000000000002'::uuid,
    'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid,
    'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6b'::uuid,
    pg_temp.deadmans_seed_uuid('local-test-cell-1-1.png'),
    '40000000-0000-0000-0000-000000000003'::uuid,
    'completed',
    TIMESTAMPTZ '2026-08-07 01:00:00+00',
    TIMESTAMPTZ '2026-08-07 01:00:00+00',
    TIMESTAMPTZ '2026-08-07 01:15:00+00',
    TIMESTAMPTZ '2026-08-07 01:15:00+00',
    100,
    345,
    false,
    3,
    0,
    3,
    0,
    0,
    'Бомбардир: Разминка',
    'Тестовая карточка «Бомбардир» из строки «Разминка». Независимая стоимость карточки: 100 очков.',
    100,
    'Проверка формулы Жажды: (100 + 5 × 3) × 3 = 345 очков.',
    '0f000000-0000-0000-0000-000000000001'::uuid,
    TIMESTAMPTZ '2026-08-07 01:00:00+00',
    TIMESTAMPTZ '2026-08-07 01:15:00+00'
  ),
  (
    '80000000-0000-0000-0000-000000000003'::uuid,
    'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid,
    'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6b'::uuid,
    pg_temp.deadmans_seed_uuid('local-test-cell-3-1.png'),
    '40000000-0000-0000-0000-000000000001'::uuid,
    'awaiting_modifiers',
    NULL,
    NULL,
    NULL,
    NULL,
    110,
    NULL,
    false,
    0,
    0,
    1,
    0,
    2,
    'Токсик: Разминка',
    'Тестовая карточка «Токсик» из строки «Разминка». Независимая стоимость карточки: 110 очков.',
    110,
    'Текущий раунд оставлен на этапе заказа модификаторов.',
    NULL,
    TIMESTAMPTZ '2026-08-07 01:20:00+00',
    TIMESTAMPTZ '2026-08-07 01:20:00+00'
  );

SET CONSTRAINTS trg_game_rounds_origin_consistency IMMEDIATE;

UPDATE game_teams
SET
  is_played = true,
  played_at_utc = CASE id
    WHEN '40000000-0000-0000-0000-000000000003'::uuid THEN TIMESTAMPTZ '2026-08-07 01:15:00+00'
    WHEN '40000000-0000-0000-0000-000000000004'::uuid THEN TIMESTAMPTZ '2026-08-07 00:55:00+00'
  END,
  updated_at_utc = CASE id
    WHEN '40000000-0000-0000-0000-000000000003'::uuid THEN TIMESTAMPTZ '2026-08-07 01:15:00+00'
    WHEN '40000000-0000-0000-0000-000000000004'::uuid THEN TIMESTAMPTZ '2026-08-07 00:55:00+00'
  END
WHERE id IN (
  '40000000-0000-0000-0000-000000000003'::uuid,
  '40000000-0000-0000-0000-000000000004'::uuid
);

INSERT INTO game_round_participants (
  id,
  round_id,
  user_id,
  display_name_snapshot,
  created_at_utc
)
SELECT
  pg_temp.deadmans_seed_uuid('local-test-round-participant-' || rounds.round_id::text || '-' || member.user_id::text),
  rounds.round_id,
  member.user_id,
  users.display_name,
  rounds.started_at_utc
FROM (
  VALUES
    ('80000000-0000-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000004'::uuid, TIMESTAMPTZ '2026-08-07 00:40:00+00'),
    ('80000000-0000-0000-0000-000000000002'::uuid, '40000000-0000-0000-0000-000000000003'::uuid, TIMESTAMPTZ '2026-08-07 01:00:00+00'),
    ('80000000-0000-0000-0000-000000000003'::uuid, '40000000-0000-0000-0000-000000000001'::uuid, TIMESTAMPTZ '2026-08-07 01:20:00+00')
) AS rounds(round_id, team_id, started_at_utc)
JOIN game_team_members AS member
  ON member.game_id = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid
 AND member.team_id = rounds.team_id
 AND member.left_at_utc IS NULL
JOIN users
  ON users.id = member.user_id;

WITH round_media(round_id, filename, created_at_utc) AS (
  VALUES
    ('80000000-0000-0000-0000-000000000001'::uuid, '2-1.png', TIMESTAMPTZ '2026-08-07 00:40:00+00'),
    ('80000000-0000-0000-0000-000000000002'::uuid, '1-1.png', TIMESTAMPTZ '2026-08-07 01:00:00+00'),
    ('80000000-0000-0000-0000-000000000003'::uuid, '3-1.png', TIMESTAMPTZ '2026-08-07 01:20:00+00')
)
INSERT INTO game_round_cell_media (
  id,
  round_id,
  bucket,
  object_key,
  mime_type,
  size_bytes,
  role,
  sort_order,
  created_at_utc
)
SELECT
  pg_temp.deadmans_seed_uuid('local-test-round-media-' || round_id::text),
  round_id,
  'deadman',
  'games/c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a/cards/' || filename,
  'image/png',
  1,
  'content',
  0,
  created_at_utc
FROM round_media;

INSERT INTO game_quiz_point_ledger_entries (
  id,
  game_id,
  user_id,
  entry_type,
  points_delta,
  manual_request_id,
  created_by_user_id,
  reason,
  available_points_before,
  available_points_after,
  occurred_at_utc
)
SELECT
  pg_temp.deadmans_seed_uuid('local-test-award-' || id::text),
  'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid,
  id,
  'manual_adjustment',
  CASE WHEN twitch_user_id LIKE 'deadmans-local-test-user-%' THEN 30 ELSE 50 END AS points,
  pg_temp.deadmans_seed_uuid('local-test-award-request-' || id::text),
  '0f000000-0000-0000-0000-000000000001'::uuid,
  'Стартовый локальный баланс для проверки модификаторов.',
  0,
  CASE WHEN twitch_user_id LIKE 'deadmans-local-test-user-%' THEN 30 ELSE 50 END,
  TIMESTAMPTZ '2026-08-07 00:30:00+00'
FROM users
WHERE is_active = true;

INSERT INTO game_quiz_point_ledger_entries (
  id,
  game_id,
  user_id,
  entry_type,
  points_delta,
  manual_request_id,
  created_by_user_id,
  reason,
  available_points_before,
  available_points_after,
  occurred_at_utc
)
VALUES (
  pg_temp.deadmans_seed_uuid('local-test-deduction-anna'),
  'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid,
  '4f00c7f1-08e2-4d2e-b27d-7a943b5740c1'::uuid,
  'manual_adjustment',
  -5,
  pg_temp.deadmans_seed_uuid('local-test-deduction-request-anna'),
  '0f000000-0000-0000-0000-000000000001'::uuid,
  'Тестовое исправление ошибочного начисления.',
  30,
  25,
  TIMESTAMPTZ '2026-08-07 00:31:00+00'
);

UPDATE games
SET active_team_id = '40000000-0000-0000-0000-000000000001'::uuid
WHERE id = 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid;

DO $$
DECLARE
  test_game_id uuid := 'c6c6a0da-0bd1-4f0b-bb2f-9a4c9c8b7f6a'::uuid;
BEGIN
  IF (SELECT count(*) FROM game_board_cells AS cell JOIN game_boards AS board ON board.id = cell.board_id WHERE board.game_id = test_game_id) <> 30 THEN
    RAISE EXCEPTION 'Local seed verification failed: expected 30 board cells.';
  END IF;

  IF (SELECT count(*) FROM game_rounds WHERE game_id = test_game_id AND status NOT IN ('completed', 'cancelled')) <> 1 THEN
    RAISE EXCEPTION 'Local seed verification failed: expected exactly one nonterminal round.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM game_rounds
    WHERE id = '80000000-0000-0000-0000-000000000002'::uuid
      AND base_score = 100
      AND kills_count = 3
      AND final_score = 345
  ) THEN
    RAISE EXCEPTION 'Local seed verification failed: Zhazhda example must equal (100 + 5 * 3) * 3 = 345.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM game_quiz_point_ledger_entries
    WHERE game_id = test_game_id
      AND entry_type = 'manual_adjustment'
      AND points_delta = -5
      AND available_points_after = 25
  ) THEN
    RAISE EXCEPTION 'Local seed verification failed: audited quiz deduction is missing.';
  END IF;
END $$;

COMMIT;
