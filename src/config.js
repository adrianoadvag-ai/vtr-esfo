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

// Relatório mensal: conta a partir deste dia (o que veio antes foram testes)
export const INICIO_RELATORIOS = '2026-10-24'

// Troca de óleo: próxima troca calculada a partir da última (o vistoriador pode mudar se a etiqueta disser outra coisa).
// VTR nova (ainda sem troca): alerta da revisão dos 10.000 km.
export const TROCA = {
  intervaloKm: 10000,
  intervaloMeses: 6,
  revisaoNovaKm: 10000,
}

// Conferência semanal mais detalhada (itens com `semanal: true`): dia da semana em que entra na vistoria (1 = segunda)
export const CONFERENCIA_SEMANAL = { dia: 1, nomeDia: 'segunda-feira' }
// Condição (pneus e pastilhas), como na planilha. "Troca urgente" é alteração; "Regular" aparece em destaque no relatório.
export const CONDICOES = ['Excelente', 'Bom', 'Regular', 'Troca urgente']

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
  // Fluidos: como na ficha da planilha (arrefecimento, freio e direção separados). No relatório, saem numa linha só quando todos estão S/A.
  {
    id: 'arrefecimento',
    nome: 'Fluido de arrefecimento',
    detalhe: 'Radiador',
    icone: 'Thermometer',
    rel: 'Fluido de arrefecimento',
    okTexto: 'S/A',
    alts: ['Baixo', 'Vazamento', 'Não foi possível verificar'],
    nivel: 'atencao',
    niveis: { Vazamento: 'critico' },
    grupo: 'fluidos',
  },
  {
    id: 'fluidoFreio',
    nome: 'Fluido de freio',
    icone: 'Droplets',
    rel: 'Fluido de freio',
    okTexto: 'S/A',
    alts: ['Baixo', 'Vazamento', 'Não foi possível verificar'],
    nivel: 'critico',
    niveis: { 'Não foi possível verificar': 'atencao' },
    grupo: 'fluidos',
  },
  {
    id: 'direcao',
    nome: 'Fluido da direção hidráulica',
    detalhe: 'Direção elétrica: marque S/A',
    icone: 'Droplet',
    rel: 'Fluido da direção',
    okTexto: 'S/A',
    alts: ['Baixo', 'Vazamento', 'Não foi possível verificar'],
    nivel: 'atencao',
    grupo: 'fluidos',
  },
  {
    id: 'limpador',
    nome: 'Água do limpador de para-brisa',
    icone: 'SprayCan',
    rel: 'Água do limpador',
    okTexto: 'S/A',
    alts: ['Baixa', 'Vazia', 'Esguicho não funciona'],
    nivel: 'info',
    grupo: 'fluidos',
  },
  {
    id: 'cambio',
    nome: 'Óleo do câmbio',
    detalhe: 'Verificar vazamento',
    icone: 'Cog',
    rel: 'Óleo do câmbio',
    okTexto: 'S/A',
    alts: ['Vazamento', 'Ruído ou tranco nas marchas'],
    nivel: 'atencao',
    grupo: 'fluidos',
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
  // Limpeza: conferida em cada VTR. Não vira pendência (resolve-se lavando/limpando);
  // no relatório, sai numa linha só quando interna e externa estão S/A, e o fim do relatório resume a frota.
  {
    id: 'limpezaInt',
    nome: 'Limpeza interna',
    detalhe: 'Bancos, assoalho, painel, lixo',
    icone: 'Sparkles',
    rel: 'Limpeza interna',
    okTexto: 'S/A',
    alts: ['Bancos sujos', 'Assoalho / tapetes sujos', 'Lixo no interior', 'Painel / vidros internos sujos'],
    nivel: 'info',
    grupo: 'limpeza',
    semPendencia: true,
  },
  {
    id: 'limpezaExt',
    nome: 'Limpeza externa',
    detalhe: 'Lataria, vidros, rodas',
    icone: 'CarFront',
    rel: 'Limpeza externa',
    okTexto: 'S/A',
    alts: ['Lataria suja', 'Vidros sujos', 'Rodas / para-lamas com barro'],
    nivel: 'info',
    grupo: 'limpeza',
    semPendencia: true,
  },
  // Conferência semanal (segunda-feira): condição de pneus e pastilhas, palhetas e filtro do A/C, como na planilha
  {
    id: 'condPneus',
    nome: 'Condição dos pneus',
    detalhe: 'Desgaste da banda e estepe',
    icone: 'CircleDot',
    rel: 'Condição dos pneus',
    tipo: 'condicao',
    semanal: true,
    nivel: 'critico',
  },
  {
    id: 'condPastilhas',
    nome: 'Condição das pastilhas de freio',
    icone: 'Disc3',
    rel: 'Condição das pastilhas',
    tipo: 'condicao',
    semanal: true,
    nivel: 'critico',
  },
  {
    id: 'palhetas',
    nome: 'Palhetas do limpador',
    icone: 'Wind',
    rel: 'Palhetas do vidro',
    okTexto: 'S/A',
    alts: ['Ressecadas', 'Riscando o vidro', 'Quebradas'],
    nivel: 'info',
    semanal: true,
  },
  {
    id: 'filtroAC',
    nome: 'Filtro do A/C',
    detalhe: 'Cheiro, fluxo de ar, gelando',
    icone: 'Fan',
    rel: 'Filtro do A/C',
    okTexto: 'S/A',
    alts: ['Sujo', 'Mau cheiro', 'A/C não gela'],
    nivel: 'info',
    semanal: true,
  },
]

// Acesso ao app. A função na missão (abaixo) é que define o que cada um faz.
export const PERFIS = {
  pendente: 'Aguardando liberação',
  vistoriador: 'Integrante',
  supervisao: 'Integrante',
  coordenador: 'Comandante da Missão',
  admin: 'Administrador',
}

// Funções na missão, na ordem em que aparecem na Equipe.
// ATENÇÃO: as chaves são as gravadas no banco e nas regras do Firestore; só os nomes exibidos mudaram (24 out. 2026).
//   chave 'coordenador' → Comandante da Missão (oficial)
//   chave 'supervisor'  → Gestor (3º ano)          — na escala: campo `supervisor`
//   chave 'responsavel' → Supervisor (1º ano /1)    — na escala: campo `responsaveis` (dois na segunda)
//   chave 'auxiliar'    → Responsável (1º ano /2)   — na escala: campo `auxiliares`
export const FUNCOES = {
  coordenador: { nome: 'Comandante da Missão', grupo: 'Comando da missão', quem: 'Oficial' },
  supervisor: { nome: 'Gestor', grupo: 'Gestores', quem: 'Cadete do 3º ano' },
  responsavel: { nome: 'Supervisor', grupo: 'Supervisores', quem: 'Cadete do 1º ano /1' },
  auxiliar: { nome: 'Responsável', grupo: 'Responsáveis', quem: 'Cadete do 1º ano /2' },
}
// Nome exibido de cada vaga da escala (singular e plural)
export const ROTULO = {
  auxiliares: { um: 'Responsável', varios: 'Responsáveis' },
  responsaveis: { um: 'Supervisor', varios: 'Supervisores' },
  supervisor: { um: 'Gestor', varios: 'Gestores' },
}
export const rotuloVaga = (campo, n = 1) => (n > 1 ? ROTULO[campo].varios : ROTULO[campo].um)

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

// Comandante da Missão e administrador: liberam a equipe e definem as funções
export const podeGerir = comando
// Todos os integrantes liberados: vistoria, viaturas (cadastro, situação, troca de óleo, exclusão) e pendências
export const podeVistoriar = liberado
export const podeGerirViaturas = liberado
// Escala: montada pelos supervisores (1º ano /1); comandante e administrador também podem
export const podeMontarEscala = (u) => liberado(u) && (comando(u) || funcaoDe(u) === 'responsavel')
// Excluir um relatório enviado (ex.: testes): supervisores e gestores, além do comandante e do administrador
export const podeExcluirRelatorio = (u) => liberado(u) && (comando(u) || ['responsavel', 'supervisor'].includes(funcaoDe(u)))

// Situação da VTR, com os mesmos nomes da planilha "Gestão das Viaturas EsFO" (24 out. 2026).
// A chave 'ativa' continua no banco; na tela ela aparece como 300 (em condições, disponível).
// 'manutencao' (usada até 24/10/2026) é lida como 'baixada' — ver situacaoDe() em lib/situacao.js.
export const SITUACOES = {
  ativa: '300',
  usoInterno: 'Uso interno',
  usoExclusivo: 'Uso exclusivo',
  baixada: 'Baixada',
  foraDaFrota: 'Fora da frota',
}
// vistoria: entra na vistoria do dia · motivo: exige motivo · os: pede OS e oficina · selo: cor do selo
export const SITUACAO_INFO = {
  ativa: { vistoria: true, motivo: false, os: false, selo: 'ok', explica: 'Em condições, disponível' },
  usoInterno: { vistoria: true, motivo: true, os: false, selo: 'atencao', explica: 'Roda só em uso interno (informe a restrição)' },
  usoExclusivo: { vistoria: true, motivo: false, os: false, selo: 'neutro', explica: 'Reservada a um uso (ex.: comando)' },
  baixada: { vistoria: false, motivo: true, os: true, selo: 'critico', explica: 'Fora de operação: oficina, pane, acidente, inquérito técnico' },
  foraDaFrota: { vistoria: false, motivo: false, os: false, selo: 'neutro', explica: 'Não pertence mais à EsFO; fica só no cadastro' },
}
// Combustível (como na planilha: DIESEL S10, GAS, GAS/ETANOL). A chave é a gravada no banco.
export const COMBUSTIVEIS = { diesel: 'Diesel S10', gasolina: 'Gasolina', flex: 'Flex (gasolina/etanol)' }

// Situação da ordem de serviço (coluna "Ordem de Serviço" da planilha)
export const ORDENS_SERVICO = ['Sem necessidade', 'Aguardando autorização', 'Em andamento', 'Inquérito Técnico']

// Escala da missão: segunda a sexta, um responsável e um supervisor por dia. Os gestores não entram na escala.
export const ESCALA = {
  dias: [1, 2, 3, 4, 5], // 1 = segunda … 5 = sexta
  vagas: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 }, // supervisores por dia
  auxiliares: 1,
}

// Rotina de manutenção das VTR (planilha da missão), por dia da semana
export const ROTINA = {
  1: 'Funcionamento dos motores, verificar a água, óleo, palhetas, lataria, KM, pneus, rádios e limpeza.',
  2: 'Verificar a limpeza externa/interna.',
  3: 'Funcionamento dos motores e verificar a limpeza externa/interna.',
  4: 'Verificar a limpeza externa/interna.',
  5: 'Funcionamento dos motores e verificar a limpeza externa/interna.',
}

// Dados que cada integrante preenche depois de liberado
export const dadosCompletos = (u) => Boolean(u?.nomeInteiro?.trim() && u?.telefone?.trim() && u?.pelotao?.trim())
