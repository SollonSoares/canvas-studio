(function() {
    try {
        const existingWidget = document.getElementById('text-formatter-widget');
        if (existingWidget) {
            existingWidget.remove();
        }

        const div = document.createElement('div');
        div.id = 'text-formatter-widget';
        div.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#1e1e1e;color:#fff;padding:15px;border-radius:10px;box-shadow:0 4px 15px rgba(0,0,0,0.5);z-index:2147483647;font-family:sans-serif;width:340px;box-sizing:border-box;';

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';

        const h4 = document.createElement('h4');
        h4.style.cssText = 'margin:0;color:#4fc3f7;font-size:14px;';
        h4.textContent = 'Formatador Tipográfico Pro';
        header.appendChild(h4);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = 'background:none;border:none;color:#aaa;font-size:18px;cursor:pointer;padding:0 5px;line-height:1;';
        closeBtn.onclick = function() {
            div.remove();
        };
        header.appendChild(closeBtn);
        div.appendChild(header);

        const textarea = document.createElement('textarea');
        textarea.id = 'formatter-input';
        textarea.placeholder = 'Cole aqui o texto desestruturado...';
        textarea.style.cssText = 'width:100%;height:70px;padding:6px;background:#2d2d2d;color:#fff;border:1px solid #444;border-radius:4px;resize:vertical;box-sizing:border-box;margin-bottom:8px;font-family:monospace;font-size:12px;';
        div.appendChild(textarea);

        const configDiv = document.createElement('div');
        configDiv.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:8px;font-size:11px;color:#ccc;';
        
        const rowLimit = document.createElement('div');
        rowLimit.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
        
        const labelLimit = document.createElement('label');
        labelLimit.textContent = 'Máx. caracteres por linha:';
        rowLimit.appendChild(labelLimit);

        const inputLimit = document.createElement('input');
        inputLimit.type = 'number';
        inputLimit.id = 'char-limit';
        inputLimit.value = '36';
        inputLimit.min = '10';
        inputLimit.max = '200';
        inputLimit.style.cssText = 'width:60px;padding:3px;background:#2d2d2d;color:#fff;border:1px solid #444;border-radius:4px;text-align:center;font-size:11px;';
        rowLimit.appendChild(inputLimit);
        
        configDiv.appendChild(rowLimit);

        const labelAccents = document.createElement('label');
        labelAccents.style.cssText = 'display:flex;align-items:center;cursor:pointer;';
        const chkAccents = document.createElement('input');
        chkAccents.type = 'checkbox';
        chkAccents.id = 'chk-accents';
        chkAccents.checked = false;
        chkAccents.style.cssText = 'margin-right:6px;';
        labelAccents.appendChild(chkAccents);
        labelAccents.appendChild(document.createTextNode('Remover acentos (Normalização)'));
        configDiv.appendChild(labelAccents);

        const labelSpecial = document.createElement('label');
        labelSpecial.style.cssText = 'display:flex;align-items:center;cursor:pointer;';
        const chkSpecial = document.createElement('input');
        chkSpecial.type = 'checkbox';
        chkSpecial.id = 'chk-special';
        chkSpecial.checked = false;
        chkSpecial.style.cssText = 'margin-right:6px;';
        labelSpecial.appendChild(chkSpecial);
        labelSpecial.appendChild(document.createTextNode('Remover caracteres especiais/símbolos'));
        configDiv.appendChild(labelSpecial);

        div.appendChild(configDiv);

        const btn = document.createElement('button');
        btn.style.cssText = 'width:100%;padding:8px;font-size:14px;background:#4fc3f7;color:#000;border:none;border-radius:5px;cursor:pointer;font-weight:bold;margin-bottom:8px;';
        btn.textContent = 'Formatar com Quebra Fluida';
        div.appendChild(btn);

        const resContainer = document.createElement('div');
        resContainer.style.cssText = 'position:relative;margin-top:5px;';

        const pre = document.createElement('pre');
        pre.id = 'formatter-result';
        pre.style.cssText = 'background:#121212;padding:8px;border-radius:5px;max-height:140px;overflow-y:auto;font-family:monospace;font-size:11px;white-space:pre-wrap;word-break:break-all;color:#a5d6a7;border:1px solid #333;box-sizing:border-box;margin:0;';
        pre.textContent = 'Resultado: -';
        resContainer.appendChild(pre);

        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copiar Código';
        copyBtn.style.cssText = 'display:none;width:100%;margin-top:6px;padding:6px;font-size:12px;background:#388e3c;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;';
        resContainer.appendChild(copyBtn);

        div.appendChild(resContainer);

        btn.onclick = function() {
            let text = textarea.value;
            if (!text) {
                pre.textContent = 'Insira um texto válido.';
                copyBtn.style.display = 'none';
                return;
            }

            const limit = parseInt(inputLimit.value) || 36;
            const removeAccents = chkAccents.checked;
            const removeSpecial = chkSpecial.checked;

            if (removeAccents) {
                text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            }

            if (removeSpecial) {
                text = text.replace(/[^a-zA-Z0-9\s]/g, '');
            }

            text = text.replace(/\r\n/g, '\n');
            const paragraphs = text.split('\n');
            let finalLines = [];

            paragraphs.forEach(paragraph => {
                let cleanParagraph = paragraph.replace(/\s+/g, ' ').trim();
                if (!cleanParagraph) {
                    finalLines.push('');
                    return;
                }

                let words = cleanParagraph.split(' ');
                let currentLine = '';

                for (let i = 0; i < words.length; i++) {
                    let word = words[i];
                    if (currentLine === '') {
                        currentLine = word;
                    } else if ((currentLine + ' ' + word).length <= limit) {
                        currentLine += ' ' + word;
                    } else {
                        finalLines.push(currentLine);
                        currentLine = word;
                    }
                }
                if (currentLine !== '') {
                    finalLines.push(currentLine);
                }
            });

            pre.textContent = finalLines.join('\n');
            copyBtn.style.display = 'block';
        };

        copyBtn.onclick = function() {
            const textToCopy = pre.textContent;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copiado!';
                copyBtn.style.background = '#2e7d32';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.background = '#388e3c';
                }, 1500);
            }).catch(err => {
                console.error('Erro ao copiar texto: ', err);
            });
        };

        if (document.body) {
            document.body.appendChild(div);
        } else {
            console.error('Document body not available.');
        }
    } catch (e) {
        console.error('Erro ao executar widget:', e);
    }
})();
