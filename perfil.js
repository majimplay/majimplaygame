const CLIENT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwgmBp5z7GCTRfbHMs_a6SaxsTBzS7b7YNFdSxqjIvlIEROeoWzHVcgB6jRCa1Rcmax/exec';

// Função para enviar dados para a planilha
function saveClientToSheet(clientData) {
    if (!CLIENT_SHEET_URL) {
        console.error('URL da planilha não configurada');
        return;
    }

    fetch(CLIENT_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(clientData)
    })
    .then(() => {
        console.log('Dados enviados com sucesso');
        document.getElementById('statusMessage').textContent = 'Dados salvos!';
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('statusMessage').textContent = 'Erro ao salvar!';
    });
}

// Evento de clique no botão "Enviar"
document.getElementById('botao_enviar').addEventListener('click', () => {
    const client = {
        cliente: document.getElementById('input_cpf').value, // Ajuste conforme necessidade
        cpf: document.getElementById('input_cpf').value,
        tel: document.getElementById('input_telefone').value,
        cep: document.getElementById('input_cep').value,
        logradouro: document.getElementById('input_logradouro').value,
        cidade: document.getElementById('input_cidade').value,
        bairro: document.getElementById('input_bairro').value,
        estado: document.getElementById('input_estado').value
    };

    saveClientToSheet(client);
    console.log('Dados coletados:', client);
});
