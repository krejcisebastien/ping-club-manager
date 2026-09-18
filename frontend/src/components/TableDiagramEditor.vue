<script setup>
import { ref, computed } from "vue";
import Button from "primevue/button";

const props = defineProps({
  modelValue: { type: Object, default: null },
  readonly: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const svgRef = ref(null);
const draggingIndex = ref(-1);
let nextId = 1;

const points = computed(() => props.modelValue?.points ?? []);

function svgPoint(event) {
  const svg = svgRef.value;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const cursor = pt.matrixTransform(svg.getScreenCTM().inverse());
  return {
    x: Math.min(100, Math.max(0, cursor.x)),
    y: Math.min(56, Math.max(0, cursor.y)),
  };
}

function emitPoints(next) {
  emit("update:modelValue", { points: next });
}

function onBackgroundClick(event) {
  if (props.readonly) return;
  if (event.target.dataset.point) return; // clic sur un point existant : pas d'ajout
  const { x, y } = svgPoint(event);
  emitPoints([...points.value, { id: nextId++, x, y }]);
}

function onPointMouseDown(index, event) {
  if (props.readonly) return;
  event.stopPropagation();
  draggingIndex.value = index;
}

function onSvgMouseMove(event) {
  if (draggingIndex.value === -1) return;
  const { x, y } = svgPoint(event);
  const next = points.value.map((p, i) => (i === draggingIndex.value ? { ...p, x, y } : p));
  emitPoints(next);
}

function onSvgMouseUp() {
  draggingIndex.value = -1;
}

function onPointDblClick(index, event) {
  if (props.readonly) return;
  event.stopPropagation();
  emitPoints(points.value.filter((_, i) => i !== index));
}

function clearAll() {
  emitPoints([]);
}
</script>

<template>
  <div>
    <svg
      ref="svgRef"
      viewBox="0 0 100 56"
      class="w-full rounded-lg border border-slate-200 select-none"
      :class="readonly ? '' : 'cursor-crosshair'"
      @click="onBackgroundClick"
      @mousemove="onSvgMouseMove"
      @mouseup="onSvgMouseUp"
      @mouseleave="onSvgMouseUp"
    >
      <rect x="0" y="0" width="100" height="56" rx="1.5" fill="#0f766e" />
      <rect x="1" y="1" width="98" height="54" fill="none" stroke="white" stroke-width="0.6" />
      <line x1="0" y1="28" x2="100" y2="28" stroke="white" stroke-width="1" />
      <line x1="50" y1="0" x2="50" y2="56" stroke="#134e4a" stroke-width="0.3" stroke-dasharray="1,1" />

      <defs>
        <marker id="diagram-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#f97316" />
        </marker>
      </defs>

      <polyline
        v-if="points.length > 1"
        :points="points.map((p) => `${p.x},${p.y}`).join(' ')"
        fill="none"
        stroke="#f97316"
        stroke-width="0.7"
        marker-end="url(#diagram-arrow)"
      />

      <g v-for="(p, i) in points" :key="p.id">
        <circle
          :cx="p.x"
          :cy="p.y"
          r="3"
          fill="#f97316"
          stroke="white"
          stroke-width="0.4"
          :data-point="true"
          :class="readonly ? '' : 'cursor-grab'"
          @mousedown="onPointMouseDown(i, $event)"
          @dblclick="onPointDblClick(i, $event)"
        />
        <text :x="p.x" :y="p.y" font-size="3" fill="white" text-anchor="middle" dominant-baseline="central" :data-point="true" class="pointer-events-none select-none">
          {{ i + 1 }}
        </text>
      </g>
    </svg>

    <div v-if="!readonly" class="flex items-center justify-between mt-1.5">
      <p class="text-xs text-slate-400">Cliquez pour ajouter un point, glissez pour déplacer, double-cliquez pour retirer.</p>
      <Button v-if="points.length" label="Tout effacer" text size="small" severity="danger" @click="clearAll" />
    </div>
  </div>
</template>
