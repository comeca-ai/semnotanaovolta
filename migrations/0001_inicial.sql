-- A nota sem volta — esquema inicial da POC.
-- Valores em dinheiro em centavos (INTEGER). Alíquotas em centésimos de ponto percentual (0,90% = 90).

CREATE TABLE escritorio (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  uf TEXT NOT NULL
);

CREATE TABLE usuario (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nome TEXT NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('dono', 'contador')),
  escritorio_id INTEGER REFERENCES escritorio(id)
);

CREATE TABLE cnpj (
  id INTEGER PRIMARY KEY,
  cnpj TEXT NOT NULL UNIQUE,          -- só dígitos
  razao_social TEXT NOT NULL,
  dono_id INTEGER NOT NULL REFERENCES usuario(id),
  escritorio_id INTEGER NOT NULL REFERENCES escritorio(id),
  uf TEXT NOT NULL,
  municipio TEXT NOT NULL,
  autorizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE contrato (
  id INTEGER PRIMARY KEY,
  cnpj_id INTEGER NOT NULL REFERENCES cnpj(id),
  pacote TEXT NOT NULL CHECK (pacote IN ('entrada', 'meio', 'cheio')),
  preco_centavos INTEGER NOT NULL,
  teto_notas INTEGER NOT NULL,
  inicio TEXT NOT NULL,               -- sempre dia 1
  fim TEXT NOT NULL,
  renovado_de_id INTEGER REFERENCES contrato(id)
);
CREATE INDEX contrato_cnpj ON contrato(cnpj_id, inicio);

CREATE TABLE termo_aceite (
  id INTEGER PRIMARY KEY,
  cnpj_id INTEGER NOT NULL REFERENCES cnpj(id),
  papel TEXT NOT NULL CHECK (papel IN ('dono', 'contador')),
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  versao_termo TEXT NOT NULL,
  aceito_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (cnpj_id, papel, versao_termo)
);

CREATE TABLE login_token (
  hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  expira_em INTEGER NOT NULL,         -- epoch ms
  usado_em INTEGER
);

CREATE TABLE sessao (
  hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  expira_em INTEGER NOT NULL
);

-- Base legal interna. Curadoria do tributarista; o modelo nunca escreve aqui.
CREATE TABLE norma (
  id TEXT PRIMARY KEY,
  fonte TEXT NOT NULL,                -- 'LC 214', 'Portaria ...', 'Lei municipal ...'
  tributo TEXT NOT NULL CHECK (tributo IN ('ICMS', 'ISS', 'IBS', 'CBS')),
  artigo TEXT NOT NULL,
  texto TEXT NOT NULL,
  data_norma TEXT NOT NULL,           -- data de publicação
  vigencia_inicio TEXT NOT NULL,
  vigencia_fim TEXT,
  escopo_ncm TEXT,                    -- prefixo de NCM (só dígitos); NULL = qualquer
  escopo_servico TEXT,                -- código de tributação nacional; NULL = qualquer
  uf TEXT,                            -- NULL = nacional
  municipio_ibge TEXT,                -- NULL = qualquer município
  cst TEXT,
  cclass_trib TEXT,
  aliquota_cpp INTEGER,               -- centésimos de ponto percentual; NULL = base não traz alíquota
  versao_base TEXT NOT NULL,
  ficticio INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX norma_busca ON norma(tributo, uf, municipio_ibge);

CREATE TABLE lote (
  id INTEGER PRIMARY KEY,
  cnpj_id INTEGER NOT NULL REFERENCES cnpj(id),
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  status TEXT NOT NULL CHECK (status IN ('aguardando_teto', 'processado', 'parado')),
  resumo_json TEXT NOT NULL DEFAULT '[]',
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE nota (
  id INTEGER PRIMARY KEY,
  lote_id INTEGER NOT NULL REFERENCES lote(id),
  cnpj_id INTEGER NOT NULL REFERENCES cnpj(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('NF-e', 'NFS-e')),
  chave TEXT NOT NULL,
  xml_r2_key TEXT NOT NULL,
  xml_sha256 TEXT NOT NULL,
  data_emissao TEXT NOT NULL,
  uf TEXT NOT NULL,
  municipio_ibge TEXT NOT NULL,
  municipio_nome TEXT NOT NULL,
  incide_iss INTEGER NOT NULL,
  valor_centavos INTEGER NOT NULL,
  itens_json TEXT NOT NULL,           -- [{codigo, descricao, ncm|servico, valor_centavos}]
  status TEXT NOT NULL CHECK (status IN ('pendente', 'sugerida', 'firmada', 'parada', 'voltou')),
  nota_origem_id INTEGER REFERENCES nota(id), -- reemissão de nota que voltou: não conta de novo
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (cnpj_id, chave)
);

CREATE TABLE sugestao (
  id INTEGER PRIMARY KEY,
  nota_id INTEGER NOT NULL REFERENCES nota(id),
  item_idx INTEGER NOT NULL,
  tributo TEXT NOT NULL,
  resultado TEXT NOT NULL CHECK (resultado IN ('sugere', 'nao_responde')),
  norma_id TEXT REFERENCES norma(id),
  cst TEXT,
  cclass_trib TEXT,
  aliquota_cpp INTEGER,
  valor_centavos INTEGER,             -- NULL quando a base não traz alíquota
  motivo TEXT NOT NULL,
  versao_base TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX sugestao_nota ON sugestao(nota_id);

-- Log de firma: só insere. Nunca altera, nunca apaga.
CREATE TABLE firma (
  id INTEGER PRIMARY KEY,
  nota_id INTEGER NOT NULL REFERENCES nota(id),
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  contador_nome TEXT NOT NULL,
  crc TEXT NOT NULL,
  decisao TEXT NOT NULL CHECK (decisao IN ('confirmada', 'recusada')),
  sugestoes_json TEXT NOT NULL,       -- tributo, artigo, data da norma, versão da base
  xml_sha256 TEXT NOT NULL,
  firmado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TRIGGER firma_sem_update BEFORE UPDATE ON firma
BEGIN SELECT RAISE(ABORT, 'log de firma é imutável'); END;
CREATE TRIGGER firma_sem_delete BEFORE DELETE ON firma
BEGIN SELECT RAISE(ABORT, 'log de firma é imutável'); END;

CREATE TABLE decisao_teto (
  id INTEGER PRIMARY KEY,
  cnpj_id INTEGER NOT NULL REFERENCES cnpj(id),
  lote_id INTEGER NOT NULL REFERENCES lote(id),
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  decisao TEXT NOT NULL CHECK (decisao IN ('parar', 'seguir')),
  notas_excedentes INTEGER NOT NULL,
  valor_centavos INTEGER NOT NULL,
  em TEXT NOT NULL DEFAULT (datetime('now'))
);
