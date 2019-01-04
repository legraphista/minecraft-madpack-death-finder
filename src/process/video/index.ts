import rGradient from "./r-gradient";
import draw_death_chart from "./charts/death-detector";

export default async function video() {

  const deathData = await rGradient();

  await draw_death_chart(deathData);

  return deathData;
}
