import time

class AttentionEngine:
    def __init__(self):
        self.session_start = 0
        self.is_calibrating = False
        
        # 缓存前30秒的数据用于计算基线
        self.history_blink_freq = []
        self.history_blink_dur = []
        self.history_ear = []
        
        # 个人专属基准线
        self.baseline = {
            "blink_freq": 15, # 默认安全值兜底
            "blink_dur": 150,
            "ear": 0.30
        }
        
        self.focus_limit_found = False
        self.optimal_duration = 0 # 最终算出的“你个人能专注多久”

    def start_session(self):
        """当网页端点击 START EXP 时调用，重置并开始校准"""
        self.session_start = time.time()
        self.is_calibrating = True
        self.history_blink_freq.clear()
        self.history_blink_dur.clear()
        self.history_ear.clear()
        self.focus_limit_found = False
        self.optimal_duration = 0
        print("🔄 AI 引擎进入静默校准模式 (30秒)...")

    def calculate_score(self, blink_freq, blink_dur, ear):
        if self.session_start == 0:
            return 0, 0, 0, 0, "Awaiting Start", 0

        elapsed = time.time() - self.session_start

        # ==========================================
        # 阶段 1：静默校准期 (0-30秒)
        # 收集你的生理数据，不随意扣分，满分运行
        # ==========================================
        if elapsed < 30:
            self.history_blink_freq.append(blink_freq)
            self.history_blink_dur.append(blink_dur)
            self.history_ear.append(ear)
            return 50, 30, 20, 100, f"Calibrating ({int(30-elapsed)}s)", 0
        
        # ==========================================
        # 阶段 2：基线确立 (第30秒)
        # ==========================================
        if self.is_calibrating and elapsed >= 30:
            self.is_calibrating = False
            if self.history_blink_freq:
                # 算出你的真实基础频率 (避免过低，设一个 5 的下限)
                self.baseline['blink_freq'] = max(5, sum(self.history_blink_freq) / len(self.history_blink_freq))
                self.baseline['blink_dur'] = sum(self.history_blink_dur) / len(self.history_blink_dur)
                self.baseline['ear'] = sum(self.history_ear) / len(self.history_ear)
            print(f"✅ 校准完成! 你的专属基线: 眨眼 {self.baseline['blink_freq']:.1f}次/分, EAR: {self.baseline['ear']:.2f}")
        
        # ==========================================
        # 阶段 3：动态打分机制 (依据你的专属基线)
        # ==========================================
        base_bf = self.baseline['blink_freq']
        base_dur = self.baseline['blink_dur']
        base_ear = self.baseline['ear']

        # 1. 眨眼频率 (超过你个人基线的 1.3 倍才开始惩罚)
        freq_penalty = 0
        if blink_freq > base_bf * 1.3:
            freq_penalty = (blink_freq - base_bf * 1.3) * 3
        b_score = max(0, 50 - freq_penalty)

        # 2. 眨眼时长 (比你平时多出 50ms 以上才扣分)
        dur_penalty = 0
        if blink_dur > base_dur + 50:
            dur_penalty = ((blink_dur - (base_dur + 50)) / 50.0) * 6
        d_score = max(0, 30 - dur_penalty)

        # 3. 眼睑张合度 (如果你的 EAR 降到了你平时的 80% 以下，说明犯困了)
        if ear >= base_ear * 0.85:
            e_score = 20
        elif ear >= base_ear * 0.70:
            e_score = 10 + ((ear - base_ear * 0.70) / (base_ear * 0.15)) * 10
        else:
            e_score = 0
            
        total_score = b_score + d_score + e_score

        # ==========================================
        # 阶段 4：寻找你的极限专注时长
        # 当分数首次持续跌破 60 分时，记录当前经过的时间
        # ==========================================
        status = "有效专注"
        if total_score < 60:
            status = "持续分心"
            # 抓取你的个人极限阈值
            if not self.focus_limit_found and elapsed > 35:
                self.optimal_duration = int(elapsed)
                self.focus_limit_found = True
        elif total_score < 70:
            status = "轻度走神"

        return round(b_score, 1), round(d_score, 1), round(e_score, 1), round(total_score, 1), status, self.optimal_duration
