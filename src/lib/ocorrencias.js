// Transforma as alterações do dia em ocorrências (pendências) que ficam abertas até serem resolvidas.
import { avaliar } from './vistoria'

export function ocorrenciasDoDia({ data, viaturas, registros, abertas, por }) {
  const chaves = new Set(abertas.map((o) => `${o.viaturaId}:${o.itemId}`))
  const novas = []
  for (const v of viaturas) {
    const reg = registros[v.id]
    if (!reg) continue
    const a = avaliar(v, reg, data)
    for (const x of a.achados) {
      // Combustível baixo não vira pendência: resolve-se no próximo abastecimento
      if (x.itemId === 'combustivel' || x.itemId === 'arla') continue
      const chave = `${v.id}:${x.itemId}`
      if (chaves.has(chave)) continue
      chaves.add(chave)
      novas.push({
        viaturaId: v.id,
        prefixo: v.prefixo,
        modelo: v.modelo,
        itemId: x.itemId,
        item: x.item,
        texto: x.texto,
        nivel: x.nivel,
        obs: reg.obs || '',
        abertaEm: data,
        abertaPor: por,
        status: 'aberta',
      })
    }
  }
  return novas
}
