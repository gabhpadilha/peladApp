"""Liga o Cycles na placa de vídeo quando o script recebe `device=gpu`.

Uso dentro de cada script (depois de montar a cena):
    from render_device import setup_device; setup_device(scene, ARGS)
Tenta OptiX (NVIDIA RTX), CUDA (NVIDIA), HIP (AMD), oneAPI (Intel) e Metal (Mac), nessa ordem; sem GPU, fica na CPU.
"""
import bpy


def setup_device(scene, args):
    cy = scene.cycles
    if args.get('device', 'cpu') != 'gpu':
        cy.device = 'CPU'
        return 'CPU'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for kind in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI', 'METAL'):
        try:
            prefs.compute_device_type = kind
        except TypeError:
            continue
        prefs.get_devices()
        gpus = [d for d in prefs.devices if d.type == kind]
        if not gpus:
            continue
        for d in prefs.devices:
            d.use = d.type == kind
        cy.device = 'GPU'
        print('GPU', kind, ', '.join(d.name for d in gpus), flush=True)
        return kind
    print('GPU não encontrada: renderizando na CPU', flush=True)
    cy.device = 'CPU'
    return 'CPU'
