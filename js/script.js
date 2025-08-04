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
    'AreaDaPropriedade': 'Área Declarada no CAR',
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

// Mapeamento de propriedades dos GeoJSON
const layerProperties = {
    'AreaDaPropriedade': { area: 'num_area', conformidade: 'des_condic', detalhes: 'cod_imovel', fallbackArea: 530.18, fallbackConformidade: 'N/A', fallbackDetalhes: 'N/A' },
    'AreaConsolidada': { area: 'area', conformidade: null, detalhes: 'tema', fallbackArea: 424.84, fallbackConformidade: 'Conforme', fallbackDetalhes: 'Área Consolidada' },
    'APP': { area: 'area', conformidade: null, detalhes: 'tema', fallbackArea: 37.44, fallbackConformidade: 'Conforme', fallbackDetalhes: 'APP Total' },
    'ReservaLegal': { area: 'area', conformidade: null, detalhes: 'tema', fallbackArea: 164.08, fallbackConformidade: 'Conforme', fallbackDetalhes: 'Reserva Legal Proposta' },
    'Reservatorio': { area: 'area', conformidade: null, detalhes: 'tema', fallbackArea: 7.35, fallbackConformidade: 'N/A', fallbackDetalhes: 'Reservatório artificial decorrente de barramento ou represamento de cursos d\'água naturais, Outorga: 11.520' },
    'VegetacaoNativa': { area: 'area', conformidade: null, detalhes: 'tema', fallbackArea: 82.04, fallbackConformidade: 'Conforme', fallbackDetalhes: 'Remanescente de Vegetação Nativa' },
    'ServidaoAdministrativa': { area: 'area', conformidade: null, detalhes: 'tema', fallbackArea: 26.49, fallbackConformidade: 'Conforme', fallbackDetalhes: 'Infraestrutura Pública, Área de Servidão Administrativa Total' },
    'Nascentes': { area: null, conformidade: null, detalhes: 'tema', fallbackArea: null, fallbackConformidade: 'Conforme', fallbackDetalhes: 'Nascente ou olho d\'água perene' },
    'Hidrografia': { area: 'area', conformidade: null, detalhes: 'tema', fallbackArea: 4.38, fallbackConformidade: 'Conforme', fallbackDetalhes: 'Curso d\'água natural de até 10 metros' },
    'AreaDaPropriedadeOutline': { area: null, conformidade: 'des_condic', detalhes: 'cod_imovel', fallbackArea: null, fallbackConformidade: 'N/A', fallbackDetalhes: 'N/A' },
    'BarracaoConstrucao': { area: null, conformidade: 'Avaliaçã', detalhes: 'Aprovaçã', fallbackArea: 0.05, fallbackConformidade: 'Conforme', fallbackDetalhes: 'Operação compreende a NR 18' },
    'Barracao1': { area: null, conformidade: null, detalhes: null, fallbackArea: 0.06, fallbackConformidade: 'N/A', fallbackDetalhes: 'Barracão de armazenamento' },
    'Confinamento': { area: null, conformidade: 'avaliaçã', detalhes: 'Info', fallbackArea: 0.86, fallbackConformidade: 'Conforme', fallbackDetalhes: '400 cabeças de Gado em Confinamento' },
    'Escritorio': { area: null, conformidade: 'Avaliaçã', detalhes: 'Tema', fallbackArea: 0.05, fallbackConformidade: 'Conforme', fallbackDetalhes: 'Escritório' },
    'LagoaContencao': { area: null, conformidade: 'Avaliação', detalhes: 'Observação', fallbackArea: 0.07, fallbackConformidade: 'Não Conforme', fallbackDetalhes: 'Escavação não impermeabilizada' },
    'Residuos': { area: null, conformidade: 'Avaliaçã', detalhes: 'Norma', fallbackArea: 0.10, fallbackConformidade: 'Conforme', fallbackDetalhes: 'Baia de Armazenamento de Resíduos Sólidos, Norma: NBR 11.174' },
    'Sede': { area: null, conformidade: null, detalhes: null, fallbackArea: 0.02, fallbackConformidade: 'N/A', fallbackDetalhes: 'Sede Administrativa da Fazenda' },
    'Silo': { area: null, conformidade: 'Avaliaçã', detalhes: 'tema', fallbackArea: 0.13, fallbackConformidade: 'Conforme', fallbackDetalhes: 'Silos' }
};

// Função para gerar conteúdo do pop-up
function generatePopupContent(layerName, properties) {
    const displayName = layerNames[layerName] || layerName;
    const props = layerProperties[layerName] || {};
    const area = props.area && properties[props.area] ? properties[props.area].toFixed(2) : props.fallbackArea ? props.fallbackArea.toFixed(2) : 'N/A';
    const conformidade = props.conformidade && properties[props.conformidade] ? properties[props.conformidade] : props.fallbackConformidade || 'N/A';
    const detalhes = props.detalhes && properties[props.detalhes] ? properties[props.detalhes] : props.fallbackDetalhes || 'N/A';
    console.log(`[DEBUG] Gerando pop-up para ${layerName}: Área=${area}, Conformidade=${conformidade}, Detalhes=${detalhes}`);
    return `<h3>${displayName}</h3><p>Área: ${area}${props.area || props.fallbackArea ? ' ha' : ''}<br>Conformidade: ${conformidade}<br>Detalhes: ${detalhes}</p>`;
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
        // Aplicar filtro apenas para camadas com conformidade
        if (layerName !== 'AreaDaPropriedade' && layerName !== 'AreaDaPropriedadeOutline') {
            const props = layerProperties[layerName] || {};
            const conformidadeKey = props.conformidade || 'conformidade';
            console.log(`[DEBUG] Configurando filtro para ${layerName} com chave de conformidade: ${conformidadeKey}`);
            layerConfig.filter = ['any', ['!', ['has', conformidadeKey]], ['==', ['get', conformidadeKey], 'Conforme'], ['==', ['get', conformidadeKey], 'Não Conforme']];
        }
        if (!map.getLayer(layerName)) {
            map.addLayer(layerConfig, beforeLayer);
            console.log(`[DEBUG] Camada ${layerName} adicionada ao mapa${beforeLayer ? ` antes de ${beforeLayer}` : ''}`);
        } else {
            console.log(`[DEBUG] Camada ${layerName} já existe, ignorando adição`);
        }
        // Adicionar evento de clique, exceto para AreaDaPropriedade
        if (layerName !== 'AreaDaPropriedade') {
            // Remover eventos de clique existentes para evitar duplicatas
            map.off('click', layerName);
            map.on('click', layerName, (e) => {
                if (e.features && e.features.length > 0) {
                    console.log(`[DEBUG] Clique na camada ${layerName}:`, e.features[0].properties);
                    new mapboxgl.Popup()
                        .setLngLat(e.lngLat)
                        .setHTML(generatePopupContent(layerName, e.features[0].properties))
                        .addTo(map);
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

// Atualizar resumo
async function updateSummary() {
    let areaPropriedade = 'N/D', areaConsolidada = 'N/D', areaAPP = 'N/D', areaReserva = 'N/D', 
        areaReservatorio = 'N/D', areaVegetacaoNativa = 'N/D', areaServidaoAdministrativa = 'N/D', countNascentes = 'N/D';
    try {
        if (map.getSource('AreaDaPropriedade')) {
            const data = map.getSource('AreaDaPropriedade')._data;
            areaPropriedade = (turf.area(data) / 10000).toFixed(2);
            console.log(`[DEBUG] Área Declarada no CAR calculada: ${areaPropriedade} ha`);
        }
        if (map.getSource('AreaConsolidada')) {
            const data = map.getSource('AreaConsolidada')._data;
            areaConsolidada = (turf.area(data) / 10000).toFixed(2);
            console.log(`[DEBUG] Área Consolidada calculada: ${areaConsolidada} ha`);
        }
        if (map.getSource('APP')) {
            const data = map.getSource('APP')._data;
            areaAPP = (turf.area(data) / 10000).toFixed(2);
            console.log(`[DEBUG] Área APP calculada: ${areaAPP} ha`);
        }
        if (map.getSource('ReservaLegal')) {
            const data = map.getSource('ReservaLegal')._data;
            areaReserva = (turf.area(data) / 10000).toFixed(2);
            console.log(`[DEBUG] Área Reserva Legal calculada: ${areaReserva} ha`);
        }
        if (map.getSource('Reservatorio')) {
            const data = map.getSource('Reservatorio')._data;
            areaReservatorio = (turf.area(data) / 10000).toFixed(2);
            console.log(`[DEBUG] Área Reservatório calculada: ${areaReservatorio} ha`);
        }
        if (map.getSource('VegetacaoNativa')) {
            const data = map.getSource('VegetacaoNativa')._data;
            areaVegetacaoNativa = (turf.area(data) / 10000).toFixed(2);
            console.log(`[DEBUG] Área Vegetação Nativa calculada: ${areaVegetacaoNativa} ha`);
        }
        if (map.getSource('ServidaoAdministrativa')) {
            const data = map.getSource('ServidaoAdministrativa')._data;
            areaServidaoAdministrativa = (turf.area(data) / 10000).toFixed(2);
            console.log(`[DEBUG] Área Servidão Administrativa calculada: ${areaServidaoAdministrativa} ha`);
        }
        if (map.getSource('Nascentes')) {
            const data = map.getSource('Nascentes')._data;
            countNascentes = data.features.length;
            console.log(`[DEBUG] Contagem de Nascentes: ${countNascentes}`);
        }
    } catch (error) {
        console.error('[ERROR] Erro ao atualizar resumo:', error);
    }
    document.getElementById('areaPropriedade').textContent = areaPropriedade;
    document.getElementById('areaConsolidada').textContent = areaConsolidada;
    document.getElementById('areaAPP').textContent = areaAPP;
    document.getElementById('areaReserva').textContent = areaReserva;
    document.getElementById('areaReservatorio').textContent = areaReservatorio;
    document.getElementById('areaVegetacaoNativa').textContent = areaVegetacaoNativa;
    document.getElementById('areaServidaoAdministrativa').textContent = areaServidaoAdministrativa;
    document.getElementById('countNascentes').textContent = countNascentes;
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
                html += `<i style="${style}"></i> ${displayName}<br>`;
            }
        });
    });
    legend.innerHTML = html;
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
        ['Área Declarada no CAR', document.getElementById('areaPropriedade').textContent + ' ha'],
        ['Área Consolidada', document.getElementById('areaConsolidada').textContent + ' ha'],
        ['Área APP', document.getElementById('areaAPP').textContent + ' ha'],
        ['Reserva Legal', document.getElementById('areaReserva').textContent + ' ha'],
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
    console.log('[DEBUG] Aplicando filtros de conformidade');
    const showConforme = document.getElementById('showConforme').checked;
    const showNaoConforme = document.getElementById('showNaoConforme').checked;
    Object.keys(layers).forEach(layerName => {
        if (map.getLayer(layerName) && layerName !== 'AreaDaPropriedade' && layerName !== 'AreaDaPropriedadeOutline') {
            const props = layerProperties[layerName] || {};
            const conformidadeKey = props.conformidade || 'conformidade';
            console.log(`[DEBUG] Aplicando filtro na camada ${layerName} com chave ${conformidadeKey}, Conforme=${showConforme}, Não Conforme=${showNaoConforme}`);
            map.setFilter(layerName, [
                'any',
                ['!', ['has', conformidadeKey]],
                showConforme ? ['==', ['get', conformidadeKey], 'Conforme'] : ['==', ['get', conformidadeKey], ''],
                showNaoConforme ? ['==', ['get', conformidadeKey], 'Não Conforme'] : ['==', ['get', conformidadeKey], '']
            ]);
        }
    });
    updateSummary();
}

// Eventos de filtros e camadas
document.getElementById('showConforme').addEventListener('change', () => {
    console.log('[DEBUG] Filtro Conforme alterado');
    applyFilters();
});
document.getElementById('showNaoConforme').addEventListener('change', () => {
    console.log('[DEBUG] Filtro Não Conforme alterado');
    applyFilters();
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
            } else {
                if (map.getLayer(layerName)) {
                    map.setLayoutProperty(layerName, 'visibility', 'none');
                }
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