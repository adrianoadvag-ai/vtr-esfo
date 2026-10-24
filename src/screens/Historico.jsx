import { useApp } from '../App'
import { Cabecalho, Icone, useCarregar } from '../components/base'
import { dataCurta, horaCurta } from '../lib/formato'

export default function Historico() {
  const { api, ir, enviadasHoje } = useApp()
  const { dados, carregando, erro } = useCarregar(() => api.listarVistorias(), [enviadasHoje.length])

  return (
    <>
      <Cabecalho titulo="Histórico" sub="Relatórios enviados" />
      <main>
        <button className="bloco linha-botao campo-linha" style={{ width: '100%', marginBottom: 12 }} onClick={() => ir('mensal')}>
          <span className="icone-item">
            <Icone nome="FileBarChart" />
          </span>
          <span className="rotulo" style={{ textAlign: 'left' }}>
            Relatório mensal
            <small>Situação das viaturas, KM rodado, alterações e trocas de óleo, em PDF</small>
          </span>
          <Icone nome="ChevronRight" style={{ color: 'var(--tinta-2)' }} />
        </button>
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
              const n = (v.relatorio.match(/^\d+\. /gm) || []).length
              return (
                <li key={v.id}>
                  <button className="vtr-linha" style={{ gridTemplateColumns: '1fr auto' }} onClick={() => ir(`relatorio/${v.id}`)}>
                    <span>
                      <span className="modelo">{dataCurta(v.data)}</span>
                      <span className="detalhe" style={{ display: 'block' }}>
                        {horaCurta(v.enviadaEm)} · {n} VTR · {v.enviadaPor}
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
