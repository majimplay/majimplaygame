// --- Configuration ---
const GOOGLE_SHEET_APP_URL = 'https://script.google.com/macros/s/AKfycbzsZTv9V5arv6AaUfrX3EuIrOa37vJIsU6tPlrY6hTsvihUOhR-qhgf4knwPX5SxRi5-Q/exec'; // Sua URL
const USER_DATA_KEY = 'googleUserData'; // Key for localStorage

// --- DOM Elements ---
const googleSignInButtonContainer = document.getElementById('googleSignInButtonContainer');
const userInfoDiv = document.getElementById('userInfo');
const userNameSpan = document.getElementById('userName');
const userEmailSpan = document.getElementById('userEmail');
const userPhotoImg = document.getElementById('userPhoto');
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
        userEmailSpan.textContent = userData.email || 'N/A';
        userPhotoImg.src = userData.picture || '';
        userInfoDiv.classList.remove('hidden');
        googleSignInButtonContainer.classList.add('hidden');
        statusMessageDiv.textContent = '';
    } else {
        userNameSpan.textContent = '';
        userEmailSpan.textContent = '';
        userPhotoImg.src = '';
        userPhotoImg.alt = 'Foto do Usuário';
        userInfoDiv.classList.add('hidden');
        googleSignInButtonContainer.classList.remove('hidden');
        statusMessageDiv.textContent = 'Você não está logado.';
    }
}

function saveToSheet(userData) {
    if (!GOOGLE_SHEET_APP_URL || GOOGLE_SHEET_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
        console.warn('Google Apps Script URL not configured. Skipping sheet save.');
        statusMessageDiv.textContent = 'Login bem-sucedido (salvamento em planilha desativado - URL não configurada).';
        return;
    }

    statusMessageDiv.textContent = 'Enviando dados para a planilha...'; // Mensagem ajustada
console.log(userData);
    fetch(GOOGLE_SHEET_APP_URL, {
        method: 'POST',
        // ***** MUDANÇA AQUI: usar 'no-cors' *****
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
            // Content-Type ainda é útil, mesmo que a resposta não seja lida
           'Content-Type': 'application/json',
        },
      body: JSON.stringify({
    name: userData.name,
    email: userData.email,
    picture: userData.picture,
    id: userData.id // Adicione o ID aqui
})
    })
    .then(response => {
        // Com 'no-cors', a resposta é sempre 'opaque' e não podemos ler o status ou corpo.
        // Assumimos que o envio foi bem-sucedido se não houver erro de rede imediato.
        console.log('Request sent to Apps Script (mode: no-cors). Response is opaque.');
        statusMessageDiv.textContent = 'Login bem-sucedido! (Dados enviados para planilha - verifique a planilha).';
        
        // Não podemos confirmar o sucesso real aqui, apenas que a requisição foi enviada.
    })
    .catch((error) => {
        // Erros aqui são geralmente problemas de rede (DNS, offline) ou bloqueios mais severos.
        console.error('Error sending data to Google Sheet (no-cors mode):', error);
        statusMessageDiv.textContent = `Login bem-sucedido, mas falha ao enviar dados para a planilha: ${error.message}. Verifique a conexão ou configurações de rede.`;
    });
}


function handleCredentialResponse(response) {
    const token = response.credential;
    const decodedToken = jwtDecode(token);

    if (decodedToken) {
        // Armazena apenas o token JWT
        localStorage.setItem(USER_DATA_KEY, token);
        
        // Atualiza UI com dados decodificados
        updateUI({
            name: decodedToken.name,
            email: decodedToken.email,
            picture: decodedToken.picture
        });
        
        // Envia dados para planilha
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
 document.getElementById('logoutButton').addEventListener('click', logout);
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

// --- Cadastro Manual ---
document.getElementById('submitUserButton').addEventListener('click', () => {
    const userData = {
        id: document.getElementById('inputId').value,
        name: document.getElementById('inputName').value,
        email: document.getElementById('inputEmail').value,
        picture: document.getElementById('inputPicture').value
    };

    // Limpa os campos após o cadastro
    document.querySelectorAll('#manualEntry input').forEach(input => input.value = '');
    
    // Envia para a planilha (mesma função do login Google)
    saveToSheet(userData);
    
    console.log('Dados enviados para teste:', userData); // Apenas para debug
});

if (GOOGLE_SHEET_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    console.warn('REMINDER: Replace YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL in script.js');
    statusMessageDiv.textContent = 'AVISO: A URL do Google Apps Script precisa ser configurada em script.js.';
}
