from flask import Flask, render_template, request, jsonify
import numpy as np
import random

app = Flask(__name__)

class GridWorld:
    def __init__(self, n):
        self.n = n
        self.grid = np.zeros((n, n))
        self.start = None
        self.end = None
        self.obstacles = []
        self.policy = {}
        self.values = {}

    def set_start(self, row, col):
        self.start = (row, col)

    def set_end(self, row, col):
        self.end = (row, col)

    def add_obstacle(self, row, col):
        if len(self.obstacles) < self.n - 2:
            self.obstacles.append((row, col))
            return True
        return False

    def remove_obstacle(self, row, col):
        if (row, col) in self.obstacles:
            self.obstacles.remove((row, col))
            return True
        return False

    def generate_random_policy(self):
        """為每個單元格生成隨機行動（上、下、左、右）"""
        actions = ['up', 'down', 'left', 'right']
        self.policy = {}

        for i in range(self.n):
            for j in range(self.n):
                if (i, j) != self.end and (i, j) not in self.obstacles:
                    self.policy[(i, j)] = random.choice(actions)

        return self.policy

    def get_next_state(self, state, action):
        """根據行動獲取下一個狀態"""
        row, col = state

        if action == 'up':
            next_state = (max(0, row - 1), col)
        elif action == 'down':
            next_state = (min(self.n - 1, row + 1), col)
        elif action == 'left':
            next_state = (row, max(0, col - 1))
        elif action == 'right':
            next_state = (row, min(self.n - 1, col + 1))
        else:
            next_state = state

        # 如果下一個狀態是障礙物，則停留在原地
        if next_state in self.obstacles:
            return state

        return next_state

    def policy_evaluation(self, gamma=0.9, theta=0.01, max_iterations=1000):
        """策略評估：計算給定策略下每個狀態的價值函數 V(s)"""
        # 初始化價值函數
        V = {}
        for i in range(self.n):
            for j in range(self.n):
                V[(i, j)] = 0.0

        # 迭代更新價值函數
        for iteration in range(max_iterations):
            delta = 0

            for i in range(self.n):
                for j in range(self.n):
                    state = (i, j)

                    # 跳過終點和障礙物
                    if state == self.end or state in self.obstacles:
                        continue

                    v = V[state]

                    # 獲取當前狀態的行動
                    if state in self.policy:
                        action = self.policy[state]
                        next_state = self.get_next_state(state, action)

                        # 獎勵設置：到達終點 +10，其他 -1
                        if next_state == self.end:
                            reward = 10
                        else:
                            reward = -1

                        # Bellman 更新方程
                        V[state] = reward + gamma * V[next_state]

                    delta = max(delta, abs(v - V[state]))

            # 如果變化很小，則收斂
            if delta < theta:
                break

        self.values = V
        return V

# 全局變量存儲 GridWorld 實例
grid_world = None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/initialize', methods=['POST'])
def initialize():
    global grid_world
    data = request.json
    n = data.get('n', 5)

    # 驗證 n 的範圍
    if n < 5 or n > 9:
        return jsonify({'error': 'Grid size must be between 5 and 9'}), 400

    grid_world = GridWorld(n)
    return jsonify({'success': True, 'n': n})

@app.route('/set_cell', methods=['POST'])
def set_cell():
    global grid_world
    if grid_world is None:
        return jsonify({'error': 'Grid not initialized'}), 400

    data = request.json
    cell_type = data.get('type')
    row = data.get('row')
    col = data.get('col')

    if cell_type == 'start':
        grid_world.set_start(row, col)
    elif cell_type == 'end':
        grid_world.set_end(row, col)
    elif cell_type == 'obstacle':
        success = grid_world.add_obstacle(row, col)
        if not success:
            return jsonify({'error': f'Maximum {grid_world.n - 2} obstacles allowed'}), 400
    elif cell_type == 'remove_obstacle':
        grid_world.remove_obstacle(row, col)

    return jsonify({'success': True})

@app.route('/generate_policy', methods=['POST'])
def generate_policy():
    global grid_world
    if grid_world is None:
        return jsonify({'error': 'Grid not initialized'}), 400

    if grid_world.start is None or grid_world.end is None:
        return jsonify({'error': 'Please set start and end positions'}), 400

    policy = grid_world.generate_random_policy()

    # 轉換為可序列化的格式
    policy_dict = {f"{k[0]},{k[1]}": v for k, v in policy.items()}

    return jsonify({'success': True, 'policy': policy_dict})

@app.route('/evaluate_policy', methods=['POST'])
def evaluate_policy():
    global grid_world
    if grid_world is None:
        return jsonify({'error': 'Grid not initialized'}), 400

    if not grid_world.policy:
        return jsonify({'error': 'Please generate policy first'}), 400

    values = grid_world.policy_evaluation()

    # 轉換為可序列化的格式
    values_dict = {f"{k[0]},{k[1]}": round(v, 2) for k, v in values.items()}

    return jsonify({'success': True, 'values': values_dict})

@app.route('/get_state', methods=['GET'])
def get_state():
    global grid_world
    if grid_world is None:
        return jsonify({'error': 'Grid not initialized'}), 400

    obstacles_list = [{'row': obs[0], 'col': obs[1]} for obs in grid_world.obstacles]

    state = {
        'n': grid_world.n,
        'start': {'row': grid_world.start[0], 'col': grid_world.start[1]} if grid_world.start else None,
        'end': {'row': grid_world.end[0], 'col': grid_world.end[1]} if grid_world.end else None,
        'obstacles': obstacles_list
    }

    return jsonify(state)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
