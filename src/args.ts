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
      default: Infinity,
      desc: "process to at most the specified time"
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
      default: 0.1,
      desc: 'percentage of audio peak search based on the highest peak'
    }
  })
  .help()
  .argv;

export const videoFile = args.video;
export const seekTo = args.from;
export const processTo = args.to;
export const duration = (args.to - args.from);

export const outputFile = args.output;

export const cooldown = args.cooldown;
export const audioThreshold = args["audio-threshold"];

ok(seekTo < processTo, 'starting point cannot be lower or equal to ending point');
