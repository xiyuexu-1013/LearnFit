let isRunning = false;
const btn = document.getElementById('toggle-btn');
const score = document.getElementById('score');
const statusText = document.getElementById('status');

btn.onclick = () => {
    isRunning = !isRunning;
    if (isRunning) {
        btn.innerText = "Stop Session";
        btn.style.background = "#ef4444";
        score.innerText = "88";
        statusText.innerText = "Optimal Focus";
    } else {
        btn.innerText = "Start Session";
        btn.style.background = "#3b82f6";
        score.innerText = "--";
        statusText.innerText = "Session Paused";
    }
};
