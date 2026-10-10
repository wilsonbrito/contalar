# Contalar

[English](README.md) · **Português** · [Español](README.es.md) · [日本語](README.ja.md)

> As contas da casa, sem planilha. Roda no seu computador: sem conta, sem nuvem, sem assinatura.

Contalar (_contas_ + _lar_) é um app web pequeno para acompanhar o que a casa precisa pagar a cada mês e o que já foi pago. Ele substitui a planilha mensal: as contas que se repetem aparecem sozinhas, você digita o valor real, aperta **Enter** e a conta fica como paga.

![Tela do mês](docs/images/month.png)

## Recursos

- **Contas do mês**: todas as contas do mês com status (pago, pendente, atrasado), cartões de resumo, filtro por status e total por categoria. Digite o valor real e aperte **Enter** para pagar.
- **Contas fixas**: aluguel, luz, internet… nascem sozinhas todo mês com um valor estimado (o último que você pagou). Você só corrige o valor quando a conta chega.
- **Parcelamento**: uma compra em N vezes gera N contas mensais (`3/10`).
- **Visão geral**: painel do ano com pago × a pagar por mês, previsão até dezembro e um mapa de calor categoria × mês.
- **Local e privado**: os dados ficam em um arquivo SQLite no seu computador. O servidor só escuta em `localhost` e o app não faz requisições externas.
- **Backups**: cópia diária do banco, com envio opcional para um repositório git privado.

![Visão geral](docs/images/overview.png)

## Como funciona

O app tem três telas:

| Tela              | Para quê                                                                |
| ----------------- | ----------------------------------------------------------------------- |
| **Contas do mês** | Pagar contas, lançar contas avulsas ou parceladas, ver o mês de relance |
| **Visão geral**   | O panorama do ano                                                       |
| **Contas fixas**  | Cadastrar as contas que se repetem todo mês                             |

### Um mês típico

1. **Uma vez só:** cadastre suas contas fixas (nome, valor estimado, dia do vencimento e categoria).
2. **Abra o mês.** Cada conta fixa aparece com o valor estimado. Abrir o mesmo mês de novo nunca duplica nada.
3. **Quando a conta chegar ou for paga:** digite o valor real e aperte **Enter** (ou clique em **Pagar**). A data do pagamento começa em hoje e pode ser alterada. **Salvar** guarda só o valor, sem marcar como paga.
4. **Compras avulsas ou parceladas:** use **Nova conta**. Com "parcelas" maior que 1, é criada uma conta por mês, identificada como `n/N`.
5. **Olhe a Visão geral** para ver para onde o dinheiro vai e como estão os próximos meses.

![Contas fixas](docs/images/recurring.png)

### Detalhes que vale saber

- O **status** é calculado: _Pago_ se tem data de pagamento; _Atrasado_ se não foi paga e o vencimento já passou; senão, _Pendente_.
- **Apagar uma conta que veio de uma conta fixa** remove só aquele mês; a conta fixa continua valendo nos outros. Apagar a própria conta fixa mantém as contas já geradas.
- **Editar uma conta fixa** também atualiza as contas futuras ainda não pagas (valor, nome e categoria), exceto as que você já ajustou à mão. O dia do vencimento vale só para meses novos.
- **Previsão:** ao abrir a Visão geral do ano corrente, as contas fixas dos meses restantes são criadas com o valor estimado, para você enxergar o ano à frente.
- Os valores são guardados em **centavos** inteiros (sem erros de arredondamento) e as datas como `AAAA-MM-DD`.

## Início rápido

Requisitos: **Node.js 22.17 ou mais novo**, além de `bash`, `curl` e `lsof` (macOS ou Linux; no Windows, use o WSL).

```sh
git clone https://github.com/wilsonbrito/contalar.git
cd contalar
./iniciar.sh
```

O script instala as dependências, cria o banco, gera o build, sobe o app em <http://localhost:3000> e abre o navegador. Para parar, `Ctrl+C`. Use `PORT=4000 ./iniciar.sh` para outra porta.

### Experimente com dados de demonstração

Quer olhar o app antes de lançar suas contas? Carregue uma família fictícia:

```sh
npm install
npm run demo        # cria demo.db com uma casa inventada
npm run demo:dev    # abre o app usando demo.db
```

O `demo.db` é separado do seu banco de verdade (`local.db`), e o script de demonstração se recusa a mexer no `local.db`.

## Backups

Sempre que o app sobe, ele faz uma cópia consistente do banco em `backups/` (`local-AAAA-MM-DD.db`, uma por dia, mantendo as 30 mais recentes). Para restaurar, pare o app e copie um backup por cima do `local.db`.

Para ter uma cópia fora do computador, transforme `backups/` em um repositório git **privado** com um remoto. O `iniciar.sh` então roda `scripts/enviar-backup.sh` depois que o app sobe, que faz commit e push dos backups novos (e tenta de novo se um envio anterior falhou):

```sh
cd backups
git init -b main && git add -A && git commit -m "primeiro backup"
gh repo create meus-backups-contalar --private --source=. --push   # ou qualquer remoto privado
```

> **Mantenha esse repositório privado**: o banco contém todas as suas finanças. Use `SEM_ENVIO_BACKUP=1` para desligar o envio automático.

## Privacidade

- Os dados ficam em `local.db` e `backups/`, ambos fora do git.
- O servidor escuta em `127.0.0.1`; nada fica acessível pela sua rede.
- Sem contas, sem telemetria, sem requisições externas (sem CDN, sem fontes externas, sem analytics).

## Limitações

- Feito para **uma casa em um computador**: não há login nem vários usuários.
- Só acompanha contas a pagar, não receitas, orçamentos ou investimentos.
- A interface está em português do Brasil e a moeda é o real (`R$`). Traduzir a interface e aceitar outras moedas é a contribuição mais bem-vinda.
- Testado no macOS; no Linux deve funcionar; no Windows não foi testado (use o WSL).

## Desenvolvimento

```sh
npm install
cp .env.example .env     # DATABASE_URL=local.db
npm run db:push          # cria/atualiza as tabelas
npm run dev              # http://localhost:5173
npm run check            # tipos
npm test                 # testes (datas, parcelas, resumos, backup)
```

| Caminho                 | O quê                                           |
| ----------------------- | ----------------------------------------------- |
| `src/lib/financeiro.ts` | Lógica pura: datas, status, parcelas, resumos   |
| `src/lib/server/db/`    | Schema (Drizzle), queries e backup              |
| `src/routes/`           | Telas: `/` (mês), `/fixas`, `/visao-geral`      |
| `scripts/`              | `demo.ts` (dados fictícios), `enviar-backup.sh` |
| `iniciar.sh`            | Inicializador de um comando                     |

**Stack:** SvelteKit 3 · TypeScript · Tailwind CSS 4 · Drizzle ORM + better-sqlite3 · Vitest.

Contribuições são bem-vindas, principalmente traduções da interface. Abra uma issue para conversar antes de mudanças grandes.

## Licença

[MIT](LICENSE) © Wilson Brito
