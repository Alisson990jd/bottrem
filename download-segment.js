// download-segment.js
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const execAsync = promisify(exec);

async function downloadSegment(videoUrl, segmentNumber, outputDir = '.') {
  const startTime = segmentNumber * 60; // segundos
  const duration = 60; // 1 minuto
  const outputFile = path.join(outputDir, `segment_${segmentNumber}.mp4`);
  
  console.log(`📥 Baixando segmento ${segmentNumber}:`);
  console.log(`   ⏰ Tempo: ${Math.floor(startTime/60)}:${(startTime%60).toString().padStart(2,'0')} - ${Math.floor((startTime+60)/60)}:${((startTime+60)%60).toString().padStart(2,'0')}`);
  
  try {
    // Método 1: yt-dlp com download direto do segmento (mais eficiente)
    const ytdlpCommand = `yt-dlp \\
      --format "best[height<=720]/best" \\
      --external-downloader ffmpeg \\
      --external-downloader-args "-ss ${startTime} -t ${duration} -c copy" \\
      --output "${outputFile}" \\
      "${videoUrl}"`;
    
    console.log('🔄 Executando download com yt-dlp...');
    const { stdout, stderr } = await execAsync(ytdlpCommand);
    
    if (stderr && !stderr.includes('WARNING')) {
      console.warn('⚠️ Avisos durante download:', stderr);
    }
    
    // Verificar se o arquivo foi criado
    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`✅ Segmento ${segmentNumber} baixado com sucesso!`);
      console.log(`   📁 Arquivo: ${outputFile}`);
      console.log(`   📊 Tamanho: ${fileSizeMB} MB`);
      
      return {
        success: true,
        file: outputFile,
        sizeBytes: stats.size,
        sizeMB: fileSizeMB
      };
    }
    
  } catch (error) {
    console.warn(`⚠️ Método 1 falhou para segmento ${segmentNumber}:`, error.message);
    
    // Método 2: Fallback com ffmpeg direto
    try {
      console.log('🔄 Tentando método alternativo com ffmpeg...');
      
      const ffmpegCommand = `ffmpeg \\
        -ss ${startTime} \\
        -i "${videoUrl}" \\
        -t ${duration} \\
        -c copy \\
        -avoid_negative_ts make_zero \\
        "${outputFile}" \\
        -y`;
      
      const { stdout: stdout2, stderr: stderr2 } = await execAsync(ffmpegCommand);
      
      if (fs.existsSync(outputFile)) {
        const stats = fs.statSync(outputFile);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        console.log(`✅ Segmento ${segmentNumber} baixado com método alternativo!`);
        console.log(`   📁 Arquivo: ${outputFile}`);
        console.log(`   📊 Tamanho: ${fileSizeMB} MB`);
        
        return {
          success: true,
          file: outputFile,
          sizeBytes: stats.size,
          sizeMB: fileSizeMB,
          method: 'fallback'
        };
      }
      
    } catch (fallbackError) {
      console.error(`❌ Método alternativo também falhou para segmento ${segmentNumber}:`, fallbackError.message);
    }
  }
  
  // Se chegou aqui, ambos os métodos falharam
  console.error(`💥 Falha completa no download do segmento ${segmentNumber}`);
  return {
    success: false,
    error: 'Todos os métodos de download falharam'
  };
}

// Função para validar se o segmento é válido (não está além da duração do vídeo)
async function validateSegment(videoUrl, segmentNumber) {
  try {
    // Obter duração do vídeo
    const { stdout } = await execAsync(`yt-dlp --print "%(duration)s" "${videoUrl}"`);
    const durationSeconds = parseInt(stdout.trim());
    const maxSegments = Math.ceil(durationSeconds / 60);
    
    if (segmentNumber >= maxSegments) {
      console.warn(`⚠️ Segmento ${segmentNumber} está além da duração do vídeo (${maxSegments} segmentos no total)`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('⚠️ Não foi possível validar duração, prosseguindo com download...');
    return true; // Prosseguir mesmo se não conseguir validar
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const videoUrl = process.argv[2];
  const segmentNumber = parseInt(process.argv[3]);
  
  if (!videoUrl || isNaN(segmentNumber)) {
    console.error('❌ Uso: node download-segment.js <URL_DO_VIDEO> <NUMERO_DO_SEGMENTO>');
    process.exit(1);
  }
  
  if (segmentNumber < 0) {
    console.error('❌ Número do segmento deve ser >= 0');
    process.exit(1);
  }
  
  console.log(`🚀 Iniciando download do segmento ${segmentNumber}...`);
  
  validateSegment(videoUrl, segmentNumber)
    .then(isValid => {
      if (!isValid) {
        console.log('⏭️ Segmento inválido, pulando...');
        process.exit(0);
      }
      
      return downloadSegment(videoUrl, segmentNumber);
    })
    .then(result => {
      if (result.success) {
        console.log(`🎉 Download concluído com sucesso!`);
        
        // Salvar informações do segmento
        const segmentInfo = {
          segmentNumber,
          ...result,
          downloadedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(`segment_${segmentNumber}_info.json`, JSON.stringify(segmentInfo, null, 2));
        
        process.exit(0);
      } else {
        console.error('💥 Download falhou');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Erro fatal:', error.message);
      process.exit(1);
    });
}

module.exports = { downloadSegment, validateSegment };
