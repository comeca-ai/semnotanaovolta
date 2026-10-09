import { Hono, type Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { Layout } from './ui/layout';
import {
  COOKIE_SESSAO, VALIDADE_LINK_MS, VALIDADE_SESSAO_MS, enviarLinkPorEmail, plantaoAberto, sha256, tokenAleatorio,
} from './lib/auth';
import { PACOTES, avaliarTeto, reais, type Pacote } from './lib/pacote';
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
  dono_nome: string; escritorio_nome: string; dono_id: number;
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

function pagina(c: C, titulo: string, corpo: any, status = 200) {
  const usuario = c.get('usuario') ?? null;
  return c.html(
    <Layout titulo={`${titulo} · A nota sem volta`} usuario={usuario} plantao={plantao(c)}>
      {corpo}
    </Layout>,
    status as any,
  );
}

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
      descricao="Nota lida e firmada por contador. R$ 9 mil por ano, primeiro CNPJ. Vence dia 1. Plantão na sexta."
      plantao={plantao(c)}
    >
      <section style="padding:48px 0 32px">
        <h1 style="font-size:2.6rem">A nota sem volta.</h1>
        <p style="font-size:1.2rem">A nota que o seu escritório já emite, lida e firmada por contador. Se voltar, tem telefone.</p>
        <p class="valor">R$ 9 mil por ano, primeiro CNPJ. Vence dia 1.</p>
        <div class="acoes"><a class="botao" href="/entrar">Ver na sua nota</a></div>
      </section>
      <section class="cartao">
        <h2>Preço escrito. Excedente escrito antes.</h2>
        <div class="tabela">
          <table>
            <thead><tr><th>Pacote</th><th>Quando</th><th>Notas por ano</th><th>Preço por ano</th></tr></thead>
            <tbody>
              <tr><td>Entrada</td><td>Primeiro CNPJ</td><td>até 2.400</td><td>R$ 9 mil</td></tr>
              <tr><td>Meio</td><td>Segundo CNPJ ou renovação</td><td>até 6.000</td><td>R$ 18 mil</td></tr>
              <tr><td>Cheio</td><td>Vários estados, parada já caída</td><td>até 12.000</td><td>R$ 24 mil</td></tr>
            </tbody>
          </table>
        </div>
        <p style="margin-top:12px">Acima do teto do seu pacote: R$ 4 por nota. Avisamos antes da nota que passa.</p>
        <p>Nota devolvida e reemitida não conta de novo.</p>
        <p>Vencimento dia 1. Por CNPJ. Sem projeto, sem implantação.</p>
        <div class="acoes"><a class="botao" href="/entrar">Ver na sua nota</a></div>
      </section>
      <section style="margin:24px 0">
        <p>Você sobe o XML. A nota é lida: NCM, estado, município, ISS, valor.</p>
        <p>A sugestão vem com artigo e data. O contador confirma e o CRC fica no log.</p>
        <p>Se a nota voltar, a tela mostra o órgão, o código e o campo. E o telefone.</p>
      </section>
      <p>Escritório contábil: você indica, o dono paga. Fale com a gente antes de indicar o primeiro CNPJ.</p>
      <p class="nota-legal">Sugestão, não decisão. Não é parecer e não substitui contador.</p>
    </Layout>,
  ),
);

// ---------- entrar por link ----------

app.get('/entrar', (c) =>
  pagina(c, 'Entrar', (
    <>
      <h1>Entrar</h1>
      <form method="post" action="/entrar">
        <label for="email">Seu e-mail</label>
        <input id="email" name="email" type="email" required autocomplete="email" autofocus />
        <div class="acoes"><button class="botao" type="submit">Receber o link</button></div>
      </form>
      <p class="nota-legal" style="margin-top:16px">O link vale por 15 minutos e uma vez só.</p>
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
      <p>Se o e-mail estiver autorizado, o link chega em instantes.</p>
      {linkDev && (
        <div class="ficticio">
          Modo de desenvolvimento, sem envio de e-mail: <a href={linkDev}>entrar por este link</a>.
        </div>
      )}
    </>
  ));
});

// GET só mostra o botão: leitores de e-mail que abrem links não gastam o token.
app.get('/entrar/link', (c) =>
  pagina(c, 'Entrar', (
    <>
      <h1>Entrar</h1>
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
        <p>Ele vence em 15 minutos e serve uma vez só.</p>
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
    `SELECT c.id, c.cnpj, c.razao_social, c.uf, c.municipio, c.dono_id, d.nome AS dono_nome, e.nome AS escritorio_nome
     FROM cnpj c JOIN usuario d ON d.id = c.dono_id JOIN escritorio e ON e.id = c.escritorio_id
     WHERE c.dono_id = ?1 OR c.escritorio_id = ?2 ORDER BY c.id`,
  ).bind(u.id, u.escritorio_id ?? -1);
}

app.get('/cnpjs', async (c) => {
  const { results } = await cnpjsDoUsuario(c).all<Cnpj>();
  return pagina(c, 'Escolha o CNPJ', (
    <>
      <h1>Escolha o CNPJ.</h1>
      {results.length === 0 && <p>Nenhum CNPJ autorizado para você. Fale com o dono da empresa.</p>}
      {results.map((x) => (
        <a class="cartao" href={`/c/${x.cnpj}`} style="display:block;text-decoration:none">
          <p class="valor">{x.razao_social}</p>
          <p class="rotulo">{fmtCnpj(x.cnpj)} · {x.municipio}/{x.uf}</p>
        </a>
      ))}
    </>
  ));
});

app.use('/c/:cnpj/*', carregaCnpj);
app.use('/c/:cnpj', carregaCnpj);

async function carregaCnpj(c: C, next: () => Promise<void>) {
  const alvo = c.req.param('cnpj');
  const { results } = await cnpjsDoUsuario(c).all<Cnpj>();
  const cnpj = results.find((x) => x.cnpj === alvo);
  if (!cnpj) return pagina(c, 'CNPJ', <><h1>CNPJ não autorizado.</h1><a class="botao" href="/cnpjs">Escolher outro</a></>, 404);
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

// Contrato de cálculo
app.get('/c/:cnpj', async (c) => {
  const cnpj = c.get('cnpj');
  const ct = c.get('contrato');
  const t = await termos(c);
  const usadasN = await usadas(c);
  const { results: notas } = await c.env.DB.prepare(
    'SELECT id, tipo, chave, valor_centavos, status, municipio_nome, uf FROM nota WHERE cnpj_id = ? AND status != ? ORDER BY id DESC LIMIT 10',
  ).bind(cnpj.id, 'pendente').all<any>();
  const termoOk = t.dono && t.contador;
  return pagina(c, 'Contrato de cálculo', (
    <>
      <h1>Contrato de cálculo</h1>
      <p class="rotulo">{cnpj.razao_social} · {fmtCnpj(cnpj.cnpj)}</p>
      <div class="grade" style="margin:16px 0">
        <div><p class="rotulo">Quem paga</p><p class="valor">{cnpj.dono_nome}</p></div>
        <div><p class="rotulo">Quem indica</p><p class="valor">{cnpj.escritorio_nome}</p></div>
        <div><p class="rotulo">Vencimento</p><p class="valor">dia 1</p></div>
      </div>
      {ct ? (
        <div class="cartao">
          <h2>Valores do contrato</h2>
          <p><span class="grande">{reais(ct.preco_centavos)}</span> por ano · Pacote {PACOTES[ct.pacote].nome}</p>
          <p>Primeiro CNPJ R$ 9.000. Próximo CNPJ, cheio. Vence dia 1 de cada ano.</p>
          <p class="rotulo">Notas: {usadasN.toLocaleString('pt-BR')} de {ct.teto_notas.toLocaleString('pt-BR')}
            {ct.teto_notas - usadasN > 0 && ct.teto_notas - usadasN <= 100 && <> · Faltam {ct.teto_notas - usadasN} notas para o teto do seu pacote.</>}
          </p>
        </div>
      ) : <div class="cartao"><p class="erro">Sem contrato vigente para este CNPJ.</p></div>}
      <div class="grade">
        <div class="cartao"><p class="rotulo">Rejeição SEFAZ</p><p class="valor">sem retorno registrado</p></div>
        <div class="cartao"><p class="rotulo">Rejeição prefeitura</p><p class="valor">sem retorno registrado</p></div>
      </div>
      <div class="cartao">
        <h2>Notas recentes</h2>
        {notas.length === 0 ? <p>Nenhuma nota ainda.</p> : (
          <div class="tabela"><table>
            <thead><tr><th>Nota</th><th>Município</th><th>Valor</th><th>Situação</th></tr></thead>
            <tbody>{notas.map((n) => (
              <tr>
                <td><a href={`/c/${cnpj.cnpj}/nota/${n.id}`}>{n.tipo} …{String(n.chave).slice(-8)}</a></td>
                <td>{n.municipio_nome}/{n.uf}</td><td>{reais(n.valor_centavos)}</td><td>{situacao(n.status)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      <div class="acoes">
        {termoOk ? <a class="botao" href={`/c/${cnpj.cnpj}/enviar`}>Subir XML</a> : <a class="botao" href={`/c/${cnpj.cnpj}/termo`}>Ver o termo</a>}
      </div>
      {!termoOk && <p style="margin-top:12px">Falta o termo. Sem termo, a nota não sobe.</p>}
    </>
  ));
});

const situacao = (s: string) =>
  ({ sugerida: 'Sugestão pronta', firmada: 'Firmada', parada: 'Parada', voltou: 'Voltou', pendente: 'Pendente' } as Record<string, string>)[s] ?? s;

// ---------- termo ----------

app.get('/c/:cnpj/termo', async (c) => {
  const t = await termos(c);
  const u = c.get('usuario');
  const jaAceitei = t[u.papel];
  return pagina(c, 'Termo', (
    <>
      <h1>Termo</h1>
      <div class="cartao">
        <p>O sistema sugere. Não decide e não é parecer.</p>
        <p>Quem firma responde pela nota firmada.</p>
        <p>O CRC é digitado por quem firma. Nesta fase, ele não é conferido em cadastro oficial.</p>
        <p>A base legal é interna e tem data. O sistema não busca norma na internet.</p>
        <p class="rotulo">Versão {fmtData(VERSAO_TERMO)}</p>
      </div>
      <p>Contador: <strong>{t.contador ? 'aceito' : 'pendente'}</strong> · Dono: <strong>{t.dono ? 'aceito' : 'pendente'}</strong></p>
      {t.contador && !t.dono && <p>O contador aceitou. Falta o dono.</p>}
      {t.dono && !t.contador && <p>O dono aceitou. Falta o contador.</p>}
      {jaAceitei ? (
        <div class="acoes"><a class="botao" href={`/c/${c.get('cnpj').cnpj}`}>Voltar ao contrato</a></div>
      ) : (
        <form method="post"><div class="acoes"><button class="botao" type="submit">Aceito como {u.papel}</button></div></form>
      )}
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

// ---------- subir XML ----------

app.get('/c/:cnpj/enviar', async (c) => {
  const cnpj = c.get('cnpj');
  const ct = c.get('contrato');
  const t = await termos(c);
  if (!(t.dono && t.contador)) return c.redirect(`/c/${cnpj.cnpj}/termo`, 303);
  const usadasN = await usadas(c);
  return pagina(c, 'Subir XML', (
    <>
      <h1>Suba o XML.</h1>
      <p class="rotulo">{cnpj.razao_social} · {fmtCnpj(cnpj.cnpj)}</p>
      {ct && <p>Pacote {PACOTES[ct.pacote].nome}: {usadasN.toLocaleString('pt-BR')} de {ct.teto_notas.toLocaleString('pt-BR')} notas.</p>}
      <form method="post" enctype="multipart/form-data" id="form-xml">
        <label class="drop" id="drop" for="xml">
          <strong>Arraste os XMLs aqui</strong><br />
          <span class="rotulo">ou toque para escolher. NF-e e NFS-e. Até {MAX_ARQUIVOS} arquivos por vez.</span>
          <input id="xml" name="xml" type="file" accept=".xml,text/xml,application/xml" multiple required
            style="display:block;margin:16px auto 0" />
        </label>
        <p id="contagem" class="rotulo" aria-live="polite"></p>
        <div class="acoes"><button class="botao" type="submit">Ler as notas</button></div>
      </form>
      <script dangerouslySetInnerHTML={{ __html: `
        const d=document.getElementById('drop'),i=document.getElementById('xml'),k=document.getElementById('contagem');
        ['dragenter','dragover'].forEach(e=>d.addEventListener(e,ev=>{ev.preventDefault();d.classList.add('ativo')}));
        ['dragleave','drop'].forEach(e=>d.addEventListener(e,()=>d.classList.remove('ativo')));
        d.addEventListener('drop',ev=>{ev.preventDefault();i.files=ev.dataTransfer.files;i.dispatchEvent(new Event('change'))});
        i.addEventListener('change',()=>{k.textContent=i.files.length+' arquivo(s) escolhido(s).'});
      ` }} />
    </>
  ));
});

type ResumoArquivo = { arquivo: string; ok: boolean; motivo?: string; notaId?: number };

app.post('/c/:cnpj/enviar', async (c) => {
  const cnpj = c.get('cnpj');
  const u = c.get('usuario');
  const t = await termos(c);
  if (!(t.dono && t.contador)) return c.redirect(`/c/${cnpj.cnpj}/termo`, 303);
  if (!c.get('contrato')) return pagina(c, 'Sem contrato', <h1>Sem contrato vigente para este CNPJ.</h1>, 400);

  const form = await c.req.formData();
  const arquivos = form.getAll('xml').filter((f): f is File => typeof f !== 'string');
  if (arquivos.length === 0) return c.redirect(`/c/${cnpj.cnpj}/enviar`, 303);
  if (arquivos.length > MAX_ARQUIVOS) {
    return pagina(c, 'Muitos arquivos', <><h1>Até {MAX_ARQUIVOS} arquivos por vez.</h1><a class="botao" href={`/c/${cnpj.cnpj}/enviar`}>Subir de novo</a></>, 400);
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
    if (n.cnpjEmitente !== cnpj.cnpj) { resumo.push({ arquivo: nome, ok: false, motivo: 'Esta nota é de outro CNPJ. Confira e suba de novo.' }); continue; }
    const existe = await c.env.DB.prepare('SELECT id FROM nota WHERE cnpj_id = ? AND chave = ?').bind(cnpj.id, n.chave).first();
    if (existe || vistas.has(n.chave)) { resumo.push({ arquivo: nome, ok: false, motivo: 'Nota já enviada.' }); continue; }
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
      <h1>Teto do pacote.</h1>
      <p>Pacote {PACOTES[ct.pacote].nome}.</p>
      <div class="cartao" style="max-width:420px">
        <p>Notas autorizadas <strong style="float:right">{a.teto.toLocaleString('pt-BR')}</strong></p>
        <p>Usadas <strong style="float:right">{a.usadas.toLocaleString('pt-BR')}</strong></p>
        <p>Neste lote <strong style="float:right">{a.novas.toLocaleString('pt-BR')}</strong></p>
      </div>
      <p>{a.excedentes === 1 ? 'Uma nota deste lote passa do teto.' : `${a.excedentes} notas deste lote passam do teto.`}</p>
      <p><strong>Excedente R$ 4 por nota, escrito antes: {reais(a.valorExcedenteCentavos)}.</strong></p>
      <form method="post" class="acoes">
        <button class="botao" name="decisao" value="parar" type="submit">Parar</button>
        <button class="secundario" name="decisao" value="seguir" type="submit">Seguir</button>
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
    `SELECT s.nota_id, SUM(s.resultado = 'nao_responde') AS sem_norma, SUM(s.resultado = 'sugere' AND s.valor_centavos IS NULL) AS sem_calculo
     FROM sugestao s JOIN nota n ON n.id = s.nota_id WHERE n.lote_id = ? GROUP BY s.nota_id`,
  ).bind(loteId).all<{ nota_id: number; sem_norma: number; sem_calculo: number }>();
  const porNota = new Map(contagem.map((x) => [x.nota_id, x]));
  const lidas = resumo.filter((r) => r.ok);
  const recusadas = resumo.filter((r) => !r.ok);
  const comSemNorma = lidas.filter((r) => (porNota.get(r.notaId!)?.sem_norma ?? 0) > 0).length;
  const comSemCalculo = lidas.filter((r) => (porNota.get(r.notaId!)?.sem_calculo ?? 0) > 0).length;
  const primeira = lidas[0]?.notaId;
  return pagina(c, 'Notas lidas', (
    <>
      <h1>{lote.status === 'parado' ? 'Lote parado.' : `${lidas.length} ${lidas.length === 1 ? 'nota lida' : 'notas lidas'}.`}</h1>
      {lote.status === 'parado' && <p>Nada foi processado. As notas deste lote não contam no pacote.</p>}
      <div class="grade" style="margin-bottom:16px">
        <div class="cartao"><p class="rotulo">Lidas</p><p class="grande">{lidas.length}</p></div>
        <div class="cartao"><p class="rotulo">Recusadas</p><p class={`grande ${recusadas.length ? 'erro' : ''}`}>{recusadas.length}</p></div>
        <div class="cartao"><p class="rotulo">Com item sem norma na base</p><p class={`grande ${comSemNorma ? 'aviso' : ''}`}>{comSemNorma}</p></div>
        <div class="cartao"><p class="rotulo">Classificadas sem cálculo</p><p class="grande">{comSemCalculo}</p></div>
      </div>
      <div class="cartao tabela">
        <table>
          <thead><tr><th>Arquivo</th><th>Resultado</th></tr></thead>
          <tbody>{resumo.map((r) => (
            <tr>
              <td>{r.ok && lote.status !== 'parado' ? <a href={`/c/${cnpj.cnpj}/nota/${r.notaId}`}>{r.arquivo}</a> : r.arquivo}</td>
              <td>{r.ok
                ? (lote.status === 'parado' ? 'Parada' : notaResumo(porNota.get(r.notaId!)))
                : <span class="erro">{r.motivo}</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div class="acoes">
        {primeira && lote.status !== 'parado'
          ? <a class="botao" href={`/c/${cnpj.cnpj}/nota/${primeira}`}>Ler a primeira nota</a>
          : <a class="botao" href={`/c/${cnpj.cnpj}/enviar`}>Subir XML</a>}
      </div>
    </>
  ));
});

function notaResumo(x?: { sem_norma: number; sem_calculo: number }) {
  if (!x) return 'Lida';
  if (x.sem_norma > 0) return <span class="aviso">Sem norma na base em {x.sem_norma} {x.sem_norma === 1 ? 'tributo' : 'tributos'}</span>;
  if (x.sem_calculo > 0) return 'Classificada. Sem alíquota na base em parte.';
  return <span class="ok">Sugestão pronta</span>;
}

// ---------- leitura da nota e firma ----------

async function carregaNota(c: C) {
  const n = await c.env.DB.prepare('SELECT * FROM nota WHERE id = ? AND cnpj_id = ?')
    .bind(Number(c.req.param('id')), c.get('cnpj').id).first<any>();
  if (!n) return null;
  const { results: sugs } = await c.env.DB.prepare(
    `SELECT s.*, nm.fonte, nm.artigo, nm.data_norma, nm.ficticio FROM sugestao s LEFT JOIN norma nm ON nm.id = s.norma_id
     WHERE s.nota_id = ? ORDER BY s.item_idx, CASE s.tributo WHEN 'ICMS' THEN 1 WHEN 'ISS' THEN 2 WHEN 'IBS' THEN 3 ELSE 4 END`,
  ).bind(n.id).all<any>();
  const firma = await c.env.DB.prepare('SELECT * FROM firma WHERE nota_id = ? ORDER BY id DESC LIMIT 1').bind(n.id).first<any>();
  return { n, itens: JSON.parse(n.itens_json) as NotaLida['itens'], sugs, firma };
}

function CartaoSugestao({ s }: { s: any }) {
  if (s.resultado === 'nao_responde') {
    return (
      <div class="cartao">
        <h2>{s.tributo}</h2>
        <p class="aviso">Sem norma na base para este item. Não sugerimos.</p>
        <p class="rotulo">{s.motivo}</p>
      </div>
    );
  }
  return (
    <div class="cartao ia">
      <h2>Sugestão {s.tributo}</h2>
      <p>Base legal: {s.fonte}, {s.artigo}, de {fmtData(s.data_norma)}.</p>
      <p class="rotulo">
        {s.cst && <>CST {s.cst} · </>}{s.cclass_trib && <>cClassTrib {s.cclass_trib} · </>}
        {s.aliquota_cpp !== null ? <>Alíquota {fmtAliq(s.aliquota_cpp)} · Valor {reais(s.valor_centavos)}</> : <>Sem alíquota na base: o valor fica em branco.</>}
      </p>
    </div>
  );
}

app.get('/c/:cnpj/nota/:id', async (c) => {
  const cnpj = c.get('cnpj');
  const d = await carregaNota(c);
  if (!d) return pagina(c, 'Nota', <h1>Nota não encontrada.</h1>, 404);
  const { n, itens, sugs, firma } = d;
  const ficticia = sugs.some((s) => s.ficticio === 1);
  return pagina(c, 'Leitura da nota', (
    <>
      <h1>Leitura da nota</h1>
      {ficticia && <div class="ficticio">Base fictícia de desenvolvimento. Nada aqui é norma real.</div>}
      <div class="cartao tabela">
        <table><tbody>
          <tr><th>Tipo</th><td>{n.tipo}</td></tr>
          {n.tipo === 'NF-e'
            ? <tr><th>NCM</th><td>{itens.map((i) => fmtNcm(i.ncm ?? '')).join(', ')}</td></tr>
            : <tr><th>Serviço</th><td>{itens.map((i) => `${i.servico} ${i.descricao}`).join(', ')}</td></tr>}
          <tr><th>Estado</th><td>{n.uf}</td></tr>
          <tr><th>Município</th><td>{n.municipio_nome || n.municipio_ibge}</td></tr>
          <tr><th>ISS</th><td class={n.incide_iss ? 'ok' : ''}>{n.incide_iss ? 'sim' : 'não'}</td></tr>
          <tr><th>Valor</th><td>{reais(n.valor_centavos)}</td></tr>
        </tbody></table>
      </div>
      {itens.map((item, idx) => (
        <section>
          {itens.length > 1 && <h2 style="margin-top:16px">Item {idx + 1}: {item.descricao}</h2>}
          {sugs.filter((s) => s.item_idx === idx).map((s) => <CartaoSugestao s={s} />)}
        </section>
      ))}
      <p class="nota-legal">Sugestão, não decisão. A IA não inventa norma.</p>
      {firma ? (
        <div class="cartao"><p class="ok">{firma.decisao === 'confirmada' ? 'Firmado' : 'Recusado'} por {firma.contador_nome}, CRC {firma.crc}, às {fmtHora(firma.firmado_em)}. Artigo e data no log. Não apaga.</p></div>
      ) : c.get('usuario').papel === 'contador' ? (
        <div class="acoes"><a class="botao" href={`/c/${cnpj.cnpj}/nota/${n.id}/firmar`}>Ir para firmar</a></div>
      ) : (
        <p>Quem firma é o contador.</p>
      )}
    </>
  ));
});

app.get('/c/:cnpj/nota/:id/firmar', async (c) => {
  const cnpj = c.get('cnpj');
  const u = c.get('usuario');
  const d = await carregaNota(c);
  if (!d) return pagina(c, 'Nota', <h1>Nota não encontrada.</h1>, 404);
  if (d.firma || u.papel !== 'contador') return c.redirect(`/c/${cnpj.cnpj}/nota/${d.n.id}`, 303);
  const sugeridas = d.sugs.filter((s) => s.resultado === 'sugere');
  return pagina(c, 'Firmar', (
    <>
      <h1>Firmar</h1>
      <div class="cartao ia">
        <h2>Base legal aberta</h2>
        {sugeridas.length === 0 && <p>Nenhuma sugestão nesta nota. Você firma a sua decisão.</p>}
        {sugeridas.map((s) => <p>{s.tributo}: {s.fonte}, {s.artigo}, de {fmtData(s.data_norma)}.</p>)}
        <p class="rotulo">Sugestão, não decisão. O log grava artigo e CRC.</p>
      </div>
      <form method="post">
        <label for="nome">Nome</label>
        <input id="nome" name="nome" type="text" required value={u.nome} autocomplete="name" />
        <label for="crc">CRC</label>
        <input id="crc" name="crc" type="text" required placeholder="1SP123456" pattern="[0-9A-Za-z\-\/ .]{4,20}" />
        <div class="acoes">
          <button class="botao" name="decisao" value="confirmada" type="submit">Firmar</button>
          <button class="secundario" name="decisao" value="recusada" type="submit">Recusar a sugestão</button>
        </div>
      </form>
    </>
  ));
});

app.post('/c/:cnpj/nota/:id/firmar', async (c) => {
  const cnpj = c.get('cnpj');
  const u = c.get('usuario');
  if (u.papel !== 'contador') return c.text('Quem firma é o contador.', 403);
  const d = await carregaNota(c);
  if (!d) return c.text('Nota não encontrada.', 404);
  if (d.firma) return c.redirect(`/c/${cnpj.cnpj}/nota/${d.n.id}`, 303);
  const corpo = await c.req.parseBody();
  const nome = String(corpo.nome ?? '').trim();
  const crc = String(corpo.crc ?? '').trim().toUpperCase();
  const decisao = corpo.decisao === 'recusada' ? 'recusada' : 'confirmada';
  if (!nome || !/^[0-9A-Z\-\/ .]{4,20}$/.test(crc)) return c.text('Nome e CRC são obrigatórios.', 400);
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

app.notFound((c) => c.html(<Layout titulo="Não encontrado"><h1>Página não encontrada.</h1><a class="botao" href="/">Início</a></Layout>, 404));
app.onError((err, c) => {
  console.error(err);
  return c.html(<Layout titulo="Erro"><h1>Algo falhou do nosso lado.</h1><p>Tente de novo. Se persistir, ligue para o plantão.</p></Layout>, 500);
});

export default app;
