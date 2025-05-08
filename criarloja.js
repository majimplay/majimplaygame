// Funcao para decodificar JWT (compatível com perfil.js)
function jwtDecode_local(token) {
    try {
        if (!token) {
            console.log('Nenhum token fornecido para decodificação.');
            return null;
        }
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error("Token JWT inválido: estrutura incorreta.");
            return null;
        }
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));

        const payload = JSON.parse(jsonPayload);

        const currentTime = Date.now() / 1000;
        if (payload.exp && payload.exp < currentTime) {
            console.log('Token expirado (detectado no cliente):', new Date(payload.exp * 1000));
            localStorage.removeItem('googleUserDataToken'); // Mantido para gerenciamento de sessão
            return null;
        }

        if (!payload.sub) {
             console.error("Token decodificado não contém 'sub' (ID do usuário).");
             return null;
        }
        console.log('Token decodificado com sucesso:', payload);
        return payload;
    } catch (e) {
        console.error("Erro decodificando JWT:", e);
        return null;
    }
}

// Função para fazer upload de imagem para o ImgBB
async function uploadToImgBB(file, apiKey) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('album', '2SGYcL');
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.success) {
            console.log('ImgBB Upload Response:', data);
            return data.data.url;
        } else {
            console.error('Erro no upload para ImgBB:', data.error.message);
            alert(`Erro ao enviar imagem para o ImgBB: ${data.error.message}`);
            return null;
        }
    } catch (error) {
        console.error('Erro de rede ao enviar para ImgBB:', error);
        alert('Erro de rede ao enviar imagem para o ImgBB. Verifique sua conexão e a API Key.');
        return null;
    }
}


// Script para a página de criação de loja
document.addEventListener('DOMContentLoaded', function() {
    // =====================================================================================
    const IMG_BB_API_KEY = '43ff22682bbe91ea89a32047a821bae8'; // SUA API KEY AQUI
    // =====================================================================================

    // Configurações compartilhadas
    const USER_DATA_KEY_FROM_SCRIPT = 'googleUserDataToken';
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw1boPWweXlVIQPXdyt9vBFFcDwsuo438W5cPWgGnQTdqaZwMMfqYB4-j_nqs78yl99/exec';

    // Elementos da página
    const elements = {
        storeNameInput: document.getElementById('store_name_input'),
        storeCepInput: document.getElementById('store_cep_input'),
        saveButton: document.getElementById('save_button'),
        ordersLabel: document.querySelector('#orders_label .textstyle6'),
        ordersButton: document.getElementById('orders_button'),
        productsButton: document.getElementById('products_button'),
        logoUpload: document.getElementById('logo_upload_image'),
        backgroundUpload: document.getElementById('background_upload_image'),
        welcomeLabel: document.getElementById('welcome_label')
    };

    // Verificar elementos essenciais
    if (!elements.saveButton || !elements.storeNameInput || !elements.storeCepInput || !elements.logoUpload || !elements.backgroundUpload) {
        console.error('Elementos essenciais não encontrados! Verifique os IDs no HTML.');
        alert('Erro na configuração da página. Alguns elementos não foram encontrados.');
        return;
    }

    // Verificação inicial de autenticação
    const authToken = localStorage.getItem(USER_DATA_KEY_FROM_SCRIPT);
    const userData = jwtDecode_local(authToken);

    if (!userData?.sub) {
        alert('Sessão expirada ou não autenticado. Redirecionando para login...');
        return;
    }

    // Configuração inicial
    console.log('Usuário logado:', userData);
    if(elements.welcomeLabel) {
      elements.welcomeLabel.innerHTML = `Bem vindo, ${userData.name || userData.email || 'usuário'}! Crie sua loja`;
    }
    loadStoreData();

    // Event Listeners
    elements.saveButton.addEventListener('click', handleSave);

    // Configuração do upload de imagens
    setupImageUpload('logo_upload_image', 'storeLogo');
    setupImageUpload('background_upload_image', 'storeBackground');

    async function handleSave() {
        const currentToken = localStorage.getItem(USER_DATA_KEY_FROM_SCRIPT);
        const currentUserData = jwtDecode_local(currentToken);

        if (!currentUserData?.sub) {
            alert('Sessão expirada. Faça login novamente.');
            return;
        }

        // Obtém URLs das imagens
        const logoUrlToSend = elements.logoUpload.dataset.imgbbUrl || elements.logoUpload.src;
        const backgroundUrlToSend = elements.backgroundUpload.dataset.imgbbUrl || elements.backgroundUpload.src;

        const storeData = {
            userId: currentUserData.sub,
            userEmail: currentUserData.email || '',
            storeName: elements.storeNameInput.value.replace('nome =', '').trim(),
            storeCep: elements.storeCepInput.value.replace('cep =', '').trim(),
            logoUrl: logoUrlToSend,
            backgroundUrl: backgroundUrlToSend
        };

        updateWelcomeMessage(storeData.storeName);
        checkOrders();
        sendDataToSheet(storeData);
    }

    async function sendDataToSheet(data) {
        console.log("Enviando para Google Sheet:", data);
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ action: 'saveStore', ...data })
            });
            console.log('Requisição enviada para Google Sheet');
            alert('Dados da loja enviados! Verifique sua planilha.'); 
        } catch (error) {
            console.error('Erro ao salvar dados na planilha:', error);
            alert('Falha ao enviar dados para a planilha.');
        }
    }

    function updateWelcomeMessage(storeName) {
        if (!elements.welcomeLabel) return;
        const userName = userData.name || userData.email || 'usuário';
        elements.welcomeLabel.innerHTML = storeName 
            ? `Bem vindo, ${userName}!<br/>Sua loja: ${storeName}`
            : `Bem vindo, ${userName}!<br/>Crie sua loja`;
    }

    function checkOrders() {
        if (!elements.ordersLabel) return;
        elements.ordersLabel.textContent = 'Você tem (0) pedidos'; // Valor estático
    }

    function loadStoreData() {
        // Reseta todos os campos para valores padrão
        elements.storeNameInput.value = 'nome = ';
        elements.storeCepInput.value = 'cep = ';
        elements.logoUpload.src = 'rc_images/drop_here.png';
        elements.backgroundUpload.src = 'rc_images/drop_here.png';
        updateWelcomeMessage('');
        checkOrders();
    }

    function setupImageUpload(elementId, storageKey) {
        const uploadElement = document.getElementById(elementId);
        if (!uploadElement) {
            console.error(`Elemento de upload ${elementId} não encontrado.`);
            return;
        }

        async function processFile(file) {
            if (!file.type.startsWith('image/')) {
                alert('Selecione apenas arquivos de imagem!');
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                uploadElement.src = e.target.result;

                if (!IMG_BB_API_KEY || IMG_BB_API_KEY === 'SUA_CHAVE_API_IMG_BB_AQUI') {
                    alert('API Key do ImgBB não configurada!');
                    uploadElement.dataset.imgbbUrl = e.target.result;
                    return;
                }
                
                uploadElement.style.border = '3px dashed #007bff';
                uploadElement.title = 'Enviando imagem...';

                const imgbbUrl = await uploadToImgBB(file, IMG_BB_API_KEY);
                
                uploadElement.style.border = '';
                uploadElement.title = '';

                if (imgbbUrl) {
                    uploadElement.dataset.imgbbUrl = imgbbUrl;
                    uploadElement.src = imgbbUrl;
                    alert('Imagem enviada com sucesso!');
                } else {
                    uploadElement.dataset.imgbbUrl = e.target.result;
                    alert('Falha no upload. Usando imagem local temporária.');
                }
            };
            reader.readAsDataURL(file);
        }

        // Handlers de drag and drop e clique
        uploadElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadElement.style.opacity = '0.7';
            uploadElement.style.border = '2px dashed #5A4ABC';
        });

        uploadElement.addEventListener('dragleave', () => {
            uploadElement.style.opacity = '1';
            uploadElement.style.border = 'none';
        });

        uploadElement.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadElement.style.opacity = '1';
            uploadElement.style.border = 'none';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                await processFile(e.dataTransfer.files[0]);
            }
        });

        uploadElement.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                if (e.target.files && e.target.files[0]) {
                   await processFile(e.target.files[0]);
                }
            };
            input.click();
        });
    }
});
