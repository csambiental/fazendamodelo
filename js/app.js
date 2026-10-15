// =====================================================================
// Mapa interativo de cliente – CS Consultoria Ambiental
// Dados: data/fazendas.json (fazendas, CAR, área, adequações e status)
//        data/<fazenda>.geojson (perímetros)
// Para atualizar o andamento, basta mudar o "status" de cada adequação
// em data/fazendas.json: "Pendente", "Em andamento" ou "Concluída".
// =====================================================================

mapboxgl.accessToken = 'pk.eyJ1IjoiY3NhbWJpZW50YWwiLCJhIjoiY205MWk4eHU4MDE3czJxcHNqamR4emd5aiJ9.e8K-ENRHJwXTz_FGGwYExg';

const STATUS = {
    'Concluída':    { cor: '#2e9e5b', classe: 'ok' },
    'Em andamento': { cor: '#e0a100', classe: 'andamento' },
    'Pendente':     { cor: '#9aa0a6', classe: 'pendente' }
};
const ORDEM_STATUS = ['Concluída', 'Em andamento', 'Pendente'];

// Paleta das fazendas (cores distintas e legíveis sobre o satélite)
const PALETA = ['#ff6b4a', '#4fc3f7', '#ba68c8', '#ffd54f', '#81c784', '#f06292', '#4db6ac', '#ffb74d'];

let fazendas = [];
let geojsons = {};
let camadas = [];       // camadas extras (pivôs, represas...)
const camadasData = {};
let selecionada = null;
let mostrarPreenchimento = true;

// Imagem de satélite mais recente: Esri World Imagery (Vantor/Maxar, ago/2025, 0,34 m na região)
const ESTILO_ESRI = {
    version: 8,
    glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
    sources: {
        esri: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 19,
            attribution: 'Imagens © Esri, Vantor, Maxar, Earthstar Geographics'
        }
    },
    layers: [{ id: 'esri', type: 'raster', source: 'esri' }]
};
const ESTILOS = {
    esri: ESTILO_ESRI,
    mapbox: 'mapbox://styles/mapbox/satellite-streets-v12',
    mapa: 'mapbox://styles/mapbox/outdoors-v12'
};

const map = new mapboxgl.Map({
    container: 'map',
    style: ESTILO_ESRI,
    center: [-49.955, -21.75],
    zoom: 11,
    preserveDrawingBuffer: true
});
map.addControl(new mapboxgl.NavigationControl(), 'top-right');
map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');

// ---------- utilidades ----------
const fmt = (n, casas = 0) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Rótulo no singular/plural: "1 concluída", "2 concluídas"
function rotulo(status, n) {
    const plural = { 'Concluída': 'concluídas', 'Em andamento': 'em andamento', 'Pendente': 'pendentes' };
    return n === 1 ? status.toLowerCase() : plural[status];
}

function contarStatus(lista) {
    const c = { 'Concluída': 0, 'Em andamento': 0, 'Pendente': 0 };
    lista.forEach(a => { c[a.status in c ? a.status : 'Pendente']++; });
    return c;
}

// Barra empilhada: concluída | em andamento | pendente
function barraProgresso(cont, total) {
    if (!total) return '';
    return ORDEM_STATUS.map(s => {
        const pct = cont[s] / total * 100;
        return pct > 0 ? `<span style="width:${pct}%;background:${STATUS[s].cor}" title="${s}: ${cont[s]}"></span>` : '';
    }).join('');
}

function boundsDe(geojson) {
    const b = turf.bbox(geojson);
    return [[b[0], b[1]], [b[2], b[3]]];
}

// ---------- painel lateral ----------
function renderResumo() {
    const todas = fazendas.flatMap(f => f.adequacoes);
    const cont = contarStatus(todas);
    const areaTotal = fazendas.reduce((s, f) => s + f.area_ha, 0);
    document.getElementById('kpiFazendas').textContent = fazendas.length;
    document.getElementById('kpiArea').textContent = fmt(areaTotal);
    document.getElementById('kpiAdequacoes').textContent = todas.length;
    const pct = todas.length ? Math.round(cont['Concluída'] / todas.length * 100) : 0;
    document.getElementById('kpiPct').textContent = `${pct}% concluído`;
    document.getElementById('progressTotal').innerHTML = barraProgresso(cont, todas.length);
    document.getElementById('statusLegend').innerHTML = ORDEM_STATUS.map(s =>
        `<span class="chip"><i style="background:${STATUS[s].cor}"></i>${cont[s]} ${rotulo(s, cont[s])}</span>`).join('');
}

function renderFazendas() {
    const el = document.getElementById('farmList');
    el.innerHTML = fazendas.map(f => {
        const cont = contarStatus(f.adequacoes);
        const aberta = selecionada === f.id;
        const itens = f.adequacoes.map(a => {
            const st = STATUS[a.status] || STATUS['Pendente'];
            const quando = a.concluida_em ? ` · ${esc(a.concluida_em)}` : '';
            const nota = a.nota ? `<span class="item-note">${esc(a.nota)}</span>` : '';
            const docs = (a.documentos || []).map(d =>
                `<button type="button" class="doc-btn" data-arquivo="${esc(d.arquivo)}" data-titulo="${esc(d.titulo)}">📄 ${esc(d.titulo)}</button>`).join('');
            const extra = (nota || docs) ? `<span class="item-extra">${nota}${docs ? `<span class="doc-list">${docs}</span>` : ''}</span>` : '';
            return `<li><span class="status-dot" style="background:${st.cor}"></span>
                        <span class="item-text">${esc(a.item)}</span>
                        <span class="status-tag ${st.classe}">${esc(a.status)}${quando}</span>${extra}</li>`;
        }).join('');
        return `
        <article class="farm ${aberta ? 'open' : ''}" data-id="${f.id}">
            <button class="farm-head" type="button" aria-expanded="${aberta}">
                <span class="swatch" style="background:${f.cor}"></span>
                <span class="farm-name">${esc(f.nome)}</span>
                <span class="farm-meta">${fmt(f.area_ha, 1)} ha · ${cont['Concluída']}/${f.adequacoes.length}</span>
            </button>
            <div class="mini-progress">${barraProgresso(cont, f.adequacoes.length)}</div>
            <div class="farm-body">
                <dl>
                    <dt>CAR</dt><dd class="mono">${esc(f.car)}</dd>
                    <dt>Área declarada</dt><dd>${fmt(f.area_ha, 2)} ha</dd>
                    ${f.situacao_car ? `<dt>Situação do CAR</dt><dd>${esc(f.situacao_car)}</dd>` : ''}
                </dl>
                ${indicadoresHtml(f)}
                <h3>Adequações (${f.adequacoes.length})</h3>
                <ul class="adeq-list">${itens}</ul>
                ${/^[A-Z]{2}-\d{7}-/.test(f.car || '') ? `<a class="link" href="https://www.registrorural.com.br/car/item/${encodeURIComponent(f.car)}" target="_blank" rel="noopener">Consultar o CAR no Registro Rural ↗</a>` : ''}
            </div>
        </article>`;
    }).join('');

    el.querySelectorAll('.doc-btn').forEach(btn => {
        btn.addEventListener('click', () => abrirDocumento(btn.dataset.titulo, btn.dataset.arquivo));
    });
    el.querySelectorAll('.farm-head').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.closest('.farm').dataset.id;
            selecionarFazenda(selecionada === id ? null : id, true);
        });
    });
}

// ---------- visualizador de documentos ----------
const docDialog = document.getElementById('docDialog');
function abrirDocumento(titulo, arquivo) {
    document.getElementById('docTitle').textContent = titulo;
    document.getElementById('docFrame').src = arquivo;
    document.getElementById('docOpen').href = arquivo;
    document.getElementById('docDownload').href = arquivo;
    docDialog.showModal();
}
document.getElementById('docClose').addEventListener('click', () => docDialog.close());
docDialog.addEventListener('click', (e) => { if (e.target === docDialog) docDialog.close(); });
docDialog.addEventListener('close', () => { document.getElementById('docFrame').src = 'about:blank'; });

// Documentos de uma fazenda (sem repetir)
function documentosDa(f) {
    const vistos = new Map();
    f.adequacoes.forEach(a => (a.documentos || []).forEach(d => vistos.set(d.arquivo, d)));
    return [...vistos.values()];
}

// Indicadores do CAR (ha). "Saldo" negativo = déficit
function indicadoresHtml(f) {
    if (!f.indicadores) return '';
    const linhas = Object.entries(f.indicadores).map(([k, v]) => {
        const saldo = /saldo/i.test(k);
        const recompor = /recompor/i.test(k);
        const cls = saldo ? (v < 0 ? 'neg' : 'pos') : (recompor && v > 0 ? 'neg' : '');
        const txt = saldo && v < 0 ? `déficit de ${fmt(-v, 2)} ha` : (saldo ? `excedente de ${fmt(v, 2)} ha` : `${fmt(v, 2)} ha`);
        const pct = !saldo && !recompor && f.area_ha ? `<small>${fmt(v / f.area_ha * 100, 1)}%</small>` : '';
        return `<tr class="${cls}"><th>${esc(k)}</th><td>${txt} ${pct}</td></tr>`;
    }).join('');
    return `<h3>Indicadores do CAR</h3><table class="ind">${linhas}</table>`;
}

function docBotao(titulo, arquivo) {
    if (!arquivo) return '';
    return `<button type="button" class="doc-btn" onclick="abrirDocumento('${esc(titulo)}', '${esc(arquivo)}')">📄 ${esc(titulo)}</button>`;
}

// Legenda sobre o mapa: fazendas, camadas extras e pontos (com documento clicável)
function renderLegenda() {
    const el = document.getElementById('legend');
    if (!el) return;
    const itens = [];
    fazendas.forEach(f => itens.push(`<div class="lg-item"><i class="lg-area" style="border-color:${f.cor};background:${f.cor}33"></i>${esc(f.nome)}</div>`));
    camadas.forEach(c => {
        if (c.cor_por && c.cores) {
            const feats = (camadasData[c.id] || {}).features || [];
            const sub = Object.entries(c.cores).map(([k, cor]) => {
                const grupo = feats.filter(f => f.properties[c.cor_por] === k);
                if (!grupo.length) return '';
                const lista = c.listar ? grupo.map(f => f.properties.doc_arquivo
                    ? `<button type="button" class="lg-item lg-doc lg-leaf" data-titulo="${esc(f.properties.nome)} – ${esc(f.properties.Portaria || '')}" data-arquivo="${esc(f.properties.doc_arquivo)}">${esc(f.properties.nome)} 📄</button>`
                    : `<div class="lg-item lg-leaf">${esc(f.properties.nome)}</div>`).join('') : '';
                return `<div class="lg-item lg-sub"><i class="${c.tipo === 'fill' ? 'lg-sq' : 'lg-dot'}" style="background:${cor}"></i>${esc(k)} (${grupo.length})</div>${lista}`;
            }).join('');
            itens.push(`<div class="lg-group">${esc(c.nome)}</div>${sub}`);
        } else {
            itens.push(`<div class="lg-item"><i class="${c.tipo === 'fill' ? 'lg-sq' : 'lg-dot'}" style="background:${c.cor}"></i>${esc(c.nome)}</div>`);
        }
    });
    fazendas.forEach(f => (f.pontos || []).forEach(p => {
        const conteudo = `<i class="lg-ring" style="border-color:${f.cor}"></i>${esc(p.nome)}`;
        itens.push(p.documento
            ? `<button type="button" class="lg-item lg-doc" data-titulo="${esc(p.documento.titulo)}" data-arquivo="${esc(p.documento.arquivo)}" title="Ver ${esc(p.documento.titulo)}">${conteudo} 📄</button>`
            : `<div class="lg-item">${conteudo}</div>`);
    }));
    const aberta = window.matchMedia('(min-width: 801px)').matches ? ' open' : '';
    el.innerHTML = `<details${aberta}><summary>Legenda</summary>${itens.join('')}</details>`;
    el.querySelectorAll('.lg-doc').forEach(b => b.addEventListener('click', () => abrirDocumento(b.dataset.titulo, b.dataset.arquivo)));
}

// ---------- próximos vencimentos ----------
// Regras de cor: vencido sem providência = vermelho; vencido com providência em andamento = laranja;
// vence em até 90 dias = amarelo; mais de 90 dias = verde.
function renderPrazos(prazos) {
    const card = document.getElementById('cardPrazos');
    if (!prazos || !prazos.length) return;
    card.hidden = false;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dia = 86400000;
    const itens = prazos.map(p => {
        const [a, m, d] = p.data.split('-').map(Number);
        const data = new Date(a, m - 1, d);
        const dias = Math.round((data - hoje) / dia);
        let classe, rotuloPrazo;
        if (dias < 0) {
            classe = p.andamento ? 'andamento' : 'vencido';
            const meses = Math.round(-dias / 30.4);
            rotuloPrazo = meses >= 2 ? `vencido há ${meses} meses` : `vencido há ${-dias} dias`;
        } else {
            classe = dias <= 90 ? 'proximo' : 'ok';
            const meses = Math.round(dias / 30.4);
            rotuloPrazo = dias === 0 ? 'vence hoje' : (dias <= 60 ? `em ${dias} dias` : `em ${meses} meses`);
        }
        return { ...p, dataTxt: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`, dias, classe, rotuloPrazo };
    });
    // Ordem: vencidos sem providência, próximos (por data), vencidos em andamento
    const peso = { vencido: 0, proximo: 1, ok: 1, andamento: 2 };
    itens.sort((x, y) => peso[x.classe] - peso[y.classe] || (x.classe === 'andamento' ? y.dias - x.dias : x.dias - y.dias));
    const LIMITE = 6;
    const lista = document.getElementById('listaPrazos');
    const desenhar = (todos) => {
        lista.innerHTML = (todos ? itens : itens.slice(0, LIMITE)).map(p => `
            <li class="prazo ${p.classe}">
                <div class="prazo-data"><strong>${p.dataTxt}</strong><span>${p.rotuloPrazo}</span></div>
                <div class="prazo-txt">
                    ${esc(p.titulo)}
                    ${p.andamento ? `<small class="prazo-and">${esc(p.andamento)}</small>` : ''}
                    ${p.nota ? `<small>${esc(p.nota)}</small>` : ''}
                    ${p.documento ? `<button type="button" class="doc-btn" data-titulo="${esc(p.documento.titulo)}" data-arquivo="${esc(p.documento.arquivo)}">📄 ${esc(p.documento.titulo)}</button>` : ''}
                </div>
            </li>`).join('');
        lista.querySelectorAll('.doc-btn').forEach(b => b.addEventListener('click', () => abrirDocumento(b.dataset.titulo, b.dataset.arquivo)));
    };
    desenhar(false);
    const btn = document.getElementById('verTodosPrazos');
    if (itens.length > LIMITE) {
        btn.hidden = false;
        btn.textContent = `Ver todos (${itens.length})`;
        let todos = false;
        btn.onclick = () => { todos = !todos; desenhar(todos); btn.textContent = todos ? 'Mostrar menos' : `Ver todos (${itens.length})`; };
    }
}

// ---------- mapa ----------
function adicionarCamadas() {
    fazendas.forEach(f => {
        const g = geojsons[f.id];
        if (!g || map.getSource(f.id)) return;
        map.addSource(f.id, { type: 'geojson', data: g });
        map.addLayer({
            id: `${f.id}-fill`, type: 'fill', source: f.id,
            layout: { visibility: mostrarPreenchimento ? 'visible' : 'none' },
            paint: { 'fill-color': f.cor, 'fill-opacity': 0.18 }
        });
        map.addLayer({
            id: `${f.id}-halo`, type: 'line', source: f.id,
            paint: { 'line-color': '#000000', 'line-width': 5, 'line-opacity': 0.35 }
        });
        map.addLayer({
            id: `${f.id}-line`, type: 'line', source: f.id,
            paint: { 'line-color': f.cor, 'line-width': 2.5 }
        });
    });
    // Camadas extras definidas em data/fazendas.json -> "camadas"
    camadas.forEach(c => {
        const g = camadasData[c.id];
        if (!g || map.getSource(`cam-${c.id}`)) return;
        map.addSource(`cam-${c.id}`, { type: 'geojson', data: g });
        if (c.tipo === 'fill') {
            const corFill = c.cor_por && c.cores ? ['match', ['get', c.cor_por], ...Object.entries(c.cores).flat(), '#777777'] : c.cor;
            map.addLayer({ id: `cam-${c.id}`, type: 'fill', source: `cam-${c.id}`, paint: { 'fill-color': corFill, 'fill-opacity': c.opacidade ?? (c.cor_por ? 0.85 : 0.45) } });
            map.addLayer({ id: `cam-${c.id}-line`, type: 'line', source: `cam-${c.id}`,
                paint: { 'line-color': c.cor_por ? '#ffffff' : corFill, 'line-width': c.cor_por ? 1.5 : 1, 'line-opacity': 0.9 } });
        } else {
            const cor = c.cor_por && c.cores
                ? ['match', ['get', c.cor_por], ...Object.entries(c.cores).flat(), '#777777']
                : c.cor;
            map.addLayer({ id: `cam-${c.id}`, type: 'circle', source: `cam-${c.id}`,
                paint: { 'circle-radius': c.cor_por ? 7 : 8, 'circle-color': cor, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 } });
        }
        if (c.rotulo !== false) try {
            map.addLayer({
                id: `cam-${c.id}-label`, type: 'symbol', source: `cam-${c.id}`, minzoom: 12.5,
                layout: { 'text-field': ['get', 'nome'], 'text-size': 12, 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                          ...(c.tipo === 'fill' ? {} : { 'text-offset': [0, 1.2], 'text-anchor': 'top' }) },
                paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1.3 }
            });
        } catch (err) { console.warn('Rótulos indisponíveis', err); }
    });

    // Pontos de interesse (estruturas, represas, pivôs)
    const pontos = fazendas.flatMap(f => (f.pontos || []).map(p => ({
        type: 'Feature',
        properties: { nome: p.nome, descricao: p.descricao || '', fazenda: f.id, cor: f.cor,
                      doc_titulo: p.documento ? p.documento.titulo : '', doc_arquivo: p.documento ? p.documento.arquivo : '' },
        geometry: { type: 'Point', coordinates: p.coord }
    })));
    if (pontos.length && !map.getSource('pontos')) {
        map.addSource('pontos', { type: 'geojson', data: { type: 'FeatureCollection', features: pontos } });
        map.addLayer({
            id: 'pontos', type: 'circle', source: 'pontos',
            paint: { 'circle-radius': 7, 'circle-color': '#ffffff', 'circle-stroke-color': ['get', 'cor'], 'circle-stroke-width': 3 }
        });
        try {
            map.addLayer({
                id: 'pontos-rotulo', type: 'symbol', source: 'pontos', minzoom: 13,
                layout: { 'text-field': ['get', 'nome'], 'text-size': 12, 'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'] },
                paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1.3 }
            });
        } catch (err) { console.warn('Rótulos dos pontos indisponíveis', err); }
    }

    // Rótulos com o nome das fazendas
    if (!map.getSource('rotulos')) try {
        map.addSource('rotulos', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: fazendas.filter(f => geojsons[f.id]).map(f => ({
                    type: 'Feature',
                    properties: { nome: f.nome.replace('Fazenda ', '') },
                    geometry: turf.pointOnFeature(geojsons[f.id]).geometry
                }))
            }
        });
        map.addLayer({
            id: 'rotulos', type: 'symbol', source: 'rotulos',
            layout: { 'text-field': ['get', 'nome'], 'text-size': 13, 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'], 'text-max-width': 10 },
            paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1.5 }
        });
    } catch (err) {
        console.warn('Rótulos não disponíveis neste estilo de mapa', err);
    }
    destacarSelecionada();
}

function destacarSelecionada() {
    fazendas.forEach(f => {
        if (!map.getLayer(`${f.id}-line`)) return;
        const ativa = selecionada === f.id;
        const apagada = selecionada && !ativa;
        map.setPaintProperty(`${f.id}-line`, 'line-width', ativa ? 4.5 : 2.5);
        map.setPaintProperty(`${f.id}-line`, 'line-opacity', apagada ? 0.5 : 1);
        map.setPaintProperty(`${f.id}-fill`, 'fill-opacity', ativa ? 0.3 : (apagada ? 0.08 : 0.18));
    });
}

function enquadrarTodas() {
    const todas = { type: 'FeatureCollection', features: Object.values(geojsons).flatMap(g => g.features) };
    if (todas.features.length) map.fitBounds(boundsDe(todas), { padding: 50, duration: 800 });
}

function selecionarFazenda(id, voar) {
    selecionada = id;
    renderFazendas();
    destacarSelecionada();
    if (id && voar && geojsons[id]) {
        map.fitBounds(boundsDe(geojsons[id]), { padding: 60, duration: 900 });
    }
    if (id) {
        const card = document.querySelector(`.farm[data-id="${id}"]`);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function popupHtml(f) {
    const cont = contarStatus(f.adequacoes);
    return `<div class="popup">
        <h3><span class="swatch" style="background:${f.cor}"></span>${esc(f.nome)}</h3>
        <p><strong>Área declarada:</strong> ${fmt(f.area_ha, 2)} ha</p>
        <p><strong>CAR:</strong> <span class="mono">${esc(f.car)}</span></p>
        <p><strong>Adequações:</strong> ${f.adequacoes.length}
           (${cont['Concluída']} concluídas, ${cont['Em andamento']} em andamento, ${cont['Pendente']} pendentes)</p>
        <div class="mini-progress">${barraProgresso(cont, f.adequacoes.length)}</div>
        ${documentosDa(f).map(d => `<button type="button" class="doc-btn" onclick="abrirDocumento('${esc(d.titulo)}', '${esc(d.arquivo)}')">📄 ${esc(d.titulo)}</button>`).join('')}
        <p class="popup-hint">Veja a lista completa no painel ao lado.</p>
    </div>`;
}

map.on('click', (e) => {
    if (map.getLayer('pontos')) {
        const pt = map.queryRenderedFeatures(e.point, { layers: ['pontos'] });
        if (pt.length) {
            const p = pt[0].properties;
            new mapboxgl.Popup({ maxWidth: '280px' }).setLngLat(pt[0].geometry.coordinates)
                .setHTML(`<div class="popup"><h3>${esc(p.nome)}</h3><p>${esc(p.descricao)}</p>${docBotao(p.doc_titulo, p.doc_arquivo)}</div>`).addTo(map);
            selecionarFazenda(p.fazenda, false);
            return;
        }
    }
    const camIds = (window.camadasExtras || []).filter(id => map.getLayer(id));
    if (camIds.length) {
        const hit = map.queryRenderedFeatures(e.point, { layers: camIds });
        if (hit.length) {
            const p = hit[0].properties;
            const c = (window.camadasCfg || []).find(x => `cam-${x.id}` === hit[0].layer.id) || {};
            const badge = c.cor_por && p[c.cor_por]
                ? `<span class="status-badge" style="background:${(c.cores || {})[p[c.cor_por]] || '#777'}">${esc(p[c.cor_por])}</span>` : '';
            // Resumo em texto (portaria, validade e finalidade) + demais campos em lista
            const resumo = p.Portaria
                ? `<p class="popup-resumo"><strong>Portaria ${esc(p.Portaria)}</strong><br>
                   ${p.Validade ? `Validade: <strong>${esc(p.Validade)}</strong><br>` : ''}
                   ${p.Finalidade ? `Finalidade: ${esc(p.Finalidade)}` : ''}</p>` : '';
            const jaNoResumo = p.Portaria ? ['Portaria', 'Validade', 'Finalidade'] : [];
            const tabela = (c.campos || []).filter(k => p[k] && !jaNoResumo.includes(k))
                .map(k => `<dt>${esc(k)}</dt><dd>${esc(p[k])}</dd>`).join('');
            new mapboxgl.Popup({ maxWidth: '320px' }).setLngLat(hit[0].geometry.type === 'Point' ? hit[0].geometry.coordinates : e.lngLat)
                .setHTML(`<div class="popup"><h3>${esc(p.nome)}</h3>${badge}
                    ${resumo}
                    ${p.descricao ? `<p>${esc(p.descricao)}</p>` : ''}
                    ${tabela ? `<dl class="popup-dl">${tabela}</dl>` : ''}
                    ${docBotao(p.doc_titulo, p.doc_arquivo)}${docBotao(p.hist_titulo, p.hist_arquivo)}</div>`).addTo(map);
            return;
        }
    }
    const camadas = fazendas.map(f => `${f.id}-fill`).filter(id => map.getLayer(id));
    const hits = camadas.length ? map.queryRenderedFeatures(e.point, { layers: camadas }) : [];
    // Com o preenchimento oculto, ainda permite clicar dentro do perímetro
    let id = hits.length ? hits[0].properties.id : null;
    if (!id) {
        const pt = turf.point([e.lngLat.lng, e.lngLat.lat]);
        const f = fazendas.find(f => geojsons[f.id] && turf.booleanPointInPolygon(pt, geojsons[f.id].features[0]));
        id = f ? f.id : null;
    }
    if (!id) return;
    const f = fazendas.find(x => x.id === id);
    new mapboxgl.Popup({ maxWidth: '300px' }).setLngLat(e.lngLat).setHTML(popupHtml(f)).addTo(map);
    selecionarFazenda(id, false);
});

map.on('mousemove', (e) => {
    const camadas = fazendas.map(f => `${f.id}-fill`).filter(id => map.getLayer(id));
    if (map.getLayer('pontos')) camadas.push('pontos');
    window.camadasExtras?.forEach(id => { if (map.getLayer(id)) camadas.push(id); });
    const over = camadas.length && map.queryRenderedFeatures(e.point, { layers: camadas }).length > 0;
    map.getCanvas().style.cursor = over ? 'pointer' : '';
});

// Recoloca as camadas sempre que o estilo do mapa muda
map.on('style.load', () => { if (fazendas.length) adicionarCamadas(); });

// ---------- controles ----------
document.querySelectorAll('.segmented button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.segmented button').forEach(b => b.classList.toggle('active', b === btn));
        map.setStyle(ESTILOS[btn.dataset.style] || btn.dataset.style);
    });
});
document.getElementById('toggleFill').addEventListener('change', (e) => {
    mostrarPreenchimento = e.target.checked;
    fazendas.forEach(f => {
        if (map.getLayer(`${f.id}-fill`)) map.setLayoutProperty(`${f.id}-fill`, 'visibility', mostrarPreenchimento ? 'visible' : 'none');
    });
});
document.getElementById('centerMap').addEventListener('click', () => { selecionarFazenda(null, false); enquadrarTodas(); });

const toggle = document.getElementById('panelToggle');
toggle.addEventListener('click', () => {
    const fechado = document.body.classList.toggle('panel-closed');
    toggle.setAttribute('aria-expanded', String(!fechado));
    setTimeout(() => map.resize(), 250);
});

// ---------- carregamento ----------
async function iniciar() {
    const resp = await fetch('data/fazendas.json', { cache: 'no-cache' });
    const dados = await resp.json();
    const cliente = dados.cliente || {};
    document.getElementById('clienteNome').textContent = cliente.nome || 'Mapa interativo';
    document.getElementById('clienteSub').textContent = cliente.subtitulo || '';
    if (cliente.selo) {
        const selo = document.createElement('span');
        selo.className = 'demo-badge';
        selo.textContent = cliente.selo;
        document.getElementById('clienteSub').after(selo);
    }
    if (cliente.nome) document.title = `${cliente.nome} – Mapa Interativo`;
    if (cliente.centro) map.jumpTo({ center: cliente.centro, zoom: cliente.zoom || 12 });
    fazendas = dados.fazendas.map((f, i) => ({ ...f, cor: f.cor || PALETA[i % PALETA.length] }));
    if (!fazendas.length) {
        document.getElementById('farmList').innerHTML = '<p class="hint">Mapa em preparação. Os dados das propriedades serão incluídos em breve.</p>';
    }
    if (dados.atualizado_em) {
        const [a, m, d] = dados.atualizado_em.split('-');
        document.getElementById('updatedAt').textContent = `${d}/${m}/${a}`;
    }
    await Promise.all(fazendas.map(async f => {
        try {
            const r = await fetch(f.arquivo, { cache: 'no-cache' });
            geojsons[f.id] = await r.json();
        } catch (err) {
            console.error(`Não foi possível carregar ${f.arquivo}`, err);
        }
    }));
    camadas = dados.camadas || [];
    window.camadasExtras = camadas.map(c => `cam-${c.id}`);
    window.camadasCfg = camadas;
    await Promise.all(camadas.map(async c => {
        try { camadasData[c.id] = await (await fetch(c.arquivo, { cache: 'no-cache' })).json(); }
        catch (err) { console.error(`Não foi possível carregar ${c.arquivo}`, err); }
    }));
    renderResumo();
    renderFazendas();
    renderLegenda();
    renderPrazos(dados.prazos);
    const pronto = () => { adicionarCamadas(); enquadrarTodas(); };
    if (map.isStyleLoaded()) pronto(); else map.once('load', pronto);
}
iniciar();
