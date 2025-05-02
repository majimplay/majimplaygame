
// Adicione esta nova constante para a URL da planilha de clientes
    const CLIENT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwgmBp5z7GCTRfbHMs_a6SaxsTBzS7b7YNFdSxqjIvlIEROeoWzHVcgB6jRCa1Rcmax/exec';

// Adicione esta função para enviar dados do cliente
function saveClientToSheet(clientData) {
    if (!CLIENT_SHEET_URL) {
        console.error('URL da planilha de clientes não configurada');
        return;
    }

    fetch(CLIENT_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(clientData)
    })
    .then(() => {
        console.log('Dados do cliente enviados');
        document.getElementById('statusMessage').textContent = 'Dados salvos com sucesso!';
    })
    .catch(error => {
        console.error('Erro ao enviar dados do cliente:', error);
        document.getElementById('statusMessage').textContent = 'Erro ao salvar dados!';
    });
}

// Adicione este listener para o iframe de perfil
	


document.getElementById('button_2fe25639').addEventListener('click', () => {
    // Coleta os valores dos campos de entrada
   const client = {
    cliente: document.getElementById('edit_5f0116bc').value, 
    cpf: document.getElementById('edit_15ec8179').value,
    tel: document.getElementById('edit_4915d68c').value, 
    cep: document.getElementById('edit_30ba40bc').value,
    logradouro: document.getElementById('edit_65b495a2').value,
    cidade: document.getElementById('edit_3f14847d').value,
  //  estado: document.getElementById('edit_3f14847d').value, // Supondo que haja um campo para "Estado"
    bairro: document.getElementById('edit_7912be8c').value
};
    // Envia os dados para a planilha
    saveClientToSheet(client);
    console.log('Dados do cliente enviados:', client);
});
	
</script>
