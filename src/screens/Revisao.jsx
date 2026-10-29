import { useEffect, useRef, useState } from 'react'
import { useApp } from '../App'
import { Cabecalho, Icone, Selo, SeloNivel, useCarregar } from '../components/base'
import { NIVEIS, SITUACOES, ativoNaMissao, funcaoDe, rotuloVaga } from '../config'
import { dataExtensa, nomeCompleto } from '../lib/formato'
import { ocorrenciasDoDia } from '../lib/ocorrencias'
import { avaliar, limpezaGeral, exigida, idRodada, juntarEnvios, montarRelatorio, travaDeOutro } from '../lib/vistoria'
import { atuaComoGestor, escalaDoDia } from '../lib/escala'
import { baixada } from '../lib/situacao'

export default function Revisao() {
  const { viaturas, vistoria, enviadasHoje, hoje, ir, api, usuario, ocorrencias, avisar, recarregarViaturas, recarregarOcorrencias, escalas, usuarios: equipe } = useApp()
  const registros = vistoria?.registros || {}
  const eu = nomeCompleto(usuario)
  // Escalados de hoje (se quem envia está na escala); senão, quem está enviando
  const escalaHoje = escalaDoDia(escalas, hoje, equipe)
  const escalados = (escalaHoje?.responsaveis || []).map((p) => p.nome).filter(Boolean)
  const escaladosAux = (escalaHoje?.auxiliares || []).map((p) => p.nome).filter(Boolean)
  // Gestor (3º ano) não entra na escala nem assina; se ele vistoriar, assinam os escalados do dia
  const souGestor = atuaComoGestor(escalaHoje, usuario)
  const naEscala = escalados.includes(eu) || escaladosAux.includes(eu) || souGestor
  const souAuxiliar = funcaoDe(usuario) === 'auxiliar'
  const [responsaveis, setResponsaveis] = useState(
    vistoria?.responsaveis?.length ? vistoria.responsaveis : naEscala || souAuxiliar ? escalados : [eu],
  )
  const [auxiliares, setAuxiliares] = useState(
    vistoria?.auxiliares?.length ? vistoria.auxiliares : naEscala ? escaladosAux : souAuxiliar ? [eu] : escaladosAux,
  )
  const [verTodos, setVerTodos] = useState(false)
  // A escala pode chegar depois que a tela abre: preenche os nomes enquanto ninguém mexeu neles
  const mexeu = useRef(Boolean(vistoria?.responsaveis?.length))
  const chaveEscala = [...escalados, '|', ...escaladosAux].join(',')
  useEffect(() => {
    if (mexeu.current || !chaveEscala.replace(/[|,]/g, '')) return
    setResponsaveis(naEscala || souAuxiliar ? escalados : [eu])
    setAuxiliares(naEscala ? escaladosAux : souAuxiliar ? [eu] : escaladosAux)
  }, [chaveEscala]) // eslint-disable-line react-hooks/exhaustive-deps
  const [verTexto, setVerTexto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [fora, setFora] = useState([]) // concluídas que o usuário tirou deste relatório
  const { dados: usuarios } = useCarregar(() => api.listarUsuarios(), [])

  const comRegistro = viaturas.filter((v) => registros[v.id])
  // VTR que outro cadete ainda está vistoriando não entra neste relatório
  const emUso = comRegistro.filter((v) => travaDeOutro(vistoria, v.id, usuario.id))
  const concluidas = comRegistro.filter((v) => !emUso.includes(v) && avaliar(v, registros[v.id], hoje).completo)
  const incompletas = comRegistro.filter((v) => !emUso.includes(v) && !concluidas.includes(v))
  const incluidas = concluidas.filter((v) => !fora.includes(v.id))
  const regsIncluidos = Object.fromEntries(incluidas.map((v) => [v.id, registros[v.id]]))
  const achados = incluidas
    .flatMap((v) => avaliar(v, registros[v.id], hoje).achados.map((x) => ({ ...x, v })))
    .sort((a, b) => NIVEIS[b.nivel].ordem - NIVEIS[a.nivel].ordem)
  const idsIncluidos = new Set(incluidas.map((v) => v.id))
  const abertas = ocorrencias.filter((o) => o.status === 'aberta')
  const abertasDestas = abertas.filter((o) => idsIncluidos.has(o.viaturaId))
  // Baixadas: entram no relatório com o motivo
  const foraDeServico = viaturas.filter((v) => baixada(v) && !idsIncluidos.has(v.id))
  const pronto = incluidas.length > 0 && (responsaveis.length > 0 || auxiliares.length > 0)

  // Um relatório por dia: o texto soma as VTR já enviadas hoje às desta rodada
  const dia = juntarEnvios(enviadasHoje, { incluidas: [...idsIncluidos], registros: regsIncluidos, responsaveis, auxiliares })
  const jaEnviadas = viaturas.filter((v) => dia.registros[v.id] && !idsIncluidos.has(v.id))
  const doDia = viaturas.filter((v) => dia.registros[v.id])
  const idsDoDia = new Set(doDia.map((v) => v.id))
  // Limpeza: vem do checklist de cada VTR (interna e externa)
  const limpeza = limpezaGeral(doDia, dia.registros, hoje)
  const texto = montarRelatorio({
    data: hoje,
    viaturas: doDia,
    registros: dia.registros,
    limpeza,
    responsaveis: dia.responsaveis,
    auxiliares: dia.auxiliares,
    pendenciasAbertas: abertasDestas,
    foraDeServico: foraDeServico.filter((v) => !idsDoDia.has(v.id)),
    totalFrota: viaturas.filter(exigida).length,
  })

  const ativos = (usuarios || []).filter(ativoNaMissao)
  const daFuncao = (f) => ativos.filter((u) => funcaoDe(u) === f).map(nomeCompleto)
  const todos = ativos.map(nomeCompleto)
  // Por padrão, só quem tem a função; "ver toda a equipe" mostra todos (para trocas de serviço)
  const opcoes = (escala, f, marcados) => Array.from(new Set([...escala, ...marcados, ...(verTodos ? [eu, ...todos] : daFuncao(f))]))
  const nomesResp = opcoes(escalados, 'responsavel', responsaveis)
  const nomesAux = opcoes(escaladosAux, 'auxiliar', auxiliares)
  const alternar = (n) => {
    mexeu.current = true
    setResponsaveis((r) => (r.includes(n) ? r.filter((x) => x !== n) : [...r, n]))
  }
  const alternarAux = (n) => {
    mexeu.current = true
    setAuxiliares((r) => (r.includes(n) ? r.filter((x) => x !== n) : [...r, n]))
  }
  const alternarVtr = (id) => setFora((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  async function enviar() {
    setEnviando(true)
    try {
      const kms = Object.fromEntries(
        incluidas.filter((v) => !registros[v.id].naoVistoriada && registros[v.id].km).map((v) => [v.id, Number(registros[v.id].km)]),
      )
      const { novas: novasOcorrencias, atualizadas } = ocorrenciasDoDia({ data: hoje, viaturas: incluidas, registros: regsIncluidos, abertas, por: eu, relatorioId: vistoria.id })
      // Incompletas e as que ficaram de fora seguem para a próxima rodada do dia
      const restantes = Object.fromEntries(Object.entries(registros).filter(([id]) => !idsIncluidos.has(id)))
      const seq = (vistoria.seq || 1) + 1
      await api.enviarVistoria(vistoria.id, hoje, {
        relatorio: texto,
        responsaveis,
        auxiliares,
        consolidado: true,
        supervisor: '',
        limpeza,
        kms,
        novasOcorrencias,
        atualizarOcorrencias: atualizadas,
        por: eu,
        viaturas,
        incluidas: [...idsIncluidos],
        restantes,
        proxima: { id: idRodada(hoje, seq), seq },
      })
      recarregarViaturas()
      recarregarOcorrencias()
      avisar(
        enviadasHoje.length
          ? 'Relatório do dia atualizado com as novas viaturas. Copie para o WhatsApp.'
          : 'Relatório enviado. Copie para o WhatsApp ou baixe o PDF.',
      )
      ir(`relatorio/${vistoria.id}`)
    } catch (e) {
      avisar(e.message || 'Não foi possível enviar.')
    } finally {
      setEnviando(false)
    }
  }

  if (concluidas.length === 0) {
    return (
      <>
        <Cabecalho titulo="Revisar e enviar" sub={dataExtensa(hoje)} voltar={() => ir('hoje')} />
        <main>
          <div className="bloco vazio">
            <p>Nenhuma viatura concluída nesta rodada. Conclua a vistoria de ao menos uma para gerar o relatório.</p>
            <button className="botao" onClick={() => ir('hoje')}>
              Voltar para as viaturas
            </button>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Cabecalho titulo="Revisar e enviar" sub={dataExtensa(hoje)} voltar={() => ir('hoje')} />
      <main>
        <h2 className="secao" style={{ marginTop: 0 }}>
          Viaturas neste relatório ({incluidas.length})
        </h2>
        <p className="tela-sub" style={{ margin: '0 0 10px' }}>
          Toque para tirar ou incluir. As que ficarem de fora continuam salvas para o próximo relatório de hoje.
        </p>
        <div className="chips">
          {concluidas.map((v) => (
            <button
              key={v.id}
              className={`opcao ${fora.includes(v.id) ? '' : 'marcada'}`}
              onClick={() => alternarVtr(v.id)}
              aria-pressed={!fora.includes(v.id)}
            >
              {v.prefixo} · {v.modelo.split('/').at(-1)}
            </button>
          ))}
        </div>
        {jaEnviadas.length > 0 && (
          <p className="tela-sub" style={{ margin: '10px 0 0' }}>
            Já enviadas hoje, continuam no mesmo relatório: {jaEnviadas.map((v) => v.prefixo).join(', ')}
          </p>
        )}
        {emUso.length > 0 && (
          <p className="tela-sub" style={{ margin: '10px 0 0' }}>
            Ainda em vistoria, ficam para depois:{' '}
            {emUso.map((v) => `${v.prefixo} (${travaDeOutro(vistoria, v.id, usuario.id).nome})`).join(', ')}
          </p>
        )}
        {incompletas.length > 0 && (
          <p className="tela-sub" style={{ margin: '10px 0 0' }}>
            Incompletas, ficam para depois:{' '}
            {incompletas.map((v, i) => (
              <span key={v.id}>
                {i > 0 && ', '}
                <button className="botao texto" style={{ minHeight: 0, padding: 0 }} onClick={() => ir(`vistoria/${v.id}`)}>
                  {v.prefixo}
                </button>
              </span>
            ))}
          </p>
        )}

        {foraDeServico.length > 0 && (
          <>
            <h2 className="secao">Baixadas ({foraDeServico.length})</h2>
            <div className="bloco">
              {foraDeServico.map((v, i) => (
                <button
                  key={v.id}
                  className="achado"
                  style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', borderTop: i ? '1px solid var(--linha)' : 0 }}
                  onClick={() => ir(`vtr/${v.id}`)}
                >
                  <span className="prefixo">{v.prefixo}</span>
                  <span className="texto">{v.motivoSituacao || 'Motivo não informado'}</span>
                  <span className="meta">
                    <Selo nivel="critico">{SITUACOES.baixada}</Selo>
                  </span>
                </button>
              ))}
            </div>
            <p className="tela-sub" style={{ margin: '6px 0 0', fontSize: 14 }}>
              Entram no relatório com o motivo. Para corrigir, toque na viatura.
            </p>
          </>
        )}

        <h2 className="secao">
          {achados.length ? `Alterações (${achados.length})` : 'Nenhuma alteração nestas viaturas'}
        </h2>
        {achados.length > 0 && (
          <div className="bloco">
            {achados.map((x, i) => (
              <button
                key={i}
                className="achado"
                style={{ width: '100%', background: 'none', border: 0, textAlign: 'left', borderTop: i ? '1px solid var(--linha)' : 0 }}
                onClick={() => ir(`vistoria/${x.v.id}`)}
              >
                <span className="prefixo">{x.v.prefixo}</span>
                <span className="texto">{x.texto}</span>
                <span className="meta">
                  <SeloNivel nivel={x.nivel} />
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Assinaturas: Responsável (1º ano /2), Supervisor (1º ano /1) e Gestor (3º ano) */}
        <h2 className="secao">{rotuloVaga('auxiliares')} do dia</h2>
        <div className="chips">
          {nomesAux.map((n) => (
            <button key={n} className={`opcao ${auxiliares.includes(n) ? 'marcada' : ''}`} onClick={() => alternarAux(n)}>
              {n}
            </button>
          ))}
          {nomesAux.length === 0 && <span className="tela-sub">Nenhum responsável na escala de hoje.</span>}
        </div>

        <h2 className="secao">{rotuloVaga('responsaveis', responsaveis.length)} do dia</h2>
        <div className="chips">
          {nomesResp.map((n) => (
            <button key={n} className={`opcao ${responsaveis.includes(n) ? 'marcada' : ''}`} onClick={() => alternar(n)}>
              {n}
            </button>
          ))}
          {nomesResp.length === 0 && <span className="tela-sub">Nenhum supervisor na escala de hoje.</span>}
        </div>
        {!verTodos && (
          <button className="botao texto" style={{ paddingLeft: 0 }} onClick={() => setVerTodos(true)}>
            Houve troca de serviço? Ver toda a equipe
          </button>
        )}

        {responsaveis.length === 0 && auxiliares.length === 0 && (
          <p className="tela-sub" style={{ margin: '8px 0 0' }}>
            Marque o responsável ou o supervisor do dia para enviar.
          </p>
        )}

        <h2 className="secao">Relatório</h2>
        <div className="bloco">
          {verTexto ? (
            <pre className="relatorio-texto">{texto}</pre>
          ) : (
            <button className="botao texto cheio" onClick={() => setVerTexto(true)}>
              Ver o texto que será gerado
            </button>
          )}
        </div>
      </main>

      <div className="rodape-fixo">
        <button className="botao cheio" disabled={!pronto || enviando} onClick={enviar}>
          <Icone nome="Send" /> {enviando ? 'Enviando…' : enviadasHoje.length ? 'Atualizar o relatório do dia' : 'Enviar relatório'}
        </button>
      </div>
    </>
  )
}
