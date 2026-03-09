// 全局變量
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
async function initializeGrid() {
    const n = parseInt(gridSizeInput.value);

    if (n < 5 || n > 9) {
        alert('網格大小必須在 5 到 9 之間');
        return;
    }

    try {
        const response = await fetch('/initialize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ n: n }),
        });

        const data = await response.json();

        if (data.success) {
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
        } else {
            alert('初始化失敗: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('初始化失敗');
    }
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
async function handleCellClick(row, col, cell) {
    if (!currentMode) {
        alert('請先選擇設置模式');
        return;
    }

    try {
        if (currentMode === 'start') {
            // 移除之前的起點
            document.querySelectorAll('.cell.start').forEach(c => c.classList.remove('start'));

            const response = await fetch('/set_cell', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type: 'start', row: row, col: col }),
            });

            const data = await response.json();
            if (data.success) {
                cell.classList.add('start');
                cell.classList.remove('end', 'obstacle');
                hasStart = true;
                updateStatus('起點已設置');
            }
        } else if (currentMode === 'end') {
            // 移除之前的終點
            document.querySelectorAll('.cell.end').forEach(c => c.classList.remove('end'));

            const response = await fetch('/set_cell', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type: 'end', row: row, col: col }),
            });

            const data = await response.json();
            if (data.success) {
                cell.classList.add('end');
                cell.classList.remove('start', 'obstacle');
                hasEnd = true;
                updateStatus('終點已設置');
            }
        } else if (currentMode === 'obstacle') {
            if (cell.classList.contains('obstacle')) {
                return;
            }

            const response = await fetch('/set_cell', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type: 'obstacle', row: row, col: col }),
            });

            const data = await response.json();
            if (data.success) {
                cell.classList.add('obstacle');
                cell.classList.remove('start', 'end');
                currentObstacles++;
                updateInfo();
                updateStatus(`障礙物已添加 (${currentObstacles}/${maxObstacles})`);
            } else {
                alert(data.error);
            }
        } else if (currentMode === 'erase') {
            if (cell.classList.contains('obstacle')) {
                const response = await fetch('/set_cell', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ type: 'remove_obstacle', row: row, col: col }),
                });

                const data = await response.json();
                if (data.success) {
                    cell.classList.remove('obstacle');
                    currentObstacles--;
                    updateInfo();
                    updateStatus('障礙物已清除');
                }
            }
        }

        updateInfo();
    } catch (error) {
        console.error('Error:', error);
        alert('操作失敗');
    }
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
async function generatePolicy() {
    if (!hasStart || !hasEnd) {
        alert('請先設置起點和終點');
        return;
    }

    try {
        const response = await fetch('/generate_policy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (data.success) {
            policy = data.policy;
            displayPolicy();
            updateStatus('隨機策略已生成');
        } else {
            alert('生成策略失敗: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('生成策略失敗');
    }
}

// 顯示策略
function displayPolicy() {
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
async function evaluatePolicy() {
    if (!policy) {
        alert('請先生成策略');
        return;
    }

    try {
        const response = await fetch('/evaluate_policy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (data.success) {
            values = data.values;
            displayValues();
            updateStatus('策略評估完成，已顯示 V(s)');
        } else {
            alert('評估策略失敗: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('評估策略失敗');
    }
}

// 顯示價值函數
function displayValues() {
    for (let key in values) {
        const [row, col] = key.split(',').map(Number);
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);

        if (cell) {
            const valueDisplay = cell.querySelector('.value');
            valueDisplay.textContent = `V: ${values[key]}`;
            valueDisplay.style.display = 'block';
        }
    }
}

// 重置網格
async function resetGrid() {
    if (confirm('確定要重置所有設置嗎？')) {
        await initializeGrid();
        currentMode = null;
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        modeInfo.textContent = '當前模式: 未選擇';
    }
}

// 更新資訊顯示
function updateInfo() {
    obstacleCount.textContent = `障礙物數量: ${currentObstacles} / ${maxObstacles}`;
}

// 更新狀態資訊
function updateStatus(message) {
    statusInfo.textContent = `狀態: ${message}`;
}
