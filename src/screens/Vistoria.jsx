import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, FotoMini, Icone, ItemTique, Marcador } from '../components/base'
import CartaoTroca from '../components/CartaoTroca'
import { LIMITES, podeGerirViaturas, podeVistoriar } from '../config'
import { km, nomeCompleto } from '../lib/formato'
import { avaliar, exigida, itensDa, travaDeOutro } from '../lib/vistoria'
import { atuaComoGestor, escalaDoDia } from '../lib/escala'
import FiguraVtr, { ModeloVtr } from '../components/FiguraVtr'

export default function Vistoria({ vtrId }) {
  const { viaturas, vistoria, hoje, ir, api, usuario, avisar, escalas, usuarios, recarregarViaturas } = useApp()
  const vtr = viaturas.find((v) => v.id === vtrId)
  const enviada = vistoria?.status === 'enviada'
  const pode = !enviada && podeVistoriar(usuario)
  const eu = useMemo(() => ({ uid: usuario.id, nome: nomeCompleto(usuario) }), [usuario])

  // Trava: 'verificando' | 'minha' | 'outra'. Só quem tem a trava edita esta VTR.
  const [posse, setPosse] = useState('verificando')
  const posseRef = useRef(posse)
  posseRef.current = posse
  const [, setTique] = useState(0)
  const cancelada = useRef(false)
  const doOutro = travaDeOutro(vistoria, vtrId, usuario.id)
  const somenteLeitura = !pode || posse !== 'minha'

  let [reg, setReg] = useState(null)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const carregado = useRef(null)
  const timer = useRef(null)
  const pendente = useRef(null)
  // Rodada aberta no momento da gravação (muda depois de um envio)
  const rodada = useRef(vistoria)
  rodada.current = vistoria

  // Carrega o registro desta VTR uma vez por tela (depois o estado local manda)
  useEffect(() => {
    if (carregado.current === vtrId) return
    if (vistoria === undefined) return
    carregado.current = vtrId
    setReg(vistoria?.registros?.[vtrId] || { itens: {} })
  }, [vtrId, vistoria])

  // Pega a trava ao abrir, renova a cada minuto e solta ao sair
  const tentarTravar = async (forcar = false) => {
    const { id, seq } = rodada.current
    try {
      const r = await api.travarViatura(id, hoje, seq, vtrId, eu, forcar)
      if (r.ok) {
        if (posseRef.current !== 'minha') {
          // Recarrega a ficha: pode ter mudado enquanto outro cadete mexia
          setReg(rodada.current?.registros?.[vtrId] || { itens: {} })
        }
        setPosse('minha')
      } else if (!r.enviada) {
        if (posseRef.current === 'minha') {
          pendente.current = null
          avisar(`${r.trava?.nome || 'Outro cadete'} assumiu esta viatura.`)
        }
        setPosse('outra')
      }
    } catch (e) {
      avisar(e.message)
    }
  }
  useEffect(() => {
    if (!pode) return
    cancelada.current = false
    setPosse('verificando')
    tentarTravar()
    const renovar = setInterval(() => posseRef.current === 'minha' && tentarTravar(), 60000)
    return () => {
      clearInterval(renovar)
      if (posseRef.current === 'minha' && !cancelada.current) api.liberarViatura(rodada.current.id, vtrId, usuario.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vtrId, pode, vistoria?.id])

  // Enquanto outro tem a trava, confere de 30 em 30 s se ela foi solta ou expirou
  useEffect(() => {
    if (posse !== 'outra') return
    const t = setInterval(() => setTique((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [posse])
  useEffect(() => {
    if (pode && posse === 'outra' && !doOutro) tentarTravar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pode, posse, doOutro])

  // Salva sozinho 400 ms depois da última mudança, e ao sair da tela
  const gravar = (r) => {
    pendente.current = r
    clearTimeout(timer.current)
    timer.current = setTimeout(descarregar, 400)
  }
  const descarregar = () => {
    const r = pendente.current
    if (!r) return
    pendente.current = null
    if (posseRef.current !== 'minha') return
    const { por: _p, em: _e, ...limpo } = r
    const { id, seq } = rodada.current
    // O gestor (3º ano) que vistoria continua identificado como gestor no relatório
    const gestor = atuaComoGestor(escalaDoDia(escalas, hoje, usuarios), usuario)
    const por = `${nomeCompleto(usuario)}${gestor ? ' (gestor)' : ''}`
    api.salvarRegistro(id, hoje, seq, vtrId, limpo, por).catch((e) => avisar(e.message))
  }
  useEffect(() => () => {
    clearTimeout(timer.current)
    descarregar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vtrId])

  const mudar = (patch) => {
    if (somenteLeitura) return
    setReg((r) => {
      const novo = { ...r, ...patch }
      gravar(novo)
      return novo
    })
  }
  const mudarItem = (id, valor) => {
    if (somenteLeitura) return
    setReg((r) => {
      const itens = { ...(r.itens || {}) }
      if (valor) itens[id] = valor
      else delete itens[id]
      const novo = { ...r, itens }
      gravar(novo)
      return novo
    })
  }

  async function cancelar() {
    if (!window.confirm('Cancelar a vistoria desta viatura? Tudo o que foi marcado nela será apagado.')) return
    clearTimeout(timer.current)
    pendente.current = null
    cancelada.current = true
    try {
      await api.cancelarRegistro(rodada.current.id, vtrId)
      avisar(`Vistoria da VTR ${vtr.prefixo} cancelada.`)
      ir('hoje')
    } catch (e) {
      cancelada.current = false
      avisar(e.message)
    }
  }

  const ordem = useMemo(() => viaturas.filter((v) => v.situacao !== 'baixada'), [viaturas])

  if (!vtr) {
    return (
      <>
        <Cabecalho titulo="Viatura" voltar={() => ir('hoje')} />
        <main className="vazio">Viatura não encontrada.</main>
      </>
    )
  }
  if (!reg) return <Cabecalho titulo={`VTR ${vtr.prefixo}`} voltar={() => ir('hoje')} />
  // Sem a trava, mostra a ficha ao vivo (o que o colega está marcando)
  if (posse !== 'minha') reg = vistoria?.registros?.[vtrId] || { itens: {} }
  const comecada = Boolean(vistoria?.registros?.[vtrId]) || Object.keys(reg).some((k) => k !== 'itens') || Object.keys(reg.itens || {}).length > 0

  const a = avaliar(vtr, reg, hoje)
  const kmNum = reg.km === '' || reg.km === undefined ? null : Number(reg.km)
  const kmMenor = kmNum !== null && vtr.kmAtual && kmNum < vtr.kmAtual
  const kmSalto = kmNum !== null && vtr.kmAtual && kmNum - vtr.kmAtual > LIMITES.saltoKm
  const temAlt = Object.values(reg.itens || {}).some((x) => x.estado === 'alt')
  const nivelItem = (it) => {
    const v = reg.itens?.[it.id]
    if (v?.estado !== 'alt') return null
    const ops = v.alts?.length ? v.alts : [null]
    return ops.some((o) => (it.niveis?.[o] || it.nivel) === 'critico') ? 'critico' : 'atencao'
  }

  const proxima = () => {
    clearTimeout(timer.current)
    descarregar()
    const i = ordem.findIndex((v) => v.id === vtrId)
    const depois = [...ordem.slice(i + 1), ...ordem.slice(0, i)]
    const regs = { ...(vistoria?.registros || {}), [vtrId]: reg }
    const prox = depois.find((v) => exigida(v) && !avaliar(v, regs[v.id], hoje).completo)
    if (prox) ir(`vistoria/${prox.id}`)
    else ir(podeVistoriar(usuario) && !enviada ? 'revisao' : 'hoje')
  }

  async function addFoto(e) {
    const arq = e.target.files?.[0]
    e.target.value = ''
    if (!arq) return
    setEnviandoFoto(true)
    try {
      const url = await api.enviarFoto(hoje, vtrId, arq)
      mudar({ fotos: [...(reg.fotos || []), url] })
    } catch {
      avisar('Não foi possível enviar a foto. Verifique a conexão e tente de novo.')
    } finally {
      setEnviandoFoto(false)
    }
  }

  return (
    <>
      <Cabecalho titulo={`VTR ${vtr.prefixo}`} sub={vtr.modelo} voltar={() => ir('hoje')} />
      <main>
        <div className="vtr-topo">
          <FiguraVtr vtr={vtr} tamanho={128} />
          <span className="vtr-topo-texto">
            <span className="prefixo">{vtr.prefixo}</span>
            <span className="modelo">
              <ModeloVtr modelo={vtr.modelo} />
            </span>
          </span>
        </div>
        <div className="vtr-info">
          Último KM {km(vtr.kmAtual) || '—'}
        </div>

        {pode && posse === 'outra' && (
          <div className="aviso-trava" role="status">
            <strong>Em vistoria por {doOutro?.nome || 'outro cadete'}.</strong> Você só pode ver. A viatura fica livre quando ele sair da tela
            ou depois de 3 min sem uso.
            {podeGerirViaturas(usuario) && (
              <button
                className="botao texto"
                onClick={() => window.confirm('Assumir esta viatura? O cadete que está nela passa a só ver.') && tentarTravar(true)}
              >
                Assumir a vistoria desta viatura
              </button>
            )}
          </div>
        )}

        {reg.naoVistoriada ? (
          <div className="bloco obs">
            <label htmlFor="motivo">Motivo da não vistoria</label>
            <textarea
              id="motivo"
              value={reg.motivoNao || ''}
              onChange={(e) => mudar({ motivoNao: e.target.value })}
              placeholder="Ex.: viatura na oficina desde 18/10"
              disabled={somenteLeitura}
            />
            {!somenteLeitura && (
              <button className="botao texto" style={{ marginTop: 8 }} onClick={() => mudar({ naoVistoriada: false })}>
                Fazer a vistoria desta viatura
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="bloco">
              <div className="campo-linha">
                <div className="icone-item">
                  <Icone nome="Gauge" />
                </div>
                <label className="rotulo" htmlFor="km">
                  KM atual
                </label>
                <input
                  id="km"
                  className="entrada-km"
                  inputMode="numeric"
                  value={reg.km === undefined || reg.km === null ? '' : km(reg.km)}
                  onChange={(e) => {
                    const n = e.target.value.replace(/\D/g, '')
                    mudar({ km: n === '' ? '' : Number(n) })
                  }}
                  placeholder={km(vtr.kmAtual) || '0'}
                  disabled={somenteLeitura}
                />
              </div>
              {kmMenor && <div className="aviso erro">Menor que o último KM registrado ({km(vtr.kmAtual)}). Confira o hodômetro.</div>}
              {!kmMenor && kmSalto && (
                <div className="aviso atencao">
                  {km(kmNum - vtr.kmAtual)} km desde o último registro. Confira se o número está certo.
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--linha)' }}>
                <Marcador rotulo="Combustível" icone="Fuel" valor={reg.comb} onChange={(n) => mudar({ comb: n })} desativado={somenteLeitura} />
              </div>
              {vtr.usaArla && (
                <div style={{ borderTop: '1px solid var(--linha)' }}>
                  <Marcador rotulo="Arla 32" icone="Droplet" valor={reg.arla} onChange={(n) => mudar({ arla: n })} desativado={somenteLeitura} />
                </div>
              )}
            </div>

            <CartaoTroca
              vtr={vtr}
              kmHoje={reg.km}
              hoje={hoje}
              usuario={usuario}
              api={api}
              recarregarViaturas={recarregarViaturas}
              avisar={avisar}
              podeEditar={podeGerirViaturas(usuario)}
            />

            <div className="bloco">
              {itensDa(vtr).map((it) => (
                <ItemTique
                  key={it.id}
                  item={it}
                  valor={reg.itens?.[it.id]}
                  onChange={(v) => mudarItem(it.id, v)}
                  nivel={nivelItem(it)}
                  desativado={somenteLeitura}
                />
              ))}
            </div>

            <div className={`bloco obs ${temAlt && !(reg.obs || '').trim() ? 'exigida' : ''}`}>
              <label htmlFor="obs">{temAlt ? 'Descreva a alteração' : 'Observações (opcional)'}</label>
              <textarea
                id="obs"
                value={reg.obs || ''}
                onChange={(e) => mudar({ obs: e.target.value })}
                placeholder={temAlt ? 'O que foi encontrado, avisos no painel, desde quando…' : 'Ex.: situação do pneu resolvida'}
                disabled={somenteLeitura}
              />
              <div className="fotos">
                {(reg.fotos || []).map((f, i) => (
                  <FotoMini
                    key={f}
                    refFoto={f}
                    alt={`Foto ${i + 1} da VTR ${vtr.prefixo}`}
                    onRemover={somenteLeitura ? null : () => mudar({ fotos: reg.fotos.filter((x) => x !== f) })}
                  />
                ))}
                {!somenteLeitura && (
                  <label className="add-foto" aria-label="Adicionar foto">
                    <span style={{ display: 'grid', placeItems: 'center', gap: 2 }}>
                      <Icone nome="Camera" />
                      {enviandoFoto ? 'Enviando…' : 'Foto'}
                    </span>
                    <input type="file" accept="image/*" capture="environment" onChange={addFoto} hidden />
                  </label>
                )}
              </div>
            </div>

            {!somenteLeitura && (
              <button className="botao texto" style={{ marginTop: 8 }} onClick={() => mudar({ naoVistoriada: true })}>
                Não foi possível vistoriar esta viatura
              </button>
            )}
          </>
        )}

        {!somenteLeitura && comecada && (
          <button className="botao texto perigo" style={{ marginTop: 4 }} onClick={cancelar}>
            <Icone nome="X" /> Cancelar a vistoria desta viatura
          </button>
        )}
      </main>

      <div className="rodape-fixo">
        {!a.completo && !somenteLeitura && <div className="falta">
            {a.pendentes.length === 1 ? 'Falta' : `Faltam ${a.pendentes.length}`}: {a.pendentes.slice(0, 3).join(', ')}
            {a.pendentes.length > 3 ? '…' : ''}
          </div>}
        {a.completo && !somenteLeitura ? (
          <div className="botoes" style={{ flexWrap: 'nowrap' }}>
            <button
              className="botao secundario"
              onClick={() => {
                clearTimeout(timer.current)
                descarregar()
                ir('revisao')
              }}
            >
              <Icone nome="Send" /> Enviar
            </button>
            <button className="botao" style={{ flex: 2 }} onClick={proxima}>
              Próxima VTR
            </button>
          </div>
        ) : (
          <button className="botao cheio" onClick={proxima}>
            {somenteLeitura ? 'Próxima viatura' : 'Salvar e ir para a próxima'}
          </button>
        )}
      </div>
    </>
  )
}
