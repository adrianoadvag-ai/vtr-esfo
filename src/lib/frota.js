// Histórico da frota a partir dos relatórios enviados: ficha por viatura e relatório mensal.
import { ESCALA } from '../config'
import { diaDaSemana, segundaDa, somarDias } from './formato'
import { avaliar } from './vistoria'

// Achados que não são defeito da viatura (resolvem-se sozinhos ou dependem do cadastro atual)
const NAO_RECORRENTES = new Set(['combustivel', 'arla', 'troca'])

// Uma linha por relatório enviado em que a viatura apareceu, do mais antigo ao mais novo
export function leiturasDa(vtr, vistorias = []) {
  const lista = []
  for (const v of vistorias) {
    const reg = v.registros?.[vtr.id]
    if (!reg) continue
    // Só conta o que entrou no relatório (as incompletas foram para a rodada seguinte)
    if (v.incluidas && !v.incluidas.includes(vtr.id)) continue
    const a = reg.naoVistoriada ? { achados: [] } : avaliar(vtr, reg, v.data)
    const achados = a.achados.filter((x) => !NAO_RECORRENTES.has(x.itemId))
    lista.push({
      data: v.data,
      relatorioId: v.id,
      enviadaEm: v.enviadaEm || 0,
      km: reg.naoVistoriada ? null : Number(reg.km) || null,
      comb: reg.comb,
      por: reg.por || v.enviadaPor || '',
      naoVistoriada: Boolean(reg.naoVistoriada),
      motivo: reg.motivoNao || '',
      obs: reg.obs || '',
      achados,
    })
  }
  return lista.sort((a, b) => a.data.localeCompare(b.data) || a.enviadaEm - b.enviadaEm)
}

// Itens que mais apresentaram alteração, com a última vez
export function recorrencias(leituras) {
  const mapa = new Map()
  for (const l of leituras) {
    for (const x of l.achados) {
      const r = mapa.get(x.itemId) || { itemId: x.itemId, item: x.item, vezes: 0, ultima: '', nivel: x.nivel, textos: new Set() }
      r.vezes += 1
      if (l.data >= r.ultima) r.ultima = l.data
      r.textos.add(x.texto.replace(/^[^:]+:\s*/, ''))
      mapa.set(x.itemId, r)
    }
  }
  return [...mapa.values()].map((r) => ({ ...r, textos: [...r.textos] })).sort((a, b) => b.vezes - a.vezes || b.ultima.localeCompare(a.ultima))
}

// KM por dia (o maior registrado no dia), para o gráfico
export function serieKm(leituras) {
  const porDia = new Map()
  for (const l of leituras) if (l.km) porDia.set(l.data, Math.max(porDia.get(l.data) || 0, l.km))
  return [...porDia.entries()].map(([data, km]) => ({ data, km })).sort((a, b) => a.data.localeCompare(b.data))
}

// Trocas de óleo registradas (as antigas só têm a data da última troca)
export function trocasDa(vtr) {
  const lista = [...(vtr.trocas || [])]
  if (vtr.dataUltimaTroca && !lista.some((t) => t.data === vtr.dataUltimaTroca)) lista.push({ data: vtr.dataUltimaTroca })
  return lista.sort((a, b) => b.data.localeCompare(a.data))
}

// ---------- Relatório mensal ----------

export const NOMES_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const nomeMes = (mes, maiuscula = false) => {
  const [a, m] = mes.split('-')
  const n = NOMES_MESES[Number(m) - 1]
  return `${maiuscula ? n[0].toUpperCase() + n.slice(1) : n} de ${a}`
}
export const mesDe = (iso) => iso.slice(0, 7)
export function mesAnterior(mes) {
  const [a, m] = mes.split('-').map(Number)
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`
}
export function mesSeguinte(mes) {
  const [a, m] = mes.split('-').map(Number)
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`
}

// Dias de missão (segunda a sexta) do mês, até hoje
export function diasDeMissao(mes, hoje) {
  const dias = []
  for (let d = `${mes}-01`; mesDe(d) === mes && d <= hoje; d = somarDias(d, 1)) {
    if (ESCALA.dias.includes(diaDaSemana(d))) dias.push(d)
  }
  return dias
}

// Segundas-feiras das semanas que tocam o mês (para carregar as escalas)
export function semanasDoMes(mes) {
  const semanas = new Set()
  for (let d = `${mes}-01`; mesDe(d) === mes; d = somarDias(d, 1)) semanas.add(segundaDa(d))
  return [...semanas]
}

export function resumoMensal({ mes, hoje, vistorias, viaturas, ocorrencias, escalas }) {
  const doMes = vistorias.filter((v) => mesDe(v.data) === mes).sort((a, b) => a.data.localeCompare(b.data) || (a.enviadaEm || 0) - (b.enviadaEm || 0))
  const dias = diasDeMissao(mes, hoje)

  const porDia = dias.map((dia) => {
    const rels = doMes.filter((v) => v.data === dia)
    const esc = escalas?.[segundaDa(dia)]?.dias?.[dia]
    const vtrs = new Set(rels.flatMap((r) => r.incluidas || Object.keys(r.registros || {})))
    return {
      dia,
      relatorios: rels.length,
      enviadoPor: [...new Set(rels.map((r) => r.enviadaPor).filter(Boolean))],
      escalados: (esc?.responsaveis || []).filter(Boolean).map((p) => p.nome).filter(Boolean),
      supervisor: esc?.supervisor?.nome || '',
      viaturas: vtrs.size,
      // Hoje ainda pode chegar o relatório: não conta como falta
      aguardando: dia === hoje && rels.length === 0,
    }
  })

  const porViatura = viaturas.map((vtr) => {
    const l = leiturasDa(vtr, doMes)
    const kms = l.map((x) => x.km).filter(Boolean)
    const alteracoes = l.reduce((n, x) => n + x.achados.length, 0)
    return {
      vtr,
      vistorias: new Set(l.filter((x) => !x.naoVistoriada).map((x) => x.data)).size,
      naoVistoriada: l.filter((x) => x.naoVistoriada).length,
      alteracoes,
      kmInicial: kms.length ? Math.min(...kms) : null,
      kmFinal: kms.length ? Math.max(...kms) : null,
      recorrentes: recorrencias(l).slice(0, 3),
    }
  })

  const abertasNoMes = ocorrencias.filter((o) => mesDe(o.abertaEm) === mes)
  const resolvidasNoMes = ocorrencias.filter((o) => o.status === 'resolvida' && o.resolvidaEm && mesDe(o.resolvidaEm) === mes)
  const emAberto = ocorrencias.filter((o) => o.status === 'aberta')
  const trocas = viaturas.flatMap((vtr) => (vtr.trocas || []).filter((t) => mesDe(t.data) === mes).map((t) => ({ ...t, vtr })))
  trocas.sort((a, b) => a.data.localeCompare(b.data))

  return {
    mes,
    dias,
    porDia,
    diasComRelatorio: porDia.filter((d) => d.relatorios > 0).length,
    diasContados: porDia.filter((d) => !d.aguardando).length,
    diasSemRelatorio: porDia.filter((d) => d.relatorios === 0 && !d.aguardando).map((d) => d.dia),
    totalRelatorios: doMes.length,
    totalAlteracoes: porViatura.reduce((n, x) => n + x.alteracoes, 0),
    porViatura,
    abertasNoMes,
    resolvidasNoMes,
    emAberto,
    trocas,
  }
}
