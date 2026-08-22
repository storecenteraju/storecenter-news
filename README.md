# Store Center - Automatização por Cron Jobs (CMS Admin)

Este portal possui rotinas de agendamento de posts e coleta/reescrita de notícias via feeds RSS. O agendador interno do Express está pausado; a retomada controlada do RSS é feita pelo GitHub Actions, uma vez por dia, com no máximo uma matéria por execução.

O endpoint de publicação falha de forma segura quando `CRON_SECRET` não está configurado e só aceita autenticação `Authorization: Bearer`.

---

## 🚀 Endpoints de Cron Criados

### 1. Publicador de Agendados
- **Rota:** `/api/cron/publish-scheduled`
- **Método:** `GET`
- **Função:** Examina todos os posts marcados como "Agendados", compara a hora atual com o horário definido e coloca no ar (`status: "published"`) as matérias com horários vencidos, atualizando a data de publicação final.

### 2. Coletor Automático de RSS com IA
- **Rota:** `/api/cron/rss-auto`
- **Método:** `POST`
- **Intervalo editorial:** 10 execuções por dia, distribuídas a cada 2h24 pelo GitHub Actions, com no máximo 1 matéria por execução.
- **Limite:** máximo de 1 notícia por execução durante a retomada gradual.
- **Fluxo Automático:** RSS → Gemini → SEO → Tags → Imagem → Publicar diretamente:
  1. Varre os feeds RSS ativos cadastrados no banco de dados.
  2. Filtra notícias e impede duplicidade (por título, link original ou slug gerado).
  3. Envia os novos artigos para reescrita jornalística avançada por IA (Gemini 3.5-Flash).
  4. Gera tags e títulos/descrições focados em SEO profissional.
  5. **Regra de Imagem:** geração paga fica desligada por padrão. Imagem de RSS/página só é reutilizada quando o feed declara `imagePolicy: "reuse_with_credit"`; nos demais casos o sistema escolhe um fallback editorial gratuito. Fonte, crédito e licença são armazenados quando aplicáveis.
  6. **Publicação Sem Rascunhos:** Salva as novas matérias já com status `published` ("NO AR"), fazendo com que apareçam imediatamente na Home e nas respectivas categorias do portal em tempo real.
  7. **Rastreabilidade:** Alimenta a nova aba **"Log da Automação"** no painel administrativo para controle e auditoria detalhada.

---

## 🖥️ Novo Módulo: 8. Log da Automação

Adicionamos um painel de monitoramento em tempo real dentro do painel administrativo (Aba 8) para que você possa acompanhar tudo o que as rotinas de segundo plano realizam automaticamente. Nele, você pode ver:
- Data e hora exata das varreduras automáticas.
- Nome e URL do feed de origem.
- Título original colhido no feed.
- Tipo de imagem resolvida (se gerada por IA ou fallback curado Unsplash/Pixabay/Pexels).
- Título final reescrito por IA e link para visualização com ID gravado na base de dados.
- Botão para limpar o histórico de logs acumulado.

---

## 🛠️ Como Configurar o Cron Job

O projeto já contém o workflow `.github/workflows/rss-auto.yml`. Para ativá-lo, configure o mesmo valor de `CRON_SECRET` no ambiente da hospedagem e em **GitHub → Settings → Secrets and variables → Actions**.

### A) Opção 1: Configuração no cPanel (Servidores VPS/Dedicados)
1. Faça login no seu painel **cPanel**.
2. No campo de busca, digite **Tarefas Cron** (ou **Cron Jobs**).
3. Na seção "Adicionar Nova Tarefa Cron", configure o intervalo de tempo:
   - **Minuto:** `*/5` (para rodar a verificação de agendados a cada 5 minutos).
   - **Hora, Dia, Mês, Dia da semana:** Marque `*` (ou selecione "A cada hora/dia/mês").
4. No campo **Comando**, insira os seguintes comandos utilizando `curl` (substitua pelo domínio real da sua aplicação):

```bash
# Cron para matérias programadas (Rodar a cada 5 ou 10 minutos):
curl -sS -X GET -H "Authorization: Bearer SEU_CRON_SECRET" "https://seu-dominio.com.br/api/cron/publish-scheduled" >/dev/null 2>&1

# Cron para importar RSS (iniciar com uma execução diária):
curl -sS -X POST -H "Authorization: Bearer SEU_CRON_SECRET" "https://seu-dominio.com.br/api/cron/rss-auto" >/dev/null 2>&1
```
5. Clique em **Adicionar Nova Tarefa Cron**. Pronto!

---

### B) Opção 2: GitHub Actions
O workflow versionado dispara `POST /api/cron/rss-auto` 10 vezes por dia, em intervalos de 2h24, usa o secret `CRON_SECRET`, impede execuções concorrentes e publica no máximo 1 matéria por execução. A execução manual oferece uma simulação (`dry_run`) sem publicar.

---

### C) Opção 3: Serviços Gratuitos Online (Ex: EasyCron / Keep-Alive)
Se sua hospedagem convencional não permitir configuração livre de crons:
1. Cadastre-se em um gerenciador gratuito como o [EasyCron](https://www.easycron.com/) ou [UptimeRobot](https://uptimerobot.com/).
2. Crie requisições autenticadas com cabeçalho Bearer apontando para o seu domínio:
   - `GET https://seu-dominio.com.br/api/cron/publish-scheduled` (a cada 5 minutos)
   - `https://seu-dominio.com.br/api/cron/rss-auto` (iniciar uma vez ao dia)
3. Defina o cronômetro para disparar de acordo com o planejado.
