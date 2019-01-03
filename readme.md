# Minecraft MadPack Death Rage finder

The scope of this project is to find the timestamps at which streamers die and rage in their MadPack streams.

## Prerequisites

- ffmpeg installed and in path
- opencv 3.X libraries available (not implemented yet)

## install

```bash
git clone https://github.com/legraphista/minecraft-madpack-death-finder.git;
cd minecraft-madpack-death-finder;

yarn install || npm i;
```

## usage
```
$ ./index.js
Input
  --video, -i  video file path                               [string] [required]
  --from, -s   seek to specified time before starting      [number] [default: 0]
  --to, -t     process to at most the specified time[number] [default: Infinity]

Output
  --output, -o  Output file to write to                 [string] [default: null]

Tuning Params
  --cooldown          number of seconds that need to pass since last activation
                                                           [number] [default: 5]
  --audio-threshold   percentage of audio peak search based on the highest peak
                                                         [number] [default: 0.1]
  --audio-range-base  the minimum value to base the audio range on
                               [string] [choices: "min", "avg"] [default: "avg"]

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]

```

## Example

```
youtube-dl -f "worst" https://www.twitch.tv/videos/357930411## --id
$ ./index -i v357930411.mp4 -o activations.txt
...
Audio activation threshold is -18.41
Audio max level is -15.81
Audio min level is -149.98
Audio avg level is -41.86
...
Activation at 00:07:58.052 peak of -17.15
Activation at 00:10:03.510 peak of -18.06
Activation at 00:11:07.272 peak of -18.11
Activation at 00:14:37.111 peak of -17.88
Activation at 00:14:46.979 peak of -15.81
Activation at 00:20:02.490 peak of -17.09
Activation at 00:20:21.560 peak of -17.64
...
```
