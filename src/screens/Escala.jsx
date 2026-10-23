import { useEffect, useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, Icone, Selo, useCarregar } from '../components/base'
import { FUNCOES, funcaoDe, podeMontarEscala } from '../config'
import { diasDa, papelNoDia, rotinaDo, semanaPadrao, textoEscala, totaisEscala, vagasAuxiliar, vagasDo } from '../lib/escala'
import { NOMES_DIAS, dataExtensa, diaDaSemana, diaMes, hojeISO, horaCurta, nomeCompleto, somarDias } from '../lib/formato'

export default function Escala({ semana: semanaRota }) {
  const { api, usuario, usuarios, hoje, ir, avisar, enviadasHoje } = useApp()
  const atual = semanaPadrao(hoje)
  const semana = /^\d{4}-\d{2}-\d{2}$/.test(semanaRota || '') ? semanaRota : atual
  const [escala, setEscala] = useState(undefined)
  const gestor = podeMontarEscala(usuario)
  const dias = diasDa(semana)
  const ativos = usuarios.filter((u) => u.perfil !== 'pendente').sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))

  useEffect(() => {
    setEscala(undefined)
    return api.observarEscala(semana, setEscala)
  }, [api, semana])

  // Nome atual do integrante (se ele mudou o nome de guerra, a escala acompanha)
  const nomeDe = (p) => {
    if (!p) return ''
    const u = p.id && usuarios.find((x) => x.id === p.id)
    return u ? nomeCompleto(u) : p.nome || ''
  }
  const escalaComNomes = escala && {
    ...escala,
    dias: Object.fromEntries(
      Object.entries(escala.dias || {}).map(([d, v]) => [
        d,
        {
          responsaveis: (v.responsaveis || []).map((p) => p && { ...p, nome: nomeDe(p) }),
          auxiliares: (v.auxiliares || []).map((p) => p && { ...p, nome: nomeDe(p) }),
          supervisor: v.supervisor && { ...v.supervisor, nome: nomeDe(v.supervisor) },
        },
      ]),
    ),
  }

  async function salvar(dia, mudanca) {
    const antes = escala?.dias?.[dia] || {}
    const valor = {
      responsaveis: Array.from({ length: vagasDo(dia) }, (_, i) => antes.responsaveis?.[i] || null),
      auxiliares: Array.from({ length: vagasAuxiliar() }, (_, i) => antes.auxiliares?.[i] || null),
      supervisor: antes.supervisor || null,
      ...mudanca,
    }
    try {
      await api.salvarEscalaDia(semana, dia, valor, nomeCompleto(usuario))
    } catch (e) {
      avisar(e.message || 'Não foi possível salvar a escala.')
    }
  }

  const texto = textoEscala(semana, escalaComNomes)
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      avisar('Escala copiada. Cole no grupo do WhatsApp.')
    } catch {
      avisar('Não foi possível copiar.')
    }
  }

  const mudarSemana = (n) => ir(`escala/${somarDias(semana, 7 * n)}`)

  return (
    <>
      <Cabecalho titulo="Escala" sub="Missão Viaturas · segunda a sexta" />
      <main>
        <div className="semana-nav bloco">
          <button className="acao-redonda" onClick={() => mudarSemana(-1)} aria-label="Semana anterior">
            <Icone nome="ChevronLeft" />
          </button>
          <div className="semana-titulo">
            <strong>
              {diaMes(dias[0])} a {diaMes(dias[dias.length - 1])}
            </strong>
            <span>{rotuloSemana(semana, atual, hoje)}</span>
          </div>
          <button className="acao-redonda" onClick={() => mudarSemana(1)} aria-label="Próxima semana">
            <Icone nome="ChevronRight" />
          </button>
        </div>
        {semana !== atual && (
          <button className="botao texto cheio" onClick={() => ir('escala')}>
            Voltar para a semana atual
          </button>
        )}

        {escala === undefined ? (
          <div className="vazio">Carregando…</div>
        ) : (
          dias.map((dia) => {
            const d = escalaComNomes?.dias?.[dia]
            const vagas = vagasDo(dia)
            const papel = papelNoDia(d, usuario)
            const ehHoje = dia === hoje
            const dobrados = repetidos(d)
            return (
              <section key={dia} className={`bloco dia-escala ${ehHoje ? 'hoje' : ''} ${dia < hoje ? 'passado' : ''}`} aria-label={`${NOMES_DIAS[diaDaSemana(dia)]}, ${diaMes(dia)}`}>
                <div className="dia-topo">
                  <div>
                    <strong>{NOMES_DIAS[diaDaSemana(dia)]}</strong> <span className="data">{diaMes(dia)}</span>
                  </div>
                  <div className="chips">
                    {ehHoje && <Selo nivel="ok">Hoje</Selo>}
                    {papel && <Selo nivel="atencao">Você</Selo>}
                  </div>
                </div>
                <div className="dia-rotina">
                  <Icone nome="Wrench" tamanho={15} />
                  <span>{rotinaDo(dia)}</span>
                </div>
                {dobrados.length > 0 && (
                  <div className="aviso-escala">
                    <Icone nome="TriangleAlert" tamanho={16} /> {dobrados.join(', ')} {dobrados.length > 1 ? 'aparecem' : 'aparece'} duas vezes neste dia.
                  </div>
                )}
                {[
                  { chave: 'auxiliares', funcao: 'auxiliar', rotulo: 'Auxiliar', vagas: vagasAuxiliar() },
                  { chave: 'responsaveis', funcao: 'responsavel', rotulo: vagas > 1 ? 'Responsáveis' : 'Responsável', vagas },
                ].map((col) => (
                  <div className="dia-linha" key={col.chave}>
                    <span className="dia-rotulo">{col.rotulo}</span>
                    <div className="dia-nomes">
                      {Array.from({ length: col.vagas }, (_, i) => {
                        const p = d?.[col.chave]?.[i]
                        return gestor ? (
                          <SeletorPessoa
                            key={i}
                            valor={p}
                            ativos={ativos}
                            funcao={col.funcao}
                            rotulo={`${col.vagas > 1 ? `${col.rotulo} ${i + 1}` : col.rotulo} de ${NOMES_DIAS[diaDaSemana(dia)]}`}
                            onChange={(novo) => {
                              const r = Array.from({ length: col.vagas }, (_, j) => d?.[col.chave]?.[j] || null)
                              r[i] = novo
                              salvar(dia, { [col.chave]: r })
                            }}
                          />
                        ) : (
                          <NomePessoa key={i} p={p} ir={ir} />
                        )
                      })}
                    </div>
                  </div>
                ))}
                <div className="dia-linha">
                  <span className="dia-rotulo">Supervisor</span>
                  <div className="dia-nomes">
                    {gestor ? (
                      <SeletorPessoa
                        valor={d?.supervisor}
                        ativos={ativos}
                        funcao="supervisor"
                        rotulo={`Supervisor de ${NOMES_DIAS[diaDaSemana(dia)]}`}
                        onChange={(novo) => salvar(dia, { supervisor: novo })}
                      />
                    ) : (
                      <NomePessoa p={d?.supervisor} ir={ir} />
                    )}
                  </div>
                </div>
              </section>
            )
          })
        )}

        <div className="botoes" style={{ marginTop: 16 }}>
          <button className="botao secundario" onClick={copiar}>
            <Icone nome="Copy" tamanho={18} /> Copiar
          </button>
          <a className="botao" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">
            <Icone nome="MessageCircle" tamanho={18} /> WhatsApp
          </a>
        </div>
        {escala?.atualizadoEm && (
          <p className="tela-sub" style={{ marginTop: 12, fontSize: 13, textAlign: 'center' }}>
            Atualizada por {escala.atualizadoPor} em {diaMes(hojeISO(new Date(escala.atualizadoEm)))} às {horaCurta(escala.atualizadoEm)}
          </p>
        )}
        {!gestor && (
          <p className="tela-sub" style={{ fontSize: 13, textAlign: 'center' }}>
            Trocas de serviço: fale com os responsáveis da missão.
          </p>
        )}

        <TotalEscalas api={api} usuarios={usuarios} escala={escala} enviadasHoje={enviadasHoje} ir={ir} />
      </main>
    </>
  )
}

// Mesma pessoa em mais de uma vaga no mesmo dia
function repetidos(d) {
  if (!d) return []
  const todos = [...(d.responsaveis || []), ...(d.auxiliares || []), d.supervisor].filter((p) => p?.nome)
  const vistos = []
  const dobrados = new Set()
  for (const p of todos) {
    if (vistos.some((q) => (p.id ? q.id === p.id : !q.id && q.nome === p.nome))) dobrados.add(p.nome)
    vistos.push(p)
  }
  return [...dobrados]
}

// Total de escalas de cada um (como na planilha), a partir do primeiro relatório enviado
function TotalEscalas({ api, usuarios, escala, enviadasHoje, ir }) {
  const { dados } = useCarregar(async () => {
    const [escalas, vistorias] = await Promise.all([api.listarEscalas(), api.listarVistorias()])
    const inicio = vistorias.map((v) => v.data).sort()[0] || null
    return { escalas, inicio }
  }, [escala?.atualizadoEm, enviadasHoje.length])
  if (!dados) return null
  const grupos = totaisEscala(dados.escalas, dados.inicio, usuarios)

  return (
    <>
      <h2 className="secao">Total de escalas</h2>
      {!dados.inicio ? (
        <div className="bloco vazio">A contagem começa no dia do primeiro relatório enviado.</div>
      ) : (
        <>
          <p className="tela-sub" style={{ margin: '0 0 10px' }}>
            Desde {dataExtensa(dados.inicio)}, contando as semanas já lançadas.
          </p>
          <div className="totais-escala">
            {grupos.map((g) => (
              <section className="bloco" key={g.papel} aria-label={`Total de escalas: ${g.nome}`}>
                <h3>{g.nome}</h3>
                {g.lista.length === 0 ? (
                  <p className="vazio" style={{ padding: 12 }}>
                    Ninguém com essa função.
                  </p>
                ) : (
                  <ul>
                    {g.lista.map((p) => (
                      <li key={p.id || p.nome}>
                        {p.id ? (
                          <button className="link" onClick={() => ir(`integrante/${p.id}`)}>
                            {p.nome}
                          </button>
                        ) : (
                          <span>{p.nome}</span>
                        )}
                        <strong>{p.total}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function rotuloSemana(semana, atual, hoje) {
  const fimDeSemana = [0, 6].includes(diaDaSemana(hoje))
  if (semana === atual) return fimDeSemana ? 'Próxima semana' : 'Esta semana'
  if (semana === somarDias(atual, 7)) return fimDeSemana ? 'Daqui a duas semanas' : 'Próxima semana'
  if (semana === somarDias(atual, -7)) return fimDeSemana ? 'Esta semana' : 'Semana passada'
  return `Semana de ${dataExtensa(semana)}`
}

function NomePessoa({ p, ir }) {
  if (!p?.nome) return <span className="a-definir">A definir</span>
  if (!p.id) return <span className="nome-escala">{p.nome}</span>
  return (
    <button className="nome-escala link" onClick={() => ir(`integrante/${p.id}`)}>
      {p.nome}
    </button>
  )
}

// Escolha do integrante: lista da equipe ou um nome digitado (quem ainda não tem acesso ao app)
function SeletorPessoa({ valor, ativos, onChange, rotulo, funcao }) {
  // Primeiro quem tem a função da vaga; os demais ficam num grupo à parte (para trocas)
  const daFuncao = ativos.filter((u) => funcaoDe(u) === funcao)
  const outros = ativos.filter((u) => funcaoDe(u) !== funcao)
  const digitado = valor && !valor.id
  const [texto, setTexto] = useState(digitado ? valor.nome : '')
  const [digitando, setDigitando] = useState(Boolean(digitado))
  useEffect(() => {
    setDigitando(Boolean(valor && !valor.id))
    setTexto(valor && !valor.id ? valor.nome : '')
  }, [valor?.id, valor?.nome]) // eslint-disable-line react-hooks/exhaustive-deps

  if (digitando) {
    const confirmar = () => {
      const n = texto.trim()
      if (n === (valor?.nome || '')) return
      onChange(n ? { nome: n } : null)
      if (!n) setDigitando(false)
    }
    return (
      <span className="seletor-texto">
        <input
          className="entrada"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="Cad. Nome"
          aria-label={rotulo}
          autoFocus={!digitado}
        />
        <button
          className="acao-redonda"
          aria-label="Escolher da lista"
          onClick={() => {
            setDigitando(false)
            if (valor) onChange(null)
          }}
        >
          <Icone nome="X" tamanho={18} />
        </button>
      </span>
    )
  }

  return (
    <select
      className="entrada"
      value={valor?.id || ''}
      aria-label={rotulo}
      onChange={(e) => {
        const v = e.target.value
        if (v === '__outro') return setDigitando(true)
        const u = ativos.find((x) => x.id === v)
        onChange(u ? { id: u.id, nome: nomeCompleto(u) } : null)
      }}
    >
      <option value="">— a definir —</option>
      <optgroup label={FUNCOES[funcao]?.grupo || 'Equipe'}>
        {daFuncao.map((u) => (
          <option key={u.id} value={u.id}>
            {nomeCompleto(u)}
          </option>
        ))}
      </optgroup>
      {outros.length > 0 && (
        <optgroup label="Outros integrantes">
          {outros.map((u) => (
            <option key={u.id} value={u.id}>
              {nomeCompleto(u)}
              {funcaoDe(u) ? ` (${FUNCOES[funcaoDe(u)].nome.toLowerCase()})` : ''}
            </option>
          ))}
        </optgroup>
      )}
      <option value="__outro">Outro (digitar nome)…</option>
    </select>
  )
}
