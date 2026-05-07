/**
 * responsive.ts
 * Drop this in: utils/responsive.ts
 *
 * Provides scale helpers so every fixed px value in your StyleSheets
 * adjusts proportionally to the device screen — no style rewrites needed.
 *
 * Usage:
 *   import { rs, rms, rvs, wp, hp } from '../utils/responsive';
 *
 *   fontSize: rs(14)        // scale font
 *   padding: rms(16)        // moderate-scale spacing (gentler)
 *   height: rvs(60)         // scale by vertical axis
 *   width: wp('90%')        // percentage of screen width
 *   height: hp('10%')       // percentage of screen height
 */

import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Design base (iPhone 14 / 390×844 — change if you designed on another device)
const BASE_WIDTH  = 390;
const BASE_HEIGHT = 844;

/** Horizontal scale — use for widths, horizontal padding, icon sizes */
export const rs = (size: number): number => {
  const scaled = (SCREEN_WIDTH / BASE_WIDTH) * size;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/** Vertical scale — use for heights, vertical padding, line heights */
export const rvs = (size: number): number => {
  const scaled = (SCREEN_HEIGHT / BASE_HEIGHT) * size;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * Moderate scale — best for font sizes & border radii.
 * `factor` (0–1) controls how aggressively it scales.
 * Default 0.5 = halfway between no-scale and full-scale.
 */
export const rms = (size: number, factor = 0.5): number => {
  const scaled = size + (rs(size) - size) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/** Width as a percentage of screen width  e.g. wp('90%') → number */
export const wp = (widthPercent: string | number): number => {
  const pct = typeof widthPercent === 'string'
    ? parseFloat(widthPercent)
    : widthPercent;
  return Math.round(PixelRatio.roundToNearestPixel((pct / 100) * SCREEN_WIDTH));
};

/** Height as a percentage of screen height  e.g. hp('10%') → number */
export const hp = (heightPercent: string | number): number => {
  const pct = typeof heightPercent === 'string'
    ? parseFloat(heightPercent)
    : heightPercent;
  return Math.round(PixelRatio.roundToNearestPixel((pct / 100) * SCREEN_HEIGHT));
};

/** Raw screen dimensions — handy for conditional logic */
export const screen = {
  width:  SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall:  SCREEN_WIDTH < 360,   // e.g. older Android low-end
  isMedium: SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 414,
  isLarge:  SCREEN_WIDTH >= 414,  // e.g. iPhone Plus / Pro Max
};