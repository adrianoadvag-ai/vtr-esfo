// PDF do relatório mensal (para o coordenador e o comando)
import { SITUACOES } from '../config'
import { dataBR, dataCurta, km } from './formato'
import { nomeMes } from './frota'

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

export async function gerarPdfMensal({ resumo: r, brasoes, geradoPor, hoje }) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const L = 15
  const W = 180
  const ALTURA = 297
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
  const paragrafo = (t, cor = COR.tinta) => {
    fonte('normal', 10, cor)
    const ls = linhasDe(t, W)
    garantir(ls.length * 4.8)
    ls.forEach((x, i) => pdf.text(x, L, y + i * 4.8))
    y += ls.length * 4.8 + 1
  }

  // Tabela simples: colunas com largura em mm; repete o cabeçalho ao virar a página
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
  const mes = nomeMes(r.mes)
  pdf.text(nomeMes(r.mes, true), L + W / 2, y + 20.5, { align: 'center' })
  y += altB + 4
  pdf.setDrawColor(...COR.ouro)
  pdf.setLineWidth(1)
  pdf.line(L, y, L + W, y)
  y += 6
  fonte('normal', 9, COR.cinza)
  const parcial = r.dias.length && r.dias.at(-1) === hoje ? ` (mês em andamento, dados até ${dataBR(hoje)})` : ''
  pdf.text(limpar(`Gerado em ${dataBR(hoje)}${geradoPor ? ` por ${geradoPor}` : ''}${parcial}`), L, y)
  y += 6

  // Números do mês
  const numeros = [
    [`${r.diasComRelatorio}/${r.diasContados}`, 'dias de missão com relatório'],
    [r.totalRelatorios, 'relatórios enviados'],
    [r.totalAlteracoes, 'alterações registradas'],
    [r.trocas.length, 'trocas de óleo'],
    [r.abertasNoMes.length, 'pendências abertas no mês'],
    [r.resolvidasNoMes.length, 'pendências resolvidas no mês'],
    [r.emAberto.length, 'pendências em aberto hoje'],
    [r.porViatura.filter((x) => (x.vtr.situacao || 'ativa') !== 'ativa').length, 'VTR em manutenção ou baixadas'],
  ]
  const larg = (W - 3 * 4) / 4
  numeros.forEach(([n, rot], i) => {
    const col = i % 4
    const lin = Math.floor(i / 4)
    const x = L + col * (larg + 4)
    const yy = y + lin * 20
    pdf.setFillColor(...COR.fundo)
    pdf.roundedRect(x, yy, larg, 17, 1.5, 1.5, 'F')
    fonte('bold', 16)
    pdf.text(String(n), x + 3, yy + 8)
    fonte('normal', 8, COR.cinza)
    linhasDe(rot, larg - 6).forEach((t, k) => pdf.text(t, x + 3, yy + 12.2 + k * 3.4))
  })
  y += 40 + 4

  if (r.diasSemRelatorio.length) {
    tituloSecao(`Dias sem relatório (${r.diasSemRelatorio.length})`)
    paragrafo(r.diasSemRelatorio.map(dataCurta).join(', '), COR.critico)
  }

  tituloSecao('Cumprimento da escala')
  tabela(
    [
      { titulo: 'Dia', w: 29 },
      { titulo: 'Responsável', w: 36 },
      { titulo: 'Auxiliar', w: 30 },
      { titulo: 'Supervisor', w: 30 },
      { titulo: 'Enviado por', w: 43 },
      { titulo: 'VTR', w: 12, direita: true },
    ],
    r.porDia.map((d) => [dataCurta(d.dia), d.escalados.join(', ') || '-', d.auxiliares.join(', ') || '-', d.supervisor || '-', d.relatorios ? d.enviadoPor.join(', ') : d.aguardando ? 'Hoje, aguardando' : 'Sem relatório', d.relatorios ? String(d.viaturas) : '-']),
    { cores: (li, ci) => (ci === 4 && !r.porDia[li].relatorios && !r.porDia[li].aguardando ? COR.critico : null) },
  )

  tituloSecao('Viaturas no mês')
  tabela(
    [
      { titulo: 'VTR', w: 18 },
      { titulo: 'Modelo', w: 40 },
      { titulo: 'Situação', w: 28 },
      { titulo: 'Vistorias', w: 18, direita: true },
      { titulo: 'Alterações', w: 20, direita: true },
      { titulo: 'KM no mês', w: 36, direita: true },
      { titulo: 'Rodado', w: 20, direita: true },
    ],
    r.porViatura.map((x) => [
      x.vtr.prefixo,
      x.vtr.modelo,
      SITUACOES[x.vtr.situacao || 'ativa'],
      String(x.vistorias),
      String(x.alteracoes),
      x.kmInicial ? `${km(x.kmInicial)} - ${km(x.kmFinal)}` : '-',
      x.kmInicial ? km(x.kmFinal - x.kmInicial) : '-',
    ]),
    { cores: (li, ci) => (ci === 4 && r.porViatura[li].alteracoes ? COR.atencao : null) },
  )

  const recorrentes = r.porViatura.filter((x) => x.recorrentes.length)
  if (recorrentes.length) {
    tituloSecao('Alterações mais frequentes')
    for (const x of recorrentes) paragrafo(`${x.vtr.prefixo} (${x.vtr.modelo}): ${x.recorrentes.map((c) => `${c.item} ${c.vezes}x`).join(', ')}`)
  }

  const linhaPend = (o) => [o.prefixo, o.texto, dataBR(o.abertaEm), o.status === 'resolvida' ? `Resolvida ${dataBR(o.resolvidaEm)}` : 'Em aberto']
  const colPend = [
    { titulo: 'VTR', w: 18 },
    { titulo: 'Alteração', w: 90 },
    { titulo: 'Aberta em', w: 24 },
    { titulo: 'Situação', w: 48 },
  ]
  if (r.emAberto.length) {
    tituloSecao(`Pendências em aberto hoje (${r.emAberto.length})`)
    tabela(colPend, r.emAberto.map(linhaPend), { cores: (_l, ci) => (ci === 3 ? COR.critico : null) })
  }
  if (r.resolvidasNoMes.length) {
    tituloSecao(`Pendências resolvidas no mês (${r.resolvidasNoMes.length})`)
    tabela(
      [...colPend.slice(0, 3), { titulo: 'Solução', w: 48 }],
      r.resolvidasNoMes.map((o) => [o.prefixo, o.texto, dataBR(o.abertaEm), `${dataBR(o.resolvidaEm)}${o.notaResolucao ? ` - ${o.notaResolucao}` : ''}`]),
    )
  }

  tituloSecao('Trocas de óleo no mês')
  if (r.trocas.length) {
    tabela(
      [
        { titulo: 'Data', w: 26 },
        { titulo: 'VTR', w: 50 },
        { titulo: 'KM', w: 30, direita: true },
        { titulo: 'Registrada por', w: 74 },
      ],
      r.trocas.map((t) => [dataBR(t.data), `${t.vtr.prefixo} ${t.vtr.modelo}`, t.km ? km(t.km) : '-', t.por || '-']),
    )
  } else paragrafo('Nenhuma troca registrada no app neste mês.', COR.cinza)

  // Rodapé com numeração
  const total = pdf.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p)
    fonte('normal', 8, COR.cinza)
    pdf.text(limpar(`Missão Viaturas · EsFO · ${mes}`), L, ALTURA - 8)
    pdf.text(`Página ${p} de ${total}`, L + W, ALTURA - 8, { align: 'right' })
  }

  return { blob: pdf.output('blob'), nome: `relatorio-mensal-viaturas-${r.mes}.pdf` }
}
