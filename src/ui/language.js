import { DEFAULT_PREFERENCES, normalizePreferences, readWebPreferences, writeWebPreferences } from './preferences.js';
import { translationsKo, patternsKo } from './locales/ko.js';
import { translationsEs, patternsEs } from './locales/es.js';

// Chinese annotations preserve the original DOM text used by session logic.
export const translations = {
'Strongly disagree':'非常不同意','Disagree':'不同意','Neutral':'一般','Agree':'同意','Strongly agree':'非常同意','Your camera stays yours.':'你的摄像头，由你掌控。','Your study rhythm belongs to you.':'学习节奏，由你自己决定。','Anonymous research records are retained indefinitely for project evaluation and do not expire automatically. The research dashboard is protected by a private administrator key and displays anonymous totals and responses.':'匿名研究记录会长期保留用于项目评估，不会自动过期。研究数据看板使用私密管理密钥保护，仅显示匿名汇总数据和反馈。',
'Settings':'设置','⚙ Settings':'⚙ 设置','Close settings':'关闭设置','Close':'关闭','Got it':'明白了','Language':'语言','Saved on this device. Language settings are not uploaded.':'仅保存在本机，不会上传语言设置。','Your starting tab is included automatically. If you open study material in another tab, choose “Include this tab in my study session” once. Navigation inside an included tab stays connected for the rest of the session.':'开始时的标签页会自动加入。如果你在新标签页打开学习资料，只需点击一次“将此标签页加入学习会话”。本次会话中，在已加入标签页内导航无需再次确认。','LearnFit cannot see what you do inside an included tab. Include only tabs that belong to the task, and start a new session if you later reuse one for entertainment.':'LearnFit 无法判断已加入标签页内部的活动。请只加入属于当前任务的标签页；如果之后要用它娱乐，请开始新的学习会话。','Starting tab · included':'开始标签页 · 已加入','New study tab · include once':'新学习标签页 · 加入一次','Navigate inside it · stays included':'标签页内导航 · 保持加入',
'Product use':'产品使用情况','Anonymous totals from every completed LearnFit session.':'所有 LearnFit 会话形成的匿名总量。','Research sample':'研究样本','Records available for evaluating the product and score.':'可用于评估产品与分数的记录。','Tester ratings':'测试者评分','Averages from optional post-session evaluations.':'来自自愿填写的会话后问卷平均值。','Across completed sessions tracked since this update':'基于本次更新后记录的已完成会话','Across completed sessions with recorded time':'基于有时长记录的已完成会话',
'LearnFit · Research dashboard':'LearnFit · 研究数据看板','private dashboard':'私密数据看板','REAL-USER EVIDENCE':'真实用户证据','Research dashboard.':'研究数据看板。','Anonymous product-use totals and post-session evaluation results.':'匿名产品使用总量与会话后评估结果。','Admin key':'管理密钥','Open dashboard':'打开数据看板','Refresh':'刷新','Export CSV':'导出 CSV','Sign out':'退出登录',
'Research':'研究数据','dashboard.':'看板。',
'ALL SESSION STARTS':'全部会话启动次数','Aggregate count; no IDs or session details':'汇总次数；不含用户 ID 或会话详情','ALL COMPLETED SESSIONS':'全部完成会话','TOTAL STUDY TIME':'总学习时长','Anonymous combined time since September 22, 2026':'自 2026 年 9 月 22 日起的匿名合计时长','AVERAGE SESSION':'平均会话时长','CONSENTING TESTERS':'同意研究的测试者','Random test IDs; no names collected':'仅使用随机测试 ID；不收集姓名','DETAILED SESSIONS':'详细会话记录','Consented duration and final score':'经同意记录的时长与最终分数','SURVEY RESPONSES':'问卷回复','Post-session evaluations':'会话后的自愿评估','MATCHED SESSIONS':'配对样本','Need 10 matched sessions for correlation':'至少需要 10 组配对样本才能显示相关性',
'EASE OF USE':'易用性','Average out of 5':'平均分（满分 5 分）','USEFULNESS':'实用性','SCORE CLARITY':'分数清晰度','SELF-RATED FOCUS':'自评专注度','Average task focus out of 5':'任务专注度平均分（满分 5 分）','WOULD USE AGAIN':'愿意再次使用','LAST 30 DAYS':'最近 30 天','Sessions by day':'每日会话数','PRODUCT SOURCE':'产品来源','Study time by source':'各来源学习时长','WHAT PEOPLE SAID':'用户反馈','Recent responses':'最近回复','extension':'Chrome 插件','web':'网页版','No written highlight.':'未填写最有用之处。','No written improvement note.':'未填写改进建议。',
'📈 DATA AT A GLANCE':'📈 数据概览','Patterns in the evidence':'数据中的趋势','Charts show usage over time, the distribution of submitted focus scores, and average tester ratings.':'图表展示使用趋势、已提交专注分数的分布和测试者平均评分。','Daily completed sessions':'每日完成会话','Last 30 days':'最近 30 天','Focus score histogram':'专注分数直方图','Consented survey-linked sessions':'已同意研究并关联问卷的会话','Rating dot plot':'评分点图','Average score out of 5':'平均分（满分 5 分）','No data yet':'暂无数据','No scored sessions yet':'暂无带分数的会话','Ease':'易用性','Useful':'实用性','Clarity':'清晰度','Self-focus':'自评专注',
'That admin key did not work.':'管理密钥不正确。','The dashboard could not load.':'数据看板加载失败。',
'Stop borrowing study schedule.':'找到适合自己的学习节奏。',
'Keep your face in view and check your lighting. No rhythm estimate is made while tracking is unavailable.':'请保持面部可见并检查光线。没有有效追踪数据时，不生成节奏估计。',
'LearnFit compares blink frequency, completed blink duration, and eye openness with your own 30-second baseline. Normal blinking is expected and measured.':'LearnFit 将眨眼频率、完整眨眼时长和眼睛睁开程度与你的 30 秒个人基线比较。正常眨眼会被正常记录。',
'Keep this website visible and active beside screen-based work. Switching tabs, changing windows, or minimizing pauses the web session immediately. Looking down far enough to leave the camera creates a no-signal gap, never a low score. The Chrome extension is required if you want verified focus tracking to continue across chosen study tabs.':'当前网页版需要页面可见且窗口处于前台。切换标签页、窗口或最小化会暂停会话。低头导致眼睛离开画面时记录为无信号，而不是低分。跨学习标签页追踪请使用 Chrome 插件。',

"LearnFit estimates changes in focus during a screen-based study task by comparing three eye signals with your personal baseline. For task-aware tracking across tabs, use the Chrome extension.":"LearnFit 将三种眼部信号与你的个人基线比较，估计屏幕学习过程中的专注变化。需要跨标签页确认学习任务时，请使用 Chrome 插件。","A focus estimate for verified, screen-based study pages.":"为你确认过的屏幕学习页面提供专注度估计。","Page addresses, titles, camera frames, and eye measurements stay on this device. Only verified study time is added to the anonymous total.":"页面地址、标题、摄像头画面和眼部测量仅保存在本机。只有已确认学习时长会计入匿名总量。","LearnFit will treat the page you started from as the first verified study page. It calculates a focus estimate only while a verified page is active and your eyes are visible.":"LearnFit 会将你开始时的页面作为第一个已确认学习页面。只有学习页面处于活动状态且眼睛可见时，才计算专注度估计。","Chrome needs one visible permission step before the private background camera can start. Frames, page addresses, and titles stay on this device.":"Chrome 需要你先在这个页面授权摄像头，才能启动本地后台追踪。画面、页面地址和标题留在本机。","Choose the button below, then allow camera access in Chrome.":"点击下方按钮，然后在 Chrome 中允许访问摄像头。","LearnFit is running. Your original page is now the verified study page; you may close this setup page.":"LearnFit 已启动，原页面已确认为学习页面。现在可以关闭此设置页。","Basic session counts and combined study time are recorded automatically without an ID. Select this only to also share a random test ID, verified study time, tracking coverage, and final focus estimate. No camera frames, eye measurements, task text, page addresses, or reflections are sent.":"基础会话次数和合计学习时长会自动匿名统计，不记录用户 ID。勾选后还将分享随机测试 ID、已确认学习时长、覆盖率和最终专注度估计；不上传画面、眼部测量、任务文字、页面地址或反思。","Your honest answer helps document real testing and improve LearnFit. Responses are anonymous. Please do not include your name, email, school, or other identifying details.":"真实回答帮助改进 LearnFit。反馈为匿名，请勿填写姓名、邮箱、学校或其他身份信息。","I agree to send these anonymous answers with verified study time, off-task time, tracking coverage, final focus estimate, product version, and a random browser ID for research. I did not enter identifying information.":"我同意为研究提交这些匿名回答、已确认学习时长、非任务页面时长、追踪覆盖率、最终分数、产品版本和随机浏览器 ID。我没有填写身份信息。","I agree to send these anonymous answers with verified study time, off-task time, tracking coverage, final focus estimate, product version, and a random browser ID for research. I did not enter my name, email, school, or other identifying information.":"我同意为研究提交这些匿名回答、已确认学习时长、非任务页面时长、追踪覆盖率、最终分数、产品版本和随机浏览器 ID。我没有填写姓名、邮箱、学校等身份信息。","Average focus estimate":"平均专注度估计","Not enough data":"数据不足","Study time":"学习时长","Suggested check-in":"建议自我检查时间","Choose your pace":"选择自己的节奏","Most stable period":"最稳定时段","Focus shift detected":"检测到专注变化","None observed":"尚未观察到","Tracking coverage":"追踪覆盖率","Personal Baseline":"个人基线","Established":"已建立","Incomplete":"未完成","No study data":"暂无学习数据","Average of valid post-baseline focus observations; hidden below 60% coverage":"基线校准后的有效评分平均值；覆盖率低于 60% 时不显示","Excludes calibration and paused time":"不含校准和暂停时间","An experiment around your observed shift, not a limit":"根据观测到的变化尝试调整，并非硬性限制","No supported duration suggestion from this session":"本次数据不足以给出时长建议","Longest uninterrupted stable period, at least 10 seconds":"最长连续稳定时段，至少 10 秒","First shift sustained for at least 10 seconds":"首次持续至少 10 秒的变化","Below 60%, so no final focus estimate is reported":"覆盖率低于 60%，不提供最终专注分数","Share of study-time seconds with valid eye tracking":"学习时间内具有有效眼部追踪的比例","Complete calibration for a focus estimate":"完成基线校准后才能估计专注度","Choose one manageable task for your next session, and check in with how it feels.":"下次选择一个可完成的小任务，并留意自己的感受。","Try even lighting and a camera positioned at eye level to improve tracking.":"尝试均匀的光线，并将摄像头放在眼睛高度，改善追踪。","Keep a similar camera position and lighting for a more consistent baseline.":"保持相近的摄像头位置和光线，让基线更一致。","Compare the estimate with what you completed and how focused the task actually felt.":"结合实际完成的任务和自己的专注感受，对照这次估计。","Thank you for trying LearnFit. Honest answers help improve the product and document real testing.":"感谢体验 LearnFit。真实回答有助于改进产品并记录实际测试。","Skip and return to LearnFit":"跳过并返回 LearnFit","REAL-USER TEST · ABOUT 2 MINUTES":"真实用户反馈 · 约两分钟","Cancel setup":"取消设置",
'Focus desk':'学习面板','How it works':'原理说明','How to use':'使用教程','Get the extension':'获取插件','Build log':'开发日志','private by default':'默认保护隐私',
'FROM A FIXED TIMER TO A PERSONAL RHYTHM':'从固定计时器到个人学习节奏',
'Stop borrowing':'找到属于自己的','someone else’s':'学习','study schedule.':'节奏。','WHAT ARE YOU SITTING DOWN TO DO?':'这次准备学习什么？','recommended · stays on this device':'建议填写 · 仅保存在本机','Begin':'开始','Begin ↗':'开始学习 ↗',
'Optional detailed testing.':'自愿参与详细测试','Camera processing stays on this device.':'摄像头画面仅在本机处理。','No camera? Open an example report.':'没有摄像头？查看示例报告。','~ 30 sec to make a baseline':'约 30 秒建立个人基线','Studying across Chrome tabs? Get the extension →':'需要跨 Chrome 标签页学习？获取插件 →',
'Know when your focus changes.':'了解专注状态何时发生变化。','Previous reflections':'历史学习反思','Delete saved reflections':'删除保存的反思','ON THIS BROWSER ONLY':'仅保存在当前浏览器',
'YOUR FOCUS ESTIMATE':'你的专注度估计','FOCUS ESTIMATE':'专注度估计','STUDY TIME':'学习时长','GENTLE CHECK-IN':'建议自我检查时间','CHECK-IN':'休息检查点','current personal estimate':'当前个人建议，非固定休息规定','calibration and pauses excluded':'不含基线校准和暂停时间','SIGNAL':'追踪信号','not a score':'不是专注分数',
'Pause':'暂停','Resume':'继续','End session':'结束学习','Ready to begin':'准备开始','Paused':'已暂停','Session complete':'本次学习已结束','No signal · focus score paused':'无有效信号 · 专注评分暂停','Off task · focus score paused':'当前标签页尚未加入学习会话 · 评分暂停','Include this tab in my study session':'将此标签页加入学习会话',
'CURRENT PAGE:':'当前页面：','STUDY':'学习页面','OFF TASK':'未确认的学习页面','NEEDS CONFIRMATION':'需要重新确认','VERIFIED STUDY':'已确认学习时长','TRACKING COVERAGE':'有效追踪覆盖率','NO SIGNAL':'无信号时长',
'Verify this page & start':'确认此页用于学习并开始','I’m studying on this page':'我正在这个页面学习','Confirm this study page':'确认这是学习页面','Open a webpage or PDF first':'请先打开网页或 PDF','This Chrome page cannot be added. Open a webpage, online lesson, or PDF first.':'当前 Chrome 内部页面无法加入学习会话。请先打开网页、网课或 PDF。','Building your 30-second personal baseline':'正在建立你的 30 秒个人基线','Calibrating on your study page':'正在学习页面建立基线','Estimating focus on your study page':'正在估计当前学习页面上的专注变化','Confirm this page before tracking':'请先确认此页面属于学习任务',
'Getting to know your normal.':'了解你的日常眼部状态。','Keep your face in view for 30 seconds of usable tracking.':'保持面部可见，收集 30 秒有效追踪数据。','BASELINE SETUP':'个人基线校准','YOUR FOCUS SESSION':'你的学习会话','Calibrating your baseline':'正在校准个人基线','A score appears after your usable 30-second baseline.':'完成 30 秒有效基线采集后才会显示分数。','30 seconds of usable tracking':'30 秒有效追踪',
'Good signal':'信号良好','Limited signal':'信号有限','Insufficient signal':'信号不足','Waiting':'等待中','Waiting for a clear signal':'等待清晰的眼部信号','Stable':'相对稳定','Shifting':'状态变化中','Shifted':'变化较明显','Hide preview':'隐藏预览','Show preview':'显示预览','Connect a camera to begin.':'连接摄像头后开始。','Signal trace':'眼部信号曲线','THE LAST 60 SECONDS':'最近 60 秒','gaps = unavailable tracking':'空白表示没有有效追踪数据','THE WHOLE SESSION':'整段学习会话',
'Blink frequency':'眨眼频率','Blink duration':'眨眼持续时间','Eye openness':'眼睛睁开程度','Score':'分数','blinks / minute':'次 / 分钟','ms · completed blink':'毫秒 · 完整眨眼','same value as above':'与上方分数一致',
'Your session, without the guilt.':'回顾学习，不必自责。','SESSION NOTES':'学习记录','Download report':'下载报告','Download CSV':'下载 CSV 数据','Print / save PDF':'打印 / 保存 PDF','Give 2-minute feedback':'填写两分钟反馈','Open 2-minute feedback':'打开两分钟反馈','Try another session ↗':'开始下一次学习 ↗','Not enough tracking data':'有效追踪数据不足',
'One small experiment.':'下一次试一个小调整。','TAKE INTO NEXT TIME':'下次可以尝试','KEEP IN MIND':'请记住','Focus needs a verified task.':'任务背景帮助解释专注估计。','YOUR EXPERIENCE MATTERS':'你的体验很重要','How did that actually feel?':'你自己感觉这次学习怎么样？','Your reflections are separate from the eye-behavior score.':'你的自我感受独立于眼部行为评分。','Task progress':'任务进展','Energy at the end':'结束时的精力','Choose (optional)':'请选择（可选）','Completed':'已完成','Made progress':'有所进展','Not yet':'尚未完成','Fresh':'精神不错','Okay':'还可以','Tired':'有点累','One thing to try next time':'下次想尝试的一个改进','Save this reflection on this browser':'将反思保存在此浏览器',
'LEARNFIT / QUICK START':'LEARNFIT / 快速入门','Choose your study task':'选择学习任务','Set up your camera':'设置摄像头','Keep your study pages connected':'连接你的学习页面','Read your results':'读懂学习结果','Back':'上一步','Next':'下一步','Skip':'跳过','Done':'完成','Illustration only · not your measurements':'仅为示意 · 不是你的测量结果',
'01 · Open your material':'01 · 打开学习资料','02 · Open LearnFit':'02 · 打开 LearnFit','03 · Choose your task':'03 · 选择学习任务','Camera · on this device':'摄像头 · 仅在本机处理','Eyes visible · blink naturally':'眼睛保持可见 · 正常眨眼','30 sec · personal baseline':'30 秒 · 个人基线','Study PDF · Study':'教材 PDF · 学习页面','Another page · Off task':'其他页面 · 暂停评分','Confirm study material · Study':'确认学习资料 · 恢复评分','LearnFit visible · tracking':'LearnFit 在前台 · 追踪中','Leave page · paused':'离开页面 · 已暂停','Return + Resume · tracking':'返回并点击继续 · 恢复追踪','Focus Estimate · — / 100':'专注度估计 · — / 100','Verified time · study context':'已确认时长 · 学习背景','Coverage · usable signals':'覆盖率 · 有效眼部信号',
'Keep LearnFit visible and its window in the foreground during screen-based work. To study across Chrome tabs, use the Chrome extension.':'使用网页版时，请让 LearnFit 页面保持可见且窗口处于前台。需要跨 Chrome 标签页学习时，请使用插件。',
'Open your study material first, then open LearnFit and choose “Verify this page & start”. Chrome webpages, online lessons, and PDFs can be study pages.':'先打开学习资料，再打开 LearnFit，点击“确认此页用于学习并开始”。Chrome 网页、网课和 PDF 均可作为学习页面。',
'Independent desktop apps are not recognized. Paper study and long periods looking down are not supported for focus scoring.':'目前不能识别独立桌面应用。纸笔学习或长时间低头不适合使用专注评分。',
'You do not need to stare at the camera. Look at your study material naturally; just position the camera so it can usually see your eyes. About 30 seconds of usable tracking builds your personal baseline.':'你不需要盯着摄像头。像平常一样看学习资料，只需调整摄像头位置，让它通常能看到你的眼睛；约 30 秒有效追踪会建立个人基线。',
'Blink and glance away naturally. Normal blinking is expected. If your eyes leave the camera view, that is No signal: missing data, not a zero-score penalty.':'请自然眨眼，也可以短暂移开视线。正常眨眼是预期行为；眼睛离开画面时显示“无信号”，表示缺少数据，不会按零分惩罚。',
'You do not need to stare at the camera.':'你不需要盯着摄像头。','Look at your study material naturally and blink as usual. Looking down or away may create a gap; a gap is missing data, not a penalty. Video stays on this device.':'像平常一样看学习资料并正常眨眼。低头或移开视线可能产生数据空白；空白表示缺少数据，不是惩罚。视频仅保存在本机。','Study naturally; missing eye signal creates a gap, not a low score.':'自然学习即可；眼部信号缺失只会形成数据空白，不会变成低分。','Study naturally · do not stare':'自然学习 · 不必盯镜头','MEASURED SESSION':'有效测量会话','LEGACY / NO USABLE MEASUREMENT':'旧版记录 / 无有效测量',
'Your starting tab is included automatically. A new tab opened directly from an included study tab is included too. For an independently opened study tab, choose “I’m studying on this page” once. Navigation inside an included tab stays connected.':'开始标签页会自动加入。从已加入学习页直接打开的新标签页也会自动加入。独立打开的学习标签页只需点击一次“我正在这个页面学习”；已加入标签页内的导航会保持连接。','Linked tab · inherited':'关联标签页 · 自动继承','Independent tab · include once':'独立标签页 · 加入一次',
'Historical evidence note:':'历史数据说明：','totals and charts include all submitted feedback. Some early-version records do not contain verified time, tracking coverage, or self-rated focus; their cards are labeled below.':'总数和图表包含所有已提交反馈。部分早期版本记录没有已确认时长、追踪覆盖率或自评专注度；这些记录会在下方标注。',
'Session time':'会话总时长','Valid observation time':'有效观测时长','No-signal time':'无信号时长','Seconds with usable eye signals included in the focus estimate':'具有有效眼部信号并计入专注估计的时长','Missing eye data; excluded from the focus estimate and never treated as a low score':'缺少眼部数据；不计入专注估计，也不会被当作低分','SESSION TIME':'会话总时长','VALID OBSERVATION':'有效观测时长',
'FOCUS INTERPRETATION':'专注状态解读','Improve camera coverage before interpreting this session.':'请先改善摄像头覆盖率，再解读本次会话。','Measured eye signals stayed mostly close to your personal baseline.':'测量到的眼部信号大部分接近你的个人基线。','Measured eye signals changed moderately from your personal baseline.':'测量到的眼部信号与个人基线存在中等变化。','Measured eye signals differed noticeably from your personal baseline.':'测量到的眼部信号与个人基线存在明显差异。','Improve tracking before interpreting the score: use even front lighting and keep the camera near eye level.':'解读分数前请先改善追踪：使用均匀的正面光线，并将摄像头放在接近眼睛的高度。','Compare the estimate with what you completed and your own focus rating; eye-pattern changes are not your complete mental state.':'请结合实际完成内容和自评专注度理解估计结果；眼部模式变化并不代表完整的心理状态。',
'SEP 30, 2026':'2026 年 9 月 30 日','SEP 26, 2026':'2026 年 9 月 26 日','SEP 25, 2026':'2026 年 9 月 25 日','SEP 20, 2026':'2026 年 9 月 20 日','SEP 19, 2026':'2026 年 9 月 19 日','SEP 18, 2026':'2026 年 9 月 18 日','AUG 07, 2026':'2026 年 8 月 7 日','JUL 12, 2026':'2026 年 7 月 12 日','JUL 05, 2026':'2026 年 7 月 5 日','MAR–JUN 2026':'2026 年 3–6 月',
'Clarified that learners study naturally instead of staring at the camera; missing eye signals now read as data gaps, not low scores.':'明确说明学习者无需盯着摄像头；眼部信号缺失现在显示为数据空白，而不是低分。','Reduced extension friction: the starting tab is automatic, navigation stays connected, and child tabs inherit verified study status.':'减少插件操作：开始标签页自动确认，标签页内导航保持连接，由学习页打开的新标签页自动继承确认状态。','Added bilingual research charts and marked early records that lack current measurement fields while retaining them in historical totals.':'增加双语研究图表，并标注缺少当前测量字段的早期记录，同时保留在历史总量中。','Kept the web session clock running across tab and window changes while excluding unavailable camera periods from the estimate.':'网页版在切换标签页和窗口后继续计时，同时从专注估计中排除摄像头不可用时段。','Added the four-step website and extension tutorial, optional feedback, task verification, and the 60% coverage rule.':'增加网站与插件四步教程、自愿反馈、任务页面确认和 60% 覆盖率规则。','Published LearnFit on Cloudflare Pages and added anonymous product-use totals and a private research dashboard.':'将 LearnFit 发布到 Cloudflare Pages，并增加匿名使用总量和私密研究后台。','Moved user-started camera tracking into the Chrome extension background flow for study across browser tabs.':'将用户启动的摄像头追踪移入 Chrome 插件后台流程，以支持跨标签页学习。','Reframed the score as an experimental estimate, preserved tracking gaps, and removed unsupported pupil-size claims.':'将分数重新定义为实验性估计，保留追踪缺口，并移除缺乏依据的瞳孔大小结论。','Rebuilt the Python prototype as a browser-native MediaPipe application and Chrome extension with on-device processing.':'把 Python 原型重构为浏览器原生 MediaPipe 应用和本机处理的 Chrome 插件。','Replaced single-frame blink rules with a blink state machine, a 30-second personal baseline, and time smoothing.':'用眨眼状态机、30 秒个人基线和时间平滑替代单帧眨眼规则。','Connected MediaPipe eye landmarks, EAR, blink detection, WebSocket output, and the first live focus dashboard.':'连接 MediaPipe 眼部关键点、EAR、眨眼检测、WebSocket 输出和首个实时专注面板。','Defined the project question: help learners discover a personal study rhythm instead of prescribing one fixed timer.':'确定项目问题：帮助学习者发现个人学习节奏，而不是规定统一计时方案。',
'Study means this page is part of your chosen task. Switching to an unconfirmed page shows Off task and pauses scoring. If it is study material too, choose “I’m studying on this page”.':'“学习页面”表示你已将它加入本次任务。切到未确认页面时显示 Off task 并暂停评分；如果也是学习资料，请点击“我正在这个页面学习”。',
'Navigating a study tab to a new page shows Needs confirmation. Choose “Confirm this study page” if it still belongs to your task. Confirm only pages you intend to study on.':'学习标签页打开新地址后会显示“需要重新确认”。若它仍属于学习任务，请点击“确认这是学习页面”。只确认你打算学习的页面。',
'Leaving the LearnFit tab, switching windows, or minimizing pauses the web session. Return to LearnFit and choose Resume when you are ready. Time away is not added back.':'当前网页版在离开标签页、切换窗口或最小化时暂停。返回后点击“继续”；离开期间的时间不会补算。',
'The website cannot identify what you do in other tabs. Use the extension for task-page confirmation across Chrome tabs.':'网站无法知道你在其他标签页做什么。使用插件可以在 Chrome 中确认多个学习页面。',
'Focus Estimate compares eye signals with your baseline. Verified study time is time in the confirmed study context after calibration, excluding pauses; it can include No signal. Tracking coverage is the share with usable eye signals.':'专注度估计将眼部信号与你的个人基线比较。已确认学习时长指校准后、学习背景内的时间，不含暂停，但可能包含无信号时段。覆盖率表示有有效眼部信号的时间占比。',
'Below 60% coverage, no final score is shown. A confirmed page does not prove attention or reveal what happens inside it. Treat study-time suggestions as experiments, not limits. After ending, download your report or CSV and optionally give feedback.':'覆盖率低于 60% 时不显示最终分数。确认页面不能证明你一直专注，也不能知道页面内发生了什么。时长建议供你尝试调整，并非硬性限制。结束后可下载报告或 CSV，并自愿反馈。',
'Help me make LearnFit more useful.':'帮我让 LearnFit 更实用。','LearnFit was easy to use.':'LearnFit 容易使用。','The focus estimate helped me understand my concentration.':'专注度估计帮助我了解自己的专注情况。','I understood what the score could and could not tell me.':'我理解这个分数能说明什么、不能说明什么。','During the last five minutes, I was focused on my intended task.':'最后五分钟，我专注于原定任务。','How much of this session was spent on your intended task?':'这次有多少时间在做原定任务？','Would you use LearnFit again?':'你愿意再次使用 LearnFit 吗？','What was most useful?':'什么最有用？','What was confusing or should change?':'哪里让你困惑或需要改进？','(optional)':'（可选）','Choose one':'请选择','All':'全部','Most':'大部分','About half':'约一半','A little':'少部分','None':'没有','Yes':'愿意','Maybe':'可能','No':'不愿意','Send anonymous feedback':'发送匿名反馈','Not now':'暂时不填',
'ONE-TIME CAMERA SETUP':'首次摄像头设置','Estimate focus on your study page.':'估计学习页面上的专注变化。','Allow camera and start':'允许摄像头并开始','Try camera permission again':'重新请求摄像头权限','Waiting for Chrome camera permission…':'等待 Chrome 摄像头授权…','Camera ready. Starting your private background session…':'摄像头已就绪，正在启动本地后台检测…','Background session started':'后台会话已启动','CAMERA PREVIEW':'摄像头预览',
'Take LearnFit to your study tabs.':'在学习标签页中使用 LearnFit。','Download Chrome extension · ZIP ↓':'下载 Chrome 插件 · ZIP ↓','Manual installation:':'手动安装：','Developer mode':'开发者模式','Load unpacked':'加载已解压的扩展程序','Reload':'重新加载','Privacy':'隐私说明',
'Your eye behavior is close to your personal baseline. Keep going at your own pace.':'眼部状态接近你的个人基线，按自己的节奏继续即可。','Some eye patterns have changed. Take a moment to check in with yourself.':'部分眼部信号发生变化，可以停一下，留意自己的感受。','Your eye behavior has shifted more noticeably. Consider a short break if it feels right.':'眼部状态变化较明显，如果感觉疲劳，可以考虑短暂休息。',
'Focus estimate over time':'专注度估计随时间变化','Your focus estimate over time':'你的专注度估计随时间变化','Chart color guide':'图表颜色说明','75–100 · steady':'75–100 · 较稳定','60–74 · some change':'60–74 · 有些变化','0–59 · marked change':'0–59 · 明显变化','gap · no signal':'空白 · 无信号','Colors compare observed eye patterns with your personal baseline. They are an estimate to reflect on, not proof of your complete mental focus.':'颜色表示观测到的眼部模式与个人基线之间的差异。这是一项帮助反思的估计，并不能证明完整的心理专注状态。','Focus interpretation':'专注状态解读','Steady relative to your baseline':'相对于个人基线较稳定','Some focus-pattern change':'专注模式出现一些变化','Marked focus-pattern change':'专注模式出现明显变化','LearnFit cannot make a reliable focus estimate from this session.':'本次数据不足，LearnFit 无法给出可靠的专注度估计。','Observed eye signals stayed mostly close to your personal baseline during measured periods.':'在获得有效测量的时段内，眼部信号大部分接近你的个人基线。','Observed eye signals changed moderately from your baseline. Check this against how the task felt.':'观测到的眼部信号与个人基线存在中等变化，请结合你完成任务时的实际感受判断。','Observed eye signals differed noticeably from your baseline. A shorter work block or brief reset may help.':'观测到的眼部信号与个人基线有明显差异，缩短下一段学习时间或短暂休息可能会有帮助。',
};
Object.assign(translations, {
  "Frames and facial landmarks stay in browser memory and are never uploaded.": "画面和面部关键点仅留在浏览器内存中，绝不会上传。",
  "Privacy details →": "隐私详情 →",
  "Before the next session, write one concrete outcome—such as finishing one section or solving five problems—and close unrelated tabs.": "下一次开始前，写下一个具体目标，例如读完一节或完成五道题，并关闭无关标签页。",
  "TIMER-ONLY SESSION": "仅计时会话",
  "A private study clock without camera processing or a focus estimate.": "不使用摄像头、不生成专注度估计的私人学习计时。",
  "Timer only · no focus score": "仅计时 · 不生成专注分数",
  "You can still record your task, reflect, and download a report.": "你仍然可以记录任务、填写反思并下载报告。",
  "Camera off": "摄像头已关闭",
  "Before the next session, write one concrete outcome and close unrelated tabs.": "下一次开始前，写下一个具体目标，并关闭无关标签页。",
  "At the end, close the material and write three ideas from memory.": "结束后合上资料，凭记忆写出三个要点。",
  "Use your chosen check-in as a prompt to review task progress and energy, not as a hard limit.": "把你选择的检查时间当作回顾任务进度和精力的提醒，而不是硬性限制。",
  "SESSION SUMMARY": "会话总结",
  "FOCUS SUMMARY": "专注总结",
  "Session mode": "会话模式",
  "Not measured": "未测量",
  "No camera processing or focus estimate": "不进行摄像头处理或专注度估计",
  "Excludes manual pauses": "不包含手动暂停时间",
  "Start a camera session to compare eye signals with a personal baseline": "使用摄像头会话，才能将眼部信号与个人基线比较",
  "A reminder chosen in Settings, not a measured limit": "这是设置中的提醒，并非测量得到的极限",
  "EVIDENCE AND LIMITATIONS": "证据与局限",
  "Why blinking can be useful—but never definitive.": "为什么眨眼有参考价值，却不能成为定论。",
  "Blink timing and frequency can change with visual demand, cognitive load, and attentional control. They also change with dry eyes, fatigue, lighting, age, glasses, medication, and task type. LearnFit therefore compares several signals with your own baseline, smooths changes over time, preserves missing data, and asks you to compare the estimate with task progress and self-report.": "眨眼时间与频率会随视觉需求、认知负荷和注意控制变化，也会受到干眼、疲劳、光线、年龄、眼镜、药物和任务类型影响。因此 LearnFit 会将多个信号与你的个人基线比较，平滑时间变化，保留缺失数据，并建议结合任务进度和自我评价理解结果。",
  "Oh et al. · spontaneous blinks during an attention task": "Oh 等 · 注意任务中的自发眨眼",
  "Madan et al. · attentional demand and blink rate": "Madan 等 · 注意需求与眨眼频率",
  "Yep et al. · task, age, and individual differences": "Yep 等 · 任务、年龄与个体差异",
  "What I noticed": "我注意到的问题",
  "What I changed": "我做出的修改",
  "Technical implementation": "技术实现",
  "What I learned": "我学到的东西",
  "Open each chapter to see what I noticed, what I changed, and what the work taught me.": "展开每个章节，查看我发现了什么、做出了什么修改，以及这段开发经历教会了我什么。",
  "Camera privacy": "摄像头隐私",
  "LOCAL": "本机处理",
  "Video frames and facial landmarks are processed in browser memory and are never uploaded to LearnFit. Only anonymous product-use totals are automatic; detailed research metrics require your explicit choice.": "视频画面和面部关键点仅在浏览器内存中处理，绝不会上传到 LearnFit。系统只会自动记录匿名产品使用总量；详细研究指标必须经过你的明确选择。",
  "See exactly what is and is not collected →": "查看系统会收集和不会收集的内容 →",
  "Camera & privacy": "摄像头与隐私",
  "Video frames and face landmarks are processed in memory and are never uploaded to LearnFit. Basic completed-session totals are anonymous; detailed research metrics are sent only when you explicitly opt in.": "视频画面和面部关键点仅在内存中处理，绝不会上传到 LearnFit。基础完成会话总量为匿名统计；只有在你明确同意后才会发送详细研究指标。",
  "How the estimate works": "估计如何工作",
  "LearnFit compares blink frequency, completed-blink duration, and eye openness with your own 30-second baseline. Missing tracking is excluded rather than scored as zero.": "LearnFit 将眨眼频率、完整眨眼时长和眼睛开放程度与你自己的 30 秒基线比较。缺失追踪会被排除，而不会被记为零分。",
  "Your controls": "你的控制选项",
  "You choose when camera access begins, can pause or end a session, and can skip detailed research. Closing or ending releases the camera.": "你可以决定何时开始摄像头访问、暂停或结束会话，也可以跳过详细研究。关闭或结束会话会释放摄像头。",
  "Review tutorial": "重新查看教程",
  "Read privacy details": "阅读隐私详情",
  "HOW THE ESTIMATE WORKS": "专注度估计如何工作",
  "Why eye signals?": "为什么选择眼部信号？",
  "LearnFit uses eye behavior because it can be observed continuously with an ordinary webcam and compared with the same learner’s personal baseline. It is useful as a change signal, but it is not a direct reading of thought or attention.": "LearnFit 选择眼部行为，是因为普通摄像头可以连续观测，并与同一位学习者的个人基线比较。它适合用来观察变化，但不能直接读取思想或注意力。",
  "Blink frequency": "眨眼频率",
  "Blink rate can change with visual demand, fatigue, dryness, and cognitive load. LearnFit compares completed blinks per minute with your own baseline rather than a universal “normal” number.": "眨眼频率可能随视觉负荷、疲劳、眼睛干涩和认知负荷变化。LearnFit 将每分钟完成的眨眼次数与你自己的基线比较，而不是使用统一的“正常值”。",
  "Completed-blink duration": "完整眨眼时长",
  "The engine measures a blink only after the eye reopens. Ordinary brief blinks remain valid tracking; longer closures can indicate that the current eye pattern has shifted.": "引擎只会在眼睛重新睁开后测量一次完整眨眼。普通短暂眨眼仍属于有效追踪；较长闭眼可能说明当前眼部模式发生了变化。",
  "Eye openness · EAR": "眼睛开放程度 · EAR",
  "Eye Aspect Ratio uses distances between selected MediaPipe eye landmarks. Because faces and camera angles differ, LearnFit interprets EAR relative to your 30-second baseline.": "眼睛纵横比通过选定的 MediaPipe 眼部关键点距离计算。由于面部特征和摄像头角度不同，LearnFit 会相对于你的 30 秒个人基线解读 EAR。",
  "Time, not one frame": "关注时间变化，而非单帧",
  "A state machine prevents one blink from being counted repeatedly, and time-based smoothing reduces single-frame noise. Sustained changes matter more than an instant movement.": "状态机可以避免一次眨眼被重复计数，基于时间的平滑会减少单帧噪声。持续变化比瞬间动作更有意义。",
  "relative change from baseline": "相对于基线的变化",
  "completed events only": "只计算完整事件",
  "normalized EAR change": "归一化 EAR 变化",
  "How to read the result:": "如何理解结果：",
  "green means measured signals stayed close to baseline, amber means some change, coral means a marked change, and a gap means no usable signal. Below 60% coverage, LearnFit does not produce a final score.": "绿色表示测量信号接近基线，琥珀色表示出现一些变化，珊瑚红表示明显变化，空白表示没有有效信号。覆盖率低于 60% 时，LearnFit 不会生成最终分数。",
  "Scientific boundary:": "科学边界：",
  "blinking also changes because of lighting, dry eyes, glasses, medication, tiredness, and task type. That is why LearnFit combines signals, calibrates per person, preserves missing data, and asks you to compare the estimate with task progress and self-reported focus.": "眨眼也会受到光线、眼睛干涩、眼镜、药物、疲劳和任务类型影响。因此 LearnFit 会组合多个信号、为每个人单独校准、保留缺失数据，并建议你将估计结果与任务进度和自评专注度比较。",
  "MediaPipe runs locally; frames and face landmarks are processed in memory and are not uploaded or included in reports.": "MediaPipe 在本机运行；画面和面部关键点仅在内存中处理，不会上传，也不会包含在报告中。",
  "Improve tracking before interpreting the score: use even front lighting, keep the camera near eye level, and let your eyes remain visible when practical.": "在解读分数前先改善追踪：使用均匀的正面光线，将摄像头放在接近眼睛的高度，并在方便时让眼睛保持可见。",
  "No sustained shift was detected. Keep your own task progress and effort as the main evidence when choosing when to rest.": "没有检测到持续变化。决定何时休息时，请仍以自己的任务进度和实际感受作为主要依据。",
  "This session was under five minutes. Repeat the same kind of task for longer before treating the pattern as representative.": "本次会话不足五分钟。请在相同类型的任务中进行更长时间测试，再判断这一模式是否具有代表性。",
  "Compare the estimate with what you finished and your own focus rating; the score describes observed eye-pattern changes, not your complete mental state.": "请把估计结果与实际完成内容和自评专注度结合比较；分数描述的是观测到的眼部模式变化，而不是你的完整心理状态。",
  "SEP 19–20, 2026": "2026 年 9 月 19–20 日",
  "JUL 05–12, 2026": "2026 年 7 月 5–12 日",
  "I redesigned around what testers actually disliked.": "我根据测试者真正不喜欢的地方重新设计。",
  "The camera language, tab workflow, reports, and research evidence changed after real users challenged the product.": "真实用户对产品提出质疑后，我重新调整了摄像头说明、标签页流程、报告和研究证据。",
  "Testers thought they had to stare at the camera, felt that adding every study page was annoying, and could not tell why missing eye data sometimes changed the result.": "测试者以为必须一直盯着摄像头，觉得逐个添加学习页面很麻烦，也不明白为什么眼部数据缺失有时会影响结果。",
  "I made No signal an explicit data gap instead of a low score, kept normal blinking valid, automatically included the starting tab, preserved same-tab navigation, and let child tabs inherit the study context. I also separated session time, valid observation, off-task time, and coverage in reports.": "我把“无信号”明确处理为数据空白而不是低分，保留正常眨眼作为有效输入，自动加入开始标签页，让同一标签页内的导航保持有效，并让由学习页打开的新标签页继承学习背景。报告也分别展示会话时长、有效观测、非任务时长和覆盖率。",
  "A technically correct rule can still fail if the interface makes people behave unnaturally. Reducing friction and explaining uncertainty are part of the measurement itself.": "即使规则在技术上正确，如果界面迫使人做出不自然的行为，产品仍然会失败。减少操作负担、解释不确定性，本身就是测量设计的一部分。",
  "I stopped treating a hidden webpage as proof that learning stopped.": "我不再把网页被隐藏当作停止学习的证据。",
  "The web timer now respects the difference between elapsed study time and camera observation.": "网页版计时现在区分实际经过的学习时间和摄像头能够观测的时间。",
  "A learner may switch to a textbook, notes, or another window while still studying. The website cannot know whether that other place is useful or distracting.": "学习者可能切换到教材、笔记或另一个窗口，同时仍在学习。网站无法知道另一个页面究竟是学习资料还是干扰。",
  "I kept the web session clock running across tab and window changes. If the browser slows or stops the camera, that period becomes No signal and is excluded from the Focus Estimate rather than being labeled off task.": "我让网页版会话计时在切换标签页和窗口后继续运行。如果浏览器减慢或停止摄像头处理，该时段会成为“无信号”，从专注度估计中排除，而不会被标记成偏离任务。",
  "Unknown behavior should remain unknown. A fair product should show the boundary of its evidence instead of turning missing information into a judgment.": "未知行为应该保持未知。公平的产品应当展示证据边界，而不是把缺失信息变成对用户的判断。",
  "I made the experiment understandable before asking people to trust it.": "在要求别人信任实验之前，我先让它变得容易理解。",
  "A four-step tutorial and clearer reports explain the camera, task context, score, and limitations.": "四步教程和更清晰的报告解释摄像头、任务背景、分数和能力边界。",
  "Early testers could start the tool, but some did not understand what the score meant, why page confirmation mattered, or what happened when the camera lost their eyes.": "早期测试者可以启动工具，但有人不理解分数的含义、为什么要确认学习页面，以及摄像头看不到眼睛时会发生什么。",
  "I added first-use tutorials to the website and extension, a permanent How to use entry, optional post-session feedback, a 60% coverage requirement, and clearer explanations of normal blinking and screen-based limitations.": "我为网站和插件增加首次使用教程、常驻的“使用方法”入口、可选的会后反馈、60% 覆盖率要求，并更清楚地解释正常眨眼和屏幕学习限制。",
  "Ease of use is more than reaching the Start button. People need a mental model of the system so they can interpret the result without overtrusting it.": "易用性不只是能够按下开始按钮。用户需要理解系统如何运作，才能正确解读结果而不过度相信它。",
  "I moved from a demo to something people could use in ordinary study.": "我把演示原型变成了能用于日常学习的产品。",
  "The Chrome extension, public deployment, privacy flow, and research dashboard made real-world testing possible.": "Chrome 插件、公开部署、隐私流程和研究后台让真实场景测试成为可能。",
  "A webpage alone could not follow a study session across Chrome tabs, and a local prototype could not produce credible evidence from other users.": "单独一个网页无法跟随跨 Chrome 标签页的学习过程，本地原型也无法收集来自其他用户的可信证据。",
  "I moved user-started tracking into an extension offscreen document, deployed the website on Cloudflare Pages, added anonymous aggregate counts, and created consent-based detailed records and a private research dashboard.": "我把用户主动启动的追踪移入插件的离屏页面，将网站部署到 Cloudflare Pages，增加匿名汇总统计，并建立基于同意的详细记录和私密研究后台。",
  "A working algorithm is only one layer of a product. Permissions, privacy, installation, deployment, and evidence collection decide whether anyone can test it responsibly.": "可运行的算法只是产品的一层。权限、隐私、安装、部署和证据收集决定了其他人能否负责任地测试它。",
  "I changed the score from a verdict into an estimate.": "我把分数从结论改成了估计。",
  "The interface became more honest about what eye signals can and cannot show.": "界面更诚实地说明眼部信号能够和不能够反映什么。",
  "Words such as attention detection and pupil-size measurement sounded more certain than the browser data justified. Missing frames could also make a polished score look more reliable than it was.": "“注意力检测”和“瞳孔大小测量”等说法比浏览器数据实际能够支持的结论更确定。缺失画面也可能让精致的分数显得比实际更可靠。",
  "I renamed the result Focus Estimate, retained the 50/30/20 eye-signal structure while comparing it with a personal baseline, removed unsupported pupil-millimeter claims, and made tracking gaps and coverage visible.": "我把结果改名为“专注度估计”，保留 50/30/20 眼部信号结构并与个人基线比较，移除缺乏依据的瞳孔毫米数结论，同时明确展示追踪空白和覆盖率。",
  "A smaller, defensible claim is stronger than an impressive claim I cannot validate. Product language should match the quality of the evidence.": "一个范围较小但能够解释和捍卫的结论，比无法验证的华丽结论更有力量。产品语言必须与证据质量相匹配。",
  "I rebuilt LearnFit inside the browser.": "我在浏览器中重建了 LearnFit。",
  "The Python pipeline became a browser-native MediaPipe app and the first Chrome extension.": "Python 流程变成了浏览器原生 MediaPipe 应用和第一个 Chrome 插件。",
  "The Python and WebSocket setup worked on my computer but created too many installation steps for another student. It also made the privacy story harder to understand.": "Python 和 WebSocket 方案能在我的电脑上运行，但其他学生需要完成太多安装步骤，隐私处理也更难解释。",
  "I moved camera access to getUserMedia, face landmarks to MediaPipe JavaScript, and the scoring engine into reusable browser modules. Camera frames could now be processed on the learner’s device without a Python server.": "我使用 getUserMedia 获取摄像头，以 MediaPipe JavaScript 提取面部关键点，并把评分引擎拆成可复用的浏览器模块。摄像头画面因此可以直接在学习者设备上处理，无需 Python 服务器。",
  "Architecture changes the audience. Removing setup was not just an engineering improvement; it turned a personal prototype into something another person could open and try.": "架构会改变产品能够服务的人群。减少配置步骤不只是工程优化，它让个人原型变成了别人可以直接打开尝试的产品。",
  "I learned that one noisy frame is not a human state.": "我认识到一帧噪声不代表人的状态。",
  "The first live prototype led to a blink state machine, personal calibration, and time smoothing.": "第一个实时原型促成了眨眼状态机、个人校准和时间平滑。",
  "A fixed EAR threshold varied between faces and camera angles. A blink could be counted several times, and a brief noisy frame could make the score jump even when nothing meaningful changed.": "固定 EAR 阈值会随面部和摄像头角度变化。一次眨眼可能被重复计数，短暂的噪声帧也会在没有真实变化时让分数跳动。",
  "I tracked the beginning and end of each blink, separated normal blinks from longer closures, added a 30-second personal baseline, and used recent observations over time instead of trusting one frame.": "我追踪每次眨眼的开始和结束，区分正常眨眼与较长闭眼，加入 30 秒个人基线，并使用一段时间内的近期观测代替单帧判断。",
  "Human behavior is temporal. Completed events, sustained changes, and personal baselines are more useful than a universal threshold applied to a single image.": "人的行为发生在时间中。完整事件、持续变化和个人基线，比应用在单张图像上的统一阈值更有意义。",
  "The project began with a problem I felt while studying.": "这个项目始于我学习时亲身感受到的问题。",
  "I questioned why every learner should follow the same focus-and-break schedule.": "我开始怀疑为什么每个学习者都必须遵循相同的专注和休息时间。",
  "Pomodoro timers were useful, but their fixed intervals did not match every task or every day. Sometimes I could work for an hour; sometimes my focus changed much earlier.": "番茄钟很有用，但固定时间并不适合每项任务和每一天。有时我可以学习一小时，有时专注状态会更早发生变化。",
  "I defined LearnFit as an experiment for discovering a personal study rhythm. I began exploring eye aspect ratio, blink frequency, blink duration, and eye openness as observable signals that might support reflection.": "我把 LearnFit 定义为一个探索个人学习节奏的实验，并开始研究眼睛纵横比、眨眼频率、眨眼时长和眼睛开放程度，尝试把它们作为帮助反思的可观测信号。",
  "The goal should not be to prescribe the perfect number of minutes. It should help a learner notice patterns, test adjustments, and make a more personal decision.": "目标不应该是规定一个完美的分钟数，而应该帮助学习者发现规律、尝试调整，并作出更符合自己的决定。"
});
Object.assign(translations, {
  "I added an eye-signal gate before scoring, kept completed normal blinks inside the valid sample stream, and withheld the final estimate below 60% coverage. In the extension, tab IDs remain verified across URL changes and chrome.tabs.Tab.openerTabId allows a child tab to inherit status only from its verified parent. These relationships never enter a network request.": "我在评分前加入眼部信号门控，让完成的正常眨眼继续留在有效样本流中，并在覆盖率低于 60% 时隐藏最终估计。插件以标签页 ID 保持页面跳转前后的确认状态，并通过 chrome.tabs.Tab.openerTabId 只让来自已确认父页面的新标签页继承状态；这些关系不会进入任何网络请求。",
  "The session clock uses elapsed wall time, while observation time advances only when the tracker produces a usable one-second sample. The Page Visibility API describes whether the LearnFit document is visible, but it is never treated as proof of task behavior. Coverage is valid observation time divided by eligible session time.": "会话时钟使用实际经过时间，观测时间只在追踪器产生有效的一秒样本时增加。Page Visibility API 只描述 LearnFit 文档是否可见，绝不会被当作用户是否在执行任务的证据。覆盖率等于有效观测时长除以符合条件的会话时长。",
  "The tutorial is an accessible four-step dialog and stores completion only in localStorage on the web or chrome.storage.local in the extension. Report generation reuses one session summary model for on-screen results, standalone HTML, and CSV, keeping displayed and downloaded metrics consistent.": "教程使用支持键盘操作的四步对话框，完成状态仅保存在网页版 localStorage 或插件 chrome.storage.local 中。报告生成对屏幕结果、独立 HTML 和 CSV 复用同一个会话汇总模型，从而保证页面展示与下载指标一致。",
  "Manifest V3 uses a service worker for session state and an offscreen document for user-authorized camera processing beyond the popup lifetime. Vite builds the public site for Cloudflare Pages; same-origin Pages Functions validate a narrow event schema before writing aggregate and consented research records to D1.": "Manifest V3 使用 service worker 保存会话状态，并通过 offscreen document 在弹窗关闭后继续进行用户授权的摄像头处理。Vite 构建网站并发布到 Cloudflare Pages；同源 Pages Functions 会先验证严格限定的事件结构，再将汇总数据和用户同意的研究记录写入 D1。",
  "The engine compares blink frequency, completed-blink duration, and eye openness against the learner’s calibrated baseline. It aggregates usable time samples instead of filling gaps with zeroes, and the final score is the mean of valid, task-eligible observations rather than a claim about unobserved cognition.": "引擎将眨眼频率、完整眨眼时长和眼睛开放程度与学习者校准后的个人基线比较。它只汇总有效时间样本，不会用零填补缺口；最终分数是符合任务条件的有效观测平均值，而不是对未被观测的认知状态作出结论。",
  "navigator.mediaDevices.getUserMedia supplies the local video stream. MediaPipe Face Mesh runs in browser JavaScript and extracts landmarks on-device; the tracker converts selected eye landmarks into normalized measurements and passes only numeric features to the scoring engine. No frame-upload endpoint exists.": "navigator.mediaDevices.getUserMedia 提供本地视频流。MediaPipe Face Mesh 在浏览器 JavaScript 中运行并在设备上提取关键点；追踪器将选定的眼部关键点转换为归一化测量值，只把数字特征交给评分引擎。系统不存在上传画面的接口。",
  "EAR is calculated from vertical and horizontal eye-landmark distances with aspect-ratio correction. A state machine records open-to-closed-to-open transitions once, measures duration when the eye reopens, and distinguishes ordinary blinks from sustained closure. Time-based exponential smoothing keeps behavior consistent across camera frame rates.": "EAR 由眼部关键点的垂直与水平距离计算，并进行画面宽高比修正。状态机只记录一次“睁眼—闭眼—重新睁眼”转换，在眼睛重新睁开时计算持续时间，并区分普通眨眼和持续闭眼。基于时间的指数平滑让不同摄像头帧率下的行为保持一致。",
  "The first proof of concept used Python, OpenCV camera capture, MediaPipe facial landmarks, and a local WebSocket server. A dashboard received EAR and blink events in real time, displayed a changing score, and logged minute-level observations for early calibration experiments.": "第一个概念验证版本使用 Python、OpenCV 摄像头采集、MediaPipe 面部关键点和本地 WebSocket 服务器。仪表板实时接收 EAR 与眨眼事件，显示变化中的分数，并记录分钟级观测以进行早期校准实验。"
});
Object.assign(translations, {
  'Saved on this device. Settings are not uploaded.': '仅保存在本机，设置不会上传。',
  'Study view': '学习视图', 'Detailed': '详细', 'Quiet': '安静',
  'Camera preview': '摄像头预览', 'Show': '显示', 'Hide': '隐藏',
  'Default check-in': '默认自我检查时间', 'Default session mode': '默认学习模式',
  'Study with camera': '使用摄像头学习', 'Timer only': '仅计时', 'Timer only · no camera': '仅计时 · 无需摄像头',
  'Technical details': '技术细节', 'Timer-only session': '仅计时会话',
  'Review tutorial': '重看使用教程', 'Evidence and limitations': '科学依据与局限',
  'Read how it works': '查看工作原理', 'Read privacy details': '查看隐私说明',
  'Camera & privacy': '摄像头与隐私', 'How the estimate works': '估计原理', 'Your controls': '你的控制权',
  'Video frames and face landmarks are processed in memory and are never uploaded to LearnFit. Basic completed-session totals are anonymous; detailed research metrics are sent only when you explicitly opt in.': '视频画面和面部关键点只在设备内存中处理，绝不会上传到 LearnFit。已完成会话的基础总量是匿名的；只有你明确同意后才会提交详细研究指标。',
  'LearnFit compares blink frequency, completed-blink duration, and eye openness with your own 30-second baseline. Missing tracking is excluded rather than scored as zero.': 'LearnFit 将眨眼频率、完整眨眼时长和眼睛睁开程度与你自己的 30 秒基线比较。追踪缺失会被排除，不会记为零分。',
  'You choose when camera access begins, can pause or end a session, and can skip detailed research. Closing or ending releases the camera.': '你决定何时开启摄像头，也可以暂停或结束会话，并跳过详细研究。关闭或结束后会释放摄像头。',
  'Settings became a real control center, timer-only study no longer requires a camera, reports lead with a clear summary, and the scientific basis is linked directly.': '设置升级为真正的控制中心；仅计时学习不再需要摄像头；报告先给出清晰总结，并直接链接科学依据。',
  'I made LearnFit quieter, more optional, and better supported.': '我让 LearnFit 更安静、更自主，也有了更充分的依据。'
  ,'SESSION SUMMARY': '会话总结', 'FOCUS SUMMARY': '专注总结',
  'No camera was used, so LearnFit did not calculate a focus estimate.': '本次未使用摄像头，因此 LearnFit 没有计算专注度估计。',
  'Session mode': '会话模式', 'No camera processing or focus estimate': '不进行摄像头处理或专注度估计',
  'Total session': '会话总时长', 'Manual pauses excluded': '不包含手动暂停时间',
  'Not measured': '未测量', 'Use a camera session to compare eye signals with your baseline': '使用摄像头会话，才能将眼部信号与个人基线比较',
  'Check-in': '自我检查时间', 'A reminder chosen in Settings, not a measured limit': '这是设置中的提醒，并非测量得到的极限',
  'Try another session': '开始下一次学习',
  'Before the next session, write one concrete goal and close unrelated tabs.': '下一次开始前，写下一个具体目标，并关闭无关标签页。',
  'Finish by closing the material and writing three ideas from memory.': '结束后合上资料，凭记忆写出三个要点。',
  'On this website, keep LearnFit visible beside your task. The extension adds local task-page verification so time on other tabs is excluded.': '网页版适合快速、无需安装的会话；Chrome 插件会在本机确认学习页面，并排除未确认页面上的时间。'
});

let language = 'en';
export const getLanguage = () => language;
export function translate(text, locale = language) {
  if (locale === 'en') return text;
  const key = text.trim().replace(/\s+/g, ' ');
  const dictionary = locale === 'zh' ? translations : locale === 'ko' ? translationsKo : locale === 'es' ? translationsEs : null;
  if (!dictionary) return text;
  if (dictionary[key]) return text.replace(text.trim(), dictionary[key]);
  if (locale !== 'zh') {
    const localizedPatterns = locale === 'ko' ? patternsKo : patternsEs;
    for (const [pattern, format] of localizedPatterns) { const match = key.match(pattern); if (match) return text.replace(text.trim(), format(match)); }
    return text;
  }
  const patterns = [
    [/^Try a gentle self-check around (.+) minutes; use task progress and energy to decide whether to continue\.$/, m => `在 ${m[1]} 分钟左右温和地检查一次状态，并根据任务进度和精力决定是否继续。`],
    [/^Your measured periods were mostly steady \((.+)\/100\)\. Keep a similar work-block length, then close the material and write three ideas from memory\.$/, m => `有效测量时段整体较稳定（${m[1]}/100）。下次保持相近的学习时长，结束后合上资料，凭记忆写出三个要点。`],
    [/^Your measured periods showed some change \((.+)\/100\)\. Work on one source at a time, silence notifications, and check your progress before the pattern usually shifts\.$/, m => `有效测量时段出现了一些变化（${m[1]}/100）。下次一次只使用一份主要资料，关闭通知，并在通常发生变化前检查任务进度。`],
    [/^Your measured periods showed a marked change \((.+)\/100\)\. Try a work block about 5 minutes shorter, take a 2–5 minute screen break, then restart with one small next action\.$/, m => `有效测量时段出现明显变化（${m[1]}/100）。下次把学习时段缩短约 5 分钟，离开屏幕休息 2–5 分钟，再从一个小步骤重新开始。`],
    [/^Session: (.+?) verified study · (.+?) off task · (.+?)% tracking coverage · focus estimate: (.+?) · (.+)$/, m => `本次：已确认学习 ${m[1]} · 非任务页面 ${m[2]} · 覆盖率 ${m[3]}% · 专注度估计 ${m[4] === 'Not available' ? '暂无' : m[4]} · ${m[5] === 'Chrome extension' ? 'Chrome 插件' : '网页版'}`],
    [/^Step (\d) of 4$/, m => `第 ${m[1]} 步，共 4 步`],
    [/^(\d+) seconds of usable tracking remaining$/, m => `还需 ${m[1]} 秒有效追踪`],
    [/^(\d+) min$/, m => `${m[1]} 分钟`],
    [/^(\d+) sec$/, m => `${m[1]} 秒`],
    [/^(\d+)m (\d+)s$/, m => `${m[1]} 分 ${m[2]} 秒`],
    [/^(\d+)h (\d+)m$/, m => `${m[1]} 小时 ${m[2]} 分钟`],
    [/^Around (.+)$/, m => `约 ${m[1]}`],
    [/^Task: (.*)$/, m => `任务：${m[1]}`],
    [/^CHROME EXTENSION · v(.+)$/, m => `Chrome 插件 · v${m[1]}`],
    [/^Updated (\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+) (AM|PM)$/, m => `更新于 ${m[3]}年${m[1]}月${m[2]}日 ${m[7] === 'PM' ? '下午' : '上午'}${m[4]}:${m[5]}:${m[6]}`],
    [/^Updated (.+)$/, m => `更新于 ${m[1]}`],
    [/^([\d.]+)% completion rate$/, m => `${m[1]}% 完成率`],
    [/^(\d+) maybe · (\d+) no$/, m => `${m[1]} 个可能 · ${m[2]} 个不愿意`],
    [/^Across (\d+) completed sessions with recorded time$/, m => `基于 ${m[1]} 个有时长记录的已完成会话`],
    [/^(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+) (AM|PM) · (web|extension) · verified (\d+) min · off task (\d+) min · coverage ([\d.]+)% · score (.+)$/, m => `${m[3]}年${m[1]}月${m[2]}日 ${m[7] === 'PM' ? '下午' : '上午'}${m[4]}:${m[5]}:${m[6]} · ${m[8] === 'extension' ? 'Chrome 插件' : '网页版'} · 已确认 ${m[9]} 分钟 · 非任务 ${m[10]} 分钟 · 覆盖率 ${m[11]}% · 分数 ${m[12]}`],
    [/^(.+?) · (web|extension) · verified (\d+) min · off task (\d+) min · coverage ([\d.]+)% · score (.+)$/, m => `${m[1]} · ${m[2] === 'extension' ? 'Chrome 插件' : '网页版'} · 已确认 ${m[3]} 分钟 · 非任务 ${m[4]} 分钟 · 覆盖率 ${m[5]}% · 分数 ${m[6]}`],
    [/^Ease (.+?)\/5 · Useful (.+?)\/5 · Clear (.+?)\/5 · Self-focus (.+?)\/5 · On task: (.+?) · Again: (.+)$/, m => `易用性 ${m[1]}/5 · 实用性 ${m[2]}/5 · 清晰度 ${m[3]}/5 · 自评专注 ${m[4]}/5 · 任务内时间：${({ all: '全部', most: '大部分', half: '约一半', little: '少部分', none: '没有', '—': '—' })[m[5]] || m[5]} · 再次使用：${({ yes: '愿意', maybe: '可能', no: '不愿意' })[m[6]] || m[6]}`],
    [/^Score\/self-report correlation (.+)$/, m => `算法分数与自评相关系数 ${m[1]}`],
    [/^Check in with yourself around (.+) next time; consider a short break if you want one\.$/, m => `下次可在 ${m[1]} 左右留意自己的状态，需要时短暂休息。`],
    [/^Your measured periods were mostly steady \((.+)\/100\)\. Keep a similar work-block length next time, then compare it with what you completed\.$/, m => `有效测量时段整体较稳定（${m[1]}/100）。下次可以保持相近的学习时段长度，再与实际完成情况比较。`],
    [/^Your measured periods showed some change \((.+)\/100\)\. Try one clearly defined task and make a brief self-check before the pattern usually shifts\.$/, m => `有效测量时段出现了一些变化（${m[1]}/100）。下次尝试一个边界清晰的任务，并在通常发生变化之前简单检查自己的状态。`],
    [/^Your measured periods showed a marked change \((.+)\/100\)\. Try a work block about 5 minutes shorter, or pause briefly when you first notice the same change\.$/, m => `有效测量时段出现明显变化（${m[1]}/100）。下次可将学习时段缩短约 5 分钟，或在再次发现相同变化时短暂休息。`],
    [/^A sustained change first appeared around (.+)\. Next time, check task progress and energy 2–3 minutes before that point\.$/, m => `持续变化首次出现在 ${m[1]} 左右。下次可提前 2–3 分钟检查任务进度和精力状态。`],
    [/^(.+) had no usable eye signal\. Improve camera angle or lighting before comparing this result with another session\.$/, m => `其中 ${m[1]} 没有有效眼部信号。在与其他会话比较前，请先改善摄像头角度或光线。`],
    [/^Tracking coverage was (.+)%\. Keep a similar camera position and lighting so future sessions are easier to compare\.$/, m => `追踪覆盖率为 ${m[1]}%。保持相近的摄像头位置和光线，使之后的会话更容易比较。`],
    [/^Your measured periods were mostly steady \((.+)\/100\)\. Keep a similar study-block length, then compare it with what you completed\.$/, m => `有效测量时段整体较稳定（${m[1]}/100）。下次保持相近的学习时段长度，再与实际完成情况比较。`],
    [/^Your measured periods showed some change \((.+)\/100\)\. Try checking task progress a few minutes before the suggested check-in\.$/, m => `有效测量时段出现一些变化（${m[1]}/100）。下次可在建议检查点前几分钟查看任务进度。`],
    [/^Your measured periods showed a marked change \((.+)\/100\)\. Try a study block about 5 minutes shorter or take a brief reset at the suggested check-in\.$/, m => `有效测量时段出现明显变化（${m[1]}/100）。下次可将学习时段缩短约 5 分钟，或在建议检查点短暂休息。`],
    [/^Try a gentle self-check around (.+) minutes; check task progress and energy instead of treating this as a hard limit\.$/, m => `可在 ${m[1]} 分钟左右简单检查任务进度和精力状态，不要把它当作硬性限制。`],
    [/^(.+) had no usable eye signal\. Adjust lighting or camera position before comparing scores\.$/, m => `其中 ${m[1]} 没有有效眼部信号。比较分数前请调整光线或摄像头位置。`],
    [/^Tracking coverage was (.+)%\. Keep lighting and camera position similar when comparing sessions\.$/, m => `追踪覆盖率为 ${m[1]}%。比较不同会话时请保持相近的光线和摄像头位置。`],
    [/^Try a gentle self-check around (.+) minutes; treat it as an experiment, not a limit\.$/, m => `可在 ${m[1]} 分钟左右检查自己的状态；这是一项尝试，不是时间限制。`],
    [/^(\d+) usable one-second observations\.(.*)$/, m => `${m[1]} 个有效的一秒观测。专注度估计将页面可见期间的眼部行为与个人基线比较。插件还可排除未确认页面。追踪缺失处显示为空白；覆盖率不足会降低结果可靠性。`],
  ];
  for (const [pattern, format] of patterns) { const match = key.match(pattern); if (match) return format(match); }
  return text;
}
const excluded = 'script,style,textarea,input,code,[data-no-translate],[data-language-control]';
export function createTranslator(root) {
  const records = new WeakMap();
  const attributes = new WeakMap();
  function textSource(node) {
    const previous = records.get(node);
    return previous && node.data === previous.rendered ? previous.source : node.data;
  }
  function apply(locale) {
    // Pin implicit option values before translating display labels.
    for (const option of root.querySelectorAll('option:not([value])')) option.setAttribute('value', option.value);
    const walker = root.ownerDocument.createTreeWalker(root, 4);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (node.parentElement?.closest(excluded)) continue;
      const source = textSource(node), rendered = translate(source, locale);
      records.set(node, { source, rendered });
      if (node.data !== rendered) node.data = rendered;
    }
    for (const el of root.querySelectorAll('[placeholder],[aria-label],[title]')) {
      if (el.closest(excluded.replace(',input','').replace(',textarea',''))) continue;
      const saved = attributes.get(el) || {};
      for (const attr of ['placeholder', 'aria-label', 'title']) {
        if (!el.hasAttribute(attr)) continue;
        const now = el.getAttribute(attr), previous = saved[attr];
        const source = previous && now === previous.rendered ? previous.source : now;
        const rendered = translate(source, locale); saved[attr] = { source, rendered };
        if (now !== rendered) el.setAttribute(attr, rendered);
      }
      attributes.set(el, saved);
    }
  }
  return apply;
}
export function localizeReportHtml(html) {
  if (language === 'en') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  createTranslator(doc.documentElement)(language);
  doc.documentElement.lang = ({ zh: 'zh-CN', ko: 'ko', es: 'es' })[language] || 'en';
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
export function mountLanguage({ extension = false } = {}) {
  const key = 'learnfitLanguage';
  const style = document.createElement('style');
  style.textContent = `.lf-settings-button{font:600 12px system-ui!important;min-height:36px;padding:6px 10px;margin:4px;border:1px solid #53766a;border-radius:5px;background:#fffdf8;color:#17362c;cursor:pointer}.lf-settings{box-sizing:border-box;width:min(650px,calc(100vw - 24px));max-height:90vh;overflow:auto;padding:0;border:1px solid #17362c;border-radius:10px;background:#fffdf8;color:#17362c;box-shadow:8px 8px 0 #17362c}.lf-settings::backdrop{background:#10352a99}.lf-settings-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid #d5cec1}.lf-settings-head h2{font:34px/1 "Instrument Serif",Georgia,serif!important;margin:0}.lf-settings-close{border:0;background:transparent;font-size:24px;cursor:pointer}.lf-settings-body{padding:22px}.lf-preferences{display:grid;grid-template-columns:1fr 1fr;gap:12px}.lf-preferences label{display:grid;gap:7px;font:700 11px system-ui}.lf-preferences select,.lf-preferences input{box-sizing:border-box;width:100%;min-height:42px;padding:8px 10px;border:1px solid #17362c;border-radius:4px;background:#f2ede3;color:#17362c;font:14px system-ui}.lf-settings p{font:11px/1.6 system-ui;color:#5f7067;margin:8px 0}.lf-setting-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.lf-setting-card{padding:15px;border:1px solid #d5cec1;background:#f2ede3}.lf-setting-card:first-child{grid-column:1/-1;background:#10352a;color:#fffdf8}.lf-setting-card h3{font:22px/1.1 "Instrument Serif",Georgia,serif!important;margin:0 0 8px}.lf-setting-card:first-child h3{color:#d9ee5e}.lf-setting-card:first-child p{color:#d4ded4}.lf-setting-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.lf-setting-actions button,.lf-setting-actions a{padding:9px 11px;border:1px solid #17362c;border-radius:4px;background:#fffdf8;color:#17362c;text-decoration:none;font:700 11px system-ui;cursor:pointer}@media(max-width:520px){.lf-preferences,.lf-setting-grid{grid-template-columns:1fr}.lf-setting-card:first-child{grid-column:auto}}.nav nav{flex-wrap:wrap}html[lang="zh-CN"] h1,html[lang="zh-CN"] h2,html[lang="zh-CN"] h3{font-family:"Songti SC","Noto Serif CJK SC",serif;line-height:1.3}html[lang="zh-CN"] .hero-copy h1{font-size:clamp(42px,6vw,82px)}html[lang="ko"] body{word-break:keep-all}html[lang="ko"] h1,html[lang="ko"] h2,html[lang="ko"] h3{font-family:"Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;line-height:1.2;letter-spacing:-.035em}html[lang="ko"] .hero-copy h1{font-size:clamp(42px,6vw,82px)}html[lang="es"] .hero-copy h1{font-size:clamp(46px,6.2vw,88px)}.lf-tutorial .lf-actions{position:sticky;bottom:-24px;background:#f2ede3;padding:10px 0}`;
  document.head.append(style);
  const button = document.createElement('button'); button.type = 'button'; button.className = 'lf-settings-button'; button.textContent = '⚙ Settings';
  const dialog = document.createElement('dialog'); dialog.className = 'lf-settings';
  dialog.innerHTML = `<div class="lf-settings-head"><h2>Settings</h2><button type="button" class="lf-settings-close" aria-label="Close settings">×</button></div><div class="lf-settings-body"><div class="lf-preferences"><label>Language<select data-language-control><option value="en">English</option><option value="zh">中文</option><option value="ko">한국어</option><option value="es">Español</option></select></label><label>Study view<select data-pref="studyView"><option value="detailed">Detailed</option><option value="quiet">Quiet</option></select></label><label>Camera preview<select data-pref="cameraPreview"><option value="show">Show</option><option value="hide">Hide</option></select></label><label>Default check-in<input data-pref="defaultCheckIn" type="number" min="5" max="90" step="5"></label><label>Default session mode<select data-pref="sessionMode"><option value="camera">Study with camera</option><option value="timer">Timer only</option></select></label></div><p>Saved on this device. Settings are not uploaded.</p><div class="lf-setting-grid"><section class="lf-setting-card"><h3>Camera & privacy</h3><p><strong>Camera processing stays on this device.</strong> Video frames and face landmarks are processed in memory and are never uploaded to LearnFit. Basic completed-session totals are anonymous; detailed research metrics are sent only when you explicitly opt in.</p></section><section class="lf-setting-card"><h3>How the estimate works</h3><p>LearnFit compares blink frequency, completed-blink duration, and eye openness with your own 30-second baseline. Missing tracking is excluded rather than scored as zero.</p></section><section class="lf-setting-card"><h3>Your controls</h3><p>You choose when camera access begins, can pause or end a session, and can skip detailed research. Closing or ending releases the camera.</p></section></div><div class="lf-setting-actions"><button type="button" data-open-tutorial>Review tutorial</button><button type="button" data-open-how>Read how it works</button><a href="${extension ? 'https://learnfit.pages.dev/privacy.html' : '/privacy.html'}" target="_blank" rel="noreferrer">Read privacy details</a></div></div>`;
  document.body.append(dialog);
  (document.querySelector('header nav') || document.querySelector('.top') || document.querySelector('header') || document.body).append(button);
  const select = dialog.querySelector('[data-language-control]');
  let preferences = { ...DEFAULT_PREFERENCES };
  const apply = createTranslator(document.documentElement);
  const observer = new MutationObserver(() => render());
  function render() {
    observer.disconnect();
    document.documentElement.lang = ({ zh: 'zh-CN', ko: 'ko', es: 'es' })[language] || 'en';
    select.value = language;
    for (const control of dialog.querySelectorAll('[data-pref]')) control.value = preferences[control.dataset.pref];
    apply(language);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder','aria-label','title'] });
  }
  function resolve(saved) {
    if (saved === 'bilingual') return 'zh';
    if (['en', 'zh', 'ko', 'es'].includes(saved)) return saved;
    const browser = navigator.language.toLowerCase();
    if (browser.startsWith('zh')) return 'zh';
    if (browser.startsWith('ko')) return 'ko';
    if (browser.startsWith('es')) return 'es';
    return 'en';
  }
  button.onclick = () => dialog.showModal();
  dialog.querySelector('.lf-settings-close').onclick = () => dialog.close();
  dialog.querySelector('[data-open-tutorial]').onclick = () => { dialog.close(); document.querySelector('#tutorial-help')?.click(); };
  dialog.querySelector('[data-open-how]').onclick = () => { dialog.close(); const local = document.querySelector('[data-how]'); if (local) local.click(); else window.open('https://learnfit.pages.dev/#how', '_blank', 'noopener'); };
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  select.onchange = () => {
    language = ['en', 'zh', 'ko', 'es'].includes(select.value) ? select.value : 'en'; render();
    if (extension) chrome.storage.local.set({ [key]: language }).catch(() => {});
    else try { localStorage.setItem(key, language); } catch {}
  };
  async function savePreferences() {
    preferences = normalizePreferences(Object.fromEntries([...dialog.querySelectorAll('[data-pref]')].map(control => [control.dataset.pref, control.value])));
    if (extension) await chrome.storage.local.set(preferences);
    else writeWebPreferences(preferences);
    window.dispatchEvent(new CustomEvent('learnfit-preferences-changed', { detail: preferences }));
    render();
  }
  for (const control of dialog.querySelectorAll('[data-pref]')) control.addEventListener('change', savePreferences);
  if (extension) chrome.storage.local.get([key, ...Object.keys(DEFAULT_PREFERENCES)]).then(data => { language = resolve(data[key]); preferences = normalizePreferences(data); render(); });
  else { try { language = resolve(localStorage.getItem(key)); preferences = readWebPreferences(); } catch { language = resolve(); preferences = { ...DEFAULT_PREFERENCES }; } render(); }
}
