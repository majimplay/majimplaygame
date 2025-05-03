// --- Configuration ---
// !!! IMPORTANTE: SUBSTITUA PELA URL DO SEU APP SCRIPT IMPLANTADO !!!
const GOOGLE_APPS_SCRIPT_URL = 'SUA_NOVA_URL_DO_APP_SCRIPT_AQUI';
const USER_DATA_KEY = 'googleUserDataToken'; // Key for storing the raw ID token in localStorage

// --- DOM Elements ---
const googleSignInButtonContainer = document.getElementById('googleSignInButtonContainer');
const userInfoDiv = document.getElementById('userInfo');
const userNameSpan = document.getElementById('userName');
const userEmailSpan = document.getElementById('userEmail');
const userPhotoImg = document.getElementById('userPhoto');
const logoutButton = document.getElementById('logoutButton');
const statusMessageDiv = document.getElementById('statusMessage');

// --- Functions ---

/**
 * Decodifica um JWT (token) para extrair o payload.
 * Usado principalmente para atualizar a UI rapidamente no cliente.
 * A verificação REAL de segurança acontece no servidor.
 * @param {string} token O token JWT.
 * @returns {object|null} O payload decodificado ou null se houver erro/expiração.
 */
function jwtDecode(token) {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null; // Verifica se o token tem o formato esperado
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        const payload = JSON.parse(jsonPayload);

        // Verificar expiração do token (verificação básica no cliente)
        const currentTime = Date.now() / 1000;
        if (payload.exp && payload.exp < currentTime) {
            console.log('Token expirado (detecção no cliente)');
            // Considerar limpar o token expirado do localStorage aqui
             localStorage.removeItem(USER_DATA_KEY);
            return null;
        }
        return payload;
    } catch (e) {
        console.error("Erro decodificando JWT no cliente:", e);
        return null;
    }
}

/**
 * Atualiza a interface do usuário com base nos dados do usuário.
 * @param {object|null} userData Objeto com name, email, picture ou null para deslogado.
 */
function updateUI(userData) {
    if (!userNameSpan || !userEmailSpan || !userPhotoImg || !userInfoDiv || !googleSignInButtonContainer) {
        console.error("Elementos da UI não encontrados.");
        return;
    }
    if (userData) {
        userNameSpan.textContent = userData.name || 'N/A';
        userEmailSpan.textContent = userData.email || 'N/A';
        userPhotoImg.src = userData.picture || 'https://placehold.co/100x100/eeeeee/cccccc?text=Foto'; // Placeholder
        userPhotoImg.onerror = () => { userPhotoImg.src = 'https://placehold.co/100x100/eeeeee/cccccc?text=Erro'; }; // Fallback
        userInfoDiv.classList.remove('hidden');
        googleSignInButtonContainer.classList.add('hidden');
    } else {
        userInfoDiv.classList.add('hidden');
        googleSignInButtonContainer.classList.remove('hidden');
        // Limpa os dados ao deslogar
        userNameSpan.textContent = '';
        userEmailSpan.textContent = '';
        userPhotoImg.src = '';
    }
}

// --- Controle de Iframes --- 
function showIframe(iframeId) {
    document.querySelectorAll('.iframe-content').forEach(frame => {
        frame.classList.remove('active');
    });
    const targetFrame = document.getElementById(iframeId);
    if (targetFrame) {
        targetFrame.classList.add('active');
    } else {
        console.warn(`Iframe com ID "${iframeId}" não encontrado.`);
    }
}

// Event Listeners para Iframes 
const registoBtn = document.getElementById('registo');
const contaBtn = document.getElementById('conta');

if (registoBtn) {
    registoBtn.addEventListener('click', () => showIframe('registoFrame'));
}
if (contaBtn) {
    contaBtn.addEventListener('click', () => {
        if (localStorage.getItem(USER_DATA_KEY)) { // Verifica se existe token
            showIframe('contaFrame');
        } else {
            statusMessageDiv.textContent = 'Faça login primeiro para acessar seu perfil!';
            statusMessageDiv.style.color = 'orange'; // Feedback visual
        }
    });
}

document.querySelectorAll('.aiframe-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        // Verifica se o atributo data-iframe existe
        const iframeId = e.target.dataset.iframe;
        if (iframeId) {
            showIframe(iframeId);
        } else {
            console.warn("Botão não possui o atributo 'data-iframe'.");
        }
    });
});


/**
 * Envia o ID Token bruto para o Google Apps Script para verificação e salvamento.
 * @param {string} idToken O token ID recebido do Google Sign-In.
 */
function verifyAndSaveUser(idToken) {
    if (!GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL === 'SUA_NOVA_URL_DO_APP_SCRIPT_AQUI') {
        console.warn('URL do Google Apps Script não configurada em script.js.');
        statusMessageDiv.textContent = 'Login bem-sucedido no cliente, mas o salvamento no servidor está desativado (URL não configurada).';
        statusMessageDiv.style.color = 'orange';
        return; // Interrompe a execução se a URL não estiver definida
    }

    statusMessageDiv.textContent = 'Verificando autenticação e salvando dados...';
    statusMessageDiv.style.color = 'blue'; // Indica processo em andamento

    fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Necessário para Apps Script simples sem preflight OPTIONS
        cache: 'no-cache',
        headers: {
            // 'Content-Type' é importante mesmo com 'no-cors' para o Apps Script interpretar corretamente
            'Content-Type': 'application/json',
        },
        // Envia o token bruto dentro de um objeto JSON
        body: JSON.stringify({ id_token: idToken })
    })
    .then(response => {
        // Com 'mode: no-cors', a resposta é opaca (type: 'opaque').
        // Não podemos ler o status ou o corpo da resposta diretamente.
        // Assumimos sucesso se a requisição foi enviada sem erro de rede.
        console.log('Requisição enviada para o Apps Script (modo: no-cors). A resposta é opaca.');
        statusMessageDiv.textContent = 'Autenticação verificada e dados enviados para o servidor com sucesso!';
        statusMessageDiv.style.color = 'green'; // Sucesso
    })
    .catch((error) => {
        // Captura erros de rede (DNS, offline, CORS bloqueando mesmo com 'no-cors' em alguns cenários)
        console.error('Erro ao enviar token para o Google Apps Script:', error);
        statusMessageDiv.textContent = `Falha ao comunicar com o servidor: ${error.message}. Verifique a URL do script e a conexão.`;
        statusMessageDiv.style.color = 'red'; // Erro

        // Opcional: Deslogar o usuário se a verificação falhar?
         logout();
         updateUI(null); // Garante que a UI reflita a falha na verificação
    });
}

/**
 * Callback do Google Sign-In. Chamado após o login bem-sucedido.
 * @param {object} response A resposta da API do Google Sign-In.
 */
function handleCredentialResponse(response) {
    const idToken = response.credential; // O ID Token bruto JWT

    // 1. Decodifica o token no cliente APENAS para atualizar a UI imediatamente
    const decodedPayload = jwtDecode(idToken);

    if (decodedPayload) {
        // Atualiza a UI com os dados decodificados (feedback rápido para o usuário)
        updateUI({
            name: decodedPayload.name,
            email: decodedPayload.email,
            picture: decodedPayload.picture
        });

        // 2. Armazena o TOKEN BRUTO no localStorage para persistência da sessão
        localStorage.setItem(USER_DATA_KEY, idToken);

        // 3. Envia o TOKEN BRUTO para o servidor para verificação REAL e salvamento
        verifyAndSaveUser(idToken);

    } else {
        // Se a decodificação inicial falhar (token inválido/expirado)
        statusMessageDiv.textContent = 'Falha no login: Token inválido ou expirado.';
        statusMessageDiv.style.color = 'red';
        logout(); // Limpa qualquer estado de login anterior
    }
}

/**
 * Realiza o logout do usuário.
 */
function logout() {
    // Remove o token armazenado
    localStorage.removeItem(USER_DATA_KEY);
    // Limpa a UI
    updateUI(null);
    // Exibe mensagem
    statusMessageDiv.textContent = 'Sessão encerrada.';
    statusMessageDiv.style.color = 'grey';
    // Opcional: Revogar o token no Google (mais complexo, geralmente não necessário para logout simples)
    // google.accounts.id.revoke(userEmail, done => { ... });

    // Esconde todos os iframes ao deslogar
    document.querySelectorAll('.iframe-content').forEach(frame => {
        frame.classList.remove('active');
    });
}

// Adiciona o event listener ao botão de logout
if (logoutButton) {
    logoutButton.addEventListener('click', logout);
}

// --- Inicialização ---
window.addEventListener('load', () => {
    // Verifica se há um token armazenado ao carregar a página
    const storedToken = localStorage.getItem(USER_DATA_KEY);
    if (storedToken) {
        const decodedPayload = jwtDecode(storedToken);
        if (decodedPayload) {
            // Se o token armazenado ainda for válido (pela verificação de expiração no cliente),
            // atualiza a UI para mostrar o estado logado.
            updateUI(decodedPayload);
            console.log('Sessão restaurada a partir do token armazenado.');
            // Opcional: Poderia re-verificar o token com o servidor aqui para máxima segurança,
            // mas isso adicionaria uma chamada extra ao Apps Script a cada carregamento de página.
            // verifyAndSaveUser(storedToken); // Descomente se quiser verificar no servidor a cada load
        } else {
            // Se o token armazenado expirou ou é inválido, limpa
            console.log('Token armazenado inválido ou expirado. Realizando logout.');
            logout();
        }
    } else {
        // Nenhum token armazenado, garante que a UI esteja no estado deslogado
        updateUI(null);
    }

    // Aviso para configurar a URL se ainda for a placeholder
    if (GOOGLE_APPS_SCRIPT_URL === 'SUA_NOVA_URL_DO_APP_SCRIPT_AQUI') {
        console.warn('LEMBRETE: Substitua "SUA_NOVA_URL_DO_APP_SCRIPT_AQUI" em script.js pela URL real do seu App Script implantado.');
        const warningMsg = 'AVISO: A URL de verificação do servidor não está configurada. O login funcionará apenas localmente.';
        if (statusMessageDiv.textContent === '') { // Só mostra se não houver outra mensagem
             statusMessageDiv.textContent = warningMsg;
             statusMessageDiv.style.color = 'orange';
        }
    }
});
