# Missão Viaturas · EsFO

App para a vistoria diária das viaturas da Escola de Formação de Oficiais (APMG). Ele substitui o relatório digitado no WhatsApp.

- Checklist por tiques: **um toque = S/A**. O botão de alerta abre as opções de alteração e exige observação.
- Combustível e Arla numa **barra de 8 partes**, como o marcador do painel.
- Relatório gerado no formato do grupo, pronto para **copiar ou abrir no WhatsApp**, com as alterações no topo.
- **Pendências** (ex.: freio da 16843) ficam abertas e reaparecem nos relatórios até o coordenador resolver.
- Controle de **troca de óleo** por KM e por data, com alerta quando faltam 1.000 km ou 15 dias.
- Funciona como app no celular (PWA) e continua funcionando sem sinal na garagem.

Sem a configuração do Firebase, o app abre em **modo demonstração**: os dados ficam só no aparelho.

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

## Ligar ao Firebase (uma vez)

1. **Criar o projeto**: no [Console do Firebase](https://console.firebase.google.com), crie o projeto `vtr-esfo`. O Google Analytics não é necessário.
2. **App da Web**: em *Configurações do projeto › Seus apps*, adicione um app da Web. Copie os valores do `firebaseConfig` para um arquivo `.env`, usando `.env.example` como modelo.
3. **Login**: em *Authentication › Método de login*, ative **E-mail/senha**.
4. **Banco**: em *Firestore Database*, crie o banco em **modo de produção**, região `southamerica-east1` (São Paulo).
5. **Regras e índice**:
   ```bash
   npx firebase-tools login
   npx firebase-tools use --add          # escolha o projeto vtr-esfo
   npx firebase-tools deploy --only firestore
   ```
6. **Primeiro administrador**: abra o app, toque em *Criar acesso* e cadastre-se. No console, abra *Firestore › usuarios › (seu documento)* e troque `perfil` de `pendente` para `admin`. Depois, em *Viaturas*, toque em **Usar as 10 VTR do relatório** e confira os dados.
7. **Equipe**: cada cadete cria o próprio acesso. O coordenador libera cada um na aba **Equipe**.

### Fotos

Por padrão, as fotos vão comprimidas para o Firestore, que é gratuito no plano Spark. O Cloud Storage passou a exigir o plano Blaze (cartão vinculado) a partir de fev. 2026. Para usá-lo mesmo assim, ative o Storage no console e defina `VITE_USAR_STORAGE=1`.

## Publicação automática (GitHub Actions)

A cada alteração na branch `main`, o GitHub gera o app e o publica em `https://<projeto>.web.app`.

1. Crie a conta de serviço e o secret `FIREBASE_SERVICE_ACCOUNT` automaticamente:
   ```bash
   npx firebase-tools init hosting:github
   ```
   Quando ele perguntar, responda **não** para sobrescrever o workflow existente e para criar novos workflows. O que importa aqui é o secret.
2. Em *GitHub › Settings › Secrets and variables › Actions*, crie também os secrets `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID` e `VITE_FIREBASE_APP_ID`, com os mesmos valores do `.env`.
3. Para publicar sem esperar um push, use *Actions › Publicar no Firebase › Run workflow*.

Para publicar direto do computador: `npm run build && npx firebase-tools deploy --only hosting`.

## Migrar para a conta da missão

Crie o projeto Firebase e o repositório na conta da missão e repita os passos acima. Para levar os dados, exporte e importe as coleções `usuarios`, `viaturas`, `vistorias`, `ocorrencias` e `fotos`. Os logins (Authentication) precisam ser recriados, ou importados com `firebase auth:export` e `auth:import`.
