# A nota sem volta — contexto para agentes (Cursor, Claude Code etc.)

Leia antes de codar, nesta ordem de precedência:
1. `docs/decisoes-da-mesa.md` — decisões finais (vencem tudo)
2. `docs/recorte-da-mesa.md` — oferta, canal, fluxo, mercado
3. `docs/SPEC.md` — especificação de negócio e técnica
4. `docs/POC.md` — plano de implementação, stack sugerida, estrutura de pastas
5. `docs/telas/` — modelos de tela (a fila de contratos da tela 01 **saiu**)

## Regras que o código não pode violar
- A IA **sugere, não decide**. Só escolhe norma que está na base interna; sem norma, **não responde**.
- **Todo número (CST, cClassTrib, alíquota, valor) vem da base, nunca do modelo.** Sem alíquota na base: classifica e não calcula.
- Saída do LLM é **fechada**: `enum` dos IDs de norma candidatos + `"nao_responde"`. Validar em código depois.
- Nada de busca na web nem em site de prefeitura em tempo real.
- Legado no v0 = **ICMS e ISS**. PIS/COFINS e IPI fora.
- Log de firma **append-only**: CRC, artigo, data da norma, horário, versão da base, hash do XML.
- **Sem termo aceito (contador e dono), não sobe nota.**
- Pacotes por CNPJ: Entrada 2.400 / R$ 9 mil · Meio 6.000 / R$ 18 mil · Cheio 12.000 / R$ 24 mil.
  Excedente R$ 4 acima do teto **daquele CNPJ**, avisado **antes**. Rejeitada devolvida não conta de novo.
  Renovação do 1º CNPJ → Meio. Cheio só liberado pelo indicador de parada.
- SEFAZ e prefeitura sempre **separadas** e com o mesmo peso.
- Regras de pacote/preço/teto ficam **fora do motor** (no servidor, em `lib/pacote`).
- Interface em português, frases curtas e afirmativas, um botão principal por tela.

## Estado
- Worker em TypeScript + Hono (JSX no servidor), D1 `anotasemvolta`, R2 `anotasemvolta-xml`. Ver `README` para rodar.
- Feito: login por link, termo, upload em lote, leitor NF-e/NFS-e, motor por regra (IA desligada), leitura, firma com log imutável, teto do pacote.
- Falta: retorno de rejeição ("Nota voltou"), indicador de parada, envio de e-mail (Resend), escolhedor por IA para empates.
- Bloqueio de negócio: primeiro escritório não nomeado (sem ele não há base real, tabela de códigos nem linha de base). Para desenvolver, use dados fictícios em `db/seed/` marcados como fictícios.
