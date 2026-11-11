import bpy, math, sys, os, time, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_device import setup_device
ARGS = dict(a.split('=') for a in sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else {}
RES_X = int(ARGS.get('rx', 270)); RES_Y = int(ARGS.get('ry', 480)); SAMPLES = int(ARGS.get('samples', 12)); OUT = ARGS.get('out', '/tmp/sp_out'); _fr = ARGS.get('frames', '1')
FRAMES = (list(range(int(_fr.split('-')[0]), int(_fr.split('-')[1]) + 1)) if '-' in _fr else [int(x) for x in _fr.split(',')])
random.seed(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.frame_start = 1; scene.frame_end = 90; scene.render.fps = 30
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

# pedestal: mármore escuro + aro dourado + anel de luz
mm = mat('Marmore'); mb = mm.node_tree.nodes['Principled BSDF']; mb.inputs['Base Color'].default_value = (0.018, 0.018, 0.024, 1); mb.inputs['Roughness'].default_value = 0.14
bpy.ops.mesh.primitive_cylinder_add(radius=1.45, depth=0.16, location=(0, 0, 0.08), vertices=96); pl = bpy.context.active_object; pl.data.materials.append(mm)
gm = mat('Ouro'); g = gm.node_tree.nodes['Principled BSDF']; g.inputs['Base Color'].default_value = (0.95, 0.66, 0.2, 1); g.inputs['Metallic'].default_value = 1.0; g.inputs['Roughness'].default_value = 0.2
bpy.ops.mesh.primitive_torus_add(major_radius=1.45, minor_radius=0.035, location=(0, 0, 0.16), major_segments=128, minor_segments=24); bpy.context.active_object.data.materials.append(gm)
bpy.ops.mesh.primitive_torus_add(major_radius=1.12, minor_radius=0.014, location=(0, 0, 0.165), major_segments=128, minor_segments=12); ring = bpy.context.active_object
rm, re = emis('AnelLuz', (1.0, 0.8, 0.45, 1), 0.0); ring.data.materials.append(rm)
for fr_, v in ((1, 0.0), (26, 0.0), (44, 22.0), (62, 70.0), (74, 14.0), (90, 10.0)): re.inputs['Strength'].default_value = v; re.inputs['Strength'].keyframe_insert('default_value', frame=fr_)
# ouro nas bordas do pedestal em 2 degraus
bpy.ops.mesh.primitive_cylinder_add(radius=1.75, depth=0.07, location=(0, 0, 0.035), vertices=96); st = bpy.context.active_object; st.data.materials.append(mm)

# luz principal (holofote) + contraluzes
d = bpy.data.lights.new('Holofote', 'SPOT'); d.spot_size = math.radians(30); d.spot_blend = 0.6; d.color = (1.0, 0.9, 0.74); d.shadow_soft_size = 0.4
ho = bpy.data.objects.new('Holofote', d); ho.location = (0, 0, 8.5); ho.rotation_euler = (0, 0, 0); scene.collection.objects.link(ho)
for fr_, v in ((1, 0.0), (11, 0.0), (12, 900.0), (14, 0.0), (16, 1500.0), (18, 200.0), (22, 3600.0), (60, 4200.0), (64, 20000.0), (72, 5200.0), (90, 4600.0)): d.energy = v; d.keyframe_insert('energy', frame=fr_)
def area(n, loc, rot, e, size, col):
    a = bpy.data.lights.new(n, 'AREA'); a.energy = e; a.size = size; a.color = col; o = bpy.data.objects.new(n, a); o.location = loc; o.rotation_euler = rot; scene.collection.objects.link(o); return a
a1 = area('ContraE', (-5, 5, 2.2), (math.radians(90), 0, math.radians(-135)), 0, 4, (0.5, 0.65, 1.0))
a2 = area('ContraD', (5, 5, 2.2), (math.radians(90), 0, math.radians(135)), 0, 4, (1.0, 0.72, 0.4))
for a in (a1, a2):
    for fr_, v in ((1, 0.0), (30, 0.0), (62, 2200.0), (90, 1500.0)): a.energy = v; a.keyframe_insert('energy', frame=fr_)

# névoa volumétrica (o feixe do holofote aparece nela)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 5)); vb = bpy.context.active_object; vb.scale = (16, 16, 11); vb.display_type = 'WIRE'
vm = mat('Neblina'); nt = vm.node_tree; nt.nodes.clear(); vs = nt.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Anisotropy'].default_value = 0.6
nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.6; nz.inputs['Detail'].default_value = 3; tcv = nt.nodes.new('ShaderNodeTexCoord'); mpv = nt.nodes.new('ShaderNodeMapping')
mt = nt.nodes.new('ShaderNodeMath'); mt.operation = 'MULTIPLY'; mt.inputs[1].default_value = 0.014
nt.links.new(tcv.outputs['Object'], mpv.inputs['Vector']); nt.links.new(mpv.outputs[0], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], mt.inputs[0]); nt.links.new(mt.outputs[0], vs.inputs['Density'])
mpv.inputs['Location'].default_value = (0, 0, 0); mpv.inputs['Location'].keyframe_insert('default_value', frame=1); mpv.inputs['Location'].default_value = (0.8, 0.4, 1.2); mpv.inputs['Location'].keyframe_insert('default_value', frame=90)
ov = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(vs.outputs[0], ov.inputs['Volume']); vb.data.materials.append(vm)

# poeira flutuando no feixe
dm, de = emis('Poeira', (1.0, 0.92, 0.78, 1), 3.2)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.011, segments=8, ring_count=6, location=(0, 0, -20)); proto = bpy.context.active_object; proto.data.materials.append(dm)
for k in range(70):
    o = proto.copy(); o.data = proto.data; r = random.uniform(0.05, 1.6) ; a_ = random.uniform(0, 6.283); z0 = random.uniform(0.3, 6.0)
    o.location = (math.cos(a_) * r * (0.3 + z0 / 7), math.sin(a_) * r * (0.3 + z0 / 7), z0); s = random.uniform(0.5, 1.7); o.scale = (s, s, s); scene.collection.objects.link(o)
    o.keyframe_insert('location', frame=1)
    o.location = (o.location.x + random.uniform(-0.5, 0.5), o.location.y + random.uniform(-0.5, 0.5), o.location.z + random.uniform(0.3, 1.4)); o.keyframe_insert('location', frame=90)
bpy.data.objects.remove(proto)

# faíscas douradas na revelação
sm, se = emis('Faisca', (1.0, 0.7, 0.25, 1), 220.0)
bpy.ops.mesh.primitive_ico_sphere_add(radius=0.03, subdivisions=1, location=(0, 0, -20)); sp = bpy.context.active_object; sp.data.materials.append(sm)
for k in range(110):
    o = sp.copy(); o.data = sp.data; scene.collection.objects.link(o)
    ang = random.uniform(0, 6.283); sp_ = random.uniform(1.0, 3.2); vz = random.uniform(1.6, 4.2); s = random.uniform(0.5, 1.6); o.scale = (s, s, s)
    o.location = (0, 0, 1.3); o.hide_render = True; o.keyframe_insert('hide_render', frame=61)
    o.hide_render = False; o.keyframe_insert('hide_render', frame=62)
    for dt in (0, 8, 16, 28):
        t = dt / 30.0; o.location = (math.cos(ang) * sp_ * t, math.sin(ang) * sp_ * t, 1.3 + vz * t - 4.0 * t * t); o.keyframe_insert('location', frame=62 + dt)
    o.hide_render = True; o.keyframe_insert('hide_render', frame=92)
bpy.data.objects.remove(sp)

# câmera
cam = bpy.data.cameras.new('Cam'); cam.lens = 42; cam.dof.use_dof = True; cam.dof.aperture_fstop = 2.2; co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
tgt = bpy.data.objects.new('Alvo', None); tgt.location = (0, 0, 1.55); scene.collection.objects.link(tgt)
for fr_ in range(1, 91, 3):
    t = (fr_ - 1) / 89.0; e = t * t * (3 - 2 * t)
    co.location = (0.1 * math.sin(fr_ * 0.05), -8.4 + 1.2 * e, 1.1 + 0.05 * math.sin(fr_ * 0.11) + 0.3 * e); d_ = tgt.location - co.location; co.rotation_euler = d_.to_track_quat('-Z', 'Y').to_euler()
    co.keyframe_insert('location', frame=fr_); co.keyframe_insert('rotation_euler', frame=fr_)
    cam.dof.focus_distance = (tgt.location - co.location).length; cam.dof.keyframe_insert('focus_distance', frame=fr_)

# render
scene.render.engine = 'CYCLES'; cy = scene.cycles; cy.device = 'CPU'; setup_device(scene, ARGS); cy.samples = SAMPLES; cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.03; cy.max_bounces = 5; cy.volume_bounces = 1; cy.volume_step_rate = 2.0; cy.sample_clamp_indirect = 8.0
scene.render.resolution_x = RES_X; scene.render.resolution_y = RES_Y; scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'; scene.view_settings.exposure = -0.2
for fr_, ex in ((1, -0.2), (60, -0.2), (64, 2.0), (70, -0.2)): scene.view_settings.exposure = ex; scene.view_settings.keyframe_insert('exposure', frame=fr_)
w = bpy.data.worlds.new('W'); scene.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.003, 0.004, 0.01, 1)
os.makedirs(OUT, exist_ok=True)
for fr_ in FRAMES:
    scene.frame_set(fr_); scene.render.filepath = f'{OUT}/s_{fr_:04d}.png'; t1 = time.time(); bpy.ops.render.render(write_still=True); print('FRAME', fr_, round(time.time() - t1, 1), flush=True)
