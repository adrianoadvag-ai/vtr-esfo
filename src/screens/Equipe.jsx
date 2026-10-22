import { useApp } from '../App'
import { Cabecalho, Selo, useCarregar } from '../components/base'
import { PERFIS } from '../config'
import { nomeCompleto } from '../lib/formato'

export default function Equipe() {
  const { api, usuario, avisar } = useApp()
  const { dados, recarregar, carregando } = useCarregar(() => api.listarUsuarios(), [])
  const pendentes = (dados || []).filter((u) => u.perfil === 'pendente')
  const ativos = (dados || []).filter((u) => u.perfil !== 'pendente')
  // Só o administrador cria outros administradores
  const opcoes = Object.entries(PERFIS).filter(([k]) => usuario.perfil === 'admin' || k !== 'admin')

  async function mudar(u, perfil) {
    await api.definirPerfil(u.id, perfil)
    recarregar()
    avisar(`${nomeCompleto(u)}: ${PERFIS[perfil]}.`)
  }

  const linha = (u) => (
    <li key={u.id} className="campo-linha" style={{ gridTemplateColumns: '1fr auto' }}>
      <span>
        <span style={{ fontWeight: 500 }}>{nomeCompleto(u)}</span>
        {u.email && <small style={{ display: 'block', color: 'var(--tinta-2)', fontSize: 13 }}>{u.email}</small>}
      </span>
      {u.perfil === 'pendente' ? (
        <span className="botoes" style={{ flexWrap: 'nowrap' }}>
          <button className="botao" style={{ minHeight: 40 }} onClick={() => mudar(u, 'vistoriador')}>
            Liberar
          </button>
        </span>
      ) : u.id === usuario.id ? (
        <Selo nivel="neutro">{PERFIS[u.perfil]} (você)</Selo>
      ) : (
        <select className="entrada" style={{ width: 'auto' }} value={u.perfil} onChange={(e) => mudar(u, e.target.value)} aria-label={`Perfil de ${nomeCompleto(u)}`}>
          {opcoes.map(([k, n]) => (
            <option key={k} value={k}>
              {n}
            </option>
          ))}
        </select>
      )}
    </li>
  )

  return (
    <>
      <Cabecalho titulo="Equipe" sub="Acessos da missão das viaturas" />
      <main>
        {carregando && !dados ? (
          <div className="vazio">Carregando…</div>
        ) : (
          <>
            {pendentes.length > 0 && (
              <>
                <h2 className="secao" style={{ marginTop: 0 }}>
                  Aguardando liberação ({pendentes.length})
                </h2>
                <ul className="bloco" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {pendentes.map(linha)}
                </ul>
              </>
            )}
            <h2 className="secao" style={pendentes.length ? {} : { marginTop: 0 }}>
              Com acesso ({ativos.length})
            </h2>
            <ul className="bloco" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {ativos.map(linha)}
            </ul>
            {api.modo === 'demo' && (
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
          </>
        )}
      </main>
    </>
  )
}
