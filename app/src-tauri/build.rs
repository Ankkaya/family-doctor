use std::{fs, io, path::PathBuf};

const ANDROID_GRADLE_COMPAT_PATCH: &str = r#"

// family-doctor android dev compatibility patch
// Tauri's Android CLI may request ABI-specific debug tasks such as
// `assembleX86_64Debug` and then look for an ABI-specific APK path, while this
// generated project currently emits the generic `app-debug.apk`. Provide
// root-level aliases and mirror the generic APK into the ABI-specific location
// that the CLI expects.
listOf(
    "Arm64" to "arm64",
    "Arm" to "arm",
    "X86" to "x86",
    "X86_64" to "x86_64",
).forEach { (archTaskName, archFolderName) ->
    tasks.register("assemble${archTaskName}Debug") {
        dependsOn(":app:assembleDebug")
        doLast {
            val sourceApk = file("app/build/outputs/apk/debug/app-debug.apk")
            val targetDir = file("app/build/outputs/apk/$archFolderName/debug")
            val targetApk = file("${targetDir.path}/app-$archFolderName-debug.apk")

            targetDir.mkdirs()
            sourceApk.copyTo(targetApk, overwrite = true)
        }
    }
    tasks.register("install${archTaskName}Debug") {
        dependsOn(":app:installDebug")
    }
    tasks.register("uninstall${archTaskName}Debug") {
        dependsOn(":app:uninstallDebug")
    }
}
"#;

const ANDROID_RECORD_AUDIO_PERMISSION: &str =
    r#"    <uses-permission android:name="android.permission.RECORD_AUDIO" />"#;

fn main() {
    tauri_build::build();

    println!("cargo:rerun-if-changed=gen/android/build.gradle.kts");
    println!("cargo:rerun-if-changed=gen/android/app/src/main/AndroidManifest.xml");

    if let Err(error) = ensure_android_gradle_compat_patch() {
        println!("cargo:warning=failed to apply Android Gradle compatibility patch: {error}");
    }

    if let Err(error) = ensure_android_record_audio_permission() {
        println!("cargo:warning=failed to apply Android microphone permission patch: {error}");
    }
}

fn ensure_android_gradle_compat_patch() -> io::Result<()> {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let build_gradle_path = manifest_dir.join("gen").join("android").join("build.gradle.kts");

    if !build_gradle_path.exists() {
        return Ok(());
    }

    let current = fs::read_to_string(&build_gradle_path)?;
    if current.contains("family-doctor android dev compatibility patch") {
        return Ok(());
    }

    let updated = format!("{current}{ANDROID_GRADLE_COMPAT_PATCH}");
    fs::write(build_gradle_path, updated)
}

fn ensure_android_record_audio_permission() -> io::Result<()> {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let manifest_path = manifest_dir
        .join("gen")
        .join("android")
        .join("app")
        .join("src")
        .join("main")
        .join("AndroidManifest.xml");

    if !manifest_path.exists() {
        return Ok(());
    }

    let current = fs::read_to_string(&manifest_path)?;
    if current.contains("android.permission.RECORD_AUDIO") {
        return Ok(());
    }

    let updated = current.replacen(
        r#"    <uses-permission android:name="android.permission.INTERNET" />"#,
        &format!(
            r#"    <uses-permission android:name="android.permission.INTERNET" />
{}"#,
            ANDROID_RECORD_AUDIO_PERMISSION
        ),
        1,
    );
    fs::write(manifest_path, updated)
}
