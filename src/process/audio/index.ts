import {
  audioLevelsCacheFile,
  audioRangeBase,
  audioThreshold,
  duration,
  seekTo,
  videoFile
} from "../../args";
import {activations2time, hour, max as calcMax, min as calcMin} from "../helpers";
import {existsSync, readFileSync} from "fs";
import draw_chart from "./charts/sound-level";

const FFMpeg = require('ffmpeg-progress-wrapper');

// ffmpeg -i <IN> -af astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level -f null -

const attachFFMpegLogger = (proc: any, tag: string) =>
  proc.on('progress', ({ progress, eta, speed }: { progress: number, eta: number, speed: number }) =>
    console.log(
      `${tag}: ${(progress * 100).toFixed(2)}% @${speed.toFixed(2)}x ETA:${(eta / 1000) | 0}s`
    ));

const awaitFFMpeg = async (proc: any) => {
  try {
    await proc.done();
  } catch (e) {
    console.error(proc._output);
    throw e;
  }
};

const extract = async function extract() {
  let proc;
  const audioFile = videoFile + '.audio.mkv';

  // extract audio
  if (!existsSync(audioFile)) {
    proc = new FFMpeg([
      '-ss', seekTo,
      '-t', Math.min(72 * hour, duration),
      '-i', videoFile,
      '-c:a', 'copy',
      '-vn',
      '-y', audioFile
    ]);
    attachFFMpegLogger(proc, 'Extracting audio file');
    await awaitFFMpeg(proc);
  } else {
    console.log(`Extracted audio ${audioFile} file already exists`);
  }

  // process audio
  if (!existsSync(audioLevelsCacheFile)) {
    proc = new FFMpeg([
      '-i', audioFile,
      '-af', `astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=${audioLevelsCacheFile}`,
      '-f', 'null', '-'
    ]);
    attachFFMpegLogger(proc, 'Processing audio file');
    await awaitFFMpeg(proc);
  } else {
    console.log(`Processed audio data ${audioLevelsCacheFile} file already exists`);
  }

  return readFileSync(audioLevelsCacheFile).toString().trim();
};

const LEVEL_LINE_DATA_START = 'lavfi.astats.Overall.RMS_level='.length;

const run = async function run() {

  const audioFileData = await extract();

  const lines = audioFileData.split('\n');

  const times: number[] = [];
  const levels: number[] = [];

  for (let i = 0; i < lines.length; i += 2) {
    // "frame:1    pts:1024    pts_time:0.0213333"
    // "frame:16404 pts:16797696 pts_time:349.952"
    const time_line = lines[i + 0];
    // "lavfi.astats.Overall.RMS_level=-88.568815"
    const level_line = lines[i + 1];

    const time = parseFloat(time_line.split('pts_time:')[1]);
    const level = parseFloat(level_line.substr(LEVEL_LINE_DATA_START)) || -(2 ** 53);

    times.push(time);
    levels.push(level);
  }

  return { levels, times };
};

const process = ({ levels }: { levels: number[] }) => {
  const cleanLevels = levels.filter(level => level > -150);
  const max = calcMax(cleanLevels);
  const min = calcMin(cleanLevels);
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

  return {
    activations: levels.map(level => level > threshold),
    threshold,
    min,
    max,
    avg
  };
};

export default async function audio() {

  const { levels, times } = await run();

  const { activations, threshold, min, max, avg } = process({ levels });

  draw_chart({ times, levels , threshold});


  const activeTimes = activations2time({ activations, times });

  const activationLevels = activeTimes.map(time => {
    const i = times.indexOf(time);
    return levels[i];
  });

  return { threshold, times: activeTimes, levels: activationLevels, min, max, avg };
}
