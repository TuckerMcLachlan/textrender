export declare const vertex = "#version 300 es\nprecision highp float;\nout vec2 v_uv;\nvoid main() {\n  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));\n  v_uv = p;\n  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);\n}";
export declare const fragment: (material: string, extendsGlyph?: boolean) => string;
