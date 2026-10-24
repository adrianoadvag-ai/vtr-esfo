import { useEffect, useState } from 'react'
import api from '../data'
import {
  Battery,
  Camera,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleDot,
  Cog,
  Disc3,
  Fan,
  SprayCan,
  Thermometer,
  Wind,
  CalendarCheck,
  ClipboardCheck,
  Copy,
  CreditCard,
  Disc,
  Droplet,
  Droplets,
  FileBarChart,
  FileDown,
  FileSpreadsheet,
  Fuel,
  Gauge,
  History,
  LogOut,
  Mail,
  MessageCircle,
  OctagonAlert,
  Pencil,
  Phone,
  Plus,
  Radio,
  Send,
  Share2,
  Siren,
  Sparkles,
  Trash2,
  TriangleAlert,
  UserRound,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import brasaoApmg from '../assets/brasao-apmg.png'
import brasaoEsfo from '../assets/brasao-esfo.png'
import logoViatura from '../assets/logo-app.webp'
import { CONDICOES, NIVEIS } from '../config'
import { dataBR, fracao, iniciais } from '../lib/formato'
import { textoPendencia } from '../lib/pendencia'

export { brasaoApmg, brasaoEsfo, logoViatura }

// Círculo com as iniciais do integrante
export function Avatar({ u, grande }) {
  return (
    <span className={`avatar ${grande ? 'grande' : ''}`} aria-hidden="true">
      {iniciais(u)}
    </span>
  )
}

// Só os ícones usados no app (importar todos deixaria o app 1 MB mais pesado)
const ICONES = { CalendarCheck, Cog, Disc3, Fan, SprayCan, Thermometer, Wind, Battery, CalendarDays, Camera, CarFront, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, CircleDot, ClipboardCheck, Copy, CreditCard, Disc, Droplet, Droplets, FileBarChart, FileDown, FileSpreadsheet, Fuel, Gauge, History, LogOut, Mail, MessageCircle, OctagonAlert, Pencil, Phone, Plus, Radio, Send, Share2, Siren, Sparkles, Trash2, TriangleAlert, UserRound, Users, Wrench, X }

export function Icone({ nome, tamanho = 20, ...resto }) {
  const C = ICONES[nome] || Circle
  return <C size={tamanho} strokeWidth={2} aria-hidden="true" {...resto} />
}

export function Brasoes() {
  return (
    <div className="brasoes">
      <img src={brasaoApmg} alt="Brasão da APMG" />
      <img src={brasaoEsfo} alt="Brasão da EsFO" />
    </div>
  )
}

export function Cabecalho({ titulo, sub, voltar, acao }) {
  return (
    <header className="cabecalho">
      {voltar ? (
        <button className="voltar" onClick={voltar} aria-label="Voltar">
          <Icone nome="ChevronLeft" tamanho={26} />
        </button>
      ) : (
        <Brasoes />
      )}
      <div className="titulo">
        <h1>{titulo}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {acao}
    </header>
  )
}

export function Selo({ nivel, children }) {
  return <span className={`selo ${nivel}`}>{children}</span>
}

export function SeloNivel({ nivel }) {
  if (!nivel) return null
  return (
    <Selo nivel={nivel}>
      <Icone nome={nivel === 'critico' ? 'OctagonAlert' : 'TriangleAlert'} tamanho={14} />
      {NIVEIS[nivel].nome}
    </Selo>
  )
}

// Barra de 8 partes, como o marcador de combustível do painel
export function Marcador({ valor, onChange, rotulo, icone, desativado }) {
  const baixo = valor !== null && valor !== undefined && valor <= 2
  return (
    <div>
      <div className="campo-linha" style={{ borderBottom: 0 }}>
        <div className="icone-item">
          <Icone nome={icone} />
        </div>
        <div className="rotulo">{rotulo}</div>
        <div className="marcador" style={{ padding: 0 }}>
          <span className="valor">{fracao(valor) || '—'}</span>
        </div>
      </div>
      <div className="marcador">
        <div className="segmentos" role="radiogroup" aria-label={rotulo}>
          <button
            className={`reserva ${valor === 0 ? 'marcada' : ''}`}
            onClick={() => onChange(0)}
            disabled={desativado}
            role="radio"
            aria-checked={valor === 0}
            aria-label="Reserva"
          >
            R
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button
              key={n}
              className={`${valor >= n ? 'cheio' : ''} ${baixo ? 'baixo' : ''}`}
              onClick={() => onChange(n)}
              disabled={desativado}
              role="radio"
              aria-checked={valor === n}
              aria-label={fracao(n)}
            />
          ))}
        </div>
        <div className="escala" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span>1/2</span>
          <span />
          <span />
          <span />
          <span>C</span>
        </div>
      </div>
    </div>
  )
}

// Item conferido por tique: um toque = S/A; o botão de alerta abre as opções de alteração
// Descrição da alteração no próprio item: vira a pendência e entra no detalhamento
function NotaItem({ item, valor, onChange, desativado }) {
  const vazia = !(valor?.nota || '').trim()
  return (
    <label className={`nota-item ${vazia ? 'exigida' : ''}`}>
      <span>Descreva a alteração</span>
      <textarea
        value={valor?.nota || ''}
        onChange={(e) => onChange({ ...valor, nota: e.target.value })}
        placeholder={`O que foi encontrado em ${item.nome.toLowerCase()}, desde quando, providência…`}
        disabled={desativado}
        rows={2}
      />
    </label>
  )
}

// Pendência já aberta para este item (aparece mesmo com o item S/A, para quem vistoria saber)
function AvisoPendencia({ pendencia }) {
  if (!pendencia) return null
  return (
    <div className="pendencia-item">
      <Icone nome="Wrench" tamanho={14} /> Pendência aberta desde {dataBR(pendencia.abertaEm)}: {textoPendencia(pendencia)}
    </div>
  )
}

export function ItemTique({ item, valor, onChange, nivel, desativado, pendencia }) {
  const estado = valor?.estado
  const alts = valor?.alts || []
  const marcarOk = () => onChange(estado === 'ok' ? null : { estado: 'ok' })
  // Ao marcar alteração num item que já tem pendência aberta, a descrição anterior vem preenchida para atualizar
  const marcarAlt = () => onChange(estado === 'alt' ? null : { estado: 'alt', alts: [], nota: pendencia?.descricao || '' })
  const alternar = (o) => onChange({ ...valor, estado: 'alt', alts: alts.includes(o) ? alts.filter((x) => x !== o) : [...alts, o] })
  return (
    <div className={`item ${estado === 'alt' ? `alt nivel-${nivel || 'critico'}` : ''}`}>
      <div className="linha">
        <div className="icone-item">
          <Icone nome={item.icone} />
        </div>
        <div className="rotulo">
          {item.nome}
          {item.detalhe && <small>{item.detalhe}</small>}
        </div>
        <button
          className={`redondo alerta ${estado === 'alt' ? 'marcado' : ''}`}
          onClick={marcarAlt}
          disabled={desativado}
          aria-pressed={estado === 'alt'}
          aria-label={`${item.nome}: com alteração`}
        >
          <Icone nome="TriangleAlert" tamanho={20} />
        </button>
        <button
          className={`redondo tique ${estado === 'ok' ? 'marcado' : ''}`}
          onClick={marcarOk}
          disabled={desativado}
          aria-pressed={estado === 'ok'}
          aria-label={`${item.nome}: sem alteração`}
        >
          <Icone nome="Check" tamanho={24} strokeWidth={3} />
        </button>
      </div>
      {estado === 'alt' && (
        <>
          <div className="opcoes">
            {item.alts.map((o) => (
              <button key={o} className={`opcao ${alts.includes(o) ? 'marcada' : ''}`} onClick={() => alternar(o)} disabled={desativado}>
                {o}
              </button>
            ))}
          </div>
          <NotaItem item={item} valor={valor} onChange={onChange} desativado={desativado} />
        </>
      )}
      {estado !== 'alt' && <AvisoPendencia pendencia={pendencia} />}
    </div>
  )
}

// Item de condição (pneus, pastilhas): Excelente, Bom, Regular ou Troca urgente. "Troca urgente" conta como alteração.
export function ItemCondicao({ item, valor, onChange, desativado, pendencia }) {
  const atual = valor?.condicao
  const escolher = (c) =>
    onChange(
      atual === c ? null : c === 'Troca urgente' ? { estado: 'alt', condicao: c, alts: [c], nota: valor?.nota || pendencia?.descricao || '' } : { estado: 'ok', condicao: c },
    )
  return (
    <div className={`item ${atual === 'Troca urgente' ? 'alt nivel-critico' : ''}`}>
      <div className="linha">
        <div className="icone-item">
          <Icone nome={item.icone} />
        </div>
        <div className="rotulo">
          {item.nome}
          {item.detalhe && <small>{item.detalhe}</small>}
        </div>
      </div>
      <div className="opcoes condicoes" role="radiogroup" aria-label={item.nome}>
        {CONDICOES.map((c) => (
          <button
            key={c}
            className={`opcao ${atual === c ? 'marcada' : ''} ${c === 'Troca urgente' ? 'urgente' : c === 'Regular' ? 'regular' : ''}`}
            onClick={() => escolher(c)}
            disabled={desativado}
            role="radio"
            aria-checked={atual === c}
          >
            {c}
          </button>
        ))}
      </div>
      {atual === 'Troca urgente' ? <NotaItem item={item} valor={valor} onChange={onChange} desativado={desativado} /> : <AvisoPendencia pendencia={pendencia} />}
    </div>
  )
}

export function Toast({ texto, onFim }) {
  useEffect(() => {
    if (!texto) return
    const t = setTimeout(onFim, 2600)
    return () => clearTimeout(t)
  }, [texto, onFim])
  if (!texto) return null
  return (
    <div className="toast" role="status">
      {texto}
    </div>
  )
}

export function useCarregar(fn, deps) {
  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: null })
  const [versao, setVersao] = useState(0)
  useEffect(() => {
    let vivo = true
    setEstado((e) => ({ ...e, carregando: true }))
    fn()
      .then((dados) => vivo && setEstado({ dados, carregando: false, erro: null }))
      .catch((erro) => vivo && setEstado({ dados: null, carregando: false, erro }))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, versao])
  return { ...estado, recarregar: () => setVersao((v) => v + 1) }
}

// Miniatura de foto: busca a imagem (Firestore ou Storage) e abre em tela cheia ao tocar
export function FotoMini({ refFoto, alt, onRemover }) {
  const [src, setSrc] = useState(null)
  const [aberta, setAberta] = useState(false)
  useEffect(() => {
    let vivo = true
    api.lerFoto(refFoto).then((s) => vivo && setSrc(s)).catch(() => {})
    return () => {
      vivo = false
    }
  }, [refFoto])
  return (
    <div className="foto">
      <button className="ver" onClick={() => setAberta(true)} aria-label={`Ampliar ${alt}`} disabled={!src}>
        {src ? <img src={src} alt={alt} /> : <span className="foto-carregando" />}
      </button>
      {onRemover && (
        <button className="remover" onClick={onRemover} aria-label="Remover foto">
          <Icone nome="X" tamanho={14} />
        </button>
      )}
      {aberta && (
        <div className="foto-cheia" role="dialog" aria-label={alt} onClick={() => setAberta(false)}>
          <img src={src} alt={alt} />
          <button className="fechar" aria-label="Fechar">
            <Icone nome="X" tamanho={24} />
          </button>
        </div>
      )}
    </div>
  )
}
