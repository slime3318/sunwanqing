<template>
  <div v-if="visible" class="dialog-mask" @click.self="handleCancel">
    <div class="dialog-box">
      <h3 class="dialog-title">{{ title }}</h3>
      <p class="dialog-content">{{ content }}</p>
      <div class="dialog-actions">
        <button class="btn btn-cancel" type="button" @click="handleCancel">取消</button>
        <button class="btn btn-confirm" type="button" @click="handleConfirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '提示',
  },
  content: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['confirm', 'cancel'])

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
}
</script>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1000;
}

.dialog-box {
  width: 360px;
  max-width: 100%;
  background: #ffffff;
  border-radius: 10px;
  padding: 22px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.2);
}

.dialog-title {
  font-size: 16px;
  color: #1f2937;
  margin-bottom: 12px;
}

.dialog-content {
  font-size: 14px;
  color: #4b5563;
  margin-bottom: 22px;
  word-break: break-all;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  min-width: 72px;
  height: 34px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel {
  background: #ffffff;
  border-color: #d1d5db;
  color: #4b5563;
}

.btn-cancel:hover {
  background: #f9fafb;
}

.btn-confirm {
  background: #f56c6c;
  color: #ffffff;
}

.btn-confirm:hover {
  background: #f78989;
}
</style>
