// process-batch.js
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class BatchProcessor {
  constructor(videoUrl, batchNumber, batchSize = 250, maxParallel = 5) {
    this.videoUrl = videoUrl;
    this.batchNumber = batchNumber;
    this.batchSize = batchSize;
    this.maxParallel = maxParallel;
    this.activeProcesses = new Map();
    this.accounts = [
      { email: 'timid-await-untidy@duck.com', password: 'Alisson0909jj' },
      { email: 'fit-manmade-skater@duck.com', password: 'Alisson0909jj' },
      { email: 'rack-growl-gone@duck.com', password: 'Alisson0909jj' },
      { email: 'blimp-diocese-race@duck.com', password: 'Alisson0909jj' },
      { email: 'quail-scandal-lent@duck.com', password: 'Alisson0909jj' }
    ];
  }

  async processBatch(totalDuration) {
    const startSegment = this.batchNumber * this.batchSize;
    const endSegment = Math.min((this.batchNumber + 1) * this.batchSize - 1, totalDuration - 1);
    
    console.log(`🚀 Processando lote ${this.batchNumber}`);
    console.log(`📊 Segmentos: ${startSegment} até ${endSegment}`);
    console.log(`📦 Total de segmentos neste lote: ${endSegment - startSegment + 1}`);
    
    const results = {
      batch: this.batchNumber,
      startSegment,
      endSegment,
      totalSegments: endSegment - startSegment + 1,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    // Processar segmentos com controle de paralelismo
    for (let segment = startSegment; segment <= endSegment; segment++) {
      // Aguardar se já temos muitos processos rodando
      while (this.activeProcesses.size >= this.maxParallel) {
        await this.waitForAnyProcess();
      }

      // Iniciar processamento do segmento
      this.processSegment(segment, results);
    }

    // Aguardar todos os processos terminarem
    while (this.activeProcesses.size > 0) {
      await this.waitForAnyProcess();
    }

    // Salvar relatório do lote
    this.saveBatchReport(results);
    
    console.log(`✅ Lote ${this.batchNumber} concluído!`);
    console.log(`   📈 Sucessos: ${results.successful}/${results.totalSegments}`);
    console.log(`   📉 Falhas: ${results.failed}/${results.totalSegments}`);
    
    return results;
  }

  async processSegment(segmentNumber, results) {
    const accountId = segmentNumber % this.accounts.length;
    const processId = `segment_${segmentNumber}`;
    
    console.log(`📥 Iniciando segmento ${segmentNumber} (conta ${accountId})...`);
    
    try {
      // Fase 1: Download do segmento
      const downloadSuccess = await this.downloadSegment(segmentNumber);
      
      if (!downloadSuccess) {
        console.log(`❌ Download falhou para segmento ${segmentNumber}`);
        this.createErrorFile(segmentNumber, 'Erro no download do segmento');
        results.failed++;
        return;
      }

      // Fase 2: Análise com IA (processo assíncrono)
      const analysisPromise = this.analyzeSegment(segmentNumber, accountId);
      this.activeProcesses.set(processId, {
        promise: analysisPromise,
        segmentNumber,
        startTime: Date.now()
      });

      // Aguardar a análise
      analysisPromise
        .then((success) => {
          if (success) {
            results.successful++;
            console.log(`✅ Segmento ${segmentNumber} analisado com sucesso!`);
          } else {
            results.failed++;
            console.log(`❌ Análise falhou para segmento ${segmentNumber}`);
          }
          
          // Limpar arquivo do segmento
          this.cleanupSegment(segmentNumber);
          
          // Remover do mapa de processos ativos
          this.activeProcesses.delete(processId);
          results.processed++;
        })
        .catch((error) => {
          console.error(`💥 Erro crítico no segmento ${segmentNumber}:`, error.message);
          results.failed++;
          results.errors.push({
            segment: segmentNumber,
            error: error.message
          });
          
          this.createErrorFile(segmentNumber, error.message);
          this.cleanupSegment(segmentNumber);
          this.activeProcesses.delete(processId);
          results.processed++;
        });

    } catch (error) {
      console.error(`💥 Erro ao processar segmento ${segmentNumber}:`, error.message);
      results.failed++;
      results.errors.push({
        segment: segmentNumber,
        error: error.message
      });
      this.createErrorFile(segmentNumber, error.message);
    }
  }

  async downloadSegment(segmentNumber) {
    try {
      const { downloadSegment } = require('./download-segment.js');
      const result = await downloadSegment(this.videoUrl, segmentNumber);
      return result.success;
    } catch (error) {
      console.error(`Erro no download do segmento ${segmentNumber}:`, error.message);
      return false;
    }
  }

  async analyzeSegment(segmentNumber, accountId) {
    return new Promise((resolve, reject) => {
      const analysisProcess = spawn('node', ['analyze-segment.js', segmentNumber.toString(), accountId.toString()], {
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      analysisProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      analysisProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      analysisProcess.on('close', (code) => {
        if (code === 0 && fs.existsSync(`analysis_${segmentNumber}.txt`)) {
          resolve(true);
        } else {
          console.error(`Processo de análise falhou para segmento ${segmentNumber}. Código: ${code}`);
          if (stderr) console.error('Stderr:', stderr);
          resolve(false);
        }
      });

      analysisProcess.on('error', (error) => {
        console.error(`Erro ao executar análise do segmento ${segmentNumber}:`, error.message);
        reject(error);
      });

      // Timeout de 5 minutos para análise
      setTimeout(() => {
        analysisProcess.kill('SIGTERM');
        reject(new Error(`Timeout na análise do segmento ${segmentNumber}`));
      }, 5 * 60 * 1000);
    });
  }

  async waitForAnyProcess() {
    if (this.activeProcesses.size === 0) return;

    // Aguardar qualquer processo terminar
    const promises = Array.from(this.activeProcesses.values()).map(p => p.promise);
    await Promise.race(promises);
    
    // Pequena pausa para permitir cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  createErrorFile(segmentNumber, errorMessage) {
    const errorContent = `SEGMENTO ${segmentNumber} (${segmentNumber}:00 - ${segmentNumber + 1}:00)
==============================================
ERRO: ${errorMessage}
Timestamp: ${new Date().toISOString()}
Lote: ${this.batchNumber}
==============================================
`;
    
    fs.writeFileSync(`analysis_${segmentNumber}.txt`, errorContent);
  }

  cleanupSegment(segmentNumber) {
    try {
      const files = [
        `segment_${segmentNumber}.mp4`,
        `segment_${segmentNumber}_info.json`
      ];
      
      files.forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    } catch (error) {
      console.warn(`Aviso: Não foi possível limpar arquivos do segmento ${segmentNumber}:`, error.message);
    }
  }

  saveBatchReport(results) {
    const report = {
      ...results,
      completedAt: new Date().toISOString(),
      videoUrl: this.videoUrl,
      processingTimeMinutes: (Date.now() - this.startTime) / (1000 * 60)
    };
    
    fs.writeFileSync(`batch_${this.batchNumber}_report.json`, JSON.stringify(report, null, 2));
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const videoUrl = process.argv[2];
  const batchNumber = parseInt(process.argv[3]);
  const totalDuration = parseInt(process.argv[4]);
  
  if (!videoUrl || isNaN(batchNumber) || isNaN(totalDuration)) {
    console.error('❌ Uso: node process-batch.js <VIDEO_URL> <BATCH_NUMBER> <TOTAL_DURATION>');
    process.exit(1);
  }
  
  const processor = new BatchProcessor(videoUrl, batchNumber);
  processor.startTime = Date.now();
  
  processor.processBatch(totalDuration)
    .then(results => {
      console.log('🎉 Lote processado com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Erro fatal no processamento do lote:', error.message);
      process.exit(1);
    });
}

module.exports = { BatchProcessor };
