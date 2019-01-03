import {cacheFile, cooldown, processTo, seekTo, videoFile} from "../args";
import {appendFileSync, existsSync, readFileSync, unlinkSync, writeFileSync} from "fs";
import {CacheData} from "./helpers";

export function activations2time({ activations, times }: { activations: boolean[], times: number[] }) {
  const activationTimes: number[] = [];

  for (let i = 0; i < activations.length; ++i) {
    const time = times[i];
    const activation = activations[i];
    if (!activation) {
      continue;
    }

    const lastTime = activationTimes.length === 0 ?
      -Infinity :
      activationTimes[activationTimes.length - 1];

    if (time - cooldown < lastTime) {
      continue;
    }

    activationTimes.push(time);
  }

  return activationTimes;
}


export const second = 1;
export const minute = second * 60;
export const hour = minute * 60;

const fixTime = (time: number | string) => time < 10 ? `0${time}` : time.toString();

export function time2human(time: number) {
  const h = (time / hour) | 0;
  const m = ((time / minute) % 60) | 0;
  const s = ((time / second) % 60).toFixed(3);
  return `${fixTime(h)}:${fixTime(m)}:${fixTime(s)}`;
}

export function min(vals: number[]) {
  let min = vals[0];
  for (let i = 1; i < vals.length; ++i) {
    const v = vals[i];
    if (v < min) {
      min = v;
    }
  }
  return min;
}


export function max(vals: number[]) {
  let max = vals[0];
  for (let i = 1; i < vals.length; ++i) {
    const v = vals[i];
    if (v > max) {
      max = v;
    }
  }
  return max;
}

export class Output {
  file: string;

  constructor(file: string) {
    this.file = file;

    if (file && existsSync(file)) {
      unlinkSync(file);
    }
  }

  write(text: string) {
    if (this.file) {
      appendFileSync(this.file, text + '\n');
    }
    console.log(text);
  }
}

export interface CacheData {
  args: {
    file: string,
    start?: number,
    end?: number
  },
  audio_db?: {
    levels: number[],
    times: number[],
  }
}

export namespace Cache {

  let cacheData: CacheData;

  export function cacheValid(cache: CacheData) {
    if (cache.args.start !== undefined && cache.args.start !== seekTo) return false;
    if (cache.args.end !== undefined && cache.args.end !== processTo) return false;
    if (cache.args.file !== videoFile) return false;
    return true;
  }

  export function load(): CacheData {
    if (cacheData) return cacheData;

    if (!cacheFile || !existsSync(cacheFile)) {
      return cacheData = {
        args: {
          file: videoFile
        }
      }
    }

    const data = JSON.parse(readFileSync(cacheFile).toString()) as CacheData;
    if (!cacheValid(data)) {
      return cacheData = {
        args: {
          file: videoFile
        }
      }
    }

    return cacheData = data;
  }

  export function save() {
    if(!cacheFile) return;
    writeFileSync(cacheFile, JSON.stringify(cacheData));
  }
}
