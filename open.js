// --- Configuration ---
const GOOGLE_SHEET_APP_URL = 'https://script.google.com/macros/s/AKfycbzsZTv9V5arv6AaUfrX3EuIrOa37vJIsU6tPlrY6hTsvihUOhR-qhgf4knwPX5SxRi5-Q/exec';
const USER_DATA_KEY = 'googleUserData';

// --- DOM Elements ---
const googleSignInButtonContainer = document.getElementById('googleSignInButtonContainer');
const userInfoDiv = document.getElementById('userInfo');
const userNameSpan = document.getElementById('userName');
const userEmailSpan = document.getElementById('userEmail');
const userPhotoImg = document.getElementById('userPhoto');
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

// --- Verificar Login ao Carregar a Página ---
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
            localStorage.removeItem(USER_DATA_KEY);
            updateUI(null);
            statusMessageDiv.textContent = 'Sessão expirada. Faça login novamente.';
        }
    } else {
        updateUI(null);
    }
});
