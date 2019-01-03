import audio from './process/audio'
import {Output, time2human} from "./process/helpers";
import {outputFile} from "./args";

(async () => {

  const output = new Output(outputFile);

  const audioTimes = await audio();

  for(let i = 0; i < audioTimes.times.length; ++i){
    const time = audioTimes.times[i];
    const level = audioTimes.levels[i];

    output.write(`Activation at ${time2human(time)} peak of ${level.toFixed(2)}`);
  }

})();
