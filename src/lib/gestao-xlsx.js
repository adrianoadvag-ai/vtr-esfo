// Arquivo .xlsx do relatório mensal: aba "Gestão" no layout da planilha "Gestão das Viaturas EsFO"
// e aba "Mês" com o que só o app registra (KM rodado, vistorias, alterações).
import { COLUNAS_GESTAO, destaqueGestao } from './gestao'
import { nomeMes } from './frota'

const AZUL = '#0C2A5A'
const FUNDO = { critico: '#FDE8E6', atencao: '#FDF0DE' }
const TEXTO = { critico: '#B42318', atencao: '#A85800' }

export async function gerarXlsxMensal({ resumo: r }) {
  const { default: writeExcelFile } = await import('write-excel-file/browser')

  const cab = (t) => ({ value: t, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: AZUL, wrap: true, alignVertical: 'center', align: 'center' })
  const cel = (chave, valor) => {
    const d = destaqueGestao(chave, valor)
    return {
      // STATUS 300 como número, igual à planilha
      value: chave === 'status' && valor === '300' ? 300 : (valor ?? ''),
      wrap: true,
      alignVertical: 'top',
      ...(chave === 'detalhamento' ? {} : { align: 'center' }),
      ...(d ? { backgroundColor: FUNDO[d], textColor: TEXTO[d], fontWeight: 'bold' } : {}),
    }
  }

  const gestao = [
    COLUNAS_GESTAO.map((c) => cab(c.titulo)),
    ...r.porViatura.map((x) => COLUNAS_GESTAO.map((c) => cel(c.chave, x.gestao[c.chave]))),
  ]

  const mes = [
    ['PREFIXO', 'Modelo', 'STATUS', 'KM inicial', 'KM final', 'KM rodado', 'Dias vistoriada', 'Alterações registradas', 'Pendências em aberto'].map(cab),
    ...r.porViatura.map((x) => [
      x.vtr.prefixo,
      x.vtr.modelo || '',
      x.gestao.status,
      x.kmInicial ?? '',
      x.kmFinal ?? '',
      x.kmInicial ? x.rodado : '',
      x.vistorias,
      x.totalAlteracoes,
      x.pendencias.length,
    ].map((v) => ({ value: v, align: 'center' }))),
    [],
    [{ value: `Relatório mensal de viaturas · ${nomeMes(r.mes, true)} · gerado pelo app Missão Viaturas`, textColor: '#4A5A70' }],
  ]

  const blob = await writeExcelFile(
    [
      { data: gestao, sheet: 'Gestão', columns: COLUNAS_GESTAO.map((c) => ({ width: c.x })), stickyRowsCount: 1, stickyColumnsCount: 2, orientation: 'landscape' },
      { data: mes, sheet: 'Mês', columns: [9, 22, 13, 11, 11, 11, 12, 14, 13].map((width) => ({ width })), stickyRowsCount: 1 },
    ],
    { fontFamily: 'Calibri', fontSize: 10 },
  ).toBlob()
  return { blob, nome: `gestao-viaturas-${r.mes}.xlsx` }
}
