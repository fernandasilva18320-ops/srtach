// Vercel Function: importa produtos do Grupo Destak para o Supabase.
// Segredos ficam nas Environment Variables do Vercel, nunca no navegador.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  const syncSecret = process.env.DESTAK_SYNC_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!syncSecret || !supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Configure DESTAK_SYNC_SECRET, SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis do Vercel.' });
  }

  const suppliedSecret = req.headers['x-sync-secret'];
  if (!suppliedSecret || suppliedSecret !== syncSecret) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  try {
    // 1) Solicita um token novo ao fornecedor.
    const tokenResponse = await fetch('https://api.grupodestak.com/TKN');
    const tokenText = await tokenResponse.text();
    if (!tokenResponse.ok) {
      return res.status(502).json({ error: 'Não foi possível obter o token do Grupo Destak.', status: tokenResponse.status });
    }

    let token;
    try { token = JSON.parse(tokenText); } catch { token = tokenText; }
    if (typeof token === 'string') token = token.trim();
    if (!token || typeof token !== 'string') {
      return res.status(502).json({ error: 'A resposta de /TKN não continha um token de texto válido.' });
    }

    // 2) Consulta produtos ativos em estoque, conforme o manual.
    const productsResponse = await fetch('https://api.grupodestak.com/List-Produtos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ descricao: '', codigo: '' })
    });
    const productsText = await productsResponse.text();
    if (!productsResponse.ok) {
      return res.status(502).json({ error: 'Não foi possível consultar os produtos do Grupo Destak.', status: productsResponse.status, detail: productsText.slice(0, 500) });
    }

    let sourceProducts;
    try { sourceProducts = JSON.parse(productsText); } catch {
      return res.status(502).json({ error: 'A resposta de produtos não era JSON válido.' });
    }
    if (!Array.isArray(sourceProducts)) {
      return res.status(502).json({ error: 'A API não retornou uma lista de produtos.' });
    }

    // 3) Converte cada variação da grade para a tabela products.
    // O código da variação é usado como supplier_code para evitar duplicatas.
    const rows = sourceProducts
      .filter(p => p && p.codigo !== undefined && p.codigo !== null)
      .map(p => ({
        name: String(p.descricao || `Produto ${p.produto ?? p.codigo}`).trim(),
        description: p.referencia ? `Referência: ${p.referencia}` : null,
        category: 'Grupo Destak',
        size: p.tamanho == null ? null : String(p.tamanho),
        color: p.cor == null ? null : String(p.cor),
        price: Number(p.preco1) || 0,
        stock: Math.max(0, Math.floor(Number(p.saldo) || 0)),
        image_url: null,
        supplier_code: String(p.codigo),
        active: (Number(p.saldo) || 0) > 0,
        updated_at: new Date().toISOString()
      }));

    if (rows.length === 0) {
      return res.status(200).json({ imported: 0, message: 'A API respondeu, mas não retornou itens com código para importar.' });
    }

    // 4) Upsert: atualiza variações existentes e insere as novas.
    // O service role só existe no servidor e ignora RLS; nunca enviar ao navegador.
    const dbUrl = supabaseUrl.replace(/\/$/, '');
    const upsertResponse = await fetch(`${dbUrl}/rest/v1/products?on_conflict=supplier_code`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(rows)
    });
    const upsertText = await upsertResponse.text();
    if (!upsertResponse.ok) {
      return res.status(502).json({ error: 'O Grupo Destak respondeu, mas o Supabase não aceitou a importação.', status: upsertResponse.status, detail: upsertText.slice(0, 800), hint: 'Confira se supplier_code é UNIQUE e se as colunas da tabela products correspondem ao projeto.' });
    }

    return res.status(200).json({ success: true, received: sourceProducts.length, importedOrUpdated: rows.length, note: 'A API do manual não fornece URL de imagem no exemplo; image_url ficou vazio. Produtos que sumiram da API não são apagados automaticamente.' });
  } catch (error) {
    return res.status(500).json({ error: 'Falha inesperada na integração.', detail: String(error.message || error) });
  }
};
