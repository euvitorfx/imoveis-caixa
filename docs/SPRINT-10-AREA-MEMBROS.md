# Sprint 10 — Área de Membros

**Status:** Planejamento — estruturação antes da implementação  
**Última atualização:** 28/mai/2026

---

## Visão Geral

Sistema completo de área de membros com três perfis de acesso distintos, sistema de exclusividade de corretores por cidade e rastreamento de arrematação/compra com cashback.

---

## Atores do Sistema

### 1. Membro (Arrematante/Comprador)
Usuário cadastrado no site que arrematou ou comprou um imóvel da Caixa e deseja utilizar o sistema de acompanhamento e receber cashback.

### 2. Corretor Parceiro
Corretor credenciado com exclusividade em uma ou mais cidades. É responsável por conduzir o processo documental junto à Caixa e ao cartório. Recebe destaque nas páginas de busca das suas cidades exclusivas.

### 3. Admin (site)
Equipe do site que modera todo o processo, valida os passos concluídos, aprova o cashback e acompanha as operações em andamento.

---

## Funcionalidades por Perfil

### Membro

| Funcionalidade | Descrição |
|---|---|
| Cadastro / Login | E-mail + senha; confirmação por e-mail |
| Favoritos em nuvem | Substituí o localStorage atual — sincronizado entre dispositivos |
| Histórico de buscas | Filtros salvos por sessão |
| Registrar arrematação | Informar compra e código do corretor parceiro |
| Painel de acompanhamento | Visualizar e atualizar o checklist da própria operação |
| Receber cashback | Saldo de cashback visível + histórico de pagamentos |
| Upload de documentos | Enviar comprovantes exigidos em cada etapa |
| Notificações | E-mail/push a cada passo aprovado pelo admin |

### Corretor Parceiro

| Funcionalidade | Descrição |
|---|---|
| Cadastro / Login | Perfil com CRECI, cidades exclusivas, foto |
| Painel de operações | Lista de arrematações vinculadas a ele |
| Checklist próprio | Marcar suas tarefas, data e observações por operação |
| Upload de documentos | Enviar minutas, guias e comprovantes |
| Visibilidade no site | Aparecer como "Corretor Exclusivo" nas cidades de atuação |
| Notificações | E-mail a cada nova arrematação vinculada ou passo do comprador |

### Admin

| Funcionalidade | Descrição |
|---|---|
| Painel geral | Todas as operações em andamento com status |
| Moderação por etapa | Aprovar, rejeitar ou solicitar revisão de cada passo |
| Gerenciar corretores | Cadastrar, aprovar, atribuir cidades exclusivas |
| Gerenciar membros | Visualizar, bloquear, histórico |
| Aprovar cashback | Liberar pagamento ao comprador após conclusão |
| Alertas internos | Operações paradas sem movimentação há X dias |

---

## Sistema de Exclusividade por Cidade

- Cada cidade pode ter **um único corretor parceiro exclusivo**
- Nas páginas `/imoveis/[estado]/[cidade]` e na ficha do imóvel, o corretor exclusivo da cidade aparece em destaque com CTA "Falar com corretor exclusivo desta cidade"
- Se não houver corretor exclusivo na cidade, exibe lista geral de corretores
- A exclusividade é gerenciada pelo admin (atribuição manual)
- O código do corretor é usado pelo comprador no momento de registrar a arrematação

---

## Sistema de Cashback / Comissão

### Modalidades elegíveis

| Modalidade | Comprador | Site |
|---|---|---|
| **Venda Online** | ✅ Cashback progressivo | ✅ Comissão progressiva |
| **Venda Direta** | ✅ Cashback progressivo | ✅ Comissão progressiva |
| **1º Leilão** | ❌ Sem cashback (atendimento especial) | ✅ Taxa fixa |
| **2º Leilão** | ❌ Sem cashback (atendimento especial) | ✅ Taxa fixa |
| **Licitação Aberta** | ❌ Sem cashback (atendimento especial) | ✅ Taxa fixa |

---

### Tabela progressiva — Venda Online e Venda Direta

O percentual evolui de forma independente para o comprador (baseado no histórico de compras dele) e para o site (baseado no volume de vendas gerado para aquele corretor).

#### Cashback do Comprador

| Compras concluídas pelo comprador | % sobre o valor da compra |
|---|---|
| 1 a 5 compras | **0,50%** |
| 6 a 10 compras | **0,75%** |
| 11 compras ou mais | **1,00%** |

> Contabiliza apenas compras nas modalidades **Venda Online** e **Venda Direta** com checklist 100% aprovado.

#### Comissão do Site (sobre o corretor)

| Vendas redirecionadas pelo site ao corretor | % sobre o valor da venda |
|---|---|
| 1 a 5 vendas | **0,50%** |
| 6 a 10 vendas | **0,75%** |
| 11 vendas ou mais | **1,00%** |

> Contabiliza apenas vendas concluídas (checklist aprovado) vinculadas ao corretor exclusivo indicado pelo site.

#### Exemplo prático

> Comprador com 3 compras anteriores adquire um imóvel de **R$ 300.000** por Venda Online, indicado pelo corretor que já recebeu 7 vendas do site:
> - Cashback do comprador: 0,50% × R$ 300.000 = **R$ 1.500**
> - Comissão do site: 0,75% × R$ 300.000 = **R$ 2.250**
> - Total movimentado: **R$ 3.750**

---

### Taxa fixa — 1º Leilão, 2º Leilão e Licitação Aberta

O comprador **não recebe cashback** nessas modalidades, mas tem direito a **atendimento especial** do corretor parceiro durante todo o processo.

O site cobra uma **taxa fixa** que será definida conforme o valor da arrematação:

| Valor da arrematação | Taxa do site |
|---|---|
| A definir (faixa 1) | R$ 60,00 |
| A definir (faixa 2) | R$ 100,00 |

> ⚠️ **Pendência:** definir as faixas de valor que determinam R$ 60 ou R$ 100.

---

### Regras gerais

- Cashback liberado **somente após conclusão e aprovação de todas as etapas** do checklist
- O comprador deve ter informado o **código do corretor exclusivo** da cidade do imóvel ao registrar a arrematação
- O admin faz a **liberação manual** após validar o checklist completo
- Os contadores de compras (comprador) e vendas (corretor) são **cumulativos e permanentes** — não resetam por período
- Em caso de cancelamento ou rejeição da operação, a contagem **não é incrementada**

### Fluxo
```
Comprador registra arrematação + informa código do corretor
    ↓
Admin valida o vínculo corretor ↔ cidade do imóvel
    ↓
Sistema identifica modalidade → define se há cashback ou taxa fixa
    ↓
Checklist se inicia (comprador e corretor alimentam)
    ↓
Admin aprova etapas individualmente
    ↓
Checklist 100% aprovado
    ↓
Sistema calcula cashback (% progressivo conforme contadores)
    ↓
Admin libera cashback → comprador e corretor recebem notificação
    ↓
Contadores de compras (comprador) e vendas (corretor) são incrementados
```

---

## Checklist de Arrematação/Compra

Cada operação possui um checklist com etapas divididas por responsável. Cada etapa tem:
- **Status:** pendente / em andamento / concluído / rejeitado
- **Data de conclusão** (preenchida por quem executou)
- **Observações** (campo livre para quem executou)
- **Validação do admin** (aprovar ou solicitar revisão com comentário)
- **Documentos anexados** (uploads opcionais ou obrigatórios por etapa)

### Etapas — Versão Inicial

| # | Responsável | Tarefa | Docs obrigatórios |
|---|---|---|---|
| 1 | **Comprador** | Registrar a arrematação/compra — informar valor, data, agência Caixa e código do corretor parceiro | Comprovante de arrematação ou contrato |
| 2 | **Corretor** | Providenciar a minuta da arrematação/compra na agência Caixa informada | Minuta assinada |
| 3 | **Comprador** | Preencher dados pessoais e fazer upload da documentação pessoal para o corretor anexar junto à minuta para envio ao cartório | RG, CPF, certidão de nascimento/casamento, comprovante de residência |
| 4 | **Corretor** | Solicitar as guias de IPTU e encaminhar ao comprador para pagamento | Guias de IPTU |
| 5 | **Comprador** | Pagar as guias de IPTU | Comprovante de pagamento do IPTU |
| 6 | **Corretor** | Solicitar a escritura no cartório | Protocolo de solicitação da escritura |
| 7 | **Comprador** | Pagar a escritura e enviar o comprovante | Comprovante de pagamento da escritura |
| 8 | **Corretor** | Solicitar e dar entrada no ITBI (Imposto de Transmissão de Bens Imóveis) | Protocolo de entrada do ITBI |
| 9 | **Comprador** | Pagar dívidas de condomínio e anexar comprovante de quitação | Declaração de quitação condominial |
| 10 | **Corretor** | Dar entrada no registro do imóvel no cartório | Protocolo de registro |
| 11 | **Comprador** | Pagar as custas do registro do imóvel | Comprovante de pagamento do registro |
| 12 | **Admin** | *(etapa interna)* Validar conclusão total do processo e liberar cashback | — |

> ⚠️ **Nota:** Este checklist é a versão inicial e será expandido. Campos, documentos obrigatórios e regras específicas por modalidade (leilão SFI, leilão judicial, venda direta) serão detalhados antes da implementação.

---

## Modelo de Dados (Rascunho)

### Collection: `usuarios`
```javascript
{
  _id:           ObjectId,
  nome:          "string",
  email:         "string",       // único
  senhaHash:     "string",
  tipo:          "membro" | "corretor" | "admin",
  ativo:         true,
  emailVerificado: true,
  cashbackSaldo: 0,              // centavos
  criadoEm:      ISODate,
  ultimoLogin:   ISODate,
}
```

### Collection: `corretores_parceiros`
```javascript
{
  _id:           ObjectId,
  usuarioId:     ObjectId,       // ref usuarios
  creci:         "string",
  foto:          "string",       // URL Cloudinary
  whatsapp:      "string",
  bio:           "string",
  cidadesExclusivas: ["NATAL/RN", "PARNAMIRIM/RN"],  // "CIDADE/UF"
  aprovado:      true,
  slug:          "nome-corretor",
  criadoEm:      ISODate,
}
```

### Collection: `operacoes`
```javascript
{
  _id:           ObjectId,
  membroId:      ObjectId,       // ref usuarios
  corretorId:    ObjectId,       // ref corretores_parceiros
  hdnImovel:     "string",       // ref imoveis
  estado:        "RN",
  cidade:        "NATAL",
  valorArrematacao: 250000,
  modalidade:    "Leilão SFI" | "Venda Direta" | "Leilão Judicial",
  dataRegistro:  ISODate,
  status:        "em_andamento" | "concluido" | "cancelado",
  cashbackValor: 0,              // centavos
  cashbackLiberado: false,
  etapas: [
    {
      numero:       1,
      responsavel:  "comprador" | "corretor" | "admin",
      titulo:       "Registrar a arrematação",
      status:       "pendente" | "em_andamento" | "concluido" | "rejeitado",
      dataConclusao: ISODate | null,
      observacao:   "string",
      documentos:   ["url_cloudinary_1", "url_cloudinary_2"],
      validacaoAdmin: {
        status:     "pendente" | "aprovado" | "revisao",
        comentario: "string",
        data:       ISODate,
      }
    },
    // ... demais etapas
  ],
  historicoStatus: [
    { de: "pendente", para: "em_andamento", data: ISODate, autor: ObjectId }
  ],
  criadoEm:      ISODate,
  atualizadoEm:  ISODate,
}
```

---

## Rotas (Rascunho)

### Autenticação
```
POST /api/auth/cadastro
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/esqueci-senha
POST /api/auth/redefinir-senha
GET  /api/auth/verificar-email
```

### Área do Membro
```
GET  /membro                        → painel do membro
GET  /membro/favoritos              → favoritos em nuvem
GET  /membro/operacoes              → lista de operações
GET  /membro/operacoes/[id]         → detalhe de uma operação
POST /api/membro/operacoes          → registrar nova arrematação
PUT  /api/membro/operacoes/[id]/etapa/[num]  → atualizar etapa
POST /api/membro/operacoes/[id]/upload       → upload de documento
```

### Área do Corretor
```
GET  /corretor/painel               → painel do corretor
GET  /corretor/operacoes            → operações vinculadas
PUT  /api/corretor/operacoes/[id]/etapa/[num]
POST /api/corretor/operacoes/[id]/upload
```

### Admin
```
GET  /admin/operacoes               → todas as operações
GET  /admin/operacoes/[id]          → detalhe com moderação
PUT  /api/admin/operacoes/[id]/etapa/[num]/validar
PUT  /api/admin/operacoes/[id]/cashback/liberar
GET  /admin/corretores              → já existe (expandir)
PUT  /api/admin/corretores/[id]/cidades
```

---

## Decisões Técnicas a Definir

| Decisão | Opções | Observação |
|---|---|---|
| Autenticação | NextAuth.js / JWT próprio / Clerk | NextAuth é o mais integrado ao Next.js |
| Sessões | JWT em cookie httpOnly / sessão no MongoDB | |
| Upload de documentos | Cloudinary (já integrado) | Reutilizar infraestrutura existente |
| Notificações | Resend / SendGrid / Nodemailer | |
| Cashback — forma de pagamento | PIX manual pelo admin / integração automática | Começar com PIX manual |

---

## Pendências antes de iniciar o desenvolvimento

- [x] Definir valor/percentual do cashback — ✅ definido (progressivo 0,5% → 0,75% → 1%; taxa fixa R$60–100 para leilão)
- [ ] Definir faixas de valor para a taxa fixa de leilão (quando cobra R$60 vs R$100)
- [ ] Definir quais etapas do checklist são obrigatórias vs. opcionais
- [ ] Definir se haverá diferença no checklist por modalidade (leilão vs. venda direta)
- [ ] Decidir ferramenta de autenticação (NextAuth vs. outro)
- [ ] Decidir ferramenta de e-mail transacional
- [ ] Detalhar as etapas 1 a 11 com campos específicos de cada uma
- [ ] Definir layout/UX do painel (integrar ao Redesign Sprint 8 ou fazer independente?)
- [ ] Definir se corretor usa o mesmo login ou um portal separado
- [ ] Revisar e expandir o checklist (possivelmente 15–20 etapas após revisão)
