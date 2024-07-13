"use strict";


import { createNoise2D } from './node_modules/simplex-noise/dist/esm/simplex-noise.js';
import { renderObject, parseAndLoadOBJ } from './importer.js';

async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  // Tell the twgl to match position with a_position etc..
  twgl.setAttributePrefix("a_");

  const vs = `#version 300 es
  in vec4 a_position;
  in vec3 a_normal;
  in vec3 a_tangent;
  in vec2 a_texcoord;
  in vec4 a_color;

  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;
  uniform vec3 u_viewWorldPosition;

  out vec3 v_normal;
  out vec3 v_tangent;
  out vec3 v_surfaceToView;
  out vec2 v_texcoord;
  out vec4 v_color;

  void main() {
    vec4 worldPosition = u_world * a_position;
    gl_Position = u_projection * u_view * worldPosition;
    v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;

    mat3 normalMat = mat3(u_world);
    v_normal = normalize(normalMat * a_normal);
    v_tangent = normalize(normalMat * a_tangent);

    v_texcoord = a_texcoord;
    v_color = a_color;
  }
  `;

  const fs = `#version 300 es
  precision highp float;

  in vec3 v_normal;
  in vec3 v_tangent;
  in vec3 v_surfaceToView;
  in vec2 v_texcoord;
  in vec4 v_color;

  uniform vec3 diffuse;
  uniform sampler2D diffuseMap;
  uniform vec3 ambient;
  uniform vec3 emissive;
  uniform vec3 specular;
  uniform sampler2D specularMap;
  uniform float shininess;
  uniform sampler2D normalMap;
  uniform float opacity;
  uniform vec3 u_lightDirection;
  uniform vec3 u_ambientLight;

  out vec4 outColor;

  void main () {
    vec3 normal = normalize(v_normal) * ( float( gl_FrontFacing ) * 2.0 - 1.0 );
    vec3 tangent = normalize(v_tangent) * ( float( gl_FrontFacing ) * 2.0 - 1.0 );
    vec3 bitangent = normalize(cross(normal, tangent));

    mat3 tbn = mat3(tangent, bitangent, normal);
    normal = texture(normalMap, v_texcoord).rgb * 2. - 1.;
    normal = normalize(tbn * normal);

    vec3 surfaceToViewDirection = normalize(v_surfaceToView);
    vec3 halfVector = normalize(u_lightDirection + surfaceToViewDirection);

    float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
    float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);
    vec4 specularMapColor = texture(specularMap, v_texcoord);
    vec3 effectiveSpecular = specular * specularMapColor.rgb;

    vec4 diffuseMapColor = texture(diffuseMap, v_texcoord);
    vec3 effectiveDiffuse = diffuse * diffuseMapColor.rgb * v_color.rgb;
    float effectiveOpacity = opacity * diffuseMapColor.a * v_color.a;

    outColor = vec4(
        emissive +
        ambient * u_ambientLight +
        effectiveDiffuse * fakeLight +
        effectiveSpecular * pow(specularLight, shininess),
        effectiveOpacity);
  }
  `;


  // compiles and links the shaders, looks up attribute and uniform locations
  const meshProgramInfo = twgl.createProgramInfo(gl, [vs, fs]);

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  // "objects" demo objects
  const windmill = await parseAndLoadOBJ("./assets/windmill/windmill.obj", gl, meshProgramInfo);
  const chair = await parseAndLoadOBJ("./assets/chair/chair.obj", gl, meshProgramInfo);
  const demoDesk = await parseAndLoadOBJ("./assets/demoDesk/desk.obj", gl, meshProgramInfo);
  
  // Debug objects
  const debugPlane = await parseAndLoadOBJ("./assets/debug/plane/debugPlane.obj", gl, meshProgramInfo);
  const debugAxis = await parseAndLoadOBJ("./assets/debug/axis/debugAxisV2.obj", gl, meshProgramInfo);
  const debugGlobalAxis = await parseAndLoadOBJ("./assets/debug/axis/debugGlobalAxis.obj", gl, meshProgramInfo);
  const debugArrow = await parseAndLoadOBJ("./assets/debug/arrow/debugArrow.obj", gl, meshProgramInfo);
  const debugSquare = await parseAndLoadOBJ("./assets/debug/square/debugSquare.obj", gl, meshProgramInfo);
  const debugCircle = await parseAndLoadOBJ("./assets/debug/circle/debugCircle.obj", gl, meshProgramInfo);
  const debugCube = await parseAndLoadOBJ("./assets/debug/cube/debugCube.obj", gl, meshProgramInfo);
  const debugSphere = await parseAndLoadOBJ("./assets/debug/sphere/debugSphere.obj", gl, meshProgramInfo);
  const blueNoiseOuterGridCell = await parseAndLoadOBJ("./assets/debug/blueNoise/blueNoiseOuterGridCell.obj", gl, meshProgramInfo);
  const blueNoiseInnerGridCell = await parseAndLoadOBJ("./assets/debug/blueNoise/blueNoiseInnerGridCell.obj", gl, meshProgramInfo);
  const debugCompassRose = await parseAndLoadOBJ("./assets/debug/compassRose/debugCompassRose.obj", gl, meshProgramInfo);
  const debugRedSquare = await parseAndLoadOBJ("./assets/debug/areaSquare/red.obj", gl, meshProgramInfo);
  const debugGreenSquare = await parseAndLoadOBJ("./assets/debug/areaSquare/green.obj", gl, meshProgramInfo);
  const debugBlueSquare = await parseAndLoadOBJ("./assets/debug/areaSquare/blue.obj", gl, meshProgramInfo);
  const debugYellowSquare = await parseAndLoadOBJ("./assets/debug/areaSquare/yellow.obj", gl, meshProgramInfo);
  
  // Lamp objects
  const lampBody = await parseAndLoadOBJ("./assets/lamp/body.obj", gl, meshProgramInfo);
  const lampHead = await parseAndLoadOBJ("./assets/lamp/head.obj", gl, meshProgramInfo);
  const debugLampHead = await parseAndLoadOBJ("./assets/lamp/debugHead.obj", gl, meshProgramInfo);
  const antiqueLampBody = await parseAndLoadOBJ("./assets/antiqueLamp/body.obj", gl, meshProgramInfo);
  const antiqueLampHead = await parseAndLoadOBJ("./assets/antiqueLamp/head.obj", gl, meshProgramInfo);
  const antiqueLampDebugHead = await parseAndLoadOBJ("./assets/antiqueLamp/debugHead.obj", gl, meshProgramInfo);

  // Desk objects
  const deskBar = await parseAndLoadOBJ("./assets/desk/bar.obj", gl, meshProgramInfo);
  const deskTopTile = await parseAndLoadOBJ("./assets/desk/topTile.obj", gl, meshProgramInfo);

  // Office biome objects
  const keys = await parseAndLoadOBJ("./assets/keys/keys.obj", gl, meshProgramInfo);
  const waterBottle = await parseAndLoadOBJ("./assets/waterBottle/waterBottle.obj", gl, meshProgramInfo);
  const notepad = await parseAndLoadOBJ("./assets/notepad/notepad.obj", gl, meshProgramInfo);
  const coffeeMugLarge = await parseAndLoadOBJ("./assets/coffeeMug/large/large.obj", gl, meshProgramInfo);
  const coffeeMugEspresso = await parseAndLoadOBJ("./assets/coffeeMug/espresso/espresso.obj", gl, meshProgramInfo);
  const memoBlock = await parseAndLoadOBJ("./assets/memoBlock/memoBlock.obj", gl, meshProgramInfo);
  const pencilHolder = await parseAndLoadOBJ("./assets/pencilHolder/pencilHolder.obj", gl, meshProgramInfo);
  const glasses = await parseAndLoadOBJ("./assets/glasses/glasses.obj", gl, meshProgramInfo);
  const clipboard = await parseAndLoadOBJ("./assets/clipboard/clipboard.obj", gl, meshProgramInfo);

  // Gadgets biome objects
  const smartphone = await parseAndLoadOBJ("./assets/smartphone/smartphone.obj", gl, meshProgramInfo);
  const drawingTablet = await parseAndLoadOBJ("./assets/drawingTablet/drawingTablet.obj", gl, meshProgramInfo);
  const charger = await parseAndLoadOBJ("./assets/charger/charger.obj", gl, meshProgramInfo);
  const headphones = await parseAndLoadOBJ("./assets/headphones/headphones.obj", gl, meshProgramInfo);
  const drone = await parseAndLoadOBJ("./assets/drone/drone.obj", gl, meshProgramInfo);
  const camera = await parseAndLoadOBJ("./assets/camera/camera.obj", gl, meshProgramInfo);
  const laptop = await parseAndLoadOBJ("./assets/laptop/laptop.obj", gl, meshProgramInfo);
  const hardDrive = await parseAndLoadOBJ("./assets/hardDrive/hardDrive.obj", gl, meshProgramInfo);

  // Antique biome objects
  const antiqueBookLarge = await parseAndLoadOBJ("./assets/antiqueBook/large.obj", gl, meshProgramInfo);
  const antiqueBookSmall = await parseAndLoadOBJ("./assets/antiqueBook/small.obj", gl, meshProgramInfo);
  const candleHolder = await parseAndLoadOBJ("./assets/candleHolder/candleHolder.obj", gl, meshProgramInfo);
  const goblet = await parseAndLoadOBJ("./assets/goblet/goblet.obj", gl, meshProgramInfo);
  const antiqueGlobe = await parseAndLoadOBJ("./assets/antiqueGlobe/antiqueGlobe.obj", gl, meshProgramInfo);
  const antiqueClockLarge = await parseAndLoadOBJ("./assets/antiqueClock/large.obj", gl, meshProgramInfo);
  const antiqueClockSmall = await parseAndLoadOBJ("./assets/antiqueClock/small.obj", gl, meshProgramInfo);
  const telephone = await parseAndLoadOBJ("./assets/telephone/telephone.obj", gl, meshProgramInfo);

  // Decorations biome objects
  const teschinYazik = await parseAndLoadOBJ("./assets/plants/teschinYazik.obj", gl, meshProgramInfo);
  const cactus = await parseAndLoadOBJ("./assets/plants/cactus.obj", gl, meshProgramInfo);
  const stoneTrophy = await parseAndLoadOBJ("./assets/stoneTrophy/stoneTrophy.obj", gl, meshProgramInfo);  
  const woodMannequin = await parseAndLoadOBJ("./assets/woodMannequin/woodMannequin.obj", gl, meshProgramInfo);

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

  const minorBiomeObjects = [
    minorOffice.concat(minorGenericObjects),
    minorGadgets.concat(minorGenericObjects),
    minorAntiques.concat(minorGenericObjects),
    minorDecorations.concat(minorGenericObjects)
  ]

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

  const majorBiomeObjects = [
    majorOffice.concat(majorGenericObjects),
    majorGadgets.concat(majorGenericObjects),
    majorAntiques.concat(majorGenericObjects),
    majorDecorations.concat(majorGenericObjects)
  ]

  const debugBiomeSquares = [
    debugRedSquare,
    debugGreenSquare,
    debugBlueSquare,
    debugYellowSquare
  ]

  
  let cameraPositionOffset = [0, 0, 0];
  let mainObject = debugGlobalAxis;
  let zFarMultiplier = 1;
  
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
  let lookAt = [0, 0, 0];

  const defaultParams = {
    deskWidth: 2.5,
    deskHeight: 1,
    deskDepth: 1.5,
    
    objectSpacing: 0.5,
    objectPadding: 0.1,

    majorObjectIncidence: 0.25,
    minorObjectGridSubdivisionCuts: 2,

    biomeMapScale: 2.5,

    renderBlueNoiseBounds: true,
    renderBlueNoisePlaceholders: false,
    renderBiomeMap: true,
    renderMajorObjects: true,
    renderMinorObjects: true,
  };

  let scene;
  let params = defaultParams;

  let seed = Math.random();
  console.log("Seed: " + seed);  
  const demo = "final"; // "objects", "lamp", "blueNoise", "debugObjects", "desk", "biomes", "singleObject", "final"

  switch (demo) {
    case "lamp":
      mainObject = lampBody;
      cameraPositionOffset = [0, 0.35, 0.75];
      zFarMultiplier = 2;
      break;
    case "objects":
      mainObject = windmill;
      cameraPositionOffset = [0, 0, 0];
      break;
    case "blueNoise":
      mainObject = debugPlane;
      cameraPositionOffset = [0, 5, -5];
      
      blueNoiseDemoPrng = new Math.seedrandom("blueNoiseDemo");
      blueNoiseDemoPositions = blueNoise(blueNoiseDemoWidth, blueNoiseDemoHeight, blueNoiseDemoGridSpacing, blueNoiseDemoInnerCellSize, blueNoiseDemoCenter, blueNoiseDemoPrng);
      break;
    case "debugObjects":
      mainObject = debugPlane;
      overrideLookAt = true;
      cameraPositionOffset = [0.5, 1.5, 2];
      break;
    case "desk":
      mainObject = deskBar;
      cameraPositionOffset = [0, 2.5, 4];
      overrideLookAt = true;
      lookAt = [0, 0.5, 0];
      zFarMultiplier = 2;
      break;
    case "biomes":
      mainObject = debugPlane;
      cameraPositionOffset = [0, 5, -5];

      const biomesDemoPrng = new Math.seedrandom("biomesDemo");
      noiseDemoGenerator = createNoise2D(biomesDemoPrng);
      break;
    case "singleObject":
      mainObject = antiqueBookLarge;
      cameraPositionOffset = [0, 0.5, -0.1];
      zFarMultiplier = 2;
      break;
    case "final":
    default:
      overrideLookAt = true;
      lookAt = [0, 1, 0];
      cameraPositionOffset = [0, 2.5, 2];
      scene = generateProceduralScene(seed, params);
      break;
  }

  let then = 0;

  function render(time) {   
    time *= 0.001;  // convert to seconds

    const deltaTime = time - then;
    then = time;

    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = twgl.m4.perspective(fieldOfViewRadians, aspect, mainObject.zNear, mainObject.zFar * zFarMultiplier);
    
    const up = [0, 1, 0];
    // Compute the camera's matrix using look at.
    let camera;
    if (!overrideLookAt) {
      camera = twgl.m4.lookAt(twgl.v3.add(mainObject.cameraPosition, cameraPositionOffset), mainObject.cameraTarget, up);
    } else {
      camera = twgl.m4.lookAt(cameraPositionOffset, lookAt, up);
    }

    // Make a view matrix from the camera matrix.
    const view = twgl.m4.inverse(camera);

    const sharedUniforms = {
      u_lightDirection: twgl.v3.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
      u_viewWorldPosition: mainObject.cameraPosition,
    };

    gl.useProgram(meshProgramInfo.program);

    // calls gl.uniform
    twgl.setUniforms(meshProgramInfo, sharedUniforms);

    switch (demo) {
      case "objects":
        const scale1 = Math.sin(time) / 2 + 1;
        const scale2 = Math.sin(time + Math.PI / 2) / 2 + 1;
        const scale3 = Math.sin(time + Math.PI) / 2 + 1;

        renderObject(gl, meshProgramInfo, windmill, [-5 + Math.sin(time) * 3.5, -3 + Math.sin(time) * 3.5, 0 + Math.sin(time) * 3.5], [time + Math.PI, time + Math.PI, time + Math.PI], [scale1, scale1, scale1]);
        renderObject(gl, meshProgramInfo, chair, [5 + Math.sin(time + Math.PI) * 3.5, -3 + Math.sin(time + Math.PI) * 3.5, 0 + Math.sin(time + Math.PI) * 3.5], [time, time, time], [scale2, scale2, scale2]);
        renderObject(gl, meshProgramInfo, demoDesk, [Math.sin(time + Math.PI / 2) * 3.5, -3 + Math.sin(time + Math.PI / 2) * 3.5, Math.sin(time + Math.PI / 2) * 3.5], [time + Math.PI / 2, time + Math.PI / 2, time + Math.PI / 2], [scale3 * 5, scale3 * 5, scale3 * 5]);
        
        break;
      case "lamp":
        const lampPosition = [Math.cos(time) * 0.25, 0, Math.sin(time) * 0.25];
        const lampLookAtRotatedRelative = rotate2DVector([0, 0.25 * (Math.sin(time) + 2)], time);
        const lampLookAt = [lampPosition[0] + lampLookAtRotatedRelative[0], lampPosition[1], lampPosition[2] + lampLookAtRotatedRelative[1]];

        renderLampLookingAt(lampPosition, lampLookAt, "antique", true);
        renderObject(gl, meshProgramInfo, debugAxis, lampLookAt);
        renderObject(gl, meshProgramInfo, debugPlane, [0, 0, 0], [0, 0, 0], [0.25, 0.25, 0.25]);
        
        break;
      case "blueNoise":
        if (timeSinceLastBlueNoiseReset > 1) {
          timeSinceLastBlueNoiseReset = 0;
          
          blueNoiseDemoPositions = blueNoise(blueNoiseDemoWidth, blueNoiseDemoHeight, blueNoiseDemoGridSpacing, blueNoiseDemoInnerCellSize, blueNoiseDemoCenter, blueNoiseDemoPrng);
        } else {
          timeSinceLastBlueNoiseReset += deltaTime;
        }

        for (const position of blueNoiseDemoPositions) {
          renderObject(gl, meshProgramInfo, debugAxis, [position[0][0], 0, position[0][1]], [0, 0, 0], [2, 2 , 2]);
          renderObject(gl, meshProgramInfo, blueNoiseOuterGridCell,  [position[1][0], 0, position[1][1]], [0, 0, 0], [blueNoiseDemoGridSpacing, blueNoiseDemoGridSpacing, blueNoiseDemoGridSpacing]);
          renderObject(gl, meshProgramInfo, blueNoiseInnerGridCell,  [position[1][0], 0, position[1][1]], [0, 0, 0], [blueNoiseDemoInnerCellSize, blueNoiseDemoInnerCellSize, blueNoiseDemoInnerCellSize]);
        }

        renderObject(gl, meshProgramInfo, debugPlane);
        
        break;
      case "debugObjects":
        renderObject(gl, meshProgramInfo, debugAxis, [0.5, 0.5, -0.5], [0, 0, 0], [2, 2, 2]);
        renderObject(gl, meshProgramInfo, debugArrow, [-0.75, 0.3, 0], [0.7, 0.4, -0.7], [0.75, 0.75, 0.75]);
        renderObject(gl, meshProgramInfo, debugPlane);
        renderObject(gl, meshProgramInfo, debugGlobalAxis);
        renderObject(gl, meshProgramInfo, debugSquare, [-0.5, 0, 0.5], [0, 0, 0], [0.5, 0.5, 0.5]);
        renderObject(gl, meshProgramInfo, debugCube, [0.5, 0.25, 0.5], [0, 0, 0], [0.5, 0.5, 0.5]);
        renderObject(gl, meshProgramInfo, debugCircle, [-0.5, 0, -0.5], [0, 0, 0], [0.25, 0.25, 0.25]);
        renderObject(gl, meshProgramInfo, debugSphere, [1, 0.75, -0.5], [0, 0, 0], [0.25, 0.25, 0.25]);
        renderObject(gl, meshProgramInfo, debugCompassRose, [1, 0, -1], [0, 0, 0], [0.5, 0.5, 0.5]);
        
        break;
      case "desk":
        let deskPosition = [0, 0, 0];
        let deskWidth = 2 + Math.sin(time);
        let deskHeight = 1 + Math.sin(time) / 2;
        let deskDepth = 1 + Math.cos(time) + 0.5;
      
        renderDesk(deskWidth, deskHeight, deskDepth, deskPosition);
        renderObject(gl, meshProgramInfo, debugPlane);

        break;
      case "biomes":
        const objects = [debugRedSquare, debugGreenSquare, debugBlueSquare, debugYellowSquare];

        for (let i = -5; i < 5; i++) {
          for (let j = -5; j < 5; j++) {
            const biome = generateBiome(i, j, 4, noiseDemoGenerator, 10);
            renderObject(gl, meshProgramInfo, objects[biome], [i + 0.5, 0, j + 0.5]);
          }
        }

        break;
      case "singleObject":
        renderObject(gl, meshProgramInfo, mainObject, [0, 0, 0], [0, time, 0]);
        renderObject(gl, meshProgramInfo, debugPlane);
        break;
      case "final":
      default:
        const renderDebugObjects = true;
        const renderWorldAxis = false;
        const useLampDebugHead = true;
        
        const renderDeskLegs = true;
        const renderDeskTop = true;

        const center = [0, 0, 0];

        if (renderDebugObjects && renderWorldAxis) {
          renderObject(gl, meshProgramInfo, debugGlobalAxis);
        }

        // Desk        
        renderDesk(params.deskWidth, params.deskHeight, params.deskDepth, center, renderDeskLegs, renderDeskTop);
        // Floor (placeholder)
        renderObject(gl, meshProgramInfo, debugPlane);
        
        // Debug objects
        if (renderDebugObjects) {
          for (const object of scene.debugObjects) {
            renderObject(gl, meshProgramInfo, object.object, twgl.v3.add(object.position, center), object.rotation, object.scale);
          }
        }

        // Major objects
        if (params.renderMajorObjects) {
          for (const object of scene.majorObjects) {
            renderObject(gl, meshProgramInfo, object.object, twgl.v3.add(object.position, center), object.rotation, object.scale);
          }
        }
        
        // Minor objects
        if (params.renderMinorObjects) {
          // Generic objects
          for (const object of scene.minorObjects) {
            renderObject(gl, meshProgramInfo, object.object, twgl.v3.add(object.position, center), object.rotation, object.scale);
          }
        
          // Lamps
          for (const lamp of scene.lamps) {
            renderLampLookingAt(twgl.v3.add(lamp.position, center), twgl.v3.add(lamp.lookAt, center), lamp.type, renderDebugObjects && useLampDebugHead && lamp.lookingAtObject);
          }
        }
        
        break;
    }

    //renderObject(gl, meshProgramInfo, debugGlobalAxis);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  function generateBiome(row, col, numBiomes, noiseGenerator, noiseScale = 2.5) {
    return Math.floor(((noiseGenerator(row / noiseScale, col / noiseScale) + 1) / 2) * numBiomes);
  }

  function renderDesk(deskWidth, deskHeight, deskDepth, deskPosition, renderLegs = true, renderTop = true, barThickness = 0.04, topThickness = 0.04) {
    const legOffset = [deskWidth / 2 - barThickness / 2, deskHeight / 2 - topThickness / 2, deskDepth / 2 - barThickness / 2];

    if (renderLegs) {
      // Southeast leg
      renderObject(gl, meshProgramInfo, deskBar, twgl.v3.add([legOffset[0], legOffset[1], legOffset[2]], deskPosition), [0, 0, 0], [barThickness, deskHeight - topThickness, barThickness]);
      // Northwest leg
      renderObject(gl, meshProgramInfo, deskBar, twgl.v3.add([legOffset[0], legOffset[1], -legOffset[2]], deskPosition), [0, 0, 0], [barThickness, deskHeight - topThickness, barThickness]);
      // Northeast leg
      renderObject(gl, meshProgramInfo, deskBar, twgl.v3.add([-legOffset[0], legOffset[1], -legOffset[2]], deskPosition), [0, 0, 0], [barThickness, deskHeight - topThickness, barThickness]);
      // Southwest leg
      renderObject(gl, meshProgramInfo, deskBar, twgl.v3.add([-legOffset[0], legOffset[1], legOffset[2]], deskPosition), [0, 0, 0], [barThickness, deskHeight - topThickness, barThickness]);
      
      // South bar
      renderObject(gl, meshProgramInfo, deskBar, twgl.v3.add([0, deskHeight - barThickness / 2 - topThickness, deskDepth / 2 - barThickness / 2], deskPosition), [0, 0, Math.PI / 2], [barThickness, deskWidth - barThickness * 2,barThickness]);
      // North bar
      renderObject(gl, meshProgramInfo, deskBar, twgl.v3.add([0, deskHeight - barThickness / 2 - topThickness, -deskDepth / 2 + barThickness / 2], deskPosition), [0, 0, Math.PI / 2], [barThickness, deskWidth - barThickness * 2,barThickness]);
      // East bar
      renderObject(gl, meshProgramInfo, deskBar, twgl.v3.add([deskWidth / 2 - barThickness / 2, deskHeight - barThickness / 2 - topThickness, 0], deskPosition), [Math.PI / 2, 0, 0], [barThickness, deskDepth - barThickness * 2,barThickness]);
      // West bar
      renderObject(gl, meshProgramInfo, deskBar, twgl.v3.add([-deskWidth / 2 + barThickness / 2, deskHeight - barThickness / 2 - topThickness, 0], deskPosition), [Math.PI / 2, 0, 0], [barThickness, deskDepth - barThickness * 2,barThickness]);
    }

    if (renderTop) {
      // The tile widths will be size that's closest to 1 (when exactly 1 there is no texture stretching).
      const deskTopTileWidth = deskWidth / (Math.round(deskWidth) | 1); // When deskWidth is less than 0.5, the width will be the same as the deskWidth
      const deskTopTileDepth = deskDepth / (Math.round(deskDepth) | 1); // Math.round(deskDepth) | 1 is 1 when Math.round(deskDepth) is 0
      
      for (let i = 0; i < deskWidth / deskTopTileWidth; i++) {
        for (let j = 0; j < deskDepth / deskTopTileDepth; j++) {
          renderObject(gl, meshProgramInfo, deskTopTile, twgl.v3.add([(i + 0.5) * deskTopTileWidth - deskWidth / 2, deskHeight - topThickness, (j + 0.5) * deskTopTileDepth - deskDepth / 2], deskPosition), [0, 0, 0], [deskTopTileWidth, topThickness, deskTopTileDepth]);
        }
      }
    }
  }

  const defaultLampHeadOffset = [0.053379, 0.375211, 0.000011];
  const antiqueLampHeadOffset = [0.053676, 0.276961, 0];

  function renderLampLookingAt(lampPosition, lookAtPosition, type = "default", debugHead = false) {
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

    renderLamp(lampPosition, lampYaw, lampHeadPitch, type, debugHead);
  }

  function renderLamp(lampPosition, lampYaw, lampHeadPitch, type = "default", useDebugHead = false) {
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

    renderObject(gl, meshProgramInfo, body, lampPosition, [0, lampYaw, 0]);
    renderObject(gl, meshProgramInfo, useDebugHead ? debugHead : head, rotatedHeadPosition, [0, lampYaw, lampHeadPitch + Math.PI/2]);
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
  
  function blueNoise(width, height, gridSpacing, innerCellSize, center, prng) { 
    const positions = new Set();
    const offset = [center[0] - (width - 1) * gridSpacing / 2, center[1] - (height - 1) * gridSpacing / 2];
    
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        let position = [i * gridSpacing + offset[0], j * gridSpacing + offset[1]];
        const center = [position[0], position[1]];
        
        position[0] += (prng() * 2 - 1) * innerCellSize / 2;
        position[1] += (prng() * 2 - 1) * innerCellSize / 2;
        
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
    
    const majorObjectsInnerCellSize = params.objectSpacing - params.objectPadding * 2;
    
    const majorObjectPositions = blueNoise(params.deskWidth / params.objectSpacing, params.deskDepth / params.objectSpacing, params.objectSpacing, majorObjectsInnerCellSize, [0, 0], majorBlueNoisePrng);
    let minorObjectPositions = new Set();

    for (const majorObject of majorObjectPositions) {
      if (blueNoiseSubdividePrng() > params.majorObjectIncidence) {
        majorObjectPositions.delete(majorObject);

        minorObjectPositions = new Set([...minorObjectPositions, ...blueNoise(params.minorObjectGridSubdivisionCuts, params.minorObjectGridSubdivisionCuts, params.objectSpacing / params.minorObjectGridSubdivisionCuts, majorObjectsInnerCellSize / params.minorObjectGridSubdivisionCuts, majorObject[1], minorBlueNoisePrng)]);
      }
    }

    scene.majorObjects = new Set();
    scene.minorObjects = new Set();
    scene.debugObjects = new Set();
    scene.lamps = new Set();

    const pendingLamps = [];
    const objectsNeedingLight = [];
    const biomeGenerator = createNoise2D(biomePrng);

    for (const majorObject of majorObjectPositions) {
      const biome = generateBiome(majorObject[0][0], majorObject[0][1], 4, biomeGenerator, params.biomeMapScale);
      if (params.renderBiomeMap) {
        addObjectToScene(debugBiomeSquares[biome], "debug", [majorObject[1][0], params.deskHeight, majorObject[1][1]], [0, 0, 0], [params.objectSpacing, params.objectSpacing, params.objectSpacing]);
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
        addObjectToScene(blueNoiseOuterGridCell, "debug", [majorObject[1][0], params.deskHeight, majorObject[1][1]], [0, 0, 0], [params.objectSpacing, params.objectSpacing, params.objectSpacing]);
        addObjectToScene(blueNoiseInnerGridCell, "debug", [majorObject[1][0], params.deskHeight, majorObject[1][1]], [0, 0, 0], [params.objectSpacing - params.objectPadding * 2, params.objectSpacing - params.objectPadding * 2, params.objectSpacing - params.objectPadding * 2]);
      }
    }

    // Minor objects
    for (const minorObject of minorObjectPositions) {
      const biome = generateBiome(minorObject[0][0], minorObject[0][1], 4, biomeGenerator, params.biomeMapScale);
      // Debug biome map
      if (params.renderBiomeMap) {
        addObjectToScene(debugBiomeSquares[biome], "debug", [minorObject[1][0], params.deskHeight, minorObject[1][1]], [0, 0, 0], [params.objectSpacing / params.minorObjectGridSubdivisionCuts, params.objectSpacing / params.minorObjectGridSubdivisionCuts, params.objectSpacing / params.minorObjectGridSubdivisionCuts]);
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
        addObjectToScene(blueNoiseOuterGridCell, "debug", [minorObject[1][0], params.deskHeight, minorObject[1][1]], [0, 0, 0], [params.objectSpacing / 2, params.objectSpacing / 2, params.objectSpacing / 2], [0.5, 0.5, 0.5]);
        addObjectToScene(blueNoiseInnerGridCell, "debug", [minorObject[1][0], params.deskHeight, minorObject[1][1]], [0, 0, 0], [params.objectSpacing / 2 - params.objectPadding, params.objectSpacing / 2 - params.objectPadding, params.objectSpacing / 2 - params.objectPadding], [0.5, 0.5, 0.5]);
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

    // Apply the Hungarian algorithm to find the best combination
    const munkers = new Munkres();
    const assignments = munkers.compute(costMatrix);

    // Render the lamps looking at the assigned objects
    for (const assignment of assignments) {
      const pendingLamp = pendingLamps[assignment[0]];
      const objectNeedingLight = objectsNeedingLight[assignment[1]];
      
      // Only make the lamp look at the object if it's within 75 centimeters
      if (Math.sqrt(Math.pow(pendingLamp[0] - objectNeedingLight[0], 2) + Math.pow(pendingLamp[1] - objectNeedingLight[1], 2)) < 0.75) {
        if (params.renderMinorObjects) {
          addLampToScene([pendingLamp[0], params.deskHeight, pendingLamp[1]], [objectNeedingLight[0], params.deskHeight, objectNeedingLight[1]], true);
        }
        pendingLamps[assignment[0]] = null;
      }
    }

    // Render the remaining lamps pointing to random points on the desk
    for (const pendingLamp of pendingLamps) {
      if (pendingLamp === null) {
        continue;
      }
      
      addLampToScene([pendingLamp[0], params.deskHeight, pendingLamp[1]], [(objectSelectionPrng() * 2 - 1) * params.deskWidth / 2, params.deskHeight, (objectSelectionPrng() * 2 - 1) * params.deskDepth / 2], false);
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

    function addLampToScene(position, lookAt, lookingAtObject) {
      const type = generateBiome(position[0], position[2], 4, biomeGenerator, params.biomeMapScale) == 2 ? "antique" : "default";
      const sceneLamp = { position, lookAt, lookingAtObject, type };
      
      scene.lamps.add(sceneLamp);
    }
  }
}

main();
