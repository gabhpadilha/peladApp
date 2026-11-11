"""Carta Destino em 3D (teste): a carta como objeto de verdade, com as artes do Gemini como textura.

Placa de ferro com espessura (fundo da Destino na frente), moldura em relevo tirada da arte `premium-destino-vaza`
(o alfa vira altura, as runas verdes viram luz), cachos de esmeralda em vidro 3D nos cantos de cima, círculo arcano
atrás, runas de pedra em prisma hexagonal e cacos de esmeralda flutuando, poeira verde, névoa leve e luz de estúdio
em 4 pontos. Modo "pure": só o design, sem foto nem números.

    python carta-3d.py -- rx=1080 ry=1512 samples=128 view=34 out=/tmp/saida
`view`: 34 (três quartos, padrão), front (de frente) ou low (de baixo, mais dramático). `fog=0` desliga a névoa.
Sai `<out>/destino-<view>.png` com fundo transparente.
"""
import bpy, bmesh, math, os, sys, random
import numpy as np
from mathutils import Vector, Euler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_device import setup_device

ARGS = dict(a.split('=') for a in sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else {}
RX = int(ARGS.get('rx', 360)); RY = int(ARGS.get('ry', 504)); SAMPLES = int(ARGS.get('samples', 16))
OUT = ARGS.get('out', '/tmp/carta3d'); VIEW = ARGS.get('view', '34'); FOG = ARGS.get('fog', '1') == '1'
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ART = os.path.join(ROOT, 'public', 'cartas', 'fundos')
os.makedirs(OUT, exist_ok=True)
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------- utilidades de material ----------
def img(name):
    return bpy.data.images.load(os.path.join(ART, name), check_existing=True)

def new_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    return m, nt, bsdf

def green_mask(nt, color_socket, gain=6.0):
    """Quanto o pixel é verde-esmeralda (G acima de R e B): vira a força da luz das runas."""
    sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(color_socket, sep.inputs[0])
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'
    nt.links.new(sep.outputs[0], mx.inputs[0]); nt.links.new(sep.outputs[2], mx.inputs[1])
    sub = nt.nodes.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'
    nt.links.new(sep.outputs[1], sub.inputs[0]); nt.links.new(mx.outputs[0], sub.inputs[1])
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.use_clamp = True
    nt.links.new(sub.outputs[0], mul.inputs[0]); mul.inputs[1].default_value = gain
    return mul.outputs[0]

def art_material(name, image, metallic=0.85, rough=0.38, glow=4.0, bump=0.25, use_alpha=True):
    """Arte do Gemini como cor; o verde vira emissão; o brilho vira relevo fino."""
    m, nt, bsdf = new_mat(name)
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = image; tex.interpolation = 'Cubic'; tex.extension = 'CLIP'
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    if use_alpha:
        nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
    g = green_mask(nt, tex.outputs['Color'])
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = metallic
    nt.links.new(g, inv.inputs[1]); inv.use_clamp = True
    nt.links.new(inv.outputs[0], bsdf.inputs['Metallic'])
    bsdf.inputs['Roughness'].default_value = rough
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
    em = nt.nodes.new('ShaderNodeMath'); em.operation = 'MULTIPLY'; em.inputs[1].default_value = glow
    nt.links.new(g, em.inputs[0]); nt.links.new(em.outputs[0], bsdf.inputs['Emission Strength'])
    bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(tex.outputs['Color'], bw.inputs[0])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = 0.004
    nt.links.new(bw.outputs[0], bp.inputs['Height']); nt.links.new(bp.outputs[0], bsdf.inputs['Normal'])
    return m

def glass_mat(name, col, emit=0.25):
    m, nt, b = new_mat(name)
    b.inputs['Base Color'].default_value = (*col, 1)
    b.inputs['Transmission Weight'].default_value = 1.0
    b.inputs['IOR'].default_value = 1.58
    b.inputs['Roughness'].default_value = 0.04
    b.inputs['Emission Color'].default_value = (*col, 1); b.inputs['Emission Strength'].default_value = emit
    return m

def stone_mat(name):
    m, nt, b = new_mat(name)
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 18; nz.inputs['Detail'].default_value = 8
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.035, 0.038, 0.04, 1); ramp.color_ramp.elements[1].color = (0.16, 0.17, 0.17, 1)
    nt.links.new(nz.outputs['Fac'], ramp.inputs[0]); nt.links.new(ramp.outputs[0], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.85
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.6
    nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
    return m

def emit_mat(name, col, k):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*col, 1); e.inputs['Strength'].default_value = k
    o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0]); return m

def link(ob, parent=None):
    scene.collection.objects.link(ob)
    if parent: ob.parent = parent
    return ob

# ---------- medidas: carta 5:7, a caixa da carta dentro da arte de moldura ----------
W, H, T = 2.0, 2.8, 0.06          # largura, altura, espessura da placa
R = 0.15                          # raio do canto
VAZA_PX = (1000, 1400); BOX = (79, 118, 919, 1293)   # lado de fora da moldura na arte (medido pelo alfa)
px2u = W / (BOX[2] - BOX[0])
FW, FH = VAZA_PX[0] * px2u, VAZA_PX[1] * px2u
FCX = (VAZA_PX[0] / 2 - (BOX[0] + BOX[2]) / 2) * px2u
FCY = -(VAZA_PX[1] / 2 - (BOX[1] + BOX[3]) / 2) * px2u
def vaza_xy(px, py):
    return ((px - (BOX[0] + BOX[2]) / 2) * px2u, -(py - (BOX[1] + BOX[3]) / 2) * px2u)

rig = bpy.data.objects.new('carta', None); link(rig)

# ---------- placa de ferro (frente = fundo da Destino) ----------
def rounded_rect(w, h, r, seg=10):
    pts = []
    for cx, cy, a0 in ((w/2 - r, h/2 - r, 0), (-w/2 + r, h/2 - r, 90), (-w/2 + r, -h/2 + r, 180), (w/2 - r, -h/2 + r, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg); pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

me = bpy.data.meshes.new('placa'); bm = bmesh.new()
pts = rounded_rect(W * 0.985, H * 0.99, R)
front = bm.faces.new([bm.verts.new((x, y, T / 2)) for x, y in pts])
ext = bmesh.ops.extrude_face_region(bm, geom=[front])
for v in [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.z = -T / 2
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
uv = bm.loops.layers.uv.new()
for f in bm.faces:
    f.material_index = 0 if f.normal.z > 0.9 else 1
    for l in f.loops: l[uv].uv = ((l.vert.co.x + W / 2) / W, (l.vert.co.y + H / 2) / H)
bm.to_mesh(me); bm.free()
placa = link(bpy.data.objects.new('placa', me), rig)
bev = placa.modifiers.new('bev', 'BEVEL'); bev.width = 0.012; bev.segments = 3; bev.limit_method = 'ANGLE'
placa.data.materials.append(art_material('fundo', img('premium-destino.webp'), metallic=0.55, rough=0.45, glow=5.0, bump=0.35, use_alpha=False))
_, nt, b = new_mat('ferro'); b.inputs['Base Color'].default_value = (0.05, 0.055, 0.06, 1); b.inputs['Metallic'].default_value = 1; b.inputs['Roughness'].default_value = 0.42
placa.data.materials.append(bpy.data.materials['ferro'])
for p in placa.data.polygons: p.use_smooth = False

# ---------- moldura em relevo: o alfa da arte vira altura ----------
from PIL import Image, ImageFilter
va = Image.open(os.path.join(ART, 'premium-destino-vaza.webp')).convert('RGBA')
a = np.asarray(va.split()[3].filter(ImageFilter.GaussianBlur(4)), dtype=np.float32) / 255.0
lum = np.asarray(va.convert('L').filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32) / 255.0
hmap = np.clip(a ** 0.7 * 0.8 + lum * a * 0.2, 0, 1)
hpath = os.path.join(OUT, '_altura-moldura.png'); Image.fromarray((hmap * 255).astype(np.uint8)).save(hpath)

bpy.ops.mesh.primitive_grid_add(x_subdivisions=460, y_subdivisions=644, size=1)
mold = bpy.context.active_object; mold.name = 'moldura'
mold.scale = (FW, FH, 1); mold.location = (FCX, FCY, T / 2 + 0.002)
bpy.ops.object.transform_apply(scale=True)
mold.parent = rig
htex = bpy.data.textures.new('altura', 'IMAGE'); htex.image = bpy.data.images.load(hpath); htex.extension = 'EXTEND'
dsp = mold.modifiers.new('relevo', 'DISPLACE'); dsp.texture = htex; dsp.texture_coords = 'UV'; dsp.strength = 0.07; dsp.mid_level = 0.0
mold.modifiers.new('suave', 'SMOOTH').factor = 0.4
bpy.ops.object.shade_smooth()
mold.data.materials.append(art_material('moldura', img('premium-destino-vaza.webp'), metallic=0.9, rough=0.3, glow=6.0, bump=0.5))

# ---------- cachos de esmeralda em 3D nos cantos de cima (vazam da carta) ----------
def crystal(length, radius, sides=6):
    me = bpy.data.meshes.new('cristal'); bm = bmesh.new()
    base = [bm.verts.new((radius * math.cos(2 * math.pi * i / sides), 0, radius * math.sin(2 * math.pi * i / sides))) for i in range(sides)]
    mid = [bm.verts.new((radius * 1.05 * math.cos(2 * math.pi * i / sides), length * 0.72, radius * 1.05 * math.sin(2 * math.pi * i / sides))) for i in range(sides)]
    tip = bm.verts.new((radius * 0.1, length, 0))
    bm.faces.new(list(reversed(base)))
    for i in range(sides):
        j = (i + 1) % sides
        bm.faces.new([base[i], base[j], mid[j], mid[i]]); bm.faces.new([mid[i], mid[j], tip])
    bm.to_mesh(me); bm.free(); return me

EMER = glass_mat('esmeralda', (0.01, 0.62, 0.2), emit=0.6)
def cluster(cx, cy, side, parent, n=7):
    hub = link(bpy.data.objects.new('cacho', None), parent); hub.location = (cx, cy, 0.09)
    for i in range(n):
        L = random.uniform(0.22, 0.48) * (1.2 if i == 0 else 1.0); r = L * random.uniform(0.16, 0.22)
        ob = link(bpy.data.objects.new('cristal', crystal(L, r)), hub)
        ob.data.materials.append(EMER)
        ang = math.radians(side * random.uniform(-10, 70) + (0 if side > 0 else 0))
        ob.rotation_euler = Euler((random.uniform(-0.5, 0.6), random.uniform(0, 6.28), -side * random.uniform(0.0, 1.1)), 'XYZ')
        ob.location = (random.uniform(-0.07, 0.07), random.uniform(-0.05, 0.05), random.uniform(-0.03, 0.05))
        ob.modifiers.new('b', 'BEVEL').width = 0.004
for side, px in ((-1, 95), (1, 905)):
    x, y = vaza_xy(px, 150); cluster(x, y, side, rig)

# ---------- círculo arcano atrás da carta ----------
bpy.ops.mesh.primitive_plane_add(size=1)
circ = bpy.context.active_object; circ.name = 'circulo'; circ.scale = (3.5, 3.5, 1); circ.location = (0, 0.05, -0.7)
bpy.ops.object.transform_apply(scale=True); circ.parent = rig
circ.data.materials.append(art_material('circulo', img('destino-circulo.webp'), metallic=0.8, rough=0.3, glow=7.0, bump=0.4))
for rr in (1.71, 1.255):
    bpy.ops.mesh.primitive_torus_add(major_radius=rr, minor_radius=0.022, major_segments=160, minor_segments=12, location=(0, 0.05, -0.71))
    t = bpy.context.active_object; t.parent = rig
    _, nt, b = new_mat('ouro'); b.inputs['Base Color'].default_value = (0.85, 0.62, 0.3, 1); b.inputs['Metallic'].default_value = 1; b.inputs['Roughness'].default_value = 0.25
    t.data.materials.append(bpy.data.materials[-1])
circ_spin = Euler((math.radians(-8), math.radians(14), 0), 'XYZ')

# ---------- runas de pedra (prisma hexagonal + a arte na frente) ----------
STONE = stone_mat('pedra'); RUNE = art_material('runa', img('destino-runa.webp'), metallic=0.1, rough=0.7, glow=8.0, bump=0.6)
def rune(x, y, z, size, rot):
    hub = link(bpy.data.objects.new('runa', None), rig); hub.location = (x, y, z); hub.rotation_euler = rot
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=size * 0.44, depth=size * 0.16, rotation=(0, 0, math.radians(90)))
    pr = bpy.context.active_object; pr.parent = hub; pr.data.materials.append(STONE)
    pr.modifiers.new('b', 'BEVEL').width = size * 0.02
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, size * 0.081))
    fc = bpy.context.active_object; fc.parent = hub; fc.data.materials.append(RUNE)

def card_xy(fx, fy):           # posições em % da caixa da carta, como nos floaters do app
    return ((fx / 100 - 0.5) * W, (0.5 - fy / 100) * H)
for fx, fy, sz, z, rz in ((-9, 30, 0.58, 0.55, -8), (109, 60, 0.5, 0.35, 10), (-7, 84, 0.42, 0.25, 6), (107, 12, 0.4, 0.6, -12)):
    x, y = card_xy(fx, fy)
    rune(x, y, z, sz, Euler((math.radians(random.uniform(-15, 15)), math.radians(random.uniform(-25, 25)), math.radians(rz)), 'XYZ'))

# ---------- cacos de esmeralda soltos ----------
def shard(x, y, z, s):
    me = bpy.data.meshes.new('caco'); bm = bmesh.new()
    pts = [Vector((random.gauss(0, 0.5), random.gauss(0, 1.0), random.gauss(0, 0.35))) for _ in range(14)]
    for p in pts: bm.verts.new(p * s)
    bmesh.ops.convex_hull(bm, input=bm.verts); bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new('caco', me), rig); ob.location = (x, y, z)
    ob.rotation_euler = (random.uniform(0, 6.3), random.uniform(0, 6.3), random.uniform(0, 6.3)); ob.data.materials.append(EMER)
for fx, fy, z, s in ((112, 86, 0.4, 0.09), (-14, 54, 0.3, 0.07), (50, -6, -0.2, 0.07), (-12, 8, -0.1, 0.05), (118, 36, -0.2, 0.05), (20, 104, 0.5, 0.05)):
    x, y = card_xy(fx, fy); shard(x, y, z, s)

# ---------- poeira verde ----------
DUST = emit_mat('poeira', (0.25, 1.0, 0.55), 18)
for _ in range(70):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=random.uniform(0.004, 0.011),
        location=(random.uniform(-2.0, 2.0), random.uniform(-2.2, 2.4), random.uniform(-0.9, 0.9)))
    d = bpy.context.active_object; d.data.materials.append(DUST); d.parent = rig

# ---------- pose da carta e câmera ----------
POSES = {'34': (math.radians(6), math.radians(-24), math.radians(2)),
         'front': (0, 0, 0),
         'low': (math.radians(-14), math.radians(18), math.radians(-3))}
rig.rotation_euler = POSES.get(VIEW, POSES['34'])
cam_data = bpy.data.cameras.new('cam'); cam_data.lens = 80
cam = link(bpy.data.objects.new('cam', cam_data)); cam.location = (0, 0.05, 10.2); scene.camera = cam
cam_data.dof.use_dof = True; cam_data.dof.focus_distance = 10.2; cam_data.dof.aperture_fstop = 2.2

# ---------- luz de estúdio em 4 pontos ----------
def area(name, loc, power, size, col, target=(0, 0, 0)):
    L = bpy.data.lights.new(name, 'AREA'); L.energy = power; L.size = size; L.color = col
    ob = link(bpy.data.objects.new(name, L)); ob.location = loc
    d = Vector(target) - Vector(loc); ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    ob.visible_camera = False
    return ob
area('principal', (-4.5, 3.5, 6.0), 1400, 2.5, (1.0, 0.96, 0.9))
area('preenchimento', (5.0, -1.0, 5.0), 260, 4.0, (0.75, 0.9, 1.0))
area('contraluz', (0.5, 4.5, -4.0), 1500, 2.5, (0.35, 1.0, 0.6))
area('rebote', (0.0, -5.0, 2.0), 180, 4.0, (0.4, 1.0, 0.65))
gl = bpy.data.lights.new('brilho', 'POINT'); gl.energy = 350; gl.color = (0.2, 1.0, 0.5); gl.shadow_soft_size = 0.6
link(bpy.data.objects.new('brilho', gl)).location = (0, 0.3, -1.2)

world = bpy.data.worlds.new('mundo'); scene.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.008, 0.006, 1)
if FOG:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0)); fog = bpy.context.active_object; fog.scale = (9, 9, 6)
    m = bpy.data.materials.new('nevoa'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    v = nt.nodes.new('ShaderNodeVolumePrincipled'); v.inputs['Density'].default_value = 0.008; v.inputs['Color'].default_value = (0.7, 0.95, 0.8, 1); v.inputs['Anisotropy'].default_value = 0.4
    o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(v.outputs[0], o.inputs['Volume']); fog.data.materials.append(m)

# ---------- render ----------
r = scene.render; r.engine = 'CYCLES'; r.resolution_x = RX; r.resolution_y = RY; r.film_transparent = True
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'
cy = scene.cycles; cy.samples = SAMPLES; cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 10; cy.transmission_bounces = 10; cy.volume_bounces = 1; cy.caustics_reflective = False; cy.caustics_refractive = False
setup_device(scene, ARGS)
scene.view_settings.view_transform = 'AgX'
try: scene.view_settings.look = 'AgX - Medium High Contrast'
except TypeError: pass
r.filepath = os.path.join(OUT, f'destino-{VIEW}.png')
bpy.ops.render.render(write_still=True)
print('ok', r.filepath, flush=True)
