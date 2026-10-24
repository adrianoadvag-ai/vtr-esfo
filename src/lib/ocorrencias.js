// Pendências: nascem das alterações da vistoria (com a descrição escrita pelo vistoriador no item)
// e das "outras pendências" anotadas na vistoria; ficam abertas até alguém resolver na tela Pendências.
import { avaliar } from './vistoria'

export { textoPendencia } from './pendencia'

// Pendências abertas de uma VTR, por item ({ itemId: pendência })
export function abertasPorItem(ocorrencias = [], vtrId) {
  return Object.fromEntries(ocorrencias.filter((o) => o.viaturaId === vtrId && o.status === 'aberta').map((o) => [o.itemId, o]))
}

// No envio: novas pendências e descrições atualizadas das que já estavam abertas
export function ocorrenciasDoDia({ data, viaturas, registros, abertas, por, relatorioId }) {
  const porChave = new Map(abertas.map((o) => [`${o.viaturaId}:${o.itemId}`, o]))
  const novas = []
  const atualizadas = []
  for (const v of viaturas) {
    const reg = registros[v.id]
    if (!reg) continue
    const a = avaliar(v, reg, data)
    for (const x of a.achados) {
      // Combustível baixo não vira pendência: resolve-se no próximo abastecimento
      if (x.itemId === 'combustivel' || x.itemId === 'arla') continue
      const chave = `${v.id}:${x.itemId}`
      const existente = porChave.get(chave)
      if (existente) {
        // Já aberta: o vistoriador pode ter atualizado a descrição
        if (x.nota && x.nota.trim() !== (existente.descricao || '').trim()) {
          atualizadas.push({ id: existente.id, descricao: x.nota.trim(), atualizadaEm: data, atualizadaPor: por })
        }
        continue
      }
      porChave.set(chave, {})
      novas.push({
        viaturaId: v.id,
        prefixo: v.prefixo,
        modelo: v.modelo,
        itemId: x.itemId,
        item: x.item,
        texto: x.texto,
        descricao: (x.nota || '').trim(),
        nivel: x.nivel,
        obs: reg.obs || '',
        abertaEm: data,
        abertaPor: por,
        status: 'aberta',
        // Relatório que abriu a pendência (se ele for excluído, ela sai junto)
        ...(relatorioId ? { relatorioId } : {}),
      })
    }
    // Pendências abertas (avulsas ou da planilha) que o vistoriador atualizou na vistoria
    for (const [id, texto] of Object.entries(reg.atualizar || {})) {
      const o = abertas.find((x) => x.id === id)
      if (o && texto.trim() && texto.trim() !== (o.descricao || o.texto || '').trim()) {
        atualizadas.push({ id, descricao: texto.trim(), atualizadaEm: data, atualizadaPor: por })
      }
    }
  }
  return { novas, atualizadas }
}
