# Sem nota não volta — Especificação (negócio + técnica)

> Versão 0.1 — 09/10/2026. Montada a partir dos 5 modelos de tela e do diagrama do motor em [`docs/telas/`](telas/).
> A conversa original (link do Grok) não pôde ser lida neste ambiente; tudo que é **inferência** está marcado com 🔎 e
> tudo que precisa de **decisão** está em [`PERGUNTAS.md`](PERGUNTAS.md).

---

## 1. Resumo em uma frase

Um **assistente de classificação tributária IBS/CBS (Reforma Tributária, LC 214/2025)** que lê a nota fiscal,
**sugere** o enquadramento citando **só artigos que existem numa base legal interna e datada**, exige que um
**contador com CRC firme** a decisão, registra tudo em log auditável e, quando a nota é rejeitada (SEFAZ ou
Prefeitura), **aponta o campo que causou a rejeição** — para que a nota não "volte".

O nome resume a promessa: **nota emitida com o produto não volta** (não é rejeitada). Os números da tela de contrato
("Rejeição SEFAZ 18 para 2", "Rejeição Prefeitura 9 para 1") indicam a métrica de valor: queda de rejeições antes × depois. 🔎

## 2. Contexto de negócio

### 2.1 Problema
- A partir de 2026 as notas (NF-e, NFC-e, NFS-e) passam a carregar os novos grupos de **IBS e CBS** (CST, `cClassTrib`,
  alíquotas). A regra é nova, muda por portaria/regulamentação e erros geram **rejeição** na SEFAZ ou na Prefeitura.
- Rejeição = nota parada, faturamento parado, retrabalho do escritório contábil e risco de autuação.
- IA genérica "alucina" norma. Contador não pode assinar algo sem base legal rastreável.

### 2.2 Proposta de valor
| Para quem | Valor |
|---|---|
| Empresa (dono — quem paga) | Menos notas rejeitadas, faturamento que não trava, custo previsível (pacote com teto) |
| Escritório contábil (quem indica) | Produtividade, rastreabilidade (artigo + CRC + horário), canal de receita/indicação |
| Contador (quem firma) | Sugestão com fundamento, não decisão; responsabilidade documentada |

### 2.3 Princípios do produto (tirados literalmente das telas)
1. **"Sugestão, não decisão."** A IA nunca emite/decide sozinha; o contador firma.
2. **"A IA não inventa norma."** O modelo só pode escolher artigo presente na base interna; se não houver, **não sugere**.
3. **"A IA aponta o campo. Não julga o Fisco."** Na rejeição, o produto localiza o campo, não discute o mérito.
4. **"O log grava artigo e CRC."** Toda decisão é auditável: artigo, data da norma, CRC, horário.
5. **"Excedente R$ 4, escrito antes."** Nada de cobrança surpresa: o cliente vê o custo antes e escolhe Parar/Seguir.
6. **Base legal com data** ("portaria de 05/10/2026"): toda sugestão vale para uma versão datada da norma.

### 2.4 Atores
| Ator | Papel |
|---|---|
| **Dono da empresa** | Contratante/pagador. Decide seguir ou parar quando bate o teto. |
| **Escritório contábil** | Canal de indicação ("Quem indica: Escritório Exemplo"). 🔎 Pode operar a ferramenta pelos clientes. |
| **Contador (CRC)** | Revisa a sugestão e **firma** (ex.: Maria Souza, CRC 1SP123456). |
| **Plantão** | Suporte humano por telefone, visível em todas as telas de erro. |
| **Curador da base legal** (interno) | Mantém LC 214, portarias com data e tabela de ISS por município. 🔎 |

### 2.5 Modelo comercial (tela "Contrato de cálculo" + "Teto do pacote")
- Contrato **anual**: R$ 18.000/ano, vencimento **dia 1** (de cada ano).
- **Primeiro CNPJ: R$ 9.000; próximo CNPJ: preço cheio.** 🔎 Interpretação mais provável: 50% de desconto no primeiro
  CNPJ do grupo/indicação; demais CNPJs a R$ 18.000. (A confirmar — ver perguntas.)
- **Planos por pacote de notas** (ex.: "Plano Meio" = 6.000 notas autorizadas). 🔎 Há outros planos (ex.: Início/Meio/Topo).
- **Excedente R$ 4 por nota** acima do teto, informado **antes** de emitir; cliente escolhe **Parar** ou **Seguir**.
- Indicação por escritório contábil → possível comissão/rev-share. 🔎
- **Fila de contratos**: Pendente (4) / Confirmada (11) / Parada (0) — pipeline comercial/operacional de contratos.

### 2.6 Métricas de sucesso
- **Taxa de rejeição** SEFAZ e Prefeitura (antes × depois) — métrica-norte. Ex.: 18→2 e 9→1.
- % de notas com sugestão (cobertura da base) vs. "não sugere".
- % de sugestões confirmadas sem alteração pelo contador (precisão percebida).
- Tempo médio da leitura até "firmar".
- Consumo do pacote e receita de excedente.

## 3. Jornadas

### J1 — Nota nova (caminho feliz)
1. Entra o **XML da nota** (upload ou integração 🔎).
2. **Leitura da nota**: o sistema extrai NCM, estado, município, ISS (sim/não), valor.
3. **Motor** cruza com a base interna e devolve **Sugestão IBS/CBS** com **artigo e data** da norma.
4. Usuário clica **Ir para firmar** → tela de firma mostra base legal + contador.
5. **Contador confirma (CRC)** → **Firmar**.
6. Log grava **artigo, CRC, horário** (+ versão da base, hash do XML).
7. Antes de seguir, checa **teto do pacote**; se a nota passa do teto, mostra o excedente e pede **Parar/Seguir**.

### J2 — Motor não encontra base
- O modelo **não sugere**. A nota vai direto para o contador decidir manualmente; mesmo assim a firma e o log
  (com a justificativa do contador) são obrigatórios.

### J3 — Nota voltou (rejeição)
1. Chega o retorno da SEFAZ/Prefeitura com **código e campo** (ex.: SEFAZ código 999, campo NCM; Prefeitura código 000, campo ISS).
2. Tela **"Nota voltou"** lista as rejeições, aponta o campo, mostra o **Plantão**.
3. **Voltar à nota** → reabre a leitura com o campo destacado para correção → refaz J1.

### J4 — Teto do pacote
- Usadas 5.980 de 6.000. A próxima nota **passa do teto** → aviso com custo (R$ 4) **antes** → Parar ou Seguir. A decisão é registrada.

### J5 — Contrato
- Painel do contrato: quem paga, quem indica, vencimento, valores, fila de contratos, última nota, indicadores de rejeição, plantão.

## 4. Telas (inventário)

| # | Tela | Arquivo | Conteúdo-chave | Ações |
|---|---|---|---|---|
| T1 | **Contrato de cálculo** (painel) | [01](telas/01-contrato-de-calculo.jpg) | Quem paga / Quem indica / Vencimento; Valores do contrato; Fila de contratos (pendente/confirmada/parada); Nota fiscal de serviço (NCM, UF, município, ISS, valor, situação); Base legal aberta; Contador; Rejeições SEFAZ/Prefeitura; Plantão | **Firmar** |
| T2 | **Leitura da nota** | [04](telas/04-leitura-da-nota.jpg) | Campos extraídos; card "Sugestão IBS/CBS" com base legal e aviso "Sugestão, não decisão. A IA não inventa norma." | **Ir para firmar** |
| T3 | **Nota voltou** | [02](telas/02-nota-voltou.jpg) | Lista de rejeições (órgão, código, campo); "A IA aponta o campo. Não julga o Fisco."; Plantão | **Voltar à nota** |
| T4 | **Teto do pacote** | [05](telas/05-teto-do-pacote.jpg) | Plano, autorizadas, usadas, aviso de excedente | **Parar** / **Seguir** |
| D1 | **Motor** (diagrama) | [03](telas/03-motor.jpg) | Entradas → base interna → modelo → sugestão / não sugere → contador → log | — |

Observação de design: as telas são minimalistas, frases curtas e afirmativas, um botão principal escuro por tela.
Cores semânticas: verde = ok/confirmado, vermelho = rejeição, roxo = IA/sugestão, azul = informação.

## 5. Requisitos funcionais

**Leitura**
- RF01 Receber XML de NF-e/NFS-e (upload no POC) e validar estrutura.
- RF02 Extrair NCM (ou código de serviço/NBS 🔎), UF, município (código IBGE), indicador de ISS, valor, emitente/CNPJ.
- RF03 Exibir a leitura em formato chave/valor (T2).

**Motor de sugestão**
- RF04 Consultar a base interna filtrando por vigência (data da nota) e jurisdição (UF/município).
- RF05 O modelo escolhe **apenas** entre os artigos recuperados (saída restrita a IDs da base).
- RF06 Se nenhum artigo for aplicável ou a confiança for baixa → retornar "não sugere" com motivo.
- RF07 Sugestão traz: CST/`cClassTrib` IBS/CBS 🔎, alíquota/redução quando houver, **artigo**, **data da norma**, justificativa curta.
- RF08 Validação determinística pós-modelo: o artigo retornado existe, está vigente e cobre o NCM/serviço.

**Firma**
- RF09 Contador identificado por nome + CRC confirma, edita ou rejeita a sugestão.
- RF10 "Firmar" gera registro imutável: nota (hash), sugestão, decisão final, artigo, versão da base, CRC, usuário, horário.

**Rejeição**
- RF11 Receber retorno da SEFAZ/Prefeitura (no POC: simulado/importado) com código e campo.
- RF12 Mapear código → campo → explicação curta; destacar o campo na leitura ao "Voltar à nota".

**Pacote/teto**
- RF13 Contar notas por contrato no período; avisar ao atingir o teto **antes** da próxima nota.
- RF14 Registrar a decisão Parar/Seguir e calcular o excedente (R$ 4/nota).

**Contrato**
- RF15 Cadastro de contrato: pagador, indicador (escritório), CNPJs, valor anual, desconto do 1º CNPJ, vencimento, plano.
- RF16 Fila de contratos por status (pendente/confirmada/parada).
- RF17 Indicadores de rejeição por órgão (antes × depois) e contato do plantão.

## 6. Requisitos não funcionais
- **Rastreabilidade/auditoria**: log append-only; reter ≥ 5 anos (prazo decadencial fiscal) 🔎.
- **Versionamento da base legal**: toda norma com data de publicação e vigência; sugestão referencia a versão.
- **Determinismo onde importa**: regras e validações em código; o LLM só escolhe dentro de opções fechadas.
- **LGPD**: XML contém dados de terceiros (destinatário). Criptografia em repouso, segregação por cliente (multi-tenant).
- **Segurança**: o contador firma com identidade forte (no produto: login + 2FA; certificado digital 🔎).
- **Disponibilidade**: emissão é horário comercial crítico; plantão humano como fallback.

## 7. Arquitetura técnica

### 7.1 Motor (diagrama D1, detalhado)
```
XML ──► Parser ──► Campos (NCM, UF, município, ISS, valor, data)
                        │
                        ▼
              Recuperação na BASE INTERNA  (filtro: vigência × UF/município × NCM/serviço)
                        │  candidatos [art_id...]
                        ▼
              LLM com saída estruturada: escolher art_id ∈ candidatos  |  "nao_sugere"
                        │
                        ▼
              Validador determinístico (art existe? vigente? cobre o NCM?)
               ├── ok ─────► SUGESTÃO IBS/CBS (artigo + data)
               └── falha ──► NÃO SUGERE
                        │
                        ▼
              CONTADOR CONFIRMA (CRC) ──► LOG (artigo, CRC, horário, versão da base, hash do XML)
```
O diagrama diz que **login, preço e teto ficam fora** do motor: são módulos separados (identidade, cobrança,
medição). O motor é uma função pura: `(nota, versão_da_base) → sugestão | não_sugere`.

### 7.2 Modelo de dados (mínimo)
- `cliente` (empresa, CNPJ, quem paga), `escritorio` (indicador), `contrato` (valor_anual, desconto_primeiro_cnpj,
  vencimento_dia, plano_id, status: pendente|confirmada|parada), `contrato_cnpj`.
- `plano` (nome, notas_autorizadas, preco_excedente).
- `norma` (id, tipo LC/portaria, número, artigo, texto, data_publicacao, vigencia_inicio/fim, escopo NCM/serviço/UF/município, versão).
- `iss_municipio` (código IBGE, regra/alíquota, vigência).
- `nota` (id, cliente, xml_hash, xml, campos extraídos, status: lida|sugerida|firmada|autorizada|rejeitada).
- `sugestao` (nota_id, norma_id|null, resultado, justificativa, modelo, versão_base, criado_em).
- `firma` (nota_id, sugestao_id, decisao final, contador_nome, crc, usuario_id, firmado_em) — **append-only**.
- `rejeicao` (nota_id, orgao SEFAZ|PREFEITURA, codigo, campo, mensagem, recebida_em).
- `consumo` (contrato_id, periodo, usadas) e `decisao_teto` (contrato_id, nota_id, parar|seguir, valor_excedente, em).
- `contador` (nome, crc, uf_crc).

### 7.3 API (POC)
| Método | Rota | Função |
|---|---|---|
| POST | `/notas` | Upload de XML → leitura |
| POST | `/notas/{id}/sugestao` | Roda o motor |
| POST | `/notas/{id}/firma` | Contador firma (CRC) |
| POST | `/notas/{id}/rejeicoes` | Registra retorno simulado SEFAZ/Prefeitura |
| GET | `/contratos/{id}/painel` | Dados do T1 |
| GET | `/contratos/{id}/teto` | Uso do pacote; POST `/contratos/{id}/teto/decisao` |
| GET | `/log` | Trilha de auditoria |

## 8. Pontos de atenção encontrados nas telas
1. **NCM 6104.43.00 é mercadoria** (vestuário de malha), mas a tela diz "Nota fiscal de **serviço**" com **ISS = sim**.
   Mercadoria → NF-e/ICMS; serviço → NFS-e/ISS, classificado por código de serviço (LC 116 / NBS). O POC precisa
   decidir: foco em NF-e (NCM), NFS-e (serviço) ou ambos. Provavelmente o exemplo é ilustrativo.
2. **"LC 214, art. X"** é placeholder — a base inicial precisa ser curada (quais artigos/anexos entram).
3. **"Nota da sexta passou"** sugere notificação de status da última nota. 🔎
4. **"18 para 2"**: confirmar se é antes × depois (métrica de impacto) e em qual período.
5. A tela T1 mistura **visão comercial** (contrato, fila) com **operacional** (nota, firma). No produto, separar em
   "Contrato" e "Nota"; no POC pode ficar em um painel único, como no modelo.
