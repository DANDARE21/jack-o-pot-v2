const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_lows;
uniform float u_mids;
uniform float u_highs;
uniform float u_reactivity;
uniform float u_speed;
uniform float u_pixel_size;
uniform float u_dither_strength;
uniform int u_pattern; // 0=plasma, 1=vortex, 2=waves, 3=grid
uniform vec3 u_palette[4];

// Screen Shake (driven by Lows bass hits)
uniform vec2 u_shake;

// Tiled Logo Texture (driven by Mids and Lows)
uniform sampler2D u_logo_texture;
uniform float u_has_logo;
uniform float u_logo_scale;
uniform float u_logo_density;
uniform float u_logo_opacity;
uniform vec2 u_logo_offset; // Diagonal scrolling offset driven by Mids frequency
uniform float u_logo_rotation; // Head shake rotation angle controlled by Lows

// Standard 4x4 Bayer Matrix normalized to [0.0, 1.0)
float getBayer4x4(vec2 screenPos) {
    vec2 p = floor(mod(screenPos, 4.0));
    float x = p.x;
    float y = p.y;

    if (y < 0.5) {
        if (x < 0.5) return 0.0 / 16.0;
        if (x < 1.5) return 8.0 / 16.0;
        if (x < 2.5) return 2.0 / 16.0;
        return 10.0 / 16.0;
    } else if (y < 1.5) {
        if (x < 0.5) return 12.0 / 16.0;
        if (x < 1.5) return 4.0 / 16.0;
        if (x < 2.5) return 14.0 / 16.0;
        return 6.0 / 16.0;
    } else if (y < 2.5) {
        if (x < 0.5) return 3.0 / 16.0;
        if (x < 1.5) return 11.0 / 16.0;
        if (x < 2.5) return 1.0 / 16.0;
        return 9.0 / 16.0;
    } else {
        if (x < 0.5) return 15.0 / 16.0;
        if (x < 1.5) return 7.0 / 16.0;
        if (x < 2.5) return 13.0 / 16.0;
        return 5.0 / 16.0;
    }
}

// Perceptually-weighted Euclidean distance palette quantization
vec3 quantizeToPalette(vec3 color) {
    vec3 w = vec3(0.299, 0.587, 0.114);
    vec3 diff0 = (color - u_palette[0]) * w;
    float minDist = dot(diff0, diff0);
    vec3 closestColor = u_palette[0];

    vec3 diff1 = (color - u_palette[1]) * w;
    float dist1 = dot(diff1, diff1);
    if (dist1 < minDist) {
        minDist = dist1;
        closestColor = u_palette[1];
    }

    vec3 diff2 = (color - u_palette[2]) * w;
    float dist2 = dot(diff2, diff2);
    if (dist2 < minDist) {
        minDist = dist2;
        closestColor = u_palette[2];
    }

    vec3 diff3 = (color - u_palette[3]) * w;
    float dist3 = dot(diff3, diff3);
    if (dist3 < minDist) {
        minDist = dist3;
        closestColor = u_palette[3];
    }

    return closestColor;
}

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// Generate continuous scene color gradient (driven by Highs, Mids, and Lows with incremental peak curves)
vec3 generateSceneColor(vec2 uv, float t, float b, float tr, float m) {
    float intensity = 0.0;

    // Incremental non-linear peak curves: higher peaks trigger exponentially greater intensity
    float b_inc = pow(max(0.0, b), 1.7);
    float tr_inc = pow(max(0.0, tr), 1.8);
    float m_inc = pow(max(0.0, m), 1.6);

    if (u_pattern == 0) {
        // 0: Warped Plasma & Organic Waves (fluid liquid marble)
        float zoom = 1.0 + (b_inc * 0.40);
        vec2 p = uv * zoom;
        p *= rot(t * 0.20 + (b_inc * 0.35));

        // Multi-frequency organic domain warping
        vec2 q = vec2(sin(p.x * 2.2 + t * 0.8), cos(p.y * 2.2 + t * 0.7));
        vec2 r = vec2(sin((p.x + q.y) * 2.8 + t * 1.1), cos((p.y + q.x) * 2.8 - t * 0.85));

        float w1 = sin(dot(p, q) * 2.4 + t);
        float w2 = cos(dot(q, r) * 3.0 - t * (1.2 + tr_inc * 2.8));
        float dist = length(p + r * 0.25);
        float ring = sin(dist * 6.5 - t * 2.6 - b_inc * 4.0) * (0.30 + b_inc * 0.25);

        // Highs treble ripples: acoustic surface flutter
        float highRipples = sin((p.x - p.y) * 12.0 + t * 3.5) * tr_inc * 0.25;

        intensity = 0.5 + 0.30 * w1 + 0.25 * w2 + ring + highRipples + (b_inc * 0.25);
    } else if (u_pattern == 1) {
        // 1: Hypnotic Vortex Chasm (dual counter-rotating logarithmic spirals)
        float dist = length(uv);
        float angle = atan(uv.y, uv.x);
        float logDist = log(max(dist, 0.008));

        float spiral1 = sin(angle * 5.0 + logDist * 5.5 - t * 2.2 - b_inc * 4.0);
        float spiral2 = cos(angle * 3.0 - logDist * 3.8 + t * 1.5);
        float rings = sin(dist * 13.0 - t * 3.0);

        // Highs sound accent: radiating harmonic spokes
        float spokes = sin(angle * 12.0 + t * 2.5) * tr_inc * 0.35;

        intensity = 0.5 + 0.32 * spiral1 + 0.20 * spiral2 + 0.22 * rings + spokes + (b_inc * 0.40 * (1.0 - clamp(dist, 0.0, 1.0)));
    } else if (u_pattern == 2) {
        // 2: Soundwaves / Oscilloscope Ribbons
        float y = uv.y * 2.2;
        float x = uv.x * 3.2;

        // Ambient idle undulation breathing even without music
        float ambientBreathing = sin(t * 1.2) * 0.15;
        float wave1 = sin(x * 1.6 + t * 2.2) * (0.35 + ambientBreathing + b_inc * 0.70);
        float wave2 = sin(x * 3.0 - t * 2.8 + tr_inc * 3.5) * (0.22 + tr_inc * 0.50);
        float waveFlutter = sin(x * 14.0 + t * 7.0) * tr_inc * 0.18; // Treble flutter on cymbals/highs

        float dist1 = abs(y - wave1);
        float dist2 = abs(y - wave2 - 0.35 - waveFlutter);
        float dist3 = abs(y + wave1 * 0.5 + 0.45);

        float glow1 = 0.16 / (dist1 + 0.07);
        float glow2 = 0.13 / (dist2 + 0.07);
        float glow3 = 0.10 / (dist3 + 0.07);

        intensity = (glow1 + glow2 + glow3) * 0.42 + (b_inc * 0.28);
    } else if (u_pattern == 3) {
        // 3: Digital Perspective Grid / Cyber Void
        vec2 p = uv;
        p.y += 0.3; // Horizon level

        if (p.y < 0.0) {
            float z = -0.35 / (p.y - 0.02);
            float x = p.x * z;
            vec2 grid = abs(fract(vec2(x, z - t * 2.8 - b_inc * 3.0)) - 0.5);
            float line = smoothstep(0.40, 0.48, max(grid.x, grid.y));
            // Highs neon pulse on grid lines
            float gridPulse = line * (1.0 + tr_inc * 0.85);
            intensity = gridPulse * (1.0 - clamp(-p.y * 1.2, 0.0, 1.0)) * 1.5 + (b_inc * 0.35);
        } else {
            float sunDist = length(p - vec2(0.0, 0.25));
            float sun = smoothstep(0.45 + b_inc * 0.20, 0.0, sunDist);
            float rays = sin(atan(p.y - 0.25, p.x) * 12.0 + t * 1.2) * 0.18;
            float horizonGlow = smoothstep(0.12, 0.0, abs(p.y)) * (0.25 + tr_inc * 0.50);
            intensity = (sun + rays) * 0.85 + horizonGlow + (tr_inc * 0.35);
        }
    } else if (u_pattern == 4) {
        // 4: Balatro Hypnotic Card Swirl
        float r = length(uv);
        vec2 u = uv * (1.0 + b_inc * 0.35);
        float angle = atan(u.y, u.x);
        u = 28.0 * r * sin(angle - 4.5 * r - vec2(0.65, 2.23));

        vec2 s = vec2(u.x) + u.yy;
        vec2 timeVec = t * vec2(0.92, -0.78);

        for (int i = 0; i < 5; i++) {
            s += vec2(sin(max(u.x, u.y))) + u;
            u += sin(vec2(6.7 + 0.35 * s.y, s.x) + timeVec * (1.0 + tr_inc * 0.6)) * 0.5;
            u -= vec2(cos(u.x + u.y) - sin(0.7 * u.x - u.y));
        }

        float r_u = length(u);
        vec2 s_out = max(vec2(1.0) - 2.2 * vec2(abs(1.0 - r_u * 0.077), length(uv)), vec2(0.0));

        vec3 balatroCol;
        balatroCol.r = s_out.x * 7.0 - s_out.y * 1.0;
        balatroCol.g = s_out.x * 1.0 + s_out.y * 2.5;
        balatroCol.b = s_out.x * 1.0 + s_out.y * 5.0;

        balatroCol = balatroCol * 0.1 + vec3(0.15) + vec3(dot(max(s_out - 0.8, 0.0), vec2(1.0, 2.0)));
        intensity = clamp(dot(balatroCol, vec3(0.299, 0.587, 0.114)) + b_inc * 0.20 + tr_inc * 0.15, 0.0, 1.0);
    }

    intensity = clamp(intensity, 0.0, 1.0);

    // Audio-reactive Color Wave Effect:
    // Sound frequency energy pulses rhythmic color waves through the contours
    float colorShift = (tr_inc * 0.32 + b_inc * 0.20 + m_inc * 0.18) * sin(intensity * 6.28318 - t * 2.5);
    float modulatedIntensity = clamp(intensity + colorShift, 0.0, 1.0);

    vec3 col;
    if (modulatedIntensity < 0.333) {
        col = mix(u_palette[0], u_palette[1], modulatedIntensity / 0.333);
    } else if (modulatedIntensity < 0.666) {
        col = mix(u_palette[1], u_palette[2], (modulatedIntensity - 0.333) / 0.333);
    } else {
        col = mix(u_palette[2], u_palette[3], (modulatedIntensity - 0.666) / 0.334);
    }

    // Highs sound accent: electric ridge shimmer on high-contrast contours
    float ridgeGlow = pow(abs(sin(intensity * 9.42 + t * 1.5)), 5.0) * tr_inc * 0.75;
    col += u_palette[3] * ridgeGlow;

    // Ambient sound accent: illuminates deep shadows with warm mid-tier palette tones on sound energy
    col += u_palette[2] * (b_inc * 0.18 + tr_inc * 0.12) * (1.0 - modulatedIntensity);

    // High peak flash highlight: escalates on sharp audio hits
    col += u_palette[3] * (pow(max(0.0, tr), 2.0) * 0.60);
    return col;
}

// Sample Tiled Logo Grid (driven by Mids with diagonal movement)
vec4 sampleTiledLogo(vec2 uv, float scale, float density) {
    if (u_has_logo < 0.5 || scale <= 0.01) {
        return vec4(0.0);
    }

    // Apply diagonal offset driven by Mids frequency
    vec2 st = (uv + u_logo_offset) * density;

    // Stagger alternate rows for clean brick wallpaper tiling
    float row = floor(st.y);
    if (mod(abs(row), 2.0) > 0.5) {
        st.x += 0.5;
    }

    // Cell center coordinates [-0.5, 0.5]
    vec2 cell = fract(st) - 0.5;

    // Apply head shake rotation around cell center (slows/freezes on Lows frequencies)
    cell = rot(u_logo_rotation) * cell;

    // Scale the logo inside the cell (increases as mids reach their peak!)
    vec2 logoUv = (cell / scale) + 0.5;

    if (logoUv.x >= 0.0 && logoUv.x <= 1.0 && logoUv.y >= 0.0 && logoUv.y <= 1.0) {
        return texture2D(u_logo_texture, logoUv);
    }

    return vec4(0.0);
}

void main() {
    float pixelSize = max(1.0, u_pixel_size);

    // 1. Quantize screen coordinates to chunky virtual pixels
    vec2 pixelatedCoord = floor(gl_FragCoord.xy / pixelSize) * pixelSize;

    // 2. Apply bass low-frequency screen shake to coordinates
    vec2 shakenCoord = pixelatedCoord + u_shake;
    vec2 uv = (shakenCoord - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    // 3. Audio & Time parameters (Highs, Mids, Lows)
    float t = u_time;
    float b = u_lows * u_reactivity;
    float m = u_mids * u_reactivity;
    float tr = u_highs * u_reactivity;

    // Audio-reactive Chromatic Aberration:
    // Treble and audio peaks separate color channels slightly for an electrifying retro CRT accent
    float chromaOffset = (pow(max(0.0, tr), 1.7) * 0.035 + pow(max(0.0, b), 2.0) * 0.020);
    vec3 bgCol;
    if (chromaOffset > 0.003) {
        vec2 uvR = uv * (1.0 + chromaOffset);
        vec2 uvB = uv * (1.0 - chromaOffset);
        vec3 colR = generateSceneColor(uvR, t, b, tr, m);
        vec3 colG = generateSceneColor(uv, t, b, tr, m);
        vec3 colB = generateSceneColor(uvB, t, b, tr, m);
        bgCol = vec3(colR.r, colG.g, colB.b);
    } else {
        bgCol = generateSceneColor(uv, t, b, tr, m);
    }

    // 4. Mids control the tiled logo background layer (size increases as sound peaks)
    vec4 logoColor = sampleTiledLogo(uv, u_logo_scale, u_logo_density);

    // Add peak glow flash to the logo on higher mids peaks
    vec3 logoRgb = logoColor.rgb + (u_palette[3] * pow(max(0.0, u_mids), 2.0) * 0.40);

    // Composite logo ON TOP of generated background, but BEFORE pixelation/dither!
    vec3 compositeColor = mix(bgCol, logoRgb, logoColor.a * u_logo_opacity);

    // 5. Bayer 4x4 Dither Threshold Offset (-0.5 to +0.5 spread)
    float ditherValue = getBayer4x4(floor(gl_FragCoord.xy / pixelSize));
    compositeColor += (ditherValue - 0.5) * u_dither_strength;
    compositeColor = clamp(compositeColor, 0.0, 1.0);

    // 6. Quantize final composite to our 4-color palette
    vec3 finalColor = quantizeToPalette(compositeColor);

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const COLOR_PALETTES = {
  jack_o_flame: {
    name: "Jack-o-Flame (Pumpkin Fire)",
    colors: [
      [0.047, 0.027, 0.078], // #0c0714 Obsidian Navy
      [0.400, 0.094, 0.012], // #661803 Burning Ember
      [0.968, 0.403, 0.027], // #f76707 Jack-o-Orange
      [1.000, 0.831, 0.231], // #ffd43b Flame Gold
    ],
  },
  lospec_retro: {
    name: "Lospec Retro (Cyberpunk Hot Pink)",
    colors: [
      [0.047, 0.063, 0.200], // #0c1033 Dark Navy
      [0.039, 0.227, 0.165], // #0a3a2a Deep Forest Green
      [1.000, 0.000, 0.498], // #ff007f Hot Pink
      [0.950, 0.950, 0.950], // #f2f2f2 Near White
    ],
  },
  cursed_blood: {
    name: "Demonic Crimson (Cursed)",
    colors: [
      [0.039, 0.004, 0.020], // #0a0105 Abyssal Void
      [0.302, 0.020, 0.098], // #4d0519 Dried Blood
      [0.878, 0.102, 0.310], // #e01a4f Demonic Crimson
      [1.000, 0.600, 0.784], // #ff99c8 Spectral Rose
    ],
  },
  toxic_acid: {
    name: "Acid Hazard (Toxic Slime)",
    colors: [
      [0.012, 0.051, 0.027], // #030d07 Toxic Void
      [0.059, 0.239, 0.118], // #0f3d1e Slime Shadow
      [0.063, 0.878, 0.314], // #10e050 Electric Lime
      [0.847, 1.000, 0.329], // #d8ff54 Acid Phosphor
    ],
  },
  gameboy_dmg: {
    name: "GameBoy Classic (1989 DMG)",
    colors: [
      [0.059, 0.220, 0.059], // #0f380f Darkest Moss
      [0.188, 0.384, 0.188], // #306230 Dark Olive
      [0.545, 0.675, 0.059], // #8bac0f Light Pea
      [0.608, 0.737, 0.059], // #9bbc0f Mint Glow
    ],
  },
  midnight_synth: {
    name: "Midnight Synthwave (Outrun)",
    colors: [
      [0.059, 0.020, 0.114], // #0f051d Midnight Void
      [0.357, 0.078, 0.502], // #5b1480 Neon Violet
      [0.878, 0.141, 0.765], // #e024c3 Cyber Magenta
      [0.000, 0.961, 0.831], // #00f5d4 Laser Cyan
    ],
  },
  gothic_crypt: {
    name: "Castlevania Crypt (Haunted Fog)",
    colors: [
      [0.031, 0.027, 0.051], // #08070d Tomb Black
      [0.169, 0.141, 0.220], // #2b2438 Crypt Slate
      [0.498, 0.431, 0.569], // #7f6e91 Lavender Mist
      [0.910, 0.878, 0.835], // #e8e0d5 Spectral Bone
    ],
  },
  noir_monochrome: {
    name: "1-Bit Noir (Macintosh / Obra Dinn)",
    colors: [
      [0.020, 0.020, 0.020], // #050505 Ink Black
      [0.220, 0.220, 0.220], // #383838 Charcoal
      [0.612, 0.612, 0.612], // #9c9c9c Silver Gray
      [0.984, 0.984, 0.984], // #fbfbfb Paper White
    ],
  },
};

export const PATTERN_MAP = {
  plasma: 0,
  vortex: 1,
  waves: 2,
  grid: 3,
  balatro: 4,
};

export const LOGO_TEXTURE_OPTIONS = [
  { value: "dandare", label: "Dandare (Default)", url: "/assets/images/dandare.png", icon: "game-icons:crown" },
  { value: "pumpkin", label: "Pixel Pumpkin", url: "/assets/images/pumpkin.png", icon: "game-icons:jack-o-lantern" },
  { value: "skull", label: "Demonic Skull", url: "/assets/images/skull.png", icon: "game-icons:skull-crossed-bones" },
  { value: "six", label: "Six Logo", url: "/assets/images/six.png", icon: "game-icons:rolling-dices" },
  { value: "custom", label: "Custom Texture / Upload", url: "", icon: "game-icons:photo-camera" },
];

export function getLogoTextureUrl(textureKey, customUrl = "") {
  if (textureKey === "custom" && customUrl) return customUrl;
  const match = LOGO_TEXTURE_OPTIONS.find((t) => t.value === textureKey);
  return match?.url || "/assets/images/dandare.png";
}

export class WebGLBackgroundRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl =
      canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        powerPreference: "low-power",
      }) ||
      canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        powerPreference: "low-power",
      });

    if (!this.gl) {
      console.warn("WebGL not supported on this device.");
      return;
    }

    this.program = null;
    this.uniforms = {};
    this.logoTexture = null;
    this.hasLogoTexture = false;

    this.init();
    this.loadLogoTexture("/assets/images/dandare.png");
  }

  loadLogoTexture(url) {
    const gl = this.gl;
    if (!gl || !url) return;
    if (this.currentLogoUrl === url && this.hasLogoTexture) return;
    this.currentLogoUrl = url;

    const texture = this.logoTexture || gl.createTexture();
    this.logoTexture = texture;
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Initial 1x1 blank placeholder pixel
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0])
    );

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Discard if url changed while loading
      if (this.currentLogoUrl !== url) return;

      try {
        // Pre-filter onto an offscreen 512x512 canvas for power-of-two (POT) compatibility & crisp downsampling
        const offscreen = document.createElement("canvas");
        offscreen.width = 512;
        offscreen.height = 512;
        const ctx = offscreen.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, 512, 512);

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          offscreen
        );

        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.hasLogoTexture = true;
      } catch (e) {
        console.warn("Error uploading logo texture:", e);
      }
    };
    img.onerror = (e) => {
      console.warn("Could not load logo image at:", url, e);
    };
    img.src = url;
  }

  createShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  init() {
    const gl = this.gl;
    if (!gl) return;

    const vertShader = this.createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fragShader = this.createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    this.program = program;
    gl.useProgram(program);

    // Full-screen Quad buffer: 2 triangles (triangle strip)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPositionLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPositionLoc);
    gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

    // Cache uniform locations
    this.uniforms = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      lows: gl.getUniformLocation(program, "u_lows"),
      mids: gl.getUniformLocation(program, "u_mids"),
      highs: gl.getUniformLocation(program, "u_highs"),
      reactivity: gl.getUniformLocation(program, "u_reactivity"),
      speed: gl.getUniformLocation(program, "u_speed"),
      pixelSize: gl.getUniformLocation(program, "u_pixel_size"),
      ditherStrength: gl.getUniformLocation(program, "u_dither_strength"),
      pattern: gl.getUniformLocation(program, "u_pattern"),
      palette: gl.getUniformLocation(program, "u_palette[0]") || gl.getUniformLocation(program, "u_palette"),
      shake: gl.getUniformLocation(program, "u_shake"),
      logoTexture: gl.getUniformLocation(program, "u_logo_texture"),
      hasLogo: gl.getUniformLocation(program, "u_has_logo"),
      logoScale: gl.getUniformLocation(program, "u_logo_scale"),
      logoDensity: gl.getUniformLocation(program, "u_logo_density"),
      logoOpacity: gl.getUniformLocation(program, "u_logo_opacity"),
      logoOffset: gl.getUniformLocation(program, "u_logo_offset"),
      logoRotation: gl.getUniformLocation(program, "u_logo_rotation"),
    };
  }

  resize(downscaleFactor = 2) {
    if (!this.canvas) return;
    const width = Math.max(160, Math.floor(window.innerWidth / downscaleFactor));
    const height = Math.max(90, Math.floor(window.innerHeight / downscaleFactor));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl?.viewport(0, 0, width, height);
    }
  }

  render({
    timeMovement = 0,
    lows = 0,
    mids = 0,
    highs = 0,
    shake = [0, 0],
    enableLogo = true,
    logoScale = 0.35,
    logoDensity = 4.0,
    logoOpacity = 0.85,
    logoOffset = [0, 0],
    logoRotation = 0.0,
    pixelSize = 4.0,
    ditherStrength = 0.25,
    reactivity = 1.0,
    speed = 1.0,
    pattern = 0,
    palette = COLOR_PALETTES.jack_o_flame.colors,
  }) {
    const gl = this.gl;
    if (!gl || !this.program) return;

    gl.useProgram(this.program);

    gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniforms.time, timeMovement);
    gl.uniform1f(this.uniforms.lows, lows);
    gl.uniform1f(this.uniforms.mids, mids);
    gl.uniform1f(this.uniforms.highs, highs);
    gl.uniform1f(this.uniforms.reactivity, reactivity);
    gl.uniform1f(this.uniforms.speed, speed);
    gl.uniform1f(this.uniforms.pixelSize, pixelSize);
    gl.uniform1f(this.uniforms.ditherStrength, ditherStrength);
    gl.uniform1i(this.uniforms.pattern, pattern);

    // Bass Screen Shake offset
    gl.uniform2f(this.uniforms.shake, shake[0], shake[1]);

    // Tiled Logo Uniforms (size, diagonal scrolling offset, and head shake rotation)
    gl.uniform1f(this.uniforms.hasLogo, enableLogo && this.hasLogoTexture ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.logoScale, logoScale);
    gl.uniform1f(this.uniforms.logoDensity, logoDensity);
    gl.uniform1f(this.uniforms.logoOpacity, logoOpacity);
    gl.uniform2f(this.uniforms.logoOffset, logoOffset[0], logoOffset[1]);
    gl.uniform1f(this.uniforms.logoRotation, logoRotation);

    if (this.logoTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.logoTexture);
      gl.uniform1i(this.uniforms.logoTexture, 0);
    }

    // Flatten palette: 4 vec3s -> 12 floats
    const flatPalette = new Float32Array(12);
    for (let i = 0; i < 4; i++) {
      const col = palette[i] || [0, 0, 0];
      flatPalette[i * 3 + 0] = col[0];
      flatPalette[i * 3 + 1] = col[1];
      flatPalette[i * 3 + 2] = col[2];
    }
    gl.uniform3fv(this.uniforms.palette, flatPalette);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    if (this.gl) {
      if (this.logoTexture) {
        this.gl.deleteTexture(this.logoTexture);
        this.logoTexture = null;
      }
      if (this.program) {
        this.gl.deleteProgram(this.program);
        this.program = null;
      }
    }
  }
}
