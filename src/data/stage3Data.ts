export type PsdCategory =
  | 'ACCESSORIES'
  | 'HAIR_FRONT'
  | 'EYEBROWS'
  | 'EYES'
  | 'MOUTH'
  | 'FACE_BASE'
  | 'HAIR_SIDE'
  | 'NECK_OUTFIT'
  | 'ARMS_HANDS'
  | 'HAIR_BACK';

export interface PsdLayerSpec {
  id: string;
  drawOrder: number;
  layerName: string;
  groupPath: string;
  category: PsdCategory;
  blendMode: 'Normal' | 'Multiply' | 'Screen' | 'Add';
  opacity: number;
  clippingMask?: string;
  symmetry: 'Single' | 'L/R Mirror';
  notesRu: string;
}

export type ParamCategory = 'Head' | 'Eyes' | 'Brows' | 'Mouth' | 'Body' | 'Hair';

export interface RigParameterSpec {
  id: string;
  nameRu: string;
  category: ParamCategory;
  min: number;
  defaultVal: number;
  max: number;
  keyforms: string;
  affectedLayersAndDeformers: string;
}

export interface DeformerNode {
  id: string;
  name: string;
  type: 'Rotation' | 'Warp';
  parentId: string | null;
  boundParams: string[];
  descriptionRu: string;
  children?: DeformerNode[];
}

export interface PhysicsPendulumSpec {
  id: string;
  groupName: string;
  targetPartRu: string;
  inputParams: string[];
  outputParam: string;
  pendulumCount: number;
  pendulumLengths: string;
  mass: number;
  damping: number;
  sensitivity: number;
  fps: number;
  notesRu: string;
}

export const STAGE3_BLUEPRINT_SHEET_PATH =
  '/src/assets/images/alisa_stage3_psd_blueprint_1794672024860.jpg';

export const PSD_LAYER_SCHEMA: PsdLayerSpec[] = [
  // 1. Hair Front & Ahoge (Top-most Draw Order: 900-860)
  {
    id: 'psd-01',
    drawOrder: 900,
    layerName: 'HAIR_AHOGE_Main',
    groupPath: '01_HAIR_FRONT / Ahoge',
    category: 'HAIR_FRONT',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'Single',
    notesRu: 'Упругий ахоге на макушке (без нимба). Запас по холсту сверху +15% для пружинящей физики.'
  },
  {
    id: 'psd-02',
    drawOrder: 890,
    layerName: 'HAIR_FRONT_Highlight_Add',
    groupPath: '01_HAIR_FRONT / Bangs',
    category: 'HAIR_FRONT',
    blendMode: 'Add',
    opacity: 65,
    clippingMask: 'HAIR_FRONT_Center',
    symmetry: 'Single',
    notesRu: 'Светящееся кольцо бликов (Angel Ring) на чёлке, привязано маской к слою чёлки.'
  },
  {
    id: 'psd-03',
    drawOrder: 880,
    layerName: 'HAIR_FRONT_Center',
    groupPath: '01_HAIR_FRONT / Bangs',
    category: 'HAIR_FRONT',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'Single',
    notesRu: 'Центральная воздушная прядь чёлки. Между глазами, не перекрывает брови.'
  },
  {
    id: 'psd-04',
    drawOrder: 870,
    layerName: 'HAIR_FRONT_SideL / R',
    groupPath: '01_HAIR_FRONT / Bangs',
    category: 'HAIR_FRONT',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'L/R Mirror',
    notesRu: 'Левая и правая обрамляющие прядки чёлки у висков (отдельные слои для независимой физики).'
  },

  // 2. Eyebrows (Draw Order: 840-830)
  {
    id: 'psd-05',
    drawOrder: 840,
    layerName: 'BROW_Line_L / R',
    groupPath: '02_EYEBROWS',
    category: 'EYEBROWS',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'L/R Mirror',
    notesRu: 'Линия бровей (#4C3D75) с мягким скруглением концов. Рисуется поверх теней чёлки для читаемости.'
  },

  // 3. Hair Cast Shadow (Draw Order: 810)
  {
    id: 'psd-06',
    drawOrder: 810,
    layerName: 'FACE_SHADOW_HairFront_Mul',
    groupPath: '03_FACE_SHADOWS',
    category: 'FACE_BASE',
    blendMode: 'Multiply',
    opacity: 45,
    clippingMask: 'FACE_SkinBase',
    symmetry: 'Single',
    notesRu: 'Мягкая падающая тень от чёлки на лбу и висках (#D8B4FE). Двигается синхронно с чёлкой.'
  },

  // 4. Eyes L & R (Draw Order: 790-700)
  {
    id: 'psd-07',
    drawOrder: 790,
    layerName: 'EYE_L/R_Eyelash_Upper_Main',
    groupPath: '04_EYES / Eye_L & Eye_R',
    category: 'EYES',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'L/R Mirror',
    notesRu: 'Верхняя дуга ресниц. Разделена сеткой с повышенной плотностью для плавного смыкания при моргании.'
  },
  {
    id: 'psd-08',
    drawOrder: 785,
    layerName: 'EYE_L/R_Eyelash_Upper_Wing',
    groupPath: '04_EYES / Eye_L & Eye_R',
    category: 'EYES',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'L/R Mirror',
    notesRu: 'Внешний уголок верхних ресниц; приподнимается при EyeSmile и опускается при Sad.'
  },
  {
    id: 'psd-09',
    drawOrder: 780,
    layerName: 'EYE_L/R_Eyelid_Upper_Skin',
    groupPath: '04_EYES / Eye_L & Eye_R',
    category: 'EYES',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'L/R Mirror',
    notesRu: 'Кожа верхнего века, перекрывающая склеру и радужку сверху при моргании (EyeOpen -> 0).'
  },
  {
    id: 'psd-10',
    drawOrder: 775,
    layerName: 'EYE_L/R_Eyelash_Lower',
    groupPath: '04_EYES / Eye_L & Eye_R',
    category: 'EYES',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'L/R Mirror',
    notesRu: 'Нижние ресницы и край нижнего века (выгибается вверх дугой при ParamEyeL/RSmile).'
  },
  {
    id: 'psd-11',
    drawOrder: 770,
    layerName: 'EYE_L/R_Eyelid_Lower_Skin',
    groupPath: '04_EYES / Eye_L & Eye_R',
    category: 'EYES',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'L/R Mirror',
    notesRu: 'Скрывающий кожух нижнего века (маскирует нижнюю часть радужки при улыбке глазами).'
  },
  {
    id: 'psd-12',
    drawOrder: 760,
    layerName: 'EYE_L/R_Highlight_Star_Add',
    groupPath: '04_EYES / Eye_L & Eye_R / Highlights',
    category: 'EYES',
    blendMode: 'Add',
    opacity: 100,
    clippingMask: 'EYE_L/R_Sclera',
    symmetry: 'L/R Mirror',
    notesRu: 'Крупный звёздчатый блик сверху слева. Колеблется при радости и удивлении.'
  },
  {
    id: 'psd-13',
    drawOrder: 755,
    layerName: 'EYE_L/R_Highlight_Drop_Add',
    groupPath: '04_EYES / Eye_L & Eye_R / Highlights',
    category: 'EYES',
    blendMode: 'Add',
    opacity: 90,
    clippingMask: 'EYE_L/R_Sclera',
    symmetry: 'L/R Mirror',
    notesRu: 'Вторичный блик-капля и нижняя влажная дуга (усиливается при эмоции Sad).'
  },
  {
    id: 'psd-14',
    drawOrder: 750,
    layerName: 'EYE_L/R_LidShadow_Mul',
    groupPath: '04_EYES / Eye_L & Eye_R / IrisGroup',
    category: 'EYES',
    blendMode: 'Multiply',
    opacity: 55,
    clippingMask: 'EYE_L/R_Sclera',
    symmetry: 'L/R Mirror',
    notesRu: 'Падающая тень от верхнего века на склеру и радужку (#4C1D95).'
  },
  {
    id: 'psd-15',
    drawOrder: 740,
    layerName: 'EYE_L/R_Pupil_Core',
    groupPath: '04_EYES / Eye_L & Eye_R / IrisGroup',
    category: 'EYES',
    blendMode: 'Normal',
    opacity: 100,
    clippingMask: 'EYE_L/R_Sclera',
    symmetry: 'L/R Mirror',
    notesRu: 'Зрачок (#1E1B4B). Масштабируется отдельно от радужки при удивлении (-12%).'
  },
  {
    id: 'psd-16',
    drawOrder: 735,
    layerName: 'EYE_L/R_Iris_LowerGlow_Scr',
    groupPath: '04_EYES / Eye_L & Eye_R / IrisGroup',
    category: 'EYES',
    blendMode: 'Screen',
    opacity: 70,
    clippingMask: 'EYE_L/R_Sclera',
    symmetry: 'L/R Mirror',
    notesRu: 'Нижнее лавандовое свечение радужки (#DDD6FE), даёт эффект кристаллической глубины.'
  },
  {
    id: 'psd-17',
    drawOrder: 730,
    layerName: 'EYE_L/R_Iris_Base',
    groupPath: '04_EYES / Eye_L & Eye_R / IrisGroup',
    category: 'EYES',
    blendMode: 'Normal',
    opacity: 100,
    clippingMask: 'EYE_L/R_Sclera',
    symmetry: 'L/R Mirror',
    notesRu: 'Основная чаша радужки (#5B21B6 -> #A78BFA). Сдвигается по ParamEyeBallX/Y.'
  },
  {
    id: 'psd-18',
    drawOrder: 720,
    layerName: 'EYE_L/R_Sclera',
    groupPath: '04_EYES / Eye_L & Eye_R',
    category: 'EYES',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'L/R Mirror',
    notesRu: 'Белок глаза (#FDFCFE). Главный Clipping ID для всей внутренней структуры глаза.'
  },

  // 5. Nose & Mouth (Draw Order: 680-610)
  {
    id: 'psd-19',
    drawOrder: 680,
    layerName: 'NOSE_Line_And_Shadow',
    groupPath: '05_NOSE',
    category: 'FACE_BASE',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'Single',
    notesRu: 'Штрих носа + микро-тень снизу. Имеет максимальный вынос по X/Y при повороте головы.'
  },
  {
    id: 'psd-20',
    drawOrder: 660,
    layerName: 'MOUTH_Lip_Upper',
    groupPath: '06_MOUTH',
    category: 'MOUTH',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'Single',
    notesRu: 'Верхняя губа + контур (перекрывает верхний край ротовой полости).'
  },
  {
    id: 'psd-21',
    drawOrder: 655,
    layerName: 'MOUTH_Lip_Lower',
    groupPath: '06_MOUTH',
    category: 'MOUTH',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'Single',
    notesRu: 'Нижняя губа + мягкий блик на губе. Опускается при ParamMouthOpenY.'
  },
  {
    id: 'psd-22',
    drawOrder: 650,
    layerName: 'MOUTH_SkinMask_Top_Bot',
    groupPath: '06_MOUTH',
    category: 'MOUTH',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'Single',
    notesRu: 'Скрывающие кожухи цвета кожи вокруг губ (гарантируют чистое закрытие при OpenY = 0).'
  },
  {
    id: 'psd-23',
    drawOrder: 640,
    layerName: 'MOUTH_Teeth_Upper',
    groupPath: '06_MOUTH',
    category: 'MOUTH',
    blendMode: 'Normal',
    opacity: 100,
    clippingMask: 'MOUTH_Inner_Cavity',
    symmetry: 'Single',
    notesRu: 'Верхний ряд зубов (обрезается маской ротовой полости).'
  },
  {
    id: 'psd-24',
    drawOrder: 635,
    layerName: 'MOUTH_Teeth_Lower',
    groupPath: '06_MOUTH',
    category: 'MOUTH',
    blendMode: 'Normal',
    opacity: 100,
    clippingMask: 'MOUTH_Inner_Cavity',
    symmetry: 'Single',
    notesRu: 'Нижний ряд зубов (появляется при висеме I и широком A).'
  },
  {
    id: 'psd-25',
    drawOrder: 630,
    layerName: 'MOUTH_Tongue',
    groupPath: '06_MOUTH',
    category: 'MOUTH',
    blendMode: 'Normal',
    opacity: 100,
    clippingMask: 'MOUTH_Inner_Cavity',
    symmetry: 'Single',
    notesRu: 'Язык с мягкой тенью в глубине, обрезан по внутренней полости рта.'
  },
  {
    id: 'psd-26',
    drawOrder: 620,
    layerName: 'MOUTH_Inner_Cavity',
    groupPath: '06_MOUTH',
    category: 'MOUTH',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'Single',
    notesRu: 'Внутренность рта (тёмно-вишнёво-фиолетовый градиент). Служит Clipping ID для зубов и языка.'
  },

  // 6. Face Base, Cheek & Ears (Draw Order: 600-540)
  {
    id: 'psd-27',
    drawOrder: 600,
    layerName: 'FACE_Cheek_Blush_L / R',
    groupPath: '07_FACE_BASE',
    category: 'FACE_BASE',
    blendMode: 'Multiply',
    opacity: 100,
    clippingMask: 'FACE_SkinBase',
    symmetry: 'L/R Mirror',
    notesRu: 'Мягкий румянец на скулах + диагональные штрихи смущения (управляется ParamCheek).'
  },
  {
    id: 'psd-28',
    drawOrder: 580,
    layerName: 'FACE_SkinBase',
    groupPath: '07_FACE_BASE',
    category: 'FACE_BASE',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'Single',
    notesRu: 'Овал лица и подбородок с чётким контуром. Перекрывает верх шеи.'
  },
  {
    id: 'psd-29',
    drawOrder: 560,
    layerName: 'EAR_Base_L / R',
    groupPath: '07_FACE_BASE',
    category: 'FACE_BASE',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'L/R Mirror',
    notesRu: 'Уши находятся под контуром лица: при повороте вправо (+30°) левое ухо выдвигается, правое уходит.'
  },

  // 7. Side Hair Front & Back Sub-layers (Draw Order: 530-500)
  {
    id: 'psd-30',
    drawOrder: 530,
    layerName: 'HAIR_SIDE_UpperLock_L / R',
    groupPath: '08_HAIR_SIDE',
    category: 'HAIR_SIDE',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'L/R Mirror',
    notesRu: 'Волнистые боковые пряди, обрамляющие скулы (платина -> лаванда). Привязаны к голове.'
  },
  {
    id: 'psd-31',
    drawOrder: 510,
    layerName: 'HAIR_SIDE_ShoulderCurl_L / R',
    groupPath: '08_HAIR_SIDE',
    category: 'HAIR_SIDE',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'L/R Mirror',
    notesRu: 'Нижние волнистые завитки над плечами (скользят поверх кардигана при поворотах).'
  },

  // 8. Hands & Arms (Bust-Up Gestures) (Draw Order: 480-440)
  {
    id: 'psd-32',
    drawOrder: 480,
    layerName: 'ARM_Hand_Think_R',
    groupPath: '09_ARMS_HANDS / Gestures',
    category: 'ARMS_HANDS',
    blendMode: 'Normal',
    opacity: 0,
    symmetry: 'Single',
    notesRu: 'Кисть руки у подбородка для состояния Thinking (переключается параметром ParamHandGesture).'
  },
  {
    id: 'psd-33',
    drawOrder: 475,
    layerName: 'ARM_Hand_Wave_L',
    groupPath: '09_ARMS_HANDS / Gestures',
    category: 'ARMS_HANDS',
    blendMode: 'Normal',
    opacity: 0,
    symmetry: 'Single',
    notesRu: 'Приветственная открытая ладонь на уровне плеча (состояния Greeting / Farewell).'
  },

  // 9. Neck, Turtleneck & Cardigan Shoulders (Draw Order: 420-320)
  {
    id: 'psd-34',
    drawOrder: 420,
    layerName: 'OUTFIT_Cardigan_GlowTrim_Add',
    groupPath: '10_TORSO_OUTFIT / Cardigan',
    category: 'NECK_OUTFIT',
    blendMode: 'Add',
    opacity: 85,
    symmetry: 'L/R Mirror',
    notesRu: 'Светящийся оптоволоконный фиолетовый кант на лацканах и плечевых швах (#A855F7).'
  },
  {
    id: 'psd-35',
    drawOrder: 400,
    layerName: 'OUTFIT_Cardigan_FrontPanel_L / R',
    groupPath: '10_TORSO_OUTFIT / Cardigan',
    category: 'NECK_OUTFIT',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'L/R Mirror',
    notesRu: 'Левая и правая полочки молочно-белого кардигана, перекрывающие края водолазки.'
  },
  {
    id: 'psd-36',
    drawOrder: 390,
    layerName: 'OUTFIT_Cardigan_Shoulder_L / R',
    groupPath: '10_TORSO_OUTFIT / Cardigan',
    category: 'NECK_OUTFIT',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'L/R Mirror',
    notesRu: 'Плечевые блоки и верх рукавов (Bust-Up срез). Двигаются от ParamShoulder и ParamArmL/R.'
  },
  {
    id: 'psd-37',
    drawOrder: 360,
    layerName: 'OUTFIT_Turtleneck_Collar',
    groupPath: '10_TORSO_OUTFIT / Turtleneck',
    category: 'NECK_OUTFIT',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'Single',
    notesRu: 'Высокий воротник-стойка лавандовой водолазки в рубчик — надёжно закрывает стык шеи и груди.'
  },
  {
    id: 'psd-38',
    drawOrder: 350,
    layerName: 'OUTFIT_Turtleneck_Chest',
    groupPath: '10_TORSO_OUTFIT / Turtleneck',
    category: 'NECK_OUTFIT',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'Single',
    notesRu: 'Грудная часть водолазки с вертикальными линиями рубчика (привязана к ParamBreath).'
  },
  {
    id: 'psd-39',
    drawOrder: 330,
    layerName: 'NECK_Shadow_Chin_Mul',
    groupPath: '10_TORSO_OUTFIT / Neck',
    category: 'NECK_OUTFIT',
    blendMode: 'Multiply',
    opacity: 50,
    clippingMask: 'NECK_Base',
    symmetry: 'Single',
    notesRu: 'Мягкая тень под подбородком на шее (#D8B4FE), сжимается при запрокидывании головы вверх.'
  },
  {
    id: 'psd-40',
    drawOrder: 320,
    layerName: 'NECK_Base',
    groupPath: '10_TORSO_OUTFIT / Neck',
    category: 'NECK_OUTFIT',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'Single',
    notesRu: 'База шеи (удлинённый запас вниз под воротник на +40 px, чтобы не рвалась при наклонах).'
  },

  // 10. Back Hair & Inner Shadow (Bottom Draw Order: 200-150)
  {
    id: 'psd-41',
    drawOrder: 200,
    layerName: 'HAIR_BACK_InnerShadow_L / R',
    groupPath: '11_HAIR_BACK',
    category: 'HAIR_BACK',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'L/R Mirror',
    notesRu: 'Глубокий затенённый внутренний слой волос за шеей и ушами (#C4B5FD / #7C3AED).'
  },
  {
    id: 'psd-42',
    drawOrder: 150,
    layerName: 'HAIR_BACK_MainVolume',
    groupPath: '11_HAIR_BACK',
    category: 'HAIR_BACK',
    blendMode: 'Normal',
    opacity: 100,
    symmetry: 'Single',
    notesRu: 'Основная масса задних волнистых прядей до плеч (двигается в противофазе параллакса головы).'
  }
];

export const RIG_PARAMETERS: RigParameterSpec[] = [
  // Head
  {
    id: 'ParamAngleX',
    nameRu: 'Поворот головы влево / вправо',
    category: 'Head',
    min: -30,
    defaultVal: 0,
    max: 30,
    keyforms: '-30, 0, +30',
    affectedLayersAndDeformers: 'Head_Root_Warp, Face_Features_Warp, Hair_Front/Side/Back_Warp, Ears (X-параллакс)'
  },
  {
    id: 'ParamAngleY',
    nameRu: 'Наклон головы вниз / вверх',
    category: 'Head',
    min: -30,
    defaultVal: 0,
    max: 30,
    keyforms: '-30, 0, +30',
    affectedLayersAndDeformers: 'Head_Root_Warp, Face_Features_Warp, Chin_Shadow, Hair_Back (вертикальный параллакс)'
  },
  {
    id: 'ParamAngleZ',
    nameRu: 'Наклон головы к левому / правому плечу',
    category: 'Head',
    min: -30,
    defaultVal: 0,
    max: 30,
    keyforms: '-30, 0, +30',
    affectedLayersAndDeformers: 'Head_Rotation (Rotation Deformer вокруг основания шеи)'
  },

  // Eyes
  {
    id: 'ParamEyeLOpen',
    nameRu: 'Открытие левого глаза',
    category: 'Eyes',
    min: 0,
    defaultVal: 1,
    max: 1.2,
    keyforms: '0 (закрыт), 0.7 (прищур), 1 (норма), 1.2 (удивление)',
    affectedLayersAndDeformers: 'EYE_L_Eyelash_Upper, EYE_L_Eyelid_Upper_Skin, EYE_L_Sclera'
  },
  {
    id: 'ParamEyeROpen',
    nameRu: 'Открытие правого глаза',
    category: 'Eyes',
    min: 0,
    defaultVal: 1,
    max: 1.2,
    keyforms: '0 (закрыт / wink), 0.7, 1, 1.2',
    affectedLayersAndDeformers: 'EYE_R_Eyelash_Upper, EYE_R_Eyelid_Upper_Skin, EYE_R_Sclera'
  },
  {
    id: 'ParamEyeLSmile',
    nameRu: 'Улыбка левым глазом',
    category: 'Eyes',
    min: 0,
    defaultVal: 0,
    max: 1,
    keyforms: '0 (нейтраль), 1 (дуга счастья)',
    affectedLayersAndDeformers: 'EYE_L_Eyelash_Lower, EYE_L_Eyelid_Lower_Skin, EYE_L_Eyelash_Upper_Wing'
  },
  {
    id: 'ParamEyeRSmile',
    nameRu: 'Улыбка правым глазом',
    category: 'Eyes',
    min: 0,
    defaultVal: 0,
    max: 1,
    keyforms: '0 (нейтраль), 1 (дуга счастья)',
    affectedLayersAndDeformers: 'EYE_R_Eyelash_Lower, EYE_R_Eyelid_Lower_Skin, EYE_R_Eyelash_Upper_Wing'
  },
  {
    id: 'ParamEyeBallX',
    nameRu: 'Движение зрачков по горизонтали',
    category: 'Eyes',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1 (влево), 0 (центр), +1 (вправо)',
    affectedLayersAndDeformers: 'IrisGroup_L/R_Warp (радужка + зрачок + лёгкое смещение бликов)'
  },
  {
    id: 'ParamEyeBallY',
    nameRu: 'Движение зрачков по вертикали',
    category: 'Eyes',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1 (вниз), 0 (центр), +1 (вверх)',
    affectedLayersAndDeformers: 'IrisGroup_L/R_Warp'
  },

  // Brows
  {
    id: 'ParamBrowLY',
    nameRu: 'Высота левой брови',
    category: 'Brows',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1, 0, +1',
    affectedLayersAndDeformers: 'Brow_L_Warp (вертикальное смещение)'
  },
  {
    id: 'ParamBrowRY',
    nameRu: 'Высота правой брови',
    category: 'Brows',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1, 0, +1',
    affectedLayersAndDeformers: 'Brow_R_Warp (вертикальное смещение)'
  },
  {
    id: 'ParamBrowLX',
    nameRu: 'Сдвиг левой брови к переносице/виску',
    category: 'Brows',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1 (к центру), 0, +1 (к виску)',
    affectedLayersAndDeformers: 'Brow_L_Warp'
  },
  {
    id: 'ParamBrowRX',
    nameRu: 'Сдвиг правой брови к переносице/виску',
    category: 'Brows',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1 (к центру), 0, +1 (к виску)',
    affectedLayersAndDeformers: 'Brow_R_Warp'
  },
  {
    id: 'ParamBrowLAngle',
    nameRu: 'Наклон левой брови (грусть / строгость)',
    category: 'Brows',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1 (нахмурена), 0, +1 (домиком/грусть)',
    affectedLayersAndDeformers: 'Brow_L_Rotation'
  },
  {
    id: 'ParamBrowRAngle',
    nameRu: 'Наклон правой брови (грусть / строгость)',
    category: 'Brows',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1 (нахмурена), 0, +1 (домиком/грусть)',
    affectedLayersAndDeformers: 'Brow_R_Rotation'
  },
  {
    id: 'ParamBrowLForm',
    nameRu: 'Изгиб формы левой брови',
    category: 'Brows',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1 (ломаная), 0 (мягкая дуга), +1 (высокий свод)',
    affectedLayersAndDeformers: 'BROW_Line_L (сетка арт-меша)'
  },
  {
    id: 'ParamBrowRForm',
    nameRu: 'Изгиб формы правой брови',
    category: 'Brows',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1, 0, +1',
    affectedLayersAndDeformers: 'BROW_Line_R (сетка арт-меша)'
  },

  // Mouth & Cheek
  {
    id: 'ParamMouthOpenY',
    nameRu: 'Открытие рта по вертикали (липсинк)',
    category: 'Mouth',
    min: 0,
    defaultVal: 0,
    max: 1,
    keyforms: '0 (закрыт), 0.35 (И), 0.6 (Э), 0.85 (А/О), 1 (смех)',
    affectedLayersAndDeformers: 'MOUTH_Lip_Upper/Lower, MOUTH_Inner_Cavity, MOUTH_Tongue, MOUTH_Teeth'
  },
  {
    id: 'ParamMouthForm',
    nameRu: 'Форма рта (грусть / улыбка / округление)',
    category: 'Mouth',
    min: -1,
    defaultVal: 0.2,
    max: 1,
    keyforms: '-1 (грусть/У), 0 (нейтраль), +1 (широкая улыбка/И)',
    affectedLayersAndDeformers: 'Mouth_Root_Warp, MOUTH_Lip_Upper/Lower, MOUTH_Inner_Cavity'
  },
  {
    id: 'ParamCheek',
    nameRu: 'Румянец на щеках',
    category: 'Mouth',
    min: 0,
    defaultVal: 0.15,
    max: 1,
    keyforms: '0 (выкл), 0.15 (база), 0.5 (радость), 1.0 (смущение)',
    affectedLayersAndDeformers: 'FACE_Cheek_Blush_L / R (Opacity + лёгкое смещение щёк)'
  },

  // Body & Shoulders (Bust-Up)
  {
    id: 'ParamBodyAngleX',
    nameRu: 'Поворот плеч и торса влево/вправо',
    category: 'Body',
    min: -10,
    defaultVal: 0,
    max: 10,
    keyforms: '-10, 0, +10',
    affectedLayersAndDeformers: 'Body_Root_Warp, Neck_Base, Outfit_Cardigan_FrontPanels, Shoulders'
  },
  {
    id: 'ParamBodyAngleY',
    nameRu: 'Наклон корпуса вперёд/назад (кивок)',
    category: 'Body',
    min: -10,
    defaultVal: 0,
    max: 10,
    keyforms: '-10, 0, +10',
    affectedLayersAndDeformers: 'Body_Root_Warp, Turtleneck_Chest, Cardigan_GlowTrim'
  },
  {
    id: 'ParamBodyAngleZ',
    nameRu: 'Покачивание корпуса вбок',
    category: 'Body',
    min: -10,
    defaultVal: 0,
    max: 10,
    keyforms: '-10, 0, +10',
    affectedLayersAndDeformers: 'Body_Rotation (центр вращения в нижней границе Bust-Up кадра)'
  },
  {
    id: 'ParamBreath',
    nameRu: 'Цикл дыхания (грудь и плечи)',
    category: 'Body',
    min: 0,
    defaultVal: 0,
    max: 1,
    keyforms: '0 (выдох), 1 (вдох)',
    affectedLayersAndDeformers: 'Turtleneck_Chest_Warp, Cardigan_Shoulders (подъём +3px и расширение)'
  },
  {
    id: 'ParamShoulder',
    nameRu: 'Подъём / опускание плеч (эмоции)',
    category: 'Body',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1 (грусть/опущены), 0, +1 (вздох/удивление)',
    affectedLayersAndDeformers: 'OUTFIT_Cardigan_Shoulder_L / R, HAIR_SIDE_ShoulderCurl'
  },
  {
    id: 'ParamArmL',
    nameRu: 'Положение левого плеча и жест (Wave)',
    category: 'Body',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1, 0 (A-pose/вниз), +1 (подъём руки в кадр)',
    affectedLayersAndDeformers: 'Arm_L_Rotation, ARM_Hand_Wave_L (Opacity/Warp)'
  },
  {
    id: 'ParamArmR',
    nameRu: 'Положение правого плеча и жест (Think)',
    category: 'Body',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1, 0 (вниз), +1 (кисть у подбородка)',
    affectedLayersAndDeformers: 'Arm_R_Rotation, ARM_Hand_Think_R (Opacity/Warp)'
  },

  // Hair Physics Outputs
  {
    id: 'ParamHairFront',
    nameRu: 'Физика передней чёлки и ахоге',
    category: 'Hair',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1 (влево), 0, +1 (вправо) + вторичный маятник Y',
    affectedLayersAndDeformers: 'Hair_Front_Physics_Warp, Hair_Ahoge_Rotation'
  },
  {
    id: 'ParamHairSide',
    nameRu: 'Физика волнистых боковых прядей у плеч',
    category: 'Hair',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1, 0, +1 (3-звенный волновой изгиб)',
    affectedLayersAndDeformers: 'Hair_Side_L/R_Physics_Warp, HAIR_SIDE_ShoulderCurl'
  },
  {
    id: 'ParamHairBack',
    nameRu: 'Физика задней массы волос',
    category: 'Hair',
    min: -1,
    defaultVal: 0,
    max: 1,
    keyforms: '-1, 0, +1',
    affectedLayersAndDeformers: 'Hair_Back_Physics_Warp, HAIR_BACK_MainVolume'
  }
];

export const DEFORMER_HIERARCHY: DeformerNode[] = [
  {
    id: 'def-root',
    name: 'Master_BustUp_Root',
    type: 'Warp',
    parentId: null,
    boundParams: ['Global Scale / Position'],
    descriptionRu: 'Корневой контейнер модели (4096×4096). Позиционирует центр грудной клетки.',
    children: [
      {
        id: 'def-body-rot',
        name: 'Body_AngleZ_Rotation',
        type: 'Rotation',
        parentId: 'def-root',
        boundParams: ['ParamBodyAngleZ'],
        descriptionRu: 'Точка опоры в нижней части груди; отвечает за плавные покачивания вправо/влево.',
        children: [
          {
            id: 'def-body-warp',
            name: 'Body_AngleXY_Warp',
            type: 'Warp',
            parentId: 'def-body-rot',
            boundParams: ['ParamBodyAngleX', 'ParamBodyAngleY', 'ParamBreath'],
            descriptionRu: 'Псевдо-3D перспектива плечевого пояса, грудной клетки и лацканов кардигана.',
            children: [
              {
                id: 'def-shoulders',
                name: 'Shoulders_And_Arms_Warp',
                type: 'Warp',
                parentId: 'def-body-warp',
                boundParams: ['ParamShoulder', 'ParamArmL', 'ParamArmR'],
                descriptionRu: 'Независимое движение левого/правого плеча, швов кардигана и жестов кистей.'
              },
              {
                id: 'def-neck',
                name: 'Neck_Pivot_Warp',
                type: 'Warp',
                parentId: 'def-body-warp',
                boundParams: ['ParamAngleX (30%)', 'ParamAngleY (20%)'],
                descriptionRu: 'Шея и воротник-стойка водолазки (мягкое смещение вслед за головой).'
              },
              {
                id: 'def-head-rot',
                name: 'Head_AngleZ_Rotation',
                type: 'Rotation',
                parentId: 'def-body-warp',
                boundParams: ['ParamAngleZ'],
                descriptionRu: 'Pivot расположен у основания затылка (переход шеи в челюсть).',
                children: [
                  {
                    id: 'def-head-warp',
                    name: 'Head_AngleXY_Warp',
                    type: 'Warp',
                    parentId: 'def-head-rot',
                    boundParams: ['ParamAngleX', 'ParamAngleY'],
                    descriptionRu: 'Главный деформер головы ±30°: формирует 2.5D объём черепа, ушей и овала лица.',
                    children: [
                      {
                        id: 'def-face-features',
                        name: 'Face_Features_Parallax_Warp',
                        type: 'Warp',
                        parentId: 'def-head-warp',
                        boundParams: ['ParamAngleX', 'ParamAngleY'],
                        descriptionRu: 'Усиленный X/Y-сдвиг для носа, рта, глаз и бровей относительно контура лица.',
                        children: [
                          {
                            id: 'def-eyes',
                            name: 'Eye_L/R_Composite_Warp',
                            type: 'Warp',
                            parentId: 'def-face-features',
                            boundParams: ['ParamEyeLOpen/ROpen', 'ParamEyeLSmile/RSmile', 'ParamEyeBallX/Y'],
                            descriptionRu: 'Склейка склеры, радужки, ресниц и бликов.'
                          },
                          {
                            id: 'def-mouth',
                            name: 'Mouth_Viseme_Warp',
                            type: 'Warp',
                            parentId: 'def-face-features',
                            boundParams: ['ParamMouthOpenY', 'ParamMouthForm'],
                            descriptionRu: 'Двумерная матрица артикуляции рта (A/I/U/E/O/Closed).'
                          }
                        ]
                      },
                      {
                        id: 'def-hair-front',
                        name: 'Hair_Front_And_Ahoge_Warp',
                        type: 'Warp',
                        parentId: 'def-head-warp',
                        boundParams: ['ParamAngleX/Y', 'ParamHairFront'],
                        descriptionRu: 'Чёлка + Rotation-деформер ахоге (максимальный положительный параллакс).'
                      },
                      {
                        id: 'def-hair-side',
                        name: 'Hair_Side_Pendulum_Warp (L/R)',
                        type: 'Warp',
                        parentId: 'def-head-warp',
                        boundParams: ['ParamHairSide', 'ParamShoulder (коллизия)'],
                        descriptionRu: 'Цепочка из 3 вложенных Warp-деформеров для волнистых боковых локонов у плеч.'
                      },
                      {
                        id: 'def-hair-back',
                        name: 'Hair_Back_Parallax_Warp',
                        type: 'Warp',
                        parentId: 'def-head-warp',
                        boundParams: ['ParamAngleX/Y (обратный)', 'ParamHairBack'],
                        descriptionRu: 'Отрицательный параллакс задних волос за шеей и плечами.'
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];

export const CUBISM_PHYSICS_GROUPS: PhysicsPendulumSpec[] = [
  {
    id: 'phys-hair-front',
    groupName: 'Physics_Hair_Front_Bangs',
    targetPartRu: 'Чёлка и боковые виски (HAIR_FRONT)',
    inputParams: ['ParamAngleX', 'ParamAngleZ', 'ParamBodyAngleX'],
    outputParam: 'ParamHairFront',
    pendulumCount: 2,
    pendulumLengths: '12.0 → 18.0',
    mass: 0.35,
    damping: 0.85,
    sensitivity: 0.72,
    fps: 60,
    notesRu: 'Короткий упругий маятник: чёлка лишь слегка покачивается при кивках, не закрывая глаза и брови.'
  },
  {
    id: 'phys-hair-ahoge',
    groupName: 'Physics_Hair_Ahoge',
    targetPartRu: 'Ахоге на макушке (HAIR_AHOGE_Main)',
    inputParams: ['ParamAngleY', 'ParamAngleZ', 'ParamBreath'],
    outputParam: 'ParamHairFront (Ahoge)',
    pendulumCount: 2,
    pendulumLengths: '10.0 → 15.0',
    mass: 0.2,
    damping: 0.76,
    sensitivity: 0.92,
    fps: 60,
    notesRu: 'Лёгкий и живой отклик (низкое затухание 0.76) — ахоге мило пружинит при смехе, удивлении и дыхании.'
  },
  {
    id: 'phys-hair-side',
    groupName: 'Physics_Hair_Side_Curls',
    targetPartRu: 'Волнистые боковые пряди до плеч (HAIR_SIDE L/R)',
    inputParams: ['ParamAngleX', 'ParamAngleZ', 'ParamBodyAngleX', 'ParamShoulder'],
    outputParam: 'ParamHairSide',
    pendulumCount: 3,
    pendulumLengths: '16.0 → 22.0 → 26.0',
    mass: 0.55,
    damping: 0.88,
    sensitivity: 0.8,
    fps: 60,
    notesRu: '3-звенный маятник создаёт плавную «S-волну» локонов вдоль плеч без резкого дёрганья.'
  },
  {
    id: 'phys-hair-back',
    groupName: 'Physics_Hair_Back_Volume',
    targetPartRu: 'Задняя масса волос (HAIR_BACK)',
    inputParams: ['ParamAngleX', 'ParamAngleZ', 'ParamBodyAngleZ'],
    outputParam: 'ParamHairBack',
    pendulumCount: 2,
    pendulumLengths: '20.0 → 28.0',
    mass: 0.75,
    damping: 0.92,
    sensitivity: 0.65,
    fps: 60,
    notesRu: 'Более тяжёлый маятник с высоким затуханием (0.92) придаёт задним волосам естественную инерцию массы.'
  },
  {
    id: 'phys-outfit-cardigan',
    groupName: 'Physics_Outfit_Cardigan_Collar',
    targetPartRu: 'Лацканы кардигана и светящийся кант (OUTFIT_Cardigan)',
    inputParams: ['ParamBodyAngleX', 'ParamBodyAngleY', 'ParamBreath', 'ParamShoulder'],
    outputParam: 'ParamOutfitSway',
    pendulumCount: 2,
    pendulumLengths: '14.0 → 18.0',
    mass: 0.85,
    damping: 0.95,
    sensitivity: 0.45,
    fps: 60,
    notesRu: 'Плотный трикотаж имеет минимальную амплитуду и максимальное затухание (0.95) — лёгкий живой микросдвиг при дыхании.'
  },
  {
    id: 'phys-eye-highlights',
    groupName: 'Physics_Eye_Highlights_Jiggle',
    targetPartRu: 'Микро-дрожание бликов в глазах (Highlights)',
    inputParams: ['ParamEyeBallX', 'ParamEyeBallY', 'ParamEyeLOpen'],
    outputParam: 'ParamEyeHighlightBounce',
    pendulumCount: 1,
    pendulumLengths: '8.0',
    mass: 0.15,
    damping: 0.72,
    sensitivity: 0.85,
    fps: 60,
    notesRu: 'Делает взгляд Алисы по-настоящему «живым» при быстрых саккадах и моргании.'
  }
];
