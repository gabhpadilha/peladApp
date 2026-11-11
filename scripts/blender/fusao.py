"""Fusão das cartas no fim da rodada ("Sua rodada"): fundo pré-renderizado; as cartas entram por cima, ao vivo, no app.

Linha do tempo (30 fps, 150 quadros = 5 s), casada com `reveal-fusion.tsx`:
  1-30    as duas plataformas acendem (esquerda no 6, direita no 15) com feixes de luz por cima;
  30-100  as plataformas pulsam devagar (a carta da rodada "carrega" a energia dos gols no app);
  100-125 fios de energia saem das duas plataformas e convergem para a plataforma do meio;
  125     clarão no centro (a carta nova aparece no 129); as laterais apagam;
  129-150 o centro fica aceso, poeira subindo; a câmera desacelera até quase parar.
Saída: `f_####.png` e `slots.json` (base de cada plataforma na tela, em % da largura e da altura).
"""
import bpy, math, sys, os, time, random, json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_device import setup_device

ARGS = dict(a.split('=') for a in sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else {}
RES_X = int(ARGS.get('rx', 288)); RES_Y = int(ARGS.get('ry', 360)); SAMPLES = int(ARGS.get('samples', 10)); OUT = ARGS.get('out', '/tmp/fusao_out')
_fr = ARGS.get('frames', '150')
FRAMES = (list(range(int(_fr.split('-')[0]), int(_fr.split('-')[1]) + 1)) if '-' in _fr else [int(x) for x in _fr.split(',')])
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.frame_start = 1; scene.frame_end = 150; scene.render.fps = 30

LIME = (0.55, 1.0, 0.1, 1)       # --primary do app, em linear
GOLD = (1.0, 0.78, 0.42, 1)
F_LEFT, F_RIGHT, F_CONV, F_FLASH = 6, 15, 100, 125
SIDE_X, SIDE_Y, MID_Y = 1.55, 0.0, -0.35  # plataformas: laterais e a do meio (um pouco à frente)


def mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; return m


def emis(name, col, k):
    m = mat(name); nt = m.node_tree; nt.nodes.clear(); e = nt.nodes.new('ShaderNodeEmission')
    e.inputs['Color'].default_value = col; e.inputs['Strength'].default_value = k
    o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0]); return m, e


def keys(socket_owner, attr, pairs):
    for fr_, v in pairs:
        setattr(socket_owner, attr, v); socket_owner.keyframe_insert(attr, frame=fr_)


# piso escuro espelhado, com a rugosidade variando (reflexo "molhado" das luzes)
fm = mat('Piso'); nt = fm.node_tree; f = nt.nodes['Principled BSDF']; f.inputs['Base Color'].default_value = (0.008, 0.012, 0.009, 1)
tc = nt.nodes.new('ShaderNodeTexCoord'); n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 2.6; n1.inputs['Detail'].default_value = 8
rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = 0.4; rp.color_ramp.elements[0].color = (0.06, 0.06, 0.06, 1)
rp.color_ramp.elements[1].position = 0.8; rp.color_ramp.elements[1].color = (0.38, 0.38, 0.38, 1)
nt.links.new(tc.outputs['Object'], n1.inputs['Vector']); nt.links.new(n1.outputs['Fac'], rp.inputs['Fac']); nt.links.new(rp.outputs[0], f.inputs['Roughness'])
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0)); bpy.context.active_object.data.materials.append(fm)

# plataformas: disco de pedra escura, aro de metal e anel de luz lima
stone = mat('Pedra'); sb = stone.node_tree.nodes['Principled BSDF']; sb.inputs['Base Color'].default_value = (0.02, 0.024, 0.022, 1); sb.inputs['Roughness'].default_value = 0.18
metal = mat('Metal'); mb = metal.node_tree.nodes['Principled BSDF']; mb.inputs['Base Color'].default_value = (0.8, 0.82, 0.78, 1); mb.inputs['Metallic'].default_value = 1.0; mb.inputs['Roughness'].default_value = 0.22


def platform(name, x, y, radius, on_frames):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=0.12, location=(x, y, 0.06), vertices=96); bpy.context.active_object.data.materials.append(stone)
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=0.022, location=(x, y, 0.12), major_segments=128, minor_segments=16)
    bpy.context.active_object.data.materials.append(metal)
    bpy.ops.mesh.primitive_torus_add(major_radius=radius * 0.8, minor_radius=0.012, location=(x, y, 0.125), major_segments=128, minor_segments=12)
    m, e = emis(name + 'Anel', LIME, 0.0); bpy.context.active_object.data.materials.append(m)
    keys(e.inputs['Strength'], 'default_value', on_frames)
    return e


# laterais: acendem com falha, pulsam devagar, apagam depois do clarão
def side_ring(f0):
    pulse = [(fr_, 9.0 + 3.0 * math.sin((fr_ - f0) * 0.18)) for fr_ in range(f0 + 12, F_CONV, 6)]
    return [(1, 0.0), (f0, 0.0), (f0 + 2, 14.0), (f0 + 4, 2.0), (f0 + 7, 18.0), (f0 + 12, 10.0)] + pulse + [(F_CONV, 10.0), (F_FLASH - 4, 24.0), (F_FLASH + 6, 0.6), (150, 0.4)]


platform('Esq', -SIDE_X, SIDE_Y, 0.78, side_ring(F_LEFT))
platform('Dir', SIDE_X, SIDE_Y, 0.78, side_ring(F_RIGHT))
platform('Meio', 0, MID_Y, 0.98, [(1, 0.0), (F_CONV, 0.0), (F_CONV + 10, 2.5), (F_FLASH - 2, 8.0), (F_FLASH + 1, 70.0), (F_FLASH + 10, 22.0), (150, 18.0)])

# holofotes de cima: um por plataforma
def spot(name, x, y, pairs, col=(0.92, 1.0, 0.82), size=24):
    d = bpy.data.lights.new(name, 'SPOT'); d.spot_size = math.radians(size); d.spot_blend = 0.55; d.color = col; d.shadow_soft_size = 0.3
    o = bpy.data.objects.new(name, d); o.location = (x, y + 0.6, 7.5); scene.collection.objects.link(o); o.visible_glossy = False
    o.rotation_euler = (Vector((x, y, 0)) - o.location).to_track_quat('-Z', 'Y').to_euler()
    keys(d, 'energy', pairs)


def side_spot(f0):
    return [(1, 0.0), (f0, 0.0), (f0 + 2, 1400.0), (f0 + 4, 200.0), (f0 + 7, 2600.0), (f0 + 14, 2000.0), (F_FLASH - 2, 2200.0), (F_FLASH + 8, 300.0), (150, 220.0)]


spot('SpotEsq', -SIDE_X, SIDE_Y, side_spot(F_LEFT))
spot('SpotDir', SIDE_X, SIDE_Y, side_spot(F_RIGHT))
spot('SpotMeio', 0, MID_Y, [(1, 0.0), (F_FLASH - 3, 0.0), (F_FLASH, 9000.0), (F_FLASH + 8, 3600.0), (150, 3000.0)], col=(0.95, 1.0, 0.85), size=28)

# feixes de luz em volume (cone emissivo e transparente que some para cima e nas bordas)
def beam(name, x, y, r_bottom, pairs, col=(0.62, 1.0, 0.4, 1)):
    H = 5.6
    bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=r_bottom, radius2=r_bottom * 0.38, depth=H, location=(x, y, 0.12 + H / 2), end_fill_type='NOTHING')
    ob = bpy.context.active_object; bpy.ops.object.shade_smooth()
    m = mat(name); nt = m.node_tree; nt.nodes.clear()
    tcb = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tcb.outputs['Object'], sep.inputs[0])
    hz = nt.nodes.new('ShaderNodeMapRange'); hz.inputs['From Min'].default_value = -H / 2; hz.inputs['From Max'].default_value = H / 2
    hz.inputs['To Min'].default_value = 1.0; hz.inputs['To Max'].default_value = 0.0; nt.links.new(sep.outputs['Z'], hz.inputs['Value'])
    hp = nt.nodes.new('ShaderNodeMath'); hp.operation = 'POWER'; hp.inputs[1].default_value = 1.8; nt.links.new(hz.outputs['Result'], hp.inputs[0])
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0; nt.links.new(lw.outputs['Facing'], inv.inputs[1])
    ip = nt.nodes.new('ShaderNodeMath'); ip.operation = 'POWER'; ip.inputs[1].default_value = 2.5; nt.links.new(inv.outputs[0], ip.inputs[0])
    m1 = nt.nodes.new('ShaderNodeMath'); m1.operation = 'MULTIPLY'; nt.links.new(hp.outputs[0], m1.inputs[0]); nt.links.new(ip.outputs[0], m1.inputs[1])
    k = nt.nodes.new('ShaderNodeMath'); k.operation = 'MULTIPLY'; nt.links.new(m1.outputs[0], k.inputs[0])
    keys(k.inputs[1], 'default_value', pairs)
    em_ = nt.nodes.new('ShaderNodeEmission'); em_.inputs['Color'].default_value = col; nt.links.new(k.outputs[0], em_.inputs['Strength'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); ad = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(tr.outputs[0], ad.inputs[0]); nt.links.new(em_.outputs[0], ad.inputs[1])
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(ad.outputs[0], out.inputs[0])
    ob.data.materials.append(m); ob.visible_glossy = False; ob.visible_shadow = False
    return ob


def side_beam(f0):
    return [(1, 0.0), (f0, 0.0), (f0 + 2, 0.45), (f0 + 4, 0.05), (f0 + 7, 0.6), (f0 + 14, 0.38), (F_FLASH - 3, 0.5), (F_FLASH + 8, 0.03), (150, 0.02)]


beam('FeixeEsq', -SIDE_X, SIDE_Y, 0.82, side_beam(F_LEFT))
beam('FeixeDir', SIDE_X, SIDE_Y, 0.82, side_beam(F_RIGHT))
beam('FeixeMeio', 0, MID_Y, 1.02, [(1, 0.0), (F_FLASH - 2, 0.0), (F_FLASH, 2.2), (F_FLASH + 8, 0.6), (150, 0.48)], col=(0.8, 1.0, 0.6, 1))

# aro de luz em pé atrás da carta nova (aparece em volta dela no clarão)
bpy.ops.mesh.primitive_torus_add(major_radius=1.5, minor_radius=0.02, location=(0, MID_Y + 0.55, 1.15), rotation=(math.radians(90), 0, 0), major_segments=160, minor_segments=12)
hm, he = emis('Halo', LIME, 0.0); halo = bpy.context.active_object; halo.data.materials.append(hm)
for fr_, hid in ((1, True), (F_FLASH, True), (F_FLASH + 1, False)): halo.hide_render = hid; halo.keyframe_insert('hide_render', frame=fr_)
keys(he.inputs['Strength'], 'default_value', [(1, 0.0), (F_FLASH - 1, 0.0), (F_FLASH + 1, 60.0), (F_FLASH + 10, 14.0), (150, 10.0)])
bpy.ops.mesh.primitive_torus_add(major_radius=1.68, minor_radius=0.009, location=(0, MID_Y + 0.6, 1.15), rotation=(math.radians(90), 0, 0), major_segments=160, minor_segments=8)
hm2, he2 = emis('Halo2', GOLD, 0.0); halo2 = bpy.context.active_object; halo2.data.materials.append(hm2)
for fr_, hid in ((1, True), (F_FLASH + 2, True), (F_FLASH + 3, False)): halo2.hide_render = hid; halo2.keyframe_insert('hide_render', frame=fr_)
keys(he2.inputs['Strength'], 'default_value', [(1, 0.0), (F_FLASH + 2, 0.0), (F_FLASH + 6, 30.0), (F_FLASH + 16, 6.0), (150, 5.0)])

# contraluzes frias/quentes para recortar o volume da névoa
def area(name, loc, rot, size, col, pairs):
    a = bpy.data.lights.new(name, 'AREA'); a.size = size; a.color = col
    o = bpy.data.objects.new(name, a); o.location = loc; o.rotation_euler = rot; scene.collection.objects.link(o)
    a.cycles.is_caustics_light = False; o.visible_camera = False; o.visible_glossy = False
    keys(a, 'energy', pairs)


area('ContraE', (-5, 5, 2.4), (math.radians(90), 0, math.radians(-135)), 4, (0.55, 1.0, 0.5), [(1, 0.0), (20, 160.0), (150, 200.0)])
area('ContraD', (5, 5, 2.4), (math.radians(90), 0, math.radians(135)), 4, (1.0, 0.85, 0.5), [(1, 0.0), (20, 130.0), (F_FLASH, 160.0), (150, 260.0)])

# luz pontual do clarão no centro, à altura do meio da carta
fl = bpy.data.lights.new('Clarao', 'POINT'); fl.color = (0.9, 1.0, 0.7); fl.shadow_soft_size = 0.5
flo = bpy.data.objects.new('Clarao', fl); flo.location = (0, MID_Y - 0.2, 1.4); scene.collection.objects.link(flo); flo.visible_glossy = False; flo.visible_camera = False
keys(fl, 'energy', [(1, 0.0), (F_CONV, 0.0), (F_FLASH - 3, 300.0), (F_FLASH, 3200.0), (F_FLASH + 5, 700.0), (F_FLASH + 14, 160.0), (150, 120.0)])

# névoa volumétrica que deriva devagar
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 4.5)); vb = bpy.context.active_object; vb.scale = (16, 16, 10); vb.display_type = 'WIRE'
vm = mat('Neblina'); nt = vm.node_tree; nt.nodes.clear(); vs = nt.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Anisotropy'].default_value = 0.55
vs.inputs['Color'].default_value = (0.85, 1.0, 0.85, 1)
nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.6; nz.inputs['Detail'].default_value = 3
tcv = nt.nodes.new('ShaderNodeTexCoord'); mpv = nt.nodes.new('ShaderNodeMapping')
mt = nt.nodes.new('ShaderNodeMath'); mt.operation = 'MULTIPLY'; mt.inputs[1].default_value = 0.011
nt.links.new(tcv.outputs['Object'], mpv.inputs['Vector']); nt.links.new(mpv.outputs[0], nz.inputs['Vector'])
nt.links.new(nz.outputs['Fac'], mt.inputs[0]); nt.links.new(mt.outputs[0], vs.inputs['Density'])
for fr_, loc in ((1, (0, 0, 0)), (90, (0.7, 0.3, 1.0)), (150, (1.0, 0.45, 1.5))):
    mpv.inputs['Location'].default_value = loc; mpv.inputs['Location'].keyframe_insert('default_value', frame=fr_)
ov = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(vs.outputs[0], ov.inputs['Volume']); vb.data.materials.append(vm)

# poeira flutuando nos feixes
dm, _ = emis('Poeira', (0.9, 1.0, 0.8, 1), 3.0)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.01, segments=8, ring_count=6, location=(0, 0, -20)); proto = bpy.context.active_object; proto.data.materials.append(dm)
for k in range(55):
    o = proto.copy(); o.data = proto.data; scene.collection.objects.link(o)
    cx = random.choice((-SIDE_X, 0.0, SIDE_X)); a_ = random.uniform(0, 6.283); r = random.uniform(0.05, 1.0); z0 = random.uniform(0.3, 5.0)
    o.location = (cx + math.cos(a_) * r, SIDE_Y + math.sin(a_) * r, z0); s = random.uniform(0.5, 1.6); o.scale = (s, s, s)
    o.keyframe_insert('location', frame=1)
    o.location = (o.location.x + random.uniform(-0.3, 0.3), o.location.y + random.uniform(-0.3, 0.3), o.location.z + random.uniform(0.4, 1.2)); o.keyframe_insert('location', frame=150)
    for fc in (o.animation_data.action.fcurves if hasattr(o.animation_data.action, 'fcurves') else []):
        for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
bpy.data.objects.remove(proto)

# fios de energia: faíscas que saem de cada plataforma lateral e fazem um arco até o centro
em, _ = emis('Energia', LIME, 90.0)
bpy.ops.mesh.primitive_ico_sphere_add(radius=0.014, subdivisions=1, location=(0, 0, -20)); ep = bpy.context.active_object; ep.data.materials.append(em)
center = Vector((0, MID_Y, 1.25))


def ease_in(t):
    return t * t * t


for side in (-1, 1):
    for k in range(45):
        o = ep.copy(); o.data = ep.data; scene.collection.objects.link(o)
        start = Vector((side * (SIDE_X + random.uniform(-0.2, 0.75)), SIDE_Y + random.uniform(-0.3, 0.3), random.uniform(0.25, 2.4)))
        lift = random.uniform(0.5, 1.5); jitter = Vector((random.uniform(-0.15, 0.15), random.uniform(-0.15, 0.15), random.uniform(-0.15, 0.15)))
        f0 = F_CONV + random.randint(0, 14); dur = F_FLASH - f0
        s = random.uniform(0.5, 1.5)
        o.hide_render = True; o.keyframe_insert('hide_render', frame=f0 - 1)
        o.hide_render = False; o.keyframe_insert('hide_render', frame=f0)
        for i in range(7):
            t = i / 6; e_ = ease_in(t)
            p = start.lerp(center + jitter * (1 - t), e_); p.z += lift * math.sin(math.pi * t)
            o.location = p; o.keyframe_insert('location', frame=f0 + round(dur * t))
            k_ = s * (0.4 + 1.1 * t); o.scale = (k_, k_, k_); o.keyframe_insert('scale', frame=f0 + round(dur * t))
        o.hide_render = True; o.keyframe_insert('hide_render', frame=F_FLASH + 1)

# faíscas do clarão: explodem do centro e somem devagar (o fim fica quase parado)
for k in range(90):
    o = ep.copy(); o.data = ep.data; scene.collection.objects.link(o)
    ang = random.uniform(0, 6.283); sp_ = random.uniform(0.8, 2.6); vz = random.uniform(0.6, 2.4); s0 = random.uniform(0.4, 1.3)
    o.hide_render = True; o.keyframe_insert('hide_render', frame=F_FLASH - 1)
    o.hide_render = False; o.keyframe_insert('hide_render', frame=F_FLASH)
    for dt, k_ in ((0, 1.0), (6, 1.0), (12, 0.8), (18, 0.45), (25, 0.0)):
        t = dt / 30.0; damp = 1 - math.exp(-t * 5)
        o.location = (math.cos(ang) * sp_ * damp * 1.05, MID_Y + math.sin(ang) * sp_ * damp * 0.3, max(0.15, 1.25 + vz * damp * 0.5 - 0.6 * t * t))
        o.keyframe_insert('location', frame=F_FLASH + dt)
        o.scale = (s0 * k_,) * 3; o.keyframe_insert('scale', frame=F_FLASH + dt)
    o.hide_render = True; o.keyframe_insert('hide_render', frame=F_FLASH + 26)
bpy.data.objects.remove(ep)

# câmera: de frente, um pouco acima, aproxima devagar com ease-out cúbico (o centro fica fixo na tela)
cam = bpy.data.cameras.new('Cam'); cam.lens = 36; cam.dof.use_dof = True; cam.dof.aperture_fstop = 2.8
co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
tgt = Vector((0, MID_Y, 1.0))
P0, P1 = Vector((0, -8.6, 2.15)), Vector((0, -7.9, 1.95))


def cam_at(fr_):
    t = (fr_ - 1) / 149.0; e = 1 - (1 - t) ** 3
    co.location = P0.lerp(P1, e)
    co.rotation_euler = (tgt - co.location).to_track_quat('-Z', 'Y').to_euler()
    cam.dof.focus_distance = (tgt - co.location).length


for fr_ in list(range(1, 150, 4)) + [150]:
    cam_at(fr_); co.keyframe_insert('location', frame=fr_); co.keyframe_insert('rotation_euler', frame=fr_); cam.dof.keyframe_insert('focus_distance', frame=fr_)

# render
scene.render.engine = 'CYCLES'; cy = scene.cycles; setup_device(scene, ARGS); cy.samples = SAMPLES; cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.03; cy.max_bounces = 5; cy.volume_bounces = 1; cy.volume_step_rate = 2.0; cy.sample_clamp_indirect = 8.0
scene.render.use_motion_blur = True; scene.render.motion_blur_shutter = 0.9
scene.render.resolution_x = RES_X; scene.render.resolution_y = RES_Y; scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Medium High Contrast'
for fr_, ex in ((1, -0.3), (F_FLASH - 3, -0.3), (F_FLASH, 0.7), (F_FLASH + 7, -0.15), (150, -0.2)):
    scene.view_settings.exposure = ex; scene.view_settings.keyframe_insert('exposure', frame=fr_)
w = bpy.data.worlds.new('W'); scene.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.002, 0.004, 0.003, 1)
os.makedirs(OUT, exist_ok=True)

# base de cada plataforma na tela (no quadro 150 e no 30, para conferir a deriva)
slots = {}
for fr_ in (30, 150):
    scene.frame_set(fr_); cam_at(fr_); bpy.context.view_layer.update()
    slots[fr_] = {n: [round(v.x * 100, 2), round((1 - v.y) * 100, 2)] for n, p in (('esq', (-SIDE_X, SIDE_Y, 0.12)), ('dir', (SIDE_X, SIDE_Y, 0.12)), ('meio', (0, MID_Y, 0.12)))
                  for v in [world_to_camera_view(scene, co, Vector(p))]}
    # altura da carta: 1,4 m de carta em pé sobre a plataforma do meio
    top = world_to_camera_view(scene, co, Vector((0, MID_Y, 0.12 + 1.6)))
    slots[fr_]['meio_topo_1_6m'] = [round(top.x * 100, 2), round((1 - top.y) * 100, 2)]
json.dump(slots, open(OUT + '/slots.json', 'w'), indent=1)
print('SLOTS', slots, flush=True)

for fr_ in FRAMES:
    path = f'{OUT}/f_{fr_:04d}.png'
    if os.path.exists(path): continue
    scene.frame_set(fr_); scene.render.filepath = path; t1 = time.time(); bpy.ops.render.render(write_still=True); print('FRAME', fr_, round(time.time() - t1, 1), flush=True)
