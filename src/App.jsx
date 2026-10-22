import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from './data'
import { Icone, Toast, brasaoEsfo } from './components/base'
import { podeGerir } from './config'
import { hojeISO } from './lib/formato'
import Login, { Aguardando } from './screens/Login'
import Hoje from './screens/Hoje'
import Vistoria from './screens/Vistoria'
import Revisao from './screens/Revisao'
import Relatorio from './screens/Relatorio'
import Pendencias from './screens/Pendencias'
import Historico from './screens/Historico'
import Viaturas, { EditarViatura } from './screens/Viaturas'
import Equipe from './screens/Equipe'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

// Navegação simples pelo endereço (#/vistoria/vtr-16843): o botão voltar do celular funciona
function useRota() {
  const ler = () => (window.location.hash.replace(/^#\/?/, '') || 'hoje').split('/')
  const [rota, setRota] = useState(ler)
  useEffect(() => {
    const f = () => {
      setRota(ler())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  const ir = useCallback((caminho) => {
    window.location.hash = `/${caminho}`
  }, [])
  return [rota, ir]
}

export default function App() {
  const [usuario, setUsuario] = useState(undefined)
  const [rota, ir] = useRota()
  const [viaturas, setViaturas] = useState([])
  const [vistoria, setVistoria] = useState(null)
  const [ocorrencias, setOcorrencias] = useState([])
  const [toast, setToast] = useState('')
  const [hoje, setHoje] = useState(hojeISO())

  useEffect(() => api.onUsuario(setUsuario), [])

  // Vira o dia sozinho se o app ficar aberto
  useEffect(() => {
    const t = setInterval(() => setHoje(hojeISO()), 60000)
    return () => clearInterval(t)
  }, [])

  const liberado = usuario && usuario.perfil !== 'pendente'

  const recarregarViaturas = useCallback(() => api.listarViaturas().then(setViaturas).catch(() => {}), [])
  const recarregarOcorrencias = useCallback(() => api.listarOcorrencias().then(setOcorrencias).catch(() => {}), [])

  useEffect(() => {
    if (!liberado) return
    recarregarViaturas()
    recarregarOcorrencias()
    return api.observarVistoria(hoje, setVistoria)
  }, [liberado, hoje, recarregarViaturas, recarregarOcorrencias])

  const ctx = useMemo(
    () => ({
      api,
      usuario,
      hoje,
      viaturas,
      vistoria,
      ocorrencias,
      ir,
      avisar: setToast,
      recarregarViaturas,
      recarregarOcorrencias,
    }),
    [usuario, hoje, viaturas, vistoria, ocorrencias, ir, recarregarViaturas, recarregarOcorrencias],
  )

  if (usuario === undefined) {
    return (
      <div className="carregando">
        <img src={brasaoEsfo} alt="Carregando" />
      </div>
    )
  }
  if (!usuario) return <Login />
  if (!liberado) return <Aguardando usuario={usuario} />

  const [tela, param] = rota
  const abertas = ocorrencias.filter((o) => o.status === 'aberta').length

  let conteudo
  if (tela === 'vistoria') conteudo = <Vistoria vtrId={param} />
  else if (tela === 'revisao') conteudo = <Revisao />
  else if (tela === 'relatorio') conteudo = <Relatorio data={param} />
  else if (tela === 'pendencias') conteudo = <Pendencias />
  else if (tela === 'historico') conteudo = <Historico />
  else if (tela === 'viaturas') conteudo = <Viaturas />
  else if (tela === 'viatura') conteudo = <EditarViatura id={param} />
  else if (tela === 'equipe' && podeGerir(usuario)) conteudo = <Equipe />
  else conteudo = <Hoje />

  const abas = [
    { id: 'hoje', nome: 'Hoje', icone: 'ClipboardCheck', ativa: ['hoje', 'vistoria', 'revisao'].includes(tela) || !tela },
    { id: 'pendencias', nome: 'Pendências', icone: 'Wrench', contador: abertas },
    { id: 'historico', nome: 'Histórico', icone: 'History', ativa: ['historico', 'relatorio'].includes(tela) },
    { id: 'viaturas', nome: 'Viaturas', icone: 'CarFront', ativa: ['viaturas', 'viatura'].includes(tela) },
    ...(podeGerir(usuario) ? [{ id: 'equipe', nome: 'Equipe', icone: 'Users' }] : []),
  ]

  return (
    <Ctx.Provider value={ctx}>
      <div className="app">
        {api.modo === 'demo' && <div className="faixa-demo">Modo demonstração: os dados ficam só neste aparelho.</div>}
        {conteudo}
        <nav className="nav" aria-label="Navegação principal">
          {abas.map((a) => (
            <button
              key={a.id}
              className={(a.ativa ?? tela === a.id) ? 'ativo' : ''}
              onClick={() => ir(a.id)}
              aria-current={(a.ativa ?? tela === a.id) ? 'page' : undefined}
            >
              <Icone nome={a.icone} tamanho={22} />
              {a.nome}
              {a.contador > 0 && <span className="contador">{a.contador}</span>}
            </button>
          ))}
        </nav>
        <Toast texto={toast} onFim={() => setToast('')} />
      </div>
    </Ctx.Provider>
  )
}
