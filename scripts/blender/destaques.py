import bpy, math, sys, os, time, random
from mathutils import Vector
ARGS = dict(a.split('=') for a in sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else {}
RES_X = int(ARGS.get('rx', 270)); RES_Y = int(ARGS.get('ry', 480)); SAMPLES = int(ARGS.get('samples', 12)); OUT = ARGS.get('out', '/tmp/dest_out'); _fr = ARGS.get('frames', '1')
FRAMES = (list(range(int(_fr.split('-')[0]), int(_fr.split('-')[1]) + 1)) if '-' in _fr else [int(x) for x in _fr.split(',')])
random.seed(21)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.frame_start = 1; scene.frame_end = 150; scene.render.fps = 30
def mat(n): m = bpy.data.materials.new(n); m.use_nodes = True; return m
def emis(n, col, k):
    m = mat(n); nt = m.node_tree; nt.nodes.clear(); e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = col; e.inputs['Strength'].default_value = k
    o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0]); return m, e

# piso espelhado com variação de rugosidade
fm = mat('Piso'); nt = fm.node_tree; f = nt.nodes['Principled BSDF']; f.inputs['Base Color'].default_value = (0.012, 0.013, 0.018, 1)
tc = nt.nodes.new('ShaderNodeTexCoord'); n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 3.0; n1.inputs['Detail'].default_value = 8
rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = 0.4; rp.color_ramp.elements[0].color = (0.07, 0.07, 0.07, 1); rp.color_ramp.elements[1].position = 0.8; rp.color_ramp.elements[1].color = (0.4, 0.4, 0.4, 1)
nt.links.new(tc.outputs['Object'], n1.inputs['Vector']); nt.links.new(n1.outputs['Fac'], rp.inputs['Fac']); nt.links.new(rp.outputs[0], f.inputs['Roughness'])
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0)); bpy.context.active_object.data.materials.append(fm)


import json
from bpy_extras.object_utils import world_to_camera_view
mm = mat('Marmore'); mb = mm.node_tree.nodes['Principled BSDF']; mb.inputs['Base Color'].default_value = (0.018, 0.018, 0.024, 1); mb.inputs['Roughness'].default_value = 0.14
gm = mat('Ouro'); g = gm.node_tree.nodes['Principled BSDF']; g.inputs['Base Color'].default_value = (0.95, 0.66, 0.2, 1); g.inputs['Metallic'].default_value = 1.0; g.inputs['Roughness'].default_value = 0.2
COLS = (-1.75, 0.0, 1.75); ROWS = (3.1, 0.0, -3.1)
slots = []; k = 0
for r, yy in enumerate(ROWS):
    for c, xx in enumerate(COLS):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.72, depth=0.12, location=(xx, yy, 0.06), vertices=64); p = bpy.context.active_object; p.data.materials.append(mm)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.72, minor_radius=0.026, location=(xx, yy, 0.12), major_segments=96, minor_segments=16); bpy.context.active_object.data.materials.append(gm)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.54, minor_radius=0.011, location=(xx, yy, 0.125), major_segments=96, minor_segments=8); rg = bpy.context.active_object
        rm, re = emis('Anel%d' % k, (1.0, 0.8, 0.45, 1), 0.0); rg.data.materials.append(rm)
        t0 = 34 + k * 7
        for fr_, v in ((1, 0.0), (t0, 0.0), (t0 + 5, 90.0), (t0 + 16, 26.0), (150, 18.0)): re.inputs['Strength'].default_value = v; re.inputs['Strength'].keyframe_insert('default_value', frame=fr_)
        slots.append((xx, yy)); k += 1
# holofote geral + contraluzes
d = bpy.data.lights.new('Holofote', 'AREA'); d.size = 9; d.size_y = 9; d.color = (1.0, 0.9, 0.74); ho = bpy.data.objects.new('Holofote', d); ho.visible_camera = False; ho.visible_glossy = False; ho.location = (0, 0, 9); scene.collection.objects.link(ho)
for fr_, v in ((1, 0.0), (14, 900.0), (40, 1500.0), (150, 1700.0)): d.energy = v; d.keyframe_insert('energy', frame=fr_)
def area(n, loc, rot, e, size, col):
    a = bpy.data.lights.new(n, 'AREA'); a.energy = e; a.size = size; a.color = col; o = bpy.data.objects.new(n, a); o.location = loc; o.rotation_euler = rot; scene.collection.objects.link(o); return a
a1 = area('ContraE', (-7, 5, 2.4), (math.radians(90), 0, math.radians(-135)), 0, 4, (0.5, 0.65, 1.0))
a2 = area('ContraD', (7, 5, 2.4), (math.radians(90), 0, math.radians(135)), 0, 4, (1.0, 0.72, 0.4))
for a in (a1, a2):
    for fr_, v in ((1, 0.0), (30, 0.0), (80, 2400.0), (150, 2000.0)): a.energy = v; a.keyframe_insert('energy', frame=fr_)
# névoa
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 5)); vb = bpy.context.active_object; vb.scale = (18, 18, 11); vb.display_type = 'WIRE'
vm = mat('Neblina'); nt = vm.node_tree; nt.nodes.clear(); vs = nt.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Anisotropy'].default_value = 0.6; vs.inputs['Density'].default_value = 0.012
ov = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(vs.outputs[0], ov.inputs['Volume']); vb.data.materials.append(vm)
# poeira
dm, de = emis('Poeira', (1.0, 0.92, 0.78, 1), 3.2)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.012, segments=8, ring_count=6, location=(0, 0, -20)); proto = bpy.context.active_object; proto.data.materials.append(dm)
for _ in range(90):
    o = proto.copy(); o.data = proto.data; o.location = (random.uniform(-5, 5), random.uniform(-4, 4), random.uniform(0.3, 6)); s_ = random.uniform(0.5, 1.7); o.scale = (s_, s_, s_); scene.collection.objects.link(o)
    o.keyframe_insert('location', frame=1); o.location = (o.location.x + random.uniform(-0.5, 0.5), o.location.y + random.uniform(-0.5, 0.5), o.location.z + random.uniform(0.3, 1.6)); o.keyframe_insert('location', frame=150)
bpy.data.objects.remove(proto)
# faíscas douradas que sobem de cada pedestal quando acende
sm, se = emis('Faisca', (1.0, 0.7, 0.25, 1), 220.0)
bpy.ops.mesh.primitive_ico_sphere_add(radius=0.026, subdivisions=1, location=(0, 0, -20)); sp = bpy.context.active_object; sp.data.materials.append(sm)
for k, (xx, yy) in enumerate(slots):
    t0 = 34 + k * 7 + 4
    for _ in range(9):
        o = sp.copy(); o.data = sp.data; scene.collection.objects.link(o); ang = random.uniform(0, 6.283); sp_ = random.uniform(0.4, 1.2); vz = random.uniform(1.4, 3.0); s_ = random.uniform(0.5, 1.4)
        o.scale = (0, 0, 0); o.keyframe_insert('scale', frame=t0 - 1)
        o.scale = (s_, s_, s_); o.keyframe_insert('scale', frame=t0)
        for dt in (0, 8, 16, 28):
            t = dt / 30.0; o.location = (xx + math.cos(ang) * sp_ * t, yy + math.sin(ang) * sp_ * t, 0.2 + vz * t - 4.0 * t * t * 0.6); o.keyframe_insert('location', frame=t0 + dt)
        o.scale = (0, 0, 0); o.keyframe_insert('scale', frame=t0 + 34)
bpy.data.objects.remove(sp)
# câmera: de cima e de frente, aproxima devagar e assenta
cam = bpy.data.cameras.new('Cam'); cam.lens = 28; cam.dof.use_dof = True; cam.dof.aperture_fstop = 3.2; co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
tgt = bpy.data.objects.new('Alvo', None); tgt.location = (0, -0.4, 0.2); scene.collection.objects.link(tgt)
def campos(fr_):
    t = min(1.0, (fr_ - 1) / 110.0); e = t * t * (3 - 2 * t)
    return Vector((0.3 * math.sin(fr_ * 0.03) * (1 - e), -7.2 + 0.8 * e, 10.0 - 0.8 * e))
for fr_ in range(1, 151, 3):
    co.location = campos(fr_); co.rotation_euler = (tgt.location - co.location).to_track_quat('-Z', 'Y').to_euler()
    co.keyframe_insert('location', frame=fr_); co.keyframe_insert('rotation_euler', frame=fr_)
    cam.dof.focus_distance = (tgt.location - co.location).length; cam.dof.keyframe_insert('focus_distance', frame=fr_)
scene.render.engine = 'CYCLES'; cy = scene.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.03; cy.max_bounces = 5; cy.volume_bounces = 1; cy.volume_step_rate = 2.0; cy.sample_clamp_indirect = 8.0
scene.render.resolution_x = RES_X; scene.render.resolution_y = RES_Y; scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'; scene.view_settings.exposure = -0.2
for fr_, ex in ((1, -2.0), (30, -0.2)): scene.view_settings.exposure = ex; scene.view_settings.keyframe_insert('exposure', frame=fr_)
w = bpy.data.worlds.new('W'); scene.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.003, 0.004, 0.01, 1)
os.makedirs(OUT, exist_ok=True)
scene.frame_set(150); pos = []
for (xx, yy) in slots:
    v = world_to_camera_view(scene, co, Vector((xx, yy, 1.0))); pos.append([round(v.x * 100, 1), round((1 - v.y) * 100, 1)])
json.dump(pos, open(OUT + '/slots.json', 'w'))
for fr_ in FRAMES:
    scene.frame_set(fr_); scene.render.filepath = f'{OUT}/d_{fr_:04d}.png'; t1 = time.time(); bpy.ops.render.render(write_still=True); print('FRAME', fr_, round(time.time() - t1, 1), flush=True)
