import time

# ==========================================
# 修复 Bug 4：引入独立的眨眼与闭眼状态机
# 区分“快速眨眼”与“长时间闭眼(疲惫)”
# ==========================================
class BlinkDetector:
    def __init__(self, ear_threshold=0.2, blink_min_frames=2, sleep_min_frames=15):
        self.ear_threshold = ear_threshold
        self.blink_min_frames = blink_min_frames 
        self.sleep_min_frames = sleep_min_frames 
        
        self.closed_frames = 0
        self.total_blinks = 0

    def update(self, current_ear):
        is_sleeping = False
        
        if current_ear < self.ear_threshold:
            self.closed_frames += 1
            if self.closed_frames >= self.sleep_min_frames:
                is_sleeping = True # 持续闭眼，判定为疲惫
        else:
            # 只有当眼睛重新睁开时，才结算刚才的闭眼动作
            if self.blink_min_frames <= self.closed_frames < self.sleep_min_frames:
                self.total_blinks += 1 # 判定为一次有效眨眼
            
            self.closed_frames = 0 # 状态重置
            
        return self.total_blinks, is_sleeping

# ==========================================
# 注意力打分与贝叶斯推断引擎
# ==========================================
class AttentionEngine:
    def __init__(self):
        self.session_start = 0
        self.is_calibrating = False
        
        # 基础生理特征池 (数据跨实验累积)
        self.history_blink_freq = []
        self.history_blink_dur = []
        self.history_ear = []
        
        self.score_window = []
        
        self.baseline = {
            "blink_freq": 15,
            "blink_dur": 150,
            "ear": 0.30
        }
        
        # 贝叶斯推断引擎核心变量
        self.optimal_duration_sec = 1500.0 
        self.update_count = 1 
        self.minute_score_buffer = [] 
        self.last_update_time = 0 

    def start_session(self):
        self.session_start = time.time()
        self.is_calibrating = True
        
        # 清空短期缓存，但绝不清空贝叶斯的长期先验与历史生理数据
        self.score_window.clear()
        self.minute_score_buffer.clear()
        self.last_update_time = time.time()

    def calculate_score(self, blink_freq, blink_dur, ear):
        current_opt_min = int(self.optimal_duration_sec / 60)
        
        if self.session_start == 0:
            return 0, 0, 0, 0, "等待测试", current_opt_min

        current_time = time.time()
        elapsed = current_time - self.session_start

        # ==========================================
        # 阶段 1：前 30 秒生理基线建立
        # ==========================================
        if elapsed < 30:
            self.history_blink_freq.append(blink_freq)
            self.history_blink_dur.append(blink_dur)
            
            # 修复 Bug 3：保留真实极小值(而非粗暴截断为0.01)，并增加 epsilon 防止绝对0
            safe_ear = max(ear, 1e-6) 
            self.history_ear.append(safe_ear)
            
            self.baseline['blink_freq'] = max(5, sum(self.history_blink_freq) / len(self.history_blink_freq))
            self.baseline['blink_dur'] = sum(self.history_blink_dur) / len(self.history_blink_dur)
            self.baseline['ear'] = sum(self.history_ear) / len(self.history_ear)

            return 50, 30, 20, 100, f"提取生理基线... ({int(30-elapsed)}s)", current_opt_min
        
        # ==========================================
        # 阶段 2：实时特征打分
        # ==========================================
        base_bf = self.baseline['blink_freq']
        base_dur = self.baseline['blink_dur']
        
        # 提取基线时增加数学保护，防止分母为0
        base_ear = max(self.baseline['ear'], 1e-6) 

        freq_penalty = (blink_freq - base_bf * 1.3) * 3 if blink_freq > base_bf * 1.3 else 0
        b_score = max(0, 50 - freq_penalty)

        dur_penalty = ((blink_dur - (base_dur + 50)) / 50.0) * 6 if blink_dur > base_dur + 50 else 0
        d_score = max(0, 30 - dur_penalty)

        # 修复除法安全问题：当 base_ear 极小时，确保除法不会崩溃
        if ear >= base_ear * 0.85: 
            e_score = 20
        elif ear >= base_ear * 0.70: 
            denominator = max(base_ear * 0.15, 1e-6) # 数学极小值保护
            e_score = 10 + ((ear - base_ear * 0.70) / denominator) * 10
        else: 
            e_score = 0
            
        raw_total_score = b_score + d_score + e_score

        self.score_window.append(raw_total_score)
        if len(self.score_window) > 90: 
            self.score_window.pop(0)
            
        avg_score = sum(self.score_window) / len(self.score_window)
        status = "状态极佳" if avg_score >= 75 else ("轻度走神" if avg_score >= 60 else "持续分心")

        # ==========================================
        # 阶段 3：Dynamic Bayesian Updating
        # ==========================================
        self.minute_score_buffer.append(avg_score)

        if current_time - self.last_update_time >= 60:
            # 增加 max() 保护，防止极小概率下的分母为0
            minute_avg = sum(self.minute_score_buffer) / max(len(self.minute_score_buffer), 1)
            
            Z = self.optimal_duration_sec * (minute_avg / 75.0)
            
            K = max(0.05, 1.0 / (1.0 + self.update_count * 0.6))
            
            self.optimal_duration_sec = (1 - K) * self.optimal_duration_sec + K * Z
            
            self.update_count += 1
            self.minute_score_buffer.clear()
            self.last_update_time = current_time
            
            print(f"🔄 贝叶斯更新触发: 本分钟均分 {minute_avg:.1f} | 新预测专注极限: {self.optimal_duration_sec/60:.1f} 分钟")

        final_opt_min = int(self.optimal_duration_sec / 60)
        return round(b_score, 1), round(d_score, 1), round(e_score, 1), round(avg_score, 1), status, final_opt_min
