// Lê o texto do relatório (formato do WhatsApp) e o transforma em seções,
// para mostrar formatado no app e gerar o PDF. Funciona também com relatórios antigos.

const OK = /^(S\/A|Normal|Operante|VTR nova)$/i
const NEUTROS = /^(KM|Combustível|Arla|Próx\. troca|Data da próx\. troca|Última troca|Situação)$/i

export function estruturar(texto = '') {
  const r = { saudacao: '', titulo: '', alteracoes: [], pendencias: [], vtrs: [], limpeza: '', responsaveis: [], supervisor: [] }
  let secao = null
  let vtr = null
  for (const bruta of texto.split('\n')) {
    const l = bruta.trim()
    if (!l) continue
    let m
    if (l.startsWith('Com licença')) r.saudacao = l
    else if (l.startsWith('Segue o relatório')) r.titulo = l
    else if (/\*Alterações/.test(l)) secao = 'alt'
    else if (/\*Pendências em aberto/.test(l)) secao = 'pend'
    else if ((m = l.match(/^(\d+)\.\s+(.+?)\s+-\s+(.+)$/))) {
      secao = 'vtr'
      vtr = { numero: m[1], prefixo: m[2], modelo: m[3], linhas: [] }
      r.vtrs.push(vtr)
    } else if (l.startsWith('Condições gerais de limpeza')) {
      r.limpeza = l.replace(/^Condições gerais de limpeza:\s*/, '')
      secao = null
    } else if (l.startsWith('Responsável do dia')) secao = 'resp'
    else if (/^Supervisor:?$/.test(l)) secao = 'sup'
    else if (secao === 'sup') r.supervisor.push(l)
    else if (secao === 'alt' && l.startsWith('- ')) {
      const t = l.slice(2)
      const nivel = /^CRÍTICO/i.test(t) ? 'critico' : /^ATENÇÃO/i.test(t) ? 'atencao' : 'info'
      r.alteracoes.push({ nivel, texto: t.replace(/^(CRÍTICO|ATENÇÃO|INFORMATIVO)\s*·\s*/i, '') })
    } else if (secao === 'pend' && l.startsWith('- ')) r.pendencias.push(l.slice(2))
    else if (secao === 'vtr' && l.startsWith('* ')) {
      const t = l.slice(2)
      const i = t.indexOf(':')
      const rotulo = i > 0 ? t.slice(0, i).trim() : t
      const valor = i > 0 ? t.slice(i + 1).trim() : ''
      const destaque = rotulo !== 'Obs' && !NEUTROS.test(rotulo) && valor && !OK.test(valor) && !/: S\/A$/.test(t)
      vtr.linhas.push({ rotulo, valor, destaque })
    } else if (secao === 'resp') r.responsaveis.push(l)
  }
  return r
}

// ---------- PDF ----------

function carregarImagem(src) {
  return new Promise((ok) => {
    const i = new Image()
    i.onload = () => ok(i)
    i.onerror = () => ok(null)
    i.src = src
  })
}

// O PDF usa a fonte Helvetica, que não tem emojis nem alguns sinais: troca por equivalentes
const limpar = (s = '') =>
  s
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .trim()

export async function gerarPdf({ texto, data, enviadaEm, enviadaPor, brasoes, nomeArquivo }) {
  const { jsPDF } = await import('jspdf')
  const r = estruturar(texto)
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const L = 15
  const W = 180
  const ALTURA = 297
  const COR = { tinta: [14, 26, 43], cinza: [74, 90, 112], azul: [0, 69, 138], ouro: [245, 197, 49], critico: [180, 35, 24], atencao: [168, 88, 0], fundo: [237, 241, 246] }
  let y = 14

  const novaPagina = () => {
    pdf.addPage()
    y = 15
  }
  const garantir = (h) => {
    if (y + h > ALTURA - 16) novaPagina()
  }
  const fonte = (estilo, tam, cor = COR.tinta) => {
    pdf.setFont('helvetica', estilo)
    pdf.setFontSize(tam)
    pdf.setTextColor(...cor)
  }
  const linhasDe = (t, larg) => pdf.splitTextToSize(limpar(t), larg)

  // Cabeçalho com os brasões
  const [imgApmg, imgEsfo] = await Promise.all((brasoes || []).map(carregarImagem))
  const altB = 24
  if (imgApmg) pdf.addImage(imgApmg, 'PNG', L, y, (altB * imgApmg.width) / imgApmg.height, altB)
  if (imgEsfo) {
    const w = (altB * imgEsfo.width) / imgEsfo.height
    pdf.addImage(imgEsfo, 'PNG', L + W - w, y, w, altB)
  }
  fonte('bold', 15, COR.azul)
  pdf.text('RELATÓRIO DIÁRIO DE VIATURAS', L + W / 2, y + 9, { align: 'center' })
  fonte('normal', 10, COR.cinza)
  pdf.text('Escola de Formação de Oficiais · APMG · PMPR', L + W / 2, y + 15, { align: 'center' })
  const [a, m, d] = data.split('-')
  const quando = enviadaEm ? new Date(enviadaEm) : null
  const hora = quando ? ` às ${String(quando.getHours()).padStart(2, '0')}:${String(quando.getMinutes()).padStart(2, '0')}` : ''
  pdf.text(`${d}/${m}/${a}${hora}${enviadaPor ? ` · ${limpar(enviadaPor)}` : ''}`, L + W / 2, y + 20.5, { align: 'center' })
  y += altB + 4
  pdf.setDrawColor(...COR.ouro)
  pdf.setLineWidth(1)
  pdf.line(L, y, L + W, y)
  y += 7

  if (r.titulo) {
    fonte('normal', 10.5)
    for (const t of linhasDe(r.titulo, W)) {
      pdf.text(t, L, y)
      y += 5
    }
    y += 2
  }

  const tituloSecao = (t) => {
    garantir(12)
    fonte('bold', 12, COR.azul)
    pdf.text(t, L, y)
    y += 6
  }

  if (r.alteracoes.length) {
    tituloSecao(`Alterações (${r.alteracoes.length})`)
    for (const x of r.alteracoes) {
      const linhas = linhasDe(x.texto, W - 26)
      garantir(linhas.length * 4.8 + 2)
      const cor = x.nivel === 'critico' ? COR.critico : COR.atencao
      pdf.setFillColor(...cor)
      pdf.roundedRect(L, y - 3.6, 22, 5, 1.2, 1.2, 'F')
      fonte('bold', 8, [255, 255, 255])
      pdf.text(x.nivel === 'critico' ? 'CRÍTICO' : 'ATENÇÃO', L + 11, y - 0.2, { align: 'center' })
      fonte('normal', 10)
      linhas.forEach((t, i) => pdf.text(t, L + 26, y + i * 4.8))
      y += linhas.length * 4.8 + 2
    }
    y += 3
  }

  if (r.pendencias.length) {
    tituloSecao(`Pendências em aberto (${r.pendencias.length})`)
    fonte('normal', 10)
    for (const p of r.pendencias) {
      const linhas = linhasDe(`- ${p}`, W)
      garantir(linhas.length * 4.8)
      linhas.forEach((t, i) => pdf.text(t, L, y + i * 4.8))
      y += linhas.length * 4.8 + 1
    }
    y += 3
  }

  tituloSecao(`Viaturas (${r.vtrs.length})`)
  const col = (W - 8) / 2
  for (const v of r.vtrs) {
    const normais = v.linhas.filter((x) => x.rotulo !== 'Obs')
    const obs = v.linhas.find((x) => x.rotulo === 'Obs')
    // Mede a altura do bloco antes de desenhar (para não partir a viatura entre páginas)
    fonte('normal', 9.5)
    const metade = Math.ceil(normais.length / 2)
    const colunas = [normais.slice(0, metade), normais.slice(metade)]
    const altCol = colunas.map((c) => c.reduce((h, x) => h + linhasDe(`${x.rotulo}: ${x.valor}`, col).length * 4.3, 0))
    const obsLinhas = obs ? linhasDe(`Obs: ${obs.valor}`, W - 6) : []
    const alt = 9 + Math.max(...altCol, 0) + (obsLinhas.length ? obsLinhas.length * 4.3 + 2 : 0) + 3
    garantir(alt)

    pdf.setFillColor(...COR.fundo)
    pdf.roundedRect(L, y - 4.5, W, 7, 1.2, 1.2, 'F')
    fonte('bold', 11)
    pdf.text(`${v.numero}. ${limpar(v.prefixo)}`, L + 3, y)
    const larguraPrefixo = pdf.getTextWidth(`${v.numero}. ${limpar(v.prefixo)}`)
    fonte('normal', 10, COR.cinza)
    pdf.text(limpar(v.modelo), L + 6 + larguraPrefixo, y)
    y += 7

    const y0 = y
    colunas.forEach((c, ci) => {
      let yc = y0
      for (const x of c) {
        const linhas = linhasDe(`${x.rotulo}: ${x.valor}`, col)
        fonte(x.destaque ? 'bold' : 'normal', 9.5, x.destaque ? COR.critico : COR.tinta)
        linhas.forEach((t, i) => pdf.text(t, L + 3 + ci * (col + 8), yc + i * 4.3))
        yc += linhas.length * 4.3
      }
    })
    y = y0 + Math.max(...altCol, 0)
    if (obsLinhas.length) {
      y += 1
      fonte('italic', 9.5, COR.cinza)
      obsLinhas.forEach((t, i) => pdf.text(t, L + 3, y + i * 4.3))
      y += obsLinhas.length * 4.3
    }
    y += 4
  }

  garantir(24)
  y += 2
  pdf.setDrawColor(...COR.fundo)
  pdf.setLineWidth(0.4)
  pdf.line(L, y, L + W, y)
  y += 6
  if (r.limpeza) {
    fonte('bold', 10)
    pdf.text('Condições gerais de limpeza:', L, y)
    const lw = pdf.getTextWidth('Condições gerais de limpeza: ')
    fonte('normal', 10)
    linhasDe(r.limpeza, W - lw).forEach((t, i) => pdf.text(t, L + lw, y + i * 4.8))
    y += 8
  }
  if (r.responsaveis.length) {
    garantir(6 + r.responsaveis.length * 5)
    fonte('bold', 10)
    pdf.text('Responsável do dia:', L, y)
    y += 5
    fonte('normal', 10)
    for (const n of r.responsaveis) {
      pdf.text(limpar(n), L, y)
      y += 5
    }
  }
  if (r.supervisor.length) {
    garantir(6 + r.supervisor.length * 5)
    y += 2
    fonte('bold', 10)
    pdf.text('Supervisor:', L, y)
    y += 5
    fonte('normal', 10)
    for (const n of r.supervisor) {
      pdf.text(limpar(n), L, y)
      y += 5
    }
  }

  // Rodapé com numeração
  const total = pdf.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p)
    fonte('normal', 8, COR.cinza)
    pdf.text('Missão Viaturas · EsFO', L, ALTURA - 8)
    pdf.text(`Página ${p} de ${total}`, L + W, ALTURA - 8, { align: 'right' })
  }

  const blob = pdf.output('blob')
  return { blob, nome: nomeArquivo }
}
