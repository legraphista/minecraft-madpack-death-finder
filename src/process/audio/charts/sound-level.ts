import {readFileSync, writeFileSync} from "fs";
import {join as pathJoin} from "path";

const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Sound level</title>
</head>
<body>

<script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
<div id="chart_div"></div>

<script>

  google.charts.load('current', {packages: ['corechart', 'line']});
  google.charts.setOnLoadCallback(drawBasic);

  var times = %%TIMES%%;
  var levels = %%LEVELS%%;
  var threshold = %%THRESH%%;

  function drawBasic() {

    var data = new google.visualization.DataTable();
    data.addColumn('number', 'X');
    data.addColumn('number', 'dB');

    data.addRows(times.map((t, i) => [t, Math.max(levels[i], -100), threshold]));

    var options = {
      hAxis: {
        title: 'Time'
      },
      vAxis: {
        title: 'dB'
      },
      width: times.length*3,
      height: 1000
    };

    var chart = new google.visualization.LineChart(document.getElementById('chart_div'));

    chart.draw(data, options);
  }

</script>

</body>
</html>
`;

export default function draw_chart ({ times, levels, threshold }: { times: number[], levels: number[], threshold:number }) {

  const processed_chart = template
    .replace('%%TIMES%%', JSON.stringify(times))
    .replace('%%LEVELS%%', JSON.stringify(levels))
    .replace('%%THRESH%%', JSON.stringify(threshold));

  writeFileSync('audio.debug.html', processed_chart);
};
