// URL do script do Google Apps para salvar/atualizar dados do cliente
const CLIENT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxF30STg18Sv29ezFA3v5vgvmvHcoxJEc_tq36Yht_kGmxP4FgKm7ZJE3ET9rRsJSH9/exec'; // Verifique se esta é a URL correta para o cliente.gs

// Chave usada para armazenar o token JWT no localStorage (deve ser a mesma usada em script.js)
const USER_DATA_KEY = 'googleUserData';

// Variável global para armazenar o ID do Google do usuário logado
let googleUserId = null;

// --- Funções Auxiliares ---

/**
 * Decodifica um token JWT.
 * ATENÇÃO: Esta é uma decodificação básica do payload, NÃO verifica a assinatura.
 * A verificação da assinatura deve ser feita no backend se a segurança for crítica.
 * @param {string} token O token JWT.
 * @returns {object|null} O payload decodificado ou null se houver erro ou token expirado.
 */
//function jwtDecode(token) {
//    try {
  //      const base64Url = token.split('.')[1];
  //      if (!base64Url) {
  //          console.error("Token JWT inválido: sem payload.");
   //         return null;
    //    }
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
   //     const payload = JSON.parse(jsonPayload);

        // Verificar expiração do token
     //   const currentTime = Date.now() / 1000; // Tempo atual em segundos
     //   if (payload.exp && payload.exp < currentTime) {
      //      console.log('Token expirado em:', new Date(payload.exp * 1000));
        //    // Considerar limpar o token do localStorage aqui se necessário
            // localStorage.removeItem(USER_DATA_KEY);
       //     return null; // Retorna null se expirado
     //   }

   //     return payload;
  //  } catch (e) {
   //     console.error("Erro decodificando JWT:", e);
   //     return null;
  //  }
//}

/**
 * Busca dados do cliente na planilha associados ao googleUserId.
 * NOTA: Esta função assume que você implementou uma função doGet no seu
 * Google Apps Script (cliente.gs) que aceita 'googleUserId' como parâmetro
 * e retorna os dados do cliente em JSON.
 * @param {string} userId O ID do Google do usuário.
 */
async function fetchClientData(userId) {
    if (!userId) {
        console.log("Nenhum ID de usuário para buscar dados.");
        return;
    }

    // Constrói a URL para a requisição GET, adicionando o googleUserId como parâmetro
    const fetchUrl = `${CLIENT_SHEET_URL}?googleUserId=${encodeURIComponent(userId)}`;
    console.log("Buscando dados do cliente em:", fetchUrl); // Log para depuração

    try {
        // Faz a requisição GET para o Google Apps Script
        const response = await fetch(fetchUrl);

        // Verifica se a resposta da rede foi bem-sucedida
        if (!response.ok) {
            // Se a resposta não for OK (ex: 404, 500), lança um erro
            throw new Error(`Erro na rede ao buscar dados: ${response.status} ${response.statusText}`);
        }

        // Tenta analisar a resposta como JSON
        const data = await response.json();
        console.log("Dados recebidos:", data); // Log para depuração

        // Verifica se o Apps Script retornou um erro interno
        if (data.status === 'error') {
            console.error("Erro retornado pelo Apps Script:", data.message);
            document.getElementById('statusMessage').textContent = `Erro ao buscar dados: ${data.message}`;
        } else if (data.status === 'success' && data.clientData) {
            // Se encontrou dados, preenche o formulário
            populateForm(data.clientData);
            document.getElementById('statusMessage').textContent = 'Dados do perfil carregados.';
        } else {
            // Se não encontrou dados (ou formato inesperado)
            console.log("Nenhum dado de cliente encontrado para este usuário ou formato de resposta inesperado.");
            document.getElementById('statusMessage').textContent = 'Nenhum perfil encontrado. Preencha para criar.';
            // Limpar o formulário pode ser útil aqui se ele pudesse ter dados antigos
            // clearForm(); // (Implementar se necessário)
        }

    } catch (error) {
        // Captura erros de rede ou de análise JSON
        console.error('Erro ao buscar dados do cliente:', error);
        document.getElementById('statusMessage').textContent = `Erro ao conectar para buscar dados: ${error.message}`;
        // Informa o usuário sobre o problema
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

    // Itera sobre o mapeamento
    for (const dataKey in fieldMap) {
        // Verifica se o dado existe no objeto recebido
        if (clientData.hasOwnProperty(dataKey) && clientData[dataKey] !== undefined && clientData[dataKey] !== null) {
            // Encontra o elemento do input no HTML usando o ID mapeado
            const inputElement = document.getElementById(fieldMap[dataKey]);
            // Se o elemento existir, define seu valor
            if (inputElement) {
                inputElement.value = clientData[dataKey];
            } else {
                // Loga um aviso se o elemento do formulário não for encontrado
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
    // Verifica se a URL do script está configurada
    if (!CLIENT_SHEET_URL) {
        console.error('URL da planilha (CLIENT_SHEET_URL) não configurada em perfil.js');
        document.getElementById('statusMessage').textContent = 'Erro: URL de salvamento não configurada.';
        return; // Interrompe a execução se a URL não estiver definida
    }

    // Verifica se temos o googleUserId (essencial para associar os dados)
    if (!googleUserId) {
        console.error('ID do Google não encontrado. O usuário precisa estar logado.');
        document.getElementById('statusMessage').textContent = 'Erro: ID do usuário não encontrado. Faça login novamente.';
        return; // Interrompe se não houver ID do usuário
    }

    // Adiciona o googleUserId ao objeto de dados que será enviado
    const dataToSend = {
        ...clientData, // Copia todos os dados do formulário
        googleUserId: googleUserId // Adiciona o ID do Google
    };

    console.log("Enviando dados para a planilha:", dataToSend); // Log para depuração
    document.getElementById('statusMessage').textContent = 'Salvando dados...'; // Feedback para o usuário

    // Faz a requisição POST para o Google Apps Script
    fetch(CLIENT_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors', // Importante: 'no-cors' é necessário para scripts do Google Apps Script se não configurados para CORS
        cache: 'no-cache', // Evita cache
        headers: {
            // Mesmo com 'no-cors', 'Content-Type' pode ser útil para o script do lado do servidor
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend) // Converte o objeto JS em uma string JSON
    })
    .then(response => {
        // Com 'no-cors', a resposta é opaca, não podemos ler status ou corpo.
        // Assumimos sucesso se não houver erro de rede.
        console.log('Dados enviados para o Google Apps Script (modo no-cors). A resposta é opaca.');
        document.getElementById('statusMessage').textContent = 'Dados salvos com sucesso!'; // Mensagem otimista
        // Idealmente, a confirmação viria de uma nova busca ou de uma resposta do script (se não usar no-cors)
    })
    .catch(error => {
        // Captura erros de rede (offline, DNS, etc.) ou bloqueios
        console.error('Erro ao enviar dados para a planilha:', error);
        document.getElementById('statusMessage').textContent = `Erro ao salvar: ${error.message}. Verifique a conexão.`;
        // Informa o usuário sobre o problema
    });
}


// --- Inicialização e Event Listeners ---

// Executa quando o conteúdo do DOM (HTML) estiver completamente carregado e analisado
document.addEventListener('DOMContentLoaded', () => {
    console.log("Perfil DOM carregado."); // Log para depuração
    const statusMessage = document.getElementById('statusMessage'); // Elemento para exibir mensagens

    // Tenta obter o token JWT armazenado no localStorage
    const storedToken = localStorage.getItem(USER_DATA_KEY);

    if (storedToken) {
        console.log("Token encontrado no localStorage."); // Log
        // Decodifica o token para obter os dados do usuário
        const decodedToken = jwtDecode(storedToken);

        if (decodedToken && decodedToken.sub) {
            // Se o token for válido e tiver o campo 'sub' (ID do Google)
            googleUserId = decodedToken.sub; // Armazena o ID do Google globalmente
            console.log("ID do Google obtido:", googleUserId); // Log

            // *** PONTO DE INTEGRAÇÃO PARA BUSCAR DADOS EXISTENTES ***
            // Chama a função para buscar os dados do cliente associados a este ID
            fetchClientData(googleUserId);
            // A função fetchClientData cuidará de preencher o formulário se encontrar dados

        } else {
            // Se o token for inválido, expirado ou não contiver o ID
            console.log("Token inválido, expirado ou sem 'sub'.");
            googleUserId = null; // Garante que o ID esteja nulo
            if (statusMessage) statusMessage.textContent = 'Sessão inválida ou expirada. Faça login novamente.';
            // Poderia redirecionar para o login ou limpar o formulário aqui
        }
    } else {
        // Se não houver token no localStorage
        console.log("Nenhum token encontrado no localStorage.");
        googleUserId = null;
        if (statusMessage) statusMessage.textContent = 'Você precisa estar logado para acessar o perfil.';
        // Desabilitar o formulário ou redirecionar pode ser apropriado aqui
        // Exemplo: document.getElementById('botao_enviar').disabled = true;
    }

    // Adiciona o listener ao botão 'Enviar' APÓS garantir que o DOM está pronto
    const sendButton = document.getElementById('botao_enviar');
    if (sendButton) {
        sendButton.addEventListener('click', () => {
            // Coleta os dados atuais do formulário
            const clientData = {
                // 'cliente': NÃO HÁ INPUT PARA NICKNAME NO HTML FORNECIDO. Adicionar se necessário.
                cpf: document.getElementById('input_cpf')?.value || '', // Usar || '' para evitar enviar 'undefined'
                tel: document.getElementById('input_telefone')?.value || '',
                cep: document.getElementById('input_cep')?.value || '',
                logradouro: document.getElementById('input_logradouro')?.value || '',
                cidade: document.getElementById('input_cidade')?.value || '',
                bairro: document.getElementById('input_bairro')?.value || '',
                estado: document.getElementById('input_estado')?.value || ''
                // Adicione outros campos conforme necessário
            };

            console.log('Dados coletados do formulário para envio:', clientData); // Log

            // Chama a função para salvar/atualizar os dados na planilha
            saveClientToSheet(clientData);
        });
    } else {
        console.error("Botão 'Enviar' (ID: botao_enviar) não encontrado.");
    }
});
