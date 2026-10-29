// Histórico da frota a partir dos relatórios enviados: ficha por viatura e relatório mensal.
import { INICIO_RELATORIOS, NIVEIS } from '../config'
import { avaliar, trocaDeOleo } from './vistoria'
import { naFrota, situacaoDe } from './situacao'
import { linhaGestao } from './gestao'
import { ordenarPendencias } from './categoria-pendencia'

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
  if (vtr.dataUltimaTroca && !lista.some((t) => t.data === vtr.dataUltimaTroca)) lista.push({ data: vtr.dataUltimaTroca, km: vtr.kmUltimaTroca })
  return lista.sort((a, b) => b.data.localeCompare(a.data))
}

// Registros da VTR nos relatórios enviados, do mais antigo ao mais novo: [{ data, reg }]
export function registrosDa(vtr, vistorias = []) {
  return vistorias
    .filter((v) => v.registros?.[vtr.id] && (!v.incluidas || v.incluidas.includes(vtr.id)))
    .sort((a, b) => a.data.localeCompare(b.data) || (a.enviadaEm || 0) - (b.enviadaEm || 0))
    .map((v) => ({ data: v.data, reg: v.registros[vtr.id] }))
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

export const ultimoDiaDoMes = (mes) => {
  const [a, m] = mes.split('-').map(Number)
  return `${mes}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`
}

// Relatório mensal: só as viaturas, contando a partir de INICIO_RELATORIOS (antes disso eram testes)
export function resumoMensal({ mes, hoje, vistorias, viaturas, ocorrencias }) {
  const de = `${mes}-01` < INICIO_RELATORIOS ? INICIO_RELATORIOS : `${mes}-01`
  const ate = ultimoDiaDoMes(mes) > hoje ? hoje : ultimoDiaDoMes(mes)
  const vazio = de > ate
  const noPeriodo = (d) => d && d >= de && d <= ate
  const doPeriodo = vazio ? [] : vistorias.filter((v) => noPeriodo(v.data))

  const porViatura = viaturas.filter(naFrota).map((vtr) => {
    const l = leiturasDa(vtr, doPeriodo)
    const kms = l.map((x) => x.km).filter(Boolean)
    // Alterações agrupadas: a mesma alteração em vários dias vira uma linha só
    const grupos = new Map()
    for (const x of l) {
      for (const a of x.achados) {
        const g = grupos.get(a.texto) || { texto: a.texto, nivel: a.nivel, vezes: 0, primeira: x.data, ultima: x.data }
        g.vezes += 1
        if (x.data < g.primeira) g.primeira = x.data
        if (x.data > g.ultima) g.ultima = x.data
        if (NIVEIS[a.nivel].ordem > NIVEIS[g.nivel].ordem) g.nivel = a.nivel
        grupos.set(a.texto, g)
      }
    }
    const alteracoes = [...grupos.values()].sort((a, b) => NIVEIS[b.nivel].ordem - NIVEIS[a.nivel].ordem || b.vezes - a.vezes)
    // Manutenção primeiro, depois as outras alterações
    const pendencias = ordenarPendencias(ocorrencias.filter((o) => o.viaturaId === vtr.id && o.status === 'aberta'))
    const kmInicial = kms.length ? Math.min(...kms) : null
    const kmFinal = kms.length ? Math.max(...kms) : null
    return {
      vtr,
      situacao: situacaoDe(vtr),
      vistorias: new Set(l.filter((x) => !x.naoVistoriada).map((x) => x.data)).size,
      naoVistoriada: l.filter((x) => x.naoVistoriada).length,
      kmInicial,
      kmFinal,
      rodado: kms.length ? kmFinal - kmInicial : 0,
      alteracoes,
      totalAlteracoes: alteracoes.reduce((n, g) => n + g.vezes, 0),
      pendencias,
      trocas: (vtr.trocas || []).filter((t) => noPeriodo(t.data)).sort((a, b) => a.data.localeCompare(b.data)),
      troca: trocaDeOleo(vtr, null, hoje),
      // Linha no formato da aba "Gestão" da planilha
      gestao: linhaGestao(vtr, registrosDa(vtr, doPeriodo), pendencias),
    }
  })

  const n = (s) => porViatura.filter((x) => x.situacao === s).length
  return {
    mes,
    de,
    ate,
    vazio,
    emAndamento: ate === hoje,
    frota: {
      ativas: porViatura.length - n('baixada'),
      baixadas: n('baixada'),
      kmRodados: porViatura.reduce((s, x) => s + x.rodado, 0),
      alteracoes: porViatura.reduce((s, x) => s + x.totalAlteracoes, 0),
      pendencias: porViatura.reduce((s, x) => s + x.pendencias.length, 0),
      trocas: porViatura.reduce((s, x) => s + x.trocas.length, 0),
      trocaAlerta: porViatura.filter((x) => x.troca.alerta).length,
    },
    porViatura,
  }
}

// ---------- Excluir um relatório enviado ----------

// O que sai junto com o relatório: pendências que ele abriu, fotos, e o KM das VTR volta ao anterior
export function planoExclusao(rel, { ocorrencias = [], viaturas = [], vistorias = [] }) {
  const ids = rel.incluidas || Object.keys(rel.registros || {})
  const pend = ocorrencias.filter((o) =>
    o.relatorioId
      ? o.relatorioId === rel.id
      : // Pendências antigas (sem o vínculo): mesmo dia, mesma pessoa e mesma VTR
        o.abertaEm === rel.data && o.abertaPor === rel.enviadaPor && ids.includes(o.viaturaId),
  )
  const fotos = ids.flatMap((id) => rel.registros?.[id]?.fotos || [])
  const kms = {}
  for (const id of ids) {
    const reg = rel.registros?.[id]
    const vtr = viaturas.find((v) => v.id === id)
    if (!reg?.km || !vtr || Number(vtr.kmAtual) !== Number(reg.km)) continue
    // Maior KM dessa VTR nos outros relatórios
    const outros = vistorias
      .filter((v) => v.id !== rel.id && (v.incluidas || Object.keys(v.registros || {})).includes(id))
      .map((v) => Number(v.registros?.[id]?.km) || 0)
    const anterior = Math.max(0, ...outros)
    if (anterior && anterior < Number(reg.km)) kms[id] = anterior
  }
  return { ocorrencias: pend, fotos, kms }
}
