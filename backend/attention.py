class AttentionEngine:
    def __init__(self):
        self.optimal_threshold = 35

    def calculate_score(self, blink_freq, blink_dur, pupil_dia, mar, pitch, yaw):
        # 1. Blink Freq Score (Max 50)
        b_score = 50 if blink_freq <= 10 else max(0, 50 - ((blink_freq - 10) * 5))
        
        # 2. Blink Duration Score (Max 30)
        if blink_dur <= 250:
            d_score = 30
        elif blink_dur >= 500:
            d_score = 0
        else:
            d_score = max(0, 30 - int((blink_dur - 250) // 50) * 6)
            
        # 3. Pupil Score (Max 20)
        p_score = 20 if pupil_dia >= 3.0 else 0
        
        total_score = b_score + d_score + p_score

        # 4. 融合额外特征惩罚
        if mar > 0.6:  # 打哈欠严重
            total_score = max(0, total_score - 20)
        if abs(yaw) > 25 or abs(pitch) > 20: # 偏头过大
            total_score = max(0, total_score - 15)

        # 5. 状态机判定
        if total_score >= 70:
            status = "Continue Learning"
        elif total_score >= 60:
            status = "Monitor Status"
        else:
            status = "Take a Break"

        return b_score, d_score, p_score, total_score, status
