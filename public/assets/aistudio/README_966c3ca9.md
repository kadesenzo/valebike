# Vale Bike — ecossistema digital

MVP integrado para a Vale Bike: vitrine pública e painel operacional ligados a uma API Python com SQLite persistente.

## Executar

Requer Python 3.10+.

```powershell
python server.py
```

Abra `http://localhost:8000`. A base `valebike.sqlite3` é criada na primeira execução. A página pública recebe pedidos de orçamento; no painel `/gestao`, a equipe acompanha pedidos, clientes, bicicletas, ordens de serviço e estoque.

Este MVP não é uma implantação pronta para produção: autenticação/perfis, hospedagem, envio de WhatsApp, upload de imagens e módulos financeiros completos precisam ser adicionados antes de uso com dados reais.
