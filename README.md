# Store Center - Automatização por Cron Jobs (CMS Admin)

Este portal possui rotinas totalmente automatizadas de agendamento de posts e coleta/reescrita de notícias via feeds RSS utilizando Inteligência Artificial (Gemini).

As rotinas rodam de forma nativa e automática em segundo plano a cada 10 minutos assim que o servidor Express inicia, mas para garantir precisão e estabilidade robusta em ambientes profissionais, você pode configurar tarefas cron externas (**Cron Jobs**) para invocar os endpoints REST criados.

---

## 🚀 Endpoints de Cron Criados

### 1. Publicador de Agendados
- **Rota:** `/api/cron/publish-scheduled`
- **Método:** `GET`
- **Função:** Examina todos os posts marcados como "Agendados", compara a hora atual com o horário definido e coloca no ar (`status: "published"`) as matérias com horários vencidos, atualizando a data de publicação final.

### 2. Coletor Automático de RSS com IA
- **Rota:** `/api/cron/rss-auto`
- **Método:** `GET`
- **Função:** Varre os feeds RSS ativos cadastrados no banco de dados. Filtra notícias e impede duplicidade (por título, link original ou slug gerado). Envia os novos artigos para reescrita por IA (Gemini 3.5-Flash se chave configurada, ou fallback procedural de alta qualidade) e salva como novos **Rascunhos** prontos para revisão do administrador.

---

## 🛠️ Como Configurar o Cron Job

Para colocar estas rotas em execução automática permanente (a cada 5 ou 10 minutos), siga os guias abaixo:

### A) Opção 1: Configuração no cPanel (Servidores VPS/Dedicados)
1. Faça login no seu painel **cPanel**.
2. No campo de busca, digite **Tarefas Cron** (ou **Cron Jobs**).
3. Na seção "Adicionar Nova Tarefa Cron", configure o intervalo de tempo:
   - **Minuto:** `*/5` ou `*/10` (para rodar a cada 5 ou 10 minutos).
   - **Hora, Dia, Mês, Dia da semana:** Marque `*` (ou selecione "A cada hora/dia/mês").
4. No campo **Comando**, insira os seguintes comandos utilizando `curl` (substitua pelo domínio real da sua aplicação):

```bash
# Cron para matérias programadas:
curl -s -X GET "https://seu-dominio.com.br/api/cron/publish-scheduled" >/dev/null 2>&1

# Cron para importar RSS com IA:
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
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/cron/rss-auto",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

---

### C) Opção 3: Serviços Gratuitos Online (Ex: EasyCron / Keep-Alive)
Se sua hospedagem convencional não pemitir configuração livre de crons:
1. Cadastre-se em um gerenciador gratuito como o [EasyCron](https://www.easycron.com/) ou [UptimeRobot](https://uptimerobot.com/).
2. Crie uma nova requisição do tipo **HTTP GET** apontando para o seu domínio:
   - `https://seu-dominio.com.br/api/cron/publish-scheduled`
   - `https://seu-dominio.com.br/api/cron/rss-auto`
3. Defina o cronômetro para disparar a cada 10 minutos.
