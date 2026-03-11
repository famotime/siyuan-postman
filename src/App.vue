<template>
  <!-- 插件根组件，作为全局挂载点（不渲染可见内容） -->
  <div class="siyuan-postman-app" />
</template>

<style lang="scss">
.siyuan-postman-app {
  display: none; // 插件无独立 UI 界面，所有交互通过思源原生 Dialog 实现
}
</style>
