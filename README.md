# Missão Viaturas · EsFO

App para a vistoria diária das viaturas da Escola de Formação de Oficiais (APMG). Ele substitui o relatório digitado no WhatsApp.

- Checklist por tiques: **um toque = S/A**. O botão de alerta abre as opções de alteração e exige observação.
- Combustível e Arla numa **barra de 8 partes**, como o marcador do painel.
- Relatório gerado no formato do grupo, pronto para **copiar ou abrir no WhatsApp**, com as alterações no topo.
- **Pendências** (ex.: freio da 16843) ficam abertas e reaparecem nos relatórios até o coordenador resolver.
- Controle de **troca de óleo** por KM e por data, com alerta quando faltam 1.000 km ou 15 dias.
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
  screens/             telas: Hoje, Vistoria, Revisão, Relatório, Pendências, Histórico, Viaturas, Equipe
firestore.rules        quem pode ler e escrever o quê
.github/workflows/     publicação automática no Firebase Hosting
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
