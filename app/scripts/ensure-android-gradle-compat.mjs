import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const buildGradlePath = path.join(projectRoot, "src-tauri", "gen", "android", "build.gradle.kts");

const marker = "// family-doctor android dev compatibility patch";
const patch = `

${marker}
// Tauri's Android CLI may request ABI-specific debug tasks such as
// \`assembleX86_64Debug\` and then look for an ABI-specific APK path, while this
// generated project currently emits the generic \`app-debug.apk\`. Provide
// root-level aliases and mirror the generic APK into the ABI-specific location
// that the CLI expects.
listOf(
    "Arm64" to "arm64",
    "Arm" to "arm",
    "X86" to "x86",
    "X86_64" to "x86_64",
).forEach { (archTaskName, archFolderName) ->
    tasks.register("assemble\${archTaskName}Debug") {
        dependsOn(":app:assembleDebug")
        doLast {
            val sourceApk = file("app/build/outputs/apk/debug/app-debug.apk")
            val targetDir = file("app/build/outputs/apk/\$archFolderName/debug")
            val targetApk = file("\${targetDir.path}/app-\$archFolderName-debug.apk")

            targetDir.mkdirs()
            sourceApk.copyTo(targetApk, overwrite = true)
        }
    }
    tasks.register("install\${archTaskName}Debug") {
        dependsOn(":app:installDebug")
    }
    tasks.register("uninstall\${archTaskName}Debug") {
        dependsOn(":app:uninstallDebug")
    }
}
`;

if (!fs.existsSync(buildGradlePath)) {
  console.log(`Skipped Android Gradle compatibility patch: ${buildGradlePath} does not exist yet.`);
  process.exit(0);
}

const current = fs.readFileSync(buildGradlePath, "utf8");
if (current.includes(marker)) {
  console.log("Android Gradle compatibility patch already applied.");
  process.exit(0);
}

fs.writeFileSync(buildGradlePath, `${current}${patch}`, "utf8");
console.log(`Applied Android Gradle compatibility patch to ${buildGradlePath}`);
