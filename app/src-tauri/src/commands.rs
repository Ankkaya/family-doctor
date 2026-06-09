#[tauri::command]
pub fn hello_world() -> String {
    "Hello from Tauri 2".to_string()
}

#[tauri::command]
pub fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}
