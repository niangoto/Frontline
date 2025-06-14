// Constants
const PLAYER_COLORS = ["#FF0000", "#0000FF"];
const UNIT_RADIUS = 15;
const ARROW_LENGTH = 50;
const INITIAL_POINTS = 90;
const FRONT_LINE_COLOR = "#000000";
const BG_COLOR = "#F0F0F0";
const BUTTON_COLOR = "#64C864";
const BUTTON_TEXT_COLOR = "#FFFFFF";
const MAX_MOVE_DISTANCE = 30;
const MIN_DISTANCE_TO_FRONT = UNIT_RADIUS * 1.5;
const MOVE_SPEED = 3;
const MAX_UNITS = 50;  // New constant for maximum units
const MAX_TURNS = 15;  // New constant for maximum turns
const CAPITAL_RADIUS = UNIT_RADIUS;  // Now same size as units
const CAPITAL_COLOR = "#FFD700";
const SELECTION_COLOR = "#00FF00";
const SELECTION_LINE_WIDTH = 2;
const SELECTED_UNIT_COLOR = "#00FF00";
const SELECTED_UNIT_LINE_WIDTH = 3;
// Пример: границата е между lat1 и lat2 (север-юг), canvas.height = 600
const LAT1 = 54.8; // северна граница (пример)
const LAT2 = 50.3; // южна граница (пример)

// Начално положение на фронтовата линия (географски координати)

function latToY(lat) {
    // Преобразува latitude към y в canvas
    [16.0, 53.5],
    [18.0, 53.0],
    [20.0, 52.5],
    [22.0, 51.5],
    [23.5, 50.3]  // югоизток
}

function latToY(lat) {
    // Преобразува latitude към y в canvas
    return ((LAT1 - lat) / (LAT1 - LAT2)) * canvas.height;
}
function yToLat(y) {
    // Преобразува y в latitude
    return LAT1 - (y / canvas.height) * (LAT1 - LAT2);
}
function geoToCanvas([lon, lat]) {
    // longitude -> x, latitude -> y
    // Пример: x = (lon - LON1) / (LON2 - LON1) * canvas.width
    const LON1 = 14.0; // западна граница (пример)
    const LON2 = 24.0; // източна граница (пример)
    let x = ((lon - LON1) / (LON2 - LON1)) * canvas.width;
    let y = latToY(lat);
    return [x, y];
}
// Game class definition should come before any usage
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.frontLine = [];
        this.playerUnits = [[], []];
        this.currentPlayer = 0;
        this.selectedUnit = null;
        this.phase = "settings";
        this.battlePhase = false;
        this.turnCount = 0;
        this.maxTurns = 3;
        this.maxUnits = 10;
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw territories
        if (this.frontLine.length > 1) {
            // Draw red territory
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            for (const point of this.frontLine) {
                this.ctx.lineTo(point[0], point[1]);
            }
            this.ctx.lineTo(0, this.canvas.height);
            this.ctx.closePath();
            this.ctx.fillStyle = '#ffcccc';
            this.ctx.fill();

            // Draw blue territory
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width, 0);
            for (const point of this.frontLine) {
                this.ctx.lineTo(point[0], point[1]);
            }
            this.ctx.lineTo(this.canvas.width, this.canvas.height);
            this.ctx.closePath();
            this.ctx.fillStyle = '#ccceff';
            this.ctx.fill();

            // Draw front line
            this.ctx.beginPath();
            this.ctx.moveTo(this.frontLine[0][0], this.frontLine[0][1]);
            for (const point of this.frontLine) {
                this.ctx.lineTo(point[0], point[1]);
            }
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Draw points on front line
            for (const point of this.frontLine) {
                this.ctx.beginPath();
                this.ctx.arc(point[0], point[1], 3, 0, Math.PI * 2);
                this.ctx.fillStyle = '#000000';
                this.ctx.fill();
            }
        }

        // Draw units
        for (let player = 0; player < 2; player++) {
            // Skip drawing red units during blue's placement phase
            if (this.phase === "placement" && player === 0 && this.currentPlayer === 1) {
                continue;
            }

            for (const unit of this.playerUnits[player]) {
                unit.draw(this.ctx, unit === this.selectedUnit);
            }
        }

        // Update game info
        const gameInfo = document.getElementById('game-info');
        if (this.phase === "placement") {
            gameInfo.textContent = `Играч ${this.currentPlayer + 1}: Поставяне на единици (${this.playerUnits[this.currentPlayer].length}/${this.maxUnits})`;
        } else if (this.phase.endsWith("_arrows")) {
            gameInfo.textContent = `Играч ${this.currentPlayer + 1}: Задаване на посоки`;
        }
    }
}

// DOM elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gameInfo = document.getElementById('game-info');
const readyBtn = document.getElementById('ready-btn');
const settingsModal = document.getElementById('settings-modal');
const turnInput = document.getElementById('turn-input');
const confirmBtn = document.getElementById('confirm-btn');

// Create game instance
let game = new Game(canvas);

// Инициализация на играта
let gameData = {
    playerUnits: [[], []],
    frontLine: [],
    selectedUnit: null,
    phase: "placement",
    currentPlayer: 0,
    battlePhase: false,
    turnCount: 0,
    showArrows: true,
    maxTurns: 3,
    originalYPositions: [],
    initialSpacing: 0,
    capitals: [null, null], // Store capital positions for each player
    selectionStart: null,
    selectionEnd: null,
    selectedUnits: []
};

// Клас Unit
class Unit {
    constructor(player, x, y) {
        this.player = player;
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.prevX = x;
        this.prevY = y;
        this.direction = null;
        this.assignedPoints = [];  // Инициализираме масива тук
        this.forwardMoves = 0;
        this.totalPoints = 0;
        this.partialPoints = 0;
        this.blueArrow = null;
        this.isMoving = false;
        this.moveProgress = 0;
        this.blockedByFront = false;
        this.beingPushed = false;
        this.pushTargetX = x;
        this.pushTargetY = y;
        this.pushProgress = 0;
    }

    updatePosition() {
        // Първо обработваме избутването
        if (this.beingPushed) {
            this.x = this.prevX + (this.pushTargetX - this.prevX) * this.pushProgress;
            this.y = this.prevY + (this.pushTargetY - this.prevY) * this.pushProgress;
            this.pushProgress = Math.min(1.0, this.pushProgress + MOVE_SPEED / 10);
            
            // Check distance from front line after being pushed
            let tooClose = false;
            for (let point of gameData.frontLine) {
                let dist = Math.sqrt((this.x - point[0])**2 + (this.y - point[1])**2);
                if (dist < UNIT_RADIUS) {
                    tooClose = true;
                    break;
                }
            }
            
            // Remove unit if too close to front line
            if (tooClose) {
                gameData.playerUnits[this.player] = gameData.playerUnits[this.player].filter(u => u !== this);
                return;
            }
            
            if (this.pushProgress >= 1.0) {
                this.beingPushed = false;
                this.prevX = this.x;
                this.prevY = this.y;
                // Актуализираме и целевите позиции ако има активно движение
                if (this.isMoving) {
                    this.targetX += (this.pushTargetX - this.prevX);
                    this.targetY += (this.pushTargetY - this.prevY);
                }
            }
            return;
        }
        
        if (this.isMoving) {
            // Изчисляваме потенциалните нови координати
            let newX = this.prevX + (this.targetX - this.prevX) * this.moveProgress;
            let newY = this.prevY + (this.targetY - this.prevY) * this.moveProgress;
            
            // Вектор на движение
            let moveDirX = this.targetX - this.prevX;
            let moveDirY = this.targetY - this.prevY;
            let moveLen = Math.sqrt(moveDirX**2 + moveDirY**2);
            
            if (moveLen > 0.001) {
                moveDirX /= moveLen;
                moveDirY /= moveLen;
            }
            
            // Проверка за разстояние до фронтовата линия
            let tooClose = false;
            let closestDist = Infinity;
            let closestPoint = null;
            
            for (let point of gameData.frontLine) {
                let dist = Math.sqrt((newX - point[0])**2 + (newY - point[1])**2);
                if (dist < MIN_DISTANCE_TO_FRONT) {
                    tooClose = true;
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestPoint = point;
                    }
                }
            }
            
            if (!tooClose) {
                // Свободно движение
                this.x = newX;
                this.y = newY;
                this.moveProgress = Math.min(1.0, this.moveProgress + MOVE_SPEED / (moveLen + 0.1));
            } else {
                // Проверяваме дали се приближаваме или отдалечаваме от точката
                if (closestPoint) {
                    // Вектор към най-близката точка от фронта
                    let toPointX = closestPoint[0] - this.x;
                    let toPointY = closestPoint[1] - this.y;
                    
                    // Скаларно произведение
                    let dotProduct = moveDirX * toPointX + moveDirY * toPointY;
                    
                    if (dotProduct <= 0) {
                        // Позволяваме движение
                        this.x = newX;
                        this.y = newY;
                        this.moveProgress = Math.min(1.0, this.moveProgress + MOVE_SPEED / (moveLen + 0.1));
                    } else {
                        // Спираме движението
                        this.blockedByFront = true;
                        this.isMoving = false;
                    }
                } else {
                    this.blockedByFront = true;
                    this.isMoving = false;
                }
            }
            
            if (this.moveProgress >= 1.0) {
                this.isMoving = false;
            }
        }
    }

    draw(selected = false, showArrows = true) {
        // Рисуване на единицата
        ctx.beginPath();
        ctx.arc(this.x, this.y, UNIT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = PLAYER_COLORS[this.player];
        ctx.fill();
        
        // Дебел зелен контур за маркирани единици
        if (gameData.selectedUnits.includes(this)) {
            ctx.strokeStyle = SELECTED_UNIT_COLOR;
            ctx.lineWidth = SELECTED_UNIT_LINE_WIDTH;
            ctx.stroke();
            ctx.lineWidth = 1;
        } else {
            ctx.strokeStyle = PLAYER_COLORS[this.player];
            ctx.stroke();
        }
        
        if (showArrows) {
            // Синя стрелка
            if (this.blueArrow) {
                let [endX, endY] = this.blueArrow;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = "#0000FF";
                ctx.lineWidth = 2;
                ctx.stroke();
                
                let angle = Math.atan2(endY - this.y, endX - this.x);
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - 10 * Math.cos(angle - Math.PI/6),
                    endY - 10 * Math.sin(angle - Math.PI/6)
                );
                ctx.lineTo(
                    endX - 10 * Math.cos(angle + Math.PI/6),
                    endY - 10 * Math.sin(angle + Math.PI/6)
                );
                ctx.closePath();
                ctx.fillStyle = "#0000FF";
                ctx.fill();
                ctx.lineWidth = 1;
            }
            // Черна стрелка
            else if (this.direction !== null && !this.isMoving) {
                let endX = this.x + ARROW_LENGTH * Math.cos(this.direction);
                let endY = this.y + ARROW_LENGTH * Math.sin(this.direction);
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = "#000000";
                ctx.lineWidth = 2;
                ctx.stroke();
                
                let angle = Math.atan2(endY - this.y, endX - this.x);
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - 10 * Math.cos(angle - Math.PI/6),
                    endY - 10 * Math.sin(angle - Math.PI/6)
                );
                ctx.lineTo(
                    endX - 10 * Math.cos(angle + Math.PI/6),
                    endY - 10 * Math.sin(angle + Math.PI/6)
                );
                ctx.closePath();
                ctx.fillStyle = "#000000";
                ctx.fill();
                ctx.lineWidth = 1;
            }
        }
    }
}

// Инициализация на фронтовата линия
function initializeFrontLine() {
    const POINTS_COUNT = 90;
    let mapType = "classic";
    const mapSelect = document.getElementById('map-select');
    if (mapSelect) {
        mapType = mapSelect.value;
    }

    if (
        mapType === "custom" &&
        typeof INITIAL_FRONTLINE !== "undefined" &&
        Array.isArray(INITIAL_FRONTLINE)
    ) {
        // Използвай точките от INITIAL_FRONTLINE (canvas координати)
        let frontLine = interpolateFrontLine(INITIAL_FRONTLINE, POINTS_COUNT);
        fillFrontLineEnds(frontLine, canvas.height / POINTS_COUNT, canvas);
        gameData.frontLine = frontLine;

        // Изчисли новото spacing за динамична корекция
        let totalLen = 0;
        for (let i = 1; i < gameData.frontLine.length; i++) {
            let dx = gameData.frontLine[i][0] - gameData.frontLine[i-1][0];
            let dy = gameData.frontLine[i][1] - gameData.frontLine[i-1][1];
            totalLen += Math.sqrt(dx*dx + dy*dy);
        }
        gameData.initialSpacing = totalLen / (gameData.frontLine.length - 1);
        gameData.originalYPositions = gameData.frontLine.map(([x, y]) => y);
    } else {
        // Класическа права линия
        gameData.initialSpacing = canvas.height / POINTS_COUNT;
        gameData.originalYPositions = Array.from({ length: POINTS_COUNT }, (_, i) => (i + 1) * gameData.initialSpacing);
        gameData.frontLine = gameData.originalYPositions.map(y => [canvas.width / 2, y]);
        // Първата точка най-горе, последната най-долу
        gameData.frontLine[0][1] = 0;
        gameData.frontLine[gameData.frontLine.length - 1][1] = canvas.height;
    }
}

// Проверка за поставяне на единица
function handlePlacement(pos) {
    let [x, y] = pos;
    let player = gameData.currentPlayer;
    
    // Проверка за столица
    if (!gameData.capitals[player]) {
        return handleCapitalPlacement(pos);
    }

    // Проверка за премахване на съществуваща единица
    for (let i = 0; i < gameData.playerUnits[player].length; i++) {
        let unit = gameData.playerUnits[player][i];
        if (Math.sqrt((x - unit.x)**2 + (y - unit.y)**2) <= UNIT_RADIUS) {
            gameData.playerUnits[player].splice(i, 1);
            return true;
        }
    }
    
    // Проверка за максимален брой единици
    if (gameData.playerUnits[player].length >= gameData.maxUnits) {
        return false;
    }
    
    // Проверка за разстояние от фронтова линия
    let minDistance = UNIT_RADIUS * 1.5;
    for (let point of gameData.frontLine) {
        if (Math.sqrt((x - point[0])**2 + (y - point[1])**2) < minDistance) {
            return false;
        }
    }
    
    // Проверка за разстояние от други единици
    for (let unit of gameData.playerUnits[player]) {
        if (Math.sqrt((x - unit.x)**2 + (y - unit.y)**2) < UNIT_RADIUS * 2) {
            return false;
        }
    }
    
    // Проверка за разстояние от столицата
    if (gameData.capitals[player]) {
        let capital = gameData.capitals[player];
        if (Math.sqrt((x - capital[0])**2 + (y - capital[1])**2) < UNIT_RADIUS * 2) {
            return false;
        }
    }
    
    if (!isInOwnTerritory(player, x, y)) {
        return false;
    }
    
    let newUnit = new Unit(player, x, y);
    gameData.playerUnits[player].push(newUnit);
    return true;
}
function handleArrowSelection(pos, button) {
    let [x, y] = pos;
    
    // Проверяваме дали имаме вече избрана единица
    if (gameData.selectedUnit) {
        handleArrowDirection(pos, button);
        return true;
    }
    
    // Търсим единица под курсора
    for (let unit of gameData.playerUnits[gameData.currentPlayer]) {
        if (Math.sqrt((unit.x - x)**2 + (unit.y - y)**2) <= UNIT_RADIUS) {
            gameData.selectedUnit = unit;
            return true;
        }
    }
    return false;
}
function resetSelection() {
    gameData.selectionStart = null;
    gameData.selectionEnd = null;
    gameData.selectedUnits = [];
    gameData.selectedUnit = null;
}
// Обработка на посока на стрелка
function handleArrowDirection(pos, button) {
    if (!gameData.selectedUnit) return false;
    
    let [x, y] = pos;
    let dx = x - gameData.selectedUnit.x;
    let dy = y - gameData.selectedUnit.y;
    let dist = Math.sqrt(dx**2 + dy**2);
    
    if (button === 2) {  // Десен бутон - синя стрелка (2x дължина)
        let maxDist = ARROW_LENGTH * 2;
        if (dist > maxDist) {
            dx = dx * maxDist / dist;
            dy = dy * maxDist / dist;
        }
        gameData.selectedUnit.blueArrow = [gameData.selectedUnit.x + dx, gameData.selectedUnit.y + dy];
        gameData.selectedUnit.direction = null;
    } else {  // Ляв бутон - черна стрелка
        gameData.selectedUnit.direction = Math.atan2(dy, dx);
        gameData.selectedUnit.blueArrow = null;
    }
    
    gameData.selectedUnit = null;
    return true;
}

// Проверка дали движението е към собствената територия
function isMovementTowardOwnTerritory(unit, angle) {
    if ((unit.player === 0 && Math.cos(angle) < 0) || (unit.player === 1 && Math.cos(angle) > 0)) {
        return true;
    }
    return false;
}

// Изчисляване на средна посока между две единици
function calculateAverageDirection(unit1, unit2) {
    if (unit1.direction === null && unit2.direction === null) {
        return null;
    }
    
    if (unit1.direction === null) return unit2.direction;
    if (unit2.direction === null) return unit1.direction;
    
    let x1 = Math.cos(unit1.direction);
    let y1 = Math.sin(unit1.direction);
    let x2 = Math.cos(unit2.direction);
    let y2 = Math.sin(unit2.direction);
    
    let avgX = (x1 + x2) / 2;
    let avgY = (y1 + y2) / 2;
    
    let length = Math.sqrt(avgX**2 + avgY**2);
    if (length > 0.001) {
        avgX /= length;
        avgY /= length;
    }
    
    return Math.atan2(avgY, avgX);
}

// Проверка и избутване на единици твърде близо до фронта
function checkUnitsDistanceFromFront() {
    let minDistance = UNIT_RADIUS * 1.5;
    for (let player of [0, 1]) {
        for (let unit of gameData.playerUnits[player]) {
            let closestPoint = null;
            let closestDist = Infinity;
            
            for (let point of gameData.frontLine) {
                let dist = Math.sqrt((unit.x - point[0])**2 + (unit.y - point[1])**2);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestPoint = point;
                }
            }
            
            if (closestDist < minDistance && closestPoint) {
                let pushDirX = unit.x - closestPoint[0];
                let pushDirY = unit.y - closestPoint[1];
                let pushLen = Math.sqrt(pushDirX**2 + pushDirY**2);
                
                if (pushLen > 0.001) {
                    pushDirX /= pushLen;
                    pushDirY /= pushLen;
                }
                
                let pushDistance = minDistance - closestDist;
                
                unit.beingPushed = true;
                unit.prevX = unit.x;
                unit.prevY = unit.y;
                unit.pushTargetX = unit.x + pushDirX * pushDistance;
                unit.pushTargetY = unit.y + pushDirY * pushDistance;
                unit.pushProgress = 0;
            }
        }
    }
}

// Проверка и избутване на единици при движение на фронтова линия
function checkAndPushUnits(pointIdx, newPoint, direction, pushingPlayer) {
    let [px, py] = gameData.frontLine[pointIdx];
    let [newPx, newPy] = newPoint;
    
    let opponent = 1 - pushingPlayer;
    for (let unit of gameData.playerUnits[opponent]) {
        let dist = Math.sqrt((unit.x - newPx)**2 + (unit.y - newPy)**2);
        if (dist < 1.5 * UNIT_RADIUS) {
            let pushDistance = 1.5 * UNIT_RADIUS - dist;
            let pushDirX = Math.cos(direction);
            let pushDirY = Math.sin(direction);
            
            unit.beingPushed = true;
            unit.prevX = unit.x;
            unit.prevY = unit.y;
            unit.pushTargetX = unit.x + pushDirX * pushDistance;
            unit.pushTargetY = unit.y + pushDirY * pushDistance;
            unit.pushProgress = 0;
        }
    }
}

// Откриване и премахване на примки във фронтовата линия
function detectAndRemoveLoops() {
    if (gameData.frontLine.length < 3) return;
    
    for (let i = 0; i < gameData.frontLine.length - 3; i++) {
        for (let j = i + 2; j < gameData.frontLine.length - 1; j++) {
            let a = gameData.frontLine[i];
            let b = gameData.frontLine[i+1];
            let c = gameData.frontLine[j];
            let d = gameData.frontLine[j+1];
            
            function ccw(A, B, C) {
                return (C[1]-A[1])*(B[0]-A[0]) > (B[1]-A[1])*(C[0]-A[0]);
            }
            
            let intersect = ccw(a,c,d) !== ccw(b,c,d) && ccw(a,b,c) !== ccw(a,b,d);
            
            if (intersect) {
                let pointsToRemove = gameData.frontLine.slice(i+1, j+1);
                gameData.frontLine = [...gameData.frontLine.slice(0, i+1), ...gameData.frontLine.slice(j+1)];
                removeUnitsInLoop(pointsToRemove);
                return;
            }
        }
    }
}
function drawSelectedUnits() {
    if (gameData.selectedUnits.length === 0) return;
    
    // Рисуване на свързващи линии към центъра на селекцията
    if (gameData.selectionStart && gameData.selectionEnd) {
        const minX = Math.min(gameData.selectionStart[0], gameData.selectionEnd[0]);
        const maxX = Math.max(gameData.selectionStart[0], gameData.selectionEnd[0]);
        const minY = Math.min(gameData.selectionStart[1], gameData.selectionEnd[1]);
        const maxY = Math.max(gameData.selectionStart[1], gameData.selectionEnd[1]);
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        ctx.beginPath();
        for (const unit of gameData.selectedUnits) {
            ctx.moveTo(unit.x, unit.y);
            ctx.lineTo(centerX, centerY);
        }
        ctx.strokeStyle = "rgba(0, 255, 0, 0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}
// Премахване на единици вътре в примка
function removeUnitsInLoop(loopPoints) {
    if (loopPoints.length < 3) return;
    
    let polygon = [...loopPoints, loopPoints[0]];
    
    for (let player of [0, 1]) {
        let unitsToRemove = [];
        for (let unit of gameData.playerUnits[player]) {
            if (pointInPolygon([unit.x, unit.y], polygon)) {
                unitsToRemove.push(unit);
            }
        }
        
        gameData.playerUnits[player] = gameData.playerUnits[player].filter(u => !unitsToRemove.includes(u));
    }
}

// Проверка дали точка е вътре в полигон
function pointInPolygon(point, polygon) {
    let [x, y] = point;
    let n = polygon.length;
    let inside = false;
    let xinters;
    
    let [p1x, p1y] = polygon[0];
    for (let i = 1; i <= n; i++) {
        let [p2x, p2y] = polygon[i % n];
        if (y > Math.min(p1y, p2y)) {
            if (y <= Math.max(p1y, p2y)) {
                if (x <= Math.max(p1x, p2x)) {
                    if (p1y !== p2y) {
                        xinters = (y-p1y)*(p2x-p1x)/(p2y-p1y)+p1x;
                    }
                    if (p1x === p2x || x <= xinters) {
                        inside = !inside;
                    }
                }
            }
        }
        [p1x, p1y] = [p2x, p2y];
    }
    
    return inside;
}

// Изчисляване на битка
function calculateBattle() {
    if (gameData.frontLine.length === 0) {
        initializeFrontLine();
        return;
    }

    gameData.battlePhase = true;
    gameData.turnCount++;

    // Инициализация на всички единици
    for (let player of [0, 1]) {
        for (let unit of gameData.playerUnits[player]) {
            // Защитни проверки за инициализация
            unit.assignedPoints = unit.assignedPoints || [];
            unit.totalPoints = unit.totalPoints || 0;
            unit.partialPoints = unit.partialPoints || 0;
            unit.forwardMoves = unit.forwardMoves || 0;
            
            // Нулиране на временни състояния
            unit.prevX = unit.x;
            unit.prevY = unit.y;
            unit.isMoving = false;
            unit.moveProgress = 0;
            unit.blockedByFront = false;
            unit.beingPushed = false;
            unit.pushProgress = 0;

            // Нулираме сините стрелки след първия ход
            if (gameData.turnCount > 1) {
                unit.blueArrow = null;
            }
        }
    }

    // Обработка на всяка точка от фронтовата линия
    for (let pointIdx = 0; pointIdx < gameData.frontLine.length; pointIdx++) {
        let [px, py] = gameData.frontLine[pointIdx];
        let closest = [[], []];  // [player0, player1]

        // Намиране на най-близките единици за всеки играч
        for (let player of [0, 1]) {
            for (let unit of gameData.playerUnits[player]) {
                let dist = Math.sqrt((unit.x - px)**2 + (unit.y - py)**2);
                if (dist <= ARROW_LENGTH) {
                    closest[player].push({ unit, dist });
                }
            }
            
            // Сортиране по разстояние (най-близките първи)
            closest[player].sort((a, b) => a.dist - b.dist);
        }

        // Присвояване на точки и изчисляване на влиянието
        for (let player of [0, 1]) {
            let unitsInfo = closest[player];
            if (unitsInfo.length === 0) continue;

            if (unitsInfo.length >= 2) {
                let unit1 = unitsInfo[0].unit;
                let unit2 = unitsInfo[1].unit;
                let dist1 = unitsInfo[0].dist;
                let dist2 = unitsInfo[1].dist;

                // Ако две единици са на почти еднакво разстояние
                if (Math.abs(dist1 - dist2) < 0.1) {
                    unit1.assignedPoints.push([px, py]);
                    unit2.assignedPoints.push([px, py]);
                    unit1.partialPoints += 0.5;
                    unit2.partialPoints += 0.5;
                } else {
                    // Само най-близката единица получава точка
                    unitsInfo[0].unit.assignedPoints.push([px, py]);
                    unitsInfo[0].unit.totalPoints += 1;
                }
            } else {
                // Само една единица в обхвата
                unitsInfo[0].unit.assignedPoints.push([px, py]);
                unitsInfo[0].unit.totalPoints += 1;
            }
        }

        // Изчисляване на силата на двата играча за текущата точка
        let strengths = [0, 0];
        let winningUnits = [null, null];

        for (let player of [0, 1]) {
            let unitsInfo = closest[player];
            
            if (unitsInfo.length >= 2 && Math.abs(unitsInfo[0].dist - unitsInfo[1].dist) < 0.1) {
                // Две единици на почти еднакво разстояние
                strengths[player] = 1.0;
                winningUnits[player] = [unitsInfo[0].unit, unitsInfo[1].unit];
            } else if (unitsInfo.length >= 1) {
                // Една единица в обхвата
                let unit = unitsInfo[0].unit;
                strengths[player] = 1.0 / (unit.assignedPoints.length + 1);
                winningUnits[player] = unit;
            }
        }

        // Движение на фронтовата точка според по-силния играч
        if (strengths[0] > strengths[1] && winningUnits[0]) {
            if (Array.isArray(winningUnits[0])) {
                // Две единици влияят
                let [unit1, unit2] = winningUnits[0];
                let avgDirection = calculateAverageDirection(unit1, unit2);
                
                if (avgDirection !== null && !isMovementTowardOwnTerritory(unit1, avgDirection)) {
                    let newPx = px + Math.min(MAX_MOVE_DISTANCE, 5 * Math.cos(avgDirection));
                    let newPy = py + Math.min(MAX_MOVE_DISTANCE, 5 * Math.sin(avgDirection));
                    
                    checkAndPushUnits(pointIdx, [newPx, newPy], avgDirection, 0);
                    gameData.frontLine[pointIdx] = [newPx, newPy];
                    
                    // Отбелязваме напредване
                    if ((newPx - px) * (unit1.player === 0 ? -1 : 1) > 0) {
                        unit1.forwardMoves += 0.5;
                        unit2.forwardMoves += 0.5;
                    }
                }
            } else {
                // Една единица влияе
                let unit = winningUnits[0];
                if (unit.direction !== null && !isMovementTowardOwnTerritory(unit, unit.direction)) {
                    let newPx = px + Math.min(MAX_MOVE_DISTANCE, 5 * Math.cos(unit.direction));
                    let newPy = py + Math.min(MAX_MOVE_DISTANCE, 5 * Math.sin(unit.direction));
                    
                    checkAndPushUnits(pointIdx, [newPx, newPy], unit.direction, 0);
                    gameData.frontLine[pointIdx] = [newPx, newPy];
                    
                    if ((newPx - px) * (unit.player === 0 ? -1 : 1) > 0) {
                        unit.forwardMoves += 1;
                    }
                }
            }
        } else if (strengths[1] > strengths[0] && winningUnits[1]) {
            if (Array.isArray(winningUnits[1])) {
                // Две единици влияят
                let [unit1, unit2] = winningUnits[1];
                let avgDirection = calculateAverageDirection(unit1, unit2);
                
                if (avgDirection !== null && !isMovementTowardOwnTerritory(unit1, avgDirection)) {
                    let newPx = px + Math.min(MAX_MOVE_DISTANCE, 5 * Math.cos(avgDirection));
                    let newPy = py + Math.min(MAX_MOVE_DISTANCE, 5 * Math.sin(avgDirection));
                    
                    checkAndPushUnits(pointIdx, [newPx, newPy], avgDirection, 1);
                    gameData.frontLine[pointIdx] = [newPx, newPy];
                    
                    // Отбелязваме напредване
                    if ((newPx - px) * (unit1.player === 0 ? -1 : 1) > 0) {
                        unit1.forwardMoves += 0.5;
                        unit2.forwardMoves += 0.5;
                    }
                }
            } else {
                // Една единица влияе
                let unit = winningUnits[1];
                if (unit.direction !== null && !isMovementTowardOwnTerritory(unit, unit.direction)) {
                    let newPx = px + Math.min(MAX_MOVE_DISTANCE, 5 * Math.cos(unit.direction));
                    let newPy = py + Math.min(MAX_MOVE_DISTANCE, 5 * Math.sin(unit.direction));
                    
                    checkAndPushUnits(pointIdx, [newPx, newPy], unit.direction, 1);
                    gameData.frontLine[pointIdx] = [newPx, newPy];
                    
                    if ((newPx - px) * (unit.player === 0 ? -1 : 1) > 0) {
                        unit.forwardMoves += 1;
                    }
                }
            }
        }
    }

    // Проверка за примки и корекция на фронтовата линия
    detectAndRemoveLoops();
    adjustFrontLine();
    
    // Подготовка на движенията на единиците
    prepareUnitMovements();

    // Проверка за загуба
    checkForLoss();
}
// Корекция на фронтовата линия
function adjustFrontLine() {
    if (!gameData.originalYPositions || gameData.originalYPositions.length === 0) {
        initializeFrontLine();
        return;
    }

    const minSpacing = gameData.initialSpacing * 0.7;
    const maxSpacing = gameData.initialSpacing * 1.5;

    let newLine = [gameData.frontLine[0]];
    for (let i = 1; i < gameData.frontLine.length; i++) {
        const prev = newLine[newLine.length - 1];
        const curr = gameData.frontLine[i];
        const dist = Math.hypot(curr[0] - prev[0], curr[1] - prev[1]);

        if (dist > maxSpacing) {
            // Добави нова точка по средата
            const mid = [
                (prev[0] + curr[0]) / 2,
                (prev[1] + curr[1]) / 2
            ];
            newLine.push(mid);
            // След това ще се провери пак със същата curr, така че не увеличаваме i
            i--;
        } else if (dist < minSpacing && i < gameData.frontLine.length - 1) {
            // Пропусни тази точка (слива се с предишната)
            continue;
        } else {
            newLine.push(curr);
        }
    }
    gameData.frontLine = newLine;
}

// Подготовка на движенията на единиците
function prepareUnitMovements() {
    for (let player of [0, 1]) {
        for (let unit of gameData.playerUnits[player]) {
            if (unit.blueArrow) {
                let [endX, endY] = unit.blueArrow;
                unit.targetX = endX;
                unit.targetY = endY;
                unit.isMoving = true;
                unit.moveProgress = 0;
            } else if (unit.direction !== null) {
                let endX = unit.x + ARROW_LENGTH * Math.cos(unit.direction);
                let endY = unit.y + ARROW_LENGTH * Math.sin(unit.direction);
                unit.targetX = endX;
                unit.targetY = endY;
                unit.isMoving = true;
                unit.moveProgress = 0;
            }
        }
    }
}
// Проверка дали единица е в селекционния правоъгълник
function isUnitInSelection(unit) {
    if (!gameData.selectionStart || !gameData.selectionEnd) return false;
    
    const minX = Math.min(gameData.selectionStart[0], gameData.selectionEnd[0]);
    const maxX = Math.max(gameData.selectionStart[0], gameData.selectionEnd[0]);
    const minY = Math.min(gameData.selectionStart[1], gameData.selectionEnd[1]);
    const maxY = Math.max(gameData.selectionStart[1], gameData.selectionEnd[1]);
    
    return unit.x >= minX && unit.x <= maxX && unit.y >= minY && unit.y <= maxY;
}

// Рисуване на селекционния правоъгълник
function drawSelection() {
    if (gameData.selectionStart && gameData.selectionEnd) {
        const [x1, y1] = gameData.selectionStart;
        const [x2, y2] = gameData.selectionEnd;
        
        // Прозрачен зелен фон за селекцията
        ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        
        // Зелен контур на селекцията с по-дебели линии
        ctx.beginPath();
        ctx.rect(x1, y1, x2 - x1, y2 - y1);
        ctx.strokeStyle = SELECTION_COLOR;
        ctx.lineWidth = 3; // Увеличаваме дебелината на линиите
        ctx.setLineDash([5, 3]); // Променяме пунктира
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
    }
}

// Обработка на групово задаване на стрелки
function handleGroupArrowDirection(pos, button) {
    if (gameData.selectedUnits.length === 0) return false;
    
    // Изчисляваме центъра на селекцията
    let centerX = 0, centerY = 0;
    for (const unit of gameData.selectedUnits) {
        centerX += unit.x;
        centerY += unit.y;
    }
    centerX /= gameData.selectedUnits.length;
    centerY /= gameData.selectedUnits.length;
    
    const [x, y] = pos;
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx**2 + dy**2);
    
    for (const unit of gameData.selectedUnits) {
        if (button === 2) {  // Десен бутон - синя стрелка (2x дължина)
            const maxDist = ARROW_LENGTH * 2;
            const scaledDx = dx * maxDist / dist;
            const scaledDy = dy * maxDist / dist;
            unit.blueArrow = [unit.x + scaledDx, unit.y + scaledDy];
            unit.direction = null;
        } else {  // Ляв бутон - черна стрелка
            unit.direction = Math.atan2(dy, dx);
            unit.blueArrow = null;
        }
    }
    
    resetSelection();
    return true;
}
// Обновяване на позициите на единиците
function updateUnits() {
    let allStopped = true;
    let anyPushing = false;

    for (let player of [0, 1]) {
        for (let unit of gameData.playerUnits[player]) {
            if (unit.beingPushed) {
                unit.updatePosition();
                anyPushing = true;
                allStopped = false;
            }
        }
    }

    if (!anyPushing) {
        for (let player of [0, 1]) {
            for (let unit of gameData.playerUnits[player]) {
                if (!unit.beingPushed) {
                    unit.updatePosition();
                    if (unit.isMoving) {
                        allStopped = false;
                    }
                }
            }
        }

        checkUnitsDistanceFromFront();
    }

    if (allStopped && gameData.battlePhase) {
        if (gameData.turnCount >= gameData.maxTurns) {
            gameData.battlePhase = false;
            gameData.phase = "player1_arrows";
            gameData.currentPlayer = 0;
            gameData.turnCount = 0;

            // Reset unit directions
            for (let player of [0, 1]) {
                for (let unit of gameData.playerUnits[player]) {
                    unit.direction = null;
                    unit.blueArrow = null;
                }
            }

            readyBtn.classList.remove('hidden');
        } else {
            calculateBattle();
        }
    }

    // Проверка за загуба
    checkForLoss();
}

// Рисуване на играта
function drawGame() {
    // Draw background map
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Рисуване на териториите
    if (gameData.frontLine.length > 1) {
        // Чертаем червената територия (лява)
        let redTerritory = [[0, 0], ...gameData.frontLine, [0, canvas.height]];
        ctx.beginPath();
        ctx.moveTo(redTerritory[0][0], redTerritory[0][1]);
        for (let i = 1; i < redTerritory.length; i++) {
            ctx.lineTo(redTerritory[i][0], redTerritory[i][1]);
        }
        ctx.fillStyle = "#FFC8C8";
        ctx.fill();
        
        // Чертаем синята територия (дясна)
        let blueTerritory = [[canvas.width, 0], ...gameData.frontLine, [canvas.width, canvas.height]];
        ctx.beginPath();
        ctx.moveTo(blueTerritory[0][0], blueTerritory[0][1]);
        for (let i = 1; i < blueTerritory.length; i++) {
            ctx.lineTo(blueTerritory[i][0], blueTerritory[i][1]);
        }
        ctx.fillStyle = "#9696FF";
        ctx.fill();
        
        // Чертаем фронтовата линия
        ctx.beginPath();
        ctx.moveTo(gameData.frontLine[0][0], gameData.frontLine[0][1]);
        for (let i = 1; i < gameData.frontLine.length; i++) {
            ctx.lineTo(gameData.frontLine[i][0], gameData.frontLine[i][1]);
        }
        ctx.strokeStyle = FRONT_LINE_COLOR;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
        
        // Точки на фронтовата линия
        for (let point of gameData.frontLine) {
            ctx.beginPath();
            ctx.arc(point[0], point[1], 3, 0, Math.PI * 2);
            ctx.fillStyle = FRONT_LINE_COLOR;
            ctx.fill();
        }
    }

    // Рисуване на селекционния правоъгълник
    if (gameData.phase.endsWith("_arrows") && gameData.selectionStart) {
        drawSelection();
    }

    // Рисуване на единиците
    for (let player of [0, 1]) {
        // Пропускаме червените единици по време на фазата на поставяне на синия играч
        if (gameData.phase === "placement" && player === 0 && gameData.currentPlayer === 1) {
            continue;
        }

        for (let unit of gameData.playerUnits[player]) {
            let selected = (gameData.phase.endsWith("_arrows") && 
                          gameData.currentPlayer === player && 
                          unit === gameData.selectedUnit);
            
            let showUnitArrows = true;
            if (gameData.phase.endsWith("_arrows") && !gameData.battlePhase) {
                showUnitArrows = (player === gameData.currentPlayer);
            } else if (gameData.battlePhase) {
                showUnitArrows = gameData.showArrows;
            }
            
            unit.draw(selected, showUnitArrows);
        }
    }

    // Рисуване на столиците
    for (let player = 0; player < 2; player++) {
        // Пропускаме червената столица по време на фазата на поставяне на синия играч
        if (gameData.phase === "placement" && player === 0 && gameData.currentPlayer === 1) {
            continue;
        }

        let capital = gameData.capitals[player];
        if (capital) {
            ctx.beginPath();
            ctx.arc(capital[0], capital[1], CAPITAL_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = CAPITAL_COLOR;
            ctx.fill();
            ctx.strokeStyle = PLAYER_COLORS[player];
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.lineWidth = 1;
        }
    }

    // Актуализиране на информацията за играта
    let infoText = "";
    if (gameData.phase === "placement") {
        if (!gameData.capitals[gameData.currentPlayer]) {
            infoText = `Играч ${gameData.currentPlayer + 1}: Поставете столица (кликнете върху вашата територия)`;
        } else {
            infoText = `Играч ${gameData.currentPlayer + 1}: Поставете единици (${gameData.playerUnits[gameData.currentPlayer].length}/${gameData.maxUnits})`;
        }
    } else if (gameData.phase.endsWith("_arrows") && !gameData.battlePhase) {
        infoText = `Играч ${gameData.currentPlayer + 1}: Ляв бутон - стрелка, Десен бутон - движение (2x дължина)`;
    } else if (gameData.battlePhase) {
        infoText = `Битка - ход ${gameData.turnCount} от ${gameData.maxTurns}`;
    } else if (gameData.phase === "end") {
        infoText = "Край на играта!";
    }
    
    // Добавяне на информация за броя единици
    let unitsInfo = ` | Червени: ${gameData.playerUnits[0].length}, Сини: ${gameData.playerUnits[1].length} единици`;
    infoText += unitsInfo;
    
    gameInfo.textContent = infoText;

    // Актуализиране на видимостта на бутона "Готово"
    if (gameData.phase === "placement") {
        if (gameData.playerUnits[gameData.currentPlayer].length > 0) {
            readyBtn.classList.remove('hidden');
        } else {
            readyBtn.classList.add('hidden');
        }
    }
}

// Основен игров цикъл
function gameLoop() {
    if (gameData.battlePhase) {
        updateUnits();
    }
    
    drawGame();
    requestAnimationFrame(gameLoop);
}
canvas.addEventListener('mousedown', function(e) {
    let rect = canvas.getBoundingClientRect();
    let pos = [e.clientX - rect.left, e.clientY - rect.top];
    let button = e.button;
    
    if (gameData.phase === "placement") {
        // Проверка за кликване върху съществуваща столица за премахване
        let capital = gameData.capitals[gameData.currentPlayer];
        if (capital && Math.sqrt((pos[0] - capital[0])**2 + (pos[1] - capital[1])**2) <= CAPITAL_RADIUS) {
            gameData.capitals[gameData.currentPlayer] = null;
            return;
        }
        
        // Обработка на поставяне
        handlePlacement(pos);
    } else if (gameData.phase.endsWith("_arrows") && !gameData.battlePhase) {
        if (gameData.selectedUnits.length > 0) {
            // Ако имаме маркирани единици, обработваме второто кликване
            handleGroupArrowDirection(pos, button);
        } else {
            // Първо проверяваме дали не сме кликнали върху единица
            if (!handleArrowSelection(pos, button)) {
                // Ако не сме кликнали върху единица, започваме селекция
                gameData.selectionStart = pos;
                gameData.selectionEnd = pos;
            }
        }
    }
});

canvas.addEventListener('mousemove', function(e) {
    if (gameData.phase.endsWith("_arrows") && !gameData.battlePhase && 
        gameData.selectionStart && e.buttons === 1) {
        let rect = canvas.getBoundingClientRect();
        gameData.selectionEnd = [e.clientX - rect.left, e.clientY - rect.top];
        
        // Маркираме единиците в селекцията
        gameData.selectedUnits = [];
        for (let unit of gameData.playerUnits[gameData.currentPlayer]) {
            if (isUnitInSelection(unit)) {
                gameData.selectedUnits.push(unit);
            }
        }
    }
});

canvas.addEventListener('mouseup', function(e) {
    if (gameData.phase.endsWith("_arrows") && !gameData.battlePhase && 
        gameData.selectionStart && gameData.selectionEnd) {
        // Ако правоъгълникът е твърде малък, го игнорираме
        const minX = Math.min(gameData.selectionStart[0], gameData.selectionEnd[0]);
        const maxX = Math.max(gameData.selectionStart[0], gameData.selectionEnd[0]);
        const minY = Math.min(gameData.selectionStart[1], gameData.selectionEnd[1]);
        const maxY = Math.max(gameData.selectionStart[1], gameData.selectionEnd[1]);
        
        if (maxX - minX < 10 && maxY - minY < 10) {
            gameData.selectionStart = null;
            gameData.selectionEnd = null;
            gameData.selectedUnits = [];
        }
    }
});
// Бутон за готовност
readyBtn.addEventListener('click', function() {
    if (gameData.phase === "placement") {
        // Check if capital is placed
        if (!gameData.capitals[gameData.currentPlayer]) {
            return; // Don't allow proceeding without capital
        }
        
        if (gameData.playerUnits[gameData.currentPlayer].length > 0) {
            gameData.currentPlayer = 1 - gameData.currentPlayer;
            // Hide ready button during second player placement
            if (gameData.currentPlayer === 1) {
                readyBtn.classList.add('hidden');
            } else {
                gameData.phase = "player1_arrows";
            }
        }
    } else if (gameData.phase.endsWith("_arrows")) {
        if (gameData.phase === "player1_arrows") {
            gameData.phase = "player2_arrows";
            gameData.currentPlayer = 1;
        } else if (gameData.phase === "player2_arrows") {
            gameData.phase = "battle";
            readyBtn.classList.add('hidden');
            calculateBattle();
        }
    }
    gameData.selectedUnit = null;
});
// Настройки на играта
document.getElementById('confirm-btn').addEventListener('click', function() {
    let turns = parseInt(document.getElementById('turn-input').value);
    let units = parseInt(document.getElementById('units-input').value);
    
    if (turns >= 1 && turns <= MAX_TURNS && units >= 1 && units <= MAX_UNITS) {
        // Запазваме настройките в gameData
        gameData.maxTurns = turns;
        gameData.maxUnits = units;
        
        // Актуализираме текста за брой единици
        if (gameData.phase === "placement") {
            gameInfo.textContent = `Играч ${gameData.currentPlayer + 1}: Поставете единици (${gameData.playerUnits[gameData.currentPlayer].length}/${gameData.maxUnits})`;
        }
        
        settingsModal.classList.add('hidden');
        gameData.phase = "placement";
        initializeFrontLine();
        gameLoop();
    }
});

// Single game loop function
function gameLoop() {
    if (gameData.battlePhase) {
        updateUnits();
    }
    drawGame();
    requestAnimationFrame(gameLoop);
}

// Single initialization
initializeFrontLine();
settingsModal.classList.remove('hidden');
readyBtn.classList.add('hidden');

function handleCapitalPlacement(pos) {
    let [x, y] = pos;
    let player = gameData.currentPlayer;

    // Проверка за разстояние от фронтова линия
    let minDistance = UNIT_RADIUS * 2;
    for (let point of gameData.frontLine) {
        if (Math.sqrt((x - point[0])**2 + (y - point[1])**2) < minDistance) {
            return false;
        }
    }

    // Единствената проверка за територия:
    if (!isInOwnTerritory(player, x, y)) {
        return false;
    }

    gameData.capitals[player] = [x, y];
    return true;
}

function checkForLoss() {
    for (let player = 0; player < 2; player++) {
        const opponent = 1 - player;

        // Проверка дали играчът е загубил всичките си единици
        if (gameData.playerUnits[player].length === 0) {
            endGame(opponent, `Играч ${opponent + 1} печели! Играч ${player + 1} загуби всичките си единици.`);
            return;
        }

        // Проверка дали столицата на играча е в територията на противника
        const capital = gameData.capitals[player];
        if (capital) {
            const isInOpponentTerritory = isCapitalInOpponentTerritory(player, capital);
            if (isInOpponentTerritory) {
                endGame(opponent, `Играч ${opponent + 1} печели! Столицата на играч ${player + 1} е превзета.`);
                return;
            }
        }
    }
}

function endGame(winningPlayer, message) {
    gameData.phase = "end";
    gameData.battlePhase = false;
    gameInfo.textContent = message;

    // Скриваме бутона "Готово"
    readyBtn.classList.add('hidden');
}

function isCapitalInOpponentTerritory(player, capital) {
    const [x, y] = capital;

    // Определяме територията на противника
    let opponentTerritory;
    if (player === 0) {
        // Червеният играч (лява територия), проверяваме дали е в синята територия
        opponentTerritory = [[canvas.width, 0], ...gameData.frontLine, [canvas.width, canvas.height]];
    } else {
        // Синият играч (дясна територия), проверяваме дали е в червената територия
        opponentTerritory = [[0, 0], ...gameData.frontLine, [0, canvas.height]];
    }

    // Проверяваме дали столицата е в територията на противника
    return pointInPolygon([x, y], opponentTerritory);
}

function interpolateFrontLine(points, count) {
    // 1. Изчисли дължините на сегментите
    let lengths = [];
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
        let dx = points[i][0] - points[i-1][0];
        let dy = points[i][1] - points[i-1][1];
        let len = Math.sqrt(dx*dx + dy*dy);
        lengths.push(len);
        totalLength += len;
    }

    // 2. Разпредели равномерно по дължината
    let step = totalLength / (count - 1);
    let result = [points[0].slice()];
    let currIdx = 1;
    let currLen = 0;
    let prev = points[0].slice();

    for (let i = 1; i < count - 1; i++) {
        let targetLen = i * step;
        while (currLen + lengths[currIdx-1] < targetLen && currIdx < points.length - 1) {
            currLen += lengths[currIdx-1];
            prev = points[currIdx].slice();
            currIdx++;
        }
        let remain = targetLen - currLen;
        let segLen = lengths[currIdx-1];
        let t = remain / segLen;
        let x = prev[0] + (points[currIdx][0] - prev[0]) * t;
        let y = prev[1] + (points[currIdx][1] - prev[1]) * t;
        result.push([x, y]);
    }
    result.push(points[points.length-1].slice());
    return result;
}

function interpolateFrontLineBySpacing(points, spacing) {
    // 1. Изчисли дължините на сегментите
    let lengths = [];
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
        let dx = points[i][0] - points[i-1][0];
        let dy = points[i][1] - points[i-1][1];
        let len = Math.sqrt(dx*dx + dy*dy);
        lengths.push(len);
        totalLength += len;
    }

    let result = [points[0].slice()];
    let currIdx = 1;
    let currLen = 0;
    let prev = points[0].slice();

    while (currIdx < points.length) {
        let segLen = lengths[currIdx-1];
        let remain = spacing - currLen;
        if (segLen >= remain) {
            // Слагаме нова точка на разстояние spacing от предишната
            let t = remain / segLen;
            let x = prev[0] + (points[currIdx][0] - prev[0]) * t;
            let y = prev[1] + (points[currIdx][1] - prev[1]) * t;
            result.push([x, y]);
            // Новият сегмент започва от тази точка
            prev = [x, y];
            lengths[currIdx-1] = segLen - remain;
            points[currIdx-1] = prev;
            currLen = 0;
        } else {
            // Отиваме към следващия сегмент
            currLen += segLen;
            prev = points[currIdx].slice();
            currIdx++;
        }
    }
    // Добави последната точка, ако не съвпада с последната от масива
    if (result.length === 0 || (result[result.length-1][0] !== points[points.length-1][0] || result[result.length-1][1] !== points[points.length-1][1])) {
        result.push(points[points.length-1].slice());
    }
    return result;
}

const mapSelect = document.getElementById('map-select');
if (mapSelect) {
    mapSelect.addEventListener('change', function() {
        initializeFrontLine();
        drawGame();
    });
}

function fillFrontLineEnds(frontLine, spacing, canvas) {
    // Запълни отгоре
    let first = frontLine[0];
    if (first[1] > 0) {
        let steps = Math.ceil(first[1] / spacing);
        // Avoid division by zero
        let dy = frontLine[1][1] - first[1];
        let dx = (dy !== 0) ? (frontLine[1][0] - first[0]) / dy : 0;
        for (let i = 1; i <= steps; i++) {
            let y = first[1] - i * spacing;
            if (y < 0) y = 0;
            let x = first[0] + dx * (y - first[1]);
            frontLine.unshift([x, y]);
            if (y === 0) break;
        }
    }
    frontLine[0][1] = 0;

    // Запълни отдолу
    let last = frontLine[frontLine.length - 1];
    if (last[1] < canvas.height) {
        let steps = Math.ceil((canvas.height - last[1]) / spacing);
        // Avoid division by zero
        let dy = last[1] - frontLine[frontLine.length - 2][1];
        let dx = (dy !== 0) ? (last[0] - frontLine[frontLine.length - 2][0]) / dy : 0;
        for (let i = 1; i <= steps; i++) {
            let y = last[1] + i * spacing;
            if (y > canvas.height) y = canvas.height;
            let x = last[0] + dx * (y - last[1]);
            frontLine.push([x, y]);
            if (y === canvas.height) break;
        }
    }
    frontLine[frontLine.length - 1][1] = canvas.height;
    // НЕ пипай x-координатите!
}

// Проверка дали е в собствената територия
function isInOwnTerritory(player, x, y) {
    // Винаги определяй територията по полигон
    if (player === 0) {
        // Червен: лявата територия
        let redPoly = [[0, 0], ...gameData.frontLine, [0, canvas.height]];
        return pointInPolygon([x, y], redPoly);
    } else {
        // Син: дясната територия
        let bluePoly = [[canvas.width, 0], ...gameData.frontLine, [canvas.width, canvas.height]];
        return pointInPolygon([x, y], bluePoly);
    }
}
