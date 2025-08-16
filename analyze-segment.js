// analyze-segment.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Contas para análise
const accounts = [
  { email: 'timid-await-untidy@duck.com', password: 'Alisson0909jj' },
  { email: 'fit-manmade-skater@duck.com', password: 'Alisson0909jj' },
  { email: 'rack-growl-gone@duck.com', password: 'Alisson0909jj' },
  { email: 'blimp-diocese-race@duck.com', password: 'Alisson0909jj' },
  { email: 'quail-scandal-lent@duck.com', password: 'Alisson0909jj' }
];

async function analyzeSegment(segmentNumber, accountId) {
  const account = accounts[accountId];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`Analisando segmento ${segmentNumber} com conta ${accountId}: ${account.email}`);

    // Fazer login na conta
    await page.goto('https://chat.qwen.ai/auth?action=signin');
    await page.waitForLoadState('networkidle');

    // Inserir email
    await page.fill('input[type="email"][name="email"]', account.email);
    
    // Inserir senha
    await page.fill('input[type="password"]', account.password);
    
    // Clicar para fazer login
    await page.click('button[type="submit"]');
    await page.waitForURL('**/chat.qwen.ai/**', { timeout: 30000 });

    // Aguardar carregar a página principal
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Clicar no botão de adicionar (ícone de plus)
    await page.click('.icon-line-plus-03');
    await page.waitForTimeout(1000);

    // Clicar em "Carregar vídeo"
    await page.click('div[role="menuitem"] button:has(.icon-line-video-up-01)');
    await page.waitForTimeout(1000);

    // Upload do arquivo de vídeo
    const videoFile = `segment_${segmentNumber}.mp4`;
    const filePath = path.resolve(videoFile);
    
    // Encontrar o input de arquivo (geralmente hidden)
    const fileInput = await page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(filePath);
    
    // Aguardar o upload ser processado
    await page.waitForTimeout(5000);

    // Inserir a pergunta no textarea
    await page.fill('#chat-input', 'o que está acontecendo no video?');
    
    // Enviar mensagem
    await page.click('.icon-line-arrow-up');
    
    // Aguardar resposta (2 minutos)
    console.log(`Aguardando resposta da IA para segmento ${segmentNumber}...`);
    await page.waitForTimeout(120000); // 2 minutos

    // Aguardar a resposta aparecer completamente
    await page.waitForSelector('#response-message-body', { timeout: 30000 });
    
    // Aguardar um pouco mais para garantir que a resposta foi totalmente carregada
    await page.waitForTimeout(10000);

    // Extrair o texto da resposta
    let responseText = '';
    try {
      // Tentar usar o botão de copiar primeiro (mais confiável)
      const copyButton = page.locator('.copy-response-button').first();
      if (await copyButton.isVisible()) {
        await copyButton.click();
        await page.waitForTimeout(1000);
        
        // Tentar obter o texto do clipboard
        responseText = await page.evaluate(async () => {
          try {
            return await navigator.clipboard.readText();
          } catch (error) {
            return null;
          }
        });
      }
      
      // Se não conseguiu pelo clipboard, extrair diretamente do DOM
      if (!responseText) {
        responseText = await page.textContent('#response-message-body .markdown-content-container');
      }
      
      if (!responseText) {
        responseText = await page.textContent('#response-message-body');
      }
      
    } catch (error) {
      console.error(`Erro ao extrair resposta do segmento ${segmentNumber}:`, error);
      responseText = `Erro ao extrair resposta: ${error.message}`;
    }

    // Criar arquivo de análise
    const analysisContent = `SEGMENTO ${segmentNumber} (${segmentNumber}:00 - ${segmentNumber + 1}:00)
==============================================
Conta utilizada: ${account.email}
Timestamp: ${new Date().toISOString()}

ANÁLISE:
${responseText || 'Nenhuma análise foi retornada pela IA.'}

==============================================
`;

    fs.writeFileSync(`analysis_${segmentNumber}.txt`, analysisContent);
    console.log(`Análise do segmento ${segmentNumber} salva com sucesso!`);

  } catch (error) {
    console.error(`Erro na análise do segmento ${segmentNumber}:`, error);
    
    // Salvar erro como resultado
    const errorContent = `SEGMENTO ${segmentNumber} (${segmentNumber}:00 - ${segmentNumber + 1}:00)
==============================================
ERRO: ${error.message}
Conta utilizada: ${account.email}
Timestamp: ${new Date().toISOString()}
==============================================
`;
    
    fs.writeFileSync(`analysis_${segmentNumber}.txt`, errorContent);
  } finally {
    await browser.close();
  }
}

// Executar análise
const segmentNumber = parseInt(process.argv[2]);
const accountId = parseInt(process.argv[3]);

if (isNaN(segmentNumber) || isNaN(accountId)) {
  console.error('Uso: node analyze-segment.js <segmentNumber> <accountId>');
  process.exit(1);
}

analyzeSegment(segmentNumber, accountId);
