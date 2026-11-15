"""Build an editable Blender project from the game's original glTF model.

Run with Blender 4.5+: blender --background --python build_blender_scene.py
Creates mission-centre.blend and a rendered still next to this script.
This script is supplied as source; it has not been executed in this delivery.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root / 'mission-centre.glb'))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.world.color = (0.12, 0.18, 0.22)
scene.render.resolution_x = 1600
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.fps = 24
scene.frame_start, scene.frame_end = 1, 96

# Imported glTF converts Y-up into Blender Z-up.
def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()

def area(name, location, color, energy, size, target=(0, 0, 0)):
    light = bpy.data.lights.new(name, 'AREA')
    light.energy, light.color, light.shape, light.size = energy, color, 'DISK', size
    obj = bpy.data.objects.new(name, light)
    scene.collection.objects.link(obj)
    obj.location = location
    aim(obj, target)

area('Warm window light', (-10, 6, 18), (1, 0.87, 0.68), 2600, 15)
area('Cool room fill', (12, -4, 14), (0.55, 0.83, 1), 2000, 12)
area('Earth exhibit accent', (9, 3, 6), (0.26, 1, 0.82), 250, 4, (9, 3, 0))
bpy.ops.object.camera_add(location=(20, -32, 31))
camera = bpy.context.object
camera.name = 'Mission centre overview'
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 39
aim(camera, (0, 0, 0))
scene.camera = camera

# Add a gentle idle loop to the named character groups. Browser walking is live.
for name in ('Ayla', 'Zara', 'Hamza', 'You'):
    obj = bpy.data.objects.get(name)
    if obj:
        start = obj.location.z
        for frame, offset in ((1, 0), (24, 0.035), (48, 0), (72, 0.035), (96, 0)):
            obj.location.z = start + offset
            obj.keyframe_insert(data_path='location', frame=frame)

# Small bevels catch light on architectural edges without changing silhouettes.
for obj in list(scene.objects):
    if obj.type == 'MESH' and obj.name.startswith('Architecture') and len(obj.data.vertices) <= 36:
        mod = obj.modifiers.new('Soft edges', 'BEVEL')
        mod.width, mod.segments = 0.025, 2
        obj.modifiers.new('Weighted corners', 'WEIGHTED_NORMAL')
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(root / 'mission-centre.blend'))
scene.render.filepath = str(root / 'blender-render.png')
bpy.ops.render.render(write_still=True)
print('Saved editable mission centre with characters, rooms, Earth, and lighting.')
