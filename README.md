# Store Center - Automatização por Cron Jobs (CMS Admin)

Este portal possui rotinas totalmente automatizadas de agendamento de posts e coleta/reescrita de notícias via feeds RSS utilizando Inteligência Artificial (Gemini).

As rotinas rodam de forma nativa e automática em segundo plano assim que o servidor Express inicia (o agendador a cada 5 minutos e o coletor RSS de 45 em 45 minutos), mas para garantir precisão e estabilidade robusta em ambientes profissionais, você pode configurar tarefas cron externas (**Cron Jobs**) para invocar os endpoints REST criados.

---

## 🚀 Endpoints de Cron Criados

### 1. Publicador de Agendados
- **Rota:** `/api/cron/publish-scheduled`
- **Método:** `GET`
- **Função:** Examina todos os posts marcados como "Agendados", compara a hora atual com o horário definido e coloca no ar (`status: "published"`) as matérias com horários vencidos, atualizando a data de publicação final.

### 2. Coletor Automático de RSS com IA (No-Draft / Publicação Direta)
- **Rota:** `/api/cron/rss-auto`
- **Método:** `GET`
- **Intervalo:** 45 minutos (background)
- **Limite:** Máximo de 1 notícia por feed por execução.
- **Fluxo Automático:** RSS → Gemini → SEO → Tags → Imagem → Publicar diretamente:
  1. Varre os feeds RSS ativos cadastrados no banco de dados.
  2. Filtra notícias e impede duplicidade (por título, link original ou slug gerado).
  3. Envia os novos artigos para reescrita jornalística avançada por IA (Gemini 3.5-Flash).
  4. Gera tags e títulos/descrições focados em SEO profissional.
  5. **Regra de Imagem:** Tenta gerar uma imagem realística usando Imagen 3. Caso a geração falhe devido à limitação de cotas de chave padrão, o sistema **automaticamente avalia e seleciona uma imagem horizontal de alta resolução (1280x720)** de bancos curados (Unsplash, Pixabay ou Pexels). O sistema evita repetir imagens usadas nos últimos 30 dias para manter o portal sempre moderno e variado.
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

Para colocar estas rotas em execução automática permanente (a cada 5 ou 45 minutos), siga os guias abaixo:

### A) Opção 1: Configuração no cPanel (Servidores VPS/Dedicados)
1. Faça login no seu painel **cPanel**.
2. No campo de busca, digite **Tarefas Cron** (ou **Cron Jobs**).
3. Na seção "Adicionar Nova Tarefa Cron", configure o intervalo de tempo:
   - **Minuto:** `*/5` (para rodar a verificação de agendados a cada 5 minutos).
   - **Hora, Dia, Mês, Dia da semana:** Marque `*` (ou selecione "A cada hora/dia/mês").
4. No campo **Comando**, insira os seguintes comandos utilizando `curl` (substitua pelo domínio real da sua aplicação):

```bash
# Cron para matérias programadas (Rodar a cada 5 ou 10 minutos):
curl -s -X GET "https://seu-dominio.com.br/api/cron/publish-scheduled" >/dev/null 2>&1

# Cron para importar RSS com IA diretamente (Rodar a cada 45 minutos):
curl -s -X GET "https://seu-dominio.com.br/api/cron/rss-auto" >/dev/null 2>&1
```
5. Clique em **Adicionar Nova Tarefa Cron**. Pronto!

---

### B) Opção 2: Configuração na Vercel (`vercel.json`)
Caso hospede sua aplicação na Vercel, você pode usar a ferramenta nativa de **Vercel Cron**. Basta adicionar um arquivo `vercel.json` na raiz do seu projeto com as seguintes instruções:

```json
{
  "crons": [
    {
      "path": "/api/cron/publish-scheduled",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/rss-auto",
      "schedule": "*/45 * * * *"
    }
  ]
}
```

---

### C) Opção 3: Serviços Gratuitos Online (Ex: EasyCron / Keep-Alive)
Se sua hospedagem convencional não permitir configuração livre de crons:
1. Cadastre-se em um gerenciador gratuito como o [EasyCron](https://www.easycron.com/) ou [UptimeRobot](https://uptimerobot.com/).
2. Crie uma nova requisição do tipo **HTTP GET** apontando para o seu domínio:
   - `https://seu-dominio.com.br/api/cron/publish-scheduled` (definido a cada 5 minutos)
   - `https://seu-dominio.com.br/api/cron/rss-auto` (definido a cada 45 minutos)
3. Defina o cronômetro para disparar de acordo com o planejado.
