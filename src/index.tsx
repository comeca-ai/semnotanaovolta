import { Hono, type Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { Layout, type Aba } from './ui/layout';
import {
  COOKIE_SESSAO, VALIDADE_LINK_MS, VALIDADE_SESSAO_MS, enviarLinkPorEmail, plantaoAberto, sha256, tokenAleatorio,
} from './lib/auth';
import { PACOTES, avaliarTeto, pacoteNaRenovacao, reais, type Pacote } from './lib/pacote';
import { lerXml, tributosDoItem, type NotaLida } from './lib/xml';
import { sugerir, type Norma } from './lib/motor';

type Env = {
  DB: D1Database;
  XML: R2Bucket;
  MODO_DEV: string;
  EMAIL_REMETENTE: string;
  PLANTAO_TELEFONE: string;
  RESEND_API_KEY?: string;
};
type Usuario = { id: number; email: string; nome: string; papel: 'dono' | 'contador'; escritorio_id: number | null };
type Cnpj = {
  id: number; cnpj: string; razao_social: string; uf: string; municipio: string;
  dono_nome: string; escritorio_nome: string; dono_id: number; pacote: Pacote | null; aceites: number;
};
type Contrato = { id: number; pacote: Pacote; preco_centavos: number; teto_notas: number; inicio: string; fim: string };
type Vars = { usuario: Usuario; cnpj: Cnpj; contrato: Contrato | null };
type C = Context<{ Bindings: Env; Variables: Vars }>;

const VERSAO_TERMO = '2026-10-09';
const MAX_ARQUIVOS = 200;
const MAX_BYTES = 1_000_000;

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

// ---------- utilidades ----------

const hoje = () => new Date().toISOString().slice(0, 10);
const fmtCnpj = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
const fmtNcm = (n: string) => n.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3');
const fmtAliq = (cpp: number) => `${(cpp / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%`;
const fmtData = (d: string) => d.split('-').reverse().join('/');
const fmtHora = (iso: string) =>
  new Date(iso.endsWith('Z') ? iso : `${iso.replace(' ', 'T')}Z`).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const plantao = (c: C) => ({ aberto: plantaoAberto(), telefone: c.env.PLANTAO_TELEFONE });

function pagina(c: C, titulo: string, corpo: any, status = 200, aba: Aba = null) {
  return c.html(
    <Layout titulo={`${titulo} · A nota sem volta`} usuario={c.get('usuario') ?? null} cnpj={c.get('cnpj') ?? null} aba={aba} plantao={plantao(c)}>
      {corpo}
    </Layout>,
    status as any,
  );
}

const tail = (chave: string) => String(chave).slice(-8);
const dataBr = (iso: string) => fmtData(iso.slice(0, 10));
const diaSeguinte = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

// POST só da própria origem.
app.use('*', async (c, next) => {
  if (c.req.method === 'POST') {
    const origem = c.req.header('Origin');
    if (origem && origem !== new URL(c.req.url).origin) return c.text('Origem recusada.', 403);
  }
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'same-origin');
  c.header('X-Frame-Options', 'DENY');
});

async function usuarioDaSessao(c: C): Promise<Usuario | null> {
  const token = getCookie(c, COOKIE_SESSAO);
  if (!token) return null;
  return c.env.DB.prepare(
    `SELECT u.id, u.email, u.nome, u.papel, u.escritorio_id FROM sessao s JOIN usuario u ON u.id = s.usuario_id
     WHERE s.hash = ? AND s.expira_em > ?`,
  ).bind(await sha256(token), Date.now()).first<Usuario>();
}

// ---------- landing ----------

app.get('/', (c) =>
  c.html(
    <Layout
      titulo="A nota sem volta"
      descricao="Seu contador confirma o imposto na nota, com artigo e data. R$ 9 mil por ano no primeiro CNPJ. Vence dia 1."
      plantao={plantao(c)}
    >
      <section class="capa">
        <h1>A nota sem volta.</h1>
        <p class="lead">Seu contador confirma o imposto na nota, com artigo e data. Na sexta, sem susto.</p>
        <p class="preco">R$ 9 mil por ano no primeiro CNPJ. R$ 18 mil nos próximos.</p>
        <p class="mini" style="margin-top:6px">Vence dia 1.</p>
        <div class="acoes"><a class="botao" href="/entrar">Ver na sua nota</a></div>
      </section>

      <section class="folha">
        <p>Se a nota voltar, o contador sabe o campo e tem telefone.</p>
        <p>Plantão: sexta, 18h às 22h. Sábado, 9h às 12h. <strong class="mono">{c.env.PLANTAO_TELEFONE}</strong></p>
        <p>Quem indica: o escritório contábil. Quem paga: o dono da empresa.</p>
      </section>

      <section class="folha">
        <h2>Como se prova.</h2>
        <p>Cada sugestão cita a norma da base, como a LC 214, e a data dela. Sem norma na base, o sistema não responde.</p>
        <p>O contador confirma e o CRC fica no log.</p>
        <p>Medimos a parada toda semana, SEFAZ e prefeitura separadas. No dia 1, você renova ou sai.</p>
      </section>

      <section class="folha">
        <h2>Preço escrito. Excedente escrito antes.</h2>
        <table class="linhas tabela-pacotes">
          <thead>
            <tr><th>Pacote</th><th>Notas por ano</th><th class="dir">Por ano</th></tr>
          </thead>
          <tbody>
            <tr><td>Entrada · primeiro CNPJ</td><td class="num">até 2.400</td><td class="dir num">R$ 9 mil</td></tr>
            <tr><td>Meio · próximo CNPJ ou renovação</td><td class="num">até 6.000</td><td class="dir num">R$ 18 mil</td></tr>
            <tr><td>Cheio · só depois que a parada cair</td><td class="num">até 12.000</td><td class="dir num">R$ 24 mil</td></tr>
          </tbody>
        </table>
        <p style="margin-top:14px">O Cheio não se compra. Abre quando a parada cai no seu CNPJ, e quem mede é o sistema, não o vendedor.</p>
        <p>Acima do teto do seu pacote: R$ 4 por nota, avisado antes da nota que passa.</p>
        <p>Nota devolvida e reemitida não conta de novo. Vence dia 1, por CNPJ. Sem projeto, sem implantação.</p>
        <div class="acoes"><a class="botao" href="/entrar">Ver na sua nota</a></div>
      </section>

      <p class="mini" style="margin-top:40px">Sugestão, não decisão. Não é parecer e não substitui contador. <a href="/termo">Ler o termo</a>.</p>
    </Layout>,
  ),
);

// ---------- termo, aberto a todos ----------

app.get('/termo', (c) =>
  c.html(
    <Layout titulo="Termo de uso · A nota sem volta" plantao={plantao(c)}>
      <h1>Termo de uso</h1>
      <p class="sub">É o mesmo texto que dono e contador aceitam antes do primeiro XML. Sem termo aceito, a nota não sobe.</p>
      <ol style="padding-left:1.2rem;margin:0 0 24px">
        {TERMO.map((x) => <li style="margin:0 0 8px">{x}</li>)}
      </ol>
      <div class="acoes"><a class="botao" href="/entrar">Ver na sua nota</a><a href="/">Voltar</a></div>
    </Layout>,
  ),
);

// ---------- entrar por link ----------

app.get('/entrar', (c) =>
  pagina(c, 'Entrar', (
    <>
      <h1>Entrar</h1>
      <p class="sub">Digite seu e-mail. O link chega na hora.</p>
      <form method="post" action="/entrar">
        <label for="email">E-mail</label>
        <input id="email" name="email" type="email" required autocomplete="email" autofocus />
        <div class="acoes"><button class="botao" type="submit">Receber o link</button></div>
      </form>
      <p class="mini" style="margin-top:20px">O link vale por 15 minutos e uma vez só.</p>
      <ol class="mini" style="margin:20px 0 0;padding-left:1.2rem;line-height:1.8">
        <li>Você entra pelo link.</li>
        <li>Escolhe o CNPJ.</li>
        <li>Sobe o XML da nota. Vê a sugestão, com artigo e data.</li>
        <li>O contador firma.</li>
      </ol>
    </>
  )),
);

app.post('/entrar', async (c) => {
  const email = String((await c.req.parseBody()).email ?? '').trim().toLowerCase();
  const usuario = await c.env.DB.prepare('SELECT id FROM usuario WHERE email = ?').bind(email).first<{ id: number }>();
  let linkDev: string | null = null;
  if (usuario) {
    const token = tokenAleatorio();
    await c.env.DB.prepare('INSERT INTO login_token (hash, usuario_id, expira_em) VALUES (?, ?, ?)')
      .bind(await sha256(token), usuario.id, Date.now() + VALIDADE_LINK_MS).run();
    const link = `${new URL(c.req.url).origin}/entrar/link?t=${token}`;
    if (c.env.RESEND_API_KEY) {
      await enviarLinkPorEmail(c.env.RESEND_API_KEY, c.env.EMAIL_REMETENTE, email, link);
    } else if (c.env.MODO_DEV === '1') {
      linkDev = link;
    } else {
      console.error('login: RESEND_API_KEY ausente; link não enviado');
    }
  }
  // Mesma resposta exista ou não o e-mail.
  return pagina(c, 'Link enviado', (
    <>
      <h1>Confira seu e-mail.</h1>
      <p class="sub">Se o e-mail estiver autorizado, o link chega em instantes.</p>
      {linkDev && (
        <p class="ficticio">
          Modo de desenvolvimento, sem envio de e-mail: <a href={linkDev}>entrar por este link</a>.
        </p>
      )}
    </>
  ));
});

// GET só mostra o botão: leitores de e-mail que abrem links não gastam o token.
app.get('/entrar/link', (c) =>
  pagina(c, 'Entrar', (
    <>
      <h1>Entrar</h1>
      <p class="sub">Um toque e você está dentro.</p>
      <form method="post" action="/entrar/link">
        <input type="hidden" name="t" value={c.req.query('t') ?? ''} />
        <div class="acoes"><button class="botao" type="submit">Entrar</button></div>
      </form>
    </>
  )),
);

app.post('/entrar/link', async (c) => {
  const token = String((await c.req.parseBody()).t ?? '');
  const agora = Date.now();
  const usado = await c.env.DB.prepare(
    'UPDATE login_token SET usado_em = ? WHERE hash = ? AND usado_em IS NULL AND expira_em > ? RETURNING usuario_id',
  ).bind(agora, await sha256(token), agora).first<{ usuario_id: number }>();
  if (!usado) {
    return pagina(c, 'Link vencido', (
      <>
        <h1>Este link não vale mais.</h1>
        <p class="sub">Ele vence em 15 minutos e serve uma vez só.</p>
        <div class="acoes"><a class="botao" href="/entrar">Pedir outro link</a></div>
      </>
    ), 400);
  }
  const sessao = tokenAleatorio();
  await c.env.DB.prepare('INSERT INTO sessao (hash, usuario_id, expira_em) VALUES (?, ?, ?)')
    .bind(await sha256(sessao), usado.usuario_id, agora + VALIDADE_SESSAO_MS).run();
  setCookie(c, COOKIE_SESSAO, sessao, {
    httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: VALIDADE_SESSAO_MS / 1000,
  });
  return c.redirect('/cnpjs', 303);
});

app.post('/sair', async (c) => {
  const token = getCookie(c, COOKIE_SESSAO);
  if (token) await c.env.DB.prepare('DELETE FROM sessao WHERE hash = ?').bind(await sha256(token)).run();
  deleteCookie(c, COOKIE_SESSAO, { path: '/', secure: true });
  return c.redirect('/', 303);
});

// ---------- área logada ----------

app.use('/cnpjs', exigeLogin);
app.use('/c/*', exigeLogin);

async function exigeLogin(c: C, next: () => Promise<void>) {
  const u = await usuarioDaSessao(c);
  if (!u) return c.redirect('/entrar', 303);
  c.set('usuario', u);
  await next();
}

function cnpjsDoUsuario(c: C) {
  const u = c.get('usuario');
  return c.env.DB.prepare(
    `SELECT c.id, c.cnpj, c.razao_social, c.uf, c.municipio, c.dono_id, d.nome AS dono_nome, e.nome AS escritorio_nome,
       (SELECT k.pacote FROM contrato k WHERE k.cnpj_id = c.id AND k.inicio <= date('now') AND k.fim >= date('now') ORDER BY k.inicio DESC LIMIT 1) AS pacote,
       (SELECT COUNT(DISTINCT t.papel) FROM termo_aceite t WHERE t.cnpj_id = c.id AND t.versao_termo = ?3) AS aceites
     FROM cnpj c JOIN usuario d ON d.id = c.dono_id JOIN escritorio e ON e.id = c.escritorio_id
     WHERE c.dono_id = ?1 OR c.escritorio_id = ?2 ORDER BY c.id`,
  ).bind(u.id, u.escritorio_id ?? -1, VERSAO_TERMO);
}

app.get('/cnpjs', async (c) => {
  const { results } = await cnpjsDoUsuario(c).all<Cnpj>();
  if (results.length === 1) return c.redirect(`/c/${results[0].cnpj}/notas`, 303);
  return pagina(c, 'Qual CNPJ?', (
    <>
      <h1>Qual CNPJ?</h1>
      {results.length === 0 ? (
        <p class="sub">Nenhum CNPJ autorizado para você. Peça ao seu escritório.</p>
      ) : (
        <>
          <p class="sub">Escolha com qual empresa você vai trabalhar agora.</p>
          <ul class="lista">
            {results.map((x) => (
              <li>
                <a href={`/c/${x.cnpj}/notas`}>
                  <span>
                    <span class="princ">{x.razao_social}</span><br />
                    <span class="mini num">{fmtCnpj(x.cnpj)} · {x.municipio}/{x.uf}</span>
                  </span>
                  <span class="lado">
                    {x.aceites < 2 && <span class="etiqueta aviso-txt" style="color:var(--alerta);margin-right:8px">Falta termo</span>}
                    {x.pacote ? PACOTES[x.pacote].nome : 'Sem contrato'}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  ));
});

app.use('/c/:cnpj/*', carregaCnpj);
app.use('/c/:cnpj', carregaCnpj);

async function carregaCnpj(c: C, next: () => Promise<void>) {
  const alvo = c.req.param('cnpj');
  const { results } = await cnpjsDoUsuario(c).all<Cnpj>();
  const cnpj = results.find((x) => x.cnpj === alvo);
  if (!cnpj) return pagina(c, 'CNPJ', <><h1>CNPJ não autorizado.</h1><div class="acoes"><a class="botao" href="/cnpjs">Escolher outro</a></div></>, 404);
  const contrato = await c.env.DB.prepare(
    'SELECT id, pacote, preco_centavos, teto_notas, inicio, fim FROM contrato WHERE cnpj_id = ? AND inicio <= ?2 AND fim >= ?2 ORDER BY inicio DESC LIMIT 1',
  ).bind(cnpj.id, hoje()).first<Contrato>();
  c.set('cnpj', cnpj);
  c.set('contrato', contrato);
  await next();
}

async function termos(c: C) {
  const { results } = await c.env.DB.prepare(
    'SELECT papel FROM termo_aceite WHERE cnpj_id = ? AND versao_termo = ?',
  ).bind(c.get('cnpj').id, VERSAO_TERMO).all<{ papel: string }>();
  const papeis = new Set(results.map((r) => r.papel));
  return { dono: papeis.has('dono'), contador: papeis.has('contador') };
}

/** Notas que contam no pacote: no período do contrato, não paradas e não reemissões. */
async function usadas(c: C, excetoLote?: number): Promise<number> {
  const ct = c.get('contrato');
  if (!ct) return 0;
  const r = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM nota WHERE cnpj_id = ? AND status NOT IN ('parada', 'pendente')
     AND nota_origem_id IS NULL AND date(criado_em) BETWEEN ? AND ? AND lote_id != ?`,
  ).bind(c.get('cnpj').id, ct.inicio, ct.fim, excetoLote ?? -1).first<{ n: number }>();
  return r?.n ?? 0;
}

const n0 = (n: number) => n.toLocaleString('pt-BR');

function Medidor({ usadasN, teto }: { usadasN: number; teto: number }) {
  const pct = Math.min(100, Math.round((usadasN / Math.max(teto, 1)) * 100));
  const falta = teto - usadasN;
  return (
    <div>
      <div class="medidor" role="img" aria-label={`${n0(usadasN)} de ${n0(teto)} notas`}><span style={`width:${pct}%`} /></div>
      <p class="mini">
        <span class="num">{n0(usadasN)}</span> de <span class="num">{n0(teto)}</span> notas no pacote.
        {falta > 0 && pct >= 90 && <> Faltam <span class="num">{n0(falta)}</span>. Depois, R$ 4 por nota.</>}
      </p>
    </div>
  );
}

// ---------- contrato (uma vez por ano) ----------

app.get('/c/:cnpj', async (c) => {
  const cnpj = c.get('cnpj');
  const ct = c.get('contrato');
  const usadasN = await usadas(c);
  const renovaEm = ct ? diaSeguinte(ct.fim) : null;
  const proximo = ct ? PACOTES[pacoteNaRenovacao(ct.pacote)] : null;
  return pagina(c, 'Contrato de cálculo', (
    <>
      <h1>Contrato de cálculo</h1>
      <p class="sub">{cnpj.razao_social} · <span class="num">{fmtCnpj(cnpj.cnpj)}</span></p>

      <table class="linhas">
        <tbody>
          <tr><th>Quem paga</th><td>{cnpj.dono_nome}</td></tr>
          <tr><th>Quem indica</th><td>{cnpj.escritorio_nome}</td></tr>
          <tr><th>Vencimento</th><td>dia 1</td></tr>
        </tbody>
      </table>

      <section class="folha">
        <p class="rotulo">Valores</p>
        {ct ? (
          <>
            <p class="display" style="font-size:2.4rem;margin:0 0 4px">{reais(ct.preco_centavos)} <span class="mini" style="font-family:var(--sans)">por ano</span></p>
            <p>Pacote {PACOTES[ct.pacote].nome}. Até <span class="num">{n0(ct.teto_notas)}</span> notas por ano.</p>
            <p>Acima do teto: R$ 4 por nota, avisado antes.</p>
            {renovaEm && proximo && <p class="mini">Renovação em {fmtData(renovaEm)}: {proximo.nome}, {reais(proximo.precoCentavos)}.</p>}
            <Medidor usadasN={usadasN} teto={ct.teto_notas} />
            {ct.pacote !== 'cheio' && <p class="mini">O Cheio abre quando a parada cair na semana deste CNPJ.</p>}
          </>
        ) : <p class="erro">Sem contrato vigente para este CNPJ.</p>}
      </section>

      <section class="folha">
        <p class="rotulo">Base legal</p>
        <p>LC 214 e portarias com data. ISS do município.</p>
        <p>Sugestão, não decisão. Quem firma responde. O log grava artigo, data, CRC e horário.</p>
      </section>

      <section class="folha">
        <p class="rotulo">Semana</p>
        <p class="mini" style="font-size:.95rem;color:var(--tinta-2)">Sem linha de base ainda. Peça ao escritório as rejeições das 4 semanas anteriores.</p>
      </section>

      <div class="acoes"><a class="botao" href={`/c/${cnpj.cnpj}/notas`}>Subir notas</a></div>
    </>
  ), 200, 'contrato');
});

// ---------- termo ----------

const TERMO = [
  'O sistema sugere. Não decide. Não é parecer.',
  'A sugestão traz artigo e data da norma que está na base.',
  'Sem norma na base, o sistema não responde.',
  'Quem firma responde pela nota. Firma com nome e CRC digitados.',
  'O CRC não é conferido em cadastro oficial nesta versão.',
  'O log guarda CRC, artigo, data da norma, horário e versão da base. Não apaga.',
  'Pacote por CNPJ: Entrada 2.400 notas por R$ 9 mil, Meio 6.000 por R$ 18 mil, Cheio 12.000 por R$ 24 mil. Acima do teto, R$ 4 por nota, avisado antes.',
  'Nota rejeitada e devolvida não conta de novo.',
  'Vence dia 1.',
];

app.get('/c/:cnpj/termo', async (c) => {
  const t = await termos(c);
  const u = c.get('usuario');
  const jaAceitei = t[u.papel];
  const ambos = t.dono && t.contador;
  return pagina(c, 'Termo de uso', (
    <>
      <h1>Termo de uso</h1>
      <p class="sub">Leia até o fim. Dono e contador aceitam, cada um no seu acesso.</p>
      <ol style="padding-left:1.2rem;margin:0 0 24px">
        {TERMO.map((x) => <li style="margin:0 0 8px">{x}</li>)}
      </ol>
      <table class="linhas">
        <tbody>
          <tr><th>Contador</th><td class={t.contador ? 'ok' : ''}>{t.contador ? 'Aceitou' : 'Falta aceitar'}</td></tr>
          <tr><th>Dono</th><td class={t.dono ? 'ok' : ''}>{t.dono ? 'Aceitou' : 'Falta aceitar'}</td></tr>
        </tbody>
      </table>
      {!ambos && jaAceitei && <p class="aviso" style="margin-top:16px">Você aceitou. Falta {u.papel === 'dono' ? 'o contador' : 'o dono'}. Nenhuma nota sobe até os dois aceitarem.</p>}
      <div class="acoes">
        {ambos ? <a class="botao" href={`/c/${c.get('cnpj').cnpj}/notas`}>Subir notas</a>
          : jaAceitei ? <a class="botao" href={`/c/${c.get('cnpj').cnpj}`}>Voltar ao contrato</a>
          : <form method="post"><button class="botao" type="submit">Aceitar</button></form>}
      </div>
    </>
  ));
});

app.post('/c/:cnpj/termo', async (c) => {
  const u = c.get('usuario');
  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO termo_aceite (cnpj_id, papel, usuario_id, versao_termo) VALUES (?, ?, ?, ?)',
  ).bind(c.get('cnpj').id, u.papel, u.id, VERSAO_TERMO).run();
  return c.redirect(`/c/${c.get('cnpj').cnpj}/termo`, 303);
});

// ---------- notas: subir e ver a lista (o dia a dia) ----------

app.get('/c/:cnpj/enviar', (c) => c.redirect(`/c/${c.get('cnpj').cnpj}/notas`, 303));

app.get('/c/:cnpj/notas', async (c) => {
  const cnpj = c.get('cnpj');
  const ct = c.get('contrato');
  const t = await termos(c);
  if (!(t.dono && t.contador)) return c.redirect(`/c/${cnpj.cnpj}/termo`, 303);
  const usadasN = await usadas(c);
  const { results } = await c.env.DB.prepare(
    `SELECT n.id, n.tipo, n.chave, n.valor_centavos, n.status, n.data_emissao, n.municipio_nome,
       (SELECT COUNT(*) FROM sugestao s WHERE s.nota_id = n.id AND s.resultado = 'sugere') AS sugere
     FROM nota n WHERE n.cnpj_id = ? AND n.status IN ('sugerida', 'firmada', 'voltou') ORDER BY n.id DESC LIMIT 300`,
  ).bind(cnpj.id).all<any>();
  const prontas = results.filter((n) => n.status === 'sugerida' && n.sugere > 0);
  const semNorma = results.filter((n) => n.status === 'sugerida' && n.sugere === 0);
  const firmadas = results.filter((n) => n.status === 'firmada');
  const fim = c.req.query('fim') === '1';
  const Linha = ({ n }: { n: any }) => (
    <li>
      <a href={`/c/${cnpj.cnpj}/nota/${n.id}`}>
        <span><span class="princ">{n.tipo}</span> <span class="num">…{tail(n.chave)}</span><br /><span class="mini">{n.municipio_nome}</span></span>
        <span class="lado"><span class="num">{reais(n.valor_centavos)}</span><br />{dataBr(n.data_emissao)}</span>
      </a>
    </li>
  );
  return pagina(c, 'Notas', (
    <>
      <h1>Notas</h1>
      <p class="sub">{cnpj.razao_social} · <span class="num">{fmtCnpj(cnpj.cnpj)}</span> · <a href="/cnpjs">Trocar CNPJ</a></p>
      {ct ? <Medidor usadasN={usadasN} teto={ct.teto_notas} /> : <p class="aviso">Sem contrato vigente para este CNPJ.</p>}
      {fim && <p class="carimbo" style="margin-top:16px"><span class="display">Tudo firmado.</span> Todas as notas de hoje estão firmadas.</p>}

      <form method="post" action={`/c/${cnpj.cnpj}/enviar`} enctype="multipart/form-data" style="margin-top:24px">
        <label class="drop" id="drop" for="xml" style="margin-top:0">
          <span class="display" style="font-size:1.4rem">Solte os XML aqui</span><br />
          <span class="mini">NF-e e NFS-e. Pode ser vários, até {MAX_ARQUIVOS} por vez.</span>
          <input id="xml" name="xml" type="file" accept=".xml,text/xml,application/xml" multiple required />
        </label>
        <p id="contagem" class="mini" aria-live="polite" style="min-height:1.2em"></p>
        <div class="acoes" style="margin-top:8px"><button class="botao" type="submit">Subir</button></div>
      </form>
      <script dangerouslySetInnerHTML={{ __html: `
        const d=document.getElementById('drop'),i=document.getElementById('xml'),k=document.getElementById('contagem');
        ['dragenter','dragover'].forEach(e=>d.addEventListener(e,ev=>{ev.preventDefault();d.classList.add('ativo')}));
        ['dragleave','drop'].forEach(e=>d.addEventListener(e,()=>d.classList.remove('ativo')));
        d.addEventListener('drop',ev=>{ev.preventDefault();i.files=ev.dataTransfer.files;i.dispatchEvent(new Event('change'))});
        i.addEventListener('change',()=>{k.textContent=i.files.length+(i.files.length===1?' arquivo escolhido.':' arquivos escolhidos.')});
      ` }} />

      <section class="folha">
        <h2>Prontas para firmar <span class="num">({prontas.length})</span></h2>
        {prontas.length === 0 ? <p class="mini" style="font-size:.95rem">Nenhuma nota ainda. Suba o primeiro XML.</p> : (
          <>
            <ul class="lista">{prontas.map((n) => <Linha n={n} />)}</ul>
            <div class="acoes"><a class="botao" href={`/c/${cnpj.cnpj}/proxima`}>Firmar a primeira</a></div>
          </>
        )}
      </section>

      {semNorma.length > 0 && (
        <section class="folha">
          <h2>Sem norma na base <span class="num">({semNorma.length})</span></h2>
          <p class="mini">Não sugerimos. Ligue para o plantão.</p>
          <ul class="lista">{semNorma.map((n) => <Linha n={n} />)}</ul>
        </section>
      )}

      {firmadas.length > 0 && (
        <section class="folha">
          <details>
            <summary>Firmadas <span class="num">({firmadas.length})</span></summary>
            <ul class="lista">{firmadas.map((n) => <Linha n={n} />)}</ul>
          </details>
        </section>
      )}
    </>
  ), 200, 'notas');
});

app.get('/c/:cnpj/proxima', async (c) => {
  const cnpj = c.get('cnpj');
  const prox = await c.env.DB.prepare(
    `SELECT n.id FROM nota n WHERE n.cnpj_id = ? AND n.status = 'sugerida'
     AND EXISTS (SELECT 1 FROM sugestao s WHERE s.nota_id = n.id AND s.resultado = 'sugere') ORDER BY n.id LIMIT 1`,
  ).bind(cnpj.id).first<{ id: number }>();
  return c.redirect(prox ? `/c/${cnpj.cnpj}/nota/${prox.id}` : `/c/${cnpj.cnpj}/notas?fim=1`, 303);
});

type ResumoArquivo = { arquivo: string; ok: boolean; motivo?: string; notaId?: number };

app.post('/c/:cnpj/enviar', async (c) => {
  const cnpj = c.get('cnpj');
  const u = c.get('usuario');
  const t = await termos(c);
  if (!(t.dono && t.contador)) return c.redirect(`/c/${cnpj.cnpj}/termo`, 303);
  if (!c.get('contrato')) return pagina(c, 'Sem contrato', <><h1>Sem contrato vigente.</h1><p class="sub">Este CNPJ não tem contrato ativo.</p></>, 400);

  const form = await c.req.formData();
  const arquivos = form.getAll('xml').filter((f): f is File => typeof f !== 'string');
  if (arquivos.length === 0) return c.redirect(`/c/${cnpj.cnpj}/notas`, 303);
  if (arquivos.length > MAX_ARQUIVOS) {
    return pagina(c, 'Muitos arquivos', <><h1>Até {MAX_ARQUIVOS} arquivos por vez.</h1><div class="acoes"><a class="botao" href={`/c/${cnpj.cnpj}/notas`}>Subir de novo</a></div></>, 400);
  }

  const lote = await c.env.DB.prepare(
    "INSERT INTO lote (cnpj_id, usuario_id, status) VALUES (?, ?, 'aguardando_teto') RETURNING id",
  ).bind(cnpj.id, u.id).first<{ id: number }>();
  const loteId = lote!.id;
  const resumo: ResumoArquivo[] = [];
  const vistas = new Set<string>();

  for (const f of arquivos) {
    const nome = f.name || 'arquivo';
    if (f.size > MAX_BYTES) { resumo.push({ arquivo: nome, ok: false, motivo: 'Arquivo maior que 1 MB.' }); continue; }
    const bytes = await f.arrayBuffer();
    const texto = new TextDecoder().decode(bytes);
    if (/\.pdf$/i.test(nome) || texto.startsWith('%PDF')) { resumo.push({ arquivo: nome, ok: false, motivo: 'Mande o XML desta nota.' }); continue; }
    const leitura = lerXml(texto);
    if (!leitura.ok) { resumo.push({ arquivo: nome, ok: false, motivo: leitura.motivo }); continue; }
    const n = leitura.nota;
    if (n.cnpjEmitente !== cnpj.cnpj) {
      resumo.push({ arquivo: nome, ok: false, motivo: `Esta nota é do CNPJ ${fmtCnpj(n.cnpjEmitente)}. Você escolheu ${fmtCnpj(cnpj.cnpj)}.` });
      continue;
    }
    const existe = await c.env.DB.prepare('SELECT id, criado_em FROM nota WHERE cnpj_id = ? AND chave = ?').bind(cnpj.id, n.chave).first<{ id: number; criado_em: string }>();
    if (existe || vistas.has(n.chave)) {
      resumo.push({ arquivo: nome, ok: false, motivo: existe ? `Esta nota já subiu em ${dataBr(existe.criado_em)}.` : 'Nota repetida neste lote.' });
      continue;
    }
    vistas.add(n.chave);
    const hash = await sha256(bytes);
    const chaveR2 = `${cnpj.cnpj}/${n.chave}.xml`;
    await c.env.XML.put(chaveR2, bytes, { httpMetadata: { contentType: 'application/xml' }, customMetadata: { sha256: hash } });
    const nota = await c.env.DB.prepare(
      `INSERT INTO nota (lote_id, cnpj_id, tipo, chave, xml_r2_key, xml_sha256, data_emissao, uf, municipio_ibge, municipio_nome,
        incide_iss, valor_centavos, itens_json, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'pendente') RETURNING id`,
    ).bind(loteId, cnpj.id, n.tipo, n.chave, chaveR2, hash, n.dataEmissao, n.uf, n.municipioIbge, n.municipioNome,
      n.incideIss ? 1 : 0, n.valorCentavos, JSON.stringify(n.itens)).first<{ id: number }>();
    resumo.push({ arquivo: nome, ok: true, notaId: nota!.id });
  }

  await c.env.DB.prepare('UPDATE lote SET resumo_json = ? WHERE id = ?').bind(JSON.stringify(resumo), loteId).run();
  const validas = resumo.filter((r) => r.ok).length;
  const teto = avaliarTeto(c.get('contrato')!.teto_notas, await usadas(c, loteId), validas);
  if (teto.passaDoTeto) return c.redirect(`/c/${cnpj.cnpj}/lote/${loteId}/teto`, 303);
  await processarLote(c, loteId);
  return c.redirect(`/c/${cnpj.cnpj}/lote/${loteId}`, 303);
});

async function processarLote(c: C, loteId: number) {
  const { results: base } = await c.env.DB.prepare('SELECT * FROM norma').all<Norma>();
  const { results: notas } = await c.env.DB.prepare(
    "SELECT * FROM nota WHERE lote_id = ? AND status = 'pendente'",
  ).bind(loteId).all<any>();
  const comandos: D1PreparedStatement[] = [];
  for (const n of notas) {
    const itens: NotaLida['itens'] = JSON.parse(n.itens_json);
    const lida = { tipo: n.tipo } as NotaLida;
    for (const [idx, item] of itens.entries()) {
      for (const tributo of tributosDoItem(lida, item)) {
        const s = await sugerir({
          tributo, dataEmissao: n.data_emissao, uf: n.uf, municipioIbge: n.municipio_ibge,
          ncm: item.ncm, servico: item.servico, baseCentavos: item.valorCentavos,
        }, base);
        comandos.push(c.env.DB.prepare(
          `INSERT INTO sugestao (nota_id, item_idx, tributo, resultado, norma_id, cst, cclass_trib, aliquota_cpp, valor_centavos, motivo, versao_base)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        ).bind(n.id, idx, tributo, s.resultado,
          s.resultado === 'sugere' ? s.norma.id : null,
          s.resultado === 'sugere' ? s.cst : null,
          s.resultado === 'sugere' ? s.cclassTrib : null,
          s.resultado === 'sugere' ? s.aliquotaCpp : null,
          s.resultado === 'sugere' ? s.valorCentavos : null,
          s.motivo,
          s.resultado === 'sugere' ? s.norma.versao_base : null));
      }
    }
    comandos.push(c.env.DB.prepare("UPDATE nota SET status = 'sugerida' WHERE id = ?").bind(n.id));
  }
  comandos.push(c.env.DB.prepare("UPDATE lote SET status = 'processado' WHERE id = ?").bind(loteId));
  await c.env.DB.batch(comandos);
}

// ---------- teto do pacote ----------

app.get('/c/:cnpj/lote/:id/teto', async (c) => {
  const cnpj = c.get('cnpj');
  const ct = c.get('contrato')!;
  const loteId = Number(c.req.param('id'));
  const lote = await c.env.DB.prepare("SELECT id FROM lote WHERE id = ? AND cnpj_id = ? AND status = 'aguardando_teto'").bind(loteId, cnpj.id).first();
  if (!lote) return c.redirect(`/c/${cnpj.cnpj}/lote/${loteId}`, 303);
  const novas = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM nota WHERE lote_id = ? AND status = 'pendente'").bind(loteId).first<{ n: number }>();
  const a = avaliarTeto(ct.teto_notas, await usadas(c, loteId), novas?.n ?? 0);
  return pagina(c, 'Teto do pacote', (
    <>
      <h1>Teto do pacote</h1>
      <p class="sub">Pacote {PACOTES[ct.pacote].nome}. <span class="num">{n0(a.teto)}</span> notas por ano.</p>
      <table class="linhas">
        <tbody>
          <tr><th>Usadas</th><td class="dir num">{n0(a.usadas)}</td></tr>
          <tr><th>Neste lote</th><td class="dir num">{n0(a.novas)}</td></tr>
          <tr><th>Passam do teto</th><td class="dir num">{n0(a.excedentes)}</td></tr>
        </tbody>
      </table>
      <p class="display" style="font-size:1.5rem;margin:24px 0 6px">
        {a.excedentes === 1 ? 'A próxima nota passa do teto.' : `${n0(a.excedentes)} notas passam do teto.`}
      </p>
      <p>Custa R$ 4 por nota. Escrito no contrato. Neste lote: <strong class="num">{reais(a.valorExcedenteCentavos)}</strong>.</p>
      <form method="post" class="acoes">
        <button class="botao" name="decisao" value="seguir" type="submit">Seguir. {reais(a.valorExcedenteCentavos)}</button>
        <button class="link-botao" name="decisao" value="parar" type="submit">Parar</button>
      </form>
    </>
  ));
});

app.post('/c/:cnpj/lote/:id/teto', async (c) => {
  const cnpj = c.get('cnpj');
  const ct = c.get('contrato')!;
  const loteId = Number(c.req.param('id'));
  const decisao = String((await c.req.parseBody()).decisao ?? '');
  if (decisao !== 'parar' && decisao !== 'seguir') return c.text('Decisão inválida.', 400);
  const lote = await c.env.DB.prepare("SELECT id FROM lote WHERE id = ? AND cnpj_id = ? AND status = 'aguardando_teto'").bind(loteId, cnpj.id).first();
  if (!lote) return c.redirect(`/c/${cnpj.cnpj}/lote/${loteId}`, 303);
  const novas = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM nota WHERE lote_id = ? AND status = 'pendente'").bind(loteId).first<{ n: number }>();
  const a = avaliarTeto(ct.teto_notas, await usadas(c, loteId), novas?.n ?? 0);
  await c.env.DB.prepare(
    'INSERT INTO decisao_teto (cnpj_id, lote_id, usuario_id, decisao, notas_excedentes, valor_centavos) VALUES (?,?,?,?,?,?)',
  ).bind(cnpj.id, loteId, c.get('usuario').id, decisao, a.excedentes, decisao === 'seguir' ? a.valorExcedenteCentavos : 0).run();
  if (decisao === 'seguir') {
    await processarLote(c, loteId);
  } else {
    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE nota SET status = 'parada' WHERE lote_id = ? AND status = 'pendente'").bind(loteId),
      c.env.DB.prepare("UPDATE lote SET status = 'parado' WHERE id = ?").bind(loteId),
    ]);
  }
  return c.redirect(`/c/${cnpj.cnpj}/lote/${loteId}`, 303);
});

// ---------- resultado do lote ----------

app.get('/c/:cnpj/lote/:id', async (c) => {
  const cnpj = c.get('cnpj');
  const loteId = Number(c.req.param('id'));
  const lote = await c.env.DB.prepare('SELECT id, status, resumo_json FROM lote WHERE id = ? AND cnpj_id = ?').bind(loteId, cnpj.id).first<any>();
  if (!lote) return pagina(c, 'Lote', <h1>Lote não encontrado.</h1>, 404);
  if (lote.status === 'aguardando_teto') return c.redirect(`/c/${cnpj.cnpj}/lote/${loteId}/teto`, 303);
  const resumo: ResumoArquivo[] = JSON.parse(lote.resumo_json);
  const { results: contagem } = await c.env.DB.prepare(
    `SELECT s.nota_id, SUM(s.resultado = 'sugere') AS sugere FROM sugestao s JOIN nota n ON n.id = s.nota_id WHERE n.lote_id = ? GROUP BY s.nota_id`,
  ).bind(loteId).all<{ nota_id: number; sugere: number }>();
  const sugere = new Map(contagem.map((x) => [x.nota_id, x.sugere]));
  const lidas = resumo.filter((r) => r.ok);
  const recusadas = resumo.filter((r) => !r.ok);
  const prontas = lidas.filter((r) => (sugere.get(r.notaId!) ?? 0) > 0);
  const semNorma = lidas.filter((r) => (sugere.get(r.notaId!) ?? 0) === 0);
  const parado = lote.status === 'parado';
  const Bloco = ({ titulo, itens, tom, texto }: { titulo: string; itens: ResumoArquivo[]; tom?: string; texto?: (r: ResumoArquivo) => any }) =>
    itens.length === 0 ? null : (
      <section class="folha">
        <h2>{titulo} <span class="num">({itens.length})</span></h2>
        <ul class="lista">
          {itens.map((r) => (
            <li>
              {r.ok && !parado ? (
                <a href={`/c/${cnpj.cnpj}/nota/${r.notaId}`}><span class="princ">{r.arquivo}</span><span class="lado">{texto?.(r)}</span></a>
              ) : (
                <div class="item"><span class="princ">{r.arquivo}</span><span class={`lado ${tom ?? ''}`}>{texto?.(r)}</span></div>
              )}
            </li>
          ))}
        </ul>
      </section>
    );
  return pagina(c, 'Notas lidas', (
    <>
      <h1>{parado ? 'Lote parado.' : lidas.length === 1 ? '1 nota lida.' : `${lidas.length} notas lidas.`}</h1>
      <p class="sub">
        {parado ? 'Nada foi processado. Estas notas não contam no pacote.'
          : <>{prontas.length} prontas para firmar{semNorma.length > 0 && <> · {semNorma.length} sem norma na base</>}{recusadas.length > 0 && <> · {recusadas.length} recusadas</>}.</>}
      </p>
      {!parado && <Bloco titulo="Prontas para firmar" itens={prontas} texto={() => 'Sugestão pronta'} />}
      {!parado && <Bloco titulo="Sem norma na base" itens={semNorma} tom="sem-norma" texto={() => 'Sem norma na base'} />}
      <Bloco titulo="Recusadas" itens={recusadas} tom="erro" texto={(r) => r.motivo} />
      <div class="acoes">
        {prontas.length > 0 && !parado
          ? <a class="botao" href={`/c/${cnpj.cnpj}/proxima`}>Firmar a primeira</a>
          : <a class="botao" href={`/c/${cnpj.cnpj}/notas`}>Voltar às notas</a>}
        {prontas.length > 0 && !parado && <a href={`/c/${cnpj.cnpj}/notas`}>Ver todas as notas</a>}
      </div>
    </>
  ), 200, 'notas');
});

// ---------- leitura da nota e firma: uma tela só ----------

async function carregaNota(c: C) {
  const n = await c.env.DB.prepare('SELECT * FROM nota WHERE id = ? AND cnpj_id = ?')
    .bind(Number(c.req.param('id')), c.get('cnpj').id).first<any>();
  if (!n) return null;
  const { results: sugs } = await c.env.DB.prepare(
    `SELECT s.*, nm.fonte, nm.artigo, nm.texto, nm.data_norma, nm.ficticio FROM sugestao s LEFT JOIN norma nm ON nm.id = s.norma_id
     WHERE s.nota_id = ? ORDER BY s.item_idx, CASE s.tributo WHEN 'ICMS' THEN 1 WHEN 'ISS' THEN 2 WHEN 'IBS' THEN 3 ELSE 4 END`,
  ).bind(n.id).all<any>();
  const firma = await c.env.DB.prepare('SELECT * FROM firma WHERE nota_id = ? ORDER BY id DESC LIMIT 1').bind(n.id).first<any>();
  return { n, itens: JSON.parse(n.itens_json) as NotaLida['itens'], sugs, firma };
}

function LinhaSugestao({ s }: { s: any }) {
  if (s.resultado === 'nao_responde') {
    return (
      <div class="sug">
        <div class="sug-topo"><span class="tributo">{s.tributo}</span><span class="sem-norma">Sem norma na base</span></div>
      </div>
    );
  }
  const calcula = s.aliquota_cpp !== null && s.valor_centavos !== null;
  return (
    <div class="sug">
      <div class="sug-topo">
        <span class="tributo">{s.tributo}</span>
        <span class="sug-valor">{calcula ? reais(s.valor_centavos) : '—'}</span>
      </div>
      <p class="sug-codigos">
        {s.cst && <>CST {s.cst} · </>}{s.cclass_trib && <>cClassTrib {s.cclass_trib} · </>}
        {s.aliquota_cpp !== null ? <>alíquota {fmtAliq(s.aliquota_cpp)}</> : <>alíquota —</>}
      </p>
      <p class="artigo" style="margin:0">{s.fonte}, {s.artigo} · <span class="mini" style="font-family:var(--mono)">{fmtData(s.data_norma)}</span></p>
      {!calcula && <p class="mini sem-norma" style="margin:2px 0 0">Sem alíquota na base. Não calcula.</p>}
      <details><summary>Ver o texto da norma</summary><p>{s.texto}</p></details>
    </div>
  );
}

app.get('/c/:cnpj/nota/:id', async (c) => {
  const cnpj = c.get('cnpj');
  const u = c.get('usuario');
  const d = await carregaNota(c);
  if (!d) return pagina(c, 'Nota', <h1>Nota não encontrada.</h1>, 404, 'notas');
  const { n, itens, sugs, firma } = d;
  const sugeridas = sugs.filter((s) => s.resultado === 'sugere');
  const ficticia = sugeridas.some((s) => s.ficticio === 1);
  const ultima = await c.env.DB.prepare('SELECT crc FROM firma WHERE usuario_id = ? ORDER BY id DESC LIMIT 1').bind(u.id).first<{ crc: string }>();
  return pagina(c, 'Leitura da nota', (
    <>
      <h1>Nota <span class="mono">…{tail(n.chave)}</span></h1>
      <p class="sub">{n.tipo} · {dataBr(n.data_emissao)} · {cnpj.razao_social}</p>
      {ficticia && <p class="ficticio">Base de exemplo. Nada aqui é norma real.</p>}

      <p class="rotulo">Lido do XML</p>
      <table class="linhas">
        <tbody>
          {n.tipo === 'NF-e'
            ? <tr><th>NCM</th><td class="num">{itens.map((i) => fmtNcm(i.ncm ?? '')).join(', ')}</td></tr>
            : <tr><th>Serviço</th><td>{itens.map((i) => `${i.servico} · ${i.descricao}`).join(', ')}</td></tr>}
          <tr><th>Estado</th><td>{n.uf}</td></tr>
          <tr><th>Município</th><td>{n.municipio_nome || n.municipio_ibge}</td></tr>
          {n.tipo === 'NFS-e' && <tr><th>ISS</th><td>{n.incide_iss ? 'sim' : 'não'}</td></tr>}
          <tr><th>Valor</th><td class="num">{reais(n.valor_centavos)}</td></tr>
        </tbody>
      </table>

      <section class="folha">
        <p class="rotulo">Sugestão</p>
        {itens.map((_item, idx) => (
          <div>
            {itens.length > 1 && <p class="mini" style="margin-top:12px">Item {idx + 1}: {itens[idx].descricao}</p>}
            {sugs.filter((s) => s.item_idx === idx).map((s) => <LinhaSugestao s={s} />)}
          </div>
        ))}
        {sugeridas.length === 0 ? (
          <p style="margin-top:16px"><strong>Sem norma na base para esta nota.</strong><br />Nenhuma norma vigente cobre este caso. Não sugerimos e não há o que firmar. Ligue para o plantão.</p>
        ) : (
          <p class="mini" style="margin-top:12px">Sugestão, não decisão. Base {sugeridas[0].versao_base}.</p>
        )}
      </section>

      {firma ? (
        <section class="folha">
          <div class="carimbo">
            <p class="display">{firma.decisao === 'confirmada' ? 'Firmada.' : 'Recusada.'}</p>
            <p style="margin:0">{fmtHora(firma.firmado_em)} · {firma.contador_nome} · CRC <span class="num">{firma.crc}</span></p>
            <p class="mini" style="margin:6px 0 0;color:inherit;opacity:.85">Artigo e data no log. Não apaga. Hash do XML <span class="num">{String(firma.xml_sha256).slice(0, 8)}…{String(firma.xml_sha256).slice(-4)}</span></p>
          </div>
          <div class="acoes"><a class="botao" href={`/c/${cnpj.cnpj}/proxima`}>Próxima nota</a><a href={`/c/${cnpj.cnpj}/notas`}>Voltar às notas</a></div>
        </section>
      ) : sugeridas.length === 0 ? (
        <div class="acoes"><a class="botao" href={`/c/${cnpj.cnpj}/notas`}>Voltar às notas</a></div>
      ) : u.papel === 'contador' ? (
        <section class="folha">
          <h2>Firmar</h2>
          <form method="post" action={`/c/${cnpj.cnpj}/nota/${n.id}/firmar`}>
            <div class="campos">
              <div><label for="nome">Nome</label><input id="nome" name="nome" type="text" required value={u.nome} autocomplete="name" /></div>
              <div><label for="crc">CRC</label><input id="crc" name="crc" type="text" required value={ultima?.crc ?? ''} placeholder="1SP123456" pattern="[0-9A-Za-z\-\/ .]{4,20}" autocapitalize="characters" /></div>
            </div>
            <div class="acoes">
              <button class="botao" name="decisao" value="confirmada" type="submit">Firmar</button>
              <button class="link-botao" name="decisao" value="recusada" type="submit">Recusar a sugestão</button>
            </div>
          </form>
        </section>
      ) : (
        <section class="folha"><p>Quem firma é o contador.</p><div class="acoes"><a class="botao" href={`/c/${cnpj.cnpj}/notas`}>Voltar às notas</a></div></section>
      )}
    </>
  ), 200, 'notas');
});

app.post('/c/:cnpj/nota/:id/firmar', async (c) => {
  const cnpj = c.get('cnpj');
  const u = c.get('usuario');
  if (u.papel !== 'contador') return c.text('Quem firma é o contador.', 403);
  const d = await carregaNota(c);
  if (!d) return c.text('Nota não encontrada.', 404);
  if (d.firma) return c.redirect(`/c/${cnpj.cnpj}/nota/${d.n.id}`, 303);
  if (!d.sugs.some((s) => s.resultado === 'sugere')) return c.text('Sem norma na base: não há o que firmar.', 400);
  const corpo = await c.req.parseBody();
  const nome = String(corpo.nome ?? '').trim();
  const crc = String(corpo.crc ?? '').trim().toUpperCase();
  const decisao = corpo.decisao === 'recusada' ? 'recusada' : 'confirmada';
  if (!nome || !/^[0-9A-Z\-\/ .]{4,20}$/.test(crc)) return c.text('Digite nome e CRC. Exemplo: 1SP123456.', 400);
  const registro = d.sugs.map((s) => ({
    item: s.item_idx, tributo: s.tributo, resultado: s.resultado, norma: s.norma_id, artigo: s.artigo ?? null,
    data_norma: s.data_norma ?? null, cst: s.cst, cclass_trib: s.cclass_trib, aliquota_cpp: s.aliquota_cpp,
    valor_centavos: s.valor_centavos, versao_base: s.versao_base,
  }));
  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO firma (nota_id, usuario_id, contador_nome, crc, decisao, sugestoes_json, xml_sha256) VALUES (?,?,?,?,?,?,?)',
    ).bind(d.n.id, u.id, nome, crc, decisao, JSON.stringify(registro), d.n.xml_sha256),
    c.env.DB.prepare("UPDATE nota SET status = 'firmada' WHERE id = ?").bind(d.n.id),
  ]);
  return c.redirect(`/c/${cnpj.cnpj}/nota/${d.n.id}`, 303);
});

app.notFound((c) => c.html(<Layout titulo="Não encontrado"><h1>Página não encontrada.</h1><div class="acoes"><a class="botao" href="/">Início</a></div></Layout>, 404));
app.onError((err, c) => {
  console.error(err);
  return c.html(<Layout titulo="Erro"><h1>Algo falhou do nosso lado.</h1><p class="sub">Tente de novo. Se persistir, ligue para o plantão.</p></Layout>, 500);
});

export default app;
