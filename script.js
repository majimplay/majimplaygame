// --- Configuration ---
// IMPORTANT: Replace with your actual Google Apps Script Web App URL
const GOOGLE_SHEET_APP_URL = 'https://script.google.com/macros/s/AKfycbyn95MNi06Ec5ZhnsxMLUpLLKULY4nfjrLDTyj0Jhy2-JpU0ilZI_T9Vxi1aPyYVZkzDg/exec'; // <-- SUA URL REAL AQUI (Parece correta)
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

/**
 * Decodes the JWT token from Google Sign-In.
 * NOTE: This is a basic decoder for the payload, sufficient for getting profile info.
 * It does NOT validate the signature (which should ideally be done server-side).
 * For client-side use with Google Identity Services, Google guarantees the token's
 * integrity when delivered directly to your registered callback.
 */
function jwtDecode(token) {
    try {
        const base64Url = token.split('.')[1]; // Get the payload part
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

/**
 * Updates the UI based on login status.
 * @param {object|null} userData - The user data object or null if logged out.
 */
function updateUI(userData) {
    if (userData) {
        // User is logged in
        userNameSpan.textContent = userData.name || 'N/A';
        userEmailSpan.textContent = userData.email || 'N/A';
        userPhotoImg.src = userData.picture || ''; // Use picture URL
        userPhotoImg.alt = `Foto de ${userData.name || 'Usuário'}`;

        userInfoDiv.classList.remove('hidden');
        googleSignInButtonContainer.classList.add('hidden');
        statusMessageDiv.textContent = ''; // Clear status
    } else {
        // User is logged out
        userNameSpan.textContent = '';
        userEmailSpan.textContent = '';
        userPhotoImg.src = '';
        userPhotoImg.alt = 'Foto do Usuário';

        userInfoDiv.classList.add('hidden');
        googleSignInButtonContainer.classList.remove('hidden');
        statusMessageDiv.textContent = 'Você não está logado.';
    }
}

/**
 * Saves user data to Google Sheet via Apps Script Web App.
 * @param {object} userData - The user data object.
 */
function saveToSheet(userData) {
    // ***** CORREÇÃO AQUI *****
    // Verifica se a URL está vazia OU se ainda é a string de exemplo original
    if (!GOOGLE_SHEET_APP_URL || GOOGLE_SHEET_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
        console.warn('Google Apps Script URL not configured. Skipping sheet save.');
        statusMessageDiv.textContent = 'Login bem-sucedido (salvamento em planilha desativado - URL não configurada).';
        return; // Interrompe a função se a URL não estiver configurada corretamente
    }

    statusMessageDiv.textContent = 'Salvando dados na planilha...';

    fetch(GOOGLE_SHEET_APP_URL, {
        method: 'POST',
        mode: 'cors', // 'cors' é geralmente preferível se o Apps Script estiver configurado para isso
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
        // Envia apenas os dados necessários para a planilha
        body: JSON.stringify({
            name: userData.name,
            email: userData.email,
            picture: userData.picture
         })
    })
    .then(response => {
        // Se o modo for 'no-cors', a resposta será opaca, não podemos ler o corpo
        if (response.type === 'opaque') {
             console.log('Request sent to Apps Script (no-cors). Assume success.');
             // Como não podemos ler a resposta, assumimos sucesso para salvar na planilha.
             return { status: 'success', message: 'Data likely saved (no-cors response).' };
        }
        // Se o modo for 'cors', verificamos se a resposta está ok
        if (response.ok) {
             return response.json(); // Tenta analisar a resposta JSON do Apps Script
        }
        // Se a resposta não estiver ok e não for opaca, lança um erro
        throw new Error(`Network response was not ok: ${response.statusText} (Status: ${response.status})`);

    })
    .then(data => {
        console.log('Apps Script Response:', data);
        if (data && data.status === 'success') {
            // Mensagem mais clara se a resposta foi 'no-cors'
            if (data.message && data.message.includes('no-cors response')) {
                 statusMessageDiv.textContent = 'Login bem-sucedido! (Dados enviados para planilha).';
            } else {
                 statusMessageDiv.textContent = 'Login bem-sucedido e dados salvos!';
            }
        } else {
            // Se houve um erro reportado pelo Apps Script (mesmo com resposta OK)
            statusMessageDiv.textContent = `Login bem-sucedido, mas erro ao salvar na planilha: ${data ? data.message : 'Resposta inesperada do script.'}`;
        }
    })
    .catch((error) => {
        console.error('Error sending data to Google Sheet:', error);
        // Fornece mais detalhes sobre o erro de rede, se possível
        statusMessageDiv.textContent = `Login bem-sucedido, mas falha ao conectar com a planilha: ${error.message}`;
        // Dica adicional em caso de erro de CORS
        if (error.message.toLowerCase().includes('cors')) {
             statusMessageDiv.textContent += ' Verifique as configurações de CORS ou tente mudar o modo para "no-cors" no fetch.';
        }
         // Dica adicional em caso de erro 4xx/5xx
        if (error.message.includes('Status:')) {
             statusMessageDiv.textContent += ' Verifique se a URL do Apps Script está correta e se a implantação está ativa com acesso para "Qualquer pessoa".';
        }
    });
}


/**
 * Handles the response from Google Sign-In.
 * @param {object} response - The credential response object from Google.
 */
function handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);
    const decodedToken = jwtDecode(response.credential);

    if (decodedToken) {
        console.log("Decoded JWT Payload:", decodedToken);
        const userData = {
            name: decodedToken.name,
            email: decodedToken.email,
            picture: decodedToken.picture,
            // Você pode adicionar outros campos como sub (ID do usuário), given_name, family_name etc.
        };

        // --- Persist Login ---
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

        // --- Update UI ---
        updateUI(userData);

        // --- Save to Sheet ---
        saveToSheet(userData);

    } else {
        console.error("Failed to decode token.");
        statusMessageDiv.textContent = 'Falha ao processar o login. Tente novamente.';
    }
}

/**
 * Logs the user out.
 */
function logout() {
    // --- Clear Persistent Data ---
    localStorage.removeItem(USER_DATA_KEY);

    // --- Optional: Disable Google automatic sign-in for the next visit ---
    // google.accounts.id.disableAutoSelect(); // Descomente se usar recursos de login automático

    // --- Update UI ---
    updateUI(null); // Passa null para mostrar o estado de logout
    statusMessageDiv.textContent = 'Você saiu com sucesso.';
    console.log("User logged out.");
}

// --- Initialization ---

// Add event listener for the logout button
logoutButton.addEventListener('click', logout);

// Check for existing session on page load
window.addEventListener('load', () => {
    const storedData = localStorage.getItem(USER_DATA_KEY);
    if (storedData) {
        try {
            const userData = JSON.parse(storedData);
            console.log("Found stored user data. Restoring session.", userData);
            updateUI(userData); // Update UI with stored data
        } catch (e) {
            console.error("Error parsing stored user data:", e);
            localStorage.removeItem(USER_DATA_KEY); // Clear corrupted data
            updateUI(null); // Show logged-out state
        }
    } else {
        console.log("No stored user data found.");
        updateUI(null); // Ensure logged-out state is shown initially
    }
    // Google Identity Services library is loaded asynchronously.
    // The button rendering and callback assignment happen via the attributes
    // in the HTML ('g_id_onload', 'g_id_signin').
});

// ***** CORREÇÃO AQUI *****
// Verifica se a URL ainda é a string de exemplo original
if (GOOGLE_SHEET_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    console.warn('REMINDER: Replace YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL in script.js');
    // Opcionalmente, desabilitar o botão ou mostrar uma mensagem se não configurado
    statusMessageDiv.textContent = 'AVISO: A URL do Google Apps Script precisa ser configurada em script.js.';
}

