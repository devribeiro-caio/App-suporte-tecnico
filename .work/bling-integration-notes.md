# Pesquisa técnica — integração Bling API v3

Data de consulta: 2026-10-30

## Fatos confirmados em fontes oficiais

- A API do Bling é REST, usa OAuth 2.0 e utiliza Bearer access token nas chamadas da API.
- O fluxo documentado é Authorization Code. O aplicativo recebe access token e refresh token. A troca de código/token usa autenticação Basic com `client_id:client_secret`; a documentação recomenda que essa operação ocorra no servidor e que o Client Secret e o authorization code não sejam expostos.
- O authorization code tem janela de uso curta, indicada na documentação como 1 minuto. O refresh token é descrito com expiração de 30 dias; o fluxo deve renovar tokens e atualizar a persistência de acordo com as respostas.
- A referência oficial lista recursos de Notas Fiscais Eletrônicas e Produtos, em produção em `https://api.bling.com.br/Api/v3`.
- Os changelogs oficiais citam `GET /nfe` e `GET /nfe/{idNotaFiscal}` e afirmam que os retornos incluem itens de notas fiscais. A documentação inspecionada não confirmou filtro direto da listagem de NF-e pelo SKU do item. Não presumir essa capacidade sem validar o schema/endpoints da conta.
- Estratégia possível após validar detalhes: procurar NF-e de saída com situação autorizada/emitida, inspecionar os itens e comparar o SKU normalizado. Evitar confirmar propriedade apenas por produto cadastrado; a regra aceita pelo usuário é uma NF-e de saída encontrada para o SKU.

## URLs consultadas

- OAuth e instalação de aplicativos: https://developer.bling.com.br/aplicativos
- Introdução à API e Bearer: https://developer.bling.com.br/bling-api
- Referência da API v3 e OpenAPI: https://developer.bling.com.br/referencia
- Registro de alterações e endpoints da NF-e: https://developer.bling.com.br/changelogs
- OpenAPI publicado pela referência: https://developer.bling.com.br/build/assets/openapi-DA9aa7wN.json
