---
description: 在 Windows 上启动 Android 模拟器并以 Tauri dev 模式预览 Family Doctor 应用
---

# Android 模拟器启动与预览

本工作流固化 `family-doctor` 项目在 **Windows + Android Studio 自带 SDK/JBR** 环境下跑 `tauri android dev` 的完整流程，解决两个已知坑：
1. Tauri CLI 会自动挑到 `172.18.0.1`（Hyper-V/WSL 虚拟网卡），模拟器无法访问。
2. Vite `1420` 端口容易被上一次残留进程占用。

所有命令在 PowerShell (pwsh) 下执行，工作目录统一为 `app/`。

## 前置一次性确认

- Android SDK: `%LOCALAPPDATA%\Android\Sdk`
- NDK: `%LOCALAPPDATA%\Android\Sdk\ndk\29.0.14206865`（如版本号不同，请在后续命令中替换）
- Android Studio JBR: `C:\Program Files\Android\Android Studio\jbr`
- AVD: `Pixel_10_Pro_XL`（x86_64）
- Rust target: `x86_64-linux-android`（与 AVD ABI 匹配）
- `app/src-tauri/gen/android` 已生成（首次需 `npm run tauri android init`）

校验命令：

// turbo
```powershell
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
Test-Path $sdk
Get-ChildItem "$sdk\ndk" | Select-Object -ExpandProperty Name
Test-Path "C:\Program Files\Android\Android Studio\jbr\bin\java.exe"
rustup target list --installed | Select-String "linux-android"
& "$sdk\emulator\emulator.exe" -list-avds
```

## 步骤 1：清理遗留进程与端口

杀掉上次残留的 Vite / Node / Cargo / Gradle，释放 `1420`、`1421`。

// turbo
```powershell
Get-NetTCPConnection -LocalPort 1420,1421 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
Get-Process node,cargo,java,gradle -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2
```

## 步骤 2：启动模拟器（若已在线则跳过）

// turbo
```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

if ((& $adb devices | Select-String "emulator-\d+\s+device").Count -eq 0) {
  Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" `
    -ArgumentList "-avd","Pixel_10_Pro_XL","-no-snapshot-save" `
    -WindowStyle Minimized
  & $adb wait-for-device
  for ($i = 0; $i -lt 60; $i++) {
    if ((& $adb shell getprop sys.boot_completed 2>$null) -match "1") { break }
    Start-Sleep 2
  }
}
& $adb devices
```

## 步骤 3：配置端口转发

模拟器内 WebView 通过 `127.0.0.1:1420` 直连宿主机 Vite，绕过 `172.18.0.1` 问题。

// turbo
```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb reverse tcp:1420 tcp:1420
& $adb reverse tcp:1421 tcp:1421
& $adb reverse --list
```

## 步骤 4：设置环境变量并启动 `tauri android dev`

关键：**`TAURI_DEV_HOST=127.0.0.1`** 阻止 Tauri CLI 自动挑虚拟网卡 IP。

命令会在后台持续运行，构建 Rust `x86_64-linux-android` 动态库 + Gradle 打包 APK + 安装到模拟器，首次约 1–3 分钟。

```powershell
$env:ANDROID_HOME     = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:NDK_HOME         = "$env:ANDROID_HOME\ndk\29.0.14206865"
$env:JAVA_HOME        = "C:\Program Files\Android\Android Studio\jbr"
$env:TAURI_DEV_HOST   = "127.0.0.1"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;" + $env:Path

npm run android:dev *> tauri-android-run.log
```

> 在 IDE 里建议以 **非阻塞后台命令**方式运行，并另开一个终端 tail 日志：
> ```powershell
> Get-Content tauri-android-run.log -Wait -Tail 40
> ```

## 步骤 5：验证运行状态

预期：模拟器里出现 `Family Doctor` 应用界面，日志含 `[vite] connected.`。

// turbo
```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb shell pidof com.familydoctor.app
& $adb logcat -d -t 200 | Select-String -Pattern "Tauri/Console|vite|ERR_" | Select-Object -Last 20
```

## 常用操作

- **查看应用控制台**：`adb logcat -s "Tauri/Console" "chromium"`
- **热更新**：直接修改 `app/src/**` 文件，WebView 自动刷新。
- **重新安装**：在 `app/` 下 `Ctrl+C` 结束 dev → 重跑步骤 1、3、4。
- **关闭模拟器**：`adb -s emulator-5554 emu kill`
- **清理端口转发**：`adb reverse --remove-all`

## 故障排查

- `Port 1420 is already in use` → 重新执行 **步骤 1**。
- `Info Using 172.18.0.1 to access the development server` → 确认当前 shell 已 `Set` `TAURI_DEV_HOST=127.0.0.1`（每个新 PowerShell 会话都要重设）。
- 模拟器白屏 / `ERR_CONNECTION_REFUSED` → 确认 `adb reverse --list` 显示 `tcp:1420 tcp:1420`，且 Vite 日志里 `Local: http://127.0.0.1:1420/` 已出现。
- Gradle 抱怨找不到 ABI APK → 已由 `scripts/ensure-android-gradle-compat.mjs` 自动打补丁，首次生成 `src-tauri/gen/android` 后重跑 `npm run android:prepare` 即可。
- NDK 版本升级后 → 更新 `$env:NDK_HOME` 路径中的版本号。
