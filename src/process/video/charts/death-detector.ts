import {writeFileSync} from "fs";
import {RGradientItem} from "../r-gradient";

const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Angle of color gradient</title>
</head>
<body style="height: 100vh; margin: 0">

<script src="https://canvasjs.com/assets/script/canvasjs.min.js"></script>
<div id="chartContainer" style="height: 100%; width: 5000px;"></div>

<script>

var raw_data = %%DATA%%;
var data = [];

data.push({
  type: 'line',
  title: 'death',
  dataPoints: raw_data.map(d => ({
      x: d.time, 
      y: d.data.death?1:0
    }))
});
['r','g','b'].forEach(channel => 
  data.push({
    type: 'line',
    title: channel,
    dataPoints: raw_data.map(d => ({
        x: d.time, 
        y: d.data[channel]
      }))
  })
)

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

export default function draw_death_chart(data: RGradientItem[]) {

  const processed_chart = template
    .replace('%%DATA%%', JSON.stringify(data));

  writeFileSync('death.debug.html', processed_chart);
};
