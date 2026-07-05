import cv2
import threading
import asyncio
import time
import csv
import base64 # 新增：用于图像转码发送给前端
from datetime import datetime

from backend.camera import Camera
from backend.face_detector import FaceDetector
from backend.eye import EyeFeatures
from backend.blink import BlinkDetector
from backend.head_pose import HeadPoseEstimator
from backend.fatigue import FatigueDetector
from backend.attention import AttentionEngine
from backend.websocket_server import WSServer

# 全局实验状态变量[cite: 1]
is_recording = False
csv_file = None
csv_writer = None

def process_commands(ws_server):
    """处理来自前端看板的控制指令"""
    global is_recording, csv_file, csv_writer
    while ws_server.command_queue:
        cmd = ws_server.command_queue.pop(0)
        if cmd.get("action") == "start":
            if not is_recording:
                is_recording = True
                filename = f"LearnFit_Data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                csv_file = open(filename, mode='w', newline='', encoding='utf-8')
                csv_writer = csv.writer(csv_file)
                csv_writer.writerow(["Timestamp", "FocusScore", "BlinkFreq", "BlinkDur", "PupilDia", "Status"])
                print(f"⏺️ 实验开始，数据正写入: {filename}")
        elif cmd.get("action") == "stop":
            if is_recording:
                is_recording = False
                if csv_file:
                    csv_file.close()
                print("⏹️ 实验结束，文件已保存。")

def run_vision_pipeline(ws_server):
    global is_recording, csv_writer
    cam = Camera(camera_index=0) # 核心修改 1：强制绑定电脑自带摄像头 (通常 index 为 0)
    detector = FaceDetector()
    blink_tracker = BlinkDetector()
    pose_estimator = HeadPoseEstimator()
    attention_engine = AttentionEngine()

    try:
        while True:
            start_time = time.time()
            process_commands(ws_server) # 检查前端指令[cite: 1]

            frame = cam.get_frame()
            if frame is None:
                continue
                
            h, w = frame.shape[:2]
            
            # 初始化 payload，确保即使没有检测到人脸也能把画面传过去
            payload = {"focus_score": 0, "status": "Awaiting Face"}
            
            # 全局防崩机制：隔离算法层的任何异常[cite: 1]
            try:
                landmarks = detector.process(frame)
                
                if landmarks:
                    ear = EyeFeatures.calculate_ear(landmarks, w, h)
                    # 防止 EAR 极值引发的数学崩塌[cite: 1]
                    if ear <= 0.01: ear = 0.01 
                    
                    mar = FatigueDetector.calculate_mar(landmarks, w, h)
                    pitch, yaw, roll = pose_estimator.estimate(landmarks, w, h)
                    
                    blink_freq, blink_dur = blink_tracker.update(ear)
                    simulated_pupil = max(2.0, min(4.0, (ear / 0.30) * 3.4)) 
                    
                    b_sc, d_sc, p_sc, total_score, status = attention_engine.calculate_score(
                        blink_freq, blink_dur, simulated_pupil, mar, pitch, yaw
                    )
                    
                    payload.update({
                        "focus_score": total_score,
                        "blink_score": b_sc,
                        "duration_score": d_sc,
                        "pupil_score": p_sc,
                        "blink_frequency": blink_freq,
                        "blink_duration": blink_dur,
                        "pupil_diameter": round(simulated_pupil, 1),
                        "threshold": 35,
                        "status": status,
                        "mode": "real"
                    })

                    # 记录实验数据[cite: 1]
                    if is_recording and csv_writer:
                        timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
                        csv_writer.writerow([timestamp, total_score, blink_freq, blink_dur, round(simulated_pupil, 1), status])

                    # 核心修改 2：在画面上直接绘制出 EAR 值，让前端观众/评委直观看到算法依据
                    cv2.putText(frame, f"Focus: {total_score} | EAR: {ear:.2f}", 
                                (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    if is_recording:
                        cv2.putText(frame, "REC: ON", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            except Exception as e:
                print(f"⚠️ Pipeline 异常已拦截跳过: {e}")

            # 核心修改 3：压缩画面流并转为 Base64，准备发给 Dashboard
            _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 40])
            payload["frame"] = base64.b64encode(buffer).decode('utf-8')
            
            # 推送所有数据和视频帧给前端
            ws_server.update_data(payload)

            # 彻底干掉 cv2.waitKey 避免 Mac 图形界面冲突，纯靠 sleep 控制帧率
            elapsed = time.time() - start_time
            sleep_time = max(0, (1.0 / 30) - elapsed)
            time.sleep(sleep_time)

    except KeyboardInterrupt:
        print("\n🛑 接收到退出信号，安全关闭中...")
    finally:
        cam.release()
        cv2.destroyAllWindows()
        if is_recording and csv_file:
            csv_file.close()
        print("✅ 摄像头已释放，系统安全退出。")

if __name__ == "__main__":
    server = WSServer()
    cv_thread = threading.Thread(target=run_vision_pipeline, args=(server,), daemon=True)
    cv_thread.start()
    
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        print("网络服务已终止。")
