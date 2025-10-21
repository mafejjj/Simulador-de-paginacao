# Simulador-de-paginacao# 🧠 Simulador de Paginação

## 📘 Introdução
O **Simulador de Paginação** demonstra o funcionamento do gerenciamento de memória em sistemas operacionais, ilustrando como páginas de processos são movidas entre o **disco** e a **memória RAM** através da técnica de **paginação**.

---

## ⚙️ Estrutura da Interface

### 💾 Memória RAM
Representa os **quadros físicos** da memória principal. Cada quadro pode conter uma única página. Quando não há espaço livre, o simulador aplica o algoritmo **FIFO (First In, First Out)** para substituição.

### 🧱 Disco (Memória Secundária)
Simula o **armazenamento em disco**, onde ficam as páginas que ainda não foram carregadas na RAM. As páginas são identificadas como `p0`, `p1`, `p2`, etc.

### 📄 Tabela de Páginas
Mapa que relaciona o **endereço lógico** de cada página ao **endereço físico** (quadro) onde ela está armazenada na RAM.

### 🪶 Log de Eventos
Exibe o histórico de operações:
- 🟩 **HIT:** página já presente na RAM.
- 🟥 **FALTA:** página não estava na RAM e foi carregada.
- 🟥 **Substituição FIFO:** página antiga foi trocada por uma nova.

### ▶️ Controles
- **Inicializar:** Reinicia o simulador.
- **Próximo passo:** Executa manualmente um ciclo de acesso.
- **Auto ▶:** Executa a sequência completa automaticamente.

---

## 🎯 Funcionamento Lógico

1. **Solicitação de página:** o sistema busca a página requerida.
2. **Se já estiver na RAM**, ocorre um **HIT** (sem movimentação).
3. **Se não estiver**, ocorre uma **falta de página**:
   - Se houver **quadro livre**, a página é **carregada do disco**.
   - Se não houver, aplica-se **FIFO**: a página mais antiga é substituída.

Durante o processo, **setas animadas** indicam o movimento:
- 🔻 **Verde:** Disco → RAM (carregamento)
- 🔺 **Vermelha:** RAM → Disco (substituição)

---

## 🧩 Conceitos Envolvidos

- **Paginação por demanda:** apenas as páginas necessárias são carregadas.  
- **Memória virtual:** permite que o processo seja maior que a RAM.  
- **Substituição FIFO:** remove a página mais antiga.  
- **Falta de página:** ocorre quando a página não está na RAM e precisa vir do disco.

---

## 📊 Interpretação Visual

| Cor/Símbolo | Significado | Ação |
|--------------|-------------|------|
| 🟩 Verde | HIT | Página já está na RAM |
| 🟥 Vermelho | PAGE FAULT | Página foi carregada ou substituída |
| 🔻 Verde | Disco → RAM | Entrada de página |
| 🔺 Vermelho | RAM → Disco | Saída de página |

---

## 📅 Data do documento
Gerado em: 21/10/2025
