import time

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
        
        # ==========================================
        # 贝叶斯推断引擎核心变量
        # ==========================================
        # 先验 (Prior): 默认最优时长为 25 分钟 (1500秒)
        self.optimal_duration_sec = 1500.0 
        
        self.update_count = 1 # 观测轮数，用于计算置信度
        self.minute_score_buffer = [] # 暂存最近 1 分钟的所有分数
        self.last_update_time = 0 # 记录上一次贝叶斯更新的时间节点

    def start_session(self):
        self.session_start = time.time()
        self.is_calibrating = True
        
        # 清空短期缓存，但【绝不清空】贝叶斯的长期先验 (optimal_duration) 
        # 和历史生理数据，让它越用越懂你！
        self.score_window.clear()
        self.minute_score_buffer.clear()
        self.last_update_time = time.time()

    def calculate_score(self, blink_freq, blink_dur, ear):
        # 网页端展示时，我们将秒换算成分钟返回
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
            self.history_ear.append(ear)
            
            self.baseline['blink_freq'] = max(5, sum(self.history_blink_freq) / len(self.history_blink_freq))
            self.baseline['blink_dur'] = sum(self.history_blink_dur) / len(self.history_blink_dur)
            self.baseline['ear'] = sum(self.history_ear) / len(self.history_ear)

            return 50, 30, 20, 100, f"提取生理基线... ({int(30-elapsed)}s)", current_opt_min
        
        # ==========================================
        # 阶段 2：实时特征打分
        # ==========================================
        base_bf = self.baseline['blink_freq']
        base_dur = self.baseline['blink_dur']
        base_ear = self.baseline['ear']

        freq_penalty = (blink_freq - base_bf * 1.3) * 3 if blink_freq > base_bf * 1.3 else 0
        b_score = max(0, 50 - freq_penalty)

        dur_penalty = ((blink_dur - (base_dur + 50)) / 50.0) * 6 if blink_dur > base_dur + 50 else 0
        d_score = max(0, 30 - dur_penalty)

        if ear >= base_ear * 0.85: e_score = 20
        elif ear >= base_ear * 0.70: e_score = 10 + ((ear - base_ear * 0.70) / (base_ear * 0.15)) * 10
        else: e_score = 0
            
        raw_total_score = b_score + d_score + e_score

        self.score_window.append(raw_total_score)
        if len(self.score_window) > 90: 
            self.score_window.pop(0)
            
        avg_score = sum(self.score_window) / len(self.score_window)
        status = "状态极佳" if avg_score >= 75 else ("轻度走神" if avg_score >= 60 else "持续分心")

        # ==========================================
        # 阶段 3：Dynamic Bayesian Updating (动态贝叶斯更新)
        # ==========================================
        self.minute_score_buffer.append(avg_score)

        # 核心：每经过 60 秒，触发一次贝叶斯后验推断
        if current_time - self.last_update_time >= 60:
            # 1. 提取似然观测值 (Likelihood)
            # 计算这 1 分钟的平均专注度
            minute_avg = sum(self.minute_score_buffer) / len(self.minute_score_buffer)
            
            # 2. 映射观测偏差 (Observation Z)
            # 假设 75 分是基准阈值。如果均分高于 75，说明专注力充沛，Z值会上调；低于75则下调。
            Z = self.optimal_duration_sec * (minute_avg / 75.0)
            
            # 3. 计算动态学习率 (Dynamic Kalman Gain / Bayesian Weight)
            # update_count 越大，K 越小，意味着系统越来越“确信”它的结论。
            # 兜底 0.05 保证了系统永远具备“可增可跌”的弹性。
            K = max(0.05, 1.0 / (1.0 + self.update_count * 0.6))
            
            # 4. 贝叶斯后验更新 (Posterior Update)
            self.optimal_duration_sec = (1 - K) * self.optimal_duration_sec + K * Z
            
            # 为下一个一分钟推断做准备
            self.update_count += 1
            self.minute_score_buffer.clear()
            self.last_update_time = current_time
            
            print(f"🔄 贝叶斯更新触发: 本分钟均分 {minute_avg:.1f} | 新预测专注极限: {self.optimal_duration_sec/60:.1f} 分钟")

        final_opt_min = int(self.optimal_duration_sec / 60)
        return round(b_score, 1), round(d_score, 1), round(e_score, 1), round(avg_score, 1), status, final_opt_min
