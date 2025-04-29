// --- Configuration ---
const GOOGLE_SHEET_APP_URL = 'https://script.google.com/macros/s/AKfycbzsZTv9V5arv6AaUfrX3EuIrOa37vJIsU6tPlrY6hTsvihUOhR-qhgf4knwPX5SxRi5-Q/exec';
const USER_DATA_KEY = 'googleUserData';

// --- DOM Elements ---
const logoutButton = document.getElementById('logoutButton');
const statusMessageDiv = document.getElementById('statusMessage');

// --- Função de Login com Google ---
function handleCredentialResponse(response) {
    const token = response.credential;
    const decodedToken = jwtDecode(token);

    if (decodedToken) {
        localStorage.setItem(USER_DATA_KEY, token);
        updateUI({
            name: decodedToken.name,
            email: decodedToken.email,
            picture: decodedToken.picture
        });
        saveToSheet({
            id: decodedToken.sub,
            name: decodedToken.name,
            email: decodedToken.email,
            picture: decodedToken.picture
        });
    } else {
        statusMessageDiv.textContent = 'Falha no login. Token inválido ou expirado.';
    }
}

// --- Salvar Dados na Planilha ---
function saveToSheet(userData) {
    if (!GOOGLE_SHEET_APP_URL || GOOGLE_SHEET_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
        console.warn('URL do Google Apps Script não configurada.');
        statusMessageDiv.textContent = 'Login bem-sucedido (salvamento em planilha desativado).';
        return;
    }

    fetch(GOOGLE_SHEET_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    })
    .then(() => statusMessageDiv.textContent = 'Dados enviados para a planilha!')
    .catch(error => {
        console.error('Erro:', error);
        statusMessageDiv.textContent = 'Erro ao enviar dados para a planilha.';
    });
}

// --- Logout ---
function logout() {
    localStorage.removeItem(USER_DATA_KEY);
    updateUI(null);
    statusMessageDiv.textContent = 'Sessão encerrada.';
}

// --- Event Listeners ---
logoutButton.addEventListener('click', logout);

// --- Verificar Configuração da Planilha ---
if (GOOGLE_SHEET_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    statusMessageDiv.textContent = 'Configure a URL do Google Apps Script em login.js';
}
