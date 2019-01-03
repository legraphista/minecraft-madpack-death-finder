import {audioThreshold, videoFile} from "../../args";
import {activations2time} from "../helpers";

const FFMpeg = require('ffmpeg-progress-wrapper');

// ffmpeg -i <IN> -af astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level -f null -

const run = async function run() {

  const process = new FFMpeg([
    '-i', videoFile,
    '-af', 'astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level',
    '-f', 'null', '-'
  ]);

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
        times.push(parseFloat(time));
      }
      if (line.indexOf('RMS_level=') !== -1) {
        const [, level] = line.split('RMS_level=');
        levels.push(parseFloat(level) || -Infinity);
      }
    }

  });

  await process.done();

  return { levels, times };
};

const process = ({ levels }: { levels: number[] }) => {
  const max = Math.max(...levels);
  const min = Math.min(...levels.filter(level => level > -150));
  const range = (max - min);
  const threshold = max - (audioThreshold * range);

  return levels.map(level => level > threshold);
};

export default async function audio() {
  const { levels, times } = await run();

  const activations = process({ levels });

  const activeTimes = activations2time({ activations, times });

  const activationLevels = activeTimes.map(time => {
    const i = times.indexOf(time);
    return levels[i];
  });

  return {times: activeTimes, levels: activationLevels};
}
