import { useApp } from '../App'
import { Cabecalho, Icone, useCarregar } from '../components/base'
import { dataCurta, horaCurta } from '../lib/formato'

export default function Historico() {
  const { api, ir, vistoria } = useApp()
  const { dados, carregando, erro } = useCarregar(() => api.listarVistorias(), [vistoria?.status])

  return (
    <>
      <Cabecalho titulo="Histórico" sub="Relatórios enviados" />
      <main>
        {carregando && !dados ? (
          <div className="vazio">Carregando…</div>
        ) : erro ? (
          <div className="bloco vazio">Não foi possível carregar o histórico. Verifique a conexão.</div>
        ) : !dados?.length ? (
          <div className="bloco vazio">Nenhum relatório enviado ainda. O primeiro aparece aqui depois do envio.</div>
        ) : (
          <ul className="bloco vtr-lista">
            {dados.map((v) => {
              const alteracoes = (v.relatorio.match(/^⚠️ \*Alterações \((\d+)\)/m) || [])[1]
              return (
                <li key={v.data}>
                  <button className="vtr-linha" style={{ gridTemplateColumns: '1fr auto' }} onClick={() => ir(`relatorio/${v.data}`)}>
                    <span>
                      <span className="modelo">{dataCurta(v.data)}</span>
                      <span className="detalhe" style={{ display: 'block' }}>
                        {horaCurta(v.enviadaEm)} · {v.enviadaPor}
                        {alteracoes ? ` · ${alteracoes} ${alteracoes === '1' ? 'alteração' : 'alterações'}` : ' · sem alterações'}
                      </span>
                    </span>
                    <Icone nome="ChevronRight" style={{ color: 'var(--tinta-2)' }} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </>
  )
}
