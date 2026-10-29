// Linha de cada VTR no formato da aba "Gestão" da planilha "Gestão das Viaturas EsFO",
// usada no relatório mensal (tela, PDF e arquivo .xlsx). Mesma ordem e nomes das colunas da planilha.
import { SITUACOES, TROCA } from '../config'
import { km } from './formato'
import { situacaoDe } from './situacao'
import { textoPendencia } from './pendencia'
import { ehManutencao } from './categoria-pendencia'

// Combustível com os nomes da planilha
const COMB_PLANILHA = { diesel: 'DIESEL S10', gasolina: 'GAS', flex: 'GAS/ETANOL' }

// w: largura no PDF (mm, A4 em paisagem, 277 mm úteis); x: largura no .xlsx (caracteres)
export const COLUNAS_GESTAO = [
  { chave: 'data', titulo: 'Data da conferência', w: 14, x: 13 },
  { chave: 'prefixo', titulo: 'PREFIXO', w: 11, x: 9 },
  { chave: 'km', titulo: 'Km atual', w: 11, x: 10 },
  { chave: 'proxTroca', titulo: 'Próxima Troca de Óleo', w: 15, x: 18 },
  { chave: 'modelo', titulo: 'Modelo/Placa', w: 23, x: 24 },
  { chave: 'comb', titulo: 'COMB', w: 14, x: 12 },
  { chave: 'cartao', titulo: 'Cartão Prime', w: 9, x: 11 },
  { chave: 'status', titulo: 'STATUS', w: 12, x: 13 },
  { chave: 'troca', titulo: 'Troca de Óleo Data / KM', w: 13, x: 16 },
  { chave: 'pneus', titulo: 'Condição Pneus', w: 12, x: 12 },
  { chave: 'pastilhas', titulo: 'Condição Pastilhas', w: 12, x: 13 },
  { chave: 'fluidoFreio', titulo: 'Fluido de freio', w: 10, x: 11 },
  { chave: 'cambio', titulo: 'Óleo caixa de câmbio', w: 10, x: 12 },
  { chave: 'palhetas', titulo: 'Palhetas do vidro', w: 10, x: 11 },
  { chave: 'filtroAC', titulo: 'Filtro do A/C', w: 9, x: 10 },
  { chave: 'os', titulo: 'Ordem de Serviço', w: 22, x: 17 },
  { chave: 'numeroOS', titulo: 'Nº OS', w: 7, x: 9 },
  { chave: 'oficina', titulo: 'Oficina responsável pela manutenção', w: 14, x: 18 },
  { chave: 'detalhamento', titulo: 'DETALHAMENTO ATUALIZADO', w: 49, x: 60 },
]

// 2026-10-19 -> 19/10/2026 (a planilha usa o ano com 4 dígitos)
const data4 = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')
const data2 = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : '')

// Valor de um item na última vistoria do período em que ele foi marcado
function ultimoItem(regs, id, ler) {
  for (let i = regs.length - 1; i >= 0; i--) {
    const v = ler(regs[i].reg.itens || {}, id)
    if (v) return v
  }
  return ''
}
const tique = (itens, id) => {
  const r = itens[id]
  if (!r?.estado) return ''
  return r.estado === 'alt' ? (r.alts?.length ? r.alts.join(', ') : 'Com alteração') : 'S/A'
}
const condicao = (itens, id) => itens[id]?.condicao || ''
// Vistorias anteriores a 24/10/2026: um item "Fluidos" só
const fluidoFreio = (itens) => {
  const novo = tique(itens, 'fluidoFreio')
  if (novo) return novo
  const f = itens.fluidos
  if (!f?.estado) return ''
  return f.estado === 'alt' && (f.alts || []).includes('Fluido de freio baixo') ? 'Baixo' : 'S/A'
}

// regs: [{ data, reg }] das vistorias do período em que a VTR entrou, do mais antigo ao mais novo
// pendencias: pendências abertas da VTR
export function linhaGestao(vtr, regs, pendencias = []) {
  const vistas = regs.filter((x) => !x.reg.naoVistoriada)
  const ultima = vistas.at(-1)
  const sit = situacaoDe(vtr)

  let proxTroca = '-'
  if (vtr.nova) proxTroca = `KM ${km(Number(vtr.kmRevisao) || TROCA.revisaoNovaKm)}`
  else {
    const p = [vtr.kmProxTroca && km(vtr.kmProxTroca), vtr.dataProxTroca && data2(vtr.dataProxTroca)].filter(Boolean)
    if (p.length) proxTroca = p.join(' ou ')
  }
  const troca = vtr.nova
    ? 'Nunca trocado'
    : vtr.dataUltimaTroca
      ? `${data4(vtr.dataUltimaTroca)}${vtr.kmUltimaTroca ? ` / ${km(vtr.kmUltimaTroca)}` : ''}`
      : '-'

  // Detalhamento: motivo da situação (se houver) e as pendências abertas, numeradas e com data
  const itens = []
  if (sit !== 'ativa' && vtr.motivoSituacao) itens.push(`${SITUACOES[sit]}: ${vtr.motivoSituacao}${vtr.situacaoDesde ? ` (${data2(vtr.situacaoDesde)})` : ''}`)
  // Manutenção primeiro (por data), depois as outras alterações (por data)
  const porData = (a, b) => (a.abertaEm || '').localeCompare(b.abertaEm || '')
  for (const p of [...pendencias.filter(ehManutencao).sort(porData), ...pendencias.filter((x) => !ehManutencao(x)).sort(porData)]) {
    itens.push(`${textoPendencia(p)}${p.abertaEm ? ` (${data2(p.abertaEm)})` : ''}`)
  }
  const detalhamento = itens.length ? itens.map((t, i) => `${i + 1}. ${t}`).join('\n') : '-'

  const baixada = sit === 'baixada'
  return {
    data: ultima ? data4(ultima.data) : '-',
    prefixo: vtr.prefixo,
    km: km(Number(ultima?.reg.km) || vtr.kmAtual) || '-',
    proxTroca,
    modelo: [String(vtr.modelo || '').toUpperCase(), vtr.placa].filter(Boolean).join('/'),
    comb: COMB_PLANILHA[vtr.combustivel] || String(vtr.combustivel || '').toUpperCase(),
    cartao: vtr.cartaoFinal ? `final ${vtr.cartaoFinal}` : '-',
    status: SITUACOES[sit],
    troca,
    pneus: ultimoItem(vistas, 'condPneus', condicao) || '-',
    pastilhas: ultimoItem(vistas, 'condPastilhas', condicao) || '-',
    fluidoFreio: ultimoItem(vistas, 'fluidoFreio', fluidoFreio) || '-',
    cambio: ultimoItem(vistas, 'cambio', tique) || '-',
    palhetas: ultimoItem(vistas, 'palhetas', tique) || '-',
    filtroAC: ultimoItem(vistas, 'filtroAC', tique) || '-',
    os: baixada ? (vtr.ordemServico || '-').toUpperCase() : 'SEM NECESSIDADE',
    numeroOS: (baixada && vtr.numeroOS) || '-',
    oficina: (baixada && vtr.oficina) || '-',
    detalhamento,
  }
}

// Valores em destaque (alteração, troca urgente, baixada)
export function destaqueGestao(chave, valor) {
  if (!valor || valor === '-') return null
  if (chave === 'status') return valor === SITUACOES.baixada ? 'critico' : valor === SITUACOES.ativa ? null : 'atencao'
  if (['pneus', 'pastilhas'].includes(chave)) return valor === 'Troca urgente' ? 'critico' : valor === 'Regular' ? 'atencao' : null
  if (['fluidoFreio', 'cambio', 'palhetas', 'filtroAC'].includes(chave)) return valor === 'S/A' ? null : 'atencao'
  return null
}
