import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from './data'
import { Icone, Toast, logoViatura } from './components/base'
import { podeGerir } from './config'
import { hojeISO, somarDias } from './lib/formato'
import { semanaPadrao } from './lib/escala'
import { idRodada, trocaDeOleo } from './lib/vistoria'
import Login, { Aguardando } from './screens/Login'
import Hoje from './screens/Hoje'
import Vistoria from './screens/Vistoria'
import Revisao from './screens/Revisao'
import Relatorio from './screens/Relatorio'
import Pendencias from './screens/Pendencias'
import Historico from './screens/Historico'
import Viaturas, { EditarViatura } from './screens/Viaturas'
import Equipe, { Integrante, MeusDados } from './screens/Equipe'
import Escala from './screens/Escala'
import FichaViatura from './screens/FichaViatura'
import Mensal from './screens/Mensal'
import { ehManutencao } from './lib/categoria-pendencia'
import { naFrota } from './lib/situacao'

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
  const [rodadas, setRodadas] = useState([])
  const [ocorrencias, setOcorrencias] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [escalas, setEscalas] = useState({})
  const [toast, setToast] = useState('')
  const [hoje, setHoje] = useState(hojeISO())

  useEffect(() => api.onUsuario(setUsuario), [])

  // Vira o dia sozinho se o app ficar aberto
  useEffect(() => {
    const t = setInterval(() => setHoje(hojeISO()), 60000)
    return () => clearInterval(t)
  }, [])

  const liberado = usuario && !['pendente', 'removido'].includes(usuario.perfil)

  const recarregarViaturas = useCallback(() => api.listarViaturas().then(setViaturas).catch(() => {}), [])
  const recarregarOcorrencias = useCallback(() => api.listarOcorrencias().then(setOcorrencias).catch(() => {}), [])
  const recarregarUsuarios = useCallback(() => api.listarUsuarios().then(setUsuarios).catch(() => {}), [])

  useEffect(() => {
    if (!liberado) return
    recarregarViaturas()
    recarregarOcorrencias()
    recarregarUsuarios()
    return api.observarDia(hoje, setRodadas)
  }, [liberado, hoje, recarregarViaturas, recarregarOcorrencias, recarregarUsuarios])

  // Escala desta semana e da próxima (para "seu próximo serviço" e para o relatório)
  const semanaAtual = semanaPadrao(hoje)
  useEffect(() => {
    if (!liberado) return
    const semanas = [semanaAtual, somarDias(semanaAtual, 7)]
    const paradas = semanas.map((s) => api.observarEscala(s, (e) => setEscalas((x) => ({ ...x, [s]: e }))))
    return () => paradas.forEach((f) => f())
  }, [liberado, semanaAtual])

  // Rodada aberta do dia (rascunho) e relatórios já enviados hoje
  const { vistoria, enviadasHoje } = useMemo(() => {
    const seqDe = (r) => r.seq || 1
    const enviadas = rodadas.filter((r) => r.status === 'enviada').sort((a, b) => (a.enviadaEm || 0) - (b.enviadaEm || 0))
    const abertas = rodadas.filter((r) => r.status !== 'enviada').sort((a, b) => seqDe(b) - seqDe(a))
    const maxSeq = rodadas.reduce((m, r) => Math.max(m, seqDe(r)), 0)
    const aberta = abertas[0]
    const seq = aberta ? seqDe(aberta) : maxSeq + 1
    return {
      vistoria: { registros: {}, ...aberta, id: aberta?.id || idRodada(hoje, seq), seq, data: hoje },
      enviadasHoje: enviadas,
    }
  }, [rodadas, hoje])

  const ctx = useMemo(
    () => ({
      api,
      usuario,
      hoje,
      viaturas,
      vistoria,
      enviadasHoje,
      ocorrencias,
      usuarios,
      escalas,
      semanaAtual,
      ir,
      avisar: setToast,
      recarregarViaturas,
      recarregarOcorrencias,
      recarregarUsuarios,
    }),
    [usuario, hoje, viaturas, vistoria, enviadasHoje, ocorrencias, usuarios, escalas, semanaAtual, ir, recarregarViaturas, recarregarOcorrencias, recarregarUsuarios],
  )

  if (usuario === undefined) {
    return (
      <div className="carregando">
        <img src={logoViatura} alt="Carregando" />
      </div>
    )
  }
  if (!usuario) return <Login />
  if (!liberado) return <Aguardando usuario={usuario} />

  const [tela, param] = rota
  // Contador: manutenção em aberto, incluindo a troca de óleo perto ou vencida (calculada pelo app)
  const manutAbertas = ocorrencias.filter((o) => o.status === 'aberta' && ehManutencao(o))
  const abertas =
    manutAbertas.length +
    viaturas.filter((v) => naFrota(v) && trocaDeOleo(v, null, hoje).alerta && !manutAbertas.some((o) => o.viaturaId === v.id && o.itemId === 'troca')).length
  const aguardando = podeGerir(usuario) ? usuarios.filter((u) => u.perfil === 'pendente').length : 0

  let conteudo
  if (tela === 'vistoria') conteudo = <Vistoria vtrId={param} />
  else if (tela === 'revisao') conteudo = <Revisao />
  else if (tela === 'relatorio') conteudo = <Relatorio data={param} />
  else if (tela === 'pendencias') conteudo = <Pendencias />
  else if (tela === 'historico') conteudo = <Historico />
  else if (tela === 'viaturas') conteudo = <Viaturas />
  else if (tela === 'viatura') conteudo = <EditarViatura id={param} />
  else if (tela === 'vtr') conteudo = <FichaViatura id={param} />
  else if (tela === 'mensal') conteudo = <Mensal mes={param} />
  else if (tela === 'escala') conteudo = <Escala semana={param} />
  else if (tela === 'equipe') conteudo = <Equipe />
  else if (tela === 'integrante') conteudo = <Integrante id={param} />
  else if (tela === 'meus-dados') conteudo = <MeusDados />
  else conteudo = <Hoje />

  const abas = [
    { id: 'hoje', nome: 'Hoje', icone: 'ClipboardCheck', ativa: ['hoje', 'vistoria', 'revisao'].includes(tela) || !tela },
    { id: 'escala', nome: 'Escala', icone: 'CalendarDays' },
    { id: 'pendencias', nome: 'Pendências', icone: 'Wrench', contador: abertas },
    { id: 'historico', nome: 'Histórico', icone: 'History', ativa: ['historico', 'relatorio', 'mensal'].includes(tela) },
    { id: 'viaturas', nome: 'Viaturas', icone: 'CarFront', ativa: ['viaturas', 'viatura', 'vtr'].includes(tela) },
    { id: 'equipe', nome: 'Equipe', icone: 'Users', ativa: ['equipe', 'integrante', 'meus-dados'].includes(tela), contador: aguardando },
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
