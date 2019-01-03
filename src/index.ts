import audio from './process/audio'
import {Output, time2human} from "./process/helpers";
import {outputFile} from "./args";

(async () => {

  const output = new Output(outputFile);

  const audioTimes = await audio();

  output.write(`Audio activation threshold is ${audioTimes.threshold.toFixed(2)}`);
  output.write(`Audio max level is ${audioTimes.max.toFixed(2)}`);
  output.write(`Audio min level is ${audioTimes.min.toFixed(2)}`);

  for(let i = 0; i < audioTimes.times.length; ++i){
    const time = audioTimes.times[i];
    const level = audioTimes.levels[i];

    output.write(`Activation at ${time2human(time)} peak of ${level.toFixed(2)}`);
  }

})();
