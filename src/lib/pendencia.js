// Texto de uma pendência (sem dependências, para ser usado em qualquer lugar)

// Texto da pendência como no "Detalhamento atualizado" da planilha.
// Com descrição: "Fluido de freio: nível abaixo do mínimo" (ou só a descrição, se for avulsa ou veio da planilha).
export function textoPendencia(o) {
  if (!o) return ''
  const d = (o.descricao || '').trim()
  if (!d) return o.texto || ''
  if (o.origem === 'planilha' || String(o.itemId || '').startsWith('extra')) return d
  return `${o.item}: ${d}`
}
