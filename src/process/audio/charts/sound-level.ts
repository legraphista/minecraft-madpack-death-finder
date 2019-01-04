import {writeFileSync} from "fs";

const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Sound level</title>
</head>
<body style="height: 100vh; margin: 0">

<script src="https://canvasjs.com/assets/script/canvasjs.min.js"></script>
<div id="chartContainer" style="height: 100%; width: 5000px;"></div>

<script>

var times = %%TIMES%%;
var levels = %%LEVELS%%;
var threshold = %%THRESH%%;
var data = [];

var dataSeries = { type: "line" };
var dataPoints = times.map((t,i) => ({
    x: t, 
    y: Math.max(-100,levels[i])
}));
dataSeries.dataPoints = dataPoints;
data.push(dataSeries);
data.push({
  type: 'line',
  dataPoints: times.map((t,i) => ({
      x: t, 
      y: threshold
    }))
});

var options = {
	zoomEnabled: true,
	animationEnabled: false,
	title: {
		text: "dB"
	},
	axisY: {
		includeZero: false,
		lineThickness: 1
	},
	data: data  
};

console.log(options);
var chart = new CanvasJS.Chart("chartContainer", options);

chart.render();
  
</script>

</body>
</html>
`;

export default function draw_chart({ times, levels, threshold }: { times: number[], levels: number[], threshold: number }) {

  const processed_chart = template
    .replace('%%TIMES%%', JSON.stringify(times))
    .replace('%%LEVELS%%', JSON.stringify(levels))
    .replace('%%THRESH%%', JSON.stringify(threshold));

  writeFileSync('audio.debug.html', processed_chart);
};
