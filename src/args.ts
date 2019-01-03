import yargs from 'yargs'

const args = yargs({})
  .options({
    'video': {
      alias: 'i',
      required: true,
      group: 'Input',
      type: 'string',
      desc: 'video file path'
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
export const outputFile = args.output;
export const cooldown = args.cooldown;
export const audioThreshold = args["audio-threshold"];
