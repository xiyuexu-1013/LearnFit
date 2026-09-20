// core/engine.js - 纯前端贝叶斯专注度评估引擎
export class FocusEngine {
    constructor() {
        this.sessionStart = 0;
        this.history = { bf: [], bd: [], ear: [] };
        this.scoreWindow = [];
        this.baseline = { bf: 15, bd: 150, ear: 0.30 };
        this.optimalDurationSec = 1500; // 默认 25 分钟
        this.updateCount = 1;
        this.minuteScoreBuffer = [];
        this.lastUpdateTime = 0;
    }

    start() {
        this.sessionStart = Date.now() / 1000;
        this.scoreWindow = [];
        this.minuteScoreBuffer = [];
        this.lastUpdateTime = Date.now() / 1000;
    }

    calculate(bf, bd, ear) {
        if (this.sessionStart === 0) {
            return { score: 0, status: "Awaiting Stream", opt: Math.round(this.optimalDurationSec / 60) };
        }

        const current = Date.now() / 1000;
        const elapsed = current - this.sessionStart;

        // 30秒动态基线校准期
        if (elapsed < 30) {
            this.history.bf.push(bf);
            this.history.bd.push(bd);
            this.history.ear.push(ear);
            
            this.baseline.bf = Math.max(5, this.history.bf.reduce((a, b) => a + b, 0) / this.history.bf.length);
            this.baseline.bd = this.history.bd.reduce((a, b) => a + b, 0) / this.history.bd.length || 150;
            this.baseline.ear = this.history.ear.reduce((a, b) => a + b, 0) / this.history.ear.length || 0.3;

            return {
                score: 100,
                status: `Calibrating (${Math.round(30 - elapsed)}s)`,
                opt: Math.round(this.optimalDurationSec / 60)
            };
        }

        // 基于 EAR 和眨眼的综合打分
        const bScore = Math.max(0, 50 - (bf > this.baseline.bf * 1.3 ? (bf - this.baseline.bf * 1.3) * 3 : 0));
        const dScore = Math.max(0, 30 - (bd > this.baseline.bd + 50 ? ((bd - (this.baseline.bd + 50)) / 50.0) * 6 : 0));
        const eScore = ear >= this.baseline.ear * 0.85 ? 20 : (ear >= this.baseline.ear * 0.70 ? 10 + ((ear - this.baseline.ear * 0.70) / (this.baseline.ear * 0.15)) * 10 : 0);

        const rawScore = bScore + dScore + eScore;
        this.scoreWindow.push(rawScore);
        if (this.scoreWindow.length > 90) this.scoreWindow.shift();

        const avgScore = this.scoreWindow.reduce((a, b) => a + b, 0) / this.scoreWindow.length;

        // 动态疲劳临界点测算
        this.minuteScoreBuffer.push(avgScore);
        if (current - this.lastUpdateTime >= 60) {
            const minAvg = this.minuteScoreBuffer.reduce((a, b) => a + b, 0) / this.minuteScoreBuffer.length;
            const Z = this.optimalDurationSec * (minAvg / 75.0);
            const K = Math.max(0.05, 1.0 / (1.0 + this.updateCount * 0.6));
            this.optimalDurationSec = (1 - K) * this.optimalDurationSec + K * Z;
            this.updateCount++;
            this.minuteScoreBuffer = [];
            this.lastUpdateTime = current;
        }

        let status = "Optimal Focus";
        if (avgScore < 60) status = "Need Break";
        else if (avgScore < 75) status = "Mild Distraction";

        return {
            score: Math.round(avgScore),
            bScore: Math.round(bScore),
            dScore: Math.round(dScore),
            eScore: Math.round(eScore),
            status: status,
            opt: Math.round(this.optimalDurationSec / 60)
        };
    }
}
