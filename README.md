# LearnFit
# LearnFit: AI-Powered Personalized Focus Rhythm Detection

![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![OpenCV](https://img.shields.io/badge/OpenCV-4.x-green)
![MediaPipe](https://img.shields.io/badge/MediaPipe-FaceMesh-orange)
![WebSocket](https://img.shields.io/badge/WebSocket-RealTime-lightgrey)

> **LearnFit** 是一个基于多模态面部特征与眼动追踪的实时专注度量化评估系统。本项目专为科创比赛与认知科学研究设计，通过消费级摄像头即可实现毫秒级的专注力波动监控与个性化学习阈值发现。

##  项目背景与核心价值

在传统学习场景中，由于缺乏客观的“认知投入”监测手段，学习者往往容易陷入“无效延时（硬学）”的陷阱。
LearnFit 系统通过非接触式的计算机视觉技术，实时提取用户的眼部（EAR）、嘴部（MAR）与头部姿态（Head Pose）特征，融合认知心理学文献验证的 AHP 权重模型，为用户输出精准的 **0~100 实时专注度评分**，并发现个体的“最优专注时长阈值”。

##  系统架构 (Pipeline)

系统采用严密的 **前端显示分离 + 后端算法解耦** 架构：

1. **视觉捕获 (Camera)**: OpenCV 实时提取 60fps 视频流。
2. **特征解析 (Face Mesh)**: 运用 MediaPipe 提取 478 个人脸密集关键点。
3. **指标量化 (Metrics)**: 计算 EAR (眼睛纵横比), MAR (嘴巴纵横比), 瞳孔直径估算及 3D 头部姿态。
4. **决策引擎 (Attention Engine)**: 融合多模态特征，输出 Focus Score。
5. **实时通信 (WebSocket)**: 异步微秒级数据下发。
6. **全息看板 (Dashboard V3)**: 玻璃拟物态 UI，提供极致的科研数据可视化。

---

##  核心算法与评分模型 (Scoring Logic)

本项目的专注度算法 (Attention Score) 深度参考了 TVST 与 PMC 相关的眼动与心智游移（Mind Wandering）交叉研究文献，采用 **基准扣分制与权重融合机制**：

*   **眨眼频率 (Blink Frequency) - 权重 50%**
    *   *基准阈值*：≤ 10次/分钟（满分50分）
    *   *衰减逻辑*：超过阈值后，每多1次/分扣除5分。
*   **眨眼时长 (Blink Duration) - 权重 30%**
    *   *基准阈值*：≤ 250ms（满分30分）
    *   *衰减逻辑*：区分正常眨眼与微睡眠，超过 250ms 后实行阶梯扣分。
*   **瞳孔静息直径估算 (Pupil Diameter) - 权重 20%**
    *   *基准阈值*：≥ 3.0mm（满分20分）
    *   *衰减逻辑*：侦测认知投入下降导致的瞳孔收缩。
*   **多模态惩罚项 (Penalties)**
    *   *打哈欠检测 (MAR > 0.6)*：瞬时扣除 20 分。
    *   *注意力脱离 (Yaw > 25° / Pitch > 20°)*：头部严重偏离工作区，瞬时扣除 15 分。

---

##  快速启动 (Quick Start)

无需复杂的配置，跟随以下步骤在本地运行完整的 LearnFit 系统。

### 1. 克隆代码仓库
```bash
git clone [https://github.com/你的用户名/LearnFit_Project.git](https://github.com/你的用户名/LearnFit_Project.git)
cd LearnFit_Project
