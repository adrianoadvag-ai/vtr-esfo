import { useApp } from '../App'
import { Cabecalho, Icone, Selo, SeloNivel } from '../components/base'
import { APP_NOME, podeGerir, podeVistoriar } from '../config'
import { dataCurta, horaCurta, nomeCompleto } from '../lib/formato'
import { avaliar, exigida } from '../lib/vistoria'

const SITUACAO = { manutencao: 'Em manutenção', baixada: 'Baixada' }

export default function Hoje() {
  const { viaturas, vistoria, hoje, ir, usuario, api } = useApp()
  const registros = vistoria?.registros || {}
  const enviada = vistoria?.status === 'enviada'
  const lista = viaturas.filter((v) => v.situacao !== 'baixada' || registros[v.id])
  const exigidas = lista.filter(exigida)
  const avaliacoes = Object.fromEntries(lista.map((v) => [v.id, avaliar(v, registros[v.id], hoje)]))
  const feitas = exigidas.filter((v) => avaliacoes[v.id].completo).length
  const tudo = exigidas.length > 0 && feitas === exigidas.length

  const sair = (
    <button className="acao" onClick={() => api.sair()} aria-label="Sair">
      <Icone nome="LogOut" />
    </button>
  )

  return (
    <>
      <Cabecalho titulo={APP_NOME} sub={nomeCompleto(usuario)} acao={sair} />
      <main>
        <h2 className="tela-titulo">{dataCurta(hoje)}</h2>
        {enviada ? (
          <div className="bloco pad" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Selo nivel="ok">
                <Icone nome="Check" tamanho={14} /> Enviada
              </Selo>
              <span style={{ color: 'var(--tinta-2)', fontSize: 14 }}>
                às {horaCurta(vistoria.enviadaEm)} por {vistoria.enviadaPor}
              </span>
            </div>
            <button className="botao secundario cheio" style={{ marginTop: 12 }} onClick={() => ir(`relatorio/${hoje}`)}>
              <Icone nome="MessageCircle" /> Ver relatório do dia
            </button>
          </div>
        ) : (
          <div className="progresso">
            <div style={{ color: 'var(--tinta-2)' }}>
              {exigidas.length === 0
                ? 'Nenhuma viatura cadastrada.'
                : `${feitas} de ${exigidas.length} viaturas conferidas`}
            </div>
            <div className="barra" aria-hidden="true">
              <span style={{ width: `${exigidas.length ? (feitas / exigidas.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {lista.length === 0 ? (
          <div className="bloco vazio">
            <p>Cadastre as viaturas para começar a vistoria.</p>
            {podeGerir(usuario) && (
              <button className="botao" onClick={() => ir('viaturas')}>
                Cadastrar viaturas
              </button>
            )}
          </div>
        ) : (
          <ul className="bloco vtr-lista">
            {lista.map((v) => {
              const a = avaliacoes[v.id]
              const inativa = !exigida(v)
              return (
                <li key={v.id}>
                  <button
                    className={`vtr-linha ${inativa ? 'inativa' : ''}`}
                    onClick={() => ir(`vistoria/${v.id}`)}
                    aria-label={`Viatura ${v.prefixo}, ${v.modelo}`}
                  >
                    <span className="prefixo">{v.prefixo}</span>
                    <span>
                      <span className="modelo">{v.modelo}</span>
                      <span className="detalhe" style={{ display: 'block' }}>
                        {SITUACAO[v.situacao] ||
                          (a.estado === 'andamento' ? `Falta: ${a.pendentes.slice(0, 2).join(', ')}${a.pendentes.length > 2 ? '…' : ''}` : '')}
                        {a.completo && a.estado !== 'nao' && !a.achados.length && 'Sem alteração'}
                        {a.completo && a.achados.length > 0 && a.achados.map((x) => x.item).join(', ')}
                        {a.estado === 'nao' && 'Não vistoriada'}
                      </span>
                    </span>
                    <Status a={a} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {!enviada && podeVistoriar(usuario) && lista.length > 0 && (
        <div className="rodape-fixo">
          <button className="botao cheio" disabled={!tudo} onClick={() => ir('revisao')}>
            {tudo ? 'Revisar e enviar relatório' : `Faltam ${exigidas.length - feitas} viaturas`}
          </button>
        </div>
      )}
    </>
  )
}

function Status({ a }) {
  if (a.completo && a.nivel) return <SeloNivel nivel={a.nivel} />
  if (a.completo && a.estado === 'nao') return <Selo nivel="neutro">Justificada</Selo>
  if (a.completo)
    return (
      <Selo nivel="ok">
        <Icone nome="Check" tamanho={14} /> S/A
      </Selo>
    )
  if (a.estado === 'andamento') return <Selo nivel="neutro">Em andamento</Selo>
  return <Icone nome="ChevronRight" style={{ color: 'var(--tinta-2)' }} />
}
