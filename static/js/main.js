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

    // 複製當前設定到新的 GridWorld
    clone() {
        const newGrid = new GridWorld(this.n);
        newGrid.start = this.start ? { ...this.start } : null;
        newGrid.end = this.end ? { ...this.end } : null;
        newGrid.obstacles = this.obstacles.map(obs => ({ ...obs }));
        return newGrid;
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

    // Policy Evaluation - 評估給定策略的價值函數
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

    // Policy Improvement - 根據價值函數改進策略
    policyImprovement(V, gamma = 0.9) {
        const actions = ['up', 'down', 'left', 'right'];
        const newPolicy = {};
        let policyStable = true;

        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                const stateKey = `${i},${j}`;

                // 跳過終點和障礙物
                const isEnd = this.end && this.end.row === i && this.end.col === j;
                const isObstacle = this.isObstacle(i, j);

                if (isEnd || isObstacle) {
                    continue;
                }

                const oldAction = this.policy[stateKey];
                let bestAction = null;
                let bestValue = -Infinity;

                // 找到最佳動作
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

                newPolicy[stateKey] = bestAction;

                // 檢查策略是否改變
                if (oldAction !== bestAction) {
                    policyStable = false;
                }
            }
        }

        this.policy = newPolicy;
        return { policy: newPolicy, stable: policyStable };
    }

    // Policy Iteration 算法（完整版）
    policyIteration(gamma = 0.9, theta = 0.01, maxIterations = 100) {
        // Step 1: 初始化隨機策略
        this.generateRandomPolicy();

        let iterations = 0;

        // Step 2: 迭代直到策略穩定
        for (let i = 0; i < maxIterations; i++) {
            iterations++;

            // Policy Evaluation
            const V = this.policyEvaluationInternal(gamma, theta);

            // Policy Improvement
            const result = this.policyImprovement(V, gamma);

            // 如果策略穩定，結束
            if (result.stable) {
                console.log(`Policy Iteration converged after ${iterations} iterations`);
                break;
            }
        }

        // 最終評估
        this.values = this.policyEvaluationInternal(gamma, theta);
        for (let key in this.values) {
            this.values[key] = Math.round(this.values[key] * 100) / 100;
        }

        return { values: this.values, policy: this.policy, iterations };
    }

    // 內部 Policy Evaluation（返回未四捨五入的值）
    policyEvaluationInternal(gamma = 0.9, theta = 0.01, maxIterations = 1000) {
        const V = {};
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                V[`${i},${j}`] = 0.0;
            }
        }

        for (let iteration = 0; iteration < maxIterations; iteration++) {
            let delta = 0;

            for (let i = 0; i < this.n; i++) {
                for (let j = 0; j < this.n; j++) {
                    const stateKey = `${i},${j}`;
                    const isEnd = this.end && this.end.row === i && this.end.col === j;
                    const isObstacle = this.isObstacle(i, j);

                    if (isEnd || isObstacle) continue;

                    const v = V[stateKey];

                    if (this.policy[stateKey]) {
                        const action = this.policy[stateKey];
                        const nextState = this.getNextState(i, j, action);
                        const nextStateKey = `${nextState.row},${nextState.col}`;

                        const isNextEnd = this.end &&
                            this.end.row === nextState.row &&
                            this.end.col === nextState.col;
                        const reward = isNextEnd ? 10 : -1;

                        V[stateKey] = reward + gamma * V[nextStateKey];
                    }

                    delta = Math.max(delta, Math.abs(v - V[stateKey]));
                }
            }

            if (delta < theta) break;
        }

        return V;
    }

    // Policy Iteration 生成器（支援動畫）
    *policyIterationAnimated(gamma = 0.9, theta = 0.01, maxIterations = 100) {
        const actions = ['up', 'down', 'left', 'right'];

        // Step 1: 初始化隨機策略
        this.generateRandomPolicy();

        // 初始化價值函數
        let V = {};
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                V[`${i},${j}`] = 0.0;
            }
        }

        // 產生初始狀態
        yield {
            iteration: 0,
            phase: 'init',
            values: this.roundValues({ ...V }),
            policy: { ...this.policy },
            delta: Infinity,
            converged: false,
            policyChanged: true
        };

        // Policy Iteration 主循環
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            // ===== Policy Evaluation Phase =====
            let evalIterations = 0;
            for (let evalIter = 0; evalIter < 1000; evalIter++) {
                let delta = 0;
                evalIterations++;

                for (let i = 0; i < this.n; i++) {
                    for (let j = 0; j < this.n; j++) {
                        const stateKey = `${i},${j}`;
                        const isEnd = this.end && this.end.row === i && this.end.col === j;
                        const isObstacle = this.isObstacle(i, j);

                        if (isEnd || isObstacle) continue;

                        const v = V[stateKey];

                        if (this.policy[stateKey]) {
                            const action = this.policy[stateKey];
                            const nextState = this.getNextState(i, j, action);
                            const nextStateKey = `${nextState.row},${nextState.col}`;

                            const isNextEnd = this.end &&
                                this.end.row === nextState.row &&
                                this.end.col === nextState.col;
                            const reward = isNextEnd ? 10 : -1;

                            V[stateKey] = reward + gamma * V[nextStateKey];
                        }

                        delta = Math.max(delta, Math.abs(v - V[stateKey]));
                    }
                }

                if (delta < theta) break;
            }

            // 產生 Policy Evaluation 結果
            yield {
                iteration: iteration + 1,
                phase: 'evaluation',
                values: this.roundValues({ ...V }),
                policy: { ...this.policy },
                delta: 0,
                converged: false,
                evalIterations: evalIterations
            };

            // ===== Policy Improvement Phase =====
            let policyStable = true;
            const newPolicy = {};

            for (let i = 0; i < this.n; i++) {
                for (let j = 0; j < this.n; j++) {
                    const stateKey = `${i},${j}`;
                    const isEnd = this.end && this.end.row === i && this.end.col === j;
                    const isObstacle = this.isObstacle(i, j);

                    if (isEnd || isObstacle) continue;

                    const oldAction = this.policy[stateKey];
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

                    newPolicy[stateKey] = bestAction;

                    if (oldAction !== bestAction) {
                        policyStable = false;
                    }
                }
            }

            this.policy = newPolicy;

            // 產生 Policy Improvement 結果
            yield {
                iteration: iteration + 1,
                phase: 'improvement',
                values: this.roundValues({ ...V }),
                policy: { ...newPolicy },
                delta: 0,
                converged: policyStable,
                policyChanged: !policyStable
            };

            if (policyStable) {
                break;
            }
        }

        // 保存最終結果
        this.values = this.roundValues(V);
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
let gridWorld = null;  // 原始設定網格
let piGridWorld = null; // Policy Iteration 用
let viGridWorld = null; // Value Iteration 用
let gridSize = 5;
let currentMode = null;
let maxObstacles = 0;
let currentObstacles = 0;
let hasStart = false;
let hasEnd = false;

// 動畫控制變量
let piAnimationRunning = false;
let viAnimationRunning = false;
let animationSpeed = 500; // 毫秒
let piIterator = null;
let viIterator = null;

// DOM 元素
const gridContainer = document.getElementById('gridContainer');
const piGridContainer = document.getElementById('piGridContainer');
const viGridContainer = document.getElementById('viGridContainer');
const gridSizeInput = document.getElementById('gridSize');
const initBtn = document.getElementById('initBtn');
const startModeBtn = document.getElementById('startModeBtn');
const endModeBtn = document.getElementById('endModeBtn');
const obstacleModeBtn = document.getElementById('obstacleModeBtn');
const eraseModeBtn = document.getElementById('eraseModeBtn');
const resetBtn = document.getElementById('resetBtn');
const policyIterationBtn = document.getElementById('policyIterationBtn');
const valueIterationBtn = document.getElementById('valueIterationBtn');
const stopPiBtn = document.getElementById('stopPiBtn');
const stopViBtn = document.getElementById('stopViBtn');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const piIterationInfo = document.getElementById('piIterationInfo');
const viIterationInfo = document.getElementById('viIterationInfo');
const modeInfo = document.getElementById('modeInfo');
const obstacleCount = document.getElementById('obstacleCount');
const statusInfo = document.getElementById('statusInfo');

// 事件監聽器
initBtn.addEventListener('click', initializeGrid);
startModeBtn.addEventListener('click', () => setMode('start'));
endModeBtn.addEventListener('click', () => setMode('end'));
obstacleModeBtn.addEventListener('click', () => setMode('obstacle'));
eraseModeBtn.addEventListener('click', () => setMode('erase'));
resetBtn.addEventListener('click', resetGrid);
policyIterationBtn.addEventListener('click', runPolicyIteration);
valueIterationBtn.addEventListener('click', runValueIteration);
stopPiBtn.addEventListener('click', stopPolicyIteration);
stopViBtn.addEventListener('click', stopValueIteration);
speedSlider.addEventListener('input', updateSpeed);

// 初始化網格
function initializeGrid() {
    const n = parseInt(gridSizeInput.value);

    if (n < 5 || n > 9) {
        alert('網格大小必須在 5 到 9 之間');
        return;
    }

    gridWorld = new GridWorld(n);
    piGridWorld = null;
    viGridWorld = null;
    gridSize = n;
    maxObstacles = n - 2;
    currentObstacles = 0;
    hasStart = false;
    hasEnd = false;
    currentMode = null; // 重置為自動模式

    createGridUI(gridContainer, gridSize, true);
    clearResultGrid(piGridContainer);
    clearResultGrid(viGridContainer);
    updateInfo();
    updateStatus('網格已初始化，請點擊格子設置起點');
    updateModeDisplay();
    resetIterationInfo();
}

// 清空結果網格
function clearResultGrid(container) {
    container.innerHTML = '<div class="empty-grid-message">請先設定網格並執行演算法</div>';
    container.classList.add('empty');
}

// 創建網格 UI
function createGridUI(container, size, isEditable) {
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;

            if (isEditable) {
                cell.addEventListener('click', () => handleCellClick(i, j, cell));

                // 添加編號顯示
                const cellNumber = document.createElement('div');
                cellNumber.className = 'cell-number';
                cellNumber.textContent = i * size + j + 1;
                cell.appendChild(cellNumber);
            }

            // 添加箭頭容器
            const arrow = document.createElement('div');
            arrow.className = 'arrow';
            cell.appendChild(arrow);

            // 添加價值顯示容器
            const valueDisplay = document.createElement('div');
            valueDisplay.className = 'value';
            cell.appendChild(valueDisplay);

            container.appendChild(cell);
        }
    }
}

// 創建結果網格（用於顯示演算法結果）
function createResultGrid(container, gw) {
    container.innerHTML = '';
    container.classList.remove('empty');
    container.style.gridTemplateColumns = `repeat(${gw.n}, 1fr)`;

    for (let i = 0; i < gw.n; i++) {
        for (let j = 0; j < gw.n; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;

            // 設置起點、終點、障礙物
            if (gw.start && gw.start.row === i && gw.start.col === j) {
                cell.classList.add('start');
            }
            if (gw.end && gw.end.row === i && gw.end.col === j) {
                cell.classList.add('end');
            }
            if (gw.isObstacle(i, j)) {
                cell.classList.add('obstacle');
            }

            // 添加箭頭容器
            const arrow = document.createElement('div');
            arrow.className = 'arrow';
            cell.appendChild(arrow);

            // 添加價值顯示容器
            const valueDisplay = document.createElement('div');
            valueDisplay.className = 'value';
            cell.appendChild(valueDisplay);

            container.appendChild(cell);
        }
    }
}

// 處理單元格點擊（只有原始網格可編輯）
function handleCellClick(row, col, cell) {
    if (!gridWorld) {
        alert('請先初始化網格');
        return;
    }

    // 如果有手動模式，使用手動模式邏輯
    if (currentMode) {
        handleManualMode(row, col, cell);
        return;
    }

    // 如果點擊的是已設置的格子，則清除它
    if (cell.classList.contains('start')) {
        cell.classList.remove('start');
        gridWorld.start = null;
        hasStart = false;
        updateStatus('起點已清除，請重新設置起點');
        updateModeDisplay();
        updateInfo();
        return;
    }

    if (cell.classList.contains('end')) {
        cell.classList.remove('end');
        gridWorld.end = null;
        hasEnd = false;
        updateStatus('終點已清除，請設置終點');
        updateModeDisplay();
        updateInfo();
        return;
    }

    if (cell.classList.contains('obstacle')) {
        gridWorld.removeObstacle(row, col);
        cell.classList.remove('obstacle');
        currentObstacles--;
        updateStatus(`障礙物已清除 (${currentObstacles}/${maxObstacles})`);
        updateModeDisplay();
        updateInfo();
        return;
    }

    // 自動模式：依序設置 Start -> End -> Obstacles
    if (!hasStart) {
        // 設置起點
        gridWorld.setStart(row, col);
        cell.classList.add('start');
        hasStart = true;
        updateStatus('起點已設置，請設置終點');
        updateModeDisplay();
    } else if (!hasEnd) {
        // 設置終點
        gridWorld.setEnd(row, col);
        cell.classList.add('end');
        hasEnd = true;
        if (maxObstacles > 0) {
            updateStatus(`終點已設置，可設置障礙物 (0/${maxObstacles})`);
        } else {
            updateStatus('終點已設置，可執行演算法');
        }
        updateModeDisplay();
    } else if (currentObstacles < maxObstacles) {
        // 設置障礙物
        const success = gridWorld.addObstacle(row, col);
        if (success) {
            cell.classList.add('obstacle');
            currentObstacles++;
            if (currentObstacles < maxObstacles) {
                updateStatus(`障礙物已添加 (${currentObstacles}/${maxObstacles})`);
            } else {
                updateStatus(`已達最大障礙物數量，可執行演算法`);
            }
        }
    } else {
        updateStatus('已達最大障礙物數量，點擊格子可清除');
    }

    updateInfo();
}

// 處理手動模式
function handleManualMode(row, col, cell) {
    if (currentMode === 'start') {
        // 移除之前的起點
        document.querySelectorAll('#gridContainer .cell.start').forEach(c => c.classList.remove('start'));

        // 如果之前是障礙物，更新計數
        if (gridWorld.isObstacle(row, col)) {
            gridWorld.removeObstacle(row, col);
            currentObstacles--;
        }

        gridWorld.setStart(row, col);
        cell.classList.add('start');
        cell.classList.remove('end', 'obstacle');
        hasStart = true;
        updateStatus('起點已設置');
    } else if (currentMode === 'end') {
        // 移除之前的終點
        document.querySelectorAll('#gridContainer .cell.end').forEach(c => c.classList.remove('end'));

        // 如果之前是障礙物，更新計數
        if (gridWorld.isObstacle(row, col)) {
            gridWorld.removeObstacle(row, col);
            currentObstacles--;
        }

        gridWorld.setEnd(row, col);
        cell.classList.add('end');
        cell.classList.remove('start', 'obstacle');
        hasEnd = true;
        updateStatus('終點已設置');
    } else if (currentMode === 'obstacle') {
        if (cell.classList.contains('start') || cell.classList.contains('end') || cell.classList.contains('obstacle')) {
            return;
        }

        const success = gridWorld.addObstacle(row, col);
        if (success) {
            cell.classList.add('obstacle');
            currentObstacles++;
            updateStatus(`障礙物已添加 (${currentObstacles}/${maxObstacles})`);
        } else {
            updateStatus(`已達最大障礙物數量 (${maxObstacles})`);
        }
    } else if (currentMode === 'erase') {
        if (cell.classList.contains('obstacle')) {
            gridWorld.removeObstacle(row, col);
            cell.classList.remove('obstacle');
            currentObstacles--;
            updateStatus(`障礙物已清除 (${currentObstacles}/${maxObstacles})`);
        } else if (cell.classList.contains('start')) {
            cell.classList.remove('start');
            gridWorld.start = null;
            hasStart = false;
            updateStatus('起點已清除');
        } else if (cell.classList.contains('end')) {
            cell.classList.remove('end');
            gridWorld.end = null;
            hasEnd = false;
            updateStatus('終點已清除');
        }
    }

    updateInfo();
}

// 更新模式顯示
function updateModeDisplay() {
    // 移除所有按鈕的 active 類
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));

    if (!hasStart) {
        startModeBtn.classList.add('active');
        modeInfo.textContent = '下一步: 設置起點 (點擊格子)';
    } else if (!hasEnd) {
        endModeBtn.classList.add('active');
        modeInfo.textContent = '下一步: 設置終點 (點擊格子)';
    } else if (currentObstacles < maxObstacles) {
        obstacleModeBtn.classList.add('active');
        modeInfo.textContent = `下一步: 設置障礙物 (${currentObstacles}/${maxObstacles})`;
    } else {
        modeInfo.textContent = '設置完成，可執行演算法';
    }
}

// 設置模式（手動覆蓋自動模式，再次點擊同一按鈕返回自動模式）
function setMode(mode) {
    // 如果點擊同一個模式按鈕，返回自動模式
    if (currentMode === mode) {
        currentMode = null;
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        updateModeDisplay();
        return;
    }

    currentMode = mode;

    // 移除所有按鈕的 active 類
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));

    // 添加 active 類到當前按鈕
    if (mode === 'start') {
        startModeBtn.classList.add('active');
        modeInfo.textContent = '手動模式: 設置起點 (再按一次返回自動)';
    } else if (mode === 'end') {
        endModeBtn.classList.add('active');
        modeInfo.textContent = '手動模式: 設置終點 (再按一次返回自動)';
    } else if (mode === 'obstacle') {
        obstacleModeBtn.classList.add('active');
        modeInfo.textContent = '手動模式: 設置障礙物 (再按一次返回自動)';
    } else if (mode === 'erase') {
        eraseModeBtn.classList.add('active');
        modeInfo.textContent = '手動模式: 清除 (再按一次返回自動)';
    }
}

// 在指定容器中顯示策略
function displayPolicyInContainer(container, policy) {
    // 先清除所有箭頭
    container.querySelectorAll('.arrow').forEach(arrow => {
        arrow.textContent = '';
        arrow.style.display = 'none';
    });

    for (let key in policy) {
        const [row, col] = key.split(',').map(Number);
        const cell = container.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        if (cell) {
            const arrow = cell.querySelector('.arrow');
            const action = policy[key];

            arrow.textContent = getArrow(action);
            arrow.style.display = 'block';
        }
    }
}

// 在指定容器中顯示價值函數
function displayValuesInContainer(container, values, gw) {
    // 先清除所有價值顯示
    container.querySelectorAll('.value').forEach(v => {
        v.textContent = '';
        v.style.display = 'none';
    });

    for (let key in values) {
        const [row, col] = key.split(',').map(Number);
        const cell = container.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        if (cell && !gw.isObstacle(row, col)) {
            const valueDisplay = cell.querySelector('.value');
            valueDisplay.textContent = `V: ${values[key]}`;
            valueDisplay.style.display = 'block';
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

// 重置網格
function resetGrid() {
    if (confirm('確定要重置所有設置嗎？')) {
        initializeGrid();
        currentMode = null;
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

// 重置迭代資訊
function resetIterationInfo() {
    if (piIterationInfo) {
        piIterationInfo.innerHTML = '迭代: <strong>0</strong> | 階段: <strong>-</strong>';
    }
    if (viIterationInfo) {
        viIterationInfo.innerHTML = '迭代: <strong>0</strong> | Δ: <strong>-</strong>';
    }
}

// ===== Policy Iteration =====
async function runPolicyIteration() {
    if (!hasStart || !hasEnd) {
        alert('請先設置起點和終點');
        return;
    }

    if (!gridWorld) {
        alert('請先初始化網格');
        return;
    }

    if (piAnimationRunning) {
        alert('Policy Iteration 正在執行中');
        return;
    }

    // 複製設定到 PI GridWorld
    piGridWorld = gridWorld.clone();

    // 創建結果網格
    createResultGrid(piGridContainer, piGridWorld);

    // 開始動畫
    piAnimationRunning = true;
    policyIterationBtn.disabled = true;
    stopPiBtn.disabled = false;

    // 取得生成器
    piIterator = piGridWorld.policyIterationAnimated();

    updateStatus('Policy Iteration 動畫開始...');
    updatePiIterationInfo(0, 'init', false);

    // 逐步執行動畫
    for (const state of piIterator) {
        if (!piAnimationRunning) {
            updateStatus('Policy Iteration 已停止');
            break;
        }

        // 清除之前的路徑動畫
        clearPathAnimation(piGridContainer);

        // 更新顯示
        displayPolicyInContainer(piGridContainer, state.policy);
        displayValuesInContainer(piGridContainer, state.values, piGridWorld);
        updatePiIterationInfo(state.iteration, state.phase, state.converged);

        // 暫存策略到 gridWorld 以便 getOptimalPath 使用
        piGridWorld.policy = state.policy;
        piGridWorld.values = state.values;

        // 取得當前路徑並更新狀態
        const currentPath = piGridWorld.getOptimalPath();
        const pathLength = currentPath.length > 0 ? currentPath.length - 1 : 0;
        const reachedGoal = currentPath.length > 0 &&
            currentPath[currentPath.length - 1].row === piGridWorld.end.row &&
            currentPath[currentPath.length - 1].col === piGridWorld.end.col;

        if (state.converged) {
            updateStatus(`Policy Iteration 收斂！共 ${state.iteration} 次迭代，路徑 ${pathLength} 步`);
            // 播放最終路徑動畫
            await animatePathInContainer(piGridContainer, piGridWorld, animationSpeed);
            break;
        }

        // 播放當前路徑動畫
        if (reachedGoal) {
            updateStatus(`PI 迭代 ${state.iteration} (${state.phase === 'evaluation' ? '評估' : '改進'})：路徑 ${pathLength} 步`);
        } else {
            updateStatus(`PI 迭代 ${state.iteration} (${state.phase === 'evaluation' ? '評估' : '改進'})：尚未找到完整路徑`);
        }
        await animatePathInContainer(piGridContainer, piGridWorld, animationSpeed);

        if (!piAnimationRunning) {
            updateStatus('Policy Iteration 已停止');
            break;
        }

        // 迭代間的短暫停頓
        await delay(200);
    }

    // 結束動畫
    piAnimationRunning = false;
    policyIterationBtn.disabled = false;
    stopPiBtn.disabled = true;
    piIterator = null;
}

function stopPolicyIteration() {
    piAnimationRunning = false;
    updateStatus('正在停止 Policy Iteration...');
}

function updatePiIterationInfo(iteration, phase, converged) {
    if (piIterationInfo) {
        const phaseText = {
            'init': '初始化',
            'evaluation': '策略評估',
            'improvement': '策略改進'
        };
        const convergedText = converged ? ' <span class="converged-badge">已收斂</span>' : '';
        piIterationInfo.innerHTML = `迭代: <strong>${iteration}</strong> | 階段: <strong>${phaseText[phase] || phase}</strong>${convergedText}`;
    }
}

// ===== Value Iteration =====
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

    // 複製設定到 VI GridWorld
    viGridWorld = gridWorld.clone();

    // 創建結果網格
    createResultGrid(viGridContainer, viGridWorld);

    // 開始動畫
    viAnimationRunning = true;
    valueIterationBtn.disabled = true;
    stopViBtn.disabled = false;

    // 取得生成器
    viIterator = viGridWorld.valueIterationAnimated();

    updateStatus('Value Iteration 動畫開始...');
    updateViIterationInfo(0, Infinity, false);

    // 逐步執行動畫
    for (const state of viIterator) {
        if (!viAnimationRunning) {
            updateStatus('Value Iteration 已停止');
            break;
        }

        // 清除之前的路徑動畫
        clearPathAnimation(viGridContainer);

        // 更新顯示
        displayPolicyInContainer(viGridContainer, state.policy);
        displayValuesInContainer(viGridContainer, state.values, viGridWorld);
        updateViIterationInfo(state.iteration, state.delta, state.converged);

        // 暫存策略到 gridWorld 以便 getOptimalPath 使用
        viGridWorld.policy = state.policy;
        viGridWorld.values = state.values;

        // 取得當前路徑並更新狀態
        const currentPath = viGridWorld.getOptimalPath();
        const pathLength = currentPath.length > 0 ? currentPath.length - 1 : 0;
        const reachedGoal = currentPath.length > 0 &&
            currentPath[currentPath.length - 1].row === viGridWorld.end.row &&
            currentPath[currentPath.length - 1].col === viGridWorld.end.col;

        if (state.converged) {
            updateStatus(`Value Iteration 收斂！共 ${state.iteration} 次迭代，路徑 ${pathLength} 步`);
            // 播放最終路徑動畫
            await animatePathInContainer(viGridContainer, viGridWorld, animationSpeed);
            break;
        }

        // 播放當前路徑動畫
        if (reachedGoal) {
            updateStatus(`VI 迭代 ${state.iteration}：路徑 ${pathLength} 步`);
        } else {
            updateStatus(`VI 迭代 ${state.iteration}：尚未找到完整路徑`);
        }
        await animatePathInContainer(viGridContainer, viGridWorld, animationSpeed);

        if (!viAnimationRunning) {
            updateStatus('Value Iteration 已停止');
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
}

function stopValueIteration() {
    viAnimationRunning = false;
    updateStatus('正在停止 Value Iteration...');
}

function updateViIterationInfo(iteration, delta, converged) {
    if (viIterationInfo) {
        const convergedText = converged ? ' <span class="converged-badge">已收斂</span>' : '';
        const deltaText = delta === Infinity ? '∞' : delta.toFixed(3);
        viIterationInfo.innerHTML = `迭代: <strong>${iteration}</strong> | Δ: <strong>${deltaText}</strong>${convergedText}`;
    }
}

// 更新動畫速度
function updateSpeed() {
    animationSpeed = 1100 - parseInt(speedSlider.value);
    speedValue.textContent = `${speedSlider.value}%`;
}

// 延遲函數
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 清除指定容器的路徑動畫
function clearPathAnimation(container) {
    container.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('agent-current', 'path-visited');
    });
}

// 在指定容器中播放路徑動畫
async function animatePathInContainer(container, gw, speed) {
    const path = gw.getOptimalPath();

    if (path.length === 0) {
        return;
    }

    // 計算每步的延遲時間
    const stepDelay = Math.max(50, Math.min(150, speed / path.length));

    // 逐步動畫
    for (let i = 0; i < path.length; i++) {
        const { row, col } = path[i];
        const cell = container.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        if (cell) {
            // 添加 agent 標記
            cell.classList.add('agent-current');

            // 如果不是第一步，移除前一個位置的當前標記並設為已訪問
            if (i > 0) {
                const prevCell = container.querySelector(
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
        const lastCell = container.querySelector(
            `[data-row="${path[path.length - 1].row}"][data-col="${path[path.length - 1].col}"]`
        );
        if (lastCell) {
            lastCell.classList.remove('agent-current');
            lastCell.classList.add('path-visited');
        }
    }
}

// 頁面載入時自動初始化 5x5 網格
window.addEventListener('DOMContentLoaded', () => {
    initializeGrid();
});
