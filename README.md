# Missão Viaturas · EsFO

App para a vistoria diária das viaturas da Escola de Formação de Oficiais (APMG). Ele substitui o relatório digitado no WhatsApp.

- **Uma viatura, um cadete**: quem abre a VTR fica com ela; os outros veem "Em vistoria por Cad. X" e só leem. A trava se solta ao sair da tela ou após 3 min sem uso, e o coordenador pode assumir.
- **Cancelar a vistoria de uma VTR**: apaga o que foi marcado nela e a libera.
- Checklist por tiques: **um toque = S/A**. O botão de alerta abre as opções de alteração e exige observação.
- Combustível e Arla numa **barra de 8 partes**, como o marcador do painel.
- Relatório gerado no formato do grupo, pronto para **copiar ou abrir no WhatsApp**, com as alterações no topo.
- **Pendências** (ex.: freio da 16843) ficam abertas e reaparecem nos relatórios até o coordenador resolver.
- **Troca de óleo na tela de vistoria**: quem vistoria preenche a última troca (data e KM da etiqueta); a próxima é calculada (10.000 km e 6 meses) e pode ser alterada se a etiqueta disser outra coisa. VTR nova (sem troca) mostra a revisão dos 10.000 km. Alerta quando faltam 1.000 km ou 15 dias.
- **Escala** de segunda a sexta como na planilha: um responsável e um supervisor por dia (os gestores não entram na escala), com a rotina de manutenção do dia e o **total de escalas** de cada um, contado a partir do primeiro relatório enviado. Os supervisores montam pelo app; todos veem e podem copiar para o WhatsApp. A escala de hoje aparece na tela inicial e preenche os responsáveis do relatório.
- **Equipe**: lista dos integrantes com ficha (telefone, WhatsApp, e-mail, pelotão e próximos serviços). Depois de liberado, cada cadete completa os próprios dados em *Meus dados*.
- **Figura de cada viatura**: ilustração da viatura conforme o tipo, a partir das imagens das VTR da EsFO (`src/assets/viaturas`) (furgão/van, SUV compacto, SUV grande, picape cabine dupla, sedã/hatch, moto), mostrada antes da descrição na tela inicial, na vistoria, em *Viaturas*, na ficha e nos relatórios. O tipo é escolhido no cadastro; nas VTR sem tipo gravado, o app deduz pelo modelo (Master → furgão, Ranger → picape, Trailblazer → SUV grande, Duster → SUV compacto, demais → sedã).
- **Ficha de cada viatura** (toque na VTR em *Viaturas*): KM ao longo do tempo, alterações que se repetem, pendências, trocas de óleo e todas as vistorias.
- **Relatório mensal** (em *Histórico*): só as viaturas, contando a partir de 24/10/2026 — situação, KM rodado, alterações (agrupadas), pendências em aberto e troca de óleo, com PDF.
- **Funções**: *Comandante da Missão* (oficial), *Gestor* (3º ano), *Supervisor* (1º ano /1) e *Responsável* (1º ano /2). O comandante escolhe a função ao liberar o acesso. Todos vistoriam (juntos, editando a mesma vistoria), cuidam das viaturas (cadastro, situação, troca de óleo, exclusão) e resolvem pendências. Os **supervisores montam a escala**. Supervisores e gestores podem **excluir relatórios** do histórico (ex.: testes): saem junto as pendências e fotos dele, e o KM volta ao do relatório anterior. O *Administrador* tem acesso total. No banco, as funções continuam gravadas com as chaves antigas (`coordenador`, `supervisor`, `responsavel`, `auxiliar`); a correspondência está em `src/config.js`.
- Funciona como app no celular (PWA) e continua funcionando sem sinal na garagem.

Com `VITE_DEMO=1`, o app abre em **modo demonstração**: os dados ficam só no aparelho.

## Estrutura

```
src/
  config.js            itens do checklist e limites de alerta (ajuste aqui)
  lib/vistoria.js      regras: o que falta, gravidade e texto do relatório
  data/firebase.js     login, banco (Firestore) e fotos
  data/demo.js         modo demonstração (localStorage)
  data/seed.js         as 10 VTR do relatório de 20 out. 2026
  lib/escala.js        regras da escala semanal
  screens/             telas: Hoje, Vistoria, Revisão, Relatório, Pendências, Escala, Histórico, Mensal, Viaturas, Ficha da viatura, Equipe
  lib/frota.js         histórico por viatura e resumo do mês
  lib/mensal-pdf.js    PDF do relatório mensal
  components/FiguraVtr.jsx  figura da viatura por tipo
  assets/viaturas/     ilustrações das VTR (furgão, picape, SUV, SUV grande, sedã)
  lib/tipo-vtr.js      tipos de viatura e dedução pelo modelo
  assets/logo-viatura.svg  logo do app (os ícones em public/icons saem dele)
firestore.rules        quem pode ler e escrever o quê
.github/workflows/     publicação automática no GitHub Pages
```

## Rodar no computador

```bash
npm install
npm run dev
```

## Firebase (já configurado)

- Projeto: **vtr-esfo** (plano Spark, gratuito), console em https://console.firebase.google.com/project/vtr-esfo
- Login por e-mail/senha ativado; Firestore em `southamerica-east1` (São Paulo), modo de produção
- Regras de `firestore.rules` publicadas. Ao alterar o arquivo, publique de novo: `npx firebase-tools deploy --only firestore:rules`
- A configuração do app da Web está em `src/firebase-config.js` (identifica o projeto; não é senha)
- **App:** https://adrianoadvag-ai.github.io/vtr-esfo/
- **Primeiro administrador**: quem criar o acesso com o e-mail definido em `EMAIL_ADMIN` já entra como administrador. Os demais entram como "aguardando liberação" e o coordenador libera na aba **Equipe**
- Primeiro uso: em **Viaturas**, toque em **Usar as 10 VTR do relatório** e confira os dados

### Fotos

Por padrão, as fotos vão comprimidas para o Firestore, que é gratuito no plano Spark. O Cloud Storage passou a exigir o plano Blaze (cartão vinculado) a partir de fev. 2026. Para usá-lo mesmo assim, ative o Storage no console e defina `VITE_USAR_STORAGE=1`.

## Publicação automática (GitHub Pages)

A cada alteração na branch `main`, o GitHub gera o app e o publica em **https://adrianoadvag-ai.github.io/vtr-esfo/** (workflow `.github/workflows/pages.yml`, sem chaves). Mesmo esquema do SICAM e do Almox.

- O domínio `adrianoadvag-ai.github.io` está nos *domínios autorizados* do Firebase Authentication.
- Para publicar sem esperar um push: *Actions › Publicar no GitHub Pages › Run workflow*.

## Migrar para a conta da missão

Crie o projeto Firebase e o repositório na conta da missão e repita os passos acima. Para levar os dados, exporte e importe as coleções `usuarios`, `viaturas`, `vistorias`, `ocorrencias` e `fotos`. Os logins (Authentication) precisam ser recriados, ou importados com `firebase auth:export` e `auth:import`.
