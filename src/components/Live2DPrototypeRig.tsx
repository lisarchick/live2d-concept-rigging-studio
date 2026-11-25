import React, { useState, useEffect, useRef } from 'react';
import { ConceptSpec } from '../data/conceptsData';
import { STAGE4_ASSISTANT_STATES, AssistantStateId } from '../data/stage4Data';
import {
  Live2DParameterState,
  EMOTION_PRESETS,
  EXPRESSION_SPRITE_MAP,
  VISEME_SPRITE_MAP,
  CUTOUT_VISEME_SLIDES_32,
  CUTOUT_VISEME_SLIDES_48,
  BASE_VISEME_TO_SLIDE_INDEX,
  AnimeVisemeKey,
  resolveAnimeVisemeKey,
  resolveClosestSlide48,
  EmotionPresetId,
  clampParameter,
  computeHeadAndBrowTransform,
  computeMeshVertexDeformation,
  compilePhraseToSilentPerformance,
  samplePerformanceAtTime
} from '../utils/conceptLogic';
import {
  Sliders,
  Volume2,
  RotateCcw,
  Eye,
  Sparkles,
  Layers,
  Activity,
  Cpu,
  MessageSquareText,
  Play,
  Square,
  CheckCircle2
} from 'lucide-react';

export interface ExternalSpeechCommand {
  id: number;
  text: string;
  emotion: EmotionPresetId;
}

interface Live2DPrototypeRigProps {
  concept: ConceptSpec;
  externalAssistantState?: AssistantStateId | null;
  externalSpeechCommand?: ExternalSpeechCommand | null;
}

const EXPRESSIONS_CUTOUT_URL = '/assets/aistudio/alisa_expressions_cutout.png';
const EXPRESSIONS_MOUTHLESS_CUTOUT_URL = '/assets/aistudio/alisa_expressions_mouthless_cutout.png';
const VISEMES_48_CUTOUT_URL = '/assets/aistudio/alisa_visemes_48_cutout.png';
const BLINK_CLOSED_EYES_URL = '/assets/aistudio/alisa_blink_closed_eyes.png';

const CELL_SIZE = 334;
const CANVAS_INTERNAL_SIZE = 668;
const MESH_GRID_DIVS = 16;

type OverlayBgMode = 'alpha_dark' | 'alpha_checker' | 'pure_transparent' | 'chroma_green';

const PRESET_TEST_PHRASES = [
  {
    label: 'Приветствие (Тёплая мимика + 48 слайдов)',
    text: 'Привет! Я Алиса, твой виртуальный ассистент. Посмотри, какая у меня теперь чёткая нижняя губа и плавная мимика!'
  },
  {
    label: 'Вопрос (Дружелюбный взгляд + Мягкие брови)',
    text: 'Привет! Как прошёл твой день? Расскажи мне, что у тебя нового и интересного?'
  },
  {
    label: 'Скороговорка (Тест 48 слайдов коартикуляции)',
    text: 'На дворе трава, на траве дрова — проверяем 48 промежуточных слайдов гласных и согласных без единого рывка!'
  },
  {
    label: 'Размышление (Задумчивый взгляд)',
    text: 'Хм... Дай мне секунду проанализировать архитектуру слоёв и волновую физику прядей...'
  }
];

/**
 * One-time Contrast-Adaptive Anime Sharpening (AMD FidelityFX CAS + Dark Ink Line-Art Crispness)
 * Runs once when each sprite sheet loads to eliminate 334x334 softness and make eyelashes,
 * irises, brow arches, lips, and hair strands razor-sharp without skin noise.
 */
export function enhanceAnimeSpriteSheet(
  img: HTMLImageElement,
  sharpness = 0.65
): HTMLCanvasElement {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || w < 4 || h < 4) return canvas;

  ctx.drawImage(img, 0, 0);
  const srcImg = ctx.getImageData(0, 0, w, h);
  const dstImg = ctx.createImageData(w, h);
  const s = srcImg.data;
  const d = dstImg.data;

  // Copy border pixels
  d.set(s);

  const rowStride = w * 4;
  for (let y = 1; y < h - 1; y++) {
    const rowOff = y * rowStride;
    for (let x = 1; x < w - 1; x++) {
      const idx = rowOff + x * 4;
      const a = s[idx + 3];
      if (a < 14) {
        d[idx] = 0;
        d[idx + 1] = 0;
        d[idx + 2] = 0;
        d[idx + 3] = 0;
        continue;
      }

      const rC = s[idx];
      const gC = s[idx + 1];
      const bC = s[idx + 2];

      const idxN = idx - rowStride;
      const idxS = idx + rowStride;
      const idxW = idx - 4;
      const idxE = idx + 4;

      // Neighbor RGB
      const rN = s[idxN], gN = s[idxN + 1], bN = s[idxN + 2];
      const rS = s[idxS], gS = s[idxS + 1], bS = s[idxS + 2];
      const rW = s[idxW], gW = s[idxW + 1], bW = s[idxW + 2];
      const rE = s[idxE], gE = s[idxE + 1], bE = s[idxE + 2];

      // Fast green-weighted luminance (0..255)
      const lumC = rC * 0.299 + gC * 0.587 + bC * 0.114;
      const lumN = rN * 0.299 + gN * 0.587 + bN * 0.114;
      const lumS = rS * 0.299 + gS * 0.587 + bS * 0.114;
      const lumW = rW * 0.299 + gW * 0.587 + bW * 0.114;
      const lumE = rE * 0.299 + gE * 0.587 + bE * 0.114;

      const minL = Math.min(lumC, lumN, lumS, lumW, lumE);
      const maxL = Math.max(lumC, lumN, lumS, lumW, lumE);
      const localContrast = maxL - minL;

      // Protect flat skin gradients (low contrast & warm skin tone) from any grain
      const isFlatSkin = localContrast < 14 && rC > 228 && gC > 198 && rC > bC;
      if (isFlatSkin) {
        // Gentle bilateral smoothing on flat skin
        d[idx] = (rC * 4 + rN + rS + rW + rE) >> 3;
        d[idx + 1] = (gC * 4 + gN + gS + gW + gE) >> 3;
        d[idx + 2] = (bC * 4 + bN + bS + bW + bE) >> 3;
        d[idx + 3] = a;
        continue;
      }

      // Contrast-Adaptive Sharpening (CAS) weight
      const normMax = (maxL + 1) / 256;
      const normMin = minL / 256;
      const casAmp = Math.sqrt(Math.max(0, Math.min(1, (1 - normMax) / Math.max(0.05, normMax - normMin * 0.5))));
      // Extra crispness on dark anime ink lines (eyelashes, eyebrows, iris rim, mouth contour)
      const inkBoost = lumC < 155 ? 1.28 : 1.0;
      const wSharp = -casAmp * (0.16 * sharpness * inkBoost);
      const invDenom = 1 / (1 + 4 * wSharp);

      let outR = (rC + (rN + rS + rW + rE) * wSharp) * invDenom;
      let outG = (gC + (gN + gS + gW + gE) * wSharp) * invDenom;
      let outB = (bC + (bN + bS + bW + bE) * wSharp) * invDenom;

      // Subtle violet iris & dark eyelash micro-contrast boost
      if (lumC < 95) {
        outR *= 0.94;
        outG *= 0.94;
        outB *= 0.95;
      }

      d[idx] = outR < 0 ? 0 : outR > 255 ? 255 : outR;
      d[idx + 1] = outG < 0 ? 0 : outG > 255 ? 255 : outG;
      d[idx + 2] = outB < 0 ? 0 : outB > 255 ? 255 : outB;
      d[idx + 3] = a > 245 ? 255 : a;
    }
  }

  ctx.putImageData(dstImg, 0, 0);
  return canvas;
}

/**
 * Self-Skin-Adaptive Continuous Eyelid Rig (334x334 cell space).
 * Smoothly lowers or closes the left (eyeOpenL) and/or right (eyeOpenR) eyelids on ANY of the 9 emotions
 * without ever pasting foreign sprite strips or breaking hair bangs, eyebrows, or blush gradients.
 */
export function applySeamlessEyelidRig(
  cellData: Uint8ClampedArray,
  eyeOpenL: number,
  eyeOpenR: number,
  activeEmotion: EmotionPresetId
) {
  // Joy and Laugh already have both eyes natively closed (^ ^) in the base expression sheet
  if (activeEmotion === 'joy' || activeEmotion === 'laugh') {
    return;
  }

  const processSingleEye = (isLeftEye: boolean, rawOpen: number) => {
    // In the static 'wink' sprite (col: 1, row: 2), the screen-right eye is already natively closed
    if (activeEmotion === 'wink' && !isLeftEye) {
      return;
    }

    const openVal = clampParameter(rawOpen, 0, 1.05);
    if (openVal >= 0.93) {
      return; // Eye is wide open — keep 100% original artwork
    }

    const closeLinear = clampParameter((0.93 - openVal) / 0.78, 0, 1);
    const smoothClose = closeLinear * closeLinear * (3 - 2 * closeLinear);

    const cx = isLeftEye ? 132.0 : 202.0;
    const halfSpan = 19;
    const xStart = Math.max(108, Math.round(cx - halfSpan));
    const xEnd = Math.min(226, Math.round(cx + halfSpan));
    const numCols = xEnd - xStart + 1;

    const firstDarkYArr = new Int16Array(numCols);
    const lastEyeYArr = new Int16Array(numCols);
    const topSkinR = new Float32Array(numCols);
    const topSkinG = new Float32Array(numCols);
    const topSkinB = new Float32Array(numCols);
    const botSkinR = new Float32Array(numCols);
    const botSkinG = new Float32Array(numCols);
    const botSkinB = new Float32Array(numCols);

    let sumTopY = 0;
    let sumBotY = 0;
    let centerCount = 0;

    // Pass 1: Detect exact open-eye vertical span [firstDarkY .. lastEyeY] and local skin tone per column
    for (let i = 0; i < numCols; i++) {
      const x = xStart + i;
      const nx = (x - cx) / halfSpan;
      // Tighter vertical search window near eye corners so eyebrows (y < 149) and side hair are never touched
      const cornerShrink = Math.round(nx * nx * 4);
      const ySearchTop = 150 + cornerShrink;
      const ySearchBot = 176 - cornerShrink;

      let fY = -1;
      let lY = -1;

      for (let y = ySearchTop; y <= ySearchBot; y++) {
        const idx = (y * CELL_SIZE + x) * 4;
        const r = cellData[idx];
        const g = cellData[idx + 1];
        const b = cellData[idx + 2];
        const a = cellData[idx + 3];
        if (a < 180) continue;

        const lum = r * 0.299 + g * 0.587 + b * 0.114;

        // Protect outer dark hair outline at |nx| > 0.82 if it spans the entire column
        if (Math.abs(nx) > 0.84 && y === ySearchTop && lum < 130) {
          const aboveIdx = ((ySearchTop - 3) * CELL_SIZE + x) * 4;
          const aboveLum =
            cellData[aboveIdx] * 0.299 +
            cellData[aboveIdx + 1] * 0.587 +
            cellData[aboveIdx + 2] * 0.114;
          if (aboveLum < 135) {
            // Continuous vertical dark hair strand at temple — skip this outer column
            fY = -1;
            break;
          }
        }

        const isDarkLashOrPupil = lum < 176 || (r < 212 && g < 192);
        const isVioletIris = b > g + 5 && (r < 236 || g < 216);
        const isScleraAfterLash =
          fY !== -1 && y <= 173 && r > 232 && g > 230 && b > 234 && r - b < 9;

        if (fY === -1) {
          if (isDarkLashOrPupil || isVioletIris) {
            fY = y;
            lY = y;
          }
        } else if (isDarkLashOrPupil || isVioletIris || isScleraAfterLash) {
          lY = y;
        }
      }

      firstDarkYArr[i] = fY;
      lastEyeYArr[i] = lY;

      if (fY !== -1 && lY !== -1 && Math.abs(nx) < 0.48) {
        sumTopY += fY;
        sumBotY += lY;
        centerCount++;
      }

      // Sample lower-eyelid / upper-cheek skin right below the eye in this column
      const sampleBotY = lY !== -1 ? Math.min(182, lY + 3) : 178;
      const sampleBotY2 = Math.min(183, sampleBotY + 1);
      const bIdx1 = (sampleBotY * CELL_SIZE + x) * 4;
      const bIdx2 = (sampleBotY2 * CELL_SIZE + x) * 4;
      let br = (cellData[bIdx1] + cellData[bIdx2]) * 0.5;
      let bg = (cellData[bIdx1 + 1] + cellData[bIdx2 + 1]) * 0.5;
      let bb = (cellData[bIdx1 + 2] + cellData[bIdx2 + 2]) * 0.5;

      // Fallback if sample hit a dark hair tip
      if (bg < 170 || br < 205) {
        br = 253;
        bg = 236;
        bb = 229;
      }
      botSkinR[i] = br;
      botSkinG[i] = bg;
      botSkinB[i] = bb;

      // Sample upper-eyelid skin above firstDarkY (if not covered by white hair bang)
      const sampleTopY = fY !== -1 ? Math.max(147, fY - 2) : 151;
      const tIdx = (sampleTopY * CELL_SIZE + x) * 4;
      const tr = cellData[tIdx];
      const tg = cellData[tIdx + 1];
      const tb = cellData[tIdx + 2];
      if (tr > 224 && tg > 190 && tr > tb + 4) {
        topSkinR[i] = tr;
        topSkinG[i] = tg;
        topSkinB[i] = tb;
      } else {
        topSkinR[i] = Math.min(255, br + 2);
        topSkinG[i] = Math.min(255, bg + 3);
        topSkinB[i] = Math.min(255, bb + 2);
      }
    }

    const avgTopY = centerCount > 0 ? sumTopY / centerCount : 153.5;
    const avgBotY = centerCount > 0 ? sumBotY / centerCount : 173.0;

    // Pass 2: Smoothly heal open-eye pixels above lowered eyelid and draw anti-aliased anime eyelash arch
    for (let i = 0; i < numCols; i++) {
      const fY = firstDarkYArr[i];
      const lY = lastEyeYArr[i];
      if (fY === -1 || lY === -1) continue;

      const x = xStart + i;
      const nx = (x - cx) / halfSpan;
      if (Math.abs(nx) >= 0.96) continue;

      // 3-tap horizontal smoothing of local skin tone so healed eyelid is airbrush-smooth
      const iPrev = Math.max(0, i - 1);
      const iNext = Math.min(numCols - 1, i + 1);
      const sTopR = (topSkinR[iPrev] + topSkinR[i] * 2 + topSkinR[iNext]) * 0.25;
      const sTopG = (topSkinG[iPrev] + topSkinG[i] * 2 + topSkinG[iNext]) * 0.25;
      const sTopB = (topSkinB[iPrev] + topSkinB[i] * 2 + topSkinB[iNext]) * 0.25;

      const sBotR = (botSkinR[iPrev] + botSkinR[i] * 2 + botSkinR[iNext]) * 0.25;
      const sBotG = (botSkinG[iPrev] + botSkinG[i] * 2 + botSkinG[iNext]) * 0.25;
      const sBotB = (botSkinB[iPrev] + botSkinB[i] * 2 + botSkinB[iNext]) * 0.25;

      // Smooth parabolic arch for open and closed eyelid positions
      const openArchY = avgTopY + 2.6 * nx * nx;
      const closedArchY = (avgBotY - 2.4) - 2.0 * (1 - nx * nx) + 1.1 * nx * nx;
      const lidY = openArchY + (closedArchY - openArchY) * smoothClose;

      const lashHalfW = (1.32 - 0.52 * nx * nx) * (0.72 + 0.36 * smoothClose);
      const yTopBound = Math.min(fY, Math.floor(openArchY));
      const yBotBound = Math.max(lY, Math.ceil(closedArchY + lashHalfW + 1));

      for (let y = yTopBound; y <= yBotBound; y++) {
        const idx = (y * CELL_SIZE + x) * 4;
        const origR = cellData[idx];
        const origG = cellData[idx + 1];
        const origB = cellData[idx + 2];

        // Preserve bright cool-white hair bangs hanging at the very top of the socket
        const isFrontBang =
          y < fY + 2 &&
          origR > 224 &&
          origG > 218 &&
          origB > 230 &&
          origB >= origG &&
          origR - origB < 5;
        if (isFrontBang) continue;

        const vFrac = clampParameter((y - yTopBound) / Math.max(1, yBotBound - yTopBound), 0, 1);
        let skinR = sTopR + (sBotR - sTopR) * vFrac;
        let skinG = sTopG + (sBotG - sTopG) * vFrac;
        let skinB = sTopB + (sBotB - sTopB) * vFrac;

        // Delicate upper eyelid crease line 2.2px above the lowered eyelash
        const creaseDist = Math.abs(y - (lidY - lashHalfW - 1.8));
        if (creaseDist < 0.95 && Math.abs(nx) < 0.72 && smoothClose > 0.25) {
          const creaseW = (1 - creaseDist / 0.95) * (1 - nx * nx) * 0.14 * smoothClose;
          skinR = skinR * (1 - creaseW) + 168 * creaseW;
          skinG = skinG * (1 - creaseW) + 118 * creaseW;
          skinB = skinB * (1 - creaseW) + 138 * creaseW;
        }

        const isFullyClosed = smoothClose >= 0.80;

        if (y <= lidY + lashHalfW + 0.85 || isFullyClosed) {
          // 1. Heal open eye pixel with local eyelid skin
          let outR = skinR;
          let outG = skinG;
          let outB = skinB;

          // 2. Superimpose anti-aliased dark plum-brown anime eyelash curve along lidY
          const distToLash = Math.abs(y - lidY);
          if (distToLash <= lashHalfW + 0.85 && Math.abs(nx) < 0.92) {
            const edgeFade = clampParameter((0.92 - Math.abs(nx)) / 0.16, 0, 1);
            const coreAlpha = clampParameter(
              1.0 - Math.max(0, distToLash - lashHalfW + 0.35) / 1.1,
              0,
              1
            );
            const lashAlpha = coreAlpha * edgeFade * clampParameter(smoothClose * 1.45, 0, 1);
            // Alisa's dark plum-violet eyelash ink: rgb(52, 33, 60)
            outR = outR * (1 - lashAlpha) + 52 * lashAlpha;
            outG = outG * (1 - lashAlpha) + 33 * lashAlpha;
            outB = outB * (1 - lashAlpha) + 60 * lashAlpha;
          }

          cellData[idx] = outR;
          cellData[idx + 1] = outG;
          cellData[idx + 2] = outB;
        } else if (y <= lidY + lashHalfW + 2.4) {
          // Partial blink / squint: cast a soft upper-eyelid shadow onto the top of the visible iris
          const shadowW =
            clampParameter(1.0 - (y - (lidY + lashHalfW)) / 2.4, 0, 1) * 0.22 * smoothClose;
          cellData[idx] = origR * (1 - shadowW) + 42 * shadowW;
          cellData[idx + 1] = origG * (1 - shadowW) + 28 * shadowW;
          cellData[idx + 2] = origB * (1 - shadowW) + 52 * shadowW;
        }
      }
    }
  };

  processSingleEye(true, eyeOpenL);
  processSingleEye(false, eyeOpenR);
}

/**
 * Seamless Per-Pixel Inverse Warp with Native HD Destination Support (334x334 -> dstSize x dstSize).
 * Completely eliminates Canvas 2D triangle clipping seams AND multi-pass bilinear blur while deforming:
 * 1) Head tilt (ParamAngleZ) & 2.5D turn (ParamAngleX/Y) around the neck pivot (0.50, 0.72) with grounded shoulders (v >= 0.86)
 * 2) Independent Left & Right Eyebrows (browLY, browRY, v in 0.365..0.445) via natural Gaussian arch
 * 3) Independent Left & Right Eye Blink/Squint (eyeOpenL, eyeOpenR), eyelid smile arch, iris gaze shift & warm cheek blush
 * 4) Edge-Steepened Hermite Sub-Pixel Resampling so dark anime line-art stays razor-sharp at 668x668 HD
 */
export function warpImageDataSeamless(
  srcData: Uint8ClampedArray,
  dstData: Uint8ClampedArray,
  params: Live2DParameterState,
  activeEmotion: EmotionPresetId,
  dstSize: number = CELL_SIZE,
  eyeOpenLOverride?: number,
  eyeOpenROverride?: number
) {
  const angleX = clampParameter(params.angleX, -30, 30);
  const angleY = clampParameter(params.angleY, -30, 30);
  const angleZ = clampParameter(params.angleZ, -30, 30);
  const browY = clampParameter(params.browY, -1, 1);
  const browLY = clampParameter(params.browLY ?? browY, -1, 1);
  const browRY = clampParameter(params.browRY ?? browY, -1, 1);
  const shoulderY = clampParameter(params.shoulderY, -1, 1);
  const eyeSmile = clampParameter(params.eyeSmile ?? 0.18, 0, 1);
  const gazeX = clampParameter(params.gazeX ?? 0, -1, 1);
  const gazeY = clampParameter(params.gazeY ?? 0, -1, 1);
  const cheekBlush = clampParameter(params.cheekBlush ?? 0.12, 0, 1);
  const mouthForm = clampParameter(params.mouthForm ?? 0.4, -1, 1);

  const eyeOpenL = clampParameter(eyeOpenLOverride ?? params.eyeOpenL ?? params.eyeOpen ?? 1.0, 0, 1.05);
  const eyeOpenR = clampParameter(eyeOpenROverride ?? params.eyeOpenR ?? params.eyeOpen ?? 1.0, 0, 1.05);

  const presetParams = EMOTION_PRESETS[activeEmotion]?.params ?? EMOTION_PRESETS.neutral.params;
  const presetBrow = presetParams.browY ?? 0;

  const computeEffectiveBrow = (rawVal: number) => {
    const delta = clampParameter(rawVal - presetBrow * 0.22, -1.0, 1.0);
    return delta > 0 ? Math.tanh(delta * 1.25) * 0.88 : Math.tanh(delta * 1.25) * 0.92;
  };

  const effectiveBrowL = computeEffectiveBrow(browLY);
  const effectiveBrowR = computeEffectiveBrow(browRY);
  const effectiveBrowAvg = (effectiveBrowL + effectiveBrowR) * 0.5;

  const presetSmile = presetParams.eyeSmile ?? 0.18;
  const deltaEyeSmile = clampParameter(eyeSmile - presetSmile, -0.5, 0.75);
  const presetBlush = presetParams.cheekBlush ?? 0.12;
  const extraBlush = Math.max(0, cheekBlush - presetBlush * 0.6);

  const canShiftGaze = activeEmotion !== 'joy' && activeEmotion !== 'laugh';
  const effGazeX = canShiftGaze ? clampParameter(gazeX + (angleX / 30) * 0.30, -1, 1) : 0;
  const effGazeY = canShiftGaze ? clampParameter(gazeY + (angleY / 30) * 0.22, -1, 1) : 0;

  const presetForm = presetParams.mouthForm ?? 0.4;
  const deltaMouthForm = clampParameter(mouthForm - presetForm, -0.9, 0.9);

  const pivotU = 0.50;
  const pivotV = 0.72;
  const maxTheta = (angleZ * 0.68 * Math.PI) / 180;
  const invDstScale = 1 / dstSize;

  for (let y = 0; y < dstSize; y++) {
    const v = (y + 0.5) * invDstScale;

    // 1. Quintic smoothstep head weight: 1.0 above neck (v <= 0.65), 0.0 at grounded shoulders (v >= 0.86)
    let headWeight = 0;
    if (v <= 0.65) {
      headWeight = 1.0;
    } else if (v < 0.86) {
      const t = (0.86 - v) / (0.86 - 0.65);
      headWeight = t * t * t * (t * (t * 6 - 15) + 10);
    }

    const theta = -maxTheta * headWeight;
    const cosZ = Math.cos(theta);
    const sinZ = Math.sin(theta);

    // Breathing weight for this scanline
    let bWeight = 0;
    if (v > 0.68 && v < 0.98) {
      const bNorm = Math.sin(((v - 0.68) / 0.30) * Math.PI);
      bWeight = bNorm * bNorm;
    }

    // Subtle secondary hair curl pendulum sway on lower curls (0.50 < v < 0.84)
    let hairSwayWeight = 0;
    if (v > 0.50 && v < 0.84) {
      const hT = (v - 0.50) / 0.34;
      hairSwayWeight = Math.sin(hT * Math.PI);
    }

    const rowOffset = y * dstSize * 4;

    for (let x = 0; x < dstSize; x++) {
      const u = (x + 0.5) * invDstScale;

      // Undo breathing displacement first
      let u0 = u - (u - 0.5) * shoulderY * 0.0055 * bWeight;
      let v0 = v + shoulderY * 0.0052 * bWeight;

      // Undo subtle secondary hair-curl sway on outer side locks (|u - 0.5| > 0.16)
      const outerDist = Math.abs(u0 - 0.5);
      if (hairSwayWeight > 0.01 && outerDist > 0.16) {
        const curlLatW = Math.min(1, (outerDist - 0.16) / 0.12);
        const curlShiftU =
          ((angleZ / 30) * 0.0042 + (angleX / 30) * 0.0030) * hairSwayWeight * curlLatW;
        u0 -= curlShiftU;
      }

      // Undo 2.5D head parallax & neck-pivot rotation
      const radial2 = (u0 - 0.5) * (u0 - 0.5) + (v0 - 0.48) * (v0 - 0.48);
      const faceCenterWeight = Math.max(0, 1 - radial2 * 4.8);
      const turnShiftU = (angleX / 30) * 0.020 * headWeight * (0.64 + 0.36 * faceCenterWeight);
      const pitchShiftV = (-angleY / 30) * 0.015 * headWeight * (0.64 + 0.36 * faceCenterWeight);

      const du = u0 - turnShiftU - pivotU;
      const dv = v0 - pitchShiftV - pivotV;

      let srcU = pivotU + du * cosZ - dv * sinZ;
      let srcV = pivotV + du * sinZ + dv * cosZ;

      // 2. Responsive Independent Left & Right Eyebrow Mimicry (srcV in 0.365..0.445)
      if (
        srcV > 0.365 &&
        srcV < 0.445 &&
        (Math.abs(effectiveBrowL) > 0.002 || Math.abs(effectiveBrowR) > 0.002)
      ) {
        const vNorm =
          srcV < 0.405
            ? (srcV - 0.365) / (0.405 - 0.365)
            : (0.445 - srcV) / (0.445 - 0.405);
        const vBell = Math.sin(Math.max(0, Math.min(1, vNorm)) * (Math.PI / 2));
        const vW = vBell * vBell;

        const dxL = (srcU - 0.392) / 0.052;
        const dxR = (srcU - 0.608) / 0.052;
        const wL = Math.abs(dxL) < 1 ? (1 - dxL * dxL) * (1 - dxL * dxL) : 0;
        const wR = Math.abs(dxR) < 1 ? (1 - dxR * dxR) * (1 - dxR * dxR) : 0;

        if (wL + wR > 0.001) {
          const probeX = Math.max(0, Math.min(CELL_SIZE - 1, (srcU * CELL_SIZE) | 0));
          const probeY = Math.max(0, Math.min(CELL_SIZE - 1, (srcV * CELL_SIZE) | 0));
          const pIdx = (probeY * CELL_SIZE + probeX) * 4;
          const pR = srcData[pIdx];
          const pG = srcData[pIdx + 1];
          const pB = srcData[pIdx + 2];
          const isWhiteHairBang = pR > 228 && pG > 222 && pB > 232 && pB >= pG;
          const bangMask = isWhiteHairBang ? 0.62 : 1.0;

          const innerTiltL = 1 + (srcU - 0.392) * 3.4;
          const innerTiltR = 1 + (0.608 - srcU) * 3.4;

          const browShiftV =
            -0.0155 * vW * bangMask * (effectiveBrowL * wL * innerTiltL + effectiveBrowR * wR * innerTiltR);
          const browPinchU =
            effectiveBrowAvg < 0
              ? Math.abs(effectiveBrowAvg) * 0.0032 * vW * bangMask * (wL - wR)
              : 0;

          srcV -= browShiftV;
          srcU -= browPinchU;
        }
      }

      // 3. Eye & Iris Gaze Mimicry
      //    3a. Iris-Only Gaze Tracking (inside circular iris sockets (0.395, 0.500) & (0.605, 0.500))
      if (
        canShiftGaze &&
        srcV > 0.474 &&
        srcV < 0.526 &&
        (Math.abs(effGazeX) > 0.01 || Math.abs(effGazeY) > 0.01)
      ) {
        const dyIris = (srcV - 0.500) / 0.025;
        if (Math.abs(dyIris) < 1) {
          const dxIrisL = (srcU - 0.395) / 0.027;
          const dxIrisR = (srcU - 0.605) / 0.027;
          const r2L = dxIrisL * dxIrisL + dyIris * dyIris;
          const r2R = dxIrisR * dxIrisR + dyIris * dyIris;
          const wIrisL = r2L < 1 && eyeOpenL > 0.35 ? (1 - r2L) * (1 - r2L) : 0;
          const wIrisR = r2R < 1 && eyeOpenR > 0.35 ? (1 - r2R) * (1 - r2R) : 0;
          const irisW = wIrisL + wIrisR;
          if (irisW > 0.001) {
            srcU -= effGazeX * 0.0068 * irisW;
            srcV += effGazeY * 0.0048 * irisW;
          }
        }
      }

      //    3b. Happy Lower-Eyelid Arch (eyeSmile)
      if (Math.abs(deltaEyeSmile) > 0.01 && srcV > 0.518 && srcV < 0.560) {
        const exL = (srcU - 0.394) / 0.048;
        const exR = (srcU - 0.606) / 0.048;
        const ewL = Math.abs(exL) < 1 ? (1 - exL * exL) * (1 - exL * exL) : 0;
        const ewR = Math.abs(exR) < 1 ? (1 - exR * exR) * (1 - exR * exR) : 0;
        const eyeW = ewL + ewR;
        if (eyeW > 0.001) {
          const lidT = (srcV - 0.518) / (0.560 - 0.518);
          const lidBell = Math.sin(lidT * Math.PI);
          srcV += deltaEyeSmile * 0.0045 * lidBell * eyeW;
        }
      }

      // 4. Expressive Mouth-Corner Mimicry (lifts/lowers outer lip corners at u = 0.460 / 0.540, v = 0.592..0.652)
      if (Math.abs(deltaMouthForm) > 0.015 && srcV > 0.592 && srcV < 0.652) {
        const vM = (srcV - 0.592) / (0.652 - 0.592);
        const vMBell = Math.sin(vM * Math.PI);
        const mcL = (srcU - 0.460) / 0.032;
        const mcR = (srcU - 0.540) / 0.032;
        const mwL = Math.abs(mcL) < 1 ? (1 - mcL * mcL) * (1 - mcL * mcL) : 0;
        const mwR = Math.abs(mcR) < 1 ? (1 - mcR * mcR) * (1 - mcR * mcR) : 0;
        const cornerW = (mwL + mwR) * vMBell;
        if (cornerW > 0.001) {
          srcV += deltaMouthForm * 0.0058 * cornerW;
          srcU -= deltaMouthForm * 0.0032 * (mwR - mwL) * vMBell;
        }
      }

      const sx = srcU * CELL_SIZE - 0.5;
      let sy = srcV * CELL_SIZE - 0.5;
      const dstIdx = rowOffset + x * 4;

      if (sy >= CELL_SIZE - 2.5 && sy < CELL_SIZE + 6 && v > 0.88) {
        sy = CELL_SIZE - 2.5;
      }

      if (sx < 2 || sx >= CELL_SIZE - 2 || sy < 2 || sy >= CELL_SIZE - 1) {
        dstData[dstIdx] = 0;
        dstData[dstIdx + 1] = 0;
        dstData[dstIdx + 2] = 0;
        dstData[dstIdx + 3] = 0;
        continue;
      }

      const x0 = sx | 0;
      const y0 = sy | 0;
      const rawFx = sx - x0;
      const rawFy = sy - y0;

      const i00 = (y0 * CELL_SIZE + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + CELL_SIZE * 4;
      const i11 = i01 + 4;

      // Edge-Aware Sharp Hermite Sub-Pixel Weights:
      // Steepens sub-pixel transition across high-contrast anime ink lines so 668x668 stays razor-sharp
      const g00 = srcData[i00 + 1];
      const g11 = srcData[i11 + 1];
      const isInkEdge = Math.abs(g00 - g11) > 28;
      const fx = isInkEdge ? rawFx * rawFx * (3 - 2 * rawFx) : rawFx;
      const fy = isInkEdge ? rawFy * rawFy * (3 - 2 * rawFy) : rawFy;

      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const a00 = srcData[i00 + 3] * w00;
      const a10 = srcData[i10 + 3] * w10;
      const a01 = srcData[i01 + 3] * w01;
      const a11 = srcData[i11 + 3] * w11;
      const outA = a00 + a10 + a01 + a11;

      if (outA < 0.5) {
        dstData[dstIdx] = 0;
        dstData[dstIdx + 1] = 0;
        dstData[dstIdx + 2] = 0;
        dstData[dstIdx + 3] = 0;
      } else {
        const invA = 1 / outA;
        let r =
          (srcData[i00] * a00 +
            srcData[i10] * a10 +
            srcData[i01] * a01 +
            srcData[i11] * a11) *
          invA;
        let g =
          (srcData[i00 + 1] * a00 +
            srcData[i10 + 1] * a10 +
            srcData[i01 + 1] * a01 +
            srcData[i11 + 1] * a11) *
          invA;
        let b =
          (srcData[i00 + 2] * a00 +
            srcData[i10 + 2] * a10 +
            srcData[i01 + 2] * a01 +
            srcData[i11 + 2] * a11) *
          invA;

        // 5. Dynamic Warm Cheek Blush Overlay on skin pixels around cheeks (0.345, 0.562) & (0.655, 0.562)
        if (extraBlush > 0.02 && srcV > 0.525 && srcV < 0.615 && r > 225 && g > 195 && r > b) {
          const dCheekL =
            (srcU - 0.345) * (srcU - 0.345) * 165 + (srcV - 0.562) * (srcV - 0.562) * 380;
          const dCheekR =
            (srcU - 0.655) * (srcU - 0.655) * 165 + (srcV - 0.562) * (srcV - 0.562) * 380;
          const dMin = Math.min(dCheekL, dCheekR);
          if (dMin < 1.0) {
            const blushW = (1 - dMin) * (1 - dMin) * extraBlush * 0.28;
            r = r * (1 - blushW * 0.14) + 250 * (blushW * 0.14);
            g = g * (1 - blushW * 0.82) + 148 * (blushW * 0.82);
            b = b * (1 - blushW * 0.62) + 170 * (blushW * 0.62);
          }
        }

        // 6. Living Eye Specular Highlight Glint (only on open eyes)
        if (canShiftGaze && srcV > 0.478 && srcV < 0.504) {
          const isLeftEyeOpen = srcU < 0.5 ? eyeOpenL > 0.48 : eyeOpenR > 0.48;
          if (isLeftEyeOpen) {
            const glintOffsetU = effGazeX * 0.0022;
            const glintOffsetV = -effGazeY * 0.0018;
            const dgL =
              (srcU - (0.384 + glintOffsetU)) * (srcU - (0.384 + glintOffsetU)) * 9500 +
              (srcV - (0.489 + glintOffsetV)) * (srcV - (0.489 + glintOffsetV)) * 9500;
            const dgR =
              (srcU - (0.594 + glintOffsetU)) * (srcU - (0.594 + glintOffsetU)) * 9500 +
              (srcV - (0.489 + glintOffsetV)) * (srcV - (0.489 + glintOffsetV)) * 9500;
            const dgMin = Math.min(dgL, dgR);
            if (dgMin < 1.0 && b > 140) {
              const glintW = (1 - dgMin) * (1 - dgMin) * 0.42;
              r = r + (255 - r) * glintW;
              g = g + (255 - g) * glintW;
              b = b + (255 - b) * glintW;
            }
          }
        }

        dstData[dstIdx] = r;
        dstData[dstIdx + 1] = g;
        dstData[dstIdx + 2] = b;
        dstData[dstIdx + 3] = outA;
      }
    }
  }
}

export const Live2DPrototypeRig: React.FC<Live2DPrototypeRigProps> = ({
  concept,
  externalAssistantState,
  externalSpeechCommand
}) => {
  const [params, setParams] = useState<Live2DParameterState>({
    angleX: 0,
    angleY: 0,
    angleZ: 0,
    eyeOpen: 1.0,
    eyeSmile: 0.18,
    mouthOpenY: 0.05,
    mouthForm: 0.4,
    browY: 0,
    breath: 0.5,
    shoulderY: 0,
    gazeX: 0,
    gazeY: 0,
    cheekBlush: 0.12,
    handGesture: 'none'
  });
  const [activeEmotion, setActiveEmotion] = useState<EmotionPresetId>('neutral');
  const [activeVowel, setActiveVowel] = useState<AnimeVisemeKey>('SILENT');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [secondarySlideIndex, setSecondarySlideIndex] = useState<number>(0);
  const [slideBlendWeight, setSlideBlendWeight] = useState<number>(0);
  const [jawDeform, setJawDeform] = useState<{ scaleX: number; scaleY: number }>({ scaleX: 1, scaleY: 1 });

  const [activeAssistantState, setActiveAssistantState] = useState<AssistantStateId>('IDLE');
  const [overlayBgMode, setOverlayBgMode] = useState<OverlayBgMode>('alpha_dark');

  const [customPhrase, setCustomPhrase] = useState<string>(
    'Привет! Как прошёл твой день? Посмотри на мою чёткую нижнюю губу, 48 плавных слайдов рта и живую естественную мимику!'
  );
  const [isPhrasePlaying, setIsPhrasePlaying] = useState<boolean>(false);
  const [activeCharIdx, setActiveCharIdx] = useState<number>(-1);
  const [phraseProgress, setPhraseProgress] = useState<number>(0);

  const [isSpeakingDemo, setIsSpeakingDemo] = useState<boolean>(false);
  const [isMouthOverrideActive, setIsMouthOverrideActive] = useState<boolean>(false);
  const [isBlinkingClosed, setIsBlinkingClosed] = useState<boolean>(false);
  const [isAutoIdleActive, setIsAutoIdleActive] = useState<boolean>(false);
  const [showDeformerGrid, setShowDeformerGrid] = useState<boolean>(false);
  const [showPhysicsVectors, setShowPhysicsVectors] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const warpedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const warpedImageDataRef = useRef<ImageData | null>(null);

  const imagesRef = useRef<{
    expressions: HTMLCanvasElement | HTMLImageElement | null;
    mouthless: HTMLCanvasElement | HTMLImageElement | null;
    visemes48: HTMLCanvasElement | HTMLImageElement | null;
    blink: HTMLCanvasElement | HTMLImageElement | null;
    loadedCount: number;
  }>({
    expressions: null,
    mouthless: null,
    visemes48: null,
    blink: null,
    loadedCount: 0
  });

  const targetParamsRef = useRef<Live2DParameterState>(params);
  const smoothedParamsRef = useRef<Live2DParameterState>({ ...params });
  const renderStateRef = useRef({
    activeEmotion,
    isMouthOverrideActive,
    isBlinkingClosed,
    activeSlideIndex,
    secondarySlideIndex,
    slideBlendWeight,
    jawDeform,
    showDeformerGrid
  });

  const phraseRafRef = useRef<number | null>(null);
  const renderRafRef = useRef<number | null>(null);
  const blinkTimeoutRef = useRef<number | null>(null);
  const autoIdleIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    targetParamsRef.current = params;
  }, [params]);

  useEffect(() => {
    renderStateRef.current = {
      activeEmotion,
      isMouthOverrideActive,
      isBlinkingClosed,
      activeSlideIndex,
      secondarySlideIndex,
      slideBlendWeight,
      jawDeform,
      showDeformerGrid
    };
  }, [
    activeEmotion,
    isMouthOverrideActive,
    isBlinkingClosed,
    activeSlideIndex,
    secondarySlideIndex,
    slideBlendWeight,
    jawDeform,
    showDeformerGrid
  ]);

  const stopActiveAnimations = () => {
    if (phraseRafRef.current) {
      window.cancelAnimationFrame(phraseRafRef.current);
      phraseRafRef.current = null;
    }
    setIsPhrasePlaying(false);
    setIsSpeakingDemo(false);
    setActiveCharIdx(-1);
    setPhraseProgress(0);
    setSlideBlendWeight(0);
    setJawDeform({ scaleX: 1, scaleY: 1 });
  };

  useEffect(() => {
    const offscreen = document.createElement('canvas');
    offscreen.width = CELL_SIZE;
    offscreen.height = CELL_SIZE;
    offscreenCanvasRef.current = offscreen;

    const warpedCanvas = document.createElement('canvas');
    warpedCanvas.width = CANVAS_INTERNAL_SIZE;
    warpedCanvas.height = CANVAS_INTERNAL_SIZE;
    warpedCanvasRef.current = warpedCanvas;
    const wCtx = warpedCanvas.getContext('2d');
    if (wCtx) {
      warpedImageDataRef.current = wCtx.createImageData(
        CANVAS_INTERNAL_SIZE,
        CANVAS_INTERNAL_SIZE
      );
    }

    const loadImg = (
      url: string,
      key: 'expressions' | 'mouthless' | 'visemes48' | 'blink',
      sharpness = 0.72
    ) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        try {
          imagesRef.current[key] = enhanceAnimeSpriteSheet(img, sharpness);
        } catch {
          imagesRef.current[key] = img;
        }
        imagesRef.current.loadedCount += 1;
      };
      img.src = url;
    };

    loadImg(EXPRESSIONS_CUTOUT_URL, 'expressions', 0.75);
    loadImg(EXPRESSIONS_MOUTHLESS_CUTOUT_URL, 'mouthless', 0.75);
    loadImg(VISEMES_48_CUTOUT_URL, 'visemes48', 0.65);
    loadImg(BLINK_CLOSED_EYES_URL, 'blink', 0.70);

    let lastTime = performance.now();

    const renderLoop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      // Exponential smoothing (~65ms time constant) so sliders, emotions, and speech never snap
      const alphaPose = 1 - Math.exp(-dt * 15);
      const alphaMouth = 1 - Math.exp(-dt * 24);
      const tgt = targetParamsRef.current;
      const cur = smoothedParamsRef.current;
      const alphaBlink = 1 - Math.exp(-dt * 28);

      cur.angleX += (tgt.angleX - cur.angleX) * alphaPose;
      cur.angleY += (tgt.angleY - cur.angleY) * alphaPose;
      cur.angleZ += (tgt.angleZ - cur.angleZ) * alphaPose;
      cur.browY += (tgt.browY - cur.browY) * alphaPose;
      cur.shoulderY += (tgt.shoulderY - cur.shoulderY) * alphaPose;
      cur.mouthOpenY += (tgt.mouthOpenY - cur.mouthOpenY) * alphaMouth;
      cur.mouthForm += (tgt.mouthForm - cur.mouthForm) * alphaMouth;
      cur.eyeSmile = (cur.eyeSmile ?? 0.18) + ((tgt.eyeSmile ?? 0.18) - (cur.eyeSmile ?? 0.18)) * alphaPose;
      cur.gazeX = (cur.gazeX ?? 0) + ((tgt.gazeX ?? 0) - (cur.gazeX ?? 0)) * alphaPose;
      cur.gazeY = (cur.gazeY ?? 0) + ((tgt.gazeY ?? 0) - (cur.gazeY ?? 0)) * alphaPose;
      cur.cheekBlush = (cur.cheekBlush ?? 0.12) + ((tgt.cheekBlush ?? 0.12) - (cur.cheekBlush ?? 0.12)) * alphaPose;
      const desiredEyeOpen = renderStateRef.current.isBlinkingClosed ? 0.0 : (tgt.eyeOpen ?? 1.0);
      cur.eyeOpen = (cur.eyeOpen ?? 1.0) + (desiredEyeOpen - (cur.eyeOpen ?? 1.0)) * alphaBlink;

      const canvas = canvasRef.current;
      const offCanvas = offscreenCanvasRef.current;
      const warpCanvas = warpedCanvasRef.current;
      const warpImgData = warpedImageDataRef.current;
      const imgs = imagesRef.current;

      if (canvas && offCanvas && warpCanvas && warpImgData && imgs.expressions && imgs.mouthless) {
        const ctx = canvas.getContext('2d');
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
        const warpCtx = warpCanvas.getContext('2d');
        if (ctx && offCtx && warpCtx) {
          const st = renderStateRef.current;
          const spriteSpec = EXPRESSION_SPRITE_MAP[st.activeEmotion];
          const srcX = spriteSpec.col * CELL_SIZE;
          const srcY = spriteSpec.row * CELL_SIZE;

          // Step 1: Composite clean 334x334 cell on offscreen canvas
          offCtx.clearRect(0, 0, CELL_SIZE, CELL_SIZE);
          const baseSheet = st.isMouthOverrideActive ? imgs.mouthless : imgs.expressions;
          offCtx.drawImage(baseSheet, srcX, srcY, CELL_SIZE, CELL_SIZE, 0, 0, CELL_SIZE, CELL_SIZE);

          // Composite 48-slide cut-out viseme with smooth dual-slide crossfade
          if (st.isMouthOverrideActive && imgs.visemes48) {
            offCtx.save();
            offCtx.translate(167, 211);
            offCtx.scale(st.jawDeform.scaleX, st.jawDeform.scaleY);
            offCtx.translate(-167, -211);

            const pIdx = Math.max(0, Math.min(47, st.activeSlideIndex));
            const sIdx = Math.max(0, Math.min(47, st.secondarySlideIndex));
            const blend = Math.max(0, Math.min(1, st.slideBlendWeight));

            offCtx.globalAlpha = 1;
            offCtx.drawImage(
              imgs.visemes48,
              pIdx * CELL_SIZE,
              0,
              CELL_SIZE,
              CELL_SIZE,
              0,
              0,
              CELL_SIZE,
              CELL_SIZE
            );

            if (sIdx !== pIdx && blend > 0.01) {
              offCtx.globalAlpha = blend;
              offCtx.drawImage(
                imgs.visemes48,
                sIdx * CELL_SIZE,
                0,
                CELL_SIZE,
                CELL_SIZE,
                0,
                0,
                CELL_SIZE,
                CELL_SIZE
              );
            }
            offCtx.restore();
          }

          // Step 2: Apply Self-Skin-Adaptive Eyelid Closure & Render onto HiDPI 668x668 Canvas via Single-Pass Seamless Warp
          ctx.clearRect(0, 0, CANVAS_INTERNAL_SIZE, CANVAS_INTERNAL_SIZE);
          const srcImgData = offCtx.getImageData(0, 0, CELL_SIZE, CELL_SIZE);
          applySeamlessEyelidRig(
            srcImgData.data,
            cur.eyeOpenL ?? cur.eyeOpen ?? 1.0,
            cur.eyeOpenR ?? cur.eyeOpen ?? 1.0,
            st.activeEmotion
          );
          warpImageDataSeamless(
            srcImgData.data,
            warpImgData.data,
            cur,
            st.activeEmotion,
            CANVAS_INTERNAL_SIZE
          );
          warpCtx.putImageData(warpImgData, 0, 0);
          ctx.drawImage(warpCanvas, 0, 0);

          // Optional Live2D ArtMesh Wireframe Overlay
          if (st.showDeformerGrid) {
            const N = MESH_GRID_DIVS;
            const dstPts: { x: number; y: number }[][] = [];
            for (let gy = 0; gy <= N; gy++) {
              const rowDst: { x: number; y: number }[] = [];
              const vNorm = gy / N;
              for (let gx = 0; gx <= N; gx++) {
                const uNorm = gx / N;
                rowDst.push(
                  computeMeshVertexDeformation(
                    uNorm,
                    vNorm,
                    cur,
                    st.activeEmotion,
                    CANVAS_INTERNAL_SIZE
                  )
                );
              }
              dstPts.push(rowDst);
            }

            ctx.save();
            ctx.strokeStyle = 'rgba(167, 139, 250, 0.48)';
            ctx.lineWidth = 1.2;
            for (let gy = 0; gy <= N; gy++) {
              ctx.beginPath();
              for (let gx = 0; gx <= N; gx++) {
                const p = dstPts[gy][gx];
                if (gx === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
              }
              ctx.stroke();
            }
            for (let gx = 0; gx <= N; gx++) {
              ctx.beginPath();
              for (let gy = 0; gy <= N; gy++) {
                const p = dstPts[gy][gx];
                if (gy === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
              }
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }

      renderRafRef.current = window.requestAnimationFrame(renderLoop);
    };

    renderRafRef.current = window.requestAnimationFrame(renderLoop);

    return () => {
      stopActiveAnimations();
      if (renderRafRef.current) window.cancelAnimationFrame(renderRafRef.current);
      if (blinkTimeoutRef.current) window.clearTimeout(blinkTimeoutRef.current);
      if (autoIdleIntervalRef.current) window.clearInterval(autoIdleIntervalRef.current);
    };
  }, []);

  const triggerSingleBlink = () => {
    if (blinkTimeoutRef.current) {
      window.clearTimeout(blinkTimeoutRef.current);
    }
    setIsBlinkingClosed(true);
    setParams((p) => ({ ...p, eyeOpen: 0.0 }));
    blinkTimeoutRef.current = window.setTimeout(() => {
      setIsBlinkingClosed(false);
      setParams((p) => ({ ...p, eyeOpen: 1.0 }));
    }, 150);
  };

  useEffect(() => {
    if (!isAutoIdleActive) {
      if (autoIdleIntervalRef.current) {
        window.clearInterval(autoIdleIntervalRef.current);
        autoIdleIntervalRef.current = null;
      }
      setIsBlinkingClosed(false);
      return;
    }

    let tick = 0;
    autoIdleIntervalRef.current = window.setInterval(() => {
      tick += 1;
      const breathPhase = Math.sin(tick * 0.3);
      const baseBrow = EMOTION_PRESETS[activeEmotion].params.browY ?? 0;
      const baseSmile = EMOTION_PRESETS[activeEmotion].params.eyeSmile ?? 0.18;
      setParams((prev) => ({
        ...prev,
        shoulderY: Number((breathPhase * 0.14).toFixed(2)),
        angleZ: Number((Math.sin(tick * 0.18) * 3.0).toFixed(1)),
        browY: Number((baseBrow + Math.cos(tick * 0.22) * 0.06).toFixed(2)),
        eyeSmile: Number(clampParameter(baseSmile + Math.sin(tick * 0.25) * 0.08, 0, 0.95).toFixed(2)),
        gazeX: Number((Math.sin(tick * 0.35) * 0.22).toFixed(2)),
        gazeY: Number((Math.cos(tick * 0.28) * 0.14).toFixed(2))
      }));
      if (tick % 15 === 0) {
        triggerSingleBlink();
      }
    }, 200);

    return () => {
      if (autoIdleIntervalRef.current) {
        window.clearInterval(autoIdleIntervalRef.current);
        autoIdleIntervalRef.current = null;
      }
    };
  }, [isAutoIdleActive, activeEmotion]);

  const applyEmotion = (emotionId: EmotionPresetId) => {
    stopActiveAnimations();
    setActiveEmotion(emotionId);
    setIsMouthOverrideActive(false);
    setIsBlinkingClosed(false);
    const preset = EMOTION_PRESETS[emotionId];
    setParams((prev) => ({
      ...prev,
      ...preset.params,
      angleX: prev.angleX,
      angleY: prev.angleY,
      angleZ: prev.angleZ,
      browY: preset.params.browY ?? 0,
      eyeSmile: preset.params.eyeSmile ?? 0.18,
      gazeX: preset.params.gazeX ?? 0,
      gazeY: preset.params.gazeY ?? 0,
      cheekBlush: preset.params.cheekBlush ?? 0.12,
      handGesture: 'none'
    }));
  };

  const applySlideDirectly = (slideIdx: number) => {
    stopActiveAnimations();
    const spec = CUTOUT_VISEME_SLIDES_48[slideIdx] ?? CUTOUT_VISEME_SLIDES_48[0];
    setActiveSlideIndex(spec.index);
    setSecondarySlideIndex(spec.index);
    setSlideBlendWeight(0);
    setActiveVowel(spec.mappedViseme);
    setIsMouthOverrideActive(true);
    setJawDeform({
      scaleX: Number((1 + spec.form * 0.022).toFixed(3)),
      scaleY: Number((0.98 + spec.openY * 0.04).toFixed(3))
    });
    setParams((prev) => ({
      ...prev,
      mouthOpenY: spec.openY,
      mouthForm: spec.form
    }));
  };

  const applyVowel = (vowelKey: AnimeVisemeKey) => {
    const slideIdx = BASE_VISEME_TO_SLIDE_INDEX[vowelKey] ?? 0;
    applySlideDirectly(slideIdx);
  };

  const playSilentPhrasePerformance = (phraseText: string, isDemoButton = false) => {
    stopActiveAnimations();
    const compiled = compilePhraseToSilentPerformance(phraseText, activeEmotion);
    setActiveEmotion(compiled.detectedEmotion);
    setIsMouthOverrideActive(true);
    setIsPhrasePlaying(true);
    if (isDemoButton) {
      setIsSpeakingDemo(true);
    }

    const startTime = performance.now();
    let lastBlinkAt = 0;

    const stepFrame = (now: number) => {
      const elapsed = now - startTime;
      const sample = samplePerformanceAtTime(compiled, elapsed);
      const slideSpec = CUTOUT_VISEME_SLIDES_48[sample.primarySlideIndex] ?? CUTOUT_VISEME_SLIDES_48[0];

      setActiveSlideIndex(sample.primarySlideIndex);
      setSecondarySlideIndex(sample.secondarySlideIndex);
      setSlideBlendWeight(sample.slideBlend);
      setActiveVowel(slideSpec.mappedViseme);
      setActiveCharIdx(sample.charIndex);
      setPhraseProgress(sample.progress);
      setJawDeform({ scaleX: sample.jawScaleX, scaleY: sample.jawScaleY });

      setParams((prev) => ({
        ...prev,
        angleX: sample.angleX,
        angleY: sample.angleY,
        angleZ: sample.angleZ,
        browY: sample.browY,
        shoulderY: sample.shoulderY,
        mouthOpenY: sample.mouthOpenY,
        mouthForm: sample.mouthForm,
        eyeOpen: sample.eyeOpen,
        eyeSmile: sample.eyeSmile,
        gazeX: sample.gazeX,
        gazeY: sample.gazeY,
        cheekBlush: sample.cheekBlush
      }));

      if (elapsed - lastBlinkAt > 2400 && elapsed < compiled.totalDurationMs - 300) {
        lastBlinkAt = elapsed;
        triggerSingleBlink();
      }

      if (elapsed < compiled.totalDurationMs) {
        phraseRafRef.current = window.requestAnimationFrame(stepFrame);
      } else {
        phraseRafRef.current = null;
        setIsPhrasePlaying(false);
        setIsSpeakingDemo(false);
        setIsMouthOverrideActive(false);
        setActiveSlideIndex(0);
        setSecondarySlideIndex(0);
        setSlideBlendWeight(0);
        setActiveVowel('SILENT');
        setActiveCharIdx(-1);
        setPhraseProgress(0);
        setJawDeform({ scaleX: 1, scaleY: 1 });
        const endPreset = EMOTION_PRESETS[compiled.detectedEmotion].params;
        setParams((prev) => ({
          ...prev,
          angleX: 0,
          angleY: 0,
          angleZ: 0,
          shoulderY: 0,
          browY: endPreset.browY ?? 0,
          mouthOpenY: endPreset.mouthOpenY ?? 0.05,
          mouthForm: endPreset.mouthForm ?? 0.4,
          eyeOpen: endPreset.eyeOpen ?? 1.0,
          eyeSmile: endPreset.eyeSmile ?? 0.18,
          gazeX: 0,
          gazeY: 0,
          cheekBlush: endPreset.cheekBlush ?? 0.12,
          handGesture: 'none'
        }));
      }
    };

    phraseRafRef.current = window.requestAnimationFrame(stepFrame);
  };

  const toggleSpeechSimulation = () => {
    if (isSpeakingDemo || isPhrasePlaying) {
      stopActiveAnimations();
      setIsMouthOverrideActive(false);
      setActiveVowel('SILENT');
      return;
    }
    playSilentPhrasePerformance(customPhrase, true);
  };

  const applyAssistantState = (stateId: AssistantStateId) => {
    stopActiveAnimations();
    setActiveAssistantState(stateId);
    const spec = STAGE4_ASSISTANT_STATES.find((s) => s.id === stateId);
    if (!spec) return;

    setIsMouthOverrideActive(false);
    setActiveEmotion(spec.baseSpriteEmotion);

    setParams((prev) => ({
      ...prev,
      ...EMOTION_PRESETS[spec.baseSpriteEmotion].params,
      angleX: spec.defaultParams.angleX,
      angleY: spec.defaultParams.angleY,
      angleZ: spec.defaultParams.angleZ,
      shoulderY: spec.defaultParams.shoulderY,
      browY: EMOTION_PRESETS[spec.baseSpriteEmotion].params.browY ?? 0,
      handGesture: 'none'
    }));

    if (spec.defaultParams.autoTalk) {
      playSilentPhrasePerformance(customPhrase, true);
    }
  };

  useEffect(() => {
    if (externalAssistantState) {
      applyAssistantState(externalAssistantState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalAssistantState]);

  useEffect(() => {
    if (externalSpeechCommand && externalSpeechCommand.text) {
      setCustomPhrase(externalSpeechCommand.text);
      setActiveEmotion(externalSpeechCommand.emotion);
      playSilentPhrasePerformance(externalSpeechCommand.text, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSpeechCommand]);

  const resetRig = () => {
    stopActiveAnimations();
    setIsMouthOverrideActive(false);
    setIsAutoIdleActive(false);
    setIsBlinkingClosed(false);
    setActiveVowel('SILENT');
    setActiveSlideIndex(0);
    setSecondarySlideIndex(0);
    setActiveAssistantState('IDLE');
    setActiveEmotion('neutral');
    setParams({
      angleX: 0,
      angleY: 0,
      angleZ: 0,
      eyeOpen: 1.0,
      eyeSmile: 0.18,
      mouthOpenY: 0.05,
      mouthForm: 0.4,
      browY: 0,
      breath: 0.5,
      shoulderY: 0,
      gazeX: 0,
      gazeY: 0,
      cheekBlush: 0.12,
      handGesture: 'none'
    });
  };

  const anatomical = computeHeadAndBrowTransform(params, activeEmotion);
  const hairPendulumSway = Number((params.angleX * -0.45 + params.angleZ * 0.6).toFixed(1));

  const spriteInfo = EXPRESSION_SPRITE_MAP[activeEmotion];
  const primarySlide = CUTOUT_VISEME_SLIDES_48[activeSlideIndex] ?? CUTOUT_VISEME_SLIDES_48[0];
  const secondarySlide = CUTOUT_VISEME_SLIDES_48[secondarySlideIndex] ?? primarySlide;

  const getViewportBgStyle = (): React.CSSProperties => {
    if (overlayBgMode === 'alpha_dark') {
      return {
        backgroundColor: '#0F172A',
        backgroundImage:
          'linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
      };
    }
    if (overlayBgMode === 'alpha_checker') {
      return {
        backgroundColor: '#E2E8F0',
        backgroundImage:
          'linear-gradient(45deg, #CBD5E1 25%, transparent 25%), linear-gradient(-45deg, #CBD5E1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #CBD5E1 75%), linear-gradient(-45deg, transparent 75%, #CBD5E1 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
      };
    }
    if (overlayBgMode === 'chroma_green') {
      return { backgroundColor: '#00E65B' };
    }
    return { backgroundColor: 'transparent' };
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="text-xs text-emerald-700 font-medium mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Чистый контур без лишних пикселей · Плотная нижняя губа (0% просвечивания) · 48 слайдов рта + Живая мимика (60 FPS)
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Интерактивный 2.5D стенд «{concept.title}» — 48 промежуточных слайдов рта, живая мимика взгляда и естественные брови
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="btn-trigger-blink"
            onClick={triggerSingleBlink}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-violet-600" />
            <span>Моргнуть (190 мс)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAutoIdleActive((v) => !v)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              isAutoIdleActive
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAutoIdleActive ? 'Остановить Auto-Idle' : 'Живой Idle + Мимика'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDeformerGrid((v) => !v)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              showDeformerGrid
                ? 'bg-violet-50 border-violet-300 text-violet-900'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showDeformerGrid ? 'Скрыть Warp-сетку' : 'Warp-сетка'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPhysicsVectors((v) => !v)}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              showPhysicsVectors
                ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showPhysicsVectors ? 'Скрыть маятники' : 'Маятники физики'}</span>
          </button>
          <button
            type="button"
            onClick={toggleSpeechSimulation}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              isSpeakingDemo || isPhrasePlaying
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-violet-600 text-white hover:bg-violet-700'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isSpeakingDemo || isPhrasePlaying ? 'Остановить речь' : 'Тест липсинка (60 FPS)'}</span>
          </button>
          <button
            type="button"
            onClick={resetRig}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сброс (Neutral 0°)</span>
          </button>
        </div>
      </div>

      {/* Interactive Phrase-to-Motion Silent Tester (60 FPS + 48 Solid-Lip Cut-Out Intermediate Slides) */}
      <div className="bg-violet-50/70 border border-violet-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-violet-700 shrink-0" />
            <span className="text-xs font-bold text-slate-900">
              Проверить модельку своей фразой (Немая демонстрация 60 FPS · 48 обрезанных слайдов с чёткой нижней губой + Естественная мимика)
            </span>
          </div>
          <span className="text-[11px] font-mono text-violet-800 bg-white px-2.5 py-0.5 rounded border border-violet-200">
            48 плотных слайдов + Мягкие брови + Микро-мимика взгляда
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            data-testid="phrase-test-input"
            value={customPhrase}
            onChange={(e) => setCustomPhrase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                playSilentPhrasePerformance(customPhrase, false);
              }
            }}
            placeholder="Напишите любую фразу для Алисы (например: Привет! Как твои дела?)..."
            className="flex-1 rounded-lg border border-violet-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-600 focus:outline-none"
          />
          <button
            type="button"
            data-testid="btn-play-phrase"
            onClick={() =>
              isPhrasePlaying ? stopActiveAnimations() : playSilentPhrasePerformance(customPhrase, false)
            }
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
              isPhrasePlaying
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-violet-600 text-white hover:bg-violet-700'
            }`}
          >
            {isPhrasePlaying ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>Стоп</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Проиграть фразу на модели</span>
              </>
            )}
          </button>
        </div>

        {/* Preset Test Phrase Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 mr-1">Быстрые фразы:</span>
          {PRESET_TEST_PHRASES.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setCustomPhrase(preset.text);
                playSilentPhrasePerformance(preset.text, false);
              }}
              className="px-2.5 py-1 text-[11px] font-medium bg-white text-slate-700 hover:bg-violet-100 hover:text-violet-900 border border-slate-200 rounded-md transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Live Karaoke & Sub-Frame Interpolation Telemetry Bar */}
        <div className="bg-white border border-violet-200 rounded-lg px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="font-medium text-slate-800 truncate">
            {customPhrase.split('').map((ch, idx) => (
              <span
                key={idx}
                className={
                  idx === activeCharIdx
                    ? 'bg-violet-600 text-white px-0.5 rounded font-bold'
                    : idx < activeCharIdx
                    ? 'text-violet-700 font-semibold'
                    : 'text-slate-600'
                }
              >
                {ch}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] text-slate-600 tabular-nums">
            <span>
              Слайд: <strong className="text-violet-700">{primarySlide.shortLabel}</strong>
              {secondarySlide.index !== primarySlide.index && (
                <span>
                  {' '}
                  → <strong className="text-indigo-700">{secondarySlide.shortLabel}</strong> (
                  {Math.round(slideBlendWeight * 100)}%)
                </span>
              )}
            </span>
            <span>Прогресс: {Math.round(phraseProgress * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 2.5D Transparent Cut-Out Viewport */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-between relative overflow-hidden min-h-[480px]">
          <div className="w-full flex items-center justify-between text-xs text-slate-200 font-mono tabular-nums z-10 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
            <span>{activeEmotion.toUpperCase()}</span>
            <span>Z(Наклон): {params.angleZ > 0 ? `+${params.angleZ}` : params.angleZ}°</span>
            <span>Брови Y: {params.browY > 0 ? `+${params.browY.toFixed(2)}` : params.browY.toFixed(2)}</span>
          </div>

          {/* Overlay Background Selector (Proving Zero White Background) */}
          <div className="w-full flex flex-wrap items-center justify-between gap-1.5 my-2 z-10">
            <span className="text-[11px] text-slate-400">Фон оверлея:</span>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: 'alpha_dark', label: 'Тёмный Alpha' },
                  { id: 'alpha_checker', label: 'Шахматка PNG' },
                  { id: 'pure_transparent', label: 'Чистый 0%' },
                  { id: 'chroma_green', label: 'Chroma Key' }
                ] as const
              ).map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setOverlayBgMode(bg.id)}
                  className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors ${
                    overlayBgMode === bg.id
                      ? 'bg-violet-600 text-white border-violet-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>

          {/* 320x320 Cut-Out ArtMesh Warp Viewport (NO White Background, NO Gesture Text Overlay) */}
          <div
            data-testid="rig-overlay-container"
            data-bg-mode={overlayBgMode}
            style={getViewportBgStyle()}
            className="relative w-[320px] h-[320px] my-1 rounded-xl overflow-hidden border border-slate-700/80 flex items-center justify-center shrink-0"
          >
            {concept.id === 1 ? (
              <div
                data-testid="rig-expression-viewport"
                data-active-emotion={activeEmotion}
                data-sprite-pos={spriteInfo.bgPosition}
                data-head-transform={anatomical.headTransform}
                data-brow-y={params.browY}
                data-active-slide={primarySlide.code}
                className="relative w-full h-full select-none"
              >
                <canvas
                  ref={canvasRef}
                  width={CANVAS_INTERNAL_SIZE}
                  height={CANVAS_INTERNAL_SIZE}
                  data-testid="rig-artmesh-canvas"
                  aria-label={`Интерактивная 2.5D-модель Алисы AI: ${EMOTION_PRESETS[activeEmotion].label}`}
                  className="w-full h-full block pointer-events-none"
                />

                {/* Optional Physics Pendulum Gizmo Overlay (Zero Gesture Text Labels) */}
                {showPhysicsVectors && (
                  <svg
                    viewBox="0 0 320 320"
                    className="absolute inset-0 w-full h-full pointer-events-none select-none"
                  >
                    <g>
                      <polyline
                        points={`82,135 ${76 + hairPendulumSway * 0.4},172 ${
                          72 + hairPendulumSway * 0.8
                        },208 ${78 + hairPendulumSway * 1.2},242`}
                        fill="none"
                        stroke="#34D399"
                        strokeWidth="2"
                      />
                      <circle cx={76 + hairPendulumSway * 0.4} cy={172} r="3" fill="#34D399" />
                      <circle cx={72 + hairPendulumSway * 0.8} cy={208} r="3" fill="#34D399" />
                      <circle cx={78 + hairPendulumSway * 1.2} cy={242} r="3.5" fill="#10B981" />

                      <polyline
                        points={`238,135 ${244 + hairPendulumSway * 0.4},172 ${
                          248 + hairPendulumSway * 0.8
                        },208 ${242 + hairPendulumSway * 1.2},242`}
                        fill="none"
                        stroke="#34D399"
                        strokeWidth="2"
                      />
                      <circle cx={244 + hairPendulumSway * 0.4} cy={172} r="3" fill="#34D399" />
                      <circle cx={248 + hairPendulumSway * 0.8} cy={208} r="3" fill="#34D399" />
                      <circle cx={242 + hairPendulumSway * 1.2} cy={242} r="3.5" fill="#10B981" />
                    </g>
                  </svg>
                )}
              </div>
            ) : (
              <img
                src={concept.imagePath}
                alt={`Концепт ${concept.title}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top select-none"
              />
            )}
          </div>

          <div className="w-full text-center text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-lg py-2 px-3">
            Стейт: <span className="font-mono font-semibold text-white">{activeAssistantState}</span> · Слайд:{' '}
            <span className="font-mono font-semibold text-violet-300">{primarySlide.shortLabel}</span> · Губа:{' '}
            <span className="font-semibold text-emerald-400">100% плотная (48 слайдов)</span>
          </div>
        </div>

        {/* Right Controls: Head Tilt & Brow Warp Controls, Mimicry, 48 Cut-Out Slides, 9 Emotions */}
        <div className="lg:col-span-7 space-y-5">
          {/* Highlighted Head Tilt Z & Eyebrow Height Y Direct Calibration Controls */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-violet-600" />
                Цельная Warp-деформация: наклон головы, деликатные брови и живая мимика лица
              </span>
              <span className="text-[11px] font-mono text-violet-700">
                Мягкий лимитер бровей · Прищур глаз · Саккады взгляда
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Head Tilt Z */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                <label htmlFor="param-angle-z" className="flex justify-between text-xs font-semibold text-slate-800">
                  <span>Наклон головы к плечу Z (ParamAngleZ)</span>
                  <span className="font-mono tabular-nums text-violet-700">
                    {params.angleZ > 0 ? `+${params.angleZ}` : params.angleZ}°
                  </span>
                </label>
                <input
                  id="param-angle-z"
                  data-testid="slider-angle-z"
                  type="range"
                  min={-30}
                  max={30}
                  step={1}
                  value={params.angleZ}
                  onChange={(e) => setParams((p) => ({ ...p, angleZ: Number(e.target.value) }))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                <div className="flex items-center justify-between gap-1 pt-1">
                  <button
                    type="button"
                    data-testid="btn-tilt-left"
                    onClick={() => setParams((p) => ({ ...p, angleZ: -22 }))}
                    className="flex-1 py-1 text-[11px] font-medium bg-slate-100 hover:bg-violet-100 text-slate-700 rounded transition-colors"
                  >
                    -22° К левому плечу
                  </button>
                  <button
                    type="button"
                    onClick={() => setParams((p) => ({ ...p, angleZ: 0 }))}
                    className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                  >
                    0° Ровно
                  </button>
                  <button
                    type="button"
                    data-testid="btn-tilt-right"
                    onClick={() => setParams((p) => ({ ...p, angleZ: 22 }))}
                    className="flex-1 py-1 text-[11px] font-medium bg-slate-100 hover:bg-violet-100 text-slate-700 rounded transition-colors"
                  >
                    +22° К правому плечу
                  </button>
                </div>
              </div>

              {/* Eyebrow Height Y */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                <label htmlFor="param-brow-y" className="flex justify-between text-xs font-semibold text-slate-800">
                  <span>Мягкая дуга родных бровей (ParamBrowLY/RY)</span>
                  <span className="font-mono tabular-nums text-violet-700">
                    {params.browY > 0 ? `+${params.browY.toFixed(2)}` : params.browY.toFixed(2)}
                  </span>
                </label>
                <input
                  id="param-brow-y"
                  data-testid="slider-brow-y"
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={params.browY}
                  onChange={(e) => setParams((p) => ({ ...p, browY: Number(e.target.value) }))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                <div className="flex items-center justify-between gap-1 pt-1">
                  <button
                    type="button"
                    data-testid="btn-brow-down"
                    onClick={() => setParams((p) => ({ ...p, browY: -0.85 }))}
                    className="flex-1 py-1 text-[11px] font-medium bg-slate-100 hover:bg-violet-100 text-slate-700 rounded transition-colors"
                  >
                    -0.85 Нахмурить
                  </button>
                  <button
                    type="button"
                    onClick={() => setParams((p) => ({ ...p, browY: 0 }))}
                    className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                  >
                    0.0 Норма
                  </button>
                  <button
                    type="button"
                    data-testid="btn-brow-up"
                    onClick={() => setParams((p) => ({ ...p, browY: 0.85 }))}
                    className="flex-1 py-1 text-[11px] font-medium bg-slate-100 hover:bg-violet-100 text-slate-700 rounded transition-colors"
                  >
                    +0.85 Мягко вверх
                  </button>
                </div>
              </div>
            </div>

            {/* Secondary Sliders: AngleX, AngleY, ShoulderY, MouthOpenY */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label htmlFor="param-angle-x" className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                  <span>Поворот X</span>
                  <span className="font-mono text-violet-700">{params.angleX}°</span>
                </label>
                <input
                  id="param-angle-x"
                  type="range"
                  min={-30}
                  max={30}
                  step={1}
                  value={params.angleX}
                  onChange={(e) => setParams((p) => ({ ...p, angleX: Number(e.target.value) }))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>
              <div>
                <label htmlFor="param-angle-y" className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                  <span>Кивок Y</span>
                  <span className="font-mono text-violet-700">{params.angleY}°</span>
                </label>
                <input
                  id="param-angle-y"
                  type="range"
                  min={-30}
                  max={30}
                  step={1}
                  value={params.angleY}
                  onChange={(e) => setParams((p) => ({ ...p, angleY: Number(e.target.value) }))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>
              <div>
                <label htmlFor="param-shoulder-y" className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                  <span>Мягкое дыхание</span>
                  <span className="font-mono text-violet-700">{params.shoulderY.toFixed(2)}</span>
                </label>
                <input
                  id="param-shoulder-y"
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={params.shoulderY}
                  onChange={(e) => setParams((p) => ({ ...p, shoulderY: Number(e.target.value) }))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>
              <div>
                <label htmlFor="param-mouth-open" className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                  <span>Открытие рта</span>
                  <span className="font-mono text-violet-700">{params.mouthOpenY.toFixed(2)}</span>
                </label>
                <input
                  id="param-mouth-open"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={params.mouthOpenY}
                  onChange={(e) => {
                    const nextOpenY = Number(e.target.value);
                    const vKey = resolveAnimeVisemeKey(nextOpenY, params.mouthForm);
                    const closestIdx = resolveClosestSlide48(nextOpenY, params.mouthForm);
                    setIsMouthOverrideActive(true);
                    setActiveVowel(vKey);
                    setActiveSlideIndex(closestIdx);
                    setSecondarySlideIndex(closestIdx);
                    setParams((p) => ({ ...p, mouthOpenY: nextOpenY }));
                  }}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Subtle Facial Mimicry Sliders: Eye Smile, Gaze X, Cheek Blush */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80">
              <div>
                <label htmlFor="param-eye-smile" className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                  <span>Улыбка глаз (прищур нижних век)</span>
                  <span className="font-mono text-violet-700">{Math.round(params.eyeSmile * 100)}%</span>
                </label>
                <input
                  id="param-eye-smile"
                  data-testid="slider-eye-smile"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={params.eyeSmile}
                  onChange={(e) => setParams((p) => ({ ...p, eyeSmile: Number(e.target.value) }))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>
              <div>
                <label htmlFor="param-gaze-x" className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                  <span>Живой взгляд X (радужка)</span>
                  <span className="font-mono text-violet-700">
                    {(params.gazeX ?? 0) > 0 ? `+${(params.gazeX ?? 0).toFixed(2)}` : (params.gazeX ?? 0).toFixed(2)}
                  </span>
                </label>
                <input
                  id="param-gaze-x"
                  data-testid="slider-gaze-x"
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={params.gazeX ?? 0}
                  onChange={(e) => setParams((p) => ({ ...p, gazeX: Number(e.target.value) }))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>
              <div>
                <label htmlFor="param-cheek-blush" className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                  <span>Тёплый румянец щёк</span>
                  <span className="font-mono text-violet-700">{Math.round((params.cheekBlush ?? 0) * 100)}%</span>
                </label>
                <input
                  id="param-cheek-blush"
                  data-testid="slider-cheek-blush"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={params.cheekBlush ?? 0.15}
                  onChange={(e) => setParams((p) => ({ ...p, cheekBlush: Number(e.target.value) }))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 48 Cut-Out Progressive Viseme Slides Inspector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">
                48 обрезанных слайдов рта с чёткой нижней губой (M→A, A→O, O→U, U→M, M→I, I→E, E→A, O→A, I→U)
              </span>
              <span className="text-[11px] font-mono text-violet-700">{primarySlide.labelRu}</span>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
              {CUTOUT_VISEME_SLIDES_48.map((slide) => {
                const isSelected = isMouthOverrideActive && activeSlideIndex === slide.index;
                return (
                  <button
                    key={slide.code}
                    type="button"
                    data-testid={`btn-slide-${slide.index}`}
                    onClick={() => applySlideDirectly(slide.index)}
                    className={`px-1 py-1 text-[10px] font-mono rounded border text-center transition-colors truncate ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                        : slide.category === 'base'
                        ? 'bg-violet-50/80 text-violet-950 border-violet-200 hover:bg-violet-100'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    title={slide.labelRu}
                  >
                    {slide.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stage 4 AI Assistant State Machine Switcher */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-violet-600" />
                Состояния ИИ-ассистента (Этап 4 · State Machine)
              </span>
              <span className="text-xs font-mono text-slate-500">
                {STAGE4_ASSISTANT_STATES.find((s) => s.id === activeAssistantState)?.motionFile}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STAGE4_ASSISTANT_STATES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => applyAssistantState(st.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    activeAssistantState === st.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {st.titleRu}
                </button>
              ))}
            </div>
          </div>

          {/* All 9 Stage 2 Emotion Presets + 6 Base Visemes (Zero Gesture Text Overlay) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1 border-t border-slate-200">
            <div className="sm:col-span-8">
              <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                <span>9 базовых эмоций (естественная мимика, чёткая нижняя губа, без лишних пикселей)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(EMOTION_PRESETS) as EmotionPresetId[]).map((emotionKey) => (
                  <button
                    key={emotionKey}
                    type="button"
                    onClick={() => applyEmotion(emotionKey)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      activeEmotion === emotionKey
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {EMOTION_PRESETS[emotionKey].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-4">
              <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-violet-600" />
                <span>6 опорных гласных</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(
                  Object.entries(VISEME_SPRITE_MAP) as [
                    AnimeVisemeKey,
                    (typeof VISEME_SPRITE_MAP)[AnimeVisemeKey]
                  ][]
                ).map(([key, shape]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyVowel(key)}
                    className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                      activeVowel === key && isMouthOverrideActive
                        ? 'bg-violet-700 text-white border-violet-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {shape.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
