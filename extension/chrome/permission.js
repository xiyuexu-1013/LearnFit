const button = document.querySelector('#allow');
const status = document.querySelector('#status');
const video = document.querySelector('#preview');
const waiting = document.querySelector('#waiting');

button.addEventListener('click', async () => {
  button.disabled = true;
  status.textContent = 'Waiting for Chrome camera permission…';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user' } });
    video.srcObject = stream;
    waiting.hidden = true;
    status.textContent = 'Camera ready. Starting your private background session…';
    status.classList.add('success');
    stream.getTracks().forEach((track) => track.stop());
    const session = await chrome.runtime.sendMessage({ type: 'LEARNFIT_START' });
    if (session.error) throw new Error(session.error);
    status.textContent = 'LearnFit is running in the background. You may close this page.';
    button.textContent = 'Background session started';
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
    button.textContent = 'Try camera permission again';
  }
});
