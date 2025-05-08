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
            localStorage.removeItem('googleUserDataToken');
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

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.success) {
            console.log('ImgBB Upload Response:', data);
            return data.data.url; // URL da imagem no ImgBB
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
    // IMPORTANTE: INSIRA A SUA API KEY DO IMGBB AQUI
    // Obtenha sua chave em: https://api.imgbb.com/
    const IMG_BB_API_KEY = '43ff22682bbe91ea89a32047a821bae8';
    // =====================================================================================


    // Configurações compartilhadas com perfil.js
    const USER_DATA_KEY_FROM_SCRIPT = 'googleUserDataToken';
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw1boPWweXlVIQPXdyt9vBFFcDwsuo438W5cPWgGnQTdqaZwMMfqYB4-j_nqs78yl99/exec';

    // Elementos da página
    const elements = {
        storeNameInput: document.getElementById('store_name_input'),
        storeCepInput: document.getElementById('store_cep_input'),
        saveButton: document.getElementById('save_button'),
        ordersLabel: document.querySelector('#orders_label .textstyle6'), // Seletor pode precisar de ajuste
        ordersButton: document.getElementById('orders_button'),
        productsButton: document.getElementById('products_button'),
        logoUpload: document.getElementById('logo_upload_image'),       // Elemento <img> para o logo
        backgroundUpload: document.getElementById('background_upload_image'), // Elemento <img> para o fundo
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
        window.location.href = 'login.html'; // Adapte para sua página de login
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
    // Adapte os redirecionamentos conforme suas páginas:
    // if(elements.ordersButton) elements.ordersButton.addEventListener('click', () => window.location.href = 'pedidos.html');
    // if(elements.productsButton) elements.productsButton.addEventListener('click', () => window.location.href = 'produtosdaloja.html');

    // Configuração do upload de imagens
    setupImageUpload('logo_upload_image', 'storeLogo');
    setupImageUpload('background_upload_image', 'storeBackground');

    async function handleSave() {
        const currentToken = localStorage.getItem(USER_DATA_KEY_FROM_SCRIPT);
        const currentUserData = jwtDecode_local(currentToken);

        if (!currentUserData?.sub) {
            alert('Sessão expirada. Faça login novamente.');
            window.location.href = 'login.html'; // Adapte
            return;
        }

        // Pega as URLs dos atributos 'data-imgbb-url' ou o src como fallback
        const logoUrlToSend = elements.logoUpload.dataset.imgbbUrl || elements.logoUpload.src;
        const backgroundUrlToSend = elements.backgroundUpload.dataset.imgbbUrl || elements.backgroundUpload.src;

        const storeData = {
            userId: currentUserData.sub,
            userEmail: currentUserData.email || '',
            storeName: elements.storeNameInput.value.replace('nome =', '').trim(),
            storeCep: elements.storeCepInput.value.replace('cep =', '').trim(),
            logoUrl: logoUrlToSend, // URL do ImgBB ou fallback
            backgroundUrl: backgroundUrlToSend, // URL do ImgBB ou fallback
            timestamp: new Date().toISOString()
        };

        // Salvar localmente com as URLs corretas
        localStorage.setItem('storeDataLocal', JSON.stringify({
            name: storeData.storeName,
            cep: storeData.storeCep,
            logo: logoUrlToSend,
            background: backgroundUrlToSend
            // Se você tiver 'orders' no localStorage, precisa preservar
        }));

        updateWelcomeMessage(storeData.storeName);
        checkOrders(); // Se esta função existir e for relevante
        sendDataToSheet(storeData);
    }

   async function sendDataToSheet(data) {
    console.log("Enviando para Google Sheet:", data);
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Mantido como no-cors, ciente das limitações
            headers: {'Content-Type': 'application/json'}, // Este header pode não ser enviado em no-cors
            body: JSON.stringify({ action: 'saveStore', ...data }) // Adicionando uma ação para o Apps Script
        });
        
        console.log('Requisição enviada para Google Sheet (resposta opaca devido ao no-cors)');
        alert('Dados da loja enviados! Verifique sua planilha.'); 
        
    } catch (error) {
        console.error('Erro ao salvar dados na planilha:', error);
        alert('Falha ao enviar dados para a planilha. Verifique sua conexão e a configuração do Google Apps Script.');
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
        // Implemente ou ajuste conforme sua lógica de pedidos
        if (!elements.ordersLabel) return;
        const storeDataLocal = JSON.parse(localStorage.getItem('storeDataLocal')) || {};
        const ordersCount = storeDataLocal.orders ? storeDataLocal.orders.length : 0;
        
        elements.ordersLabel.textContent = `Você tem (${ordersCount}) pedidos`;
    }

    function loadStoreData() {
        const storeData = JSON.parse(localStorage.getItem('storeDataLocal')) || {};
        
        if (storeData.name) {
            elements.storeNameInput.value = `nome = ${storeData.name}`;
        }
        
        if (storeData.cep) {
            elements.storeCepInput.value = `cep = ${storeData.cep}`;
        }
        
        // Carrega imagens e define data attributes
        if (storeData.logo && !storeData.logo.includes('drop_here.png')) {
            elements.logoUpload.src = storeData.logo;
            elements.logoUpload.dataset.imgbbUrl = storeData.logo; // Assume que o que está salvo é a URL final
        }
        
        if (storeData.background && !storeData.background.includes('drop_here.png')) {
            elements.backgroundUpload.src = storeData.background;
            elements.backgroundUpload.dataset.imgbbUrl = storeData.background; // Assume que o que está salvo é a URL final
        }
        
        updateWelcomeMessage(storeData.name);
        checkOrders();
    }

    function setupImageUpload(elementId, storageKey) {
        const uploadElement = document.getElementById(elementId); // Este é o elemento <img>
        if (!uploadElement) {
            console.error(`Elemento de upload ${elementId} não encontrado.`);
            return;
        }

        // Função interna para processar o arquivo
        async function processFile(file) {
            if (!file.type.startsWith('image/')) {
                alert('Selecione apenas arquivos de imagem!');
                return;
            }

            // 1. Mostrar preview local com Base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                uploadElement.src = e.target.result; // Mostra o preview local imediatamente

                // 2. Fazer upload para ImgBB
                if (!IMG_BB_API_KEY || IMG_BB_API_KEY === 'SUA_CHAVE_API_IMG_BB_AQUI') {
                    alert('IMPORTANTE: A API Key do ImgBB não está configurada no script (criarloja.js).\nA imagem será exibida localmente, mas não será enviada para o ImgBB nem salva corretamente na planilha.');
                    // Armazenar base64 como fallback se não houver API key ou falha
                    uploadElement.dataset.imgbbUrl = e.target.result; // Salva base64 temporariamente
                    // Atualizar localStorage com base64 como fallback
                    const storeData = JSON.parse(localStorage.getItem('storeDataLocal')) || {};
                    storeData[storageKey === 'storeLogo' ? 'logo' : 'background'] = e.target.result;
                    localStorage.setItem('storeDataLocal', JSON.stringify(storeData));
                    return;
                }
                
                // Mostra alguma indicação de carregamento
                const originalBorderStyle = uploadElement.style.border;
                uploadElement.style.border = '3px dashed #007bff'; // Azul para indicar processamento
                uploadElement.title = 'Enviando imagem...';

                const imgbbUrl = await uploadToImgBB(file, IMG_BB_API_KEY);
                
                uploadElement.style.border = originalBorderStyle; // Restaura a borda
                uploadElement.title = ''; // Limpa o title

                if (imgbbUrl) {
                    uploadElement.dataset.imgbbUrl = imgbbUrl; // Armazena a URL do ImgBB no dataset
                    uploadElement.src = imgbbUrl; // Atualiza o src da imagem para a URL do ImgBB (opcional, mas bom para consistência)
                    console.log(`Imagem enviada para ImgBB (${storageKey}): ${imgbbUrl}`);
                    
                    // Atualizar localStorage com a URL do ImgBB
                    const storeData = JSON.parse(localStorage.getItem('storeDataLocal')) || {};
                    storeData[storageKey === 'storeLogo' ? 'logo' : 'background'] = imgbbUrl;
                    localStorage.setItem('storeDataLocal', JSON.stringify(storeData));
                    alert(`Imagem (${storageKey}) enviada para o ImgBB com sucesso!`);
                } else {
                    // Se o upload falhar, o preview local (base64) já está no src.
                    // Mantém o base64 como fallback no dataset também.
                    uploadElement.dataset.imgbbUrl = e.target.result;
                    alert(`Falha ao enviar imagem (${storageKey}) para ImgBB. A imagem local (base64) será usada se você salvar agora.`);
                    // O localStorage já teria sido atualizado com base64 se a API key não estivesse presente,
                    // ou podemos forçar aqui se quisermos.
                    const storeData = JSON.parse(localStorage.getItem('storeDataLocal')) || {};
                    storeData[storageKey === 'storeLogo' ? 'logo' : 'background'] = e.target.result; // Garante fallback no localStorage
                    localStorage.setItem('storeDataLocal', JSON.stringify(storeData));
                }
            };
            reader.readAsDataURL(file); // Inicia a leitura para o preview local
        }

        // Handlers de drag and drop no elemento <img>
        uploadElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadElement.style.opacity = '0.7';
            uploadElement.style.border = '2px dashed #5A4ABC'; // Feedback visual
        });

        uploadElement.addEventListener('dragleave', () => {
            uploadElement.style.opacity = '1';
            uploadElement.style.border = 'none'; // Limpa feedback
        });

        uploadElement.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadElement.style.opacity = '1';
            uploadElement.style.border = 'none';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                await processFile(e.dataTransfer.files[0]);
            }
        });

        // Handler de clique no elemento <img> para abrir o seletor de arquivo
        uploadElement.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*'; // Aceita apenas imagens
            input.onchange = async (e) => {
                if (e.target.files && e.target.files[0]) {
                   await processFile(e.target.files[0]);
                }
            };
            input.click(); // Abre o diálogo de seleção de arquivo
        });
    }
});
