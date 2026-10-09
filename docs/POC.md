# Sugestão de implementação — POC

> Atualizado com as [decisões da mesa](decisoes-da-mesa.md). **Bloqueio: o primeiro escritório ainda não foi nomeado.**
> Sem nome, XML e municípios, a semana 1 não existe.

Objetivo: em **4 semanas**, com **um escritório real**, provar que **a parada cai**. O motor sugere com artigo e data,
o contador firma e, quando a nota volta, o sistema aponta o campo. Semana 1 com um escritório, semanas 2–4 com a
parada medida, e no dia 1 o cliente renova ou sai.

**Destino**: a POC vira v0 se a parada cair **e** houver renovação no dia 1. Se não cair, **descarta o fluxo e mantém a base**.

## 1. Hipóteses
| # | Hipótese | Como medir |
|---|---|---|
| **H0** | **A parada cai** (métrica-norte) | Rejeições por CNPJ e por semana, SEFAZ e prefeitura separadas: linha de base (4 semanas anteriores, mesmo lote) × semanas 2–4 |
| H1 | O motor acerta citando artigo real | Conjunto-ouro de 50–100 notas do escritório classificadas pelo tributarista: % de acerto, 0 artigo inventado |
| H2 | Sem base, não responde | Notas fora da base → 100% "não responde"; sem alíquota na base → 0 valor calculado |
| H3 | O contador firma mais rápido | Tempo leitura → firma; % firmadas sem edição |
| H4 | A rejeição vira campo | Códigos do histórico real do escritório mapeados para campo |
| H5 | O dono entende o teto | Aviso "R$ 4, escrito antes" compreendido por 3–5 donos |

## 2. Pré-requisitos (semana 0) — nada começa sem eles
1. **Escritório nomeado**, que cede XMLs dos ~20 CNPJs autorizados pelos donos.
2. **Termo** aceito pelo contador **e** pelo dono: sistema não é parecer; responde quem assina; CRC não é verificado no v0. Sem termo, não sobe nota.
3. **Histórico de rejeições** do escritório (arquivos de retorno) → tabela de códigos.
4. **Linha de base**: rejeições das 4 semanas anteriores, mesmo lote de CNPJs, SEFAZ e prefeitura separadas.
5. **Base legal** montada pelo tributarista do time: LC 214, portarias com vigência e ISS **só dos municípios desses CNPJs**, no estado do escritório.
6. **Plantão** escalado: sexta 18h–22h e sábado 9h–12h, uma pessoa, telefone.

## 3. Escopo

**Dentro**
- Entrar (login simples) e escolher o CNPJ do dono; aceite do termo antes do primeiro XML.
- Upload de XML **NF-e e NFS-e** que o escritório já emite.
- Leitura: NCM, estado, município, ISS, valor.
- Motor:
  - **Legado**: ICMS e ISS.
  - **IBS/CBS**: CST, `cClassTrib` e alíquota só se estiverem na base, com artigo e data; valor só calculado com alíquota da base. Sem alíquota, classifica e não calcula.
- Firma: nome + CRC digitados por quem está logado; log imutável (CRC, artigo, data da norma, horário).
- "Nota voltou": arquivo de retorno (XML se houver; senão código + órgão colados), SEFAZ e prefeitura separadas, campo, código e plantão.
- Pacote por CNPJ:
  - Entrada 2.400 / R$ 9 mil · Meio 6.000 / R$ 18 mil · Cheio 12.000 / R$ 24 mil.
  - Excedente R$ 4 acima do teto **daquele CNPJ**, avisado antes; Parar/Seguir.
  - Rejeitada devolvida não conta de novo.
  - Renovação do 1º CNPJ vai a Meio (R$ 18 mil); demais CNPJs do dono nascem no Meio.
  - Cheio só liberado quando o indicador mostra parada caída naquele CNPJ.
- Indicador de parada por CNPJ e semana (também é o que libera o Cheio).
- Tela "Contrato de cálculo" sem a fila de contratos; plantão no rodapé com o horário da janela.
- Landing: "A nota sem volta", preço e vencimento na primeira dobra, botão "Ver na sua nota".

**Fora**
- PIS/COFINS e IPI.
- ERP, emissão/transmissão, guia, busca de norma na web ou em site de prefeitura na hora.
- Certificado digital e consulta de CRC.
- Cobrança real, comissão do escritório, painel do escritório (só após a 1ª renovação).
- SLA fora da janela de plantão.

## 4. Stack sugerida (se o time for TypeScript — não é decisão de produto)
| Camada | Escolha |
|---|---|
| Front + back | Next.js (App Router) + Tailwind + shadcn/ui, route handlers |
| Banco | Postgres (Supabase) + `pgvector` |
| LLM | Claude via API, saída estruturada com `enum` de IDs da base |
| Parser XML | `fast-xml-parser` |
| Deploy | Vercel + Supabase |

Se o time for Python: FastAPI + `lxml` + o mesmo Postgres; o desenho do motor não muda.

## 5. O coração: motor com saída fechada
```ts
// 1) candidatos por filtro duro: vigência × UF × município × NCM/serviço × tributo
const candidatos = await base.buscar({ ncm, uf, municipio, dataNota, tributo, limite: 8 });
if (candidatos.length === 0) return { resultado: "nao_responde", motivo: "sem norma na base" };

// 2) o LLM só escolhe um ID da lista; CST/cClassTrib/alíquota vêm da norma escolhida, não do modelo
const s = await llm.escolher(nota, candidatos, {
  norma_id: { enum: [...candidatos.map(c => c.id), "nao_responde"] },
  justificativa: { type: "string", maxLength: 400 },
});
if (s.norma_id === "nao_responde") return { resultado: "nao_responde" };

// 3) validação em código
const norma = candidatos.find(c => c.id === s.norma_id)!;
if (!validador.ok(norma, nota)) return { resultado: "nao_responde" };

return {
  resultado: "sugere",
  norma,                                          // artigo + data, texto vindo do banco
  cst: norma.cst ?? null,
  cclassTrib: norma.cclass_trib ?? null,
  aliquota: norma.aliquota ?? null,
  valor: norma.aliquota != null ? round2(nota.base * norma.aliquota) : null, // sem alíquota, não calcula
};
```
Princípio: **todo número sai da base, nunca do modelo**. O modelo só escolhe qual norma se aplica.

## 6. Estrutura de pastas
```
app/
  page.tsx                      # landing
  entrar/page.tsx               # login + escolher CNPJ
  termo/page.tsx                # aceite (contador e dono)
  contrato/[cnpj]/page.tsx      # Contrato de cálculo
  notas/nova/page.tsx           # upload XML (checa termo e teto antes)
  notas/[id]/page.tsx           # Leitura da nota
  notas/[id]/firmar/page.tsx    # firma
  notas/[id]/voltou/page.tsx    # Nota voltou
  notas/[id]/retorno/page.tsx   # subir arquivo de retorno ou colar código + órgão
  pacote/[cnpj]/page.tsx        # Teto do pacote
  parada/page.tsx               # indicador semanal
lib/
  xml/{nfe,nfse}.ts
  motor/{buscar,escolher,validar}.ts
  pacote/regras.ts              # tetos, excedente, renovação, liberação do Cheio
  rejeicoes/codigos.ts          # gerado do histórico do escritório
  log/append.ts
db/
  migrations/
  seed/                         # base do estado/municípios do piloto (tributarista)
eval/
  ouro.csv
  linha_de_base.csv
```

## 7. Cronograma
| Semana | Entrega |
|---|---|
| 0 | Pré-requisitos da §2; banco, parser, base, tabela de códigos |
| 1 | Primeiro escritório usando: entrar, termo, upload, leitura, motor, firma |
| 2 | Retorno/"Nota voltou", teto do pacote, indicador de parada |
| 3–4 | Parada medida por semana; tributarista atualiza a base a cada portaria até o dia útil seguinte; relatório H0–H5 |
| Dia 1 | Renova (vira v0) ou sai (descarta o fluxo, mantém a base) |

## 8. Critério de aprovação
- **Parada menor** que a linha de base nas semanas 2–4, SEFAZ e prefeitura separadas.
- **Renovação** no dia 1.
- 0 artigo inexistente; 0 alíquota ou valor fora da base.
- ≥ 85% de acerto no conjunto-ouro; ≥ 70% das sugestões firmadas sem edição.

## 9. Riscos
| Risco | Mitigação |
|---|---|
| Escritório não nomeado | É o bloqueio atual; nada da semana 0 começa sem ele |
| Portaria nova durante a POC | Tributarista inclui até o dia útil seguinte, com vigência; sugestão grava a versão da base |
| Base sem alíquota para o caso | Classifica e não calcula — comportamento esperado, não falha |
| Responsabilidade | Termo assinado por contador e dono antes do 1º XML |
| Rejeição na sexta fora da janela | Tela mostra o horário do plantão; sem promessa de SLA |
| LGPD | XMLs do piloto isolados por escritório; conjunto-ouro anonimizado |
