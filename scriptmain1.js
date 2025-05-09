// --- Configuration ---
const GOOGLE_CLIENT_ID = '973179631050-iof6eqtfsi123m2nagdei5ov480bjgr4.apps.googleusercontent.com'
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
function initializeGoogleSignIn() {
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse // Função já existente
    });
     google.accounts.id.renderButton(
        document.getElementById('googleSignInButtonContainer'), // Container
        { 
            type: 'standard',
            theme: 'outline', 
            size: 'large', 
            text: 'signin_with', 
            shape: 'rectangular', 
            logo_alignment: 'left' 
        }
    );
       // Opcional: Exibe o One Tap prompt (ajuste conforme necessidade)
    // google.accounts.id.prompt(); 
}

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
    if (!userNameSpan || !userEmailSpan || !userPhotoImg) return;

    if (userData) {
        userNameSpan.textContent = userData.name || 'N/A';
        userEmailSpan.textContent = userData.email || 'N/A';
        userPhotoImg.src = userData.picture || '';
        userInfoDiv.classList.remove('hidden');
        googleSignInButtonContainer.classList.add('hidden');
    } else {
        userInfoDiv.classList.add('hidden');
        googleSignInButtonContainer.classList.remove('hidden');
    }
}
// --- Nova lógica para controle de iframes ---
// --- Controle de Iframes ---
function showIframe(iframeId) {
    document.querySelectorAll('.iframe-content').forEach(frame => {
        frame.classList.remove('active');
    });
    const targetFrame = document.getElementById(iframeId);
    if(targetFrame) targetFrame.classList.add('active');
}

// Event Listeners
document.getElementById('registo').addEventListener('click', () => showIframe('registoFrame'));
document.getElementById('conta').addEventListener('click', () => {
    if (localStorage.getItem(USER_DATA_KEY)) {
        showIframe('contaFrame');
    } else {
        statusMessageDiv.textContent = 'Faça login primeiro!';
    }
});

document.querySelectorAll('.aiframe-btn').forEach(btn => {
    btn.addEventListener('click', (e) => showIframe(e.target.dataset.iframe));
});


// Lógica para os botões genéricos de aiframe
document.querySelectorAll('.aiframe-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        showIframe(e.target.dataset.iframe);
    });
});
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
// Inicialização
window.addEventListener('load', () => {
    window.addEventListener('load', () => {
    initializeGoogleSignIn(); // Inicializa o Google Sign-In
    const storedToken = localStorage.getItem(USER_DATA_KEY);
    if (storedToken) {
        const decodedToken = jwtDecode(storedToken);
        decodedToken ? updateUI(decodedToken) : logout();
    }
});
});

if (GOOGLE_SHEET_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    console.warn('REMINDER: Replace YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL in script.js');
    statusMessageDiv.textContent = 'AVISO: A URL do Google Apps Script precisa ser configurada em script.js.';
}
