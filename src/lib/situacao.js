// Situação da viatura (300, uso interno, uso exclusivo, baixada, fora da frota), como na planilha de gestão.
// Campos gravados na viatura: motivoSituacao, previsaoRetorno, situacaoDesde, situacaoPor e,
// na baixa, ordemServico, numeroOS e oficina.

import { SITUACAO_INFO, SITUACOES } from '../config'
import { dataBR } from './formato'

const CAMPOS = ['motivoSituacao', 'previsaoRetorno', 'situacaoDesde', 'situacaoPor', 'ordemServico', 'numeroOS', 'oficina']

// Situação de uma VTR. 'manutencao' (antes de 24/10/2026) passa a ser 'baixada', como na planilha.
export function situacaoDe(v) {
  const s = v?.situacao || 'ativa'
  if (s === 'manutencao') return 'baixada'
  return SITUACOES[s] ? s : 'ativa'
}
export const infoSituacao = (v) => SITUACAO_INFO[situacaoDe(v)]
// Ainda pertence à EsFO (fora da frota sai das listas, da vistoria e dos relatórios)
export const naFrota = (v) => situacaoDe(v) !== 'foraDaFrota'
// Baixada: fora de serviço, entra no relatório com o motivo
export const baixada = (v) => situacaoDe(v) === 'baixada'
// Selo da situação: rótulo e cor
export const seloSituacao = (v) => ({ texto: SITUACOES[situacaoDe(v)], nivel: infoSituacao(v).selo })

// Devolve a viatura com a nova situação. Voltando a 300, os dados do motivo saem.
export function comSituacao(vtr, nova, { motivo = '', previsao = '', ordemServico = '', numeroOS = '', oficina = '' } = {}, usuario, hoje) {
  const v = { ...vtr, situacao: nova }
  for (const c of CAMPOS) delete v[c]
  if (nova === 'ativa') return v
  if (motivo.trim()) v.motivoSituacao = motivo.trim()
  if (previsao) v.previsaoRetorno = previsao
  if (SITUACAO_INFO[nova]?.os) {
    if (ordemServico) v.ordemServico = ordemServico
    if (numeroOS.trim()) v.numeroOS = numeroOS.trim()
    if (oficina.trim()) v.oficina = oficina.trim()
  }
  // Só editando o motivo, a data e quem mudou continuam os mesmos
  const mesma = situacaoDe(vtr) === nova
  v.situacaoDesde = (mesma && vtr.situacaoDesde) || hoje
  const por = usuario ? `${usuario.posto || ''} ${usuario.nome || ''}`.trim() : ''
  const porAntes = mesma && vtr.situacaoPor
  if (porAntes || por) v.situacaoPor = porAntes || por
  return v
}

// "OS: Em andamento nº 307236 · Ford Slavieiro"
export function textoOS(v) {
  const os = [v.ordemServico && `OS: ${v.ordemServico}`, v.numeroOS && `nº ${v.numeroOS}`].filter(Boolean).join(' ')
  return [os, v.oficina].filter(Boolean).join(' · ')
}

// "Baixada: sem freio (retorno prev. 30/10/2026)"
export function textoSituacao(v, { rotulo = true } = {}) {
  const s = situacaoDe(v)
  if (s === 'ativa') return ''
  const partes = [rotulo ? SITUACOES[s] : '', v.motivoSituacao].filter(Boolean).join(': ')
  return v.previsaoRetorno ? `${partes} (retorno prev. ${dataBR(v.previsaoRetorno)})` : partes
}

// "desde 24/10/2026 por Cad. Romeiro; OS: Em andamento · Ford Slavieiro; retorno prev. 30/10/2026"
export function detalheSituacao(v) {
  const desde = [v.situacaoDesde && `desde ${dataBR(v.situacaoDesde)}`, v.situacaoPor && `por ${v.situacaoPor}`].filter(Boolean).join(' ')
  return [desde, textoOS(v), v.previsaoRetorno && `retorno prev. ${dataBR(v.previsaoRetorno)}`].filter(Boolean).join('; ')
}

// Linha completa para relatórios: "BAIXADA · sem freio (desde 19/10/2026 por Cad. Vinícius; OS: Em andamento · Ford Slavieiro)"
export function linhaSituacao(v, { maiuscula = true } = {}) {
  const s = situacaoDe(v)
  const nome = maiuscula ? SITUACOES[s].toUpperCase() : s === 'ativa' ? SITUACOES[s] : SITUACOES[s].toLowerCase()
  const motivo = v.motivoSituacao || (SITUACAO_INFO[s].motivo ? 'motivo não informado' : '')
  const d = detalheSituacao(v)
  return `${nome}${motivo ? ` · ${motivo}` : ''}${d ? ` (${d})` : ''}`
}
