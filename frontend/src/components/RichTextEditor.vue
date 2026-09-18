<script setup>
import { ref } from "vue";
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";

const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue"]);

const editorRef = ref(null);

const EMOJIS = ["🏓", "🎯", "⚠️", "✅", "❌", "🔄", "➡️", "⬅️", "⬆️", "⬇️", "💪", "🔥", "⭐", "👍", "⏱️", "📏", "🔴", "🟢"];

const toolbarOptions = [
  ["bold", "italic", "underline"],
  [{ header: 2 }, { header: 3 }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["clean"],
];

function onUpdate(html) {
  emit("update:modelValue", html === "<p><br></p>" ? "" : html);
}

function insertEmoji(emoji) {
  const quill = editorRef.value?.getQuill();
  if (!quill) return;
  const range = quill.getSelection(true);
  const index = range ? range.index : quill.getLength();
  quill.insertText(index, emoji, "user");
  quill.setSelection(index + emoji.length, 0);
}
</script>

<template>
  <div class="rich-text-editor">
    <QuillEditor
      ref="editorRef"
      :content="modelValue"
      content-type="html"
      theme="snow"
      :toolbar="toolbarOptions"
      :placeholder="placeholder"
      @update:content="onUpdate"
    />
    <div class="flex items-start gap-1 mt-1.5">
      <span class="text-xs text-slate-400 mr-1 mt-1.5 shrink-0">Insérer :</span>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="e in EMOJIS"
          :key="e"
          type="button"
          class="text-base w-8 h-8 rounded hover:bg-slate-100 transition-colors"
          :title="`Insérer ${e}`"
          @click="insertEmoji(e)"
        >
          {{ e }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rich-text-editor :deep(.ql-editor) {
  min-height: 12rem;
}
</style>
