mapboxgl.accessToken = 'pk.eyJ1IjoiY3NhbWJpZW50YWwiLCJhIjoiY205MWk4eHU4MDE3czJxcHNqamR4emd5aiJ9.e8K-ENRHJwXTz_FGGwYExg';

// Inicializar o mapa
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-v9',
    center: [-51.275, -23.815],
    zoom: 13,
    preserveDrawingBuffer: true // Habilitar para captura com html2canvas
});

// Adicionar controles de navegação (bússola) e escala
map.addControl(new mapboxgl.NavigationControl({ showCompass: true, showZoom: false }), 'top-right');
map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');

// Configurar ferramenta de medição
let draw;
try {
    draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
            line_string: false,
            polygon: false,
            trash: false
        }
    });
    map.addControl(draw, 'top-left');
    console.log('[DEBUG] MapboxDraw inicializado com sucesso');
} catch (error) {
    console.error('[ERROR] Erro ao inicializar MapboxDraw:', error);
}

// Camadas e suas configurações
const layers = {
    'AreaDaPropriedade': { url: 'data/area_da_propriedade.geojson', color: 'red', type: 'fill' },
    'AreaDaPropriedadeOutline': { url: 'data/area_da_propriedade.geojson', color: 'red', type: 'line' },
    'AreaConsolidada': { url: 'data/area_consolidada.geojson', color: 'brown', type: 'fill' },
    'APP': { url: 'data/app.geojson', color: 'green', type: 'fill' },
    'ReservaLegal': { url: 'data/reserva_legal.geojson', color: 'yellow', type: 'fill' },
    'Nascentes': { url: 'data/nascentes.geojson', color: 'blue', type: 'circle', paint: { 'circle-radius': 5, 'circle-color': 'blue' } },
    'Hidrografia': { url: 'data/hidrografia.geojson', color: 'cyan', type: 'fill' },
    'Reservatorio': { url: 'data/reservatorio.geojson', color: 'blue', type: 'fill' },
    'VegetacaoNativa': { url: 'data/vegetacao_nativa.geojson', color: 'darkgreen', type: 'fill' },
    'BarracaoConstrucao': { url: 'data/barracao_construcao.geojson', color: 'gray', type: 'fill' },
    'Barracao1': { url: 'data/barracao1.geojson', color: 'darkgray', type: 'fill' },
    'Confinamento': { url: 'data/confinamento.geojson', color: 'orange', type: 'fill' },
    'Escritorio': { url: 'data/escritorio.geojson', color: 'lightblue', type: 'fill' },
    'LagoaContencao': { url: 'data/lagoa_contencao.geojson', color: 'blue', type: 'fill' },
    'Residuos': { url: 'data/residuos.geojson', color: 'purple', type: 'fill' },
    'Sede': { url: 'data/sede.geojson', color: 'pink', type: 'fill' },
    'ServidaoAdministrativa': { url: 'data/servidao_administrativa.geojson', color: 'magenta', type: 'fill' },
    'Silo': { url: 'data/silo.geojson', color: 'silver', type: 'fill' }
};

// Mapeamento de nomes das camadas
const layerNames = {
    'AreaDaPropriedade': 'Área do Imóvel',
    'AreaDaPropriedadeOutline': 'Perímetro da Propriedade',
    'AreaConsolidada': 'Área Consolidada',
    'APP': 'APP',
    'ReservaLegal': 'Reserva Legal',
    'Nascentes': 'Nascentes',
    'Hidrografia': 'Hidrografia',
    'Reservatorio': 'Reservatório',
    'VegetacaoNativa': 'Vegetação Nativa',
    'BarracaoConstrucao': 'Barracão Construção',
    'Barracao1': 'Barracão 1',
    'Confinamento': 'Confinamento',
    'Escritorio': 'Escritório',
    'LagoaContencao': 'Lagoa de Contenção',
    'Residuos': 'Resíduos',
    'Sede': 'Sede',
    'ServidaoAdministrativa': 'Servidão Administrativa',
    'Silo': 'Silo'
};

// Camadas de infraestrutura (para opacidade 1.0)
const infraLayers = [
    'BarracaoConstrucao',
    'Barracao1',
    'Confinamento',
    'Escritorio',
    'Residuos',
    'Sede',
    'ServidaoAdministrativa',
    'Silo'
];

// Esquema padronizado dos atributos (todas as camadas usam os mesmos campos)
//   tema      -> nome da feição
//   situacao  -> Conforme | Em adequação | Não Conforme (só estruturas avaliadas)
//   descricao -> detalhes exibidos no pop-up
//   area      -> área em hectares (opcional; se ausente, é calculada)
const STATUS_COLORS = {
    'Conforme': '#2e9e5b',
    'Em adequação': '#e0a100',
    'Não Conforme': '#d43d3d'
};
const STATUS_FILTER_IDS = {
    'Conforme': 'showConforme',
    'Em adequação': 'showEmAdequacao',
    'Não Conforme': 'showNaoConforme'
};

// Formata número no padrão brasileiro
function fmt(n, casas = 2) {
    return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

// Situações marcadas nos filtros
function getAllowedStatuses() {
    return Object.entries(STATUS_FILTER_IDS)
        .filter(([, id]) => document.getElementById(id)?.checked)
        .map(([status]) => status);
}

// Filtro: feições sem avaliação sempre aparecem; as avaliadas seguem os filtros
function getStatusFilter() {
    return ['any', ['!', ['has', 'situacao']], ['in', ['get', 'situacao'], ['literal', getAllowedStatuses()]]];
}

// Documentos anexos por camada (licenças, outorgas etc.)
// Para anexar um novo documento a outra camada, basta adicionar uma entrada aqui.
const layerDocuments = {
    'Confinamento': {
        titulo: 'Licença Ambiental Simplificada (LAS)',
        orgao: 'IAT - Instituto Água e Terra',
        validade: '13/11/2027',
        arquivo: 'docs/licenca_confinamento.pdf',
        aviso: 'Dados pessoais, de localização e de identificação do processo suprimidos (LGPD).'
    }
};

// Abre o visualizador do documento anexo de uma camada
function openLayerDocument(layerName) {
    const doc = layerDocuments[layerName];
    if (!doc) return;
    document.getElementById('docModalLabel').textContent = doc.titulo;
    document.getElementById('docModalInfo').innerHTML =
        `<strong>Órgão:</strong> ${doc.orgao} &nbsp;|&nbsp; <strong>Validade:</strong> ${doc.validade}${doc.aviso ? `<br><em>${doc.aviso}</em>` : ''}`;
    document.getElementById('docModalFrame').src = doc.arquivo;
    document.getElementById('docModalOpen').href = doc.arquivo;
    document.getElementById('docModalDownload').href = doc.arquivo;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('docModal')).show();
}

// Limpa o PDF ao fechar o visualizador
document.getElementById('docModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('docModalFrame').src = 'about:blank';
});

// Função para gerar conteúdo do pop-up
function generatePopupContent(layerName, feature) {
    const properties = feature.properties || {};
    const displayName = properties.tema || layerNames[layerName] || layerName;
    let areaTxt = '';
    if (typeof properties.area === 'number') {
        areaTxt = `${fmt(properties.area)} ha`;
    } else if (feature.geometry && feature.geometry.type.includes('Polygon')) {
        const ha = turf.area(feature) / 10000;
        areaTxt = ha < 1 ? `${fmt(ha * 10000, 0)} m²` : `${fmt(ha)} ha`;
    }
    const situacao = properties.situacao;
    const badge = situacao
        ? `<span class="status-badge" style="background:${STATUS_COLORS[situacao] || '#777'}">${situacao}</span>`
        : '';
    const doc = layerDocuments[layerName];
    const docButton = doc ? `<button type="button" class="btn btn-warning btn-sm w-100 mt-2" onclick="openLayerDocument('${layerName}')">📄 Ver ${doc.titulo.split(' (')[0]}</button>` : '';
    return `<div class="popup">
        <h3>${displayName}</h3>
        ${badge}
        <p>${properties.descricao || ''}${areaTxt ? `<br><strong>Área:</strong> ${areaTxt}` : ''}</p>
        ${docButton}
    </div>`;
}

// Função para carregar GeoJSON e adicionar camada
async function loadLayer(layerName, config, beforeLayer = null) {
    try {
        console.log(`[DEBUG] Iniciando carregamento da camada ${layerName}`);
        const errorSpan = document.getElementById(`error${layerName}`);
        const checkbox = document.getElementById(`layer${layerName}`);
        const label = document.querySelector(`label[for="layer${layerName}"]`);
        if (label) {
            console.log(`[DEBUG] Label para ${layerName} encontrado: ${label.textContent}`);
        } else {
            console.warn(`[WARN] Label para ${layerName} não encontrado no DOM`);
        }
        if (errorSpan) errorSpan.textContent = ''; // Limpar mensagem de erro
        if (checkbox) checkbox.disabled = false; // Reativar checkbox
        let data;
        if (config.url) {
            console.log(`[DEBUG] Tentando carregar de ${config.url}`);
            const response = await fetch(config.url);
            if (!response.ok) {
                console.warn(`[WARN] Falha ao carregar ${config.url}: HTTP ${response.status} - ${response.statusText}`);
                if (errorSpan) errorSpan.textContent = ' (Não encontrado)';
                if (checkbox) checkbox.disabled = true;
                return null;
            }
            const text = await response.text();
            if (!text) {
                console.warn(`[WARN] Arquivo ${config.url} está vazio`);
                if (errorSpan) errorSpan.textContent = ' (Vazio)';
                if (checkbox) checkbox.disabled = true;
                return null;
            }
            data = JSON.parse(text);
            console.log(`[DEBUG] GeoJSON carregado de ${config.url}:`, data);
        } else {
            console.warn(`[WARN] Nenhuma URL fornecida para ${layerName}`);
            if (errorSpan) errorSpan.textContent = ' (Sem URL)';
            if (checkbox) checkbox.disabled = true;
            return null;
        }
        // Especial para AreaDaPropriedadeOutline: Converter polígono para linha
        if (layerName === 'AreaDaPropriedadeOutline') {
            console.log('[DEBUG] Convertendo polígono para LineString para AreaDaPropriedadeOutline');
            try {
                const coordinates = data.features[0].geometry.type === 'Polygon' ? 
                    data.features[0].geometry.coordinates[0] : 
                    data.features[0].geometry.type === 'MultiPolygon' ? data.features[0].geometry.coordinates[0][0] : null;
                if (!coordinates) {
                    console.warn(`[WARN] Não foi possível converter polígono para LineString para ${layerName}`);
                    if (errorSpan) errorSpan.textContent = ' (Geometria inválida)';
                    if (checkbox) checkbox.disabled = true;
                    return null;
                }
                data = turf.lineString(coordinates);
            } catch (error) {
                console.warn(`[WARN] Erro ao converter polígono para LineString para ${layerName}:`, error);
                if (errorSpan) errorSpan.textContent = ' (Geometria inválida)';
                if (checkbox) checkbox.disabled = true;
                return null;
            }
        }
        // Validar GeoJSON
        if (!data || !data.type || !data.features || !data.features.length) {
            console.warn(`[WARN] GeoJSON inválido ou vazio para ${layerName}`);
            if (errorSpan) errorSpan.textContent = ' (Inválido)';
            if (checkbox) checkbox.disabled = true;
            return null;
        }
        // Verificar tipo de geometria esperado
        const expectedType = config.type === 'fill' ? 'Polygon' : config.type === 'line' ? 'LineString' : config.type === 'circle' ? 'Point' : null;
        const isValidGeometry = data.features ? 
            data.features.every(feature => feature.geometry && (feature.geometry.type === expectedType || feature.geometry.type === 'Multi' + expectedType)) :
            data.geometry && (data.geometry.type === expectedType || data.geometry.type === 'Multi' + expectedType);
        if (!isValidGeometry) {
            console.warn(`[WARN] Geometria inválida para ${layerName}. Esperado: ${expectedType} ou Multi${expectedType}`);
            if (errorSpan) errorSpan.textContent = ' (Geometria inválida)';
            if (checkbox) checkbox.disabled = true;
            return null;
        }
        // Adicionar fonte
        if (!map.getSource(layerName)) {
            console.log(`[DEBUG] Adicionando fonte para ${layerName}`);
            map.addSource(layerName, { type: 'geojson', data });
        } else {
            console.log(`[DEBUG] Fonte ${layerName} já existe, atualizando dados`);
            map.getSource(layerName).setData(data);
        }
        const layerConfig = {
            id: layerName,
            type: config.type,
            source: layerName
        };
        if (config.type === 'fill') {
            layerConfig.paint = {
                'fill-color': config.color,
                'fill-opacity': infraLayers.includes(layerName) ? 1.0 : (layerName === 'AreaDaPropriedade' ? 0.15 : 0.3)
            };
        } else if (config.type === 'line') {
            layerConfig.paint = {
                'line-color': config.color,
                'line-width': 2
            };
        } else if (config.type === 'circle') {
            layerConfig.paint = config.paint;
        }
        // Filtro de situação (feições sem avaliação sempre aparecem)
        if (layerName !== 'AreaDaPropriedade' && layerName !== 'AreaDaPropriedadeOutline') {
            layerConfig.filter = getStatusFilter();
        }
        if (!map.getLayer(layerName)) {
            map.addLayer(layerConfig, beforeLayer);
        }
        // Semáforo: contorno colorido conforme a situação das estruturas avaliadas
        const temSituacao = data.features && data.features.some(f => f.properties && f.properties.situacao);
        if (config.type === 'fill' && temSituacao && !map.getLayer(`${layerName}Status`)) {
            map.addLayer({
                id: `${layerName}Status`,
                type: 'line',
                source: layerName,
                filter: getStatusFilter(),
                paint: {
                    'line-color': ['match', ['get', 'situacao'],
                        'Conforme', STATUS_COLORS['Conforme'],
                        'Em adequação', STATUS_COLORS['Em adequação'],
                        'Não Conforme', STATUS_COLORS['Não Conforme'],
                        '#ffffff'],
                    'line-width': 3
                }
            });
        }
        // Centralizar no polígono da propriedade
        if (layerName === 'AreaDaPropriedade') {
            console.log(`[DEBUG] Centralizando mapa na camada ${layerName}`);
            const bounds = turf.bbox(data);
            map.fitBounds(bounds, { padding: 50 });
        }
        return data;
    } catch (error) {
        console.error(`[ERROR] Erro ao carregar camada ${layerName}:`, error);
        const errorSpan = document.getElementById(`error${layerName}`);
        if (errorSpan) errorSpan.textContent = ' (Erro)';
        const checkbox = document.getElementById(`layer${layerName}`);
        if (checkbox) checkbox.disabled = true;
        return null;
    }
}

// Função para calcular área de uma camada
async function calculateLayerArea(layerName, config) {
    try {
        if (config.type !== 'fill') return { layerName, area: -1 }; // Camadas não poligonais têm área -1
        const response = await fetch(config.url);
        if (!response.ok) return { layerName, area: 0 };
        const data = await response.json();
        if (!data || !data.features || !data.features.length) return { layerName, area: 0 };
        const area = turf.area(data) / 10000; // Área em hectares
        console.log(`[DEBUG] Área calculada para ${layerName}: ${area.toFixed(2)} ha`);
        return { layerName, area };
    } catch (error) {
        console.error(`[ERROR] Erro ao calcular área para ${layerName}:`, error);
        return { layerName, area: 0 };
    }
}

// Área (ha) de uma camada já carregada
function layerAreaHa(name) {
    const src = map.getSource(name);
    return src && src._data ? turf.area(src._data) / 10000 : null;
}

// Painel de indicadores do imóvel
const RL_MINIMA = 0.20; // Reserva Legal mínima fora da Amazônia Legal (Lei 12.651/2012, art. 12)
async function updateSummary() {
    const total = layerAreaHa('AreaDaPropriedade');
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const bar = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = `${Math.min(pct, 100)}%`; };

    set('areaPropriedade', total ? fmt(total) : 'N/D');

    const itens = {
        AreaConsolidada: 'areaConsolidada',
        APP: 'areaAPP',
        VegetacaoNativa: 'areaVegetacaoNativa',
        Reservatorio: 'areaReservatorio',
        ServidaoAdministrativa: 'areaServidaoAdministrativa'
    };
    Object.entries(itens).forEach(([layer, id]) => {
        const ha = layerAreaHa(layer);
        set(id, ha !== null ? fmt(ha) : 'N/D');
        set(`${id}Pct`, ha !== null && total ? `${fmt(ha / total * 100, 1)}%` : '');
        bar(`${id}Bar`, ha !== null && total ? ha / total * 100 : 0);
    });

    // Reserva Legal x exigência mínima
    const rl = layerAreaHa('ReservaLegal');
    set('areaReserva', rl !== null ? fmt(rl) : 'N/D');
    if (rl !== null && total) {
        const pct = rl / total * 100;
        const exigida = total * RL_MINIMA;
        const saldo = rl - exigida;
        set('rlPct', `${fmt(pct, 1)}% do imóvel`);
        bar('rlBar', pct / 40 * 100); // escala da barra: 0 a 40%
        const st = document.getElementById('rlStatus');
        if (st) {
            st.textContent = saldo >= 0
                ? `Atende o mínimo de 20% (${fmt(exigida)} ha) · excedente de ${fmt(saldo)} ha`
                : `Abaixo do mínimo de 20% (${fmt(exigida)} ha) · déficit de ${fmt(-saldo)} ha`;
            st.className = saldo >= 0 ? 'rl-status ok' : 'rl-status deficit';
        }
        document.getElementById('rlBar')?.classList.toggle('deficit', saldo < 0);
    }

    const nasc = map.getSource('Nascentes');
    set('countNascentes', nasc && nasc._data ? nasc._data.features.length : 'N/D');
    updateStatusCounts();
}

// Contador do semáforo de conformidade
function updateStatusCounts() {
    const contagem = { 'Conforme': 0, 'Em adequação': 0, 'Não Conforme': 0 };
    Object.keys(layers).forEach(name => {
        const src = map.getSource(name);
        if (!src || !src._data || !src._data.features) return;
        const cb = document.getElementById(`layer${name}`);
        if (cb && !cb.checked) return;
        src._data.features.forEach(f => {
            const s = f.properties && f.properties.situacao;
            if (s in contagem) contagem[s]++;
        });
    });
    document.getElementById('countConforme').textContent = contagem['Conforme'];
    document.getElementById('countEmAdequacao').textContent = contagem['Em adequação'];
    document.getElementById('countNaoConforme').textContent = contagem['Não Conforme'];
}

// Função para calcular medições
function updateMeasurement() {
    if (!draw) return;
    const data = draw.getAll();
    const resultDiv = document.getElementById('measurementResult');
    if (data.features.length > 0) {
        const feature = data.features[0];
        if (feature.geometry.type === 'LineString') {
            const length = turf.length(feature, { units: 'meters' });
            resultDiv.innerHTML = `Distância: ${length.toFixed(2)} metros`;
        } else if (feature.geometry.type === 'Polygon') {
            const area = turf.area(feature) / 10000;
            resultDiv.innerHTML = `Área: ${area.toFixed(2)} ha`;
        }
    } else {
        resultDiv.innerHTML = '';
    }
}

// Função para mostrar/esconder spinner de carregamento
function showLoading() {
    document.getElementById('loading').style.display = 'block';
}
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Função para atualizar legenda
function updateLegend() {
    let legend = document.querySelector('.legend');
    if (!legend) {
        console.log('[DEBUG] Elemento .legend não encontrado, criando dinamicamente');
        legend = document.createElement('div');
        legend.className = 'legend';
        map.getContainer().appendChild(legend);
    }
    let html = '<h4>Legenda</h4>';
    const categories = {
        'Áreas Ambientais': ['AreaDaPropriedade', 'AreaDaPropriedadeOutline', 'AreaConsolidada', 'APP', 'ReservaLegal', 'VegetacaoNativa'],
        'Hidrografia': ['Nascentes', 'Hidrografia', 'Reservatorio', 'LagoaContencao'],
        'Infraestrutura': ['BarracaoConstrucao', 'Barracao1', 'Confinamento', 'Escritorio', 'Residuos', 'Sede', 'ServidaoAdministrativa', 'Silo']
    };
    Object.entries(categories).forEach(([category, layerNamesList]) => {
        html += `<strong>${category}</strong><br>`;
        layerNamesList.forEach(layerName => {
            const checkbox = document.getElementById(`layer${layerName}`);
            if (checkbox && checkbox.checked && !checkbox.disabled && map.getLayer(layerName)) {
                const config = layers[layerName];
                const displayName = layerNames[layerName] || layerName;
                const style = config.type === 'circle' ? `background: ${config.paint['circle-color']}; border-radius: 50%; width: 10px; height: 10px;` :
                    `background: ${config.color}; opacity: ${infraLayers.includes(layerName) ? 1.0 : (layerName === 'AreaDaPropriedade' ? 0.15 : 0.3)}`;
                console.log(`[DEBUG] Adicionando à legenda: ${layerName} -> ${displayName}, Estilo: ${style}`);
                if (layerDocuments[layerName]) {
                    html += `<span class="legend-doc" role="button" tabindex="0" data-doc="${layerName}" title="Clique para ver a licença ambiental"><i style="${style}"></i> ${displayName} 📄</span><br>`;
                } else {
                    html += `<i style="${style}"></i> ${displayName}<br>`;
                }
            }
        });
    });
    legend.innerHTML = html;
    legend.querySelectorAll('.legend-doc').forEach(item => {
        item.addEventListener('click', () => openLayerDocument(item.dataset.doc));
        item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLayerDocument(item.dataset.doc); } });
    });
    console.log('[DEBUG] Legenda atualizada com HTML:', html);
}

// Função para exportar relatório em PDF
async function exportToPDF() {
    showLoading();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // Página 1: Capa
    doc.setFontSize(25);
    doc.text('Diagnóstico Ambiental Rural', pageWidth / 2, 30, { align: 'center' });
    doc.setFontSize(20);
    doc.text('Fazenda Modelo', pageWidth / 2, 40, { align: 'center' });
    doc.setFontSize(11);
    doc.text('Modelo demonstrativo – dados ilustrativos', pageWidth / 2, 48, { align: 'center' });
    try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'Anonymous';
        logoImg.src = 'logo.png';
        await new Promise((resolve, reject) => {
            logoImg.onload = resolve;
            logoImg.onerror = () => reject(new Error('Falha ao carregar logo'));
        });
        const logoWidth = 100; // Logo com 60mm de largura
        const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
        doc.addImage(logoImg, 'PNG', (pageWidth - logoWidth) / 2, 60, logoWidth, logoHeight);
    } catch (error) {
        console.error('[ERROR] Erro ao carregar logo para PDF:', error);
        doc.setFontSize(12);
        doc.text('Logo não disponível', pageWidth / 2, 60, { align: 'center' });
    }

    // Página 2: Mapa e Tabela Resumo
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Mapa da Propriedade', margin, 20);

    let mapHeight = 0;
    try {
        // Aguardar renderização completa do mapa
        await new Promise(resolve => setTimeout(resolve, 500));
        const mapCanvas = await html2canvas(document.getElementById('map'), { 
            useCORS: true,
            scale: 2 // Resolução alta
        });
        const mapWidth = pageWidth - 2 * margin;
        mapHeight = (mapCanvas.height / mapCanvas.width) * mapWidth; // Reduzir altura do mapa
        doc.addImage(mapCanvas.toDataURL('image/png'), 'PNG', margin, 30, mapWidth, mapHeight);
    } catch (error) {
        console.error('[ERROR] Erro ao capturar mapa para PDF:', error);
        doc.setFontSize(12);
        doc.text('Mapa não disponível', margin, 30);
    }

    // Tabela Resumo (na mesma página do mapa)
    doc.setFontSize(14);
    const tableStartY = 30 + mapHeight + 10;
    doc.text('Resumo Ambiental', margin, tableStartY);
    const summaryData = [
        ['Item', 'Valor'],
        ['Área do imóvel', document.getElementById('areaPropriedade').textContent + ' ha'],
        ['Área Consolidada', document.getElementById('areaConsolidada').textContent + ' ha'],
        ['Área APP', document.getElementById('areaAPP').textContent + ' ha'],
        ['Reserva Legal', document.getElementById('areaReserva').textContent + ' ha (' + document.getElementById('rlPct').textContent + ')'],
        ['Área Reservatório', document.getElementById('areaReservatorio').textContent + ' ha'],
        ['Vegetação Nativa', document.getElementById('areaVegetacaoNativa').textContent + ' ha'],
        ['Servidão Administrativa', document.getElementById('areaServidaoAdministrativa').textContent + ' ha'],
        ['Nascentes', document.getElementById('countNascentes').textContent]
    ];
    doc.autoTable({
        head: [summaryData[0]],
        body: summaryData.slice(1),
        startY: tableStartY + 10, // Posicionar tabela abaixo do título
        margin: { left: margin, right: margin },
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [51, 51, 51], textColor: [255, 255, 255] }
    });

    doc.save('Diagnostico_Ambiental_Fazenda_Modelo.pdf');
    hideLoading();
}

// Carregar camadas quando o mapa estiver pronto
map.on('load', async () => {
    console.log('[DEBUG] Mapa carregado, iniciando carregamento das camadas');
    showLoading();
    // Calcular áreas e ordenar camadas (menores em cima)
    const areaPromises = Object.entries(layers)
        .filter(([layerName]) => document.getElementById(`layer${layerName}`)?.checked)
        .map(([layerName, config]) => calculateLayerArea(layerName, config));
    const areas = await Promise.all(areaPromises);
    // Separar camadas poligonais e não poligonais
    const fillLayers = areas.filter(item => item.area >= 0).sort((a, b) => a.area - b.area); // Ordem ascendente (menores em cima)
    const nonFillLayers = areas.filter(item => item.area < 0).map(item => item.layerName);
    console.log('[DEBUG] Camadas poligonais ordenadas por área (menores primeiro):', fillLayers);
    console.log('[DEBUG] Camadas não poligonais:', nonFillLayers);
    // Carregar camadas poligonais
    let beforeLayer = null;
    for (const { layerName } of fillLayers) {
        if (document.getElementById(`layer${layerName}`)?.checked) {
            const data = await loadLayer(layerName, layers[layerName], beforeLayer);
            if (data && layerName === 'AreaDaPropriedade') {
                const bounds = turf.bbox(data);
                map.fitBounds(bounds, { padding: 50 });
            }
            beforeLayer = layerName;
        }
    }
    // Carregar camadas não poligonais por último
    for (const layerName of nonFillLayers) {
        if (document.getElementById(`layer${layerName}`)?.checked && layerName !== 'AreaDaPropriedadeOutline') {
            await loadLayer(layerName, layers[layerName], beforeLayer);
            beforeLayer = layerName;
        }
    }
    // Carregar AreaDaPropriedadeOutline por último, se válido
    if (document.getElementById('layerAreaDaPropriedadeOutline')?.checked) {
        await loadLayer('AreaDaPropriedadeOutline', layers['AreaDaPropriedadeOutline'], beforeLayer);
    }
    console.log('[DEBUG] Atualizando resumo');
    updateSummary();
    console.log('[DEBUG] Atualizando legenda');
    updateLegend();
    hideLoading();
});

// Clique no mapa: um único pop-up, da feição que está por cima
function clickableLayers() {
    return Object.keys(layers).filter(id => id !== 'AreaDaPropriedade' && id !== 'AreaDaPropriedadeOutline' && map.getLayer(id));
}
map.on('click', (e) => {
    if (draw && (draw.getMode() === 'draw_line_string' || draw.getMode() === 'draw_polygon')) return;
    const feats = map.queryRenderedFeatures(e.point, { layers: clickableLayers() });
    if (!feats.length) return;
    const f = feats[0];
    new mapboxgl.Popup({ maxWidth: '280px' })
        .setLngLat(e.lngLat)
        .setHTML(generatePopupContent(f.layer.id, f))
        .addTo(map);
});
map.on('mousemove', (e) => {
    const ids = clickableLayers();
    const over = ids.length && map.queryRenderedFeatures(e.point, { layers: ids }).length > 0;
    map.getCanvas().style.cursor = over ? 'pointer' : '';
});

// Finalizar medição com botão direito ou toque duplo
let drawing = false;
map.on('mousedown', (e) => {
    if (e.originalEvent.button === 2 && (draw.getMode() === 'draw_line_string' || draw.getMode() === 'draw_polygon')) {
        drawing = false;
        draw.changeMode('simple_select');
        updateMeasurement();
        console.log('[DEBUG] Medição finalizada com botão direito');
    } else if (e.originalEvent.button === 0 && (draw.getMode() === 'draw_line_string' || draw.getMode() === 'draw_polygon')) {
        drawing = true;
    }
});

// Suporte a toque duplo para finalizar medição
map.on('touchend', (e) => {
    if (e.originalEvent.touches.length === 0 && (draw.getMode() === 'draw_line_string' || draw.getMode() === 'draw_polygon')) {
        drawing = false;
        draw.changeMode('simple_select');
        updateMeasurement();
        console.log('[DEBUG] Medição finalizada com toque duplo');
    }
});

map.on('draw.create', () => {
    if (drawing) {
        updateMeasurement();
    }
});

map.on('draw.delete', updateMeasurement);
map.on('draw.update', () => {
    if (drawing) {
        updateMeasurement();
    }
});

// Filtros de conformidade
function applyFilters() {
    const filtro = getStatusFilter();
    Object.keys(layers).forEach(layerName => {
        if (layerName === 'AreaDaPropriedade' || layerName === 'AreaDaPropriedadeOutline') return;
        [layerName, `${layerName}Status`].forEach(id => {
            if (map.getLayer(id)) map.setFilter(id, filtro);
        });
    });
    updateStatusCounts();
}

// Eventos de filtros e camadas
Object.values(STATUS_FILTER_IDS).forEach(id => {
    document.getElementById(id)?.addEventListener('change', applyFilters);
});
Object.keys(layers).forEach(layerName => {
    const checkbox = document.getElementById(`layer${layerName}`);
    if (checkbox) {
        console.log(`[DEBUG] Checkbox ${layerName} encontrado no DOM`);
        const label = document.querySelector(`label[for="layer${layerName}"]`);
        if (label) {
            console.log(`[DEBUG] Label para ${layerName} encontrado: ${label.textContent}`);
        } else {
            console.warn(`[WARN] Label para ${layerName} não encontrado no DOM`);
        }
        checkbox.addEventListener('change', async () => {
            console.log(`[DEBUG] Checkbox ${layerName} alterado para ${checkbox.checked}`);
            if (checkbox.checked) {
                if (!map.getLayer(layerName)) {
                    await loadLayer(layerName, layers[layerName]);
                } else {
                    map.setLayoutProperty(layerName, 'visibility', 'visible');
                }
                if (map.getLayer(`${layerName}Status`)) map.setLayoutProperty(`${layerName}Status`, 'visibility', 'visible');
            } else {
                [layerName, `${layerName}Status`].forEach(id => {
                    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
                });
            }
            applyFilters();
            updateLegend();
        });
    } else {
        console.warn(`[WARN] Checkbox layer${layerName} não encontrado no DOM`);
    }
});

// Eventos de medição
if (draw) {
    document.getElementById('drawLine').addEventListener('click', () => {
        draw.changeMode('draw_line_string');
        drawing = true;
        console.log('[DEBUG] Modo de medição de distância ativado');
    });
    document.getElementById('drawPolygon').addEventListener('click', () => {
        draw.changeMode('draw_polygon');
        drawing = true;
        console.log('[DEBUG] Modo de medição de área ativado');
    });
    document.getElementById('clearDraw').addEventListener('click', () => {
        draw.deleteAll();
        updateMeasurement();
        drawing = false;
        console.log('[DEBUG] Medições limpas');
    });
}

// Evento para exportar PDF
document.getElementById('exportPDF').addEventListener('click', () => {
    console.log('[DEBUG] Iniciando exportação de PDF');
    exportToPDF();
});

// Redimensionar mapa ao colapsar/expandir dashboard
document.getElementById('dashboardCollapse').addEventListener('hidden.bs.collapse', () => {
    map.resize();
    console.log('[DEBUG] Mapa redimensionado após colapsar dashboard');
});
document.getElementById('dashboardCollapse').addEventListener('shown.bs.collapse', () => {
    map.resize();
    console.log('[DEBUG] Mapa redimensionado após expandir dashboard');
});