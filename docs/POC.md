# Sugestão de implementação — POC

Objetivo: em **3–4 semanas**, provar com dados reais (ou realistas) que o motor **sugere com base legal rastreável**,
o **contador firma** e uma **rejeição é explicada pelo campo** — as 5 telas navegáveis ponta a ponta.

## 1. Hipóteses que a POC precisa provar
| # | Hipótese | Como medir na POC |
|---|---|---|
| H1 | O motor acerta a classificação IBS/CBS citando artigo real | Conjunto-ouro de 50–100 notas classificadas por contador: % de acerto, 0 artigos inventados |
| H2 | "Não sugere" acontece quando deve (sem alucinar) | Notas fora da base → 100% "não sugere" |
| H3 | O contador confia e firma mais rápido | Tempo leitura→firma; % confirmadas sem edição |
| H4 | Códigos de rejeição viram campo + ação clara | Top 20 códigos de rejeição mapeados; teste com rejeições reais do escritório |
| H5 | O cliente entende teto/excedente | Teste de usabilidade da tela T4 com 3–5 donos de empresa |

## 2. Escopo

**Dentro**
- Upload de XML (NF-e **ou** NFS-e — escolher um; ver PERGUNTAS #1).
- Base interna pequena e curada: trechos da LC 214 + 1 portaria datada + ISS de **1 município** (Campinas/SP).
- Motor (recuperação + LLM restrito + validador) e tela "Leitura da nota".
- Firma com nome + CRC, log append-only.
- "Nota voltou" com rejeições **simuladas** a partir de uma tabela de códigos.
- "Teto do pacote" com contador de uso e decisão Parar/Seguir (sem cobrança real).
- Painel "Contrato de cálculo" com dados seed.

**Fora** (como o próprio diagrama diz: *login, preço e teto ficam fora do motor*)
- Transmissão real para SEFAZ/Prefeitura, certificado digital, emissão de nota.
- Cobrança/billing real, multi-plano completo, portal de indicação.
- Login robusto (no POC: usuário fixo ou magic link simples).

## 3. Stack sugerida
| Camada | Escolha | Por quê |
|---|---|---|
| Front | **Next.js (App Router) + Tailwind + shadcn/ui** | Rápido, combina com o visual minimalista das telas |
| Back | Route handlers do Next (ou FastAPI, se o time for Python) | Um repositório só |
| Banco | **Postgres (Supabase)** + `pgvector` | Relacional para log/contratos; vetor para a busca na base legal |
| LLM | **Claude** via API com **saída estruturada (tool use / JSON schema com `enum` de IDs)** | Garante "escolhe só artigo que está na base" |
| Parser XML | `fast-xml-parser` (TS) ou `lxml` (Py) | — |
| Deploy | Vercel + Supabase | Custo zero/baixo para POC |

## 4. O coração: motor com saída fechada
```ts
// 1) recupera candidatos determinísticamente + busca semântica
const candidatos = await baseLegal.buscar({
  ncm, uf, municipio, dataNota,          // filtros duros: vigência e escopo
  texto: descricaoItem, limite: 8,       // ranking semântico
});
if (candidatos.length === 0) return { resultado: "nao_sugere", motivo: "sem norma na base" };

// 2) LLM só pode devolver um ID da lista ou "nao_sugere"
const schema = {
  type: "object",
  properties: {
    norma_id: { type: "string", enum: [...candidatos.map(c => c.id), "nao_sugere"] },
    cst_ibs_cbs: { type: "string" },
    cclass_trib: { type: "string" },
    justificativa: { type: "string", maxLength: 400 },
  },
  required: ["norma_id", "justificativa"],
};

// 3) valida em código: existe, vigente na data da nota, escopo cobre o NCM
const s = await llm.classificar(nota, candidatos, schema);
if (s.norma_id === "nao_sugere" || !validador.ok(s, nota)) return { resultado: "nao_sugere", ... };
return { resultado: "sugere", ...s, norma: candidatos.find(c => c.id === s.norma_id) };
```
Regras: temperatura baixa; prompt proíbe citar algo fora dos candidatos; o texto do artigo exibido vem **do banco**,
nunca do modelo; versão da base gravada junto com a sugestão.

## 5. Estrutura de pastas proposta
```
app/
  contrato/[id]/page.tsx        # T1 Contrato de cálculo
  notas/nova/page.tsx           # upload XML
  notas/[id]/page.tsx           # T2 Leitura da nota
  notas/[id]/firmar/page.tsx    # firma (bloco direito do T1)
  notas/[id]/voltou/page.tsx    # T3 Nota voltou
  pacote/page.tsx               # T4 Teto do pacote
  api/...                       # rotas da SPEC §7.3
lib/
  xml/parse.ts                  # NF-e / NFS-e → campos
  motor/{buscar,classificar,validar}.ts
  rejeicoes/codigos.ts          # código → campo → mensagem
  log/append.ts
db/
  migrations/                   # tabelas da SPEC §7.2
  seed/                         # LC 214 (trechos), portaria 05/10/2026, ISS Campinas, contrato exemplo
eval/
  ouro.csv                      # 50–100 notas classificadas por contador
  rodar.ts                      # mede H1/H2
```

## 6. Cronograma (4 semanas)
| Semana | Entrega |
|---|---|
| 1 | Repositório, banco + migrations, parser XML, seed da base legal, tela T2 com leitura (sem IA) |
| 2 | Motor (busca + LLM restrito + validador), card de sugestão, conjunto-ouro e primeira avaliação |
| 3 | Firma + log, "Nota voltou" com tabela de códigos, "Teto do pacote" |
| 4 | Painel "Contrato de cálculo", ajustes visuais, rodada com 2–3 contadores, relatório H1–H5 |

## 7. Critério de "POC aprovada"
- ≥ 85% de acerto no conjunto-ouro **e 0 artigo inexistente** citado.
- 100% das notas fora da base retornam "não sugere".
- Contadores firmam ≥ 70% das sugestões sem editar.
- Fluxo T2 → firma → T3 → T2 funciona ponta a ponta com log consultável.

## 8. Riscos
| Risco | Mitigação |
|---|---|
| Regulamentação muda durante a POC | Base versionada por data; sugestão sempre referencia a versão |
| Curadoria da base é o gargalo (não a IA) | Começar com escopo estreito (1 setor/NCMs + 1 município); ter tributarista no time |
| Responsabilidade jurídica da sugestão | "Sugestão, não decisão" na interface + termo de uso + firma por CRC |
| Dados reais de clientes (LGPD) | XMLs anonimizados no conjunto-ouro; consentimento do escritório piloto |
| Confusão NF-e × NFS-e | Escolher um tipo de documento na POC |
