# Fale e Pronto — o propósito maior (contexto para o Steve)

Registrado em 2026-10-09, a partir das palavras do Jhonata (CEO da começa.ai) nesta conversa. Leia antes de criticar qualquer versão do Fale e Pronto ou do Flow Studio.

## O problema, nas palavras dele
- "workflows criadas por IA ainda têm um tempo... se cria por IA e ela se perpetua em lugares onde poderiam ser workflows."
  Hoje a IA é posta para executar o processo inteiro toda vez: cara, variável, difícil de auditar, e o custo nunca cai.
- "qual a forma mais inteligente de fazer workflow simples, seguras, baratas, confiáveis? Não quero n8n, eu acho que isso é passado."
  Canvas de caixinhas é ferramenta de técnico; não é o futuro.
- "reinventar o que é a mistura de workflow, eficiência de motor e IA generativa."

## A tese
**A IA trabalha uma vez; o processo trabalha para sempre.** A IA entende o que a pessoa quer e monta o processo; um motor simples e barato executa; a IA só volta quando aparece algo novo — e cada caso novo resolvido vira regra fixa. O sistema fica mais barato e mais confiável com o tempo, e a parte que depende de IA encolhe.

## Para quem
Quem não é técnico e repete trabalho todo dia: pequenos negócios, equipes, prefeituras, o próprio IsentaPCD. Gente que sabe explicar o próprio trabalho, mas nunca vai abrir um editor de fluxo. Vivem no WhatsApp.

## O que ele já disse que quer na experiência
- "existe uma pré-fase no-code, alguém precisa dizer o que precisa" — a entrada é falar (áudio), não configurar.
- "o visual de fluxo ajuda a deixar as conexões eficientes" — ver o processo importa, mas não como caixinhas técnicas.
- "tudo técnico demais" — a pessoa nunca vê código, serviço, bloco ou configuração.
- "a mágica acontecendo... como se fosse montar um Lego" — as peças caindo enquanto fala.
- "como ficar simples de ver rodando? simples assim" — ver funcionando sem esforço.

## Restrições reais
- Rodar na Cloudflare (Workers, Workflows, D1, R2, AI Gateway): segurança e custo baixo. Já existe o Flow Studio em homologação (motor durável, idempotência, limites, login por link, isolamento por organização). Faltam no motor: gatilho externo, condição, WhatsApp para terceiros, espera por resposta humana, modo ensaio.
- Dados sensíveis (saúde, no caso PCD) não vão em mensagem; ficam atrás de link seguro.
- Empresa AI-first, time pequeno: o que se constrói precisa ser simples de manter.

## Como medir se deu certo
- Uma pessoa não técnica cria um processo que funciona em menos de 5 minutos, só falando.
- Depois de 30 dias, ela só é chamada nos casos realmente novos.
- O custo de IA por execução cai mês a mês (a fração de peças que "pensam" diminui).
- Tempo devolvido à pessoa, em horas por semana.
