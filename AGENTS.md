# Escopo das alterações e preservação das edições manuais

- Altere apenas o que foi solicitado pelo usuário. Não aproveite uma correção para reescrever outras matérias, trocar capas, reclassificar categorias ou renovar metadados em lote.
- Antes de alterar dados editoriais existentes, identifique os IDs e os campos autorizados. Todos os outros registros e campos devem permanecer intactos.
- Imagens, títulos, textos, categorias, URLs e escolhas feitas manualmente devem ser preservados. Um campo manual só pode ser corrigido quando essa mudança específica for solicitada.
- Não execute reparos globais no início do servidor, na leitura do portal, na compilação ou durante a coleta do RSS. A limpeza de notícias novas deve acontecer antes da primeira publicação.
- Scripts de reparo devem exigir IDs e campos explícitos e recusar alterações em campos manuais por padrão. Faça backup e verifique que não houve mudanças fora desse escopo.
- A sincronização da cópia estática deve copiar literalmente apenas os campos marcados como edição manual; nunca usar a cópia antiga para sobrescrever uma edição mais recente.
- O painel deve enviar apenas os campos alterados. Só confirme salvamento após a persistência concluir com sucesso.
