import { useState } from 'react'
import { useApp } from '../App'
import { Avatar, Cabecalho, Icone, Selo } from '../components/base'
import { PERFIS, dadosCompletos, podeGerir } from '../config'
import { proximosServicos } from '../lib/escala'
import { dataCurta, linkWhatsApp, nomeCompleto, soDigitos, telefoneBR } from '../lib/formato'

const PELOTOES = ['1º Pelotão Alfa', '1º Pelotão Bravo', '1º Pelotão Charlie', '2º Pelotão Alfa', '2º Pelotão Bravo', '2º Pelotão Charlie']
const porNome = (a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')

// A lista de integrantes sai separada por função
const GRUPOS = [
  { nome: 'Coordenação', perfis: ['admin', 'coordenador'] },
  { nome: 'Supervisão', perfis: ['supervisao'] },
  { nome: 'Vistoriadores', perfis: ['vistoriador'] },
]
const voltarOu = (rota) => (window.history.length > 1 ? window.history.back() : (window.location.hash = `/${rota}`))

// Lista de integrantes: todos veem; o coordenador também libera os acessos aqui
export default function Equipe() {
  const { api, usuario, usuarios, ir, avisar, recarregarUsuarios } = useApp()
  const gestor = podeGerir(usuario)
  const pendentes = usuarios.filter((u) => u.perfil === 'pendente').sort(porNome)
  const ativos = usuarios.filter((u) => u.perfil !== 'pendente').sort(porNome)
  const eu = usuarios.find((u) => u.id === usuario.id) || usuario

  async function liberar(u) {
    await api.definirPerfil(u.id, 'vistoriador')
    await recarregarUsuarios()
    avisar(`${nomeCompleto(u)} liberado.`)
  }

  return (
    <>
      <Cabecalho titulo="Equipe" sub={`${ativos.length} ${ativos.length === 1 ? 'integrante' : 'integrantes'} da missão`} />
      <main>
        <ul className="bloco vtr-lista">
          <li>
            <button className="pessoa" onClick={() => ir('meus-dados')}>
              <Avatar u={eu} />
              <span>
                <span className="nome">Meus dados</span>
                <span className="detalhe">{dadosCompletos(eu) ? `${nomeCompleto(eu)} · ${eu.pelotao}` : 'Preencha telefone, pelotão e nome completo'}</span>
              </span>
              {dadosCompletos(eu) ? <Icone nome="Pencil" tamanho={18} style={{ color: 'var(--tinta-2)' }} /> : <Selo nivel="atencao">Completar</Selo>}
            </button>
          </li>
        </ul>

        {gestor && pendentes.length > 0 && (
          <>
            <h2 className="secao">Aguardando liberação ({pendentes.length})</h2>
            <ul className="bloco vtr-lista">
              {pendentes.map((u) => (
                <li key={u.id} className="pessoa">
                  <Avatar u={u} />
                  <span>
                    <span className="nome">{nomeCompleto(u)}</span>
                    <span className="detalhe">{u.email}</span>
                  </span>
                  <button className="botao" style={{ minHeight: 40 }} onClick={() => liberar(u)}>
                    Liberar
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {GRUPOS.map((g) => {
          const membros = ativos.filter((u) => g.perfis.includes(u.perfil))
          if (!membros.length) return null
          return (
            <section key={g.nome}>
              <h2 className="secao">
                {g.nome} ({membros.length})
              </h2>
              <ul className="bloco vtr-lista">
                {membros.map((u) => (
                  <li key={u.id}>
                    <button className="pessoa" onClick={() => ir(`integrante/${u.id}`)}>
                      <Avatar u={u} />
                      <span>
                        <span className="nome">
                          {nomeCompleto(u)}
                          {u.id === usuario.id && <span className="detalhe"> (você)</span>}
                        </span>
                        <span className="detalhe">
                          {/* Na coordenação, distingue o administrador do coordenador */}
                          {[u.pelotao, u.perfil === 'admin' && PERFIS.admin].filter(Boolean).join(' · ') || 'Dados não preenchidos'}
                        </span>
                      </span>
                      <Icone nome="ChevronRight" style={{ color: 'var(--tinta-2)' }} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        {api.modo === 'demo' && gestor && (
          <button
            className="botao texto"
            style={{ marginTop: 16 }}
            onClick={async () => {
              await api.apagarTudo()
              window.location.hash = '/hoje'
            }}
          >
            Apagar os dados da demonstração
          </button>
        )}
      </main>
    </>
  )
}

// Ficha de um integrante
export function Integrante({ id }) {
  const { api, usuario, usuarios, escalas, hoje, ir, avisar, recarregarUsuarios } = useApp()
  const u = usuarios.find((x) => x.id === id)
  const gestor = podeGerir(usuario)
  const proprio = id === usuario.id
  // Só o administrador cria outros administradores
  const opcoes = Object.entries(PERFIS).filter(([k]) => usuario.perfil === 'admin' || k !== 'admin')

  if (!u) {
    return (
      <>
        <Cabecalho titulo="Integrante" voltar={() => ir('equipe')} />
        <main>
          <div className="bloco vazio">Carregando…</div>
        </main>
      </>
    )
  }

  const servicos = proximosServicos(Object.values(escalas), u, hoje).slice(0, 4)
  const tel = soDigitos(u.telefone)

  async function mudar(perfil) {
    await api.definirPerfil(u.id, perfil)
    await recarregarUsuarios()
    avisar(`${nomeCompleto(u)}: ${PERFIS[perfil]}.`)
  }

  return (
    <>
      <Cabecalho titulo={nomeCompleto(u)} sub="Integrante da missão" voltar={() => voltarOu('equipe')} />
      <main>
        <div className="ficha-pessoa">
          <Avatar u={u} grande />
          <div>
            <div className="tela-titulo" style={{ fontSize: 26, margin: 0 }}>
              {nomeCompleto(u)}
            </div>
            {u.nomeInteiro && <div className="tela-sub" style={{ margin: 0 }}>{u.nomeInteiro}</div>}
            <div style={{ marginTop: 6 }}>
              <Selo nivel={u.perfil === 'pendente' ? 'atencao' : 'neutro'}>{PERFIS[u.perfil]}</Selo>
            </div>
          </div>
        </div>

        <div className="bloco">
          <div className="campo-linha">
            <div className="icone-item">
              <Icone nome="Phone" />
            </div>
            <div className="rotulo">
              <small>Telefone</small>
              {tel ? telefoneBR(u.telefone) : 'Não informado'}
            </div>
            {tel && (
              <span className="botoes" style={{ flexWrap: 'nowrap' }}>
                <a className="botao secundario icone-so" href={`tel:+55${tel}`} aria-label="Ligar">
                  <Icone nome="Phone" />
                </a>
                <a className="botao secundario icone-so" href={linkWhatsApp(u.telefone)} target="_blank" rel="noreferrer" aria-label="Abrir conversa no WhatsApp">
                  <Icone nome="MessageCircle" />
                </a>
              </span>
            )}
          </div>
          <div className="campo-linha">
            <div className="icone-item">
              <Icone nome="Mail" />
            </div>
            <div className="rotulo" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <small>E-mail</small>
              {u.email ? <a href={`mailto:${u.email}`}>{u.email}</a> : 'Não informado'}
            </div>
            <span />
          </div>
          <div className="campo-linha">
            <div className="icone-item">
              <Icone nome="Users" />
            </div>
            <div className="rotulo">
              <small>Pelotão</small>
              {u.pelotao || 'Não informado'}
            </div>
            <span />
          </div>
        </div>

        <h2 className="secao">Próximos serviços</h2>
        <div className="bloco">
          {servicos.length === 0 ? (
            <div className="vazio" style={{ padding: 16 }}>
              Nenhum serviço nesta semana nem na próxima.
            </div>
          ) : (
            servicos.map((s) => (
              <button key={s.dia + s.papel} className="campo-linha linha-botao" onClick={() => ir('escala')}>
                <div className="icone-item">
                  <Icone nome="CalendarDays" />
                </div>
                <div className="rotulo">{dataCurta(s.dia)}</div>
                <Selo nivel={s.papel === 'responsavel' ? 'ok' : 'neutro'}>{s.papel === 'responsavel' ? 'Responsável' : 'Supervisor'}</Selo>
              </button>
            ))
          )}
        </div>

        {proprio && (
          <button className="botao secundario cheio" style={{ marginTop: 16 }} onClick={() => ir('meus-dados')}>
            <Icone nome="Pencil" tamanho={18} /> Editar meus dados
          </button>
        )}

        {gestor && !proprio && (
          <>
            <h2 className="secao">Acesso</h2>
            <div className="bloco pad">
              {u.perfil === 'pendente' ? (
                <button className="botao cheio" onClick={() => mudar('vistoriador')}>
                  Liberar acesso
                </button>
              ) : (
                <label className="form" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Perfil no app</span>
                  <select className="entrada" value={u.perfil} onChange={(e) => mudar(e.target.value)}>
                    {opcoes.map(([k, n]) => (
                      <option key={k} value={k}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}

// Cada integrante preenche os próprios dados depois de liberado
export function MeusDados() {
  const { api, usuario, usuarios, avisar, recarregarUsuarios } = useApp()
  const [f, setF] = useState({
    posto: usuario.posto || 'Cad.',
    nome: usuario.nome || '',
    nomeInteiro: usuario.nomeInteiro || '',
    pelotao: usuario.pelotao || '',
    telefone: telefoneBR(usuario.telefone) || '',
  })
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const mudar = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const pelotoes = Array.from(new Set([...PELOTOES, ...usuarios.map((u) => u.pelotao).filter(Boolean)]))

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    const tel = soDigitos(f.telefone)
    if (!f.nome.trim()) return setErro('Informe o nome de guerra.')
    if (tel && (tel.length < 10 || tel.length > 11)) return setErro('Telefone com DDD: (41) 99999-9999.')
    setOcupado(true)
    try {
      await api.salvarMeusDados(usuario.id, { ...f, telefone: tel })
      await recarregarUsuarios()
      avisar('Dados salvos.')
      voltarOu('equipe')
    } catch (x) {
      setErro(x.message || 'Não foi possível salvar.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <Cabecalho titulo="Meus dados" sub="Aparecem para os integrantes da missão" voltar={() => voltarOu('equipe')} />
      <main>
        <form className="bloco pad form" onSubmit={salvar}>
          <div className="dupla">
            <label>
              Posto
              <input className="entrada" value={f.posto} onChange={mudar('posto')} placeholder="Cad." />
            </label>
            <label>
              Nome de guerra
              <input className="entrada" value={f.nome} onChange={mudar('nome')} autoComplete="nickname" required />
            </label>
          </div>
          <label>
            Nome completo
            <input className="entrada" value={f.nomeInteiro} onChange={mudar('nomeInteiro')} autoComplete="name" autoCapitalize="words" />
          </label>
          <label>
            Pelotão
            <input className="entrada" value={f.pelotao} onChange={mudar('pelotao')} list="pelotoes" placeholder="1º Pelotão Alfa" />
            <datalist id="pelotoes">
              {pelotoes.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <label>
            Telefone (WhatsApp)
            <input
              className="entrada"
              type="tel"
              inputMode="tel"
              value={f.telefone}
              onChange={mudar('telefone')}
              onBlur={() => setF((x) => ({ ...x, telefone: telefoneBR(x.telefone) }))}
              placeholder="(41) 99999-9999"
              autoComplete="tel-national"
            />
          </label>
          <label>
            E-mail
            <input className="entrada" value={usuario.email || ''} disabled />
          </label>
          {erro && <div className="erro-form">{erro}</div>}
          <button className="botao cheio" disabled={ocupado}>
            {ocupado ? 'Salvando…' : 'Salvar'}
          </button>
        </form>
        {api.modo !== 'demo' && <AlterarSenha />}
        <button className="botao texto cheio" style={{ marginTop: 12 }} onClick={() => api.sair()}>
          <Icone nome="LogOut" tamanho={18} /> Sair do app
        </button>
      </main>
    </>
  )
}

function AlterarSenha() {
  const { api, avisar } = useApp()
  const vazio = { atual: '', nova: '', repetir: '' }
  const [f, setF] = useState(vazio)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const mudar = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function trocar(e) {
    e.preventDefault()
    setErro('')
    if (f.nova.length < 6) return setErro('A nova senha precisa ter pelo menos 6 caracteres.')
    if (f.nova !== f.repetir) return setErro('As duas senhas novas não são iguais.')
    if (f.nova === f.atual) return setErro('A nova senha é igual à atual.')
    setOcupado(true)
    try {
      await api.alterarSenha(f.atual, f.nova)
      setF(vazio)
      avisar('Senha alterada.')
    } catch (x) {
      setErro(x.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <h2 className="secao">Alterar senha</h2>
      <form className="bloco pad form" onSubmit={trocar}>
        <label>
          Senha atual
          <input className="entrada" type="password" value={f.atual} onChange={mudar('atual')} autoComplete="current-password" required />
        </label>
        <label>
          Nova senha
          <input className="entrada" type="password" value={f.nova} onChange={mudar('nova')} autoComplete="new-password" required />
        </label>
        <label>
          Repita a nova senha
          <input className="entrada" type="password" value={f.repetir} onChange={mudar('repetir')} autoComplete="new-password" required />
        </label>
        {erro && <div className="erro-form">{erro}</div>}
        <button className="botao cheio secundario" disabled={ocupado}>
          {ocupado ? 'Alterando…' : 'Alterar senha'}
        </button>
      </form>
    </>
  )
}
