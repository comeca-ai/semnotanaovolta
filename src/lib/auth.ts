// Login por link mágico: token aleatório de uso único, 15 minutos. Guardamos só o hash.

export const VALIDADE_LINK_MS = 15 * 60 * 1000;
export const VALIDADE_SESSAO_MS = 7 * 24 * 60 * 60 * 1000;
export const COOKIE_SESSAO = '__Host-sessao';

export function tokenAleatorio(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256(dado: string | ArrayBuffer): Promise<string> {
  const bytes = typeof dado === 'string' ? new TextEncoder().encode(dado) : dado;
  const h = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function enviarLinkPorEmail(apiKey: string, remetente: string, para: string, link: string): Promise<boolean> {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: remetente,
      to: [para],
      subject: 'Seu link para entrar',
      text: `Entre por este link. Vale por 15 minutos e uma vez só.\n\n${link}\n\nSe não foi você, ignore.`,
    }),
  });
  return r.ok;
}

/** Plantão da POC: sexta 18h–22h e sábado 9h–12h, horário de Brasília (decisão 13). */
export function plantaoAberto(agora = new Date()): boolean {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', hourCycle: 'h23',
  }).formatToParts(agora);
  const dia = partes.find((p) => p.type === 'weekday')?.value;
  const hora = Number(partes.find((p) => p.type === 'hour')?.value);
  return (dia === 'Fri' && hora >= 18 && hora < 22) || (dia === 'Sat' && hora >= 9 && hora < 12);
}
