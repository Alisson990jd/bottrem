import asyncio
import os
import argparse
from playwright.async_api import async_playwright

async def qwen_automation(email, video_file):
    async with async_playwright() as p:
        # ConfiguraÃƒÂ§ÃƒÂµes do navegador
        browser = await p.chromium.launch(
            headless=False,  # Mudar para True se quiser executar sem interface grÃƒÂ¡fica
            slow_mo=1000     # Adiciona delay entre aÃƒÂ§ÃƒÂµes para melhor visualizaÃƒÂ§ÃƒÂ£o
        )
        
        context = await browser.new_context()
        page = await context.new_page()
        
        try:
            # 1. Navegar para a pÃƒÂ¡gina de login
            print("Acessando pÃƒÂ¡gina de login...")
            await page.goto("https://chat.qwen.ai/auth?action=signin")
            await page.wait_for_load_state("networkidle")
            
            # 2. Preencher o campo de email
            print(f"Preenchendo email: {email}")
            email_selector = 'input[type="email"][name="email"]'
            await page.wait_for_selector(email_selector)
            await page.fill(email_selector, email)
            
            # 3. Preencher o campo de senha
            print("Preenchendo senha...")
            password_selector = 'input[type="password"]'
            await page.wait_for_selector(password_selector)
            await page.fill(password_selector, "Alisson0909jj")
            
            # 4. Clicar no botÃƒÂ£o de login
            print("Fazendo login...")
            login_button_selector = 'button[type="submit"]'
            await page.wait_for_selector(login_button_selector)
            await page.click(login_button_selector)
            
            # 5. Aguardar redirecionamento e navegar para chat se necessÃƒÂ¡rio
            print("Aguardando redirecionamento...")
            await page.wait_for_load_state("networkidle")
            
            # Verificar se foi redirecionado corretamente
            current_url = page.url
            if "https://chat.qwen.ai/" not in current_url:
                print("Navegando para a pÃƒÂ¡gina de chat...")
                await page.goto("https://chat.qwen.ai/")
                await page.wait_for_load_state("networkidle")
            
            # 6. Clicar no ÃƒÂ­cone de upload (plus)
            print("Clicando no botÃƒÂ£o de upload...")
            plus_icon_selector = 'i.icon-line-plus-03'
            await page.wait_for_selector(plus_icon_selector, timeout=10000)
            await page.click(plus_icon_selector)
            
            # 7. Aguardar o menu dropdown aparecer e clicar em "Carregar vÃƒÂ­deo"
            print("Clicando em 'Carregar vÃƒÂ­deo'...")
            
            # Seletores robustos que funcionam em qualquer idioma
            video_upload_selectors = [
                'i.icon-line-video-up-01',  # ÃƒÂcone especÃƒÂ­fico do vÃƒÂ­deo
                '[data-menu-item] i.icon-line-video-up-01',  # Com contexto do menu
                '.chat-prompt-upload-group-dropdown-menu-item i.icon-line-video-up-01',  # Seletor completo
                'span:has-text("Carregar vÃƒÂ­deo")',  # Fallback em portuguÃƒÂªs
                'span:has-text("Upload video")',   # Fallback em inglÃƒÂªs
                'span:has-text("Ã¤Â¸Å Ã¤Â¼ Ã¨Â§â€ Ã©Â¢â€˜")'          # Fallback em chinÃƒÂªs
            ]
            
            video_clicked = False
            for selector in video_upload_selectors:
                try:
                    await page.wait_for_selector(selector, timeout=5000)
                    # 8. Fazer upload do arquivo de vÃƒÂ­deo
                    print(f"Fazendo upload do vÃƒÂ­deo: {video_file}")
                    video_path = os.path.join(os.path.dirname(__file__), video_file)
                    
                    if not os.path.exists(video_path):
                        raise FileNotFoundError(f"Arquivo de vÃƒÂ­deo nÃƒÂ£o encontrado: {video_path}")
                    
                    # Aguardar o file chooser e clicar no botÃƒÂ£o simultaneamente
                    async with page.expect_file_chooser() as fc_info:
                        await page.click(selector)
                    file_chooser = await fc_info.value
                    await file_chooser.set_files(video_path)
                    video_clicked = True
                    print(f"Upload iniciado com sucesso usando seletor: {selector}")
                    break
                except Exception as e:
                    continue
            
            if not video_clicked:
                raise Exception("NÃƒÂ£o foi possÃƒÂ­vel encontrar o botÃƒÂ£o de upload de vÃƒÂ­deo em nenhum idioma")
            
            # 9. Aguardar o upload ser concluÃƒÂ­do
            print("Aguardando upload ser concluÃƒÂ­do...")
            await asyncio.sleep(60)  # Aguardar 1 minuto para o upload processar
            
            # 10. Escrever a mensagem no textarea
            print("Escrevendo mensagem...")
            textarea_selector = 'textarea#chat-input'
            await page.wait_for_selector(textarea_selector, timeout=10000)
            await page.fill(textarea_selector, "o que estÃƒÂ¡ acontecendo no video?")
            
            # 11. Clicar no botÃƒÂ£o de enviar
            print("Enviando mensagem...")
            send_button_selector = 'i.icon-line-arrow-up'
            await page.wait_for_selector(send_button_selector, timeout=10000)
            await page.click(send_button_selector)
            
            print("AutomaÃƒÂ§ÃƒÂ£o concluÃƒÂ­da com sucesso!")
            
            # 12. Monitorar e clicar no botÃƒÂ£o de copiar assim que aparecer
            print("Monitorando botÃƒÂ£o de copiar...")
            copy_button_selector = 'button.copy-response-button'
            copy_clicked = False
            attempt = 0
            
            while not copy_clicked:
                try:
                    # Verificar se o botÃƒÂ£o existe e estÃƒÂ¡ visÃƒÂ­vel
                    copy_button = await page.query_selector(copy_button_selector)
                    if copy_button:
                        is_visible = await copy_button.is_visible()
                        if is_visible:
                            await page.click(copy_button_selector)
                            print(f"Resposta copiada com sucesso! (tentativa {attempt + 1})")
                            copy_clicked = True
                            break
                except Exception:
                    # Continuar tentando se houver erro
                    pass
                
                attempt += 1
                
                # Aguardar 1 segundo antes da prÃƒÂ³xima tentativa
                await asyncio.sleep(1)
                
                # Mostrar progresso a cada 30 segundos
                if attempt % 30 == 0:
                    print(f"Ainda aguardando... ({attempt} tentativas)")
            
            # Aguardar um pouco apÃƒÂ³s copiar
            await asyncio.sleep(2)
            
        except Exception as e:
            print(f"Erro durante a automaÃƒÂ§ÃƒÂ£o: {str(e)}")
            
        finally:
            # Fechar o navegador
            await browser.close()

# FunÃƒÂ§ÃƒÂ£o para executar o script
async def main():
    # Configurar argumentos da linha de comando
    parser = argparse.ArgumentParser(description='AutomaÃƒÂ§ÃƒÂ£o para Qwen.ai')
    parser.add_argument('-email', required=True, help='Email para login')
    parser.add_argument('-video', required=True, help='Nome do arquivo de vÃƒÂ­deo')
    
    args = parser.parse_args()
    
    # Verificar se o arquivo de vÃƒÂ­deo existe
    if not os.path.exists(args.video):
        print(f"ERRO: Arquivo '{args.video}' nÃƒÂ£o encontrado!")
        print("Certifique-se de que o arquivo estÃƒÂ¡ na mesma pasta que este script ou forneÃƒÂ§a o caminho completo.")
        return
    
    print(f"Iniciando automaÃƒÂ§ÃƒÂ£o com:")
    print(f"  Email: {args.email}")
    print(f"  VÃƒÂ­deo: {args.video}")
    print("  Senha: Alisson0909jj")
    print()
    
    await qwen_automation(args.email, args.video)

# Executar o script
if __name__ == "__main__":
    asyncio.run(main())