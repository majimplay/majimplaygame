// --- Configuration ---
const GOOGLE_SHEET_APP_URL = 'https://script.google.com/macros/s/AKfycbzsZTv9V5arv6AaUfrX3EuIrOa37vJIsU6tPlrY6hTsvihUOhR-qhgf4knwPX5SxRi5-Q/exec'; // Sua URL
const USER_DATA_KEY = 'googleUserData'; // Key for localStorage

// --- DOM Elements ---
const deslogadoDiv = document.getElementById('deslogado');
const logadoDiv = document.getElementById('logado');
const userNameSpan = document.getElementById('userName');
const logoutButton = document.getElementById('logoutButton');
const statusMessageDiv = document.getElementById('statusMessage');

// --- Functions ---

function jwtDecode(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        
        const payload = JSON.parse(jsonPayload);
        // Verificar expiração do token
        const currentTime = Date.now() / 1000;
        if (payload.exp && payload.exp < currentTime) {
            console.log('Token expirado');
            return null;
        }
        return payload;
    } catch (e) {
        console.error("Erro decodificando JWT:", e);
        return null;
    }
}

function updateUI(userData) {
    if (userData) {
        userNameSpan.textContent = userData.name || 'N/A';
        logadoDiv.classList.remove('hidden');
        deslogadoDiv.classList.add('hidden');
        statusMessageDiv.textContent = '';
    } else {
        userNameSpan.textContent = '';
        logadoDiv.classList.add('hidden');
        deslogadoDiv.classList.remove('hidden');
        statusMessageDiv.textContent = 'Você não está logado.';
    }
}

function saveToSheet(userData) {
    if (!GOOGLE_SHEET_APP_URL || GOOGLE_SHEET_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
        console.warn('Google Apps Script URL not configured. Skipping sheet save.');
        statusMessageDiv.textContent = 'Login bem-sucedido (salvamento em planilha desativado - URL não configurada).';
        return;
    }

    statusMessageDiv.textContent = 'Enviando dados para a planilha...';
    fetch(GOOGLE_SHEET_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: userData.name,
            email: userData.email,
            picture: userData.picture,
            id: userData.id
        })
    })
    .then(response => {
        console.log('Request sent to Apps Script (mode: no-cors). Response is opaque.');
        statusMessageDiv.textContent = 'Login bem-sucedido! (Dados enviados para planilha - verifique a planilha).';
    })
    .catch((error) => {
        console.error('Error sending data to Google Sheet (no-cors mode):', error);
        statusMessageDiv.textContent = `Login bem-sucedido, mas falha ao enviar dados para a planilha: ${error.message}. Verifique a conexão ou configurações de rede.`;
    });
}

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

function logout() {
    localStorage.removeItem(USER_DATA_KEY);
    updateUI(null);
    statusMessageDiv.textContent = 'Sessão encerrada.';
}

// --- Initialization ---
window.addEventListener('load', () => {
    const storedToken = localStorage.getItem(USER_DATA_KEY);
    
    if (storedToken) {
        const decodedToken = jwtDecode(storedToken);
        if (decodedToken) {
            updateUI({
                name: decodedToken.name,
                email: decodedToken.email,
                picture: decodedToken.picture
            });
        } else {
            logout();
        }
    } else {
        updateUI(null);
    }
});

if (GOOGLE_SHEET_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    console.warn('REMINDER: Replace YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL in script.js');
    statusMessageDiv.textContent = 'AVISO: A URL do Google Apps Script precisa ser configurada em script.js.';
}

// Configurar o callback para o botão de login do Google
window.onGoogleLibraryLoad = () => {
    google.accounts.id.initialize({
        client_id: '21514234895-keiqos567ifvs4hjkg3l1q5mvun8lri0.apps.googleusercontent.com',
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById('g_id_onload'),
        { theme: 'outline', size: 'large' }
    );
};
