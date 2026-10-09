# Perguntas

> Fechadas pela mesa em 09/10/2026 — ver [`decisoes-da-mesa.md`](decisoes-da-mesa.md).

## 🔴 Único bloqueio
**15. Qual é o primeiro escritório?** Sem nome, XML e municípios, a semana 1 não existe. Dele dependem:
- o **estado** e os **municípios** da base (7);
- a **tabela de códigos de rejeição**, escrita a partir do histórico real dele (11);
- a **linha de base**: rejeições das 4 semanas anteriores, mesmo lote de CNPJs, SEFAZ e prefeitura separadas (12).

## Fechadas
| # | Tema | Decisão |
|---|---|---|
| 1 | Excedente | R$ 4 acima do teto do pacote **daquele CNPJ** (2.400 / 6.000 / 12.000), escrito antes |
| 2 | Ticket médio | R$ 13,5 mil = (Entrada 9 + Meio 18) / 2. Cheio fora da média |
| 3 | Renovação | 1º CNPJ vai a R$ 18 mil / 6.000 no dia 1 do 2º ano. Demais CNPJs do dono nascem a R$ 18 mil |
| 4 | Cheio | Só com parada já caída **naquele CNPJ**, SEFAZ e prefeitura separadas, atestada pelo **indicador do sistema** |
| 5 | Legado | v0 = **ICMS e ISS**. PIS/COFINS e IPI fora |
| 6 | IBS/CBS | CST, cClassTrib e alíquota só se estiverem na base (artigo + data). Calcula valor só com alíquota da base; sem alíquota, classifica e não calcula |
| 7 | Estado/municípios | Estado do 1º escritório que ceder XML; municípios dos CNPJs dele |
| 8 | Curadoria | Tributarista do time. Toda portaria de IBS/CBS ou ISS dos municípios do piloto entra antes do dia útil seguinte, com vigência. Site de prefeitura não é fonte na hora |
| 9 | Firma | Nome + CRC digitados por quem está logado. Sem certificado, sem consulta de CRC. Vai para o termo |
| 10 | Responsabilidade | Responde quem assinou. Termo aceito por contador **e** dono antes do 1º XML. Sem termo, não sobe nota |
| 11 | Rejeição | Arquivo de retorno do escritório (XML se houver; senão código + órgão colados) |
| 12 | Linha de base | 4 semanas anteriores, mesmo lote de CNPJs, SEFAZ e prefeitura separadas |
| 13 | Plantão | Sex 18h–22h e sáb 9h–12h, telefone, uma pessoa. Fora da janela, a tela mostra o horário; sem SLA |
| 14 | Escritório | Sem comissão no v0. Painel dos indicados só após a 1ª renovação |
| 16 | Destino da POC | Vira v0 se a parada cair **e** houver renovação no dia 1. Se não cair, descarta o fluxo e mantém a base. Stack é sugestão (TypeScript), não decisão de produto |

### Respondidas antes, pelo recorte
NF-e e NFS-e · classifica a nota que o escritório já emite, sem ERP · upload de XML · dono paga, escritório indica · pacotes Entrada/Meio/Cheio, anuais, vencimento dia 1 · rejeitada devolvida não conta de novo · fila de contratos saiu · sem busca na web · plantão é gente e telefone.
