// ============================================================================
// GACHAKÉMON: MOTOR COMPLETO DE JUEGO v2.9 (game.js)
// Incluye:
// - Sintetizador Polifónico de 4 Canales (Melodía + Armonía + Bajo + Percusión)
// - Drag & Drop en Bandeja de Pokéballs (Adyacencia dinámica de Peso Ball)
// - Visualización enriquecida de Cartas + Inspector Zoom de Cartas/Pokédex
// ============================================================================

(function injectEnhancedStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .ball-slot-draggable {
            cursor: grab;
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .ball-slot-draggable:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 4px 12px rgba(56, 189, 248, 0.25);
        }
        .ball-slot-draggable:active {
            cursor: grabbing;
        }
        .ball-slot-draggable.dragging {
            opacity: 0.4;
            transform: scale(0.9);
        }
        .ball-slot-draggable.drag-over {
            border-color: #facc15 !important;
            box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.4), 0 8px 16px rgba(0,0,0,0.5);
            transform: translateY(-5px) scale(1.05);
        }
        .card-rich-desc {
            font-size: 13px;
            line-height: 1.55;
            color: #f1f5f9;
            background: rgba(15, 23, 42, 0.92);
            border: 1px solid #475569;
            border-radius: 8px;
            padding: 9px 11px;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);
            letter-spacing: 0.2px;
        }
        .deck-order-card {
            cursor: grab;
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .deck-order-card:active {
            cursor: grabbing;
        }
        .deck-order-card.dragging {
            opacity: 0.45;
            transform: scale(0.96);
        }
        .deck-order-card.drag-over {
            border-color: #facc15 !important;
            box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.45);
            transform: translateY(-2px);
        }
        .kw-yen { color: #facc15; font-weight: 800; text-shadow: 0 0 6px rgba(250,204,21,0.3); }
        .kw-pv { color: #d8b4fe; font-weight: 800; text-shadow: 0 0 6px rgba(216,180,254,0.3); }
        .kw-neg { color: #f87171; font-weight: 800; }
        .kw-safari { color: #4ade80; font-weight: 800; }
        .kw-ball { color: #38bdf8; font-weight: 800; }

        @keyframes bingoDrumSpin {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(110deg) scale(1.04); }
            50% { transform: rotate(220deg) scale(0.98); }
            75% { transform: rotate(310deg) scale(1.03); }
            100% { transform: rotate(360deg) scale(1); }
        }
        .animate-bingo-drum {
            transform-origin: 80px 62px;
            animation: bingoDrumSpin 0.55s linear infinite;
        }
        @keyframes bingoBallDropRoll {
            0% {
                transform: translate(-130px, -110px) rotate(-720deg) scale(0.25);
                opacity: 0;
            }
            45% {
                transform: translate(18px, 14px) rotate(90deg) scale(1.15);
                opacity: 1;
            }
            68% {
                transform: translate(-10px, -8px) rotate(-35deg) scale(0.95);
            }
            85% {
                transform: translate(4px, 3px) rotate(12deg) scale(1.03);
            }
            100% {
                transform: translate(0, 0) rotate(0deg) scale(1);
                opacity: 1;
            }
        }
        .animate-bingo-ball-drop {
            animation: bingoBallDropRoll 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes bingoSlotRoll {
            0% { transform: translateX(-55px) rotate(-540deg) scale(0.3); opacity: 0; }
            65% { transform: translateX(8px) rotate(35deg) scale(1.14); opacity: 1; }
            85% { transform: translateX(-3px) rotate(-10deg) scale(0.97); }
            100% { transform: translateX(0) rotate(0deg) scale(1); opacity: 1; }
        }
        .animate-bingo-slot {
            animation: bingoSlotRoll 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes bingoBurstPulse {
            0%, 100% { transform: scale(1); opacity: 0.75; }
            50% { transform: scale(1.14); opacity: 1; }
        }
        .animate-bingo-glow {
            animation: bingoBurstPulse 1.6s ease-in-out infinite;
        }
    `;
    document.head.appendChild(style);
})();


function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

function normalizeTrainerName(value, fallback = 'Jugador') {
    let name = String(value ?? '')
        .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (/^(escribe aquí tu nick|entrenador\s+\d+|jugador\s+\d+)$/i.test(name)) name = '';
    return (name || fallback).slice(0, 16).trim();
}

function makeUniquePlayerName(value, existingNames = [], fallback = 'Jugador') {
    const base = normalizeTrainerName(value, fallback);
    const used = new Set(existingNames.map(name => String(name || '').trim().toLocaleLowerCase('es-ES')));
    if (!used.has(base.toLocaleLowerCase('es-ES'))) return base;
    for (let suffix = 2; suffix < 100; suffix++) {
        const ending = ` (${suffix})`;
        const candidate = base.slice(0, 16 - ending.length).trimEnd() + ending;
        if (!used.has(candidate.toLocaleLowerCase('es-ES'))) return candidate;
    }
    return `${base.slice(0, 11)}-${Date.now().toString().slice(-4)}`;
}

function getInputTrainerName(fallback = 'Jugador 1') {
    return normalizeTrainerName(document.getElementById('inputPlayerName')?.value, fallback);
}

function formatCardText(text) {
    if (!text) return '';
    return text
        .replace(/(\+?\d+\s*P¥|\d+\s*PokéYenes|\d+\s*PokeYens|P¥)/g, '<span class="kw-yen">$1</span>')
        .replace(/(\+\d+\s*PV|\d+\s*PV)/g, '<span class="kw-pv">$1</span>')
        .replace(/(-\d+\s*PV|pierdes|confisca|rompe|anula)/gi, '<span class="kw-neg">$1</span>')
        .replace(/(Fase de Captura|Fase de Safari|AUTO|\d+\s*Cara[s]?)/gi, '<span class="kw-safari">$1</span>')
        .replace(/(Rocket Ball[s]?|Master Ball|Peso Ball|Lujo Ball[s]?|Amor Ball|Honor Ball|Luna Ball|Gloria Ball|Cebo Ball|Nivel Ball|Poké Ball[s]?)/g, '<span class="kw-ball">$1</span>');
}

const BALL_TYPES = [
    { id: 'pokeball', num: 1, name: 'Poké Ball', count: 12, rarity: 'Común', rarityRank: 1, colorName: 'Gris', hexTop: '#ef4444', hexBot: '#f8fafc', badgeColor: '#94a3b8', pv: 1, sell: 1, desc: 'Combustible básico para tríos, bono de Honor Ball y objetivos en masa.' },
    { id: 'superball', num: 2, name: 'Super Ball', count: 8, rarity: 'Poco Común', rarityRank: 2, colorName: 'Verde', hexTop: '#2563eb', hexBot: '#f8fafc', badgeColor: '#22c55e', pv: 3, sell: 2, desc: 'Otorga 3 PV sólidos y seguros para cualquier combinación y capturas intermedias.' },
    { id: 'ultraball', num: 3, name: 'Ultra Ball', count: 5, rarity: 'Épica', rarityRank: 4, colorName: 'Morado', hexTop: '#1e293b', hexBot: '#facc15', badgeColor: '#a855f7', pv: 6, sell: 4, desc: 'Alto valor (6 PV) o beneficio neto (+1 P¥) al venderla con Ticket de Devolución (4 P¥).' },
    { id: 'masterball', num: 4, name: 'Master Ball', count: 1, rarity: 'Legendaria', rarityRank: 5, colorName: 'Dorado', hexTop: '#7e22ce', hexBot: '#f8fafc', badgeColor: '#eab308', pv: 15, sell: 6, desc: '¡Jackpot! Obtienes +7 P¥ inmediatamente al salir. Captura AUTO (100% éxito). No se puede robar.' },
    { id: 'honorball', num: 5, name: 'Honor Ball', count: 4, rarity: 'Poco Común', rarityRank: 2, colorName: 'Verde', hexTop: '#f8fafc', hexBot: '#ef4444', badgeColor: '#22c55e', pv: 1, sell: 2, desc: 'Vale 1 PV base, pero cada una da +5 PV extra (6 PV en total) si posees al menos 3 Poké Balls normales.' },
    { id: 'ceboball', num: 6, name: 'Cebo Ball', count: 3, rarity: 'Común', rarityRank: 1, colorName: 'Gris', hexTop: '#06b6d4', hexBot: '#f97316', badgeColor: '#94a3b8', pv: 2, sell: 2, desc: 'Efecto Pasivo: Cada Cebo Ball en tu poder te da +1 P¥ extra cada vez que eliges la acción de Trabajar.' },
    { id: 'lujoball', num: 7, name: 'Lujo Ball', count: 3, rarity: 'Épica', rarityRank: 4, colorName: 'Morado', hexTop: '#0f172a', hexBot: '#eab308', badgeColor: '#a855f7', pv: 3, sell: 5, desc: 'Al salir del gachapon, robas 2 Cartas de Efecto inmediatamente (inmune a trampas). Alta venta: 5 P¥.' },
    { id: 'nivelball', num: 8, name: 'Nivel Ball', count: 3, rarity: 'Común', rarityRank: 1, colorName: 'Gris', hexTop: '#eab308', hexBot: '#dc2626', badgeColor: '#94a3b8', pv: 1, sell: 2, desc: 'Escala con tu variedad: Vale +1 PV adicional por cada tipo diferente de Pokéball en tu colección (ésta incluida).' },
    { id: 'lunaball', num: 9, name: 'Luna Ball', count: 6, rarity: 'Rara', rarityRank: 3, colorName: 'Azul', hexTop: '#1d4ed8', hexBot: '#fde047', badgeColor: '#3b82f6', pv: 7, sell: 3, desc: 'Otorga 7 PV si posees exactamente 1, pero se anula (0 PV) si tienes 2 o más al final de la partida.' },
    { id: 'amorball', num: 10, name: 'Amor Ball', count: 6, rarity: 'Rara', rarityRank: 3, colorName: 'Azul', hexTop: '#ec4899', hexBot: '#fbcfe8', badgeColor: '#3b82f6', pv: 2, sell: 3, desc: 'Cada pareja de Amor Ball da +8 PV extra (12 PV en total por pareja). Una Amor Ball desparejada vale 2 PV.' },
    { id: 'gloriaball', num: 11, name: 'Gloria Ball', count: 2, rarity: 'Rara', rarityRank: 3, colorName: 'Azul', hexTop: '#dc2626', hexBot: '#f97316', badgeColor: '#3b82f6', pv: 2, sell: 3, desc: 'Comodín: Al final de la partida cuenta como el tipo de Pokéball que elijas para tus Objetivos Secretos (excepto Rocket o Master Ball).' },
    { id: 'pesoball', num: 12, name: 'Peso Ball', count: 2, rarity: 'Rara', rarityRank: 3, colorName: 'Azul', hexTop: '#475569', hexBot: '#38bdf8', badgeColor: '#3b82f6', pv: 4, sell: 2, desc: 'Inmune al robo y protege a las 2 Pokéballs adyacentes (izquierda y derecha) en tu bandeja. ¡Arrástrala para proteger tus mejores esferas!' },
    { id: 'rocketball', num: 13, name: 'Rocket Ball', count: 5, rarity: 'Épica', rarityRank: 4, colorName: 'Morado', hexTop: '#111827', hexBot: '#dc2626', badgeColor: '#a855f7', pv: 0, sell: 0, desc: 'Roba 1 Pokéball o Pokémon a un rival. Resta -2 PV al final por cada una en posesión y otros -2 PV extra si capturas con ella.' }
];

const BALL_MAP = {};
BALL_TYPES.forEach(b => { BALL_MAP[b.id] = b; });

const CAPTURE_MATRIX = {
    'Común': {
        'Común':      { heads: 0, pv: 3 },
        'Poco Común': { heads: 1, pv: 5 },
        'Rara':       { heads: 2, pv: 8 },
        'Épica':      { heads: 2, pv: 12 },
        'Legendaria': { heads: 3, pv: 16 },
        'Mítica':     { heads: 3, pv: 22 }
    },
    'Poco Común': {
        'Común':      { heads: 0, pv: 2 },
        'Poco Común': { heads: 0, pv: 4 },
        'Rara':       { heads: 1, pv: 6 },
        'Épica':      { heads: 2, pv: 9 },
        'Legendaria': { heads: 2, pv: 13 },
        'Mítica':     { heads: 3, pv: 18 }
    },
    'Rara': {
        'Común':      { heads: 0, pv: 1 },
        'Poco Común': { heads: 0, pv: 3 },
        'Rara':       { heads: 0, pv: 5 },
        'Épica':      { heads: 1, pv: 7 },
        'Legendaria': { heads: 2, pv: 10 },
        'Mítica':     { heads: 2, pv: 14 }
    },
    'Épica': {
        'Común':      { heads: 0, pv: 0 },
        'Poco Común': { heads: 0, pv: 2 },
        'Rara':       { heads: 0, pv: 4 },
        'Épica':      { heads: 0, pv: 6 },
        'Legendaria': { heads: 1, pv: 8 },
        'Mítica':     { heads: 2, pv: 11 }
    },
    'Legendaria': {
        'Común':      { heads: 0, pv: 0 },
        'Poco Común': { heads: 0, pv: 1 },
        'Rara':       { heads: 0, pv: 2 },
        'Épica':      { heads: 0, pv: 4 },
        'Legendaria': { heads: 0, pv: 6 },
        'Mítica':     { heads: 0, pv: 9 }
    }
};

const RAW_POKEMON_TIERS = [
    {
        rarity: 'Mítica', color: 'Rojo', badgeHex: '#ef4444', rank: 6,
        list: [
            [150, 'Mewtwo'], [151, 'Mew'], [249, 'Lugia'], [250, 'Ho-Oh'], [251, 'Celebi']
        ]
    },
    {
        rarity: 'Legendaria', color: 'Dorado', badgeHex: '#eab308', rank: 5,
        list: [
            [144, 'Articuno'], [145, 'Zapdos'], [146, 'Moltres'], [243, 'Raikou'], [244, 'Entei'], [245, 'Suicune']
        ]
    },
    {
        rarity: 'Épica', color: 'Morado', badgeHex: '#a855f7', rank: 4,
        list: [
            [3, 'Venusaur'], [6, 'Charizard'], [9, 'Blastoise'], [59, 'Arcanine'], [65, 'Alakazam'],
            [68, 'Machamp'], [76, 'Golem'], [94, 'Gengar'], [130, 'Gyarados'], [131, 'Lapras'],
            [142, 'Aerodactyl'], [143, 'Snorlax'], [149, 'Dragonite'], [154, 'Meganium'], [157, 'Typhlosion'],
            [160, 'Feraligatr'], [212, 'Scizor'], [214, 'Heracross'], [242, 'Blissey'], [248, 'Tyranitar']
        ]
    },
    {
        rarity: 'Rara', color: 'Azul', badgeHex: '#3b82f6', rank: 3,
        list: [
            [233, 'Porygon2'], [31, 'Nidoqueen'], [34, 'Nidoking'], [36, 'Clefable'], [40, 'Wigglytuff'],
            [45, 'Vileplume'], [62, 'Poliwrath'], [71, 'Victreebel'], [148, 'Dragonair'], [78, 'Rapidash'],
            [113, 'Chansey'], [197, 'Umbreon'], [87, 'Dewgong'], [91, 'Cloyster'], [99, 'Kingler'],
            [196, 'Espeon'], [121, 'Starmie'], [124, 'Jynx'], [125, 'Electabuzz'], [126, 'Magmar'],
            [128, 'Tauros'], [134, 'Vaporeon'], [135, 'Jolteon'], [136, 'Flareon'], [139, 'Omastar'],
            [141, 'Kabutops'], [169, 'Crobat'], [182, 'Bellossom'], [184, 'Azumarill'], [186, 'Politoed'],
            [115, 'Kangaskhan'], [199, 'Slowking'], [201, 'Unown'], [208, 'Steelix'], [217, 'Ursaring'],
            [227, 'Skarmory'], [230, 'Kingdra'], [232, 'Donphan'], [181, 'Ampharos'], [18, 'Pidgeot']
        ]
    },
    {
        rarity: 'Poco Común', color: 'Verde', badgeHex: '#22c55e', rank: 2,
        list: [
            [2, 'Ivysaur'], [5, 'Charmeleon'], [8, 'Wartortle'], [127, 'Pinsir'], [12, 'Butterfree'],
            [15, 'Beedrill'], [17, 'Pidgeotto'], [229, 'Houndoom'], [20, 'Raticate'], [22, 'Fearow'],
            [24, 'Arbok'], [123, 'Scyther'], [28, 'Sandslash'], [30, 'Nidorina'], [33, 'Nidorino'],
            [35, 'Clefairy'], [38, 'Ninetales'], [39, 'Jigglypuff'], [42, 'Golbat'], [44, 'Gloom'],
            [47, 'Parasect'], [49, 'Venomoth'], [51, 'Dugtrio'], [53, 'Persian'], [55, 'Golduck'],
            [57, 'Primeape'], [61, 'Poliwhirl'], [64, 'Kadabra'], [67, 'Machoke'], [70, 'Weepinbell'],
            [75, 'Graveler'], [82, 'Magneton'], [89, 'Muk'], [93, 'Haunter'], [97, 'Hypno'],
            [101, 'Electrode'], [105, 'Marowak'], [110, 'Weezing'], [112, 'Rhydon'], [80, 'Slowbro'],
            [117, 'Seadra'], [119, 'Seaking'], [138, 'Omanyte'], [140, 'Kabuto'], [147, 'Dratini'],
            [73, 'Tentacruel'], [153, 'Bayleef'], [156, 'Quilava'], [159, 'Croconaw'], [132, 'Ditto'],
            [164, 'Noctowl'], [166, 'Ledian'], [168, 'Ariados'], [171, 'Lanturn'], [176, 'Togetic'],
            [178, 'Xatu'], [180, 'Flaaffy'], [241, 'Miltank'], [189, 'Jumpluff'], [192, 'Sunflora'],
            [103, 'Exeggutor'], [85, 'Dodrio'], [205, 'Forretress'], [210, 'Granbull'], [219, 'Magcargo'],
            [221, 'Piloswine'], [222, 'Corsola'], [224, 'Octillery'], [225, 'Delibird'], [137, 'Porygon'],
            [234, 'Stantler'], [247, 'Pupitar']
        ]
    },
    {
        rarity: 'Común', color: 'Gris', badgeHex: '#94a3b8', rank: 1,
        list: [
            [1, 'Bulbasaur'], [4, 'Charmander'], [7, 'Squirtle'], [10, 'Caterpie'], [13, 'Weedle'],
            [16, 'Pidgey'], [19, 'Rattata'], [21, 'Spearow'], [23, 'Ekans'], [27, 'Sandshrew'],
            [29, 'Nidoran♀'], [32, 'Nidoran♂'], [37, 'Vulpix'], [41, 'Zubat'], [43, 'Oddish'],
            [46, 'Paras'], [48, 'Venonat'], [50, 'Diglett'], [52, 'Meowth'], [54, 'Psyduck'],
            [56, 'Mankey'], [58, 'Growlithe'], [60, 'Poliwag'], [63, 'Abra'], [66, 'Machop'],
            [69, 'Bellsprout'], [72, 'Tentacool'], [74, 'Geodude'], [77, 'Ponyta'], [79, 'Slowpoke'],
            [81, 'Magnemite'], [83, "Farfetch'd"], [84, 'Doduo'], [86, 'Seel'], [88, 'Grimer'],
            [90, 'Shellder'], [92, 'Gastly'], [95, 'Onix'], [96, 'Drowzee'], [98, 'Krabby'],
            [100, 'Voltorb'], [102, 'Exeggcute'], [104, 'Cubone'], [106, 'Hitmonlee'], [107, 'Hitmonchan'],
            [108, 'Lickitung'], [109, 'Koffing'], [111, 'Rhyhorn'], [114, 'Tangela'], [195, 'Quagsire'],
            [116, 'Horsea'], [118, 'Goldeen'], [120, 'Staryu'], [122, 'Mr. Mime'], [25, 'Pikachu'],
            [11, 'Metapod'], [129, 'Magikarp'], [162, 'Furret'], [133, 'Eevee'], [26, 'Raichu'],
            [152, 'Chikorita'], [155, 'Cyndaquil'], [158, 'Totodile'], [161, 'Sentret'], [163, 'Hoothoot'],
            [165, 'Ledyba'], [167, 'Spinarak'], [170, 'Chinchou'], [172, 'Pichu'], [173, 'Cleffa'],
            [174, 'Igglybuff'], [175, 'Togepi'], [177, 'Natu'], [179, 'Mareep'], [183, 'Marill'],
            [185, 'Sudowoodo'], [187, 'Hoppip'], [190, 'Aipom'], [191, 'Sunkern'], [223, 'Remoraid'],
            [194, 'Wooper'], [198, 'Murkrow'], [200, 'Misdreavus'], [202, 'Wobbuffet'], [203, 'Girafarig'],
            [204, 'Pineco'], [206, 'Dunsparce'], [207, 'Gligar'], [209, 'Snubbull'], [211, 'Qwilfish'],
            [213, 'Shuckle'], [215, 'Sneasel'], [216, 'Teddiursa'], [218, 'Slugma'], [220, 'Swinub'],
            [193, 'Yanma'], [226, 'Mantine'], [228, 'Houndour'], [231, 'Phanpy'], [235, 'Smeargle'],
            [236, 'Tyrogue'], [237, 'Hitmontop'], [238, 'Smoochum'], [239, 'Elekid'], [240, 'Magby'],
            [246, 'Larvitar'], [14, 'Kakuna'], [188, 'Skiploom']
        ]
    }
];

const FLAVOR_DEX = {
    1: "Una semilla le fue plantada en el lomo al nacer. La planta brota y crece con él alimentándose del sol.",
    2: "Cuando el bulbo de su lomo crece, parece perder la capacidad de ponerse de pie sobre sus patas traseras.",
    3: "La planta florece cuando absorbe energía solar. Permanece en movimiento buscando la luz.",
    4: "Prefiere las cosas calientes. Dicen que cuando llueve le sale vapor de la punta de su cola.",
    5: "Cuando balancea su ardiente cola, eleva la temperatura a niveles insoportables para sus rivales.",
    6: "Escupe fuego tan caliente que funde las rocas. Causa incendios forestales sin querer.",
    7: "Tras nacer, su lomo se hincha y endurece como una concha. Echa una potente espuma por la boca.",
    8: "Se oculta en el agua para acechar a sus presas. Al nadar rápido, mueve sus orejas para mantener el equilibrio.",
    9: "Un brutal Pokémon con reactores de agua a presión en su caparazón. Se usan para placajes a gran velocidad.",
    25: "Acumula electricidad en sus mofletes. Cuando varios se juntan, su energía puede causar fuertes tormentas.",
    26: "Su larga cola le sirve como toma de tierra para protegerse a sí mismo de su propio alto voltaje.",
    59: "Un Pokémon muy admirado desde la antigüedad por su belleza. Corre ágilmente como si tuviera alas.",
    65: "Su cerebro puede superar a un superordenador. Su cociente intelectual dicen que ronda los 5.000.",
    94: "En las noches de luna llena, a este Pokémon le gusta imitar las sombras de la gente y burlarse de sus miedos.",
    129: "En un pasado lejano, era bastante más fuerte que sus horribles y débiles descendientes actuales.",
    130: "Rara vez visto en la naturaleza. Enorme y feroz, es capaz de destruir ciudades enteras cuando enfurece.",
    131: "Un Pokémon noble que ha sido cazado casi hasta la extinción. Puede transportar a la gente surcando el agua.",
    133: "Su código genético es irregular. Puede mutar si se le expone a la radiación de las piedras elementales.",
    143: "Muy perezoso. Solo come y duerme. A medida que engorda su barriga se vuelve cada vez más dócil.",
    144: "Un legendario Pokémon pájaro que se aparece a la gente que está perdida en las montañas heladas.",
    145: "Un legendario Pokémon pájaro que aparece de las nubes oscuras mientras lanza enormes rayos.",
    146: "Conocido como el legendario pájaro de fuego. Cada aleteo suyo crea un destello brillante de llamas.",
    149: "Un Pokémon marino extremadamente raro y bondadoso. Se dice que su inteligencia compite con la humana.",
    150: "Fue creado por un científico tras años de horribles experimentos de manipulación e ingeniería genética.",
    151: "Contiene el código genético de todos los Pokémon. Tan raro que muchos expertos dicen que es un espejismo.",
    152: "Un dulce aroma se desprende de la hoja de su cabeza. Es dócil y le encanta absorber los rayos del sol.",
    155: "Es tímido y siempre se enrosca como una pelota. Si es atacado, enciende su lomo para protegerse.",
    158: "Sus desarrolladas mandíbulas son muy potentes. Puede aplastar cualquier cosa, por lo que su entrenador debe tener cuidado.",
    243: "Las nubes de lluvia que lleva le permiten lanzar rayos. Dicen que apareció junto con un relámpago.",
    244: "Un Pokémon que corre por la tierra. Dicen que nace uno siempre que aparece un nuevo volcán en el mundo.",
    245: "Recorre el mundo para purificar el agua contaminada. Corre velozmente junto con el viento del norte.",
    248: "Su cuerpo no puede ser herido por ningún ataque, por lo que desafía a sus enemigos con gran entusiasmo.",
    249: "Duerme en una fosa de las profundidades marinas. Si agita sus alas, puede causar una tormenta de 40 días.",
    250: "Sus plumas brillan con siete colores. Se dice que cualquiera que lo vea en vuelo tendrá felicidad eterna.",
    251: "Este Pokémon viaja a través del tiempo. Los bosques y la hierba crecen exuberantes por donde pasa."
};

const POKEMON_CATALOG = [];
RAW_POKEMON_TIERS.forEach(tier => {
    tier.list.forEach(([dexNum, name]) => {
        const region = dexNum <= 151 ? 'Kanto' : 'Johto';
        const genLabel = dexNum <= 151 ? '1ª Gen (Rojo/Azul/Amarillo)' : '2ª Gen (Oro/Plata/Cristal)';
        const flavor = FLAVOR_DEX[dexNum] || `Registro Pokédex ${region} (${genLabel}): Especie avistada en estado salvaje durante las expediciones de la Zona Safari. Clasificada con rareza ${tier.rarity}.`;
        POKEMON_CATALOG.push({
            dexNum,
            idStr: `#${String(dexNum).padStart(3, '0')}`,
            name,
            rarity: tier.rarity,
            rarityRank: tier.rank,
            color: tier.color,
            badgeHex: tier.badgeHex,
            region,
            flavor,
            spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNum}.png`
        });
    });
});

const EFFECT_TEMPLATES = [
    { id: 'escudo_silph', name: 'Escudo Silph S.A.', subtype: 'Objeto', timing: 'reaction', phaseTag: 'REACCIÓN AUTOMÁTICA', count: 3, icon: 'fa-shield-halved', desc: 'Si tu rival te lanza una Rocket Ball para robarte una Pokéball o Pokémon, se cancela el robo automáticamente y la Rocket Ball rival pierde su habilidad.' },
    { id: 'ticket_devolucion', name: 'Ticket de Devolución', subtype: 'Objeto', timing: 'action', phaseTag: 'FASE 3: ACCIÓN', count: 5, icon: 'fa-money-bill-transfer', desc: 'Devuelve 1 Pokéball libre de tu colección a la tolva de la máquina de gachapon a cambio de su valor exacto de Venta en PokéYenes (P¥).' },
    { id: 'ficha_trucada', name: 'Ficha Trucada', subtype: 'Objeto', timing: 'action', phaseTag: 'FASE 3: ACCIÓN', count: 2, icon: 'fa-dharmachakra', desc: 'Realiza un giro adicional gratuito e inmediato en la máquina de gacha y coloca la Pokéball extraída en tu bandeja.' },
    { id: 'mercado_negro', name: 'Mercado Negro', subtype: 'Objeto', timing: 'action', phaseTag: 'FASE 3: ACCIÓN', count: 2, icon: 'fa-people-arrows', desc: 'Paga 1 P¥ al banco para forzar un intercambio de 1 Pokéball libre tuya por 1 Pokéball libre de la misma rareza de un rival.' },
    { id: 'repelente', name: 'Repelente', subtype: 'Objeto', timing: 'safari', phaseTag: 'FASE DE SAFARI', count: 3, icon: 'fa-spray-can', desc: 'En la Fase de Captura, si el Pokémon elegido es Común (Gris), cámbialo por cartas del mazo hasta que salga el primero Poco Común o Raro (el resto va al fondo).' },
    { id: 'baya_dorada', name: 'Baya Dorada', subtype: 'Objeto', timing: 'safari_reaction', phaseTag: 'REACCIÓN EN SAFARI', count: 2, icon: 'fa-lemon', desc: 'En la Fase de Captura, justo después de lanzar tus 3 monedas PokéYen, convierte 1 resultado de Cruz en 1 Cara para lograr la captura.' },
    { id: 'captura_critica', name: 'Captura Crítica', subtype: 'Objeto', timing: 'safari', phaseTag: 'FASE DE SAFARI', count: 2, icon: 'fa-crosshairs', desc: 'En la Fase de Captura, antes de lanzar las monedas, reduce cualquier requisito de captura de 2 o 3 Caras a 1 sola Cara.' },
    { id: 'inversor_pokemon', name: 'Inversor Pokémon', subtype: 'Objeto', timing: 'action', phaseTag: 'FASE 3: ACCIÓN', count: 2, icon: 'fa-chart-line', desc: 'Paga 3 P¥ a la reserva central y roba 2 Cartas de Efecto adicionales del mazo.' },
    { id: 'prestamo_celedon', name: 'Préstamo del Celedón', subtype: 'Objeto', timing: 'action', phaseTag: 'FASE 3: ACCIÓN', count: 2, icon: 'fa-building-columns', desc: 'Recibe +5 P¥ inmediatos del banco. Al final de la partida debes devolver 7 P¥ (o pierdes -3 PV si no puedes pagarlos).' },
    { id: 'subasta_rota', name: 'Subasta Rota', subtype: 'Objeto', timing: 'action', phaseTag: 'FASE 3: ACCIÓN', count: 2, icon: 'fa-gavel', desc: 'Recupera la carta de Objeto superior de la pila de descartes de Cartas de Efecto y ponla directamente en tu mano.' },
    { id: 'patrocinio_silph', name: 'Patrocinio Silph', subtype: 'Objeto', timing: 'action', phaseTag: 'FASE 3: ACCIÓN', count: 2, icon: 'fa-hand-holding-dollar', desc: 'Gana +1 P¥ inmediatamente por cada tipo diferente de Pokéball que poseas en tu colección (bandeja + capturas) en este momento.' },
    { id: 'cupon_rebajas', name: 'Cupón de Rebajas', subtype: 'Objeto', timing: 'action', phaseTag: 'FASE 3 / ANTES DE GACHA', count: 2, icon: 'fa-tags', desc: 'Tu próxima tirada en la máquina de gachapon cuesta solo 1 P¥ en lugar de los 3 P¥ habituales.' },
    { id: 'superrepelente', name: 'Superrepelente', subtype: 'Objeto', timing: 'safari', phaseTag: 'FASE DE SAFARI', count: 1, icon: 'fa-spray-can-sparkles', desc: 'En la Fase de Captura, cambia el Pokémon elegido frente a ti hasta que salga uno de rareza Rara (Azul) o superior (el resto va al fondo del mazo).' },
    { id: 'pokedex_actualizada', name: 'Pokédex Actualizada', subtype: 'Objeto', timing: 'action', phaseTag: 'FASE 3: ACCIÓN', count: 2, icon: 'fa-tablet-screen-button', desc: 'Mira las 4 primeras cartas del mazo de Efectos y Trampas. Ordénalas arrastrándolas: las 3 primeras quedarán arriba del mazo en ese orden y la 4ª carta se enviará al fondo del mazo.' },
    { id: 'intercambio_comercial', name: 'Intercambio Comercial', subtype: 'Objeto', timing: 'action', phaseTag: 'FASE 3: ACCIÓN', count: 1, icon: 'fa-rotate', desc: 'Rota tu mano actual completa de Cartas de Efecto al fondo del mazo y roba el mismo número de cartas nuevas.' },
    { id: 'capsula_temporal', name: 'Cápsula Temporal', subtype: 'Objeto', timing: 'action', phaseTag: 'FASE 3: ACCIÓN', count: 2, icon: 'fa-hourglass-half', desc: 'Recupera de la pila de descartes 1 Carta de Objeto a tu mano, o coloca 1 Carta de Trampa descartada en lo alto del mazo.' },
    { id: 'trampa_policia', name: 'Inspección Policial', subtype: 'Trampa', trapPositive: false, phaseTag: '¡AL ROBAR! TRAMPA NEGATIVA', count: 2, icon: 'fa-user-shield', desc: 'Si tienes al menos 1 Rocket Ball libre en tu bandeja, la policía confisca 1 (va a descarte) y pagas 1 P¥ de multa al banco.' },
    { id: 'trampa_bolsillo', name: '¡Bolsillo Roto!', subtype: 'Trampa', trapPositive: false, phaseTag: '¡AL ROBAR! TRAMPA NEGATIVA', count: 2, icon: 'fa-coins', desc: 'Pierdes 2 P¥ de tu reserva personal al instante por un despiste.' },
    { id: 'trampa_averia', name: 'Avería del Gachapon', subtype: 'Trampa', trapPositive: true, phaseTag: '¡AL ROBAR! EVENTO POSITIVO', count: 2, icon: 'fa-gears', desc: '¡Suerte inesperada! Realiza un giro gratuito e inmediato en la máquina de gachapon.' },
    { id: 'trampa_suerte', name: 'Día de Suerte', subtype: 'Trampa', trapPositive: true, phaseTag: '¡AL ROBAR! EVENTO POSITIVO', count: 2, icon: 'fa-clover', desc: 'Encuentras un monedero olvidado en el Centro Pokémon; recibes +3 P¥ de la reserva central al instante.' },
    { id: 'trampa_apagon', name: 'Apagón en el Centro Pokémon', subtype: 'Trampa', trapPositive: false, phaseTag: '¡AL ROBAR! TRAMPA GLOBAL', count: 2, icon: 'fa-bolt-lightning', desc: 'Todos los jugadores de la mesa deben descartar 1 Carta de Efecto de su mano actual de inmediato (si tienen alguna).' },
    { id: 'trampa_alerta_rocket', name: 'Alerta de Team Rocket', subtype: 'Trampa', trapPositive: false, phaseTag: '¡AL ROBAR! TRAMPA NEGATIVA', count: 2, icon: 'fa-skull-crossbones', desc: 'La Pokéball libre de menor valor de tu bandeja vuelve a la máquina de gacha. Si todas tus Pokéballs tienen Pokémon, pierdes 2 P¥.' }
];

const OBJECTIVES_CATALOG = [
    { id: 'obj_1', name: 'Doble Pareja', category: 'A: Parejas y Grupos', pv: 5, desc: 'Tener al menos 2 parejas de cualquier tipo de Pokéball en tu colección al final de la partida.' },
    { id: 'obj_2', name: 'El Triunvirato de Amor', category: 'A: Parejas y Grupos', pv: 11, desc: 'Lograr completar al menos 2 parejas (4 unidades en total) de Amor Ball en tu colección.' },
    { id: 'obj_3', name: 'Fidelidad al Clásico', category: 'A: Parejas y Grupos', pv: 7, desc: 'Tener al menos 4 Poké Balls normales y reclamar el bono pasivo de al menos 1 Honor Ball.' },
    { id: 'obj_4', name: 'Muestrario de Ruta', category: 'B: Variedad', pv: 4, desc: 'Poseer al menos 5 tipos diferentes de Pokéball en tu colección (bandeja + capturas).' },
    { id: 'obj_5', name: 'Círculo Cromático', category: 'B: Variedad', pv: 8, desc: 'Poseer al menos 8 tipos diferentes de Pokéball en tu colección (bandeja + capturas).' },
    { id: 'obj_6', name: 'Purista de la Luna', category: 'B: Variedad', pv: 6, desc: 'Terminar la partida teniendo exactamente 1 única Luna Ball en tu colección.' },
    { id: 'obj_7', name: 'Centro Pokémon Satélite', category: 'C: Volumen', pv: 7, desc: 'Tener 10 o más Pokéballs en total (sumando bandeja y Pokémon capturados) al final de la partida.' },
    { id: 'obj_8', name: 'Almacén Central de Kanto', category: 'C: Volumen', pv: 12, desc: 'Tener 14 o más Pokéballs en total (sumando bandeja y Pokémon capturados) al final de la partida.' },
    { id: 'obj_9', name: 'Zona Desmilitarizada', category: 'D: Táctica y Economía', pv: 6, desc: 'Terminar la partida sin ninguna Rocket Ball en toda tu colección.' },
    { id: 'obj_10', name: 'Inversión de Lujo', category: 'D: Táctica y Economía', pv: 9, desc: 'Haber vendido al menos 2 Lujo Balls durante la partida utilizando Tickets de Devolución.' },
    { id: 'obj_11', name: 'Escudo de Plomo', category: 'D: Táctica y Economía', pv: 8, desc: 'Poseer las 2 únicas Peso Ball del juego en tu colección al final de la partida.' },
    { id: 'obj_12', name: 'Coleccionista Imparcial', category: 'D: Táctica y Economía', pv: 7, desc: 'Terminar la partida sin tener ninguna Poké Ball normal en toda tu colección.' },
    { id: 'obj_13', name: 'Hazaña de Entrenador', category: 'E: Capturas', pv: 9, desc: 'Capturar al menos 1 Pokémon Raro (Azul) o superior utilizando una Pokéball Común (Gris).' },
    { id: 'obj_14', name: 'Cazador de Leyendas', category: 'E: Capturas', pv: 10, desc: 'Terminar la partida con al menos 1 Pokémon Legendario (Dorado) o Mítico (Rojo) capturado.' },
    { id: 'obj_15', name: 'Reclutamiento Rocket', category: 'E: Capturas', pv: 7, desc: 'Capturar al menos 2 Pokémon utilizando Rocket Balls en las Fases de Captura.' },
    { id: 'obj_16', name: 'Sincronía Perfecta', category: 'E: Capturas', pv: 6, desc: 'Capturar al menos 2 Pokémon utilizando Pokéballs que coincidan exactamente con su color/rareza.' },
    { id: 'obj_17', name: 'Espectro de Rarezas', category: 'E: Capturas', pv: 8, desc: 'Tener capturados al menos 3 Pokémon con distinto color cromático de fondo.' },
    { id: 'obj_18', name: 'Pokédex Biregional', category: 'E: Capturas', pv: 5, desc: 'Tener capturados al menos 2 Pokémon de la región de Kanto (#001-#151) y 2 de Johto (#152-#251).' },
    { id: 'obj_19', name: 'Veterano del Safari', category: 'E: Capturas', pv: 7, desc: 'Lograr capturar un Pokémon en 3 Fases de Captura consecutivas.' },
    { id: 'obj_20', name: 'Caza Menor', category: 'E: Capturas', pv: 4, desc: 'Tener capturados al menos 2 Pokémon de rareza Común (Gris) o Poco Común (Verde).' },
    { id: 'obj_21', name: 'Escuadrón de Élite', category: 'E: Capturas', pv: 9, desc: 'Terminar la partida con al menos 2 Pokémon de rareza Épica (Morado) o superior capturados.' },
    { id: 'obj_22', name: 'Entrenador Equilibrado', category: 'E: Capturas', pv: 7, desc: 'Terminar la partida con al menos 2 Pokémon capturados y 6 Pokéballs físicas libres en tu bandeja.' }
];

const ArtRenderer = {
    renderBallSVG(ballTypeId, size = 44, extraClass = '') {
        const b = BALL_MAP[ballTypeId] || BALL_TYPES[0];
        let badgeMark = '';
        if (ballTypeId === 'masterball') {
            badgeMark = `<text x="24" y="16" text-anchor="middle" fill="#fde047" font-size="10" font-family="monospace" font-weight="bold">M</text>`;
        } else if (ballTypeId === 'rocketball') {
            badgeMark = `<text x="24" y="16" text-anchor="middle" fill="#ef4444" font-size="11" font-family="monospace" font-weight="bold">R</text>`;
        } else if (ballTypeId === 'amorball') {
            badgeMark = `<text x="24" y="16" text-anchor="middle" fill="#fff" font-size="9">♥</text>`;
        } else if (ballTypeId === 'lunaball') {
            badgeMark = `<text x="24" y="16" text-anchor="middle" fill="#fde047" font-size="9">☾</text>`;
        } else if (ballTypeId === 'pesoball') {
            badgeMark = `<circle cx="15" cy="14" r="2.5" fill="#94a3b8"/><circle cx="33" cy="14" r="2.5" fill="#94a3b8"/>`;
        } else if (ballTypeId === 'ultraball') {
            badgeMark = `<path d="M14 10 L18 22 M34 10 L30 22" stroke="#facc15" stroke-width="3"/>`;
        } else if (ballTypeId === 'gloriaball') {
            badgeMark = `<text x="24" y="16" text-anchor="middle" fill="#fde047" font-size="9">★</text>`;
        }

        return `
        <svg width="${size}" height="${size}" viewBox="0 0 48 48" class="relative z-10 inline-block select-none pointer-events-none ${extraClass}">
            <defs>
                <radialGradient id="shine_${ballTypeId}" cx="35%" cy="30%" r="60%">
                    <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45"/>
                    <stop offset="100%" stop-color="#000000" stop-opacity="0.15"/>
                </radialGradient>
            </defs>
            <circle cx="24" cy="24" r="21" fill="${b.hexBot}" stroke="#0f172a" stroke-width="3"/>
            <path d="M 3 24 A 21 21 0 0 1 45 24 Z" fill="${b.hexTop}" stroke="#0f172a" stroke-width="3"/>
            ${badgeMark}
            <line x1="3" y1="24" x2="45" y2="24" stroke="#0f172a" stroke-width="3.5"/>
            <circle cx="24" cy="24" r="21" fill="url(#shine_${ballTypeId})"/>
            <circle cx="24" cy="24" r="6.5" fill="#f8fafc" stroke="#0f172a" stroke-width="3"/>
            <circle cx="24" cy="24" r="3" fill="${b.badgeColor}"/>
        </svg>`;
    },

    renderBingoBallSVG(ballObj, size = 96) {
        const b = BALL_MAP[ballObj.typeId] || BALL_TYPES[0];
        return `
        <div class="relative inline-flex items-center justify-center select-none" style="width:${size}px; height:${size}px;">
            <div class="absolute -inset-2 rounded-full animate-bingo-glow z-0 pointer-events-none" style="background: radial-gradient(circle, ${b.badgeColor}66 0%, transparent 68%);"></div>
            <div class="relative z-10 flex items-center justify-center">
                ${this.renderBallSVG(ballObj.typeId, size)}
            </div>
        </div>`;
    },

    renderGachaMachineSVG(remainingCount = 60, isCranking = false) {
        const crankClass = isCranking ? 'animate-crank' : '';
        const drumClass = isCranking ? 'animate-bingo-drum' : '';
        return `
        <svg viewBox="0 0 160 200" class="w-full h-full drop-shadow-lg">
            <rect x="24" y="12" width="112" height="92" rx="44" fill="#1e293b" stroke="#cbd5e1" stroke-width="4"/>
            <g class="${drumClass}" opacity="${remainingCount > 0 ? '0.95' : '0.15'}">
                <circle cx="52" cy="78" r="11" fill="#ef4444" stroke="#0f172a" stroke-width="2"/>
                <circle cx="76" cy="82" r="11" fill="#3b82f6" stroke="#0f172a" stroke-width="2"/>
                <circle cx="102" cy="79" r="11" fill="#eab308" stroke="#0f172a" stroke-width="2"/>
                <circle cx="64" cy="60" r="11" fill="#a855f7" stroke="#0f172a" stroke-width="2"/>
                <circle cx="90" cy="62" r="11" fill="#22c55e" stroke="#0f172a" stroke-width="2"/>
                <circle cx="114" cy="60" r="10" fill="#ec4899" stroke="#0f172a" stroke-width="2"/>
                <circle cx="46" cy="56" r="10" fill="#06b6d4" stroke="#0f172a" stroke-width="2"/>
                <circle cx="78" cy="44" r="11" fill="#7e22ce" stroke="#0f172a" stroke-width="2"/>
            </g>
            <path d="M 38 28 Q 48 20 68 20" stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.45"/>
            <rect x="36" y="6" width="88" height="12" rx="5" fill="#dc2626" stroke="#0f172a" stroke-width="3"/>
            <path d="M 28 98 L 132 98 L 140 186 L 20 186 Z" fill="#dc2626" stroke="#0f172a" stroke-width="4"/>
            <rect x="34" y="104" width="92" height="16" rx="3" fill="#fef08a" stroke="#0f172a" stroke-width="2.5"/>
            <text x="80" y="115" text-anchor="middle" fill="#0f172a" font-size="8.5" font-family="monospace" font-weight="bold">GACHAKÉMON 3P¥</text>
            <g transform="translate(80, 142)">
                <g class="${crankClass}">
                    <circle cx="0" cy="0" r="16" fill="#f8fafc" stroke="#0f172a" stroke-width="3"/>
                    <rect x="-13" y="-4" width="26" height="8" rx="3" fill="#eab308" stroke="#0f172a" stroke-width="2"/>
                    <circle cx="0" cy="0" r="4" fill="#475569"/>
                </g>
            </g>
            <rect x="58" y="164" width="44" height="20" rx="4" fill="#0f172a" stroke="#94a3b8" stroke-width="2"/>
        </svg>`;
    }
};

const NOTE_FREQ = {
    'R': 0,
    'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'Eb2': 77.78, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'Ab2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'Bb2': 116.54, 'B2': 123.47,
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'Ab3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'Bb3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'Ab4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'Bb4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'Ab5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'Bb5': 932.33, 'B5': 987.77,
    'C6': 1046.50, 'C#6': 1108.73, 'D6': 1174.66, 'D#6': 1244.51, 'Eb6': 1244.51, 'E6': 1318.51, 'F6': 1396.91, 'F#6': 1479.98, 'G6': 1567.98
};

const AudioEngine = {
    ctx: null,
    noiseBuffer: null,
    isMuted: false,
    bgmVolume: 0.70,
    sfxVolume: 0.85,
    currentTrackIdx: 0,
    stepIdx: 0,
    timerId: null,
    customAudioElement: null,
    isPlayingCustom: false,
    externalLoaded: false,

    tracks: (window.GACHAKEMON_MUSIC_DATA && window.GACHAKEMON_MUSIC_DATA.tracks) ? window.GACHAKEMON_MUSIC_DATA.tracks : [
        {
            name: '♪ 01. Pueblo Paleta / Inicio RPG',
            screen: 'Menú Principal',
            type: 'synth',
            stepMs: 165,
            lead: ['E5','G5','A5','C6', 'B5','A5','G5','E5', 'D5','E5','G5','A5', 'G5','E5','D5','C5', 'E5','G5','A5','C6', 'D6','C6','B5','A5', 'G5','A5','B5','G5', 'E5','R','E5','R'],
            harm: ['C4','E4','G4','C5', 'G4','E4','C4','G3', 'B3','D4','G4','B4', 'G4','D4','B3','G3', 'C4','E4','G4','C5', 'F4','A4','C5','F5', 'E4','G4','B4','G4', 'C4','G3','C4','R'],
            bass: ['C3','G3','C3','G3', 'C3','G3','C3','G3', 'G2','D3','G2','D3', 'G2','D3','G2','D3', 'A2','E3','A2','E3', 'F2','C3','F2','C3', 'G2','D3','G2','D3', 'C3','G2','C3','R'],
            drums: ['K','H','S','H', 'K','H','S','H', 'K','H','S','H', 'K','S','K','S', 'K','H','S','H', 'K','H','S','H', 'K','H','S','H', 'K','S','K','H']
        },
        {
            name: '♪ 02. Centro Pokémon & Gachapon',
            screen: 'Tablero Principal',
            type: 'synth',
            stepMs: 152,
            lead: ['E4','G#4','B4','E5', 'D#5','B4','G#4','E4', 'F#4','A4','C#5','F#5', 'E5','C#5','A4','F#4', 'E4','G#4','B4','E5', 'G#5','F#5','E5','D#5', 'C#5','E5','G#5','B4', 'E5','B4','E5','R'],
            harm: ['G#3','B3','E4','G#4', 'B3','G#3','E3','B3', 'A3','C#4','F#4','A4', 'C#4','A3','F#3','C#4', 'G#3','B3','E4','G#4', 'E4','C#4','B3','G#3', 'A3','C#4','E4','G#4', 'G#3','E3','G#3','R'],
            bass: ['E2','B2','E3','B2', 'E2','B2','E3','B2', 'F#2','C#3','F#3','C#3', 'F#2','C#3','F#3','C#3', 'E2','B2','E3','B2', 'C#3','A2','C#3','A2', 'A2','E3','A2','E3', 'E2','B2','E2','R'],
            drums: ['K','H','S','H', 'K','K','S','H', 'K','H','S','H', 'K','S','H','S', 'K','H','S','H', 'K','K','S','H', 'K','S','K','S', 'K','H','K','S']
        },
        {
            name: '♪ 03. Ruta Salvaje / Fase de Safari',
            screen: 'Fase de Safari',
            type: 'synth',
            stepMs: 128,
            lead: ['A4','C5','E5','A5', 'G#5','E5','C5','A4', 'B4','D5','F#5','B5', 'A5','F#5','D5','B4', 'C5','E5','A5','C6', 'B5','A5','G#5','F#5', 'E5','G#5','B5','G#5', 'A5','E5','A5','R'],
            harm: ['E4','A4','C5','E5', 'C5','A4','E4','C4', 'F#4','B4','D5','F#5', 'D5','B4','F#4','D4', 'A4','C5','E5','A5', 'E5','C5','B4','A4', 'G#4','B4','E5','B4', 'A4','E4','A4','R'],
            bass: ['A2','E3','A3','E3', 'A2','E3','A3','E3', 'B2','F#3','B3','F#3', 'B2','F#3','B3','F#3', 'F2','C3','F3','C3', 'E2','B2','E3','B2', 'E2','G#2','B2','E3', 'A2','E3','A2','R'],
            drums: ['K','H','K','S', 'H','K','S','H', 'K','H','K','S', 'H','K','S','S', 'K','H','K','S', 'H','K','S','H', 'K','S','K','S', 'K','S','K','H']
        },
        {
            name: '♪ 04. Incursión Team Rocket',
            screen: 'Ataque Rocket Ball',
            type: 'synth',
            stepMs: 124,
            lead: ['D5','F5','Ab5','B5', 'Bb5','Ab5','F5','D5', 'C5','Eb5','G5','Bb5', 'A5','G5','Eb5','C5', 'D5','F5','Ab5','B5', 'C6','B5','Ab5','F5', 'E5','G#5','B5','G#5', 'D5','R','D5','R'],
            harm: ['Bb3','D5','F5','Bb5', 'F5','D5','Bb3','F3', 'Ab3','C5','Eb5','G5', 'Eb5','C5','Ab3','Eb3', 'Bb3','D5','F5','Bb5', 'Ab3','C5','Eb5','Ab5', 'E5','B4','G#4','E4', 'D5','Bb3','D5','R'],
            bass: ['Bb2','F3','Bb3','F3', 'Bb2','F3','Bb3','F3', 'Ab2','Eb3','Ab3','Eb3', 'Ab2','Eb3','Ab3','Eb3', 'Bb2','F3','Bb3','F3', 'Ab2','Eb3','Ab3','Eb3', 'E2','B2','E3','B2', 'D3','Bb2','D3','R'],
            drums: ['K','H','S','H', 'K','H','S','K', 'K','H','S','H', 'K','S','K','S', 'K','H','S','H', 'K','H','S','K', 'K','S','K','S', 'K','R','K','S']
        },
        {
            name: '♪ 05. Salón de la Fama / Campeón',
            screen: 'Victoria Final',
            type: 'synth',
            stepMs: 148,
            lead: ['C5','E5','G5','C6', 'B5','G5','E5','C5', 'F5','A5','C6','F6', 'E6','C6','A5','F5', 'G5','B5','D6','G6', 'F6','D6','B5','G5', 'C6','G5','E6','C6', 'C6','G5','C6','R'],
            harm: ['G4','C5','E5','G5', 'E5','C5','G4','E4', 'A4','C5','F5','A5', 'F5','C5','A4','F4', 'B4','D5','G5','B5', 'G5','D5','B4','G4', 'E5','C5','G5','E5', 'C6','E5','C6','R'],
            bass: ['C3','G3','C4','G3', 'C3','G3','C4','G3', 'F3','C4','F4','C4', 'F3','C4','F4','C4', 'G3','D4','G4','D4', 'G3','D4','G4','D4', 'C3','G3','C4','G3', 'C3','G3','C3','R'],
            drums: ['K','H','S','H', 'K','H','S','H', 'K','H','S','H', 'K','S','K','S', 'K','H','S','H', 'K','H','S','H', 'K','S','K','S', 'K','S','K','R']
        }
    ],

    loadExternalTracks() {
        if (this.externalLoaded) return;
        this.externalLoaded = true;

        if (window.GACHAKEMON_MUSIC_DATA && Array.isArray(window.GACHAKEMON_MUSIC_DATA.tracks)) {
            this.tracks = window.GACHAKEMON_MUSIC_DATA.tracks;
            this.updateTrackLabelUI();
            return;
        }

        const script = document.createElement('script');
        script.src = 'music_tracks.js';
        script.onload = () => {
            if (window.GACHAKEMON_MUSIC_DATA && Array.isArray(window.GACHAKEMON_MUSIC_DATA.tracks)) {
                this.tracks = window.GACHAKEMON_MUSIC_DATA.tracks;
                this.updateTrackLabelUI();
            }
        };
        script.onerror = () => {
            fetch('music_tracks.json')
                .then(r => r.json())
                .then(data => {
                    if (data && Array.isArray(data.tracks) && data.tracks.length > 0) {
                        this.tracks = data.tracks;
                        this.updateTrackLabelUI();
                    }
                })
                .catch(() => {});
        };
        document.head.appendChild(script);
    },

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this.createNoiseBuffer();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    createNoiseBuffer() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;
    },

    setBgmVolume(vol01) {
        this.bgmVolume = Math.max(0, Math.min(1, parseFloat(vol01) || 0));
        if (this.customAudioElement) {
            this.customAudioElement.volume = this.isMuted ? 0 : this.bgmVolume;
        }
    },

    setSfxVolume(vol01) {
        this.sfxVolume = Math.max(0, Math.min(1, parseFloat(vol01) || 0));
    },

    playVoice(freq, durationMs, waveType = 'square', peakGain = 0.03, detuneCents = 0, channel = 'sfx') {
        if (this.isMuted || !freq || freq <= 0) return;
        const mult = channel === 'bgm' ? (this.bgmVolume / 0.70) : (this.sfxVolume / 0.85);
        const finalGain = peakGain * mult;
        if (finalGain <= 0.0002) return;

        this.init();
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const durSec = durationMs / 1000;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = waveType;
            osc.frequency.setValueAtTime(freq, now);
            if (detuneCents) osc.detune.setValueAtTime(detuneCents, now);

            gain.gain.setValueAtTime(0.0005, now);
            gain.gain.linearRampToValueAtTime(finalGain, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0005, now + durSec);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + durSec);
        } catch (e) {}
    },

    playDrum(drumCode) {
        if (this.isMuted || !drumCode || drumCode === 'R') return;
        const mult = this.bgmVolume / 0.70;
        if (mult <= 0.01) return;

        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        try {
            if (drumCode === 'K') {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(135, now);
                osc.frequency.exponentialRampToValueAtTime(38, now + 0.09);
                gain.gain.setValueAtTime(0.07 * mult, now);
                gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.09);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.09);
            } else if ((drumCode === 'S' || drumCode === 'H') && this.noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.noiseBuffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = drumCode === 'H' ? 'highpass' : 'bandpass';
                filter.frequency.setValueAtTime(drumCode === 'H' ? 5000 : 1400, now);

                const gain = this.ctx.createGain();
                const dur = drumCode === 'H' ? 0.035 : 0.085;
                const baseG = drumCode === 'H' ? 0.018 : 0.035;
                gain.gain.setValueAtTime(baseG * mult, now);
                gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                noise.start(now);
                noise.stop(now + dur);
            }
        } catch (e) {}
    },

    setTrack(idx) {
        if (!this.tracks || this.tracks.length === 0) return;
        this.currentTrackIdx = idx % this.tracks.length;
        this.stepIdx = 0;
        const tr = this.tracks[this.currentTrackIdx];
        if (tr && tr.type === 'custom' && tr.audioUrl) {
            const candidates = [tr.audioUrl, ...(tr.fallbackUrls || [])];
            this.playCustomUrlWithFallback(candidates, 0, tr);
        } else {
            this.stopCustomAudio();
            this.startLoop();
        }
        this.updateTrackLabelUI();
    },

    playCustomUrlWithFallback(candidates, attemptIdx, trackObj) {
        if (!candidates || attemptIdx >= candidates.length) {
            // Si no se encuentra ningún archivo .mp3 en la carpeta, usar el sintetizador polifónico de respaldo
            this.stopCustomAudio();
            if (trackObj && trackObj.lead) {
                this.startLoop();
            }
            return;
        }
        this.stopCustomAudio();
        const url = candidates[attemptIdx];
        const audio = new Audio();
        audio.loop = true;
        audio.volume = this.isMuted ? 0 : this.bgmVolume;

        let settled = false;
        audio.addEventListener('error', () => {
            if (settled) return;
            settled = true;
            this.playCustomUrlWithFallback(candidates, attemptIdx + 1, trackObj);
        }, { once: true });

        audio.addEventListener('canplay', () => {
            if (settled) return;
            settled = true;
            if (!this.isMuted && this.customAudioElement === audio) {
                audio.play().catch(() => {});
            }
        }, { once: true });

        this.customAudioElement = audio;
        this.isPlayingCustom = true;
        if (this.timerId) clearInterval(this.timerId);
        audio.src = url;
        audio.load();
    },

    playCustomUrl(url) {
        this.playCustomUrlWithFallback([url], 0, this.tracks[this.currentTrackIdx]);
    },

    loadCustomFile(fileOrUrl, displayName) {
        this.init();
        const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
        const customTrackObj = {
            id: 'custom_' + Date.now(),
            name: '🎵 ' + (displayName || 'Pista Personalizada'),
            screen: 'Archivo de Usuario',
            type: 'custom',
            audioUrl: url
        };
        this.tracks.push(customTrackObj);
        this.setTrack(this.tracks.length - 1);
    },

    stopCustomAudio() {
        if (this.customAudioElement) {
            try {
                this.customAudioElement.pause();
                this.customAudioElement.src = '';
            } catch (e) {}
            this.customAudioElement = null;
        }
        this.isPlayingCustom = false;
    },

    updateTrackLabelUI() {
        const label = document.getElementById('currentTrackLabel');
        if (label) {
            const tr = this.tracks[this.currentTrackIdx];
            label.textContent = tr ? tr.name : '♪ Sin música';
            label.className = 'font-vt text-sm text-cyan-300 truncate leading-tight font-bold cursor-pointer hover:text-yellow-300 underline decoration-dotted';
            label.title = 'Haz clic para abrir el Selector de Música (Jukebox)';
            label.onclick = () => this.openMusicSelectorModal();
        }
    },

    openMusicSelectorModal() {
        this.sfxClick();
        const titleEl = document.getElementById('interactionModalTitle');
        const descEl = document.getElementById('interactionModalDesc');
        const contentEl = document.getElementById('interactionModalContent');
        if (!titleEl || !contentEl) return;

        titleEl.textContent = '🎵 JUKEBOX: SELECTOR DE MÚSICA DEL JUEGO';
        descEl.textContent = 'Elige cualquiera de las canciones (.mp3 o sintetizadas) o sube un archivo de audio desde tu equipo:';

        contentEl.innerHTML = `
            <div class="space-y-2">
                ${this.tracks.map((t, idx) => {
                    const active = idx === this.currentTrackIdx;
                    return `
                    <div onclick="AudioEngine.setTrack(${idx}); AudioEngine.openMusicSelectorModal()"
                         class="cursor-pointer p-3 rounded-xl border-2 transition flex items-center justify-between ${active ? 'border-yellow-400 bg-yellow-500/20 shadow-lg' : 'border-slate-700 bg-slate-950 hover:border-cyan-400'}">
                        <div>
                            <div class="font-bold text-xs ${active ? 'text-yellow-300' : 'text-white'}">${t.name}</div>
                            <div class="text-[10px] text-slate-400">${t.screen || 'Pista Musical'}</div>
                        </div>
                        <span class="px-2.5 py-1 rounded text-[10px] font-pixel ${active ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-cyan-300'}">
                            ${active ? '🔊 SONANDO' : '▶ REPRODUCIR'}
                        </span>
                    </div>`;
                }).join('')}
            </div>
        `;
        UI.openModal('modalInteraction');
    },

    nextTrackManual() {
        this.init();
        this.setTrack((this.currentTrackIdx + 1) % this.tracks.length);
        this.sfxClick();
    },

    toggleMute() {
        this.init();
        this.isMuted = !this.isMuted;
        const icon = document.getElementById('musicIcon');
        if (icon) {
            icon.className = this.isMuted ? 'fas fa-volume-mute text-red-400' : 'fas fa-volume-up text-sm';
        }
        if (this.customAudioElement) {
            this.customAudioElement.volume = this.isMuted ? 0 : this.bgmVolume;
            if (this.isMuted) this.customAudioElement.pause();
            else this.customAudioElement.play().catch(() => {});
        }
        if (!this.isMuted && !this.isPlayingCustom) this.startLoop();
    },

    startLoop() {
        if (this.timerId) clearInterval(this.timerId);
        if (this.isPlayingCustom) return;
        const track = this.tracks[this.currentTrackIdx];
        if (!track || !track.lead) return;

        this.timerId = setInterval(() => {
            if (this.isMuted || !this.ctx || this.ctx.state !== 'running' || this.isPlayingCustom) return;
            const i = this.stepIdx % track.lead.length;
            const fLead = NOTE_FREQ[track.lead[i]] || 0;
            const fHarm = NOTE_FREQ[track.harm[i]] || 0;
            const fBass = NOTE_FREQ[track.bass[i]] || 0;
            const dCode = track.drums[i] || 'R';

            if (fLead > 0) this.playVoice(fLead, track.stepMs * 0.85, 'square', 0.026, 4, 'bgm');
            if (fHarm > 0) this.playVoice(fHarm, track.stepMs * 0.80, 'square', 0.016, -4, 'bgm');
            if (fBass > 0) this.playVoice(fBass, track.stepMs * 0.92, 'triangle', 0.045, 0, 'bgm');
            if (dCode !== 'R') this.playDrum(dCode);

            this.stepIdx++;
        }, track.stepMs);
    },

    sfxClick() { this.playVoice(783.99, 55, 'square', 0.045, 0, 'sfx'); },
    sfxSwap() {
        this.playVoice(523.25, 50, 'triangle', 0.06, 0, 'sfx');
        setTimeout(() => this.playVoice(659.25, 65, 'triangle', 0.06, 0, 'sfx'), 45);
    },
    sfxCoin() {
        this.playVoice(987.77, 70, 'square', 0.055, 0, 'sfx');
        setTimeout(() => this.playVoice(1318.51, 160, 'square', 0.055, 0, 'sfx'), 75);
    },
    sfxGachaCrank() {
        const baseNotes = [330, 392, 440, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880];
        const totalSteps = 26;
        for (let i = 0; i < totalSteps; i++) {
            const f = baseNotes[i % baseNotes.length] * (i > 18 ? 1.25 : 1);
            setTimeout(() => {
                this.playVoice(f, 55, 'triangle', 0.045, 0, 'sfx');
                if (i % 2 === 0) this.playDrum('H');
            }, i * 90);
        }
        setTimeout(() => {
            this.playVoice(783.99, 95, 'square', 0.055, 0, 'sfx');
            setTimeout(() => this.playVoice(1046.50, 220, 'square', 0.065, 0, 'sfx'), 90);
        }, 2430);
    },
    sfxTrap() {
        [311.13, 293.66, 277.18, 261.63].forEach((f, i) => {
            setTimeout(() => {
                this.playVoice(f, 130, 'sawtooth', 0.045, 0, 'sfx');
                this.playVoice(f * 0.5, 130, 'square', 0.03, 0, 'sfx');
            }, i * 115);
        });
    },
    sfxCaptureSuccess() {
        const chordNotes = [
            [523.25, 329.63],
            [659.25, 392.00],
            [783.99, 523.25],
            [1046.50, 659.25]
        ];
        chordNotes.forEach(([n1, n2], i) => {
            setTimeout(() => {
                this.playVoice(n1, 165, 'square', 0.05, 0, 'sfx');
                this.playVoice(n2, 165, 'triangle', 0.05, 0, 'sfx');
            }, i * 115);
        });
    }
};

const Lobby = {
    selectedTab: 'solo',
    soloPlayerCount: 4,
    localPlayerCount: 2,

    init() {
        AudioEngine.loadExternalTracks();
        SettingsManager.init();
        AudioEngine.updateTrackLabelUI();
        const logoEl = document.getElementById('headerLogoBall');
        if (logoEl) logoEl.innerHTML = ArtRenderer.renderBallSVG('masterball', 30);
        const previewEl = document.getElementById('lobbyGachaPreview');
        if (previewEl) previewEl.innerHTML = ArtRenderer.renderGachaMachineSVG(60, false);
        this.renderLocalPlayerInputs();
        this.installKeyboardGuards();
        const nickInput = document.getElementById('inputPlayerName');
        nickInput?.addEventListener('input', () => {
            const firstLocalName = document.getElementById('localNameInput_0');
            if (firstLocalName?.dataset.autoName === 'true') {
                firstLocalName.value = getInputTrainerName('Jugador 1');
            }
        });
        document.getElementById('localNameInput_0')?.addEventListener('input', event => {
            event.currentTarget.dataset.autoName = 'false';
        });

        document.body.addEventListener('click', function startAudioOnce() {
            AudioEngine.init();
            if (!AudioEngine.timerId) AudioEngine.setTrack(0);
            document.body.removeEventListener('click', startAudioOnce);
        }, { once: true });
    },

    selectTab(tab) {
        AudioEngine.sfxClick();
        this.selectedTab = tab;
        const tabs = ['solo', 'local', 'online'];
        tabs.forEach(t => {
            const btn = document.getElementById('tabBtn' + t.charAt(0).toUpperCase() + t.slice(1));
            const panel = document.getElementById('panelMode' + t.charAt(0).toUpperCase() + t.slice(1));
            if (t === tab) {
                btn.className = 'py-2.5 px-3 rounded-lg font-pixel text-[10px] border-2 border-yellow-400 bg-yellow-500/20 text-yellow-300 flex flex-col items-center gap-1';
                panel.classList.remove('hidden');
            } else {
                btn.className = 'py-2.5 px-3 rounded-lg font-pixel text-[10px] border-2 border-slate-700 bg-slate-800 text-slate-400 flex flex-col items-center gap-1';
                panel.classList.add('hidden');
            }
        });
    },

    setPlayerCount(count) {
        AudioEngine.sfxClick();
        this.soloPlayerCount = count;
        [2, 3, 4].forEach(n => {
            const btn = document.getElementById(`btnCount${n}`);
            if (btn) {
                btn.className = (n === count)
                    ? 'px-3 py-1 rounded bg-yellow-500 text-slate-950 border border-yellow-400 text-xs font-bold'
                    : 'px-3 py-1 rounded bg-slate-800 border border-slate-600 text-xs font-bold';
            }
        });
    },

    setLocalCount(count) {
        AudioEngine.sfxClick();
        this.localPlayerCount = count;
        [2, 3, 4].forEach(n => {
            const btn = document.getElementById(`btnLoc${n}`);
            if (btn) {
                btn.className = (n === count)
                    ? 'px-3 py-1 rounded bg-yellow-500 text-slate-950 border border-yellow-400 text-xs font-bold'
                    : 'px-3 py-1 rounded bg-slate-800 border border-slate-600 text-xs font-bold';
            }
        });
        this.renderLocalPlayerInputs();
    },

    renderLocalPlayerInputs() {
        const container = document.getElementById('localPlayerNamesContainer');
        if (!container) return;
        const mainName = getInputTrainerName('Jugador 1');
        const defaults = [mainName, 'Jugador 2', 'Jugador 3', 'Jugador 4'];
        container.innerHTML = Array.from({ length: this.localPlayerCount }, (_, i) => `
            <div>
                <label class="block text-[10px] text-slate-400 mb-0.5">Jugador ${i + 1}:</label>
                <input id="localNameInput_${i}" type="text" value="${escapeHTML(defaults[i])}" ${i === 0 ? 'data-auto-name="true"' : ''} maxlength="16"
                    class="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-semibold">
            </div>`).join('');
    },

    installKeyboardGuards() {
        if (this.keyboardGuardsInstalled) return;
        this.keyboardGuardsInstalled = true;
        window.addEventListener('keydown', event => {
            const key = String(event.key || '').toLowerCase();
            const refreshShortcut = event.key === 'F5' ||
                ((event.ctrlKey || event.metaKey) && key === 'r');
            if (refreshShortcut) {
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
            if (event.key === 'Escape') UI.closeHeaderMenu();
        }, true);

        document.addEventListener('click', event => {
            const panel = document.getElementById('headerActionsPanel');
            const toggle = document.getElementById('headerMenuToggle');
            if (panel && toggle && !panel.contains(event.target) && !toggle.contains(event.target)) {
                UI.closeHeaderMenu();
            }
        });
    }
};

const OnlineManager = {
    roomCode: null,
    isHost: false,
    myPeerId: null,
    peer: null,
    connections: [],
    hostConn: null,
    localBC: null,
    lobbyPlayers: [],
    lastHostAiTurnKey: null,

    getLocalPlayerIndex(state = GameController.state) {
        if (!state || !Array.isArray(state.players) || !this.myPeerId) return -1;
        return state.players.findIndex(player => player.id === this.myPeerId);
    },

    getActivePlayerIndex(state = GameController.state) {
        if (!state) return -1;
        const safari = state.safariState;
        if (safari && Array.isArray(safari.turnOrder)) {
            return safari.turnOrder[safari.currentStep] ?? -1;
        }
        return state.turnPlayerIdx ?? -1;
    },

    resetConnections() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        if (this.localBC) {
            this.localBC.close();
            this.localBC = null;
        }
        this.connections = [];
        this.hostConn = null;
        this.lastHostAiTurnKey = null;
    },

    startFallbackChannel(code) {
        if (typeof BroadcastChannel === 'undefined') return false;
        this.localBC = new BroadcastChannel('gachakemon_room_' + code);
        this.localBC.onmessage = event => this.handleNetworkMessage(event.data, null, true);
        return true;
    },

    createRoom() {
        AudioEngine.sfxClick();
        this.resetConnections();
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
        this.roomCode = code;
        this.isHost = true;
        this.myPeerId = 'host_' + code;
        this.lobbyPlayers = [{ id: this.myPeerId, name: getInputTrainerName('Jugador 1'), isAI: false }];
        this.startHostPeer(code);
        this.renderWaitingRoom();
    },

    startHostPeer(code) {
        if (typeof Peer === 'undefined') {
            if (this.startFallbackChannel(code)) {
                const status = document.getElementById('onlineAuthStatus');
                if (status) status.textContent = 'Sala local (misma red / navegador)';
                return;
            }
            UI.showAlert('Red no disponible', 'No se ha podido cargar PeerJS ni el canal local. Comprueba la conexión e inténtalo de nuevo.', '⚠️');
            return;
        }

        try {
            this.peer = new Peer('gachakemon-room-' + code, {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
                        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
                        { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
                    ]
                }
            });
            this.peer.on('open', () => {
                const status = document.getElementById('onlineAuthStatus');
                if (status) status.textContent = 'Sala Online Activa (' + code + ')';
            });
            this.peer.on('connection', conn => {
                this.connections.push(conn);
                conn.on('data', data => this.handleNetworkMessage(data, conn));
                conn.on('close', () => {
                    this.connections = this.connections.filter(item => item !== conn);
                    if (conn.playerId) {
                        this.lobbyPlayers = this.lobbyPlayers.filter(player => player.id !== conn.playerId);
                        this.broadcastLobbyUpdate();
                        this.renderWaitingRoom();
                    }
                });
                conn.on('error', error => console.error('[OnlineManager] Error de conexión:', error));
            });
            this.peer.on('error', error => {
                console.error('[OnlineManager] Error P2P:', error.type, error);
                if (error.type === 'unavailable-id') {
                    UI.showAlert('Código ocupado', 'Ese código ya está activo. Crea una sala nueva.', '⚠️');
                } else {
                    UI.showAlert('Error de conexión', `PeerJS: ${error.type || 'error desconocido'}.`, '⚠️');
                }
            });
        } catch (error) {
            console.error('[OnlineManager] No se pudo crear la sala:', error);
            UI.showAlert('Error de red', 'No se ha podido crear la sala online.', '⚠️');
        }
    },

    joinRoom() {
        AudioEngine.sfxClick();
        const codeInput = document.getElementById('inputRoomCode');
        const code = String(codeInput?.value || '').trim().toUpperCase();
        if (!/^[A-HJ-NP-Z2-9]{4}$/.test(code)) {
            UI.showAlert('Código inválido', 'Introduce el código de sala de 4 caracteres.', '⚠️');
            return;
        }

        this.resetConnections();
        this.roomCode = code;
        this.isHost = false;
        this.myPeerId = 'client_' + Math.random().toString(36).slice(2, 12);
        const playerName = getInputTrainerName('Jugador');

        if (typeof Peer === 'undefined') {
            if (!this.startFallbackChannel(code)) {
                UI.showAlert('Red no disponible', 'No se ha podido cargar PeerJS ni el canal local.', '⚠️');
                return;
            }
            this.localBC.postMessage({ type: 'JOIN_REQUEST', player: { id: this.myPeerId, name: playerName } });
        } else {
            try {
                this.peer = new Peer({ debug: 1 });
                this.peer.on('open', () => {
                    const conn = this.peer.connect('gachakemon-room-' + code, { reliable: true });
                    this.hostConn = conn;
                    conn.on('open', () => {
                        conn.send({ type: 'JOIN_REQUEST', player: { id: this.myPeerId, name: playerName } });
                        const status = document.getElementById('onlineAuthStatus');
                        if (status) status.textContent = 'Conectando a sala ' + code + '…';
                    });
                    conn.on('data', data => this.handleNetworkMessage(data, conn));
                    conn.on('close', () => UI.showAlert('Conexión perdida', 'Se ha cerrado la conexión con el anfitrión.', '⚠️'));
                    conn.on('error', error => UI.showAlert('Error de conexión', error.message || 'No se pudo conectar con la sala.', '⚠️'));
                });
                this.peer.on('error', error => {
                    console.error('[OnlineManager] Error al unirse:', error);
                    UI.showAlert('No se encuentra la sala', 'Comprueba el código y que el anfitrión siga conectado.', '⚠️');
                });
            } catch (error) {
                console.error('[OnlineManager] No se pudo unir a la sala:', error);
                UI.showAlert('Error de red', 'No se ha podido iniciar la conexión online.', '⚠️');
                return;
            }
        }

        document.getElementById('onlineRoomBox')?.classList.remove('hidden');
        const roomLabel = document.getElementById('labelRoomCode');
        if (roomLabel) roomLabel.textContent = code;
    },

    addBotToRoom() {
        if (!this.isHost || this.lobbyPlayers.length >= 4) return;
        AudioEngine.sfxClick();
        const botProfiles = [
            { name: 'Bot Rocío', aiProfile: 'collector' },
            { name: 'Bot Cynthia', aiProfile: 'safari' },
            { name: 'Bot Giovanni', aiProfile: 'rocket' }
        ];
        const botInfo = botProfiles[(this.lobbyPlayers.length - 1) % botProfiles.length];
        this.lobbyPlayers.push({
            id: 'bot_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
            name: makeUniquePlayerName(botInfo.name, this.lobbyPlayers.map(player => player.name), botInfo.name),
            isAI: true,
            aiProfile: botInfo.aiProfile
        });
        this.broadcastLobbyUpdate();
        this.renderWaitingRoom();
    },

    copyRoomCode() {
        if (!this.roomCode) return;
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(this.roomCode);
        UI.showAlert('Código copiado', `El código de sala ${this.roomCode} se ha copiado al portapapeles.`, '📋');
    },

    isAuthorizedStateSender(msg, conn = null, fromFallback = false) {
        const actorId = conn?.playerId || msg?.actorId;
        if (!actorId) return false;
        if (conn && conn.playerId !== actorId) return false;

        const state = GameController.state;
        if (!state || state.mode !== 'online') return false;
        const activeIdx = this.getActivePlayerIndex(state);
        const activePlayer = state.players[activeIdx];
        const expectedId = activePlayer && !activePlayer.isAI ? activePlayer.id : null;
        const hasPrivateApagonChoice = Array.isArray(state.pendingApagonPlayerIds) && state.pendingApagonPlayerIds[0] === actorId;
        return actorId === expectedId || hasPrivateApagonChoice;
    },

    handleNetworkMessage(msg, conn = null, fromFallback = false) {
        if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;

        if (msg.type === 'JOIN_REQUEST' && this.isHost) {
            if (this.lobbyPlayers.length >= 4 || !msg.player || !msg.player.id) return;
            const remoteId = String(msg.player.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
            if (!remoteId || remoteId === this.myPeerId || this.lobbyPlayers.some(player => player.id === remoteId)) return;
            const playerName = makeUniquePlayerName(msg.player.name, this.lobbyPlayers.map(player => player.name), `Jugador ${this.lobbyPlayers.length + 1}`);
            const newPlayer = { id: remoteId, name: playerName, isAI: false };
            if (conn) conn.playerId = remoteId;
            this.lobbyPlayers.push(newPlayer);
            this.broadcastLobbyUpdate();
            this.renderWaitingRoom();
            return;
        }

        if (msg.type === 'LOBBY_UPDATE' && !this.isHost && Array.isArray(msg.players)) {
            this.lobbyPlayers = msg.players.slice(0, 4).map((player, index) => ({
                id: String(player.id || `player_${index}`),
                name: normalizeTrainerName(player.name, `Jugador ${index + 1}`),
                isAI: !!player.isAI,
                aiProfile: player.aiProfile || 'collector'
            }));
            this.renderWaitingRoom();
            return;
        }

        if (msg.type === 'STATE_SYNC' && msg.state && Array.isArray(msg.state.players)) {
            if (this.isHost) {
                if (!this.isAuthorizedStateSender(msg, conn, fromFallback)) {
                    console.warn('[OnlineManager] Sincronización rechazada: el emisor no controla el turno activo.');
                    return;
                }
                const currentState = GameController.state;
                const currentIds = currentState?.players?.map(player => player.id) || [];
                const incomingIds = msg.state.players.map(player => player.id);
                if (currentIds.length !== incomingIds.length || currentIds.some(id => !incomingIds.includes(id))) return;
                const previousActiveIdx = this.getActivePlayerIndex(currentState);
                GameController.receiveExternalState(msg.state);
                this.broadcastGameState(GameController.state, conn);
                this.scheduleHostAIIfNeeded(previousActiveIdx);
            } else {
                GameController.receiveExternalState(msg.state);
            }
        }
    },

    scheduleHostAIIfNeeded(previousActiveIdx) {
        if (!this.isHost || !GameController.state) return;
        const state = GameController.state;
        const activeIdx = this.getActivePlayerIndex(state);
        const player = state.players[activeIdx];
        if (!player?.isAI || activeIdx === previousActiveIdx) return;
        const key = state.safariState
            ? `safari:${state.round}:${state.safariState.currentStep}:${player.id}`
            : `turn:${state.round}:${state.turnPlayerIdx}:${player.id}`;
        if (this.lastHostAiTurnKey === key) return;
        this.lastHostAiTurnKey = key;
        setTimeout(() => {
            if (!this.isHost || !GameController.state) return;
            const currentIdx = this.getActivePlayerIndex(GameController.state);
            if (currentIdx !== activeIdx || !GameController.state.players[currentIdx]?.isAI) return;
            if (GameController.state.safariState) GameController.runAISafariTurn(GameController.state.players[currentIdx]);
            else GameController.runAITurn(GameController.state.players[currentIdx]);
        }, state.safariState ? 1100 : 950);
    },

    broadcastLobbyUpdate() {
        const payload = { type: 'LOBBY_UPDATE', players: this.lobbyPlayers };
        if (this.isHost) {
            this.connections.forEach(conn => {
                if (conn?.open) {
                    try { conn.send(payload); } catch (error) { console.warn('[OnlineManager] Error enviando sala:', error); }
                }
            });
            if (this.localBC) this.localBC.postMessage(payload);
        }
    },

    broadcastGameState(state, excludedConnection = null) {
        if (!this.roomCode || !state) return;
        const snapshot = JSON.parse(JSON.stringify(state));
        const payload = { type: 'STATE_SYNC', actorId: this.myPeerId, state: snapshot };

        if (this.isHost) {
            this.connections.forEach(conn => {
                if (conn && conn !== excludedConnection && conn.open) {
                    try { conn.send(payload); } catch (error) { console.warn('[OnlineManager] Error retransmitiendo estado:', error); }
                }
            });
            if (this.localBC) this.localBC.postMessage(payload);
        } else if (this.hostConn?.open) {
            try { this.hostConn.send(payload); }
            catch (error) { console.warn('[OnlineManager] No se pudo enviar el estado al anfitrión:', error); }
        } else if (this.localBC) {
            this.localBC.postMessage(payload);
        }
    },

    renderWaitingRoom() {
        const box = document.getElementById('onlineRoomBox');
        if (!box) return;
        box.classList.remove('hidden');
        const codeLabel = document.getElementById('labelRoomCode');
        const countLabel = document.getElementById('labelRoomPlayersCount');
        const listEl = document.getElementById('onlinePlayersList');
        if (codeLabel) codeLabel.textContent = this.roomCode || '----';
        if (countLabel) countLabel.textContent = `${this.lobbyPlayers.length}/4 Jugadores`;
        if (listEl) listEl.innerHTML = this.lobbyPlayers.map((player, index) => `
            <div class="bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded flex items-center justify-between">
                <span class="font-bold text-white truncate">${index + 1}. ${escapeHTML(player.name)}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded ${player.isAI ? 'bg-cyan-500/20 text-cyan-300' : 'bg-emerald-500/20 text-emerald-300'}">${player.isAI ? 'IA' : 'Humano'}</span>
            </div>`).join('');
        const addBot = document.getElementById('btnOnlineAddBot');
        const start = document.getElementById('btnOnlineStartGame');
        if (addBot) addBot.style.display = (this.isHost && this.lobbyPlayers.length < 4) ? 'inline-block' : 'none';
        if (start) start.style.display = (this.isHost && this.lobbyPlayers.length >= 2) ? 'inline-block' : 'none';
    },

    hostStartGame() {
        if (!this.isHost || this.lobbyPlayers.length < 2) return;
        GameController.startOnlineGameFromLobby(this.lobbyPlayers);
    }
};
const ScoringEngine = {
    getAllPlayerBalls(player) {
        const list = [...player.tray];
        player.captured.forEach(cap => {
            if (cap.ball) list.push(cap.ball);
        });
        return list;
    },

    countBallsByType(player, gloriaOverrideType = null) {
        const counts = {};
        BALL_TYPES.forEach(b => { counts[b.id] = 0; });
        const allBalls = this.getAllPlayerBalls(player);
        const targetGloria = gloriaOverrideType || player.gloriaWildcardChoice || 'amorball';

        allBalls.forEach(b => {
            if (b.typeId === 'gloriaball' && targetGloria && targetGloria !== 'rocketball' && targetGloria !== 'masterball') {
                counts[targetGloria] = (counts[targetGloria] || 0) + 1;
            } else {
                counts[b.typeId] = (counts[b.typeId] || 0) + 1;
            }
        });
        return counts;
    },

    checkObjectiveCompleted(player, objId, counts) {
        const allBalls = this.getAllPlayerBalls(player);
        const totalBalls = allBalls.length;
        const distinctTypes = Object.values(counts).filter(c => c > 0).length;
        const pairsCount = Object.values(counts).reduce((acc, c) => acc + Math.floor(c / 2), 0);

        switch (objId) {
            case 'obj_1': return pairsCount >= 2;
            case 'obj_2': return Math.floor((counts['amorball'] || 0) / 2) >= 2;
            case 'obj_3': return (counts['pokeball'] || 0) >= 4 && (counts['honorball'] || 0) >= 1;
            case 'obj_4': return distinctTypes >= 5;
            case 'obj_5': return distinctTypes >= 8;
            case 'obj_6': return (counts['lunaball'] || 0) === 1;
            case 'obj_7': return totalBalls >= 10;
            case 'obj_8': return totalBalls >= 14;
            case 'obj_9': return (counts['rocketball'] || 0) === 0;
            case 'obj_10': return (player.stats.lujoSoldCount || 0) >= 2;
            case 'obj_11': return (counts['pesoball'] || 0) >= 2;
            case 'obj_12': return (counts['pokeball'] || 0) === 0;
            case 'obj_13': return player.captured.some(c => c.ball.rarity === 'Común' && c.pokemon.rarityRank >= 3);
            case 'obj_14': return player.captured.some(c => c.pokemon.rarityRank >= 5);
            case 'obj_15': return player.captured.filter(c => c.ball.typeId === 'rocketball').length >= 2;
            case 'obj_16': return player.captured.filter(c => c.ball.colorName === c.pokemon.color).length >= 2;
            case 'obj_17': {
                const colors = new Set(player.captured.map(c => c.pokemon.color));
                return colors.size >= 3;
            }
            case 'obj_18': {
                const kantoCount = player.captured.filter(c => c.pokemon.region === 'Kanto').length;
                const johtoCount = player.captured.filter(c => c.pokemon.region === 'Johto').length;
                return kantoCount >= 2 && johtoCount >= 2;
            }
            case 'obj_19': return (player.stats.maxConsecutiveSafari || 0) >= 3;
            case 'obj_20': return player.captured.filter(c => c.pokemon.rarityRank <= 2).length >= 2;
            case 'obj_21': return player.captured.filter(c => c.pokemon.rarityRank >= 4).length >= 2;
            case 'obj_22': return player.captured.length >= 2 && player.tray.length >= 6;
            default: return false;
        }
    },

    calculateBreakdown(player, settleEndgameDebt = false) {
        const rawCounts = {};
        BALL_TYPES.forEach(b => { rawCounts[b.id] = 0; });
        const allBalls = this.getAllPlayerBalls(player);
        allBalls.forEach(b => { rawCounts[b.typeId] = (rawCounts[b.typeId] || 0) + 1; });

        let baseBallPV = 0;
        allBalls.forEach(b => {
            if (b.typeId === 'lunaball') {
                if (rawCounts['lunaball'] === 1) baseBallPV += 7;
            } else {
                baseBallPV += b.pv;
            }
        });

        let passiveBallPV = 0;
        if (rawCounts['pokeball'] >= 3 && rawCounts['honorball'] > 0) {
            passiveBallPV += rawCounts['honorball'] * 5;
        }
        const distinctRawTypes = Object.values(rawCounts).filter(c => c > 0).length;
        if (rawCounts['nivelball'] > 0) {
            passiveBallPV += rawCounts['nivelball'] * distinctRawTypes;
        }
        if (rawCounts['amorball'] >= 2) {
            const amorPairs = Math.floor(rawCounts['amorball'] / 2);
            passiveBallPV += amorPairs * 8;
        }

        let capturedPV = 0;
        let rocketCapturePenalty = 0;
        player.captured.forEach(c => {
            capturedPV += c.capturePV;
            if (c.ball.typeId === 'rocketball') {
                rocketCapturePenalty -= 2;
            }
        });

        const countsForObj = this.countBallsByType(player);
        let objectivesPV = 0;
        const completedObjs = [];
        player.objectives.forEach(obj => {
            if (this.checkObjectiveCompleted(player, obj.id, countsForObj)) {
                objectivesPV += obj.pv;
                completedObjs.push(obj.name);
            }
        });

        let effectiveYen = player.yen;
        let debtPenaltyPV = 0;
        if (player.celedonLoans > 0) {
            for (let i = 0; i < player.celedonLoans; i++) {
                if (settleEndgameDebt) {
                    if (effectiveYen >= 7) {
                        effectiveYen -= 7;
                    } else {
                        debtPenaltyPV -= 3;
                    }
                } else {
                    if (effectiveYen < 7) debtPenaltyPV -= 3;
                }
            }
        }
        const yenPV = Math.floor(Math.max(0, effectiveYen) / 2);
        const rocketPossessionPenalty = -(rawCounts['rocketball'] * 2);
        const totalPV = baseBallPV + passiveBallPV + capturedPV + objectivesPV + yenPV + debtPenaltyPV + rocketPossessionPenalty + rocketCapturePenalty;

        return {
            baseBallPV,
            passiveBallPV,
            capturedPV,
            objectivesPV,
            completedObjs,
            yenPV,
            debtPenaltyPV,
            rocketPenalty: rocketPossessionPenalty + rocketCapturePenalty,
            totalPV
        };
    }
};

const GameController = {
    apagonQueue: [],

    resolveApagonForAllPlayers() {
        this.state.players.forEach(p => {
            if (p.isAI && p.hand.length > 0) {
                const disc = p.hand.pop();
                this.state.effectDiscard.push(disc);
                this.addLog(`⚡ Apagón: ${p.name} (IA) descarta "${disc.name}".`, 'text-amber-300');
            }
        });
        if (this.state.mode === 'online') {
            this.state.pendingApagonPlayerIds = this.state.players
                .filter(player => !player.isAI && player.hand.length > 0)
                .map(player => player.id);
            const localIdx = OnlineManager.getLocalPlayerIndex(this.state);
            this.apagonQueue = localIdx >= 0 && this.state.pendingApagonPlayerIds[0] === this.state.players[localIdx].id
                ? [localIdx]
                : [];
            this.syncAndRender();
            if (this.apagonQueue.length > 0) this.openNextApagonModal();
            return;
        }
        this.apagonQueue = this.state.players
            .filter(p => !p.isAI && p.hand.length > 0)
            .map(p => p.idx);

        if (this.apagonQueue.length > 0) {
            this.openNextApagonModal();
        } else {
            this.syncAndRender();
        }
    },

    openNextApagonModal() {
        if (!this.apagonQueue || this.apagonQueue.length === 0) {
            UI.closeModal('modalInteraction');
            this.syncAndRender();
            return;
        }
        const pIdx = this.apagonQueue[0];
        const player = this.state.players[pIdx];
        if (!player || player.hand.length === 0) {
            this.apagonQueue.shift();
            this.openNextApagonModal();
            return;
        }

        document.getElementById('interactionModalTitle').textContent = `⚡ APAGÓN: ${player.name.toUpperCase()} — ELIGE 1 CARTA A DESCARTAR`;
        document.getElementById('interactionModalDesc').textContent = `El Centro Pokémon sufre un apagón. Haz clic en la carta de tu mano que deseas descartar:`;
        document.getElementById('interactionModalContent').innerHTML = player.hand.map((c, hIdx) => `
            <div onclick="GameController.executeApagonDiscard(${pIdx}, ${hIdx})"
                 class="cursor-pointer bg-slate-950 hover:bg-red-950/40 border border-slate-700 hover:border-red-500 p-3 rounded-lg flex items-center justify-between gap-3">
                <div>
                    <span class="text-[10px] font-bold ${c.subtype === 'Trampa' ? 'text-red-400' : 'text-cyan-400'}">[${c.subtype.toUpperCase()}]</span>
                    <span class="font-bold text-xs text-white ml-1">${c.name}</span>
                    <div class="card-rich-desc mt-1">${formatCardText(c.desc)}</div>
                </div>
                <span class="bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded shrink-0">DESCARTAR ESTA</span>
            </div>
        `).join('');
        UI.openModal('modalInteraction');
    },

    executeApagonDiscard(playerIdx, handIdx) {
        if (!this.requireLocalControl(playerIdx)) return;
        const player = this.state?.players?.[playerIdx];
        const disc = player?.hand?.[handIdx];
        if (!player || !disc) return;
        player.hand.splice(handIdx, 1);
        this.state.effectDiscard.push(disc);
        if (this.state.mode === 'online') {
            this.state.pendingApagonPlayerIds = (this.state.pendingApagonPlayerIds || []).filter(id => id !== player.id);
        }
        this.addLog(`⚡ Apagón: ${player.name} elige descartar "${disc.name}".`, 'text-amber-300');
        this.apagonQueue.shift();
        this.openNextApagonModal();
    },

    state: null,
    viewedPlayerIdx: 0,
    dragSourceTrayIdx: null,

    isLocalPlayer(playerIdx) {
        if (!this.state || this.state.mode !== 'online') return true;
        return OnlineManager.getLocalPlayerIndex(this.state) === playerIdx;
    },

    getActiveTurnPlayerIndex() {
        if (!this.state) return -1;
        const safari = this.state.safariState;
        return safari ? (safari.turnOrder[safari.currentStep] ?? -1) : this.state.turnPlayerIdx;
    },

    canLocalControl(playerIdx = null) {
        if (!this.state || this.state.mode !== 'online') return true;
        const targetIdx = playerIdx === null ? this.getActiveTurnPlayerIndex() : playerIdx;
        const player = this.state.players[targetIdx];
        if (!player) return false;
        if (player.isAI) return this.state.mode !== 'online' || OnlineManager.isHost;
        return this.isLocalPlayer(targetIdx);
    },

    requireLocalControl(playerIdx = null) {
        if (this.canLocalControl(playerIdx)) return true;
        UI.showAlert('Turno de otro jugador', 'En una partida online solo puedes realizar acciones durante tu propio turno.', '🔒');
        return false;
    },
    draftState: {
        playerQueue: [],
        currentDraftPlayerIdx: 0,
        offeredObjectives: [],
        offeredEffects: [],
        selectedObjIds: [],
        selectedEffIndices: []
    },
    lastOnlineSafariTurnKey: null,
    safariTemp: {
        selectedWildIndex: 0,
        selectedTrayBallIndex: 0,
        criticalActive: false,
        lastRollCoins: null,
        awaitingGoldenBerry: false
    },

    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    onTrayDragStart(event, idx) {
        this.dragSourceTrayIdx = idx;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(idx));
        }
        event.currentTarget.classList.add('dragging');
    },

    onTrayDragOver(event) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        event.currentTarget.classList.add('drag-over');
    },

    onTrayDragLeave(event) {
        event.currentTarget.classList.remove('drag-over');
    },

    onTrayDragEnd(event) {
        event.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.ball-slot-draggable').forEach(el => el.classList.remove('drag-over'));
    },

    onTrayDrop(event, targetIdx) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        const fromIdx = this.dragSourceTrayIdx !== null
            ? this.dragSourceTrayIdx
            : parseInt(event.dataTransfer?.getData('text/plain') || '-1', 10);

        this.dragSourceTrayIdx = null;
        if (fromIdx < 0 || fromIdx === targetIdx) return;

        const player = this.state.players[this.viewedPlayerIdx];
        if (!player || player.isAI || !this.canLocalControl(player.idx)) return;
        if (fromIdx >= player.tray.length || targetIdx >= player.tray.length) return;

        const [movedBall] = player.tray.splice(fromIdx, 1);
        player.tray.splice(targetIdx, 0, movedBall);

        AudioEngine.sfxSwap();
        this.syncAndRender();
    },

    moveTrayBallStep(fromIdx, delta) {
        const player = this.state.players[this.viewedPlayerIdx];
        if (!player || player.isAI || !this.canLocalControl(player.idx)) return;
        const targetIdx = fromIdx + delta;
        if (targetIdx < 0 || targetIdx >= player.tray.length) return;

        const temp = player.tray[fromIdx];
        player.tray[fromIdx] = player.tray[targetIdx];
        player.tray[targetIdx] = temp;

        AudioEngine.sfxSwap();
        this.syncAndRender();
    },

    buildHopper60() {
        const hopper = [];
        let uid = 1;
        BALL_TYPES.forEach(bt => {
            for (let i = 0; i < bt.count; i++) {
                const currentNum = uid++;
                hopper.push({
                    uid: 'ball_' + currentNum,
                    lottoNum: currentNum,
                    num: bt.num,
                    typeId: bt.id,
                    name: bt.name,
                    rarity: bt.rarity,
                    rarityRank: bt.rarityRank,
                    colorName: bt.colorName,
                    pv: bt.pv,
                    sell: bt.sell,
                    rocketActive: bt.id === 'rocketball'
                });
            }
        });
        return this.shuffle(hopper);
    },

    buildEffectDeck47() {
        const deck = [];
        let uid = 1;
        EFFECT_TEMPLATES.forEach(t => {
            for (let i = 0; i < t.count; i++) {
                deck.push({
                    uid: 'eff_' + (uid++),
                    id: t.id,
                    name: t.name,
                    subtype: t.subtype,
                    timing: t.timing || null,
                    phaseTag: t.phaseTag || 'ACCIÓN',
                    trapPositive: !!t.trapPositive,
                    icon: t.icon,
                    desc: t.desc
                });
            }
        });
        return this.shuffle(deck);
    },

    startLocalOrSoloGame(mode) {
        AudioEngine.init();
        AudioEngine.sfxClick();

        const playersConfig = [];
        if (mode === 'solo') {
            const humanName = getInputTrainerName('Jugador 1');
            playersConfig.push({ id: 'p0', name: humanName, isAI: false });
            const bots = [
                { id: 'bot1', name: 'Bot Rocío', isAI: true, aiProfile: 'collector' },
                { id: 'bot2', name: 'Bot Cynthia', isAI: true, aiProfile: 'safari' },
                { id: 'bot3', name: 'Bot Giovanni', isAI: true, aiProfile: 'rocket' }
            ];
            for (let i = 0; i < Lobby.soloPlayerCount - 1; i++) {
                playersConfig.push(bots[i]);
            }
        } else {
            for (let i = 0; i < Lobby.localPlayerCount; i++) {
                const inp = document.getElementById(`localNameInput_${i}`);
                const name = normalizeTrainerName(inp?.value, `Jugador ${i + 1}`);
                playersConfig.push({ id: 'p' + i, name, isAI: false });
            }
        }

        this.initializeMatchState(playersConfig, mode);
    },

    startOnlineGameFromLobby(lobbyPlayers) {
        AudioEngine.init();
        const cleanPlayers = lobbyPlayers.map((player, index) => ({
            ...player,
            name: normalizeTrainerName(player.name, `Jugador ${index + 1}`)
        }));
        this.initializeMatchState(cleanPlayers, 'online', true);
    },

    initializeMatchState(playersConfig, mode, fastSetupOverride = null) {
        const hopper = this.buildHopper60();
        const pokemonDeck = this.shuffle(POKEMON_CATALOG);
        const fullEffectDeck = this.buildEffectDeck47();
        const objectivesDeck = this.shuffle(OBJECTIVES_CATALOG);

        const objectPool = fullEffectDeck.filter(c => c.subtype === 'Objeto');
        const trapPool = fullEffectDeck.filter(c => c.subtype === 'Trampa');

        const nPlayers = playersConfig.length;
        const safariHolderIdx = nPlayers === 2 ? 1 : 2;

        const normalizedPlayers = [];
        playersConfig.forEach((pc, idx) => {
            normalizedPlayers.push({
                ...pc,
                id: pc.id || `player_${idx + 1}`,
                name: makeUniquePlayerName(pc.name, normalizedPlayers.map(previous => previous.name), `${pc.isAI ? 'Bot' : 'Jugador'} ${idx + 1}`)
            });
        });
        const players = normalizedPlayers.map((pc, idx) => ({
            idx,
            id: pc.id,
            name: pc.name,
            isAI: !!pc.isAI,
            aiProfile: pc.aiProfile || 'collector',
            yen: 3,
            tray: [],
            captured: [],
            hand: [],
            objectives: [],
            gloriaWildcardChoice: 'amorball',
            discountActive: false,
            celedonLoans: 0,
            stats: {
                lujoSoldCount: 0,
                consecutiveSafari: 0,
                maxConsecutiveSafari: 0
            },
            draftOfferedObjs: objectivesDeck.splice(0, 5),
            draftOfferedEffs: objectPool.splice(0, 5)
        }));

        this.state = {
            mode,
            round: 1,
            turnPlayerIdx: 0,
            phase: 1,
            isFinalRound: false,
            gameOver: false,
            safariHolderIdx,
            hopper,
            pokemonDeck,
            effectDeck: this.shuffle([...objectPool, ...trapPool]),
            effectDiscard: [],
            players,
            lastExtractedBall: null,
            logs: [],
            safariState: null,
            pendingApagonPlayerIds: []
        };

        this.addLog(`¡Comienza la partida de Gachakémon con ${nPlayers} entrenadores!`, 'text-yellow-300');
        this.addLog(`${players[safariHolderIdx].name} recibe el Ticket Safari inicial.`, 'text-emerald-300');

        document.getElementById('screenLobby').classList.add('hidden');
        document.getElementById('screenGame').classList.remove('hidden');
        document.getElementById('topGameStatus').classList.remove('hidden');
        document.getElementById('topGameStatus').classList.add('flex');

        AudioEngine.setTrack(1);

        const fastSetup = fastSetupOverride ?? document.getElementById('chkFastSetup')?.checked;
        this.prepareInitialDrafts(mode === 'online' ? true : fastSetup);
    },

    evaluateBestDraftObjectives(offeredObjectives) {
        if (!offeredObjectives || offeredObjectives.length <= 3) {
            return (offeredObjectives || []).map(o => o.id);
        }

        // Bonificación de viabilidad táctica además del valor en PV
        const feasibilityBonus = {
            'obj_8': 18,  // Almacén Central (12 PV)
            'obj_2': 16,  // Triunvirato de Amor (11 PV)
            'obj_14': 15, // Cazador de Leyendas (10 PV)
            'obj_13': 14, // Hazaña de Entrenador (9 PV)
            'obj_21': 14, // Escuadrón de Élite (9 PV)
            'obj_10': 11, // Inversión de Lujo (9 PV)
            'obj_5': 15,  // Círculo Cromático (8 PV, muy sólido)
            'obj_17': 14, // Espectro de Rarezas (8 PV)
            'obj_11': 8,  // Escudo de Plomo (8 PV)
            'obj_7': 16,  // Centro Pokémon Satélite (7 PV, muy seguro)
            'obj_22': 15, // Entrenador Equilibrado (7 PV)
            'obj_3': 13,  // Fidelidad al Clásico (7 PV)
            'obj_19': 11, // Veterano del Safari (7 PV)
            'obj_12': 7,  // Coleccionista Imparcial (7 PV)
            'obj_15': -12,// Reclutamiento Rocket (7 PV pero exige capturar 2 con Rocket Ball que restan -4 PV cada una)
            'obj_9': 14,  // Zona Desmilitarizada (6 PV gratis por no tener Rocket Balls)
            'obj_6': 12,  // Purista de la Luna (6 PV)
            'obj_16': 11, // Sincronía Perfecta (6 PV)
            'obj_1': 12,  // Doble Pareja (5 PV)
            'obj_18': 10, // Pokédex Biregional (5 PV)
            'obj_4': 11,  // Muestrario de Ruta (4 PV)
            'obj_20': 10  // Caza Menor (4 PV)
        };

        const scoreSingleObj = (o) => (o.pv * 12) + (feasibilityBonus[o.id] || 0);

        // Evaluamos las 10 combinaciones posibles de 3 objetivos entre los 5 ofrecidos
        let bestCombo = offeredObjectives.slice(0, 3).map(o => o.id);
        let bestComboScore = -999999;

        const n = offeredObjectives.length;
        for (let i = 0; i < n - 2; i++) {
            for (let j = i + 1; j < n - 1; j++) {
                for (let k = j + 1; k < n; k++) {
                    const trio = [offeredObjectives[i], offeredObjectives[j], offeredObjectives[k]];
                    const ids = new Set(trio.map(x => x.id));
                    let totalScore = trio.reduce((acc, x) => acc + scoreSingleObj(x), 0);

                    // Penalizar objetivos mutuamente excluyentes
                    if (ids.has('obj_3') && ids.has('obj_12')) totalScore -= 500; // 4 Poké Balls vs 0 Poké Balls
                    if (ids.has('obj_9') && ids.has('obj_15')) totalScore -= 500; // 0 Rocket Balls vs 2 capturas con Rocket Ball

                    // Premiar sinergias directas
                    if (ids.has('obj_1') && ids.has('obj_2')) totalScore += 24;   // Parejas + Parejas de Amor Ball
                    if (ids.has('obj_4') && ids.has('obj_5')) totalScore += 26;   // 5 tipos + 8 tipos
                    if (ids.has('obj_7') && ids.has('obj_8')) totalScore += 28;   // 10 balls + 14 balls
                    if (ids.has('obj_14') && ids.has('obj_21')) totalScore += 22; // Legendario/Mítico + 2 Épicos o superior

                    if (totalScore > bestComboScore) {
                        bestComboScore = totalScore;
                        bestCombo = trio.map(x => x.id);
                    }
                }
            }
        }
        return bestCombo;
    },

    evaluateBestDraftEffects(offeredEffects) {
        if (!offeredEffects || offeredEffects.length <= 3) {
            return (offeredEffects || []).map((_, idx) => idx);
        }

        // Puntuación estratégica de cada Carta de Objeto para el inicio de partida
        const effectPowerRank = {
            'ficha_trucada': 100,        // Giro de Gachapon gratis inmediato (ahorra 3 P¥)
            'cupon_rebajas': 95,         // Giro de Gachapon por 1 P¥ (ahorra 2 P¥)
            'superrepelente': 92,        // Garantiza Pokémon Raro/Épico/Legendario/Mítico en Safari
            'baya_dorada': 90,           // Convierte 1 Cruz en Cara en el Safari
            'captura_critica': 88,       // Reduce requisito de 2 o 3 Caras a 1 sola Cara
            'escudo_silph': 86,          // Cancela automáticamente robo con Rocket Ball
            'pokedex_actualizada': 84,   // Reordena las 4 primeras cartas de Efectos/Trampas y manda 1 al fondo
            'prestamo_celedon': 81,      // +5 P¥ inmediatos para acelerar el motor económico
            'patrocinio_silph': 78,      // +1 P¥ por cada tipo distinto de Pokéball
            'inversor_pokemon': 75,      // Roba 2 cartas adicionales
            'repelente': 73,             // Mejora Pokémon Común en el Safari
            'mercado_negro': 70,         // Intercambia Pokéball con un rival por 1 P¥
            'ticket_devolucion': 66,     // Vende Pokéballs por su valor en P¥
            'capsula_temporal': 62,      // Recupera Objeto del descarte o sube Trampa al mazo
            'subasta_rota': 58,          // Recupera el último Objeto descartado
            'intercambio_comercial': 54  // Rota toda la mano
        };

        let bestIndices = [0, 1, 2];
        let bestComboScore = -999999;
        const n = offeredEffects.length;

        for (let i = 0; i < n - 2; i++) {
            for (let j = i + 1; j < n - 1; j++) {
                for (let k = j + 1; k < n; k++) {
                    const idxs = [i, j, k];
                    const seenIds = {};
                    let score = 0;
                    idxs.forEach(idx => {
                        const card = offeredEffects[idx];
                        const base = effectPowerRank[card.id] || 60;
                        seenIds[card.id] = (seenIds[card.id] || 0) + 1;
                        // Si hay cartas repetidas de utilidad media/baja, penalizar duplicado para priorizar versatilidad
                        if (seenIds[card.id] > 1 && base < 88) {
                            score += (base - 18);
                        } else {
                            score += base;
                        }
                    });
                    if (score > bestComboScore) {
                        bestComboScore = score;
                        bestIndices = idxs;
                    }
                }
            }
        }
        return bestIndices;
    },

    prepareInitialDrafts(fastSetup) {
        const humanIndices = [];
        this.state.players.forEach((p, idx) => {
            if (p.isAI || fastSetup) {
                const bestObjIds = this.evaluateBestDraftObjectives(p.draftOfferedObjs);
                p.objectives = p.draftOfferedObjs.filter(o => bestObjIds.includes(o.id));

                const bestEffIdxs = this.evaluateBestDraftEffects(p.draftOfferedEffs);
                const chosenEffs = [];
                const returnedEffs = [];
                p.draftOfferedEffs.forEach((c, cIdx) => {
                    if (bestEffIdxs.includes(cIdx)) chosenEffs.push(c);
                    else returnedEffs.push(c);
                });
                p.hand = chosenEffs;
                this.state.effectDeck.push(...returnedEffs);
                delete p.draftOfferedObjs;
                delete p.draftOfferedEffs;
            } else {
                humanIndices.push(idx);
            }
        });

        this.state.effectDeck = this.shuffle(this.state.effectDeck);

        if (humanIndices.length > 0) {
            this.draftState.playerQueue = humanIndices;
            this.openDraftModalForNextHuman();
        } else {
            this.beginTurn(0);
        }
    },

    openDraftModalForNextHuman() {
        if (this.draftState.playerQueue.length === 0) {
            this.state.effectDeck = this.shuffle(this.state.effectDeck);
            UI.closeModal('modalDraftSetup');
            this.beginTurn(0);
            return;
        }
        const pIdx = this.draftState.playerQueue[0];
        const player = this.state.players[pIdx];
        this.draftState.currentDraftPlayerIdx = pIdx;
        this.draftState.offeredObjectives = player.draftOfferedObjs;
        this.draftState.offeredEffects = player.draftOfferedEffs;
        this.draftState.selectedObjIds = [];
        this.draftState.selectedEffIndices = [];

        document.getElementById('draftModalTitle').textContent = `SETUP INICIAL: ${player.name.toUpperCase()}`;
        this.renderDraftModalChoices();
        UI.openModal('modalDraftSetup');
    },

    renderDraftModalChoices() {
        const objGrid = document.getElementById('draftObjectivesGrid');
        const effGrid = document.getElementById('draftEffectsGrid');

        const recommendedObjIds = this.evaluateBestDraftObjectives(this.draftState.offeredObjectives);
        const recommendedEffIdxs = this.evaluateBestDraftEffects(this.draftState.offeredEffects);

        objGrid.innerHTML = this.draftState.offeredObjectives.map(o => {
            const sel = this.draftState.selectedObjIds.includes(o.id);
            const isRec = recommendedObjIds.includes(o.id);
            return `
            <div onclick="GameController.toggleDraftObj('${o.id}')"
                 class="cursor-pointer p-3 rounded-xl border-2 transition ${sel ? 'border-yellow-400 bg-yellow-500/20 shadow-lg' : 'border-slate-700 bg-slate-950 hover:border-slate-500'} flex flex-col justify-between relative">
                <div>
                    <div class="flex items-center justify-between gap-1 mb-1">
                        <span class="text-[10px] font-bold text-amber-400 uppercase">${o.category}</span>
                        <span class="font-pixel text-xs text-yellow-400 bg-slate-900 px-2 py-0.5 rounded border border-yellow-500/40">+${o.pv} PV</span>
                    </div>
                    ${isRec ? `<div class="mb-1"><span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">⭐ TOP RECOMENDADO</span></div>` : ''}
                    <div class="font-bold text-sm text-white my-1">${o.name}</div>
                    <div class="card-rich-desc mt-1">${formatCardText(o.desc)}</div>
                </div>
                <div class="mt-2.5 text-right text-[11px] font-bold ${sel ? 'text-yellow-300' : 'text-slate-400'}">
                    ${sel ? '✅ OBJETIVO ELEGIDO' : 'Clic para seleccionar'}
                </div>
            </div>`;
        }).join('');

        effGrid.innerHTML = this.draftState.offeredEffects.map((c, idx) => {
            const sel = this.draftState.selectedEffIndices.includes(idx);
            const isRec = recommendedEffIdxs.includes(idx);
            return `
            <div onclick="GameController.toggleDraftEff(${idx})"
                 class="cursor-pointer p-3 rounded-xl border-2 transition ${sel ? 'border-cyan-400 bg-cyan-500/20 shadow-lg' : 'border-slate-700 bg-slate-950 hover:border-slate-500'} flex flex-col justify-between relative">
                <div>
                    <div class="flex items-center justify-between text-[10px] font-bold text-cyan-400 mb-1">
                        <span><i class="fas ${c.icon} mr-1"></i>${c.subtype.toUpperCase()}</span>
                        <span class="bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-700 text-[9px]">${c.phaseTag || 'ACCIÓN'}</span>
                    </div>
                    ${isRec ? `<div class="mb-1"><span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded">⭐ TOP RECOMENDADA</span></div>` : ''}
                    <div class="font-bold text-sm text-white my-1">${c.name}</div>
                    <div class="card-rich-desc mt-1">${formatCardText(c.desc)}</div>
                </div>
                <div class="mt-2.5 text-right text-[11px] font-bold ${sel ? 'text-cyan-300' : 'text-slate-400'}">
                    ${sel ? '✅ CARTA ELEGIDA' : 'Clic para seleccionar'}
                </div>
            </div>`;
        }).join('');

        document.getElementById('draftObjCounter').textContent = `${this.draftState.selectedObjIds.length}/3`;
        document.getElementById('draftEffCounter').textContent = `${this.draftState.selectedEffIndices.length}/3`;
        document.getElementById('btnConfirmDraft').disabled = !(this.draftState.selectedObjIds.length === 3 && this.draftState.selectedEffIndices.length === 3);
    },

    toggleDraftObj(objId) {
        AudioEngine.sfxClick();
        const arr = this.draftState.selectedObjIds;
        const i = arr.indexOf(objId);
        if (i >= 0) arr.splice(i, 1);
        else if (arr.length < 3) arr.push(objId);
        this.renderDraftModalChoices();
    },

    toggleDraftEff(effIdx) {
        AudioEngine.sfxClick();
        const arr = this.draftState.selectedEffIndices;
        const i = arr.indexOf(effIdx);
        if (i >= 0) arr.splice(i, 1);
        else if (arr.length < 3) arr.push(effIdx);
        this.renderDraftModalChoices();
    },

    autoCompleteDraft() {
        AudioEngine.sfxSwap();
        this.draftState.selectedObjIds = this.evaluateBestDraftObjectives(this.draftState.offeredObjectives);
        this.draftState.selectedEffIndices = this.evaluateBestDraftEffects(this.draftState.offeredEffects);
        this.renderDraftModalChoices();
    },

    confirmDraftSelection() {
        AudioEngine.sfxClick();
        const pIdx = this.draftState.currentDraftPlayerIdx;
        const player = this.state.players[pIdx];

        player.objectives = this.draftState.offeredObjectives.filter(o => this.draftState.selectedObjIds.includes(o.id));
        player.hand = [];
        this.draftState.offeredEffects.forEach((c, idx) => {
            if (this.draftState.selectedEffIndices.includes(idx)) {
                player.hand.push(c);
            } else {
                this.state.effectDeck.push(c);
            }
        });

        delete player.draftOfferedObjs;
        delete player.draftOfferedEffs;

        this.draftState.playerQueue.shift();
        this.openDraftModalForNextHuman();
    },

    beginTurn(playerIdx) {
        if (!this.state || this.state.gameOver) return;
        this.state.turnPlayerIdx = playerIdx;
        this.state.phase = 1;
        const player = this.state.players[playerIdx];

        if (!player.isAI && (this.state.mode !== 'online' || this.isLocalPlayer(playerIdx))) {
            this.viewedPlayerIdx = playerIdx;
        }

        this.addLog(`--- Turno de ${player.name} (Ronda ${this.state.round}) ---`, 'text-cyan-300 font-bold');

        this.executePhase1Draw(player);
        this.state.phase = 2;
        this.syncAndRender();

        if (player.isAI && (this.state.mode !== 'online' || OnlineManager.isHost)) {
            setTimeout(() => this.runAITurn(player), 950);
        }
    },

    executePhase1Draw(player) {
        let safety = 0;
        while (player.hand.length < 3 && safety < 25) {
            safety++;
            const card = this.drawOneEffectCardRaw();
            if (!card) break;

            if (card.subtype === 'Trampa') {
                this.resolveTrapCard(player, card);
                this.state.effectDiscard.push(card);
            } else {
                player.hand.push(card);
            }
        }
    },

    drawOneEffectCardRaw() {
        if (this.state.effectDeck.length === 0) {
            if (this.state.effectDiscard.length === 0) return null;
            this.state.effectDeck = this.shuffle(this.state.effectDiscard);
            this.state.effectDiscard = [];
            this.addLog(`Se ha barajado la pila de descartes de Cartas de Efecto.`, 'text-slate-400');
        }
        return this.state.effectDeck.shift();
    },

    drawCardsImmuneToTraps(player, count) {
        let drawn = 0;
        const setAsideTraps = [];
        while (drawn < count) {
            const card = this.drawOneEffectCardRaw();
            if (!card) break;
            if (card.subtype === 'Trampa') {
                setAsideTraps.push(card);
            } else {
                player.hand.push(card);
                drawn++;
            }
        }
        if (setAsideTraps.length > 0) {
            this.state.effectDeck.push(...setAsideTraps);
            this.state.effectDeck = this.shuffle(this.state.effectDeck);
        }
    },

    resolveTrapCard(player, trap) {
        AudioEngine.sfxTrap();
        this.addLog(`⚠️ ¡TRAMPA ROBADA POR ${player.name.toUpperCase()}!: ${trap.name} — ${trap.desc}`, trap.trapPositive ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold');

        switch (trap.id) {
            case 'trampa_policia': {
                const rIdx = player.tray.findIndex(b => b.typeId === 'rocketball');
                if (rIdx >= 0) {
                    player.tray.splice(rIdx, 1);
                    const fine = Math.min(player.yen, 1);
                    player.yen -= fine;
                    this.addLog(`🚓 Inspección Policial confisca 1 Rocket Ball a ${player.name} y cobra ${fine} P¥.`, 'text-red-300');
                } else {
                    this.addLog(`🚓 ${player.name} no tiene Rocket Balls libres; supera la Inspección Policial.`, 'text-slate-400');
                }
                break;
            }
            case 'trampa_bolsillo': {
                const lost = Math.min(player.yen, 2);
                player.yen -= lost;
                this.addLog(`💸 ¡Bolsillo Roto! ${player.name} pierde ${lost} P¥.`, 'text-red-300');
                break;
            }
            case 'trampa_averia': {
                this.addLog(`⚙️ ¡Avería del Gachapon! ${player.name} obtiene 1 giro gratuito inmediato.`, 'text-emerald-300');
                this.extractFromHopper(player, true);
                break;
            }
            case 'trampa_suerte': {
                player.yen += 3;
                this.addLog(`🍀 ¡Día de Suerte! ${player.name} recibe +3 P¥ del banco.`, 'text-emerald-300');
                break;
            }
            case 'trampa_apagon': {
                this.addLog(`⚡ ¡Apagón en el Centro Pokémon! Todos deben elegir 1 carta para descartar.`, 'text-amber-300 font-bold');
                this.resolveApagonForAllPlayers();
                break;
            }
            case 'trampa_alerta_rocket': {
                if (player.tray.length > 0) {
                    let minIdx = 0;
                    player.tray.forEach((b, idx) => {
                        if (b.pv < player.tray[minIdx].pv) minIdx = idx;
                    });
                    const returnedBall = player.tray.splice(minIdx, 1)[0];
                    this.state.hopper.push(returnedBall);
                    this.state.hopper = this.shuffle(this.state.hopper);
                    this.addLog(`🚀 Alerta Rocket: ${player.name} devuelve su ${returnedBall.name} a la tolva del gachapon.`, 'text-red-300');
                } else {
                    const lost = Math.min(player.yen, 2);
                    player.yen -= lost;
                    this.addLog(`🚀 Alerta Rocket: Sin balls libres en bandeja, ${player.name} pierde ${lost} P¥.`, 'text-red-300');
                }
                break;
            }
        }

        if (!player.isAI) {
            UI.showAlert(`¡CARTA DE TRAMPA: ${trap.name.toUpperCase()}!`, trap.desc, trap.trapPositive ? '🍀' : '🚨');
        }
    },

    actionWork() {
        if (!this.requireLocalControl(this.state?.turnPlayerIdx)) return;
        const player = this.state.players[this.state.turnPlayerIdx];
        if (this.state.phase !== 2) return;
        AudioEngine.sfxCoin();

        const allBalls = ScoringEngine.getAllPlayerBalls(player);
        const ceboCount = allBalls.filter(b => b.typeId === 'ceboball').length;
        const totalEarned = 2 + ceboCount;
        player.yen += totalEarned;

        this.addLog(
            `💼 ${player.name} elige Trabajar y recibe +${totalEarned} P¥ (2 base${ceboCount > 0 ? ` + ${ceboCount} por Cebo Ball` : ''}).`,
            'text-yellow-300'
        );

        this.state.phase = 3;
        this.syncAndRender();
    },

    isGachaCranking: false,
    crankTimeoutId: null,

    actionPullGacha() {
        if (!this.requireLocalControl(this.state?.turnPlayerIdx)) return;
        const player = this.state.players[this.state.turnPlayerIdx];
        if (this.state.phase !== 2) return;

        const cost = player.discountActive ? 1 : 3;
        if (player.yen < cost) {
            UI.showAlert('PokéYenes Insuficientes', `Necesitas ${cost} P¥ para accionar la máquina de Gachapon.`, '🪙');
            return;
        }
        if (this.state.hopper.length === 0) {
            UI.showAlert('Tolva Vacía', 'No quedan Pokéballs en la máquina. Debes elegir Trabajar en este turno.', '⚠️');
            return;
        }

        player.yen -= cost;
        player.discountActive = false;
        AudioEngine.sfxGachaCrank();

        this.extractFromHopper(player, false);
        this.state.phase = 3;
        this.syncAndRender();
    },

    extractFromHopper(player, isFreeBonus = false) {
        if (this.state.hopper.length === 0) return null;
        const ball = this.state.hopper.shift();
        this.state.lastExtractedBall = { ball, playerName: player.name, timestamp: Date.now() };
        player.tray.push(ball);

        // Activar animación del bombo de bingo en la máquina de Gachapon (+2s más larga)
        this.isGachaCranking = true;
        if (this.crankTimeoutId) clearTimeout(this.crankTimeoutId);
        this.crankTimeoutId = setTimeout(() => {
            this.isGachaCranking = false;
            const machineEl = document.getElementById('gachaMachineInteractive');
            if (machineEl && this.state) {
                machineEl.innerHTML = ArtRenderer.renderGachaMachineSVG(this.state.hopper.length, false);
            }
        }, 3250);

        this.addLog(
            `🎱 ${player.name} gira el bombo Gachapon${isFreeBonus ? ' (Giro Gratis)' : ''} y extrae: ¡${ball.name.toUpperCase()}! (${ball.rarity})`,
            'text-amber-300 font-bold'
        );

        let specialBanner = '';
        if (ball.typeId === 'masterball') {
            player.yen += 7;
            AudioEngine.sfxCaptureSuccess();
            specialBanner = '👑 ¡JACKPOT MASTER BALL! Recibes +7 P¥ al instante.';
            this.addLog(`👑 ¡JACKPOT MASTER BALL! ${player.name} recibe +7 P¥ inmediatamente.`, 'text-yellow-400 font-bold');
        } else if (ball.typeId === 'lujoball') {
            this.drawCardsImmuneToTraps(player, 2);
            specialBanner = '✨ ¡BONUS LUJO BALL! Robas +2 Cartas de Objeto (inmune a trampas).';
            this.addLog(`✨ Efecto Lujo Ball: ${player.name} roba 2 Cartas de Objeto (inmune a trampas).`, 'text-purple-300');
        } else if (ball.typeId === 'rocketball') {
            specialBanner = '🚀 ¡ROCKET BALL! Puedes usarla en Fase 3 para robar a un rival.';
            this.addLog(`🚀 ${player.name} ha obtenido una Rocket Ball. Puede usarla para robar en Fase 3 o guardarla.`, 'text-red-400');
        }

        if (this.state.hopper.length === 0) {
            this.state.isFinalRound = true;
            this.addLog(`🔔 ¡SE HA EXTRAÍDO LA ÚLTIMA POKÉBALL DE LA TOLVA! Esta ronda es la Ronda Final.`, 'text-red-400 font-bold');
        }

        UI.playBingoExtractionAnimation(ball, player, isFreeBonus, specialBanner);

        return ball;
    },

    discardCardFromHand(handIdx) {
        if (!this.requireLocalControl(this.state?.turnPlayerIdx)) return;
        if (this.state.turnPlayerIdx !== this.viewedPlayerIdx) {
            UI.showAlert('Turno Incorrecto', 'Solo puedes descartar cartas de tu mano durante tu propio turno activo.', '⚠️');
            return;
        }
        const player = this.state.players[this.state.turnPlayerIdx];
        if (player.isAI) return;
        const card = player.hand.splice(handIdx, 1)[0];
        if (!card) return;
        AudioEngine.sfxClick();
        this.state.effectDiscard.push(card);
        this.addLog(`🗑️ ${player.name} descarta tácticamente "${card.name}".`, 'text-slate-400');
        this.syncAndRender();
    },

    playObjectCard(handIdx) {
        if (!this.requireLocalControl(this.state?.turnPlayerIdx)) return;
        if (this.state.turnPlayerIdx !== this.viewedPlayerIdx) {
            UI.showAlert('Turno Incorrecto', 'Solo puedes jugar cartas de objeto durante tu propio turno activo.', '⚠️');
            return;
        }
        const player = this.state.players[this.state.turnPlayerIdx];
        const card = player.hand[handIdx];
        if (!card) return;

        if (card.timing === 'safari' || card.timing === 'safari_reaction') {
            UI.showAlert('Carta de Fase de Safari', `"${card.name}" se utiliza directamente durante la Fase de Captura Safari.`, '🌿');
            return;
        }
        if (card.timing === 'reaction') {
            UI.showAlert('Carta de Reacción Automática', `"${card.name}" se activa automáticamente desde tu mano cuando un rival intenta robarte con una Rocket Ball.`, '🛡️');
            return;
        }

        AudioEngine.sfxClick();

        switch (card.id) {
            case 'ficha_trucada': {
                if (this.state.hopper.length === 0) {
                    UI.showAlert('Tolva Vacía', 'No quedan Pokéballs en la tolva para usar Ficha Trucada.', '⚠️');
                    return;
                }
                this.consumeHandCard(player, handIdx);
                AudioEngine.sfxGachaCrank();
                this.extractFromHopper(player, true);
                this.syncAndRender();
                break;
            }
            case 'inversor_pokemon': {
                if (player.yen < 3) {
                    UI.showAlert('P¥ Insuficientes', 'Necesitas 3 P¥ para jugar Inversor Pokémon.', '🪙');
                    return;
                }
                player.yen -= 3;
                this.consumeHandCard(player, handIdx);
                this.addLog(`📈 ${player.name} juega Inversor Pokémon (-3 P¥) y roba 2 cartas.`, 'text-cyan-300');
                for (let i = 0; i < 2; i++) {
                    const drawn = this.drawOneEffectCardRaw();
                    if (!drawn) break;
                    if (drawn.subtype === 'Trampa') {
                        this.resolveTrapCard(player, drawn);
                        this.state.effectDiscard.push(drawn);
                    } else {
                        player.hand.push(drawn);
                    }
                }
                this.syncAndRender();
                break;
            }
            case 'prestamo_celedon': {
                this.consumeHandCard(player, handIdx);
                player.yen += 5;
                player.celedonLoans += 1;
                AudioEngine.sfxCoin();
                this.addLog(`🏦 ${player.name} firma el Préstamo del Celedón: recibe +5 P¥ ahora (devolverá 7 P¥ al final o -3 PV).`, 'text-amber-300');
                this.syncAndRender();
                break;
            }
            case 'subasta_rota': {
                const lastObjIdx = [...this.state.effectDiscard].reverse().findIndex(c => c.subtype === 'Objeto');
                if (lastObjIdx === -1) {
                    UI.showAlert('Descarte Vacío', 'No hay cartas de Objeto en la pila de descartes todavía.', '⚠️');
                    return;
                }
                const actualIdx = this.state.effectDiscard.length - 1 - lastObjIdx;
                const recovered = this.state.effectDiscard.splice(actualIdx, 1)[0];
                this.consumeHandCard(player, handIdx);
                player.hand.push(recovered);
                this.addLog(`🔨 ${player.name} usa Subasta Rota y recupera "${recovered.name}" de los descartes.`, 'text-cyan-300');
                this.syncAndRender();
                break;
            }
            case 'patrocinio_silph': {
                const counts = ScoringEngine.countBallsByType(player);
                const distinct = Object.values(counts).filter(c => c > 0).length;
                this.consumeHandCard(player, handIdx);
                player.yen += distinct;
                AudioEngine.sfxCoin();
                this.addLog(`🏢 ${player.name} activa Patrocinio Silph y gana +${distinct} P¥ por sus ${distinct} tipos de Pokéball.`, 'text-yellow-300');
                this.syncAndRender();
                break;
            }
            case 'cupon_rebajas': {
                this.consumeHandCard(player, handIdx);
                player.discountActive = true;
                this.addLog(`🏷️ ${player.name} activa Cupón de Rebajas: su próxima tirada de Gacha costará solo 1 P¥.`, 'text-cyan-300');
                this.syncAndRender();
                break;
            }
            case 'intercambio_comercial': {
                this.consumeHandCard(player, handIdx);
                const countToRotate = player.hand.length;
                this.state.effectDeck.push(...player.hand);
                player.hand = [];
                this.addLog(`🔄 ${player.name} usa Intercambio Comercial y renueva ${countToRotate} cartas de su mano.`, 'text-cyan-300');
                this.drawCardsImmuneToTraps(player, countToRotate);
                this.syncAndRender();
                break;
            }
            case 'ticket_devolucion': {
                if (player.tray.length === 0) {
                    UI.showAlert('Sin Pokéballs Libres', 'No tienes Pokéballs libres en tu bandeja para devolver.', '⚠️');
                    return;
                }
                this.openTicketDevolucionModal(handIdx);
                break;
            }
            case 'mercado_negro': {
                if (player.yen < 1) {
                    UI.showAlert('P¥ Insuficientes', 'Necesitas 1 P¥ para usar Mercado Negro.', '🪙');
                    return;
                }
                this.openMercadoNegroModal(handIdx);
                break;
            }
            case 'pokedex_actualizada': {
                this.openPokedexActualizadaModal(handIdx);
                break;
            }
            case 'capsula_temporal': {
                if (this.state.effectDiscard.length === 0) {
                    UI.showAlert('Descarte Vacío', 'No hay cartas en la pila de descartes para recuperar con Cápsula Temporal.', '⚠️');
                    return;
                }
                this.openCapsulaTemporalModal(handIdx);
                break;
            }
        }
    },

    consumeHandCard(player, handIdx) {
        const card = player.hand.splice(handIdx, 1)[0];
        if (card) this.state.effectDiscard.push(card);
        return card;
    },

    openTicketDevolucionModal(handIdx) {
        const player = this.state.players[this.state.turnPlayerIdx];
        document.getElementById('interactionModalTitle').textContent = 'TICKET DE DEVOLUCIÓN';
        document.getElementById('interactionModalDesc').textContent = 'Elige qué Pokéball libre de tu bandeja quieres devolver a la tolva del Gachapon a cambio de su valor en P¥:';
        const content = document.getElementById('interactionModalContent');
        content.innerHTML = player.tray.map((b, bIdx) => `
            <div onclick="GameController.executeTicketDevolucion(${handIdx}, ${bIdx})"
                 class="cursor-pointer bg-slate-950 hover:bg-slate-800 border border-slate-700 p-3 rounded-lg flex items-center justify-between">
                <div class="flex items-center gap-3">
                    ${ArtRenderer.renderBallSVG(b.typeId, 36)}
                    <div>
                        <div class="font-bold text-xs text-white">${b.name} <span class="text-[10px] text-slate-400">(${b.rarity})</span></div>
                        <div class="text-[11px] text-slate-400">${BALL_MAP[b.typeId]?.desc || ''}</div>
                    </div>
                </div>
                <span class="bg-yellow-500 text-slate-950 font-pixel text-[10px] px-3 py-1.5 rounded font-bold shrink-0">VENDER POR +${b.sell} P¥</span>
            </div>
        `).join('');
        UI.openModal('modalInteraction');
    },

    executeTicketDevolucion(handIdx, trayBallIdx) {
        if (!this.requireLocalControl(this.state?.turnPlayerIdx)) return;
        const player = this.state.players[this.state.turnPlayerIdx];
        const ball = player.tray.splice(trayBallIdx, 1)[0];
        if (!ball) return;
        this.consumeHandCard(player, handIdx);

        player.yen += ball.sell;
        if (ball.typeId === 'lujoball') {
            player.stats.lujoSoldCount = (player.stats.lujoSoldCount || 0) + 1;
        }
        this.state.hopper.push(ball);
        this.state.hopper = this.shuffle(this.state.hopper);
        this.state.isFinalRound = false;

        AudioEngine.sfxCoin();
        this.addLog(`💱 ${player.name} devuelve una ${ball.name} a la tolva con Ticket de Devolución y recibe +${ball.sell} P¥.`, 'text-yellow-300');
        UI.closeModal('modalInteraction');
        this.syncAndRender();
    },

    openMercadoNegroModal(handIdx) {
        const player = this.state.players[this.state.turnPlayerIdx];
        const swaps = [];
        player.tray.forEach((myBall, myIdx) => {
            if (myBall.typeId === 'masterball') return;
            this.state.players.forEach((rival, rIdx) => {
                if (rIdx === player.idx) return;
                rival.tray.forEach((rivBall, rivBallIdx) => {
                    if (rivBall.rarity === myBall.rarity && rivBall.typeId !== myBall.typeId && !this.isBallProtectedByPeso(rival, rivBallIdx)) {
                        swaps.push({ myIdx, myBall, rIdx, rivalName: rival.name, rivBallIdx, rivBall });
                    }
                });
            });
        });

        if (swaps.length === 0) {
            UI.showAlert('Sin Intercambios Disponibles', 'Ningún rival tiene Pokéballs libres desprotegidas de la misma rareza que las tuyas para intercambiar.', '⚠️');
            return;
        }

        document.getElementById('interactionModalTitle').textContent = 'MERCADO NEGRO (COSTE: 1 P¥)';
        document.getElementById('interactionModalDesc').textContent = 'Selecciona el intercambio de Pokéballs de la misma rareza que deseas forzar:';
        document.getElementById('interactionModalContent').innerHTML = swaps.map(s => `
            <div onclick="GameController.executeMercadoNegro(${handIdx}, ${s.myIdx}, ${s.rIdx}, ${s.rivBallIdx})"
                 class="cursor-pointer bg-slate-950 hover:bg-slate-800 border border-slate-700 p-3 rounded-lg flex items-center justify-between">
                <div class="flex items-center gap-2 text-xs">
                    ${ArtRenderer.renderBallSVG(s.myBall.typeId, 32)}
                    <span>Tu <strong>${s.myBall.name}</strong></span>
                    <i class="fas fa-right-left text-yellow-400 mx-2"></i>
                    ${ArtRenderer.renderBallSVG(s.rivBall.typeId, 32)}
                    <span><strong>${s.rivBall.name}</strong> de ${s.rivalName}</span>
                </div>
                <span class="bg-purple-600 text-white text-[10px] font-bold px-2.5 py-1 rounded">CAMBIAR (1 P¥)</span>
            </div>
        `).join('');
        UI.openModal('modalInteraction');
    },

    executeMercadoNegro(handIdx, myBallIdx, rivalIdx, rivalBallIdx) {
        if (!this.requireLocalControl(this.state?.turnPlayerIdx)) return;
        const player = this.state.players[this.state.turnPlayerIdx];
        const rival = this.state.players[rivalIdx];
        player.yen -= 1;
        this.consumeHandCard(player, handIdx);

        const myBall = player.tray[myBallIdx];
        const rivBall = rival.tray[rivalBallIdx];
        player.tray[myBallIdx] = rivBall;
        rival.tray[rivalBallIdx] = myBall;

        AudioEngine.sfxClick();
        this.addLog(`🕶️ Mercado Negro: ${player.name} paga 1 P¥ y cambia su ${myBall.name} por la ${rivBall.name} de ${rival.name}.`, 'text-purple-300');
        UI.closeModal('modalInteraction');
        this.syncAndRender();
    },

    deckOrderTemp: {
        handIdx: null,
        cards: [],
        dragSourceIdx: null
    },

    openPokedexActualizadaModal(handIdx) {
        // Si quedan menos de 4 cartas en el mazo de efectos y hay descartes, barajar descartes y añadirlos al fondo
        if (this.state.effectDeck.length < 4 && this.state.effectDiscard.length > 0) {
            const recycled = this.shuffle(this.state.effectDiscard);
            this.state.effectDiscard = [];
            this.state.effectDeck.push(...recycled);
            this.addLog(`Se han barajado los descartes para completar el mazo de Efectos.`, 'text-slate-400');
        }

        if (this.state.effectDeck.length === 0) {
            UI.showAlert('Mazo de Efectos Vacío', 'No quedan cartas en el mazo de Efectos y Trampas para escanear.', '⚠️');
            return;
        }

        this.deckOrderTemp = {
            handIdx,
            cards: this.state.effectDeck.slice(0, 4).map(c => ({ ...c })),
            dragSourceIdx: null
        };

        document.getElementById('interactionModalTitle').textContent = '📱 POKÉDEX ACTUALIZADA: ORDENAR MAZO DE EFECTOS Y TRAMPAS';
        document.getElementById('interactionModalDesc').textContent = 'Arrastra las cartas para cambiar su orden: las 3 primeras quedarán en la parte superior del mazo (1ª, 2ª y 3ª) y la 4ª carta se enviará al fondo del mazo.';
        this.renderDeckOrderModalContent();
        UI.openModal('modalInteraction');
    },

    renderDeckOrderModalContent() {
        const cards = this.deckOrderTemp.cards || [];
        const total = cards.length;
        const contentEl = document.getElementById('interactionModalContent');
        if (!contentEl) return;

        const cardsHtml = cards.map((c, idx) => {
            const isBottomSlot = (total >= 2 && idx === total - 1);
            const isTrap = c.subtype === 'Trampa';
            const slotBadge = isBottomSlot
                ? `<span class="bg-amber-500 text-slate-950 font-pixel text-[10px] px-2.5 py-1 rounded font-bold">⬇ ${idx + 1}ª POSICIÓN: IRÁ AL FONDO DEL MAZO</span>`
                : `<span class="bg-emerald-500 text-slate-950 font-pixel text-[10px] px-2.5 py-1 rounded font-bold">⬆ ${idx + 1}ª ARRIBA DEL MAZO ${idx === 0 ? '(PRÓXIMO ROBO)' : ''}</span>`;

            return `
            <div draggable="true"
                 ondragstart="GameController.onDeckOrderDragStart(event, ${idx})"
                 ondragover="GameController.onDeckOrderDragOver(event)"
                 ondragleave="GameController.onDeckOrderDragLeave(event)"
                 ondragend="GameController.onDeckOrderDragEnd(event)"
                 ondrop="GameController.onDeckOrderDrop(event, ${idx})"
                 class="deck-order-card p-3 rounded-xl border-2 ${isBottomSlot ? 'border-amber-500 bg-amber-950/25' : 'border-cyan-500/60 bg-slate-950'} flex flex-col gap-2">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <span class="text-slate-400 text-xs cursor-grab" title="Arrastra para mover"><i class="fas fa-grip-vertical"></i></span>
                        ${slotBadge}
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick="GameController.moveDeckOrderStep(${idx}, -1)" ${idx === 0 ? 'disabled' : ''}
                                class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs disabled:opacity-30" title="Subir posición">▲</button>
                        <button onclick="GameController.moveDeckOrderStep(${idx}, 1)" ${idx === total - 1 ? 'disabled' : ''}
                                class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs disabled:opacity-30" title="Bajar posición">▼</button>
                        ${!isBottomSlot && total > 1 ? `
                            <button onclick="GameController.sendDeckOrderCardToBottom(${idx})"
                                    class="px-2 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 text-[11px] font-bold" title="Mandar esta carta al 4º puesto (fondo del mazo)">
                                Mandar al Fondo
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="flex items-start justify-between gap-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <span class="text-[11px] font-bold px-2 py-0.5 rounded ${isTrap ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-cyan-950 text-cyan-300 border border-cyan-700'}">
                                <i class="fas ${c.icon} mr-1"></i>${c.subtype.toUpperCase()}
                            </span>
                            <span class="font-bold text-sm text-white">${c.name}</span>
                        </div>
                        <div class="card-rich-desc mt-1.5">${formatCardText(c.desc)}</div>
                    </div>
                </div>
            </div>`;
        }).join('');

        contentEl.innerHTML = `
            <div class="space-y-2.5">
                ${cardsHtml}
            </div>
            <div class="pt-3 mt-3 border-t border-slate-700 flex items-center justify-between gap-2">
                <span class="text-xs text-slate-400">💡 Consejo: Pon las <strong>Trampas negativas</strong> en la 4ª posición (fondo) o déjalas para el turno de un rival.</span>
                <button onclick="GameController.confirmPokedexActualizadaOrder()"
                        class="pixel-btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-5 py-2.5 shrink-0">
                    ✅ CONFIRMAR ORDEN
                </button>
            </div>
        `;
    },

    onDeckOrderDragStart(event, idx) {
        this.deckOrderTemp.dragSourceIdx = idx;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(idx));
        }
        event.currentTarget.classList.add('dragging');
    },

    onDeckOrderDragOver(event) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        event.currentTarget.classList.add('drag-over');
    },

    onDeckOrderDragLeave(event) {
        event.currentTarget.classList.remove('drag-over');
    },

    onDeckOrderDragEnd(event) {
        event.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.deck-order-card').forEach(el => el.classList.remove('drag-over'));
    },

    onDeckOrderDrop(event, targetIdx) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        const fromIdx = this.deckOrderTemp.dragSourceIdx !== null
            ? this.deckOrderTemp.dragSourceIdx
            : parseInt(event.dataTransfer?.getData('text/plain') || '-1', 10);
        this.deckOrderTemp.dragSourceIdx = null;

        if (fromIdx < 0 || fromIdx === targetIdx) return;
        const cards = this.deckOrderTemp.cards;
        if (fromIdx >= cards.length || targetIdx >= cards.length) return;

        const [moved] = cards.splice(fromIdx, 1);
        cards.splice(targetIdx, 0, moved);
        AudioEngine.sfxSwap();
        this.renderDeckOrderModalContent();
    },

    moveDeckOrderStep(fromIdx, delta) {
        const cards = this.deckOrderTemp.cards;
        const targetIdx = fromIdx + delta;
        if (targetIdx < 0 || targetIdx >= cards.length) return;
        const temp = cards[fromIdx];
        cards[fromIdx] = cards[targetIdx];
        cards[targetIdx] = temp;
        AudioEngine.sfxSwap();
        this.renderDeckOrderModalContent();
    },

    sendDeckOrderCardToBottom(fromIdx) {
        const cards = this.deckOrderTemp.cards;
        if (fromIdx < 0 || fromIdx >= cards.length - 1) return;
        const [moved] = cards.splice(fromIdx, 1);
        cards.push(moved);
        AudioEngine.sfxSwap();
        this.renderDeckOrderModalContent();
    },

    confirmPokedexActualizadaOrder() {
        if (!this.requireLocalControl(this.state?.turnPlayerIdx)) return;
        const player = this.state.players[this.state.turnPlayerIdx];
        const { handIdx, cards } = this.deckOrderTemp;
        if (!cards || cards.length === 0) return;

        this.consumeHandCard(player, handIdx);
        // Extraemos las N primeras cartas originales del mazo de efectos
        this.state.effectDeck.splice(0, cards.length);

        if (cards.length >= 2) {
            const topCards = cards.slice(0, cards.length - 1);
            const bottomCard = cards[cards.length - 1];
            this.state.effectDeck.unshift(...topCards);
            this.state.effectDeck.push(bottomCard);
            this.addLog(`📱 ${player.name} usa Pokédex Actualizada: reordena las ${topCards.length} primeras cartas del mazo de Efectos y envía 1 al fondo.`, 'text-cyan-300 font-bold');
        } else {
            this.state.effectDeck.push(cards[0]);
            this.addLog(`📱 ${player.name} usa Pokédex Actualizada sobre el mazo de Efectos.`, 'text-cyan-300');
        }

        AudioEngine.sfxClick();
        UI.closeModal('modalInteraction');
        this.syncAndRender();
    },

    openCapsulaTemporalModal(handIdx) {
        document.getElementById('interactionModalTitle').textContent = 'CÁPSULA TEMPORAL (PILA DE DESCARTES)';
        document.getElementById('interactionModalDesc').textContent = 'Recupera 1 Carta de Objeto a tu mano, o coloca 1 Carta de Trampa en la parte superior del mazo:';
        document.getElementById('interactionModalContent').innerHTML = this.state.effectDiscard.map((c, dIdx) => `
            <div onclick="GameController.executeCapsulaTemporal(${handIdx}, ${dIdx})"
                 class="cursor-pointer bg-slate-950 hover:bg-slate-800 border border-slate-700 p-3 rounded-lg flex items-center justify-between gap-3">
                <div>
                    <span class="text-[10px] font-bold ${c.subtype === 'Trampa' ? 'text-red-400' : 'text-cyan-400'}">[${c.subtype.toUpperCase()}]</span>
                    <span class="font-bold text-xs text-white ml-1">${c.name}</span>
                    <div class="card-rich-desc mt-1">${formatCardText(c.desc)}</div>
                </div>
                <span class="bg-amber-500 text-slate-950 text-[10px] font-bold px-2.5 py-1.5 rounded shrink-0">${c.subtype === 'Trampa' ? 'PONER EN MAZO' : 'A MI MANO'}</span>
            </div>
        `).join('');
        UI.openModal('modalInteraction');
    },

    executeCapsulaTemporal(handIdx, discardIdx) {
        if (!this.requireLocalControl(this.state?.turnPlayerIdx)) return;
        const player = this.state.players[this.state.turnPlayerIdx];
        const rec = this.state.effectDiscard.splice(discardIdx, 1)[0];
        this.consumeHandCard(player, handIdx);
        if (rec.subtype === 'Trampa') {
            this.state.effectDeck.unshift(rec);
            this.addLog(`⏳ ${player.name} usa Cápsula Temporal y coloca una Trampa en lo alto del mazo.`, 'text-amber-300');
        } else {
            player.hand.push(rec);
            this.addLog(`⏳ ${player.name} usa Cápsula Temporal y recupera "${rec.name}" a su mano.`, 'text-cyan-300');
        }
        UI.closeModal('modalInteraction');
        this.syncAndRender();
    },

    isBallProtectedByPeso(player, ballIndex) {
        const ball = player.tray[ballIndex];
        if (!ball) return true;
        if (ball.typeId === 'masterball' || ball.typeId === 'pesoball') return true;
        const left = player.tray[ballIndex - 1];
        const right = player.tray[ballIndex + 1];
        if ((left && left.typeId === 'pesoball') || (right && right.typeId === 'pesoball')) return true;
        return false;
    },

    openRocketStealModal(trayBallIdx) {
        if (!this.requireLocalControl(this.state?.turnPlayerIdx)) return;
        const player = this.state.players[this.state.turnPlayerIdx];
        const rocketBall = player.tray[trayBallIdx];
        if (!rocketBall || rocketBall.typeId !== 'rocketball' || !rocketBall.rocketActive) return;

        AudioEngine.setTrack(3);

        const targets = [];
        this.state.players.forEach((rival, rIdx) => {
            if (rIdx === player.idx) return;
            rival.tray.forEach((b, bIdx) => {
                if (!this.isBallProtectedByPeso(rival, bIdx)) {
                    targets.push({
                        kind: 'tray_ball',
                        rIdx,
                        rivalName: rival.name,
                        targetIdx: bIdx,
                        label: `Pokéball libre: ${b.name} (${b.rarity}, ${b.pv} PV)`,
                        ballTypeId: b.typeId
                    });
                }
            });
            rival.captured.forEach((cap, cIdx) => {
                targets.push({
                    kind: 'captured_pokemon',
                    rIdx,
                    rivalName: rival.name,
                    targetIdx: cIdx,
                    label: `Pokémon Capturado: ${cap.pokemon.name} (${cap.pokemon.rarity}, +${cap.capturePV} PV)`,
                    spriteUrl: cap.pokemon.spriteUrl
                });
            });
        });

        if (targets.length === 0) {
            AudioEngine.setTrack(1);
            UI.showAlert('Sin Objetivos de Robo', 'Ningún rival tiene Pokéballs desprotegidas ni Pokémon capturados disponibles para robar en este momento.', '🛡️');
            return;
        }

        document.getElementById('interactionModalTitle').textContent = '🚀 ATAQUE TEAM ROCKET: ROBAR AL RIVAL';
        document.getElementById('interactionModalDesc').textContent = 'Elige si quieres robar una Pokéball libre de un rival o robarle un Pokémon capturado (su Pokéball se romperá y volverá al gachapon, y tu Rocket Ball ocupará al Pokémon):';
        document.getElementById('interactionModalContent').innerHTML = targets.map(t => `
            <div onclick="GameController.executeRocketSteal(${trayBallIdx}, '${t.kind}', ${t.rIdx}, ${t.targetIdx})"
                 class="cursor-pointer bg-slate-950 hover:bg-red-950/40 border border-slate-700 hover:border-red-500 p-3 rounded-lg flex items-center justify-between">
                <div class="flex items-center gap-3">
                    ${t.kind === 'tray_ball'
                        ? ArtRenderer.renderBallSVG(t.ballTypeId, 36)
                        : `<img src="${t.spriteUrl}" class="w-12 h-12 bg-slate-900 rounded border border-slate-700">`
                    }
                    <div>
                        <div class="font-bold text-xs text-white">${t.label}</div>
                        <div class="text-[11px] text-slate-400">Rival: ${t.rivalName}</div>
                    </div>
                </div>
                <span class="bg-red-600 text-white font-pixel text-[9px] px-3 py-1.5 rounded">¡ROBAR!</span>
            </div>
        `).join('');
        UI.openModal('modalInteraction');
    },

    executeRocketSteal(myRocketTrayIdx, targetKind, rivalIdx, targetIdx) {
        if (!this.requireLocalControl(this.state?.turnPlayerIdx)) return;
        const attacker = this.state.players[this.state.turnPlayerIdx];
        const victim = this.state.players[rivalIdx];
        const myRocketBall = attacker.tray[myRocketTrayIdx];
        if (!myRocketBall) return;

        myRocketBall.rocketActive = false;
        UI.closeModal('modalInteraction');
        AudioEngine.setTrack(1);

        const shieldIdx = victim.hand.findIndex(c => c.id === 'escudo_silph');
        if (shieldIdx >= 0) {
            const shieldCard = victim.hand.splice(shieldIdx, 1)[0];
            this.state.effectDiscard.push(shieldCard);
            AudioEngine.sfxTrap();
            this.addLog(`🛡️ ¡${victim.name} activa ESCUDO SILPH S.A.! El robo de la Rocket Ball de ${attacker.name} queda cancelado y pierde su efecto.`, 'text-cyan-300 font-bold');
            UI.showAlert('¡ROBO BLOQUEADO!', `${victim.name} ha jugado un Escudo Silph S.A. de su mano. El robo fracasa y tu Rocket Ball pierde su habilidad.`, '🛡️');
            this.syncAndRender();
            return;
        }

        if (targetKind === 'tray_ball') {
            const stolenBall = victim.tray.splice(targetIdx, 1)[0];
            if (stolenBall) {
                attacker.tray.push(stolenBall);
                AudioEngine.sfxTrap();
                this.addLog(`🚀 ¡ROBO ROCKET! ${attacker.name} roba la ${stolenBall.name} de la bandeja de ${victim.name}.`, 'text-red-400 font-bold');
            }
        } else if (targetKind === 'captured_pokemon') {
            const stolenCap = victim.captured.splice(targetIdx, 1)[0];
            if (stolenCap) {
                const oldBall = stolenCap.ball;
                if (oldBall.typeId === 'masterball') {
                    victim.tray.push(oldBall);
                    this.addLog(`👑 La Master Ball de ${victim.name} es irrompible y regresa vacía a su bandeja.`, 'text-yellow-300');
                } else {
                    this.state.hopper.push(oldBall);
                    this.state.hopper = this.shuffle(this.state.hopper);
                    this.state.isFinalRound = false;
                }
                attacker.tray.splice(myRocketTrayIdx, 1);
                const newMatrix = CAPTURE_MATRIX['Épica'][stolenCap.pokemon.rarity];
                attacker.captured.push({
                    pokemon: stolenCap.pokemon,
                    ball: myRocketBall,
                    capturePV: newMatrix.pv
                });
                AudioEngine.sfxTrap();
                this.addLog(`🚀 ¡ROBO DE POKÉMON! ${attacker.name} roba a ${stolenCap.pokemon.name} de ${victim.name} y coloca su Rocket Ball encima.`, 'text-red-400 font-bold');
            }
        }

        this.syncAndRender();
    },

    endPlayerTurn() {
        if (!this.state || !this.requireLocalControl(this.state.turnPlayerIdx) || this.state.phase !== 3) return;
        AudioEngine.sfxClick();

        const nPlayers = this.state.players.length;
        const nextIdx = (this.state.turnPlayerIdx + 1) % nPlayers;

        if (nextIdx === 0) {
            if (this.state.isFinalRound && this.state.hopper.length === 0) {
                this.startSafariPhase(true);
                return;
            }
            if (this.state.round % 3 === 0) {
                this.startSafariPhase(false);
                return;
            }
            this.state.round += 1;
        }

        this.beginTurn(nextIdx);
    },

    optimizeAITrayPesoOrder(aiPlayer) {
        const pesoIdx = aiPlayer.tray.findIndex(b => b.typeId === 'pesoball');
        if (pesoIdx === -1 || aiPlayer.tray.length < 3) return;
        const [pesoBall] = aiPlayer.tray.splice(pesoIdx, 1);
        aiPlayer.tray.sort((a, b) => b.pv - a.pv);
        aiPlayer.tray.splice(1, 0, pesoBall);
    },

    runAITurn(aiPlayer) {
        if (!this.state || this.state.gameOver || this.state.turnPlayerIdx !== aiPlayer.idx) return;

        const cuponIdx = aiPlayer.hand.findIndex(c => c.id === 'cupon_rebajas');
        if (cuponIdx >= 0 && !aiPlayer.discountActive && this.state.hopper.length > 0 && aiPlayer.yen >= 1) {
            this.playObjectCard(cuponIdx);
        }

        const gachaCost = aiPlayer.discountActive ? 1 : 3;
        if (this.state.hopper.length > 0 && aiPlayer.yen >= gachaCost) {
            this.actionPullGacha();
        } else {
            this.actionWork();
        }

        setTimeout(() => {
            for (let i = aiPlayer.hand.length - 1; i >= 0; i--) {
                const c = aiPlayer.hand[i];
                if (!c) continue;
                if (c.id === 'ficha_trucada' && this.state.hopper.length > 0) {
                    this.playObjectCard(i);
                } else if (c.id === 'patrocinio_silph') {
                    this.playObjectCard(i);
                } else if (c.id === 'prestamo_celedon' && aiPlayer.yen === 0 && this.state.hopper.length > 10) {
                    this.playObjectCard(i);
                }
            }

            this.optimizeAITrayPesoOrder(aiPlayer);

            const rBallIdx = aiPlayer.tray.findIndex(b => b.typeId === 'rocketball' && b.rocketActive);
            if (rBallIdx >= 0) {
                for (let r = 0; r < this.state.players.length; r++) {
                    if (r === aiPlayer.idx) continue;
                    const victim = this.state.players[r];
                    const stealableIdx = victim.tray.findIndex((_, bIdx) => !this.isBallProtectedByPeso(victim, bIdx));
                    if (stealableIdx >= 0) {
                        this.executeRocketSteal(rBallIdx, 'tray_ball', r, stealableIdx);
                        break;
                    }
                }
            }

            setTimeout(() => this.endPlayerTurn(), 650);
        }, 700);
    },

    startSafariPhase(isFinalSafari = false) {
        AudioEngine.setTrack(2);
        const nPlayers = this.state.players.length;
        const wildSlots = [];
        for (let i = 0; i < nPlayers; i++) {
            const pk = this.state.pokemonDeck.shift();
            wildSlots.push({
                ownerSeatIdx: i,
                pokemon: pk,
                capturedBy: null
            });
        }

        const turnOrder = [];
        for (let i = 0; i < nPlayers; i++) {
            turnOrder.push((this.state.safariHolderIdx + i) % nPlayers);
        }

        this.state.safariState = {
            isFinalSafari,
            wildSlots,
            turnOrder,
            currentStep: 0,
            capturedThisSafari: {}
        };

        this.addLog(`🌿 ¡COMIENZA LA FASE DE SAFARI (Ronda ${this.state.round})! Se revelan ${nPlayers} Pokémon salvajes.`, 'text-emerald-400 font-bold');
        UI.openModal('modalSafari');
        this.advanceSafariTurn();
    },

    advanceSafariTurn() {
        const saf = this.state.safariState;
        if (!saf) return;

        if (saf.currentStep >= saf.turnOrder.length) {
            this.finishSafariPhase();
            return;
        }

        const activeIdx = saf.turnOrder[saf.currentStep];
        const player = this.state.players[activeIdx];

        const firstWild = saf.wildSlots.findIndex(w => !w.capturedBy);
        this.safariTemp = {
            selectedWildIndex: firstWild >= 0 ? firstWild : 0,
            selectedTrayBallIndex: 0,
            criticalActive: false,
            lastRollCoins: null,
            awaitingGoldenBerry: false
        };

        UI.renderSafariModal();

        if (this.state.mode === 'online') OnlineManager.broadcastGameState(this.state);
        if (player.isAI && (this.state.mode !== 'online' || OnlineManager.isHost)) {
            setTimeout(() => this.runAISafariTurn(player), 1100);
        }
    },

    selectSafariWild(wIdx) {
        const saf = this.state.safariState;
        if (!saf || !this.requireLocalControl(saf.turnOrder[saf.currentStep])) return;
        if (!saf || saf.wildSlots[wIdx].capturedBy || this.safariTemp.awaitingGoldenBerry) return;
        AudioEngine.sfxClick();
        this.safariTemp.selectedWildIndex = wIdx;
        UI.renderSafariModal();
    },

    selectSafariBall(bIdx) {
        const saf = this.state?.safariState;
        if (!saf || !this.requireLocalControl(saf.turnOrder[saf.currentStep]) || this.safariTemp.awaitingGoldenBerry) return;
        AudioEngine.sfxClick();
        this.safariTemp.selectedTrayBallIndex = bIdx;
        UI.renderSafariModal();
    },

    useSafariHandItem(handIdx) {
        const saf = this.state.safariState;
        const activeIdx = saf.turnOrder[saf.currentStep];
        if (!this.requireLocalControl(activeIdx)) return;
        const player = this.state.players[activeIdx];
        const card = player.hand[handIdx];
        if (!card) return;

        const wildSlot = saf.wildSlots[this.safariTemp.selectedWildIndex];
        if (!wildSlot || wildSlot.capturedBy) return;

        if (card.id === 'repelente') {
            if (wildSlot.pokemon.rarity !== 'Común') {
                UI.showAlert('Repelente', 'El Repelente normal solo puede usarse sobre un Pokémon Común (Gris).', '⚠️');
                return;
            }
            this.consumeHandCard(player, handIdx);
            const discardedCommon = wildSlot.pokemon;
            let replacement = null;
            const skipped = [discardedCommon];
            while (this.state.pokemonDeck.length > 0) {
                const candidate = this.state.pokemonDeck.shift();
                if (candidate.rarity === 'Poco Común' || candidate.rarity === 'Rara') {
                    replacement = candidate;
                    break;
                } else {
                    skipped.push(candidate);
                }
            }
            this.state.pokemonDeck.push(...skipped);
            if (replacement) wildSlot.pokemon = replacement;
            this.addLog(`🧴 ${player.name} usa Repelente y aparece ¡${wildSlot.pokemon.name} (${wildSlot.pokemon.rarity})!`, 'text-emerald-300');
            if (this.state.mode === 'online') OnlineManager.broadcastGameState(this.state);
            UI.renderSafariModal();
        } else if (card.id === 'superrepelente') {
            this.consumeHandCard(player, handIdx);
            const oldPk = wildSlot.pokemon;
            let replacement = null;
            const skipped = [oldPk];
            while (this.state.pokemonDeck.length > 0) {
                const candidate = this.state.pokemonDeck.shift();
                if (candidate.rarityRank >= 3) {
                    replacement = candidate;
                    break;
                } else {
                    skipped.push(candidate);
                }
            }
            this.state.pokemonDeck.push(...skipped);
            if (replacement) wildSlot.pokemon = replacement;
            this.addLog(`✨ ${player.name} usa Superrepelente y aparece ¡${wildSlot.pokemon.name} (${wildSlot.pokemon.rarity})!`, 'text-emerald-300');
            if (this.state.mode === 'online') OnlineManager.broadcastGameState(this.state);
            UI.renderSafariModal();
        } else if (card.id === 'captura_critica') {
            this.consumeHandCard(player, handIdx);
            this.safariTemp.criticalActive = true;
            this.addLog(`🎯 ${player.name} activa Captura Crítica: el requisito se reduce a 1 sola Cara.`, 'text-cyan-300');
            if (this.state.mode === 'online') OnlineManager.broadcastGameState(this.state);
            UI.renderSafariModal();
        } else if (card.id === 'baya_dorada' && this.safariTemp.awaitingGoldenBerry) {
            this.consumeHandCard(player, handIdx);
            const falseIdx = this.safariTemp.lastRollCoins.findIndex(v => !v);
            if (falseIdx >= 0) this.safariTemp.lastRollCoins[falseIdx] = true;
            this.safariTemp.awaitingGoldenBerry = false;
            this.addLog(`🍋 ¡${player.name} usa Baya Dorada y convierte 1 Cruz en Cara para asegurar la captura!`, 'text-yellow-300 font-bold');
            this.completeSafariCaptureAttempt(true);
        }
    },

    launchSafariCaptureAttempt() {
        const saf = this.state?.safariState;
        if (!saf) return;
        const activeIdx = saf.turnOrder[saf.currentStep];
        if (!this.requireLocalControl(activeIdx)) return;
        const player = this.state.players[activeIdx];
        const wildSlot = saf.wildSlots[this.safariTemp.selectedWildIndex];
        const ball = player.tray[this.safariTemp.selectedTrayBallIndex];
        if (!wildSlot || wildSlot.capturedBy || !ball || this.safariTemp.isRollingCoins) return;

        const matrixEntry = CAPTURE_MATRIX[ball.rarity][wildSlot.pokemon.rarity];
        let reqHeads = matrixEntry.heads;
        if (this.safariTemp.criticalActive && reqHeads > 1) reqHeads = 1;

        if (reqHeads === 0) {
            this.safariTemp.lastRollCoins = [true, true, true];
            this.completeSafariCaptureAttempt(true);
            return;
        }

        this.safariTemp.isRollingCoins = true;
        const finalCoins = [
            Math.random() < 0.5,
            Math.random() < 0.5,
            Math.random() < 0.5
        ];

        // Estado 'SPIN' mientras las monedas están girando en el aire
        this.safariTemp.lastRollCoins = ['SPIN', 'SPIN', 'SPIN'];
        AudioEngine.sfxCoin();
        UI.renderSafariModal();

        setTimeout(() => {
            AudioEngine.playVoice(finalCoins[0] ? 987.77 : 311.13, 95, 'square', 0.05);
            this.safariTemp.lastRollCoins = [finalCoins[0], 'SPIN', 'SPIN'];
            UI.renderSafariModal();
        }, 380);

        setTimeout(() => {
            AudioEngine.playVoice(finalCoins[1] ? 1046.50 : 293.66, 95, 'square', 0.05);
            this.safariTemp.lastRollCoins = [finalCoins[0], finalCoins[1], 'SPIN'];
            UI.renderSafariModal();
        }, 760);

        setTimeout(() => {
            AudioEngine.playVoice(finalCoins[2] ? 1318.51 : 261.63, 120, 'square', 0.06);
            this.safariTemp.lastRollCoins = finalCoins;
            this.safariTemp.isRollingCoins = false;
            UI.renderSafariModal();

            const headsCount = finalCoins.filter(c => c === true).length;
            if (headsCount >= reqHeads) {
                this.completeSafariCaptureAttempt(true);
            } else {
                const hasGoldenBerry = player.hand.some(c => c.id === 'baya_dorada');
                if (headsCount === reqHeads - 1 && hasGoldenBerry && !player.isAI) {
                    this.safariTemp.awaitingGoldenBerry = true;
                    UI.renderSafariModal();
                } else if (headsCount === reqHeads - 1 && hasGoldenBerry && player.isAI) {
                    const bIdx = player.hand.findIndex(c => c.id === 'baya_dorada');
                    this.useSafariHandItem(bIdx);
                } else {
                    this.completeSafariCaptureAttempt(false);
                }
            }
        }, 1140);
    },

    completeSafariCaptureAttempt(isSuccess) {
        const saf = this.state?.safariState;
        if (!saf) return;
        const activeIdx = saf.turnOrder[saf.currentStep];
        const player = this.state.players[activeIdx];
        if (!player || !this.requireLocalControl(activeIdx)) return;
        const wildSlot = saf.wildSlots[this.safariTemp.selectedWildIndex];
        const ball = player.tray[this.safariTemp.selectedTrayBallIndex];
        const matrixEntry = CAPTURE_MATRIX[ball.rarity][wildSlot.pokemon.rarity];

        UI.renderSafariModal();

        setTimeout(() => {
            if (isSuccess) {
                AudioEngine.sfxCaptureSuccess();
                const usedBall = player.tray.splice(this.safariTemp.selectedTrayBallIndex, 1)[0];
                wildSlot.capturedBy = player.name;
                player.captured.push({
                    pokemon: wildSlot.pokemon,
                    ball: usedBall,
                    capturePV: matrixEntry.pv
                });
                saf.capturedThisSafari[player.idx] = true;
                this.addLog(`🏆 ¡CAPTURA CON ÉXITO! ${player.name} captura a ${wildSlot.pokemon.name} (${wildSlot.pokemon.rarity}) con ${usedBall.name} (+${matrixEntry.pv} PV).`, 'text-emerald-400 font-bold');
            } else {
                AudioEngine.sfxTrap();
                this.addLog(`💨 Fallo de Captura: ${wildSlot.pokemon.name} escapa de la ${ball.name} de ${player.name}. La esfera rebota a su bandeja.`, 'text-amber-300');
            }

            saf.currentStep++;
            this.advanceSafariTurn();
        }, 1150);
    },

    skipSafariTurnNoBalls() {
        const saf = this.state?.safariState;
        if (!saf) return;
        const activeIdx = saf.turnOrder[saf.currentStep];
        const player = this.state.players[activeIdx];
        if (!player || !this.requireLocalControl(activeIdx)) return;
        this.addLog(`🌿 ${player.name} no dispone de Pokéballs libres en su bandeja para capturar en esta Fase de Safari.`, 'text-slate-400');
        saf.currentStep++;
        this.advanceSafariTurn();
    },

    passSafariTurnVoluntarily() {
        const saf = this.state.safariState;
        if (!saf || this.safariTemp.isRollingCoins) return;
        const activeIdx = saf.turnOrder[saf.currentStep];
        if (!this.requireLocalControl(activeIdx)) return;
        const player = this.state.players[activeIdx];
        AudioEngine.sfxClick();
        this.addLog(`🌿 ${player.name} decide pasar su turno en la Fase de Safari sin capturar para conservar sus Pokéballs.`, 'text-slate-300');
        saf.currentStep++;
        this.advanceSafariTurn();
    },

    runAISafariTurn(aiPlayer) {
        const saf = this.state.safariState;
        if (!saf) return;
        if (aiPlayer.tray.length === 0) {
            this.skipSafariTurnNoBalls();
            return;
        }

        let bestWIdx = saf.wildSlots.findIndex(w => !w.capturedBy);
        let bestBIdx = 0;
        let bestScore = -999;

        saf.wildSlots.forEach((w, wIdx) => {
            if (w.capturedBy) return;
            aiPlayer.tray.forEach((b, bIdx) => {
                if (b.typeId === 'pesoball' && aiPlayer.tray.length > 1) return;
                const mat = CAPTURE_MATRIX[b.rarity][w.pokemon.rarity];
                const prob = mat.heads === 0 ? 1.0 : (mat.heads === 1 ? 0.875 : (mat.heads === 2 ? 0.5 : 0.125));
                const expected = mat.pv * prob - (b.typeId === 'rocketball' ? 2 : 0);
                if (expected > bestScore) {
                    bestScore = expected;
                    bestWIdx = wIdx;
                    bestBIdx = bIdx;
                }
            });
        });

        this.safariTemp.selectedWildIndex = bestWIdx;
        this.safariTemp.selectedTrayBallIndex = bestBIdx;
        this.launchSafariCaptureAttempt();
    },

    finishSafariPhase() {
        const saf = this.state.safariState;
        if (!saf) return;

        this.state.players.forEach(p => {
            if (saf.capturedThisSafari[p.idx]) {
                p.stats.consecutiveSafari = (p.stats.consecutiveSafari || 0) + 1;
                if (p.stats.consecutiveSafari > (p.stats.maxConsecutiveSafari || 0)) {
                    p.stats.maxConsecutiveSafari = p.stats.consecutiveSafari;
                }
            } else {
                p.stats.consecutiveSafari = 0;
            }
        });

        saf.wildSlots.forEach(w => {
            if (!w.capturedBy && w.pokemon) {
                this.state.pokemonDeck.push(w.pokemon);
            }
        });
        this.state.pokemonDeck = this.shuffle(this.state.pokemonDeck);

        const nPlayers = this.state.players.length;
        this.state.safariHolderIdx = (this.state.safariHolderIdx - 1 + nPlayers) % nPlayers;
        this.addLog(`🎟️ Fin de la Fase de Safari. El Ticket Safari pasa a ${this.state.players[this.state.safariHolderIdx].name}.`, 'text-emerald-300');

        const wasFinal = saf.isFinalSafari;
        this.state.safariState = null;
        UI.closeModal('modalSafari');

        if (wasFinal || (this.state.isFinalRound && this.state.hopper.length === 0)) {
            this.finishGameAndShowScoreboard();
        } else {
            AudioEngine.setTrack(1);
            this.state.round += 1;
            this.beginTurn(0);
        }
    },

    finishGameAndShowScoreboard() {
        this.state.gameOver = true;
        AudioEngine.setTrack(4);
        AudioEngine.sfxCaptureSuccess();

        const results = this.state.players.map(p => {
            const bd = ScoringEngine.calculateBreakdown(p, true);
            const maxPokeRank = p.captured.reduce((m, c) => Math.max(m, c.pokemon.rarityRank), 0);
            const allBalls = ScoringEngine.getAllPlayerBalls(p);
            const maxBallRank = allBalls.reduce((m, b) => Math.max(m, b.rarityRank), 0);
            const maxBallCount = allBalls.filter(b => b.rarityRank === maxBallRank).length;
            return {
                player: p,
                bd,
                maxPokeRank,
                maxBallRank,
                maxBallCount
            };
        });

        results.sort((a, b) => {
            if (b.bd.totalPV !== a.bd.totalPV) return b.bd.totalPV - a.bd.totalPV;
            if (b.maxPokeRank !== a.maxPokeRank) return b.maxPokeRank - a.maxPokeRank;
            if (b.maxBallRank !== a.maxBallRank) return b.maxBallRank - a.maxBallRank;
            if (b.maxBallCount !== a.maxBallCount) return b.maxBallCount - a.maxBallCount;
            return b.player.yen - a.player.yen;
        });

        const winner = results[0];
        document.getElementById('winnerAnnouncementTitle').textContent = `🏆 ¡${winner.player.name.toUpperCase()} ES PROCLAMADO MAESTRO GACHAKÉMON CON ${winner.bd.totalPV} PV!`;
        document.getElementById('winnerTiebreakerNote').textContent = `Recuento final completado tras vaciarse la tolva de 60 Pokéballs y celebrar la última Fase de Safari.`;

        const tableHtml = `
        <table class="w-full text-xs text-center border-collapse border border-slate-700">
            <thead>
                <tr class="bg-slate-950 font-pixel text-[10px] text-yellow-400">
                    <th class="border border-slate-700 p-2.5 text-left">Puesto / Entrenador</th>
                    <th class="border border-slate-700 p-2">PV Base Balls</th>
                    <th class="border border-slate-700 p-2">Efectos Balls</th>
                    <th class="border border-slate-700 p-2">Pokémon Capturados</th>
                    <th class="border border-slate-700 p-2">Objetivos Secretos</th>
                    <th class="border border-slate-700 p-2">P¥ Sobrantes (1PV/2P¥)</th>
                    <th class="border border-slate-700 p-2">Rocket / Deudas</th>
                    <th class="border border-slate-700 p-2 text-sm">TOTAL PV</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
                ${results.map((r, i) => `
                <tr class="${i === 0 ? 'bg-yellow-500/15 font-bold' : 'bg-slate-900'}">
                    <td class="border border-slate-700 p-2.5 text-left text-white">
                        ${i === 0 ? '🥇 ' : (i === 1 ? '🥈 ' : (i === 2 ? '🥉 ' : '4º '))} ${escapeHTML(r.player.name)}
                    </td>
                    <td class="border border-slate-700 p-2 text-slate-200">+${r.bd.baseBallPV}</td>
                    <td class="border border-slate-700 p-2 text-cyan-300">+${r.bd.passiveBallPV}</td>
                    <td class="border border-slate-700 p-2 text-emerald-300">+${r.bd.capturedPV} (${r.player.captured.length})</td>
                    <td class="border border-slate-700 p-2 text-amber-300">+${r.bd.objectivesPV} (${r.bd.completedObjs.length}/3)</td>
                    <td class="border border-slate-700 p-2 text-yellow-300">+${r.bd.yenPV} (${r.player.yen} P¥)</td>
                    <td class="border border-slate-700 p-2 text-red-400">${r.bd.rocketPenalty + r.bd.debtPenaltyPV}</td>
                    <td class="border border-slate-700 p-2 font-pixel text-sm text-yellow-400">${r.bd.totalPV} PV</td>
                </tr>`).join('')}
            </tbody>
        </table>`;

        document.getElementById('finalScoreboardTableWrap').innerHTML = tableHtml;
        UI.openModal('modalGameOver');
    },

    setGloriaWildcard(typeId) {
        const player = this.state.players[this.viewedPlayerIdx];
        if (!player || !this.isLocalPlayer(player.idx)) return;
        player.gloriaWildcardChoice = typeId;
        this.syncAndRender();
    },

    addLog(text, colorClass = 'text-slate-300') {
        if (!this.state) return;
        this.state.logs.unshift({ text, colorClass, round: this.state.round });
        if (this.state.logs.length > 60) this.state.logs.pop();
    },

    receiveExternalState(extState) {
        if (!extState || !Array.isArray(extState.players)) return;
        if (extState.mode === 'online') {
            const ownIndex = OnlineManager.getLocalPlayerIndex(extState);
            if (ownIndex < 0) {
                console.warn('[OnlineManager] Estado ignorado: este cliente no pertenece a la sala.');
                return;
            }
            this.viewedPlayerIdx = ownIndex;
        }
        this.state = extState;
        if (extState.mode === 'online') {
            const ownIndex = OnlineManager.getLocalPlayerIndex(extState);
            const ownId = extState.players[ownIndex].id;
            const safari = extState.safariState;
            if (safari) {
                const activeIdx = safari.turnOrder?.[safari.currentStep] ?? -1;
                const turnKey = `${extState.round}:${safari.currentStep}:${activeIdx}`;
                if (turnKey !== this.lastOnlineSafariTurnKey) {
                    this.lastOnlineSafariTurnKey = turnKey;
                    const firstWild = safari.wildSlots.findIndex(slot => !slot.capturedBy);
                    this.safariTemp = { selectedWildIndex: firstWild >= 0 ? firstWild : 0, selectedTrayBallIndex: 0, criticalActive: false, lastRollCoins: null, awaitingGoldenBerry: false, isRollingCoins: false };
                }
            } else {
                this.lastOnlineSafariTurnKey = null;
            }
            if (ownId && extState.pendingApagonPlayerIds?.[0] === ownId && this.apagonQueue.length === 0) {
                this.apagonQueue = [ownIndex];
                setTimeout(() => this.openNextApagonModal(), 0);
            }
        }
        document.getElementById('screenLobby')?.classList.add('hidden');
        document.getElementById('screenGame')?.classList.remove('hidden');
        const topStatus = document.getElementById('topGameStatus');
        topStatus?.classList.remove('hidden');
        topStatus?.classList.add('flex');
        const safariModal = document.getElementById('modalSafari');
        if (extState.safariState) {
            if (safariModal?.classList.contains('hidden')) UI.openModal('modalSafari');
            UI.renderSafariModal();
        } else if (safariModal && !safariModal.classList.contains('hidden')) {
            UI.closeModal('modalSafari');
        }
        UI.renderAll();
    },

    syncAndRender() {
        if (this.state && this.state.mode === 'online') {
            OnlineManager.broadcastGameState(this.state);
        }
        UI.renderAll();
    }
};

const UI = {
    catalogCurrentTab: 'balls',
    dexFilterRarity: 'ALL',

    bingoTimerId: null,
    bingoDrumIntervalId: null,
    topModalZ: 100,

    playBingoExtractionAnimation(ball, player, isFreeBonus = false, specialBanner = '') {
        const bInfo = BALL_MAP[ball.typeId] || BALL_TYPES[0];

        // Si es un Bot IA, mostramos un banner flotante arriba para no interrumpir al jugador humano
        if (player && player.isAI) {
            let toast = document.getElementById('aiBingoToast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'aiBingoToast';
                toast.className = 'fixed top-16 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-300';
                toast.style.zIndex = '9100';
                document.body.appendChild(toast);
            }
            toast.innerHTML = `
                <div class="pixel-box-gold bg-slate-950/95 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl border-2" style="border-color:${bInfo.badgeColor}">
                    <div class="animate-bingo-slot">
                        ${ArtRenderer.renderBingoBallSVG(ball, 46)}
                    </div>
                    <div class="text-left">
                        <div class="text-[10px] font-pixel text-yellow-400">🎱 BOMBO GACHA • ${player.name.toUpperCase()}</div>
                        <div class="text-xs font-bold text-white">¡<span style="color:${bInfo.badgeColor}">${ball.name}</span> (${ball.rarity})!</div>
                    </div>
                </div>
            `;
            toast.style.opacity = '1';
            setTimeout(() => {
                if (toast) toast.style.opacity = '0';
            }, 1800);
            return;
        }

        // Para jugadores humanos: Mostrar el espectáculo completo del Bombo y caída de la Pokéball
        let overlay = document.getElementById('bingoExtractionOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'bingoExtractionOverlay';
            overlay.className = 'fixed inset-0 bg-black/80 hidden items-center justify-center p-4 backdrop-blur-sm';
            overlay.style.zIndex = '9200';
            overlay.onclick = (e) => {
                if (e.target === overlay) this.closeBingoOverlay();
            };
            document.body.appendChild(overlay);
        }

        if (this.bingoTimerId) clearTimeout(this.bingoTimerId);
        if (this.bingoDrumIntervalId) clearInterval(this.bingoDrumIntervalId);

        overlay.innerHTML = `
            <div class="pixel-box-gold max-w-md w-full p-5 bg-slate-900 text-center relative overflow-hidden" style="border-color:${bInfo.badgeColor}">
                <div class="flex items-center justify-between border-b border-slate-700 pb-2.5 mb-3">
                    <span class="font-pixel text-[11px] text-yellow-400 flex items-center gap-1.5">
                        <i class="fas fa-dharmachakra animate-spin text-red-400"></i>
                        SORTEO TOLVA GACHAPON ${isFreeBonus ? '(GIRO GRATIS)' : ''}
                    </span>
                    <span class="bg-slate-950 text-cyan-300 border border-cyan-500/40 font-pixel text-[10px] px-2 py-0.5 rounded">
                        Quedan: ${GameController.state ? GameController.state.hopper.length : 0}/60
                    </span>
                </div>

                <!-- Fase 1: Bombo Girando (2.43 segundos) -->
                <div id="bingoPhaseSpinning" class="py-4 flex flex-col items-center justify-center space-y-3">
                    <div class="w-36 h-40 mx-auto">
                        ${ArtRenderer.renderGachaMachineSVG(60, true)}
                    </div>
                    <div class="font-pixel text-xs text-amber-300 animate-pulse">
                        MEZCLANDO LAS ESFERAS EN LA TOLVA...
                    </div>
                    <div id="bingoRollingNumberTicker" class="font-pixel text-xs text-cyan-300 bg-slate-950 border-2 border-slate-700 px-4 py-2 rounded-full shadow-inner flex items-center justify-center gap-2 min-w-[210px]">
                        <span>GIRANDO BOMBO...</span>
                    </div>
                </div>

                <!-- Fase 2: Pokéball Extraída (con el destello por detrás sin tapar la Pokéball y sin número) -->
                <div id="bingoPhaseRevealed" class="hidden py-2 flex-col items-center justify-center space-y-3">
                    <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                        ¡ESFERA EXTRAÍDA PARA <span class="text-yellow-300">${player ? player.name.toUpperCase() : 'ENTRENADOR'}</span>!
                    </div>

                    <div class="relative my-2 flex items-center justify-center">
                        <div class="animate-bingo-ball-drop relative flex items-center justify-center p-5">
                            <!-- Destello situado estrictamente detrás (z-0) con gradiente radial suave -->
                            <div class="absolute -inset-2 rounded-full blur-md opacity-60 animate-bingo-glow z-0 pointer-events-none"
                                 style="background: radial-gradient(circle, ${bInfo.badgeColor} 0%, ${bInfo.badgeColor}44 45%, transparent 72%);"></div>
                            <!-- Imagen de la Pokéball situada delante (z-10) para que nunca quede tapada -->
                            <div class="relative z-10 flex items-center justify-center">
                                ${ArtRenderer.renderBallSVG(ball.typeId, 112)}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div class="inline-block px-3 py-0.5 rounded-full text-[11px] font-bold mb-1 border"
                             style="background:${bInfo.badgeColor}25; color:${bInfo.badgeColor}; border-color:${bInfo.badgeColor}">
                            RAREZA ${ball.rarity.toUpperCase()} (COLOR ${ball.colorName.toUpperCase()})
                        </div>
                        <h3 class="font-pixel text-base sm:text-lg text-white mt-0.5" style="text-shadow:0 0 10px ${bInfo.badgeColor}88;">
                            ¡${ball.name.toUpperCase()}!
                        </h3>
                    </div>

                    <div class="grid grid-cols-2 gap-2 w-full max-w-xs text-xs bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
                        <div>
                            <div class="text-[10px] text-slate-400">VALOR PUNTOS</div>
                            <div class="font-pixel text-xs text-purple-300 mt-0.5">+${ball.pv} PV Base</div>
                        </div>
                        <div>
                            <div class="text-[10px] text-slate-400">VALOR DE VENTA</div>
                            <div class="font-pixel text-xs text-yellow-300 mt-0.5">${ball.sell} P¥</div>
                        </div>
                    </div>

                    ${specialBanner ? `
                        <div class="w-full bg-yellow-500/20 border-2 border-yellow-400 text-yellow-200 text-xs font-bold p-2.5 rounded-xl animate-bounce">
                            ${specialBanner}
                        </div>
                    ` : ''}

                    <div class="card-rich-desc w-full text-left">
                        ${formatCardText(bInfo.desc)}
                    </div>

                    <button onclick="UI.closeBingoOverlay()"
                            class="pixel-btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-6 py-2.5 w-full mt-2">
                        ¡GUARDAR EN MI BANDEJA!
                    </button>
                </div>
            </div>
        `;

        overlay.classList.remove('hidden');
        overlay.classList.add('flex');

        // Mostrar previsualización dinámica de esferas mezclándose durante los 2.43 segundos
        const tickerEl = document.getElementById('bingoRollingNumberTicker');
        let spinStep = 0;
        this.bingoDrumIntervalId = setInterval(() => {
            if (tickerEl) {
                const sampleBall = BALL_TYPES[spinStep % BALL_TYPES.length];
                tickerEl.innerHTML = `
                    ${ArtRenderer.renderBallSVG(sampleBall.id, 22)}
                    <span style="color:${sampleBall.badgeColor}">${sampleBall.name.toUpperCase()}</span>
                `;
                spinStep++;
            }
        }, 110);

        // 2430 ms (2 segundos más larga que los 430 ms anteriores)
        this.bingoTimerId = setTimeout(() => {
            if (this.bingoDrumIntervalId) clearInterval(this.bingoDrumIntervalId);
            const spinEl = document.getElementById('bingoPhaseSpinning');
            const revEl = document.getElementById('bingoPhaseRevealed');
            if (spinEl && revEl) {
                spinEl.classList.add('hidden');
                revEl.classList.remove('hidden');
                revEl.classList.add('flex');
            }
        }, 2430);
    },

    closeBingoOverlay() {
        if (this.bingoTimerId) clearTimeout(this.bingoTimerId);
        if (this.bingoDrumIntervalId) clearInterval(this.bingoDrumIntervalId);
        const overlay = document.getElementById('bingoExtractionOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }
        AudioEngine.sfxClick();
    },

    toggleHeaderMenu() {
        const panel = document.getElementById('headerActionsPanel');
        const toggle = document.getElementById('headerMenuToggle');
        const icon = document.getElementById('headerMenuIcon');
        if (!panel || !toggle) return;
        const isOpening = panel.classList.contains('hidden');
        panel.classList.toggle('hidden', !isOpening);
        toggle.setAttribute('aria-expanded', String(isOpening));
        toggle.setAttribute('aria-label', isOpening ? 'Ocultar menú' : 'Mostrar menú');
        if (icon) icon.className = isOpening ? 'fas fa-xmark' : 'fas fa-bars';
    },

    closeHeaderMenu() {
        const panel = document.getElementById('headerActionsPanel');
        const toggle = document.getElementById('headerMenuToggle');
        const icon = document.getElementById('headerMenuIcon');
        if (panel) panel.classList.add('hidden');
        if (toggle) {
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', 'Mostrar menú');
        }
        if (icon) icon.className = 'fas fa-bars';
    },

    openModal(id) {
        this.closeHeaderMenu();
        const el = document.getElementById(id);
        if (!el) return;
        if (id === 'modalCatalog') this.renderCatalogModal();
        if (id === 'modalSettings') SettingsManager.renderSettingsModalControls();
        if (id === 'modalBugReport') BugReporter.refreshModal();

        // Garantizar que la ventana de alerta/inspección (#modalAlert) o cualquier modal recién abierto quede siempre delante de todo
        this.topModalZ = (this.topModalZ || 100) + 2;
        if (id === 'modalAlert') {
            el.style.zIndex = '9500';
        } else if (id === 'modalInteraction') {
            el.style.zIndex = '9000';
        } else {
            el.style.zIndex = String(this.topModalZ);
        }

        el.classList.remove('hidden');
        el.classList.add('flex');
    },

    closeModal(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('hidden');
        el.classList.remove('flex');
    },

    showAlert(title, message, icon = '⚠️', extraHtml = '') {
        document.getElementById('alertIconWrap').innerHTML = icon;
        document.getElementById('alertTitle').textContent = title;
        document.getElementById('alertMessage').innerHTML = formatCardText(message);
        const extraEl = document.getElementById('alertExtraContent');
        if (extraEl) extraEl.innerHTML = extraHtml;
        this.openModal('modalAlert');
    },

    inspectBall(ballTypeId) {
        AudioEngine.sfxClick();
        const b = BALL_MAP[ballTypeId];
        if (!b) return;
        const extra = `
            <div class="bg-slate-950 border border-slate-700 rounded-lg p-3 mt-2 text-xs text-left space-y-1.5">
                <div class="flex justify-between"><span>Rareza Interna:</span><strong style="color:${b.badgeColor}">${b.rarity} (Color ${b.colorName})</strong></div>
                <div class="flex justify-between"><span>Puntos de Victoria Base:</span><strong class="text-purple-300">${b.pv} PV</strong></div>
                <div class="flex justify-between"><span>Valor de Venta (Ticket Devolución):</span><strong class="text-yellow-300">${b.sell} P¥</strong></div>
                <div class="flex justify-between"><span>Unidades en Tolva de 60:</span><strong class="text-cyan-300">${b.count} esferas</strong></div>
            </div>`;
        this.showAlert(
            `${b.name.toUpperCase()}`,
            b.desc,
            ArtRenderer.renderBallSVG(b.id, 64),
            extra
        );
    },

    inspectPokemon(dexNum) {
        AudioEngine.sfxClick();
        const pk = POKEMON_CATALOG.find(p => p.dexNum === dexNum);
        if (!pk) return;
        const rowsHtml = ['Común', 'Poco Común', 'Rara', 'Épica', 'Legendaria'].map(bRar => {
            const m = CAPTURE_MATRIX[bRar][pk.rarity];
            return `<div class="flex justify-between border-b border-slate-800 py-0.5">
                <span class="text-slate-400">Con Ball ${bRar}:</span>
                <span class="font-bold text-white">${m.heads === 0 ? '<span class="text-emerald-400">AUTO</span>' : m.heads + ' Cara(s)'} → <span class="text-purple-300">+${m.pv} PV</span></span>
            </div>`;
        }).join('');

        const extra = `
            <div class="bg-slate-950 border border-slate-700 rounded-lg p-3 mt-2 text-xs text-left space-y-1">
                <div class="flex justify-between mb-1">
                    <span class="font-bold text-slate-300">Región: ${pk.region}</span>
                    <span class="px-2 py-0.5 rounded font-bold" style="background:${pk.badgeHex}33; color:${pk.badgeHex}">Rareza ${pk.rarity} (${pk.color})</span>
                </div>
                <div class="text-[11px] font-bold text-emerald-400 mt-2 mb-1">Requisitos y Puntos de Captura:</div>
                ${rowsHtml}
            </div>`;

        this.showAlert(
            `${pk.idStr} ${pk.name.toUpperCase()}`,
            pk.flavor,
            `<img src="${pk.spriteUrl}" class="w-24 h-24 mx-auto bg-slate-950 rounded-xl border-2 border-slate-700 p-1">`,
            extra
        );
    },

    inspectEffectCard(cardId) {
        AudioEngine.sfxClick();
        const c = EFFECT_TEMPLATES.find(t => t.id === cardId);
        if (!c) return;
        const extra = `
            <div class="bg-slate-950 border border-slate-700 rounded-lg p-2.5 mt-2 text-xs flex justify-between items-center">
                <span class="text-slate-400">Momento de uso:</span>
                <span class="bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-700 font-bold">${c.phaseTag}</span>
            </div>`;
        this.showAlert(
            `${c.name.toUpperCase()} (${c.subtype})`,
            c.desc,
            `<i class="fas ${c.icon} text-cyan-400 text-4xl"></i>`,
            extra
        );
    },

    closeAlertModal() {
        AudioEngine.sfxClick();
        this.closeModal('modalAlert');
    },

    toggleCRT() {
        SettingsManager.toggleCrt(!SettingsManager.current.crtEnabled);
    },

    openHopperModal() {
        this.catalogCurrentTab = 'balls';
        this.openModal('modalCatalog');
    },

    switchCatalogTab(tab) {
        AudioEngine.sfxClick();
        this.catalogCurrentTab = tab;
        document.getElementById('catTabBalls').className = tab === 'balls'
            ? 'px-3 py-1.5 rounded font-pixel text-[10px] bg-yellow-500 text-slate-950'
            : 'px-3 py-1.5 rounded font-pixel text-[10px] bg-slate-800 text-slate-300';
        document.getElementById('catTabDex').className = tab === 'dex'
            ? 'px-3 py-1.5 rounded font-pixel text-[10px] bg-yellow-500 text-slate-950'
            : 'px-3 py-1.5 rounded font-pixel text-[10px] bg-slate-800 text-slate-300';
        this.renderCatalogModal();
    },

    renderCatalogModal() {
        const body = document.getElementById('catalogModalBody');
        if (!body) return;

        if (this.catalogCurrentTab === 'balls') {
            const liveHopperCounts = {};
            BALL_TYPES.forEach(b => { liveHopperCounts[b.id] = 0; });
            if (GameController.state) {
                GameController.state.hopper.forEach(b => {
                    liveHopperCounts[b.typeId] = (liveHopperCounts[b.typeId] || 0) + 1;
                });
            }

            body.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${BALL_TYPES.map(b => {
                    const rem = GameController.state ? liveHopperCounts[b.id] : b.count;
                    return `
                    <div onclick="UI.inspectBall('${b.id}')" class="cursor-pointer bg-slate-950 hover:bg-slate-900 border border-slate-700 p-3.5 rounded-xl flex items-center gap-3.5 transition">
                        ${ArtRenderer.renderBallSVG(b.id, 46)}
                        <div class="flex-1">
                            <div class="flex items-center justify-between">
                                <span class="font-bold text-sm text-white">(${b.num}) ${b.name}</span>
                                <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300">En tolva: ${rem}/${b.count}</span>
                            </div>
                            <div class="text-xs font-semibold mt-0.5" style="color:${b.badgeColor}">
                                Rareza: ${b.rarity} (${b.colorName}) • Base: ${b.pv} PV • Venta: ${b.sell} P¥
                            </div>
                            <div class="card-rich-desc mt-1.5">${formatCardText(b.desc)}</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
        } else {
            const rarities = ['ALL', 'Mítica', 'Legendaria', 'Épica', 'Rara', 'Poco Común', 'Común'];
            const filtered = this.dexFilterRarity === 'ALL'
                ? POKEMON_CATALOG
                : POKEMON_CATALOG.filter(p => p.rarity === this.dexFilterRarity);

            body.innerHTML = `
            <div class="flex flex-wrap gap-1.5 mb-3">
                ${rarities.map(r => `
                    <button onclick="UI.filterDex('${r}')" class="px-2.5 py-1 rounded text-xs font-bold ${this.dexFilterRarity === r ? 'bg-yellow-500 text-slate-950' : 'bg-slate-800 text-slate-300'}">
                        ${r === 'ALL' ? 'Todos (251)' : r}
                    </button>
                `).join('')}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                ${filtered.map(p => `
                    <div onclick="UI.inspectPokemon(${p.dexNum})" class="cursor-pointer bg-slate-950 hover:bg-slate-900 border border-slate-700 rounded-xl p-3 flex flex-col justify-between transition">
                        <div>
                            <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                                <span class="text-white truncate">${p.idStr} ${p.name}</span>
                                <span class="px-2 py-0.5 rounded text-[10px]" style="background:${p.badgeHex}33; color:${p.badgeHex}">${p.rarity} (${p.region})</span>
                            </div>
                            <div class="flex justify-center my-1.5 bg-slate-900 rounded-lg py-2 border border-slate-800">
                                <img src="${p.spriteUrl}" loading="lazy" class="w-16 h-16 object-contain" alt="${p.name}">
                            </div>
                            <div class="card-rich-desc mt-1.5">${p.flavor}</div>
                        </div>
                        <div class="text-right text-[10px] text-cyan-400 font-bold mt-1.5">🔍 Ver tabla de captura</div>
                    </div>
                `).join('')}
            </div>`;
        }
    },

    filterDex(rarity) {
        this.dexFilterRarity = rarity;
        this.renderCatalogModal();
    },

    renderAll() {
        const st = GameController.state;
        if (!st) return;
        if (st.mode === 'online') {
            const ownIndex = OnlineManager.getLocalPlayerIndex(st);
            if (ownIndex >= 0) GameController.viewedPlayerIdx = ownIndex;
        }

        const remSafari = 3 - ((st.round - 1) % 3);
        document.getElementById('topRoundBadge').textContent = st.isFinalRound ? `¡RONDA FINAL!` : `RONDA ${st.round}`;
        document.getElementById('topSafariCountdown').textContent = remSafari === 1 ? `¡Safari al final de esta ronda!` : `Safari en: ${remSafari} rondas`;
        document.getElementById('topHopperCount').textContent = `Tolva: ${st.hopper.length}/60`;
        document.getElementById('hopperBadgeCount').textContent = `${st.hopper.length}/60`;

        const machineEl = document.getElementById('gachaMachineInteractive');
        if (machineEl) machineEl.innerHTML = ArtRenderer.renderGachaMachineSVG(st.hopper.length, GameController.isGachaCranking);

        const lastSlot = document.getElementById('lastExtractedSlot');
        const lastName = document.getElementById('lastExtractedName');
        const lastDesc = document.getElementById('lastExtractedDesc');
        if (st.lastExtractedBall) {
            const lb = st.lastExtractedBall.ball;
            const bInfo = BALL_MAP[lb.typeId] || BALL_TYPES[0];
            const isRecent = (Date.now() - (st.lastExtractedBall.timestamp || 0)) < 2500;
            const animClass = isRecent ? 'animate-bingo-slot' : '';
            lastSlot.innerHTML = `
                <div onclick="UI.inspectBall('${lb.typeId}')" class="cursor-pointer ${animClass}" title="Haz clic para inspeccionar esta bola">
                    ${ArtRenderer.renderBingoBallSVG(lb, 54)}
                </div>`;
            lastName.innerHTML = `<span style="color:${bInfo.badgeColor}">${lb.name}</span>`;
            lastDesc.innerHTML = `Extraída por <span class="text-yellow-300 font-bold">${st.lastExtractedBall.playerName}</span> (${lb.rarity})`;
        }

        const rarityCounts = { 'Común': 0, 'Poco Común': 0, 'Rara': 0, 'Épica': 0, 'Legendaria': 0 };
        st.hopper.forEach(b => { rarityCounts[b.rarity] = (rarityCounts[b.rarity] || 0) + 1; });
        const totalH = Math.max(1, st.hopper.length);
        document.getElementById('hopperRarityBar').innerHTML = `
            <div style="width:${(rarityCounts['Común']/totalH)*100}%; background:#94a3b8" title="Común: ${rarityCounts['Común']}"></div>
            <div style="width:${(rarityCounts['Poco Común']/totalH)*100}%; background:#22c55e" title="Poco Común: ${rarityCounts['Poco Común']}"></div>
            <div style="width:${(rarityCounts['Rara']/totalH)*100}%; background:#3b82f6" title="Rara: ${rarityCounts['Rara']}"></div>
            <div style="width:${(rarityCounts['Épica']/totalH)*100}%; background:#a855f7" title="Épica: ${rarityCounts['Épica']}"></div>
            <div style="width:${(rarityCounts['Legendaria']/totalH)*100}%; background:#eab308" title="Legendaria: ${rarityCounts['Legendaria']}"></div>
        `;

        this.renderRivalsBar();
        this.renderTurnControls();

        document.getElementById('logRoundIndicator').textContent = `Ronda ${st.round}`;
        document.getElementById('gameLogContainer').innerHTML = st.logs.map(l => `
            <div class="${l.colorClass} border-b border-slate-900 pb-1">[R${l.round}] ${l.text}</div>
        `).join('');

        this.renderActivePlayerBoard();
    },

    renderRivalsBar() {
        const st = GameController.state;
        const rivalsBar = document.getElementById('rivalsBar');
        const otherPlayers = st.players.filter((_, idx) => idx !== GameController.viewedPlayerIdx);

        rivalsBar.innerHTML = otherPlayers.map(p => {
            const isTurn = st.turnPlayerIdx === p.idx;
            const livePV = ScoringEngine.calculateBreakdown(p, false).totalPV;
            const hasTicket = st.safariHolderIdx === p.idx;
            const canSwitch = st.mode !== 'online';
            return `
            <div ${canSwitch ? `onclick="GameController.viewedPlayerIdx = ${p.idx}; UI.renderAll()"` : ''}
                 class="${canSwitch ? 'cursor-pointer' : 'cursor-default'} pixel-box p-2.5 transition ${isTurn ? 'border-yellow-400 bg-slate-800' : 'bg-slate-900/90 opacity-90'}">
                <div class="flex items-center justify-between mb-1.5">
                    <div class="flex items-center gap-1.5">
                        <span class="font-pixel text-[10px] ${isTurn ? 'text-yellow-400' : 'text-white'}">${escapeHTML(p.name)}</span>
                        ${hasTicket ? '<span title="Posee el Ticket Safari">🎟️</span>' : ''}
                    </div>
                    <div class="flex items-center gap-2 text-xs font-bold">
                        <span class="text-yellow-300"><i class="fas fa-coins mr-0.5"></i>${p.yen} P¥</span>
                        <span class="text-purple-300"><i class="fas fa-star mr-0.5"></i>${livePV} PV</span>
                    </div>
                </div>
                <div class="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Balls: <strong class="text-white">${p.tray.length}</strong> libres</span>
                    <span>Capturas: <strong class="text-emerald-400">${p.captured.length}</strong></span>
                    <span>Mano: <strong class="text-cyan-300">${p.hand.length}</strong></span>
                </div>
                <div class="flex items-center gap-1 mt-1.5 overflow-x-auto py-0.5">
                    ${p.tray.slice(0, 8).map(b => ArtRenderer.renderBallSVG(b.typeId, 20)).join('')}
                    ${p.tray.length === 0 ? '<span class="text-[10px] text-slate-600 italic">Bandeja vacía</span>' : ''}
                </div>
            </div>`;
        }).join('');
    },

    renderTurnControls() {
        const st = GameController.state;
        const activePlayer = st.players[st.turnPlayerIdx];

        document.getElementById('turnPlayerHeader').textContent = `TURNO DE ${activePlayer.name.toUpperCase()}`;
        document.getElementById('turnPhaseBadge').textContent = st.phase === 2 ? 'FASE 2: ACCIÓN PRINCIPAL' : 'FASE 3: ACCIONES LIBRES';

        [1, 2, 3].forEach(ph => {
            const el = document.getElementById(`stepIndicator${ph}`);
            if (st.phase === ph || (ph === 1 && st.phase >= 2)) {
                el.className = ph === st.phase
                    ? 'p-1.5 rounded border-2 border-yellow-400 bg-yellow-500/20 text-yellow-300 text-[10px] font-bold'
                    : 'p-1.5 rounded border border-emerald-600/50 bg-emerald-950/30 text-emerald-400 text-[10px] font-bold';
            } else {
                el.className = 'p-1.5 rounded border border-slate-800 bg-slate-950 text-slate-500 text-[10px] font-bold';
            }
        });

        document.getElementById('deckPokemonCount').textContent = st.pokemonDeck.length;
        document.getElementById('deckEffectCount').textContent = st.effectDeck.length;
        document.getElementById('ticketSafariHolderName').textContent = st.players[st.safariHolderIdx].name;

        const panel = document.getElementById('turnActionPanel');
        if (st.mode === 'online' && !GameController.canLocalControl(st.turnPlayerIdx)) {
            panel.innerHTML = `
                <div class="text-center py-4 space-y-1">
                    <i class="fas fa-lock text-xl text-amber-400"></i>
                    <div class="font-pixel text-xs text-amber-300">Esperando a ${escapeHTML(activePlayer.name)}</div>
                    <p class="text-[11px] text-slate-400">Los controles aparecerán cuando llegue tu turno.</p>
                </div>`;
            return;
        }
        if (activePlayer.isAI) {
            panel.innerHTML = `
            <div class="text-center py-4 space-y-2">
                <i class="fas fa-robot text-2xl text-cyan-400 animate-bounce"></i>
                <div class="font-pixel text-xs text-cyan-300">${escapeHTML(activePlayer.name)} está calculando su jugada...</div>
            </div>`;
            return;
        }

        const allBalls = ScoringEngine.getAllPlayerBalls(activePlayer);
        const ceboBonus = allBalls.filter(b => b.typeId === 'ceboball').length;
        const gachaCost = activePlayer.discountActive ? 1 : 3;

        if (st.phase === 2) {
            panel.innerHTML = `
            <div class="text-xs text-slate-300 text-center mb-3 font-semibold">
                Fase 1 completada (Mano repuesta hasta 3 cartas). Elige tu <strong>Acción Principal de Fase 2</strong>:
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onclick="GameController.actionWork()"
                        class="pixel-btn bg-amber-600 hover:bg-amber-500 text-white p-3 flex flex-col items-center gap-1">
                    <span class="text-xs">💼 1. TRABAJAR</span>
                    <span class="font-sans text-[11px] text-amber-100 font-normal">Recibe +${2 + ceboBonus} P¥ del banco</span>
                </button>
                <button onclick="GameController.actionPullGacha()" ${activePlayer.yen < gachaCost || st.hopper.length === 0 ? 'disabled' : ''}
                        class="pixel-btn bg-red-600 hover:bg-red-500 text-white p-3 flex flex-col items-center gap-1">
                    <span class="text-xs">🎰 2. TIRAR DEL GACHA</span>
                    <span class="font-sans text-[11px] text-red-100 font-normal">Paga ${gachaCost} P¥ • Extrae 1 Ball</span>
                </button>
            </div>`;
        } else {
            panel.innerHTML = `
            <div class="text-center space-y-3">
                <p class="text-xs text-slate-300">
                    <strong>Fase 3 (Acciones Libres):</strong> Juega <strong>Cartas de Objeto</strong>, arrastra tus <strong>Pokéballs</strong> para ordenar tu bandeja, o finaliza tu turno.
                </p>
                <button onclick="GameController.endPlayerTurn()"
                        class="pixel-btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-6 py-3">
                    FINALIZAR TURNO <i class="fas fa-forward-step ml-1"></i>
                </button>
            </div>`;
        }
    },

    renderActivePlayerBoard() {
        const st = GameController.state;
        const p = st.players[GameController.viewedPlayerIdx];
        const isCurrentTurnPlayer = (st.turnPlayerIdx === p.idx && !p.isAI && GameController.canLocalControl(p.idx));
        const canReorderTray = isCurrentTurnPlayer;
        const bd = ScoringEngine.calculateBreakdown(p, false);

        const trayTitleEl = document.getElementById('activeTrayTitle');
        if (trayTitleEl) trayTitleEl.textContent = `BANDEJA DE ${p.name.toUpperCase()}`;
        document.getElementById('activePlayerYen').textContent = `${p.yen} P¥`;
        document.getElementById('activePlayerLivePV').textContent = `${bd.totalPV} PV`;

        document.getElementById('activeTicketBadge').classList.toggle('hidden', st.safariHolderIdx !== p.idx);
        document.getElementById('activeDiscountBadge').classList.toggle('hidden', !p.discountActive);
        document.getElementById('activeDebtBadge').classList.toggle('hidden', p.celedonLoans === 0);

        document.getElementById('viewPlayerSwitcher').innerHTML = st.mode === 'online'
            ? `<span class="px-2 py-1 rounded text-[10px] font-bold border bg-slate-800 text-cyan-300 border-cyan-700">Tu tablero: ${escapeHTML(p.name)}</span>`
            : st.players.map((pl, idx) => `
                <button onclick="GameController.viewedPlayerIdx = ${idx}; UI.renderAll()"
                        class="px-2 py-1 rounded text-[10px] font-bold border ${idx === p.idx ? 'bg-yellow-500 text-slate-950 border-yellow-400' : 'bg-slate-800 text-slate-300 border-slate-700'}">
                    ${escapeHTML(pl.name)}
                </button>`).join('');

        document.getElementById('trayUnoccupiedCount').textContent = p.tray.length;
        const standEl = document.getElementById('playerCapsuleStand');
        if (p.tray.length === 0) {
            standEl.innerHTML = `<div class="text-xs text-slate-500 italic py-4 px-2">No tienes Pokéballs libres en la bandeja. ¡Tira del Gachapon para extraer esferas!</div>`;
        } else {
            standEl.innerHTML = p.tray.map((b, bIdx) => {
                const isProtected = GameController.isBallProtectedByPeso(p, bIdx);
                const canActivateRocket = isCurrentTurnPlayer && b.typeId === 'rocketball' && b.rocketActive;
                return `
                <div ${canReorderTray ? `draggable="true" ondragstart="GameController.onTrayDragStart(event, ${bIdx})" ondragover="GameController.onTrayDragOver(event)" ondragleave="GameController.onTrayDragLeave(event)" ondragend="GameController.onTrayDragEnd(event)" ondrop="GameController.onTrayDrop(event, ${bIdx})"` : ''}
                     title="Arrastra para reordenar posición o haz clic en 🔍 para ver efecto completo"
                     class="ball-slot-draggable bg-slate-900 border-2 ${isProtected ? 'border-blue-500 bg-blue-950/20' : 'border-slate-700'} rounded-xl p-2 min-w-[104px] flex flex-col items-center text-center relative">
                    <div class="w-full flex items-center justify-between text-[9px] mb-1">
                        <span class="text-slate-400 font-bold">#${bIdx + 1}</span>
                        <button onclick="UI.inspectBall('${b.typeId}')" class="text-cyan-400 hover:text-cyan-200" title="Ver detalles de ${b.name}">
                            <i class="fas fa-magnifying-glass-plus"></i>
                        </button>
                    </div>
                    <div onclick="UI.inspectBall('${b.typeId}')" class="cursor-pointer">
                        ${ArtRenderer.renderBallSVG(b.typeId, 42)}
                    </div>
                    <div class="font-bold text-[11px] text-white mt-1 leading-tight truncate w-full">${b.name}</div>
                    <div class="text-[10px] text-slate-300 font-semibold">${b.pv} PV • ${b.sell} P¥</div>
                    ${isProtected
                        ? `<span class="mt-1 text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.5 rounded font-bold w-full"><i class="fas fa-shield-alt mr-0.5"></i>PROTEGIDA</span>`
                        : `<span class="mt-1 text-[9px] text-slate-500">Arrastrable</span>`
                    }
                    ${canReorderTray && p.tray.length > 1 ? `
                        <div class="flex items-center justify-between w-full mt-1 pt-1 border-t border-slate-800 text-[10px]">
                            <button onclick="GameController.moveTrayBallStep(${bIdx}, -1)" ${bIdx === 0 ? 'disabled' : ''} class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-25" title="Mover a la izquierda">◀</button>
                            <span class="text-[9px] text-slate-500"><i class="fas fa-arrows-left-right"></i></span>
                            <button onclick="GameController.moveTrayBallStep(${bIdx}, 1)" ${bIdx === p.tray.length - 1 ? 'disabled' : ''} class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-25" title="Mover a la derecha">▶</button>
                        </div>
                    ` : ''}
                    ${canActivateRocket ? `
                        <button onclick="GameController.openRocketStealModal(${bIdx})"
                                class="mt-1.5 bg-red-600 hover:bg-red-500 text-white text-[9px] font-bold px-1.5 py-1 rounded w-full">
                            🚀 ¡ROBAR!
                        </button>
                    ` : ''}
                </div>`;
            }).join('');
        }

        document.getElementById('trayCapturedCount').textContent = p.captured.length;
        const trophyEl = document.getElementById('playerTrophyRow');
        if (p.captured.length === 0) {
            trophyEl.innerHTML = `<div class="text-xs text-slate-500 italic py-6 px-2">Aún no has capturado Pokémon. ¡Prepárate para la Fase de Safari en las rondas 3, 6, 9...!</div>`;
        } else {
            trophyEl.innerHTML = p.captured.map(c => `
                <div onclick="UI.inspectPokemon(${c.pokemon.dexNum})"
                     class="cursor-pointer bg-slate-900 hover:bg-slate-800 border-2 border-emerald-600/60 rounded-xl p-2.5 min-w-[145px] max-w-[165px] flex flex-col items-center relative transition">
                    <div class="w-full flex items-center justify-between text-[10px] font-bold mb-1">
                        <span class="text-slate-300">${c.pokemon.idStr}</span>
                        <span class="px-1.5 py-0.5 rounded" style="background:${c.pokemon.badgeHex}33; color:${c.pokemon.badgeHex}">${c.pokemon.rarity}</span>
                    </div>
                    <div class="relative my-0.5">
                        <img src="${c.pokemon.spriteUrl}" class="w-14 h-14 object-contain" alt="${c.pokemon.name}">
                        <div class="absolute -bottom-1 -right-2 bg-slate-950 rounded-full p-0.5 border border-slate-600" title="Capturado con ${c.ball.name}">
                            ${ArtRenderer.renderBallSVG(c.ball.typeId, 24)}
                        </div>
                    </div>
                    <div class="font-bold text-xs text-white mt-1">${c.pokemon.name}</div>
                    <div class="text-[10px] font-pixel text-emerald-400 mt-0.5">+${c.capturePV} PV</div>
                    <div class="text-[9px] text-slate-400 truncate w-full text-center mt-0.5">${c.pokemon.region} • Clic info</div>
                </div>
            `).join('');
        }

        document.getElementById('handCountLabel').textContent = p.hand.length;
        const handEl = document.getElementById('playerHandContainer');
        if (p.hand.length === 0) {
            handEl.innerHTML = `<div class="col-span-3 text-xs text-slate-500 italic py-6 text-center">Sin cartas en mano. Robarás hasta tener 3 al inicio de tu próximo turno.</div>`;
        } else {
            handEl.className = 'grid grid-cols-1 md:grid-cols-3 gap-2.5 min-h-[145px]';
            handEl.innerHTML = p.hand.map((c, hIdx) => {
                const badgeColor = c.timing === 'safari' || c.timing === 'safari_reaction'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                    : (c.timing === 'reaction' ? 'bg-amber-950 text-amber-300 border-amber-600' : 'bg-cyan-950 text-cyan-300 border-cyan-600');
                return `
                <div class="bg-slate-900 border-2 border-cyan-500/50 hover:border-cyan-400 rounded-xl p-3 flex flex-col justify-between transition">
                    <div>
                        <div class="flex items-center justify-between gap-1 mb-1.5">
                            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}">
                                <i class="fas ${c.icon} mr-1"></i>${c.phaseTag || 'OBJETO'}
                            </span>
                            <div class="flex items-center gap-1.5">
                                <button onclick="UI.inspectEffectCard('${c.id}')" class="text-slate-400 hover:text-cyan-300 text-xs" title="Ampliar carta">
                                    <i class="fas fa-expand"></i>
                                </button>
                                ${isCurrentTurnPlayer ? `
                                    <button onclick="GameController.discardCardFromHand(${hIdx})" class="text-slate-500 hover:text-red-400 text-xs" title="Descartar carta">
                                        <i class="fas fa-trash-can"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="font-bold text-xs sm:text-sm text-white mb-1.5">${c.name}</div>
                        <div class="card-rich-desc">${formatCardText(c.desc)}</div>
                    </div>
                    ${isCurrentTurnPlayer ? `
                        <button onclick="GameController.playObjectCard(${hIdx})"
                                class="mt-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-pixel text-[9px] py-2 rounded-lg w-full shadow">
                            USAR CARTA
                        </button>
                    ` : ''}
                </div>`;
            }).join('');
        }

        const allBalls = ScoringEngine.getAllPlayerBalls(p);
        const hasGloria = allBalls.some(b => b.typeId === 'gloriaball');
        const gloriaWrap = document.getElementById('gloriaWildcardSelectorWrap');
        if (hasGloria) {
            gloriaWrap.classList.remove('hidden');
            gloriaWrap.innerHTML = `
                <select onchange="GameController.setGloriaWildcard(this.value)" class="bg-slate-900 border border-amber-400 rounded text-[10px] text-amber-300 px-1.5 py-0.5">
                    ${BALL_TYPES.filter(b => b.id !== 'rocketball' && b.id !== 'masterball' && b.id !== 'gloriaball').map(b => `
                        <option value="${b.id}" ${p.gloriaWildcardChoice === b.id ? 'selected' : ''}>Comodín Gloria: ${b.name}</option>
                    `).join('')}
                </select>`;
        } else {
            gloriaWrap.classList.add('hidden');
        }

        const countsForObj = ScoringEngine.countBallsByType(p);
        document.getElementById('playerObjectivesContainer').innerHTML = p.objectives.map(o => {
            const done = ScoringEngine.checkObjectiveCompleted(p, o.id, countsForObj);
            return `
            <div class="p-2.5 rounded-xl border-2 ${done ? 'border-emerald-500 bg-emerald-950/30' : 'border-slate-800 bg-slate-900'} flex items-center justify-between gap-3">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-0.5">
                        <span class="text-xs font-bold ${done ? 'text-emerald-300' : 'text-white'}">${done ? '✅ ' : '🎯 '}${o.name}</span>
                        <span class="text-[10px] font-semibold text-amber-400/90">[${o.category}]</span>
                    </div>
                    <div class="text-xs text-slate-200 leading-snug">${formatCardText(o.desc)}</div>
                </div>
                <span class="font-pixel text-xs px-2.5 py-1 rounded bg-slate-950 border ${done ? 'text-emerald-400 border-emerald-500' : 'text-amber-400 border-amber-500/40'} shrink-0">+${o.pv} PV</span>
            </div>`;
        }).join('');
    },

    renderSafariModal() {
        const st = GameController.state;
        const saf = st?.safariState;
        if (!saf) return;

        const activeIdx = saf.turnOrder[saf.currentStep];
        const player = st.players[activeIdx];
        if (!player) return;

        document.getElementById('safariPhaseTitle').textContent = `TURNO DE CAPTURA DE ${player.name.toUpperCase()}`;
        document.getElementById('safariTurnSubtitle').textContent = `Turno ${saf.currentStep + 1} de ${saf.turnOrder.length} (Orden iniciado por el Ticket Safari)`;

        const selectedBall = player.tray[GameController.safariTemp.selectedTrayBallIndex];

        const wildGrid = document.getElementById('safariWildPokemonGrid');
        wildGrid.innerHTML = saf.wildSlots.map((slot, wIdx) => {
            const pk = slot.pokemon;
            const isSelected = GameController.safariTemp.selectedWildIndex === wIdx && !slot.capturedBy;
            const seatOwner = st.players[slot.ownerSeatIdx]?.name || `Asiento ${wIdx + 1}`;
            const matPreview = selectedBall ? CAPTURE_MATRIX[selectedBall.rarity][pk.rarity] : null;

            return `
            <div onclick="GameController.selectSafariWild(${wIdx})"
                 class="cursor-pointer rounded-xl p-3 border-2 transition flex flex-col justify-between ${slot.capturedBy ? 'border-slate-800 bg-slate-950 opacity-45 cursor-not-allowed' : (isSelected ? 'border-yellow-400 bg-emerald-950/40 shadow-lg' : 'border-slate-700 bg-slate-950 hover:border-slate-500')}">
                <div>
                    <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Frente a: <strong>${seatOwner}</strong></span>
                        <span class="px-1.5 py-0.5 rounded font-bold" style="background:${pk.badgeHex}33; color:${pk.badgeHex}">${pk.rarity} (${pk.region})</span>
                    </div>
                    <div class="font-pixel text-xs text-white text-center my-1">${pk.idStr} ${pk.name}</div>
                    <div class="flex justify-center my-1.5 bg-slate-900 rounded-lg py-2 border border-slate-800">
                        <img src="${pk.spriteUrl}" class="w-16 h-16 object-contain animate-float" alt="${pk.name}">
                    </div>
                    <div class="card-rich-desc mt-1">${pk.flavor}</div>
                    ${matPreview && !slot.capturedBy ? `
                        <div class="mt-2 bg-slate-900/90 border border-slate-700 rounded px-2 py-1 text-[11px] flex justify-between items-center">
                            <span class="text-slate-300">Con ${selectedBall.name}:</span>
                            <span class="font-bold text-yellow-300">${matPreview.heads === 0 ? 'AUTO' : matPreview.heads + ' Cara(s)'} (+${matPreview.pv} PV)</span>
                        </div>
                    ` : ''}
                </div>
                <div class="mt-2 pt-1.5 border-t border-slate-800 text-center text-[10px] font-bold ${slot.capturedBy ? 'text-emerald-400' : 'text-yellow-300'}">
                    ${slot.capturedBy ? `✓ Capturado por ${slot.capturedBy}` : (isSelected ? '🎯 OBJETIVO SELECCIONADO' : 'Clic para apuntar')}
                </div>
            </div>`;
        }).join('');

        const safariItemsBar = document.getElementById('safariItemsBar');
        const canControlSafari = GameController.canLocalControl(activeIdx);
        const safariCards = canControlSafari ? player.hand
            .map((c, hIdx) => ({ c, hIdx }))
            .filter(item => item.c.timing === 'safari' || (item.c.timing === 'safari_reaction' && GameController.safariTemp.awaitingGoldenBerry)) : [];

        safariItemsBar.innerHTML = !canControlSafari && st.mode === 'online'
            ? '<span class="text-[11px] text-slate-500 italic">Mano privada del entrenador activo.</span>'
            : safariCards.map(({ c, hIdx }) => `
            <button onclick="GameController.useSafariHandItem(${hIdx})"
                    title="${c.desc}"
                    class="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-400">
                <i class="fas ${c.icon} mr-1"></i> Usar ${c.name}
            </button>
        `).join('');

        const ballsSel = document.getElementById('safariBallsSelector');
        if (player.tray.length === 0) {
            ballsSel.innerHTML = `<div class="text-xs text-amber-400 py-2">No tienes Pokéballs libres en tu bandeja para lanzar en esta Fase de Safari.</div>`;
        } else {
            ballsSel.innerHTML = player.tray.map((b, bIdx) => {
                const isSel = GameController.safariTemp.selectedTrayBallIndex === bIdx;
                return `
                <div onclick="GameController.selectSafariBall(${bIdx})"
                     class="cursor-pointer p-2.5 rounded-xl border-2 min-w-[95px] flex flex-col items-center ${isSel ? 'border-cyan-400 bg-cyan-500/20' : 'border-slate-700 bg-slate-900'}">
                    ${ArtRenderer.renderBallSVG(b.typeId, 36)}
                    <span class="font-bold text-xs text-white mt-1">${b.name}</span>
                    <span class="text-[10px] text-slate-400">${b.rarity}</span>
                </div>`;
            }).join('');
        }

        const reqTextEl = document.getElementById('safariRequirementText');
        const coinsDisplay = document.getElementById('safariCoinsDisplay');
        const actionsEl = document.getElementById('safariActionButtons');
        const selectedWild = saf.wildSlots[GameController.safariTemp.selectedWildIndex];

        if (st.mode === 'online' && !canControlSafari && !player.isAI) {
            reqTextEl.innerHTML = 'Esperando la jugada del entrenador activo.';
            coinsDisplay.innerHTML = '';
            actionsEl.innerHTML = '<span class="text-xs text-amber-300">🔒 Turno privado de otro jugador.</span>';
            return;
        }

        if (player.tray.length === 0) {
            reqTextEl.innerHTML = `Sin Pokéballs libres disponibles.`;
            coinsDisplay.innerHTML = '';
            actionsEl.innerHTML = (!player.isAI && canControlSafari) ? `
                <button onclick="GameController.skipSafariTurnNoBalls()" class="pixel-btn bg-slate-700 text-white text-xs px-4 py-2">
                    PASAR TURNO SAFARI
                </button>` : '';
            return;
        }

        if (selectedWild && !selectedWild.capturedBy && selectedBall) {
            const mat = CAPTURE_MATRIX[selectedBall.rarity][selectedWild.pokemon.rarity];
            let headsNeeded = mat.heads;
            if (GameController.safariTemp.criticalActive && headsNeeded > 1) headsNeeded = 1;

            reqTextEl.innerHTML = `
                <div>Lanzar <strong>${selectedBall.name}</strong> (${selectedBall.rarity}) contra <strong>${selectedWild.pokemon.name}</strong> (${selectedWild.pokemon.rarity}):</div>
                <div class="text-sm font-bold text-yellow-300 mt-0.5">
                    Requisito: ${headsNeeded === 0 ? '¡CAPTURA AUTOMÁTICA (AUTO)!' : `Obtener al menos ${headsNeeded} CARA(S) en 3 monedas`} • Recompensa: <span class="text-emerald-400">+${mat.pv} PV</span>
                </div>`;

            const coins = GameController.safariTemp.lastRollCoins;
            if (coins) {
                coinsDisplay.innerHTML = coins.map(val => {
                    if (val === 'SPIN') {
                        return `<div class="animate-coin w-12 h-12 rounded-full border-2 border-yellow-400 bg-amber-500/30 text-yellow-200 flex items-center justify-center font-pixel text-xs shadow-lg">🪙</div>`;
                    }
                    return `
                    <div class="animate-coin w-12 h-12 rounded-full border-2 flex items-center justify-center font-pixel text-[10px] shadow-lg ${val ? 'bg-yellow-500 text-slate-950 border-yellow-200' : 'bg-slate-800 text-red-400 border-red-500'}">
                        ${val ? 'CARA' : 'CRUZ'}
                    </div>`;
                }).join('');
            } else {
                coinsDisplay.innerHTML = [1, 2, 3].map(() => `
                    <div class="w-10 h-10 rounded-full border border-slate-700 bg-slate-950 flex items-center justify-center text-xs text-slate-500">P¥</div>
                `).join('');
            }

            if (player.isAI) {
                actionsEl.innerHTML = `<span class="text-xs text-cyan-300 font-pixel">Turno IA...</span>`;
            } else if (GameController.safariTemp.awaitingGoldenBerry) {
                actionsEl.innerHTML = `
                    <button onclick="GameController.safariTemp.awaitingGoldenBerry = false; GameController.completeSafariCaptureAttempt(false)"
                            class="pixel-btn bg-slate-700 text-white text-[10px] px-3 py-2">
                        NO USAR BAYA (FALLAR)
                    </button>`;
            } else if (!coins) {
                actionsEl.innerHTML = `
                    <button onclick="GameController.launchSafariCaptureAttempt()"
                            class="pixel-btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2.5">
                        ¡LANZAR POKÉBALL!
                    </button>
                    <button onclick="GameController.passSafariTurnVoluntarily()"
                            class="pixel-btn bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-3.5 py-2.5"
                            title="Pasar tu turno de Safari sin gastar ni arriesgar ninguna Pokéball">
                        PASAR SIN CAPTURAR
                    </button>`;
            } else {
                actionsEl.innerHTML = '';
            }
        }
    }
};


// ----------------------------------------------------------------------------
// 13. FONDO ANIMADO INTERACTIVO: POKÉMON JUGANDO CON POKÉBALLS
// ----------------------------------------------------------------------------
const BackgroundPlayground = {
    enabled: true,
    opacity: 0.48,
    monCount: 8,
    rafId: null,
    container: null,
    mons: [],
    balls: [],
    lastWidth: 0,
    lastHeight: 0,

    favoriteDexNums: [25, 133, 1, 4, 7, 151, 175, 39, 94, 143, 172, 158, 155, 152, 54, 52, 58, 131, 149, 197, 196, 183, 251, 249, 250, 6, 9, 3, 132, 202],

    init() {
        this.container = document.getElementById('pokemonPlaygroundBg');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'pokemonPlaygroundBg';
            this.container.className = 'fixed inset-0 pointer-events-none overflow-hidden z-0';
            document.body.prepend(this.container);
        }
        this.lastWidth = window.innerWidth || 1280;
        this.lastHeight = window.innerHeight || 800;

        window.addEventListener('resize', () => {
            this.lastWidth = window.innerWidth || 1280;
            this.lastHeight = window.innerHeight || 800;
        });

        this.spawnEntities();
        this.applyVisibility();
        this.startLoop();
    },

    applyVisibility() {
        if (!this.container) return;
        this.container.style.opacity = this.enabled ? String(this.opacity) : '0';
        this.container.style.display = this.enabled ? 'block' : 'none';
    },

    setEnabled(val) {
        this.enabled = !!val;
        this.applyVisibility();
        if (this.enabled && !this.rafId) {
            this.startLoop();
        }
    },

    setOpacity(op01) {
        this.opacity = Math.max(0.1, Math.min(0.95, parseFloat(op01) || 0.48));
        this.applyVisibility();
    },

    setMonCount(count) {
        this.monCount = Math.max(2, Math.min(18, parseInt(count, 10) || 8));
        this.spawnEntities();
    },

    randomizeSquad() {
        AudioEngine.sfxSwap();
        this.spawnEntities(true);
    },

    spawnEntities(useFullCatalog = false) {
        if (!this.container) return;
        this.container.innerHTML = '';
        this.mons = [];
        this.balls = [];

        const w = window.innerWidth || 1280;
        const h = window.innerHeight || 800;

        // 1. Crear entre 5 y 9 Pokéballs de distintos tipos que ruedan y rebotan
        const ballCount = Math.max(4, Math.floor(this.monCount * 0.75));
        const shuffledBallTypes = [...BALL_TYPES].sort(() => Math.random() - 0.5);

        for (let i = 0; i < ballCount; i++) {
            const bt = shuffledBallTypes[i % shuffledBallTypes.length];
            const el = document.createElement('div');
            el.className = ' absolute will-change-transform select-none';
            el.style.width = '36px';
            el.style.height = '36px';

            const shadowEl = document.createElement('div');
            shadowEl.style.cssText = 'position:absolute; bottom:-4px; left:6px; width:24px; height:7px; background:rgba(0,0,0,0.45); border-radius:50%; filter:blur(1px);';

            const svgWrap = document.createElement('div');
            svgWrap.innerHTML = ArtRenderer.renderBallSVG(bt.id, 34);

            el.appendChild(shadowEl);
            el.appendChild(svgWrap);
            this.container.appendChild(el);

            const angleRad = Math.random() * Math.PI * 2;
            const speed = 1.4 + Math.random() * 1.6;
            this.balls.push({
                id: i,
                typeId: bt.id,
                el,
                svgWrap,
                shadowEl,
                x: 80 + Math.random() * Math.max(200, w - 160),
                y: 80 + Math.random() * Math.max(200, h - 160),
                vx: Math.cos(angleRad) * speed,
                vy: Math.sin(angleRad) * speed,
                rot: Math.random() * 360,
                vRot: (Math.random() - 0.5) * 6,
                bounceY: 0,
                bounceVy: 0
            });
        }

        // 2. Crear los Pokémon que persiguen y se pasan las Pokéballs
        let pool = [];
        if (useFullCatalog) {
            pool = [...POKEMON_CATALOG].sort(() => Math.random() - 0.5);
        } else {
            const favSet = new Set(this.favoriteDexNums);
            const favMons = POKEMON_CATALOG.filter(p => favSet.has(p.dexNum));
            pool = [...favMons].sort(() => Math.random() - 0.5);
        }

        for (let i = 0; i < this.monCount; i++) {
            const pk = pool[i % pool.length] || POKEMON_CATALOG[i % POKEMON_CATALOG.length];
            const wrap = document.createElement('div');
            wrap.className = 'absolute will-change-transform select-none flex flex-col items-center';
            wrap.style.width = '72px';
            wrap.style.height = '72px';

            const emoteEl = document.createElement('div');
            emoteEl.style.cssText = 'font-family:"Press Start 2P",monospace; font-size:10px; color:#facc15; text-shadow:0 2px 4px #000; opacity:0; transform:translateY(0); transition:opacity 0.25s ease, transform 0.35s ease; pointer-events:none; height:14px;';
            emoteEl.textContent = '♪';

            const img = document.createElement('img');
            img.src = pk.spriteUrl;
            img.alt = pk.name;
            img.style.cssText = 'width:64px; height:64px; object-fit:contain; image-rendering:pixelated; filter:drop-shadow(0 4px 6px rgba(0,0,0,0.55));';

            const shadow = document.createElement('div');
            shadow.style.cssText = 'width:38px; height:9px; background:rgba(0,0,0,0.4); border-radius:50%; margin-top:-8px; filter:blur(1px);';

            wrap.appendChild(emoteEl);
            wrap.appendChild(img);
            wrap.appendChild(shadow);
            this.container.appendChild(wrap);

            this.mons.push({
                id: i,
                pk,
                wrap,
                img,
                emoteEl,
                x: 60 + Math.random() * Math.max(200, w - 140),
                y: 80 + Math.random() * Math.max(200, h - 160),
                vx: 0,
                vy: 0,
                baseSpeed: 1.55 + Math.random() * 1.15,
                targetBallIdx: i % this.balls.length,
                walkPhase: Math.random() * Math.PI * 2,
                jumpY: 0,
                jumpVy: 0,
                kickCooldown: Math.floor(Math.random() * 35),
                facingRight: Math.random() < 0.5,
                emoteTimer: 0
            });
        }
    },

    triggerEmote(mon, symbol) {
        if (!mon.emoteEl) return;
        mon.emoteEl.textContent = symbol;
        mon.emoteEl.style.opacity = '1';
        mon.emoteEl.style.transform = 'translateY(-8px) scale(1.15)';
        mon.emoteTimer = 38;
    },

    startLoop() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        const emotes = ['♥', '♪', '★', '!', '✨', '♫'];

        const step = () => {
            if (!this.enabled) {
                this.rafId = null;
                return;
            }

            const w = window.innerWidth || 1280;
            const h = window.innerHeight || 800;
            const margin = 48;

            // Actualizar física de las Pokéballs
            for (let i = 0; i < this.balls.length; i++) {
                const b = this.balls[i];
                b.x += b.vx;
                b.y += b.vy;

                // Rebote en bordes de la pantalla
                if (b.x < margin) { b.x = margin; b.vx = Math.abs(b.vx) * 0.92; b.vRot = b.vx * 3; }
                if (b.x > w - margin) { b.x = w - margin; b.vx = -Math.abs(b.vx) * 0.92; b.vRot = b.vx * 3; }
                if (b.y < margin + 40) { b.y = margin + 40; b.vy = Math.abs(b.vy) * 0.92; }
                if (b.y > h - margin) { b.y = h - margin; b.vy = -Math.abs(b.vy) * 0.92; }

                // Fricción suave pero manteniendo velocidad mínima de rodaje
                const speed = Math.hypot(b.vx, b.vy);
                if (speed > 2.2) {
                    b.vx *= 0.988;
                    b.vy *= 0.988;
                } else if (speed < 0.9) {
                    const ang = Math.atan2(b.vy || 0.5, b.vx || 0.5);
                    b.vx = Math.cos(ang) * 1.05;
                    b.vy = Math.sin(ang) * 1.05;
                }

                // Rebote vertical (bote en el aire tras ser golpeada por un Pokémon)
                if (b.bounceY > 0 || b.bounceVy !== 0) {
                    b.bounceY += b.bounceVy;
                    b.bounceVy -= 0.42;
                    if (b.bounceY <= 0) {
                        b.bounceY = 0;
                        if (Math.abs(b.bounceVy) > 1.6) {
                            b.bounceVy = -b.bounceVy * 0.52;
                        } else {
                            b.bounceVy = 0;
                        }
                    }
                }

                b.rot = (b.rot + b.vx * 3.4) % 360;
                b.el.style.transform = `translate3d(${b.x - 18}px, ${b.y - 18}px, 0)`;
                b.svgWrap.style.transform = `translateY(${-b.bounceY}px) rotate(${b.rot}deg)`;
                const sScale = Math.max(0.55, 1 - b.bounceY / 65);
                b.shadowEl.style.transform = `scale(${sScale})`;
            }

            // Actualizar movimiento e interacción de los Pokémon
            for (let i = 0; i < this.mons.length; i++) {
                const m = this.mons[i];
                if (m.kickCooldown > 0) m.kickCooldown--;
                if (m.emoteTimer > 0) {
                    m.emoteTimer--;
                    if (m.emoteTimer === 0 && m.emoteEl) {
                        m.emoteEl.style.opacity = '0';
                        m.emoteEl.style.transform = 'translateY(0) scale(1)';
                    }
                }

                let targetBall = this.balls[m.targetBallIdx];
                if (!targetBall) {
                    m.targetBallIdx = 0;
                    targetBall = this.balls[0];
                }

                // Cambiar de objetivo ocasionalmente hacia la Pokéball más cercana
                if (Math.random() < 0.008 && this.balls.length > 1) {
                    let bestIdx = m.targetBallIdx;
                    let bestDist = 999999;
                    this.balls.forEach((cand, cIdx) => {
                        const d = Math.hypot(cand.x - m.x, cand.y - m.y);
                        if (d < bestDist) {
                            bestDist = d;
                            bestIdx = cIdx;
                        }
                    });
                    m.targetBallIdx = bestIdx;
                    targetBall = this.balls[bestIdx];
                }

                if (targetBall) {
                    const dx = targetBall.x - m.x;
                    const dy = targetBall.y - m.y;
                    const dist = Math.hypot(dx, dy) || 1;

                    const desiredVx = (dx / dist) * m.baseSpeed;
                    const desiredVy = (dy / dist) * m.baseSpeed;
                    m.vx += (desiredVx - m.vx) * 0.08;
                    m.vy += (desiredVy - m.vy) * 0.08;

                    m.x += m.vx;
                    m.y += m.vy;

                    if (Math.abs(m.vx) > 0.15) {
                        m.facingRight = m.vx > 0;
                    }

                    // ¡El Pokémon alcanza la Pokéball y juega con ella!
                    if (dist < 42 && m.kickCooldown === 0) {
                        m.kickCooldown = 50 + Math.floor(Math.random() * 35);
                        m.jumpVy = 5.4;

                        // 65% de probabilidad de pasarle la Pokéball a otro Pokémon compañero
                        let kickAngle;
                        if (this.mons.length > 1 && Math.random() < 0.65) {
                            const mate = this.mons[(i + 1 + Math.floor(Math.random() * (this.mons.length - 1))) % this.mons.length];
                            kickAngle = Math.atan2(mate.y - targetBall.y, mate.x - targetBall.x) + (Math.random() - 0.5) * 0.35;
                        } else {
                            kickAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.1;
                        }

                        const kickPower = 4.2 + Math.random() * 2.4;
                        targetBall.vx = Math.cos(kickAngle) * kickPower;
                        targetBall.vy = Math.sin(kickAngle) * kickPower;
                        targetBall.bounceVy = 6.2 + Math.random() * 2.5;

                        this.triggerEmote(m, emotes[Math.floor(Math.random() * emotes.length)]);

                        // A veces cambia a perseguir otra Pokéball después de pasarla
                        if (Math.random() < 0.45 && this.balls.length > 1) {
                            m.targetBallIdx = (m.targetBallIdx + 1) % this.balls.length;
                        }
                    }
                }

                // Salto de celebración del Pokémon
                if (m.jumpY > 0 || m.jumpVy !== 0) {
                    m.jumpY += m.jumpVy;
                    m.jumpVy -= 0.45;
                    if (m.jumpY <= 0) {
                        m.jumpY = 0;
                        m.jumpVy = 0;
                    }
                }

                m.walkPhase += 0.16;
                const bobY = Math.abs(Math.sin(m.walkPhase)) * 6;
                const tiltDeg = Math.sin(m.walkPhase) * 5;
                const flipX = m.facingRight ? -1 : 1;

                m.wrap.style.transform = `translate3d(${m.x - 36}px, ${m.y - 42}px, 0)`;
                m.img.style.transform = `translateY(${-(bobY + m.jumpY)}px) scaleX(${flipX}) rotate(${tiltDeg}deg)`;
            }

            this.rafId = requestAnimationFrame(step);
        };

        this.rafId = requestAnimationFrame(step);
    }
};

// ----------------------------------------------------------------------------
// 14. GESTOR DE AJUSTES DEL JUEGO (VOLUMEN BGM/SFX, ESCALA UI, PALETAS, FONDO)
// ----------------------------------------------------------------------------
const SettingsManager = {
    storageKey: 'gachakemon_settings_v26',
    palettes: [
        {
            id: 'default',
            name: 'Neo Arcade (Clásico)',
            desc: 'Azul noche profundo con bordes cian neón y oro.',
            swatches: ['#0b0f19', '#1e293b', '#38bdf8', '#facc15']
        },
        {
            id: 'kanto_red',
            name: 'Edición Rojo Fuego',
            desc: 'Carmesí volcánico inspirado en Charizard y ardor de Kanto.',
            swatches: ['#1a0707', '#2e1111', '#f97316', '#facc15']
        },
        {
            id: 'kanto_blue',
            name: 'Edición Azul Agua',
            desc: 'Abismo oceánico inspirado en Blastoise e Islas Espuma.',
            swatches: ['#041426', '#0c2642', '#00f5d4', '#60a5fa']
        },
        {
            id: 'gameboy',
            name: 'Game Boy Clásica (DMG-01)',
            desc: 'Estética retro verde oliva inspirada en la portátil de 1989.',
            swatches: ['#0c1f0c', '#1a381a', '#8bac0f', '#9bbc0f']
        },
        {
            id: 'team_rocket',
            name: 'Guarida Team Rocket',
            desc: 'Negro obsidiana con púrpura neón y alertas rojas.',
            swatches: ['#090414', '#1d1033', '#c084fc', '#ef4444']
        },
        {
            id: 'safari_zone',
            name: 'Zona Safari (Bosque Verde)',
            desc: 'Verde selva esmeralda con acentos tierra y ámbar.',
            swatches: ['#061c14', '#103326', '#34d399', '#fbbf24']
        }
    ],

    fontStyles: [
        { id: 'gba_classic', name: 'Pokémon GBA / DS (Pixelify + Silkscreen)', desc: 'Inspirada en los cuadros de diálogo de Rojo Fuego, Esmeralda y Platino. Muy legible.' },
        { id: 'rpg_clean', name: 'RPG Táctico HD (Chakra Petch)', desc: 'Tipografía técnica limpia de alto contraste para lectura rápida.' },
        { id: 'arcade_8bit', name: 'Arcade 8-Bit (Press Start 2P)', desc: 'Estilo recreativa retro de bloques cuadrados.' }
    ],

    current: {
        bgmVolume: 70,
        sfxVolume: 85,
        uiScale: 100,
        palette: 'default',
        fontStyle: 'gba_classic',
        bgEnabled: true,
        bgOpacity: 48,
        bgCount: 8,
        crtEnabled: true
    },

    init() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.current = { ...this.current, ...parsed };
            }
        } catch (e) {}

        BackgroundPlayground.init();
        this.applyAll(false);
        this.renderSettingsModalControls();
    },

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.current));
        } catch (e) {}
    },

    applyAll(saveToStorage = true) {
        // 1. Volúmenes de Música (BGM) y Efectos (SFX)
        AudioEngine.setBgmVolume(this.current.bgmVolume / 100);
        AudioEngine.setSfxVolume(this.current.sfxVolume / 100);

        // 2. Tamaño de la UI (Escala rem en raíz HTML)
        const scaleRatio = (this.current.uiScale || 100) / 100;
        document.documentElement.style.fontSize = `${16 * scaleRatio}px`;

        // 3. Paleta de colores y Fuente Tipográfica
        this.palettes.forEach(p => {
            document.body.classList.remove('theme-' + p.id);
        });
        document.body.classList.add('theme-' + (this.current.palette || 'default'));

        this.fontStyles.forEach(f => {
            document.body.classList.remove('font-mode-' + f.id);
        });
        document.body.classList.add('font-mode-' + (this.current.fontStyle || 'gba_classic'));

        // 4. Fondo animado de Pokémon jugando con Pokéballs
        BackgroundPlayground.setEnabled(this.current.bgEnabled);
        BackgroundPlayground.setOpacity(this.current.bgOpacity / 100);
        if (BackgroundPlayground.monCount !== this.current.bgCount) {
            BackgroundPlayground.setMonCount(this.current.bgCount);
        }

        // 5. Filtro Monitor CRT
        const crtEl = document.getElementById('crtLayer');
        if (crtEl) {
            crtEl.classList.toggle('hidden', !this.current.crtEnabled);
        }

        if (saveToStorage) this.save();
        this.syncSettingsLabels();
    },

    setBgmVolume(val) {
        this.current.bgmVolume = parseInt(val, 10) || 0;
        AudioEngine.setBgmVolume(this.current.bgmVolume / 100);
        this.save();
        this.syncSettingsLabels();
    },

    setSfxVolume(val) {
        this.current.sfxVolume = parseInt(val, 10) || 0;
        AudioEngine.setSfxVolume(this.current.sfxVolume / 100);
        this.save();
        this.syncSettingsLabels();
    },

    testSfxSound() {
        AudioEngine.sfxCoin();
    },

    setUiScale(val) {
        this.current.uiScale = Math.max(80, Math.min(120, parseInt(val, 10) || 100));
        this.applyAll(true);
        this.renderSettingsModalControls();
    },

    setPalette(paletteId) {
        AudioEngine.sfxClick();
        this.current.palette = paletteId;
        this.applyAll(true);
        this.renderSettingsModalControls();
    },

    setFontStyle(fontId) {
        AudioEngine.sfxClick();
        this.current.fontStyle = fontId;
        this.applyAll(true);
        this.renderSettingsModalControls();
    },

    toggleBgEnabled(checked) {
        AudioEngine.sfxClick();
        this.current.bgEnabled = !!checked;
        this.applyAll(true);
        this.renderSettingsModalControls();
    },

    setBgOpacity(val) {
        this.current.bgOpacity = Math.max(10, Math.min(95, parseInt(val, 10) || 48));
        this.applyAll(true);
    },

    setBgCount(count) {
        AudioEngine.sfxClick();
        this.current.bgCount = parseInt(count, 10) || 8;
        BackgroundPlayground.setMonCount(this.current.bgCount);
        this.save();
        this.renderSettingsModalControls();
    },

    toggleCrt(checked) {
        AudioEngine.sfxClick();
        this.current.crtEnabled = !!checked;
        this.applyAll(true);
        this.renderSettingsModalControls();
    },

    resetDefaults() {
        AudioEngine.sfxSwap();
        this.current = {
            bgmVolume: 70,
            sfxVolume: 85,
            uiScale: 100,
            palette: 'default',
            fontStyle: 'gba_classic',
            bgEnabled: true,
            bgOpacity: 48,
            bgCount: 8,
            crtEnabled: true
        };
        BackgroundPlayground.setMonCount(8);
        this.applyAll(true);
        this.renderSettingsModalControls();
    },

    syncSettingsLabels() {
        const bgmLbl = document.getElementById('labelBgmVol');
        if (bgmLbl) bgmLbl.textContent = `${this.current.bgmVolume}%`;
        const sfxLbl = document.getElementById('labelSfxVol');
        if (sfxLbl) sfxLbl.textContent = `${this.current.sfxVolume}%`;
        const scaleLbl = document.getElementById('labelUiScale');
        if (scaleLbl) scaleLbl.textContent = `${this.current.uiScale}%`;
        const bgOpLbl = document.getElementById('labelBgOpacity');
        if (bgOpLbl) bgOpLbl.textContent = `${this.current.bgOpacity}%`;
    },

    renderSettingsModalControls() {
        const bgmSlider = document.getElementById('sliderBgmVol');
        if (bgmSlider) bgmSlider.value = this.current.bgmVolume;
        const sfxSlider = document.getElementById('sliderSfxVol');
        if (sfxSlider) sfxSlider.value = this.current.sfxVolume;
        const scaleSlider = document.getElementById('sliderUiScale');
        if (scaleSlider) scaleSlider.value = this.current.uiScale;
        const bgOpSlider = document.getElementById('sliderBgOpacity');
        if (bgOpSlider) bgOpSlider.value = this.current.bgOpacity;

        const chkBg = document.getElementById('chkBgEnabled');
        if (chkBg) chkBg.checked = this.current.bgEnabled;
        const chkCrt = document.getElementById('chkCrtEnabled');
        if (chkCrt) chkCrt.checked = this.current.crtEnabled;

        this.syncSettingsLabels();

        // Botones de escala rápida
        const scalePresetsEl = document.getElementById('uiScalePresets');
        if (scalePresetsEl) {
            const presets = [
                { val: 85, label: 'Compacto (85%)' },
                { val: 95, label: 'Ajustado (95%)' },
                { val: 100, label: 'Normal (100%)' },
                { val: 108, label: 'Grande (108%)' },
                { val: 115, label: 'XL (115%)' }
            ];
            scalePresetsEl.innerHTML = presets.map(p => `
                <button onclick="SettingsManager.setUiScale(${p.val})"
                        class="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${this.current.uiScale === p.val ? 'bg-yellow-500 text-slate-950 border-yellow-300 shadow' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'}">
                    ${p.label}
                </button>
            `).join('');
        }

        // Botones de cantidad de Pokémon en fondo animado
        const bgCountEl = document.getElementById('bgCountPresets');
        if (bgCountEl) {
            const counts = [
                { val: 4, label: '4 Pokémon (Relax)' },
                { val: 8, label: '8 Pokémon (Normal)' },
                { val: 14, label: '14 Pokémon (Fiesta)' }
            ];
            bgCountEl.innerHTML = counts.map(c => `
                <button onclick="SettingsManager.setBgCount(${c.val})"
                        class="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${this.current.bgCount === c.val ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'}">
                    ${c.label}
                </button>
            `).join('');
        }

        // Selector de Fuente Tipográfica
        const fontsGrid = document.getElementById('settingsFontsGrid');
        if (fontsGrid) {
            fontsGrid.innerHTML = this.fontStyles.map(f => {
                const isSel = (this.current.fontStyle || 'gba_classic') === f.id;
                return `
                <div onclick="SettingsManager.setFontStyle('${f.id}')"
                     class="cursor-pointer p-3 rounded-xl border-2 transition flex flex-col justify-between ${isSel ? 'border-cyan-400 bg-cyan-500/15 shadow-lg' : 'border-slate-700 bg-slate-950 hover:border-slate-500'}">
                    <div class="flex items-center justify-between gap-1 mb-1">
                        <span class="font-bold text-xs ${isSel ? 'text-cyan-300' : 'text-white'}">${f.name}</span>
                        ${isSel ? '<span class="text-[10px] font-pixel text-emerald-400">✓ ACTIVA</span>' : ''}
                    </div>
                    <p class="text-[11px] text-slate-300 leading-snug">${f.desc}</p>
                </div>`;
            }).join('');
        }

        // Grid de paletas de colores
        const palettesGrid = document.getElementById('settingsPalettesGrid');
        if (palettesGrid) {
            palettesGrid.innerHTML = this.palettes.map(pal => {
                const isSel = this.current.palette === pal.id;
                return `
                <div onclick="SettingsManager.setPalette('${pal.id}')"
                     class="cursor-pointer p-3 rounded-xl border-2 transition flex flex-col justify-between gap-2 ${isSel ? 'border-yellow-400 bg-yellow-500/15 shadow-lg' : 'border-slate-700 bg-slate-950 hover:border-slate-500'}">
                    <div>
                        <div class="flex items-center justify-between gap-1">
                            <span class="font-bold text-xs ${isSel ? 'text-yellow-300' : 'text-white'}">${pal.name}</span>
                            ${isSel ? '<span class="text-[10px] font-pixel text-emerald-400">✓ ACTIVA</span>' : ''}
                        </div>
                        <p class="text-[11px] text-slate-400 mt-0.5 leading-snug">${pal.desc}</p>
                    </div>
                    <div class="flex items-center gap-1.5 pt-1">
                        ${pal.swatches.map(hex => `<span class="w-6 h-4 rounded border border-white/20 inline-block" style="background:${hex}"></span>`).join('')}
                    </div>
                </div>`;
            }).join('');
        }
    }
};


// ----------------------------------------------------------------------------
// 15. SISTEMA DE REPORTE DE BUGS (TIPO BICHO / CATERPIE & SCIZOR QA)
// ----------------------------------------------------------------------------
const BugReporter = {
    storageKey: 'gachakemon_bug_reports_v27',

    getReports() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    saveReports(list) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(list));
        } catch (e) {}
    },

    buildDiagnosticsSnapshot() {
        const st = GameController.state;
        if (!st) {
            return {
                screen: 'Menú Principal / Lobby',
                round: '-',
                phase: '-',
                activePlayer: '-',
                hopperRemaining: 60,
                effectDeckRemaining: 47,
                uiScale: SettingsManager.current.uiScale + '%',
                palette: SettingsManager.current.palette,
                fontStyle: SettingsManager.current.fontStyle
            };
        }
        const activeP = st.players[st.turnPlayerIdx];
        return {
            screen: st.safariState ? 'Fase de Safari' : 'Tablero de Partida',
            mode: st.mode,
            round: st.round,
            phase: st.phase,
            activePlayer: activeP ? `${activeP.name} (${activeP.yen} P¥, ${activeP.tray.length} balls libres, ${activeP.hand.length} cartas)` : '-',
            hopperRemaining: st.hopper.length,
            effectDeckRemaining: st.effectDeck.length,
            uiScale: SettingsManager.current.uiScale + '%',
            palette: SettingsManager.current.palette,
            fontStyle: SettingsManager.current.fontStyle
        };
    },

    refreshModal() {
        const snap = this.buildDiagnosticsSnapshot();
        const diagEl = document.getElementById('bugDiagnosticBox');
        if (diagEl) {
            diagEl.innerHTML = `
                <div><span class="text-slate-400">Pantalla:</span> <strong class="text-lime-300">${snap.screen}</strong></div>
                <div><span class="text-slate-400">Ronda / Fase:</span> <strong class="text-white">R${snap.round} • Fase ${snap.phase}</strong></div>
                <div><span class="text-slate-400">Jugador Activo:</span> <strong class="text-yellow-300">${snap.activePlayer}</strong></div>
                <div><span class="text-slate-400">Tolva / Mazo Efectos:</span> <strong class="text-cyan-300">${snap.hopperRemaining}/60 balls • ${snap.effectDeckRemaining} cartas</strong></div>
            `;
        }
        this.renderSavedReportsList();
    },

    submitBugReport() {
        const catEl = document.getElementById('bugCategorySelect');
        const sevEl = document.getElementById('bugSeveritySelect');
        const descEl = document.getElementById('bugDescriptionInput');
        const stepsEl = document.getElementById('bugStepsInput');

        const desc = (descEl ? descEl.value : '').trim();
        if (!desc) {
            UI.showAlert('Descripción Requerida', 'Por favor, describe brevemente el bug o comportamiento inesperado que has encontrado.', '🐛');
            return;
        }

        const report = {
            id: 'BUG-' + Date.now().toString().slice(-5),
            date: new Date().toLocaleString('es-ES'),
            category: catEl ? catEl.value : 'Mecánica de Juego',
            severity: sevEl ? sevEl.value : 'Moderado',
            description: desc,
            steps: (stepsEl ? stepsEl.value : '').trim() || 'No especificados',
            diagnostics: this.buildDiagnosticsSnapshot()
        };

        const list = this.getReports();
        list.unshift(report);
        this.saveReports(list);

        const formattedText = [
            `=== 🐞 REPORTE DE BUG GACHAKÉMON (${report.id}) ===`,
            `Fecha: ${report.date}`,
            `Categoría: ${report.category} | Severidad: ${report.severity}`,
            `Descripción: ${report.description}`,
            `Pasos para reproducir: ${report.steps}`,
            `Diagnóstico Técnico: Pantalla=${report.diagnostics.screen} | Ronda=${report.diagnostics.round} | Fase=${report.diagnostics.phase} | Jugador=${report.diagnostics.activePlayer} | Tolva=${report.diagnostics.hopperRemaining}/60 | Escala=${report.diagnostics.uiScale}`
        ].join('\n');

        try {
            navigator.clipboard?.writeText(formattedText);
        } catch (e) {}

        if (descEl) descEl.value = '';
        if (stepsEl) stepsEl.value = '';

        AudioEngine.sfxCaptureSuccess();
        this.renderSavedReportsList();
        UI.showAlert(
            `¡REPORTE ${report.id} REGISTRADO!`,
            `El bug se ha guardado en el registro Tipo Bicho y se ha copiado automáticamente a tu portapapeles listo para pegar.`,
            '🐞'
        );
    },

    deleteReport(id) {
        AudioEngine.sfxClick();
        const list = this.getReports().filter(r => r.id !== id);
        this.saveReports(list);
        this.renderSavedReportsList();
    },

    downloadAllReportsTxt() {
        const list = this.getReports();
        if (list.length === 0) {
            UI.showAlert('Sin Reportes', 'Todavía no hay reportes de bugs guardados para exportar.', '🐛');
            return;
        }
        const content = list.map(r => [
            `====================================================`,
            `ID: ${r.id} | Fecha: ${r.date}`,
            `Categoría: ${r.category} | Severidad: ${r.severity}`,
            `Descripción: ${r.description}`,
            `Pasos: ${r.steps}`,
            `Estado: ${JSON.stringify(r.diagnostics)}`
        ].join('\n')).join('\n\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gachakemon_bug_reports_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    },

    renderSavedReportsList() {
        const container = document.getElementById('bugSavedReportsList');
        const counter = document.getElementById('bugSavedCountBadge');
        if (!container) return;

        const list = this.getReports();
        if (counter) counter.textContent = `${list.length} guardado(s)`;

        if (list.length === 0) {
            container.innerHTML = `<div class="text-xs text-slate-500 italic py-3 text-center">No hay bugs registrados todavía. ¡Los Cazabichos están atentos!</div>`;
            return;
        }

        container.innerHTML = list.map(r => `
            <div class="bg-slate-900 border border-lime-500/30 rounded-lg p-2.5 flex items-start justify-between gap-2">
                <div class="space-y-0.5">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="font-pixel text-[10px] text-lime-400">${r.id}</span>
                        <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-lime-950 text-lime-300 border border-lime-700">${r.category}</span>
                        <span class="text-[10px] text-slate-400">${r.date} • ${r.severity}</span>
                    </div>
                    <p class="text-xs text-white font-semibold mt-1">${r.description}</p>
                    <div class="text-[11px] text-slate-400">Pasos: ${r.steps}</div>
                </div>
                <button onclick="BugReporter.deleteReport('${r.id}')" class="text-slate-500 hover:text-red-400 text-xs px-1.5" title="Eliminar reporte">
                    <i class="fas fa-trash-can"></i>
                </button>
            </div>
        `).join('');
    }
};

window.AudioEngine = AudioEngine;
window.BugReporter = BugReporter;
window.BackgroundPlayground = BackgroundPlayground;
window.SettingsManager = SettingsManager;
window.UI = UI;
window.Lobby = Lobby;
window.OnlineManager = OnlineManager;
window.GameController = GameController;

window.addEventListener('DOMContentLoaded', () => {
    Lobby.init();
});
