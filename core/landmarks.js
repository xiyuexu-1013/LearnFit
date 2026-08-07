/**
 * 眼部几何计算与 MediaPipe 关键点解析模块
 */

// MediaPipe 468 人脸关键点中的左右眼索引定义
export const EYE_LANDMARKS = {
    LEFT: [33, 160, 158, 133, 153, 144],
    RIGHT: [362, 385, 387, 263, 373, 380]
};

/**
 * 欧几里得距离计算
 */
export function euclideanDistance(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * 计算 Eye Aspect Ratio (EAR)
 * 公式: EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 */
export function calculateEAR(landmarks, indices) {
    const p = indices.map(i => landmarks[i]);
    const vertical1 = euclideanDistance(p[1], p[5]);
    const vertical2 = euclideanDistance(p[2], p[4]);
    const horizontal = euclideanDistance(p[0], p[3]);
    
    if (horizontal === 0) return 0;
    return (vertical1 + vertical2) / (2.0 * horizontal);
}
