// script.js

// A lógica JavaScript completa foi mantida e adaptada.
// As únicas alterações foram nas classes aplicadas na função exibirTabela 
// para usar o Tailwind, garantindo que a funcionalidade não quebre.

let clientes = []; [cite_start]// Inicializado como array vazio, será preenchido por loadClientes() [cite: 101]
[cite_start]let clientesFiltrados = []; [cite: 102]
[cite_start]let clienteIndexParaExcluir = null; [cite: 102]
[cite_start]let clienteIndexParaDuplicar = null; [cite: 102]
[cite_start]let clienteIndexParaRenovarDebito = null; [cite: 102]
[cite_start]let clienteIndexParaAlterarProduto = null; [cite: 102]
[cite_start]let modoExibicaoArquivados = false; [cite: 103]
[cite_start]let modoExibicaoOcultos = false; [cite: 103]
[cite_start]let modoExibicaoVerDepois = false; [cite: 103]
[cite_start]let modoExibicaoDesativados = false; [cite: 103]
let filtroProduto = null;
[cite_start]let historicoClientes = []; [cite: 104]
[cite_start]let redoHistory = []; [cite: 104]
const MAX_HISTORY_STATES = 10;
[cite_start]let confirmActionCallback = null; [cite: 105]

[cite_start]let clientesParaProcessarImportacao = []; [cite: 106]
[cite_start]let currentIndexImportacao = 0; [cite: 106]

[cite_start]let clientesVencidosParaMensagem = []; [cite: 107]
[cite_start]let clienteIdParaRenovarHoje = null; [cite: 109]
[cite_start]let debounceTimer; [cite: 110]

// NOVO: URL do seu Aplicativo da Web do Google Apps Script
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyHKKeGamiImtqK0G-DJpJI3E_y83ZlVQq6A3kjW0LmRE9iRvNuG3VCOQmpt_s2XwLIrg/exec'; [cite_start]// URL fictícia, substitua pela sua [cite: 111]

[cite_start]let filtroAtual = "hojeEVencidos"; [cite: 112]

function mostrarCarregando() {
    [cite_start]document.getElementById('loadingOverlay').style.display = 'flex'; [cite: 113]
}

function esconderCarregando() {
    [cite_start]document.getElementById('loadingOverlay').style.display = 'none'; [cite: 122]
}

// NOVO: Função para salvar o estado atual dos clientes no localStorage
function saveClientsToLocalStorage() {
    try {
        [cite_start]localStorage.setItem('clientesCache', JSON.stringify(clientes)); [cite: 123]
    } catch (e) {
        [cite_start]console.error('Erro ao salvar clientes no localStorage:', e); [cite: 124]
    }
}

// Função auxiliar para enviar requisições ao backend (Apps Script)
async function sendRequestToBackend(action, data = {}) {
    try {
        [cite_start]const url = `${WEB_APP_URL}?action=${action}`; [cite: 127]
        const options = {
            [cite_start]method: 'POST', [cite: 127]
            headers: {
                [cite_start]'Content-Type': 'text/plain;charset=utf-8', [cite: 128]
            },
            [cite_start]body: JSON.stringify(data), [cite: 128]
            muteHttpExceptions: true // Importante para que o fetch não lance erro em 4xx/5xx e possamos ler a resposta do Apps Script
        };

        if (action === 'get_all_clients') {
            [cite_start]options.method = 'GET'; [cite: 130]
            [cite_start]delete options.body; [cite: 130]
        }

        [cite_start]const response = await fetch(url, options); [cite: 131]
        if (!response.ok) {
            [cite_start]const errorText = await response.text(); [cite: 132]
            [cite_start]console.error(`Erro de rede ou servidor (${response.status}):`, errorText); [cite: 132]
            [cite_start]throw new Error(`Erro de rede ou servidor: ${response.status} - ${errorText}`); [cite: 133]
        }
        [cite_start]const result = await response.json(); [cite: 134]
        if (result && result.status === 'error') {
            [cite_start]throw new Error(result.message || 'Erro desconhecido do backend.'); [cite: 135]
        }
        [cite_start]return result; [cite: 136]
    } catch (error) {
        [cite_start]console.error('Erro na comunicação com o backend:', error); [cite: 138]
        throw error; 
    }
}

// --- Função para atualizar a data e hora da última alteração de dados ---
function atualizarUltimaAtualizacao(acao = "dados atualizados", clienteNome = "") {
    [cite_start]const now = new Date(); [cite: 139]
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        [cite_start]second: '2-digit', [cite: 140]
        hour12: false
    };
    [cite_start]const formattedDateTime = now.toLocaleString('pt-BR', options); [cite: 141]

    [cite_start]let fullMessage = `Última Alteração: ${formattedDateTime}`; [cite: 142]
    if (clienteNome) {
        [cite_start]const nomeLimpoParaMsg = clienteNome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, ''); [cite: 143]
        [cite_start]fullMessage += ` - ${nomeLimpoParaMsg} (${acao})`; [cite: 143]
    } else {
        [cite_start]fullMessage += ` (${acao})`; [cite: 144]
    }

    [cite_start]localStorage.setItem('ultimaAtualizacaoCliente', fullMessage); [cite: 145]
    [cite_start]document.getElementById('ultimaAtualizacaoInfo').textContent = fullMessage; [cite: 145]
}
// --- Fim da função de atualização ---

function saveStateToHistory(clearRedo = true) {
    [cite_start]const estadoAtual = JSON.parse(JSON.stringify(clientes)); [cite: 147]
    [cite_start]historicoClientes.push(estadoAtual); [cite: 147]

    if (historicoClientes.length > MAX_HISTORY_STATES) {
        [cite_start]historicoClientes.shift(); [cite: 148]
    }

    if (clearRedo) {
        [cite_start]redoHistory = []; [cite: 149]
    }
}

function exibirConfirmacaoGenerica(titulo, mensagem, callback, isDanger = false) {
    [cite_start]const modal = document.getElementById("modalConfirmacaoGenerica"); [cite: 150]
    [cite_start]const btnConfirmar = document.getElementById("btnConfirmacaoGenericaConfirmar"); [cite: 150]

    document.getElementById("modalConfirmacaoGenericaTitulo").innerText = titulo;
    document.getElementById("modalConfirmacaoGenericaMensagem").innerHTML = mensagem;
    [cite_start]confirmActionCallback = callback; [cite: 151]

    if (isDanger) {
        [cite_start]btnConfirmar.classList.add("modal-confirm-danger"); [cite: 152]
        btnConfirmar.classList.remove("bg-indigo-600", "hover:bg-indigo-700");
        btnConfirmar.classList.add("bg-red-600", "hover:bg-red-700");
    } else {
        [cite_start]btnConfirmar.classList.remove("modal-confirm-danger"); [cite: 153]
        btnConfirmar.classList.remove("bg-red-600", "hover:bg-red-700");
        btnConfirmar.classList.add("bg-indigo-600", "hover:bg-indigo-700");
    }

    btnConfirmar.onclick = () => {
        if (confirmActionCallback) {
            [cite_start]confirmActionCallback(); [cite: 154]
            [cite_start]confirmActionCallback = null; [cite: 154]
        }
        [cite_start]fecharModal(); [cite: 155]
    };

    modal.style.display = "flex";
    document.addEventListener("keydown", fecharComEsc);
}

function fecharModal() {
    [cite_start]document.getElementById("modalConfirmacao").style.display = "none"; [cite: 156]
    [cite_start]document.getElementById("modalExclusao").style.display = "none"; [cite: 156]
    [cite_start]document.getElementById("modalRenovarComDebito").style.display = "none"; [cite: 156]
    [cite_start]document.getElementById("modalConfirmacaoGenerica").style.display = "none"; [cite: 156]
    [cite_start]document.getElementById("modalConflitoIdNome").style.display = "none"; [cite: 156]
    [cite_start]document.getElementById("modalContagemProdutos").style.display = "none"; [cite: 156]
    [cite_start]document.getElementById("modalEscolherProduto").style.display = "none"; [cite: 157]

    const modalEdicao = document.getElementById("modalEdicao");
    if (modalEdicao) {
        [cite_start]modalEdicao.style.display = "none"; [cite: 158]
        [cite_start]modalEdicao.innerHTML = ""; [cite: 158]
        document.removeEventListener("keydown", fecharComEsc);
    }
    [cite_start]const modalAlerta = document.getElementById("modalAlerta"); [cite: 159]
    if (modalAlerta) {
        [cite_start]modalAlerta.style.display = "none"; [cite: 160]
        [cite_start]modalAlerta.innerHTML = ""; [cite: 160]
        [cite_start]document.removeEventListener("keydown", fecharComEscOuEnter); [cite: 160]
    }
    [cite_start]clienteIdParaRenovarHoje = null; [cite: 161] 
}

function fecharComEsc(event) {
    if (event.key === "Escape") {
        [cite_start]fecharModal(); [cite: 162]
    }
}

function fecharComEscOuEnter(event) {
    if (event.key === "Enter" || event.key === "Escape") {
        [cite_start]fecharModal(); [cite: 163]
    }
}

function exibirAlerta(mensagem) {
    [cite_start]let modalAlerta = document.getElementById("modalAlerta"); [cite: 164]
    [cite_start]modalAlerta.style.display = "flex"; [cite: 164]
    modalAlerta.innerHTML = `
        <div class="modal-content">
            <h3 class="text-2xl font-bold mb-4 text-indigo-700">Aviso</h3>
            <p class="text-gray-700 mb-6">${mensagem}</p>
            <button onclick="fecharModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition duration-200">OK</button>
        </div>
    [cite_start]`; [cite: 165]
    [cite_start]document.addEventListener("keydown", fecharComEscOuEnter); [cite: 166]
}

document.addEventListener('keydown', function(event) {
    if (event.key === "Enter" && document.getElementById("modalExclusao").style.display === "flex") {
        confirmarExclusao();
    }
});

[cite_start]async function adicionarCliente() { [cite: 167]
    [cite_start]const dataInput = document.getElementById("dataInput").value.trim(); [cite: 168]
    [cite_start]const nomeInput = document.getElementById("nomeInput").value.trim(); [cite: 168]
    const telefoneInput = document.getElementById("telefoneInput").value.trim();
    [cite_start]const produtoSelecionado = document.querySelector('input[name="produto"]:checked').value; [cite: 169]

    if (!dataInput || !nomeInput || !telefoneInput) {
        [cite_start]return exibirAlerta("Por favor, insira a data, o nome e o telefone do cliente."); [cite: 170]
    }

    [cite_start]const telefoneLimpo = telefoneInput.replace(/[^\d]/g, ''); [cite: 171]
    if (telefoneLimpo.length < 5) {
        [cite_start]return exibirAlerta("O telefone deve ter pelo menos 5 dígitos para gerar o ID."); [cite: 172]
    }
    [cite_start]const clienteId = telefoneLimpo.slice(-5); [cite: 173]
    [cite_start]const clienteExistenteComMesmoId = clientes.find(c => c.id === clienteId); [cite: 173]
    if (clienteExistenteComMesmoId) {
        [cite_start]return exibirAlerta(`Já existe um cliente com o ID final de telefone ${clienteId} (Nome: ${clienteExistenteComMesmoId.nome}). Por favor, use um telefone final diferente ou edite o cliente existente.`); [cite: 174]
    }

    [cite_start]saveStateToHistory(); [cite: 175]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 176]

    [cite_start]const dataParts = dataInput.split("-"); [cite: 177]
    [cite_start]const dataFormatadaParaArmazenar = `${dataParts[2]}/${dataParts[1]}/${dataParts[0]}`; [cite: 177]
    [cite_start]let nomeComProduto = nomeInput; [cite: 177]
    if (produtoSelecionado === "UniTv" || produtoSelecionado === "Duplecast") {
        [cite_start]nomeComProduto = `${nomeInput} (${produtoSelecionado})`; [cite: 178]
    }

    const novoClienteObj = {
        id: clienteId,
        data: dataFormatadaParaArmazenar,
        nome: nomeComProduto,
        telefone: telefoneLimpo,
        [cite_start]avisado: false, [cite: 179]
        [cite_start]debito: false, [cite: 179]
        Produto: produtoSelecionado,
        arquivado: false,
        oculto: false,
        verDepois: false,
        [cite_start]desativado: false, [cite: 180]
        dola_sent: false, 
        clicado: false 
    };

    [cite_start]clientes.push(novoClienteObj); [cite: 181]
    [cite_start]saveClientsToLocalStorage(); [cite: 181]

    [cite_start]document.getElementById("nomeInput").value = ""; [cite: 182]
    [cite_start]document.getElementById("telefoneInput").value = ""; [cite: 182]

    exibirTabela(); 
    [cite_start]exibirClientesAvisados(); [cite: 183]
    [cite_start]atualizarUltimaAtualizacao("adicionado", nomeInput); [cite: 183]

    try {
        [cite_start]await salvarClientes(); [cite: 184]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 185]
        [cite_start]saveClientsToLocalStorage(); [cite: 185]
        [cite_start]exibirTabela(); [cite: 186]
        [cite_start]exibirClientesAvisados(); [cite: 186]
        exibirAlerta(`Erro ao adicionar cliente: ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha na adição", nomeInput); [cite: 187]
    }
}

async function arquivar(index) {
    [cite_start]const clienteParaArquivar = clientesExibidos[index]; [cite: 188]
    [cite_start]const clienteOriginalIndex = clientes.findIndex(c => c.id === clienteParaArquivar.id); [cite: 188]
    [cite_start]if (clienteOriginalIndex === -1) return; [cite: 189]

    [cite_start]saveStateToHistory(); [cite: 190]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 190]

    [cite_start]clientes[clienteOriginalIndex].arquivado = true; [cite: 191]
    [cite_start]clientes[clienteOriginalIndex].oculto = false; [cite: 191]
    [cite_start]clientes[clienteOriginalIndex].verDepois = false; [cite: 191]
    [cite_start]clientes[clienteOriginalIndex].desativado = false; [cite: 191]
    [cite_start]clientes[clienteOriginalIndex].clicado = false; [cite: 192]
    [cite_start]saveClientsToLocalStorage(); [cite: 193]

    [cite_start]clientesFiltrados = []; [cite: 194]
    [cite_start]chamarFiltroAtual(); [cite: 195]
    [cite_start]exibirClientesAvisados(); [cite: 195]
    [cite_start]atualizarUltimaAtualizacao("arquivado", clienteParaArquivar.nome); [cite: 195]

    try {
        [cite_start]await salvarClientes(); [cite: 196]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 197]
        [cite_start]saveClientsToLocalStorage(); [cite: 197]
        [cite_start]chamarFiltroAtual(); [cite: 198]
        [cite_start]exibirClientesAvisados(); [cite: 198]
        exibirAlerta(`Erro ao arquivar cliente: ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha ao arquivar", clienteParaArquivar.nome); [cite: 199]
    }
}

async function desarquivar(index) {
    [cite_start]const clienteParaDesarquivar = clientesExibidos[index]; [cite: 200]
    [cite_start]const clienteOriginalIndex = clientes.findIndex(c => c.id === clienteParaDesarquivar.id); [cite: 200]
    [cite_start]if (clienteOriginalIndex === -1) return; [cite: 201]

    [cite_start]saveStateToHistory(); [cite: 202]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 202]

    clientes[clienteOriginalIndex].arquivado = false;
    saveClientsToLocalStorage(); 

    [cite_start]clientesFiltrados = []; [cite: 203]
    [cite_start]chamarFiltroAtual(); [cite: 204]
    [cite_start]exibirClientesAvisados(); [cite: 204]
    [cite_start]atualizarUltimaAtualizacao("desarquivado", clienteParaDesarquivar.nome); [cite: 204]

    try {
        [cite_start]await salvarClientes(); [cite: 205]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 206]
        [cite_start]saveClientsToLocalStorage(); [cite: 206]
        [cite_start]chamarFiltroAtual(); [cite: 207]
        [cite_start]exibirClientesAvisados(); [cite: 207]
        exibirAlerta(`Erro ao desarquivar cliente: ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha ao desarquivar", clienteParaDesarquivar.nome); [cite: 208]
    }
}

function filtrarHojeEVencidos() {
    [cite_start]const hoje = new Date(); [cite: 209]
    [cite_start]const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()); [cite: 209]
    const hojeFormatada = hoje.getDate().toString().padStart(2, '0') + "/" +
        (hoje.getMonth() + 1).toString().padStart(2, '0') + "/" +
        [cite_start]hoje.getFullYear(); [cite: 210]

    [cite_start]clientesFiltrados = clientes.filter(cliente => { [cite: 210]
        const [dia, mes, ano] = cliente.data.split("/").map(num => parseInt(num));
        const dataCliente = new Date(ano, mes - 1, dia);

        const isVencendoHoje = cliente.data === hojeFormatada;
        const isVencido = dataCliente < hojeSemHora;

        [cite_start]return (isVencendoHoje || isVencido) && !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado; [cite: 211]
    });
    
    [cite_start]filtroAtual = "hojeEVencidos"; [cite: 212]
    [cite_start]exibirTabela(); [cite: 213]
    [cite_start]atualizarContadores(); [cite: 213]
}

function filtrarArquivados() {
    [cite_start]clientesFiltrados = []; [cite: 214]
    [cite_start]filtroAtual = "arquivados"; [cite: 215]
    [cite_start]document.getElementById("searchInput").value = ""; [cite: 215]
    [cite_start]exibirTabela(); [cite: 215]
    [cite_start]exibirClientesAvisados(); [cite: 215]
}

function mostrarApenasOcultosPorFiltro() {
    [cite_start]clientesFiltrados = clientes.filter(cliente => cliente.oculto && !cliente.arquivado && !cliente.verDepois && !cliente.desativado); [cite: 216]
    [cite_start]filtroAtual = "ocultos"; [cite: 217]
    [cite_start]document.getElementById("searchInput").value = ""; [cite: 217]
    [cite_start]exibirTabela(); [cite: 217]
    [cite_start]exibirClientesAvisados(); [cite: 217]
}

function filtrarVerDepois() {
    [cite_start]clientesFiltrados = []; [cite: 218]
    [cite_start]filtroAtual = "verDepois"; [cite: 219]
    [cite_start]document.getElementById("searchInput").value = ""; [cite: 219]
    [cite_start]exibirTabela(); [cite: 219]
    [cite_start]exibirClientesAvisados(); [cite: 219]
}

function filtrarDesativados() {
    [cite_start]clientesFiltrados = []; [cite: 220]
    [cite_start]filtroAtual = "desativados"; [cite: 221]
    [cite_start]document.getElementById("searchInput").value = ""; [cite: 221]
    [cite_start]exibirTabela(); [cite: 221]
    [cite_start]exibirClientesAvisados(); [cite: 221]
}

function filtrarPorProduto(produto) {
    [cite_start]clientesFiltrados = []; [cite: 222]
    [cite_start]filtroAtual = `produto:${produto}`; [cite: 223]
    [cite_start]document.getElementById("searchInput").value = ""; [cite: 223]
    [cite_start]fecharModal(); [cite: 223]
    [cite_start]exibirTabela(); [cite: 223]
    [cite_start]exibirClientesAvisados(); [cite: 223]
}

[cite_start]let clientesExibidos = []; [cite: 224]

function formatDateForDisplay(dateString) {
    [cite_start]if (!dateString) return ''; [cite: 225]
    [cite_start]const parts = dateString.split('/'); [cite: 225]
    if (parts.length === 3) {
        [cite_start]return `${parts[0]}/${parts[1]}`; [cite: 226]
    }
    [cite_start]return dateString.substring(0, 5); [cite: 227]
}

// FUNÇÃO CRÍTICA ADAPTADA PARA TAILWIND
function exibirTabela() {
    [cite_start]const termoPesquisa = document.getElementById("searchInput").value.trim().toLowerCase(); [cite: 228]
    let clientesParaProcessar;

    [cite_start]if (termoPesquisa !== '') { [cite: 229]
        clientesParaProcessar = clientes.filter(cliente =>
            (cliente.nome.toLowerCase().includes(termoPesquisa) || cliente.telefone.includes(termoPesquisa))
        [cite_start]); [cite: 229]
    } else if (filtroAtual === "hojeEVencidos") {
         [cite_start]const hoje = new Date(); [cite: 230]
        [cite_start]const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()); [cite: 230]
        const hojeFormatada = hoje.getDate().toString().padStart(2, '0') + "/" +
            (hoje.getMonth() + 1).toString().padStart(2, '0') + "/" +
            [cite_start]hoje.getFullYear(); [cite: 231]
        clientesParaProcessar = clientes.filter(cliente => {
            const [dia, mes, ano] = cliente.data.split("/").map(num => parseInt(num));
            const dataCliente = new Date(ano, mes - 1, dia);
            [cite_start]const isVencendoHoje = cliente.data === hojeFormatada; [cite: 232]
            [cite_start]const isVencido = dataCliente < hojeSemHora; [cite: 232]
            [cite_start]return (isVencendoHoje || isVencido) && !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado; [cite: 232]
        [cite_start]}); [cite: 233]
    } else if (filtroAtual === "arquivados") {
        [cite_start]clientesParaProcessar = clientes.filter(cliente => cliente.arquivado); [cite: 234]
    } else if (filtroAtual === "verDepois") {
        [cite_start]clientesParaProcessar = clientes.filter(cliente => cliente.verDepois && !cliente.arquivado && !cliente.oculto && !cliente.desativado); [cite: 235]
    } else if (filtroAtual === "desativados") {
        [cite_start]clientesParaProcessar = clientes.filter(cliente => cliente.desativado); [cite: 236]
    } else if (filtroAtual.startsWith("produto:")) {
        [cite_start]const produto = filtroAtual.split(":")[1]; [cite: 237]
        [cite_start]clientesParaProcessar = clientes.filter(cliente => cliente.Produto === produto && !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado); [cite: 238]
    } else if (filtroAtual === "hoje") {
        [cite_start]const hoje = new Date(); [cite: 239]
        const hojeFormatada = hoje.getDate().toString().padStart(2, '0') + "/" +
            (hoje.getMonth() + 1).toString().padStart(2, '0') + "/" +
            [cite_start]hoje.getFullYear(); [cite: 240]
        [cite_start]clientesParaProcessar = clientes.filter(cliente => cliente.data === hojeFormatada && !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado && !cliente.avisado); [cite: 240]
    } else if (filtroAtual === "amanha") {
        [cite_start]const amanha = new Date(); [cite: 242]
        [cite_start]amanha.setDate(amanha.getDate() + 1); [cite: 242]
        const amanhaFormatada = amanha.getDate().toString().padStart(2, '0') + "/" +
            (amanha.getMonth() + 1).toString().padStart(2, '0') + "/" +
            [cite_start]amanha.getFullYear(); [cite: 243]
        [cite_start]clientesParaProcessar = clientes.filter(cliente => cliente.data === amanhaFormatada && !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado); [cite: 244]
    } else if (filtroAtual === "vencidos") {
         [cite_start]const hoje = new Date(); [cite: 245]
        clientesParaProcessar = clientes.filter(cliente => {
            const [dia, mes, ano] = cliente.data.split("/").map(num => parseInt(num));
            const dataCliente = new Date(ano, mes - 1, dia);
            [cite_start]const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()); [cite: 246]
            [cite_start]return dataCliente < hojeSemHora && !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado && !cliente.avisado; [cite: 246]
        [cite_start]}); [cite: 247]
    } else if (filtroAtual === "debito") {
        [cite_start]clientesParaProcessar = clientes.filter(cliente => cliente.debito && !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado); [cite: 247]
    } else if (filtroAtual === "todos") {
         [cite_start]clientesParaProcessar = clientes.filter(cliente => !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado); [cite: 248]
    } else {
        [cite_start]clientesParaProcessar = clientes.filter(cliente => !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado); [cite: 250]
    }
    
    [cite_start]clientesExibidos = clientesParaProcessar; [cite: 251]
    if (clientesExibidos.length === 0) {
        [cite_start]document.querySelector("table").style.display = "none"; [cite: 252]
        document.getElementById("tabelaClientes").innerHTML = `<tr><td colspan="1" class="text-center text-gray-500 py-4">Nenhum cliente para exibir neste filtro.</td></tr>`;
        [cite_start]prepararClientesVencidosParaMensagem(); [cite: 252]
        [cite_start]atualizarContadores(); [cite: 253]
        return;
    }

    [cite_start]document.querySelector("table").style.display = "table"; [cite: 254]
    [cite_start]const tabela = document.getElementById("tabelaClientes"); [cite: 254]
    [cite_start]tabela.innerHTML = ""; [cite: 254]

    clientesExibidos.sort((a, b) => {
        const [diaA, mesA, anoA] = a.data.split("/").map(num => parseInt(num));
        const [diaB, mesB, anoB] = b.data.split("/").map(num => parseInt(num));
        const dataA = new Date(anoA, mesA - 1, diaA);
        [cite_start]const dataB = new Date(anoB, mesB - 1, diaB); [cite: 255]
        [cite_start]return dataA - dataB; [cite: 255]
    [cite_start]}); [cite: 256]

    [cite_start]const hoje = new Date(); [cite: 256]
    const hojeFormatadaDDMMYYYY = hoje.getDate().toString().padStart(2, '0') + "/" +
        (hoje.getMonth() + 1).toString().padStart(2, '0') + "/" +
        [cite_start]hoje.getFullYear(); [cite: 257]

    [cite_start]clientesExibidos.forEach((cliente, index) => { [cite: 257]
        const tr = document.createElement("tr");

        // Adiciona classes base Tailwind para linhas
        tr.classList.add("transition", "duration-100", "ease-in-out", "border-b", "border-gray-200", "hover:shadow-lg", "hover:bg-gray-50"); 
        
        // Lógica de cores baseada no status
        let linkTextColor = "text-blue-600 hover:text-blue-800"; // Cor padrão do link
        let isDarkBg = false;
        
        // 1. Status Primário (Avisado tem prioridade de cor)
        if (cliente.avisado) {
            [cite_start]tr.classList.add("bg-blue-600", "text-white", "shadow-md", "hover:bg-blue-700"); [cite: 28]
            linkTextColor = "text-white hover:text-blue-200";
            isDarkBg = true;
        }
        
        // 2. Status Secundário (Débito)
        if (cliente.debito && !cliente.avisado) { 
            [cite_start]tr.classList.add("bg-amber-400", "text-gray-800", "hover:bg-amber-500"); [cite: 30] 
            linkTextColor = "text-gray-800 hover:text-black";
        }

        [cite_start]const [diaCliente, mesCliente, anoCliente] = cliente.data.split("/").map(num => parseInt(num)); [cite: 258]
        [cite_start]const dataCliente = new Date(anoCliente, mesCliente - 1, diaCliente); [cite: 258]
        [cite_start]const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()); [cite: 258]

        // 3. Status de Vencimento
        if (cliente.data === hojeFormatadaDDMMYYYY && !cliente.avisado && !cliente.debito) {
            [cite_start]tr.classList.add("bg-yellow-200", "text-gray-900", "hover:bg-yellow-300"); [cite: 31]
            linkTextColor = "text-gray-900 hover:text-black";
        } else if (dataCliente < hojeSemHora && !cliente.avisado && !cliente.debito) {
            [cite_start]tr.classList.add("bg-red-500", "text-white", "shadow-md", "hover:bg-red-600"); [cite: 32]
            linkTextColor = "text-white hover:text-red-200";
            isDarkBg = true;
        }
        
        // 4. Se a linha tem background escuro, o link clicado deve ter o texto mais claro
        const classeDinamica = cliente.clicado ? `${linkTextColor} font-semibold underline` : linkTextColor;


        [cite_start]let botoesAcao = ''; [cite: 260]
        [cite_start]if (filtroAtual === "arquivados") { [cite: 260]
            botoesAcao = `
                [cite_start]<button title="Desarquivar Cliente" onclick="desarquivar(${index})" class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">Desarquivar</button> [cite: 260]
                [cite_start]<button title="Excluir Cliente" onclick="excluir(${index})" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">❌</button> [cite: 260]
            [cite_start]`; [cite: 261]
        [cite_start]} else if (filtroAtual === "verDepois") { [cite: 261]
            botoesAcao = `
                [cite_start]<button title="Desmarcar Ver Depois" onclick="toggleVerDepois(${index})" class="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">Desmarcar</button> [cite: 261]
                [cite_start]<button title="Editar Cliente" onclick="editar(${index})" class="bg-gray-400 hover:bg-gray-500 text-gray-800 font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">Edit</button> [cite: 262]
                <button title="Excluir Cliente" onclick="excluir(${index})" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">❌</button>                        
                [cite_start]<button title="Arquivar Cliente" onclick="arquivar(${index})" class="bg-gray-400 hover:bg-gray-500 text-gray-800 font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">📂</button> [cite: 262]
                [cite_start]<button title="Desativar Cliente" onclick="toggleDesativado(${index})" class="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">Desativar</button> [cite: 263]
                [cite_start]<button title="Copiar Mensagem WhatsApp" onclick="copiarMensagemWhatsApp(${index})" class="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">📋 Copiar</button> [cite: 263]
                [cite_start]<button title="Enviar Lembrete Dola" class="btn-dola" onclick="enviarMensagemWhatsAppDola(${index})">🤖 Dola</button> [cite: 263]
                [cite_start]<button title="Renovar Automático" onclick="renovarAutomatico(${index})" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">🔁</button> [cite: 263]
                [cite_start]<button title="Renovar com Débito (Confirmação)" class="btn-debito-segurar font-semibold py-1 px-2 rounded-lg text-xs transition duration-200" onclick="pedirConfirmacaoRenovacaoDebito(${index})">DÉBITO</button> [cite: 264]
                [cite_start]<button title="Renovar a Partir de Hoje" class="btn-renovar-data-atual font-semibold py-1 px-2 rounded-lg text-xs transition duration-200" onclick="pedirConfirmacaoRenovarHoje(${index})">RENOVAR HOJE</button> [cite: 264]
                [cite_start]<button title="Alterar Produto" onclick="abrirModalAlterarProduto(${index})" class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">Produto</button> [cite: 264]
            [cite_start]`; [cite: 265]
        [cite_start]} else if (filtroAtual === "desativados") { [cite: 265]
            botoesAcao = `
                [cite_start]<button title="Reativar Cliente" onclick="toggleDesativado(${index})" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">Reativar</button> [cite: 266]
                [cite_start]<button title="Excluir Cliente" onclick="excluir(${index})" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">❌</button> [cite: 266]
            [cite_start]`; [cite: 266]
        } else {
            [cite_start]const nomeExibicaoBase = cliente.nome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, ''); [cite: 267]
            const dolaButtonClass = cliente.dola_sent ? 'btn-dola-sent' : 'btn-dola'; 

            botoesAcao = `
                [cite_start]<button title="Enviar Lembrete Dola" class="${dolaButtonClass} font-semibold py-1 px-2 rounded-lg text-xs transition duration-200" onclick="enviarMensagemWhatsAppDola(${index})">🤖 Dola</button> [cite: 267]
                [cite_start]<button title="Renovar Automático" onclick="renovarAutomatico(${index})" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">🔁</button> [cite: 268]
                <button title="Renovar com Débito (Confirmação)"
                         class="btn-debito-segurar font-semibold py-1 px-2 rounded-lg text-xs transition duration-200"
                         [cite_start]onclick="pedirConfirmacaoRenovacaoDebito(${index})">DÉBITO</button> [cite: 269]
                <button title="Renovar a Partir de Hoje"
                         class="btn-renovar-data-atual font-semibold py-1 px-2 rounded-lg text-xs transition duration-200"
                         [cite_start]onclick="pedirConfirmacaoRenovarHoje(${index})">RENOVAR HOJE</button> [cite: 270]
                <button title="Marcar/Desmarcar Ver Depois" onclick="toggleVerDepois(${index})" class="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">${cliente.verDepois ? [cite_start]"Desmarcar" : "Ver Depois"}</button> [cite: 271]
                [cite_start]<button title="Alterar Produto" onclick="abrirModalAlterarProduto(${index})" class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">Produto</button> [cite: 271]
                [cite_start]<button title="Editar Cliente" onclick="editar(${index})" class="bg-gray-400 hover:bg-gray-500 text-gray-800 font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">Edit</button> [cite: 271]
                [cite_start]<button title="Excluir Cliente" onclick="excluir(${index})" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">❌</button> [cite: 272]
                [cite_start]<button title="Arquivar Cliente" onclick="arquivar(${index})" class="bg-gray-400 hover:bg-gray-500 text-gray-800 font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">📂</button> [cite: 272]
                [cite_start]<button title="Desativar Cliente" onclick="toggleDesativado(${index})" class="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">Desativar</button> [cite: 272]
                [cite_start]<button title="Copiar Mensagem WhatsApp" onclick="copiarMensagemWhatsApp(${index})" class="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">📋 Copiar</button> [cite: 273]
                [cite_start]<button title="Duplicar Cliente" onclick="duplicarCliente(${index})" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-2 rounded-lg text-xs transition duration-200">➕ Duplicar</button> [cite: 273]
            [cite_start]`; [cite: 274]
        }

        [cite_start]const nomeExibicaoBase = cliente.nome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, ''); [cite: 275]
        
        tr.innerHTML = `
            <td class="flex items-center flex-wrap gap-2 p-3">
                <span class="font-bold w-12 text-center text-sm md:text-base">${formatDateForDisplay(cliente.data)}</span> 
                <a href="#"
                    class="flex-grow text-left ${classeDinamica} transition duration-100 ease-in-out"
                    onclick="enviarMensagemWhatsApp('${nomeExibicaoBase}', '${cliente.telefone}', ${index}); return false;">
                    [cite_start]${nomeExibicaoBase} <span class="text-xs ${isDarkBg ? 'text-white/80' : 'text-gray-500'}">(${cliente.Produto || 'N/I'})</span> [cite: 277, 278]
                </a>
                <div class="flex flex-wrap gap-1 ml-auto justify-end">
                    [cite_start]${botoesAcao} [cite: 278]
                </div>
            </td>
        [cite_start]`; [cite: 279]
        [cite_start]tabela.appendChild(tr); [cite: 279]
    });
    atualizarContadores();
}


function exibirClientesAvisados() {
    [cite_start]const clientesAvisadosList = document.getElementById('clientesAvisadosList'); [cite: 280]
    [cite_start]clientesAvisadosList.innerHTML = ''; [cite: 280]

    [cite_start]const avisados = clientes.filter(cliente => cliente.avisado && cliente.oculto && !cliente.arquivado && !cliente.verDepois && !cliente.desativado); [cite: 284]

    if (avisados.length === 0) {
        [cite_start]clientesAvisadosList.innerHTML = '<li class="text-gray-500 p-4 border border-gray-200 rounded-lg">Nenhum cliente avisado para exibir.</li>'; [cite: 285]
        return;
    }

    [cite_start]avisados.sort((a, b) => { [cite: 286]
        const [diaA, mesA, anoA] = a.data.split("/").map(num => parseInt(num));
        const [diaB, mesB, anoB] = b.data.split("/").map(num => parseInt(num));
        const dataA = new Date(anoA, mesA - 1, diaA);
        [cite_start]const dataB = new Date(anoB, mesB - 1, diaB); [cite: 286]
        return dataA - dataB;
    [cite_start]}); [cite: 287]

    [cite_start]avisados.forEach(cliente => { [cite: 287]
        const li = document.createElement('li');
        const nomeExibicaoBase = cliente.nome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, '');
        const dolaButtonClass = cliente.dola_sent ? 'btn-dola-sent' : 'btn-dola'; 
        
        li.classList.add('bg-blue-50', 'border', 'border-blue-200', 'rounded-lg', 'p-4', 'flex', 'flex-col', 'md:flex-row', 'justify-between', 'items-start', 'md:items-center', 'gap-3');

        li.innerHTML = `
            [cite_start]<div class="client-info text-left"> [cite: 288]
                [cite_start]<strong class="font-semibold text-blue-700">${nomeExibicaoBase}</strong> <span class="text-sm text-gray-600">(${cliente.Produto || 'N/I'})</span> - Vencimento: <span class="font-bold">${formatDateForDisplay(cliente.data)}</span> [cite: 288]
            </div>
            <div class="client-actions flex flex-wrap gap-2 justify-end">
                [cite_start]<button title="Desmarcar Avisado e Reexibir" onclick="toggleAvisadoFromAvisados('${cliente.id}')" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-lg text-xs transition duration-200">Reexibir</button> [cite: 289]
                [cite_start]<button title="Enviar Lembrete Dola" class="${dolaButtonClass} font-medium py-1 px-3 rounded-lg text-xs transition duration-200" onclick="enviarMensagemWhatsAppDolaById('${cliente.id}')">🤖 Dola</button> [cite: 289]
                [cite_start]<button title="Copiar Mensagem WhatsApp" onclick="copiarMensagemWhatsAppById('${cliente.id}')" class="bg-sky-500 hover:bg-sky-600 text-white font-medium py-1 px-3 rounded-lg text-xs transition duration-200">📋 Copiar</button> [cite: 290]
                [cite_start]<button title="Duplicar Cliente" onclick="duplicarClienteById('${cliente.id}')" class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-1 px-3 rounded-lg text-xs transition duration-200">➕ Duplicar</button> [cite: 290]
                [cite_start]<button title="Renovar Automático" onclick="renovarAutomatiscoById('${cliente.id}')" class="bg-green-500 hover:bg-green-600 text-white font-medium py-1 px-3 rounded-lg text-xs transition duration-200">🔁</button> [cite: 290]
                <button title="Renovar com Débito (Confirmação)"
                         class="btn-debito-segurar font-medium py-1 px-3 rounded-lg text-xs transition duration-200"
                         [cite_start]onclick="pedirConfirmacaoRenovacaoDebitoById('${cliente.id}')">DÉBITO</button> [cite: 291]
                <button title="Renovar a Partir de Hoje"
                         class="btn-renovar-data-atual font-medium py-1 px-3 rounded-lg text-xs transition duration-200"
                         [cite_start]onclick="pedirConfirmacaoRenovarHojeById('${cliente.id}')">RENOVAR HOJE</button> [cite: 292]
                <button title="Marcar/Desmarcar Ver Depois" onclick="toggleVerDepoisById('${cliente.id}')" class="bg-purple-500 hover:bg-purple-600 text-white font-medium py-1 px-3 rounded-lg text-xs transition duration-200">${cliente.verDepois ? [cite_start]"Desmarcar Ver Depois" : "Ver Depois"}</button> [cite: 293]
                [cite_start]<button title="Alterar Produto" onclick="abrirModalAlterarProdutoById('${cliente.id}')" class="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-1 px-3 rounded-lg text-xs transition duration-200">Produto</button> [cite: 293]
                [cite_start]<button title="Editar Cliente" onclick="editarClienteById('${cliente.id}')" class="bg-gray-400 hover:bg-gray-500 text-gray-800 font-medium py-1 px-3 rounded-lg text-xs transition duration-200">Edit</button> [cite: 294]
                [cite_start]<button title="Excluir Cliente" onclick="excluirClienteById('${cliente.id}')" class="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded-lg text-xs transition duration-200">❌</button> [cite: 294]
                [cite_start]<button title="Arquivar Cliente" onclick="arquivarById('${cliente.id}')" class="bg-gray-400 hover:bg-gray-500 text-gray-800 font-medium py-1 px-3 rounded-lg text-xs transition duration-200">📂</button> [cite: 294]
                [cite_start]<button title="Desativar Cliente" onclick="toggleDesativadoById('${cliente.id}')" class="bg-gray-600 hover:bg-gray-700 text-white font-medium py-1 px-3 rounded-lg text-xs transition duration-200">Desativar</button> [cite: 294]
            </div>
        [cite_start]`; [cite: 295]
        [cite_start]clientesAvisadosList.appendChild(li); [cite: 295]
    });
}

// Renomeada e ajustada para refletir que só desmarca o status de "avisado"
async function toggleAvisadoFromAvisados(clientId) {
    [cite_start]const clienteOriginalIndex = clientes.findIndex(c => c.id === clientId); [cite: 296]
    [cite_start]if (clienteOriginalIndex === -1) return; [cite: 296]

    [cite_start]saveStateToHistory(); [cite: 297]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 297]

    [cite_start]clientes[clienteOriginalIndex].avisado = false; [cite: 297]
    [cite_start]clientes[clienteOriginalIndex].oculto = false; [cite: 298]
    [cite_start]clientes[clienteOriginalIndex].clicado = false; [cite: 299]
    [cite_start]saveClientsToLocalStorage(); [cite: 300]
    [cite_start]chamarFiltroAtual(); [cite: 300]
    [cite_start]exibirClientesAvisados(); [cite: 301]
    [cite_start]atualizarUltimaAtualizacao("desmarcado avisado", clientes[clienteOriginalIndex].nome); [cite: 301]

    try {
        [cite_start]await salvarClientes(); [cite: 302]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 303]
        [cite_start]saveClientsToLocalStorage(); [cite: 303]
        [cite_start]chamarFiltroAtual(); [cite: 304]
        [cite_start]exibirClientesAvisados(); [cite: 304]
        exibirAlerta(`Erro ao desmarcar cliente como avisado: ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha ao desmarcar avisado", clientes[clienteOriginalIndex].nome); [cite: 305]
    }
}

[cite_start]function duplicarClienteById(clientId) { [cite: 306]
    [cite_start]const index = clientes.findIndex(c => c.id === clientId); [cite: 306]
    if (index !== -1) {
        [cite_start]const originalClientesExibidos = clientesExibidos; [cite: 307]
        [cite_start]clientesExibidos = [clientes[index]]; [cite: 307]
        [cite_start]duplicarCliente(0); [cite: 307]
        [cite_start]clientesExibidos = originalClientesExibidos; [cite: 307]
    }
}

[cite_start]function enviarMensagemWhatsAppDolaById(clientId) { [cite: 308]
    [cite_start]const index = clientes.findIndex(c => c.id === clientId); [cite: 308]
    if (index !== -1) {
        [cite_start]const originalClientesExibidos = clientesExibidos; [cite: 309]
        [cite_start]clientesExibidos = [clientes[index]]; [cite: 309]
        [cite_start]enviarMensagemWhatsAppDola(0); [cite: 309]
        [cite_start]clientesExibidos = originalClientesExibidos; [cite: 309]
    }
}

[cite_start]function renovarAutomatiscoById(clientId) { [cite: 310]
    [cite_start]const index = clientes.findIndex(c => c.id === clientId); [cite: 310]
    if (index !== -1) {
        [cite_start]const originalClientesExibidos = clientesExibidos; [cite: 311]
        [cite_start]clientesExibidos = [clientes[index]]; [cite: 311]
        [cite_start]renovarAutomatico(0); [cite: 311]
        [cite_start]clientesExibidos = originalClientesExibidos; [cite: 311]
    }
}

[cite_start]function pedirConfirmacaoRenovacaoDebitoById(clientId) { [cite: 312]
    [cite_start]const index = clientes.findIndex(c => c.id === clientId); [cite: 312]
    if (index !== -1) {
        [cite_start]const originalClientesExibidos = clientesExibidos; [cite: 313]
        [cite_start]clientesExibidos = [clientes[index]]; [cite: 313]
        [cite_start]pedirConfirmacaoRenovacaoDebito(0); [cite: 313]
        [cite_start]clientesExibidos = originalClientesExibidos; [cite: 313]
    }
}

[cite_start]function pedirConfirmacaoRenovarHojeById(clientId) { [cite: 314]
    [cite_start]clienteIdParaRenovarHoje = clientId; [cite: 314]
    exibirConfirmacaoGenerica(
        "Confirmar Renovação HOJE",
        "Tem certeza que deseja renovar a data de vencimento deste cliente para **HOJE**?",
        [cite_start]confirmarRenovarHoje, [cite: 315]
        false
    [cite_start]); [cite: 315]
}

[cite_start]async function renovarAutomatico(index) { [cite: 316]
    [cite_start]const cliente = clientesExibidos[index]; [cite: 316]
    const produtoCliente = cliente.Produto || [cite_start]"Não informado"; [cite: 316]

    if (produtoCliente === "Não informado") {
        [cite_start]exibirAlerta("O produto do cliente não está informado! Por favor, edite o cliente e defina o produto antes de renovar."); [cite: 317]
        return;
    }

    [cite_start]saveStateToHistory(); [cite: 318]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 318]
    [cite_start]const clienteOriginalIndex = clientes.findIndex(c => c.id === cliente.id); [cite: 319]

    [cite_start]if (clienteOriginalIndex !== -1) { [cite: 319]
        [cite_start]renovarProximoMes(clientes[clienteOriginalIndex]); [cite: 320]
        [cite_start]clientes[clienteOriginalIndex].debito = false; [cite: 320]
        clientes[clienteOriginalIndex].oculto = false; 
        [cite_start]clientes[clienteOriginalIndex].avisado = false; [cite: 321]
        [cite_start]clientes[clienteOriginalIndex].verDepois = false; [cite: 322]
        [cite_start]clientes[clienteOriginalIndex].desativado = false; [cite: 322]
        clientes[clienteOriginalIndex].dola_sent = false; 
        [cite_start]clientes[clienteOriginalIndex].clicado = false; [cite: 323]
    }
    [cite_start]saveClientsToLocalStorage(); [cite: 324]

    [cite_start]chamarFiltroAtual(); [cite: 325]
    [cite_start]exibirClientesAvisados(); [cite: 325]
    [cite_start]atualizarUltimaAtualizacao("renovado automaticamente", cliente.nome); [cite: 325]

    try {
        [cite_start]await salvarClientes(); [cite: 326]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 327]
        [cite_start]saveClientsToLocalStorage(); [cite: 327]
        [cite_start]chamarFiltroAtual(); [cite: 328]
        [cite_start]exibirClientesAvisados(); [cite: 328]
        exibirAlerta(`Erro ao renovar automaticamente: ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha na renovação automática", cliente.nome); [cite: 329]
    }
}

[cite_start]function pedirConfirmacaoRenovarHoje(index) { [cite: 330]
    [cite_start]const cliente = clientesExibidos[index]; [cite: 330]
    [cite_start]clienteIdParaRenovarHoje = cliente.id; [cite: 330]
    exibirConfirmacaoGenerica(
        "Confirmar Renovação HOJE",
        [cite_start]`Tem certeza que deseja renovar a data de vencimento de **${cliente.nome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, '')}** para **HOJE**?`, [cite: 331]
        confirmarRenovarHoje,
        false
    [cite_start]); [cite: 331]
}

[cite_start]async function confirmarRenovarHoje() { [cite: 332]
    [cite_start]if (clienteIdParaRenovarHoje === null) return; [cite: 332]
    [cite_start]saveStateToHistory(); [cite: 333]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 333]
    const clienteOriginalIndex = clientes.findIndex(c => c.id === clienteIdParaRenovarHoje);
    [cite_start]const clienteOriginalNome = clientes[clienteOriginalIndex].nome; [cite: 334]

    if (clienteOriginalIndex !== -1) {
        [cite_start]const hoje = new Date(); [cite: 335]
        const hojeFormatada = hoje.getDate().toString().padStart(2, '0') + "/" +
            (hoje.getMonth() + 1).toString().padStart(2, '0') + "/" +
            [cite_start]hoje.getFullYear(); [cite: 336]
        [cite_start]clientes[clienteOriginalIndex].data = hojeFormatada; [cite: 336]
        [cite_start]clientes[clienteOriginalIndex].debito = false; [cite: 336]
        clientes[clienteOriginalIndex].oculto = false; 
        [cite_start]clientes[clienteOriginalIndex].avisado = false; [cite: 337]
        [cite_start]clientes[clienteOriginalIndex].verDepois = false; [cite: 338]
        [cite_start]clientes[clienteOriginalIndex].desativado = false; [cite: 338]
        clientes[clienteOriginalIndex].dola_sent = false; 
        [cite_start]clientes[clienteOriginalIndex].clicado = false; [cite: 339]
    }
    [cite_start]saveClientsToLocalStorage(); [cite: 340]

    [cite_start]chamarFiltroAtual(); [cite: 341]
    [cite_start]exibirClientesAvisados(); [cite: 341]
    [cite_start]atualizarUltimaAtualizacao("renovado a partir da data atual", clienteOriginalNome); [cite: 341]
    [cite_start]exibirAlerta(`Cliente "${clienteOriginalNome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, '')}" renovado para hoje!`); [cite: 342]
    try {
        [cite_start]await salvarClientes(); [cite: 343]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 344]
        [cite_start]saveClientsToLocalStorage(); [cite: 344]
        [cite_start]chamarFiltroAtual(); [cite: 345]
        [cite_start]exibirClientesAvisados(); [cite: 345]
        exibirAlerta(`Erro ao renovar para hoje: ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha na renovação para hoje", clienteOriginalNome); [cite: 346]
    }
    [cite_start]clienteIdParaRenovarHoje = null; [cite: 347]
}

[cite_start]async function confirmarRenovacaoComDebito() { [cite: 348]
    [cite_start]if (clienteIndexParaRenovarDebito === null) return; [cite: 348]
    [cite_start]saveStateToHistory(); [cite: 349]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 349]
    const cliente = clientesExibidos[clienteIndexParaRenovarDebito];
    [cite_start]const clienteOriginalIndex = clientes.findIndex(c => c.id === cliente.id); [cite: 350]
    const produtoCliente = cliente.Produto || [cite_start]"Não informado"; [cite: 350]
    [cite_start]const clienteNome = cliente.nome; [cite: 351]

    if (produtoCliente === "Não informado") {
        [cite_start]exibirAlerta("O produto do cliente não está informado! Por favor, edite o cliente e defina o produto antes de renovar."); [cite: 352]
        [cite_start]fecharModal(); [cite: 352]
        return;
    }

    if (clienteOriginalIndex !== -1) {
        if (clienteOriginalIndex !== -1) {
            [cite_start]renovarProximoMes(clientes[clienteOriginalIndex]); [cite: 353]
            [cite_start]clientes[clienteOriginalIndex].debito = true; [cite: 353]
            clientes[clienteOriginalIndex].oculto = false; 
            [cite_start]clientes[clienteOriginalIndex].avisado = false; [cite: 354]
            [cite_start]clientes[clienteOriginalIndex].verDepois = false; [cite: 355]
            [cite_start]clientes[clienteOriginalIndex].desativado = false; [cite: 355]
            clientes[clienteOriginalIndex].dola_sent = false; 
            [cite_start]clientes[clienteOriginalIndex].clicado = false; [cite: 356]
        }
    }
    [cite_start]saveClientsToLocalStorage(); [cite: 357]
    
    [cite_start]chamarFiltroAtual(); [cite: 358]
    [cite_start]exibirClientesAvisados(); [cite: 358]
    [cite_start]fecharModal(); [cite: 358]
    [cite_start]clienteIndexParaRenovarDebito = null; [cite: 358]
    exibirAlerta("Cliente renovado e marcado como DÉBITO!");
    [cite_start]atualizarUltimaAtualizacao("renovado com débito", clienteNome); [cite: 359]

    try {
        [cite_start]await salvarClientes(); [cite: 360]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 361]
        [cite_start]saveClientsToLocalStorage(); [cite: 361]
        [cite_start]chamarFiltroAtual(); [cite: 362]
        [cite_start]exibirClientesAvisados(); [cite: 362]
        exibirAlerta(`Erro ao renovar com débito: ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha na renovação com débito", clienteNome); [cite: 363]
    }
}

[cite_start]function renovar30(clienteObj) { [cite: 364]
    [cite_start]clienteObj.data = incrementarData(clienteObj.data, 30); [cite: 364]
}

[cite_start]function renovarProximoMes(clienteObj) { [cite: 365]
    [cite_start]const [dia, mes, ano] = clienteObj.data.split("/").map(num => parseInt(num)); [cite: 365]
    [cite_start]const dataObj = new Date(ano, mes - 1, dia); [cite: 365]

    [cite_start]dataObj.setMonth(dataObj.getMonth() + 1); [cite: 366]

    [cite_start]if (dataObj.getDate() !== dia) { [cite: 366]
        [cite_start]dataObj.setDate(0); [cite: 367]
    }

    [cite_start]clienteObj.data = `${dataObj.getDate().toString().padStart(2, '0')}/${(dataObj.getMonth() + 1).toString().padStart(2, '0')}/${dataObj.getFullYear()}`; [cite: 368]
}

[cite_start]function incrementarData(data, dias) { [cite: 369]
    [cite_start]const [dia, mes, ano] = data.split("/").map(num => parseInt(num)); [cite: 369]
    [cite_start]const dataObj = new Date(ano, mes - 1, dia); [cite: 369]
    [cite_start]dataObj.setDate(dataObj.getDate() + dias); [cite: 369]
    [cite_start]return `${dataObj.getDate().toString().padStart(2, '0')}/${(dataObj.getMonth() + 1).toString().padStart(2, '0')}/${dataObj.getFullYear()}`; [cite: 370]
}

[cite_start]function duplicarCliente(index) { [cite: 371]
    [cite_start]clienteIndexParaDuplicar = index; [cite: 371]
    [cite_start]document.getElementById("modalConfirmacao").style.display = "flex"; [cite: 371]
}

[cite_start]async function confirmarDuplicacao() { [cite: 372]
    [cite_start]if (clienteIndexParaDuplicar === null) return; [cite: 372]
    [cite_start]saveStateToHistory(); [cite: 373]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 373]
    [cite_start]const clienteOriginal = clientesExibidos[clienteIndexParaDuplicar]; [cite: 373]

    let novoTelefoneBase = clienteOriginal.telefone;
    let novoId = clienteOriginal.id;
    [cite_start]let contadorDuplicacao = 1; [cite: 374]
    while (clientes.some(c => c.id === novoId)) {
        [cite_start]novoTelefoneBase = clienteOriginal.telefone + '_' + contadorDuplicacao; [cite: 375]
        [cite_start]novoId = novoTelefoneBase.slice(-5); [cite: 375]
        if (novoTelefoneBase.length < 5) { 
            [cite_start]novoId = "DUP" + String(contadorDuplicacao).padStart(3, '0'); [cite: 376]
        } else {
            [cite_start]novoId = novoTelefoneBase.slice(-5); [cite: 377]
        }
        [cite_start]contadorDuplicacao++; [cite: 378]
        [cite_start]if (contadorDuplicacao > 100) { [cite: 378]
            [cite_start]exibirAlerta("Não foi possível gerar um ID único para a duplicação. Tente novamente."); [cite: 379]
            [cite_start]fecharModal(); [cite: 379]
            return;
        }
    }

    const novoCliente = {
        id: novoId,
        data: clienteOriginal.data,
        nome: clienteOriginal.nome + " (Cópia)",
        [cite_start]telefone: novoTelefoneBase, [cite: 380]
        [cite_start]avisado: false, [cite: 380]
        [cite_start]debito: false, [cite: 380]
        Produto: clienteOriginal.Produto || [cite_start]"Não informado", [cite: 381]
        arquivado: false,
        oculto: false,
        verDepois: false,
        desativado: false,
        dola_sent: false, 
        [cite_start]clicado: false [cite: 382]
    };
    [cite_start]clientes.push(novoCliente); [cite: 383]
    saveClientsToLocalStorage(); 

    [cite_start]chamarFiltroAtual(); [cite: 384]
    [cite_start]exibirClientesAvisados(); [cite: 384]
    [cite_start]fecharModal(); [cite: 384]
    [cite_start]clienteIndexParaDuplicar = null; [cite: 384]
    [cite_start]atualizarUltimaAtualizacao("duplicado", clienteOriginal.nome); [cite: 384]

    try {
        [cite_start]await salvarClientes(); [cite: 385]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 386]
        [cite_start]saveClientsToLocalStorage(); [cite: 386]
        [cite_start]chamarFiltroAtual(); [cite: 387]
        [cite_start]exibirClientesAvisados(); [cite: 387]
        exibirAlerta(`Erro ao duplicar cliente: ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha na duplicação", clienteOriginal.nome); [cite: 388]
    }
}

[cite_start]function getNomeMes(mesNumero) { [cite: 389]
    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        [cite_start]"Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro" [cite: 389]
    ];
    [cite_start]return meses[mesNumero - 1]; [cite: 390]
}

[cite_start]async function copiarMensagemWhatsApp(index) { [cite: 391]
    [cite_start]const cliente = clientesExibidos[index]; [cite: 391]
    [cite_start]const nomeExibicaoBase = cliente.nome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, ''); [cite: 391]
    [cite_start]const vencimento = cliente.data; [cite: 391]
    [cite_start]const hoje = new Date(); [cite: 392]

    [cite_start]const [diaVenc, mesVenc, anoVenc] = vencimento.split("/").map(num => parseInt(num)); [cite: 392]
    [cite_start]const dataVencimentoObj = new Date(anoVenc, mesVenc - 1, diaVenc); [cite: 393]

    [cite_start]const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()); [cite: 393]
    [cite_start]const dataVencimentoSemHora = new Date(dataVencimentoObj.getFullYear(), dataVencimentoObj.getMonth(), dataVencimentoObj.getDate()); [cite: 393]

    [cite_start]const vencido = dataVencimentoSemHora < hojeSemHora; [cite: 394]
    [cite_start]const hora = hoje.getHours(); [cite: 394]
    [cite_start]let saudacao = "Olá"; [cite: 394]
    if (hora >= 6 && hora < 12) {
        [cite_start]saudacao = "Bom dia"; [cite: 395]
    } else if (hora >= 12 && hora < 18) {
        [cite_start]saudacao = "Boa tarde"; [cite: 396]
    } else {
        [cite_start]saudacao = "Boa noite"; [cite: 397]
    }

    [cite_start]const nomeMes = getNomeMes(parseInt(mesVenc)); [cite: 397]

    [cite_start]let mensagem; [cite: 398]
    if (vencido) {
        mensagem = `${saudacao}! Lembrete de vencimento *está vencido* *${vencimento} (${nomeMes})*. [cite_start]Lembrando que pagando no dia do vencimento o mensal é de 30 reais,após o dia de vencimento o mensal é de 35 reais.O pagamento via PIX pode ser feito no número: *11950912509* (Waldemar Jose Luiz)`; [cite: 399, 400]
    } else {
        mensagem = `${saudacao}! [cite_start]Hoje é o vencimento do seu plano de TV.*Vencimento*: ${cliente.data} (${nomeMes})O pagamento via PIX pode ser realizado no número: *11950912509* (Waldemar Jose Luiz)`; [cite: 401, 402]
    }

    try {
        [cite_start]const textarea = document.createElement('textarea'); [cite: 403]
        [cite_start]textarea.value = mensagem; [cite: 403]
        [cite_start]document.body.appendChild(textarea); [cite: 403]
        [cite_start]textarea.select(); [cite: 403]
        [cite_start]document.execCommand('copy'); [cite: 403]
        [cite_start]document.body.removeChild(textarea); [cite: 403]
        [cite_start]exibirAlerta("Mensagem copiada para a área de transferência!"); [cite: 404]
    } catch (err) {
        [cite_start]exibirAlerta("Erro ao copiar a mensagem. Por favor, tente novamente."); [cite: 405]
        [cite_start]console.error("Erro ao copiar mensagem: ", err); [cite: 405]
    }
}

[cite_start]async function copiarMensagemWhatsAppById(clientId) { [cite: 406]
    [cite_start]const index = clientes.findIndex(c => c.id === clientId); [cite: 406]
    if (index !== -1) {
        [cite_start]const originalClientesExibidos = clientesExibidos; [cite: 407]
        [cite_start]clientesExibidos = [clientes[index]]; [cite: 407]
        [cite_start]await copiarMensagemWhatsApp(0); [cite: 407]
        [cite_start]clientesExibidos = originalClientesExibidos; [cite: 407]
    }
}

[cite_start]async function enviarMensagemWhatsAppDola(index) { [cite: 408]
    [cite_start]const cliente = clientesExibidos[index]; [cite: 408]
    [cite_start]const nomeExibicaoBase = cliente.nome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, ''); [cite: 408]
    [cite_start]const vencimento = cliente.data; [cite: 409]
    
    [cite_start]let telefoneParaWhatsApp = cliente.telefone.replace(/\D/g, ''); [cite: 410]
    if (!telefoneParaWhatsApp) {
        [cite_start]exibirAlerta("Número de telefone inválido!"); [cite: 411]
        return;
    }
    if (!telefoneParaWhatsApp.startsWith('55')) {
        [cite_start]telefoneParaWhatsApp = '55' + telefoneParaWhatsApp; [cite: 412]
    }

    [cite_start]const [diaVenc] = vencimento.split('/'); [cite: 413]
    [cite_start]const mensagemDolaLembrete = `oi me lembre todo dia ${diaVenc} de cada mês de pagar Tv para Luiz no pix 11947406124 no nome de Waldemar jose luiz.`; [cite: 414]
    [cite_start]const urlDola = `https://wa.me/16502234435?text=${encodeURIComponent(mensagemDolaLembrete)}`; [cite: 414]
    [cite_start]const nomeMes = getNomeMes(parseInt(vencimento.split('/')[1])); [cite: 414]

    const mensagemCliente = `Olá! Lembrete de vencimento do seu plano de TV.
📅 Vencimento: ${vencimento} (${nomeMes}).
💳 Pix: 11947406124 (Waldemar José Luiz).
🔔 Para ser lembrado automaticamente todo mês, clique em "Conversar" no link abaixo, ative o lembrete com o Dola e depois confirme aqui comigo se deu certo:

${urlDola}

[cite_start]❓ Qualquer dúvida, entre em contato.`; [cite: 415, 416, 417]

    [cite_start]const urlFinal = `https://wa.me/${telefoneParaWhatsApp}?text=${encodeURIComponent(mensagemCliente)}`; [cite: 417]
    [cite_start]window.open(urlFinal, '_blank'); [cite: 417]

    [cite_start]saveStateToHistory(); [cite: 418]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 418]

    [cite_start]let clienteOriginal = clientes.find(c => c.id === cliente.id); [cite: 419]
    if (clienteOriginal) {
        [cite_start]clienteOriginal.oculto = false; [cite: 420]
        [cite_start]clienteOriginal.dola_sent = true; [cite: 421]
        [cite_start]clienteOriginal.clicado = true; [cite: 422]
    }
    [cite_start]saveClientsToLocalStorage(); [cite: 423]

    [cite_start]chamarFiltroAtual(); [cite: 424]
    [cite_start]exibirClientesAvisados(); [cite: 424]
    [cite_start]atualizarUltimaAtualizacao("mensagem Dola enviada", cliente.nome); [cite: 424]
    [cite_start]prepararClientesVencidosParaMensagem(); [cite: 424]

    try {
        [cite_start]await salvarClientes(); [cite: 425]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 426]
        [cite_start]saveClientsToLocalStorage(); [cite: 426]
        [cite_start]chamarFiltroAtual(); [cite: 426]
        [cite_start]exibirClientesAvisados(); [cite: 426]
        exibirAlerta(`Erro ao enviar mensagem WhatsApp: ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha no envio de mensagem Dola", cliente.nome); [cite: 427]
    }
}


[cite_start]async function enviarMensagemWhatsApp(clienteNome, clienteTelefone, index) { [cite: 428]
    [cite_start]let telefoneParaWhatsApp = clienteTelefone.replace(/\D/g, ''); [cite: 428]
    if (!telefoneParaWhatsApp) {
        [cite_start]exibirAlerta("Número de telefone inválido!"); [cite: 429]
        return;
    }

    if (!telefoneParaWhatsApp.startsWith('55')) {
        [cite_start]telefoneParaWhatsApp = '55' + telefoneParaWhatsApp; [cite: 430]
    }

    [cite_start]const cliente = clientesExibidos[index]; [cite: 430]
    [cite_start]const vencimento = cliente.data; [cite: 431]
    [cite_start]const hoje = new Date(); [cite: 431]

    [cite_start]const [diaVenc, mesVenc, anoVenc] = vencimento.split("/").map(num => parseInt(num)); [cite: 432]
    [cite_start]const dataVencimentoObj = new Date(anoVenc, mesVenc - 1, diaVenc); [cite: 432]

    [cite_start]const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()); [cite: 433]
    [cite_start]const dataVencimentoSemHora = new Date(dataVencimentoObj.getFullYear(), dataVencimentoObj.getMonth(), dataVencimentoObj.getDate()); [cite: 433]

    [cite_start]const vencido = dataVencimentoSemHora < hojeSemHora; [cite: 433]

    [cite_start]const hora = hoje.getHours(); [cite: 434]
    [cite_start]let saudacao = "Olá"; [cite: 434]
    if (hora >= 6 && hora < 12) {
        [cite_start]saudacao = "Bom dia"; [cite: 435]
    } else if (hora >= 12 && hora < 18) {
        [cite_start]saudacao = "Boa tarde"; [cite: 436]
    } else {
        [cite_start]saudacao = "Boa noite"; [cite: 437]
    }

    [cite_start]const nomeParaMensagem = clienteNome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, ''); [cite: 438]
    [cite_start]const nomeMes = getNomeMes(parseInt(mesVenc)); [cite: 438]

    [cite_start]let mensagem; [cite: 438]
    if (vencido) {
        mensagem = `${saudacao}! Seu plano de TV *está vencido* *${vencimento} (${nomeMes})*. [cite_start]Lembrando que pagando no dia do vencimento o mensal é de 30 reais,após o dia de vencimento o mensal é de 35 reais.O pagamento via PIX pode ser feito no número: *11950912509* (Waldemar Jose Luiz)`; [cite: 439, 440]
    } else {
        mensagem = `${saudacao}! [cite_start]Hoje é o vencimento do seu plano de TV.*Vencimento*: ${cliente.data} (${nomeMes})O pagamento via PIX pode ser realizado no número: *11950912509* (Waldemar Jose Luiz)`; [cite: 441, 442]
    }

    [cite_start]const url = `https://wa.me/${telefoneParaWhatsApp}?text=${encodeURIComponent(mensagem)}`; [cite: 442]
    [cite_start]const link = document.createElement("a"); [cite: 443]
    [cite_start]link.href = url; [cite: 443]
    [cite_start]link.target = "_blank"; [cite: 443]
    [cite_start]link.style.display = 'none'; [cite: 443]
    [cite_start]document.body.appendChild(link); [cite: 443]
    [cite_start]link.click(); [cite: 444]
    [cite_start]setTimeout(() => { [cite: 444]
        if (link.parentNode) {
            link.parentNode.removeChild(link);
        }
    [cite_start]}, 100); [cite: 445]

    [cite_start]saveStateToHistory(); [cite: 446]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 447]

    [cite_start]let clienteOriginal = clientes.find(c => c.id === cliente.id); [cite: 447]
    if (clienteOriginal) {
        [cite_start]clienteOriginal.avisado = true; [cite: 448]
        [cite_start]clienteOriginal.oculto = false; [cite: 449]
        [cite_start]clienteOriginal.clicado = true; [cite: 450]
    }
    [cite_start]saveClientsToLocalStorage(); [cite: 451]

    [cite_start]chamarFiltroAtual(); [cite: 452]
    [cite_start]exibirClientesAvisados(); [cite: 452]
    [cite_start]atualizarUltimaAtualizacao("mensagem WhatsApp enviada", cliente.nome); [cite: 452]
    [cite_start]prepararClientesVencidosParaMensagem(); [cite: 453]

    try {
        [cite_start]await salvarClientes(); [cite: 454]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 455]
        [cite_start]saveClientsToLocalStorage(); [cite: 455]
        [cite_start]chamarFiltroAtual(); [cite: 456]
        [cite_start]exibirClientesAvisados(); [cite: 456]
        exibirAlerta(`Erro ao enviar mensagem WhatsApp: ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha no envio de mensagem", cliente.nome); [cite: 457]
    }
}

[cite_start]function exportarClientes() { [cite: 458]
    [cite_start]const clientesParaExportar = clientes.map(c => ({ [cite: 458]
        id: c.id,
        data: c.data,
        nome: c.nome,
        telefone: c.telefone,
        [cite_start]avisado: c.avisado || false, [cite: 459]
        [cite_start]debito: c.debito || false, [cite: 459]
        Produto: c.Produto || "Não informado",
        arquivado: c.arquivado || false,
        oculto: c.oculto || false,
        [cite_start]verDepois: c.verDepois || false, [cite: 460]
        [cite_start]desativado: c.desativado || false, [cite: 460]
        dola_sent: c.dola_sent || false, 
        clicado: c.clicado || false 
    [cite_start]})); [cite: 461]

    [cite_start]const clientesJson = JSON.stringify(clientesParaExportar, null, 4); [cite: 461]
    const blob = new Blob([clientesJson], {
        type: "application/json"
    [cite_start]}); [cite: 461]
    [cite_start]const link = document.createElement("a"); [cite: 462]
    [cite_start]link.href = URL.createObjectURL(blob); [cite: 462]
    [cite_start]link.download = "clientes.json"; [cite: 463]
    [cite_start]link.click(); [cite: 463]
    [cite_start]atualizarUltimaAtualizacao("clientes exportados"); [cite: 463]
}

[cite_start]async function importarClientes(file = null) { [cite: 464]
    [cite_start]let fileToImport = file; [cite: 464]

    [cite_start]if (!fileToImport) { [cite: 464]
        [cite_start]const input = document.createElement('input'); [cite: 465]
        [cite_start]input.type = 'file'; [cite: 465]
        [cite_start]input.accept = '.json'; [cite: 465]
        [cite_start]input.click(); [cite: 465]

        [cite_start]fileToImport = await new Promise(resolve => { [cite: 465]
            input.onchange = (e) => resolve(e.target.files[0]);
        [cite_start]}); [cite: 466]

        [cite_start]if (!fileToImport) { [cite: 466]
            [cite_start]return; [cite: 467]
        }
    }

    [cite_start]mostrarCarregando(); [cite: 468] 
    [cite_start]const reader = new FileReader(); [cite: 469]
    [cite_start]reader.onload = async () => { [cite: 469]
        try {
            [cite_start]saveStateToHistory(); [cite: 470]
            [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 470]

            [cite_start]const clientesImportadosRaw = JSON.parse(reader.result); [cite: 471]
            [cite_start]const clientesProcessados = clientesImportadosRaw.map(c => { [cite: 471]
                const telefoneLimpo = c.telefone ? String(c.telefone).replace(/[^\d]/g, '') : '';
                const id = telefoneLimpo.length >= 5 ? telefoneLimpo.slice(-5) : null;

                [cite_start]const nomeAjustado = c.Produto && !c.nome.includes(`(${c.Produto})`) ? [cite: 472]
                    `${c.nome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, '')} (${c.Produto})` :
                    [cite_start]c.nome; [cite: 473]

                return {
                    [cite_start]id: id, [cite: 473]
                    data: c.data,
                    nome: nomeAjustado,
                    [cite_start]telefone: telefoneLimpo, [cite: 474]
                    avisado: c.avisado || false,
                    debito: c.debito || false,
                    Produto: c.Produto || [cite_start]"Não informado", [cite: 475]
                    [cite_start]arquivado: c.arquivado || false, [cite: 475]
                    [cite_start]oculto: c.oculto || false, [cite: 476]
                    [cite_start]verDepois: c.verDepois || false, [cite: 477]
                    [cite_start]desativado: c.desativado || false, [cite: 478]
                    [cite_start]dola_sent: c.dola_sent || false, [cite: 479]
                    [cite_start]clicado: c.clicado || false [cite: 480]
                };
            [cite_start]}); [cite: 481]

            [cite_start]let novosClientesAdicionados = 0; [cite: 482]
            [cite_start]let clientesAtualizados = 0; [cite: 482]
            [cite_start]let clientesIgnorados = 0; [cite: 482]

            [cite_start]for (let i = 0; i < clientesProcessados.length; i++) { [cite: 482]
                [cite_start]const clienteImportado = clientesProcessados[i]; [cite: 483]

                [cite_start]if (!clienteImportado.id) { [cite: 483]
                    [cite_start]console.warn(`Cliente ignorado na importação por não ter um ID válido (telefone curto):`, clienteImportado); [cite: 484]
                    [cite_start]clientesIgnorados++; [cite: 484]
                    continue;
                }

                [cite_start]const indexClienteExistente = clientes.findIndex(c => c.id === clienteImportado.id); [cite: 485]

                [cite_start]if (indexClienteExistente !== -1) { [cite: 485]
                    [cite_start]const clienteExistente = clientes[indexClienteExistente]; [cite: 486]
                    const nomeExistenteBase = clienteExistente.nome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, '');
                    [cite_start]const nomeImportadoBase = clienteImportado.nome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, ''); [cite: 487]

                    [cite_start]if (nomeExistenteBase.toLowerCase() !== nomeImportadoBase.toLowerCase()) { [cite: 487]
                        [cite_start]const acao = await perguntarConflitoIdNome(clienteExistente, clienteImportado); [cite: 488]

                        [cite_start]if (acao === 'usarImportado') { [cite: 488]
                            [cite_start]clientes[indexClienteExistente] = clienteImportado; [cite: 489]
                            [cite_start]clientesAtualizados++; [cite: 489]
                        [cite_start]} else if (acao === 'manterExistente') { [cite: 489]
                            [cite_start]clientesIgnorados++; [cite: 490]
                        [cite_start]} else if (acao === 'manterAmbos') { [cite: 490]
                            [cite_start]let newId = clienteImportado.id; [cite: 491]
                            [cite_start]let counter = 1; [cite: 491]
                            [cite_start]let originalTelefone = clienteImportado.telefone; [cite: 491]
                            [cite_start]while (clientes.some(c => c.id === newId)) { [cite: 491]
                                [cite_start]const tempTelefone = originalTelefone + '-' + counter; [cite: 492]
                                [cite_start]newId = tempTelefone.slice(-5); [cite: 492]
                                [cite_start]counter++; [cite: 492]
                                [cite_start]if (counter > 1000) { [cite: 493]
                                    [cite_start]console.error("Could not generate a unique ID for 'Manter Ambos' option."); [cite: 493]
                                    break;
                                }
                            }
                            const newClientForBoth = { ...clienteImportado,
                                [cite_start]id: newId, [cite: 494]
                                [cite_start]telefone: originalTelefone + '-' + (counter - 1) [cite: 495]
                            };
                            [cite_start]clientes.push(newClientForBoth); [cite: 495]
                            [cite_start]novosClientesAdicionados++; [cite: 495]
                        }
                    } else {
                        [cite_start]const [diaExistente, mesExistente, anoExistente] = clienteExistente.data.split("/").map(Number); [cite: 497]
                        [cite_start]const dataObjExistente = new Date(anoExistente, mesExistente - 1, diaExistente); [cite: 498]
                        [cite_start]const [diaImportado, mesImportado, anoImportado] = clienteImportado.data.split("/").map(Number); [cite: 498]
                        [cite_start]const dataObjImportado = new Date(anoImportado, mesImportado - 1, diaImportado); [cite: 499]

                        [cite_start]if (dataObjImportado > dataObjExistente) { [cite: 499]
                            [cite_start]clientes[indexClienteExistente] = clienteImportado; [cite: 500]
                            [cite_start]clientesAtualizados++; [cite: 500]
                        } else {
                            [cite_start]clientes[indexClienteExistente].nome = clienteImportado.nome; [cite: 501]
                            [cite_start]clientes[indexClienteExistente].telefone = clienteImportado.telefone; [cite: 501]
                            clientes[indexClienteExistente].Produto = clienteImportado.Produto;
                            clientes[indexClienteExistente].avisado = clienteImportado.avisado;
                            clientes[indexClienteExistente].debito = clienteImportado.debito;
                            clientes[indexClienteExistente].arquivado = clienteImportado.arquivado;
                            [cite_start]clientes[indexClienteExistente].oculto = clienteImportado.oculto; [cite: 502]
                            clientes[indexClienteExistente].verDepois = clienteImportado.verDepois;
                            clientes[indexClienteExistente].desativado = clienteImportado.desativado;
                            [cite_start]clientes[indexClienteExistente].dola_sent = clienteImportado.dola_sent; [cite: 503]
                            [cite_start]clientes[indexClienteExistente].clicado = clienteImportado.clicado; [cite: 504]
                            [cite_start]clientesAtualizados++; [cite: 505]
                        }
                    }
                } else {
                    [cite_start]clientes.push(clienteImportado); [cite: 506]
                    [cite_start]novosClientesAdicionados++; [cite: 506]
                }
            }
            [cite_start]saveClientsToLocalStorage(); [cite: 507]

            [cite_start]chamarFiltroAtual(); [cite: 508]
            [cite_start]exibirClientesAvisados(); [cite: 508]
            prepararClientesVencidosParaMensagem(); 
            [cite_start]exibirAlerta(`Importação concluída: ${novosClientesAdicionados} novos clientes adicionados, ${clientesAtualizados} clientes atualizados, ${clientesIgnorados} ignorados.`); [cite: 509]
            [cite_start]atualizarUltimaAtualizacao("clientes importados/atualizados por ID"); [cite: 509]

            try {
                [cite_start]await salvarClientes(); [cite: 510]
            } catch (error) {
                [cite_start]clientes = estadoAnteriorClientes; [cite: 511]
                [cite_start]saveClientsToLocalStorage(); [cite: 511]
                [cite_start]chamarFiltroAtual(); [cite: 512]
                [cite_start]exibirClientesAvisados(); [cite: 512]
                exibirAlerta(`Erro ao sincronizar importação: ${error.message}. As mudanças locais podem não ter sido salvas no Sheets.`);
                [cite_start]atualizarUltimaAtualizacao("falha na importação", ""); [cite: 513]
            }

        } catch (error) {
            [cite_start]exibirAlerta("Erro ao importar JSON. Verifique o arquivo ou formato."); [cite: 514]
            [cite_start]console.error("Erro ao importar:", error); [cite: 514]
        } finally {
            [cite_start]esconderCarregando(); [cite: 515] 
        }
    };
    [cite_start]reader.readAsText(fileToImport); [cite: 516]
}

[cite_start]function perguntarConflitoIdNome(clienteExistente, clienteImportado) { [cite: 516]
    return new Promise((resolve, reject) => {
        [cite_start]document.getElementById('conflitoId').textContent = clienteExistente.id; [cite: 517]
        [cite_start]document.getElementById('conflitoNomeExistente').textContent = clienteExistente.nome; [cite: 517]
        [cite_start]document.getElementById('conflitoNomeImportado').textContent = clienteImportado.nome; [cite: 517]

        [cite_start]document.getElementById('modalConflitoIdNome').style.display = 'flex'; [cite: 517]

        [cite_start]document.getElementById('btnConflitoManterExistente').onclick = () => { [cite: 517]
            fecharModal();
            resolve('manterExistente');
        };
        [cite_start]document.getElementById('btnConflitoUsarImportado').onclick = () => { [cite: 518]
             fecharModal();
            resolve('usarImportado');
        };
        [cite_start]document.getElementById('btnConflitoManterAmbos').onclick = () => { [cite: 519]
            fecharModal();
            [cite_start]resolve('manterAmbos'); [cite: 519]
        };
        [cite_start]window.cancelarConflitoIdNome = () => { [cite: 519]
            [cite_start]fecharModal(); [cite: 520]
            [cite_start]resolve('cancelar'); [cite: 520]
        };
    });
}

[cite_start]function filtrarHoje() { [cite: 521]
    [cite_start]const hoje = new Date(); [cite: 521]
    const hojeFormatada = hoje.getDate().toString().padStart(2, '0') + "/" +
        (hoje.getMonth() + 1).toString().padStart(2, '0') + "/" +
        [cite_start]hoje.getFullYear(); [cite: 522]

    [cite_start]clientesFiltrados = clientes.filter(cliente => cliente.data === hojeFormatada && !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado && !cliente.avisado); [cite: 522, 523]
    [cite_start]filtroAtual = "hoje"; [cite: 524]
    [cite_start]document.getElementById("searchInput").value = ""; [cite: 524]
    [cite_start]exibirTabela(); [cite: 524]
    [cite_start]atualizarContadores(); [cite: 524]
}

[cite_start]function filtrarAmanha() { [cite: 525]
    [cite_start]const amanha = new Date(); [cite: 525]
    [cite_start]amanha.setDate(amanha.getDate() + 1); [cite: 525]
    const amanhaFormatada = amanha.getDate().toString().padStart(2, '0') + "/" +
        (amanha.getMonth() + 1).toString().padStart(2, '0') + "/" +
        [cite_start]amanha.getFullYear(); [cite: 526]

    [cite_start]clientesFiltrados = clientes.filter(cliente => cliente.data === amanhaFormatada && !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado); [cite: 526, 527]
    [cite_start]filtroAtual = "amanha"; [cite: 528]
    [cite_start]document.getElementById("searchInput").value = ""; [cite: 528]
    [cite_start]exibirTabela(); [cite: 528]
    [cite_start]atualizarContadores(); [cite: 528]
}

[cite_start]function filtrarVencidos() { [cite: 529]
    [cite_start]const hoje = new Date(); [cite: 529]
    [cite_start]clientesFiltrados = clientes.filter(cliente => { [cite: 529]
        const [dia, mes, ano] = cliente.data.split("/").map(num => parseInt(num));
        const dataCliente = new Date(ano, mes - 1, dia);
        const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

        [cite_start]return dataCliente < hojeSemHora && !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado && !cliente.avisado; [cite: 530]
    });
    [cite_start]filtroAtual = "vencidos"; [cite: 531, 532]
    [cite_start]document.getElementById("searchInput").value = ""; [cite: 532]
    [cite_start]exibirTabela(); [cite: 532]
    [cite_start]atualizarContadores(); [cite: 532]
}

[cite_start]function filtrarDebito() { [cite: 533]
    [cite_start]clientesFiltrados = clientes.filter(cliente => cliente.debito && !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado); [cite: 533]
    [cite_start]filtroAtual = "debito"; [cite: 534]
    [cite_start]document.getElementById("searchInput").value = ""; [cite: 534]
    [cite_start]exibirTabela(); [cite: 534]
    [cite_start]atualizarContadores(); [cite: 534]
}

[cite_start]function chamarFiltroAtual() { [cite: 535]
    switch(filtroAtual) {
        case "hojeEVencidos":
            [cite_start]filtrarHojeEVencidos(); [cite: 535]
            break;
        case "hoje":
            [cite_start]filtrarHoje(); [cite: 536]
            break;
        case "amanha":
            [cite_start]filtrarAmanha(); [cite: 537]
            break;
        case "vencidos":
            [cite_start]filtrarVencidos(); [cite: 538]
            break;
        case "debito":
            [cite_start]filtrarDebito(); [cite: 539]
            break;
        case "verDepois":
            [cite_start]filtrarVerDepois(); [cite: 540]
            break;
        case "arquivados":
            [cite_start]filtrarArquivados(); [cite: 541]
            break;
        case "desativados":
            [cite_start]filtrarDesativados(); [cite: 542]
            break;
        case "todos":
            [cite_start]exibirTodos(); [cite: 543]
            break;
        default:
            if (filtroAtual.startsWith("produto:")) {
                [cite_start]const produto = filtroAtual.split(":")[1]; [cite: 544]
                [cite_start]filtrarPorProduto(produto); [cite: 544]
            } else {
                [cite_start]filtrarHojeEVencidos(); [cite: 545]
            }
            [cite_start]break; [cite: 546]
    }
}

[cite_start]function exibirTodos() { [cite: 547]
    [cite_start]clientesFiltrados = []; [cite: 547]
    [cite_start]filtroAtual = "todos"; [cite: 548]
    [cite_start]document.getElementById("searchInput").value = ""; [cite: 548]
    [cite_start]exibirTabela(); [cite: 548]
    [cite_start]exibirClientesAvisados(); [cite: 548]
    [cite_start]atualizarContadores(); [cite: 548]
}

[cite_start]function confirmarLimparTodos() { [cite: 549]
    exibirConfirmacaoGenerica(
        "Limpar Todos os Clientes",
        "Tem certeza que deseja limpar **TODOS** os clientes? Essa ação não pode ser desfeita e os dados serão perdidos permanentemente!",
        limparTodos,
        [cite_start]true [cite: 549, 550]
    );
}

[cite_start]function confirmarDesfazer() { [cite: 551]
    [cite_start]if (historicoClientes.length <= 1) { [cite: 551]
        [cite_start]exibirAlerta("Não há ações para desfazer."); [cite: 551]
        return;
    }

    [cite_start]const estadoPrevistoAposDesfazer = historicoClientes.length > 1 ? [cite: 552]
        [cite_start]JSON.parse(JSON.stringify(historicoClientes[historicoClientes.length - 2])) : []; [cite: 552]

    if (estadoPrevistoAposDesfazer.length === 0) {
        exibirConfirmacaoGenerica(
            "Desfazer Última Ação (CUIDADO!)",
            [cite_start]"Atenção: A próxima ação de desfazer irá **LIMPAR TODA A SUA LISTA DE CLIENTES**! Tem certeza que deseja continuar?", [cite: 553]
            desfazer,
            [cite_start]true [cite: 554]
        );
    } else {
        exibirConfirmacaoGenerica(
            "Desfazer Última Ação",
            [cite_start]"Tem certeza que deseja desfazer a última alteração? Isso irá reverter a lista de clientes para o estado anterior.", [cite: 555]
            desfazer,
            [cite_start]false [cite: 556]
        );
    }
}

[cite_start]function confirmarRefazer() { [cite: 557]
    [cite_start]if (redoHistory.length === 0) { [cite: 557]
        [cite_start]exibirAlerta("Não há ações para refazer."); [cite: 557]
        return;
    }
    exibirConfirmacaoGenerica(
        "Refazer Última Ação",
        "Tem certeza que deseja refazer a última ação desfeita?",
        refazer,
        [cite_start]false [cite: 558]
    );
}

[cite_start]async function limparTodos() { [cite: 559]
    [cite_start]saveStateToHistory(); [cite: 559]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 559]

    [cite_start]clientes = []; [cite: 559]
    [cite_start]saveClientsToLocalStorage(); [cite: 560]

    [cite_start]chamarFiltroAtual(); [cite: 561]
    [cite_start]exibirClientesAvisados(); [cite: 561]
    [cite_start]exibirAlerta("Todos os clientes foram limpos localmente!"); [cite: 561]
    [cite_start]atualizarUltimaAtualizacao("lista limpa (localmente)", ""); [cite: 562]
    [cite_start]prepararClientesVencidosParaMensagem(); [cite: 562]

    try {
        [cite_start]await salvarClientes(); [cite: 563]
    } catch (e) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 564]
        [cite_start]saveClientsToLocalStorage(); [cite: 564]
        [cite_start]chamarFiltroAtual(); [cite: 565]
        [cite_start]exibirClientesAvisados(); [cite: 565]
        exibirAlerta(`Erro ao limpar clientes no Google Sheets: ${e.message}. Ação desfeita localmente.`);
        [cite_start]atualizarUltimaAtualizacao("falha ao limpar lista", ""); [cite: 566]
    }
}

[cite_start]async function desfazer() { [cite: 567]
    [cite_start]if (historicoClientes.length <= 1) { [cite: 567]
        [cite_start]exibirAlerta("Não há ações para desfazer."); [cite: 567]
        return;
    }

    [cite_start]const estadoParaRefazer = JSON.parse(JSON.stringify(clientes)); [cite: 567]
    [cite_start]redoHistory.push(estadoParaRefazer); [cite: 567]

    [cite_start]historicoClientes.pop(); [cite: 568]
    [cite_start]clientes = JSON.parse(JSON.stringify(historicoClientes[historicoClientes.length - 1])); [cite: 569]
    [cite_start]saveClientsToLocalStorage(); [cite: 570]

    [cite_start]chamarFiltroAtual(); [cite: 571]
    [cite_start]prepararClientesVencidosParaMensagem(); [cite: 571]
    [cite_start]exibirAlerta("Última ação desfeita!"); [cite: 572]
    [cite_start]atualizarUltimaAtualizacao("ação desfeita"); [cite: 572]

    try {
        [cite_start]await salvarClientes(); [cite: 573]
    } catch (error) {
        [cite_start]exibirAlerta(`Erro ao sincronizar 'desfazer' com o Sheets: ${error.message}. O estado no Sheets pode estar diferente do local.`); [cite: 574, 575]
    }
}

[cite_start]async function refazer() { [cite: 576]
    [cite_start]if (redoHistory.length === 0) { [cite: 576]
        [cite_start]exibirAlerta("Não há ações para refazer."); [cite: 576]
        return;
    }

    [cite_start]const estadoParaDesfazer = JSON.parse(JSON.stringify(clientes)); [cite: 577]
    [cite_start]historicoClientes.push(estadoParaDesfazer); [cite: 577]
    [cite_start]clientes = redoHistory.pop(); [cite: 578]
    [cite_start]saveClientsToLocalStorage(); [cite: 579]
    [cite_start]chamarFiltroAtual(); [cite: 580]
    [cite_start]prepararClientesVencidosParaMensagem(); [cite: 580]
    [cite_start]exibirAlerta("Última ação refeita!"); [cite: 581]
    [cite_start]atualizarUltimaAtualizacao("ação refeita"); [cite: 581]

    try {
        [cite_start]await salvarClientes(); [cite: 582]
    } catch (error) {
        [cite_start]exibirAlerta(`Erro ao sincronizar 'refazer' com o Sheets: ${error.message}. O estado no Sheets pode estar diferente do local.`); [cite: 583, 584]
    }
}

[cite_start]function editar(index) { [cite: 585]
    [cite_start]let cliente = clientesExibidos[index]; [cite: 585]
    [cite_start]const modalEdicao = document.getElementById("modalEdicao"); [cite: 585]
    [cite_start]modalEdicao.style.display = "flex"; [cite: 585]

    [cite_start]const nomeLimpo = cliente.nome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, ''); [cite: 586]
    modalEdicao.innerHTML = `
        <div class="modal-content text-left">
            <h3 class="text-2xl font-bold mb-4 text-indigo-700">Editar Cliente</h3>
            <label class="block mb-1 font-medium text-gray-700">Nome:</label>
            <input type="text" id="novoNome" value="${nomeLimpo}" placeholder="Nome" class="w-full p-2 border border-gray-300 rounded-lg mb-3 focus:ring-indigo-500 focus:border-indigo-500"><br>
            <label class="block mb-1 font-medium text-gray-700">Telefone:</label>
            <input type="tel" id="novoTelefone" value="${cliente.telefone}" placeholder="Telefone" class="w-full p-2 border border-gray-300 rounded-lg mb-3 focus:ring-indigo-500 focus:border-indigo-500"><br>
            <label class="block mb-1 font-medium text-gray-700">Vencimento:</label>
            [cite_start]<input type="date" id="novaData" value="${formatarParaInputDate(cliente.data)}" class="w-full p-2 border border-gray-300 rounded-lg mb-3 focus:ring-indigo-500 focus:border-indigo-500"><br> [cite: 587]

            <div class="mt-4">
                <span class="block mb-2 font-medium text-gray-700">Produto:</span>
                <label class="inline-flex items-center cursor-pointer mr-4">
                    <input type="radio" name="editarProduto" value="UniTv" ${cliente.Produto === "UniTv" ? [cite_start]"checked" : ""} class="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500"> [cite: 588]
                    <span class="ml-2 text-gray-700">UniTv</span>
                </label>
                <label class="inline-flex items-center cursor-pointer">
                    <input type="radio" name="editarProduto" value="Duplecast" ${cliente.Produto === "Duplecast" ? [cite_start]"checked" : ""} class="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500"> [cite: 589]
                    <span class="ml-2 text-gray-700">Duplecast</span>
                </label>
            </div>
            <br>
            <div class="flex justify-between gap-4 mt-6">
                [cite_start]<button id="salvarBtn" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition duration-200">Salvar</button> [cite: 590]
                [cite_start]<button onclick="fecharModal()" class="flex-1 bg-gray-400 hover:bg-gray-500 text-gray-800 font-bold py-2 px-6 rounded-lg transition duration-200">Cancelar</button> [cite: 590]
            </div>
        </div>
    [cite_start]`; [cite: 591]
    [cite_start]document.getElementById("novoNome").focus(); [cite: 591]
    const originalClienteId = cliente.id; 
    [cite_start]document.getElementById("salvarBtn").onclick = () => salvarEdicao(originalClienteId); [cite: 592]
    [cite_start]document.getElementById("novoNome").addEventListener("keydown", (e) => proximoCampo(e, "novoTelefone")); [cite: 592]
    [cite_start]document.getElementById("novoTelefone").addEventListener("keydown", (e) => proximoCampo(e, "novaData")); [cite: 593]
    [cite_start]document.getElementById("novaData").addEventListener("keydown", (e) => { [cite: 593]
        [cite_start]if (e.key === "Enter") { [cite: 593]
            [cite_start]e.preventDefault(); [cite: 593]
            [cite_start]document.getElementById("salvarBtn").focus(); [cite: 593]
        }
    });
    [cite_start]document.getElementById("salvarBtn").addEventListener("keydown", (e) => { [cite: 594]
        [cite_start]if (e.key === "Enter") { [cite: 594]
            [cite_start]e.preventDefault(); [cite: 594]
            [cite_start]salvarEdicao(originalClienteId); [cite: 594]
        }
    });
    [cite_start]document.addEventListener("keydown", fecharComEsc); [cite: 595]
}

[cite_start]function proximoCampo(event, proximoId) { [cite: 595]
    [cite_start]if (event.key === "Enter") { [cite: 595]
        [cite_start]event.preventDefault(); [cite: 596]
        [cite_start]document.getElementById(proximoId)?.focus(); [cite: 596]
    }
}

[cite_start]async function salvarEdicao(clientId) { [cite: 597]
    [cite_start]const originalClienteIndex = clientes.findIndex(c => c.id === clientId); [cite: 597]
    [cite_start]if (originalClienteIndex === -1) return; [cite: 597]

    [cite_start]saveStateToHistory(); [cite: 598]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 598]

    [cite_start]const clienteParaAtualizar = clientes[originalClienteIndex]; [cite: 598]

    let novoNome = document.getElementById("novoNome").value.trim();
    let novoTelefone = document.getElementById("novoTelefone").value.trim();
    [cite_start]let novaData = document.getElementById("novaData").value.trim(); [cite: 599]
    [cite_start]let novoProduto = document.querySelector('input[name="editarProduto"]:checked').value; [cite: 599]

    if (!novoNome || !novaData) {
        [cite_start]exibirAlerta("Nome e data são obrigatórios!"); [cite: 600]
        return;
    }

    [cite_start]const telefoneLimpoEditado = novoTelefone.replace(/[^\d]/g, ''); [cite: 601]
    if (telefoneLimpoEditado.length < 5) {
        [cite_start]exibirAlerta("O telefone deve ter pelo menos 5 dígitos para gerar o ID."); [cite: 602]
        return;
    }
    [cite_start]const novoId = telefoneLimpoEditado.slice(-5); [cite: 603]

    [cite_start]if (novoId !== clienteParaAtualizar.id && clientes.some(c => c.id === novoId && c.id !== clienteParaAtualizar.id)) { [cite: 603]
        [cite_start]exibirAlerta(`O novo telefone final (${novoId}) já está em uso por outro cliente. Por favor, escolha um telefone diferente.`); [cite: 604]
        return;
    }

    [cite_start]let nomeSemProduto = novoNome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, ''); [cite: 605]
    [cite_start]let nomeComNovoProduto = `${nomeSemProduto} (${novoProduto})`; [cite: 605]

    [cite_start]clientes[originalClienteIndex].id = novoId; [cite: 605]
    [cite_start]clientes[originalClienteIndex].nome = nomeComNovoProduto; [cite: 605]
    [cite_start]clientes[originalClienteIndex].telefone = telefoneLimpoEditado; [cite: 606]
    [cite_start]clientes[originalClienteIndex].data = novaData.split("-").reverse().join("/"); [cite: 606]
    [cite_start]clientes[originalClienteIndex].Produto = novoProduto; [cite: 606]
    clientes[originalClienteIndex].dola_sent = false; 
    [cite_start]clientes[originalClienteIndex].clicado = false; [cite: 607]
    [cite_start]saveClientsToLocalStorage(); [cite: 608]
    [cite_start]chamarFiltroAtual(); [cite: 609]
    [cite_start]exibirClientesAvisados(); [cite: 609]
    [cite_start]fecharModal(); [cite: 609]
    [cite_start]atualizarUltimaAtualizacao("editado", nomeComNovoProduto); [cite: 609]
    [cite_start]prepararClientesVencidosParaMensagem(); [cite: 610]

    try {
        [cite_start]await salvarClientes(); [cite: 610]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 611]
        [cite_start]saveClientsToLocalStorage(); [cite: 611]
        [cite_start]chamarFiltroAtual(); [cite: 612]
        [cite_start]exibirClientesAvisados(); [cite: 612]
        exibirAlerta(`Erro ao salvar edição: ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha na edição", nomeComNovoProduto); [cite: 613]
    }
}

[cite_start]function formatarParaInputDate(data) { [cite: 614]
    [cite_start]let [dia, mes, ano] = data.split("/"); [cite: 614]
    [cite_start]return `${ano}-${mes}-${dia}`; [cite: 614]
}

[cite_start]function excluir(index) { [cite: 615]
    [cite_start]const cliente = clientesExibidos[index]; [cite: 615]
    [cite_start]clienteIndexParaExcluir = clientes.findIndex(c => c.id === cliente.id); [cite: 615]
    [cite_start]if (clienteIndexParaExcluir !== -1) { [cite: 615]
        [cite_start]document.getElementById("modalExclusao").style.display = "flex"; [cite: 616]
    }
}

[cite_start]async function confirmarExclusao() { [cite: 617]
    [cite_start]if (clienteIndexParaExcluir === null) return; [cite: 617]
    [cite_start]saveStateToHistory(); [cite: 618]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 618]
    const clienteParaExcluir = clientes[clienteIndexParaExcluir];
    [cite_start]const nomeClienteExcluido = clienteParaExcluir.nome; [cite: 618]

    [cite_start]clientes.splice(clienteIndexParaExcluir, 1); [cite: 619]
    [cite_start]saveClientsToLocalStorage(); [cite: 619]
    
    [cite_start]chamarFiltroAtual(); [cite: 620]
    [cite_start]exibirClientesAvisados(); [cite: 620]
    [cite_start]fecharModal(); [cite: 620]
    [cite_start]clienteIndexParaExcluir = null; [cite: 620]
    [cite_start]atualizarUltimaAtualizacao("excluído", nomeClienteExcluido); [cite: 620]
    [cite_start]prepararClientesVencidosParaMensagem(); [cite: 621]

    try {
        [cite_start]await salvarClientes(); [cite: 621]
    } catch (e) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 622]
        [cite_start]saveClientsToLocalStorage(); [cite: 622]
        [cite_start]chamarFiltroAtual(); [cite: 623]
        [cite_start]exibirClientesAvisados(); [cite: 623]
        exibirAlerta(`Erro ao excluir cliente no Google Sheets: ${e.message}. Ação desfeita localmente.`);
        [cite_start]atualizarUltimaAtualizacao("falha na exclusão", nomeClienteExcluido); [cite: 624]
    }
}

[cite_start]async function toggleAvisado(index) { [cite: 625]
    [cite_start]const cliente = clientesExibidos[index]; [cite: 625]
    [cite_start]const clienteOriginalIndex = clientes.findIndex(c => c.id === cliente.id); [cite: 625]
    [cite_start]if (clienteOriginalIndex === -1) return; [cite: 626]
    [cite_start]saveStateToHistory(); [cite: 627]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 627]

    [cite_start]clientes[clienteOriginalIndex].avisado = !clientes[clienteOriginalIndex].avisado; [cite: 628]
    [cite_start]saveClientsToLocalStorage(); [cite: 629]
    [cite_start]chamarFiltroAtual(); [cite: 629]
    [cite_start]exibirClientesAvisados(); [cite: 630]
    [cite_start]atualizarUltimaAtualizacao(`status avisado alterado para ${clientes[clienteOriginalIndex].avisado ? 'sim' : 'não'}`, cliente.nome); [cite: 630]
    [cite_start]prepararClientesVencidosParaMensagem(); [cite: 631]

    try {
        [cite_start]await salvarClientes(); [cite: 632]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 633]
        [cite_start]saveClientsToLocalStorage(); [cite: 633]
        [cite_start]chamarFiltroAtual(); [cite: 634]
        [cite_start]exibirClientesAvisados(); [cite: 634]
        exibirAlerta(`Erro ao alterar status avisado: ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha na alteração de status avisado", cliente.nome); [cite: 635]
    }
}

[cite_start]async function toggleDebito(index) { [cite: 636]
    [cite_start]const cliente = clientesExibidos[index]; [cite: 636]
    [cite_start]const clienteOriginalIndex = clientes.findIndex(c => c.id === cliente.id); [cite: 636]
    [cite_start]if (clienteOriginalIndex === -1) return; [cite: 637]
    [cite_start]saveStateToHistory(); [cite: 638]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 638]

    [cite_start]clientes[clienteOriginalIndex].debito = !clientes[originalClienteIndex].debito; [cite: 638]
    saveClientsToLocalStorage(); 
    [cite_start]chamarFiltroAtual(); [cite: 639]
    [cite_start]exibirClientesAvisados(); [cite: 639]
    [cite_start]atualizarContadores(); [cite: 639]
    [cite_start]atualizarUltimaAtualizacao(`status débito alterado para ${clientes[clienteOriginalIndex].debito ? 'sim' : 'não'}`, cliente.nome); [cite: 639]
    [cite_start]prepararClientesVencidosParaMensagem(); [cite: 640]

    try {
        [cite_start]await salvarClientes(); [cite: 641]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 642]
        [cite_start]saveClientsToLocalStorage(); [cite: 642]
        [cite_start]chamarFiltroAtual(); [cite: 643]
        [cite_start]exibirClientesAvisados(); [cite: 643]
        exibirAlerta(`Erro ao alterar status débito: ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha na alteração de status débito", cliente.nome); [cite: 644]
    }
}

[cite_start]async function toggleVerDepois(index) { [cite: 645]
    [cite_start]const cliente = clientesExibidos[index]; [cite: 645]
    [cite_start]const clienteOriginalIndex = clientes.findIndex(c => c.id === cliente.id); [cite: 645]
    [cite_start]if (clienteOriginalIndex === -1) return; [cite: 646]
    [cite_start]saveStateToHistory(); [cite: 647]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 647]

    [cite_start]clientes[clienteOriginalIndex].verDepois = !clientes[clienteOriginalIndex].verDepois; [cite: 647]
    if (clientes[clienteOriginalIndex].verDepois) {
        [cite_start]clientes[clienteOriginalIndex].oculto = false; [cite: 648]
        [cite_start]clientes[clienteOriginalIndex].arquivado = false; [cite: 649]
        [cite_start]clientes[clienteOriginalIndex].desativado = false; [cite: 649]
        [cite_start]clientes[clienteOriginalIndex].clicado = false; [cite: 649]
    }
    [cite_start]saveClientsToLocalStorage(); [cite: 650]
    [cite_start]chamarFiltroAtual(); [cite: 650]
    [cite_start]exibirClientesAvisados(); [cite: 651]
    [cite_start]atualizarUltimaAtualizacao(`status "Ver Depois" alterado para ${clientes[clienteOriginalIndex].verDepois ? 'sim' : 'não'}`, cliente.nome); [cite: 651]
    [cite_start]prepararClientesVencidosParaMensagem(); [cite: 652]

    try {
        [cite_start]await salvarClientes(); [cite: 653]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 654]
        [cite_start]saveClientsToLocalStorage(); [cite: 654]
        [cite_start]chamarFiltroAtual(); [cite: 655]
        [cite_start]exibirClientesAvisados(); [cite: 655]
        exibirAlerta(`Erro ao alterar status "Ver Depois": ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha na alteração de status Ver Depois", cliente.nome); [cite: 656]
    }
}

[cite_start]async function toggleDesativado(index) { [cite: 657]
    [cite_start]const cliente = clientesExibidos[index]; [cite: 657]
    [cite_start]const clienteOriginalIndex = clientes.findIndex(c => c.id === cliente.id); [cite: 657]
    [cite_start]if (clienteOriginalIndex === -1) return; [cite: 658]
    [cite_start]saveStateToHistory(); [cite: 658]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 659]

    [cite_start]clientes[clienteOriginalIndex].desativado = !clientes[clienteOriginalIndex].desativado; [cite: 659]
    if (clientes[clienteOriginalIndex].desativado) {
        [cite_start]clientes[clienteOriginalIndex].avisado = false; [cite: 660]
        [cite_start]clientes[clienteOriginalIndex].debito = false; [cite: 660]
        clientes[clienteOriginalIndex].oculto = false; 
        [cite_start]clientes[clienteOriginalIndex].verDepois = false; [cite: 661]
        [cite_start]clientes[clienteOriginalIndex].arquivado = false; [cite: 661]
        [cite_start]clientes[clienteOriginalIndex].clicado = false; [cite: 661]
    }
    [cite_start]saveClientsToLocalStorage(); [cite: 662]
    [cite_start]chamarFiltroAtual(); [cite: 662]
    [cite_start]exibirClientesAvisados(); [cite: 663]
    [cite_start]atualizarUltimaAtualizacao(`status desativado alterado para ${clientes[clienteOriginalIndex].desativado ? 'sim' : 'não'}`, cliente.nome); [cite: 663]
    [cite_start]prepararClientesVencidosParaMensagem(); [cite: 664]

    try {
        [cite_start]await salvarClientes(); [cite: 665]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 665]
        [cite_start]saveClientsToLocalStorage(); [cite: 666]
        [cite_start]chamarFiltroAtual(); [cite: 666]
        [cite_start]exibirClientesAvisados(); [cite: 667]
        [cite_start]exibirAlerta(`Erro ao alterar status desativado: ${error.message}. Ação desfeita localmente. Tente novamente.`); [cite: 667]
        [cite_start]atualizarUltimaAtualizacao("falha na alteração de status desativado", cliente.nome); [cite: 668]
    }
}

[cite_start]function abrirModalAlterarProduto(index) { [cite: 669]
    [cite_start]clienteIndexParaAlterarProduto = index; [cite: 669]
    [cite_start]document.getElementById('modalEscolherProduto').style.display = 'flex'; [cite: 669]
}

[cite_start]async function alterarProdutoClienteConfirm(novoProduto) { [cite: 670]
    [cite_start]if (clienteIndexParaAlterarProduto === null) return; [cite: 670]
    [cite_start]saveStateToHistory(); [cite: 671]
    [cite_start]const estadoAnteriorClientes = JSON.parse(JSON.stringify(clientes)); [cite: 671]

    const clienteParaAtualizar = clientesExibidos[clienteIndexParaAlterarProduto];
    let clienteOriginalIndex = clientes.findIndex(c => c.id === clienteParaAtualizar.id);
    [cite_start]const clienteNome = clienteParaAtualizar.nome; [cite: 672]

    [cite_start]if (clienteOriginalIndex !== -1) { [cite: 672]
        [cite_start]let nomeSemProduto = clientes[clienteOriginalIndex].nome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, ''); [cite: 673]
        [cite_start]clientes[clienteOriginalIndex].Produto = novoProduto; [cite: 673]
        clientes[originalClienteIndex].nome = `${nomeSemProduto} (${novoProduto})`;
        [cite_start]clientes[originalClienteIndex].clicado = false; [cite: 674]
    }
    [cite_start]saveClientsToLocalStorage(); [cite: 675]
    [cite_start]chamarFiltroAtual(); [cite: 675]
    [cite_start]exibirClientesAvisados(); [cite: 675]
    [cite_start]fecharModal(); [cite: 676]
    [cite_start]clienteIndexParaAlterarProduto = null; [cite: 676]
    [cite_start]exibirAlerta(`Produto do cliente alterado para ${novoProduto}!`); [cite: 676]
    [cite_start]atualizarUltimaAtualizacao(`produto alterado para ${novoProduto}`, clienteNome); [cite: 677]
    [cite_start]prepararClientesVencidosParaMensagem(); [cite: 677]

    try {
        [cite_start]await salvarClientes(); [cite: 678]
    } catch (error) {
        [cite_start]clientes = estadoAnteriorClientes; [cite: 679]
        [cite_start]saveClientsToLocalStorage(); [cite: 679]
        [cite_start]chamarFiltroAtual(); [cite: 680]
        [cite_start]exibirClientesAvisados(); [cite: 680]
        exibirAlerta(`Erro ao alterar produto: ${error.message}. Ação desfeita localmente. Tente novamente.`);
        [cite_start]atualizarUltimaAtualizacao("falha na alteração de produto", clienteNome); [cite: 681]
    }
}

[cite_start]async function salvarClientes() { [cite: 681]
    try {
        const response = await sendRequestToBackend('bulk_update_clients', {
            [cite_start]clients: clientes [cite: 682]
        });
        if (response.status === 'success') {
            [cite_start]console.log('Dados sincronizados com o Google Sheets com sucesso!'); [cite: 683]
        } else {
            [cite_start]throw new Error(response.message || 'Erro desconhecido ao sincronizar com o backend.'); [cite: 685]
        }
    } catch (e) {
        [cite_start]console.error("Erro ao salvar clientes no Google Sheets:", e); [cite: 686]
        [cite_start]throw e; [cite: 686]
    }
}

[cite_start]async function loadClientes() { [cite: 687]
    [cite_start]mostrarCarregando(); [cite: 687]
    try {
        [cite_start]const response = await sendRequestToBackend('get_all_clients'); [cite: 688]
        [cite_start]if (Array.isArray(response)) { [cite: 688]
            clientes = response.map(c => {
                const telefoneLimpo = String(c.telefone || '').replace(/[^\d]/g, '');
                [cite_start]const clienteId = telefoneLimpo.length >= 5 ? telefoneLimpo.slice(-5) : null; [cite: 689]

                [cite_start]let dataClienteFormatada = c.data; [cite: 689]
                [cite_start]if (c.data && typeof c.data === 'string') { [cite: 690]
                    let datePart = c.data;
                    [cite_start]if (c.data.includes('T')) { [cite: 690]
                        datePart = c.data.split('T')[0];
                    }
                    [cite_start]const parts = datePart.split('-'); [cite: 691]
                    [cite_start]if (parts.length === 3) { [cite: 691]
                        [cite_start]dataClienteFormatada = `${parts[2]}/${parts[1]}/${parts[0]}`; [cite: 692]
                    }
                }

                [cite_start]const isOcultoAposRefresh = c.oculto || false; [cite: 693]

                return {
                    [cite_start]id: c.id || clienteId, [cite: 694]
                    data: dataClienteFormatada,
                    nome: c.nome,
                    [cite_start]telefone: telefoneLimpo, [cite: 695]
                    [cite_start]avisado: c.avisado || false, [cite: 696]
                    [cite_start]debito: c.debito || false, [cite: 697]
                    Produto: c.Produto || [cite_start]"Não informado", [cite: 698]
                    [cite_start]arquivado: c.arquivado || false, [cite: 699]
                    oculto: isOcultoAposRefresh, 
                    [cite_start]verDepois: c.verDepois || false, [cite: 700]
                    [cite_start]desativado: c.desativado || false, [cite: 701]
                    [cite_start]dola_sent: c.dola_sent || false, [cite: 702]
                    [cite_start]clicado: c.clicado || false [cite: 703]
                };
            [cite_start]}).filter(c => c.id !== null); [cite: 704]
            saveClientsToLocalStorage(); 
            [cite_start]console.log("Clientes carregados do Google Sheets:", clientes); [cite: 705]
        } else {
            [cite_start]console.error("Formato de resposta inválido ao carregar clientes:", response); [cite: 706]
            [cite_start]throw new Error("Formato de dados inválido recebido do Google Sheets."); [cite: 707]
        }
    } catch (e) {
        [cite_start]console.error("Erro ao carregar clientes do Google Sheets:", e); [cite: 708]
        [cite_start]const cache = localStorage.getItem('clientesCache'); [cite: 708]
        [cite_start]if (cache) { [cite: 708]
            try {
                [cite_start]clientes = JSON.parse(cache); [cite: 709]
                [cite_start]exibirAlerta("Erro ao carregar dados do Sheets. Carregando dados do cache local."); [cite: 709]
                [cite_start]console.warn("Clientes carregados do cache local devido a erro na API."); [cite: 710]
            } catch (parseError) {
                [cite_start]console.error("Erro ao parsear cache local:", parseError); [cite: 712]
                [cite_start]clientes = []; [cite: 712]
                [cite_start]exibirAlerta("Erro no Sheets e cache local corrompido. Lista vazia."); [cite: 713]
            }
        } else {
            [cite_start]clientes = []; [cite: 714]
            [cite_start]exibirAlerta("Erro ao carregar clientes do Google Sheets e nenhum cache local encontrado."); [cite: 715]
        }
    } finally {
        [cite_start]esconderCarregando(); [cite: 716]
        
        [cite_start]filtrarHojeEVencidos(); [cite: 717]
        [cite_start]exibirClientesAvisados(); [cite: 717]
        [cite_start]prepararClientesVencidosParaMensagem(); [cite: 717]
        saveStateToHistory(); 
        [cite_start]loadSettings(); [cite: 718]
    }

    [cite_start]const ultimaAtualizacaoSalva = localStorage.getItem('ultimaAtualizacaoCliente'); [cite: 719]
    [cite_start]if (ultimaAtualizacaoSalva) { [cite: 719]
        [cite_start]document.getElementById('ultimaAtualizacaoInfo').textContent = ultimaAtualizacaoSalva; [cite: 720]
    } else {
        [cite_start]document.getElementById('ultimaAtualizacaoInfo').textContent = `Última Alteração: Nunca`; [cite: 721]
    }
}

[cite_start]function compartilharWhatsApp() { [cite: 722]
    [cite_start]const url = `https://wa.me/?text=${encodeURIComponent('Olá, estou compartilhando esta lista de clientes com você.')}`; [cite: 722]
    [cite_start]window.open(url, '_blank'); [cite: 722]
}

[cite_start]function debouncePesquisa() { [cite: 723]
    [cite_start]clearTimeout(debounceTimer); [cite: 723]
    debounceTimer = setTimeout(() => {
        exibirTabela();
        exibirClientesAvisados();
    [cite_start]}, 300); [cite: 724]
}

[cite_start]function limparPesquisa() { [cite: 725]
    [cite_start]document.getElementById("searchInput").value = ""; [cite: 725]
    [cite_start]exibirTodos(); [cite: 725]
}

[cite_start]const SETTINGS_KEY = 'inputSettings'; [cite: 726]
[cite_start]const DEFAULT_INPUT_WIDTH_PERCENT = 16; [cite: 726]

[cite_start]function toggleSettingsArea() { [cite: 726]
    const settingsArea = document.getElementById('settingsArea');
    if (settingsArea.classList.contains('hidden')) {
        settingsArea.classList.remove('hidden');
        loadSettings();
    } else {
        settingsArea.classList.add('hidden');
    }
}

function applyInputWidth(widthPercent) {
    const inputs = document.querySelectorAll('#dataInput, #nomeInput, #telefoneInput');

    inputs.forEach(input => {
        input.classList.remove('md:w-1/4', 'md:w-1/3', 'md:w-full'); 
        input.style.width = 'auto'; 
    });

    document.getElementById('dataInput').style.flexBasis = `${widthPercent}%`;
    document.getElementById('nomeInput').style.flexBasis = `${widthPercent}%`;
    document.getElementById('telefoneInput').style.flexBasis = `${widthPercent}%`;
}

[cite_start]function updateInputWidth(value) { [cite: 732]
    [cite_start]const widthValueSpan = document.getElementById('inputWidthValue'); [cite: 732]
    [cite_start]widthValueSpan.textContent = `${value}%`; [cite: 732]
    [cite_start]applyInputWidth(value); [cite: 732]
}

[cite_start]function saveSettings() { [cite: 733]
    [cite_start]const inputWidth = document.getElementById('inputWidth').value; [cite: 733]
    [cite_start]localStorage.setItem(SETTINGS_KEY, JSON.stringify({ [cite: 733]
        width: inputWidth
    [cite_start]})); [cite: 734]
    [cite_start]exibirAlerta("Ajustes salvos com sucesso!"); [cite: 734]
    [cite_start]toggleSettingsArea(); [cite: 734]
}

[cite_start]function loadSettings() { [cite: 735]
    [cite_start]const savedSettings = localStorage.getItem(SETTINGS_KEY); [cite: 735]
    [cite_start]let widthToApply = DEFAULT_INPUT_WIDTH_PERCENT; [cite: 735]

    [cite_start]if (savedSettings) { [cite: 735]
        try {
            [cite_start]const settings = JSON.parse(savedSettings); [cite: 736]
            widthToApply = settings.width || [cite_start]DEFAULT_INPUT_WIDTH_PERCENT; [cite: 736]
        } catch (e) {
            [cite_start]console.error("Erro ao carregar ajustes do localStorage:", e); [cite: 737]
            [cite_start]localStorage.removeItem(SETTINGS_KEY); [cite: 737]
        }
    }

    [cite_start]const inputWidthElement = document.getElementById('inputWidth'); [cite: 738]
    [cite_start]if (inputWidthElement) { [cite: 738]
        [cite_start]inputWidthElement.value = widthToApply; [cite: 739]
    }
    [cite_start]const inputWidthValueSpan = document.getElementById('inputWidthValue'); [cite: 740]
    [cite_start]if (inputWidthValueSpan) { [cite: 740]
        [cite_start]inputWidthValueSpan.textContent = `${widthToApply}%`; [cite: 741]
    }
    [cite_start]applyInputWidth(widthToApply); [cite: 742]
}

[cite_start]function resetSettings() { [cite: 743]
    [cite_start]localStorage.removeItem(SETTINGS_KEY); [cite: 743]
    [cite_start]exibirAlerta("Ajustes redefinidos para o padrão!"); [cite: 743]
    [cite_start]loadSettings(); [cite: 743]
    [cite_start]toggleSettingsArea(); [cite: 743]
}

[cite_start]function atualizarContadores() { [cite: 744]
    [cite_start]const hoje = new Date(); [cite: 744]
    const hojeFormatada = hoje.getDate().toString().padStart(2, '0') + "/" +
        (hoje.getMonth() + 1).toString().padStart(2, '0') + "/" +
        [cite_start]hoje.getFullYear(); [cite: 745]

    [cite_start]const clientesNaTabelaPrincipal = clientes.filter(cliente => !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado); [cite: 746]

    [cite_start]const countHoje = clientesNaTabelaPrincipal.filter(cliente => cliente.data === hojeFormatada && !cliente.avisado).length; [cite: 747]
    [cite_start]const countAmanha = clientesNaTabelaPrincipal.filter(cliente => { [cite: 748]
        [cite_start]const amanha = new Date(); [cite: 748]
        [cite_start]amanha.setDate(amanha.getDate() + 1); [cite: 748]
        const amanhaFormatada = amanha.getDate().toString().padStart(2, '0') + "/" +
            (amanha.getMonth() + 1).toString().padStart(2, '0') + "/" +
            [cite_start]amanha.getFullYear(); [cite: 749]
        return cliente.data === amanhaFormatada;
    [cite_start]}).length; [cite: 750]
    [cite_start]const countVencidos = clientesNaTabelaPrincipal.filter(cliente => { [cite: 750]
        const [dia, mes, ano] = cliente.data.split("/").map(num => parseInt(num));
        const dataCliente = new Date(ano, mes - 1, dia);
        const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

        [cite_start]return dataCliente < hojeSemHora && !cliente.avisado; [cite: 751]
    }).length;
    
    [cite_start]const countHojeEVencidos = countHoje + countVencidos; [cite: 752]
    
    [cite_start]const countDebito = clientesNaTabelaPrincipal.filter(cliente => cliente.debito).length; [cite: 752]

    [cite_start]const countOcultos = clientes.filter(cliente => cliente.oculto && !cliente.arquivado && !cliente.verDepois && !cliente.desativado).length; [cite: 753]
    [cite_start]const countArquivados = clientes.filter(cliente => cliente.arquivado).length; [cite: 753]
    [cite_start]const countVerDepois = clientes.filter(cliente => cliente.verDepois).length; [cite: 753]
    [cite_start]const countDesativados = clientes.filter(cliente => cliente.desativado).length; [cite: 754]

    [cite_start]updateBadge('badgeHojeEVencidos', countHojeEVencidos); [cite: 754]
    [cite_start]updateBadge('badgeHoje', countHoje); [cite: 755]
    [cite_start]updateBadge('badgeAmanha', countAmanha); [cite: 755]
    [cite_start]updateBadge('badgeVencidos', countVencidos); [cite: 755]
    [cite_start]updateBadge('badgeDebito', countDebito); [cite: 755]
    [cite_start]updateBadge('badgeOcultos', countOcultos); [cite: 755]
    [cite_start]updateBadge('badgeArquivados', countArquivados); [cite: 755]
    [cite_start]updateBadge('badgeVerDepois', countVerDepois); [cite: 755]
    [cite_start]updateBadge('badgeDesativados', countDesativados); [cite: 756]
    [cite_start]updateBadge('badgeCentralMessage', clientesVencidosParaMensagem.length); [cite: 757]
}

[cite_start]function updateBadge(badgeId, count) { [cite: 758]
    [cite_start]const badge = document.getElementById(badgeId); [cite: 758]
    [cite_start]if (badge) { [cite: 758]
        if (count > 0) {
            [cite_start]badge.textContent = count; [cite: 759]
            [cite_start]badge.style.display = 'inline-block'; [cite: 759]
        } else {
            [cite_start]badge.style.display = 'none'; [cite: 760]
        }
    }
}

[cite_start]function mostrarContagemProdutos() { [cite: 761]
    [cite_start]const clientesNaoArquivadosNaoOcultos = clientes.filter(cliente => !cliente.arquivado && !cliente.oculto && !cliente.verDepois && !cliente.desativado); [cite: 761]
    [cite_start]const countUniTv = clientesNaoArquivadosNaoOcultos.filter(cliente => cliente.Produto === 'UniTv').length; [cite: 761]
    [cite_start]const countDuplecast = clientesNaoArquivadosNaoOcultos.filter(cliente => cliente.Produto === 'Duplecast').length; [cite: 762]

    [cite_start]document.getElementById('countUniTv').textContent = countUniTv; [cite: 762]
    [cite_start]document.getElementById('countDuplecast').textContent = countDuplecast; [cite: 762]

    [cite_start]document.getElementById('modalContagemProdutos').style.display = 'flex'; [cite: 762]
}

[cite_start]function prepararClientesVencidosParaMensagem() { [cite: 763]
    [cite_start]const hoje = new Date(); [cite: 764]
    [cite_start]const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()); [cite: 764]
    [cite_start]clientesVencidosParaMensagem = clientes.filter(cliente => { [cite: 764]
        const [dia, mes, ano] = cliente.data.split("/").map(Number);
        const dataCliente = new Date(ano, mes - 1, dia);

        const vencendoHoje = dataCliente.getTime() === hojeSemHora.getTime();
        [cite_start]const vencido = dataCliente < hojeSemHora; [cite: 765]

        return (
            (vencendoHoje || vencido) &&
            [cite_start]!cliente.avisado && [cite: 765]
            [cite_start]!cliente.arquivado && [cite: 766]
            [cite_start]!cliente.oculto && [cite: 766]
            [cite_start]!cliente.verDepois && [cite: 766]
            !cliente.desativado
        );
    [cite_start]}); [cite: 767]
    [cite_start]atualizarContadores(); [cite: 767]
}

[cite_start]function enviarProximoClienteVencido() { [cite: 768]
    [cite_start]prepararClientesVencidosParaMensagem(); [cite: 769]

    [cite_start]if (clientesVencidosParaMensagem.length === 0) { [cite: 769]
        [cite_start]exibirAlerta("Não há clientes vencidos para enviar mensagem no momento."); [cite: 770]
        return;
    }

    [cite_start]const cliente = clientesVencidosParaMensagem[0]; [cite: 771]
    [cite_start]const nomeExibicaoBase = cliente.nome.replace(/\s\(UniTv\)/g, '').replace(/\s\(Duplecast\)/g, ''); [cite: 771]

    [cite_start]const originalClientesExibidos = clientesExibidos; [cite: 772]
    [cite_start]clientesExibidos = [cliente]; [cite: 773]
    [cite_start]enviarMensagemWhatsApp(nomeExibicaoBase, cliente.telefone, 0); [cite: 774]
    [cite_start]clientesExibidos = originalClientesExibidos; [cite: 774]

    [cite_start]exibirAlerta(`Mensagem enviada para "${nomeExibicaoBase}". O próximo cliente vencido agora é o primeiro da lista.`); [cite: 775]
    [cite_start]atualizarContadores(); [cite: 776]
}

[cite_start]async function inicializarExibicaoClientes() { [cite: 776]
    [cite_start]await loadClientes(); [cite: 777]
    [cite_start]const today = new Date(); [cite: 778]
    [cite_start]const year = today.getFullYear(); [cite: 778]
    [cite_start]const month = String(today.getMonth() + 1).padStart(2, '0'); [cite: 778]
    [cite_start]const day = String(today.getDate()).padStart(2, '0'); [cite: 778]
    [cite_start]document.getElementById('dataInput').value = `${year}-${month}-${day}`; [cite: 779]
    [cite_start]filtrarHojeEVencidos(); [cite: 780]
    [cite_start]exibirClientesAvisados(); [cite: 780]
    [cite_start]prepararClientesVencidosParaMensagem(); [cite: 780]
    [cite_start]saveStateToHistory(); [cite: 781]
    [cite_start]loadSettings(); [cite: 781]
}

[cite_start]document.addEventListener('DOMContentLoaded', () => { [cite: 781]
    document.getElementById('dataAtual').innerText = `Data Atual: ${new Date().toLocaleDateString('pt-BR', {
        [cite_start]day: '2-digit', [cite: 782]
        [cite_start]month: '2-digit' [cite: 782]
    })}`;
    [cite_start]inicializarExibicaoClientes(); [cite: 783]
});

// Funções auxiliares para byId (necessárias para botões na lista de avisados)
function editarClienteById(clientId) {
    const index = clientes.findIndex(c => c.id === clientId);
    if (index !== -1) {
        const originalClientesExibidos = clientesExibidos;
        clientesExibidos = [clientes[index]];
        editar(0);
        clientesExibidos = originalClientesExibidos;
    }
}
function excluirClienteById(clientId) {
    const index = clientes.findIndex(c => c.id === clientId);
    if (index !== -1) {
        const originalClientesExibidos = clientesExibidos;
        clientesExibidos = [clientes[index]];
        excluir(0);
        clientesExibidos = originalClientesExibidos;
    }
}
function copiarMensagemWhatsAppById(clientId) {
    const index = clientes.findIndex(c => c.id === clientId);
    if (index !== -1) {
        const originalClientesExibidos = clientesExibidos;
        clientesExibidos = [clientes[index]];
        copiarMensagemWhatsApp(0);
        clientesExibidos = originalClientesExibidos;
    }
}
function arquivarById(clientId) {
    const index = clientes.findIndex(c => c.id === clientId);
    if (index !== -1) {
        const originalClientesExibidos = clientesExibidos;
        clientesExibidos = [clientes[index]];
        arquivar(0);
        clientesExibidos = originalClientesExibidos;
    }
}
function toggleDesativadoById(clientId) {
    const index = clientes.findIndex(c => c.id === clientId);
    if (index !== -1) {
        const originalClientesExibidos = clientesExibidos;
        clientesExibidos = [clientes[index]];
        toggleDesativado(0);
        clientesExibidos = originalClientesExibidos;
    }
}
function toggleVerDepoisById(clientId) {
    const index = clientes.findIndex(c => c.id === clientId);
    if (index !== -1) {
        const originalClientesExibidos = clientesExibidos;
        clientesExibidos = [clientes[index]];
        toggleVerDepois(0);
        clientesExibidos = originalClientesExibidos;
    }
}
function abrirModalAlterarProdutoById(clientId) {
    const index = clientes.findIndex(c => c.id === clientId);
    if (index !== -1) {
        const originalClientesExibidos = clientesExibidos;
        clientesExibidos = [clientes[index]];
        abrirModalAlterarProduto(0);
        clientesExibidos = originalClientesExibidos;
    }
}