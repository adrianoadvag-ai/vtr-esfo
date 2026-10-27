import { useApp } from '../App'
import { Cabecalho, Icone, Selo, SeloNivel } from '../components/base'
import { APP_NOME, FUNCOES, dadosCompletos, podeGerirViaturas, podeVistoriar, rotuloVaga } from '../config'
import { escalaDoDia, juntar, papelNoDia, proximosServicos, rotinaDo } from '../lib/escala'
import { dataCurta, horaCurta, nomeCompleto } from '../lib/formato'
import { avaliar, diaDeConferencia, exigida, travaDeOutro } from '../lib/vistoria'
import FiguraVtr, { ModeloVtr } from '../components/FiguraVtr'
import { textoSituacao } from '../lib/situacao'


export default function Hoje() {
  const { viaturas, vistoria, enviadasHoje, hoje, ir, usuario, api, escalas, usuarios } = useApp()
  const registros = vistoria?.registros || {}
  const lista = viaturas.filter((v) => exigida(v) || registros[v.id])
  const avaliacoes = Object.fromEntries(lista.map((v) => [v.id, avaliar(v, registros[v.id], hoje)]))
  const concluidas = lista.filter((v) => registros[v.id] && avaliacoes[v.id].completo)
  const exigidas = lista.filter(exigida)

  // Em qual relatório de hoje cada VTR já foi enviada
  const enviadaEm = {}
  for (const r of enviadasHoje) for (const id of r.incluidas || Object.keys(r.registros || {})) enviadaEm[id] = r
  // ✔️ Pronta: vistoria completa hoje (na rodada aberta ou já enviada)
  const pronta = (v) => Boolean(registros[v.id] ? avaliacoes[v.id].completo : enviadaEm[v.id])
  const conferidasHoje = exigidas.filter(pronta).length
  // Numeração fixa; as que faltam ficam em cima e as prontas descem
  const ordenada = lista.map((v, i) => ({ v, n: i + 1 })).sort((a, b) => pronta(a.v) - pronta(b.v))

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
        {!dadosCompletos(usuario) && (
          <button className="aviso-dados" onClick={() => ir('meus-dados')}>
            <Icone nome="UserRound" />
            <span>
              <strong>Complete seus dados</strong>
              <small>Telefone, pelotão e nome completo para a lista da equipe.</small>
            </span>
            <Icone nome="ChevronRight" />
          </button>
        )}
        <CartaoEscala hoje={hoje} escalas={escalas} usuarios={usuarios} usuario={usuario} ir={ir} />
        {diaDeConferencia(hoje) && exigidas.length > 0 && (
          <div className="aviso-conferencia" role="note">
            <Icone nome="CalendarCheck" /> Hoje tem conferência semanal: condição de pneus e pastilhas, palhetas e filtro do A/C.
          </div>
        )}
        <div className="progresso">
          <div style={{ color: 'var(--tinta-2)' }}>
            {exigidas.length === 0
              ? 'Nenhuma viatura cadastrada.'
              : conferidasHoje === exigidas.length
                ? `Todas as ${exigidas.length} viaturas vistoriadas ✔️`
                : `${conferidasHoje} de ${exigidas.length} viaturas vistoriadas`}
          </div>
          <div className="barra" aria-hidden="true">
            <span style={{ width: `${exigidas.length ? (conferidasHoje / exigidas.length) * 100 : 0}%` }} />
          </div>
        </div>

        {enviadasHoje.length > 0 && (
          <ul className="bloco vtr-lista" style={{ marginBottom: 16 }} aria-label="Relatórios enviados hoje">
            {enviadasHoje.map((r) => {
              const n = (r.incluidas || Object.keys(r.registros || {})).length
              return (
                <li key={r.id}>
                  <button className="vtr-linha" style={{ gridTemplateColumns: 'auto 1fr auto' }} onClick={() => ir(`relatorio/${r.id}`)}>
                    <Selo nivel="ok">
                      <Icone nome="Check" tamanho={14} /> Enviado
                    </Selo>
                    <span>
                      <span className="modelo">
                        {horaCurta(r.enviadaEm)} · {n} {n === 1 ? 'viatura' : 'viaturas'}
                      </span>
                      <span className="detalhe" style={{ display: 'block' }}>
                        {r.enviadaPor}
                      </span>
                    </span>
                    <Icone nome="ChevronRight" style={{ color: 'var(--tinta-2)' }} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {lista.length === 0 ? (
          <div className="bloco vazio">
            <p>Cadastre as viaturas para começar a vistoria.</p>
            {podeGerirViaturas(usuario) && (
              <button className="botao" onClick={() => ir('viaturas')}>
                Cadastrar viaturas
              </button>
            )}
          </div>
        ) : (
          <ul className="bloco vtr-lista">
            {ordenada.map(({ v, n }) => {
              const a = avaliacoes[v.id]
              const temRegistro = Boolean(registros[v.id])
              const ja = enviadaEm[v.id]
              const ok = pronta(v)
              const trava = travaDeOutro(vistoria, v.id, usuario.id)
              const estado = ok ? 'vistoriada' : trava ? `em vistoria por ${trava.nome}` : 'falta vistoriar'
              return (
                <li key={v.id}>
                  <button
                    className={`vtr-linha com-num ${!exigida(v) ? 'inativa' : ''} ${ok ? 'pronta' : ''}`}
                    onClick={() => ir(`vistoria/${v.id}`)}
                    aria-label={`${n}. Viatura ${v.prefixo}, ${v.modelo}, ${estado}`}
                  >
                    <span className="num">{n}</span>
                    <span className="prefixo">{v.prefixo}</span>
                    <span className="vtr-desc">
                      <FiguraVtr vtr={v} tamanho={56} />
                      <span>
                      <span className="modelo"><ModeloVtr modelo={v.modelo} /></span>
                      <span className="detalhe" style={{ display: 'block' }}>
                        {trava ? `Em vistoria por ${trava.nome}` : detalhe(v, a, temRegistro, ja)}
                      </span>
                      {(temRegistro || ja) && (
                        <span className="selo-linha">
                          <Status a={a} temRegistro={temRegistro} ja={ja} />
                        </span>
                      )}
                      </span>
                    </span>
                    {ok ? (
                      <span className="marca-pronta" title="Vistoriada">
                        <Icone nome="CircleCheck" tamanho={30} />
                        <small>Vistoriada</small>
                      </span>
                    ) : trava ? (
                      <span className="marca-trava" title={`Em vistoria por ${trava.nome}`}>
                        <Icone nome="Lock" tamanho={22} />
                      </span>
                    ) : (
                      <Icone nome="ChevronRight" style={{ color: 'var(--tinta-2)' }} />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {podeVistoriar(usuario) && lista.length > 0 && (
        <div className="rodape-fixo">
          <button className="botao cheio" disabled={concluidas.length === 0} onClick={() => ir('revisao')}>
            {concluidas.length === 0
              ? 'Conclua ao menos uma viatura para enviar'
              : `Revisar e enviar (${concluidas.length} ${concluidas.length === 1 ? 'viatura' : 'viaturas'})`}
          </button>
        </div>
      )}
    </>
  )
}

function detalhe(v, a, temRegistro, ja) {
  if (temRegistro && a.completo) {
    if (a.estado === 'nao') return 'Não vistoriada (justificada)'
    return a.achados.length ? a.achados.map((x) => x.item).join(', ') : 'Sem alteração · pronta para enviar'
  }
  if (temRegistro) return `Falta: ${a.pendentes.slice(0, 2).join(', ')}${a.pendentes.length > 2 ? '…' : ''}`
  if (ja) return `Enviada às ${horaCurta(ja.enviadaEm)}`
  return textoSituacao(v)
}

function Status({ a, temRegistro, ja }) {
  if (temRegistro && a.completo && a.nivel) return <SeloNivel nivel={a.nivel} />
  if (temRegistro && a.completo && a.estado === 'nao') return <Selo nivel="neutro">Justificada</Selo>
  if (temRegistro && a.completo)
    return (
      <Selo nivel="ok">
        <Icone nome="Check" tamanho={14} /> S/A
      </Selo>
    )
  if (temRegistro) return <Selo nivel="neutro">Em andamento</Selo>
  if (ja)
    return (
      <Selo nivel="neutro">
        <Icone nome="Send" tamanho={13} /> Enviada
      </Selo>
    )
  return <Icone nome="ChevronRight" style={{ color: 'var(--tinta-2)' }} />
}

// Quem está de serviço hoje, a rotina do dia e o próximo serviço de quem está usando
function CartaoEscala({ hoje, escalas, usuarios, usuario, ir }) {
  const d = escalaDoDia(escalas, hoje, usuarios)
  const papel = papelNoDia(d, usuario)
  const rotina = rotinaDo(hoje)
  const proximo = proximosServicos(Object.values(escalas), usuario, hoje).find((s) => s.dia > hoje)
  if (!rotina && !proximo) return null
  const resp = (d?.responsaveis || []).map((p) => p.nome).filter(Boolean)
  const aux = (d?.auxiliares || []).map((p) => p.nome).filter(Boolean)
  return (
    <button className={`bloco cartao-escala ${papel ? 'meu' : ''}`} onClick={() => ir('escala')}>
      {papel && (
        <div className="faixa-servico">
          Você é o {FUNCOES[papel].nome.toLowerCase()} de hoje
        </div>
      )}
      {rotina && (
        <>
          <div className="linha-escala">
            <Icone nome="CalendarDays" tamanho={18} />
            <span>
              <small>{rotuloVaga('auxiliares', aux.length)}</small>
              {juntar(aux) || 'A definir'}
            </span>
            <span>
              <small>{rotuloVaga('responsaveis', resp.length)}</small>
              {juntar(resp) || 'A definir'}
            </span>

          </div>
          <div className="dia-rotina">
            <Icone nome="Wrench" tamanho={15} />
            <span>{rotina}</span>
          </div>
        </>
      )}
      {proximo && (
        <div className="proximo-servico">
          Seu próximo serviço: <strong>{dataCurta(proximo.dia)}</strong>
          {` (${FUNCOES[proximo.papel].nome.toLowerCase()})`}
        </div>
      )}
    </button>
  )
}
