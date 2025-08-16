import asyncio
import os
import argparse
import sys
import time
from playwright.async_api import async_playwright
import pyperclip

async def qwen_automation(email, video_file, output_file, segment_number):
    async with async_playwright() as p:
        # Configurações do navegador
        browser = await p.chromium.launch(
            headless=True,  # Executar sem interface gráfica
            slow_mo=500     # Reduzir delay para melhor performance
        )
        
        context = await browser.new_context()
        page = await context.new_page()
        
        try:
            # 1. Navegar para a página de login
            print(f"[Segmento {segment_number}] Acessando página de login com {email}...")
            await page.goto("https://chat.qwen.ai/auth?action=signin")
            await page.wait_for_load_state("networkidle")
            
            # 2. Preencher o campo de email
            print(f"[Segmento {segment_number}] Preenchendo email: {email}")
            email_selector = 'input[type="email"][name="email"]'
            await page.wait_for_selector(email_selector)
            await page.fill(email_selector, email)
            
            # 3. Preencher o campo de senha
            print(f"[Segmento {segment_number}] Preenchendo senha...")
            password_selector = 'input[type="password"]'
            await page.wait_for_selector(password_selector)
            await page.fill(password_selector, "Alisson0909jj")
            
            # 4. Clicar no botão de login
            print(f"[Segmento {segment_number}] Fazendo login...")
            login_button_selector = 'button[type="submit"]'
            await page.wait_for_selector(login_button_selector)
            await page.click(login_button_selector)
            
            # 5. Aguardar redirecionamento
            print(f"[Segmento {segment_number}] Aguardando redirecionamento...")
            await page.wait_for_load_state("networkidle")
            
            # Verificar se foi redirecionado corretamente
            current_url = page.url
            if "https://chat.qwen.ai/" not in current_url:
                print(f"[Segmento {segment_number}] Navegando para a página de chat...")
                await page.goto("https://chat.qwen.ai/")
                await page.wait_for_load_state("networkidle")
            
            # 6. Clicar no ícone de upload (plus)
            print(f"[Segmento {segment_number}] Clicando no botão de upload...")
            plus_icon_selector = 'i.icon-line-plus-03'
            await page.wait_for_selector(plus_icon_selector, timeout=10000)
            await page.click(plus_icon_selector)
            
            # 7. Upload do vídeo
            print(f"[Segmento {segment_number}] Clicando em 'Carregar vídeo'...")
            
            video_upload_selectors = [
                'i.icon-line-video-up-01',
                '[data-menu-item] i.icon-line-video-up-01',
                '.chat-prompt-upload-group-dropdown-menu-item i.icon-line-video-up-01',
                'span:has-text("Carregar vídeo")',
                'span:has-text("Upload video")',
                'span:has-text("上传视频")'
            ]
            
            video_clicked = False
            for selector in video_upload_selectors:
                try:
                    await page.wait_for_selector(selector, timeout=5000)
                    print(f"[Segmento {segment_number}] Fazendo upload do vídeo: {video_file}")
                    video_path = os.path.abspath(video_file)
                    
                    if not os.path.exists(video_path):
                        raise FileNotFoundError(f"Arquivo de vídeo não encontrado: {video_path}")
                    
                    async with page.expect_file_chooser() as fc_info:
                        await page.click(selector)
                    file_chooser = await fc_info.value
                    await file_chooser.set_files(video_path)
                    video_clicked = True
                    print(f"[Segmento {segment_number}] Upload iniciado com sucesso")
                    break
                except Exception as e:
                    continue
            
            if not video_clicked:
                raise Exception("Não foi possível encontrar o botão de upload de vídeo")
            
            # 8. Aguardar o upload ser concluído
            print(f"[Segmento {segment_number}] Aguardando upload ser concluído...")
            await asyncio.sleep(60)
            
            # 9. Escrever a mensagem no textarea
            print(f"[Segmento {segment_number}] Escrevendo mensagem...")
            textarea_selector = 'textarea#chat-input'
            await page.wait_for_selector(textarea_selector, timeout=10000)
            await page.fill(textarea_selector, "o que está acontecendo no video?")
            
            # 10. Clicar no botão de enviar
            print(f"[Segmento {segment_number}] Enviando mensagem...")
            send_button_selector = 'i.icon-line-arrow-up'
            await page.wait_for_selector(send_button_selector, timeout=10000)
            await page.click(send_button_selector)
            
            # 11. Monitorar e clicar no botão de copiar
            print(f"[Segmento {segment_number}] Monitorando botão de copiar...")
            copy_button_selector = 'button.copy-response-button'
            copy_clicked = False
            attempt = 0
            
            # Limpar clipboard antes de começar
            pyperclip.copy("")
            
            while not copy_clicked and attempt < 300:  # Máximo 5 minutos
                try:
                    copy_button = await page.query_selector(copy_button_selector)
                    if copy_button:
                        is_visible = await copy_button.is_visible()
                        if is_visible:
                            await page.click(copy_button_selector)
                            print(f"[Segmento {segment_number}] Botão de copiar clicado!")
                            copy_clicked = True
                            break
                except Exception:
                    pass
                
                attempt += 1
                await asyncio.sleep(1)
                
                if attempt % 30 == 0:
                    print(f"[Segmento {segment_number}] Ainda aguardando... ({attempt} segundos)")
            
            if not copy_clicked:
                raise Exception("Timeout: Botão de copiar não apareceu")
            
            # 12. Aguardar um pouco e pegar o conteúdo do clipboard
            await asyncio.sleep(2)
            
            try:
                response_text = pyperclip.paste()
                if response_text and response_text.strip():
                    # Salvar no arquivo de saída
                    with open(output_file, 'w', encoding='utf-8') as f:
                        f.write(f"=== SEGMENTO {segment_number:04d} ===\n")
                        f.write(f"Arquivo: {os.path.basename(video_file)}\n")
                        f.write(f"Análise: {response_text.strip()}\n")
                        f.write("=" * 50 + "\n\n")
                    
                    print(f"[Segmento {segment_number}] Resposta salva em {output_file}")
                    return True
                else:
                    print(f"[Segmento {segment_number}] ERRO: Clipboard vazio")
                    return False
            except Exception as e:
                print(f"[Segmento {segment_number}] ERRO ao ler clipboard: {e}")
                return False
            
        except Exception as e:
            print(f"[Segmento {segment_number}] ERRO durante a automação: {str(e)}")
            return False
            
        finally:
            await browser.close()

async def main():
    parser = argparse.ArgumentParser(description='Automação para Qwen.ai')
    parser.add_argument('-email', required=True, help='Email para login')
    parser.add_argument('-video', required=True, help='Arquivo de vídeo')
    parser.add_argument('-output', required=True, help='Arquivo de saída')
    parser.add_argument('-segment', type=int, required=True, help='Número do segmento')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.video):
        print(f"ERRO: Arquivo '{args.video}' não encontrado!")
        sys.exit(1)
    
    print(f"Iniciando análise do segmento {args.segment}")
    print(f"  Email: {args.email}")
    print(f"  Vídeo: {args.video}")
    print(f"  Output: {args.output}")
    
    success = await qwen_automation(args.email, args.video, args.output, args.segment)
    
    if success:
        print(f"Segmento {args.segment} processado com sucesso!")
        sys.exit(0)
    else:
        print(f"Falha ao processar segmento {args.segment}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
