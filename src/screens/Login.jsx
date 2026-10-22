import { useState } from 'react'
import api from '../data'
import { Brasoes } from '../components/base'
import { APP_NOME, PERFIS } from '../config'

const ERROS = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/email-already-in-use': 'Este e-mail já tem cadastro. Use "Entrar".',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
  'auth/network-request-failed': 'Sem conexão com a internet.',
}
const msg = (e) => ERROS[e?.code] || e?.message || 'Não foi possível concluir.'

function Topo() {
  return (
    <>
      <Brasoes />
      <h1>{APP_NOME}</h1>
      <p className="sub">Escola de Formação de Oficiais · APMG</p>
      <div className="regua" />
    </>
  )
}

export default function Login() {
  return <div className="login">{api.modo === 'demo' ? <LoginDemo /> : <LoginFirebase />}</div>
}

function LoginDemo() {
  const usuarios = api.usuariosDemo()
  return (
    <>
      <Topo />
      <div className="caixa">
        <h2>Entrar na demonstração</h2>
        <p>Escolha um usuário. Os dados ficam só neste aparelho até o app ser ligado ao Firebase.</p>
        {usuarios.map((u) => (
          <button key={u.id} className="usuario-demo" onClick={() => api.entrarDemo(u.id)}>
            <span>
              {u.posto} {u.nome}
            </span>
            <small>{PERFIS[u.perfil]}</small>
          </button>
        ))}
      </div>
    </>
  )
}

function LoginFirebase() {
  const [aba, setAba] = useState('entrar')
  const [f, setF] = useState({ email: '', senha: '', posto: 'Cad.', nome: '' })
  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const mudar = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setInfo('')
    setOcupado(true)
    try {
      if (aba === 'entrar') await api.entrar(f.email, f.senha)
      else {
        if (!f.nome.trim()) throw new Error('Informe o nome de guerra.')
        await api.cadastrar(f)
      }
    } catch (x) {
      setErro(msg(x))
    } finally {
      setOcupado(false)
    }
  }

  async function esqueci() {
    setErro('')
    if (!f.email) return setErro('Digite seu e-mail e toque de novo em "Esqueci a senha".')
    try {
      await api.redefinirSenha(f.email)
      setInfo('Enviamos um link para redefinir a senha no seu e-mail.')
    } catch (x) {
      setErro(msg(x))
    }
  }

  return (
    <>
      <Topo />
      <form className="caixa form" onSubmit={enviar}>
        <div>
          <h2>{aba === 'entrar' ? 'Entrar' : 'Criar acesso'}</h2>
          <p style={{ margin: 0 }}>
            {aba === 'entrar' ? 'Use o e-mail e a senha do seu cadastro.' : 'O coordenador da missão libera o acesso depois do cadastro.'}
          </p>
        </div>
        {aba === 'cadastro' && (
          <div className="dupla">
            <label>
              Posto
              <input className="entrada" value={f.posto} onChange={mudar('posto')} placeholder="Cad. 1º PM" />
            </label>
            <label>
              Nome de guerra
              <input className="entrada" value={f.nome} onChange={mudar('nome')} autoComplete="nickname" />
            </label>
          </div>
        )}
        <label>
          E-mail
          <input className="entrada" type="email" value={f.email} onChange={mudar('email')} autoComplete="email" required />
        </label>
        <label>
          Senha
          <input
            className="entrada"
            type="password"
            value={f.senha}
            onChange={mudar('senha')}
            autoComplete={aba === 'entrar' ? 'current-password' : 'new-password'}
            required
            minLength={6}
          />
        </label>
        {erro && <div className="erro-form">{erro}</div>}
        {info && <div style={{ color: 'var(--ok)', fontSize: 14 }}>{info}</div>}
        <button className="botao cheio" disabled={ocupado}>
          {aba === 'entrar' ? 'Entrar' : 'Criar acesso'}
        </button>
        <div className="botoes">
          <button type="button" className="botao texto" onClick={() => setAba(aba === 'entrar' ? 'cadastro' : 'entrar')}>
            {aba === 'entrar' ? 'Criar acesso' : 'Já tenho acesso'}
          </button>
          {aba === 'entrar' && (
            <button type="button" className="botao texto" onClick={esqueci}>
              Esqueci a senha
            </button>
          )}
        </div>
      </form>
    </>
  )
}

export function Aguardando({ usuario }) {
  return (
    <div className="login">
      <Topo />
      <div className="caixa">
        <h2>Cadastro recebido</h2>
        <p>
          {usuario.nome ? `${usuario.posto} ${usuario.nome}, seu` : 'Seu'} acesso aguarda liberação do coordenador da missão. Assim que for
          liberado, esta tela muda sozinha.
        </p>
        <button className="botao secundario cheio" onClick={() => api.sair()}>
          Sair
        </button>
      </div>
    </div>
  )
}
