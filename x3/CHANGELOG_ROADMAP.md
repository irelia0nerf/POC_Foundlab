
# FoundLab IA Lobby - Roadmap de Evolução

Este documento descreve as features planejadas para as futuras releases do FoundLab IA Lobby.
A prioridade é indicada por P1 (Mais Alta) a P3 (Mais Baixa).

**Abordagem Estratégica do Roadmap:**
Este roadmap evoluído incorpora princípios de desenvolvimento de produto enterprise, visando não apenas entregar funcionalidades, mas também garantir seu sucesso e sustentabilidade. Cada release considerará:
- **KPIs (Key Performance Indicators):** Métricas claras para medir o impacto e o sucesso das features.
- **Testes de Usabilidade (UX):** Validação com usuários para garantir que as soluções sejam intuitivas e eficazes.
- **Gestão de Débito Técnico:** Alocação de esforço para refatorações estratégicas e manutenção da qualidade do código.
- **Comunicação e Treinamento Interno:** Planejamento para a adoção eficaz das novas funcionalidades pela equipe FoundLab.
- **Análise de Riscos e Dependências:** (Processo de gestão contínuo) Identificação proativa de potenciais gargalos.

---

## [Próxima Release Pós-v1.2.0] - Persistência, Templates & Análise Inicial (Complementos)
*Codinome: Persistência Profunda*

Esta release visa complementar as funcionalidades introduzidas na v1.2.0, aprofundando a persistência e iniciando capacidades analíticas.

### Features Planejadas
- **Enhanced Interaction Logging with Audit Level** [Prioridade: P1] [Time: Dev, CEO/Product]
  - Introduzir um nível de log 'audit' para IAs críticas.
  - Detalhar prompts e, se possível, etapas de raciocínio simplificadas.
  - Expandir a função `logInteraction` existente.
- **Sumarização Automática de Conversas (Pós-Sessão)** [Prioridade: P1] [Time: Dev, Product]
  - Botão ao final da sessão para a IA ativa gerar um resumo dos pontos chave, decisões e próximos passos.
- **Exportação de Diálogos (Formatos Adicionais)** [Prioridade: P2] [Time: Dev]
  - Expandir a funcionalidade de exportação de histórico de chat para incluir formatos PDF e Markdown, além do JSON.

### Considerações Estratégicas
- **KPIs Alvo:**
    - Aumento de X% no uso de templates de prompts salvos.
    - Redução de Y% no tempo reportado para revisões de chat devido à sumarização.
- **Testes de Usabilidade:** Coleta de feedback contínuo sobre funcionalidades de persistência/exportação. Testes formais para a sumarização.
- **Foco em Refinamento Técnico:** Otimização de queries `localStorage` para grandes históricos; análise de performance do parsing de JSON na exportação.
- **Comunicação e Treinamento Interno:** Sessão de demonstração das novas funcionalidades (exportação avançada, sumarização). Atualização da documentação interna.

---

## [Release v1.3.0] - Integrações e Builder
*Codinome: Conectividade e Criação*

Foco em conectar o Lobby com ferramentas externas de produtividade e empoderar usuários com a capacidade de criar e configurar suas próprias IAs.

### Features Planejadas
- **Integração com Google Calendar / Trello** [Prioridade: P2] [Time: Dev, Ops]
  - Permitir que IAs de Operações (ex: Gemini Ops - Fernanda) interajam com Google Calendar (criar eventos) ou Trello/Asana (criar tarefas) via API.
- **Integração com Gmail Draft** [Prioridade: P2] [Time: Dev, Bridge/Partnerships]
  - Permitir que IAs de Relações Externas (ex: Gemini Bridge - Raíssa) rascunhem e-mails e os preparem como drafts no Gmail do usuário via API.
- **IA Builder (Criação de Novas IAs via UI)** [Prioridade: P1] [Time: Dev, Product]
  - Interface (modal ou página dedicada) para usuários autorizados criarem novas IAs (Nome, Função, basePrompt, Modelo base, Temperatura).
  - Salvar novas IAs no `aiProfiles.json` ou em um backend (se implementado).
- **Playground de Modelos Gemini** [Prioridade: P2] [Time: Dev, Tech Team]
  - Área de experimentação livre para interagir diretamente com diferentes modelos Gemini, testando prompts sem o contexto de uma IA específica do Lobby.
- **Controle de Temperatura/Criatividade por IA** [Prioridade: P3] [Time: Dev]
  - Adicionar um slider/input nas configurações da IA (via Builder) e/ou dinamicamente em IAs ativas para ajustar a temperatura da API Gemini.

### Considerações Estratégicas
- **KPIs Alvo:**
    - X novas IAs criadas por usuários através do IA Builder no primeiro mês.
    - Y% das IAs de Operações/Relações Externas utilizando as integrações (Calendar/Gmail) ativamente.
- **Testes de Usabilidade:** Testes dedicados para o IA Builder e para o fluxo de configuração das integrações com APIs externas.
- **Foco em Refinamento Técnico:** Modularização do código do IA Builder; criação de abstrações para interagir com diferentes APIs de terceiros.
- **Comunicação e Treinamento Interno:** Workshops de treinamento para o IA Builder e para as novas integrações. Documentação detalhada dos processos de configuração.

---

## [Release v1.4.0] - Controles e Governança
*Codinome: Plataforma Enterprise*

Implementar mecanismos robustos de controle de acesso, monitoramento de uso e custos, e funcionalidades colaborativas para solidificar o Lobby como uma plataforma enterprise-ready. Pode incluir a migração para uma fundação de backend mais robusta (ex: Firebase para Auth/DB).

### Features Planejadas
- **RBAC (Role-Based Access Control)** [Prioridade: P1] [Time: Dev, Security, Product]
  - Implementar controle de acesso baseado em papéis (ex: via Firebase Authentication) para restringir acesso a IAs e funcionalidades administrativas.
- **Painel de Monitoramento de Uso e Custos** [Prioridade: P2] [Time: Dev, Finance/Ops]
  - Dashboard administrativo para visualizar métricas de uso da API Gemini (tokens, prompts) por IA/usuário e estimativas de custo.
- **Biblioteca de Prompts Compartilhados** [Prioridade: P2] [Time: Dev, Product]
  - Funcionalidade para usuários salvarem e compartilharem prompts customizados em uma biblioteca interna, categorizada por IA ou tema.
- **Fórum Interno / Base de Conhecimento** [Prioridade: P3] [Time: Dev/Community Manager, Product]
  - Módulo simples de fórum ou Q&A para usuários compartilharem dicas, solucionarem dúvidas e discutirem melhores práticas.
- **Modo Auditoria Avançado** [Prioridade: P1] [Time: Dev, CEO/Product, Legal/Compliance]
  - Evoluir o log de auditoria com capacidade de registrar trilhas de raciocínio mais detalhadas da IA e apresentar esses logs de forma estruturada.

### Considerações Estratégicas
- **KPIs Alvo:**
    - Implementação de X papéis de acesso (RBAC) cobrindo todos os cenários de uso previstos.
    - Redução de Z% em incidentes de acesso indevido ou uso não autorizado de IAs.
- **Testes de Usabilidade:** Testes de aceitação com stakeholders para RBAC e painel de monitoramento. Avaliação da experiência de colaboração na biblioteca de prompts.
- **Foco em Refinamento Técnico:** Arquitetura de autenticação e autorização; design do esquema de dados para logs/métricas no backend; refatoração de componentes para suportar RBAC.
- **Comunicação e Treinamento Interno:** Comunicação clara sobre as novas políticas de acesso. Treinamento para administradores sobre o painel de monitoramento e gestão de papéis.

---
*Este roadmap é um documento vivo e pode ser ajustado conforme as prioridades e necessidades da FoundLab evoluem.*
