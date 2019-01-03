import yargs from 'yargs'
import {ok} from 'assert';

const args = yargs({})
  .options({
    'video': {
      alias: 'i',
      required: true,
      group: 'Input',
      type: 'string',
      desc: 'video file path'
    },
    'from': {
      alias: 's',
      group: 'Input',
      type: "number",
      default: 0,
      desc: "seek to specified time before starting"
    },
    'to': {
      alias: 't',
      group: 'Input',
      type: "number",
      default: null,
      desc: "process to at most the specified time"
    },

    'cache': {
      alias: 'c',
      group: 'Output',
      type: 'string',
      desc: 'Cache file to write to',
      default: null
    },
    'output': {
      alias: 'o',
      group: 'Output',
      type: 'string',
      desc: 'Output file to write to',
      default: null
    },

    'cooldown': {
      group: 'Tuning Params',
      type: 'number',
      default: 5,
      desc: 'number of seconds that need to pass since last activation'
    },
    'audio-threshold': {
      group: 'Tuning Params',
      type: 'number',
      default: 0.15,
      desc: 'percentage of audio peak search based on the highest peak'
    },
    'audio-range-base': {
      group: 'Tuning Params',
      type: 'string',
      choices: ['min', 'avg'],
      default: 'avg',
      desc: 'the minimum value to base the audio range on'
    }
  })
  .help()
  .argv;

export const videoFile = args.video;
export const seekTo = args.from;
export const processTo = args.to;
export const duration = args.to ? (args.to - args.from) : Infinity;

export const cacheFile = args.cache ? args.cache : args.video + '.json';
export const outputFile = args.output;

export const cooldown = args.cooldown;
export const audioThreshold = args["audio-threshold"];
export const audioRangeBase: "avg" | "min" = args["audio-range-base"] as "avg" | "min";

ok(processTo === null || seekTo < processTo, 'starting point cannot be lower or equal to ending point');
