// get-video-duration.js
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function getVideoDuration(videoUrl) {
  try {
    console.log('🔍 Obtendo informações do vídeo...');
    
    // Usar yt-dlp para obter informações sem baixar
    const command = `yt-dlp --print "%(duration)s:%(title)s" "${videoUrl}"`;
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.warn('⚠️ Avisos:', stderr);
    }
    
    const output = stdout.trim().split(':');
    const durationSeconds = parseInt(output[0]);
    const title = output.slice(1).join(':');
    
    if (isNaN(durationSeconds)) {
      throw new Error('Não foi possível obter a duração do vídeo');
    }
    
    const durationMinutes = Math.ceil(durationSeconds / 60);
    
    console.log('📊 Informações do vídeo:');
    console.log(`   Título: ${title}`);
    console.log(`   Duração: ${durationSeconds}s (${durationMinutes} minutos)`);
    console.log(`   Segmentos a processar: ${durationMinutes}`);
    
    return {
      durationSeconds,
      durationMinutes,
      title: title.trim()
    };
    
  } catch (error) {
    console.error('❌ Erro ao obter duração:', error.message);
    
    // Fallback: tentar com ffprobe se yt-dlp falhar
    try {
      console.log('🔄 Tentando método alternativo com ffprobe...');
      const ffprobeCommand = `ffprobe -v quiet -show_entries format=duration -of csv="p=0" "${videoUrl}"`;
      const { stdout } = await execAsync(ffprobeCommand);
      
      const durationSeconds = Math.floor(parseFloat(stdout.trim()));
      const durationMinutes = Math.ceil(durationSeconds / 60);
      
      console.log(`✅ Duração obtida: ${durationSeconds}s (${durationMinutes} minutos)`);
      
      return {
        durationSeconds,
        durationMinutes,
        title: 'Título não disponível'
      };
      
    } catch (fallbackError) {
      console.error('❌ Método alternativo também falhou:', fallbackError.message);
      throw new Error('Não foi possível obter a duração do vídeo com nenhum método');
    }
  }
}

// Função para validar URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const videoUrl = process.argv[2];
  
  if (!videoUrl) {
    console.error('❌ Uso: node get-video-duration.js <URL_DO_VIDEO>');
    process.exit(1);
  }
  
  if (!isValidUrl(videoUrl)) {
    console.error('❌ URL inválida fornecida');
    process.exit(1);
  }
  
  getVideoDuration(videoUrl)
    .then(info => {
      // Salvar informações em arquivo para uso posterior
      const fs = require('fs');
      fs.writeFileSync('video_info.json', JSON.stringify(info, null, 2));
      
      console.log('✅ Informações salvas em video_info.json');
      
      // Output para GitHub Actions
      if (process.env.GITHUB_OUTPUT) {
        const fs = require('fs');
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `duration=${info.durationMinutes}\n`);
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `title=${info.title}\n`);
      }
    })
    .catch(error => {
      console.error('💥 Erro fatal:', error.message);
      process.exit(1);
    });
}

module.exports = { getVideoDuration, isValidUrl };
