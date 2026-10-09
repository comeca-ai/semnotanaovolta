# Contexto do proprietário — histórico em 08/10/2026

Este arquivo orienta a próxima investigação. Não é inventário ao vivo, autorização futura ou garantia de acesso. Não contém chaves ou dados de clientes.

## Preferências expressas

- Proprietário: Jhonata; prefere português e nomes de serviços compreensíveis.
- Quer concentrar a infraestrutura na Cloudflare quando fizer sentido, com código controlável, eficiência e previsibilidade após os créditos. Não presumir superioridade universal sobre outras plataformas.
- Quer workflows visuais, interface MCP e IA removível, preservando controle da execução.
- Prefere painel navegável por serviço e decisões claras. Autorizações explícitas devem ser respeitadas; não repetir pedidos desnecessários.
- O plano de otimização geral ficou para outra sessão. Limpezas posteriores específicas não autorizaram a consolidação dos demais serviços.

## Registros existentes

- Repositório privado: [Jhonata-Emerick/otimizacao-cloudflare](https://github.com/Jhonata-Emerick/otimizacao-cloudflare).
- Último commit de limpeza Fiscal conhecido: `36cf200e61248be51531fa71c53d62a78d3a67cb`.
- Entregáveis locais da sessão: `/Users/jhoneme/Documents/Codex/2026-10-08/new-chat/outputs/` — plano `otimizacao-cloudflare.md`, painel `limpeza-cloudflare.html` e registro `backups-cloudflare/registro-limpeza.json`. Backups privados não devem ser publicados.
- Snapshot após Fiscal: 38 aplicações (37 Workers e um Pages), dez D1, 32 tokens da conta e 20 pessoais, dois membros e quatro acessos OAuth. Revalidar antes de usar como número atual.
- Conta auditada termina em `e81c195`; subdomínio Workers `jhonata-emerick.workers.dev`. Obtenha e confira o ID completo no registro ou no painel antes de executar; não escolha conta só pelo email/nome.
- Créditos tinham vencimento previsto em 15/10/2026; proprietário informou renovação recusada. Confirmar cobrança após créditos. A organização GitHub exibiu aviso de trial encerrado e risco de exclusão em 50 dias; verificar aviso atual e manter cópia local.

## Prioridades a revalidar

1. Assinaturas e zonas `paraibao.com.br` / `ultravis.ai`, que ainda apareciam Enterprise. Plano de zona é distinto de Workers Paid.
2. Ultravis: container configurado com 4 GiB e mediana observada de cerca de 237 MiB/24h. Medir pico/concorrência/inicialização antes de reduzir. Stream da conta: cerca de 761 minutos, não atribuídos integralmente a um produto.
3. Radar: `gptchat-radar` atende `indice.ia.br`, usa D1 `radar-poc` e R2 `cnpjs`. D1 tinha 3,43 GB e consultas por CNPJ sem versão varrendo milhões de linhas. EXPLAIN de proposta com `build_id` ativo usou índice existente; correção não implementada. `cnpjs` pode ser compartilhado com GPTchat CNPJ.
4. Comunidade: proprietário confirmou `comunidade.comeca.ai` funcional, servido por `escola-classica`. Rotas `/facaparte*` e `/afiliados*` tinham Worker próprio. Produção compartilha D1 `escola` e R2 `slidesaulas`; homologação usa recursos separados. Vários crons repetiam sincronizações. Preservar login, alunos, progresso, decisões editoriais e checkout.
5. Noticiário: `crawler`, `crawler1` e `projetoparaibao` eram estáticos, não coletores comprovados. `radar-pb` e `radar-dos-editais` compartilhavam KV e horário de cron; duplicidade funcional ainda não demonstrada.
6. Demais produtos: Reembolsa, Faz a Conta, Consórcio/Catovela, GPTchat CNPJ, clonagem de voz, Sebrae/compliance, pagamentos e utilitários têm planos no repositório, mas não diagnóstico integral. Não declarar todos auditados profundamente.

## Limpeza Fiscal concluída

Foram removidos `meufiscal`, `passaporte-fiscal`, `kilo-passaporte` e D1 homônimo. O Durable Object `meufiscal_FiscalBRMCP` desapareceu após exclusão do Worker. Backup do D1 teve restauração validada; não houve cópia completa confirmada do estado do Durable Object nem do código dos três Workers. Repositórios e zona/registro `kilo.ia.br` foram preservados. O token referido no build do Meu Fiscal já não constava nos 20 tokens pessoais; não foi registrado como revogado nesta etapa.

As demais exclusões anteriores estão no registro local. Não repeti-las nem inferir que qualquer recurso recriado está autorizado para nova exclusão.
