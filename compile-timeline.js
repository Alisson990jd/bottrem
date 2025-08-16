// compile-timeline.js
const fs = require('fs');
const path = require('path');

function compileTimeline(durationMinutes) {
  console.log(`Compilando timeline para ${durationMinutes} minutos...`);
  
  const timeline = [];
  let timelineText = `TIMELINE COMPLETA DA LIVE\n`;
  timelineText += `Duração: ${durationMinutes} minutos\n`;
  timelineText += `Gerado em: ${new Date().toISOString()}\n`;
  timelineText += `${'='.repeat(60)}\n\n`;

  // Ler todos os arquivos de análise
  for (let i = 0; i < durationMinutes; i++) {
    const analysisFile = `analysis_${i}.txt`;
    
    try {
      if (fs.existsSync(analysisFile)) {
        const content = fs.readFileSync(analysisFile, 'utf8');
        
        // Extrair apenas a parte da análise
        const analysisMatch = content.match(/ANÁLISE:\s*([\s\S]*?)\s*=+/);
        const analysisText = analysisMatch ? analysisMatch[1].trim() : 'Análise não encontrada';
        
        const timeEntry = {
          minute: i,
          timestamp: `${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`,
          analysis: analysisText,
          processed: true
        };
        
        timeline.push(timeEntry);
        
        timelineText += `[${timeEntry.timestamp}] MINUTO ${i}\n`;
        timelineText += `${'-'.repeat(30)}\n`;
        timelineText += `${analysisText}\n\n`;
        
      } else {
        console.warn(`Arquivo de análise não encontrado: ${analysisFile}`);
        
        const timeEntry = {
          minute: i,
          timestamp: `${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`,
          analysis: 'Segmento não processado ou análise falhou',
          processed: false
        };
        
        timeline.push(timeEntry);
        
        timelineText += `[${timeEntry.timestamp}] MINUTO ${i}\n`;
        timelineText += `${'-'.repeat(30)}\n`;
        timelineText += `ERRO: Segmento não processado ou análise falhou\n\n`;
      }
    } catch (error) {
      console.error(`Erro ao processar arquivo ${analysisFile}:`, error);
      
      const timeEntry = {
        minute: i,
        timestamp: `${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`,
        analysis: `Erro ao processar: ${error.message}`,
        processed: false
      };
      
      timeline.push(timeEntry);
      
      timelineText += `[${timeEntry.timestamp}] MINUTO ${i}\n`;
      timelineText += `${'-'.repeat(30)}\n`;
      timelineText += `ERRO: ${error.message}\n\n`;
    }
  }

  // Adicionar estatísticas
  const processedCount = timeline.filter(entry => entry.processed).length;
  const failedCount = timeline.length - processedCount;
  
  const stats = `\n${'='.repeat(60)}\n`;
  const statsText = `ESTATÍSTICAS:\n`;
  const statsContent = `Total de segmentos: ${timeline.length}\n`;
  const statsProcessed = `Processados com sucesso: ${processedCount}\n`;
  const statsFailed = `Falharam: ${failedCount}\n`;
  const statsSuccess = `Taxa de sucesso: ${((processedCount / timeline.length) * 100).toFixed(1)}%\n`;
  
  timelineText += stats + statsText + statsContent + statsProcessed + statsFailed + statsSuccess;

  // Salvar timeline em texto
  fs.writeFileSync('timeline.txt', timelineText);
  
  // Salvar timeline em JSON
  const timelineJson = {
    metadata: {
      duration_minutes: durationMinutes,
      generated_at: new Date().toISOString(),
      total_segments: timeline.length,
      processed_segments: processedCount,
      failed_segments: failedCount,
      success_rate: ((processedCount / timeline.length) * 100).toFixed(1)
    },
    timeline: timeline
  };
  
  fs.writeFileSync('timeline.json', JSON.stringify(timelineJson, null, 2));
  
  console.log(`Timeline compilada com sucesso!`);
  console.log(`- ${processedCount}/${timeline.length} segmentos processados`);
  console.log(`- Taxa de sucesso: ${((processedCount / timeline.length) * 100).toFixed(1)}%`);
  console.log('Arquivos gerados: timeline.txt, timeline.json');
}

// Executar compilação
const durationMinutes = parseInt(process.argv[2]);

if (isNaN(durationMinutes)) {
  console.error('Uso: node compile-timeline.js <durationMinutes>');
  process.exit(1);
}

compileTimeline(durationMinutes);
