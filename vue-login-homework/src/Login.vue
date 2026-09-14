<template>
  <div class="login-container">
    <div class="login-box">
      <h2>系统登录</h2>
      <div class="form-item">
        <label>用户名</label>
        <input
          v-model="username"
          type="text"
          placeholder="请输入用户名"
        />
      </div>
      <div class="form-item">
        <label>密码</label>
        <input
          v-model="password"
          type="password"
          placeholder="请输入密码"
        />
      </div>
      <div class="form-item code-row">
    <label>验证码</label>
    <input
      v-model="codeInput"
      type="text"
      placeholder="输入计算结果"
    />
    <canvas
      ref="canvasRef"
      @click="drawCaptcha"
      class="captcha-canvas"
    ></canvas>
  </div>
      <div class="error-tip">{{ errorMsg }}</div>
      <button class="login-btn" @click="handleLogin">登录</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const username = ref('')
const password = ref('')
const codeInput = ref('')
const errorMsg = ref('')
const canvasRef = ref(null)
let captchaAnswer = ref(0)
let captchaText = ref('')

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateArithmetic() {
  const isAdd = Math.random() > 0.5
  let a, b

  if (isAdd) {
    a = randomInt(1, 9)
    b = randomInt(1, 10 - a)
    captchaAnswer.value = a + b
    captchaText.value = `${a} + ${b} = ?`
  } else {
    a = randomInt(1, 10)
    b = randomInt(0, a)
    captchaAnswer.value = a - b
    captchaText.value = `${a} - ${b} = ?`
  }
}

const drawCaptcha = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  canvas.width = 120
  canvas.height = 40
  ctx.fillStyle = '#eeeeee'
  ctx.fillRect(0, 0, 120, 40)

  generateArithmetic()
  ctx.font = 'bold 22px Arial'
  ctx.fillStyle = '#222'
  ctx.fillText(captchaText.value, 10, 30)

  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = '#999'
    ctx.beginPath()
    ctx.moveTo(Math.random() * 120, Math.random() * 40)
    ctx.lineTo(Math.random() * 120, Math.random() * 40)
    ctx.stroke()
  }
}

onMounted(() => {
  drawCaptcha()
})

const handleLogin = () => {
  errorMsg.value = ''
  if (!username.value) {
    errorMsg.value = '用户名不能为空'
    return
  }
  if (!password.value) {
    errorMsg.value = '密码不能为空'
    return
  }
  if (!codeInput.value) {
    errorMsg.value = '验证码不能为空'
    return
  }

  if (Number(codeInput.value) !== captchaAnswer.value) {
    errorMsg.value = '验证码错误'
    drawCaptcha()
    return
  }

  if (username.value !== 'super_admin' || password.value !== '123456Ab.') {
    errorMsg.value = '用户名或者密码错误'
    drawCaptcha()
    return
  }

  alert('登录成功！')
}
</script>

<style scoped>
.login-container {
  width: 100vw;
  height: 100vh;
  background-color: #f3f4f6;
  display: flex;
  justify-content: center;
  align-items: center;
}
.login-box {
  width: 380px;
  background: #ffffff;
  padding: 35px;
  border-radius: 10px;
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.12);
}
h2 {
  text-align: center;
  margin: 0 0 30px;
  color: #333;
}
.form-item {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.code-row {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}
.form-item label {
  width: 72px;
  font-size: 14px;
  color: #444;
}
.form-item input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #cccccc;
  border-radius: 6px;
  font-size: 15px;
}
.captcha-canvas {
  cursor: pointer;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.error-tip {
  color: #e53e3e;
  font-size: 13px;
  min-height: 18px;
  margin-bottom: 8px;
}
.login-btn {
  width: 100%;
  height: 44px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
}
.login-btn:hover {
  background: #64b5ff;
}
</style>

