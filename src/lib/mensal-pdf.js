// PDF do relatório mensal: situação de cada viatura no período
import { NIVEIS, SITUACOES } from '../config'
import { dataBR, diaMes, km } from './formato'
import { nomeMes } from './frota'
import { detalheSituacao } from './situacao'
import { COLUNAS_GESTAO, destaqueGestao } from './gestao'
import { textoPendencia } from './pendencia'

function carregarImagem(src) {
  return new Promise((ok) => {
    const i = new Image()
    i.onload = () => ok(i)
    i.onerror = () => ok(null)
    i.src = src
  })
}

// Helvetica não tem emojis nem alguns sinais
const limpar = (s = '') =>
  String(s)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/→/g, '->')
    .trim()

// "CHEVROLET/TRAILBLAZER/BDS5F07" -> linhas por barra, juntando partes curtas ("FORD/RANGER/" + placa)
const splitModelo = (v) => {
  const partes = v.split('/')
  const linhas = []
  for (let i = 0; i < partes.length; i++) {
    const p = partes[i] + (i < partes.length - 1 ? '/' : '')
    const ultima = linhas.at(-1)
    if (ultima && ultima.length + p.length <= 15) linhas[linhas.length - 1] = ultima + p
    else linhas.push(p)
  }
  return linhas.join('\n')
}

const maiuscula = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t)

export async function gerarPdfMensal({ resumo: r, brasoes, geradoPor, hoje }) {
  const { jsPDF } = await import('jspdf')
  // Paisagem: a tabela da aba Gestão tem 19 colunas
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const L = 10
  const W = 277
  const ALTURA = 210
  const COR = { tinta: [14, 26, 43], cinza: [74, 90, 112], azul: [0, 69, 138], ouro: [245, 197, 49], critico: [180, 35, 24], atencao: [168, 88, 0], ok: [30, 122, 70], fundo: [237, 241, 246], linha: [217, 224, 234] }
  let y = 14

  const garantir = (h) => {
    if (y + h > ALTURA - 16) {
      pdf.addPage()
      y = 15
      return true
    }
    return false
  }
  const fonte = (estilo, tam, cor = COR.tinta) => {
    pdf.setFont('helvetica', estilo)
    pdf.setFontSize(tam)
    pdf.setTextColor(...cor)
  }
  const linhasDe = (t, larg) => pdf.splitTextToSize(limpar(t), larg)
  const tituloSecao = (t) => {
    garantir(16)
    y += 3
    fonte('bold', 12, COR.azul)
    pdf.text(t, L, y)
    y += 6
  }

  // Tabela simples; repete o cabeçalho ao virar a página
  function tabela(colunas, linhas, { cores } = {}) {
    const pad = 1.6
    const cabecalho = () => {
      pdf.setFillColor(...COR.fundo)
      pdf.rect(L, y - 4, W, 6.2, 'F')
      fonte('bold', 8.5, COR.cinza)
      let x = L
      for (const c of colunas) {
        pdf.text(limpar(c.titulo), c.direita ? x + c.w - pad : x + pad, y, { align: c.direita ? 'right' : 'left' })
        x += c.w
      }
      y += 5.4
    }
    cabecalho()
    linhas.forEach((ln, li) => {
      fonte('normal', 9)
      const cel = colunas.map((c, ci) => linhasDe(ln[ci] ?? '', c.w - pad * 2))
      const h = Math.max(...cel.map((x) => x.length)) * 4.1 + 1.6
      if (garantir(h)) cabecalho()
      let x = L
      colunas.forEach((c, ci) => {
        const cor = cores?.(li, ci)
        fonte(cor ? 'bold' : 'normal', 9, cor || COR.tinta)
        cel[ci].forEach((t, i) => pdf.text(t, c.direita ? x + c.w - pad : x + pad, y + i * 4.1, { align: c.direita ? 'right' : 'left' }))
        x += c.w
      })
      y += h
      pdf.setDrawColor(...COR.linha)
      pdf.setLineWidth(0.2)
      pdf.line(L, y - 3.4, L + W, y - 3.4)
    })
    y += 2
  }

  // Cabeçalho com os brasões
  const [imgApmg, imgEsfo] = await Promise.all((brasoes || []).map(carregarImagem))
  const altB = 24
  if (imgApmg) pdf.addImage(imgApmg, 'PNG', L, y, (altB * imgApmg.width) / imgApmg.height, altB)
  if (imgEsfo) {
    const w = (altB * imgEsfo.width) / imgEsfo.height
    pdf.addImage(imgEsfo, 'PNG', L + W - w, y, w, altB)
  }
  fonte('bold', 15, COR.azul)
  pdf.text('RELATÓRIO MENSAL DE VIATURAS', L + W / 2, y + 9, { align: 'center' })
  fonte('normal', 10, COR.cinza)
  pdf.text('Escola de Formação de Oficiais · APMG · PMPR', L + W / 2, y + 15, { align: 'center' })
  pdf.text(limpar(`${nomeMes(r.mes, true)} · ${diaMes(r.de)} a ${dataBR(r.ate)}`), L + W / 2, y + 20.5, { align: 'center' })
  y += altB + 4
  pdf.setDrawColor(...COR.ouro)
  pdf.setLineWidth(1)
  pdf.line(L, y, L + W, y)
  y += 6
  fonte('normal', 9, COR.cinza)
  pdf.text(limpar(`Gerado em ${dataBR(hoje)}${geradoPor ? ` por ${geradoPor}` : ''}${r.emAndamento ? ' (mês em andamento)' : ''}`), L, y)
  y += 6

  // Números da frota
  const f = r.frota
  const numeros = [
    [String(f.ativas), `VTR em condições${f.baixadas ? ` (${f.baixadas} baixadas)` : ''}`],
    [km(f.kmRodados), 'km rodados no período'],
    [String(f.alteracoes), 'alterações registradas'],
    [String(f.pendencias), 'pendências em aberto'],
  ]
  const larg = (W - 3 * 4) / 4
  numeros.forEach(([n, rot], i) => {
    const x = L + i * (larg + 4)
    pdf.setFillColor(...COR.fundo)
    pdf.roundedRect(x, y, larg, 17, 1.5, 1.5, 'F')
    fonte('bold', 16)
    pdf.text(n, x + 3, y + 8)
    fonte('normal', 8, COR.cinza)
    linhasDe(rot, larg - 6).forEach((t, k) => pdf.text(t, x + 3, y + 12.2 + k * 3.4))
  })
  y += 24

  // Tabela no formato da aba "Gestão" da planilha (mesmas colunas, mesma ordem)
  function tabelaGestao() {
    const pad = 1
    const lh = 2.6
    const cabecalho = () => {
      fonte('bold', 5.4, [255, 255, 255])
      const tit = COLUNAS_GESTAO.map((c) => pdf.splitTextToSize(limpar(c.titulo), c.w - pad * 2))
      const h = Math.max(...tit.map((t) => t.length)) * 2.4 + 2.4
      pdf.setFillColor(12, 42, 90)
      pdf.rect(L, y, W, h, 'F')
      let x = L
      COLUNAS_GESTAO.forEach((c, i) => {
        tit[i].forEach((t, k) => pdf.text(t, x + c.w / 2, y + 2.6 + k * 2.4, { align: 'center' }))
        x += c.w
      })
      y += h
    }
    cabecalho()
    for (const xv of r.porViatura) {
      const g = xv.gestao
      fonte('normal', 5.8)
      // Modelo/placa e combustível quebram nas barras, nunca no meio da palavra
      const texto = (c) => {
        const v = limpar(g[c.chave] ?? '')
        if (c.chave === 'modelo') return splitModelo(v)
        return c.chave === 'comb' ? v.replace(/\//, '/\n') : v
      }
      const cel = COLUNAS_GESTAO.map((c) => pdf.splitTextToSize(texto(c), c.w - pad * 2))
      const h = Math.max(...cel.map((t) => t.length)) * lh + 2.2
      if (y + h > ALTURA - 16) {
        pdf.addPage()
        y = 15
        cabecalho()
      }
      let x = L
      COLUNAS_GESTAO.forEach((c, i) => {
        const d = destaqueGestao(c.chave, g[c.chave])
        if (d) {
          pdf.setFillColor(...(d === 'critico' ? [253, 232, 230] : [253, 240, 222]))
          pdf.rect(x, y, c.w, h, 'F')
        }
        fonte(d || c.chave === 'prefixo' ? 'bold' : 'normal', c.chave === 'prefixo' ? 7 : 5.8, d ? COR[d] : COR.tinta)
        const esq = c.chave === 'detalhamento'
        cel[i].forEach((t, k) => pdf.text(t, esq ? x + pad : x + c.w / 2, y + 2.6 + k * lh, { align: esq ? 'left' : 'center' }))
        pdf.setDrawColor(...COR.linha)
        pdf.setLineWidth(0.15)
        pdf.rect(x, y, c.w, h)
        x += c.w
      })
      y += h
    }
    y += 4
  }

  tituloSecao('Gestão das viaturas (formato da planilha)')
  tabelaGestao()

  // KM e troca de óleo no mês (o que só o app registra)
  tituloSecao('KM e vistorias no mês')
  tabela(
    [
      { titulo: 'VTR', w: 20 },
      { titulo: 'Modelo', w: 52 },
      { titulo: 'STATUS', w: 30 },
      { titulo: 'KM no período', w: 50, direita: true },
      { titulo: 'Rodado', w: 30, direita: true },
      { titulo: 'Vistorias', w: 25, direita: true },
      { titulo: 'Troca de óleo / revisão', w: 70 },
    ],
    r.porViatura.map((x) => [
      x.vtr.prefixo,
      x.vtr.modelo,
      SITUACOES[x.situacao],
      x.kmInicial ? `${km(x.kmInicial)} - ${km(x.kmFinal)}` : '-',
      x.kmInicial ? km(x.rodado) : '-',
      String(x.vistorias),
      maiuscula(x.troca.texto),
    ]),
    {
      cores: (li, ci) => {
        const x = r.porViatura[li]
        if (ci === 6 && x.troca.alerta) return COR.atencao
        if (ci === 2 && x.situacao !== 'ativa') return COR.atencao
        return null
      },
    },
  )

  // Alterações, pendências e trocas, por viatura
  tituloSecao('Situação, alterações, pendências e trocas de óleo')
  const comAlgo = r.porViatura.filter((x) => x.situacao !== 'ativa' || x.alteracoes.length || x.pendencias.length || x.trocas.length)
  if (!comAlgo.length) {
    fonte('normal', 10, COR.cinza)
    pdf.text('Nenhuma VTR fora de serviço, alteração, pendência ou troca de óleo no período.', L, y)
    y += 6
  }
  for (const x of comAlgo) {
    const itens = [
      ...(x.situacao !== 'ativa'
        ? [{ selo: SITUACOES[x.situacao].toUpperCase(), cor: x.situacao === 'baixada' ? COR.critico : COR.atencao, texto: [x.vtr.motivoSituacao, detalheSituacao(x.vtr)].filter(Boolean).join(' - ') || 'Sem observação' }]
        : []),
      ...x.alteracoes.map((g) => ({
        selo: NIVEIS[g.nivel].nome.toUpperCase(),
        cor: g.nivel === 'critico' ? COR.critico : g.nivel === 'atencao' ? COR.atencao : COR.cinza,
        texto: `${g.texto} - ${g.vezes > 1 ? `${g.vezes} vistorias, de ${diaMes(g.primeira)} a ${diaMes(g.ultima)}` : `em ${diaMes(g.ultima)}`}`,
      })),
      ...x.pendencias.map((o) => ({ selo: 'PENDÊNCIA', cor: COR.cinza, texto: `${textoPendencia(o)} - em aberto desde ${dataBR(o.abertaEm)}` })),
      ...x.trocas.map((t) => ({ selo: 'TROCA', cor: COR.ok, texto: `Troca de óleo em ${dataBR(t.data)}${t.km ? ` aos ${km(t.km)} km` : ''}${t.por ? ` (${t.por})` : ''}` })),
    ]
    fonte('normal', 9.5)
    const alturas = itens.map((it) => linhasDe(it.texto, W - 28).length * 4.3 + 1.5)
    garantir(9 + Math.min(alturas.reduce((a, b) => a + b, 0), 60))
    pdf.setFillColor(...COR.fundo)
    pdf.roundedRect(L, y - 4.5, W, 7, 1.2, 1.2, 'F')
    fonte('bold', 10.5)
    pdf.text(limpar(x.vtr.prefixo), L + 3, y)
    const lp = pdf.getTextWidth(limpar(x.vtr.prefixo))
    fonte('normal', 9.5, COR.cinza)
    pdf.text(limpar(x.vtr.modelo), L + 6 + lp, y)
    y += 6.5
    itens.forEach((it, i) => {
      garantir(alturas[i])
      pdf.setFillColor(...it.cor)
      pdf.roundedRect(L + 2, y - 3.4, 22, 4.6, 1, 1, 'F')
      fonte('bold', 7, [255, 255, 255])
      pdf.text(limpar(it.selo), L + 13, y - 0.3, { align: 'center' })
      fonte('normal', 9.5)
      linhasDe(it.texto, W - 28).forEach((t, k) => pdf.text(t, L + 27, y + k * 4.3))
      y += alturas[i]
    })
    y += 3
  }

  // Rodapé com numeração
  const total = pdf.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p)
    fonte('normal', 8, COR.cinza)
    pdf.text(limpar(`Missão Viaturas · EsFO · ${nomeMes(r.mes)}`), L, ALTURA - 8)
    pdf.text(`Página ${p} de ${total}`, L + W, ALTURA - 8, { align: 'right' })
  }

  return { blob: pdf.output('blob'), nome: `relatorio-mensal-viaturas-${r.mes}.pdf` }
}
