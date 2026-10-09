-- DADOS FICTÍCIOS para desenvolvimento. Nada aqui é norma real, CNPJ real ou pessoa real.
-- A base real só começa com o primeiro escritório nomeado e o tributarista do time (decisões 7 e 8).

INSERT INTO escritorio (id, nome, uf) VALUES (1, 'Escritório Exemplo (fictício)', 'SP');

INSERT INTO usuario (id, email, nome, papel, escritorio_id) VALUES
  (1, 'dono@exemplo.com.br', 'Dono Exemplo', 'dono', NULL),
  (2, 'contador@exemplo.com.br', 'Maria Souza', 'contador', 1);

INSERT INTO cnpj (id, cnpj, razao_social, dono_id, escritorio_id, uf, municipio) VALUES
  (1, '11222333000181', 'Confecções Exemplo Ltda (fictícia)', 1, 1, 'SP', 'Campinas'),
  (2, '11444777000161', 'Exemplo Serviços Ltda (fictícia)', 1, 1, 'SP', 'Campinas');

-- 1º CNPJ do dono: Entrada. 2º CNPJ: já nasce no Meio.
INSERT INTO contrato (cnpj_id, pacote, preco_centavos, teto_notas, inicio, fim) VALUES
  (1, 'entrada', 900000, 2400, '2026-10-01', '2027-09-30'),
  (2, 'meio', 1800000, 6000, '2026-10-01', '2027-09-30');

INSERT INTO norma (id, fonte, tributo, artigo, texto, data_norma, vigencia_inicio, vigencia_fim, escopo_ncm, escopo_servico, uf, municipio_ibge, cst, cclass_trib, aliquota_cpp, versao_base, ficticio) VALUES
  ('FIC-IBS-61', 'LC 214', 'IBS', 'art. X (fictício)', '[FICTÍCIO] Texto de exemplo para vestuário de malha.', '2026-10-05', '2026-01-01', NULL, '61', NULL, NULL, NULL, '000', '000001', 10, 'ficticia-2026-10-09', 1),
  ('FIC-CBS-61', 'LC 214', 'CBS', 'art. X (fictício)', '[FICTÍCIO] Texto de exemplo para vestuário de malha.', '2026-10-05', '2026-01-01', NULL, '61', NULL, NULL, NULL, '000', '000001', 90, 'ficticia-2026-10-09', 1),
  ('FIC-IBS-62', 'LC 214', 'IBS', 'art. Y (fictício)', '[FICTÍCIO] Classificação sem alíquota na base.', '2026-10-05', '2026-01-01', NULL, '62', NULL, NULL, NULL, '000', '000001', NULL, 'ficticia-2026-10-09', 1),
  ('FIC-CBS-62', 'LC 214', 'CBS', 'art. Y (fictício)', '[FICTÍCIO] Classificação sem alíquota na base.', '2026-10-05', '2026-01-01', NULL, '62', NULL, NULL, NULL, '000', '000001', NULL, 'ficticia-2026-10-09', 1),
  ('FIC-ICMS-SP-61', 'Regulamento estadual (fictício)', 'ICMS', 'art. Z (fictício)', '[FICTÍCIO] ICMS de exemplo para vestuário em SP.', '2026-10-05', '2026-01-01', NULL, '61', NULL, 'SP', NULL, '00', NULL, 1800, 'ficticia-2026-10-09', 1),
  ('FIC-ISS-CPS-0107', 'Lei municipal de Campinas (fictício)', 'ISS', 'art. W (fictício)', '[FICTÍCIO] ISS de exemplo para suporte técnico em Campinas.', '2026-10-05', '2026-01-01', NULL, NULL, '010701', 'SP', '3509502', NULL, NULL, 500, 'ficticia-2026-10-09', 1),
  ('FIC-IBS-SERV', 'LC 214', 'IBS', 'art. V (fictício)', '[FICTÍCIO] Serviço de informática.', '2026-10-05', '2026-01-01', NULL, NULL, '010701', NULL, NULL, '000', '000001', 10, 'ficticia-2026-10-09', 1),
  ('FIC-CBS-SERV', 'LC 214', 'CBS', 'art. V (fictício)', '[FICTÍCIO] Serviço de informática.', '2026-10-05', '2026-01-01', NULL, NULL, '010701', NULL, NULL, '000', '000001', 90, 'ficticia-2026-10-09', 1);
