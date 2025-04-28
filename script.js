// --- Configuration ---
                              
const GOOGLE_SHEET_APP_URL = 'https://script.google.com/macros/s/AKfycbxT0lRcYN51cZs5m1L9I8Aro4ZKWMDBMGG_Hdk05flk4mWi4IQAwgY6ToD7pVFijP6c3g/exec'; // Sua URL
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
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decoding JWT:", e);
        return null;
    }
}

function updateUI(userData) {
    if (userData) {
        userNameSpan.textContent = userData.name || 'N/A';
        userEmailSpan.textContent = userData.email || 'N/A';
        userPhotoImg.src = userData.picture || '';
        userPhotoImg.alt = `Foto de ${userData.name || 'Usuário'}`;
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

    fetch(GOOGLE_SHEET_APP_URL, {
        method: 'POST',
        // ***** MUDANÇA AQUI: Tentar 'no-cors' *****
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
            // Content-Type ainda é útil, mesmo que a resposta não seja lida
           'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            picture: userData.picture
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
    console.log("Encoded JWT ID token: " + response.credential);
    const decodedToken = jwtDecode(response.credential);

    if (decodedToken) {
        console.log("Decoded JWT Payload:", decodedToken);
        const userData = {
           id: decodedToken.sub,
            name: decodedToken.name,
            email: decodedToken.email,
            picture: decodedToken.picture,
        };
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        updateUI(userData);
        saveToSheet(userData); // Chama o salvamento
    } else {
        console.error("Failed to decode token.");
        statusMessageDiv.textContent = 'Falha ao processar o login. Tente novamente.';
    }
}

function logout() {
    localStorage.removeItem(USER_DATA_KEY);
    // google.accounts.id.disableAutoSelect(); // Opcional
    updateUI(null);
    statusMessageDiv.textContent = 'Você saiu com sucesso.';
    console.log("User logged out.");
}

// --- Initialization ---
logoutButton.addEventListener('click', logout);

window.addEventListener('load', () => {
    const storedData = localStorage.getItem(USER_DATA_KEY);
    if (storedData) {
        try {
            const userData = JSON.parse(storedData);
            console.log("Found stored user data. Restoring session.", userData);
            updateUI(userData);
        } catch (e) {
            console.error("Error parsing stored user data:", e);
            localStorage.removeItem(USER_DATA_KEY);
            updateUI(null);
        }
    } else {
        console.log("No stored user data found.");
        updateUI(null);
    }
});

if (GOOGLE_SHEET_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    console.warn('REMINDER: Replace YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL in script.js');
    statusMessageDiv.textContent = 'AVISO: A URL do Google Apps Script precisa ser configurada em script.js.';
}
//botao enviar 
document.getElementById('submitUserButton').addEventListener('click', function() {
    // Coletar dados dos inputs
    const userData = {
        id: document.getElementById('inputId').value.trim(),
        name: document.getElementById('inputName').value.trim(),
        email: document.getElementById('inputEmail').value.trim(),
        picture: document.getElementById('inputPicture').value.trim()
    };

    // Validação básica
    if (!userData.id || !userData.name || !userData.email) {
        statusMessageDiv.textContent = 'Erro: Preencha pelo menos ID, Nome e Email.';
        statusMessageDiv.style.color = 'red';
        return;
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
        statusMessageDiv.textContent = 'Erro: Formato de email inválido.';
        statusMessageDiv.style.color = 'red';
        return;
    }

    // Enviar dados para a planilha
    saveToSheet(userData);
    
    // Feedback visual e limpeza dos campos
    statusMessageDiv.textContent = 'Dados enviados para a planilha!';
    statusMessageDiv.style.color = 'green';
    
    // Limpar campos
    document.querySelectorAll('#manualEntry input').forEach(input => {
        input.value = '';
    });
});    //botao enviar fim 
