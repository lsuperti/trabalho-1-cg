"use strict";


import { renderObject, parseAndLoadOBJ } from './importer.js';


function makeIndexIterator(indices) {
  let ndx = 0;
  const fn = () => indices[ndx++];
  fn.reset = () => { ndx = 0; };
  fn.numElements = indices.length;
  return fn;
}

function makeUnindexedIterator(positions) {
  let ndx = 0;
  const fn = () => ndx++;
  fn.reset = () => { ndx = 0; };
  fn.numElements = positions.length / 3;
  return fn;
}

const subtractVector2 = (a, b) => a.map((v, ndx) => v - b[ndx]);

function generateTangents(position, texcoord, indices) {
  const getNextIndex = indices ? makeIndexIterator(indices) : makeUnindexedIterator(position);
  const numFaceVerts = getNextIndex.numElements;
  const numFaces = numFaceVerts / 3;

  const tangents = [];
  for (let i = 0; i < numFaces; ++i) {
    const n1 = getNextIndex();
    const n2 = getNextIndex();
    const n3 = getNextIndex();

    const p1 = position.slice(n1 * 3, n1 * 3 + 3);
    const p2 = position.slice(n2 * 3, n2 * 3 + 3);
    const p3 = position.slice(n3 * 3, n3 * 3 + 3);

    const uv1 = texcoord.slice(n1 * 2, n1 * 2 + 2);
    const uv2 = texcoord.slice(n2 * 2, n2 * 2 + 2);
    const uv3 = texcoord.slice(n3 * 2, n3 * 2 + 2);

    const dp12 = twgl.m4.subtract(p2, p1);
    const dp13 = twgl.m4.subtract(p3, p1);

    const duv12 = subtractVector2(uv2, uv1);
    const duv13 = subtractVector2(uv3, uv1);


    const f = 1.0 / (duv12[0] * duv13[1] - duv13[0] * duv12[1]);
    const tangent = Number.isFinite(f)
      ? twgl.v3.normalize(twgl.v3.mulScalar(twgl.v3.subtract(
          twgl.v3.mulScalar(dp12, duv13[1]),
          twgl.v3.mulScalar(dp13, duv12[1]),
        ), f))
      : [1, 0, 0];

    tangents.push(...tangent, ...tangent, ...tangent);
  }

  return tangents;
}

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

  const up = [0, 1, 0];
  const down = [0, -1, 0];
  const left = [-1, 0, 0];
  const right = [1, 0, 0];
  const forward = [0, 0, -1];
  const backward = [0, 0, 1];

  const windmill = await parseAndLoadOBJ("./assets/windmill/windmill.obj", gl, meshProgramInfo);
  const chair = await parseAndLoadOBJ("./assets/chair/chair.obj", gl, meshProgramInfo);
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
  const desk = await parseAndLoadOBJ("./assets/desk/desk.obj", gl, meshProgramInfo);
  const lampBody = await parseAndLoadOBJ("./assets/lamp/body.obj", gl, meshProgramInfo);
  const lampHead = await parseAndLoadOBJ("./assets/lamp/debugHead.obj", gl, meshProgramInfo);
  const lampHeadOffset = [0.053379, 0.375211, 0.000011];

  const demo = "blueNoise"; // "objects", "lamp", "blueNoise", "debugObjects"
  
  let cameraPositionOffset = [0, 0, 0];
  let mainObject = lampBody;
  let zFarMultiplier = 1;

  var prng = new Math.seedrandom();
  let positions;
  let centers;
  let timeSinceLastBlueNoiseReset = 0;

  const blueNoiseWidth = 10;
  const blueNoiseHeight = 10;
  const blueNoiseGridSpacing = 1;
  const blueNoiseInnerCellSize = 0.6;
  const blueNoiseCenter = [0, 0];

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
      
      positions = blueNoise(blueNoiseWidth, blueNoiseHeight, blueNoiseGridSpacing, blueNoiseInnerCellSize, blueNoiseCenter, prng);
      centers = blueNoiseCenters(blueNoiseWidth, blueNoiseHeight, blueNoiseGridSpacing, blueNoiseCenter);
      break;
    case "debugObjects":
      mainObject = debugPlane;
      cameraPositionOffset = [0.5, 1.5, -12];
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
    const camera = twgl.m4.lookAt(twgl.v3.add(mainObject.cameraPosition, cameraPositionOffset), mainObject.cameraTarget, up);

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
        renderObject(gl, meshProgramInfo, desk, [Math.sin(time + Math.PI / 2) * 3.5, -3 + Math.sin(time + Math.PI / 2) * 3.5, Math.sin(time + Math.PI / 2) * 3.5], [time + Math.PI / 2, time + Math.PI / 2, time + Math.PI / 2], [scale3 * 5, scale3 * 5, scale3 * 5]);
        
        break;
      case "lamp":
        const lampPosition = [Math.cos(time) * 0.25, 0, Math.sin(time) * 0.25];
        const lampLookAtRotatedRelative = rotate2DVector([0, 0.25 * (Math.sin(time) + 2)], time);
        const lampLookAt = [lampPosition[0] + lampLookAtRotatedRelative[0], lampPosition[1], lampPosition[2] + lampLookAtRotatedRelative[1]];

        renderLampLookingAt(lampPosition, lampLookAt);
        renderObject(gl, meshProgramInfo, debugAxis, lampLookAt, [0, 0, 0]);
        renderObject(gl, meshProgramInfo, debugPlane, [0, 0, 0], [0, 0, 0], [0.25, 0.25, 0.25]);
        
        break;
      case "blueNoise":      
        if (timeSinceLastBlueNoiseReset > 1) {
          timeSinceLastBlueNoiseReset = 0;
          
          positions = blueNoise(blueNoiseWidth, blueNoiseHeight, blueNoiseGridSpacing, blueNoiseInnerCellSize, blueNoiseCenter, prng);
        } else {
          timeSinceLastBlueNoiseReset += deltaTime;
        }

        for (let i = 0; i < positions.length; i++) {
          renderObject(gl, meshProgramInfo, debugAxis, [positions[i][0], 0, positions[i][1]], [0, 0, 0], [2, 2 , 2]);
          renderObject(gl, meshProgramInfo, blueNoiseOuterGridCell, [centers[i][0], 0, centers[i][1]], [0, 0, 0], [blueNoiseGridSpacing, blueNoiseGridSpacing, blueNoiseGridSpacing]);
          renderObject(gl, meshProgramInfo, blueNoiseInnerGridCell, [centers[i][0], 0, centers[i][1]], [0, 0, 0], [blueNoiseInnerCellSize, blueNoiseInnerCellSize, blueNoiseInnerCellSize]);
        }

        renderObject(gl, meshProgramInfo, debugPlane);
        
        break;
      case "debugObjects":
        renderObject(gl, meshProgramInfo, debugAxis, [0.5, 0.5, -0.5], [0, 0, 0], [2, 2, 2]);
        renderObject(gl, meshProgramInfo, debugArrow, [-0.75, 0.3, 0], [0.7, 0.4, -0.7], [0.75, 0.75, 0.75]);
        renderObject(gl, meshProgramInfo, debugPlane);
        renderObject(gl, meshProgramInfo, debugGlobalAxis);
        renderObject(gl, meshProgramInfo, debugSquare, [-0.5, 0, 0.5], [0, 0, 0], [0.5, 0.5, 0.5]);
        renderObject(gl, meshProgramInfo, debugCube, [0.5, 0, 0.5], [0, 0, 0], [0.5, 0.5, 0.5]);
        renderObject(gl, meshProgramInfo, debugCircle, [-0.5, 0, -0.5], [0, 0, 0], [0.25, 0.25, 0.25]);
        renderObject(gl, meshProgramInfo, debugSphere, [1, 0.75, -0.5], [0, 0, 0], [0.25, 0.25, 0.25]);
        
        break;
    }

    // renderObject(gl, meshProgramInfo, debugGlobalAxis);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  function renderLampLookingAt(lampPosition, lookAtPosition) {
    // The yaw does not consider the head offset
    let lampDirection = twgl.v3.subtract(lookAtPosition, lampPosition);
    const lampYaw = -Math.atan2(lampDirection[2], lampDirection[0]);

    // We rotate the relative head position in XZ plane based on the yaw. The X position has an additional offset so
    // that the vector considers the lightbulb as the center and not the point the head is attached to the body of the lamp.
    const rotatedHeadOffsetXZ = rotate2DVector([lampHeadOffset[0] + 0.067045, lampHeadOffset[2]], -lampYaw);
    const lampHeadPosition = twgl.v3.add(lampPosition, [rotatedHeadOffsetXZ[0], lampHeadOffset[1], rotatedHeadOffsetXZ[1]]);
    
    lampDirection = twgl.v3.subtract(lookAtPosition, lampHeadPosition);
    const lampHeadPitch = Math.atan2(lampDirection[1], Math.sqrt(lampDirection[0] * lampDirection[0] + lampDirection[2] * lampDirection[2]));

    renderLamp(lampPosition, lampYaw, lampHeadPitch);
  }

  function renderLamp(lampPosition, lampYaw, lampHeadPitch) {
    const absoluteHeadPosition = twgl.v3.add(lampPosition, lampHeadOffset);

    // The head position is not centered in the lamp, so to rotate the lamp we must find the position the head will
    // take after the rotation. To do this we interpret the head position relative to the lamp as a 2D vector in the XZ
    // plane, then rotate that vector to get the new position of the head.
    let lampXYPosition = rotate2DVector([lampHeadOffset[0], lampHeadOffset[2]], -lampYaw);
    lampXYPosition[0] += lampPosition[0];
    lampXYPosition[1] += lampPosition[2];

    const rotatedHeadPosition = [lampXYPosition[0], absoluteHeadPosition[1], lampXYPosition[1]];

    renderObject(gl, meshProgramInfo, lampBody, lampPosition, [0, lampYaw, 0]);
    renderObject(gl, meshProgramInfo, lampHead, rotatedHeadPosition, [0, lampYaw, lampHeadPitch + Math.PI/2]);
  }
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
  const positions = new Array(width * height);
  const offset = [center[0] - (width - 1) * gridSpacing / 2, center[1] - (height - 1) * gridSpacing / 2];
  
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      let position = [i * gridSpacing + offset[0], j * gridSpacing + offset[1]];
      position[0] += (prng() * 2 - 1) * innerCellSize / 2;
      position[1] += (prng() * 2 - 1) * innerCellSize / 2;

      positions[i * width + j] = position;
    }
  }

  return positions;
}

function blueNoiseCenters(width, height, gridSpacing, center) {
  const centers = new Array(width * height);
  const offset = [center[0] - (width - 1) * gridSpacing / 2, center[1] - (height - 1) * gridSpacing / 2];
  
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      let position = [i * gridSpacing + offset[0], j * gridSpacing + offset[1]];
      centers[i * width + j] = position;
    }
  }

  return centers;
}

main();