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

    // Value Iteration 算法（原版，快速執行）
    valueIteration(gamma = 0.9, theta = 0.01, maxIterations = 1000) {
        const actions = ['up', 'down', 'left', 'right'];

        // 初始化價值函數
        const V = {};
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                V[`${i},${j}`] = 0.0;
            }
        }

        // Value Iteration 主循環
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

                    // 計算所有動作的價值，取最大值
                    let maxValue = -Infinity;

                    for (const action of actions) {
                        const nextState = this.getNextState(i, j, action);
                        const nextStateKey = `${nextState.row},${nextState.col}`;

                        // 計算獎勵
                        const isNextEnd = this.end &&
                            this.end.row === nextState.row &&
                            this.end.col === nextState.col;
                        const reward = isNextEnd ? 10 : -1;

                        // Bellman 最優方程
                        const actionValue = reward + gamma * V[nextStateKey];
                        maxValue = Math.max(maxValue, actionValue);
                    }

                    V[stateKey] = maxValue;
                    delta = Math.max(delta, Math.abs(v - V[stateKey]));
                }
            }

            // 收斂判斷
            if (delta < theta) {
                console.log(`Value Iteration converged after ${iteration + 1} iterations`);
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

    // Value Iteration 生成器（支援動畫）
    *valueIterationAnimated(gamma = 0.9, theta = 0.01, maxIterations = 1000) {
        const actions = ['up', 'down', 'left', 'right'];

        // 初始化價值函數
        const V = {};
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                V[`${i},${j}`] = 0.0;
            }
        }

        // 產生初始狀態
        yield {
            iteration: 0,
            values: this.roundValues({ ...V }),
            policy: this.extractPolicyFromValues(V, gamma),
            delta: Infinity,
            converged: false
        };

        // Value Iteration 主循環
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

                    // 計算所有動作的價值，取最大值
                    let maxValue = -Infinity;

                    for (const action of actions) {
                        const nextState = this.getNextState(i, j, action);
                        const nextStateKey = `${nextState.row},${nextState.col}`;

                        // 計算獎勵
                        const isNextEnd = this.end &&
                            this.end.row === nextState.row &&
                            this.end.col === nextState.col;
                        const reward = isNextEnd ? 10 : -1;

                        // Bellman 最優方程
                        const actionValue = reward + gamma * V[nextStateKey];
                        maxValue = Math.max(maxValue, actionValue);
                    }

                    V[stateKey] = maxValue;
                    delta = Math.max(delta, Math.abs(v - V[stateKey]));
                }
            }

            // 收斂判斷
            const converged = delta < theta;

            // 產生當前迭代狀態
            yield {
                iteration: iteration + 1,
                values: this.roundValues({ ...V }),
                policy: this.extractPolicyFromValues(V, gamma),
                delta: Math.round(delta * 1000) / 1000,
                converged: converged
            };

            if (converged) {
                break;
            }
        }

        // 保存最終結果
        this.values = this.roundValues(V);
        this.policy = this.extractPolicyFromValues(V, gamma);
    }

    // 從價值函數提取策略（輔助方法）
    extractPolicyFromValues(V, gamma = 0.9) {
        const actions = ['up', 'down', 'left', 'right'];
        const policy = {};

        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                const stateKey = `${i},${j}`;

                const isEnd = this.end && this.end.row === i && this.end.col === j;
                const isObstacle = this.isObstacle(i, j);

                if (isEnd || isObstacle) {
                    continue;
                }

                let bestAction = null;
                let bestValue = -Infinity;

                for (const action of actions) {
                    const nextState = this.getNextState(i, j, action);
                    const nextStateKey = `${nextState.row},${nextState.col}`;

                    const isNextEnd = this.end &&
                        this.end.row === nextState.row &&
                        this.end.col === nextState.col;
                    const reward = isNextEnd ? 10 : -1;

                    const actionValue = reward + gamma * V[nextStateKey];

                    if (actionValue > bestValue) {
                        bestValue = actionValue;
                        bestAction = action;
                    }
                }

                policy[stateKey] = bestAction;
            }
        }

        return policy;
    }

    // 四捨五入價值函數
    roundValues(V) {
        const rounded = {};
        for (let key in V) {
            rounded[key] = Math.round(V[key] * 100) / 100;
        }
        return rounded;
    }

    // 從價值函數提取最優策略
    extractOptimalPolicy(gamma = 0.9) {
        const actions = ['up', 'down', 'left', 'right'];
        const optimalPolicy = {};

        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                const stateKey = `${i},${j}`;

                // 跳過終點和障礙物
                const isEnd = this.end && this.end.row === i && this.end.col === j;
                const isObstacle = this.isObstacle(i, j);

                if (isEnd || isObstacle) {
                    continue;
                }

                let bestAction = null;
                let bestValue = -Infinity;

                for (const action of actions) {
                    const nextState = this.getNextState(i, j, action);
                    const nextStateKey = `${nextState.row},${nextState.col}`;

                    const isNextEnd = this.end &&
                        this.end.row === nextState.row &&
                        this.end.col === nextState.col;
                    const reward = isNextEnd ? 10 : -1;

                    const actionValue = reward + gamma * this.values[nextStateKey];

                    if (actionValue > bestValue) {
                        bestValue = actionValue;
                        bestAction = action;
                    }
                }

                optimalPolicy[stateKey] = bestAction;
            }
        }

        this.policy = optimalPolicy;
        return optimalPolicy;
    }

    // 獲取最優路徑
    getOptimalPath() {
        if (!this.start || !this.end || !this.policy) {
            return [];
        }

        const path = [];
        let current = { ...this.start };
        const maxSteps = this.n * this.n; // 防止無限循環
        let steps = 0;

        path.push({ ...current });

        while (steps < maxSteps) {
            const stateKey = `${current.row},${current.col}`;

            // 到達終點
            if (current.row === this.end.row && current.col === this.end.col) {
                break;
            }

            const action = this.policy[stateKey];
            if (!action) {
                break; // 沒有策略，停止
            }

            const nextState = this.getNextState(current.row, current.col, action);

            // 檢測是否卡住（原地不動）
            if (nextState.row === current.row && nextState.col === current.col) {
                break;
            }

            current = nextState;
            path.push({ ...current });
            steps++;
        }

        return path;
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

// 動畫控制變量
let viAnimationRunning = false;
let viAnimationSpeed = 500; // 毫秒
let viIterator = null;

// DOM 元素
const gridContainer = document.getElementById('gridContainer');
const gridSizeInput = document.getElementById('gridSize');
const initBtn = document.getElementById('initBtn');
const startModeBtn = document.getElementById('startModeBtn');
const endModeBtn = document.getElementById('endModeBtn');
const obstacleModeBtn = document.getElementById('obstacleModeBtn');
const eraseModeBtn = document.getElementById('eraseModeBtn');
const randomPolicyBtn = document.getElementById('randomPolicyBtn');
const resetBtn = document.getElementById('resetBtn');
const valueIterationBtn = document.getElementById('valueIterationBtn');
const animatePathBtn = document.getElementById('animatePathBtn');
const stopViBtn = document.getElementById('stopViBtn');
const viSpeedSlider = document.getElementById('viSpeedSlider');
const viSpeedValue = document.getElementById('viSpeedValue');
const iterationInfo = document.getElementById('iterationInfo');
const modeInfo = document.getElementById('modeInfo');
const obstacleCount = document.getElementById('obstacleCount');
const statusInfo = document.getElementById('statusInfo');

// 事件監聽器
initBtn.addEventListener('click', initializeGrid);
startModeBtn.addEventListener('click', () => setMode('start'));
endModeBtn.addEventListener('click', () => setMode('end'));
obstacleModeBtn.addEventListener('click', () => setMode('obstacle'));
eraseModeBtn.addEventListener('click', () => setMode('erase'));
randomPolicyBtn.addEventListener('click', generateAndEvaluatePolicy);
resetBtn.addEventListener('click', resetGrid);
valueIterationBtn.addEventListener('click', runValueIteration);
animatePathBtn.addEventListener('click', animateOptimalPath);
stopViBtn.addEventListener('click', stopValueIteration);
viSpeedSlider.addEventListener('input', updateViSpeed);

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
        return false;
    }

    if (!gridWorld) {
        alert('請先初始化網格');
        return false;
    }

    policy = gridWorld.generateRandomPolicy();
    displayPolicy();
    return true;
}

function generateAndEvaluatePolicy() {
    if (generatePolicy()) {
        values = gridWorld.policyEvaluation();
        displayValues();
        updateStatus('隨機策略已生成並評估完成');
    }
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

// Value Iteration 動畫執行函數
async function runValueIteration() {
    if (!hasStart || !hasEnd) {
        alert('請先設置起點和終點');
        return;
    }

    if (!gridWorld) {
        alert('請先初始化網格');
        return;
    }

    if (viAnimationRunning) {
        alert('Value Iteration 正在執行中');
        return;
    }

    // 清除之前的路徑動畫
    clearPathAnimation();

    // 開始動畫
    viAnimationRunning = true;
    valueIterationBtn.disabled = true;
    stopViBtn.disabled = false;

    // 取得生成器
    viIterator = gridWorld.valueIterationAnimated();

    updateStatus('Value Iteration 動畫開始...');
    updateIterationInfo(0, Infinity, false);

    // 逐步執行動畫
    for (const state of viIterator) {
        if (!viAnimationRunning) {
            updateStatus('Value Iteration 已停止');
            break;
        }

        // 更新顯示
        values = state.values;
        policy = state.policy;

        // 清除之前的路徑動畫
        clearPathAnimation();

        displayPolicy();
        displayValues();
        updateIterationInfo(state.iteration, state.delta, state.converged);

        // 暫存策略到 gridWorld 以便 getOptimalPath 使用
        gridWorld.policy = policy;
        gridWorld.values = values;

        // 取得當前路徑
        const currentPath = gridWorld.getOptimalPath();
        const pathLength = currentPath.length > 0 ? currentPath.length - 1 : 0; // 步數 = 節點數 - 1
        const reachedGoal = currentPath.length > 0 &&
            currentPath[currentPath.length - 1].row === gridWorld.end.row &&
            currentPath[currentPath.length - 1].col === gridWorld.end.col;

        // 更新迭代資訊（包含路徑長度）
        updateIterationInfo(state.iteration, state.delta, state.converged, pathLength);

        // 播放當前策略的路徑動畫
        if (reachedGoal) {
            updateStatus(`迭代 ${state.iteration}：找到路徑！長度 = ${pathLength} 步`);
        } else {
            updateStatus(`迭代 ${state.iteration}：尚未找到完整路徑...`);
        }

        await animateCurrentPath();

        if (!viAnimationRunning) {
            updateStatus('Value Iteration 已停止');
            break;
        }

        if (state.converged) {
            updateStatus(`Value Iteration 收斂！共 ${state.iteration} 次迭代，最優路徑 ${pathLength} 步`);
            // 最後一次保持路徑顯示
            break;
        }

        // 迭代間的短暫停頓
        await delay(200);
    }

    // 結束動畫
    viAnimationRunning = false;
    valueIterationBtn.disabled = false;
    stopViBtn.disabled = true;
    viIterator = null;

    // 保存最終結果
    gridWorld.values = values;
    gridWorld.policy = policy;
}

// 播放當前策略的路徑動畫（用於 VI 迭代過程）
async function animateCurrentPath() {
    const path = gridWorld.getOptimalPath();

    if (path.length === 0) {
        return;
    }

    // 計算每步的延遲時間（根據路徑長度和動畫速度調整）
    const stepDelay = Math.max(50, Math.min(150, viAnimationSpeed / path.length));

    // 逐步動畫
    for (let i = 0; i < path.length; i++) {
        if (!viAnimationRunning) {
            return;
        }

        const { row, col } = path[i];
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        if (cell) {
            // 添加 agent 標記
            cell.classList.add('agent-current');

            // 如果不是第一步，移除前一個位置的當前標記並設為已訪問
            if (i > 0) {
                const prevCell = document.querySelector(
                    `[data-row="${path[i - 1].row}"][data-col="${path[i - 1].col}"]`
                );
                if (prevCell) {
                    prevCell.classList.remove('agent-current');
                    prevCell.classList.add('path-visited');
                }
            }

            // 等待動畫延遲
            await delay(stepDelay);
        }
    }

    // 最後一步也標記為已訪問
    if (path.length > 0) {
        const lastCell = document.querySelector(
            `[data-row="${path[path.length - 1].row}"][data-col="${path[path.length - 1].col}"]`
        );
        if (lastCell) {
            lastCell.classList.remove('agent-current');
            lastCell.classList.add('path-visited');
        }
    }
}

// 停止 Value Iteration 動畫
function stopValueIteration() {
    viAnimationRunning = false;
    updateStatus('正在停止 Value Iteration...');
}

// 更新動畫速度
function updateViSpeed() {
    viAnimationSpeed = 1100 - parseInt(viSpeedSlider.value);
    viSpeedValue.textContent = `${viSpeedSlider.value}%`;
}

// 更新迭代資訊顯示
function updateIterationInfo(iteration, delta, converged, pathLength = null) {
    if (iterationInfo) {
        const convergedText = converged ? ' <span class="converged-badge">已收斂</span>' : '';
        const deltaText = delta === Infinity ? '∞' : delta.toFixed(3);
        const pathText = pathLength !== null ? ` | 路徑長度: <strong>${pathLength}</strong>` : '';
        iterationInfo.innerHTML = `迭代次數: <strong>${iteration}</strong> | Delta: <strong>${deltaText}</strong>${pathText}${convergedText}`;
    }
}

// 播放最優路徑動畫
async function animateOptimalPath() {
    if (!policy) {
        alert('請先執行 Value Iteration');
        return;
    }

    const path = gridWorld.getOptimalPath();

    if (path.length === 0) {
        alert('無法找到從起點到終點的路徑');
        return;
    }

    // 清除之前的動畫標記
    clearPathAnimation();

    updateStatus('正在播放路徑動畫...');

    // 逐步動畫
    for (let i = 0; i < path.length; i++) {
        const { row, col } = path[i];
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        if (cell) {
            // 添加 agent 標記
            cell.classList.add('agent-current');

            // 如果不是第一步，移除前一個位置的當前標記並設為已訪問
            if (i > 0) {
                const prevCell = document.querySelector(
                    `[data-row="${path[i - 1].row}"][data-col="${path[i - 1].col}"]`
                );
                if (prevCell) {
                    prevCell.classList.remove('agent-current');
                    prevCell.classList.add('path-visited');
                }
            }

            // 等待動畫延遲
            await delay(500); // 500ms 每步
        }
    }

    // 最後一步也標記為已訪問
    const lastCell = document.querySelector(
        `[data-row="${path[path.length - 1].row}"][data-col="${path[path.length - 1].col}"]`
    );
    if (lastCell) {
        lastCell.classList.remove('agent-current');
        lastCell.classList.add('path-visited');
    }

    updateStatus(`路徑動畫完成，共 ${path.length} 步`);
}

// 延遲函數
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 清除路徑動畫
function clearPathAnimation() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('agent-current', 'path-visited');
    });
}

// 頁面載入時自動初始化 5x5 網格
window.addEventListener('DOMContentLoaded', () => {
    initializeGrid();
});
