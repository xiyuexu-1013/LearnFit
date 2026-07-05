import cv2
import threading
import asyncio
import time
import csv
import base64
from datetime import datetime

from backend.camera import Camera
from backend.face_detector import FaceDetector
from backend.eye import EyeFeatures
from backend.blink import BlinkDetector
from backend.head_pose import HeadPoseEstimator
from backend.attention import AttentionEngine
from backend.websocket_server import WSServer

# 全局实验状态变量
is_recording = False
csv_file = None
csv_writer = None

def process_commands(ws_server, attention_engine):
    """处理来自前端看板的控制指令，并控制引擎校准"""
    global is_recording, csv_file, csv_writer
    while ws_server.command_queue:
        cmd = ws_server.command_queue.pop(0)
        if cmd.get("action") == "start":
            if not is_recording:
                is_recording = True
                # 核心联动：唤醒 AI 引擎，开始 30 秒静默校准
                attention_engine.start_session() 
                
                filename = f"LearnFit_Data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                csv_file = open(filename, mode='w', newline='', encoding='utf-8')
                csv_writer = csv.writer(csv_file)
                # 表头更新为 V4 逻辑所需的关键指标
                csv_writer.writerow(["Timestamp", "TotalScore", "BlinkFreq", "BlinkDur", "EAR", "Status", "OptDuration"])
                print(f"⏺️ 实验开始，引擎进入校准，数据正写入: {filename}")
        elif cmd.get("action") == "stop":
            if is_recording:
                is_recording = False
                if csv_file:
                    csv_file.close()
                print("⏹️ 实验结束，文件已保存。")

def run_vision_pipeline(ws_server):
    global is_recording, csv_writer
    cam = Camera(camera_index=0) # 强制绑定电脑自带摄像头
    detector = FaceDetector()
    blink_tracker = BlinkDetector()
    pose_estimator = HeadPoseEstimator()
    attention_engine = AttentionEngine()

    try:
        while True:
            start_time = time.time()
            
            # 把 attention_engine 传进去，以便接收网页的 START 指令
            process_commands(ws_server, attention_engine) 

            frame = cam.get_frame()
            if frame is None:
                continue
                
            h, w = frame.shape[:2]
            
            # 初始化 payload
            payload = {"focus_score": 0, "status": "Awaiting Face", "optimal_duration": 0}
            
            try:
                landmarks = detector.process(frame)
                
                if landmarks:
                    ear = EyeFeatures.calculate_ear(landmarks, w, h)
                    if ear <= 0.01: ear = 0.01 # 数学极值保护
                    
                    # 姿态估算 (保留用于扩展，当前引擎主要依赖眼动)
                    pitch, yaw, roll = pose_estimator.estimate(landmarks, w, h)
                    blink_freq, blink_dur = blink_tracker.update(ear)
                    
                    # 核心改动：接收引擎返回的 6 个值 (新增了 opt_dur)
                    b_sc, d_sc, e_sc, total_score, status, opt_dur = attention_engine.calculate_score(
                        blink_freq, blink_dur, ear
                    )
                    
                    payload.update({
                        "focus_score": total_score,
                        "blink_score": b_sc,
                        "duration_score": d_sc,
                        "pupil_score": e_sc,          # 网页上的 Pupil Score 现在由 EAR 算出的眼睑张合度得分替代
                        "blink_frequency": blink_freq,
                        "blink_duration": blink_dur,
                        "pupil_diameter": round(ear, 2), # 网页上的 Pupil Diameter 现在直接显示真实的 EAR 值
                        "status": status,
                        "optimal_duration": opt_dur,  # 动态算出极限时长发送给网页
                        "mode": "real"
                    })

                    # 记录实验数据
                    if is_recording and csv_writer:
                        timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
                        csv_writer.writerow([timestamp, total_score, blink_freq, blink_dur, round(ear, 2), status, opt_dur])

                    # 画面直接绘制核心参数
                    cv2.putText(frame, f"Score: {total_score} | EAR: {ear:.2f}", 
                                (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    if is_recording:
                        if attention_engine.is_calibrating:
                            cv2.putText(frame, "CALIBRATING...", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                        else:
                            cv2.putText(frame, "REC: ON", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            except Exception as e:
                # 静默拦截异常，保障持续演示
                pass

            # 压缩画面流并转为 Base64 发给前端
            _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 40])
            payload["frame"] = base64.b64encode(buffer).decode('utf-8')
            
            ws_server.update_data(payload)

            # 帧率控制
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
