import {audioRangeBase, audioThreshold, duration, seekTo, videoFile} from "../../args";
import {activations2time, hour} from "../helpers";

const FFMpeg = require('ffmpeg-progress-wrapper');

// ffmpeg -i <IN> -af astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level -f null -

const run = async function run() {

  const process = new FFMpeg([
    '-ss', seekTo,
    '-t', Math.min(72 * hour, duration),
    '-i', videoFile,
    '-af', 'astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level',
    '-f', 'null', '-'
  ], { duration: duration > 72 * hour ? undefined : duration * 1000 });

  const times: number[] = [];
  const levels: number[] = [];

  process.on('progress', ({ progress, eta, speed }: { progress: number, eta: number, speed: number }) =>
    console.log(
      `Processing audion: ${(progress * 100).toFixed(2)}% @${speed.toFixed(2)}x ETA:${(eta / 1000) | 0}s`
    ));

  process.on('raw', (text: string) => {
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.indexOf('pts_time:') !== -1) {
        const [, time] = line.split('pts_time:');
        times.push(parseFloat(time) + seekTo);
      }
      if (line.indexOf('RMS_level=') !== -1) {
        const [, level] = line.split('RMS_level=');
        levels.push(parseFloat(level) || -Infinity);
      }
    }

  });

  try {
    await process.done();
  } catch (e) {
    console.error(process._output);
    throw e;
  }

  return { levels, times };
};

const process = ({ levels }: { levels: number[] }) => {
  const cleanLevels = levels.filter(level => level > -150);
  const max = Math.max(...cleanLevels);
  const min = Math.min(...cleanLevels);
  const avg = cleanLevels.reduce((a, c) => a + c, 0) / cleanLevels.length;

  let range;
  switch (audioRangeBase) {
    case "min":
      range = (max - min);
      break;
    case "avg":
      range = (max - avg);
      break;
  }
  const threshold = max - (audioThreshold * range);

  return { activations: levels.map(level => level > threshold), threshold, min, max, avg };
};

export default async function audio() {
  const { levels, times } = await run();

  const { activations, threshold, min, max, avg } = process({ levels });

  const activeTimes = activations2time({ activations, times });

  const activationLevels = activeTimes.map(time => {
    const i = times.indexOf(time);
    return levels[i];
  });

  return { threshold, times: activeTimes, levels: activationLevels, min, max, avg };
}
