import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampParameter,
  computeParallaxOffset,
  filterConceptsByComplexity,
  filterPsdLayers,
  buildCubismPhysicsJsonPreview,
  findClosestViseme,
  findExpressionById,
  generateStage1ConfirmationBrief,
  generateStage2ApprovalSummary,
  generateStage3ApprovalSummary
} from './conceptLogic';
import { ALISA_CONCEPTS, CUSTOMIZATION_OPTIONS } from '../data/conceptsData';
import { STAGE2_EXPRESSIONS, MATERIAL_REFERENCES, VISEME_CHART, TURNAROUND_SPECS } from '../data/stage2Data';
import { PSD_LAYER_SCHEMA, RIG_PARAMETERS, DEFORMER_HIERARCHY, CUBISM_PHYSICS_GROUPS } from '../data/stage3Data';

test('Updated Concept 1 has no halo and uses bust-up framing with ~76 PSD layers', () => {
  const c1 = ALISA_CONCEPTS[0];
  assert.equal(c1.livePreviewConfig.accessoryType, 'none');
  assert.equal(c1.rigging.estimatedLayers, 76);
  assert.ok(c1.title.includes('без нимба'));
});

test('Stage 2 includes 3 turnaround views, 9 expressions (>= 8 required), 6 material zones, and 6 visemes', () => {
  assert.equal(TURNAROUND_SPECS.length, 3);
  assert.ok(STAGE2_EXPRESSIONS.length >= 8);
  assert.equal(STAGE2_EXPRESSIONS.length, 9);
  assert.equal(MATERIAL_REFERENCES.length, 6);
  assert.equal(VISEME_CHART.length, 6);
});

test('Stage 3 PSD layer schema has strict descending DrawOrder and English prefixes without halo', () => {
  assert.equal(PSD_LAYER_SCHEMA.length, 42);
  for (let i = 1; i < PSD_LAYER_SCHEMA.length; i += 1) {
    assert.ok(PSD_LAYER_SCHEMA[i - 1].drawOrder > PSD_LAYER_SCHEMA[i].drawOrder);
  }
  const hasHalo = PSD_LAYER_SCHEMA.some((l) => l.layerName.toLowerCase().includes('halo'));
  assert.equal(hasHalo, false);
});

test('Stage 3 Rig Parameters contain all required Cubism parameters', () => {
  const ids = new Set(RIG_PARAMETERS.map((p) => p.id));
  const required = [
    'ParamAngleX', 'ParamAngleY', 'ParamAngleZ',
    'ParamEyeLOpen', 'ParamEyeROpen', 'ParamEyeLSmile', 'ParamEyeRSmile', 'ParamEyeBallX', 'ParamEyeBallY',
    'ParamBrowLY', 'ParamBrowRY', 'ParamBrowLX', 'ParamBrowRX', 'ParamBrowLAngle', 'ParamBrowRAngle', 'ParamBrowLForm', 'ParamBrowRForm',
    'ParamMouthOpenY', 'ParamMouthForm', 'ParamCheek',
    'ParamBodyAngleX', 'ParamBodyAngleY', 'ParamBodyAngleZ', 'ParamBreath', 'ParamShoulder', 'ParamArmL', 'ParamArmR',
    'ParamHairFront', 'ParamHairSide', 'ParamHairBack'
  ];
  for (const paramId of required) {
    assert.ok(ids.has(paramId), `Missing required parameter: ${paramId}`);
  }
  assert.ok(DEFORMER_HIERARCHY.length === 1);
  assert.equal(CUBISM_PHYSICS_GROUPS.length, 6);
});

test('filterPsdLayers and buildCubismPhysicsJsonPreview work accurately', () => {
  const eyeLayers = filterPsdLayers(PSD_LAYER_SCHEMA, 'EYES', 'Highlight');
  assert.equal(eyeLayers.length, 2);

  const jsonStr = buildCubismPhysicsJsonPreview(CUBISM_PHYSICS_GROUPS);
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.Version, 3);
  assert.equal(parsed.PhysicsSettings.length, 6);

  const stage3Summary = generateStage3ApprovalSummary('Переходим к Этапу 4');
  assert.ok(stage3Summary.includes('УТВЕРЖДЕНИЕ ЭТАПА 3'));
  assert.ok(stage3Summary.includes('Переходим к Этапу 4'));
});

test('findClosestViseme matches vowel A and closed M/B/P accurately', () => {
  const vowelA = findClosestViseme(0.85, 0.6);
  assert.ok(vowelA.phoneme.includes('Vowel A'));

  const closed = findClosestViseme(0.0, 0.4);
  assert.ok(closed.phoneme.includes('Closed'));
});

test('findExpressionById returns requested expression or default neutral', () => {
  const wink = findExpressionById('wink');
  assert.equal(wink.id, 'wink');
  const fallback = findExpressionById('non_existent');
  assert.equal(fallback.id, 'neutral');
});

test('clampParameter and computeParallaxOffset calculate 2.5D displacement accurately', () => {
  assert.equal(clampParameter(45, -30, 30), 30);
  const turnedRightUp = computeParallaxOffset(30, 30, 0.5);
  assert.equal(turnedRightUp.dx, 9);
  assert.equal(turnedRightUp.dy, -7);
});

test('filterConceptsByComplexity and brief generators format output properly', () => {
  const lowOnly = filterConceptsByComplexity(ALISA_CONCEPTS, 'Низкая');
  assert.equal(lowOnly.length, 2);

  const brief1 = generateStage1ConfirmationBrief(1, ['glasses_toggle'], '', CUSTOMIZATION_OPTIONS);
  assert.ok(brief1.includes('Концепт №1'));

  const brief2 = generateStage2ApprovalSummary(['Разворот 0° / 3/4 / Профиль', 'Лист 9 эмоций'], 'Готово к Этапу 3');
  assert.ok(brief2.includes('УТВЕРЖДЕНИЕ ЭТАПА 2'));
  assert.ok(brief2.includes('Готово к Этапу 3'));
});

test('EMOTION_PRESETS change facial parameters without tilting head/body and map to 9 unique 3x3 sprite cells', async () => {
  const { EMOTION_PRESETS, EXPRESSION_SPRITE_MAP } = await import('./conceptLogic');
  const bgPositions = new Set<string>();
  for (const [key, preset] of Object.entries(EMOTION_PRESETS)) {
    assert.equal(preset.params.angleX, 0, `${key} should not move angleX`);
    assert.equal(preset.params.angleY, 0, `${key} should not move angleY`);
    assert.equal(preset.params.angleZ, 0, `${key} should not move angleZ`);
    const sprite = EXPRESSION_SPRITE_MAP[key as keyof typeof EXPRESSION_SPRITE_MAP];
    assert.ok(sprite, `Missing sprite mapping for ${key}`);
    bgPositions.add(sprite.bgPosition);
  }
  assert.equal(bgPositions.size, 9);
});

test('VISEME_SPRITE_MAP and resolveAnimeVisemeKey map all 6 visemes to distinct native anime mouth sprite frames', async () => {
  const { VISEME_SPRITE_MAP, resolveAnimeVisemeKey } = await import('./conceptLogic');
  const keys = Object.keys(VISEME_SPRITE_MAP);
  assert.equal(keys.length, 6);
  const positions = new Set(Object.values(VISEME_SPRITE_MAP).map((v) => v.bgPosition));
  assert.equal(positions.size, 6);

  assert.equal(resolveAnimeVisemeKey(0.05, 0.4), 'SILENT');
  assert.equal(resolveAnimeVisemeKey(0.88, 0.6), 'A');
  assert.equal(resolveAnimeVisemeKey(0.62, 0.75), 'E');
  assert.equal(resolveAnimeVisemeKey(0.35, 0.9), 'I');
  assert.equal(resolveAnimeVisemeKey(0.78, -0.45), 'O');
  assert.equal(resolveAnimeVisemeKey(0.45, -0.65), 'U');
});

test('Stage 4 specifications and helpers validate 13 .exp3.json presets, 7 AI states, blink curve, and lip-sync rules', async () => {
  const {
    STAGE4_BLINK_PHASES,
    STAGE4_IDLE_HARMONICS,
    STAGE4_LIPSYNC_RULES,
    STAGE4_EXPRESSION_PRESETS,
    STAGE4_ASSISTANT_STATES
  } = await import('../data/stage4Data');
  const {
    computeBlinkEyeOpen,
    filterStage4Expressions,
    buildCubismExp3JsonPreview,
    generateStage4ApprovalSummary
  } = await import('./conceptLogic');

  assert.equal(STAGE4_BLINK_PHASES.length, 4);
  assert.equal(STAGE4_IDLE_HARMONICS.length, 5);
  assert.equal(STAGE4_LIPSYNC_RULES.length, 6);
  assert.ok(STAGE4_EXPRESSION_PRESETS.length >= 12);
  assert.equal(STAGE4_EXPRESSION_PRESETS.length, 13);
  assert.equal(STAGE4_ASSISTANT_STATES.length, 7);

  assert.equal(computeBlinkEyeOpen(-10), 1.0);
  assert.equal(computeBlinkEyeOpen(65), 0.0);
  assert.equal(computeBlinkEyeOpen(200), 1.0);

  const assistantExps = filterStage4Expressions(STAGE4_EXPRESSION_PRESETS, 'ASSISTANT', '');
  assert.equal(assistantExps.length, 5);

  const expJson = JSON.parse(buildCubismExp3JsonPreview(STAGE4_EXPRESSION_PRESETS[0]));
  assert.equal(expJson.Type, 'Live2D Expression');
  assert.ok(Array.isArray(expJson.Parameters));

  const summary = generateStage4ApprovalSummary('Переходим к Этапу 5');
  assert.ok(summary.includes('УТВЕРЖДЕНИЕ ЭТАПА 4'));
  assert.ok(summary.includes('Переходим к Этапу 5'));
});

test('48 solid-lip cut-out viseme slides, 2D ArtMesh Warp Deformer, and syllable-coarticulated 60 FPS phrase compiler work accurately', async () => {
  const {
    CUTOUT_VISEME_SLIDES_48,
    CUTOUT_VISEME_SLIDES_32,
    computeHeadAndBrowTransform,
    computeMeshVertexDeformation,
    resolveIntermediateSlideBridge,
    compilePhraseToSilentPerformance,
    samplePerformanceAtTime
  } = await import('./conceptLogic');

  assert.equal(CUTOUT_VISEME_SLIDES_48.length, 48);
  assert.equal(CUTOUT_VISEME_SLIDES_32.length, 32);
  const uniquePositions = new Set(CUTOUT_VISEME_SLIDES_48.map((s) => s.bgPosition));
  assert.equal(uniquePositions.size, 48);

  // SILENT (0) -> A (7) must insert progressive intermediate slides
  const bridgeToA = resolveIntermediateSlideBridge(0, 7, true);
  assert.ok(bridgeToA.length >= 4);
  assert.ok(bridgeToA.every((idx) => idx > 0 && idx < 48));

  // Verify 2D ArtMesh Warp Deformer:
  // 1) Head tilt moves head top (v=0.20) while bottom torso (v=0.95) remains anchored
  const tiltedParams = {
    angleX: 0,
    angleY: 0,
    angleZ: 22,
    eyeOpen: 1,
    eyeSmile: 0.15,
    mouthOpenY: 0.05,
    mouthForm: 0.4,
    browY: 0.85,
    breath: 0.5,
    shoulderY: 0.2,
    gazeX: 0.15,
    gazeY: -0.05,
    cheekBlush: 0.25,
    handGesture: 'none' as const
  };
  const topVertex = computeMeshVertexDeformation(0.5, 0.2, tiltedParams, 'neutral', 640);
  const bottomVertex = computeMeshVertexDeformation(0.5, 0.95, tiltedParams, 'neutral', 640);
  assert.ok(Math.abs(topVertex.x - 320) > 25, 'Head top vertex should tilt laterally with angleZ=22');
  assert.equal(Math.round(bottomVertex.x), 320, 'Bottom torso vertex at v=0.95 must remain horizontally anchored');

  // 2) Restrained eyebrow warp lifts brow ridge (u=0.36, v=0.404) delicately without stretching forehead or distorting eye center (u=0.36, v=0.50)
  const browOnlyParams = {
    ...tiltedParams,
    angleZ: 0,
    shoulderY: 0,
    browY: 0.85
  };
  const browVertex = computeMeshVertexDeformation(0.36, 0.404, browOnlyParams, 'neutral', 640);
  const eyeVertex = computeMeshVertexDeformation(0.36, 0.5, browOnlyParams, 'neutral', 640);
  assert.ok(browVertex.y < 0.404 * 640 - 2.2, 'Eyebrow vertex should lift upward gently when browY = +0.85');
  assert.ok(browVertex.y > 0.404 * 640 - 6.0, 'Eyebrow lift must remain natural and restrained (< 6px)');
  assert.ok(Math.abs(eyeVertex.y - 0.5 * 640) < 0.01, 'Eye vertex at v=0.50 must not be distorted by eyebrow warp');

  // Head tilt Z and Brow Y also keep legacy CSS transform telemetry accurate
  const transforms = computeHeadAndBrowTransform(tiltedParams, 'neutral');
  assert.ok(transforms.headTransform.includes('rotateZ('));
  assert.ok(transforms.leftBrowTransform.includes('translateY('));

  // Compile a question phrase and verify natural warm emotion (never crazy/manic surprise on normal questions), progressive slides, and mimicry
  const perf = compilePhraseToSilentPerformance('Привет, как твои дела?', 'neutral');
  assert.equal(perf.detectedEmotion, 'neutral');
  assert.ok(perf.keyframes.length > 12);
  assert.ok(perf.uniqueSlidesUsed.length >= 6);

  const midSample = samplePerformanceAtTime(perf, perf.totalDurationMs * 0.5);
  assert.ok(midSample.progress >= 0.49 && midSample.progress <= 0.51);
  assert.ok(midSample.browY > 0.05 && midSample.browY <= 0.4, 'Question brow lift should be gentle and natural');
  assert.ok(typeof midSample.gazeX === 'number');
  assert.ok(typeof midSample.cheekBlush === 'number');
});





