import { FocusEngine } from '../src/core/index.js';

const engine = new FocusEngine();
engine.start(0);

for (let timestamp = 100; timestamp <= 31_000; timestamp += 100) {
  const estimate = engine.calculate({
    blinkFrequency: 15,
    blinkDuration: 150,
    ear: 0.31,
    blinkCompleted: timestamp % 4000 === 0,
  }, timestamp);
  if (timestamp === 31_000) console.log(estimate);
}
engine.stop();
