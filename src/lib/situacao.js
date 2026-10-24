// Situação da viatura (ativa, em manutenção, baixada) com o motivo registrado.
// Campos gravados na viatura: motivoSituacao, previsaoRetorno, situacaoDesde, situacaoPor.

import { SITUACOES } from '../config'
import { dataBR } from './formato'

const CAMPOS = ['motivoSituacao', 'previsaoRetorno', 'situacaoDesde', 'situacaoPor']

// Devolve a viatura com a nova situação. Voltando a ativa, os dados do motivo saem.
export function comSituacao(vtr, nova, { motivo = '', previsao = '' } = {}, usuario, hoje) {
  const v = { ...vtr, situacao: nova }
  for (const c of CAMPOS) delete v[c]
  if (nova === 'ativa') return v
  v.motivoSituacao = motivo.trim()
  if (previsao) v.previsaoRetorno = previsao
  // Só editando o motivo, a data e quem baixou continuam os mesmos
  const mesma = (vtr.situacao || 'ativa') === nova
  v.situacaoDesde = (mesma && vtr.situacaoDesde) || hoje
  const por = usuario ? `${usuario.posto || ''} ${usuario.nome || ''}`.trim() : ''
  const porAntes = mesma && vtr.situacaoPor
  if (porAntes || por) v.situacaoPor = porAntes || por
  return v
}

// "Em manutenção: troca das pastilhas (retorno prev. 30/10/2026)"
export function textoSituacao(v, { rotulo = true } = {}) {
  const s = v.situacao || 'ativa'
  if (s === 'ativa') return ''
  const partes = [rotulo ? SITUACOES[s] : '', v.motivoSituacao].filter(Boolean).join(': ')
  return v.previsaoRetorno ? `${partes} (retorno prev. ${dataBR(v.previsaoRetorno)})` : partes
}
