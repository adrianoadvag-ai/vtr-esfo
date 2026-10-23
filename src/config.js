// Configurações da missão. Ajuste aqui os itens do checklist e os limites de alerta.

export const APP_NOME = 'Missão Viaturas'
export const UNIDADE = 'EsFO · APMG'

// Limites de alerta (sugestões do projeto — o coordenador define os oficiais)
export const LIMITES = {
  combustivelAtencao: 2, // em oitavos: 2/8 = 1/4 de tanque ou menos
  kmParaTroca: 1000, // faltam até 1.000 km para a troca de óleo
  diasParaTroca: 15, // faltam até 15 dias para a troca de óleo
  saltoKm: 500, // KM maior que isso desde a última vistoria pede confirmação
}

// Níveis de gravidade
export const NIVEIS = {
  critico: { nome: 'Crítico', ordem: 3 },
  atencao: { nome: 'Atenção', ordem: 2 },
  info: { nome: 'Informativo', ordem: 1 },
}

// Itens marcados por tique. `alts` são as opções que aparecem ao tocar no botão de alteração.
// `nivel` é a gravidade padrão de uma alteração; `niveis` sobrepõe por opção.
export const ITENS = [
  {
    id: 'oleo',
    nome: 'Nível de óleo',
    icone: 'Droplet',
    rel: 'Nível de óleo',
    okTexto: 'Normal',
    alts: ['Baixo', 'Não foi possível verificar'],
    nivel: 'atencao',
  },
  {
    id: 'fluidos',
    nome: 'Fluidos',
    detalhe: 'Arrefecimento, freio e direção',
    icone: 'Droplets',
    rel: 'Fluídos',
    okTexto: 'S/A',
    alts: ['Arrefecimento baixo', 'Fluido de freio baixo', 'Fluido de direção baixo', 'Vazamento'],
    nivel: 'atencao',
    niveis: { 'Fluido de freio baixo': 'critico', Vazamento: 'critico' },
  },
  {
    id: 'sinais',
    nome: 'Sinais sonoros e luminosos',
    icone: 'Siren',
    rel: 'Sinais sonoros e luminosos',
    okTexto: 'S/A',
    alts: ['Sirene', 'Giroflex', 'Faróis', 'Lanternas / setas'],
    nivel: 'critico',
    niveis: { 'Lanternas / setas': 'atencao' },
  },
  {
    id: 'radio',
    nome: 'Rádio',
    icone: 'Radio',
    rel: 'Rádio',
    okTexto: 'Operante',
    alts: ['Inoperante', 'Com falhas'],
    nivel: 'atencao',
    so: (vtr) => vtr.temRadio !== false,
  },
  {
    id: 'freios',
    nome: 'Freios e painel',
    detalhe: 'Pedal, avisos acesos no painel',
    icone: 'Disc',
    rel: 'Freios e painel',
    okTexto: 'S/A',
    alts: ['Freio fraco', 'Aviso de freio no painel', 'Aviso de ABS', 'Outro aviso no painel'],
    nivel: 'critico',
    niveis: { 'Outro aviso no painel': 'atencao' },
    compacto: true,
  },
  {
    id: 'pneus',
    nome: 'Pneus',
    icone: 'CircleDot',
    rel: 'Pneus',
    okTexto: 'S/A',
    alts: ['Dianteiro esquerdo', 'Dianteiro direito', 'Traseiro esquerdo', 'Traseiro direito', 'Estepe'],
    nivel: 'atencao',
    compacto: true,
  },
  {
    id: 'bateria',
    nome: 'Bateria e partida',
    icone: 'Battery',
    rel: 'Bateria',
    okTexto: 'S/A',
    alts: ['Não ligou', 'Bateria fraca'],
    nivel: 'atencao',
    niveis: { 'Não ligou': 'critico' },
    compacto: true,
  },
  {
    id: 'cartao',
    nome: 'Cartão de abastecimento',
    icone: 'CreditCard',
    rel: 'Cartão de abastecimento',
    okTexto: 'S/A',
    alts: ['Bateria fraca', 'Ausente'],
    nivel: 'atencao',
    compacto: true,
  },
]

// Acesso ao app. A função na missão (abaixo) é que define o que cada um faz.
export const PERFIS = {
  pendente: 'Aguardando liberação',
  vistoriador: 'Integrante',
  supervisao: 'Integrante',
  coordenador: 'Coordenador',
  admin: 'Administrador',
}

// Funções na missão, na ordem em que aparecem na Equipe
export const FUNCOES = {
  coordenador: { nome: 'Coordenador', grupo: 'Coordenação', quem: 'Oficial responsável pela missão' },
  supervisor: { nome: 'Supervisor', grupo: 'Supervisores', quem: 'Cadete do 3º ano' },
  responsavel: { nome: 'Responsável', grupo: 'Responsáveis', quem: 'Cadete do 1º ano /1' },
  auxiliar: { nome: 'Auxiliar do responsável', grupo: 'Auxiliares', quem: 'Cadete do 1º ano /2' },
}

// Função de um integrante (quem foi liberado antes das funções é deduzido do perfil antigo)
export function funcaoDe(u) {
  if (!u) return null
  if (u.funcao && FUNCOES[u.funcao]) return u.funcao
  if (u.perfil === 'supervisao') return 'supervisor'
  if (u.perfil === 'coordenador') return 'coordenador'
  return null
}

// Perfil de acesso que acompanha a função (o administrador continua administrador)
export const perfilPara = (u, funcao) => (u.perfil === 'admin' ? 'admin' : funcao === 'coordenador' ? 'coordenador' : 'vistoriador')

const liberado = (u) => Boolean(u) && Boolean(u.perfil) && u.perfil !== 'pendente'
const comando = (u) => Boolean(u) && (u.perfil === 'coordenador' || u.perfil === 'admin')

// Coordenador e administrador: liberam a equipe e definem as funções
export const podeGerir = comando
// Todos os integrantes liberados: vistoria, viaturas (cadastro, situação, troca de óleo, exclusão) e pendências
export const podeVistoriar = liberado
export const podeGerirViaturas = liberado
// Escala: montada pelos responsáveis (coordenador e administrador também podem)
export const podeMontarEscala = (u) => liberado(u) && (comando(u) || funcaoDe(u) === 'responsavel')
// Excluir um relatório enviado (ex.: testes): responsáveis e supervisores, além do coordenador e do administrador
export const podeExcluirRelatorio = (u) => liberado(u) && (comando(u) || ['responsavel', 'supervisor'].includes(funcaoDe(u)))

export const SITUACOES = { ativa: 'Ativa', manutencao: 'Em manutenção', baixada: 'Baixada' }

// Escala da missão: segunda a sexta. Na segunda são dois responsáveis; todo dia, um auxiliar e um supervisor.
export const ESCALA = {
  dias: [1, 2, 3, 4, 5], // 1 = segunda … 5 = sexta
  vagas: { 1: 2, 2: 1, 3: 1, 4: 1, 5: 1 },
  auxiliares: 1,
}

// Rotina de manutenção das VTR (planilha da missão), por dia da semana
export const ROTINA = {
  1: 'Funcionamento dos motores, verificar a água, óleo, palhetas, lataria, KM, pneus e limpeza.',
  2: 'Verificar a limpeza externa/interna.',
  3: 'Funcionamento dos motores e verificar a limpeza externa/interna.',
  4: 'Verificar a limpeza externa/interna.',
  5: 'Funcionamento dos motores e verificar a limpeza externa/interna.',
}

// Dados que cada integrante preenche depois de liberado
export const dadosCompletos = (u) => Boolean(u?.nomeInteiro?.trim() && u?.telefone?.trim() && u?.pelotao?.trim())
