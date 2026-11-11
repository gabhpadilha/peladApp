"""Palco da abertura do pacote (2026-11-11): palco escuro com um círculo de luz no chão que acende na cor da raridade.

A carta NÃO é do Blender: o app desenha a carta (verso e frente da skin) por cima do vídeo, presa ao círculo pelo `slots.json`.

Para não renderizar a cena 4 vezes, a luz é separada em camadas lineares e as cores saem na composição:
  pass=base   palco sem a luz da raridade (contraluzes neutras, poeira, névoa)            -> b_####.exr
  pass=luz    só a luz da raridade em branco (anel, halo no chão, holofote e fagulhas)    -> l_####.exr
  pass=extra  só as fagulhas a mais da lendária                                           -> x_####.exr
  pass=compose rarity=comum|rara|epica|lendaria src=<pasta dos EXR> out=<pasta>           -> c_####.png
A composição faz base + cor * curva(quadro) * luz (+ extra na lendária), aplica a exposição do clarão e o AgX.
Luz em Cycles é linear, então o resultado é o mesmo de renderizar cada cor (fora o denoise, feito por camada).

    python pacote-palco.py -- pass=base frames=1-120 rx=720 ry=1280 samples=20 out=/tmp/palco
    python pacote-palco.py -- pass=luz  frames=1-120 rx=720 ry=1280 samples=20 out=/tmp/palco
    python pacote-palco.py -- pass=extra frames=36-110 rx=720 ry=1280 samples=20 out=/tmp/palco
    python pacote-palco.py -- pass=compose rarity=rara frames=1-120 src=/tmp/palco out=/tmp/palco-rara
"""
import bpy, math, sys, os, time, random, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_device import setup_device

ARGS = dict(a.split('=') for a in sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else {}
RES_X = int(ARGS.get('rx', 270)); RES_Y = int(ARGS.get('ry', 480)); SAMPLES = int(ARGS.get('samples', 12))
OUT = ARGS.get('out', '/tmp/palco'); PASS = ARGS.get('pass', 'base'); _fr = ARGS.get('frames', '1')
FRAMES = (list(range(int(_fr.split('-')[0]), int(_fr.split('-')[1]) + 1)) if '-' in _fr else [int(x) for x in _fr.split(',')])
LAST = 100
CARD_W, CARD_H, CARD_Z = 1.5, 2.1, 0.42      # a carta do app (só para o slots.json): largura, altura e altura da base
RING_R = 1.15

# ------------------------------------------------------------------ composição (sem cena)
# Cor linear de cada raridade e um ganho para as cores saturadas não ficarem apagadas.
RARITY = {
    'comum': dict(rgb=(0.86, 0.92, 1.0), gain=0.85),
    'rara': dict(rgb=(0.16, 0.42, 1.0), gain=1.55),
    'epica': dict(rgb=(0.52, 0.2, 1.0), gain=1.6),
    'lendaria': dict(rgb=(1.0, 0.5, 0.1), gain=1.25),
}


def keys(f, pts):
    """Interpolação suave entre (quadro, valor)."""
    if f <= pts[0][0]: return pts[0][1]
    for (a, va), (b, vb) in zip(pts, pts[1:]):
        if f <= b:
            t = (f - a) / (b - a); t = t * t * (3 - 2 * t); return va + (vb - va) * t
    return pts[-1][1]


def light_curve(rarity, f):
    if rarity != 'lendaria': return 1.0
    # a lendária falha uma vez: o anel acende, apaga por 4 quadros e volta mais forte
    if 17 <= f <= 21: return 0.04
    return keys(f, [(1, 1.0), (16, 1.0), (22, 1.35), (30, 1.0), (38, 1.0), (41, 1.4), (60, 1.1), (LAST, 1.1)])


def exposure(rarity, f):
    if rarity == 'lendaria':
        return keys(f, [(1, -0.2), (38, -0.2), (41, 2.4), (47, 0.6), (58, -0.1), (LAST, -0.1)])
    return keys(f, [(1, -0.2), (38, -0.2), (41, 1.1), (48, -0.2), (LAST, -0.2)])


if PASS == 'compose':
    import numpy as np
    src = ARGS['src']; rarity = ARGS['rarity']; cfg = RARITY[rarity]
    scene = bpy.context.scene
    scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'; scene.render.image_settings.color_depth = '8'
    scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'None'
    os.makedirs(OUT, exist_ok=True)
    tint = np.array([*(c * cfg['gain'] for c in cfg['rgb']), 0.0], dtype=np.float32)

    def load(path):
        im = bpy.data.images.load(path); w, h = im.size; a = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(a)
        bpy.data.images.remove(im); return a.reshape(-1, 4), w, h

    for f in FRAMES:
        base, w, h = load(f'{src}/b_{f:04d}.exr'); luz, _, _ = load(f'{src}/l_{f:04d}.exr')
        mix = base + luz * tint * light_curve(rarity, f)
        xp = f'{src}/x_{f:04d}.exr'
        if rarity == 'lendaria' and os.path.exists(xp): mix += load(xp)[0] * tint
        mix[:, 3] = 1.0
        out = bpy.data.images.new('c', w, h, float_buffer=True); out.pixels.foreach_set(mix.ravel())
        scene.view_settings.exposure = exposure(rarity, f)
        out.save_render(f'{OUT}/c_{f:04d}.png', scene=scene); bpy.data.images.remove(out); print('COMPOSE', rarity, f, flush=True)
    sys.exit(0)

# ------------------------------------------------------------------ cena
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.frame_start = 1; scene.frame_end = LAST; scene.render.fps = 30


def coll(name):
    c = bpy.data.collections.new(name); scene.collection.children.link(c); return c


C_BASE, C_LUZ, C_EXTRA = coll('Base'), coll('Luz'), coll('Extra')


def link(o, c=None):
    for u in list(o.users_collection): u.objects.unlink(o)
    (c or scene.collection).objects.link(o); return o


def mat(n): m = bpy.data.materials.new(n); m.use_nodes = True; return m


def emis(n, col, k):
    m = mat(n); nt = m.node_tree; nt.nodes.clear(); e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = col; e.inputs['Strength'].default_value = k
    o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0]); return m, e


def animate(socket, pts):
    for fr_, v in pts: socket.default_value = v; socket.keyframe_insert('default_value', frame=fr_)


# piso escuro espelhado, com rugosidade variando (como no palco do Melhor Jogador)
fm = mat('Piso'); nt = fm.node_tree; f_ = nt.nodes['Principled BSDF']; f_.inputs['Base Color'].default_value = (0.010, 0.011, 0.015, 1)
tc = nt.nodes.new('ShaderNodeTexCoord'); n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 3.0; n1.inputs['Detail'].default_value = 8
rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = 0.4; rp.color_ramp.elements[0].color = (0.08, 0.08, 0.08, 1); rp.color_ramp.elements[1].position = 0.8; rp.color_ramp.elements[1].color = (0.38, 0.38, 0.38, 1)
nt.links.new(tc.outputs['Object'], n1.inputs['Vector']); nt.links.new(n1.outputs['Fac'], rp.inputs['Fac']); nt.links.new(rp.outputs[0], f_.inputs['Roughness'])
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0)); link(bpy.context.active_object).data.materials.append(fm)

# anel de metal escuro embutido no chão (aparece só com o reflexo), com o anel de luz por cima
mt_ = mat('Metal'); mb = mt_.node_tree.nodes['Principled BSDF']; mb.inputs['Base Color'].default_value = (0.35, 0.36, 0.4, 1); mb.inputs['Metallic'].default_value = 1.0; mb.inputs['Roughness'].default_value = 0.25
bpy.ops.mesh.primitive_torus_add(major_radius=RING_R + 0.09, minor_radius=0.03, location=(0, 0, 0.0), major_segments=160, minor_segments=16); link(bpy.context.active_object).data.materials.append(mt_)

# ---- camada "luz": tudo branco, com intensidade relativa; a cor e a curva da raridade entram na composição
RING_KEYS = [(1, 0.0), (8, 0.0), (26, 34.0), (38, 40.0), (41, 120.0), (56, 34.0), (LAST, 30.0)]
bpy.ops.mesh.primitive_torus_add(major_radius=RING_R, minor_radius=0.016, location=(0, 0, 0.012), major_segments=192, minor_segments=12)
ring = link(bpy.context.active_object, C_LUZ); rm, re = emis('Anel', (1, 1, 1, 1), 0.0); ring.data.materials.append(rm); animate(re.inputs['Strength'], RING_KEYS)

# halo no chão: um disco com o brilho concentrado perto do anel (gaussiana no raio) e um véu fraco por dentro
hm = mat('Halo'); nt = hm.node_tree; nt.nodes.clear()
tc = nt.nodes.new('ShaderNodeTexCoord'); ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; nt.links.new(tc.outputs['Object'], ln.inputs[0])
sub = nt.nodes.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = RING_R; nt.links.new(ln.outputs['Value'], sub.inputs[0])
sq = nt.nodes.new('ShaderNodeMath'); sq.operation = 'MULTIPLY'; nt.links.new(sub.outputs[0], sq.inputs[0]); nt.links.new(sub.outputs[0], sq.inputs[1])
g = nt.nodes.new('ShaderNodeMath'); g.operation = 'MULTIPLY'; g.inputs[1].default_value = -1.0 / (2 * 0.11 ** 2); nt.links.new(sq.outputs[0], g.inputs[0])
ex = nt.nodes.new('ShaderNodeMath'); ex.operation = 'EXPONENT'; nt.links.new(g.outputs[0], ex.inputs[0])
inner = nt.nodes.new('ShaderNodeMath'); inner.operation = 'LESS_THAN'; inner.inputs[1].default_value = RING_R; nt.links.new(ln.outputs['Value'], inner.inputs[0])
veil = nt.nodes.new('ShaderNodeMath'); veil.operation = 'MULTIPLY'; veil.inputs[1].default_value = 0.08; nt.links.new(inner.outputs[0], veil.inputs[0])
add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'; nt.links.new(ex.outputs[0], add.inputs[0]); nt.links.new(veil.outputs[0], add.inputs[1])
k_ = nt.nodes.new('ShaderNodeMath'); k_.operation = 'MULTIPLY'; nt.links.new(add.outputs[0], k_.inputs[0])
em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (1, 1, 1, 1); nt.links.new(k_.outputs[0], em.inputs['Strength'])
tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeAddShader'); nt.links.new(tr.outputs[0], mix.inputs[0]); nt.links.new(em.outputs[0], mix.inputs[1])
oo = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(mix.outputs[0], oo.inputs[0])
animate(k_.inputs[1], [(fr_, v * 0.06) for fr_, v in RING_KEYS])
bpy.ops.mesh.primitive_plane_add(size=2 * (RING_R + 0.6), location=(0, 0, 0.004)); halo = link(bpy.context.active_object, C_LUZ); halo.data.materials.append(hm)
halo.visible_shadow = False

# holofote de cima (o feixe aparece na névoa e faz a poça de luz no círculo)
sl = bpy.data.lights.new('Holofote', 'SPOT'); sl.spot_size = math.radians(22); sl.spot_blend = 0.55; sl.shadow_soft_size = 0.35; sl.color = (1, 1, 1)
ho = bpy.data.objects.new('Holofote', sl); ho.location = (0, 0.4, 8.0); ho.rotation_euler = (math.radians(-3), 0, 0); link(ho, C_LUZ)
for fr_, v in ((1, 0.0), (30, 0.0), (34, 1600.0), (38, 2400.0), (41, 9000.0), (52, 5200.0), (LAST, 4800.0)): sl.energy = v; sl.keyframe_insert('energy', frame=fr_)


def sparks(n, c, seed, t0, power, height, size):
    rnd = random.Random(seed)
    sm, _ = emis('Faisca%d' % seed, (1, 1, 1, 1), power)
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.022 * size, subdivisions=1, location=(0, 0, -20)); sp = bpy.context.active_object; sp.data.materials.append(sm)
    for _ in range(n):
        o = sp.copy(); o.data = sp.data; link(o, c)
        a = rnd.uniform(0, 6.283); r0 = RING_R + rnd.uniform(-0.05, 0.05); out = rnd.uniform(0.3, 1.3); vz = rnd.uniform(1.2, height); s = rnd.uniform(0.5, 1.5); t1 = t0 + rnd.randint(0, 5)
        o.scale = (0, 0, 0); o.keyframe_insert('scale', frame=t1 - 1); o.scale = (s, s, s); o.keyframe_insert('scale', frame=t1)
        for dt in (0, 6, 12, 20, 30, 44):
            t = dt / 30.0; rr = r0 + out * t
            o.location = (math.cos(a) * rr, math.sin(a) * rr, max(0.03, 0.05 + vz * t - 3.2 * t * t)); o.keyframe_insert('location', frame=t1 + dt)
        o.scale = (s * 0.5, s * 0.5, s * 0.5); o.keyframe_insert('scale', frame=t1 + 30); o.scale = (0, 0, 0); o.keyframe_insert('scale', frame=t1 + 50)
    bpy.data.objects.remove(sp)


sparks(70, C_LUZ, 1, 40, 160.0, 3.0, 1.0)          # fagulhas do clarão, em todas
sparks(150, C_EXTRA, 2, 39, 240.0, 4.6, 1.35)      # lendária: mais fagulhas, mais altas

# ---- camada "base": contraluzes neutras, preenchimento fraco e poeira
def area(n, loc, tgt, e, size, col):
    a = bpy.data.lights.new(n, 'AREA'); a.energy = e; a.size = size; a.color = col; o = bpy.data.objects.new(n, a); o.location = loc
    o.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); o.visible_camera = False; o.visible_glossy = False; link(o, C_BASE); return a


ce = area('ContraE', (-6, 6, 2.6), (0, 0, 0.6), 0, 4, (0.6, 0.7, 1.0)); cd = area('ContraD', (6, 6, 2.6), (0, 0, 0.6), 0, 4, (0.85, 0.85, 0.95))
for a in (ce, cd):
    for fr_, v in ((1, 25.0), (40, 70.0), (60, 200.0), (LAST, 200.0)): a.energy = v; a.keyframe_insert('energy', frame=fr_)
dm, _ = emis('Poeira', (1.0, 0.95, 0.88, 1), 1.3)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.011, segments=8, ring_count=6, location=(0, 0, -20)); proto = bpy.context.active_object; proto.data.materials.append(dm)
for _ in range(34):
    o = proto.copy(); o.data = proto.data; r = random.uniform(0.1, 1.3); a_ = random.uniform(0, 6.283); z0 = random.uniform(0.3, 5.0)
    o.location = (math.cos(a_) * r, math.sin(a_) * r, z0); s = random.uniform(0.5, 1.6); o.scale = (s, s, s); link(o, C_BASE)
    o.keyframe_insert('location', frame=1); o.location = (o.location.x + random.uniform(-0.3, 0.3), o.location.y + random.uniform(-0.3, 0.3), o.location.z + random.uniform(0.4, 1.0)); o.keyframe_insert('location', frame=LAST)
    for fc in o.animation_data.action.fcurves if hasattr(o.animation_data.action, 'fcurves') else []:
        for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
bpy.data.objects.remove(proto)

# névoa (sempre presente: espalha a luz de qualquer camada)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 5)); vb = link(bpy.context.active_object); vb.scale = (16, 16, 11)
vm = mat('Neblina'); nt = vm.node_tree; nt.nodes.clear(); vs = nt.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Anisotropy'].default_value = 0.6
nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.6; nz.inputs['Detail'].default_value = 3; tcv = nt.nodes.new('ShaderNodeTexCoord'); mpv = nt.nodes.new('ShaderNodeMapping')
mt = nt.nodes.new('ShaderNodeMath'); mt.operation = 'MULTIPLY'; mt.inputs[1].default_value = 0.022
nt.links.new(tcv.outputs['Object'], mpv.inputs['Vector']); nt.links.new(mpv.outputs[0], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], mt.inputs[0]); nt.links.new(mt.outputs[0], vs.inputs['Density'])
mpv.inputs['Location'].default_value = (0, 0, 0); mpv.inputs['Location'].keyframe_insert('default_value', frame=1); mpv.inputs['Location'].default_value = (0.6, 0.3, 1.0); mpv.inputs['Location'].keyframe_insert('default_value', frame=LAST)
ov = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(vs.outputs[0], ov.inputs['Volume']); vb.data.materials.append(vm)

# ---- câmera: aproxima e desce um pouco nos primeiros 2 s (ease-out) e fica parada (a carta do app fica presa ao círculo)
cam = bpy.data.cameras.new('Cam'); cam.lens = 50; cam.dof.use_dof = True; cam.dof.aperture_fstop = 2.8
co = bpy.data.objects.new('Cam', cam); link(co); scene.camera = co
TGT = Vector((0, 0, 1.05))
def campos(fr_):
    t = min(1.0, (fr_ - 1) / 59.0); e = 1 - (1 - t) ** 3
    return Vector((0.0, -9.2, 3.6)).lerp(Vector((0.0, -7.6, 3.0)), e)
for fr_ in list(range(1, 61, 3)) + [60, LAST]:
    co.location = campos(fr_); co.rotation_euler = (TGT - co.location).to_track_quat('-Z', 'Y').to_euler()
    co.keyframe_insert('location', frame=fr_); co.keyframe_insert('rotation_euler', frame=fr_)
    cam.dof.focus_distance = (Vector((0, 0, 0.9)) - co.location).length; cam.dof.keyframe_insert('focus_distance', frame=fr_)

# ---- render
scene.render.engine = 'CYCLES'; cy = scene.cycles; setup_device(scene, ARGS); cy.samples = SAMPLES; cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.03; cy.max_bounces = 5; cy.volume_bounces = 1; cy.volume_step_rate = 3.0; cy.sample_clamp_indirect = 8.0
scene.render.resolution_x = RES_X; scene.render.resolution_y = RES_Y
scene.render.image_settings.file_format = 'OPEN_EXR'; scene.render.image_settings.color_depth = '16'; scene.render.image_settings.exr_codec = 'ZIP'; scene.render.image_settings.color_mode = 'RGB'
scene.view_settings.view_transform = 'AgX'
w = bpy.data.worlds.new('W'); scene.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']
bg.inputs['Color'].default_value = (0.003, 0.004, 0.009, 1) if PASS == 'base' else (0, 0, 0, 1)
C_BASE.hide_render = PASS != 'base'; C_LUZ.hide_render = PASS != 'luz'; C_EXTRA.hide_render = PASS != 'extra'
PREFIX = {'base': 'b', 'luz': 'l', 'extra': 'x'}[PASS]
os.makedirs(OUT, exist_ok=True)

# posição da carta e do círculo na tela no fim (a câmera já parou), em % da largura e da altura do vídeo
from bpy_extras.object_utils import world_to_camera_view
scene.frame_set(LAST)
def px(p): v = world_to_camera_view(scene, co, Vector(p)); return [round(v.x * 100, 2), round((1 - v.y) * 100, 2)]
corners = [px((x, 0, z)) for x in (-CARD_W / 2, CARD_W / 2) for z in (CARD_Z, CARD_Z + CARD_H)]
xs = [c[0] for c in corners]; ys = [c[1] for c in corners]
json.dump({'card': {'left': min(xs), 'top': min(ys), 'width': round(max(xs) - min(xs), 2), 'height': round(max(ys) - min(ys), 2)},
           'ring': {'center': px((0, 0, 0)), 'left': px((-RING_R, 0, 0)), 'right': px((RING_R, 0, 0)), 'front': px((0, -RING_R, 0)), 'back': px((0, RING_R, 0))}},
          open(OUT + '/slots.json', 'w'), indent=1)

for fr_ in FRAMES:
    scene.frame_set(fr_); scene.render.filepath = f'{OUT}/{PREFIX}_{fr_:04d}.exr'; t1 = time.time(); bpy.ops.render.render(write_still=True); print('FRAME', PASS, fr_, round(time.time() - t1, 1), flush=True)
