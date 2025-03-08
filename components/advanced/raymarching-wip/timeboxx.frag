// 3D background shader using ray marching

uniform float uTime;
uniform float uAspect;
uniform vec3 uBgColour;
uniform vec3 uGroundColour;
uniform vec3 uBgBoxColour;
uniform bool uIsActive;
uniform vec3 uActiveBoxColour;
uniform bool uAddVignette;

// TODO: toggle shadows and increase iterations if high performance mode
uniform bool uIsHighPerformance;

varying vec2 vUv;

#define PI 3.141592653
#define MAX_ITERATIONS 80
#define MIN_DISTANCE 0.001
#define MAX_DISTANCE 20.0
#define SHADOWS 1
#define FOV 70.0

const float FOV_MULTIPLIER = tan(PI * 0.5 * FOV / 180.0); // Convert FOV to radians

// Smooth minimum function
// Note: K can be animated to adjust the merge intensity of the two shapes
// float smin(in float a, in float b, in float k) {
//   float h = max(k - abs(a-b), 0.0) / k;
//   return min(a, b) - h * h * h * k * (1.0/6.0);
// }

// 2D rotation matrix
mat2 rot2D(in float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

float sdBox(in vec3 p, in vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdRoundBox(in vec3 p, in vec3 b, in float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
}

struct DistColour {
  float dist;  // The signed distance to the fractal
  vec3 colour;  // The color of the fractal at this point
};

DistColour map(in vec3 p, in bool calcColour) {
  // Foreground box
  vec3 boxP = p - vec3(1.2, 0.4, 1.5); // Position the box
  boxP.xz *= rot2D(uTime * 0.2); // Rotate the box
  vec3 box = vec3(0.075); // Box size
  float boxD = sdRoundBox(boxP, box, 0.01);

  // Background boxes
  vec3 boxesP = p - vec3(uTime * 0.025, 0.5, 0.0); 
  boxesP = mod(boxesP, 1.0) - 0.5; // Repeat the pattern
  vec3 boxes = vec3(0.2); // Box size
  float boxesD = sdRoundBox(boxesP, boxes, 0.04);

  // Plane-based clip
  float clipZ = 3.0;
  float planeD = p.z - clipZ;
  float clippedBoxesD = max(boxesD, -planeD);

  DistColour distColour;

  float minDistance = min(uIsActive ? boxD : MAX_DISTANCE, clippedBoxesD);

  distColour.dist = minDistance;
  distColour.colour = uBgColour;

  // Assign the colour of the closest surface
  if (boxD == minDistance) {
    distColour.colour = uActiveBoxColour;
    return distColour;
  }

  if (boxesD == minDistance) {
    distColour.colour = uBgBoxColour;
    return distColour;
  }

  return distColour;
}

// Map function for the scene
DistColour getDistanceAndColor(in vec3 p) {
  return map(p, true);
}

float getDistance(in vec3 p) {
  return map(p, false).dist;
}


vec3 getNormal(in vec3 p) {
	float d = getDistance(p);
  vec2 e = vec2(.01, 0);
  vec3 n = d - vec3(getDistance(p-e.xyy), getDistance(p-e.yxy), getDistance(p-e.yyx));
  return normalize(n);
}


float rayMarch(in vec3 ro, in vec3 rd, inout vec3 colour) {
  // Loop through the raymarching algorithm
  float td = 0.0; // Total distance travelled

  for(int i = 0; i < MAX_ITERATIONS; i++) {
    vec3 p = ro + rd * td; // Current point on the ray
    DistColour result = getDistanceAndColor(p);  // Distance to the closest surface
    float d = result.dist; // Distance to the closest surface
    
    if (d <= MIN_DISTANCE) {
        colour = result.colour; // Set color if the surface is hit
        break;
    }

    td += d; // Move the ray forward
    if (td >= MAX_DISTANCE) break; // Break if we are too far away
  }

  return td; 
}


float softShadow(in vec3 ro, in vec3 rd, float mint, float maxt, float w) {
    // 'w' influences how quickly the shadow factor drops off
    float res = 1.0;
    float t = mint;
    for (int i = 0; i < 64 && t < maxt; i++) {
        float h = getDistance(ro + t * rd);
        // Keep track of the minimum ratio of distance to 'w*t'
        res = min(res, h / (w * t));
        // March forward
        t += clamp(h, 0.005, 0.50);
        // If res gets too negative or we exceed max distance, break early
        if (res < -1.0 || t > maxt) break;
    }
    // Clamp to at least -1.0
    res = max(res, -1.0);

    // A polynomial remap to get softer edges (often called "k factor")
    // 0.25*(1+res)*(1+res)*(2-res) is a trick to keep soft shadows stable
    return 0.25 * (1.0 + res) * (1.0 + res) * (2.0 - res);
}


float getLight(in vec3 p, in vec3 camPos, in vec3 lightPos, in float intensity) {
    // Compute the light direction vector
    vec3 l = normalize(lightPos - p);
    
    // Compute the normal at the point `p`
    vec3 n = getNormal(p);
    
    // Diffuse lighting (Lambertian reflection) I=L⋅N
    float dif = clamp(dot(l, n), 0.0, 1.0);

    // Compute soft shadowing
    float s = 0.25; // Shadow factor

    if (SHADOWS == 1) {
      vec3 roOffset = p + n * 0.01; // Prevent self-shadowing
      s = softShadow(roOffset, l, 0.05, length(lightPos - p), 8.0);
      // Adjust shadow contrast
      float shadowContrast = 1.2; // Controls shadow intensity curve
      s = pow(s, shadowContrast); // Apply contrast adjustment to shadow factor
      // Apply shadow attenuation to diffuse lighting
      dif *= s;
    }

    // Compute distance attenuation
    float dist = length(lightPos - p); // Distance to the light source
    float attenuation = clamp(1.0 / (dist * dist), 0.0, 1.0);

    // Modulate diffuse lighting by attenuation and intensity
    dif *= attenuation * intensity;

    // Add ambient lighting (baseline illumination)
    float ambient = 0.25; // Ambient light intensity
    float lightContribution = dif + ambient;

    // Specular highlights (Blinn-Phong model)
    vec3 viewDir = normalize(camPos - p); // View direction 

    vec3 halfDir = normalize(l + viewDir); // Halfway vector
    float spec = pow(clamp(dot(n, halfDir), 0.0, 1.0), 2.0); // Specular exponent

    // Modulate specular with shadowing and attenuation
    spec *= s * attenuation * intensity;

    // Combine diffuse, ambient, and specular contributions
    lightContribution += spec * 1.6; // Scale specular for balance

    return lightContribution;
}

void main() {
  // Normalize UV coordinates to [-1, 1]
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uAspect;
  uv *= FOV_MULTIPLIER;

  // ray origin (camera position)
  vec3 ro = vec3(0.0, 1.0, 0.0);
  // ray direction  
  vec3 rd = normalize(vec3(uv, 1.0));

  vec3 colour = uBgColour; 
  
  // Fade out using a circle
  float fade = smoothstep(0.16, 1.35, length(vec2(uv.x - 0.6, uv.y + 0.6)));
  // If the pixel is fully faded out, return the background colour and skip raymarching
  if (uAddVignette && fade == 1.0) {
    gl_FragColor = vec4(colour, 1.0);
    return;
  }

  // Raymarch the scene
  float td = rayMarch(ro, rd, colour); // Total distance travelled
  vec3 p = ro + rd * td; // Intersection point

  if (td >= MAX_DISTANCE) {
    gl_FragColor = vec4(colour, 1.0);
    return;
  }

  vec3 lightPos = vec3(3.0, 0.6, 0.5);
  float lightIntensity = 11.0;
  float light = getLight(p, ro, lightPos, lightIntensity);
  colour *= light; // Apply lighting

  if (uAddVignette) {
    colour = mix(colour, uBgColour, fade);
  }

  gl_FragColor = vec4(colour, 1.0);
} 






