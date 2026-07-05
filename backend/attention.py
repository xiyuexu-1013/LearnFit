import time

class AttentionEngine:
    def __init__(self):
        self.session_start = 0
        
        # 核心改动 1：去掉清理机制。
        # 只要代码不重启，你每一次测算的前30秒数据都会被累加到这里。
        # 收集越多，系统越懂你的生理状态！
        self.history_blink_freq = []
        self.history_blink_dur = []
        self.history_ear = []
        
        self.score_window = []
        
        self.baseline = {
            "blink_freq": 15,
            "blink_dur": 150,
            "ear": 0.30
        }
        
        # 核心改动 2：用于计算真正的“持续专注学习时间”
        self.focus_streak_start = 0  # 这一波专注是从几秒开始的
        self.current_focus_streak = 0 # 当前连续专注了多久
        self.optimal_duration = 0     # 你的历史最高记录（专注极限）
        self.is_currently_focused = True 

    def start_session(self):
        self.session_start = time.time()
        # 注意：这里删掉了 self.history_xxx.clear() 
        self.score_window.clear() # 只有平滑窗口需要重置
        
        self.focus_streak_start = time.time() # 记录专注开始的时间点
        self.is_currently_focused = True
        # 不重置 optimal_duration，保留你的历史最高纪录！

    def calculate_score(self, blink_freq, blink_dur, ear):
        if self.session_start == 0:
            return 0, 0, 0, 0, "等待测试", self.optimal_duration

        current_time = time.time()
        elapsed = current_time - self.session_start

        # ==========================================
        # 阶段 1：前 30 秒默认完全专注，不断累积你的个人特征！
        # ==========================================
        if elapsed < 30:
            self.history_blink_freq.append(blink_freq)
            self.history_blink_dur.append(blink_dur)
            self.history_ear.append(ear)
            
            # 实时更新基线：因为数据没有被clear，这里的数据池会越来越大，越算越准
            self.baseline['blink_freq'] = max(5, sum(self.history_blink_freq) / len(self.history_blink_freq))
            self.baseline['blink_dur'] = sum(self.history_blink_dur) / len(self.history_blink_dur)
            self.baseline['ear'] = sum(self.history_ear) / len(self.history_ear)

            # 默认前30秒处于连续专注状态
            self.current_focus_streak = int(current_time - self.focus_streak_start)
            if self.current_focus_streak > self.optimal_duration:
                self.optimal_duration = self.current_focus_streak
                
            return 50, 30, 20, 100, f"静默学习中... ({int(30-elapsed)}s)", self.optimal_duration
        
        # ==========================================
        # 阶段 2：30秒后基于你的庞大数据库进行动态打分
        # ==========================================
        base_bf = self.baseline['blink_freq']
        base_dur = self.baseline['blink_dur']
        base_ear = self.baseline['ear']

        freq_penalty = 0
        if blink_freq > base_bf * 1.3: 
            freq_penalty = (blink_freq - base_bf * 1.3) * 3
        b_score = max(0, 50 - freq_penalty)

        dur_penalty = 0
        if blink_dur > base_dur + 50: 
            dur_penalty = ((blink_dur - (base_dur + 50)) / 50.0) * 6
        d_score = max(0, 30 - dur_penalty)

        if ear >= base_ear * 0.85:
            e_score = 20
        elif ear >= base_ear * 0.70:
            e_score = 10 + ((ear - base_ear * 0.70) / (base_ear * 0.15)) * 10
        else:
            e_score = 0
            
        raw_total_score = b_score + d_score + e_score

        self.score_window.append(raw_total_score)
        if len(self.score_window) > 90: 
            self.score_window.pop(0)
            
        avg_score = sum(self.score_window) / len(self.score_window)

        # ==========================================
        # 阶段 3：计算真正的“持续专注时长” (Focus Streak)
        # ==========================================
        if avg_score >= 60:
            status = "正常运行" if avg_score >= 75 else "轻度走神"
            if not self.is_currently_focused:
                # 如果你刚刚从分心状态调整回来，重新开始计算新一轮的专注时长！
                self.is_currently_focused = True
                self.focus_streak_start = current_time
            
            # 累加当前的连续专注时长
            self.current_focus_streak = int(current_time - self.focus_streak_start)
            
            # 如果这一次的专注时长打破了历史记录，立刻更新极限时长！
            if self.current_focus_streak > self.optimal_duration:
                self.optimal_duration = self.current_focus_streak
        else:
            status = "持续分心"
            self.is_currently_focused = False
            # 专注被打断，当前连续时长清零，等待你下一次进入状态
            self.current_focus_streak = 0

        return round(b_score, 1), round(d_score, 1), round(e_score, 1), round(avg_score, 1), status, self.optimal_duration
