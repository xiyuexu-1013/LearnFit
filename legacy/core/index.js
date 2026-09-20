// core/index.js - 对外统一接口
import { FocusEngine } from './engine.js';

export class EyeFocusTracker {
    constructor() {
        this.engine = new FocusEngine();
        this.listeners = {};
    }

    on(event, callback) {
        this.listeners[event] = callback;
    }

    emit(event, data) {
        if (this.listeners[event]) this.listeners[event](data);
    }

    start() {
        this.engine.start();
        this.emit('status', 'Started');
    }

    // 接收从前端视频流算出的 EAR 和 眨眼指标
    update(bf, bd, ear) {
        const metrics = this.engine.calculate(bf, bd, ear);
        this.emit('focusScore', metrics);
    }
}
