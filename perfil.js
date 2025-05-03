// URL do script do Google Apps para salvar/atualizar dados do cliente
const CLIENT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxF30STg18Sv29ezFA3v5vgvmvHcoxJEc_tq36Yht_kGmxP4FgKm7ZJE3ET9rRsJSH9/exec'; // Verifique se esta é a URL correta para o cliente.gs

// Chave usada para armazenar o token JWT no localStorage (DEVE SER A MESMA USADA EM script.js)
const USER_DATA_KEY_FROM_SCRIPT = 'googleUserDataToken';

// Variável global para armazenar o ID do Google do usuário logado (neste script)
let googleUserId = null;

// --- Funções Auxiliares ---

/**
 * Decodifica um token JWT (JSON Web Token).
 * Esta função apenas extrai o payload sem verificar a assinatura.
 * A verificação real da assinatura deve ocorrer no servidor (Google Apps Script).
 * @param {string} token O token JWT a ser decodificado.
 * @returns {object|null} O payload decodificado ou null se o token for inválido, expirado ou ocorrer um erro.
 */
function jwtDecode_local(token) {
    try {
        if (!token) return null; // Retorna null se o token for nulo ou indefinido
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error("Token JWT inválido: estrutura incorreta.");
            return null; // O token deve ter 3 partes: header, payload, signature
        }
        const base64Url = parts[1]; // Pega a parte do payload
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); // Converte Base64Url para Base64
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')); // Decodifica Base64 e URI Component

        const payload = JSON.parse(jsonPayload); // Analisa o JSON do payload

        // Verificação básica de expiração no cliente
        const currentTime = Date.now() / 1000; // Tempo atual em segundos
        if (payload.exp && payload.exp < currentTime) {
            console.log('Token expirado (detectado em perfil.js):', new Date(payload.exp * 1000));
            return null; // Retorna null se expirado
        }

        // Verifica se o payload contém o ID do usuário ('sub')
        if (!payload.sub) {
             console.error("Token decodificado não contém 'sub' (ID do usuário).");
             return null;
        }


        return payload; // Retorna o payload decodificado e válido (pelo menos no cliente)
    } catch (e) {
        console.error("Erro decodificando JWT em perfil.js:", e);
        return null; // Retorna null em caso de erro na decodificação
    }
}


/**
 * Busca dados do cliente na planilha associados ao googleUserId.
 * @param {string} userId O ID do Google do usuário.
 */
async function fetchClientData(userId) {
    const statusMessage = document.getElementById('statusMessage');
    if (!userId) {
        console.log("Nenhum ID de usuário para buscar dados.");
        if (statusMessage) statusMessage.textContent = 'Erro interno: ID do usuário não disponível.';
        return;
    }
    if (!CLIENT_SHEET_URL) {
        console.error('URL da planilha (CLIENT_SHEET_URL) não configurada em perfil.js');
        if (statusMessage) statusMessage.textContent = 'Erro: URL de busca não configurada.';
        return;
    }


    // Constrói a URL para a requisição GET, adicionando o googleUserId como parâmetro
    const fetchUrl = `${CLIENT_SHEET_URL}?googleUserId=${encodeURIComponent(userId)}`;
    console.log("Buscando dados do cliente em:", fetchUrl); // Log para depuração
    if (statusMessage) statusMessage.textContent = 'Buscando dados do perfil...';

    try {
        // Faz a requisição GET para o Google Apps Script
        const response = await fetch(fetchUrl);

        // Verifica se a resposta da rede foi bem-sucedida
        if (!response.ok) {
            throw new Error(`Erro na rede ao buscar dados: ${response.status} ${response.statusText}`);
        }

        // Tenta analisar a resposta como JSON
        const data = await response.json();
        console.log("Dados recebidos:", data); // Log para depuração

        // Verifica se o Apps Script retornou um erro interno
        if (data.status === 'error') {
            console.error("Erro retornado pelo Apps Script:", data.message);
            if (statusMessage) statusMessage.textContent = `Erro ao buscar dados: ${data.message}`;
        } else if (data.status === 'success' && data.clientData) {
            // Se encontrou dados, preenche o formulário
            populateForm(data.clientData);
            if (statusMessage) statusMessage.textContent = 'Dados do perfil carregados.';
        } else {
            // Se não encontrou dados (ou formato inesperado)
            console.log("Nenhum dado de cliente encontrado para este usuário ou formato de resposta inesperado.");
            if (statusMessage) statusMessage.textContent = 'Nenhum perfil encontrado. Preencha para criar.';
            // clearForm(); // Implementar se necessário
        }

    } catch (error) {
        // Captura erros de rede ou de análise JSON
        console.error('Erro ao buscar dados do cliente:', error);
        if (statusMessage) statusMessage.textContent = `Erro ao conectar para buscar dados: ${error.message}`;
    }
}


/**
 * Preenche os campos do formulário com os dados do cliente.
 * @param {object} clientData Objeto contendo os dados do cliente (ex: {cpf: '...', tel: '...'})
 */
function populateForm(clientData) {
    // Mapeia os nomes dos campos no objeto de dados para os IDs dos inputs no HTML
    const fieldMap = {
        'cpf': 'input_cpf',
        'tel': 'input_telefone',
        'cep': 'input_cep',
        'logradouro': 'input_logradouro',
        'cidade': 'input_cidade',
        'bairro': 'input_bairro',
        'estado': 'input_estado'
        // Adicione outros campos se necessário
    };

    console.log("Preenchendo formulário com:", clientData);

    for (const dataKey in fieldMap) {
        if (clientData.hasOwnProperty(dataKey) && clientData[dataKey] !== undefined && clientData[dataKey] !== null) {
            const inputElement = document.getElementById(fieldMap[dataKey]);
            if (inputElement) {
                inputElement.value = clientData[dataKey];
            } else {
                console.warn(`Elemento do formulário com ID "${fieldMap[dataKey]}" não encontrado para preencher o campo "${dataKey}".`);
            }
        }
    }
}


/**
 * Envia os dados do formulário para a planilha Google.
 * @param {object} clientData Objeto contendo os dados do cliente a serem salvos/atualizados.
 */
function saveClientToSheet(clientData) {
    const statusMessage = document.getElementById('statusMessage');
    // Verifica se a URL do script está configurada
    if (!CLIENT_SHEET_URL) {
        console.error('URL da planilha (CLIENT_SHEET_URL) não configurada em perfil.js');
        if (statusMessage) statusMessage.textContent = 'Erro: URL de salvamento não configurada.';
        return;
    }

    // Verifica se temos o googleUserId (essencial para associar os dados)
    if (!googleUserId) {
        console.error('ID do Google não encontrado. O usuário pode não estar logado ou o token é inválido.');
        if (statusMessage) statusMessage.textContent = 'Erro: ID do usuário não encontrado. Faça login novamente.';
        return;
    }

    // Adiciona o googleUserId ao objeto de dados que será enviado
    const dataToSend = {
        ...clientData, // Copia todos os dados do formulário
        googleUserId: googleUserId // Adiciona o ID do Google
    };

    console.log("Enviando dados para a planilha:", dataToSend); // Log para depuração
    if (statusMessage) statusMessage.textContent = 'Salvando dados...'; // Feedback para o usuário

    // Faz a requisição POST para o Google Apps Script
    fetch(CLIENT_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
    })
    .then(response => {
        console.log('Dados enviados para o Google Apps Script (modo no-cors). A resposta é opaca.');
        if (statusMessage) statusMessage.textContent = 'Dados salvos com sucesso!';
    })
    .catch(error => {
        console.error('Erro ao enviar dados para a planilha:', error);
        if (statusMessage) statusMessage.textContent = `Erro ao salvar: ${error.message}. Verifique a conexão.`;
    });
}


// --- Inicialização e Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("Perfil DOM carregado.");
    const statusMessage = document.getElementById('statusMessage'); // Elemento para exibir mensagens

    // 1. Tenta obter o token JWT armazenado no localStorage
    const storedToken = localStorage.getItem(USER_DATA_KEY_FROM_SCRIPT);

    if (!storedToken) {
        // Se não houver token
        console.log("Nenhum token encontrado no localStorage.");
        googleUserId = null;
        if (statusMessage) statusMessage.textContent = 'Você precisa estar logado para acessar o perfil.';
        // Desabilitar o formulário ou outras ações podem ser necessárias aqui
        const sendButton = document.getElementById('botao_enviar');
        if(sendButton) sendButton.disabled = true; // Exemplo: desabilitar botão de salvar
        return; // Interrompe a execução se não há token
    }

    // 2. Tenta decodificar o token localmente
    console.log("Token encontrado, tentando decodificar localmente em perfil.js...");
    const decodedPayload = jwtDecode_local(storedToken);

    if (decodedPayload && decodedPayload.sub) {
        // 3. Se o token foi decodificado com sucesso E contém o ID do usuário ('sub')
        googleUserId = decodedPayload.sub; // Armazena o ID do Google
        console.log("Token decodificado com sucesso em perfil.js. ID do Google:", googleUserId);

        // 4. Busca os dados do cliente associados a este ID
        fetchClientData(googleUserId);

    } else {
        // 5. Se a decodificação falhou (token inválido, expirado, sem 'sub', ou erro)
        console.log("Falha ao decodificar o token localmente em perfil.js (inválido/expirado?).");
        googleUserId = null; // Garante que o ID esteja nulo
        if (statusMessage) statusMessage.textContent = 'Sessão inválida ou expirada. Faça login novamente.';
         // Desabilitar o formulário ou outras ações podem ser necessárias aqui
        const sendButton = document.getElementById('botao_enviar');
        if(sendButton) sendButton.disabled = true; // Exemplo: desabilitar botão de salvar
    }

    // Adiciona o listener ao botão 'Enviar'
    const sendButton = document.getElementById('botao_enviar');
    if (sendButton) {
        // Só adiciona o listener se ele não foi desabilitado acima
        if (!sendButton.disabled) {
             sendButton.addEventListener('click', () => {
                // Coleta os dados atuais do formulário
                const clientData = {
                    cpf: document.getElementById('input_cpf')?.value || '',
                    tel: document.getElementById('input_telefone')?.value || '',
                    cep: document.getElementById('input_cep')?.value || '',
                    logradouro: document.getElementById('input_logradouro')?.value || '',
                    cidade: document.getElementById('input_cidade')?.value || '',
                    bairro: document.getElementById('input_bairro')?.value || '',
                    estado: document.getElementById('input_estado')?.value || ''
                };
                console.log('Dados coletados do formulário para envio:', clientData);
                saveClientToSheet(clientData); // Usa a variável global 'googleUserId'
            });
        }
    } else {
        console.error("Botão 'Enviar' (ID: botao_enviar) não encontrado.");
    }
});
