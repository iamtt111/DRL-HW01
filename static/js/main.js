// GridWorld 類 - 純前端實現
class GridWorld {
    constructor(n) {
        this.n = n;
        this.grid = Array(n).fill(null).map(() => Array(n).fill(0));
        this.start = null;
        this.end = null;
        this.obstacles = [];
        this.policy = {};
        this.values = {};
    }

    setStart(row, col) {
        this.start = { row, col };
    }

    setEnd(row, col) {
        this.end = { row, col };
    }

    addObstacle(row, col) {
        if (this.obstacles.length < this.n - 2) {
            this.obstacles.push({ row, col });
            return true;
        }
        return false;
    }

    removeObstacle(row, col) {
        const index = this.obstacles.findIndex(obs => obs.row === row && obs.col === col);
        if (index !== -1) {
            this.obstacles.splice(index, 1);
            return true;
        }
        return false;
    }

    isObstacle(row, col) {
        return this.obstacles.some(obs => obs.row === row && obs.col === col);
    }

    generateRandomPolicy() {
        const actions = ['up', 'down', 'left', 'right'];
        this.policy = {};

        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                const isEnd = this.end && this.end.row === i && this.end.col === j;
                const isObstacle = this.isObstacle(i, j);

                if (!isEnd && !isObstacle) {
                    const randomIndex = Math.floor(Math.random() * actions.length);
                    this.policy[`${i},${j}`] = actions[randomIndex];
                }
            }
        }

        return this.policy;
    }

    getNextState(row, col, action) {
        let nextRow = row;
        let nextCol = col;

        if (action === 'up') {
            nextRow = Math.max(0, row - 1);
        } else if (action === 'down') {
            nextRow = Math.min(this.n - 1, row + 1);
        } else if (action === 'left') {
            nextCol = Math.max(0, col - 1);
        } else if (action === 'right') {
            nextCol = Math.min(this.n - 1, col + 1);
        }

        // 如果下一個狀態是障礙物，則停留在原地
        if (this.isObstacle(nextRow, nextCol)) {
            return { row, col };
        }

        return { row: nextRow, col: nextCol };
    }

    policyEvaluation(gamma = 0.9, theta = 0.01, maxIterations = 1000) {
        // 初始化價值函數
        const V = {};
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                V[`${i},${j}`] = 0.0;
            }
        }

        // 迭代更新價值函數
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            let delta = 0;

            for (let i = 0; i < this.n; i++) {
                for (let j = 0; j < this.n; j++) {
                    const stateKey = `${i},${j}`;

                    // 跳過終點和障礙物
                    const isEnd = this.end && this.end.row === i && this.end.col === j;
                    const isObstacle = this.isObstacle(i, j);

                    if (isEnd || isObstacle) {
                        continue;
                    }

                    const v = V[stateKey];

                    // 獲取當前狀態的行動
                    if (this.policy[stateKey]) {
                        const action = this.policy[stateKey];
                        const nextState = this.getNextState(i, j, action);
                        const nextStateKey = `${nextState.row},${nextState.col}`;

                        // 獎勵設置：到達終點 +10，其他 -1
                        const isNextEnd = this.end &&
                            this.end.row === nextState.row &&
                            this.end.col === nextState.col;
                        const reward = isNextEnd ? 10 : -1;

                        // Bellman 更新方程
                        V[stateKey] = reward + gamma * V[nextStateKey];
                    }

                    delta = Math.max(delta, Math.abs(v - V[stateKey]));
                }
            }

            // 如果變化很小，則收斂
            if (delta < theta) {
                break;
            }
        }

        // 四捨五入到小數點後兩位
        for (let key in V) {
            V[key] = Math.round(V[key] * 100) / 100;
        }

        this.values = V;
        return V;
    }
}

// 全局變量
let gridWorld = null;
let gridSize = 5;
let currentMode = null;
let maxObstacles = 0;
let currentObstacles = 0;
let hasStart = false;
let hasEnd = false;
let policy = null;
let values = null;

// DOM 元素
const gridContainer = document.getElementById('gridContainer');
const gridSizeInput = document.getElementById('gridSize');
const initBtn = document.getElementById('initBtn');
const startModeBtn = document.getElementById('startModeBtn');
const endModeBtn = document.getElementById('endModeBtn');
const obstacleModeBtn = document.getElementById('obstacleModeBtn');
const eraseModeBtn = document.getElementById('eraseModeBtn');
const generatePolicyBtn = document.getElementById('generatePolicyBtn');
const evaluatePolicyBtn = document.getElementById('evaluatePolicyBtn');
const resetBtn = document.getElementById('resetBtn');
const modeInfo = document.getElementById('modeInfo');
const obstacleCount = document.getElementById('obstacleCount');
const statusInfo = document.getElementById('statusInfo');

// 事件監聽器
initBtn.addEventListener('click', initializeGrid);
startModeBtn.addEventListener('click', () => setMode('start'));
endModeBtn.addEventListener('click', () => setMode('end'));
obstacleModeBtn.addEventListener('click', () => setMode('obstacle'));
eraseModeBtn.addEventListener('click', () => setMode('erase'));
generatePolicyBtn.addEventListener('click', generatePolicy);
evaluatePolicyBtn.addEventListener('click', evaluatePolicy);
resetBtn.addEventListener('click', resetGrid);

// 初始化網格
function initializeGrid() {
    const n = parseInt(gridSizeInput.value);

    if (n < 5 || n > 9) {
        alert('網格大小必須在 5 到 9 之間');
        return;
    }

    gridWorld = new GridWorld(n);
    gridSize = n;
    maxObstacles = n - 2;
    currentObstacles = 0;
    hasStart = false;
    hasEnd = false;
    policy = null;
    values = null;

    createGridUI();
    updateInfo();
    updateStatus('網格已初始化，請設置起點和終點');
}

// 創建網格 UI
function createGridUI() {
    gridContainer.innerHTML = '';
    gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', () => handleCellClick(i, j, cell));

            // 添加箭頭容器
            const arrow = document.createElement('div');
            arrow.className = 'arrow';
            cell.appendChild(arrow);

            // 添加價值顯示容器
            const valueDisplay = document.createElement('div');
            valueDisplay.className = 'value';
            cell.appendChild(valueDisplay);

            gridContainer.appendChild(cell);
        }
    }
}

// 處理單元格點擊
function handleCellClick(row, col, cell) {
    if (!currentMode) {
        alert('請先選擇設置模式');
        return;
    }

    if (!gridWorld) {
        alert('請先初始化網格');
        return;
    }

    if (currentMode === 'start') {
        // 移除之前的起點
        document.querySelectorAll('.cell.start').forEach(c => c.classList.remove('start'));

        gridWorld.setStart(row, col);
        cell.classList.add('start');
        cell.classList.remove('end', 'obstacle');

        // 如果之前是障礙物，更新計數
        if (gridWorld.isObstacle(row, col)) {
            gridWorld.removeObstacle(row, col);
            currentObstacles--;
        }

        hasStart = true;
        updateStatus('起點已設置');
    } else if (currentMode === 'end') {
        // 移除之前的終點
        document.querySelectorAll('.cell.end').forEach(c => c.classList.remove('end'));

        gridWorld.setEnd(row, col);
        cell.classList.add('end');
        cell.classList.remove('start', 'obstacle');

        // 如果之前是障礙物，更新計數
        if (gridWorld.isObstacle(row, col)) {
            gridWorld.removeObstacle(row, col);
            currentObstacles--;
        }

        hasEnd = true;
        updateStatus('終點已設置');
    } else if (currentMode === 'obstacle') {
        if (cell.classList.contains('obstacle')) {
            return;
        }

        // 不能在起點或終點設置障礙物
        if (cell.classList.contains('start') || cell.classList.contains('end')) {
            alert('不能在起點或終點設置障礙物');
            return;
        }

        const success = gridWorld.addObstacle(row, col);
        if (success) {
            cell.classList.add('obstacle');
            currentObstacles++;
            updateInfo();
            updateStatus(`障礙物已添加 (${currentObstacles}/${maxObstacles})`);
        } else {
            alert(`最多只能設置 ${maxObstacles} 個障礙物`);
        }
    } else if (currentMode === 'erase') {
        if (cell.classList.contains('obstacle')) {
            gridWorld.removeObstacle(row, col);
            cell.classList.remove('obstacle');
            currentObstacles--;
            updateInfo();
            updateStatus('障礙物已清除');
        }
    }

    updateInfo();
}

// 設置模式
function setMode(mode) {
    currentMode = mode;

    // 移除所有按鈕的 active 類
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));

    // 添加 active 類到當前按鈕
    if (mode === 'start') {
        startModeBtn.classList.add('active');
        modeInfo.textContent = '當前模式: 設置起點 (綠色)';
    } else if (mode === 'end') {
        endModeBtn.classList.add('active');
        modeInfo.textContent = '當前模式: 設置終點 (紅色)';
    } else if (mode === 'obstacle') {
        obstacleModeBtn.classList.add('active');
        modeInfo.textContent = '當前模式: 設置障礙物 (灰色)';
    } else if (mode === 'erase') {
        eraseModeBtn.classList.add('active');
        modeInfo.textContent = '當前模式: 清除障礙物';
    }
}

// 生成隨機策略
function generatePolicy() {
    if (!hasStart || !hasEnd) {
        alert('請先設置起點和終點');
        return;
    }

    if (!gridWorld) {
        alert('請先初始化網格');
        return;
    }

    policy = gridWorld.generateRandomPolicy();
    displayPolicy();
    updateStatus('隨機策略已生成');
}

// 顯示策略
function displayPolicy() {
    // 先清除所有箭頭
    document.querySelectorAll('.arrow').forEach(arrow => {
        arrow.textContent = '';
        arrow.style.display = 'none';
    });

    for (let key in policy) {
        const [row, col] = key.split(',').map(Number);
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        if (cell) {
            const arrow = cell.querySelector('.arrow');
            const action = policy[key];

            arrow.textContent = getArrow(action);
            arrow.style.display = 'block';
        }
    }
}

// 獲取箭頭符號
function getArrow(action) {
    const arrows = {
        'up': '↑',
        'down': '↓',
        'left': '←',
        'right': '→'
    };
    return arrows[action] || '';
}

// 評估策略
function evaluatePolicy() {
    if (!policy) {
        alert('請先生成策略');
        return;
    }

    if (!gridWorld) {
        alert('請先初始化網格');
        return;
    }

    values = gridWorld.policyEvaluation();
    displayValues();
    updateStatus('策略評估完成，已顯示 V(s)');
}

// 顯示價值函數
function displayValues() {
    // 先清除所有價值顯示
    document.querySelectorAll('.value').forEach(v => {
        v.textContent = '';
        v.style.display = 'none';
    });

    for (let key in values) {
        const [row, col] = key.split(',').map(Number);
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        if (cell && !cell.classList.contains('obstacle')) {
            const valueDisplay = cell.querySelector('.value');
            valueDisplay.textContent = `V: ${values[key]}`;
            valueDisplay.style.display = 'block';
        }
    }
}

// 重置網格
function resetGrid() {
    if (confirm('確定要重置所有設置嗎？')) {
        initializeGrid();
        currentMode = null;
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        modeInfo.textContent = '當前模式: 未選擇';
    }
}

// 更新資訊顯示
function updateInfo() {
    obstacleCount.textContent = `障礙物數量： ${currentObstacles} / ${maxObstacles}`;
}

// 更新狀態資訊
function updateStatus(message) {
    statusInfo.textContent = `狀態：${message}`;
}

// 頁面載入時自動初始化 5x5 網格
window.addEventListener('DOMContentLoaded', () => {
    initializeGrid();
});
