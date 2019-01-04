import {
  CAP_PROP_FPS,
  CAP_PROP_FRAME_COUNT,
  CAP_PROP_POS_MSEC,
  CV_32F,
  CV_8U,
  imshow,
  Mat,
  Point2,
  Rect,
  Vec3,
  Vec4,
  VideoCapture,
  waitKey
} from 'opencv4nodejs';
import * as assert from "assert";
import {videoFile} from "../../args";
import {time2human} from "../helpers";

const makeEta = require('simple-eta');

const clip = (min: number, val: number, max: number) => min > val ? min : max < val ? max : val;

const read = async (cap: VideoCapture, skip: number = 0) => {

  for (let i = 0; i < skip; ++i) {
    const frame = await cap.readAsync();
    frame.release();
  }

  return await cap.readAsync();
};

const probePoints = [.3, .33, .36, .63, .66, .69];
/**
 * @deprecated
 */
const processFrame = (frame: Mat) => {

  assert(frame.channels === 3, 'mat has to have 3 channels');

  const buff = frame.getData();

  const w = frame.cols;
  const h = frame.rows;
  const stride = w * 3;

  const cumulated_data_r = new Array(h).fill(0);
  const cumulated_data_g = new Array(h).fill(0);
  const cumulated_data_b = new Array(h).fill(0);

  for (let y = 0; y < h; ++y) {
    const y_offset = y * stride;

    for (let i = 0; i < probePoints.length; i++) {
      const column = (probePoints[i] * w) | 0;

      const component_start = y_offset + column * 3;

      // frame is packed BGR

      const b_index = component_start + 0;
      const g_index = component_start + 1;
      const r_index = component_start + 2;

      const b = buff[b_index];
      const g = buff[g_index];
      const r = buff[r_index];

      cumulated_data_b[y] += b;
      cumulated_data_g[y] += g;
      cumulated_data_r[y] += r;


      // debug
      // {
      //   const c_r = cumulated_data_r[y - 1] / probePoints.length;
      //   const c_g = cumulated_data_g[y - 1] / probePoints.length;
      //   const c_b = cumulated_data_b[y - 1] / probePoints.length;
      //
      //   frame.set(
      //     y, column,
      //     new Vec3(
      //       (Math.sign(r - c_r) + 1) * 255,
      //       (Math.sign(r - c_r) + 1) * 255,
      //       (Math.sign(r - c_r) + 1) * 255
      //     )
      //   );
      // }

    }
  }

  // imshowWait('debug', frame);

  // avg the probe points per channel
  const data_r = cumulated_data_r.map(v => v / probePoints.length);
  const data_g = cumulated_data_g.map(v => v / probePoints.length);
  const data_b = cumulated_data_b.map(v => v / probePoints.length);

  // return {
  //   r: data_r.map((v, i, a) => i === 0 ? true : v > a[i - 1]),
  //   g: data_g.map((v, i, a) => i === 0 ? true : v > a[i - 1]),
  //   b: data_b.map((v, i, a) => i === 0 ? true : v > a[i - 1])
  // }
  return {
    r: data_r,
    g: data_g,
    b: data_b,
    frame
  }
};

const sumArr = (arr: number[]) => arr.reduce((a, c) => a + c, 0);
/**
 * @deprecated
 * @description doesn't work, data is too noisy
 * @see https://math.stackexchange.com/questions/204020/what-is-the-equation-used-to-calculate-a-linear-trendline
 */
const calcTrendline = function (arr: number[]): { angle: number, offset: number } {
  const n = arr.length;
  const y = arr;
  const x = new Array(n).fill(0).map((_, i) => i);

  const sumY = sumArr(y);
  const sumX = sumArr(x);

  const sumXY = sumArr(x.map((x_val, i) => x_val * y[i]));
  const sumXX = sumArr(x.map(x => x * x));

  const angle = (
    ((n * sumXY) - (sumX * sumY)) /
    ((n * sumXX) - (sumX * sumX))
  );
  const offset = (
    (sumY - angle * sumX) /
    n
  );

  return { angle, offset };
};

const findGradient = async function (frame: Mat) {
  assert(frame.channels === 1, 'must be grayscale or a single channel');

  const [dx, dy]: Mat[] = await Promise.all([
    frame.sobelAsync(CV_32F, 1, 0),
    frame.sobelAsync(CV_32F, 0, 1),
  ]);

  // imshow('frame', frame);
  // imshow('dx', dx);
  // imshow('dy', dy);
  // waitKey(0);

  const [avg_dx, avg_dy]: Vec4[] = await Promise.all([
    dx.meanAsync(),
    dy.meanAsync()
  ]);

  const angle = Math.atan2(-avg_dy.w, avg_dx.w);

  const direction = new Point2(
    Math.cos(angle), -Math.sin(angle)
  );

  return { angle, direction };
};

/**
 * @deprecated
 * @description doesn't work, it's too twitchy
 */
const isIncreassing = function (arr: number[], bias = 0, bucket = 1) {
  let score = 0;
  const len = arr.length;

  let sigTrend = Math.sign(bias);

  let bucketValues = 0;

  for (let i = 1; i < len; ++i) {

    // add data to bucket
    let diff = arr[i] - arr[i - 1] + bias;
    bucketValues += diff;

    // check if bucket needs to be flushed
    if (i % bucket !== 0) {
      continue;
    }

    // flush bucket and compute values
    diff = bucketValues / bucket;
    bucketValues = 0;

    if (diff > 0) {
      sigTrend = +1
    } else if (diff < 0) {
      sigTrend = -1;
    } else { // diff === 0
      sigTrend = 0
    }
    score += sigTrend * bucket;
  }

  // since score can be from -len to +len
  // se can detect both gradients by just looking at the signature of the value

  return score / len;
};

const sampleFrameWithProvePoints = (frame: Mat, sampleWidth = 15) => {
  const w = frame.cols;
  const h = frame.rows;

  const mat = new Mat(h, probePoints.length * sampleWidth, frame.type, 0);
  const columnOffset = Math.floor(sampleWidth / 2);
  for (let i = 0; i < probePoints.length; i++) {
    const column = clip(
      0,
      ((probePoints[i] * w) | 0) - columnOffset,
      w - sampleWidth
    );
    frame
      .getRegion(new Rect(column, 0, sampleWidth, h))
      .copyTo(
        mat.getRegion(new Rect(i * sampleWidth, 0, sampleWidth, h))
      );
  }

  return mat;
};

export interface DeathScreenData {
  death: boolean
  r: number
  g: number
  b: number
}

const isDeathScreen = async function ({ frame, r, g, b }: { frame: Mat, r: number[], g: number[], b: number[] }): Promise<DeathScreenData> {

  const [b_f, g_f, r_f] = await frame.splitChannelsAsync();

  const [b_g, g_g, r_g] = await Promise.all([
    findGradient((b_f)),
    findGradient((g_f)),
    findGradient((r_f))
  ]);

  // console.log({
  //   b_g,
  //   g_g,
  //   r_g
  // });

  // sum B and G vectors
  const sum_B_G = b_g.direction.add(g_g.direction).div(2);
  // const neg_sum_B_G = sum_B_G.mul(-1);

  // subtract the BG angle from R

  const R_sub_B_G = r_g.direction.sub(sum_B_G);

  // console.log('angle diff (should be away from 0)', angle_R_take_B_G);

  const center = new Point2(frame.cols / 2, frame.rows / 2);

  frame.drawArrowedLine(
    center,
    center.add(R_sub_B_G.mul(100)) as Point2,
    new Vec3(255, 255, 255),
    4, 0, 0, 5
  );
  frame.drawArrowedLine(
    center,
    center.add(sum_B_G.mul(-100)) as Point2,
    new Vec3(255, 255, 0),
    4, 0, 0, 5
  );

  frame.drawArrowedLine(
    center,
    center.add(b_g.direction.mul(100)) as Point2,
    new Vec3(255, 0, 0),
    4, 0, 0, 5
  );
  frame.drawArrowedLine(
    center,
    center.add(g_g.direction.mul(100)) as Point2,
    new Vec3(0, 255, 0),
    4, 0, 0, 5
  );
  frame.drawArrowedLine(
    center,
    center.add(r_g.direction.mul(100)) as Point2,
    new Vec3(0, 0, 255),
    4, 0, 0, 5
  );

  const gradient = new Mat(frame.rows, frame.cols, CV_8U, 0);
  const grad_start = 32;
  const grad_end = 82;
  for (let i = 0; i < frame.rows; ++i) {
    const line = gradient.getRegion(new Rect(0, i, frame.cols, 1));

    const perc = i / frame.rows;
    const color = (grad_end - grad_start) * perc + grad_start;

    line.setTo(color);
  }
  imshow('gradient', gradient);

  const [frame_b, frame_g, frame_r] = frame.splitChannels();
  // const b_and_g = frame_b.div(2).add(frame_g.div(2));
  const isolated_r = frame_r.sub(gradient);
  const r_and_b_and_g = isolated_r
    .div(3)
    .add(frame_b
      .div(3)
      .add(frame_g
        .div(3)
      )
    );

  for (let i = 0; i < frame.rows; ++i) {
    const line = isolated_r.getRegion(new Rect(0, i, frame.cols, 1));

    const perc = i / frame.rows;
    const color = (grad_end - grad_start) * perc + grad_start;

    const color_boost = 1 + color / 255;
    line.mul(color_boost).copyTo(line);
  }

  const gray = frame.bgrToGray();
  imshow('frame', frame);
  // imshow('b+g', b_and_g);
  imshow('r', frame_r);
  imshow('ir', isolated_r);
  imshow('ir+gradient', isolated_r.add(gradient));
  imshow('r - (ir+gradient)', frame_r.sub(isolated_r.add(gradient)));
  // imshow('ir+b+g', r_and_b_and_g);
  // imshow('gray-(ir+b+g)', gray.sub(r_and_b_and_g));
  // imshow('r-(b+g)', frame_r.sub(b_and_g));
  // imshow('r-gray', frame_r.sub(gray));
  waitKey(0);

  const negPIo2 = -Math.PI / 2;

  // if   r is more than 80 gradient
  // and  g is less than 30 gradient
  // and  b is less than 30 gradient
  return {
    death: false,
    r: (negPIo2 - r_g.angle),
    g: (negPIo2 - g_g.angle),
    b: (negPIo2 - b_g.angle),
  };
};

export interface RGradientItem {
  time: number,
  data: DeathScreenData
}

export default async function rGradient(): Promise<RGradientItem[]> {

  const eta = makeEta();

  const cap = new VideoCapture(videoFile);

  cap.set(CAP_PROP_POS_MSEC, 20000);

  const frameCount = cap.get(CAP_PROP_FRAME_COUNT);
  const fps = cap.get(CAP_PROP_FPS);
  const pointsPerSecond = 5;
  const skip = (fps / pointsPerSecond - 1) | 0;
  const duration = frameCount / fps;

  const data: RGradientItem[] = [];

  let lastFrame = new Mat();

  let capThreadTask = read(cap, 0);
  while (true) {
    const frame = await capThreadTask;
    capThreadTask = read(cap, skip);
    if (frame.empty) {
      break;
    }
    if (lastFrame.empty) {
      lastFrame = frame.copy();
      frame.release();
      continue;
    }

    ///
    //
    // const last_r = lastFrame.splitChannels()[2];
    // const current_r = frame.splitChannels()[2];
    //
    // const blank127 = new Mat(frame.rows, frame.cols, CV_8U, 127);
    //
    // imshow('frame', frame);
    // imshow('last', last_r);
    // imshow('current', current_r);
    // // imshow('diff', current_r.div(2).add(blank127).sub(last_r.div(2)));
    // imshow('diff', current_r.sub(last_r));
    //
    // waitKey(0);
    //
    // lastFrame.release();
    // lastFrame = frame;


    const time = cap.get(CAP_PROP_POS_MSEC) / 1000;
    data.push({
        time,
        data: await isDeathScreen(processFrame(frame))
      }
    );
    //
    frame.release();

    const percentageDone = time / duration;
    eta.report(percentageDone);
    console.log((percentageDone * 100).toFixed(2) + '%', time2human(eta.estimate() as number));
  }

  return data;
}
