SRTA. CHIC — INTEGRAÇÃO INICIAL COM GRUPO DESTAK

IMPORTANTE
- Esta pasta inclui uma função de servidor em api/sync-destak.js.
- Não substitua os arquivos originais sem manter uma cópia de segurança.
- A função usa o domínio .com que foi testado pelo usuário e retornou produtos.
- A API de exemplo não informa URLs de imagens; image_url fica vazio para os itens importados.
- O código de variação do fornecedor (codigo) é salvo em supplier_code para evitar duplicatas.
- A importação atualiza/inclui itens, mas não apaga itens que deixem de vir da API.

ANTES DE PUBLICAR
1. Confirme que a tabela public.products tem as colunas: name, description, category, size, color, price, stock, image_url, supplier_code, active, updated_at.
2. Confirme que supplier_code tem restrição UNIQUE. No SQL Editor, se necessário, execute:
   alter table public.products add constraint products_supplier_code_key unique (supplier_code);
   Não execute se já existir uma restrição UNIQUE para supplier_code.
3. No projeto Vercel, adicione estas Environment Variables em Project Settings > Environment Variables:
   SUPABASE_URL = URL-base do projeto Supabase, por exemplo https://SEU-PROJETO.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = chave secreta/service_role do Supabase (somente variável do servidor Vercel; nunca no HTML/JS)
   DESTAK_SYNC_SECRET = uma senha longa criada por você para proteger a rota de sincronização
4. Faça deploy da pasta no Vercel.
5. Para acionar a importação, envie uma requisição POST para https://SEU-SITE.vercel.app/api/sync-destak com o cabeçalho x-sync-secret contendo o valor de DESTAK_SYNC_SECRET. Não coloque esse segredo em JavaScript público.

NOTAS
- A função não altera o script.js nem o visual do site.
- A integração inicial é manual por chamada protegida; não há agendamento automático configurado.
- Teste primeiro em ambiente de desenvolvimento e confirme os produtos antes de usar em produção.
- A tabela criada no Supabase deve corresponder às colunas usadas pelo site.
