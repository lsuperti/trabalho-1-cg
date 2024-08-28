"use strict";


import { createNoise2D } from './node_modules/simplex-noise/dist/esm/simplex-noise.js';
import { renderObject, importOBJ as importOBJ } from './importer.js';

let floor;
let windmill;
let chair;
let demoDesk;
let debugPlane;
let debugAxis;
let debugGlobalAxis;
let debugArrow;
let debugSquare;
let debugCircle;
let debugCube;
let debugSphere;
let blueNoiseOuterGridCell;
let blueNoiseInnerGridCell;
let debugCompassRose;
let debugRedSquare;
let debugGreenSquare;
let debugBlueSquare;
let debugYellowSquare;
let lampBody;
let lampHead;
let debugLampHead;
let antiqueLampBody;
let antiqueLampHead;
let antiqueLampDebugHead;
let deskBar;
let deskTopTile;
let keys;
let waterBottle;
let notepad;
let coffeeMugLarge;
let coffeeMugEspresso;
let memoBlock;
let pencilHolder;
let glasses;
let clipboard;
let smartphone;
let drawingTablet;
let charger;
let headphones;
let drone;
let camera;
let laptop;
let hardDrive;
let antiqueBookLarge;
let antiqueBookSmall;
let candleHolder;
let goblet;
let antiqueGlobe;
let antiqueClockLarge;
let antiqueClockSmall;
let telephone;
let teschinYazik;
let cactus;
let stoneTrophy;
let woodMannequin;

// Get A WebGL context
/** @type {HTMLCanvasElement} */
const canvas = document.querySelector("#canvas");
const gl = canvas.getContext("webgl2");
if (!gl) {
  throw new Error("WebGL2 is not supported");
}

// Tell the twgl to match position with a_position etc..
twgl.setAttributePrefix("a_");

const vs = /*glsl*/ `#version 300 es
in vec4 a_position;
in vec3 a_normal;
in vec3 a_tangent;
in vec2 a_texcoord;
in vec4 a_color;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform mat4 u_textureMatrix;
uniform vec3 u_viewWorldPosition;

out vec3 v_normal;
out vec3 v_tangent;
out vec3 v_surfaceToView;

out vec2 v_texcoord;
out vec4 v_color;
out vec4 v_projectedTexcoord;

void main() {
  // Multiply the position by the matrix.
  vec4 worldPosition = u_world * a_position;

  gl_Position = u_projection * u_view * worldPosition;
  v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;

  // orient the normals and pass to the fragment shader
  mat3 normalMat = mat3(u_world);
  v_normal = normalize(normalMat * a_normal);
  v_tangent = normalize(normalMat * a_tangent);

  // Pass the texture coord to the fragment shader.
  v_texcoord = a_texcoord;
  
  // Pass the color to the fragment shader.
  v_color = a_color;
  
  v_projectedTexcoord = u_textureMatrix * worldPosition;
}
`;

const fs = /*glsl*/ `#version 300 es
precision highp float;

// Passed in from the vertex shader.
in vec3 v_normal;
in vec3 v_tangent;
in vec3 v_surfaceToView;
in vec2 v_texcoord;
in vec4 v_color;
in vec4 v_projectedTexcoord;

uniform vec3 diffuse;
uniform sampler2D diffuseMap;
uniform vec3 ambient;
uniform vec3 emissive;
uniform sampler2D emissiveMap;
uniform vec3 specular;
uniform sampler2D specularMap;
uniform float shininess;
uniform sampler2D normalMap;
uniform float opacity;
uniform vec3 u_lightDirection;
uniform vec3 u_ambientLight;
uniform vec4 u_colorMult;
uniform sampler2D u_texture;
uniform sampler2D u_projectedTexture;
uniform float u_blurKernelRadius;
uniform float u_sampling;
uniform float u_bias;
uniform vec3 u_reverseLightDirection;
uniform int u_shadowType;

out vec4 outColor;

#define M_PI 3.1415926535897932384626433832795

float hardShadow(bool inRange, float projectedDepth, vec3 projectedTexcoord, float currentDepth) {
  float shadowLight = 0.0;
  if (inRange) {
    shadowLight = currentDepth > projectedDepth ? 0.0 : 1.0;
  } else {
    shadowLight = 1.0; // Set shadowLight to 1.0 outside of the light projection
  }
  return shadowLight;
}

float circlePcfShadow(bool inRange, float projectedDepth, vec3 projectedTexcoord, float currentDepth) {
  float shadowLight = 0.0;
  if (inRange) {
    float angle = 2.0 * M_PI / u_sampling;
    for (float i = 0.0; i < u_sampling; i++) {
      vec2 offset = vec2(cos(i * angle), sin(i * angle)) * u_blurKernelRadius;
      float sampleDepth = texture(u_projectedTexture, projectedTexcoord.xy + offset).r;
      shadowLight += currentDepth > sampleDepth ? 0.0 : 1.0;
    }
    shadowLight /= u_sampling;
  } else {
    shadowLight = 1.0; // Set shadowLight to 1.0 outside of the light projection
  }
  return shadowLight;
}

float boxPcfShadowShadow(bool inRange, float projectedDepth, vec3 projectedTexcoord, float currentDepth) {
  float shadowLight = 0.0;
  if (inRange) {
    for (float i = -u_sampling; i <= u_sampling; i++) {
      for (float j = -u_sampling; j <= u_sampling; j++) {
        vec2 offset = vec2(i, j) / u_sampling * u_blurKernelRadius;
        float sampleDepth = texture(u_projectedTexture, projectedTexcoord.xy + offset).r;
        shadowLight += currentDepth > sampleDepth ? 0.0 : 1.0;
      }
    }

    shadowLight /= (2.0 * u_sampling + 1.0) * (2.0 * u_sampling + 1.0);
  } else {
    shadowLight = 1.0; // Set shadowLight to 1.0 outside of the light projection
  }
  return shadowLight;
}

void main() {
  vec3 normal = normalize(v_normal) * ( float( gl_FrontFacing ) * 2.0 - 1.0 );
  vec3 tangent = normalize(v_tangent) * ( float( gl_FrontFacing ) * 2.0 - 1.0 );
  vec3 bitangent = normalize(cross(normal, tangent));

  vec3 projectedTexcoord = v_projectedTexcoord.xyz / v_projectedTexcoord.w;
  float currentDepth = projectedTexcoord.z + u_bias;

  mat3 tbn = mat3(tangent, bitangent, normal);
  normal = texture(normalMap, v_texcoord).rgb * 2. - 1.;
  normal = normalize(tbn * normal);

  vec3 surfaceToViewDirection = normalize(v_surfaceToView);
  vec3 halfVector = normalize(u_lightDirection + surfaceToViewDirection);

  float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
  float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);
  vec4 specularMapColor = texture(specularMap, v_texcoord);
  vec3 effectiveSpecular = specular * specularMapColor.rgb;
  vec3 effectiveEmissive = emissive * texture(emissiveMap, v_texcoord).rgb;

  vec4 diffuseMapColor = texture(diffuseMap, v_texcoord);
  vec3 effectiveDiffuse = diffuse * diffuseMapColor.rgb * v_color.rgb;
  float effectiveOpacity = opacity * diffuseMapColor.a * v_color.a;

  bool inRange =
      projectedTexcoord.x >= 0.0 &&
      projectedTexcoord.x <= 1.0 &&
      projectedTexcoord.y >= 0.0 &&
      projectedTexcoord.y <= 1.0;

  // the 'r' channel has the depth values
  float projectedDepth = texture(u_projectedTexture, projectedTexcoord.xy).r;

  float shadowLight;

  switch (u_shadowType) {
    case 1:
      shadowLight = hardShadow(inRange, projectedDepth, projectedTexcoord, currentDepth);
      break;
    case 2:
      shadowLight = circlePcfShadow(inRange, projectedDepth, projectedTexcoord, currentDepth);
      break;
    case 3:
      shadowLight = boxPcfShadowShadow(inRange, projectedDepth, projectedTexcoord, currentDepth);
      break;
    default:
      // no shadow
      shadowLight = 1.0;
  }

  const float minShadow = 0.25;

  outColor = vec4(
      effectiveEmissive +
      ambient * u_ambientLight +
      effectiveDiffuse * fakeLight * (minShadow + (shadowLight * (1.0 - minShadow))) +
      effectiveSpecular * pow(specularLight, shininess),
      effectiveOpacity);
}

`;

const colorVS = /*glsl*/ `#version 300 es
in vec4 a_position;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;

void main() {
  // Multiply the position by the matrices.
  gl_Position = u_projection * u_view * u_world * a_position;
}
`;

const colorFS = /*glsl*/ `#version 300 es
precision highp float;

uniform vec4 u_color;

out vec4 outColor;

void main() {
  outColor = u_color;
}
`;

// setup GLSL programs
// note: Since we're going to use the same VAO with multiple
// shader programs we need to make sure all programs use the
// same attribute locations. There are 2 ways to do that.
// (1) assign them in GLSL. (2) assign them by calling `gl.bindAttribLocation`
// before linking. We're using method 2 as it's more. D.R.Y.
const programOptions = {
  attribLocations: {
    'a_position': 0,
    'a_normal':   1,
    'a_texcoord': 2,
    'a_color':    3,
  },
};
const meshProgramInfo = twgl.createProgramInfo(gl, [vs, fs], programOptions);
const colorProgramInfo = twgl.createProgramInfo(gl, [colorVS, colorFS], programOptions);

function createDepthTexture(depthTextureSize) {
  const depthTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(
    gl.TEXTURE_2D, // target
    0, // mip level
    gl.DEPTH_COMPONENT32F, // internal format
    depthTextureSize, // width
    depthTextureSize, // height
    0, // border
    gl.DEPTH_COMPONENT, // format
    gl.FLOAT, // type
    null); // data
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return depthTexture;
}

async function loadObjects(objectLoadedCallback, allObjectsLoadedCallback) {
  objectLoadedCallback = objectLoadedCallback || (() => {});
  allObjectsLoadedCallback = allObjectsLoadedCallback || (() => {});

  const objectPaths = [
    // Scene objects
    "./assets/floor/floor.obj",

    // "objects" demo objects
    "./assets/windmill/windmill.obj",
    "./assets/chair/chair.obj",
    "./assets/demoDesk/desk.obj",

    // Debug objects
    "./assets/debug/plane/debugPlane.obj",
    "./assets/debug/axis/debugAxisV2.obj",
    "./assets/debug/axis/debugGlobalAxis.obj",
    "./assets/debug/arrow/debugArrow.obj",
    "./assets/debug/square/debugSquare.obj",
    "./assets/debug/circle/debugCircle.obj",
    "./assets/debug/cube/debugCube.obj",
    "./assets/debug/sphere/debugSphere.obj",
    "./assets/debug/blueNoise/blueNoiseOuterGridCell.obj",
    "./assets/debug/blueNoise/blueNoiseInnerGridCell.obj",
    "./assets/debug/compassRose/debugCompassRose.obj",
    "./assets/debug/areaSquare/red.obj",
    "./assets/debug/areaSquare/green.obj",
    "./assets/debug/areaSquare/blue.obj",
    "./assets/debug/areaSquare/yellow.obj",

    // Lamp objects
    "./assets/lamp/body.obj",
    "./assets/lamp/head.obj",
    "./assets/lamp/debugHead.obj",
    "./assets/antiqueLamp/body.obj",
    "./assets/antiqueLamp/head.obj",
    "./assets/antiqueLamp/debugHead.obj",

    // Desk objects
    "./assets/desk/bar.obj",
    "./assets/desk/topTile.obj",

    // Office biome objects
    "./assets/keys/keys.obj",
    "./assets/waterBottle/waterBottle.obj",
    "./assets/notepad/notepad.obj",
    "./assets/coffeeMug/large/large.obj",
    "./assets/coffeeMug/espresso/espresso.obj",
    "./assets/memoBlock/memoBlock.obj",
    "./assets/pencilHolder/pencilHolder.obj",
    "./assets/glasses/glasses.obj",
    "./assets/clipboard/clipboard.obj",

    // Gadgets biome objects
    "./assets/smartphone/smartphone.obj",
    "./assets/drawingTablet/drawingTablet.obj",
    "./assets/charger/charger.obj",
    "./assets/headphones/headphones.obj",
    "./assets/drone/drone.obj",
    "./assets/camera/camera.obj",
    "./assets/laptop/laptop.obj",
    "./assets/hardDrive/hardDrive.obj",

    // Antique biome objects
    "./assets/antiqueBook/large.obj",
    "./assets/antiqueBook/small.obj",
    "./assets/candleHolder/candleHolder.obj",
    "./assets/goblet/goblet.obj",
    "./assets/antiqueGlobe/antiqueGlobe.obj",
    "./assets/antiqueClock/large.obj",
    "./assets/antiqueClock/small.obj",
    "./assets/telephone/telephone.obj",

    // Decorations biome objects
    "./assets/plants/teschinYazik.obj",
    "./assets/plants/cactus.obj",
    "./assets/stoneTrophy/stoneTrophy.obj",
    "./assets/woodMannequin/woodMannequin.obj"
  ];

  const totalObjects = objectPaths.length;
  let objectsToLoad = totalObjects;

  function onObjectLoad() {
    objectsToLoad--;
    
    objectLoadedCallback(objectsToLoad, totalObjects);
    
    if (objectsToLoad === 0) {
      allObjectsLoadedCallback();
    }
  }

  const objectPromises = objectPaths.map(path => importOBJ(path, gl, meshProgramInfo, onObjectLoad));

  const objects = await Promise.all(objectPromises);

  [
    floor,
    windmill,
    chair,
    demoDesk,
    debugPlane,
    debugAxis,
    debugGlobalAxis,
    debugArrow,
    debugSquare,
    debugCircle,
    debugCube,
    debugSphere,
    blueNoiseOuterGridCell,
    blueNoiseInnerGridCell,
    debugCompassRose,
    debugRedSquare,
    debugGreenSquare,
    debugBlueSquare,
    debugYellowSquare,
    lampBody,
    lampHead,
    debugLampHead,
    antiqueLampBody,
    antiqueLampHead,
    antiqueLampDebugHead,
    deskBar,
    deskTopTile,
    keys,
    waterBottle,
    notepad,
    coffeeMugLarge,
    coffeeMugEspresso,
    memoBlock,
    pencilHolder,
    glasses,
    clipboard,
    smartphone,
    drawingTablet,
    charger,
    headphones,
    drone,
    camera,
    laptop,
    hardDrive,
    antiqueBookLarge,
    antiqueBookSmall,
    candleHolder,
    goblet,
    antiqueGlobe,
    antiqueClockLarge,
    antiqueClockSmall,
    telephone,
    teschinYazik,
    cactus,
    stoneTrophy,
    woodMannequin
  ] = objects;
}

async function main() {
  let seed = Math.random();
  let cameraLookAt = [0, 1, 0];
  let cameraPosition = [0, 2.5, 2];
  let lightPosition = [2, 2, -1];
  let lightTarget = [0, 0.5, 0];
  let shadowType = 2;
  let shadowBlurKernelRadius = 0.01;
  let shadowBlurSampling = 3;
  let lightProjWidth = 3;
  let lightProjHeight = 2;
  let lightPerspective = true;
  let lightFieldOfView = 60;
  let shadowBias = -0.006;
  let depthTextureSize = 1024;

  const defaultParams = {
    deskWidth: 2.5,
    deskHeight: 1,
    deskDepth: 1.5,
    
    objectSpacing: 0.5,
    objectPadding: 0.1,

    majorObjectIncidence: 0.25,
    minorObjectGridSubdivisionCuts: 2,

    biomeMapScale: 2.5,

    maxLampDistance: 0.75,

    officeBiome: true,
    gadgetsBiome: true,
    antiquesBiome: true,
    decorationsBiome: true,

    renderBlueNoiseBounds: false,
    renderBlueNoisePlaceholders: false,
    renderBiomeMap: false,
    renderMajorObjects: true,
    renderMinorObjects: true,
  };

  let renderDeskLegs = true;
  let renderDeskTop = true;
  let renderDebugObjects = true;
  let renderWorldAxis = false;
  let useLampDebugHead = false;

  document.getElementById("camera-x").value = cameraPosition[0];
  document.getElementById("camera-y").value = cameraPosition[1];
  document.getElementById("camera-z").value = cameraPosition[2];
  document.getElementById("look-at-x").value = cameraLookAt[0];
  document.getElementById("look-at-y").value = cameraLookAt[1];
  document.getElementById("look-at-z").value = cameraLookAt[2];
  document.getElementById("seed").value = seed;
  document.getElementById("desk-width").value = defaultParams.deskWidth;
  document.getElementById("desk-height").value = defaultParams.deskHeight;
  document.getElementById("desk-depth").value = defaultParams.deskDepth;
  document.getElementById("object-spacing").value = defaultParams.objectSpacing;
  document.getElementById("object-padding").value = defaultParams.objectPadding;
  document.getElementById("major-object-incidence").value = defaultParams.majorObjectIncidence;
  document.getElementById("minor-object-grid-subdiviosions").value = defaultParams.minorObjectGridSubdivisionCuts;
  document.getElementById("biome-map-scale").value = defaultParams.biomeMapScale;
  document.getElementById("desk-legs").checked = renderDeskLegs;
  document.getElementById("desk-top").checked = renderDeskTop;
  document.getElementById("max-lamp-distance").value = defaultParams.maxLampDistance;
  document.getElementById("office-biome").checked = defaultParams.officeBiome
  document.getElementById("gadgets-biome").checked = defaultParams.gadgetsBiome
  document.getElementById("antiques-biome").checked = defaultParams.antiquesBiome
  document.getElementById("decorations-biome").checked = defaultParams.decorationsBiome
  document.getElementById("light-x").value = lightPosition[0];
  document.getElementById("light-y").value = lightPosition[1];
  document.getElementById("light-z").value = lightPosition[2];
  document.getElementById("light-target-x").value = lightTarget[0];
  document.getElementById("light-target-y").value = lightTarget[1];
  document.getElementById("light-target-z").value = lightTarget[2];
  document.getElementById("shadow-type").value = "circle-pcf";
  document.getElementById("shadow-blur-kernel").value = shadowBlurKernelRadius;
  document.getElementById("shadow-sampling").value = shadowBlurSampling;
  document.getElementById("light-proj-width").value = lightProjWidth;
  document.getElementById("light-proj-height").value = lightProjHeight;
  document.getElementById("light-perspective").checked = lightPerspective;
  document.getElementById("light-fov").value = lightFieldOfView;
  document.getElementById("shadow-bias").value = shadowBias;
  document.getElementById("depth-texture-size").value = depthTextureSize;
  document.getElementById("render-debug-objects").checked = renderDebugObjects;
  document.getElementById("world-axis").checked = renderWorldAxis;
  document.getElementById("lamp-debug").checked = useLampDebugHead;
  document.getElementById("blue-noise-bounds").checked = defaultParams.renderBlueNoiseBounds;
  document.getElementById("blue-noise-placeholders").checked = defaultParams.renderBlueNoisePlaceholders;
  document.getElementById("biome-map").checked = defaultParams.renderBiomeMap;
  document.getElementById("major-objects").checked = defaultParams.renderMajorObjects;
  document.getElementById("minor-objects").checked = defaultParams.renderMinorObjects;

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  const minorOffice = [
    { object: keys, needsLight: false, type: "generic", rotationRange: Math.PI * 2},
    { object: waterBottle, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
    { object: coffeeMugLarge, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
    { object: coffeeMugEspresso, needsLight: false, type: "generic", rotationRange: Math.PI * 2},
    { object: memoBlock, needsLight: false, type: "generic", rotationRange: Math.PI * 2 / 5 },
    { object: pencilHolder, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
    { object: glasses, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
  ];
  
  const minorGadgets = [
    { object: smartphone, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
    { object: charger, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
    { object: headphones, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
    { object: drone, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
    { object: camera, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
    { object: hardDrive, needsLight: false, type: "generic", rotationRange: Math.PI / 5 },
  ];
  
  const minorAntiques = [
    { object: antiqueBookSmall, needsLight: false, type: "generic", rotationRange: Math.PI / 5 },
    { object: candleHolder, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
    { object: goblet, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
    { object: antiqueGlobe, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
    { object: antiqueClockSmall, needsLight: false, type: "generic", rotationRange: Math.PI / 5 },
    { object: telephone, needsLight: false, type: "generic", rotationRange: Math.PI / 5 },
  ]
  
  const minorDecorations = [
    { object: teschinYazik, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
    { object: cactus, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
    { object: stoneTrophy, needsLight: false, type: "generic", rotationRange: Math.PI / 5 },
    { object: woodMannequin, needsLight: false, type: "generic", rotationRange: Math.PI * 2 },
  ];
  
  const minorGenericObjects = [{ needsLight: false, type: "lamp" }];

  const majorOffice = [
    { object: notepad, needsLight: true, type: "generic", rotationRange: Math.PI / 10 },
    { object: clipboard, needsLight: true, type: "generic", rotationRange: Math.PI / 10 },
  ]

  const majorGadgets = [
    { object: drawingTablet, needsLight: false, type: "generic", rotationRange: Math.PI / 5 },
    { object: laptop, needsLight: false, type: "generic", rotationRange: Math.PI / 5 },
  ];

  const majorAntiques = [
    { object: antiqueBookLarge, needsLight: true, type: "generic", rotationRange: Math.PI / 10 },
    { object: antiqueClockLarge, needsLight: false, type: "generic", rotationRange: Math.PI / 10 },
  ]

  const majorDecorations = majorOffice;

  const majorGenericObjects = [];

  const debugBiomeSquares = [
    debugRedSquare,
    debugGreenSquare,
    debugBlueSquare,
    debugYellowSquare
  ]

  let animate = false;

  let cameraPositionOffset = [0, 0, 0];
  let mainObject = debugGlobalAxis;
  let zFarMultiplier = 1;
  let zNearDivisor = 1;
  
  let blueNoiseDemoPrng;
  let blueNoiseDemoPositions;
  let timeSinceLastBlueNoiseReset = 0;

  let noiseDemoGenerator;
  
  const blueNoiseDemoWidth = 10;
  const blueNoiseDemoHeight = 10;
  const blueNoiseDemoGridSpacing = 1;
  const blueNoiseDemoInnerCellSize = 0.6;
  const blueNoiseDemoCenter = [0, 0];
  
  let overrideLookAt = false;
  let fullCameraControl = false;

  let scene;
  let params = defaultParams;

  document.getElementById("camera-x").addEventListener("input", function() {
    cameraPosition[0] = parseFloat(this.value);
    requestAnimationFrame(render);
  });

  document.getElementById("camera-y").addEventListener("input", function() {
    cameraPosition[1] = parseFloat(this.value);
    requestAnimationFrame(render);
  });

  document.getElementById("camera-z").addEventListener("input", function() {
    cameraPosition[2] = parseFloat(this.value);
    requestAnimationFrame(render);
  });

  document.getElementById("look-at-x").addEventListener("input", function() {
    cameraLookAt[0] = parseFloat(this.value);
    requestAnimationFrame(render);
  });

  document.getElementById("look-at-y").addEventListener("input", function() {
    cameraLookAt[1] = parseFloat(this.value);
    requestAnimationFrame(render);
  });

  document.getElementById("look-at-z").addEventListener("input", function() {
    cameraLookAt[2] = parseFloat(this.value);
    requestAnimationFrame(render);
  });

  document.getElementById("camera-forward").addEventListener("click", function() {
    moveCameraForward(0.1);
    requestAnimationFrame(render);
  });

  document.getElementById("camera-backward").addEventListener("click", function() {
    moveCameraForward(-0.1);
    requestAnimationFrame(render);
  });
  
  function setSeed(value) {   
    seed = value;

    // If the value is a number, use it as the seed
    if (!isNaN(value) && !isNaN(parseFloat(value))) {
      seed = parseFloat(value);
    }

    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  }

  document.getElementById("seed").addEventListener("input", function() {
    setSeed(this.value);
  });

  document.getElementById("reset").addEventListener("click", function() {
    setSeed(Math.random());
    document.getElementById("seed").value = seed;
  });

  document.getElementById("desk-width").addEventListener("input", function() {
    params.deskWidth = parseFloat(this.value);
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });

  document.getElementById("desk-height").addEventListener("input", function() {
    params.deskHeight = parseFloat(this.value);
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });

  document.getElementById("desk-depth").addEventListener("input", function() {
    params.deskDepth = parseFloat(this.value);
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });

  document.getElementById("max-lamp-distance").addEventListener("input", function() {
    params.maxLampDistance = parseFloat(this.value);
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });

  document.getElementById("object-spacing").addEventListener("input", function() {
    params.objectSpacing = parseFloat(this.value);
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });
  
  document.getElementById("object-padding").addEventListener("input", function() {
    params.objectPadding = parseFloat(this.value);
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });
  
  document.getElementById("major-object-incidence").addEventListener("input", function() {
    params.majorObjectIncidence = parseFloat(this.value);
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });
  
  document.getElementById("minor-object-grid-subdiviosions").addEventListener("input", function() {
    params.minorObjectGridSubdivisionCuts = parseFloat(this.value);
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });
  
  document.getElementById("biome-map-scale").addEventListener("input", function() {
    params.biomeMapScale = parseFloat(this.value);
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });

  document.getElementById("desk-legs").addEventListener("input", function() {
    renderDeskLegs = this.checked;
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });
  
  document.getElementById("desk-top").addEventListener("input", function() {
    renderDeskTop = this.checked;
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });

  document.getElementById("office-biome").addEventListener("input", function() {
    params.officeBiome = this.checked;
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });
  document.getElementById("gadgets-biome").addEventListener("input", function() {
    params.gadgetsBiome = this.checked;
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });

  document.getElementById("antiques-biome").addEventListener("input", function() {
    params.antiquesBiome = this.checked;
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });

  document.getElementById("decorations-biome").addEventListener("input", function() {
    params.decorationsBiome = this.checked;
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });

  document.getElementById("light-x").addEventListener("input", function() {
    lightPosition[0] = parseFloat(this.value);
    requestAnimationFrame(render);
  });
  
  document.getElementById("light-y").addEventListener("input", function() {
    lightPosition[1] = parseFloat(this.value);
    requestAnimationFrame(render);
  });
  
  document.getElementById("light-z").addEventListener("input", function() {
    lightPosition[2] = parseFloat(this.value);
    requestAnimationFrame(render);
  });
  
  document.getElementById("light-target-x").addEventListener("input", function() {
    lightTarget[0] = parseFloat(this.value);
    requestAnimationFrame(render);
  });
  
  document.getElementById("light-target-y").addEventListener("input", function() {
    lightTarget[1] = parseFloat(this.value);
    requestAnimationFrame(render);
  });
  
  document.getElementById("light-target-z").addEventListener("input", function() {
    lightTarget[2] = parseFloat(this.value);
    requestAnimationFrame(render);
  });

  document.getElementById("shadow-type").addEventListener("input", function() {
    switch (this.value) {
      case "hard":
        shadowType = 1;
        break;
      case "circle-pcf":
        shadowType = 2;
        break;
      case "box-pcf":
        shadowType = 3;
        break;
      default:
        shadowType = 0;
    }
    requestAnimationFrame(render);
  });

  document.getElementById("shadow-blur-kernel").addEventListener("input", function() {
    shadowBlurKernelRadius = parseFloat(this.value);
    requestAnimationFrame(render);
  });

  document.getElementById("shadow-sampling").addEventListener("input", function() {
    shadowBlurSampling = parseInt(this.value);
    requestAnimationFrame(render);
  });

  document.getElementById("light-proj-width").addEventListener("input", function() {
    lightProjWidth = parseFloat(this.value);
    requestAnimationFrame(render);
  });
  
  document.getElementById("light-proj-height").addEventListener("input", function() {
    lightProjHeight = parseFloat(this.value);
    requestAnimationFrame(render);
  });

  document.getElementById("light-perspective").addEventListener("input", function() {
    lightPerspective = this.checked;
    requestAnimationFrame(render);
  });

  document.getElementById("light-fov").addEventListener("input", function() {
    lightFieldOfView = parseFloat(this.value);
    requestAnimationFrame(render);
  });
  
  document.getElementById("shadow-bias").addEventListener("input", function() {
    shadowBias = parseFloat(this.value);
    requestAnimationFrame(render);
  });

  document.getElementById("depth-texture-size").addEventListener("input", function() {
    depthTextureSize = parseInt(this.value);
    depthTexture = createDepthTexture(depthTextureSize);
    depthFramebuffer = createDepthFramebuffer();
    requestAnimationFrame(render);
  });
  
  document.getElementById("render-debug-objects").addEventListener("input", function() {
    renderDebugObjects = this.checked;
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });
  
  document.getElementById("world-axis").addEventListener("input", function() {
    renderWorldAxis = this.checked;
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });
  
  document.getElementById("lamp-debug").addEventListener("input", function() {
    useLampDebugHead = this.checked;
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });
  
  document.getElementById("blue-noise-bounds").addEventListener("input", function() {
    params.renderBlueNoiseBounds = this.checked;
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });
  
  document.getElementById("blue-noise-placeholders").addEventListener("input", function() {
    params.renderBlueNoisePlaceholders = this.checked;
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });
  
  document.getElementById("biome-map").addEventListener("input", function() {
    params.renderBiomeMap = this.checked;
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });
  
  document.getElementById("major-objects").addEventListener("input", function() {
    params.renderMajorObjects = this.checked;
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });
  
  document.getElementById("minor-objects").addEventListener("input", function() {
    params.renderMinorObjects = this.checked;
    scene = generateProceduralScene(seed, params);
    requestAnimationFrame(render);
  });

  // Create a depth texture
  let depthTexture = createDepthTexture(depthTextureSize);

  // Create a framebuffer
  let depthFramebuffer = createDepthFramebuffer();

  const demo = "final"; // "objects", "lamp", "blueNoise", "debugObjects", "desk", "biomes", "singleObject", "final"

  switch (demo) {
    case "lamp":
      mainObject = lampBody;
      cameraPositionOffset = [0, 1.5, 0.75];
      zFarMultiplier = 2;
      animate = true
      break;
    case "objects":
      mainObject = windmill;
      cameraPositionOffset = [0, 0, 0];
      animate = true;
      shadowType = 0;
      document.getElementById("shadow-type").value = "none";
      break;
    case "blueNoise":
      mainObject = debugPlane;
      cameraPositionOffset = [0, 5, -5];
      
      blueNoiseDemoPrng = new Math.seedrandom("blueNoiseDemo");
      blueNoiseDemoPositions = blueNoise(blueNoiseDemoWidth, blueNoiseDemoHeight, blueNoiseDemoGridSpacing, blueNoiseDemoGridSpacing, blueNoiseDemoInnerCellSize, blueNoiseDemoInnerCellSize, blueNoiseDemoCenter, blueNoiseDemoPrng);
      animate = true;

      shadowType = 0;
      document.getElementById("shadow-type").value = "none";
      break;
    case "debugObjects":
      mainObject = debugPlane;
      overrideLookAt = true;
      cameraPositionOffset = [0.5, 2, 3];
      cameraLookAt = [0, 0, 0];
      animate = false;
      break;
    case "desk":
      mainObject = deskBar;
      cameraPositionOffset = [0, 2.5, 4];
      overrideLookAt = true;
      cameraLookAt = [0, 0.5, 0];
      zFarMultiplier = 2;
      animate = true;
      break;
    case "biomes":
      mainObject = debugPlane;
      cameraPositionOffset = [0, 5, -5];

      const biomesDemoPrng = new Math.seedrandom("biomesDemo");
      noiseDemoGenerator = createNoise2D(biomesDemoPrng);
      animate = false;
      shadowType = 0;
      document.getElementById("shadow-type").value = "none";
      break;
    case "singleObject":
      mainObject = antiqueBookLarge;
      cameraPositionOffset = [0, 1.25, 0.125];
      zFarMultiplier = 2;
      animate = true;
      break;
    case "final":
    default:
      fullCameraControl = true;
      scene = generateProceduralScene(seed, params);
      animate = false;
      mainObject = floor;
      zNearDivisor = 10;
      break;
  }

  let then = 0;

  function createDepthFramebuffer() {
    const depthFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER, // target
      gl.DEPTH_ATTACHMENT, // attachment point
      gl.TEXTURE_2D, // texture target
      depthTexture, // texture
      0); // mip level
    return depthFramebuffer;
  }

  function render(time) {   
    time *= 0.001;  // convert to seconds

    const deltaTime = time - then;
    then = time;

    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = twgl.m4.perspective(fieldOfViewRadians, aspect, mainObject.zNear / zNearDivisor, mainObject.zFar * zFarMultiplier);
    
    const up = [0, 1, 0];
    // Compute the camera's matrix using look at.
    let camera;
    if (fullCameraControl) {
      camera = twgl.m4.lookAt(cameraPosition, cameraLookAt, up);
    } else if (!overrideLookAt) {
      camera = twgl.m4.lookAt(twgl.v3.add(mainObject.cameraPosition, cameraPositionOffset), mainObject.cameraTarget, up);
    } else {
      camera = twgl.m4.lookAt(cameraPositionOffset, cameraLookAt, up);
    }

    const lightWorldMatrix = twgl.m4.lookAt(
      lightPosition,
      lightTarget,
      up
    );

    const lightProjectionMatrix = lightPerspective
      ? twgl.m4.perspective(
          degToRad(lightFieldOfView),
          lightProjWidth / lightProjHeight,
          0.5,  // near
          10)   // far
      : twgl.m4.ortho(
          -lightProjWidth / 2,    // left
            lightProjWidth / 2,   // right
          -lightProjHeight / 2,   // bottom
            lightProjHeight / 2,  // top
            0.5,                  // near
            10);                  // far

    // draw to the depth texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.viewport(0, 0, depthTextureSize, depthTextureSize);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawScene(
      lightProjectionMatrix,
      lightWorldMatrix,
      twgl.m4.identity(),
      lightWorldMatrix,
      colorProgramInfo
    );

    // now draw scene to the canvas projecting the depth texture into the scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let textureMatrix = twgl.m4.identity();
    textureMatrix = twgl.m4.translate(textureMatrix, [0.5, 0.5, 0.5]);
    textureMatrix = twgl.m4.scale(textureMatrix, [0.5, 0.5, 0.5]);
    textureMatrix = twgl.m4.multiply(textureMatrix, lightProjectionMatrix);
    // use the inverse of this world matrix to make
    // a matrix that will transform other positions
    // to be relative this this world space.
    textureMatrix = twgl.m4.multiply(textureMatrix, twgl.m4.inverse(lightWorldMatrix));

    const projectionMatrix = twgl.m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

    //drawFrustum(camera, gl, colorProgramInfo, lightWorldMatrix, lightProjectionMatrix, projection);

    drawScene(
      projectionMatrix,
      camera,
      textureMatrix,
      lightWorldMatrix,
      meshProgramInfo
    );

    if (animate) {
      requestAnimationFrame(render);
    }

    function drawScene(
      projectionMatrix,
      cameraMatrix,
      textureMatrix,
      lightWorldMatrix,
      programInfo) {
    // Make a view matrix from the camera matrix.
    const viewMatrix = twgl.m4.inverse(cameraMatrix);

    gl.useProgram(programInfo.program);

    let blurSamplingValue = 0;

    switch (shadowType) {
      case 2:
        blurSamplingValue = Math.pow(2, shadowBlurSampling + 2);
        break;
      case 3:
        blurSamplingValue = shadowBlurSampling - 1;
        break;
    }

    // set uniforms that are the same for both the sphere and plane
    // note: any values with no corresponding uniform in the shader
    // are ignored.
    twgl.setUniforms(programInfo, {
      u_lightDirection: twgl.v3.normalize(twgl.v3.subtract(lightPosition, lightTarget)),
      u_view: viewMatrix,
      u_projection: projectionMatrix,
      u_viewWorldPosition: mainObject.cameraPosition,
      u_bias: shadowBias,
      u_blurKernelRadius: shadowBlurKernelRadius,
      u_sampling: blurSamplingValue,
      u_textureMatrix: textureMatrix,
      u_projectedTexture: depthTexture,
      u_reverseLightDirection: lightWorldMatrix.slice(8, 11),
      u_shadowType: shadowType,
    });

    drawObjects(programInfo);
  }

    function drawObjects(programInfo) {
      switch (demo) {
        case "objects":
          const scale1 = Math.sin(time) / 2 + 1;
          const scale2 = Math.sin(time + Math.PI / 2) / 2 + 1;
          const scale3 = Math.sin(time + Math.PI) / 2 + 1;

          renderObject(gl, programInfo, windmill, [-5 + Math.sin(time) * 3.5, -3 + Math.sin(time) * 3.5, 0 + Math.sin(time) * 3.5], [time + Math.PI, time + Math.PI, time + Math.PI], [scale1, scale1, scale1]);
          renderObject(gl, programInfo, chair, [5 + Math.sin(time + Math.PI) * 3.5, -3 + Math.sin(time + Math.PI) * 3.5, 0 + Math.sin(time + Math.PI) * 3.5], [time, time, time], [scale2, scale2, scale2]);
          renderObject(gl, programInfo, demoDesk, [Math.sin(time + Math.PI / 2) * 3.5, -3 + Math.sin(time + Math.PI / 2) * 3.5, Math.sin(time + Math.PI / 2) * 3.5], [time + Math.PI / 2, time + Math.PI / 2, time + Math.PI / 2], [scale3 * 5, scale3 * 5, scale3 * 5]);

          break;
        case "lamp":
          const lamp1Position = [Math.sin(time) * 0.25, 0, Math.cos(time) * 0.25];
          const lamp2Position = [Math.sin(time + Math.PI) * 0.25, 0, Math.cos(time + Math.PI) * 0.25];
          const lampLookAtRotatedRelative = rotate2DVector([0, 0.25 * (Math.sin(time) + 2)], time);
          const lampLookAt = [lamp1Position[0] + lampLookAtRotatedRelative[0], lamp1Position[1], lamp1Position[2] + lampLookAtRotatedRelative[1]];

          renderLampLookingAt(programInfo, lamp1Position, lampLookAt, "antique", true);
          renderLampLookingAt(programInfo, lamp2Position, lampLookAt, "default", true);
          renderObject(gl, programInfo, debugAxis, lampLookAt);
          renderObject(gl, programInfo, debugPlane, [0, 0, 0], [0, 0, 0], [0.25, 0.25, 0.25]);

          break;
        case "blueNoise":
          if (timeSinceLastBlueNoiseReset > 1) {
            timeSinceLastBlueNoiseReset = 0;

            blueNoiseDemoPositions = blueNoise(blueNoiseDemoWidth, blueNoiseDemoHeight, blueNoiseDemoGridSpacing, blueNoiseDemoGridSpacing, blueNoiseDemoInnerCellSize, blueNoiseDemoInnerCellSize, blueNoiseDemoCenter, blueNoiseDemoPrng);
          } else {
            timeSinceLastBlueNoiseReset += deltaTime;
          }

          for (const position of blueNoiseDemoPositions) {
            renderObject(gl, programInfo, debugAxis, [position[0][0], 0, position[0][1]], [0, 0, 0], [2, 2, 2]);
            renderObject(gl, programInfo, blueNoiseOuterGridCell, [position[1][0], 0, position[1][1]], [0, 0, 0], [blueNoiseDemoGridSpacing, blueNoiseDemoGridSpacing, blueNoiseDemoGridSpacing]);
            renderObject(gl, programInfo, blueNoiseInnerGridCell, [position[1][0], 0, position[1][1]], [0, 0, 0], [blueNoiseDemoInnerCellSize, blueNoiseDemoInnerCellSize, blueNoiseDemoInnerCellSize]);
          }

          renderObject(gl, programInfo, debugPlane);

          break;
        case "debugObjects":
          renderObject(gl, programInfo, debugAxis, [0.5, 0.5, -0.5], [0, 0, 0], [2, 2, 2]);
          renderObject(gl, programInfo, debugArrow, [-0.75, 0.3, 0], [0.7, 0.4, -0.7], [0.75, 0.75, 0.75]);
          renderObject(gl, programInfo, debugPlane);
          renderObject(gl, programInfo, debugGlobalAxis);
          renderObject(gl, programInfo, debugSquare, [-0.5, 0, 0.5], [0, 0, 0], [0.5, 0.5, 0.5]);
          renderObject(gl, programInfo, debugCube, [0.5, 0.25, 0.5], [0, 0, 0], [0.5, 0.5, 0.5]);
          renderObject(gl, programInfo, debugCircle, [-0.5, 0, -0.5], [0, 0, 0], [0.25, 0.25, 0.25]);
          renderObject(gl, programInfo, debugSphere, [1, 0.75, -0.5], [0, 0, 0], [0.25, 0.25, 0.25]);
          renderObject(gl, programInfo, debugCompassRose, [1, 0, -1], [0, 0, 0], [0.5, 0.5, 0.5]);

          break;
        case "desk":
          let deskPosition = [0, 0, 0];
          let deskWidth = 2 + Math.sin(time);
          let deskHeight = 1 + Math.sin(time) / 2;
          let deskDepth = 1 + Math.cos(time) + 0.5;

          renderDesk(programInfo, deskWidth, deskHeight, deskDepth, deskPosition);
          renderObject(gl, programInfo, debugPlane);

          break;
        case "biomes":
          const objects = [debugRedSquare, debugGreenSquare, debugBlueSquare, debugYellowSquare];

          for (let i = -5; i < 5; i++) {
            for (let j = -5; j < 5; j++) {
              const biome = generateBiome(i, j, 4, noiseDemoGenerator, 10);
              renderObject(gl, programInfo, objects[biome], [i + 0.5, 0, j + 0.5]);
            }
          }

          break;
        case "singleObject":
          renderObject(gl, programInfo, mainObject, [0, 0, 0], [0, time, 0]);
          renderObject(gl, programInfo, debugPlane);
          break;
        case "final":
        default:
          const center = [0, 0, 0];

          if (renderDebugObjects && renderWorldAxis) {
            renderObject(gl, programInfo, debugGlobalAxis);
          }

          // Desk        
          renderDesk(programInfo, params.deskWidth, params.deskHeight, params.deskDepth, center, renderDeskLegs, renderDeskTop);
          // Floor
          renderObject(gl, programInfo, floor, center);

          // Debug objects
          if (renderDebugObjects) {
            for (const object of scene.debugObjects) {
              renderObject(gl, programInfo, object.object, twgl.v3.add(object.position, center), object.rotation, object.scale);
            }
          }

          // Major objects
          if (params.renderMajorObjects) {
            for (const object of scene.majorObjects) {
              renderObject(gl, programInfo, object.object, twgl.v3.add(object.position, center), object.rotation, object.scale);
            }
          }

          // Minor objects
          if (params.renderMinorObjects) {
            // Generic objects
            for (const object of scene.minorObjects) {
              renderObject(gl, programInfo, object.object, twgl.v3.add(object.position, center), object.rotation, object.scale);
            }

            // Lamps
            for (const lamp of scene.lamps) {
              renderLampLookingAt(programInfo, twgl.v3.add(lamp.position, center), twgl.v3.add(lamp.lookAt, center), lamp.type, renderDebugObjects && useLampDebugHead && lamp.lookingAtObject);
            }
          }

          break;
      }
    }
  }

  requestAnimationFrame(render);

  // Redraw when the viewport resizes
  visualViewport.onresize = function() {
    requestAnimationFrame(render);
  }

  function generateBiome(row, col, numBiomes, noiseGenerator, noiseScale = 2.5) {
    return Math.floor(((noiseGenerator(row / noiseScale, col / noiseScale) + 1) / 2) * numBiomes);
  }

  function renderDesk(programInfo, deskWidth, deskHeight, deskDepth, deskPosition, renderLegs = true, renderTop = true, barThickness = 0.04, topThickness = 0.04) {
    const legOffset = [deskWidth / 2 - barThickness / 2, deskHeight / 2 - topThickness / 2, deskDepth / 2 - barThickness / 2];

    if (renderLegs) {
      // Southeast leg
      renderObject(gl, programInfo, deskBar, twgl.v3.add([legOffset[0], legOffset[1], legOffset[2]], deskPosition), [0, 0, 0], [barThickness, deskHeight - topThickness, barThickness]);
      // Northwest leg
      renderObject(gl, programInfo, deskBar, twgl.v3.add([legOffset[0], legOffset[1], -legOffset[2]], deskPosition), [0, 0, 0], [barThickness, deskHeight - topThickness, barThickness]);
      // Northeast leg
      renderObject(gl, programInfo, deskBar, twgl.v3.add([-legOffset[0], legOffset[1], -legOffset[2]], deskPosition), [0, 0, 0], [barThickness, deskHeight - topThickness, barThickness]);
      // Southwest leg
      renderObject(gl, programInfo, deskBar, twgl.v3.add([-legOffset[0], legOffset[1], legOffset[2]], deskPosition), [0, 0, 0], [barThickness, deskHeight - topThickness, barThickness]);
      
      // South bar
      renderObject(gl, programInfo, deskBar, twgl.v3.add([0, deskHeight - barThickness / 2 - topThickness, deskDepth / 2 - barThickness / 2], deskPosition), [0, 0, Math.PI / 2], [barThickness, deskWidth - barThickness * 2,barThickness]);
      // North bar
      renderObject(gl, programInfo, deskBar, twgl.v3.add([0, deskHeight - barThickness / 2 - topThickness, -deskDepth / 2 + barThickness / 2], deskPosition), [0, 0, Math.PI / 2], [barThickness, deskWidth - barThickness * 2,barThickness]);
      // East bar
      renderObject(gl, programInfo, deskBar, twgl.v3.add([deskWidth / 2 - barThickness / 2, deskHeight - barThickness / 2 - topThickness, 0], deskPosition), [Math.PI / 2, 0, 0], [barThickness, deskDepth - barThickness * 2,barThickness]);
      // West bar
      renderObject(gl, programInfo, deskBar, twgl.v3.add([-deskWidth / 2 + barThickness / 2, deskHeight - barThickness / 2 - topThickness, 0], deskPosition), [Math.PI / 2, 0, 0], [barThickness, deskDepth - barThickness * 2,barThickness]);
    }

    if (renderTop) {
      // The tile widths will be size that's closest to 1 (when exactly 1 there is no texture stretching).
      const deskTopTileWidth = deskWidth / (Math.round(deskWidth) | 1); // When deskWidth is less than 0.5, the width will be the same as the deskWidth
      const deskTopTileDepth = deskDepth / (Math.round(deskDepth) | 1); // Math.round(deskDepth) | 1 is 1 when Math.round(deskDepth) is 0
      
      for (let i = 0; i < deskWidth / deskTopTileWidth; i++) {
        for (let j = 0; j < deskDepth / deskTopTileDepth; j++) {
          renderObject(gl, programInfo, deskTopTile, twgl.v3.add([(i + 0.5) * deskTopTileWidth - deskWidth / 2, deskHeight - topThickness, (j + 0.5) * deskTopTileDepth - deskDepth / 2], deskPosition), [0, 0, 0], [deskTopTileWidth, topThickness, deskTopTileDepth]);
        }
      }
    }
  }

  function drawFrustum(cameraMatrix, gl, colorProgramInfo, lightWorldMatrix, lightProjectionMatrix, projectionMatrix) {
    const cubeLinesBufferInfo = twgl.createBufferInfoFromArrays(gl, {
      position: [
        -1, -1, -1,
        1, -1, -1,
        -1, 1, -1,
        1, 1, -1,
        -1, -1, 1,
        1, -1, 1,
        -1, 1, 1,
        1, 1, 1,
      ],
      indices: [
        0, 1,
        1, 3,
        3, 2,
        2, 0,
  
        4, 5,
        5, 7,
        7, 6,
        6, 4,
  
        0, 4,
        1, 5,
        3, 7,
        2, 6,
      ],
    });

    const cubeLinesVAO = twgl.createVAOFromBufferInfo(gl, colorProgramInfo, cubeLinesBufferInfo);
    
    // ------ Draw the frustum ------
    const viewMatrix = twgl.m4.inverse(cameraMatrix);
  
    gl.useProgram(colorProgramInfo.program);
  
    // Setup all the needed attributes.
    gl.bindVertexArray(cubeLinesVAO);
  
    // scale the cube in Z so it's really long
    // to represent the texture is being projected to
    // infinity
    const mat = twgl.m4.multiply(
      lightWorldMatrix, twgl.m4.inverse(lightProjectionMatrix));
  
    // Set the uniforms we just computed
    twgl.setUniforms(colorProgramInfo, {
      u_color: [1, 1, 1, 1],
      u_view: viewMatrix,
      u_projection: projectionMatrix,
      u_world: mat,
    });
  
    // calls gl.drawArrays or gl.drawElements
    twgl.drawBufferInfo(gl, cubeLinesBufferInfo, gl.LINES);
  }

  const defaultLampHeadOffset = [0.053379, 0.375211, 0.000011];
  const antiqueLampHeadOffset = [0.053676, 0.276961, 0];

  function renderLampLookingAt(programInfo, lampPosition, lookAtPosition, type = "default", debugHead = false) {
    const lampHeadOffset = type === "antique" ? antiqueLampHeadOffset : defaultLampHeadOffset;
    const xOffset = type === "antique" ? 0 : 0.067045;
    
    // The yaw does not consider the head offset
    let lampDirection = twgl.v3.subtract(lookAtPosition, lampPosition);
    const lampYaw = -Math.atan2(lampDirection[2], lampDirection[0]);

    // We rotate the relative head position in XZ plane based on the yaw. The X position has an additional offset so
    // that the vector considers the lightbulb as the center and not the point the head is attached to the body of the lamp.
    const rotatedHeadOffsetXZ = rotate2DVector([lampHeadOffset[0] + xOffset, lampHeadOffset[2]], -lampYaw);
    const lampHeadPosition = twgl.v3.add(lampPosition, [rotatedHeadOffsetXZ[0], lampHeadOffset[1], rotatedHeadOffsetXZ[1]]);
    
    lampDirection = twgl.v3.subtract(lookAtPosition, lampHeadPosition);
    const lampHeadPitch = Math.atan2(lampDirection[1], Math.sqrt(lampDirection[0] * lampDirection[0] + lampDirection[2] * lampDirection[2]));

    renderLamp(programInfo, lampPosition, lampYaw, lampHeadPitch, type, debugHead);
  }

  function renderLamp(programInfo, lampPosition, lampYaw, lampHeadPitch, type = "default", useDebugHead = false) {
    const lampHeadOffset = type === "antique" ? antiqueLampHeadOffset : defaultLampHeadOffset;
    const body = type === "antique" ? antiqueLampBody : lampBody;
    const head = type === "antique" ? antiqueLampHead : lampHead;
    const debugHead = type === "antique" ? antiqueLampDebugHead : debugLampHead; 
    
    const absoluteHeadPosition = twgl.v3.add(lampPosition, lampHeadOffset);

    // The head position is not centered in the lamp, so to rotate the lamp we must find the position the head will
    // take after the rotation. To do this we interpret the head position relative to the lamp as a 2D vector in the XZ
    // plane, then rotate that vector to get the new position of the head.
    let lampXYPosition = rotate2DVector([lampHeadOffset[0], lampHeadOffset[2]], -lampYaw);
    lampXYPosition[0] += lampPosition[0];
    lampXYPosition[1] += lampPosition[2];

    const rotatedHeadPosition = [lampXYPosition[0], absoluteHeadPosition[1], lampXYPosition[1]];

    renderObject(gl, programInfo, body, lampPosition, [0, lampYaw, 0]);
    renderObject(gl, programInfo, useDebugHead ? debugHead : head, rotatedHeadPosition, [0, lampYaw, lampHeadPitch + Math.PI/2]);
  }
  
  function rotate2DVector(vector, angle) {
    const x = vector[0];
    const y = vector[1];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rotatedX = x * cos - y * sin;
    const rotatedY = x * sin + y * cos;
    return [rotatedX, rotatedY];
  }

  function moveCameraForward(distance) {
    const cameraDirection = [
      cameraLookAt[0] - cameraPosition[0],
      cameraLookAt[1] - cameraPosition[1],
      cameraLookAt[2] - cameraPosition[2]
    ];
    const cameraDirectionLength = Math.sqrt(
      cameraDirection[0] * cameraDirection[0] +
      cameraDirection[1] * cameraDirection[1] +
      cameraDirection[2] * cameraDirection[2]
    );
    const normalizedCameraDirection = [
      cameraDirection[0] / cameraDirectionLength,
      cameraDirection[1] / cameraDirectionLength,
      cameraDirection[2] / cameraDirectionLength
    ];
    cameraPosition[0] += normalizedCameraDirection[0] * distance;
    cameraPosition[1] += normalizedCameraDirection[1] * distance;
    cameraPosition[2] += normalizedCameraDirection[2] * distance;
  }
  
  function blueNoise(width, height, cellWidth, cellHeight, innerCellWidth, innerCellHeight, center, prng) { 
    const positions = new Set();
    const offset = [center[0] - (width - 1) * cellWidth / 2, center[1] - (height - 1) * cellHeight / 2];
    
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        let position = [i * cellWidth + offset[0], j * cellHeight + offset[1]];
        const center = [position[0], position[1]];
        
        position[0] += (prng() * 2 - 1) * innerCellWidth / 2;
        position[1] += (prng() * 2 - 1) * innerCellHeight / 2;
        
        positions.add([position, center]);
      }
    }
    
    return positions;
  }
  
  function generateProceduralScene(seed, params) {
    const scene = {};
    
    const masterPrng = new Math.seedrandom(seed);
    
    // Different PRNGs are used so the parameters won't have a chaotic effect on the scene
    const majorBlueNoisePrng = new Math.seedrandom(masterPrng());
    const minorBlueNoisePrng = new Math.seedrandom(masterPrng());
    const blueNoiseSubdividePrng = new Math.seedrandom(masterPrng());
    const objectSelectionPrng = new Math.seedrandom(masterPrng());
    const biomePrng = new Math.seedrandom(masterPrng());
    

    const cellWidth = params.deskWidth / Math.floor(params.deskWidth / params.objectSpacing);
    const cellHeight = params.deskDepth / Math.floor(params.deskDepth / params.objectSpacing);
    const majorObjectsInnerCellSize = params.objectSpacing - params.objectPadding * 2;
    const innerCellWidth = majorObjectsInnerCellSize * (cellWidth / params.objectSpacing);
    const innerCellHeight = majorObjectsInnerCellSize * (cellHeight / params.objectSpacing);
    
    const majorObjectPositions = blueNoise(params.deskWidth / cellWidth, params.deskDepth / cellHeight, cellWidth, cellHeight, innerCellWidth, innerCellHeight, [0, 0], majorBlueNoisePrng);
    let minorObjectPositions = new Set();

    for (const majorObject of majorObjectPositions) {
      if (blueNoiseSubdividePrng() > params.majorObjectIncidence) {
        majorObjectPositions.delete(majorObject);

        minorObjectPositions = new Set([...minorObjectPositions, ...blueNoise(params.minorObjectGridSubdivisionCuts, params.minorObjectGridSubdivisionCuts, cellWidth / params.minorObjectGridSubdivisionCuts, cellHeight / params.minorObjectGridSubdivisionCuts, innerCellWidth / params.minorObjectGridSubdivisionCuts, innerCellHeight / params.minorObjectGridSubdivisionCuts, majorObject[1], minorBlueNoisePrng)]);
      }
    }

    scene.majorObjects = new Set();
    scene.minorObjects = new Set();
    scene.debugObjects = new Set();
    scene.lamps = new Set();

    const pendingLamps = [];
    const objectsNeedingLight = [];
    const biomeGenerator = createNoise2D(biomePrng);

    let majorBiomeObjects = [];
    let minorBiomeObjects = [];

    let numBiomes = 0;

    if (params.officeBiome) {
      numBiomes++;
      majorBiomeObjects.push(majorOffice.concat(majorGenericObjects));
      minorBiomeObjects.push(minorOffice.concat(minorGenericObjects));
    }

    if (params.gadgetsBiome) {
      numBiomes++;
      majorBiomeObjects.push(majorGadgets.concat(majorGenericObjects));
      minorBiomeObjects.push(minorGadgets.concat(minorGenericObjects));
    }

    if (params.antiquesBiome) {
      numBiomes++;
      majorBiomeObjects.push(majorAntiques.concat(majorGenericObjects));
      minorBiomeObjects.push(minorAntiques.concat(minorGenericObjects));
    }

    if (params.decorationsBiome) {
      numBiomes++;
      majorBiomeObjects.push(majorDecorations.concat(majorGenericObjects));
      minorBiomeObjects.push(minorDecorations.concat(minorGenericObjects));
    }

    for (const majorObject of majorObjectPositions) {
      const biome = generateBiome(majorObject[0][0], majorObject[0][1], numBiomes, biomeGenerator, params.biomeMapScale);
      if (params.renderBiomeMap) {
        addObjectToScene(debugBiomeSquares[biome], "debug", [majorObject[1][0], params.deskHeight, majorObject[1][1]], [0, 0, 0], [cellWidth, params.objectSpacing, cellHeight]);
      }

      const chosenObject = majorBiomeObjects[biome][Math.floor(objectSelectionPrng() * majorBiomeObjects[biome].length)];
      const rotation = (objectSelectionPrng() * 2 - 1) * chosenObject.rotationRange / 2;
      
      if (chosenObject.type == "lamp") {
        pendingLamps.push(majorObject[0]);
      } else {
        if (params.renderMajorObjects) {
          addObjectToScene(chosenObject.object, "major", [majorObject[0][0], params.deskHeight, majorObject[0][1]], [0, rotation, 0]);
        }
        
        if (chosenObject.needsLight) {
          objectsNeedingLight.push(majorObject[0]);
        }
      }


      // Debug
      if (params.renderBlueNoisePlaceholders) {
        addObjectToScene(debugAxis, "debug", [majorObject[0][0], params.deskHeight, majorObject[0][1]], [0, 0, 0], [2, 2, 2]);
      }
      
      if (params.renderBlueNoiseBounds) {
        addObjectToScene(blueNoiseOuterGridCell, "debug", [majorObject[1][0], params.deskHeight, majorObject[1][1]], [0, 0, 0], [cellWidth, params.objectSpacing, cellHeight]);
        addObjectToScene(blueNoiseInnerGridCell, "debug", [majorObject[1][0], params.deskHeight, majorObject[1][1]], [0, 0, 0], [cellWidth - params.objectPadding * 2, params.objectSpacing - params.objectPadding * 2, cellHeight - params.objectPadding * 2]);
      }
    }

    // Minor objects
    for (const minorObject of minorObjectPositions) {
      const biome = generateBiome(minorObject[0][0], minorObject[0][1], numBiomes, biomeGenerator, params.biomeMapScale);
      // Debug biome map
      if (params.renderBiomeMap) {
        addObjectToScene(debugBiomeSquares[biome], "debug", [minorObject[1][0], params.deskHeight, minorObject[1][1]], [0, 0, 0], [cellWidth / params.minorObjectGridSubdivisionCuts, params.objectSpacing / params.minorObjectGridSubdivisionCuts, cellHeight / params.minorObjectGridSubdivisionCuts]);
      }
      
      const chosenObject = minorBiomeObjects[biome][Math.floor(objectSelectionPrng() * minorBiomeObjects[biome].length)];
      const rotation = (objectSelectionPrng() * 2 - 1) * chosenObject.rotationRange / 2;

      if (chosenObject.type == "lamp") {
        pendingLamps.push(minorObject[0]);
      } else {
        if (params.renderMinorObjects) {
          addObjectToScene(chosenObject.object, "minor", [minorObject[0][0], params.deskHeight, minorObject[0][1]], [0, rotation, 0]);
        }
        
        if (chosenObject.needsLight) {
          objectsNeedingLight.push(minorObject[0]);
        }
      }
        
        
      // Debug
      if (params.renderBlueNoisePlaceholders) {
        addObjectToScene(debugAxis, "debug", [minorObject[0][0], params.deskHeight, minorObject[0][1]]);
      }
      
      if (params.renderBlueNoiseBounds) {
        addObjectToScene(blueNoiseOuterGridCell, "debug", [minorObject[1][0], params.deskHeight, minorObject[1][1]], [0, 0, 0], [cellWidth / params.minorObjectGridSubdivisionCuts, params.objectSpacing / params.minorObjectGridSubdivisionCuts, cellHeight / params.minorObjectGridSubdivisionCuts], [0.5, 0.5, 0.5]);
        addObjectToScene(blueNoiseInnerGridCell, "debug", [minorObject[1][0], params.deskHeight, minorObject[1][1]], [0, 0, 0], [cellWidth / params.minorObjectGridSubdivisionCuts - params.objectPadding, params.objectSpacing / params.minorObjectGridSubdivisionCuts - params.objectPadding, cellHeight / params.minorObjectGridSubdivisionCuts - params.objectPadding], [0.5, 0.5, 0.5]);
      }
    }

    // Create a cost matrix for the Hungarian algorithm
    const costMatrix = [];
    for (const pendingLamp of pendingLamps) {
      const row = [];
      for (const objectNeedingLight of objectsNeedingLight) {
        const distance = Math.sqrt(
          Math.pow(pendingLamp[0] - objectNeedingLight[0], 2) +
          Math.pow(pendingLamp[1] - objectNeedingLight[1], 2)
        );
        row.push(distance);
      }
      costMatrix.push(row);
    }

    let assignments = [];

    // Apply the Hungarian algorithm to find the best combination
    if (costMatrix.length > 0) {
      const munkers = new Munkres();
      assignments = munkers.compute(costMatrix);
    }

    // Render the lamps looking at the assigned objects
    for (const assignment of assignments) {
      const pendingLamp = pendingLamps[assignment[0]];
      const objectNeedingLight = objectsNeedingLight[assignment[1]];
      
      // Only make the lamp look at the object if it's within a certain distance
      if (Math.sqrt(Math.pow(pendingLamp[0] - objectNeedingLight[0], 2) + Math.pow(pendingLamp[1] - objectNeedingLight[1], 2)) < params.maxLampDistance) {
        if (params.renderMinorObjects) {
          addLampToScene([pendingLamp[0], params.deskHeight, pendingLamp[1]], [objectNeedingLight[0], params.deskHeight, objectNeedingLight[1]], numBiomes, true);
        }
        pendingLamps[assignment[0]] = null;
      }
    }

    // Render the remaining lamps pointing to random points on the desk
    for (const pendingLamp of pendingLamps) {
      if (pendingLamp === null) {
        continue;
      }
      
      addLampToScene([pendingLamp[0], params.deskHeight, pendingLamp[1]], [(objectSelectionPrng() * 2 - 1) * params.deskWidth / 2, params.deskHeight, (objectSelectionPrng() * 2 - 1) * params.deskDepth / 2], numBiomes, false);
    }

    return scene;

    function addObjectToScene(object, type, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
      const sceneObject = { object, position, rotation, scale };
      
      if (type == "major") {
        scene.majorObjects.add(sceneObject);
      } else if (type == "minor"){
        scene.minorObjects.add(sceneObject);
      } else {
        scene.debugObjects.add(sceneObject);
      }
    }

    function addLampToScene(position, lookAt, numBiomes, lookingAtObject) {
      const type = generateBiome(position[0], position[2], numBiomes, biomeGenerator, params.biomeMapScale) == 2 ? "antique" : "default";
      const sceneLamp = { position, lookAt, lookingAtObject, type };
      
      scene.lamps.add(sceneLamp);
    }
  }
}

const loadingOverlay = document.getElementById("loading-overlay");
const loadingBar = document.getElementById("loading-bar");

function updateLoadingBar(progress) {
  loadingBar.style.width = progress * 100 + "%";
}

let timeOfLastProgressBarUpdate = undefined;

await loadObjects(
  // Update the loading bar when each object is loaded
  (objectsToLoad, totalObjects) => {
    if (timeOfLastProgressBarUpdate === undefined || Date.now() - timeOfLastProgressBarUpdate > 100) {
      updateLoadingBar((totalObjects - objectsToLoad) / totalObjects);
      timeOfLastProgressBarUpdate = Date.now();
    }

  },
  // Begin the main program when all objects are loaded
  () => {
    updateLoadingBar(1.0);
    main();
    
    // Set the canvas background color to the sky color, it is white when the loading screen is visible
    canvas.style.backgroundColor = "#a2caf1";
    // Fade out and hide the loading screen overlay
    loadingOverlay.classList.add("fade-out");
  }
);
