import bpy, bmesh, math, sys, os, time, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_device import setup_device

ARGS = dict(a.split('=') for a in sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else {}
RES_X = int(ARGS.get('rx', 270)); RES_Y = int(ARGS.get('ry', 480)); SAMPLES = int(ARGS.get('samples', 12))
OUT = ARGS.get('out', '/tmp/tn_out'); _fr = ARGS.get('frames', '1')
FRAMES = (list(range(int(_fr.split('-')[0]), int(_fr.split('-')[1]) + 1)) if '-' in _fr else [int(x) for x in _fr.split(',')])
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.frame_start = 1; scene.frame_end = 105; scene.render.fps = 30
L = 42.0; Wd = 6.4; Ht = 4.6

def mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True; return m

# ---- concreto do túnel (tijolo + manchas + relevo)
cm = mat('Concreto'); nt = cm.node_tree; b = nt.nodes['Principled BSDF']
tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (0.45, 0.45, 0.45)
brick = nt.nodes.new('ShaderNodeTexBrick'); brick.inputs['Scale'].default_value = 2.2; brick.inputs['Mortar Size'].default_value = 0.012; brick.inputs['Color1'].default_value = (0.04, 0.043, 0.05, 1); brick.inputs['Color2'].default_value = (0.025, 0.027, 0.032, 1); brick.inputs['Mortar'].default_value = (0.012, 0.012, 0.015, 1)
noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 6; noise.inputs['Detail'].default_value = 10
mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'; mixc.blend_type = 'MULTIPLY'; mixc.inputs[0].default_value = 0.7
bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.35
nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], brick.inputs['Vector']); nt.links.new(mp.outputs[0], noise.inputs['Vector'])
nt.links.new(brick.outputs['Color'], mixc.inputs[6]); nt.links.new(noise.outputs['Color'], mixc.inputs[7]); nt.links.new(mixc.outputs[2], b.inputs['Base Color']); nt.links.new(brick.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
b.inputs['Roughness'].default_value = 0.88

# casca do túnel (cubo vazado, normais para dentro)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, L/2, Ht/2)); tun = bpy.context.active_object; tun.scale = (Wd, L, Ht); bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.flip_normals(); bpy.ops.object.mode_set(mode='OBJECT')
# remove a face do fundo (saída) e a de trás (câmera)
bm = bmesh.new(); bm.from_mesh(tun.data); bm.faces.ensure_lookup_table()
dele = [f for f in bm.faces if abs(f.normal.y) > 0.9]; bmesh.ops.delete(bm, geom=dele, context='FACES'); bm.to_mesh(tun.data); bm.free()
tun.data.materials.append(cm)

# ---- piso molhado
fm = mat('Piso'); nt = fm.node_tree; f = nt.nodes['Principled BSDF']
tc = nt.nodes.new('ShaderNodeTexCoord'); n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 1.4; n1.inputs['Detail'].default_value = 8
ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = 0.35; ramp.color_ramp.elements[0].color = (0.045, 0.045, 0.045, 1); ramp.color_ramp.elements[1].position = 0.78; ramp.color_ramp.elements[1].color = (0.5, 0.5, 0.5, 1)
nt.links.new(tc.outputs['Object'], n1.inputs['Vector']); nt.links.new(n1.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs[0], f.inputs['Roughness'])
f.inputs['Base Color'].default_value = (0.02, 0.022, 0.028, 1)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, L/2 + 30, 0.001)); fl = bpy.context.active_object; fl.scale = (Wd, L + 60, 1); fl.data.materials.append(fm)

# ---- faixas de luz do teto
em = mat('Faixa'); nt = em.node_tree; nt.nodes.clear(); e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (0.78, 0.88, 1.0, 1); e.inputs['Strength'].default_value = 0.0
o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0])
strips = []
for i in range(11):
    y = 2.5 + i * 3.7
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(sx * 1.55, y, Ht - 0.05)); s = bpy.context.active_object; s.scale = (0.12, 2.2, 0.05); s.data.materials.append(em)
        strips.append((i, s))
# material único para todas: animar o strength via keyframes na ordem (sequência): usar um material por faixa de índice
mats = []
for i in range(11):
    m2 = em.copy(); m2.name = f'Faixa{i}'; mats.append(m2)
for i, s in strips:
    s.data.materials.clear(); s.data.materials.append(mats[i])
for i, m2 in enumerate(mats):
    emn = m2.node_tree.nodes['Emission']
    on = 1 + (10 - i) * 3   # as do fundo acendem primeiro
    emn.inputs['Strength'].default_value = 0.0; emn.inputs['Strength'].keyframe_insert('default_value', frame=on)
    emn.inputs['Strength'].default_value = 4.0; emn.inputs['Strength'].keyframe_insert('default_value', frame=on + 6)
    emn.inputs['Strength'].default_value = 2.2; emn.inputs['Strength'].keyframe_insert('default_value', frame=on + 10)

# ---- o estádio lá fora: brilho, arquibancada de pontos de luz, campo
sky = mat('Brilho'); nt = sky.node_tree; nt.nodes.clear(); e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (1.0, 0.93, 0.8, 1); e.inputs['Strength'].default_value = 4.5
o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0])
# campo gramado iluminado
gm = mat('Grama'); g = gm.node_tree.nodes['Principled BSDF']; g.inputs['Base Color'].default_value = (0.05, 0.2, 0.06, 1); g.inputs['Roughness'].default_value = 0.8
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, L + 75, -0.4)); gr = bpy.context.active_object; gr.scale = (200, 150, 1); gr.data.materials.append(gm)
# pontos de luz (torcida) em arcos
dm = mat('Ponto'); nt = dm.node_tree; nt.nodes.clear(); e = nt.nodes.new('ShaderNodeEmission'); o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0]); e.inputs['Strength'].default_value = 90.0
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.22, segments=8, ring_count=6, location=(0, 0, -50)); proto = bpy.context.active_object; proto.data.materials.append(dm)
pts = []
for k in range(1200):
    ang = math.radians(random.uniform(-72, 72)); r = random.uniform(70, 120); tier = random.uniform(0, 1)
    x = math.sin(ang) * r; y = L + 20 + math.cos(ang) * r; z = 4 + tier * 28
    o2 = proto.copy(); o2.data = proto.data; o2.location = (x, y, z); s = random.uniform(0.6, 1.8); o2.scale = (s, s, s); scene.collection.objects.link(o2); pts.append(o2)
bpy.data.objects.remove(proto)
# alguns flashes de câmera piscando
for o2 in random.sample(pts, 60):
    m3 = dm.copy(); o2.data = o2.data.copy(); o2.data.materials.clear(); o2.data.materials.append(m3)
    emn = m3.node_tree.nodes['Emission']; t0 = random.randint(1, 90)
    for dt, v in ((0, 0.0), (1, 900.0), (3, 0.0)): emn.inputs['Strength'].default_value = v; emn.inputs['Strength'].keyframe_insert('default_value', frame=t0 + dt)
    emn.inputs['Strength'].default_value = 20.0

tm = mat('Torre'); nt = tm.node_tree; nt.nodes.clear(); e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 600.0; e.inputs['Color'].default_value = (1.0, 0.95, 0.85, 1); o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0])
for tx, ty in ((-38, L + 60), (-14, L + 70), (14, L + 70), (38, L + 60)):
    for ix in range(3):
        for iz in range(2):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.7, location=(tx + ix * 1.8, ty, 30 + iz * 1.8)); bpy.context.active_object.data.materials.append(tm)
# ---- luzes reais da boca do túnel (feixes e luz no piso)
d = bpy.data.lights.new('Saida', 'AREA'); d.energy = 3500; d.size = 9; d.shape = 'RECTANGLE'; d.size_y = 5; d.color = (1.0, 0.92, 0.78)
so = bpy.data.objects.new('Saida', d); so.location = (0, L + 10, 2.4); so.rotation_euler = (math.radians(-90), 0, 0); scene.collection.objects.link(so)
for fr_, k in ((1, 0.35), (50, 0.6), (85, 1.0), (105, 3.0)): d.energy = 3500 * k; d.keyframe_insert('energy', frame=fr_)

# ---- fumaça/névoa volumétrica no túnel
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, L/2 + 4, Ht/2)); vb = bpy.context.active_object; vb.scale = (Wd - 0.05, L + 8, Ht - 0.05); vb.display_type = 'WIRE'
vm = mat('Neblina'); nt = vm.node_tree; nt.nodes.clear(); vs = nt.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Density'].default_value = 0.05; vs.inputs['Anisotropy'].default_value = 0.72
nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.8; nz.inputs['Detail'].default_value = 3; tcv = nt.nodes.new('ShaderNodeTexCoord'); mpv = nt.nodes.new('ShaderNodeMapping')
mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.inputs[1].default_value = 0.015
nt.links.new(tcv.outputs['Object'], mpv.inputs['Vector']); nt.links.new(mpv.outputs[0], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], mm.inputs[0]); nt.links.new(mm.outputs[0], vs.inputs['Density'])
ov = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(vs.outputs[0], ov.inputs['Volume']); vb.data.materials.append(vm)
# movimento lento da névoa
mpv.inputs['Location'].default_value = (0, 0, 0); mpv.inputs['Location'].keyframe_insert('default_value', frame=1)
mpv.inputs['Location'].default_value = (0.0, -3.0, 0.5); mpv.inputs['Location'].keyframe_insert('default_value', frame=105)

# ---- câmera: baixa, empurrando para a luz, com profundidade de campo
cam = bpy.data.cameras.new('Cam'); cam.lens = 38; cam.sensor_width = 36; cam.dof.use_dof = True; cam.dof.aperture_fstop = 2.0
co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
tgt = bpy.data.objects.new('Alvo', None); scene.collection.objects.link(tgt)
def ease(x): return x*x*(3-2*x)
for fr_ in range(1, 106, 3):
    t = ease((fr_ - 1) / 104.0)
    y = 0.0 + 11.0 * t
    co.location = (0.05*math.sin(fr_*0.09), y, 1.05 + 0.025*math.sin(fr_*0.13))
    tgt.location = (0.0, y + 30, 1.45 + 0.4 * t)
    d_ = tgt.location - co.location; co.rotation_euler = d_.to_track_quat('-Z', 'Y').to_euler()
    co.keyframe_insert('location', frame=fr_); co.keyframe_insert('rotation_euler', frame=fr_)
    cam.dof.focus_distance = 16.0 - 6.0*t; cam.dof.keyframe_insert('focus_distance', frame=fr_)

# ---- render
scene.render.engine = 'CYCLES'; cy = scene.cycles; cy.device = 'CPU'; setup_device(scene, ARGS); cy.samples = SAMPLES; cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.03; cy.max_bounces = 5; cy.volume_bounces = 1; cy.volume_step_rate = 2.0; cy.sample_clamp_indirect = 8.0; cy.sample_clamp_direct = 0
scene.render.resolution_x = RES_X; scene.render.resolution_y = RES_Y; scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'; scene.view_settings.exposure = -0.3
w = bpy.data.worlds.new('W'); scene.world = w; w.use_nodes = True; wn = w.node_tree; bg = wn.nodes['Background']
wtc = wn.nodes.new('ShaderNodeTexCoord'); wsep = wn.nodes.new('ShaderNodeSeparateXYZ'); wr = wn.nodes.new('ShaderNodeValToRGB')
wr.color_ramp.elements[0].position = 0.45; wr.color_ramp.elements[0].color = (0.9, 0.55, 0.32, 1); wr.color_ramp.elements[1].position = 0.62; wr.color_ramp.elements[1].color = (0.006, 0.01, 0.03, 1)
wn.links.new(wtc.outputs['Generated'], wsep.inputs[0]); wn.links.new(wsep.outputs['Z'], wr.inputs['Fac']); wn.links.new(wr.outputs[0], bg.inputs['Color']); bg.inputs['Strength'].default_value = 0.4
os.makedirs(OUT, exist_ok=True)
for fr_ in FRAMES:
    scene.frame_set(fr_); scene.render.filepath = f'{OUT}/t_{fr_:04d}.png'; t1 = time.time(); bpy.ops.render.render(write_still=True); print('FRAME', fr_, round(time.time() - t1, 1), flush=True)
