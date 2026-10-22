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

export const PERFIS = {
  pendente: 'Aguardando liberação',
  vistoriador: 'Vistoriador',
  coordenador: 'Coordenador',
  supervisao: 'Supervisão',
  admin: 'Administrador',
}

export const podeGerir = (u) => u && (u.perfil === 'coordenador' || u.perfil === 'admin')
export const podeVistoriar = (u) => u && ['vistoriador', 'coordenador', 'admin'].includes(u.perfil)

// Escala da missão: segunda a sexta. Na segunda são dois cadetes de serviço.
export const ESCALA = {
  dias: [1, 2, 3, 4, 5], // 1 = segunda … 5 = sexta
  vagas: { 1: 2, 2: 1, 3: 1, 4: 1, 5: 1 },
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
