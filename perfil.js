const CLIENT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxF30STg18Sv29ezFA3v5vgvmvHcoxJEc_tq36Yht_kGmxP4FgKm7ZJE3ET9rRsJSH9/exec';

// Chave deve ser IGUAL à do script.js
const USER_DATA_KEY = 'googleUserDataToken'; // Alterado para corresponder ao script.js

// Variável global para armazenar o ID do Google do usuário logado
let googleUserId = null;

// --- Funções Auxiliares ---

/**
 * Busca dados do cliente na planilha associados ao googleUserId.
 */
async function fetchClientData(userId) {
    if (!userId) {
        console.log("Nenhum ID de usuário para buscar dados.");
        return;
    }

    const fetchUrl = `${CLIENT_SHEET_URL}?googleUserId=${encodeURIComponent(userId)}`;
    console.log("Buscando dados do cliente em:", fetchUrl);

    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
            throw new Error(`Erro na rede: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Dados recebidos:", data);

        if (data.status === 'error') {
            console.error("Erro retornado pelo Apps Script:", data.message);
            document.getElementById('statusMessage').textContent = `Erro ao buscar dados: ${data.message}`;
        } else if (data.status === 'success' && data.clientData) {
            populateForm(data.clientData);
            document.getElementById('statusMessage').textContent = 'Dados do perfil carregados.';
        } else {
            console.log("Nenhum dado encontrado ou formato inesperado.");
            document.getElementById('statusMessage').textContent = 'Nenhum perfil encontrado. Preencha para criar.';
        }

    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        document.getElementById('statusMessage').textContent = `Erro ao conectar: ${error.message}`;
    }
}

/**
 * Preenche os campos do formulário com os dados do cliente.
 */
function populateForm(clientData) {
    const fieldMap = {
        'cpf': 'input_cpf',
        'tel': 'input_telefone',
        'cep': 'input_cep',
        'logradouro': 'input_logradouro',
        'cidade': 'input_cidade',
        'bairro': 'input_bairro',
        'estado': 'input_estado'
    };

    console.log("Preenchendo formulário com:", clientData);

    for (const dataKey in fieldMap) {
        if (clientData[dataKey] !== undefined && clientData[dataKey] !== null) {
            const inputElement = document.getElementById(fieldMap[dataKey]);
            if (inputElement) {
                inputElement.value = clientData[dataKey];
            } else {
                console.warn(`Elemento não encontrado: ${fieldMap[dataKey]}`);
            }
        }
    }
}

/**
 * Envia os dados do formulário para a planilha Google.
 */
function saveClientToSheet(clientData) {
    if (!CLIENT_SHEET_URL) {
        console.error('URL não configurada.');
        document.getElementById('statusMessage').textContent = 'Erro: URL de salvamento inválida.';
        return;
    }

    if (!googleUserId) {
        console.error('ID do Google não encontrado.');
        document.getElementById('statusMessage').textContent = 'Erro: Faça login novamente.';
        return;
    }

    const dataToSend = { ...clientData, googleUserId: googleUserId };
    console.log("Enviando dados:", dataToSend);
    document.getElementById('statusMessage').textContent = 'Salvando dados...';

    fetch(CLIENT_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
    })
    .then(() => {
        console.log('Dados enviados (no-cors).');
        document.getElementById('statusMessage').textContent = 'Dados salvos com sucesso!';
    })
    .catch(error => {
        console.error('Erro ao enviar:', error);
        document.getElementById('statusMessage').textContent = `Erro ao salvar: ${error.message}`;
    });
}

// --- Inicialização e Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Perfil DOM carregado.");
    const statusMessage = document.getElementById('statusMessage');

    // Acessa a variável global do script.js
    const decodedToken = window.decodedToken; // <--- Chave da solução

    if (decodedToken && decodedToken.sub) {
        googleUserId = decodedToken.sub; // Define o ID do Google
        console.log("ID do Google obtido:", googleUserId);
        fetchClientData(googleUserId); // Busca dados do usuário
    } else {
        console.log("Usuário não logado ou token inválido.");
        googleUserId = null;
        statusMessage.textContent = 'Faça login para acessar o perfil.';
    }

    // Listener do botão 'Enviar'
    const sendButton = document.getElementById('botao_enviar');
    if (sendButton) {
        sendButton.addEventListener('click', () => {
            const clientData = {
                cpf: document.getElementById('input_cpf')?.value || '',
                tel: document.getElementById('input_telefone')?.value || '',
                cep: document.getElementById('input_cep')?.value || '',
                logradouro: document.getElementById('input_logradouro')?.value || '',
                cidade: document.getElementById('input_cidade')?.value || '',
                bairro: document.getElementById('input_bairro')?.value || '',
                estado: document.getElementById('input_estado')?.value || ''
            };
            saveClientToSheet(clientData);
        });
    } else {
        console.error("Botão 'Enviar' não encontrado.");
    }
});
