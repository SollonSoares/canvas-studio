(function() {
    if (document.getElementById('rpg-dice-widget')) {
        document.getElementById('rpg-dice-widget').remove();
    }
    const div = document.createElement('div');
    div.id = 'rpg-dice-widget';
    div.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#1e1e1e;color:#fff;padding:15px;border-radius:10px;box-shadow:0 4px 15px rgba(0,0,0,0.5);z-index:999999;font-family:sans-serif;text-align:center;width:240px;';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';

    const h4 = document.createElement('h4');
    h4.style.cssText = 'margin:0;color:#ff5252;';
    h4.textContent = 'Mesa de Dados RPG';
    header.appendChild(h4);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'background:none;border:none;color:#aaa;font-size:18px;cursor:pointer;padding:0 5px;line-height:1;';
    closeBtn.title = 'Fechar widget';
    closeBtn.onclick = function() {
        div.remove();
    };
    header.appendChild(closeBtn);
    div.appendChild(header);

    const controlsContainer = document.createElement('div');
    controlsContainer.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-bottom:10px;text-align:left;font-size:14px;';

    function createRow(labelText, inputId, inputType, defaultValue, min, max) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
        
        const label = document.createElement('label');
        label.textContent = labelText;
        row.appendChild(label);

        const input = document.createElement('input');
        input.id = inputId;
        input.type = inputType;
        input.value = defaultValue;
        if (min !== undefined) input.min = min;
        if (max !== undefined) input.max = max;
        input.style.cssText = 'width:60px;padding:3px;background:#2d2d2d;color:#fff;border:1px solid #444;border-radius:4px;text-align:center;';
        row.appendChild(input);

        return row;
    }

    controlsContainer.appendChild(createRow('Quantidade:', 'dice-count', 'number', '1', 1, 20));

    const rowTipo = document.createElement('div');
    rowTipo.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
    const labelTipo = document.createElement('label');
    labelTipo.textContent = 'Tipo de Dado:';
    rowTipo.appendChild(labelTipo);

    const selectTipo = document.createElement('select');
    selectTipo.id = 'dice-type';
    selectTipo.style.cssText = 'width:70px;padding:3px;background:#2d2d2d;color:#fff;border:1px solid #444;border-radius:4px;text-align:center;';
    [4, 6, 8, 12, 20, 100].forEach(faces => {
        const opt = document.createElement('option');
        opt.value = faces;
        opt.textContent = 'd' + faces;
        if (faces === 20) opt.selected = true;
        selectTipo.appendChild(opt);
    });
    rowTipo.appendChild(selectTipo);
    controlsContainer.appendChild(rowTipo);

    controlsContainer.appendChild(createRow('Modificador:', 'dice-mod', 'number', '0'));
    div.appendChild(controlsContainer);

    const btn = document.createElement('button');
    btn.id = 'btn-dice';
    btn.style.cssText = 'width:100%;padding:8px;font-size:15px;background:#ff5252;color:white;border:none;border-radius:5px;cursor:pointer;';
    btn.textContent = 'Rolar';
    div.appendChild(btn);

    const resDiv = document.createElement('div');
    resDiv.id = 'res-dice';
    resDiv.style.cssText = 'margin-top:10px;font-size:13px;text-align:left;background:#121212;padding:8px;border-radius:5px;max-height:130px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;';
    
    const finalTotalDiv = document.createElement('div');
    finalTotalDiv.style.cssText = 'font-size:15px;font-weight:bold;color:#ffd700;text-align:center;border-bottom:1px solid #333;padding-bottom:4px;';
    finalTotalDiv.textContent = 'Valores: -';
    resDiv.appendChild(finalTotalDiv);

    const detailsP = document.createElement('div');
    detailsP.style.cssText = 'font-size:12px;color:#aaa;';
    detailsP.textContent = 'Detalhes: -';
    resDiv.appendChild(detailsP);

    div.appendChild(resDiv);
    document.body.appendChild(div);

    btn.onclick = function() {
        const count = parseInt(document.getElementById('dice-count').value) || 1;
        const faces = parseInt(document.getElementById('dice-type').value) || 20;
        const mod = parseInt(document.getElementById('dice-mod').value) || 0;

        let details = [];
        let finals = [];

        for (let i = 0; i < count; i++) {
            let roll = Math.floor(Math.random() * faces) + 1;
            let sumWithMod = roll + mod;
            finals.push(sumWithMod);
            details.push(roll + (mod !== 0 ? (mod >= 0 ? ' +' + mod : ' ' + mod) : '') + ' = ' + sumWithMod);
        }
        
        finalTotalDiv.textContent = 'Valores: ' + finals.join(', ');
        detailsP.textContent = 'Detalhes: ' + details.join(', ');
    };
})();
