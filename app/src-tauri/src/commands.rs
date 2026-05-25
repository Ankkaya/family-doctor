#[tauri::command]
pub fn hello_world() -> String {
    "Hello from Tauri 2".to_string()
}
