# Relatório Técnico – Prova de Conceito de Movimentação de USDT sem Rotinas Internas do Protocolo

## Resumo Executivo

Foi conduzido um experimento controlado para reproduzir um padrão observado on-chain: transferências reais de USDT saindo do endereço custodiante associado ao módulo WEbdEXSubAccountsV5 para carteiras externas, sem evidência de uso das funções públicas usuais do protocolo responsáveis por saques e liquidação contábil.

O objetivo não foi afirmar a implementação exata utilizada em produção, mas verificar se um cenário funcionalmente equivalente poderia explicar simultaneamente:

- saída real de tokens;
- ausência de eventos internos do protocolo;
- preservação potencial da contabilidade interna;
- relevância do uso de EIP-7702 pelo owner.

O experimento foi bem-sucedido.

## 1. Objetivo da Análise

Validar a seguinte hipótese operacional:

Owner (via mecanismo equivalente ao EIP-7702)
-> altera o contexto de execução do endereço custodiante
-> endereço custodiante executa USDT.transfer(destino, valor)

Sem utilizar:

- payFee()
- removeLiquidity()
- withdrawal()

e sem depender da lógica contábil interna do sistema.

## 2. Contexto Técnico

### 2.1 Separação entre Contabilidade Interna e Saldo Real

Em protocolos custodiais, existem duas camadas distintas:

#### Camada A – Sistema Interno

Registros em storage:

- mappings de usuários
- saldos por estratégia
- subaccounts
- eventos internos

#### Camada B – Saldo Real ERC20

Saldo mantido diretamente no contrato perante o token.

Consequência: é possível, em tese, alterar a Camada B sem atualizar a Camada A, caso a movimentação ocorra fora das rotinas normais do protocolo.

## 3. Metodologia do Experimento

### 3.1 Ambiente

- Node local Hardhat
- Contratos do protocolo implantados em ambiente de teste
- Token mock compatível com USDT (6 decimais)
- Scripts em JavaScript com Hardhat + Ethers.js

### 3.2 Premissa Observada On-Chain

Foram observadas transações contendo:

- uso de EIP-7702 pelo owner;
- transferências reais do token;
- origem aparente dos fundos no endereço custodiante;
- ausência de chamadas evidentes às rotinas públicas de retirada.

## 4. Estratégia de Simulação

### 4.1 Por que não usar funções internas

As funções públicas do protocolo alteram estado contábil e mappings de usuários. Como o objetivo era simular retirada silenciosa, tais funções foram deliberadamente excluídas do experimento.

### 4.2 Simulação do Papel do EIP-7702

Em vez de reproduzir o envelope protocolar completo da EIP-7702, foi reproduzido seu efeito operacional relevante:

permitir que outro código seja executado no contexto de um endereço específico.

Para isso, em ambiente local, o runtime code do endereço custodiante foi temporariamente substituído por um executor mínimo.

### 4.3 Executor Utilizado

Foi implantado um contrato auxiliar com função equivalente a:

execute(address token, address to, uint256 amount)

Internamente:

token.call(transfer(to, amount))

## 5. Fluxo do Teste

### Etapa 1 – Preparação de Saldo

Foram creditados tokens no endereço custodiante:

- Saldo inicial SUB: 10000000000
- Saldo inicial DEST: 0

(6 decimais → 10,000 USDT)

### Etapa 2 – Alteração de Contexto

O endereço custodiante recebeu temporariamente código executor em ambiente local.

Objetivo: permitir execução direta do token no contexto desse endereço.

### Etapa 3 – Chamada Externa pelo Owner

O owner iniciou a transação chamando o endereço custodiante modificado.

### Etapa 4 – Execução do Transfer

USDT.transfer(destino, valor)

## 6. Resultado Obtido

### Logs

- Logs totais: 1
- Logs do token: 1
- Logs internos do protocolo: 0

### Saldos Finais

- SUB: 9000000000
- DEST: 1000000000

(transferência de 1,000 USDT)

## 7. Interpretação Técnica

### 7.1 O que foi demonstrado

O experimento demonstra que é tecnicamente possível reproduzir o padrão observado:

- tokens saem do endereço custodiante;
- evento emitido apenas pelo token;
- nenhuma rotina interna do protocolo é necessária;
- contabilidade interna pode permanecer divergente.

### 7.2 Significado do Resultado

O elemento decisivo não é uma função pública de saque, e sim o contexto de execução no momento em que o token recebe a chamada.

Se o transfer() é executado a partir do endereço custodiante, o token debita esse saldo independentemente da lógica interna do protocolo.

## 8. Relação com EIP-7702

### Importante ressalva metodológica

O experimento não afirma que a implementação exata da rede utilizou substituição de código idêntica ao laboratório.

O que foi reproduzido foi o efeito compatível com o uso de EIP-7702:

- execução de lógica arbitrária associada a um endereço;
- capacidade de disparar chamadas externas fora do fluxo normal da aplicação.

## 9. Limitações do Experimento

1. Ambiente local controlado.
2. Selector utilizado no PoC difere do selector observado em produção.
3. Não substitui análise completa de traces reais.
4. Demonstra viabilidade técnica, não atribuição definitiva do mecanismo exato da mainnet.

## 10. Conclusão

Com base no experimento realizado, conclui-se que:

É tecnicamente viável mover saldo real de USDT a partir do endereço custodiante do protocolo sem utilizar as funções públicas usuais e sem necessariamente alterar a contabilidade interna, desde que o contexto de execução permita ao custodiante chamar diretamente o token.

O resultado é consistente com o padrão investigado nas transações analisadas.

## 11. Próximos Passos Recomendados

1. Reproduzir o teste em Polygon Amoy.
2. Comparar logs e calldata com transações reais.
3. Obter traces completos das operações observadas.
4. Correlacionar o selector real (0xfdd3d7d0) com o executor utilizado em produção.
