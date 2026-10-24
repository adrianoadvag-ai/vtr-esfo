// "DETALHAMENTO ATUALIZADO" da planilha "Gestão das Viaturas EsFO" (aba Gestão, conferência de 19/10/2026),
// para importar como pendências abertas. Textos como na planilha, com acentos e erros de digitação corrigidos.
// A data entre parênteses no fim do texto vira a data de abertura; sem data, vale a da conferência.

export const DATA_PLANILHA = '2026-10-19'

export const DETALHAMENTO_PLANILHA = {
  17692: ['Lateral esquerda da VTR batida.'],
  16843: [
    'Mensagem para verificar freios no painel (13/10/26).',
    'VTR baixada por estar sem freio (19/10/26). Foi deixada no Setor de Transporte no dia 21/10/26 pelo Cad. Vinícius. Será desenrolada a OS.',
  ],
  13659: [
    'Problema no câmbio; foi verificado e ficou inviável a troca.',
    'No painel de instrumentos, acusa falha no sistema de monitoramento dos pneus.',
    'Amortecedores rangendo (17/08/26).',
    'Necessita alinhamento das rodas (17/08/26).',
  ],
  14058: [
    'Óleo vencido (já solicitada a O.S., aguardando autorização).',
    'Amortecedores: lado esquerdo rangendo, com probabilidade de ser desgaste nos amortecedores ou buchas em geral.',
    'Necessita alinhamento e revisão da suspensão: ao conduzir, a viatura não segue em linha reta e puxa para a lateral.',
  ],
  15603: ['Amortecedores rangendo (17/08/26).', 'Porta traseira direita batida (14/09/26).'],
  15591: ['Embreagem no final; em breve precisará trocar (junto com a próxima troca de óleo).', 'VTR está com o estepe na roda traseira direita.'],
  17950: ['Para-lama traseiro esquerdo batido à frente da roda (14/09/26).', 'Bateria baixa (VTR não está ligando).'],
  18148: ['Bateria do cartão fraca (segundo o painel de instrumentos).'],
  C4: [
    'Ralado no para-choque traseiro.',
    'Tampa do reservatório de água de limpeza do para-brisa faltante/com defeito.',
    'Ralado no para-choque traseiro e lanterna traseira esquerda com uma pequena parte quebrada.',
    'Suporte do farol de milha dianteiro esquerdo quebrado/desencaixado (13/10/26).',
  ],
  18158: ['Lateral da VTR batida (09/09/26).', 'VTR batida no dia 01/10/2026; está baixada para Inquérito Técnico.'],
  15585: ['Viatura baixada devido ao acidente do PFO na BR-277.'],
}

// "(13/10/26)." no fim do texto -> data de abertura 2026-10-13 e texto sem a data
function separarData(texto) {
  const m = texto.match(/\s*\((\d{2})\/(\d{2})\/(\d{2})\)\.?$/)
  if (!m) return { texto, data: DATA_PLANILHA }
  return { texto: texto.slice(0, m.index).trim(), data: `20${m[3]}-${m[2]}-${m[1]}` }
}

// Pendências a criar para as VTR cadastradas no app (as que não estão no app ficam de fora)
export function pendenciasDaPlanilha(viaturas, por) {
  const porPrefixo = Object.fromEntries(viaturas.map((v) => [String(v.prefixo), v]))
  const lista = []
  const semVtr = []
  for (const [prefixo, textos] of Object.entries(DETALHAMENTO_PLANILHA)) {
    const v = porPrefixo[prefixo]
    if (!v) {
      semVtr.push(prefixo)
      continue
    }
    textos.forEach((t, i) => {
      const sep = separarData(t)
      const texto = sep.texto.replace(/\.$/, '')
      const data = sep.data
      lista.push({
        viaturaId: v.id,
        prefixo: v.prefixo,
        modelo: v.modelo,
        itemId: `planilha-${i + 1}`,
        item: 'Planilha',
        texto,
        descricao: texto,
        nivel: 'atencao',
        abertaEm: data,
        abertaPor: por,
        origem: 'planilha',
        status: 'aberta',
      })
    })
  }
  return { lista, semVtr }
}
