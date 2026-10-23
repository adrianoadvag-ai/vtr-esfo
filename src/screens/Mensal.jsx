import { useMemo, useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, Icone, Selo, brasaoApmg, brasaoEsfo, useCarregar } from '../components/base'
import { dataCurta, km, nomeCompleto } from '../lib/formato'
import { mesAnterior, mesDe, mesSeguinte, nomeMes, resumoMensal, semanasDoMes } from '../lib/frota'
import { gerarPdfMensal } from '../lib/mensal-pdf'

// Relatório do mês: cumprimento da escala, viaturas, pendências e trocas de óleo, com PDF
export default function Mensal({ mes: mesRota }) {
  const { api, ir, hoje, viaturas, ocorrencias, usuario, avisar, enviadasHoje } = useApp()
  const mes = /^\d{4}-\d{2}$/.test(mesRota || '') ? mesRota : mesDe(hoje)
  const [gerando, setGerando] = useState(false)

  const { dados: vistorias, carregando } = useCarregar(() => api.listarVistorias(), [enviadasHoje.length])
  const { dados: escalas } = useCarregar(async () => {
    const semanas = semanasDoMes(mes)
    const lidas = await Promise.all(semanas.map((s) => api.lerEscala(s).catch(() => null)))
    return Object.fromEntries(semanas.map((s, i) => [s, lidas[i]]))
  }, [mes])

  const r = useMemo(
    () => (vistorias ? resumoMensal({ mes, hoje, vistorias, viaturas, ocorrencias, escalas: escalas || {} }) : null),
    [mes, hoje, vistorias, viaturas, ocorrencias, escalas],
  )
  const futuro = mes >= mesDe(hoje)
  const podeCompartilharArquivo =
    typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [new File([''], 'x.pdf', { type: 'application/pdf' })] })

  async function pdf() {
    setGerando(true)
    try {
      return await gerarPdfMensal({ resumo: r, brasoes: [brasaoApmg, brasaoEsfo], geradoPor: nomeCompleto(usuario), hoje })
    } finally {
      setGerando(false)
    }
  }

  async function baixar() {
    try {
      const { blob, nome } = await pdf()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nome
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30000)
      avisar('PDF baixado.')
    } catch {
      avisar('Não foi possível gerar o PDF.')
    }
  }

  async function compartilhar() {
    try {
      const { blob, nome } = await pdf()
      await navigator.share({ files: [new File([blob], nome, { type: 'application/pdf' })], title: `Relatório mensal de viaturas · ${nomeMes(mes)}` })
    } catch (e) {
      if (e?.name !== 'AbortError') avisar('Não foi possível compartilhar o PDF.')
    }
  }

  return (
    <>
      <Cabecalho titulo="Relatório mensal" sub="Vistorias, escala, pendências e trocas de óleo" voltar={() => ir('historico')} />
      <main>
        <div className="seletor-mes">
          <button onClick={() => ir(`mensal/${mesAnterior(mes)}`)} aria-label="Mês anterior">
            <Icone nome="ChevronLeft" />
          </button>
          <strong>{nomeMes(mes, true)}</strong>
          <button onClick={() => ir(`mensal/${mesSeguinte(mes)}`)} disabled={futuro} aria-label="Próximo mês">
            <Icone nome="ChevronRight" />
          </button>
        </div>

        {!r ? (
          <div className="bloco vazio">{carregando ? 'Carregando…' : 'Não foi possível carregar os relatórios. Verifique a conexão.'}</div>
        ) : (
          <>
            <div className="botoes" style={{ marginBottom: 16 }}>
              <button className="botao" onClick={baixar} disabled={gerando || !r.dias.length}>
                <Icone nome="FileDown" /> {gerando ? 'Gerando…' : 'Baixar PDF'}
              </button>
              {podeCompartilharArquivo && (
                <button className="botao secundario" onClick={compartilhar} disabled={gerando || !r.dias.length}>
                  <Icone nome="Share2" /> Enviar PDF
                </button>
              )}
            </div>

            <div className="numeros">
              <div>
                <strong>
                  {r.diasComRelatorio}/{r.diasContados}
                </strong>
                <span>dias de missão com relatório</span>
              </div>
              <div>
                <strong>{r.totalAlteracoes}</strong>
                <span>alterações registradas</span>
              </div>
              <div>
                <strong>{r.emAberto.length}</strong>
                <span>pendências em aberto ({r.resolvidasNoMes.length} resolvidas no mês)</span>
              </div>
              <div>
                <strong>{r.trocas.length}</strong>
                <span>trocas de óleo no mês</span>
              </div>
            </div>

            <h2 className="secao">Dias de missão</h2>
            {r.dias.length === 0 ? (
              <div className="bloco vazio">Nenhum dia de missão neste mês até hoje.</div>
            ) : (
              <ul className="bloco vtr-lista">
                {r.porDia.map((d) => (
                  <li key={d.dia} className="linha-simples">
                    <span>
                      {dataCurta(d.dia)}
                      <span className="detalhe-linha">Escala: {d.escalados.join(', ') || 'não definida'}</span>
                    </span>
                    {d.relatorios ? (
                      <span className="detalhe">
                        {d.enviadoPor.join(', ')}
                        <br />
                        {d.viaturas} VTR
                      </span>
                    ) : d.aguardando ? (
                      <Selo nivel="neutro">Hoje, aguardando</Selo>
                    ) : (
                      <Selo nivel="critico">Sem relatório</Selo>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <h2 className="secao">Viaturas</h2>
            <ul className="bloco vtr-lista">
              {r.porViatura.map((x) => (
                <li key={x.vtr.id}>
                  <button className="vtr-linha" style={{ gridTemplateColumns: 'auto 1fr auto' }} onClick={() => ir(`vtr/${x.vtr.id}`)}>
                    <span className="prefixo">{x.vtr.prefixo}</span>
                    <span>
                      <span className="modelo">
                        {x.vistorias} {x.vistorias === 1 ? 'vistoria' : 'vistorias'}
                        {x.kmInicial ? ` · ${km(x.kmFinal - x.kmInicial)} km rodados` : ''}
                      </span>
                      <span className="detalhe" style={{ display: 'block' }}>
                        {x.recorrentes.length ? x.recorrentes.map((c) => `${c.item} ${c.vezes}×`).join(', ') : 'Sem alterações no mês'}
                      </span>
                    </span>
                    {x.alteracoes > 0 ? <Selo nivel="atencao">{x.alteracoes}</Selo> : <Selo nivel="ok">S/A</Selo>}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  )
}
